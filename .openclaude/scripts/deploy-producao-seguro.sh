#!/bin/bash
set -e

# =============================================
# SCRIPT DE DEPLOY SEGURO PARA PRODUÇÃO
# =============================================
# Este script usa funções do utils.sh
# Configure as variáveis em .env.production

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

log_info "🚀 INICIANDO DEPLOY SEGURO EM PRODUÇÃO"
echo "========================================="

# =============================================
# VERIFICAÇÕES INICIAIS
# =============================================

# 1. Carrega configurações de produção
load_env_config "production"

# 2. Verifica repositório Git
validate_git_repo

# 3. Verifica se está na branch main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    log_warning "Você não está na branch main (atual: $CURRENT_BRANCH)"
    read -p "Continuar mesmo assim? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        log_error "Deploy cancelado. Mude para a branch main primeiro."
        exit 1
    fi
fi

# =============================================
# GESTÃO DE CÓDIGO - GIT
# =============================================

log_info "1. Gerenciando código Git..."

# Verifica se há mudanças não commitadas
if ! git diff-index --quiet HEAD --; then
    log_info "Há mudanças não commitadas. Criando commit automático..."

    # Gera mensagem de commit
    COMMIT_MSG="Deploy automático: $(date '+%Y-%m-%d %H:%M:%S')"

    git add .
    git commit -m "$COMMIT_MSG"
    log_success "Commit criado: $COMMIT_MSG"
else
    log_success "Nenhuma mudança não commitada"
fi

# Verifica se upstream está configurado
HAS_UPSTREAM=true
git rev-parse --abbrev-ref --symbolic-full-name @{u} &>/dev/null || HAS_UPSTREAM=false

if [ "$HAS_UPSTREAM" = false ]; then
    log_info "Upstream não configurado. Fazendo primeiro push com -u..."
    if git push -u origin main; then
        log_success "Push realizado e upstream configurado com sucesso"
    else
        log_error "Falha no push para GitHub"
        exit 1
    fi
else
    # Verifica se há commits não pushados
    LOCAL_COMMITS=$(git log @{u}..HEAD --oneline 2>/dev/null | wc -l)
    if [ "$LOCAL_COMMITS" -gt 0 ]; then
        log_info "Fazendo push de $LOCAL_COMMITS commit(s) para GitHub..."

        if git push origin main; then
            log_success "Push realizado com sucesso"
        else
            log_error "Falha no push para GitHub"
            exit 1
        fi
    else
        log_success "Nenhum commit pendente para push"
    fi
fi

# =============================================
# DEPLOY NO SERVIDOR VPS
# =============================================

log_info "2. Executando deploy no servidor VPS..."
deploy_to_vps "production"

# =============================================
# VERIFICAÇÃO FINAL
# =============================================

echo ""
echo "========================================="
log_success "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
echo ""
echo "📊 RESUMO:"
echo "   Servidor: $VPS_HOST"
echo "   Diretório: $VPS_PATH"
echo "   Branch: $CURRENT_BRANCH"
echo "   Commit: $(git rev-parse --short HEAD)"
echo "   Data/Hora: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "   1. Acesse: http://$VPS_HOST (ou https://)"
echo "   2. Verifique logs: docker compose logs -f"
echo "   3. Monitoramento: docker compose ps"
echo "   4. Teste funcionalidades principais"
echo ""
echo "⚠️  RECOMENDAÇÕES DE SEGURANÇA:"
echo "   - Considere migrar para chaves SSH"
echo "   - Faça backups regulares do banco"
echo "   - Monitore logs de erro"
echo "   - Atualize senhas periodicamente"
echo ""
echo "🔧 COMANDOS ÚTEIS PÓS-DEPLOY:"
echo "   Ver logs:    docker compose logs -f [servico]"
echo "   Status:      docker compose ps"
echo "   Reiniciar:   docker compose restart [servico]"
echo "   Rollback:    /deploy rollback last"