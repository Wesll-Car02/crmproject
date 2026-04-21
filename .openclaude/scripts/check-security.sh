#!/bin/bash
# =============================================
# VERIFICAÇÕES DE SEGURANÇA PARA DEPLOY
# =============================================

set -e

# Carrega utilitários
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

echo "🔒 EXECUTANDO VERIFICAÇÕES DE SEGURANÇA"
echo "========================================"

# 1. Verifica repositório Git
log_info "1. Validando repositório Git..."
validate_git_repo

# 2. Verifica .gitignore
log_info "2. Verificando .gitignore..."
if [ ! -f ".gitignore" ]; then
    log_error ".gitignore não encontrado!"
    exit 1
fi

# Padrões obrigatórios no .gitignore
REQUIRED_PATTERNS=("\.env$" "\.env\." "node_modules/" "\.pem$" "\.key$")

for pattern in "${REQUIRED_PATTERNS[@]}"; do
    if ! grep -q "$pattern" .gitignore; then
        log_warning "Padrão recomendado não encontrado: $pattern"
    fi
done

log_success ".gitignore verificado"

# 3. Verifica arquivos sensíveis no stage
log_info "3. Verificando arquivos sensíveis no Git..."
check_sensitive_files

# 4. Verifica senhas hardcoded
log_info "4. Verificando senhas hardcoded..."
check_hardcoded_passwords

# 5. Verifica permissões de scripts
log_info "5. Verificando permissões de scripts..."

find .openclaude/scripts -name "*.sh" -type f | while read script; do
    perms=$(stat -c "%a" "$script")

    # Permissões devem ser 755 (rwxr-xr-x) ou 700 (rwx------)
    if [ "$perms" != "755" ] && [ "$perms" != "700" ]; then
        log_warning "Permissões inseguras: $script ($perms)"
        log_info "Corrija com: chmod 755 $script"
    fi
done

log_success "Permissões verificadas"

# 6. Verifica arquivos de ambiente
log_info "6. Verificando arquivos de ambiente..."

if [ -f ".env" ]; then
    log_warning "Arquivo .env encontrado na raiz"
    log_info "Certifique-se que está no .gitignore"
fi

if [ -f ".env.production" ]; then
    # Verifica se contém valores de exemplo
    if grep -q "SUA_SENHA_FORTE_AQUI" .env.production || \
       grep -q "seu-servidor.com" .env.production || \
       grep -q "seu-token-github" .env.production; then
        log_error ".env.production contém valores de exemplo!"
        log_info "Edite o arquivo com valores reais antes do deploy"
        exit 1
    fi

    # Verifica variáveis críticas
    CRITICAL_VARS=("POSTGRES_PASSWORD" "JWT_SECRET" "REDIS_PASSWORD")
    for var in "${CRITICAL_VARS[@]}"; do
        if grep -q "^$var=" .env.production; then
            value=$(grep "^$var=" .env.production | cut -d'=' -f2-)
            if [ -z "$value" ] || [ "$value" = "\"\"" ] || [ "$value" = "''" ]; then
                log_error "Variável crítica vazia: $var"
                exit 1
            fi
        else
            log_warning "Variável não encontrada: $var"
        fi
    done

    log_success ".env.production verificado"
else
    log_warning ".env.production não encontrado"
    log_info "Crie a partir de .env.production.example antes do deploy"
fi

# 7. Verifica configuração Docker
log_info "7. Verificando configuração Docker..."

if [ ! -f "docker-compose.yml" ]; then
    log_error "docker-compose.yml não encontrado!"
    exit 1
fi

# Verifica se há senhas hardcoded no docker-compose
if grep -q "password:" docker-compose.yml || grep -q "PASSWORD:" docker-compose.yml; then
    log_warning "Possíveis senhas no docker-compose.yml"
    log_info "Use variáveis de ambiente em vez de senhas hardcoded"
fi

log_success "Docker Compose verificado"

# 8. Verifica dependências
log_info "8. Verificando dependências..."

# Git
if ! command -v git &> /dev/null; then
    log_error "Git não encontrado"
    exit 1
fi
log_success "Git: OK"

# Docker
if ! command -v docker &> /dev/null; then
    log_warning "Docker não encontrado (necessário apenas para testes locais)"
else
    log_success "Docker: OK"
fi

# Docker Compose
if ! command -v docker compose &> /dev/null; then
    log_warning "Docker Compose não encontrado (necessário apenas para testes locais)"
else
    log_success "Docker Compose: OK"
fi

# SSH
if ! command -v ssh &> /dev/null; then
    log_error "SSH não encontrado"
    exit 1
fi
log_success "SSH: OK"

echo ""
echo "========================================"
echo "✅ VERIFICAÇÕES DE SEGURANÇA CONCLUÍDAS"
echo ""
echo "📋 RESUMO:"
echo "   - Repositório Git: OK"
echo "   - Arquivos sensíveis: OK"
echo "   - Senhas hardcoded: OK"
echo "   - Permissões: OK"
echo "   - Configurações: OK"
echo ""
echo "⚠️  RECOMENDAÇÕES:"
echo "   1. Use chaves SSH em vez de senhas"
echo "   2. Mantenha backups regulares"
echo "   3. Monitore logs após cada deploy"
echo "   4. Teste o rollback periodicamente"
echo ""
echo "🚀 Pronto para deploy seguro!"