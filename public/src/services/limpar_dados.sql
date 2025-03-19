-- Script para limpar todos os dados das tabelas mantendo a estrutura
-- Este script deleta os dados na ordem correta para respeitar as chaves estrangeiras

-- 1. Primeiro, limpar a tabela de preços históricos (que referencia medicamentos_base)
TRUNCATE TABLE precos_historico;

-- 2. Depois, limpar a tabela de medicamentos base
TRUNCATE TABLE medicamentos_base CASCADE;

-- 3. Por fim, limpar a tabela de importações
TRUNCATE TABLE importacoes CASCADE;

-- Verificar se as tabelas foram realmente limpas
SELECT 'Tabela precos_historico tem ' || COUNT(*) || ' registros.' FROM precos_historico;
SELECT 'Tabela medicamentos_base tem ' || COUNT(*) || ' registros.' FROM medicamentos_base;
SELECT 'Tabela importacoes tem ' || COUNT(*) || ' registros.' FROM importacoes;

-- Reiniciar as sequências de IDs (opcional)
ALTER SEQUENCE medicamentos_base_id_seq RESTART WITH 1;
ALTER SEQUENCE precos_historico_id_seq RESTART WITH 1;
ALTER SEQUENCE importacoes_id_seq RESTART WITH 1;
