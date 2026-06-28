// ui.js — primitivos reutilizáveis do design system (lado JS).
import { icon } from "./icons.js";

/* ── escape / templates ───────────────────────────────────────────────────*/
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/* ── tempo relativo ───────────────────────────────────────────────────────*/
export function timeAgo(ts) {
  if (!ts) return "";
  const d = ts instanceof Date ? ts : new Date(ts < 1e12 ? ts * 1000 : ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5) return "agora";
  if (s < 60) return `${s}s atrás`;
  if (s < 3600) return `${Math.floor(s / 60)}min atrás`;
  if (s < 86400) return `${Math.floor(s / 3600)}h atrás`;
  return `${Math.floor(s / 86400)}d atrás`;
}

/* ── status: string do domínio → tom visual ──────────────────────────────-*/
const TONE_BY_STATUS = {
  working: "info", thinking: "info", running: "info", "em andamento": "info",
  execução: "info", refinamento: "warn",
  done: "ok", executado: "ok", completed: "ok", landed: "ok", pass: "ok", aprovado: "ok",
  waiting: "warn", teste: "warn", pending: "warn", pendente: "warn", draft: "warn",
  blocked: "danger", error: "danger", fail: "danger", rejected: "danger", rejeitado: "danger",
  idle: "neutral", backlog: "neutral", "—": "neutral",
};
export function tone(status) {
  const k = String(status || "").toLowerCase().trim();
  if (TONE_BY_STATUS[k]) return TONE_BY_STATUS[k];
  for (const key in TONE_BY_STATUS) if (k.includes(key)) return TONE_BY_STATUS[key];
  return "neutral";
}
const TONE_ICON = { ok: "check", info: "activity", warn: "clock",
                    danger: "alertTriangle", neutral: "dot" };

/* ── status pill ──────────────────────────────────────────────────────────*/
export function pill(label, opts = {}) {
  const t = opts.tone || tone(label);
  const withDot = opts.dot !== false && !opts.icon;
  const ic = opts.icon ? icon(opts.icon, { size: 12 }) : "";
  const dot = withDot ? `<span class="pill-dot"></span>` : ic;
  const pulse = opts.pulse ? " is-pulse" : "";
  return `<span class="pill pill--${t}${pulse}">${dot}<span>${esc(label)}</span></span>`;
}

/* ── badge (rótulo seco) ──────────────────────────────────────────────────*/
export function badge(label, t = "neutral") {
  return `<span class="badge badge--${t}">${esc(label)}</span>`;
}

/* ── métrica (número grande + rótulo) ─────────────────────────────────────*/
export function metric(value, label, opts = {}) {
  const t = opts.tone ? ` metric--${opts.tone}` : "";
  const ic = opts.icon ? `<span class="metric-ico">${icon(opts.icon, { size: 16 })}</span>` : "";
  const delta = opts.sub ? `<div class="metric-sub">${esc(opts.sub)}</div>` : "";
  return `<div class="metric${t}">${ic}<div class="metric-val">${esc(value)}</div>
    <div class="metric-label">${esc(label)}</div>${delta}</div>`;
}

/* ── estados ──────────────────────────────────────────────────────────────*/
export function emptyState(ic, title, sub = "") {
  return `<div class="empty-state">
    <span class="ico">${icon(ic, { size: 28 })}</span>
    <div class="empty-title">${esc(title)}</div>
    ${sub ? `<div class="empty-sub">${esc(sub)}</div>` : ""}
  </div>`;
}
export function errorState(msg) {
  return `<div class="error-state"><span class="ico">${icon("alertCircle", { size: 18 })}</span>
    <div><b>Sem conexão com o upstream.</b><br>${esc(msg)}</div></div>`;
}
export function skeleton(lines = 3) {
  const widths = ["sk-80", "sk-60", "sk-40", "sk-60"];
  let out = '<div class="skeleton-block">';
  for (let i = 0; i < lines; i++)
    out += `<div class="skeleton skeleton-line ${widths[i % widths.length]}"></div>`;
  return out + "</div>";
}

/* ── pipeline (passos do ciclo) ───────────────────────────────────────────*/
export function pipeline(steps = []) {
  if (!steps.length) return emptyState("workflow", "Sem pipeline ativo");
  const cls = (st) => {
    const s = String(st || "").toLowerCase();
    if (["done", "ok", "executado", "pass"].some((k) => s.includes(k))) return "is-done";
    if (["doing", "current", "wip", "andamento", "ready", "vray_ready"].some((k) => s.includes(k))) return "is-doing";
    return "is-pending";
  };
  return `<div class="pipeline">` + steps.map((s, i) => {
    const arrow = i < steps.length - 1
      ? `<span class="pipe-arrow">${icon("chevronRight", { size: 14 })}</span>` : "";
    const ic = s.icon && /\p{Emoji}/u.test(s.icon)
      ? `<span style="font-size:18px">${s.icon}</span>`
      : `<span class="pipe-ico">${icon(s.icon || "dot", { size: 18 })}</span>`;
    return `<div class="pipe-step ${cls(s.status)}">${ic}
      <div class="pipe-label">${esc(s.label || "")}</div>
      ${s.detail ? `<div class="pipe-detail">${esc(s.detail)}</div>` : ""}</div>${arrow}`;
  }).join("") + `</div>`;
}

/* ── card (casca) ─────────────────────────────────────────────────────────*/
export function card({ title, eyebrow, icon: ic, accent, actions, body, span }) {
  const acc = accent ? ` card--accent-${accent}` : "";
  const sp = span ? ` style="grid-column:span ${span}"` : "";
  const head = (title || eyebrow || actions) ? `
    <div class="card-head">
      <div class="card-head-l">
        ${ic ? `<span class="card-ico">${icon(ic, { size: 16 })}</span>` : ""}
        <div>
          ${eyebrow ? `<div class="card-eyebrow">${esc(eyebrow)}</div>` : ""}
          ${title ? `<h2 class="card-title">${esc(title)}</h2>` : ""}
        </div>
      </div>
      ${actions ? `<div class="card-actions">${actions}</div>` : ""}
    </div>` : "";
  return `<section class="card${acc}"${sp}>${head}<div class="card-body">${body}</div></section>`;
}

export { icon };
