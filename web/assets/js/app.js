// app.js — shell + router + command palette do cockpit Interior Studio.
import { store, api } from "./api.js";
import { icon } from "./icons.js";
import { esc, timeAgo } from "./ui.js";

import overview from "./views/overview.js";
import workflows from "./views/workflows.js";
import agents from "./views/agents.js";
import backlog from "./views/backlog.js";
import references from "./views/references.js";
import docs from "./views/docs.js";

/* ── registro de navegação ────────────────────────────────────────────────*/
const NAV = [
  { section: "Estúdio", items: [overview, workflows, agents, backlog] },
  { section: "Conhecimento", items: [references, docs] },
];
const VIEWS = NAV.flatMap((s) => s.items);
const byId = Object.fromEntries(VIEWS.map((v) => [v.id, v]));
const DEFAULT = "overview";

/* contexto passado às views pra disparar ações/atualizações */
const ctx = {
  store, api,
  refresh: () => store.refresh(),
  async post(path, body, okMsg) {
    try { const r = await api.post(path, body); if (okMsg) toast(okMsg, "ok"); await store.refresh(); return r; }
    catch (e) { toast(e.message || "falhou", "danger"); }
  },
  toast,
  navigate: (id) => { location.hash = `#/${id}`; },
};

/* ── render do shell (uma vez) ────────────────────────────────────────────*/
function renderShell() {
  const navHtml = NAV.map((s) => `
    <div class="nav-section">${esc(s.section)}</div>
    ${s.items.map((v) => `
      <a class="nav-item" href="#/${v.id}" data-view="${v.id}">
        ${icon(v.icon, { size: 17 })}<span>${esc(v.label)}</span>
        <span class="nav-badge" data-badge="${v.id}" hidden></span>
      </a>`).join("")}
  `).join("");

  document.getElementById("app").innerHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <span class="brand-mark">${icon("box", { size: 18 })}</span>
        <div>
          <div class="brand-name"><b>INTERIOR</b> STUDIO</div>
          <div class="brand-sub">multi-agent cockpit</div>
        </div>
      </div>
      <nav class="nav">${navHtml}</nav>
      <div class="sidebar-foot">
        <a class="nav-item" href="/explica" target="_blank" rel="noopener">
          ${icon("external", { size: 17 })}<span>Explica · Mapa · Fluxo</span>
        </a>
      </div>
    </aside>

    <header class="topbar">
      <button class="btn btn--icon btn--ghost nav-toggle" id="navToggle" aria-label="Menu">
        ${icon("grid", { size: 18 })}
      </button>
      <div class="topbar-title">
        <h1 id="pageTitle">Visão Geral</h1>
        <span class="crumb" id="pageCrumb">Interior Studio</span>
      </div>
      <div class="topbar-spacer"></div>
      <button class="search-trigger" id="searchTrigger" aria-label="Buscar">
        ${icon("search", { size: 15 })}<span>Buscar…</span><span class="kbd">⌘K</span>
      </button>
      <button class="btn btn--icon btn--ghost" id="refreshBtn" aria-label="Atualizar" title="Atualizar">
        ${icon("refresh", { size: 17 })}
      </button>
      <span class="conn" id="conn" data-status="connecting">
        <span class="conn-dot"></span><span id="connText">conectando…</span>
      </span>
    </header>

    <main class="main" id="main"><div class="page" id="view"></div></main>
    <div class="scrim" id="scrim"></div>
  `;

  document.getElementById("refreshBtn").onclick = () => { store.refresh(); toast("Atualizando…"); };
  document.getElementById("searchTrigger").onclick = openCmdk;
  const tgl = document.getElementById("navToggle");
  const sb = document.getElementById("sidebar"), scrim = document.getElementById("scrim");
  tgl.onclick = () => { sb.classList.toggle("is-open"); scrim.classList.toggle("is-open"); };
  scrim.onclick = () => { sb.classList.remove("is-open"); scrim.classList.remove("is-open"); };
}

/* ── conexão (topbar) ─────────────────────────────────────────────────────*/
function renderConn() {
  const c = document.getElementById("conn");
  if (!c) return;
  c.dataset.status = store.status;
  const txt = { live: "ao vivo", mock: "modo mock", offline: "upstream offline",
                connecting: "conectando…" }[store.status];
  const t = store.lastUpdate && store.status === "live" ? ` · ${timeAgo(store.lastUpdate)}` : "";
  document.getElementById("connText").textContent = txt + t;
}

/* ── router ───────────────────────────────────────────────────────────────*/
function currentId() {
  const id = (location.hash.replace(/^#\//, "") || DEFAULT).split("?")[0];
  return byId[id] ? id : DEFAULT;
}

function renderView() {
  const v = byId[currentId()];
  const root = document.getElementById("view");
  if (!root) return;

  document.querySelectorAll(".nav-item[data-view]").forEach((a) =>
    a.classList.toggle("is-active", a.dataset.view === v.id));
  document.getElementById("pageTitle").textContent = v.title || v.label;
  document.getElementById("pageCrumb").textContent = v.subtitle || "Interior Studio";

  const head = `<div class="page-head"><h2>${esc(v.title || v.label)}</h2>
    ${v.subtitle ? `<p>${esc(v.subtitle)}</p>` : ""}</div>`;
  root.innerHTML = head + v.render(store.data, ctx);
  if (v.mount) v.mount(root, ctx);
  document.getElementById("app").setAttribute("aria-busy", store.data ? "false" : "true");
  document.getElementById("main").scrollTop = 0;
  document.getElementById("sidebar")?.classList.remove("is-open");
  document.getElementById("scrim")?.classList.remove("is-open");
}

function renderBadges() {
  for (const v of VIEWS) {
    const node = document.querySelector(`[data-badge="${v.id}"]`);
    if (!node) continue;
    const n = v.badge ? v.badge(store.data) : null;
    if (n) { node.textContent = n; node.hidden = false; } else { node.hidden = true; }
  }
}

/* ── command palette ──────────────────────────────────────────────────────*/
let cmdkActive = 0, cmdkFiltered = [];
function cmdkItems() {
  const nav = VIEWS.map((v) => ({ label: v.label, hint: "página", icon: v.icon,
    run: () => ctx.navigate(v.id) }));
  return nav.concat([
    { label: "Atualizar dados", hint: "ação", icon: "refresh", run: () => store.refresh() },
    { label: "Abrir Explica / Mapa / Fluxo", hint: "externo", icon: "external",
      run: () => window.open("/explica", "_blank") },
  ]);
}
function openCmdk() {
  const all = cmdkItems(); cmdkFiltered = all; cmdkActive = 0;
  const o = document.getElementById("cmdk");
  o.innerHTML = `<div class="cmdk">
    <div class="cmdk-input">${icon("search", { size: 18 })}
      <input id="cmdkInput" placeholder="Buscar páginas e ações…" autocomplete="off" /></div>
    <div class="cmdk-list" id="cmdkList"></div></div>`;
  o.classList.add("is-open");
  const input = document.getElementById("cmdkInput");
  const draw = () => {
    document.getElementById("cmdkList").innerHTML = cmdkFiltered.map((it, i) => `
      <div class="cmdk-item ${i === cmdkActive ? "is-active" : ""}" data-i="${i}">
        ${icon(it.icon, { size: 16 })}<span>${esc(it.label)}</span>
        <span class="cmdk-hint">${esc(it.hint)}</span></div>`).join("") ||
      `<div class="loading-row">nada encontrado</div>`;
    document.querySelectorAll(".cmdk-item").forEach((n) =>
      n.onclick = () => runCmdk(cmdkFiltered[+n.dataset.i]));
  };
  input.oninput = () => {
    const q = input.value.toLowerCase();
    cmdkFiltered = all.filter((it) => it.label.toLowerCase().includes(q));
    cmdkActive = 0; draw();
  };
  input.onkeydown = (e) => {
    if (e.key === "ArrowDown") { cmdkActive = Math.min(cmdkActive + 1, cmdkFiltered.length - 1); draw(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { cmdkActive = Math.max(cmdkActive - 1, 0); draw(); e.preventDefault(); }
    else if (e.key === "Enter") { runCmdk(cmdkFiltered[cmdkActive]); }
    else if (e.key === "Escape") { closeCmdk(); }
  };
  o.onclick = (e) => { if (e.target === o) closeCmdk(); };
  draw(); input.focus();
}
function runCmdk(it) { if (!it) return; closeCmdk(); it.run(); }
function closeCmdk() { document.getElementById("cmdk").classList.remove("is-open"); }

/* ── toast ────────────────────────────────────────────────────────────────*/
function toast(msg, tone = "neutral") {
  const wrap = document.getElementById("toasts");
  const t = document.createElement("div");
  t.className = `toast toast--${tone}`;
  t.innerHTML = `${icon(tone === "danger" ? "alertCircle" : tone === "ok" ? "check" : "activity",
    { size: 15 })}<span>${esc(msg)}</span>`;
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 250); }, 2600);
}

/* ── bootstrap ────────────────────────────────────────────────────────────*/
function boot() {
  renderShell();
  store.subscribe(() => { renderConn(); renderBadges(); renderView(); });
  window.addEventListener("hashchange", renderView);
  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openCmdk(); }
  });
  renderConn(); renderView();
  store.startPolling(4000);
}
boot();
