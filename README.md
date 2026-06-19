# BarberSaaS - Sistema Completo para Barbearias

SaaS multi-tenant para gestão de barbearias. Cada barbearia tem login, painel e site próprio.

## Primeiro acesso

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm start
```

O seed cria os **planos** e um **Super Admin**. A senha é exibida no terminal na primeira execução.

Variáveis opcionais no `.env`:

```
SEED_ADMIN_EMAIL=admin@barbersaas.com.br
SEED_ADMIN_PASSWORD=sua-senha-segura
```

## Fluxo do sistema

### 1. Super Admin (dono do SaaS)
- Login em `/login`
- Painel em `/admin` — visão geral de todas as barbearias
- `/admin/tenants` — cadastrar, editar, bloquear barbearias
- `/admin/plans` — planos de assinatura
- `/admin/billing` — cobranças e inadimplência

### 2. Barbearia (cliente do SaaS)
- Cadastro em `/cadastro` ou criada pelo Super Admin
- Login em `/login` → painel em `/dashboard`
- Site público em `/b/slug-da-barbearia`

### 3. Cliente final
- Agendamento online no site da barbearia
- App mobile (Expo) conectado à API

## URLs

| URL | Função |
|-----|--------|
| http://localhost:3000 | Landing page |
| http://localhost:3000/cadastro | Cadastro de barbearia |
| http://localhost:3000/login | Login |
| http://localhost:3000/admin | Painel Super Admin |
| http://localhost:3000/b/{slug} | Site da barbearia |

## Início rápido (Windows)

Duplo clique em `start.bat` ou execute `.\start.ps1`

## Mobile

```bash
npm run mobile
```

Configure `EXPO_PUBLIC_API_URL` em `apps/mobile/.env` apontando para o servidor web.

## WhatsApp (Evolution API)

Serviço **separado** com PostgreSQL e Redis próprios em `services/evolution-api/`.

```bash
# Subir Evolution API (requer Docker Desktop)
npm run evolution:up

# Ver logs
npm run evolution:logs

# Parar
npm run evolution:down
```

Configure em `apps/web/.env.local`:

```env
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=barbersaas-evolution-key-change-me
```

No painel da barbearia: **WhatsApp → Conectar WhatsApp → escanear QR Code**.

Repositório: https://github.com/evolution-foundation/evolution-api

## Stack

- Next.js 15 + React 19 + Tailwind (web + API)
- Expo / React Native (mobile)
- Prisma + SQLite (dev) / PostgreSQL (prod)

## Produção (VPS com Docker)

Deploy completo com **app + PostgreSQL + Evolution API (WhatsApp)** em um único `docker-compose`.

### 1. Preparar a VPS

Requisitos: Docker 24+, Docker Compose v2, domínio apontando para o IP da VPS.

```bash
git clone <seu-repo> saas-barbearia
cd saas-barbearia
cp .env.production.example .env.production
```

Edite `.env.production` — troque todos os `CHANGE-ME` e defina `NEXT_PUBLIC_APP_URL` com HTTPS.

### 2. Subir os containers

```bash
npm run docker:prod:up
# ou:
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Serviços:

| Container | Função | Porta padrão |
|-----------|--------|--------------|
| `barbersaas_web` | Next.js (painel + API) | 3000 |
| `barbersaas_postgres` | Banco do SaaS | interna |
| `barbersaas_evolution_api` | WhatsApp | 8080 |
| `barbersaas_evolution_postgres` | Banco Evolution | interna |
| `barbersaas_evolution_redis` | Cache Evolution | interna |

No primeiro deploy, `SEED_ON_START=true` cria planos e Super Admin. **Desative depois** (`SEED_ON_START=false`) e reinicie o container `web`.

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f web
```

### 3. Proxy reverso (Nginx / Caddy)

Exponha HTTPS na porta 443 apontando para `localhost:3000`. Exemplo Caddy:

```
seudominio.com.br {
  reverse_proxy localhost:3000
}

evolution.seudominio.com.br {
  reverse_proxy localhost:8080
}
```

Ajuste `EVOLUTION_PUBLIC_URL` no `.env.production` para a URL pública da Evolution.

### 4. Variáveis do app (`.env.production`)

```env
POSTGRES_PASSWORD=...
JWT_SECRET=...
CRON_SECRET=...
NEXT_PUBLIC_APP_URL=https://seudominio.com.br

# Pagamentos Asaas
ASAAS_API_KEY=...
ASAAS_SANDBOX=false
ASAAS_WEBHOOK_TOKEN=...

# E-mail
RESEND_API_KEY=...
EMAIL_FROM="BarberSaaS <noreply@seudominio.com.br>"

# WhatsApp (interno entre containers)
EVOLUTION_API_URL=http://evolution-api:8080
EVOLUTION_API_KEY=mesma-chave-da-evolution
EVOLUTION_PUBLIC_URL=https://evolution.seudominio.com.br
```

`EVOLUTION_API_KEY` deve ser **igual** em app e Evolution. Barbearias conectam pelo painel `/whatsapp` — sem `.env` por loja.

### 5. Cron na VPS (lembretes WhatsApp + cobrança)

```bash
chmod +x scripts/cron-vps.sh
# A cada 15 minutos:
*/15 * * * * CRON_SECRET=xxx NEXT_PUBLIC_APP_URL=https://seudominio.com.br /path/saas-barbearia/scripts/cron-vps.sh
```

### 6. Webhook Asaas

URL: `https://seudominio.com.br/api/webhooks/asaas`

### Comandos úteis

```bash
npm run docker:prod:logs    # logs do app
npm run docker:prod:down    # parar tudo
```

### Produção sem Docker (manual)

Se preferir Node direto na VPS com PostgreSQL externo:

```env
DATABASE_URL=postgresql://user:pass@host:5432/barbersaas
JWT_SECRET=chave-longa-aleatoria
CRON_SECRET=chave-cron
NEXT_PUBLIC_APP_URL=https://seudominio.com.br
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-chave
```

Altere `provider` em `packages/database/prisma/schema.prisma` para `postgresql`, rode `npm run db:push && npm run build` e `npm run start -w @saas-barbearia/web`.

### Funcionalidades profissionais incluídas

- Pagamentos Asaas (faturas, Pix, bloqueio automático)
- Cron lembretes WhatsApp (24h, 2h, agradecimento)
- Reset de senha + e-mail (Resend)
- LGPD (termos, privacidade, consentimento)
- Validação Zod + rate limiting
- Audit log
- Onboarding guiado
- Página Assinatura (troca de plano)
- Admin MRR + trials
- CI GitHub Actions
- Build de produção
