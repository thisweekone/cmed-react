import React from 'react';
import { Card, Alert, ListGroup } from 'react-bootstrap';

/**
 * Componente que fornece dicas específicas para erros do Supabase
 */
const SupabaseErrorTips = ({ errorCode }) => {
  // Mapeamento de códigos de erro PostgreSQL mais comuns
  const errorTips = {
    '42P01': {
      title: 'Tabela não encontrada',
      description: 'O banco de dados não reconhece a tabela que você está tentando acessar.',
      fixes: [
        'Verifique o nome correto da tabela (maiúsculas/minúsculas são importantes)',
        'Verifique se a tabela foi realmente criada no banco de dados',
        'Certifique-se de usar o schema correto (public.tabela ou apenas tabela)'
      ]
    },
    '42703': {
      title: 'Coluna não existente',
      description: 'A coluna referenciada não existe na tabela.',
      fixes: [
        'Verifique a ortografia exata do nome da coluna',
        'Consulte a estrutura da tabela para confirmar os nomes das colunas',
        'Se estiver usando aliases, certifique-se de que estão corretamente definidos'
      ]
    },
    '42702': {
      title: 'Referência ambígua a coluna',
      description: 'Várias tabelas têm colunas com o mesmo nome, causando ambiguidade.',
      fixes: [
        'Qualifique a coluna com o nome da tabela: tabela.coluna',
        'Use aliases para as tabelas: FROM tabela1 t1, tabela2 t2',
        'Revise as junções para garantir que não há conflitos de nomes'
      ]
    },
    '42601': {
      title: 'Erro de sintaxe SQL',
      description: 'A consulta SQL contém um erro de sintaxe.',
      fixes: [
        'Verifique parênteses não fechados ou mal posicionados',
        'Confira vírgulas entre colunas e na cláusula FROM',
        'Certifique-se de que palavras-chave SQL estão corretas'
      ]
    },
    '22P02': {
      title: 'Tipo de dado inválido',
      description: 'Tentativa de converter um valor para um tipo incompatível.',
      fixes: [
        'Verifique os tipos de dados das colunas',
        'Use funções de conversão como CAST() ou :: para converter tipos',
        'Certifique-se de que os parâmetros estão no formato correto'
      ]
    },
    '3D000': {
      title: 'Banco de dados não existe',
      description: 'O banco de dados especificado não existe.',
      fixes: [
        'Verifique a URL de conexão do Supabase',
        'Confirme se o banco de dados foi criado',
        'Verifique as permissões de acesso'
      ]
    },
    '28P01': {
      title: 'Senha inválida',
      description: 'A senha fornecida para autenticação está incorreta.',
      fixes: [
        'Verifique a chave anon ou service_role do Supabase',
        'Confirme se as variáveis de ambiente estão configuradas corretamente',
        'Tente gerar novas chaves de API no dashboard do Supabase'
      ]
    },
    '23505': {
      title: 'Violação de unicidade',
      description: 'Tentativa de inserir um valor duplicado em uma coluna única.',
      fixes: [
        'Verifique se o registro já existe antes de inserir',
        'Use operações UPSERT (INSERT ON CONFLICT)',
        'Verifique os valores que estão sendo inseridos'
      ]
    }
  };

  // Se não temos dicas específicas para este código
  if (!errorCode || !errorTips[errorCode]) {
    return (
      <Alert variant="info">
        <Alert.Heading>Dica Geral para Erros do Supabase</Alert.Heading>
        <p>
          Quando ocorrem erros no Supabase, verifique:
        </p>
        <ul>
          <li>Se as tabelas e colunas existem com os nomes corretos</li>
          <li>Se as permissões estão configuradas corretamente</li>
          <li>Se a sintaxe SQL está correta</li>
          <li>Se as políticas de segurança permitem a operação</li>
        </ul>
      </Alert>
    );
  }

  const tip = errorTips[errorCode];

  return (
    <Card className="mt-3">
      <Card.Header className="bg-warning">
        <strong>Ajuda com Erro {errorCode}: {tip.title}</strong>
      </Card.Header>
      <Card.Body>
        <p>{tip.description}</p>
        
        <Card.Title>Possíveis soluções:</Card.Title>
        <ListGroup variant="flush">
          {tip.fixes.map((fix, index) => (
            <ListGroup.Item key={index}>
              {index + 1}. {fix}
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card.Body>
    </Card>
  );
};

export default SupabaseErrorTips;
