Write-Host "Fazendo deploy das funções SQL corrigidas..." -ForegroundColor Green

# Caminho do arquivo SQL
$sqlFile = Join-Path $PSScriptRoot "analises_avancadas_simplificadas_v2.sql"
$supabaseUrl = "https://YOUR_SUPABASE_URL.supabase.co"  # Substitua com sua URL do Supabase
$supabaseKey = "YOUR_SUPABASE_KEY"  # Substitua com sua chave do Supabase

# Verifique se o arquivo existe
if (-not (Test-Path $sqlFile)) {
    Write-Host "Arquivo SQL não encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

# Leia o conteúdo do arquivo SQL
$sqlContent = Get-Content -Path $sqlFile -Raw

Write-Host "Arquivo SQL encontrado e carregado." -ForegroundColor Green
Write-Host "Antes de executar este script, substitua a URL e a chave do Supabase pelas suas credenciais reais."

Write-Host @"

Para aplicar as funções SQL corrigidas ao banco de dados, você tem duas opções:

1. Se estiver usando o Dashboard do Supabase:
   - Acesse o Editor SQL do Supabase
   - Cole o conteúdo do arquivo 'analises_avancadas_simplificadas_v2.sql'
   - Execute o script

2. Se estiver usando a CLI do Supabase:
   - Execute o comando:
     supabase db execute --file ./src/services/analises_avancadas_simplificadas_v2.sql

"@ -ForegroundColor Cyan

Write-Host "Resumo das correções implementadas:" -ForegroundColor Yellow
Write-Host "1. Corrigido uso de tipo_produto para tipo_de_produto em todas as funções SQL" -ForegroundColor White
Write-Host "2. Corrigidas ambiguidades nas referências às colunas classe_terapeutica e variacao_percentual" -ForegroundColor White
Write-Host "3. Adicionados aliases apropriados a todas as colunas nas subconsultas" -ForegroundColor White
Write-Host "4. Corrigida a função projecao_impacto_financeiro para usar aliases corretamente" -ForegroundColor White

Write-Host "`nPressione qualquer tecla para encerrar..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
