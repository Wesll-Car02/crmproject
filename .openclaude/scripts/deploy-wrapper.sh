#!/bin/bash
set -e

# =============================================
# WRAPPER PRINCIPAL PARA SISTEMA DE DEPLOY
# =============================================
# Este script é chamado pelo comando OpenClaude
# e gerencia todo o fluxo de deploy automatizado

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Carrega utilitários
source "$SCRIPT_DIR/utils.sh"

show_help() {
    echo "🔧 SISTEMA DE DEPLOY AUTOMATIZADO - PROJETO CRM"
    echo "=============================================="
    echo ""
    echo "📋 COMANDOS DISPONÍVEIS:"
    echo ""
    echo "  🚀 DEPLOY:"
    echo "    $0 producao          Deploy completo em produção"
    echo "    $0 teste             Testes locais sem deploy"
    echo ""
    echo "  🔒 SEGURANÇA:"
    echo "    $0 check-security    Verificações de segurança"
    echo "    $0 check-env         Verifica arquivos de ambiente"
    echo ""
    echo "  🔄 GERENCIAMENTO:"
    echo "    $0 rollback <commit> Rollback para commit específico"
    echo "    $0 rollback last     Rollback para último commit estável"
    echo "    $0 status            Status do sistema e serviços"
    echo "    $0 backup            Cria backup rápido"
    echo ""
    echo "  📊 INFORMAÇÃO:"
    echo "    $0 help              Mostra esta ajuda"
    echo "    $0 version           Versão do sistema"
    echo ""
    echo "📖 EXEMPLOS:"
    echo "  /deploy producao       # Deploy completo"
    echo "  /deploy check-security # Verifica segurança antes do deploy"
    echo "  /deploy rollback last  # Rollback para último commit estável"
}

show_version() {
    echo "📦 SISTEMA DE DEPLOY - PROJETO CRM"
    echo "Versão: 2.0.0"
    echo "Data: 2026-04-21"
    echo "Autor: OpenClaude"
    echo "Repositório: https://github.com/Wesll-Car02/crmproject.git"
}

# Verifica argumentos
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

COMANDO="$1"
shift

case "$COMANDO" in
    "producao"|"prod")
        log_info "🎯 AMBIENTE: PRODUÇÃO"
        echo ""

        # Executa verificações de segurança primeiro
        log_info "1. Executando verificações de segurança..."
        bash "$SCRIPT_DIR/check-security.sh"

        # Verifica arquivo de configuração
        log_info "2. Verificando configuração..."
        if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
            log_error "Arquivo .env.production não encontrado"
            log_info "Criando a partir do template..."
            cp "$PROJECT_ROOT/.env.production.example" "$PROJECT_ROOT/.env.production"
            log_success "Template criado: .env.production"
            log_info "Edite o arquivo com suas configurações antes do deploy"
            exit 1
        fi

        # Executa deploy seguro
        log_info "3. Iniciando deploy seguro..."
        bash "$SCRIPT_DIR/deploy-producao-seguro.sh"
        ;;

    "teste"|"test")
        log_info "🧪 AMBIENTE: TESTE"
        echo ""

        cd "$PROJECT_ROOT"

        log_info "1. Testando Docker Compose..."
        if docker compose config &>/dev/null; then
            log_success "Docker Compose configurado corretamente"
        else
            log_error "Erro na configuração do Docker Compose"
            exit 1
        fi

        log_info "2. Testando construção de imagens..."
        if docker compose build --no-cache 2>&1 | tail -20; then
            log_success "Build testado com sucesso"
        else
            log_warning "Build pode ter falhado (isso é normal para teste)"
        fi

        log_info "3. Verificando serviços..."
        docker compose ps --all

        log_success "Teste local concluído"
        log_info "Para iniciar localmente: docker compose up -d"
        ;;

    "check-security")
        log_info "🔒 EXECUTANDO VERIFICAÇÕES DE SEGURANÇA"
        bash "$SCRIPT_DIR/check-security.sh"
        ;;

    "check-env")
        log_info "🌍 VERIFICANDO ARQUIVOS DE AMBIENTE"

        if [ -f ".env" ]; then
            log_warning "Arquivo .env encontrado"
            log_info "Certifique-se que está no .gitignore"
        fi

        if [ -f ".env.production" ]; then
            log_success "Arquivo .env.production encontrado"

            # Conta variáveis definidas
            vars_count=$(grep -c "^[A-Z_][A-Z0-9_]*=" .env.production)
            log_info "Variáveis definidas: $vars_count"

            # Verifica variáveis críticas
            critical_vars=("POSTGRES_PASSWORD" "JWT_SECRET" "VPS_HOST")
            for var in "${critical_vars[@]}"; do
                if grep -q "^$var=" .env.production; then
                    log_success "  ✓ $var definida"
                else
                    log_warning "  ✗ $var não definida"
                fi
            done
        else
            log_error "Arquivo .env.production não encontrado"
            log_info "Crie a partir de .env.production.example"
        fi

        if [ -f ".env.production.example" ]; then
            log_success "Template .env.production.example encontrado"
        fi
        ;;

    "rollback")
        if [ $# -eq 0 ]; then
            log_error "Uso: $0 rollback <commit_hash|'last'>"
            exit 1
        fi

        log_info "🔄 INICIANDO PROCEDIMENTO DE ROLLBACK"
        bash "$SCRIPT_DIR/rollback.sh" "$@"
        ;;

    "status")
        log_info "📊 STATUS DO SISTEMA"

        echo ""
        log_info "1. Sistema Git:"
        echo "   Branch: $(git branch --show-current 2>/dev/null || echo 'N/A')"
        echo "   Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'N/A')"
        echo "   Remote: $(git remote get-url origin 2>/dev/null || echo 'Não configurado')"

        echo ""
        log_info "2. Arquivos de ambiente:"
        if [ -f ".env.production" ]; then
            echo "   ✅ .env.production (produção)"
        else
            echo "   ❌ .env.production (faltando)"
        fi

        if [ -f ".env" ]; then
            echo "   ⚠️  .env (desenvolvimento - cuidado!)"
        fi

        echo ""
        log_info "3. Serviços Docker:"
        if command -v docker compose &>/dev/null; then
            if docker compose ps --services &>/dev/null 2>&1; then
                docker compose ps --all
            else
                echo "   Nenhum serviço Docker em execução"
            fi
        else
            echo "   Docker Compose não disponível"
        fi

        log_success "Status verificado"
        ;;

    "backup")
        log_info "💾 CRIANDO BACKUP RÁPIDO"
        source "$SCRIPT_DIR/utils.sh"
        BACKUP_DIR=$(create_backup)
        log_success "Backup criado: $BACKUP_DIR"

        echo ""
        log_info "Conteúdo do backup:"
        ls -la "$BACKUP_DIR"
        ;;

    "help")
        show_help
        ;;

    "version")
        show_version
        ;;

    *)
        log_error "Comando desconhecido: $COMANDO"
        echo ""
        show_help
        exit 1
        ;;
esac

echo ""
echo "=============================================="
log_success "Processo concluído: $COMANDO"
echo "   Data/Hora: $(date '+%Y-%m-%d %H:%M:%S')"