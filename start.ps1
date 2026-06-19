$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host ""
Write-Host " ========================================" -ForegroundColor Cyan
Write-Host "  BarberSaaS - Web + API" -ForegroundColor Cyan
Write-Host " ========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[ERRO] Node.js nao encontrado. Instale em https://nodejs.org" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path "node_modules")) {
  Write-Host "[1/4] Instalando dependencias..." -ForegroundColor Yellow
  npm install
} else {
  Write-Host "[1/4] Dependencias OK" -ForegroundColor Green
}

$dbPath = Join-Path $Root "packages\database\prisma\dev.db"
if (-not (Test-Path $dbPath)) {
  Write-Host "[2/4] Criando banco de dados..." -ForegroundColor Yellow
  npm run db:generate
  npm run db:push
  npm run db:seed
} else {
  Write-Host "[2/4] Banco de dados OK" -ForegroundColor Green
}

Write-Host "[3/4] Liberando porta 3000..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Write-Host "[4/5] Iniciando Evolution API (WhatsApp)..." -ForegroundColor Yellow
if (Get-Command docker -ErrorAction SilentlyContinue) {
  docker compose -f services/evolution-api/docker-compose.yml up -d 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "  Evolution API: http://localhost:8080" -ForegroundColor White
  } else {
    Write-Host "  Evolution API: falhou. Execute: npm run evolution:up" -ForegroundColor Yellow
  }
} else {
  Write-Host "  Docker nao encontrado. Instale Docker Desktop para WhatsApp." -ForegroundColor Yellow
}

Write-Host "[5/5] Iniciando servidor web + API..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Web:      http://localhost:3000" -ForegroundColor White
Write-Host "  API:      http://localhost:3000/api" -ForegroundColor White
Write-Host "  WhatsApp: http://localhost:8080" -ForegroundColor White
Write-Host "  Cadastro: http://localhost:3000/cadastro" -ForegroundColor White
Write-Host ""
Write-Host "  Pressione Ctrl+C para parar." -ForegroundColor Gray
Write-Host ""

npm run web
