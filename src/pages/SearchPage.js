import React, { useState, useEffect } from 'react';
import { Container, Form, Row, Col, Table, Button, Card } from 'react-bootstrap';
import { supabase } from '../supabaseClient';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('laboratorio');
  const [medicamentos, setMedicamentos] = useState([]);
  const [selectedMedicamentos, setSelectedMedicamentos] = useState([]);
  const [historicoPrecos, setHistoricoPrecos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Função para buscar medicamentos
  const buscarMedicamentos = async () => {
    if (!searchTerm) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('medicamentos_base')
        .select('*')
        .order('substancia');

      if (searchType === 'laboratorio') {
        query = query.ilike('laboratorio', `%${searchTerm}%`);
      } else {
        query = query.ilike('substancia', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setMedicamentos(data || []);
    } catch (error) {
      console.error('Erro ao buscar medicamentos:', error);
      alert('Erro ao buscar medicamentos');
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar histórico de preços dos medicamentos selecionados
  const buscarHistoricoPrecos = async () => {
    if (selectedMedicamentos.length === 0) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('precos_historico')
        .select('*')
        .in('hash_id', selectedMedicamentos.map(m => m.hash_id))
        .order('data_publicacao');

      if (error) throw error;
      setHistoricoPrecos(data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico de preços:', error);
      alert('Erro ao buscar histórico de preços');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar histórico quando medicamentos selecionados mudam
  useEffect(() => {
    buscarHistoricoPrecos();
  }, [selectedMedicamentos]);

  // Preparar dados para o gráfico
  const prepararDadosGrafico = () => {
    const datas = [...new Set(historicoPrecos.map(h => h.data_publicacao))].sort();
    
    const datasets = selectedMedicamentos.map(med => {
      const precos = datas.map(data => {
        const registro = historicoPrecos.find(h => 
          h.hash_id === med.hash_id && h.data_publicacao === data
        );
        return registro ? registro.pf_sem_impostos : null;
      });

      return {
        label: `${med.substancia} - ${med.laboratorio}`,
        data: precos,
        fill: false,
        borderColor: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        tension: 0.1
      };
    });

    return {
      labels: datas,
      datasets
    };
  };

  const toggleMedicamentoSelecionado = (medicamento) => {
    setSelectedMedicamentos(prev => {
      const isSelected = prev.some(m => m.hash_id === medicamento.hash_id);
      if (isSelected) {
        return prev.filter(m => m.hash_id !== medicamento.hash_id);
      } else {
        return [...prev, medicamento];
      }
    });
  };

  return (
    <Container fluid className="mt-4">
      <h2>Pesquisa de Medicamentos</h2>
      
      {/* Formulário de pesquisa */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Tipo de Pesquisa</Form.Label>
                <Form.Select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                >
                  <option value="laboratorio">Laboratório</option>
                  <option value="substancia">Substância</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Termo de Pesquisa</Form.Label>
                <Form.Control
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Digite o nome do ${searchType}`}
                />
              </Form.Group>
            </Col>
            <Col md={2} className="d-flex align-items-end">
              <Button 
                variant="primary" 
                onClick={buscarMedicamentos}
                disabled={loading}
                className="w-100"
              >
                Pesquisar
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tabela de resultados */}
      <Card className="mb-4">
        <Card.Body>
          <h4>Resultados da Pesquisa</h4>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Selecionar</th>
                <th>Substância</th>
                <th>Laboratório</th>
                <th>Apresentação</th>
                <th>Código GGREM</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              {medicamentos.map((med) => (
                <tr key={med.hash_id}>
                  <td>
                    <Form.Check
                      type="checkbox"
                      checked={selectedMedicamentos.some(m => m.hash_id === med.hash_id)}
                      onChange={() => toggleMedicamentoSelecionado(med)}
                    />
                  </td>
                  <td>{med.substancia}</td>
                  <td>{med.laboratorio}</td>
                  <td>{med.apresentacao}</td>
                  <td>{med.codigo_ggrem}</td>
                  <td>{med.registro}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Gráfico de histórico de preços */}
      {selectedMedicamentos.length > 0 && historicoPrecos.length > 0 && (
        <Card>
          <Card.Body>
            <h4>Histórico de Preços</h4>
            <Line
              data={prepararDadosGrafico()}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: true,
                    text: 'Evolução dos Preços'
                  }
                },
                scales: {
                  y: {
                    beginAtZero: false,
                    title: {
                      display: true,
                      text: 'Preço (R$)'
                    }
                  },
                  x: {
                    title: {
                      display: true,
                      text: 'Data de Publicação'
                    }
                  }
                }
              }}
            />
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default SearchPage;
