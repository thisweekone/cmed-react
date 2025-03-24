import React, { useState, useEffect } from 'react';
import { Table, Button, Alert, Spinner, Card } from 'react-bootstrap';
import { Bar } from 'react-chartjs-2';
import { supabase } from '../../supabaseClient';

function CategoriaTerapeuticaAnalise({ anoInicio, anoFim }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dados, setDados] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [debug, setDebug] = useState(null);
  
  useEffect(() => {
    if (anoInicio && anoFim) {
      fetchAnalise();
    }
  }, [anoInicio, anoFim]);
  
  const fetchAnalise = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebug(null);
      
      console.log("Chamando função analise_por_categoria_terapeutica com parâmetros:", {
        ano_inicio: anoInicio,
        ano_fim: anoFim
      });
      
      // Verificar se a função existe
      const { data: funcoes, error: erroFuncoes } = await supabase
        .from('pg_catalog.pg_proc')
        .select('proname')
        .ilike('proname', '%categoria%');
        
      if (erroFuncoes) {
        console.error("Erro ao verificar funções:", erroFuncoes);
        setDebug(`Erro ao verificar funções: ${erroFuncoes.message || JSON.stringify(erroFuncoes)}`);
      } else {
        console.log("Funções encontradas:", funcoes);
        setDebug(prev => `${prev || ''}\nFunções encontradas: ${JSON.stringify(funcoes)}`);
      }
      
      const { data, error } = await supabase
        .rpc('analise_por_categoria_terapeutica', {
          ano_inicio: anoInicio,
          ano_fim: anoFim
        });
        
      if (error) {
        console.error("Erro na função analise_por_categoria_terapeutica:", error);
        setDebug(prev => `${prev || ''}\nErro na chamada RPC: ${error.message || JSON.stringify(error)}`);
        throw error;
      }
      
      console.log("Dados recebidos:", data);
      setDebug(prev => `${prev || ''}\nDados recebidos: ${data ? JSON.stringify(data.slice(0, 2)) : 'nenhum'}`);
      
      if (data && data.length > 0) {
        // Normalizar os dados para garantir que temos valores válidos
        const dadosNormalizados = data.map(item => ({
          ano: typeof item.ano === 'number' ? item.ano : parseInt(item.ano || 0),
          classe_terapeutica: item.classe_terapeutica || 'Não especificada',
          variacao_media: typeof item.variacao_media === 'number' ? item.variacao_media : 0,
          reajuste_cmed: typeof item.reajuste_cmed === 'number' ? item.reajuste_cmed : 0,
          diferenca: typeof item.diferenca === 'number' ? item.diferenca : 0,
          total_medicamentos: typeof item.total_medicamentos === 'number' ? item.total_medicamentos : 0
        }));
        
        console.log("Dados normalizados:", dadosNormalizados);
        setDados(dadosNormalizados);
        
        // Extrair categorias únicas
        const uniqueCategorias = [...new Set(dadosNormalizados.map(item => item.classe_terapeutica))];
        setCategorias(uniqueCategorias);
        
        // Selecionar primeira categoria por padrão
        setCategoriaSelecionada(uniqueCategorias[0]);
      } else {
        setDados([]);
        setCategorias([]);
        setCategoriaSelecionada(null);
        setDebug(prev => `${prev || ''}\nNenhum dado retornado pela função`);
      }
    } catch (err) {
      console.error('Erro ao buscar análise por categoria:', err);
      setError(`Não foi possível carregar os dados de análise por categoria terapêutica. Erro: ${err.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Dados filtrados pela categoria selecionada
  const dadosFiltrados = dados.filter(item => 
    !categoriaSelecionada || item.classe_terapeutica === categoriaSelecionada
  );
  
  // Configuração do gráfico
  const chartData = {
    labels: dadosFiltrados.map(item => item.ano),
    datasets: [
      {
        type: 'line',
        label: 'Reajuste CMED (%)',
        data: dadosFiltrados.map(item => item.reajuste_cmed),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderWidth: 2,
        yAxisID: 'y',
      },
      {
        type: 'bar',
        label: 'Variação Média de Preço (%)',
        data: dadosFiltrados.map(item => item.variacao_media),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderColor: 'rgb(53, 162, 235)',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: 'Diferença',
        data: dadosFiltrados.map(item => item.diferenca),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderDash: [5, 5],
        borderWidth: 2,
        yAxisID: 'y',
      }
    ]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Análise por Categoria: ${categoriaSelecionada || 'Todas'}`,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2) + '%';
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Percentual (%)'
        }
      }
    }
  };
  
  return (
    <div>
      {error && (
        <Alert variant="danger">
          {error}
          {debug && (
            <pre className="mt-3 p-2 bg-light text-dark" style={{ fontSize: '0.8rem' }}>
              {debug}
            </pre>
          )}
        </Alert>
      )}
      
      {loading ? (
        <div className="text-center my-4">
          <Spinner animation="border" />
          <p>Carregando dados da análise...</p>
        </div>
      ) : dados.length === 0 ? (
        <Alert variant="info">
          Não há dados suficientes para análise por categoria terapêutica no período selecionado.
          {debug && (
            <pre className="mt-3 p-2 bg-light text-dark" style={{ fontSize: '0.8rem' }}>
              {debug}
            </pre>
          )}
        </Alert>
      ) : (
        <>
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4>Análise de {anoInicio} a {anoFim}</h4>
              <div>
                <label htmlFor="categoria" className="me-2">Categoria:</label>
                <select 
                  id="categoria" 
                  className="form-select form-select-sm d-inline-block" 
                  style={{ width: 'auto' }}
                  value={categoriaSelecionada || ''}
                  onChange={(e) => setCategoriaSelecionada(e.target.value)}
                >
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <Card className="mb-4">
              <Card.Body>
                <div style={{ height: '400px' }}>
                  <Bar options={chartOptions} data={chartData} />
                </div>
              </Card.Body>
            </Card>
            
            <h5>Dados Detalhados</h5>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Ano</th>
                  <th>Categoria Terapêutica</th>
                  <th>Variação Média (%)</th>
                  <th>Reajuste CMED (%)</th>
                  <th>Diferença (%)</th>
                  <th>Medicamentos</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dadosFiltrados.map((item, index) => {
                  // Determinar status com base na diferença
                  let status, badgeClass;
                  if (item.diferenca > 2) {
                    status = 'Muito Acima';
                    badgeClass = 'bg-danger';
                  } else if (item.diferenca > 0.5) {
                    status = 'Acima';
                    badgeClass = 'bg-warning text-dark';
                  } else if (item.diferenca < -2) {
                    status = 'Muito Abaixo';
                    badgeClass = 'bg-info';
                  } else if (item.diferenca < -0.5) {
                    status = 'Abaixo';
                    badgeClass = 'bg-primary';
                  } else {
                    status = 'Alinhado';
                    badgeClass = 'bg-success';
                  }
                  
                  return (
                    <tr key={index}>
                      <td>{item.ano}</td>
                      <td>{item.classe_terapeutica}</td>
                      <td>{item.variacao_media.toFixed(2)}%</td>
                      <td>{item.reajuste_cmed.toFixed(2)}%</td>
                      <td>
                        {item.diferenca > 0 ? '+' : ''}{item.diferenca.toFixed(2)}%
                      </td>
                      <td>{item.total_medicamentos}</td>
                      <td>
                        <span className={`badge ${badgeClass}`}>{status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </>
      )}
      
      <div className="mt-3">
        <Button 
          variant="outline-secondary" 
          size="sm"
          onClick={() => {
            fetchAnalise();
          }}
        >
          Atualizar Dados
        </Button>
        
        <Button 
          variant="outline-primary" 
          size="sm"
          className="ms-2"
          onClick={() => {
            setDebug(prev => `${prev || ''}\n\n--- Verificação manual iniciada ---`);
            
            // Verificar se a tabela de medicamentos existe
            supabase
              .from('medicamentos_base')
              .select('count(*)', { count: 'exact' })
              .then(result => {
                setDebug(prev => `${prev}\nTabela medicamentos_base: ${!result.error ? `OK (${result.count} registros)` : `ERRO: ${result.error.message}`}`);
              });
              
            // Verificar se a tabela de preços existe
            supabase
              .from('precos_historico')
              .select('count(*)', { count: 'exact' })
              .then(result => {
                setDebug(prev => `${prev}\nTabela precos_historico: ${!result.error ? `OK (${result.count} registros)` : `ERRO: ${result.error.message}`}`);
              });
              
            // Verificar se a tabela de reajustes existe  
            supabase
              .from('reajustes_anuais')
              .select('count(*)', { count: 'exact' })
              .then(result => {
                setDebug(prev => `${prev}\nTabela reajustes_anuais: ${!result.error ? `OK (${result.count} registros)` : `ERRO: ${result.error.message}`}`);
              });
              
            // Testar função básica
            supabase
              .rpc('obter_anos_disponiveis')
              .then(result => {
                setDebug(prev => `${prev}\nFunção obter_anos_disponiveis: ${!result.error ? `OK (${JSON.stringify(result.data)})` : `ERRO: ${result.error.message}`}`);
              });
          }}
        >
          Diagnosticar
        </Button>
      </div>
      
      {debug && !error && (
        <div className="mt-4">
          <details>
            <summary>Detalhes de Depuração</summary>
            <pre className="p-2 bg-light text-dark" style={{ fontSize: '0.8rem' }}>
              {debug}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default CategoriaTerapeuticaAnalise;
