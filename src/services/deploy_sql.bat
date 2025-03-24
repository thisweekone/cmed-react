@echo off
echo Fazendo deploy das funcoes SQL corrigidas...
cd /d "%~dp0"
npx supabase-js-cli db functions drop --all
npx supabase-js-cli db functions deploy analises_avancadas_corrigidas.sql

echo.
echo Finalizando. Pressione qualquer tecla para encerrar.
pause > nul
