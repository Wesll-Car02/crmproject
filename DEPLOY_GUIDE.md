# 🚀 Guia de Deploy Automatizado - Projeto CRM

## 📋 Visão Geral

Sistema completo de deploy automatizado que permite gerenciar todo o fluxo de deploy com um único comando `/deploy` no OpenClaude.

## 🎯 Comandos Disponíveis

### 🚀 Deploy
- `/deploy producao` - Deploy completo em produção
- `/deploy teste` - Testes locais sem deploy

### 🔒 Segurança  
- `/deploy check-security` - Verificações completas de segurança
- `/deploy check-env` - Verifica arquivos de ambiente

### 🔄 Gerenciamento
- `/deploy rollback last` - Rollback para último commit estável
- `/deploy rollback <commit>` - Rollback para commit específico
- `/deploy status` - Status do sistema e serviços
- `/deploy backup` - Cria backup rápido

### 📊 Informação
- `/deploy help` - Mostra ajuda completa
- `/deploy version` - Versão do sistema

## ⚙️ Configuração Inicial

### 1. Configurar Git
```bash
# Inicializar repositório (já feito)
git init
git remote add origin https://github.com/Wesll-Car02/crmproject.git
git branch -M main

# Primeiro commit e push
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 2. Configurar Ambiente de Produção
```bash
# Copiar template
cp .env.production.example .env.production

# Editar .env.production com:
# - Credenciais da VPS (usuário, host, senha)
# - Senhas do banco de dados, Redis, JWT
# - Chaves de API (OpenAI, Evolution, etc.)
# - Configurações do aplicativo
```

### 3. Instalar Dependências
```bash
# sshpass para conexão com senha na VPS
# Ubuntu/Debian:
sudo apt install sshpass

# macOS:
brew install hudochenkov/sshpass/sshpass
```

## 🚀 Fluxo de Deploy Completo

### Quando executar `/deploy producao`:

1. **✅ Verificações de Segurança**
   - Valida repositório Git
   - Verifica `.gitignore` para arquivos sensíveis
   - Detecta senhas hardcoded
   - Valida permissões de scripts

2. **📦 Gerenciamento de Código**
   - Commit automático se houver mudanças
   - Push automático para GitHub
   - Verificação de branch (main)

3. **🌐 Deploy na VPS**
   - Conexão via sshpass com senha
   - Git pull no servidor
   - `docker compose down` (para serviços)
   - `docker compose up -d --build` (reconstruir)
   - Verificação de serviços

4. **📊 Verificação Final**
   - Status dos serviços Docker
   - Resumo do deploy
   - Próximos passos

## 🔄 Sistema de Rollback

### Comando: `/deploy rollback last`

1. **💾 Backup Automático**
   - Cria backup completo antes do rollback
   - Inclui configurações e scripts

2. **↩️ Reversão Local**
   - Reset para commit anterior
   - Preserva mudanças não commitadas (stash)

3. **🌐 Sincronização**
   - Push forçado para GitHub (opcional)
   - Rollback na VPS (opcional)

4. **✅ Verificação**
   - Status do Git
   - Status dos serviços
   - Instruções pós-rollback

## 🔐 Considerações de Segurança

### ✅ Implementado:
- **Nenhuma senha hardcoded** nos scripts
- **`.gitignore`** exclui automaticamente arquivos sensíveis
- **Verificações automáticas** antes de cada deploy
- **Backups automáticos** antes de rollbacks
- **Permissões seguras** em scripts

### ⚠️ Configuração Atual:
- **Autenticação por senha** na VPS (via sshpass)
- **Recomendação**: Migrar para chaves SSH quando possível

### 🚫 Nunca Fazer:
- Commitar arquivos `.env` ou `.env.production`
- Usar senhas hardcoded em scripts
- Ignorar verificações de segurança

## 🐳 Docker Compose

O sistema usa Docker Compose para orquestrar 8 serviços:

1. **nginx** - Proxy reverso (porta 80)
2. **frontend** - Aplicação React
3. **backend** - API Node.js (porta 4000)
4. **worker** - Processador de filas
5. **postgres** - Banco de dados (porta 15432)
6. **redis** - Cache e mensageria (porta 6379)
7. **minio** - Armazenamento S3 (portas 9000, 9001)
8. **evolution-api** - WhatsApp API (porta 8080)

## 📁 Estrutura de Arquivos

```
.openclaude/
├── commands/deploy.md          # Comando OpenClaude
└── scripts/
    ├── deploy-wrapper.sh       # Wrapper principal
    ├── deploy-producao-seguro.sh # Deploy em produção
    ├── utils.sh                # Funções utilitárias
    ├── check-security.sh       # Verificações de segurança
    └── rollback.sh             # Sistema de rollback
```

## 🚨 Solução de Problemas

### Deploy Falha:
1. Execute `/deploy check-security` para diagnósticos
2. Verifique logs: `docker compose logs -f [servico]`
3. Consulte `.env.production` - todas variáveis definidas?

### Serviços Não Iniciam:
1. `/deploy status` para verificar estado
2. `docker compose logs -f` para ver logs de erro
3. Verifique recursos do servidor (memória, disco)

### GitHub Push Falha:
1. Verifique token/acesso ao repositório
2. Confirme que o repositório existe e é privado
3. Verifique conexão com a internet

## 📞 Suporte

### Documentação:
- `aboutsistem.json` - Documentação completa do sistema
- `DEPLOY_GUIDE.md` - Este guia
- Comando `/deploy help` - Ajuda interativa

### Problemas Conhecidos:
- sshpass pode ter problemas em algumas distribuições
- Docker precisa de permissões adequadas
- GitHub pode requerer autenticação adicional

## 🎉 Primeiro Deploy

### Passo a Passo:
1. **Preparação:**
   ```bash
   /deploy check-security
   /deploy check-env
   ```

2. **Configuração:**
   - Edite `.env.production` com suas credenciais
   - Instale sshpass no seu sistema

3. **Teste:**
   ```bash
   /deploy teste
   ```

4. **Deploy:**
   ```bash
   /deploy producao
   ```

5. **Verificação:**
   ```bash
   /deploy status
   ```

### 🎯 Dica: Sempre execute `check-security` antes do primeiro deploy!

---

**Sistema desenvolvido com ❤️ por OpenClaude para o Projeto CRM**  
**Repositório: https://github.com/Wesll-Car02/crmproject.git**  
**Versão: 2.0.0 | Data: 2026-04-21**