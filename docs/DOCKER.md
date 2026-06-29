# Docker — Interior Studio AI Cockpit

O **bff** roda em container **assim como o `sketchup-mcp`** dockeriza a sua dashboard: um
serviço principal, persistente, que reinicia sozinho. A imagem builda o React e serve tudo
na `:8782` com Python stdlib (sem pip, sem git).

## Subir

```bash
docker compose up -d --build
# abrir http://localhost:8782/
docker compose logs -f bff
docker compose down
```

`up -d --build` builda a imagem e sobe **só o `bff`** (`restart: unless-stopped`,
`init: true` para shutdown limpo no `docker stop`/`down`).

## Topologia

```
browser ──▶ :8782  bff (frontend/dist + /api/* do cockpit)
                 ├── proxy /api/state /img/*   ──▶ host.docker.internal:8781  (studio_dashboard NATIVO do motor)
                 ├── /api/models /api/models/chat ──▶ host.docker.internal:11434  (Ollama do HOST)
                 └── Live System Map scanner   ──▶ /repos/sketchup-mcp  (motor, mount READ-ONLY)
```

Como o motor (`sketchup-mcp`), o que é externo fica **fora** do container do bff:

- **Ollama** continua no **host** (`:11434`, GPU); o container o alcança por
  `host.docker.internal` (mapeado via `extra_hosts: host-gateway`).
- **O dashboard do motor** (upstream `:8781`) também roda no **host** por padrão — o
  launcher `SUBIR-NOC` já o sobe. O bff o proxia em `host.docker.internal:8781`.
- **O motor (`sketchup-mcp`) não entra na imagem do bff.** É montado **read-only** em
  `/repos/sketchup-mcp` só para o **Live System Map** ler a árvore real. **O bff nunca
  escreve no motor.**

## Modos de rodar

```bash
# 1) Padrão — só o bff; dados ao vivo do dashboard nativo no host (:8781).
docker compose up -d --build

# 2) Standalone em mock — sem upstream nenhum (snapshot capturado). Builde a imagem antes:
docker build -t interior-studio-bff .
docker run --rm -p 8782:8782 -e BFF_MOCK=1 interior-studio-bff
#    (ou via compose, ignorando o upstream:)  BFF_MOCK=1 docker compose up -d --build

# 3) Tudo em container — inclui o dashboard do motor na :8781 (profile `full`):
docker compose --profile full up -d --build
```

> ⚠️ **O profile `full` escreve no repo do motor.** O `studio_dashboard.py` grava estado de
> runtime no próprio repo (`.ai_bridge/kanban.json`, `artifacts/reference_lab/inbox/`,
> `cycles.jsonl`, `relay.json`, regras do juiz…) — exatamente como a dashboard **nativa**
> faz. Por isso, e só nesse serviço, o mount **não** é read-only. Se quiser o motor
> intocado, fique no modo 1 (dashboard nativo no host) ou 2 (mock).

## Variáveis (serviço `bff`)

| var | valor no container | papel |
|---|---|---|
| `BFF_HOST` | `0.0.0.0` | bind acessível de fora do container (no host fica em `127.0.0.1`) |
| `BFF_MOCK` | `${BFF_MOCK:-0}` | `1` serve `mocks/state.sample.json`, ignora upstream |
| `BFF_UPSTREAM` | `http://host.docker.internal:8781` | dashboard do motor (host ou profile `full`) |
| `BFF_OLLAMA` | `http://host.docker.internal:11434` | Ollama do host |
| `BFF_ENGINE_ROOT` | `/repos/sketchup-mcp` | motor montado p/ o Live System Map |

> O healthcheck bate em `/` (index estático, sem rede) — não em `/api/status` — para não
> reportar `unhealthy` quando o upstream/Ollama está lento ou subindo. Honra `BFF_PORT`.

## Troubleshooting

- **`:8782` já em uso** — pare outra dashboard/stack. `docker ps`; no host
  `netstat -ano | findstr 8782`.
- **Cockpit abre mas dados vazios / `502 upstream_unreachable`** — o dashboard `:8781` não
  está de pé (suba o nativo no host, ou use `--profile full`, ou `-e BFF_MOCK=1`). O bff
  degrada com elegância — telas mostram estado vazio, sem crash. Logo após `compose up` pode
  haver um `502` transitório de poucos segundos até o upstream ligar.
- **Modelos/chat dão `503 ollama_unreachable`** — suba `ollama serve` no host. Em **Linux
  puro** (sem Docker Desktop) o `host.docker.internal` pode não resolver. Duas opções
  autocontidas: **(a)** `-e BFF_OLLAMA=http://172.17.0.1:11434`; ou **(b)** `--network host`
  **e** `-e BFF_OLLAMA=http://127.0.0.1:11434` (sob host networking o `host.docker.internal`
  não é mapeado).
- **Live System Map sem o motor (`enginePresent: false`)** — confirme que `../sketchup-mcp`
  existe ao lado do bff (o mount resolve relativo ao `docker-compose.yml`). É honesto: sem
  o mount, o mapa mostra só o repo do bff.
- **Mudou o frontend** — `dist` é buildado **na imagem**; refaça com `--build`. Para iterar
  UI com HMR use `npm run dev` (`:5173`), fora do Docker.
- **Rebuild limpo** — `docker compose build --no-cache bff`.

## O que NÃO é containerizado por padrão (de propósito)

- **Ollama** — fica no host (GPU); o bff o alcança via `host.docker.internal`.
- **O dashboard do motor (`:8781`)** — roda nativo no host por padrão (`SUBIR-NOC`); só
  vira container no profile `full` (que então escreve no repo do motor).
- **A geração de `.skp`/render do motor** — segue fora deste container.
