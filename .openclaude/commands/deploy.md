---
allowed-tools: Bash(git:*), Bash(ssh:*), Bash(bash:*), Bash(docker:*), Bash(docker-compose:*)
description: Sistema completo de deploy automatizado com múltiplos comandos.
---

## Argumento recebido
Comando: $ARGUMENTS

## 📦 SISTEMA DE DEPLOY AUTOMATIZADO - PROJETO CRM

Sistema completo para gerenciamento de deploy com segurança e automação.

### 🚀 COMANDOS PRINCIPAIS:

**`/deploy producao`** - Deploy completo em produção:
1. ✅ Verificações de segurança
2. ✅ Commit automático (se houver mudanças)
3. ✅ Push para GitHub (https://github.com/Wesll-Car02/crmproject.git)
4. ✅ Deploy na VPS com `docker compose up -d --build`
5. ✅ Verificação de serviços

**`/deploy teste`** - Testes locais sem deploy real

### 🔒 COMANDOS DE SEGURANÇA:

**`/deploy check-security`** - Verificações completas de segurança
**`/deploy check-env`** - Verifica arquivos de ambiente

### 🔄 COMANDOS DE GERENCIAMENTO:

**`/deploy rollback last`** - Rollback para último commit estável
**`/deploy rollback <commit>`** - Rollback para commit específico
**`/deploy status`** - Status do sistema e serviços
**`/deploy backup`** - Cria backup rápido

### 📊 COMANDOS DE INFORMAÇÃO:

**`/deploy help`** - Mostra ajuda completa
**`/deploy version`** - Versão do sistema

## ⚙️ CONFIGURAÇÃO NECESSÁRIA

### 1. Configurar Git:
```bash
git init
git remote add origin https://github.com/Wesll-Car02/crmproject.git
git branch -M main
```

### 2. Configurar ambiente de produção:
```bash
cp .env.production.example .env.production
# Edite .env.production com:
# - VPS_USER, VPS_HOST, VPS_PATH, VPS_PASS
# - Senhas do banco, Redis, JWT, etc.
# - Chaves de API (OpenAI, Evolution, etc.)
```

### 3. Instalar sshpass (para conexão com senha):
```bash
# Ubuntu/Debian:
sudo apt install sshpass

# macOS:
brew install hudochenkov/sshpass/sshpass
```

## 🎯 EXEMPLOS DE USO:

1. **Primeiro deploy:**
   ```
   /deploy check-security    # Verifica segurança
   /deploy check-env         # Verifica ambiente
   /deploy producao          # Deploy completo
   ```

2. **Deploy rápido:**
   ```
   /deploy producao          # Tudo automático
   ```

3. **Problemas?**
   ```
   /deploy rollback last     # Volta para versão anterior
   /deploy status            # Verifica status
   ```

## 🔐 CONSIDERAÇÕES DE SEGURANÇA:

1. **NUNCA commitar**: `.env`, `.env.production`, senhas
2. **`.gitignore`** já configurado para excluir arquivos sensíveis
3. **Backups automáticos** antes de rollbacks
4. **Verificações** antes de cada deploy

## 🛠️ EXECUÇÃO:

O sistema usa o wrapper principal que gerencia todos os comandos:

```bash
cd "C:\Users\wesll\Downloads\Dev - APIs e Integrações\ProjetoCRM" && bash .openclaude/scripts/deploy-wrapper.sh "$ARGUMENTS"
```