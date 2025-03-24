import React, { useState, useEffect } from 'react';
import { Table, Alert, Spinner, Card, Button, Collapse } from 'react-bootstrap';
import { Bar } from 'react-chartjs-2';
import { supabase } from '../../supabaseClient';
import { Link } from 'react-router-dom';
import SqlErrorHelper from '../utils/SqlErrorHelper';

function GenericosReferenciasAnalise({ anoInicio, anoFim }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dados, setDados] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);

  useEffect(() => {
    if (anoInicio && anoFim) {
      fetchAnalise();
    }
  }, [anoInicio, anoFim]);

  const fetchAnalise = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      console.log("Chamando função analise_genericos_vs_referencia com parâmetros:", {
        ano_inicio: anoInicio,
        ano_fim: anoFim
      });

      const { data, error } = await supabase
        .rpc('analise_genericos_vs_referencia', {
          ano_inicio: anoInicio,
          ano_fim: anoFim
        });

      if (error) {
        console.error("Erro na função analise_genericos_vs_referencia:", error);
        setErrorDetails({
          message: error.message,
          hint: error.hint,
          details: error.details,
          possibleSolution: error.message.includes('column reference "tipo_de_produto" is ambiguous') ? 
            "Esta função precisa ser atualizada para especificar a tabela nas referências à coluna 'tipo_de_produto'" :
            "Verifique a definição da função SQL para identificar o problema"
        });
        throw error;
      }

      console.log("Dados recebidos:", data);

      if (data && data.length > 0) {
        // Normalizar os dados para garantir que temos valores válidos
        const dadosNormalizados = data.map(item => ({
          ano: typeof item.ano === 'object' ? parseInt(item.ano.ano || 0) : parseInt(item.ano || 0),
          tipo_de_produto: item.tipo_de_produto || 'Não classificado',
          variacao_media: typeof item.variacao_media === 'number' ? item.variacao_media : 0,
          reajuste_cmed: typeof item.reajuste_cmed === 'number' ? item.reajuste_cmed : 0,
          diferenca: typeof item.diferenca === 'number' ? item.diferenca : 0,
          total_medicamentos: typeof item.total_medicamentos === 'number' ? item.total_medicamentos : 0
        }));

        console.log("Dados normalizados:", dadosNormalizados);
        setDados(dadosNormalizados);
      } else {
        setDados([]);
      }
    } catch (err) {
      console.error('Erro ao buscar análise de genéricos vs referência:', err);
      setError(`Não foi possível carregar os dados de análise comparativa entre genéricos e medicamentos de referência. Erro: ${err.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Organizar dados para o gráfico
  const anos = [...new Set(dados.map(item => item.ano))];
  const tiposProduto = [...new Set(dados.map(item => item.tipo_de_produto))].filter(Boolean); // Remove valores null/undefined

  // Configuração do gráfico
  const chartData = {
    labels: anos,
    datasets: tiposProduto.map((tipo, index) => {
      const cor = tipo === 'GENÉRICO' 
        ? 'rgb(54, 162, 235)' 
        : tipo === 'REFERÊNCIA' 
          ? 'rgb(255, 99, 132)' 
          : 'rgb(255, 205, 86)';
      
      const dadosFiltrados = dados.filter(item => item.tipo_de_produto === tipo);
      
      return {
        label: tipo,
        data: anos.map(ano => {
          const item = dadosFiltrados.find(d => d.ano === ano);
          return item ? item.variacao_media : null;
        }),
        backgroundColor: cor.replace('rgb', 'rgba').replace(')', ', 0.5)'),
        borderColor: cor,
        borderWidth: 1
      };
    })
  };

  // Adicionar o dataset do reajuste CMED
  if (dados.length > 0) {
    chartData.datasets.push({
      label: 'Reajuste CMED',
      data: anos.map(ano => {
        const item = dados.find(d => d.ano === ano);
        return item ? item.reajuste_cmed : null;
      }),
      type: 'line',
      fill: false,
      borderColor: 'rgb(153, 102, 255)',
      backgroundColor: 'rgb(153, 102, 255)',
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 4
    });
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Comparação: Genéricos vs. Medicamentos de Referência',
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
        beginAtZero: false,
        title: {
          display: true,
          text: 'Variação de Preço (%)'
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
        <p className="mt-2">Carregando análise comparativa...</p>
      </div>
    );
  }

  if (error) {
    return (
      <SqlErrorHelper 
        error={error} 
        functionName="analise_genericos_vs_referencia" 
        additionalInfo={[
          "Esta função agrega dados de medicamentos genéricos e seus respectivos referências.",
          "Verifique se as tabelas e colunas utilizadas existem no banco de dados.",
          "Certifique-se de que todos os aliases em tabelas estão corretamente qualificados."
        ]}
      />
    );
  }

  if (dados.length === 0) {
    return (
      <Alert variant="info">
        Não há dados suficientes para análise comparativa entre genéricos e medicamentos de referência no período selecionado.
      </Alert>
    );
  }

  // Agrupar por tipo de produto e calcular médias
  const resumo = tiposProduto.map(tipo => {
    const itensFiltrados = dados.filter(item => item.tipo_de_produto === tipo);
    const mediaVariacao = itensFiltrados.reduce((acc, item) => acc + item.variacao_media, 0) / itensFiltrados.length;
    const mediaReajuste = itensFiltrados.reduce((acc, item) => acc + item.reajuste_cmed, 0) / itensFiltrados.length;
    const mediaDiferenca = itensFiltrados.reduce((acc, item) => acc + item.diferenca, 0) / itensFiltrados.length;

    return {
      tipo,
      mediaVariacao,
      mediaReajuste,
      mediaDiferenca
    };
  });

  return (
    <div>
      <div className="mb-4">
        <Card className="mb-4">
          <Card.Body>
            <div className="row mb-4">
              {resumo.map((item, index) => (
                <div className="col-md-4" key={index}>
                  <div className="border rounded p-3 h-100">
                    <h5>{item.tipo}</h5>
                    <hr />
                    <p>
                      <strong>Variação Média: </strong>
                      {item.mediaVariacao.toFixed(2)}%
                    </p>
                    <p>
                      <strong>Diferença do Reajuste: </strong>
                      <span style={{ 
                        color: item.mediaDiferenca > 0 ? 'red' : item.mediaDiferenca < 0 ? 'blue' : 'green' 
                      }}>
                        {item.mediaDiferenca > 0 ? '+' : ''}{item.mediaDiferenca.toFixed(2)}%
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

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
              <th>Tipo de Produto</th>
              <th>Variação Média (%)</th>
              <th>Reajuste CMED (%)</th>
              <th>Diferença (%)</th>
              <th>Total de Medicamentos</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((item, index) => {
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
                  <td>{item.tipo_de_produto}</td>
                  <td>{item.variacao_media.toFixed(2)}%</td>
                  <td>{item.reajuste_cmed.toFixed(2)}%</td>
                  <td>
                    <span style={{ 
                      color: item.diferenca > 0 ? 'red' : item.diferenca < 0 ? 'blue' : 'green' 
                    }}>
                      {item.diferenca > 0 ? '+' : ''}{item.diferenca.toFixed(2)}%
                    </span>
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
    </div>
  );
}

export default GenericosReferenciasAnalise;
