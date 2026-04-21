# CORREÇÃO: Erro ao Agendar Tarefa no Lead

## Problema
Ao tentar agendar uma tarefa no lead, ocorria o erro:
```
error: new row for relation "lead_tasks" violates check constraint "lead_tasks_type_check"
```

## Causa
A tabela `lead_tasks` no banco de dados possui uma constraint `CHECK` que restringe os valores permitidos para o campo `type`:

```sql
type VARCHAR(30) NOT NULL CHECK (type IN ('email','proposta','ligacao','reuniao','compromisso','feedback','personalizado'))
```

O componente `AddTaskModal` estava enviando valores não permitidos:
- `task` (inglês) em vez de valores em português
- `call` em vez de `ligacao`
- `meeting` em vez de `reuniao`
- `note` em vez de valores permitidos

## Solução
Atualização do componente `AddTaskModal.tsx`:

1. **Valores permitidos atualizados**:
   - `email` (E-mail)
   - `proposta` (Proposta)
   - `ligacao` (Ligação)
   - `reuniao` (Reunião)
   - `compromisso` (Compromisso)
   - `feedback` (Feedback)
   - `personalizado` (Personalizado)

2. **Valor padrão alterado**:
   - De: `task`
   - Para: `email`

3. **Atualização no SchedulingPage.tsx**:
   - Valor padrão para tarefas sem tipo alterado de `task` para `email`

## Arquivos Modificados
1. `frontend/src/components/leads/AddTaskModal.tsx`
   - Atualização dos valores do campo `type`
   - Atualização do valor padrão
   - Atualização das opções do select

2. `frontend/src/pages/Scheduling/SchedulingPage.tsx`
   - Atualização do valor padrão para `type: task.type || 'email'`

3. `aboutsistem.json`
   - Adicionada documentação sobre a constraint
   - Adicionada solução ao problemas conhecidos

## Teste
Agora ao agendar uma tarefa no lead:
1. O tipo padrão será "E-mail" (valor `email`)
2. Todas as opções disponíveis são valores permitidos pela constraint
3. A tarefa será criada com sucesso no banco de dados
4. Aparecerá na agenda principal

## Validação
A constraint `lead_tasks_type_check` foi encontrada no arquivo de migração:
`backend/src/database/migrations/007_calendar_integrations.sql`

Os valores permitidos são explicitamente definidos na criação da tabela `lead_tasks`.