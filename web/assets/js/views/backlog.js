// views/backlog.js — Kanban das microtarefas (Felipe move com ◀ ▶).
import { card, metric, badge, emptyState, skeleton, esc, icon } from "../ui.js";

const COLS = [
  { key: "backlog", label: "Backlog" },
  { key: "refinamento", label: "Refinamento" },
  { key: "execução", label: "Execução" },
  { key: "teste", label: "Teste" },
  { key: "executado", label: "Executado" },
];

function taskCard(t, idx) {
  const canPrev = idx > 0, canNext = idx < COLS.length - 1;
  return `<div class="kcard">
    <div class="kcard-top"><b class="mono">${esc(t.mt)}</b>
      ${t.geo ? badge("geo", "warn") : badge("pele", "ok")}</div>
    <div class="kcard-what">${esc(t.what || "")}</div>
    <div class="kcard-mv">
      <button class="btn btn--sm btn--ghost" data-mv="prev" data-mt="${esc(t.mt)}" ${canPrev ? "" : "disabled"}>${icon("chevronRight", { size: 13, cls: "flip" })}</button>
      <button class="btn btn--sm btn--ghost" data-mv="next" data-mt="${esc(t.mt)}" ${canNext ? "" : "disabled"}>${icon("chevronRight", { size: 13 })}</button>
    </div></div>`;
}

function board(s) {
  const tasks = s.backlog?.tasks || [];
  const byCol = Object.fromEntries(COLS.map((c) => [c.key, []]));
  for (const t of tasks) (byCol[t.status] || byCol.backlog).push(t);
  const cols = COLS.map((c, i) => `
    <div class="kcol">
      <div class="kcol-head"><span>${esc(c.label)}</span>
        <span class="kcol-count">${byCol[c.key].length}</span></div>
      <div class="kcol-body">
        ${byCol[c.key].length ? byCol[c.key].map((t) => taskCard(t, i)).join("")
          : `<div class="kcol-empty">vazio</div>`}
      </div></div>`).join("");
  return `<div class="kboard">${cols}</div>`;
}

export default {
  id: "backlog", label: "Backlog", icon: "backlog",
  title: "Backlog & Kanban", subtitle: "Microtarefas do estúdio — arraste pelo fluxo com ◀ ▶",
  badge: (s) => (s?.backlog?.total) || null,
  render(s) {
    if (!s) return `<div class="card"><div class="card-body">${skeleton(6)}</div></div>`;
    const bl = s.backlog || {};
    return `
      <div class="metric-grid" style="margin-bottom:20px">
        ${metric(bl.total ?? 0, "Total", { icon: "backlog" })}
        ${metric(bl.done ?? 0, "Executados", { icon: "check", tone: "ok" })}
        ${metric(bl.geo ?? 0, "Geometria", { icon: "box", tone: "warn" })}
        ${metric(bl.pele ?? 0, "Acabamento", { icon: "palette" })}
      </div>
      ${(s.backlog?.tasks || []).length ? board(s)
        : card({ title: "Backlog", icon: "backlog", body: emptyState("backlog", "Backlog vazio") })}`;
  },
  mount(root, ctx) {
    root.querySelectorAll("[data-mv]").forEach((b) => b.onclick = () =>
      ctx.post("/api/move", { mt: b.dataset.mt, direction: b.dataset.mv }));
  },
};
