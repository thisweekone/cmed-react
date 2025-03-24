import React, { useState, useEffect } from 'react';
import { Table, Alert, Spinner, Card } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import { supabase } from '../../supabaseClient';

function ImpactoCambialAnalise({ anoInicio, anoFim }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dados, setDados] = useState([]);
  
  useEffect(() => {
    if (anoInicio && anoFim) {
      fetchAnalise();
    }
  }, [anoInicio, anoFim]);
  
  const fetchAnalise = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Chamando função analise_impacto_cambial com parâmetros:", {
        ano_inicio: anoInicio,
        ano_fim: anoFim
      });
      
      const { data, error } = await supabase
        .rpc('analise_impacto_cambial', {
          ano_inicio: anoInicio,
          ano_fim: anoFim
        });
        
      if (error) {
        console.error("Erro na função analise_impacto_cambial:", error);
        throw error;
      }
      
      console.log("Dados recebidos:", data);
      
      if (data && data.length > 0) {
        // Normalizar os dados para garantir que temos valores válidos
        const dadosNormalizados = data.map(item => ({
          ano: typeof item.ano === 'object' ? parseInt(item.ano.ano || 0) : parseInt(item.ano || 0),
          variacao_preco_media: typeof item.variacao_preco_media === 'number' ? item.variacao_preco_media : 0,
          variacao_dolar: typeof item.variacao_dolar === 'number' ? item.variacao_dolar : 0,
          reajuste_cmed: typeof item.reajuste_cmed === 'number' ? item.reajuste_cmed : 0,
          correlacao_cambio_preco: typeof item.correlacao_cambio_preco === 'number' ? item.correlacao_cambio_preco : 0
        }));
        
        console.log("Dados normalizados:", dadosNormalizados);
        setDados(dadosNormalizados);
      } else {
        setDados([]);
      }
    } catch (err) {
      console.error('Erro ao buscar análise de impacto cambial:', err);
      setError(`Não foi possível carregar os dados de análise de impacto cambial. Erro: ${err.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Configuração do gráfico
  const chartData = {
    labels: dados.map(item => item.ano),
    datasets: [
      {
        label: 'Variação Média de Preço (%)',
        data: dados.map(item => item.variacao_preco_media),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        yAxisID: 'y',
      },
      {
        label: 'Variação do Dólar (%)',
        data: dados.map(item => item.variacao_dolar),
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
        borderDash: [5, 5],
        yAxisID: 'y',
      },
      {
        label: 'Reajuste CMED (%)',
        data: dados.map(item => item.reajuste_cmed),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
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
        text: 'Correlação: Variação Cambial vs. Preço dos Medicamentos',
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
  
  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
        <p className="mt-2">Carregando análise de impacto cambial...</p>
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
        Não há dados suficientes para análise de impacto cambial no período selecionado.
      </Alert>
    );
  }
  
  // Calcular a correlação média para resumo
  const correlacaoMedia = dados.reduce((acc, item) => acc + item.correlacao_cambio_preco, 0) / dados.length;
  
  return (
    <div>
      <div className="mb-4">
        <Card className="mb-4">
          <Card.Body>
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5>Correlação média: {correlacaoMedia.toFixed(2)}</h5>
                <div className="px-3 py-2 rounded" style={{ 
                  backgroundColor: correlacaoMedia > 0.7 ? '#d4edda' : 
                                  correlacaoMedia > 0.3 ? '#fff3cd' : '#f8d7da' 
                }}>
                  <strong>Influência cambial: </strong>
                  {correlacaoMedia > 0.7 ? 'Alta' : correlacaoMedia > 0.3 ? 'Média' : 'Baixa'}
                </div>
              </div>
              <p className="text-muted mt-2">
                {correlacaoMedia > 0.7 
                  ? 'Os preços dos medicamentos têm forte correlação com as variações cambiais.' 
                  : correlacaoMedia > 0.3 
                    ? 'Os preços dos medicamentos têm correlação moderada com as variações cambiais.' 
                    : 'Os preços dos medicamentos têm baixa correlação com as variações cambiais.'}
              </p>
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
              <th>Variação Média de Preço (%)</th>
              <th>Variação do Dólar (%)</th>
              <th>Reajuste CMED (%)</th>
              <th>Correlação</th>
              <th>Influência Cambial</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((item, index) => {
              // Determinar nível de influência cambial
              let influencia, badgeClass;
              if (item.correlacao_cambio_preco > 0.7) {
                influencia = 'Alta';
                badgeClass = 'bg-success';
              } else if (item.correlacao_cambio_preco > 0.3) {
                influencia = 'Média';
                badgeClass = 'bg-warning text-dark';
              } else {
                influencia = 'Baixa';
                badgeClass = 'bg-danger';
              }
              
              return (
                <tr key={index}>
                  <td>{item.ano}</td>
                  <td>{item.variacao_preco_media.toFixed(2)}%</td>
                  <td>{item.variacao_dolar.toFixed(2)}%</td>
                  <td>{item.reajuste_cmed.toFixed(2)}%</td>
                  <td>{item.correlacao_cambio_preco.toFixed(2)}</td>
                  <td>
                    <span className={`badge ${badgeClass}`}>{influencia}</span>
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

export default ImpactoCambialAnalise;
