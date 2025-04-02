import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Alert, Spinner, Button, Modal, Form } from 'react-bootstrap';
import { Line, Bar } from 'react-chartjs-2';
import { supabase } from '../supabaseClient';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import StatsSummary from '../components/dashboard/StatsSummary';
import { Box, Typography, Divider, Paper } from '@mui/material';
import { BarChart as BarChartIcon } from '@mui/icons-material';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const DashboardPage = () => {
  const [reajustes, setReajustes] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    ano: new Date().getFullYear(),
    percentual: '',
    data_vigencia: '',
    fonte: '',
    ipca_ano: '',
    variacao_dolar: '',
    observacoes: '',
    estimativa: false
  });
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  // Carregar dados de reajustes e estatísticas
  useEffect(() => {
    fetchReajustes();
    fetchEstatisticas();
  }, []);

  // Buscar dados de reajustes
  const fetchReajustes = async () => {
    try {
      const { data, error } = await supabase
        .from('reajustes_anuais')
        .select('*')
        .order('ano', { ascending: true });

      if (error) throw error;
      setReajustes(data || []);
    } catch (error) {
      console.error('Erro ao buscar reajustes:', error);
      setError('Não foi possível carregar os dados de reajustes anuais.');
    } finally {
      setLoading(false);
    }
  };

  // Buscar estatísticas calculadas
  const fetchEstatisticas = async () => {
    try {
      const { data, error } = await supabase
        .rpc('calcular_estatisticas_reajustes');

      if (error) throw error;
      setEstatisticas(data?.[0] || null);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  // Configuração do gráfico de linha
  const lineChartData = {
    labels: reajustes.map(item => item.ano.toString()),
    datasets: [
      {
        label: 'Percentual de Reajuste (%)',
        data: reajustes.map(item => item.percentual),
        fill: false,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.1,
        pointBackgroundColor: reajustes.map(item => 
          item.estimativa ? 'rgba(255, 206, 86, 1)' : 'rgba(75, 192, 192, 1)'
        ),
        pointBorderColor: reajustes.map(item => 
          item.estimativa ? 'rgba(255, 206, 86, 1)' : 'rgba(75, 192, 192, 1)'
        ),
        pointRadius: reajustes.map(item => item.estimativa ? 6 : 4),
        pointHoverRadius: reajustes.map(item => item.estimativa ? 8 : 6),
      }
    ]
  };

  // Configuração do gráfico de barras
  const barChartData = {
    labels: reajustes.map(item => item.ano.toString()),
    datasets: [
      {
        label: 'Percentual de Reajuste (%)',
        data: reajustes.map(item => item.percentual),
        backgroundColor: reajustes.map(item => 
          item.estimativa ? 'rgba(255, 206, 86, 0.6)' : 'rgba(54, 162, 235, 0.6)'
        ),
        borderColor: reajustes.map(item => 
          item.estimativa ? 'rgba(255, 206, 86, 1)' : 'rgba(54, 162, 235, 1)'
        ),
        borderWidth: 1,
      },
    ],
  };

  // Opções comuns para os gráficos
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Histórico de Reajustes CMED',
      },
      tooltip: {
        callbacks: {
          afterLabel: function(context) {
            const index = context.dataIndex;
            const item = reajustes[index];
            if (item.estimativa) {
              return '(valor estimado)';
            }
            return '';
          }
        }
      }
    },
  };

  // Abrir modal para adicionar ou editar
  const handleOpenModal = (reajuste = null) => {
    if (reajuste) {
      setFormData({
        ano: reajuste.ano,
        percentual: reajuste.percentual,
        data_vigencia: reajuste.data_vigencia || '',
        fonte: reajuste.fonte || '',
        ipca_ano: reajuste.ipca_ano || '',
        variacao_dolar: reajuste.variacao_dolar || '',
        observacoes: reajuste.observacoes || '',
        estimativa: reajuste.estimativa || false
      });
      setEditMode(true);
      setEditId(reajuste.id);
    } else {
      // Valor padrão para novo registro
      setFormData({
        ano: new Date().getFullYear() + 1,
        percentual: '',
        data_vigencia: '',
        fonte: '',
        ipca_ano: '',
        variacao_dolar: '',
        observacoes: '',
        estimativa: true
      });
      setEditMode(false);
      setEditId(null);
    }
    setShowModal(true);
  };

  // Fechar modal
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Atualizar estado do form
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Enviar formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const reajusteData = {
        ano: parseInt(formData.ano),
        percentual: parseFloat(formData.percentual),
        data_vigencia: formData.data_vigencia || null,
        fonte: formData.fonte || null,
        ipca_ano: formData.ipca_ano ? parseFloat(formData.ipca_ano) : null,
        variacao_dolar: formData.variacao_dolar ? parseFloat(formData.variacao_dolar) : null,
        observacoes: formData.observacoes || null,
        estimativa: formData.estimativa
      };

      let response;
      
      if (editMode) {
        response = await supabase
          .from('reajustes_anuais')
          .update(reajusteData)
          .eq('id', editId);
      } else {
        response = await supabase
          .from('reajustes_anuais')
          .insert([reajusteData]);
      }

      if (response.error) throw response.error;
      
      // Recarregar dados
      fetchReajustes();
      fetchEstatisticas();
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar reajuste:', error);
      setError('Não foi possível salvar os dados de reajuste.');
    }
  };

  // Excluir reajuste
  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este registro?')) {
      try {
        const { error } = await supabase
          .from('reajustes_anuais')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        // Recarregar dados
        fetchReajustes();
        fetchEstatisticas();
      } catch (error) {
        console.error('Erro ao excluir reajuste:', error);
        setError('Não foi possível excluir o registro.');
      }
    }
  };

  // Formatar percentual
  const formatPercentual = (value) => {
    return value.toFixed(2).replace('.', ',') + '%';
  };

  // Gerar estimativa automaticamente
  const handleGerarEstimativa = async () => {
    try {
      // Verificar o próximo ano
      const proximoAno = Math.max(...reajustes.map(r => r.ano)) + 1;
      
      // Chamar a função SQL para estimar
      const { data, error } = await supabase
        .rpc('aplicar_estimativa_reajuste', { ano_alvo: proximoAno });

      if (error) throw error;
      
      // Recarregar dados
      fetchReajustes();
      fetchEstatisticas();
      
      // Mostrar mensagem de sucesso
      setError(null);
      alert(`Estimativa gerada com sucesso para o ano ${proximoAno}`);
    } catch (error) {
      console.error('Erro ao gerar estimativa:', error);
      setError('Não foi possível gerar a estimativa de reajuste.');
    }
  };

  return (
    <Container fluid className="py-3">
      {/* Seção de Estatísticas do Sistema */}
      <StatsSummary />
      
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
            <BarChartIcon sx={{ mr: 1 }} />
            Histórico de Reajustes CMED
          </Typography>
          <Button 
            variant="primary" 
            onClick={() => handleOpenModal()}
            className="rounded-pill"
          >
            Adicionar Reajuste
          </Button>
        </Box>
        
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          {loading ? (
            <div className="text-center my-4">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Carregando...</span>
              </Spinner>
            </div>
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : (
            <>
              {/* Estatísticas de Reajustes */}
              {estatisticas && (
                <Row className="mb-4">
                  <Col md={3}>
                    <Card className="h-100 shadow-sm">
                      <Card.Body className="text-center">
                        <Card.Title>Média de Reajuste</Card.Title>
                        <h3 className="text-primary">{estatisticas.media_reajuste?.toFixed(2)}%</h3>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="h-100 shadow-sm">
                      <Card.Body className="text-center">
                        <Card.Title>Maior Reajuste</Card.Title>
                        <h3 className="text-danger">{estatisticas.maior_reajuste?.toFixed(2)}%</h3>
                        <small className="text-muted">Ano: {estatisticas.ano_maior_reajuste}</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="h-100 shadow-sm">
                      <Card.Body className="text-center">
                        <Card.Title>Menor Reajuste</Card.Title>
                        <h3 className="text-success">{estatisticas.menor_reajuste?.toFixed(2)}%</h3>
                        <small className="text-muted">Ano: {estatisticas.ano_menor_reajuste}</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="h-100 shadow-sm">
                      <Card.Body className="text-center">
                        <Card.Title>Total de Registros</Card.Title>
                        <h3 className="text-info">{estatisticas.total_registros}</h3>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}

              {/* Gráficos */}
              <Row className="mb-4">
                <Col md={6}>
                  <Card className="shadow-sm">
                    <Card.Body>
                      <Line data={lineChartData} options={chartOptions} />
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="shadow-sm">
                    <Card.Body>
                      <Bar data={barChartData} options={chartOptions} />
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Tabela de Reajustes */}
              <Card className="shadow-sm">
                <Card.Body>
                  <Card.Title>Histórico de Reajustes</Card.Title>
                  <div className="table-responsive">
                    <Table striped hover>
                      <thead>
                        <tr>
                          <th>Ano</th>
                          <th>Percentual</th>
                          <th>Data de Vigência</th>
                          <th>Fonte</th>
                          <th>IPCA do Ano</th>
                          <th>Variação Dólar</th>
                          <th>Observações</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reajustes.map(reajuste => (
                          <tr key={reajuste.id} className={reajuste.estimativa ? 'table-warning' : ''}>
                            <td>{reajuste.ano}</td>
                            <td>
                              {reajuste.percentual}%
                              {reajuste.estimativa && <span className="badge bg-warning text-dark ms-2">Estimativa</span>}
                            </td>
                            <td>{reajuste.data_vigencia || '-'}</td>
                            <td>{reajuste.fonte || '-'}</td>
                            <td>{reajuste.ipca_ano ? `${reajuste.ipca_ano}%` : '-'}</td>
                            <td>{reajuste.variacao_dolar ? `${reajuste.variacao_dolar}%` : '-'}</td>
                            <td>{reajuste.observacoes || '-'}</td>
                            <td>
                              <Button 
                                variant="outline-primary" 
                                size="sm" 
                                className="me-1"
                                onClick={() => handleOpenModal(reajuste)}
                              >
                                Editar
                              </Button>
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={() => handleDelete(reajuste.id)}
                              >
                                Excluir
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </>
          )}
        </Paper>
      </Box>

      {/* Modal para adicionar/editar reajuste */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editMode ? 'Editar Reajuste' : 'Adicionar Novo Reajuste'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Ano</Form.Label>
                  <Form.Control 
                    type="number" 
                    name="ano" 
                    value={formData.ano} 
                    onChange={handleInputChange} 
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Percentual de Reajuste (%)</Form.Label>
                  <Form.Control 
                    type="number" 
                    step="0.01" 
                    name="percentual" 
                    value={formData.percentual} 
                    onChange={handleInputChange} 
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Data de Vigência</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="data_vigencia" 
                    value={formData.data_vigencia} 
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fonte</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="fonte" 
                    value={formData.fonte} 
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>IPCA do Ano (%)</Form.Label>
                  <Form.Control 
                    type="number" 
                    step="0.01" 
                    name="ipca_ano" 
                    value={formData.ipca_ano} 
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Variação do Dólar (%)</Form.Label>
                  <Form.Control 
                    type="number" 
                    step="0.01" 
                    name="variacao_dolar" 
                    value={formData.variacao_dolar} 
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Observações</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                name="observacoes" 
                value={formData.observacoes} 
                onChange={handleInputChange}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Check 
                type="checkbox" 
                label="Este é um valor estimado (não oficial)" 
                name="estimativa" 
                checked={formData.estimativa} 
                onChange={handleInputChange}
              />
            </Form.Group>
            
            <div className="d-flex justify-content-end">
              <Button variant="secondary" className="me-2" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                {editMode ? 'Atualizar' : 'Adicionar'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default DashboardPage;
