@echo off
echo Iniciando implantação do script SQL...

REM Configurações do Supabase (substitua com suas credenciais)
set SUPABASE_URL=https://your-project-url.supabase.co
set SUPABASE_KEY=your-service-role-key

REM Caminhos para os arquivos SQL 
set SQL_SCRIPT=analises_avancadas_final.sql

echo Implantando funções SQL...
curl -X POST "%SUPABASE_URL%/rest/v1/rpc/exec_sql" ^
  -H "apikey: %SUPABASE_KEY%" ^
  -H "Authorization: Bearer %SUPABASE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"query\": \"%SQL_SCRIPT%\"}"

echo.
echo Implantação concluída!
echo.
echo IMPORTANTE: Certifique-se de configurar as variáveis SUPABASE_URL e SUPABASE_KEY
echo com as informações corretas do seu projeto Supabase antes de executar este script.
echo.
pause
