#!/bin/bash
# =============================================
# SCRIPT DE ROLLBACK PARA DEPLOY
# =============================================

set -e

# Carrega utilitários
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

echo "🔄 SISTEMA DE ROLLBACK - PROJETO CRM"
echo "===================================="

# Verifica argumentos
if [ $# -eq 0 ]; then
    echo "❌ Uso: $0 <commit_hash|'last'>"
    echo "   Exemplo: $0 abc123def"
    echo "   Exemplo: $0 last (último commit estável)"
    exit 1
fi

TARGET="$1"

# Obtém informações do Git
log_info "Obtendo informações do Git..."

CURRENT_COMMIT=$(git rev-parse --short HEAD)
CURRENT_BRANCH=$(git branch --show-current)

if [ "$TARGET" = "last" ]; then
    # Obtém penúltimo commit (assumindo que o último é o deploy problemático)
    TARGET_COMMIT=$(git log --oneline -n 2 | tail -1 | cut -d' ' -f1)
    log_info "Usando último commit estável: $TARGET_COMMIT"
else
    TARGET_COMMIT="$TARGET"

    # Verifica se o commit existe
    if ! git cat-file -e "$TARGET_COMMIT^{commit}" 2>/dev/null; then
        log_error "Commit não encontrado: $TARGET_COMMIT"
        exit 1
    fi
fi

# Obtém informações dos commits
COMMIT_INFO=$(git log --oneline -n 1 "$TARGET_COMMIT")
CURRENT_INFO=$(git log --oneline -n 1 "$CURRENT_COMMIT")

echo ""
echo "📊 INFORMAÇÕES DO ROLLBACK:"
echo "   Branch atual: $CURRENT_BRANCH"
echo "   Commit atual: $CURRENT_COMMIT - $CURRENT_INFO"
echo "   Alvo rollback: $TARGET_COMMIT - $COMMIT_INFO"
echo ""

# Confirmação do usuário
read -p "⚠️  CONFIRMAR ROLLBACK? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    log_info "Rollback cancelado pelo usuário"
    exit 0
fi

echo ""
echo "🚀 INICIANDO PROCEDIMENTO DE ROLLBACK..."
echo ""

# 1. Cria backup antes do rollback
log_info "1. Criando backup pré-rollback..."
BACKUP_DIR=$(create_backup)
log_success "Backup criado: $BACKUP_DIR"

# 2. Rollback local
log_info "2. Executando rollback local..."

# Verifica se há mudanças não commitadas
if [ -n "$(git status --porcelain)" ]; then
    log_warning "Há mudanças não commitadas. Stashing..."
    git stash push -m "Stash pré-rollback $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Faz reset para o commit alvo
git reset --hard "$TARGET_COMMIT"

log_success "Rollback local concluído"

# 3. Push forçado para GitHub
log_info "3. Sincronizando com GitHub..."

read -p "⚠️  Forçar push para GitHub? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    git push origin "$CURRENT_BRANCH" --force
    log_success "Push forçado concluído"
else
    log_warning "Push forçado ignorado"
    log_info "Execute manualmente se necessário: git push origin $CURRENT_BRANCH --force"
fi

# 4. Rollback na VPS (se configurado)
if [ -f ".env.production" ] && grep -q "VPS_" .env.production; then
    log_info "4. Executando rollback na VPS..."

    # Carrega configurações de produção
    source "$SCRIPT_DIR/utils.sh"
    load_env_config "production"

    # Verifica se deve fazer rollback na VPS
    read -p "⚠️  Executar rollback na VPS? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        deploy_to_vps "production"
        log_success "Rollback na VPS concluído"
    else
        log_warning "Rollback na VPS ignorado"
    fi
else
    log_info "4. Rollback na VPS ignorado (configuração não encontrada)"
fi

# 5. Verificação final
log_info "5. Verificando estado do sistema..."

# Verifica Git
log_info "   Estado do Git:"
git log --oneline -n 3

# Verifica Docker (se disponível)
if command -v docker compose &>/dev/null; then
    log_info "   Serviços Docker:"
    if check_docker_services; then
        log_success "   Todos os serviços estão rodando"
    else
        log_warning "   Alguns serviços podem não estar rodando"
    fi
fi

echo ""
echo "===================================="
echo "🎉 ROLLBACK CONCLUÍDO COM SUCESSO!"
echo ""
echo "📋 RESUMO:"
echo "   - Commit alvo: $TARGET_COMMIT"
echo "   - Branch: $CURRENT_BRANCH"
echo "   - Backup: $BACKUP_DIR"
echo "   - GitHub: $(if [[ $REPLY =~ ^[Ss]$ ]]; then echo "Sincronizado"; else echo "Pendente"; fi)"
echo "   - VPS: $(if [ -f ".env.production" ] && [[ $REPLY =~ ^[Ss]$ ]]; then echo "Atualizado"; else echo "Ignorado"; fi)"
echo ""
echo "⚠️  PRÓXIMOS PASSOS:"
echo "   1. Teste a aplicação manualmente"
echo "   2. Verifique logs de erro"
echo "   3. Monitore métricas de performance"
echo "   4. Documente o incidente (se aplicável)"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "   - Ver logs: docker compose logs -f"
echo "   - Status: docker compose ps"
echo "   - Restaurar stash: git stash pop"
echo "   - Ver backup: ls -la $BACKUP_DIR"
echo ""
echo "✅ Sistema revertido para commit: $TARGET_COMMIT"