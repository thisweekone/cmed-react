import React, { useState, useEffect } from 'react';
import { Table, Form, Alert, Spinner, Card } from 'react-bootstrap';
import { Bar } from 'react-chartjs-2';
import { supabase } from '../../supabaseClient';

function ElasticidadeAnalise({ anoInicio, anoFim }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dados, setDados] = useState([]);
  const [anoSelecionado, setAnoSelecionado] = useState(null);
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  
  useEffect(() => {
    if (anoInicio && anoFim) {
      // Preparar array com anos disponíveis
      const anos = [];
      for (let i = anoInicio; i <= anoFim; i++) {
        anos.push(i);
      }
      setAnosDisponiveis(anos);
      
      // Selecionar o último ano por padrão
      setAnoSelecionado(anoFim);
    }
  }, [anoInicio, anoFim]);
  
  useEffect(() => {
    if (anoSelecionado) {
      fetchAnalise();
    }
  }, [anoSelecionado]);
  
  const fetchAnalise = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Chamando função analise_elasticidade_por_faixa com parâmetros:", {
        ano_referencia: anoSelecionado
      });
      
      const { data, error } = await supabase
        .rpc('analise_elasticidade_por_faixa', {
          ano_referencia: anoSelecionado
        });
        
      if (error) {
        console.error("Erro na função analise_elasticidade_por_faixa:", error);
        throw error;
      }
      
      console.log("Dados recebidos:", data);
      
      if (data && data.length > 0) {
        // Normalizar os dados para garantir que temos valores válidos
        const dadosNormalizados = data.map(item => ({
          faixa_preco: item.faixa_preco || 'Não classificado',
          variacao_media: typeof item.variacao_media === 'number' ? item.variacao_media : 0,
          reajuste_cmed: typeof item.reajuste_cmed === 'number' ? item.reajuste_cmed : 0,
          elasticidade: typeof item.elasticidade === 'number' ? item.elasticidade : 0,
          total_medicamentos: typeof item.total_medicamentos === 'number' ? item.total_medicamentos : 0
        }));
        
        console.log("Dados normalizados:", dadosNormalizados);
        setDados(dadosNormalizados);
      } else {
        setDados([]);
      }
    } catch (err) {
      console.error('Erro ao buscar análise de elasticidade:', err);
      setError(`Não foi possível carregar os dados de análise de elasticidade por faixa de preço. Erro: ${err.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Configuração do gráfico
  const chartData = {
    labels: dados.map(item => item.faixa_preco),
    datasets: [
      {
        label: 'Variação Média (%)',
        data: dados.map(item => item.variacao_media),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderColor: 'rgb(53, 162, 235)',
        borderWidth: 1,
      },
      {
        label: 'Reajuste CMED (%)',
        data: dados.map(item => dados[0]?.reajuste_cmed),
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgb(255, 99, 132)',
        borderWidth: 1,
        type: 'line'
      },
      {
        label: 'Elasticidade',
        data: dados.map(item => item.elasticidade * 5), // Multiplicar para visualização
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgb(75, 192, 192)',
        borderWidth: 1,
        yAxisID: 'y1',
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
        text: `Elasticidade por Faixa de Preço (${anoSelecionado})`,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (label.includes('Elasticidade')) {
                // Corrigir o valor da elasticidade (foi multiplicado por 5 para visualização)
                label += (context.parsed.y / 5).toFixed(2);
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
          text: 'Percentual (%)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Elasticidade'
        },
        grid: {
          drawOnChartArea: false
        },
        ticks: {
          callback: function(value) {
            return (value / 5).toFixed(2);
          }
        }
      }
    }
  };
  
  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
        <p className="mt-2">Carregando análise de elasticidade...</p>
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
  
  if (dados.length === 0 && !loading) {
    return (
      <Alert variant="info">
        Não há dados suficientes para análise de elasticidade no ano selecionado.
      </Alert>
    );
  }
  
  return (
    <div>
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4>Análise de Elasticidade</h4>
          <div>
            <label htmlFor="anoSelecionado" className="me-2">Ano de Referência:</label>
            <Form.Select 
              id="anoSelecionado" 
              className="d-inline-block" 
              style={{ width: 'auto' }}
              value={anoSelecionado || ''}
              onChange={(e) => setAnoSelecionado(parseInt(e.target.value))}
            >
              {anosDisponiveis.map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </Form.Select>
          </div>
        </div>
        
        <Alert variant="info">
          <p className="mb-0">
            <strong>Elasticidade</strong> mede quanto o preço de um medicamento varia em relação ao reajuste oficial. 
            Elasticidade = 1.0 significa que o preço variou exatamente como o reajuste CMED.
            Elasticidade &gt; 1.0 indica maior sensibilidade (variou mais que o reajuste). 
            Elasticidade &lt; 1.0 indica menor sensibilidade (variou menos que o reajuste).
          </p>
        </Alert>
        
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
              <th>Faixa de Preço</th>
              <th>Variação Média (%)</th>
              <th>Reajuste CMED (%)</th>
              <th>Diferença (%)</th>
              <th>Medicamentos</th>
              <th>Elasticidade</th>
              <th>Sensibilidade</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((item, index) => {
              // Determinar sensibilidade com base na elasticidade
              let sensibilidade, badgeClass;
              if (item.elasticidade > 1.2) {
                sensibilidade = 'Alta';
                badgeClass = 'bg-danger';
              } else if (item.elasticidade >= 0.8 && item.elasticidade <= 1.2) {
                sensibilidade = 'Normal';
                badgeClass = 'bg-success';
              } else {
                sensibilidade = 'Baixa';
                badgeClass = 'bg-primary';
              }
              
              return (
                <tr key={index}>
                  <td>{item.faixa_preco}</td>
                  <td>{item.variacao_media.toFixed(2)}%</td>
                  <td>{item.reajuste_cmed.toFixed(2)}%</td>
                  <td>
                    {item.diferenca > 0 ? '+' : ''}{item.diferenca.toFixed(2)}%
                  </td>
                  <td>{item.total_medicamentos}</td>
                  <td>{item.elasticidade.toFixed(2)}</td>
                  <td>
                    <span className={`badge ${badgeClass}`}>{sensibilidade}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

export default ElasticidadeAnalise;
