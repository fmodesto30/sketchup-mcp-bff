# INTERIOR STUDIO — AI Cockpit BFF (:8782) em container.
#
# Multi-stage: (1) Node builda o frontend React → dist; (2) Python slim (stdlib only)
# serve o dist + os endpoints /api/* do cockpit. O motor (sketchup-mcp) NÃO entra na
# imagem — é montado read-only em runtime (volume) para o Live System Map enxergá-lo.
#
#   docker build -t interior-studio-bff .
#   docker run --rm -p 8782:8782 interior-studio-bff      # MOCK off por padrão
# Preferir o docker-compose.yml (sobe bff + upstream + wiring de Ollama).

# ── stage 1: build do frontend (Vite) ────────────────────────────────────────
FROM node:20-alpine AS web
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-fund --no-audit
COPY frontend/ ./
RUN npm run build           # tsc -b && vite build → /app/frontend/dist

# ── stage 2: runtime do BFF (stdlib only — sem pip, sem git) ──────────────────
FROM python:3.12-slim AS runtime
WORKDIR /app

# código do BFF + fonte do frontend (para o scanner do Live System Map enxergar a
# árvore real do repo) — node_modules/dist ficam fora via .dockerignore.
COPY server.py cockpit_api.py file_activity.py noc_mirror.py README.md ./
COPY mocks/ ./mocks/
COPY docs/ ./docs/
COPY frontend/ ./frontend/
# o dist buildado entra por cima da fonte do frontend
COPY --from=web /app/frontend/dist ./frontend/dist

ENV BFF_HOST=0.0.0.0 \
    BFF_PORT=8782 \
    BFF_WEB=/app/frontend/dist \
    BFF_UPSTREAM=http://host.docker.internal:8781 \
    BFF_OLLAMA=http://host.docker.internal:11434 \
    PYTHONUNBUFFERED=1

EXPOSE 8782

# Healthcheck de LIVENESS do BFF (stdlib only; sem curl/wget na slim). Bate em "/"
# (index.html estático — zero rede), não em /api/status, que chama upstream(8s)+ollama(2s)
# e flaparia pra unhealthy quando uma dependência está lenta/subindo. Honra BFF_PORT.
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=4 \
  CMD ["python", "-c", "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('BFF_PORT','8782')+'/', timeout=3)"]

CMD ["python", "server.py"]
