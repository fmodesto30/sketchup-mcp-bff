// views/overview.js — Dashboard inicial / mission control.
import { card, metric, pill, pipeline, emptyState, skeleton, esc, timeAgo, icon } from "../ui.js";

function metrics(s) {
  const bl = s.backlog || {}, ag = s.agents || {}, rp = s.refpack || {};
  const online = (ag.umbrellas || []).flatMap((u) => [u.lead, ...(u.subs || [])])
    .filter((a) => a && a.online).length;
  const total = (ag.umbrellas || []).flatMap((u) => [u.lead, ...(u.subs || [])]).length;
  const pend = (s.proposals?.pending || []).length;
  return `<div class="metric-grid">
    ${metric(bl.total ?? "—", "Backlog", { icon: "backlog", sub: `${bl.done || 0} concluídos · ${bl.geo || 0} geo` })}
    ${metric((s.renders || []).length, "Renders", { icon: "image", tone: "gold" })}
    ${metric(`${online}/${total}`, "Agentes online", { icon: "bot", tone: online ? "ok" : undefined })}
    ${metric(rp.counts?.approved ?? 0, "Refs aprovadas", { icon: "palette", sub: `${rp.counts?.total || 0} no pack` })}
    ${metric(pend, "Propostas", { icon: "clipboard", tone: pend ? "warn" : undefined, sub: pend ? "aguardando você" : "em dia" })}
  </div>`;
}

function hero(s, ctx) {
  const f = (s.overview?.active_focuses || [])[0];
  const fac = s.factory || {};
  if (!f) return card({ title: "Foco ativo", icon: "target", body: emptyState("target", "Nenhum foco ativo") });
  const steps = (f.pipeline || []).map((p) => ({ icon: p.icon, label: p.label, status: p.status }));
  const body = `
    <div class="hero">
      <div class="hero-line">
        <span class="hero-env">${esc(f.env_icon || "")} ${esc(f.env_label || "")}</span>
        <span class="hero-sep">/</span>
        <span class="hero-asset">${esc(f.label || f.asset || "")}</span>
        ${pill(f.state_label || f.state || "", { tone: "info" })}
      </div>
      <p class="hero-reason">${icon("sparkles", { size: 14 })} ${esc(f.reason || "")}</p>
      ${fac.next_action ? `<div class="hero-next"><span class="h-eyebrow">Próximo</span>
        <button class="btn btn--primary btn--sm" data-act="cycle">${icon("play", { size: 14 })} ${esc(f.next || fac.next_action)}</button></div>` : ""}
    </div>
    <div class="section-title">Pipeline do ciclo · ${esc(fac.cycle_id || "")}</div>
    ${pipeline(steps)}`;
  return card({ title: "Foco ativo", eyebrow: s.overview?.project || "projeto", icon: "target",
    accent: "orange", body,
    actions: `<a class="btn btn--sm btn--ghost" href="#/workflows">Workflows ${icon("arrowRight", { size: 13 })}</a>` });
}

function pulse(s) {
  const feed = s.agents?.feed || [];
  const claims = (s.sessions?.claims || []).slice(0, 5);
  let body;
  if (feed.length) {
    body = `<div class="logs">` + feed.slice(0, 8).map((f) => `
      <div class="log-line" data-level="${esc((f.status || "").toLowerCase())}">
        <span class="log-time">${esc(timeAgo(f.ts))}</span>
        <span class="log-agent">${esc(f.agent || "—")}</span>
        <span class="log-msg">${esc(f.message || "")}</span></div>`).join("") + `</div>`;
  } else {
    body = emptyState("activity", "Sem falas recentes", "Os agentes ainda não publicaram no feed deste ciclo.");
  }
  const sessions = claims.length ? `<div class="section-title">Sessões / claims</div>
    <div class="row-list">${claims.map((c) => `<div class="row">
      <div class="row-main"><div class="row-title">${esc(c.mt)} · ${esc(c.desc)}</div>
        <div class="row-sub">${esc(c.owner)}</div></div>
      <div class="row-aside">${pill(c.status, {})}</div></div>`).join("")}</div>` : "";
  return card({ title: "Pulso", icon: "activity", body: body + sessions });
}

function rooms(s) {
  const rs = s.overview?.rooms || [];
  if (!rs.length) return card({ title: "Inventário por cômodo", icon: "home", body: emptyState("home", "Sem cômodos") });
  const body = `<div class="row-list">` + rs.map((r) => {
    const pct = r.total ? Math.round((r.done / r.total) * 100) : 0;
    return `<div class="row">
      <div class="row-main">
        <div class="row-title">${esc(r.icon || "")} ${esc(r.label)}</div>
        <div class="row-sub">${r.done}/${r.total} prontos · ${(r.assets || []).length} assets</div>
        <div class="bar bar--ok" style="margin-top:7px"><i style="width:${pct}%"></i></div>
      </div>
      <div class="row-aside">${pill(`${pct}%`, { tone: pct === 100 ? "ok" : "neutral", dot: false })}</div>
    </div>`;
  }).join("") + `</div>`;
  return card({ title: "Inventário por cômodo", icon: "home", body });
}

function alerts(s, ctx) {
  const items = [];
  const pend = s.proposals?.pending || [];
  if (pend.length) items.push({ tone: "warn", icon: "clipboard",
    txt: `${pend.length} proposta(s) do Arquiteto aguardando aprovação`, go: "workflows" });
  if (s.consult?.status === "waiting_gpt_answer") items.push({ tone: "info", icon: "brain",
    txt: "Consult GPT aguardando resposta", go: "references" });
  const bl = s.backlog || {};
  if (bl.total && !bl.done) items.push({ tone: "neutral", icon: "backlog",
    txt: `${bl.total} microtarefas no backlog`, go: "backlog" });
  const body = items.length
    ? `<div class="row-list">${items.map((a) => `<a class="row" href="#/${a.go}" style="cursor:pointer">
        <div class="row-aside">${icon(a.icon, { size: 16, cls: "" })}</div>
        <div class="row-main"><div class="row-title">${esc(a.txt)}</div></div>
        ${pill("ver", { tone: a.tone, dot: false })}</a>`).join("")}</div>`
    : emptyState("check", "Tudo em dia", "Nenhuma pendência aberta.");
  return card({ title: "Pendências & alertas", icon: "bell", body });
}

export default {
  id: "overview", label: "Visão Geral", icon: "grid",
  title: "Visão Geral", subtitle: "Mission control do estúdio — estado, foco e pulso",
  badge: (s) => (s?.proposals?.pending?.length) || null,
  render(s) {
    if (!s) return `<div class="grid"><div class="col-12">${skeleton(2)}</div>
      <div class="col-8 card"><div class="card-body">${skeleton(5)}</div></div>
      <div class="col-4 card"><div class="card-body">${skeleton(4)}</div></div></div>`;
    return `
      <div class="grid">
        <div class="col-12">${metrics(s)}</div>
        <div class="col-8">${hero(s)}</div>
        <div class="col-4">${pulse(s)}</div>
        <div class="col-8">${rooms(s)}</div>
        <div class="col-4">${alerts(s)}</div>
      </div>`;
  },
  mount(root, ctx) {
    root.querySelector('[data-act="cycle"]')?.addEventListener("click", () =>
      ctx.post("/api/cycle", {}, "Ciclo avançado"));
  },
};
