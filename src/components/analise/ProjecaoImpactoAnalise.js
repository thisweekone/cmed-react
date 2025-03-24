import React, { useState, useEffect } from 'react';
import { Form, Alert, Spinner, Card, Table } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import { supabase } from '../../supabaseClient';

function ProjecaoImpactoAnalise({ anoInicio, anoFim }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dados, setDados] = useState([]);
  const [anosProjecao, setAnosProjecao] = useState(3);
  const [cenarioReajuste, setCenarioReajuste] = useState('medio');
  
  useEffect(() => {
    if (anoInicio && anoFim) {
      fetchProjecao();
    }
  }, [anoInicio, anoFim, anosProjecao, cenarioReajuste]);
  
  const fetchProjecao = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Chamando função projecao_impacto_financeiro com parâmetros:", {
        ano_inicio: anoInicio,
        ano_fim: anoFim,
        anos_projecao: anosProjecao,
        cenario: cenarioReajuste
      });
      
      const { data, error } = await supabase
        .rpc('projecao_impacto_financeiro', {
          ano_inicio: anoInicio,
          ano_fim: anoFim,
          anos_projecao: anosProjecao,
          cenario: cenarioReajuste
        });
        
      if (error) {
        console.error("Erro na função projecao_impacto_financeiro:", error);
        throw error;
      }
      
      console.log("Dados recebidos:", data);
      
      if (data && data.length > 0) {
        // Normalizar os dados para garantir que temos valores válidos
        const dadosNormalizados = data.map(item => ({
          ano: typeof item.ano === 'object' ? parseInt(item.ano.ano || 0) : parseInt(item.ano || 0),
          preco_medio: typeof item.preco_medio === 'number' ? item.preco_medio : 0,
          variacao_percentual: typeof item.variacao_percentual === 'number' ? item.variacao_percentual : 0,
          reajuste_aplicado: typeof item.reajuste_aplicado === 'number' ? item.reajuste_aplicado : 0,
          impacto_acumulado: typeof item.impacto_acumulado === 'number' ? item.impacto_acumulado : 0,
          projetado: !!item.projetado
        }));
        
        console.log("Dados normalizados:", dadosNormalizados);
        setDados(dadosNormalizados);
      } else {
        setDados([]);
      }
    } catch (err) {
      console.error('Erro ao buscar projeção de impacto financeiro:', err);
      setError(`Não foi possível carregar os dados de projeção de impacto financeiro. Erro: ${err.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Separar dados históricos dos projetados
  const dadosHistoricos = dados.filter(item => !item.projetado);
  const dadosProjetados = dados.filter(item => item.projetado);
  
  // Configuração do gráfico
  const chartData = {
    labels: dados.map(item => `${item.ano}${item.projetado ? ' (p)' : ''}`),
    datasets: [
      {
        label: 'Preço Médio (R$)',
        data: dados.map(item => item.preco_medio),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        yAxisID: 'y',
        segment: {
          borderDash: ctx => ctx.p0.parsed.x >= dadosHistoricos.length - 1 ? [6, 6] : undefined,
        },
        pointStyle: ctx => ctx.dataIndex >= dadosHistoricos.length ? 'rectRot' : 'circle',
        pointRadius: ctx => ctx.dataIndex >= dadosHistoricos.length ? 6 : 4,
      },
      {
        label: 'Impacto Acumulado (%)',
        data: dados.map(item => item.impacto_acumulado),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y1',
        segment: {
          borderDash: ctx => ctx.p0.parsed.x >= dadosHistoricos.length - 1 ? [6, 6] : undefined,
        },
        pointStyle: ctx => ctx.dataIndex >= dadosHistoricos.length ? 'rectRot' : 'circle',
        pointRadius: ctx => ctx.dataIndex >= dadosHistoricos.length ? 6 : 4,
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
        text: 'Projeção de Impacto Financeiro',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (context.dataset.yAxisID === 'y') {
                label += 'R$ ' + context.parsed.y.toFixed(2);
              } else {
                label += context.parsed.y.toFixed(2) + '%';
              }
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
          text: 'Preço Médio (R$)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Impacto Acumulado (%)'
        },
        grid: {
          drawOnChartArea: false
        }
      }
    }
  };
  
  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
        <p className="mt-2">Carregando projeção de impacto financeiro...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="danger">
        {error}
      </Alert>
    );
  }
  
  if (dados.length === 0) {
    return (
      <Alert variant="info">
        Não há dados suficientes para projeção de impacto financeiro no período selecionado.
      </Alert>
    );
  }
  
  return (
    <div>
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4>Projeção de Impacto Financeiro</h4>
          <div className="d-flex">
            <div className="me-3">
              <label htmlFor="anosProjecao" className="me-2">Anos de Projeção:</label>
              <Form.Select 
                id="anosProjecao" 
                className="d-inline-block" 
                style={{ width: 'auto' }}
                value={anosProjecao}
                onChange={(e) => setAnosProjecao(parseInt(e.target.value))}
              >
                <option value="1">1 ano</option>
                <option value="2">2 anos</option>
                <option value="3">3 anos</option>
                <option value="5">5 anos</option>
                <option value="10">10 anos</option>
              </Form.Select>
            </div>
            <div>
              <label htmlFor="cenarioReajuste" className="me-2">Cenário:</label>
              <Form.Select 
                id="cenarioReajuste" 
                className="d-inline-block" 
                style={{ width: 'auto' }}
                value={cenarioReajuste}
                onChange={(e) => setCenarioReajuste(e.target.value)}
              >
                <option value="otimista">Otimista</option>
                <option value="medio">Médio</option>
                <option value="pessimista">Pessimista</option>
              </Form.Select>
            </div>
          </div>
        </div>
        
        <Alert variant="info">
          <p className="mb-0">
            <strong>Cenários de projeção:</strong>
            <br />
            <strong>Otimista:</strong> Preços aumentam menos que a média histórica.
            <br />
            <strong>Médio:</strong> Preços seguem a tendência média histórica.
            <br />
            <strong>Pessimista:</strong> Preços aumentam mais que a média histórica.
          </p>
        </Alert>
        
        <Card className="mb-4">
          <Card.Body>
            <div className="row mb-3">
              <div className="col-md-4">
                <div className="border rounded p-3 text-center">
                  <h5>Impacto Acumulado (até {anoFim + anosProjecao})</h5>
                  <div className="display-4 text-danger">
                    {dados[dados.length - 1]?.impacto_acumulado.toFixed(2)}%
                  </div>
                  <p className="text-muted mb-0">
                    Aumento acumulado em relação a {anoInicio}
                  </p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="border rounded p-3 text-center">
                  <h5>Preço Médio em {anoFim + anosProjecao}</h5>
                  <div className="display-4">
                    R$ {dados[dados.length - 1]?.preco_medio.toFixed(2)}
                  </div>
                  <p className="text-muted mb-0">
                    Valor projetado
                  </p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="border rounded p-3 text-center">
                  <h5>Reajuste Médio Anual</h5>
                  <div className="display-4 text-primary">
                    {dadosProjetados.reduce((acc, item) => acc + item.variacao_percentual, 0) / dadosProjetados.length}%
                  </div>
                  <p className="text-muted mb-0">
                    Média dos próximos {anosProjecao} anos
                  </p>
                </div>
              </div>
            </div>
            
            <div style={{ height: '400px' }}>
              <Line options={chartOptions} data={chartData} />
            </div>
          </Card.Body>
        </Card>
        
        <h5>Dados Detalhados</h5>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Ano</th>
              <th>Preço Médio (R$)</th>
              <th>Variação Anual (%)</th>
              <th>Impacto Acumulado (%)</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((item, index) => (
              <tr key={index} className={item.projetado ? 'table-warning' : ''}>
                <td>{item.ano}</td>
                <td>R$ {item.preco_medio.toFixed(2)}</td>
                <td>{item.variacao_percentual.toFixed(2)}%</td>
                <td>{item.impacto_acumulado.toFixed(2)}%</td>
                <td>
                  {item.projetado ? (
                    <span className="badge bg-warning text-dark">Projetado</span>
                  ) : (
                    <span className="badge bg-secondary">Histórico</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

export default ProjecaoImpactoAnalise;
