-- Script para verificar a constraint lead_tasks_type_check
SELECT
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    cc.check_clause
FROM
    information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc
        ON tc.constraint_schema = cc.constraint_schema
        AND tc.constraint_name = cc.constraint_name
WHERE
    tc.constraint_type = 'CHECK'
    AND tc.table_name = 'lead_tasks'
    AND tc.constraint_name = 'lead_tasks_type_check';