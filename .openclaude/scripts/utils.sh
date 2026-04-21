#!/bin/bash
# =============================================
# UTILITÁRIOS PARA SISTEMA DE DEPLOY
# =============================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Carrega configurações de ambiente
load_env_config() {
    local env="$1"
    local env_file=".env.$env"

    if [ ! -f "$env_file" ]; then
        log_error "Arquivo de ambiente não encontrado: $env_file"
        log_info "Crie a partir de .env.$env.example"
        exit 1
    fi

    # Carrega variáveis linha por linha de forma segura
    while read -r line || [ -n "$line" ]; do
        # Remove espaços em branco no início e fim
        line=$(echo "$line" | xargs)
        
        # Ignora linhas vazias ou que começam com #
        if [[ -z "$line" || "$line" == "#"* ]]; then
            continue
        fi

        # Remove comentários inline (tudo após #)
        clean_line="${line%% #*}"
        # Remove espaços extras que sobraram
        clean_line=$(echo "$clean_line" | xargs)

        if [[ "$clean_line" == *"="* ]]; then
            export "$clean_line"
        fi
    done < "$env_file"
    
    log_success "Variáveis carregadas de: $env_file"
}

# Valida repositório Git
validate_git_repo() {
    if [ ! -d ".git" ]; then
        log_error "Não é um repositório Git"
        log_info "Execute: git init"
        exit 1
    fi

    if ! git remote get-url origin &>/dev/null; then
        log_warning "Repositório remoto não configurado"
        log_info "Execute: git remote add origin https://github.com/Wesll-Car02/crmproject.git"
    fi

    log_success "Repositório Git validado"
}

# Verifica arquivos sensíveis
check_sensitive_files() {
    log_info "Verificando arquivos sensíveis..."

    # Verifica se .env está no .gitignore
    if ! grep -q "^\.env$" .gitignore 2>/dev/null && ! grep -q "^\.env\*" .gitignore 2>/dev/null; then
        log_error ".env não está no .gitignore!"
        exit 1
    fi

    # Verifica arquivos sensíveis no stage
    local sensitive_patterns=("\.env$" "\.pem$" "\.key$" "deploy.*\.sh$")
    local found_files=""

    for pattern in "${sensitive_patterns[@]}"; do
        local files=$(git status --porcelain 2>/dev/null | grep -E "$pattern" || true)
        if [ -n "$files" ]; then
            found_files="$found_files$files\n"
        fi
    done

    if [ -n "$found_files" ]; then
        log_error "Arquivos sensíveis no stage:"
        echo -e "$found_files"
        log_info "Remova com: git rm --cached <arquivo>"
        exit 1
    fi

    log_success "Nenhum arquivo sensível detectado no stage"
}

# Verifica senhas hardcoded
check_hardcoded_passwords() {
    log_info "Verificando senhas hardcoded..."

    local patterns=(
        "password.*="
        "PASS.*="
        "SECRET.*="
        "KEY.*="
        "TOKEN.*="
    )

    local found=false

    for pattern in "${patterns[@]}"; do
        # Procura em scripts, ignorando comentários
        local matches=$(grep -r "$pattern" .openclaude/scripts/ 2>/dev/null | grep -v "^#" | grep -v "PASSWORD=" | grep -v "example" || true)

        if [ -n "$matches" ]; then
            log_error "Possíveis senhas hardcoded encontradas:"
            echo "$matches"
            found=true
        fi
    done

    if [ "$found" = true ]; then
        log_error "Remova senhas hardcoded e use variáveis de ambiente!"
        exit 1
    fi

    log_success "Nenhuma senha hardcoded detectada"
}

# Deploy na VPS
deploy_to_vps() {
    local env="$1"
    load_env_config "$env"

    # Verifica variáveis necessárias
    local required_vars=("VPS_USER" "VPS_HOST" "VPS_PATH" "VPS_PASS")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Variável $var não definida em .env.$env"
            exit 1
        fi
    done

    log_info "Conectando à VPS: $VPS_USER@$VPS_HOST"

    # Monta os comandos SSH/SCP dependendo da disponibilidade do sshpass
    local ssh_cmd=""
    local scp_cmd=""
    if command -v sshpass &> /dev/null; then
        ssh_cmd="sshpass -p \"$VPS_PASS\" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30"
        scp_cmd="sshpass -p \"$VPS_PASS\" scp -o StrictHostKeyChecking=no"
        log_info "Usando autenticação por senha (sshpass)"
    else
        log_warning "sshpass não encontrado. Você precisará digitar a senha algumas vezes."
        log_info "Senha da VPS (para copiar/colar): $VPS_PASS"
        ssh_cmd="ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30"
        scp_cmd="scp -o StrictHostKeyChecking=no"
    fi

    # Garante que o diretório existe na VPS
    log_info "Garantindo diretório na VPS: $VPS_PATH"
    $ssh_cmd "$VPS_USER@$VPS_HOST" "mkdir -p $VPS_PATH"

    # Envia o .env.production para a VPS como .env (não vai pro GitHub, mas vai pro servidor)
    log_info "📤 Enviando .env.production para a VPS..."
    $scp_cmd .env.production "$VPS_USER@$VPS_HOST:$VPS_PATH/.env"
    log_success ".env enviado com sucesso para o servidor"

    # Executa deploy remoto
    $ssh_cmd "$VPS_USER@$VPS_HOST" << ENDSSH
        set -e
        echo "📥 Iniciando deploy no servidor..."

        REPO_URL="https://github.com/$GITHUB_REPO"
        DEPLOY_DIR="$VPS_PATH"

        # Verifica se já existe repositório git no diretório
        if [ -d "\$DEPLOY_DIR/.git" ]; then
            echo "🔄 Repositório encontrado. Atualizando código..."
            cd "\$DEPLOY_DIR"
            git pull origin main
        else
            echo "🆕 Primeiro deploy. Clonando repositório..."
            git clone "\$REPO_URL" "\$DEPLOY_DIR"
            cd "\$DEPLOY_DIR"
        fi

        # Garante que o .env está em uso (o arquivo foi enviado antes via SCP)
        echo "🔑 Verificando .env no servidor..."
        if [ -f "\$DEPLOY_DIR/.env" ]; then
            echo "✅ .env encontrado"
        else
            echo "❌ .env não encontrado! O deploy pode falhar."
        fi

        echo "🐳 Parando serviços..."
        docker compose down || true

        echo "🏗️  Reconstruindo serviços..."
        docker compose up -d --build

        echo "⏳ Aguardando inicialização (60s para banco de dados)..."
        sleep 60

        echo "🔍 Verificando serviços..."
        docker compose ps

        echo "✅ Deploy concluído no servidor"
ENDSSH

    if [ $? -eq 0 ]; then
        log_success "Deploy na VPS concluído com sucesso"
    else
        log_error "Falha no deploy na VPS"
        exit 1
    fi
}

# Verifica status dos serviços Docker
check_docker_services() {
    log_info "Verificando serviços Docker..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker não encontrado"
        return 1
    fi

    if ! docker compose ps &>/dev/null; then
        log_warning "Docker Compose não configurado ou sem serviços"
        return 0
    fi

    local services=$(docker compose ps --services)
    local all_running=true

    for service in $services; do
        local status=$(docker compose ps --format json | jq -r ".[] | select(.Service==\"$service\") | .Status" 2>/dev/null || echo "unknown")

        if [[ "$status" == *"Up"* ]]; then
            log_success "  $service: $status"
        else
            log_error "  $service: $status"
            all_running=false
        fi
    done

    if [ "$all_running" = true ]; then
        log_success "Todos os serviços estão rodando"
        return 0
    else
        log_error "Alguns serviços não estão rodando"
        return 1
    fi
}

# Cria backup rápido
create_backup() {
    local backup_dir="backups/$(date '+%Y-%m-%d_%H-%M-%S')"

    log_info "Criando backup em: $backup_dir"

    mkdir -p "$backup_dir"

    # Backup do docker-compose.yml
    cp docker-compose.yml "$backup_dir/"

    # Backup de configurações
    if [ -d "config" ]; then
        cp -r config "$backup_dir/"
    fi

    # Backup de scripts
    if [ -d ".openclaude" ]; then
        cp -r .openclaude "$backup_dir/"
    fi

    log_success "Backup criado: $backup_dir"
    echo "$backup_dir"
}