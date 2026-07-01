# SUBIR-DASHBOARD.ps1 — sobe a PÁGINA ÚNICA de monitoramento e abre SÓ ela.
#
# Você abre http://localhost:8782 e vê TUDO num lugar só:
#   • Estúdio (agentes / runs / decisões / kanban)   — dado do provedor :8781
#   • NOC / Sistema (saúde GYR, gate, sessões, git, .skp) — LIDO DE ARQUIVO (o :8765 nunca é tocado)
#   • Ollama (modelos locais)                          — quando estiver no ar
#
# As OUTRAS portas NÃO são telas — são backends headless (você nunca abre):
#   :8781  provedor de dados do estúdio (subido aqui, minimizado)
#   :8765  oráculo /ask /ask-vision — sobe sozinho só quando o pipeline AUTÔNOMO roda
#   :11434 Ollama — sob demanda
#
# Retirados (absorvidos nesta página, não subir mais): dashboard.html do :8765, tools/vitrine, a UI do studio_dashboard.
$ErrorActionPreference = "Stop"
$SK  = "E:\Claude\apps\sketchup-mcp"
$BFF = "E:\Claude\apps\sketchup-mcp-bff"
$PY  = "$SK\.venv\Scripts\python.exe"

if (-not (Test-Path "$BFF\frontend\dist\index.html")) {
  Write-Host "→ build do frontend (primeira vez)…"
  & npm --prefix "$BFF\frontend" run build
}

Write-Host "→ provedor de dados do estúdio (headless, :8781)…"
Start-Process -WindowStyle Minimized -WorkingDirectory $SK $PY -ArgumentList "tools\studio_dashboard.py", "--port", "8781"
Start-Sleep -Seconds 2

Write-Host "→ cockpit ÚNICO (BFF :8782 — serve o app + /api, proxia :8781, lê o :8765 por arquivo)…"
$env:BFF_PORT = "8782"
Start-Process -WindowStyle Minimized -WorkingDirectory $BFF $PY -ArgumentList "server.py"
Start-Sleep -Seconds 3

Start-Process "http://localhost:8782"
Write-Host ""
Write-Host "==================================================================="
Write-Host " PÁGINA ÚNICA:  http://localhost:8782   (abra SÓ isso)"
Write-Host "   :8781  provedor do estúdio (headless — não abra)"
Write-Host "   :8765  oráculo (sobe sozinho no pipeline autônomo — não é tela)"
Write-Host "   :11434 Ollama (sob demanda)"
Write-Host "==================================================================="
