-- Função para executar SQL dinâmico (apenas para administradores)
-- AVISO: Esta função é perigosa pois permite executar qualquer SQL.
-- Use apenas em ambiente de desenvolvimento ou com extrema cautela!
CREATE OR REPLACE FUNCTION exec_sql(sql_command TEXT) 
RETURNS TEXT AS $$
BEGIN
  -- Registrar quem está chamando esta função (para auditoria)
  RAISE NOTICE 'Executando SQL dinâmico. Usuário: %', auth.uid();
  
  -- Executar o comando SQL
  EXECUTE sql_command;
  
  RETURN 'SQL executado com sucesso';
EXCEPTION WHEN OTHERS THEN
  -- Capturar e retornar erros
  RAISE EXCEPTION 'Erro ao executar SQL: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
