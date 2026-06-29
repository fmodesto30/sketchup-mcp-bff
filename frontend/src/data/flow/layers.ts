import type { Layer } from "./types";

export const architectureLayers: Layer[] = [
  {
    "name": "Browser (origem única :8782)",
    "detail": "O navegador fala só com http://localhost:8782 — sem CORS. Carrega o app React de frontend/dist e chama /api/*.",
    "status": "implemented"
  },
  {
    "name": "Frontend React (frontend/dist)",
    "detail": "Vite+TS+Tailwind+Radix+TanStack Query+React Router. client.ts garante que o front só toca /api/*; SSE para logs de run ao vivo; Zustand p/ UI-state. Build real servido pelo server.py.",
    "status": "implemented"
  },
  {
    "name": "BFF roteador (server.py)",
    "detail": "ThreadingHTTPServer :8782 stdlib-only. Por path decide: rota nativa do cockpit (cockpit_api.dispatch) → proxy → estático. Fallback p/ index.html em rota desconhecida (React Router). Teto de body 1 MiB (413), bind 127.0.0.1.",
    "status": "implemented"
  },
  {
    "name": "Cockpit API — Ollama (cockpit_api.py)",
    "detail": "/api/status, /api/models e /api/models/chat falam REALMENTE com Ollama em :11434 (/api/tags, /api/chat). O chat é proxy real, não simulado.",
    "status": "implemented"
  },
  {
    "name": "Cockpit API — dados derivados (cockpit_api.py)",
    "detail": "/api/agents, /api/workflows, /api/decisions, /api/artifacts são DERIVADOS em tempo real do /api/state do upstream (funções _derive_*). Cache de 2s do state. Sem upstream → 502 com diagnóstico (não fabrica dados).",
    "status": "implemented"
  },
  {
    "name": "Cockpit API — runs/runner (cockpit_api.py)",
    "detail": "Registry RUNS em memória + _runner: STUB explícito que simula steps com time.sleep(0.8+0.5*i) e injeta falha pseudo-determinística no passo 'verify' (~1 em 5). /api/runs*, POST /api/agents/:id/run e /api/workflows/:id/run criam runs simulados. O próprio docstring diz 'runner aqui é um STUB'. _seed_runs deriva runs iniciais dos claims do /api/state.",
    "status": "mock"
  },
  {
    "name": "Proxy → upstream studio_dashboard.py (:8781)",
    "detail": "server.py._proxy repassa /api/state, /img/**, /inbox-img/**, /api/kgraph, /api/consult/* e páginas-vitrine (/explica /grafo /fluxo ...) tal e qual ao dashboard legado. POST /api/decisions/:id/respond encaminha de fato a /api/proposal do upstream. Upstream REAL no repo engine.",
    "status": "implemented"
  },
  {
    "name": "Modo MOCK (BFF_MOCK=1)",
    "detail": "Sem upstream, /api/state é servido do snapshot real mocks/state.sample.json (header X-Bff-Source: mock). No front, VITE_MOCKS=1 usa fixtures tipadas em api/mocks.ts. Substrato de mock para dev offline.",
    "status": "mock"
  },
  {
    "name": "Motor sketchup-mcp (engine)",
    "detail": "Pipeline real PDF→consensus→.skp (build_plan_shell_skp.py/.rb), builders de móvel, gates determinísticos, renderers V-Ray, estúdio multi-agente (interior_studio/) e agentes .claude/. É a fonte de verdade do domínio; o BFF não o altera. Roda fora do cockpit (não é acionado pelo runner stub do BFF).",
    "status": "implemented"
  }
];
