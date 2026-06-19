# Evolution API (WhatsApp)

Serviço **separado** do BarberSaaS — banco PostgreSQL e Redis próprios.

Baseado em: https://github.com/evolution-foundation/evolution-api

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Subir a Evolution API

```bash
# Na raiz do projeto
npm run evolution:up

# Ou diretamente
docker compose -f services/evolution-api/docker-compose.yml up -d
```

API disponível em: **http://localhost:8080**

Documentação interativa: http://localhost:8080/docs

## Parar

```bash
npm run evolution:down
```

## Configuração no BarberSaaS

No arquivo `apps/web/.env.local`:

```env
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=barbersaas-evolution-key-change-me
```

A chave deve ser a mesma definida em `AUTHENTICATION_API_KEY` neste `.env`.

## Fluxo por barbearia

1. Acesse **WhatsApp** no painel da barbearia
2. Clique em **Conectar WhatsApp**
3. Escaneie o QR Code com o celular
4. Mensagens automáticas e campanhas passam a enviar pela Evolution API

Cada barbearia usa uma **instância** isolada (nome = slug da barbearia).

## Clonar código-fonte (opcional)

O repositório oficial já está em `source/`:

```bash
cd services/evolution-api/source
git pull
```

O Docker usa a imagem oficial (`evoapicloud/evolution-api:latest`); a pasta `source/` é para consulta ou desenvolvimento local.
