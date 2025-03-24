# Solução para Erros em Funções SQL do Dashboard CMED

Este documento descreve os problemas encontrados com funções SQL no dashboard de análise de preços CMED e fornece um guia para resolução.

## Problemas Identificados

### 1. Referências Ambíguas a Colunas

Algumas funções SQL apresentam o erro "column reference is ambiguous". Isso ocorre quando:

- Uma coluna com o mesmo nome existe em duas ou mais tabelas utilizadas na consulta
- A coluna é referenciada sem qualificação (sem o nome da tabela ou alias)

Exemplo do erro:
```
column reference "id" is ambiguous
```

### 2. Nomes Incorretos de Colunas

Algumas funções SQL referenciam colunas que não existem nas tabelas. Por exemplo:

- Uso de `tipo_produto` em vez de `tipo_de_produto`
- Diferenças de nomenclatura entre o código SQL e o schema atual

### 3. Problemas de Acesso ao Schema Information Schema

O código está tentando acessar `public.information_schema`, mas `information_schema` já é um schema separado, não uma tabela dentro do schema `public`.

### 4. DELETE sem WHERE

Identificamos um comando DELETE sem cláusula WHERE na função `projecao_impacto_financeiro`:

```sql
DELETE FROM temp_precos_historicos;
```

Este comando é perigoso pois pode excluir todos os registros de uma tabela. Foi corrigido substituindo por:

```sql
DROP TABLE IF EXISTS temp_precos_historicos;
CREATE TEMPORARY TABLE IF NOT EXISTS temp_precos_historicos (
```

### 5. Referência a Coluna Incorreta (percentual_reajuste)

As funções SQL estavam tentando acessar uma coluna chamada `percentual_reajuste` que não existe na tabela `reajustes_anuais`. A tabela tem na verdade uma coluna chamada `percentual`.

Exemplo:
```sql
-- Incorreto
ra.percentual_reajuste AS reajuste_cmed

-- Correto
ra.percentual AS reajuste_cmed
```

### 6. Conflito nas Assinaturas de Funções

Erro identificado: "Could not choose the best candidate function between: public.analise_elasticidade_por_faixa..."

Este erro ocorre quando existem múltiplas funções com o mesmo nome, mas diferentes parâmetros, e o PostgreSQL não consegue determinar qual função usar.

### 7. Erro de Campo Tipo de Produto

Erro identificado: "column m.tipo_de_produto does not exist"

Verificamos que a tabela `medicamentos` usa a coluna `tipo_produto` em vez de `tipo_de_produto`.

### 8. Referências Ambíguas a Colunas

Erro identificado: "column reference 'ano' is ambiguous"

Este erro ocorre quando uma coluna com o mesmo nome existe em várias tabelas das subqueries, e o PostgreSQL não consegue determinar qual coluna utilizar.

### 9. Erro de Coluna Incorreta na Tabela precos_historico

Erro identificado: "column ph.preco_maximo_consumidor does not exist"

Após verificação da estrutura da tabela `precos_historico`, descobrimos que a coluna utilizada nos scripts não existe. Na tabela real, as colunas disponíveis são:
- `pf_sem_impostos` (preço de fábrica sem impostos)
- `pmc_0`, `pmc_12`, `pmc_17`, etc. (diferentes alíquotas de preço máximo ao consumidor)

### 10. Erro de Referência ao Catálogo do Sistema PostgreSQL

Erro identificado: "relation 'public.pg_catalog.pg_proc' does not exist"

Este erro ocorre porque algumas funções auxiliares (como `pg_get_function_def` e `verificar_estrutura_tabela`) tentam acessar tabelas do catálogo do sistema PostgreSQL (`pg_catalog.pg_proc`) de maneira incorreta. O correto seria acessar diretamente `pg_catalog.pg_proc` sem o prefixo `public`.

Como essas funções auxiliares não são essenciais para o funcionamento do dashboard, a melhor solução é removê-las completamente para evitar problemas de permissão e acesso ao catálogo do sistema.

## Solução

### Passo 1: Acessar a Página de Diagnóstico

1. Navegue até a página de Diagnóstico através do link no menu principal ou diretamente em `/diagnostico`
2. Verifique quais funções estão com erro (marcadas em vermelho)

### Passo 2: Corrigir Funções SQL

Para corrigir as funções com problemas, siga estas orientações:

1. **Qualificar todas as referências ambíguas a colunas:**
   ```sql
   -- Incorreto
   SELECT id, produto FROM medicamentos JOIN laboratorios ON medicamento_id = id
   
   -- Correto
   SELECT m.id, m.produto FROM medicamentos m JOIN laboratorios l ON l.medicamento_id = m.id
   ```

2. **Corrigir nomes de colunas incorretos:**
   ```sql
   -- Incorreto
   SELECT tipo_produto FROM medicamentos
   
   -- Correto
   SELECT tipo_de_produto FROM medicamentos
   ```

3. **Corrigir acesso a schemas:**
   - Não use `public.information_schema` - use apenas `information_schema`
   - Para tabelas no schema public, você pode omitir o `public.` ou mantê-lo

### Passo 3: Corrija os Erros

#### Opção 1: Usar o Editor SQL do Supabase
1. Faça login no dashboard Supabase
2. Navegue até o Editor SQL
3. Crie uma nova consulta e cole o conteúdo do arquivo `src/services/analises_avancadas_essenciais.sql`
4. Execute o script para substituir todas as funções problemáticas com versões corrigidas

#### Opção 2: Usar a API do Supabase
Se você estiver utilizando a API do Supabase diretamente:
1. Use o endpoint RPC para executar o script SQL
2. Certifique-se de ter as permissões necessárias para criar/substituir funções

> **IMPORTANTE**: O script primeiro remove as funções existentes (DROP FUNCTION) e depois cria novas versões corrigidas. Isto garante uma instalação limpa sem conflitos de assinaturas.

### Passo 4: Implementando as Correções Finais

Foi criado o arquivo `analises_avancadas_essenciais.sql` que contém apenas as funções essenciais para o dashboard e está alinhado com a estrutura real das tabelas no banco de dados.

Este script:
1. Remove todas as funções existentes
2. Recria apenas as funções necessárias usando as colunas corretas das tabelas
3. Inclui todas as correções para ambiguidade de colunas e proteções contra erros
4. Utiliza a abordagem segura para tabelas temporárias
5. Não inclui funções auxiliares que acessam o catálogo do sistema

### Erros Corrigidos

1. **analise_por_categoria_terapeutica**:
   - Corrigido referência de `percentual_reajuste` para `percentual`
   - Ajustado GROUP BY para usar nome correto da coluna
   - Corrigido referência de `tipo_de_produto` para `tipo_produto`

2. **analise_genericos_vs_referencia**:
   - Corrigido referência de `percentual_reajuste` para `percentual`
   - Corrigido tipo de dados para evitar ambiguidade
   - Adicionado alias para coluna `ano` para evitar ambiguidade
   - Corrigido referência de `tipo_de_produto` para `tipo_produto`

3. **analise_elasticidade_por_faixa**:
   - Corrigido referência de `percentual_reajuste` para `percentual`
   - Melhorado o tratamento de divisão por zero
   - Adicionado proteções extras contra valores nulos ou zero

4. **projecao_impacto_financeiro**:
   - Substituído DELETE sem WHERE por DROP TABLE IF EXISTS
   - Corrigido manipulação da tabela temporária
   - Adicionado DROP TABLE no final da função
   - Adicionado alias para coluna `ano` para evitar ambiguidade

5. **obter_projecoes_reajuste**:
   - Adicionado tratamento para valores nulos
   - Melhorado os cálculos para evitar divisão por zero
   - Adicionado COALESCE para garantir valores padrão quando necessário

6. **Resolução de conflitos de assinaturas**:
   - Adicionado DROP FUNCTION para cada função com suas assinaturas específicas
   - Garantido que apenas uma versão de cada função existe no banco

> **Instruções de implementação**: Execute o arquivo `analises_avancadas_essenciais.sql` no Editor SQL do Supabase para aplicar todas as correções de uma vez.

## Prevenção de Novos Erros

Para evitar problemas futuros:

1. **Padronizar nomenclatura**: Mantenha um padrão de nomenclatura consistente entre tabelas e colunas
2. **Documentar schema**: Mantenha documentação atualizada do schema do banco de dados
3. **Testes de integração**: Implemente testes que verifiquem a compatibilidade entre funções SQL e tabelas
4. **Qualificar referências**: Sempre use prefixos de tabela (ou alias) ao referenciar colunas em JOINs
5. **Revisão de código**: Faça revisão de código específica para queries SQL antes do deploy

### Boas Práticas SQL

- **Prefixos em JOINs**: Sempre use alias de tabela em consultas com JOIN
  ```sql
  -- Errado
  SELECT id, nome FROM tabela1 JOIN tabela2 ON id = tabela2_id

  -- Correto
  SELECT t1.id, t1.nome FROM tabela1 t1 JOIN tabela2 t2 ON t1.id = t2.tabela1_id
  ```

- **Transações**: Use transações para operações que alteram dados
  ```sql
  BEGIN;
  -- operações de modificação
  COMMIT;
  ```

- **Nunca DELETE sem WHERE**: Um DELETE sem WHERE vai excluir todos os registros da tabela!

## Materiais de Referência

- [Documentação PostgreSQL](https://www.postgresql.org/docs/)
- [Documentação Supabase](https://supabase.com/docs)
- [Erros PostgreSQL](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [SQL Style Guide](https://www.sqlstyle.guide/)
