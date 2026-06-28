// views/workflows.js — recipes/workflows do estúdio (inspirado no Claude Cookbooks):
// a "recipe ativa" do ciclo (quando usar · inputs · outputs · tools · checklist · riscos)
// + propostas de programa do Arquiteto + Reference Pack de entrada.
import { card, pill, badge, pipeline, emptyState, skeleton, esc, icon } from "../ui.js";

function recipe(s) {
  const f = (s.overview?.active_focuses || [])[0];
  const fac = s.factory || {}, rp = s.refpack || {};
  if (!f) return card({ title: "Recipe ativa", icon: "workflow", body: emptyState("workflow", "Nenhuma recipe em execução") });

  const tools = (s.agents?.umbrellas || [])
    .flatMap((u) => [u.lead, ...(u.subs || [])]).filter(Boolean)
    .map((a) => `<span class="chip">${icon("bot", { size: 13 })} ${esc(a.label)}</span>`).join("");
  const checklist = (f.pipeline || []).map((p) => {
    const done = String(p.status || "").includes("done");
    return `<li class="check-item ${done ? "is-done" : ""}">
      ${icon(done ? "check" : "circle", { size: 15 })}<span>${esc(p.label)}</span></li>`;
  }).join("");
  const risks = (s.learning?.anti_patterns || []).slice(0, 4)
    .map((r) => `<li>${icon("alertTriangle", { size: 14 })} <span>${esc(r)}</span></li>`).join("");

  const body = `
    <div class="recipe-grid">
      <div class="recipe-col">
        <div class="recipe-block"><span class="h-eyebrow">Quando usar</span>
          <p>${esc(f.reason || "Quando o asset precisa avançar no pipeline de fidelidade.")}</p></div>
        <div class="recipe-block"><span class="h-eyebrow">Inputs</span>
          <div class="chip-row">
            <span class="chip">${icon("palette", { size: 13 })} ${esc(rp.theme || "tema")}</span>
            <span class="chip">${icon("image", { size: 13 })} ${rp.counts?.total || 0} referências</span>
          </div></div>
        <div class="recipe-block"><span class="h-eyebrow">Output</span>
          <div class="chip-row"><span class="chip">${icon("film", { size: 13 })} Render V-Ray · ${esc(f.label || f.asset)}</span></div></div>
        <div class="recipe-block"><span class="h-eyebrow">Tools / agentes</span>
          <div class="chip-row">${tools || "—"}</div></div>
      </div>
      <div class="recipe-col">
        <div class="recipe-block"><span class="h-eyebrow">Checklist</span>
          <ul class="check-list">${checklist}</ul></div>
        <div class="recipe-block"><span class="h-eyebrow">Riscos / anti-patterns</span>
          <ul class="risk-list">${risks || "<li class='text-faint'>nenhum registrado</li>"}</ul></div>
      </div>
    </div>
    <div class="section-title">Pipeline · ${esc(fac.cycle_id || "")}</div>
    ${pipeline((f.pipeline || []).map((p) => ({ icon: p.icon, label: p.label, status: p.status })))}`;

  return card({ title: fac.title || "Recipe ativa", eyebrow: `${esc(fac.room || "")} · ${esc(fac.mode || "")}`,
    icon: "workflow", accent: "gold", body,
    actions: pill(fac.status || f.state_label || "", { tone: "info" }) });
}

function proposalCard(p, ctx) {
  const items = (p.items || []).map((it) => `
    <li class="prop-item">
      <span class="prop-dot prop-${esc(it.priority || "core")}"></span>
      <b>${esc(it.asset)}</b> ${badge(it.priority || "core", it.priority === "core" ? "gold" : "neutral")}
      <span class="text-faint">— ${esc(it.reason || "")}</span></li>`).join("");
  const existing = (p.existing || []).map((e) => `<span class="chip">${esc(e)}</span>`).join("");
  const body = `
    <div class="prop-meta">${pill(`${p.area_m2 || "?"} m²`, { tone: "neutral", dot: false })}
      <span class="chip">${icon("bot", { size: 13 })} ${esc(p.source_worker || "")}</span></div>
    <ul class="prop-list">${items}</ul>
    ${existing ? `<div class="prop-existing"><span class="h-eyebrow">Já no cômodo</span>
      <div class="chip-row">${existing}</div></div>` : ""}
    <div class="prop-acts">
      <button class="btn btn--primary btn--sm" data-approve="${esc(p.id)}">${icon("check", { size: 14 })} Aprovar</button>
      <button class="btn btn--sm" data-reject="${esc(p.id)}">${icon("x", { size: 14 })} Rejeitar</button>
    </div>`;
  return card({ title: `${esc(p.room_name || p.room_id)} · programa`, eyebrow: esc(p.type || "proposal"),
    icon: "clipboard", accent: "purple", body });
}

function refpackCard(s) {
  const rp = s.refpack || {};
  if (!rp.theme) return "";
  const c = rp.counts || {};
  const body = `
    <p class="text-muted" style="margin-bottom:10px">${esc(rp.direction || "")}</p>
    <div class="metric-grid">
      ${["total", "approved", "main", "anti", "pending"].map((k) =>
        `<div class="mini-stat"><b>${c[k] ?? 0}</b><span>${k}</span></div>`).join("")}
    </div>
    <div class="callout callout--warn" style="margin-top:12px">
      ${icon("alertTriangle", { size: 16, cls: "ico" })}
      <div>${esc(rp.honesty || "")}</div></div>`;
  return card({ title: rp.theme, eyebrow: `Reference Pack · ${esc(rp.asset || "")}`, icon: "palette", body,
    actions: `<a class="btn btn--sm btn--ghost" href="#/references">curadoria ${icon("arrowRight", { size: 13 })}</a>` });
}

export default {
  id: "workflows", label: "Workflows", icon: "workflow",
  title: "Workflows & Recipes", subtitle: "O ciclo como recipe reproduzível, propostas do Arquiteto e inputs",
  badge: (s) => (s?.proposals?.pending?.length) || null,
  render(s) {
    if (!s) return `<div class="grid"><div class="col-12 card"><div class="card-body">${skeleton(6)}</div></div></div>`;
    const props = s.proposals?.pending || [];
    const propsHtml = props.length
      ? `<div class="grid">${props.map((p) => `<div class="col-6">${proposalCard(p)}</div>`).join("")}</div>`
      : card({ title: "Propostas do Arquiteto", icon: "clipboard",
          body: emptyState("check", "Nenhuma proposta pendente", "O Arquiteto não tem programa aguardando aprovação.") });
    return `
      <div class="grid">
        <div class="col-12">${recipe(s)}</div>
        <div class="col-8">
          <div class="section-title">${icon("clipboard", { size: 14 })} Propostas pendentes</div>
          ${propsHtml}
        </div>
        <div class="col-4">
          <div class="section-title">${icon("palette", { size: 14 })} Input · Reference Pack</div>
          ${refpackCard(s) || emptyState("palette", "Sem reference pack")}
        </div>
      </div>`;
  },
  mount(root, ctx) {
    root.querySelectorAll("[data-approve]").forEach((b) => b.onclick = () =>
      ctx.post("/api/proposal", { action: "approve", id: b.dataset.approve }, "Proposta aprovada"));
    root.querySelectorAll("[data-reject]").forEach((b) => b.onclick = () =>
      ctx.post("/api/proposal", { action: "reject", id: b.dataset.reject }, "Proposta rejeitada"));
  },
};
