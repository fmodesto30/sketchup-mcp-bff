"""cockpit_api.py — endpoints "AI Cockpit" do BFF (montados em :8782 pelo server.py).

O BFF é o PONTO ÚNICO de integração: o frontend React fala só com /api/*; quem conversa
com modelos locais (Ollama :11434), com o dashboard legado (upstream :8781) e com o
"agent runner" é aqui. O frontend NUNCA chama Ollama direto.

Endpoints:
    GET  /api/status                  saúde (upstream + ollama)
    GET  /api/models                  modelos do Ollama (/api/tags)
    POST /api/models/chat             chat com um modelo (proxy p/ Ollama /api/chat)
    GET  /api/agents                  agentes (derivado do /api/state legado)
    POST /api/agents/<id>/run         dispara um run do agente (runner stub)
    GET  /api/runs                     histórico de runs
    GET  /api/runs/<id>                detalhe (steps, inputs/outputs, artifacts)
    GET  /api/runs/<id>/logs           logs — SSE (text/event-stream) ou JSON
    GET  /api/artifacts                artifacts (derivado de renders/refpack)
    GET  /api/decisions                decisões pendentes (propostas + visual review)
    POST /api/decisions/<id>/respond   responde uma decisão (proxy p/ /api/proposal)
    GET  /api/workflows                workflows/recipes (derivado do ciclo + pipeline)
    POST /api/workflows/<id>/run       dispara um run de workflow (runner stub)

O "runner" aqui é um STUB que simula o ciclo de um run (steps + logs ao vivo) — é o ponto
de plugue onde um runner real de agents/workflows entra. O chat com Ollama é REAL.
stdlib only.
"""
from __future__ import annotations

import json
import os
import re
import threading
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

UPSTREAM = os.environ.get("BFF_UPSTREAM", "http://127.0.0.1:8781").rstrip("/")
OLLAMA = os.environ.get("BFF_OLLAMA", "http://127.0.0.1:11434").rstrip("/")
MAX_BODY = 1 << 20  # 1 MiB — teto de corpo de POST (anti-DoS)

_LOCK = threading.Lock()
RUNS: dict[str, dict] = {}
_SEEDED = False
_run_seq = 0


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _gen_id(prefix: str) -> str:
    global _run_seq
    with _LOCK:
        _run_seq += 1
        n = _run_seq
    return f"{prefix}-{int(time.time())%100000:05d}-{n:03d}"


# ── upstream (state legado) ──────────────────────────────────────────────────
_state_cache = {"t": 0.0, "v": None}


def _upstream_state() -> dict:
    if _state_cache["v"] is not None and time.time() - _state_cache["t"] < 2.0:
        return _state_cache["v"]
    try:
        with urlopen(UPSTREAM + "/api/state", timeout=8) as r:
            v = json.loads(r.read())
    except (URLError, HTTPError, OSError, json.JSONDecodeError):
        v = {}
    _state_cache.update(t=time.time(), v=v)
    return v


# ── ollama (modelos locais) — REAL ───────────────────────────────────────────
def _ollama_get(path: str, timeout: float = 4.0):
    try:
        with urlopen(OLLAMA + path, timeout=timeout) as r:
            return json.loads(r.read())
    except (URLError, HTTPError, OSError, json.JSONDecodeError):
        return None


def _ollama_models() -> dict:
    data = _ollama_get("/api/tags")
    if data is None:
        return {"ok": False, "source": "none", "models": [],
                "hint": f"Ollama não acessível em {OLLAMA}. Suba com `ollama serve`."}
    out = []
    for m in data.get("models", []):
        det = m.get("details", {}) or {}
        out.append({"name": m.get("name"), "family": det.get("family"),
                    "sizeBytes": m.get("size"), "parameterSize": det.get("parameter_size"),
                    "quantization": det.get("quantization_level"),
                    "modifiedAt": m.get("modified_at")})
    return {"ok": True, "source": "ollama", "models": out}


def _ollama_chat(body: dict) -> tuple[int, dict]:
    model = (body or {}).get("model")
    messages = (body or {}).get("messages")
    if not isinstance(model, str) or not model.strip():
        return 400, {"ok": False, "error": "model (string) obrigatório"}
    if not isinstance(messages, list) or not messages:
        return 400, {"ok": False, "error": "messages (lista) obrigatório"}
    payload = json.dumps({"model": model, "messages": messages, "stream": False}).encode()
    req = Request(OLLAMA + "/api/chat", data=payload,
                  headers={"Content-Type": "application/json"}, method="POST")
    t0 = time.time()
    try:
        with urlopen(req, timeout=120) as r:
            data = json.loads(r.read())
    except HTTPError as e:
        return e.code, {"ok": False, "error": f"ollama HTTP {e.code}"}
    except (URLError, OSError) as e:
        return 503, {"ok": False, "error": "ollama_unreachable", "detail": str(e),
                     "hint": f"Suba o Ollama em {OLLAMA}."}
    msg = data.get("message") or {"role": "assistant", "content": ""}
    return 200, {"ok": True, "model": model, "message": msg,
                 "tookMs": int((time.time() - t0) * 1000)}


# ── derivações do /api/state ─────────────────────────────────────────────────
_AGENT_META = {
    "interior-pm": ("PM", "llama3.1:8b", ["coordenar", "backlog"]),
    "interior-orchestrator": ("Team Lead", "qwen2.5-coder:7b", ["consult-local", "cycle", "gates"]),
    "interior-designer": ("Arquiteto", "deepseek-r1:14b", ["program", "consult-gpt", "visão"]),
    "ollama-llama": ("LLM", "llama3.1:8b", ["chat"]),
    "ollama-qwen": ("LLM", "qwen2.5-coder:7b", ["code"]),
    "ollama-deepseek": ("LLM", "deepseek-r1:14b", ["reason"]),
    "gpt-visual": ("Visão", "gpt-4o", ["vision", "judge"]),
}


def _derive_agents(state: dict) -> list[dict]:
    out = []
    for u in (state.get("agents", {}) or {}).get("umbrellas", []) or []:
        for card in [u.get("lead")] + (u.get("subs") or []):
            if not card:
                continue
            aid = card.get("id", "")
            role, model, tools = _AGENT_META.get(aid, (u.get("label", "agent"), None, ["chat"]))
            # normaliza o status legado para o union do contrato {idle,working,error,online}
            raw = str(card.get("status") or "idle").lower()
            st = ("working" if raw in ("working", "thinking", "running")
                  else "error" if raw in ("error", "blocked", "fail") else "idle")
            if st == "idle" and card.get("online"):
                st = "online"
            out.append({"id": aid, "name": card.get("label", aid), "role": role,
                        "umbrella": u.get("label", ""), "status": st, "model": model,
                        "online": bool(card.get("online")), "tools": tools,
                        "message": None if card.get("message") in (None, "—") else card.get("message")})
    return out


def _derive_workflows(state: dict) -> list[dict]:
    ov = (state.get("overview", {}) or {}).get("active_focuses") or [{}]
    pipe = (ov[0] or {}).get("pipeline") or []
    fac = state.get("factory", {}) or {}
    risks = ((state.get("learning", {}) or {}).get("anti_patterns") or [])[:3]
    steps = [{"key": re.sub(r"\W+", "-", (p.get("label") or "").lower()).strip("-"),
              "label": p.get("label"), "icon": p.get("icon"),
              "status": ("done" if "done" in str(p.get("status", "")).lower() else
                         "doing" if p is pipe[min(len(pipe) - 1, sum(1 for x in pipe if "done" in str(x.get("status", "")).lower()))] else "pending")}
             for p in pipe]
    main = {"id": "cycle-fidelity", "name": fac.get("title") or "Ciclo de fidelidade do asset",
            "description": "Leva um asset de referência → curadoria → build → render V-Ray validado.",
            "whenToUse": "Quando um asset precisa avançar no pipeline de fidelidade do cômodo.",
            "status": "running" if fac.get("has_cycle") else "idle", "steps": steps,
            "tools": ["interior-designer", "consult-gpt", "vray"],
            "inputs": ["Reference Pack", "planta (PDF)"], "outputs": ["render V-Ray", "SKP"],
            "risks": risks, "lastRunId": None}
    canned = [
        {"id": "curate-refpack", "name": "Curadoria de Reference Pack",
         "description": "Cura referências visuais em um pack aprovado (principal/anti).",
         "whenToUse": "Ao receber novas referências de um asset.", "status": "idle",
         "steps": [{"key": "ingest", "label": "Ingerir", "status": "done"},
                   {"key": "judge", "label": "Julgar", "status": "doing"},
                   {"key": "approve", "label": "Aprovar", "status": "pending"}],
         "tools": ["reference-scout", "gpt-visual"], "inputs": ["links/imagens"],
         "outputs": ["pack curado"], "risks": ["copiar imagem em vez de extrair gramática"]},
        {"id": "render-vray", "name": "Render V-Ray",
         "description": "Renderiza o asset montado na planta e valida com o juiz visual.",
         "whenToUse": "Quando forma + contexto foram aprovados.", "status": "idle",
         "steps": [{"key": "camera", "label": "Câmera", "status": "pending"},
                   {"key": "render", "label": "Render", "status": "pending"},
                   {"key": "judge", "label": "Veredito", "status": "pending"}],
         "tools": ["vray", "gpt-visual"], "inputs": ["SKP montado"], "outputs": ["PNG"],
         "risks": ["piso preto default", "eletro escuro que some no fundo"]},
    ]
    return [main] + canned


def _derive_decisions(state: dict) -> list[dict]:
    out = []
    for p in (state.get("proposals", {}) or {}).get("pending", []) or []:
        items = ", ".join(i.get("asset", "") for i in (p.get("items") or [])[:4])
        out.append({"id": p.get("id"), "type": "program_proposal",
                    "title": f"Programa · {p.get('room_name', p.get('room_id', ''))}",
                    "question": f"Aprovar o programa proposto ({items})?",
                    "options": ["Aprovar", "Rejeitar"], "status": "pending",
                    "source": p.get("source_worker") or "Arquiteto", "createdAt": _now()})
    consult = state.get("consult", {}) or {}
    if consult.get("status") == "waiting_gpt_answer":
        out.append({"id": "visual-review", "type": "visual_review",
                    "title": "Veredito visual (Consult GPT)",
                    "question": "A aparência melhorou vs o PDF?",
                    "options": ["IMPROVED", "SAME", "WORSE"], "status": "pending",
                    "source": "Consult GPT", "createdAt": _now()})
    return out


def _derive_artifacts(state: dict) -> list[dict]:
    out = []
    for r in (state.get("renders") or [])[:40]:
        name = r.get("name", "")
        out.append({"id": re.sub(r"\W+", "-", name.lower()).strip("-") or name,
                    "type": "render", "name": r.get("sub") or name, "path": name,
                    "url": "/img/" + name, "sizeKb": r.get("kb"),
                    "createdAt": datetime.fromtimestamp(r["mtime"], timezone.utc).isoformat()
                    if r.get("mtime") else None})
    rp = state.get("refpack", {}) or {}
    if rp.get("references"):
        out.append({"id": "refpack-" + str(rp.get("asset", "pack")), "type": "json",
                    "name": f"Reference Pack · {rp.get('theme', '')}", "path": "refpack.json",
                    "sizeKb": None, "createdAt": _now()})
    return out


def _status() -> dict:
    st = _upstream_state()
    oll = _ollama_get("/api/tags", timeout=2.0)
    return {"upstream": {"ok": bool(st), "url": UPSTREAM},
            "ollama": {"ok": oll is not None, "url": OLLAMA,
                       "models": len((oll or {}).get("models", []))},
            "time": _now()}


# ── runs (registry + runner STUB) ────────────────────────────────────────────
def _seed_runs():
    global _SEEDED
    if _SEEDED:
        return
    state = _upstream_state()   # rede FORA do lock
    claims = (state.get("sessions", {}) or {}).get("claims", []) or []
    with _LOCK:                 # double-checked locking — semeia uma vez só
        if _SEEDED:
            return
        for i, c in enumerate(claims[:6]):
            done = "DONE" in str(c.get("status", "")).upper() or "landed" in str(c.get("status", ""))
            rid = f"seed-{i:03d}"
            RUNS[rid] = {
            "id": rid, "kind": "agent", "agentId": "interior-orchestrator",
            "agentName": "Team Lead", "title": f"{c.get('mt', '')} · {c.get('desc', '')}",
            "status": "succeeded" if done else "running", "model": "qwen2.5-coder:7b",
            "startedAt": _now(), "finishedAt": _now() if done else None,
            "durationMs": 4200 if done else None,
            "steps": [{"name": "plan", "status": "done"}, {"name": "execute",
                      "status": "done" if done else "running"},
                      {"name": "verify", "status": "done" if done else "pending"}],
            "logs": [{"ts": _now(), "level": "info", "agent": "Team Lead",
                      "message": f"claim {c.get('mt', '')} — {c.get('owner', '')}"},
                     {"ts": _now(), "level": "success" if done else "info",
                      "agent": "Team Lead", "message": c.get("status", "")}],
            "inputs": {"mt": c.get("mt")}, "outputs": {}, "artifactIds": [],
            }
        _SEEDED = True


def _run_summary(r: dict) -> dict:
    return {k: r.get(k) for k in ("id", "kind", "agentId", "agentName", "workflowId",
            "title", "status", "model", "startedAt", "finishedAt", "durationMs")}


def _start_run(kind: str, **meta) -> str:
    """Cria um run e dispara o runner STUB (steps + logs ao vivo). Ponto de plugue
    para um runner real de agents/workflows."""
    rid = _gen_id(kind)
    steps = meta.pop("steps", None) or [
        {"name": "plan", "status": "pending"}, {"name": "execute", "status": "pending"},
        {"name": "verify", "status": "pending"}]
    run = {"id": rid, "kind": kind, "title": meta.get("title", kind),
           "status": "queued", "startedAt": _now(), "finishedAt": None, "durationMs": None,
           "steps": [{**s} for s in steps], "logs": [], "inputs": meta.get("inputs", {}),
           "outputs": {}, "artifactIds": [], **{k: meta[k] for k in
           ("agentId", "agentName", "workflowId", "model") if k in meta}}
    with _LOCK:
        RUNS[rid] = run
    threading.Thread(target=_runner, args=(rid,), daemon=True).start()
    return rid


def _log(run: dict, level: str, message: str, agent: str | None = None):
    with _LOCK:
        run["logs"].append({"ts": _now(), "level": level,
                            "agent": agent or run.get("agentName"), "message": message})


def _runner(rid: str):
    run = RUNS.get(rid)
    if not run:
        return
    t0 = time.time()
    run["status"] = "running"
    _log(run, "info", f"run {rid} iniciado ({run.get('model', '—')})")
    failed = False
    for i, step in enumerate(run["steps"]):
        step["status"] = "running"
        step["startedAt"] = _now()
        _log(run, "debug", f"step '{step['name']}' começou")
        time.sleep(0.8 + 0.5 * i)
        # falha pseudo-determinística só no passo 'verify' de ~1 em 5 runs
        if step["name"] == "verify" and int(t0) % 5 == 0:
            step["status"] = "failed"
            step["finishedAt"] = _now()
            _log(run, "error", f"step '{step['name']}' falhou: gate visual reprovou")
            failed = True
            break
        step["status"] = "done"
        step["finishedAt"] = _now()
        _log(run, "success", f"step '{step['name']}' concluído")
    run["status"] = "failed" if failed else "succeeded"
    run["finishedAt"] = _now()
    run["durationMs"] = int((time.time() - t0) * 1000)
    _log(run, "error" if failed else "success",
         f"run {run['status']} em {run['durationMs']}ms")


# ── dispatch ─────────────────────────────────────────────────────────────────
def dispatch(h) -> bool:
    """Tenta tratar uma rota nativa do cockpit. Retorna True se tratou."""
    from urllib.parse import urlparse, parse_qs
    method, path = h.command, urlparse(h.path).path
    query = parse_qs(urlparse(h.path).query)

    if method == "GET" and path == "/api/status":
        return _ok(h, _status())
    if method == "GET" and path == "/api/models":
        return _ok(h, _ollama_models())
    if method == "POST" and path == "/api/models/chat":
        code, data = _ollama_chat(_body(h))
        return _ok(h, data, code)
    if method == "GET" and path == "/api/agents":
        return _ok(h, {"agents": _derive_agents(_upstream_state())})
    if method == "GET" and path == "/api/workflows":
        return _ok(h, {"workflows": _derive_workflows(_upstream_state())})
    if method == "GET" and path == "/api/artifacts":
        return _ok(h, {"artifacts": _derive_artifacts(_upstream_state())})
    if method == "GET" and path == "/api/decisions":
        return _ok(h, {"decisions": _derive_decisions(_upstream_state())})
    if method == "GET" and path == "/api/runs":
        _seed_runs()
        with _LOCK:   # snapshot consistente (RUNS é mutado por _runner/_start_run)
            vals = list(RUNS.values())
        runs = sorted(vals, key=lambda r: r.get("startedAt", ""), reverse=True)
        return _ok(h, {"runs": [_run_summary(r) for r in runs]})

    m = re.match(r"^/api/runs/([^/]+)/logs$", path)
    if method == "GET" and m:
        return _runs_logs(h, m.group(1), query)
    m = re.match(r"^/api/runs/([^/]+)$", path)
    if method == "GET" and m:
        _seed_runs()
        r = RUNS.get(m.group(1))
        return _ok(h, {"run": r}) if r else _ok(h, {"error": "not_found"}, 404)

    m = re.match(r"^/api/agents/([^/]+)/run$", path)
    if method == "POST" and m:
        aid = m.group(1)
        agents = {a["id"]: a for a in _derive_agents(_upstream_state())}
        a = agents.get(aid, {"name": aid, "model": None})
        rid = _start_run("agent", agentId=aid, agentName=a.get("name"),
                         model=a.get("model"), title=f"Run · {a.get('name', aid)}",
                         inputs=_body(h))
        return _ok(h, {"ok": True, "runId": rid})

    m = re.match(r"^/api/workflows/([^/]+)/run$", path)
    if method == "POST" and m:
        wid = m.group(1)
        wfs = {w["id"]: w for w in _derive_workflows(_upstream_state())}
        w = wfs.get(wid, {"name": wid})
        steps = [{"name": s.get("label", s.get("key")), "status": "pending"}
                 for s in (w.get("steps") or [])] or None
        rid = _start_run("workflow", workflowId=wid, title=f"Workflow · {w.get('name', wid)}",
                         agentName=w.get("name"), steps=steps)
        return _ok(h, {"ok": True, "runId": rid})

    m = re.match(r"^/api/decisions/([^/]+)/respond$", path)
    if method == "POST" and m:
        return _decide(h, m.group(1), _body(h))

    return False


# ── helpers de I/O do handler ────────────────────────────────────────────────
def _body(h) -> dict:
    try:
        n = int(h.headers.get("Content-Length", 0) or 0)
        if n <= 0 or n > MAX_BODY:   # rejeita corpo ausente ou grande demais (DoS)
            return {}
        return json.loads(h.rfile.read(n) or b"{}")
    except (ValueError, json.JSONDecodeError):
        return {}


def _ok(h, obj, code: int = 200) -> bool:
    h._json(code, obj)
    return True


def _decide(h, did: str, body: dict) -> bool:
    choice = (body or {}).get("choice") or (body or {}).get("answer") or ""
    # valida o id contra as decisões pendentes REAIS (não aceitar id arbitrário)
    pending = {d["id"] for d in _derive_decisions(_upstream_state())}
    if did not in pending:
        return _ok(h, {"ok": False, "error": "unknown_decision", "id": did}, 404)
    applied = None
    # decisão de programa → ação real no upstream (/api/proposal); reflete o resultado
    if did != "visual-review":
        action = "approve" if str(choice).lower().startswith("aprov") else \
                 "reject" if str(choice).lower().startswith("rejeit") else None
        if action:
            try:
                payload = json.dumps({"action": action, "id": did}).encode()
                req = Request(UPSTREAM + "/api/proposal", data=payload,
                              headers={"Content-Type": "application/json"}, method="POST")
                with urlopen(req, timeout=8) as r:
                    applied = json.loads(r.read())
            except (URLError, HTTPError, OSError, json.JSONDecodeError) as e:
                return _ok(h, {"ok": False, "error": "upstream_failed", "detail": str(e)}, 502)
    return _ok(h, {"ok": True, "id": did, "choice": choice, "upstream": applied})


def _runs_logs(h, rid: str, query: dict) -> bool:
    _seed_runs()
    run = RUNS.get(rid)
    if not run:
        return _ok(h, {"error": "not_found"}, 404)
    wants_sse = "text/event-stream" in (h.headers.get("Accept") or "") \
        and query.get("format", [""])[0] != "json"
    if not wants_sse:
        return _ok(h, {"logs": run.get("logs", [])})
    # ── SSE: tail dos logs até o run terminar ──
    h.send_response(200)
    h.send_header("Content-Type", "text/event-stream; charset=utf-8")
    h.send_header("Cache-Control", "no-cache")
    h.send_header("Connection", "keep-alive")
    h.send_header("X-Accel-Buffering", "no")
    h.end_headers()
    sent, ticks = 0, 0
    deadline = time.time() + 60
    try:
        while time.time() < deadline:
            logs = run.get("logs", [])
            progressed = sent < len(logs)
            while sent < len(logs):
                line = logs[sent]
                sent += 1
                h.wfile.write(f"data: {json.dumps(line, ensure_ascii=False)}\n\n".encode())
                h.wfile.flush()
            if run.get("status") in ("succeeded", "failed") and sent >= len(run.get("logs", [])):
                h.wfile.write(f"event: end\ndata: {json.dumps({'status': run['status']})}\n\n".encode())
                h.wfile.flush()
                break
            ticks += 1
            if not progressed and ticks % 7 == 0:   # heartbeat: detecta desconexão rápido
                h.wfile.write(b": keep-alive\n\n")
                h.wfile.flush()
            time.sleep(0.4)
    except (BrokenPipeError, ConnectionResetError, OSError):
        pass
    return True
