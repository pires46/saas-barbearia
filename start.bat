@echo off
chcp 65001 >nul
title BarberSaaS - Iniciando...

cd /d "%~dp0"

echo.
echo  ========================================
echo   BarberSaaS - Web + API
echo  ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale em https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [1/4] Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias.
    pause
    exit /b 1
  )
) else (
  echo [1/4] Dependencias OK
)

if not exist "packages\database\prisma\dev.db" (
  echo [2/4] Criando banco de dados...
  call npm run db:generate
  call npm run db:push
  call npm run db:seed
) else (
  echo [2/4] Banco de dados OK
)

echo [3/4] Liberando porta 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)

echo [4/5] Iniciando Evolution API (WhatsApp)...
where docker >nul 2>&1
if not errorlevel 1 (
  docker compose -f services\evolution-api\docker-compose.yml up -d >nul 2>&1
  if not errorlevel 1 (
    echo   Evolution API: http://localhost:8080
  ) else (
    echo   Evolution API: Docker disponivel mas falhou ao subir. Execute: npm run evolution:up
  )
) else (
  echo   Evolution API: Docker nao encontrado. Instale Docker Desktop para WhatsApp.
)

echo [5/5] Iniciando servidor web + API...
echo.
echo   Web:      http://localhost:3000
echo   API:      http://localhost:3000/api
echo   WhatsApp: http://localhost:8080
echo   Cadastro: http://localhost:3000/cadastro
echo.
echo   Pressione Ctrl+C para parar.
echo.

call npm run web

pause
