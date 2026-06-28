"""server.py — BFF fino do INTERIOR STUDIO dashboard (:8782).

Serve o frontend premium (estático, em `web/`) e faz PROXY de toda a API / imagens /
páginas-vitrine para o `studio_dashboard.py` original rodando como UPSTREAM (default
:8781). Assim a `:8782` continua funcionando com DADOS REAIS, sem tocar no repo de
origem (`GFCDOTA/sketchup-mcp`).

    browser → :8782 (este BFF: web/ estático)
                 └── proxy /api/* /img/* /inbox-img/* + páginas-vitrine → :8781 (upstream)

Uso:
    python server.py                       # serve :8782, proxy → http://127.0.0.1:8781
    BFF_PORT=8782 BFF_UPSTREAM=http://127.0.0.1:8781 python server.py
    BFF_MOCK=1 python server.py            # sem upstream: /api/state vem de mocks/

stdlib only — sem dependências, sem build.
"""
from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
WEB = Path(os.environ.get("BFF_WEB", ROOT / "web"))
MOCKS = ROOT / "mocks"
PORT = int(os.environ.get("BFF_PORT", "8782"))
UPSTREAM = os.environ.get("BFF_UPSTREAM", "http://127.0.0.1:8781").rstrip("/")
MOCK = os.environ.get("BFF_MOCK", "") not in ("", "0", "false", "False")

# Prefixos/paths que NÃO são do frontend — vão para o upstream tal e qual.
PROXY_PREFIXES = ("/api/", "/img/", "/inbox-img/")
PROXY_EXACT = {
    "/api/state", "/api/kgraph", "/api/consult/state",
    "/api/consult/latest-question", "/api/consult/latest-answer",
    # páginas servidas pelo dashboard original na mesma porta ("vitrine")
    "/explica", "/grafo", "/fluxo", "/como-funciona",
    "/agents", "/single-agent", "/multi-agent", "/vitrine",
}

CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
    ".woff2": "font/woff2", ".map": "application/json",
}


def _is_proxy(path: str) -> bool:
    return path in PROXY_EXACT or path.startswith(PROXY_PREFIXES)


class H(BaseHTTPRequestHandler):
    server_version = "InteriorStudioBFF/1.0"

    # ── helpers ──────────────────────────────────────────────────────────────
    def _send(self, code: int, body: bytes, ctype: str, extra: dict | None = None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json(self, code: int, obj) -> None:
        self._send(code, json.dumps(obj, ensure_ascii=False).encode("utf-8"),
                   "application/json; charset=utf-8")

    def log_message(self, fmt, *args):  # quieter, single-line
        print(f"[bff] {self.command} {self.path} -> {args[1] if len(args) > 1 else ''}")

    # ── static (frontend) ────────────────────────────────────────────────────
    def _serve_static(self, path: str) -> None:
        rel = "index.html" if path in ("/", "") else path.lstrip("/")
        fp = (WEB / rel).resolve()
        if WEB.resolve() not in fp.parents and fp != WEB.resolve():
            self._send(403, b"forbidden", "text/plain"); return
        if not fp.is_file():
            # SPA usa hash-routing; qualquer rota desconhecida cai no index.
            fp = WEB / "index.html"
            if not fp.is_file():
                self._send(404, b"web/ not built", "text/plain"); return
        ctype = CONTENT_TYPES.get(fp.suffix.lower(), "application/octet-stream")
        cache = "no-cache" if fp.suffix in (".html",) else "public, max-age=60"
        self._send(200, fp.read_bytes(), ctype, {"Cache-Control": cache})

    # ── proxy → upstream ─────────────────────────────────────────────────────
    def _proxy(self, path: str, method: str) -> None:
        # modo MOCK: sem upstream, devolve o snapshot capturado.
        if MOCK and path == "/api/state" and method == "GET":
            fp = MOCKS / "state.sample.json"
            if fp.is_file():
                self._send(200, fp.read_bytes(), "application/json; charset=utf-8",
                           {"X-Bff-Source": "mock"}); return
        url = UPSTREAM + path + (("?" + urlparse(self.path).query)
                                 if urlparse(self.path).query else "")
        body = None
        if method == "POST":
            length = int(self.headers.get("Content-Length", 0) or 0)
            body = self.rfile.read(length) if length else b""
        req = Request(url, data=body, method=method)
        if self.headers.get("Content-Type"):
            req.add_header("Content-Type", self.headers["Content-Type"])
        try:
            with urlopen(req, timeout=30) as r:
                payload = r.read()
                ctype = r.headers.get("Content-Type", "application/octet-stream")
                self._send(r.status, payload, ctype, {"X-Bff-Source": "upstream"})
        except HTTPError as e:  # upstream respondeu erro — repassa
            self._send(e.code, e.read() or b"", e.headers.get("Content-Type", "text/plain"))
        except (URLError, OSError) as e:  # upstream fora do ar
            self._json(502, {"error": "upstream_unreachable", "upstream": UPSTREAM,
                             "detail": str(e), "hint":
                             "suba o dashboard original: "
                             "python sketchup-mcp/tools/studio_dashboard.py --port 8781"})

    # ── verbs ────────────────────────────────────────────────────────────────
    def do_GET(self):
        path = urlparse(self.path).path
        if _is_proxy(path):
            self._proxy(path, "GET")
        else:
            self._serve_static(path)

    def do_HEAD(self):
        self.do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if _is_proxy(path):
            self._proxy(path, "POST")
        else:
            self._send(404, b"not found", "text/plain")


def main() -> int:
    if not (WEB / "index.html").is_file():
        print(f"[bff] AVISO: {WEB/'index.html'} não encontrado — rode da raiz do repo.")
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), H)
    print(f"INTERIOR STUDIO BFF  ->  http://127.0.0.1:{PORT}/")
    print(f"  upstream (proxy /api/*) -> {UPSTREAM}" + ("   [MOCK ON]" if MOCK else ""))
    print(f"  servindo estatico de    -> {WEB}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        srv.shutdown()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
