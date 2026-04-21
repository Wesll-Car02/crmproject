---
allowed-tools: Bash(git pull:*), Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git push:*), Bash(ssh:*), Bash(rsync:*), Bash(bash:*)
description: Faz deploy do projeto. Use 'producao' para subir para a VPS ou 'teste' para deploy local.
---

## Argumento recebido
Ambiente de deploy: $ARGUMENTS

## Tarefa

Siga o fluxo abaixo de acordo com o ambiente informado.

---

### Se o ambiente for `producao`:

1. **Git pull** — Atualize o repositório local:

2. **Verificar status** — Veja o que mudou:

3. **Commit das mudanças locais** (se houver arquivos não commitados):
   - Faça `git add .`
   - Crie uma mensagem de commit descritiva com base nas mudanças
   - Execute `git commit -m "mensagem gerada"`

4. **Git push** — Envie para o GitHub:

5. **Deploy na VPS** — Execute o script de deploy remoto: