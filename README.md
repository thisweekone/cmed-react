# Sistema CMED - React

Este é um aplicativo React para importação e visualização de dados da tabela de medicamentos da CMED (Câmara de Regulação do Mercado de Medicamentos).

## Funcionalidades

- **Importação de Dados**: Carregue arquivos CSV, XLS ou XLSX com dados da tabela CMED.
- **Mapeamento de Colunas**: Faça correspondência entre as colunas do arquivo e os campos do sistema.
- **Validação de Dados**: Validação automática dos dados importados.
- **Listagem de Medicamentos**: Visualize os medicamentos importados com paginação e filtragem.

## Tecnologias Utilizadas

- React.js
- React Bootstrap para UI
- React Router para navegação
- Supabase para armazenamento e consulta de dados
- React Dropzone para upload de arquivos
- XLSX e PapaParse para processamento de arquivos Excel e CSV

## Configuração do Ambiente

### Pré-requisitos

- Node.js (versão 14 ou superior)
- NPM ou Yarn
- Conta Supabase (gratuita ou paga)

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
REACT_APP_SUPABASE_URL=sua_url_supabase
REACT_APP_SUPABASE_KEY=sua_chave_supabase
```

### Instalação

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm start

# Construir para produção
npm run build
```

## Estrutura do Banco de Dados Supabase

O sistema utiliza duas tabelas principais:

### Tabela `medicamentos`

- `id`: Chave primária (gerada automaticamente)
- `substancia`: Texto
- `laboratorio`: Texto
- `produto`: Texto
- `apresentacao`: Texto
- `codigo_ggrem`: Texto
- `registro`: Texto
- `ean_1`: Texto
- `classe_terapeutica`: Texto
- `tipo_de_produto`: Texto
- `regime_de_preco`: Texto
- `pf_sem_impostos`: Decimal
- `data_publicacao`: Data
- `importacao_id`: Referência à tabela `importacoes`

### Tabela `importacoes`

- `id`: Chave primária (gerada automaticamente)
- `nome_arquivo`: Texto
- `data_importacao`: Timestamp
- `total_registros`: Inteiro
- `registros_importados`: Inteiro
- `registros_com_erro`: Inteiro
- `status`: Texto ('completo', 'parcial', 'erro')

## Deploy no Netlify

Para fazer o deploy deste aplicativo no Netlify:

1. Faça upload do código para o GitHub
2. Conecte o repositório no Netlify
3. Configure as variáveis de ambiente no painel do Netlify
4. O Netlify irá automaticamente construir e publicar o aplicativo

## Aviso Importante

Este é um sistema simples para fins de demonstração. Em um ambiente de produção, considere implementar:

- Autenticação de usuários
- Validações mais rigorosas
- Testes automatizados
- Logging adequado
- Tratamento de erros mais robusto

## Licença

MIT
