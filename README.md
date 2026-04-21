# 🚀 CRM Pro — Guia de Instalação

## Pré-requisitos

- **Docker Desktop** ([download](https://www.docker.com/products/docker-desktop/))
- **Git** (opcional)
- 4GB+ de RAM livre

---

## ⚡ Iniciar em 3 passos

### 1. Configure o ambiente

```bash
# Copie o arquivo de variáveis de ambiente
copy .env.example .env
```

Abra o `.env` e preencha suas credenciais (mínimo para iniciar em desenvolvimento: as credenciais padrão já funcionam).

### 2. Suba os containers

```bash
docker-compose up -d
```

Na primeira execução, o Docker irá:
- Baixar todas as imagens (~5-10 minutos)
- Compilar o frontend e backend
- Criar o banco de dados e executar as migrations automaticamente
- Inserir os dados iniciais (usuário admin, pipeline padrão)

### 3. Acesse o sistema

| Serviço | URL | Descrição |
|---|---|---|
| **CRM (Frontend)** | http://localhost | Interface principal |
| **API** | http://localhost/api | REST API |
| **MinIO** (Storage) | http://localhost:9001 | Console de arquivos |
| **Evolution API** (WhatsApp) | http://localhost:8080 | Painel do WhatsApp |
| **PostgreSQL** | localhost:5432 | Banco de dados |
| **Redis** | localhost:6379 | Cache |

### Credenciais Padrão

| Campo | Valor |
|---|---|
| **Email** | admin@crm.local |
| **Senha** | Admin@123 |
| **MinIO User** | minioadmin |
| **MinIO Password** | minioadmin123 |

---

## 🔧 Configurações por Módulo

### WhatsApp (Evolution API)
1. Acesse http://localhost:8080
2. Crie uma instância
3. Escaneie o QR Code com seu WhatsApp
4. Configure o webhook para: `http://backend:4000/api/webhooks/whatsapp`

### Meta Ads / Instagram
1. Crie um App em [Meta Developers](https://developers.facebook.com)
2. Preencha `META_APP_ID`, `META_APP_SECRET` e `META_VERIFY_TOKEN` no `.env`
3. Configure o webhook para: `http://seu-dominio/api/webhooks/meta`

### Bradesco (Boletos)
1. Solicite acesso sandbox em [developers.bradesco.com.br](https://developers.bradesco.com.br)
2. Preencha `BRADESCO_CLIENT_ID` e `BRADESCO_CLIENT_SECRET` no `.env`

### OpenAI (IA)
1. Crie uma chave em [platform.openai.com](https://platform.openai.com)
2. Preencha `OPENAI_API_KEY` no `.env`

### Email (SMTP)
- Gmail: Ative "Senhas de App" e use como `SMTP_PASS`
- Outros: Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

---

## 📋 Comandos Úteis

```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend

# Reiniciar um serviço
docker-compose restart backend

# Parar tudo
docker-compose down

# Parar e apagar volumes (RESET COMPLETO)
docker-compose down -v

# Rebuild após mudanças no código
docker-compose up -d --build backend
docker-compose up -d --build frontend
```

---

## 🏗️ Arquitetura

```
ProjetoCRM/
├── docker-compose.yml      ← Orquestração de todos os serviços
├── .env                    ← Variáveis de ambiente (não commitar!)
├── nginx/                  ← Reverse proxy
├── backend/                ← API Node.js + Express + TypeScript
│   └── src/
│       ├── modules/        ← 22 módulos do CRM
│       ├── database/       ← Migrations + Seeds
│       ├── middlewares/    ← Auth, RBAC, Audit
│       └── services/       ← Redis, Socket, MinIO
├── frontend/               ← React 18 + Vite + TypeScript + Tailwind
│   └── src/
│       ├── pages/          ← Todas as telas
│       ├── components/     ← Design system + Layout
│       ├── store/          ← Zustand (estado global)
│       └── lib/            ← API client, Query client
└── worker/                 ← BullMQ workers (filas assíncronas)
```

---

## 👥 Roles e Permissões

| Role | Descrição |
|---|---|
| `super_admin` | Acesso total |
| `admin` | Administrador da empresa |
| `manager` | Gerente de vendas |
| `sales_rep` | Representante de vendas |
| `sdr` | Prospector (Sales Dev. Rep.) |
| `support` | Agente de suporte |
| `viewer` | Somente leitura |

---

## 🛠️ Desenvolvimento Local (sem Docker)

```bash
# Backend
cd backend
npm install
# Configure DATABASE_URL e REDIS_URL no .env local
npm run migrate
npm run dev

# Frontend
cd frontend
npm install
npm run dev

# Worker
cd worker
npm install
npm run dev
```

---

## 📞 Suporte

Desenvolvido como plataforma CRM completa para área comercial, financeira e de negócios.
