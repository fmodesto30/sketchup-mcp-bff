// views/agents.js — Agentes · Runs · Logs.
// org de guarda-chuvas (PM/Team Lead/Arquiteto + subs), feed de execução, métricas e sessões.
import { card, pill, emptyState, skeleton, esc, timeAgo, tone, icon } from "../ui.js";

function dotClass(a) {
  const st = String(a.status || "").toLowerCase();
  if (a.online && st === "idle") return "is-online";
  if (["working", "thinking", "running"].some((k) => st.includes(k))) return "is-working";
  if (["error", "blocked", "fail"].some((k) => st.includes(k))) return "is-error";
  return a.online ? "is-online" : "";
}
function agentRow(a, kind) {
  if (!a) return "";
  const cls = kind === "lead" ? "agent agent--lead" : "agent agent--sub";
  const msg = a.message && a.message !== "—" ? a.message : (a.online ? "online" : "idle");
  return `<div class="${cls}">
    <span class="agent-avatar">${esc(a.face || "•")}</span>
    <div class="agent-main">
      <div class="agent-name">${esc(a.label)}
        ${a.online ? `<span class="badge badge--ok">online</span>` : ""}</div>
      <div class="agent-msg">${a.to ? `→ ${esc(a.to)} · ` : ""}${esc(msg)}</div>
    </div>
    <span class="agent-dot ${dotClass(a)}"></span></div>`;
}
function org(s) {
  const us = s.agents?.umbrellas || [];
  if (!us.length) return card({ title: "Organização", icon: "agents", body: emptyState("agents", "Sem agentes") });
  const cols = us.map((u) => `
    <div class="org-col">
      <div class="h-eyebrow">${esc(u.label)}</div>
      ${agentRow(u.lead, "lead")}
      ${(u.subs || []).length ? `<div class="agent-subs">${(u.subs || []).map((x) => agentRow(x, "sub")).join("")}</div>` : ""}
    </div>`).join("");
  return card({ title: "Organização do estúdio", icon: "agents",
    subtitle: "PM coordena · Team Lead consulta os LLMs locais · Arquiteto consulta o GPT (visão)",
    body: `<div class="org-grid">${cols}</div>` });
}

function logs(s) {
  const feed = s.agents?.feed || [];
  if (!feed.length) return card({ title: "Feed de execução", icon: "terminal",
    body: emptyState("terminal", "Sem eventos no feed", "Quando os agentes rodarem, as falas aparecem aqui com nível e horário.") });
  const lines = feed.map((f) => `
    <div class="log-line" data-level="${esc((f.status || "").toLowerCase())}">
      <span class="log-time">${esc(timeAgo(f.ts))}</span>
      <span class="log-agent">${esc(f.agent || "—")}</span>
      <span class="log-msg">${f.to ? `<span class="text-faint">→${esc(f.to)}</span> ` : ""}${esc(f.message || "")}</span>
    </div>`).join("");
  return card({ title: "Feed de execução", eyebrow: `${feed.length} eventos`, icon: "terminal",
    body: `<div class="logs">${lines}</div>`,
    actions: `<button class="btn btn--sm btn--ghost" data-clear>${icon("x", { size: 13 })} limpar</button>` });
}

function metrics(s) {
  const m = s.agents?.metrics || {}, mu = s.agents?.model_usage || {};
  const rows = Object.entries(m);
  const max = Math.max(1, ...rows.map(([, v]) => v.calls || 0));
  const body = rows.length ? `<div class="mrows">${rows.map(([id, v]) => `
      <div class="mrow"><span class="mrow-name">${esc(id)}</span>
        <span class="mrow-bar"><i style="width:${Math.round((v.calls / max) * 100)}%"></i>
          ${v.errors ? `<em style="width:${Math.round((v.errors / max) * 100)}%"></em>` : ""}</span>
        <span class="mrow-num">${v.calls}${v.errors ? ` · ${v.errors} err` : ""}</span></div>`).join("")}</div>`
    : emptyState("gauge", "Sem chamadas registradas");
  const usage = Object.keys(mu).length ? `<div class="section-title">Uso de modelo</div>
    <div class="chip-row">${Object.entries(mu).map(([k, v]) =>
      `<span class="chip">${icon("cpu", { size: 13 })} ${esc(k)} <b>${v}</b></span>`).join("")}</div>` : "";
  return card({ title: "Métricas de execução", icon: "gauge", body: body + usage });
}

function sessions(s) {
  const wt = s.sessions?.worktrees || [], claims = s.sessions?.claims || [];
  const wtHtml = wt.length ? `<div class="row-list">${wt.map((w) => {
    const m = String(w).match(/\[([^\]]+)\]\s*$/);
    return `<div class="row"><div class="row-aside">${icon("git", { size: 16 })}</div>
      <div class="row-main mono" style="font-size:12px">${esc(String(w).replace(/\s+/g, " "))}</div>
      ${m ? pill(m[1], { tone: "neutral", dot: false }) : ""}</div>`;
  }).join("")}</div>` : emptyState("git", "Sem worktrees");
  const claimsHtml = claims.length ? `<div class="section-title">Claims (coordenação)</div>
    <div class="row-list">${claims.map((c) => `<div class="row">
      <div class="row-main"><div class="row-title">${esc(c.mt)} · ${esc(c.desc)}</div>
        <div class="row-sub mono">${esc(c.owner)}</div></div>
      ${pill(c.status, { tone: tone(c.status) })}</div>`).join("")}</div>` : "";
  return card({ title: "Sessões & worktrees", icon: "git", body: wtHtml + claimsHtml });
}

export default {
  id: "agents", label: "Agentes & Runs", icon: "agents",
  title: "Agentes · Runs · Logs", subtitle: "Organização multi-agente, feed de execução, métricas e sessões",
  badge: (s) => {
    const all = (s?.agents?.umbrellas || []).flatMap((u) => [u.lead, ...(u.subs || [])]).filter(Boolean);
    const on = all.filter((a) => a.online).length;
    return on || null;
  },
  render(s) {
    if (!s) return `<div class="grid"><div class="col-12 card"><div class="card-body">${skeleton(5)}</div></div></div>`;
    return `<div class="grid">
      <div class="col-12">${org(s)}</div>
      <div class="col-8">${logs(s)}</div>
      <div class="col-4">${metrics(s)}</div>
      <div class="col-12">${sessions(s)}</div>
    </div>`;
  },
  mount(root, ctx) {
    root.querySelector("[data-clear]")?.addEventListener("click", () =>
      ctx.post("/api/clear", {}, "Feed limpo"));
  },
};
