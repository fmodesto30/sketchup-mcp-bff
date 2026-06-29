# Arquitetura — Interior Studio cockpit (BFF)

## Visão geral

O cockpit é um **frontend React (build estático) + BFF**. A regra de negócio do estúdio
continua no `studio_dashboard.py` do repo `sketchup-mcp` (upstream); o BFF é a borda que
serve o app React (`frontend/dist`), expõe os endpoints do cockpit (`cockpit_api.py`),
integra o Ollama e repassa o `/api/state` legado. Detalhes do frontend em
[`../frontend/README.md`](../frontend/README.md).

```
┌──────────┐   GET /                  ┌──────────────────────────────┐   proxy /api/state   ┌────────────────────┐
│ browser  │ ───────────────────────▶ │  BFF (server.py)             │ ───────────────────▶ │ studio_dashboard.py │
│ :8782    │ ◀──── frontend/dist ────  │  + cockpit_api + Ollama      │ ◀──── JSON / PNG ──── │ upstream :8781      │
└──────────┘   GET /api/*             └──────────────────────────────┘                       └────────────────────┘
```

- O browser fala com **uma só origem** (`:8782`) — sem CORS.
- `server.py` decide, por path: **rota nativa do cockpit** (cockpit_api) → **proxy** → **estático**.
- O upstream é a fonte de verdade dos **dados legados** (`/api/state`); os demais endpoints derivam dele.

## Roteamento do `server.py`

| Path | Ação |
|---|---|
| `/api/status`, `/api/models`, `/api/agents`, `/api/runs*`, `/api/decisions*`, `/api/workflows*`, `/api/artifacts` | **cockpit_api** (nativo) |
| `/api/state`, `/img/**`, `/inbox-img/**`, páginas legadas | **proxy** → upstream |
| `/`, `/assets/**`, `/favicon.svg` | **estático** de `frontend/dist` |
| rota desconhecida (sem extensão) | **estático** `index.html` (fallback do React Router) |

O frontend usa **React Router** (BrowserRouter). O `server.py` faz fallback para `index.html`
em rotas desconhecidas, então deep-links (`/docs`, `/runs/:id`) e refresh funcionam. As páginas
legadas da "vitrine" (`/explica`, `/grafo`, …) continuam sendo **proxiadas** para o upstream
caso alguém as acesse, mas o cockpit React não navega mais para elas.

Resiliência: se o upstream estiver fora do ar, `/api/*` responde `502` com um JSON de
diagnóstico (sem fabricar dados). Com `BFF_MOCK=1`, `/api/state` é servido do snapshot.

## Frontend (React)

O frontend (`frontend/`) é React + TS + Vite + Tailwind + Radix + TanStack Query. **Estado de
servidor** vive no Query (sobre um client tipado em `src/api/`, com SSE para logs de run ao
vivo); **UI-state** (command palette) no Zustand. O contrato está em `src/api/types.ts`.
Design system, hooks e como adicionar uma tela: [`../frontend/README.md`](../frontend/README.md).

## Contrato `GET /api/state`

Snapshot real versionado em [`../mocks/state.sample.json`](../mocks/state.sample.json).
Chaves consumidas pelas views:

| chave | view(s) |
|---|---|
| `overview` (`active_focuses[].pipeline`, `rooms`) | Visão Geral, Workflows |
| `factory` (ciclo atual) | Visão Geral, Workflows |
| `agents` (`umbrellas`, `feed`, `metrics`, `model_usage`) | Agentes & Runs, Visão Geral |
| `backlog` (`tasks[]`, contadores) | Backlog, Visão Geral |
| `sessions` (`worktrees`, `claims`) | Agentes & Runs, Visão Geral |
| `proposals` (`pending[]`) | Workflows, Visão Geral |
| `refpack` (`references[]`, `counts`) | Referências, Workflows |
| `renders[]` | Referências |
| `learning`, `patches` | Referências |
| `knowledge`, `references` (`by_kind`/`by_theme`), `consult` | Documentação |

## Endpoints do cockpit (`cockpit_api.py`)

| endpoint | origem dos dados |
|---|---|
| `GET /api/status` | saúde do upstream + Ollama |
| `GET /api/models` · `POST /api/models/chat` | Ollama (`:11434`) |
| `GET /api/agents` · `/api/workflows` · `/api/decisions` · `/api/artifacts` | derivados do `/api/state` |
| `GET /api/runs` · `/api/runs/:id` · `/api/runs/:id/logs` (SSE) | registry de runs (runner **stub**) |
| `POST /api/agents/:id/run` · `/api/workflows/:id/run` | cria um run |
| `POST /api/decisions/:id/respond` | proxy → upstream `/api/proposal` |

Endurecimentos (review): bind `127.0.0.1` por padrão, teto de body 1 MiB (413), heartbeat no
SSE, locks no registry de runs, validação de id em decisions, status de agente normalizado.

## Critérios preservados

- `http://localhost:8782/` é o cockpit React, com **dados reais** (derivados + proxy).
- O **domínio** do app (Interior Studio / sketchup-mcp) é mantido — nada inventado.
- Nenhuma mudança no repo de origem do estúdio.
