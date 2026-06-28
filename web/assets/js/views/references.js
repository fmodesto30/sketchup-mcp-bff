// views/references.js — Reference Pack + curadoria · galeria de renders · aprendizado.
import { card, pill, badge, emptyState, skeleton, esc, icon } from "../ui.js";

const STATUS_TONE = { approved: "ok", rejected: "danger", main: "gold", anti: "danger", pending: "neutral" };

function refCard(r) {
  const st = (r.status || "pending").toLowerCase();
  const img = r.og_image
    ? `<img class="ref-img" loading="lazy" src="${esc(r.og_image)}" alt=""
         onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ref-img ref-img--ph'}))" />`
    : `<div class="ref-img ref-img--ph"></div>`;
  const attrs = ["form", "material", "base", "seat"].filter((k) => r[k])
    .map((k) => `<div class="ref-attr"><span>${k}</span> ${esc(r[k])}</div>`).join("");
  return `<div class="ref-card ref-card--${st}">
    ${img}
    <div class="ref-head">
      <div class="ref-title">${esc(r.title)}</div>
      ${pill(st, { tone: STATUS_TONE[st] || "neutral", dot: false })}
    </div>
    <div class="ref-sub">${esc(r.source || "")} · ${badge(r.type || "ref", "neutral")}</div>
    <p class="ref-why">${esc(r.why_good || "")}</p>
    ${attrs ? `<div class="ref-attrs">${attrs}</div>` : ""}
    <div class="ref-acts">
      <button class="btn btn--sm" data-ref="${esc(r.id)}" data-action="main" title="marcar como principal">${icon("sparkles", { size: 13 })}</button>
      <button class="btn btn--sm" data-ref="${esc(r.id)}" data-action="approve">${icon("check", { size: 13 })}</button>
      <button class="btn btn--sm" data-ref="${esc(r.id)}" data-action="reject">${icon("x", { size: 13 })}</button>
      <a class="btn btn--sm btn--ghost" href="${esc(r.link)}" target="_blank" rel="noopener" title="abrir fonte">${icon("external", { size: 13 })}</a>
    </div></div>`;
}

function renders(s) {
  const rs = s.renders || [];
  if (!rs.length) return card({ title: "Renders", icon: "image", body: emptyState("image", "Sem renders") });
  const grid = `<div class="gallery">${rs.slice(0, 24).map((r) => `
    <a class="thumb" href="/img/${encodeURIComponent(r.name)}" target="_blank" rel="noopener">
      <img loading="lazy" src="/img/${encodeURIComponent(r.name)}" alt="${esc(r.name)}" />
      <div class="thumb-cap"><div class="thumb-name">${esc(r.sub || r.name)}</div>
        <div class="thumb-meta">${esc(r.theme || "")} · ${r.kb}kb</div></div></a>`).join("")}</div>`;
  return card({ title: "Galeria de renders", eyebrow: `${rs.length} imagens`, icon: "image", body: grid });
}

function learning(s) {
  const l = s.learning || {};
  const lst = (arr, ic, cls) => (arr || []).length
    ? `<ul class="learn-list ${cls}">${arr.slice(0, 8).map((x) => `<li>${icon(ic, { size: 13 })} <span>${esc(x)}</span></li>`).join("")}</ul>`
    : `<div class="text-faint" style="font-size:12px">nenhum</div>`;
  const body = `
    <div class="section-title">${icon("sparkles", { size: 13 })} Regras aprendidas</div>
    ${lst(l.new_rules, "check", "learn-ok")}
    <div class="section-title">${icon("alertTriangle", { size: 13 })} Anti-patterns</div>
    ${lst(l.anti_patterns, "alertTriangle", "learn-bad")}`;
  return card({ title: "Aprendizado", icon: "brain", accent: "purple", body });
}

function patches(s) {
  const p = s.patches || {}, list = p.patches || [], c = p.counts || {};
  const body = `
    <div class="chip-row" style="margin-bottom:10px">
      <span class="chip">applied <b>${c.applied || 0}</b></span>
      <span class="chip">draft <b>${c.draft || 0}</b></span>
      <span class="chip">rejected <b>${c.rejected || 0}</b></span>
    </div>
    ${list.length ? `<div class="row-list">${list.map((x) => `<div class="row">
      <div class="row-main"><div class="row-title mono">${esc(x.patch_id)}</div>
        <div class="row-sub">${esc(x.asset)} · ${x.rules} regras · ${x.anti} anti</div></div>
      ${pill(x.verdict || x.status, { tone: x.verdict === "PASS" ? "ok" : "neutral" })}</div>`).join("")}</div>`
      : emptyState("layers", "Sem patches")}`;
  return card({ title: "Learning patches", icon: "layers", body });
}

export default {
  id: "references", label: "Referências", icon: "image",
  title: "Reference Pack & Aprendizado", subtitle: "Curadoria de referências, renders e o que o estúdio aprendeu",
  badge: (s) => (s?.refpack?.counts?.pending) || null,
  render(s) {
    if (!s) return `<div class="card"><div class="card-body">${skeleton(6)}</div></div>`;
    const refs = s.refpack?.references || [];
    const refsHtml = refs.length
      ? `<div class="ref-grid">${refs.map(refCard).join("")}</div>`
      : emptyState("palette", "Reference Pack vazio");
    return `
      <div class="grid">
        <div class="col-12">
          <div class="section-title">${icon("palette", { size: 14 })} Reference Pack · curadoria
            <span class="text-faint">${esc(s.refpack?.theme || "")}</span></div>
          ${refsHtml}
        </div>
        <div class="col-8">${renders(s)}</div>
        <div class="col-4">${learning(s)}${patches(s)}</div>
      </div>`;
  },
  mount(root, ctx) {
    root.querySelectorAll("[data-ref]").forEach((b) => b.onclick = () =>
      ctx.post("/api/curate-ref", { id: b.dataset.ref, action: b.dataset.action }, `Referência: ${b.dataset.action}`));
  },
};
