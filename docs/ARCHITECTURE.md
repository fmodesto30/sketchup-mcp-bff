# Arquitetura — Interior Studio cockpit (BFF)

## Visão geral

O cockpit é um **frontend estático + BFF fino**. Ele não contém regra de negócio do
estúdio: toda a lógica (ciclos, propostas, curadoria, LLMs) continua no
`studio_dashboard.py` do repo `sketchup-mcp`. Aqui só vive a **camada de apresentação** e
um servidor de borda que serve essa camada e repassa a API.

```
┌──────────┐   GET /             ┌────────────────────────┐   proxy /api/*        ┌───────────────────────┐
│ browser  │ ─────────────────▶  │  BFF  (server.py)      │ ────────────────────▶ │ studio_dashboard.py    │
│ :8782    │ ◀───── web/ ──────  │  + web/ (estático)     │ ◀──── JSON / PNG ──── │ upstream :8781         │
└──────────┘   GET /api/state    └────────────────────────┘                       └───────────────────────┘
```

- O browser sempre fala com **uma só origem** (`:8782`) — sem CORS.
- `server.py` decide, por path, se **serve estático** ou se **faz proxy**.
- O upstream é a fonte única de verdade dos dados.

## Roteamento do `server.py`

| Path | Ação |
|---|---|
| `/`, `/assets/**`, `/favicon.svg` | **estático** de `web/` |
| rota desconhecida (sem extensão) | **estático** `index.html` (SPA hash-routing) |
| `/api/**`, `/img/**`, `/inbox-img/**` | **proxy** → upstream |
| `/explica`, `/grafo`, `/fluxo`, `/como-funciona`, `/agents`, `/vitrine`, … | **proxy** → upstream (páginas "vitrine" do dashboard original) |

O frontend usa **hash-routing** (`#/overview`, `#/agents`, …) justamente para não colidir
com as rotas reais que o upstream serve (ex.: `/agents` é uma página da vitrine).

Resiliência: se o upstream estiver fora do ar, `/api/*` responde `502` com um JSON de
diagnóstico (sem fabricar dados). Com `BFF_MOCK=1`, `/api/state` é servido do snapshot.

## Fluxo de dados no frontend

`api.js` expõe um **store** com polling:

1. `store.startPolling(4000)` busca `/api/state` a cada 4s.
2. Cada resposta atualiza `store.data` + `store.status` (`live` / `mock` / `offline`).
3. `store` notifica os assinantes → `app.js` re-renderiza a view ativa e os badges.

A view ativa é função pura do estado: `view.render(state) -> htmlString`. Efeitos
colaterais (cliques, ações POST) são ligados em `view.mount(root, ctx)`.

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

## Design system

Tudo deriva de **tokens** (`tokens.css`): superfícies do escuro, marca dourada + azul
interativo, semânticos (`ok/warn/danger/info/purple/orange`), escala de spacing 4px,
raios, sombras e tipografia (Inter + JetBrains Mono, com fallback `system-ui`).

Camadas de CSS, em ordem de carga:

1. `tokens.css` — variáveis (única fonte de cor/medida).
2. `base.css` — reset, tipografia, scrollbars, estados loading/empty/error.
3. `components.css` — primitivos (card, pill, badge, button, tab, metric, log, timeline, pipeline, agente, galeria, callout).
4. `layout.css` — app shell (sidebar, topbar, grid de 12 colunas, command palette, toast).
5. `views.css` — composições específicas de cada tela.

Primitivos equivalentes em JS vivem em `ui.js` (`pill`, `badge`, `metric`, `card`,
`pipeline`, `emptyState`, `errorState`, `skeleton`) e `icons.js` (`icon(name)`).

## Como adicionar uma página

1. Crie `web/assets/js/views/minha.js` exportando:
   ```js
   export default {
     id: "minha", label: "Minha", icon: "grid",
     title: "Minha página", subtitle: "…",
     badge: (state) => null,           // opcional (número no menu)
     render(state, ctx) { return "…html…"; },
     mount(root, ctx) { /* listeners */ },
   };
   ```
2. Importe e registre em `app.js` (`NAV`).
3. Use os primitivos de `ui.js`/`icons.js`; estilos específicos vão em `views.css`.

`ctx` oferece `ctx.post(path, body, okMsg)` (POST + toast + refresh), `ctx.refresh()`,
`ctx.navigate(id)` e `ctx.toast(msg, tone)`.

## Critérios preservados

- `http://localhost:8782/` continua funcionando, com **dados reais** (via proxy).
- O **domínio** do app (Interior Studio / sketchup-mcp) é mantido — nada inventado.
- Nenhuma mudança no repo de origem `GFCDOTA/sketchup-mcp`.
