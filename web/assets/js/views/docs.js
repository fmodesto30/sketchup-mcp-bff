// views/docs.js — Documentação & Knowledge (layout de docs com callouts e source cards).
import { card, badge, pill, emptyState, skeleton, esc, icon } from "../ui.js";

function architecture() {
  const flow = `<div class="flow">
    <div class="flow-node"><span>${icon("home", { size: 16 })}</span><b>Browser</b><i>:8782</i></div>
    <span class="flow-arrow">${icon("arrowRight", { size: 16 })}</span>
    <div class="flow-node flow-node--accent"><span>${icon("box", { size: 16 })}</span><b>BFF</b><i>server.py + web/</i></div>
    <span class="flow-arrow">${icon("arrowRight", { size: 16 })}<small>proxy /api/*</small></span>
    <div class="flow-node"><span>${icon("cpu", { size: 16 })}</span><b>Upstream</b><i>studio_dashboard.py :8781</i></div>
  </div>`;
  const body = `
    <div class="callout"><span class="ico">${icon("activity", { size: 16 })}</span>
      <div>Este cockpit é um <b>BFF fino</b>: serve o frontend premium e faz <b>proxy</b> de
      <code>/api/*</code> para o <code>studio_dashboard.py</code> original — domínio preservado,
      dados reais, sem tocar no repo de origem.</div></div>
    ${flow}
    <div class="section-title">Como rodar</div>
    <div class="code-block">＄ python sketchup-mcp/tools/studio_dashboard.py --port 8781   # upstream (dados)
＄ python server.py                                            # BFF → http://127.0.0.1:8782</div>`;
  return card({ title: "Arquitetura", eyebrow: "como o cockpit funciona", icon: "workflow", accent: "info", body,
    actions: `<a class="btn btn--sm btn--ghost" href="/explica" target="_blank" rel="noopener">Explica ${icon("external", { size: 13 })}</a>` });
}

function knowledge(s) {
  const k = s.knowledge || {}, entries = k.entries || [];
  if (!entries.length) return card({ title: "Base de conhecimento", icon: "book", body: emptyState("book", "Sem entradas") });
  const cards = entries.map((e) => `<div class="src-card">
    <div class="src-head">${icon("book", { size: 15 })}<b>${esc(e.title)}</b>
      <span class="src-chars">${e.chars} ch</span></div>
    <p class="src-preview">${esc(e.preview || "")}</p></div>`).join("");
  return card({ title: "Base de conhecimento", eyebrow: `${k.chars || 0} caracteres · DNA ${k.dna ? "ativo" : "—"}`,
    icon: "book", body: `<div class="src-grid">${cards}</div>` });
}

function corpus(s) {
  const r = s.references || {}, kind = r.by_kind || {}, theme = r.by_theme || {};
  const j = s.knowledge?.judge || {};
  const body = `
    <div class="metric-grid">
      ${Object.entries(kind).map(([k, v]) => `<div class="mini-stat"><b>${v}</b><span>${esc(k)}</span></div>`).join("")}
    </div>
    <div class="section-title">Temas</div>
    <div class="chip-row">${Object.entries(theme).map(([k, v]) =>
      `<span class="chip">${esc(k)} <b>${v}</b></span>`).join("")}</div>
    <div class="section-title">Juiz visual</div>
    <div class="chip-row">
      <span class="chip">${icon("alertTriangle", { size: 13 })} ${j.anti_patterns || 0} anti-patterns</span>
      <span class="chip">${icon("activity", { size: 13 })} ${j.flagged || 0} flagged</span>
    </div>`;
  return card({ title: "Corpus & juiz", icon: "layers", body });
}

function links() {
  const L = [
    { href: "/explica", t: "Explica — como o sistema funciona", ic: "book" },
    { href: "/grafo", t: "Mapa de conhecimento (grafo)", ic: "git" },
    { href: "/fluxo", t: "Fluxo do pipeline", ic: "workflow" },
    { href: "/agents", t: "Agentes (single / multi)", ic: "agents" },
  ];
  const body = `<div class="row-list">${L.map((l) => `
    <a class="row" href="${l.href}" target="_blank" rel="noopener" style="cursor:pointer">
      <div class="row-aside">${icon(l.ic, { size: 16 })}</div>
      <div class="row-main"><div class="row-title">${esc(l.t)}</div></div>
      ${icon("external", { size: 15 })}</a>`).join("")}</div>`;
  return card({ title: "Documentação viva", icon: "external", body });
}

export default {
  id: "docs", label: "Documentação", icon: "book",
  title: "Documentação & Knowledge", subtitle: "Arquitetura do cockpit, base de conhecimento e diagramas",
  render(s) {
    if (!s) return `<div class="card"><div class="card-body">${skeleton(6)}</div></div>`;
    return `<div class="grid">
      <div class="col-8">${architecture()}</div>
      <div class="col-4">${links()}</div>
      <div class="col-8">${knowledge(s)}</div>
      <div class="col-4">${corpus(s)}</div>
    </div>`;
  },
};
