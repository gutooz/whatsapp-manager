# WhatsApp Team Manager

Plataforma web para centralizar o atendimento de **1 número de WhatsApp compartilhado** por uma equipe, com painel de controle para o gestor e visão em tempo real de quem está atendendo quem.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js + Express + TypeScript |
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Banco | PostgreSQL 15 via Prisma ORM |
| Cache/Filas | Redis 7 |
| Tempo real | Socket.io |
| Auth | JWT + bcrypt |
| Integração | Evolution API |
| Deploy | Docker Compose + Nginx + Let's Encrypt |

---

## Pré-requisitos (VPS Hostinger)

- Ubuntu 22.04 LTS
- **Mínimo 4 GB RAM** / 2 vCPUs / 40 GB SSD
- Domínio apontando para o IP da VPS (registro A: `yourdomain.com → IP_DA_VPS`)

---

## Deploy Rápido (script automatizado)

```bash
# 1. Conectar na VPS
ssh root@IP_DA_VPS

# 2. Baixar e executar o script de deploy
curl -fsSL https://raw.githubusercontent.com/seu-user/whatsapp-manager/main/deploy.sh -o deploy.sh
chmod +x deploy.sh
./deploy.sh --domain yourdomain.com --repo https://github.com/seu-user/whatsapp-manager.git
```

---

## Deploy Manual (passo a passo)

### 1. Preparar o servidor

```bash
# Atualizar sistema
apt-get update && apt-get upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Instalar Docker Compose
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Instalar Certbot
apt-get install -y certbot

# Verificar instalações
docker --version
docker-compose --version
```

### 2. Clonar o repositório

```bash
git clone https://github.com/seu-user/whatsapp-manager.git /opt/whatsapp-manager
cd /opt/whatsapp-manager
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
nano .env
```

**Preencha os valores obrigatórios:**

```env
POSTGRES_PASSWORD=senha_forte_aqui
JWT_SECRET=$(openssl rand -base64 64)
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_chave_api
EVOLUTION_INSTANCE=nome_da_instancia
WEBHOOK_SECRET=$(openssl rand -hex 32)
NEXTAUTH_URL=https://yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=SenhaForte@123
```

### 4. Configurar Nginx para o seu domínio

```bash
sed -i 's/yourdomain.com/SEU_DOMINIO_AQUI/g' nginx/conf.d/default.conf
```

### 5. Obter certificado SSL

```bash
# Iniciar nginx na porta 80 para o challenge ACME
docker-compose up -d nginx

# Gerar certificado
certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  -d yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos --non-interactive
```

### 6. Build e iniciar todos os serviços

```bash
docker-compose build
docker-compose up -d
```

### 7. Executar migrations e seed

```bash
# Rodar migrations
docker-compose exec backend npx prisma migrate deploy

# Criar usuário admin e configurações padrão
docker-compose exec backend npx ts-node src/prisma/seed.ts
```

### 8. Configurar auto-renovação do SSL

```bash
# Adicionar ao cron
crontab -e
# Adicionar esta linha:
0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f /opt/whatsapp-manager/docker-compose.yml exec -T nginx nginx -s reload
```

### 9. Configurar webhook na Evolution API

Na interface da sua Evolution API, configure:

- **URL:** `https://yourdomain.com/api/webhook/evolution`
- **Header:** `x-webhook-secret: SEU_WEBHOOK_SECRET`
- **Eventos ativos:**
  - `MESSAGES_UPSERT`
  - `MESSAGES_UPDATE`
  - `CONTACTS_UPDATE`
  - `PRESENCE_UPDATE`

---

## Acesso

- **Aplicação:** `https://yourdomain.com`
- **Login inicial:**
  - Email: valor de `ADMIN_EMAIL` no `.env`
  - Senha: valor de `ADMIN_PASSWORD` no `.env`

---

## Páginas disponíveis

| URL | Descrição | Acesso |
|-----|-----------|--------|
| `/login` | Login | Público |
| `/whatsapp` | Interface de chat (WhatsApp Web) | Todos |
| `/dashboard` | Métricas e desempenho da equipe | Admin |
| `/team` | Gestão de membros | Admin |
| `/settings` | Configurações do sistema | Admin |

---

## Comandos úteis

```bash
# Ver logs em tempo real
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# Reiniciar serviço específico
docker-compose restart backend

# Parar tudo
docker-compose down

# Parar e remover volumes (⚠️ apaga dados!)
docker-compose down -v

# Acessar banco de dados
docker-compose exec postgres psql -U wmuser -d whatsapp_manager

# Rodar Prisma Studio (interface visual do banco)
docker-compose exec backend npx prisma studio --port 5555

# Verificar status dos serviços
docker-compose ps
```

---

## Atualizar para nova versão

```bash
cd /opt/whatsapp-manager
git pull
docker-compose build
docker-compose up -d
docker-compose exec backend npx prisma migrate deploy
```

---

## Estrutura do projeto

```
whatsapp-manager/
├── backend/                   # Express API (porta 3001)
│   ├── src/
│   │   ├── controllers/       # Handlers de rotas
│   │   ├── services/          # Lógica de negócio
│   │   ├── routes/            # Definição de rotas
│   │   ├── middlewares/       # Auth, error handler
│   │   ├── socket/            # Socket.io
│   │   ├── lib/               # Prisma, Redis, Logger
│   │   └── prisma/            # Schema + Seed
│   └── Dockerfile
├── frontend/                  # Next.js 14 (porta 3000)
│   ├── app/
│   │   ├── (auth)/login/
│   │   └── (dashboard)/
│   │       ├── whatsapp/      # Chat principal
│   │       ├── dashboard/     # Métricas
│   │       ├── team/          # Gestão de equipe
│   │       └── settings/      # Configurações
│   ├── components/
│   └── Dockerfile
├── nginx/                     # Proxy reverso + SSL
├── docker-compose.yml
├── .env.example
└── deploy.sh
```

---

## Troubleshooting

**Containers não sobem:**
```bash
docker-compose logs postgres   # Verificar erros do banco
docker-compose logs redis      # Verificar erros do Redis
```

**Migrations falhando:**
```bash
docker-compose exec backend npx prisma migrate status
docker-compose exec backend npx prisma migrate reset  # ⚠️ Apaga dados em dev!
```

**Evolution API não conecta:**
- Verificar URL e API Key em `/settings`
- Usar botão "Testar conexão" na página de configurações
- Verificar se a instância está conectada na Evolution API

**Certificado SSL não funciona:**
```bash
certbot certificates              # Listar certificados
certbot renew --force-renewal     # Forçar renovação
```
