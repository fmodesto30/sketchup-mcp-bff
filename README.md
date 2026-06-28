# sketchup-mcp-bff — Interior Studio cockpit

Frontend premium (e BFF fino) para o **dashboard ao vivo do Interior Studio** que roda em
`http://localhost:8782/` — o cockpit multi-agente do projeto `sketchup-mcp`
(PM · Team Lead · Arquiteto, ciclos, reference packs, kanban, renders).

Este repositório **não substitui** a lógica do estúdio: ele redesenha a interface e
serve como **Backend-For-Frontend**, fazendo *proxy* da API que o `studio_dashboard.py`
original já expõe. Domínio preservado, dados reais, visual de devtool premium.

```
browser ──▶ :8782  (sketchup-mcp-bff: server.py + web/)
                 └── proxy /api/* /img/* + páginas-vitrine ──▶ :8781 (studio_dashboard.py)
```

## Por que um BFF

O código do dashboard vive no repositório `GFCDOTA/sketchup-mcp` (que este projeto **não
toca**). Para melhorar a UI sem alterar aquele repo, o frontend novo vive aqui e consome a
API por HTTP. O servidor original passa a ser apenas a fonte de dados (upstream).

## Como rodar

Pré-requisito: Python 3.10+ (stdlib apenas — **sem dependências, sem build**).

```bash
# 1) suba o dashboard original como UPSTREAM (fonte de dados) numa porta separada
python /caminho/para/sketchup-mcp/tools/studio_dashboard.py --port 8781

# 2) suba o BFF (serve a UI nova na 8782 e faz proxy pro upstream)
python server.py
# -> http://127.0.0.1:8782/
```

### Configuração (variáveis de ambiente)

| var | default | descrição |
|---|---|---|
| `BFF_PORT` | `8782` | porta do BFF |
| `BFF_UPSTREAM` | `http://127.0.0.1:8781` | dashboard original (proxy de `/api/*`) |
| `BFF_WEB` | `./web` | diretório do frontend estático |
| `BFF_MOCK` | *(off)* | `1` serve `mocks/state.sample.json` em `/api/state` sem upstream |

**Modo offline / só visual** (sem o upstream rodando):

```bash
BFF_MOCK=1 python server.py    # /api/state vem do snapshot em mocks/
```

## Estrutura

```
server.py                 BFF: serve web/ + proxy /api/* -> upstream  (stdlib)
web/
  index.html              app shell (carrega CSS/JS)
  favicon.svg
  assets/css/
    tokens.css            design tokens (cor · spacing · radius · sombra · type)
    base.css              reset + estados (loading/empty/error)
    components.css        cards · pills · badges · buttons · tabs · logs · timeline
    layout.css            app shell: sidebar · topbar · grid · command palette
    views.css             composições das telas
  assets/js/
    icons.js              set de ícones SVG (substitui emojis)
    api.js                cliente /api/state + store com polling
    ui.js                 primitivos (pill, badge, metric, card, pipeline, estados)
    app.js                shell + hash-router + command palette (Ctrl/Cmd+K) + toasts
    views/                overview · workflows · agents · backlog · references · docs
mocks/state.sample.json   snapshot real de /api/state (contrato + modo offline)
docs/                      INSPECTION.md · ARCHITECTURE.md
```

## Navegação (IA)

| Página | O que mostra |
|---|---|
| **Visão Geral** | mission control: métricas, foco ativo + pipeline, pulso, inventário, pendências |
| **Workflows** | o ciclo como *recipe* (quando usar · inputs · outputs · tools · checklist · riscos) + propostas do Arquiteto |
| **Agentes & Runs** | org PM/Lead/Arquiteto, feed de execução, métricas, sessões/worktrees |
| **Backlog** | kanban (backlog · refinamento · execução · teste · executado) |
| **Referências** | Reference Pack + curadoria, galeria de renders, aprendizado, patches |
| **Documentação** | arquitetura, base de conhecimento, links para Explica/Mapa/Fluxo |

Detalhes em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Levantamento original em
[`docs/INSPECTION.md`](docs/INSPECTION.md).
