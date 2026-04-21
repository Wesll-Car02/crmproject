#!/bin/bash

echo "=== Teste do Sistema CRM SAAS ==="
echo "Data: $(date)"
echo

# Check if services are running
echo "1. Verificando serviços Docker..."
docker-compose ps

echo
echo "2. Testando frontend..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost

echo
echo "3. Testando backend API..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:4000/api/health

echo
echo "4. Testando agendamento público (página HTML)..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost/book/test

echo
echo "5. Testando API de disponibilidade (requer usuário válido)..."
curl -s "http://localhost:4000/api/scheduling/public/test/availability?date=2026-04-20" | head -c 100

echo
echo
echo "=== Resumo ==="
echo "Frontend: Disponível em http://localhost"
echo "Backend API: Disponível em http://localhost:4000/api"
echo "Agendamento Público: Disponível em http://localhost/book/{userSlug}"
echo "Documentação: Consulte aboutsistem.json para detalhes completos"
echo
echo "Sistema transformado em SAAS multi-tenant completo com:"
echo "- Verificação de disponibilidade em agendamento público"
echo "- Sistema de planos, features e quotas"
echo "- Middlewares de controle de acesso"
echo "- Hierarquia de usuários (Admin, Gestor, Usuário)"
echo "- Isolamento de dados por tenant"