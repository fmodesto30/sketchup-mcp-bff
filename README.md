# sketchup-mcp-bff — Interior Studio AI Cockpit

**AI Cockpit** (React + TypeScript) + **BFF** (Python) para operar o Interior Studio do
projeto `sketchup-mcp` — o estúdio multi-agente que gera `.skp` fiéis a plantas de PDF e
mobília/renderiza ambientes. Um app só, numa porta só: `http://localhost:8782/`.

```
browser ──▶ :8782  (BFF: serve frontend/dist + /api/* do cockpit)
                 ├── Ollama :11434          (modelos locais — models, chat)
                 ├── runner                 (runs + logs ao vivo via SSE)
                 └── proxy /api/state /img  ──▶ :8781 (studio_dashboard.py — dados legados)
```

> **Arquitetura:** o frontend fala **só** com `/api/*`. Quem conversa com modelos locais,
> com o dashboard legado e com o runner de agents é o **BFF** ([`cockpit_api.py`](cockpit_api.py))
> — nunca o React. O código do estúdio vive em `GFCDOTA/sketchup-mcp` (não é tocado aqui).

## Como rodar

Pré-requisitos: **Python 3.10+** (BFF, stdlib) e **Node 18+** (build do React).

```bash
# 1) build do React (uma vez; gera frontend/dist)
cd frontend && npm install && npm run build && cd ..

# 2) upstream — fonte de dados legados (porta 8781 é obrigatória)
python /caminho/para/sketchup-mcp/tools/studio_dashboard.py --port 8781

# 3) BFF — serve o cockpit + API na 8782
python server.py
# -> http://127.0.0.1:8782/
```

Desenvolvimento do frontend (HMR, opcional): `cd frontend && npm run dev` (`:5173`, faz
proxy de `/api` pro BFF). Ver [`frontend/README.md`](frontend/README.md).

### Variáveis de ambiente (BFF)

| var | default | descrição |
|---|---|---|
| `BFF_HOST` | `127.0.0.1` | bind (localhost por padrão — não expõe na LAN) |
| `BFF_PORT` | `8782` | porta do BFF |
| `BFF_UPSTREAM` | `http://127.0.0.1:8781` | dashboard legado (proxy de `/api/state` + imagens) |
| `BFF_OLLAMA` | `http://127.0.0.1:11434` | Ollama (modelos locais) |
| `BFF_WEB` | `./frontend/dist` | diretório do build React servido |
| `BFF_MOCK` | *(off)* | `1` serve `mocks/state.sample.json` em `/api/state` sem upstream |

## Estrutura

```
server.py            BFF: serve frontend/dist + dispatch do cockpit_api + proxy  (stdlib)
cockpit_api.py       endpoints AI (status, models/Ollama, agents, runs+SSE, decisions, workflows)
frontend/            app React (Vite + TS + Tailwind + Radix + TanStack Query)
  src/api/           contrato tipado + mocks + client + hooks (Query/SSE)
  src/components/    design system (ui/) + shell (sidebar/topbar/command palette)
  src/screens/       overview · agents · runs · run-detail · workflows · models · decisions · artifacts · docs
mocks/state.sample.json   snapshot real de /api/state (contrato + modo offline)
docs/                INSPECTION.md (histórico) · ARCHITECTURE.md
```

## Telas

| Tela | O que mostra |
|---|---|
| **Visão Geral** | mission control: status, métricas, runs recentes, decisões, workflow ativo |
| **Agentes** | time multi-agente — status, modelo, tools, disparo de run |
| **Runs** | histórico filtrável; o detalhe traz timeline + **log viewer ao vivo (SSE)** |
| **Workflows** | recipes (quando usar · inputs · outputs · tools · checklist · riscos) |
| **Modelos** | modelos do Ollama + testar prompt (via BFF) |
| **Decisões** | gates (propostas, revisão visual) com responder |
| **Artefatos** | renders, SKPs, relatórios (lightbox in-app) |
| **Documentação** | arquitetura, pipeline, guia das telas, base de conhecimento — tudo in-app |
| **Studio Flow** | documentação viva ponta a ponta: timeline interativa, mapa de arquitetura, árvore dos repos, recipes, runbook (gerada do código real, marcando implemented/mock/planned) |

Endpoints e contrato em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) e `frontend/src/api/types.ts`.

## Temas

O cockpit tem **10 temas premium** trocáveis pelo **header** — persistem em `localStorage`,
com transição suave e respeitando `prefers-reduced-motion`. Tudo é **token-driven** (CSS vars
HSL), então o tema propaga em sidebar, header, cards, badges, logs e docs sem hardcode.

- Default: **🌑 Obsidian Agent** (AI cockpit dark premium). Demais: ◼️ Linear Slate, 🟨 Studio Gold,
  🧬 Cyber Grid, 📐 Blueprint Architect, 🟢 Supabase Emerald, 🚀 Raycast Command, 🟣 Cursor Neon,
  🧊 Frosted Glass, ☀️ Minimal Light (claro).
- Compare todos na tela **Theme Lab** (`/theme-lab`) — todos os componentes num lugar só.

### Como adicionar um tema

1. Em `frontend/src/theme/themes.ts`, adicione um objeto `Theme` (tipo em `theme-types.ts`):
   `id`, `name`, `emoji`, `description`, `isDark`, `background` (`none`/`grid`/`mesh`/`glass`/`glow`/`dots`),
   `motion`, `preview` (4 cores hex), `colors` (HSL triplets — ver as chaves em `theme-types.ts`),
   e `glow`/`shadow`/`radius`.
2. Pronto — ele aparece no switcher do header e no Theme Lab automaticamente.

Arquivos: `src/theme/` (`theme-types`, `themes`, `apply-theme`, `theme-provider`, `use-theme`) ·
`src/components/theme/theme-switcher.tsx`.
