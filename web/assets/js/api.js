// api.js — cliente da API do INTERIOR STUDIO + store reativo com polling.
// Tudo passa pelo BFF (mesma origem :8782), que faz proxy pro upstream :8781.

const ENDPOINT = "/api/state";

async function fetchState() {
  const res = await fetch(ENDPOINT, { headers: { Accept: "application/json" } });
  const source = res.headers.get("X-Bff-Source") || "upstream";
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { detail = (await res.json()).detail || detail; } catch (_) {}
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  return { data: await res.json(), source };
}

async function post(path, body = {}) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → HTTP ${res.status}`);
  try { return await res.json(); } catch (_) { return {}; }
}

export const api = { fetchState, post };

/* ── store ──────────────────────────────────────────────────────────────── */
export const store = {
  data: null,
  status: "connecting", // connecting | live | mock | offline
  error: null,
  lastUpdate: null,
  _listeners: new Set(),
  _timer: null,

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  },

  _emit() {
    for (const fn of this._listeners) {
      try { fn(this); } catch (e) { console.error("listener error", e); }
    }
  },

  async refresh() {
    try {
      const { data, source } = await fetchState();
      this.data = data;
      this.status = source === "mock" ? "mock" : "live";
      this.error = null;
      this.lastUpdate = new Date();
    } catch (e) {
      this.status = "offline";
      this.error = e.message || "erro";
    }
    this._emit();
    return this.data;
  },

  startPolling(ms = 4000) {
    this.refresh();
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(() => this.refresh(), ms);
  },

  stopPolling() { if (this._timer) clearInterval(this._timer); this._timer = null; },
};
