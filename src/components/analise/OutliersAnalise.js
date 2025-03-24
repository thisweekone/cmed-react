import React, { useState, useEffect } from 'react';
import { Table, Form, Alert, Spinner, Card, Badge } from 'react-bootstrap';
import { Scatter } from 'react-chartjs-2';
import { supabase } from '../../supabaseClient';

function OutliersAnalise({ anoInicio, anoFim }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dados, setDados] = useState([]);
  const [anoSelecionado, setAnoSelecionado] = useState(null);
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [tipoOutlier, setTipoOutlier] = useState('ambos');
  
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
  }, [anoSelecionado, tipoOutlier]);
  
  const fetchAnalise = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Chamando função analise_outliers com parâmetros:", {
        ano_referencia: anoSelecionado,
        tipo: tipoOutlier
      });
      
      const { data, error } = await supabase
        .rpc('analise_outliers', {
          ano_referencia: anoSelecionado,
          tipo: tipoOutlier
        });
        
      if (error) {
        console.error("Erro na função analise_outliers:", error);
        throw error;
      }
      
      console.log("Dados recebidos:", data);
      
      if (data && data.length > 0) {
        // Normalizar os dados para garantir que temos valores válidos
        const dadosNormalizados = data.map(item => ({
          id: item.id,
          produto: item.produto || '',
          tipo_outlier: item.tipo_outlier || 'normal',
          variacao_percentual: typeof item.variacao_percentual === 'number' ? item.variacao_percentual : 0,
          pf_sem_impostos_anterior: typeof item.pf_sem_impostos_anterior === 'number' ? item.pf_sem_impostos_anterior : 0,
          pf_sem_impostos_atual: typeof item.pf_sem_impostos_atual === 'number' ? item.pf_sem_impostos_atual : 0,
          reajuste_cmed: typeof item.reajuste_cmed === 'number' ? item.reajuste_cmed : 0,
          diferenca: typeof item.diferenca === 'number' ? item.diferenca : 0,
          apresentacao: item.apresentacao || '',
          laboratorio: item.laboratorio || '',
          classe_terapeutica: item.classe_terapeutica || ''
        }));
        
        console.log("Dados normalizados:", dadosNormalizados);
        setDados(dadosNormalizados);
      } else {
        setDados([]);
      }
    } catch (err) {
      console.error('Erro ao buscar análise de outliers:', err);
      setError(`Não foi possível carregar os dados de análise de outliers. Erro: ${err.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Dados para o gráfico de dispersão
  const dadosPositivos = dados.filter(item => item.tipo_outlier === 'positivo');
  const dadosNegativos = dados.filter(item => item.tipo_outlier === 'negativo');
  const dadosNormais = dados.filter(item => item.tipo_outlier === 'normal');
  
  // Configuração do gráfico
  const chartData = {
    datasets: [
      {
        label: 'Outliers Positivos',
        data: dadosPositivos.map(item => ({
          x: item.pf_sem_impostos_anterior,
          y: item.variacao_percentual
        })),
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: 'Outliers Negativos',
        data: dadosNegativos.map(item => ({
          x: item.pf_sem_impostos_anterior,
          y: item.variacao_percentual
        })),
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: 'Medicamentos Normais',
        data: dadosNormais.map(item => ({
          x: item.pf_sem_impostos_anterior,
          y: item.variacao_percentual
        })),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            const dataIndex = context.dataIndex;
            const datasetIndex = context.datasetIndex;
            const data = context.chart.data.datasets[datasetIndex].data[dataIndex];
            
            // Encontrar o item de dados correspondente
            let dadosSet;
            if (datasetIndex === 0) dadosSet = dadosPositivos;
            else if (datasetIndex === 1) dadosSet = dadosNegativos;
            else dadosSet = dadosNormais;
            
            const medicamento = dadosSet[dataIndex];
            
            return [
              `${medicamento.produto}: ${medicamento.apresentacao}`,
              `Preço Anterior: R$ ${medicamento.pf_sem_impostos_anterior.toFixed(2)}`,
              `Variação: ${medicamento.variacao_percentual.toFixed(2)}%`,
              `Reajuste CMED: ${medicamento.reajuste_cmed.toFixed(2)}%`,
              `Diferença: ${medicamento.diferenca > 0 ? '+' : ''}${medicamento.diferenca.toFixed(2)}%`
            ];
          }
        }
      },
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Outliers em Ajustes de Preço (${anoSelecionado})`,
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Preço Anterior (R$)'
        },
        type: 'linear',
        position: 'bottom'
      },
      y: {
        title: {
          display: true,
          text: 'Variação Percentual (%)'
        }
      }
    }
  };
  
  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
        <p className="mt-2">Carregando análise de outliers...</p>
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
        Não há dados suficientes para análise de outliers no ano selecionado.
      </Alert>
    );
  }
  
  return (
    <div>
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4>Análise de Outliers</h4>
          <div className="d-flex">
            <div className="me-3">
              <label htmlFor="anoSelecionado" className="me-2">Ano:</label>
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
            <div>
              <label htmlFor="tipoOutlier" className="me-2">Tipo:</label>
              <Form.Select 
                id="tipoOutlier" 
                className="d-inline-block" 
                style={{ width: 'auto' }}
                value={tipoOutlier}
                onChange={(e) => setTipoOutlier(e.target.value)}
              >
                <option value="ambos">Todos os Outliers</option>
                <option value="positivo">Apenas Positivos</option>
                <option value="negativo">Apenas Negativos</option>
              </Form.Select>
            </div>
          </div>
        </div>
        
        <Card className="mb-4">
          <Card.Body>
            <div className="row mb-3">
              <div className="col-md-4">
                <div className="border rounded p-3 text-center">
                  <h5>Total de Outliers</h5>
                  <div className="display-4">
                    {dadosPositivos.length + dadosNegativos.length}
                  </div>
                  <p className="text-muted mb-0">
                    de um total de {dadosPositivos.length + dadosNegativos.length + dadosNormais.length} medicamentos
                  </p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="border rounded p-3 text-center">
                  <h5>Outliers Positivos</h5>
                  <div className="display-4 text-danger">
                    {dadosPositivos.length}
                  </div>
                  <p className="text-muted mb-0">
                    Variação acima do normal
                  </p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="border rounded p-3 text-center">
                  <h5>Outliers Negativos</h5>
                  <div className="display-4 text-primary">
                    {dadosNegativos.length}
                  </div>
                  <p className="text-muted mb-0">
                    Variação abaixo do normal
                  </p>
                </div>
              </div>
            </div>
            
            <div style={{ height: '400px' }}>
              <Scatter options={chartOptions} data={chartData} />
            </div>
          </Card.Body>
        </Card>
        
        <h5>Lista de Outliers</h5>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Laboratório</th>
              <th>Tipo</th>
              <th>Preço Anterior (R$)</th>
              <th>Preço Atual (R$)</th>
              <th>Variação (%)</th>
              <th>Reajuste CMED (%)</th>
              <th>Diferença (%)</th>
            </tr>
          </thead>
          <tbody>
            {dados
              .filter(item => item.tipo_outlier !== 'normal')
              .map((item, index) => (
                <tr key={index}>
                  <td>
                    <strong>{item.produto}</strong>
                    <br />
                    <small>{item.apresentacao}</small>
                  </td>
                  <td>{item.laboratorio}</td>
                  <td>
                    {item.tipo_outlier === 'positivo' ? (
                      <Badge bg="danger">Positivo</Badge>
                    ) : (
                      <Badge bg="primary">Negativo</Badge>
                    )}
                  </td>
                  <td>R$ {item.pf_sem_impostos_anterior.toFixed(2)}</td>
                  <td>R$ {item.pf_sem_impostos_atual.toFixed(2)}</td>
                  <td>{item.variacao_percentual.toFixed(2)}%</td>
                  <td>{item.reajuste_cmed.toFixed(2)}%</td>
                  <td>
                    <span style={{ 
                      color: item.diferenca > 0 ? 'red' : 'blue' 
                    }}>
                      {item.diferenca > 0 ? '+' : ''}{item.diferenca.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

export default OutliersAnalise;
