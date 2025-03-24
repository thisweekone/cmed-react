import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Container, Table, Card, Button, Alert, Accordion, Row, Col, Spinner } from 'react-bootstrap';

const DbDebugger = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tablesInfo, setTablesInfo] = useState([]);
  const [functionsInfo, setFunctionsInfo] = useState([]);
  const [testResults, setTestResults] = useState({});
  const [showDetails, setShowDetails] = useState(false);

  // Lista de tabelas e funções a verificar
  const tabelasParaVerificar = [
    'medicamentos_base',
    'precos_historico',
    'reajustes_anuais'
  ];

  const funcoesParaVerificar = [
    'obter_anos_disponiveis',
    'analise_por_categoria_terapeutica',
    'analise_correlacao_cambio',
    'analise_elasticidade_por_faixa',
    'analise_genericos_vs_referencia',
    'projecao_impacto_financeiro',
    'pg_get_function_def'
  ];

  useEffect(() => {
    verificarBancoDados();
  }, []);

  const verificarBancoDados = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar tabelas
      const infoTabelas = await Promise.all(
        tabelasParaVerificar.map(async (tabela) => {
          try {
            // Verificar se a tabela existe usando a api direta
            const { count, error: countError } = await supabase
              .from(tabela)
              .select('*', { count: 'exact', head: true });
            
            if (countError) {
              console.log(`Erro ao verificar tabela ${tabela}:`, countError);
              return {
                nome: tabela,
                existe: false,
                colunas: [],
                totalRegistros: 0,
                erro: countError.message
              };
            }
            
            // Obter dados simplificados sobre as colunas usando consulta direta
            const { data: sample, error: sampleError } = await supabase
              .from(tabela)
              .select('*')
              .limit(1);
              
            let colunas = [];
            if (sample && sample.length > 0) {
              // Extrair nomes de colunas do resultado
              colunas = Object.keys(sample[0]).map(colName => ({
                column_name: colName,
                data_type: typeof sample[0][colName] === 'object' ? 'object' : typeof sample[0][colName],
                is_nullable: 'unknown'
              }));
            }
            
            return {
              nome: tabela,
              existe: true,
              colunas: colunas,
              totalRegistros: count || 0
            };
          } catch (err) {
            console.error(`Erro ao verificar tabela ${tabela}:`, err);
            return {
              nome: tabela,
              existe: false,
              colunas: [],
              totalRegistros: 0,
              erro: err.message
            };
          }
        })
      );
      
      setTablesInfo(infoTabelas);
      
      // Verificar funções
      const infoFuncoes = await Promise.all(
        funcoesParaVerificar.map(async (funcao) => {
          // Consulta para verificar se a função existe
          const { data: funcaoExiste, error: erroFuncaoExiste } = await supabase
            .rpc('pg_get_function_def', {
              p_schema_name: 'public',
              p_function_name: funcao
            }).catch(err => ({ error: err }));
          
          const existe = funcaoExiste && !erroFuncaoExiste;
          
          return {
            nome: funcao,
            existe: existe,
            definicao: funcaoExiste || '',
            erro: erroFuncaoExiste ? erroFuncaoExiste.message : null
          };
        })
      );
      
      setFunctionsInfo(infoFuncoes);
      
      // Testar funções básicas
      const resultadosTeste = {};
      
      // Teste 1: obter_anos_disponiveis
      try {
        const { data: anos, error: erroAnos } = await supabase.rpc('obter_anos_disponiveis');
        resultadosTeste['obter_anos_disponiveis'] = {
          sucesso: !erroAnos,
          resultado: anos,
          erro: erroAnos ? erroAnos.message : null
        };
      } catch (err) {
        resultadosTeste['obter_anos_disponiveis'] = {
          sucesso: false,
          erro: err.message
        };
      }
      
      // Teste 2: analise_por_categoria_terapeutica com parâmetros simples
      try {
        const { data: analiseCategoria, error: erroAnaliseCategoria } = await supabase
          .rpc('analise_por_categoria_terapeutica', { 
            ano_inicio: 2020, 
            ano_fim: 2023 
          });
        resultadosTeste['analise_por_categoria_terapeutica'] = {
          sucesso: !erroAnaliseCategoria,
          amostra: analiseCategoria ? analiseCategoria.slice(0, 3) : [],
          erro: erroAnaliseCategoria ? erroAnaliseCategoria.message : null
        };
      } catch (err) {
        resultadosTeste['analise_por_categoria_terapeutica'] = {
          sucesso: false,
          erro: err.message
        };
      }
      
      // Teste 3: analise_genericos_vs_referencia
      try {
        const { data: analiseGenericos, error: erroAnaliseGenericos } = await supabase
          .rpc('analise_genericos_vs_referencia', { 
            ano_referencia: 2022,
            tipo: 'ambos'
          });
        resultadosTeste['analise_genericos_vs_referencia'] = {
          sucesso: !erroAnaliseGenericos,
          amostra: analiseGenericos ? analiseGenericos.slice(0, 3) : [],
          erro: erroAnaliseGenericos ? erroAnaliseGenericos.message : null
        };
      } catch (err) {
        resultadosTeste['analise_genericos_vs_referencia'] = {
          sucesso: false,
          erro: err.message
        };
      }
      
      // Teste 4: projecao_impacto_financeiro
      try {
        const { data: projecao, error: erroProjecao } = await supabase
          .rpc('projecao_impacto_financeiro', { 
            ano_inicio: 2020, 
            ano_fim: 2023,
            anos_projecao: 2,
            cenario: 'medio'
          });
        resultadosTeste['projecao_impacto_financeiro'] = {
          sucesso: !erroProjecao,
          amostra: projecao ? projecao.slice(0, 3) : [],
          erro: erroProjecao ? erroProjecao.message : null
        };
      } catch (err) {
        resultadosTeste['projecao_impacto_financeiro'] = {
          sucesso: false,
          erro: err.message
        };
      }
      
      setTestResults(resultadosTeste);
      
    } catch (err) {
      console.error('Erro ao verificar banco de dados:', err);
      setError(`Erro ao verificar banco de dados: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="mt-4 mb-5">
      <h1>Diagnóstico do Banco de Dados</h1>
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
          <p className="mt-2">Verificando o banco de dados...</p>
        </div>
      ) : error ? (
        <Alert variant="danger">
          {error}
        </Alert>
      ) : (
        <>
          <Row>
            <Col>
              <Card className="mb-4">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h2 className="mb-0">Resumo</h2>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => verificarBancoDados()}
                  >
                    Atualizar
                  </Button>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h5>Tabelas</h5>
                      <Table striped bordered hover size="sm">
                        <thead>
                          <tr>
                            <th>Tabela</th>
                            <th>Status</th>
                            <th>Registros</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tablesInfo.map((tabela) => (
                            <tr key={tabela.nome}>
                              <td>{tabela.nome}</td>
                              <td>
                                {tabela.existe ? (
                                  <span className="text-success">✓ OK</span>
                                ) : (
                                  <span className="text-danger">✗ Não existe</span>
                                )}
                              </td>
                              <td>{tabela.totalRegistros || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h5>Funções</h5>
                      <Table striped bordered hover size="sm">
                        <thead>
                          <tr>
                            <th>Função</th>
                            <th>Status</th>
                            <th>Teste</th>
                          </tr>
                        </thead>
                        <tbody>
                          {functionsInfo.map((funcao) => (
                            <tr key={funcao.nome}>
                              <td>{funcao.nome}</td>
                              <td>
                                {funcao.existe ? (
                                  <span className="text-success">✓ OK</span>
                                ) : (
                                  <span className="text-danger">✗ Não existe</span>
                                )}
                              </td>
                              <td>
                                {testResults[funcao.nome] ? (
                                  testResults[funcao.nome].sucesso ? (
                                    <span className="text-success">✓ Passou</span>
                                  ) : (
                                    <span className="text-danger">✗ Falhou</span>
                                  )
                                ) : (
                                  <span className="text-secondary">–</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Button 
            variant="outline-secondary" 
            className="mb-3"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Ocultar detalhes' : 'Mostrar detalhes'}
          </Button>
          
          {showDetails && (
            <>
              <Card className="mb-4">
                <Card.Header>
                  <h3>Detalhes das Tabelas</h3>
                </Card.Header>
                <Card.Body>
                  <Accordion>
                    {tablesInfo.map((tabela, index) => (
                      <Accordion.Item eventKey={index.toString()} key={tabela.nome}>
                        <Accordion.Header>
                          {tabela.nome} 
                          {tabela.existe ? (
                            <span className="ms-2 text-success">✓</span>
                          ) : (
                            <span className="ms-2 text-danger">✗</span>
                          )}
                        </Accordion.Header>
                        <Accordion.Body>
                          {tabela.existe ? (
                            <>
                              <p>Total de registros: {tabela.totalRegistros}</p>
                              <h6>Colunas:</h6>
                              <Table striped bordered hover size="sm">
                                <thead>
                                  <tr>
                                    <th>Nome</th>
                                    <th>Tipo de Dados</th>
                                    <th>Nullable</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tabela.colunas.map((coluna, idx) => (
                                    <tr key={idx}>
                                      <td>{coluna.column_name}</td>
                                      <td>{coluna.data_type}</td>
                                      <td>{coluna.is_nullable === 'YES' ? 'Sim' : 'Não'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            </>
                          ) : (
                            <Alert variant="danger">Tabela não existe</Alert>
                          )}
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                </Card.Body>
              </Card>
              
              <Card className="mb-4">
                <Card.Header>
                  <h3>Detalhes das Funções</h3>
                </Card.Header>
                <Card.Body>
                  <Accordion>
                    {functionsInfo.map((funcao, index) => (
                      <Accordion.Item eventKey={index.toString()} key={funcao.nome}>
                        <Accordion.Header>
                          {funcao.nome}
                          {funcao.existe ? (
                            <span className="ms-2 text-success">✓</span>
                          ) : (
                            <span className="ms-2 text-danger">✗</span>
                          )}
                        </Accordion.Header>
                        <Accordion.Body>
                          {funcao.existe ? (
                            <>
                              <h6>Definição:</h6>
                              <pre className="bg-light p-2" style={{maxHeight: '300px', overflow: 'auto'}}>
                                {funcao.definicao}
                              </pre>
                              
                              {testResults[funcao.nome] && (
                                <>
                                  <h6 className="mt-3">Resultado do teste:</h6>
                                  {testResults[funcao.nome].sucesso ? (
                                    <>
                                      <Alert variant="success">
                                        Função executada com sucesso
                                      </Alert>
                                      {testResults[funcao.nome].amostra && (
                                        <>
                                          <h6>Amostra de resultado:</h6>
                                          <pre className="bg-light p-2" style={{maxHeight: '200px', overflow: 'auto'}}>
                                            {JSON.stringify(testResults[funcao.nome].amostra, null, 2)}
                                          </pre>
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    <Alert variant="danger">
                                      {testResults[funcao.nome].erro}
                                    </Alert>
                                  )}
                                </>
                              )}
                            </>
                          ) : (
                            <Alert variant="danger">
                              Função não existe no banco de dados
                              {funcao.erro && (
                                <p className="mt-2 mb-0">
                                  <strong>Erro:</strong> {funcao.erro}
                                </p>
                              )}
                            </Alert>
                          )}
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                </Card.Body>
              </Card>
            </>
          )}
          
          <Alert variant="info">
            <Alert.Heading>Instruções para Resolução de Problemas</Alert.Heading>
            <p>
              Se alguma tabela ou função estiver faltando, você pode criar utilizando os scripts SQL disponíveis 
              no diretório <code>/src/services/</code>:
            </p>
            <ul>
              <li><strong>analises_avancadas_simplificadas_v2.sql</strong> - Contém todas as funções SQL necessárias com correções para problemas de ambiguidade de colunas</li>
              <li><strong>deploy_sql_v2.ps1</strong> - Script PowerShell para facilitar o deployment das funções</li>
            </ul>
            <p>
              Para executar as funções corrigidas, use o script <code>deploy_sql_v2.ps1</code> ou aplique diretamente 
              o conteúdo de <code>analises_avancadas_simplificadas_v2.sql</code> no editor SQL do Supabase.
            </p>
          </Alert>
        </>
      )}
    </Container>
  );
};

export default DbDebugger;
