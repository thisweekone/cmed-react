import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Alert, Card, Table } from 'react-bootstrap';
import supabase from '../services/supabaseClient';

function TestDatePage() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('12:00');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateFormat, setDateFormat] = useState('iso'); // 'iso', 'br', 'us'
  const [testType, setTestType] = useState('function'); // 'function' ou 'database'
  const [testResults, setTestResults] = useState([]);

  const testDateConversion = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let dateToTest;
      
      // Formatar a data de acordo com a seleção
      if (dateFormat === 'iso') {
        // ISO formato: Já está no formato correto do input date (YYYY-MM-DD)
        dateToTest = `${date}T${time}:00`;
      } else if (dateFormat === 'br') {
        // Formato brasileiro: DD/MM/YYYY
        const [year, month, day] = date.split('-');
        dateToTest = `${day}/${month}/${year}`;
      } else if (dateFormat === 'us') {
        // Formato americano: MM/DD/YYYY
        const [year, month, day] = date.split('-');
        dateToTest = `${month}/${day}/${year}`;
      }

      console.log('Enviando data para teste:', dateToTest);
      
      let response;
      if (testType === 'function') {
        // Testa usando a função de conversão específica
        response = await supabase.rpc('test_date_conversion', {
          input_date: dateToTest
        });
      } else {
        // Testa uma inserção real no banco
        const medicamentoTeste = {
          substancia: 'TESTE',
          laboratorio: 'LABORATORIO DE TESTE',
          produto: 'PRODUTO DE TESTE',
          apresentacao: 'APRESENTACAO DE TESTE',
          codigo_ggrem: 'TESTE123',
          registro: 'REG123',
          ean_1: 'EAN123',
          classe_terapeutica: 'CLASSE TESTE',
          tipo_de_produto: 'TIPO TESTE',
          regime_de_preco: 'REGIME TESTE',
          data_publicacao: dateToTest,
          pf_sem_impostos: 10.0,
          importacao_id: 1
        };
        
        response = await supabase.rpc('upsert_medicamento_com_preco', medicamentoTeste);
      }

      if (response.error) throw response.error;
      
      // Adicionar resultado ao histórico
      const newResult = {
        dateInput: dateToTest,
        dateOutput: response.data,
        format: dateFormat,
        testType: testType,
        timestamp: new Date().toISOString()
      };
      
      setTestResults(prev => [newResult, ...prev].slice(0, 10)); // Manter apenas os últimos 10 testes
      setResult(response.data);
      console.log('Resultado do teste de data:', response.data);
    } catch (error) {
      console.error('Erro ao testar conversão de data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <h1 className="mb-4">Teste de Conversão de Data</h1>
      <p className="text-muted">
        Esta página permite testar como as datas são convertidas no Supabase.
      </p>
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          <Alert.Heading>Erro no teste</Alert.Heading>
          <p>{error}</p>
        </Alert>
      )}
      
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Body>
              <h4 className="mb-3">Selecione uma data para testar</h4>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Data</Form.Label>
                  <Form.Control
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Hora (opcional)</Form.Label>
                  <Form.Control
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                  <Form.Text className="text-muted">
                    Usada apenas para o formato ISO
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Formato da Data</Form.Label>
                  <Form.Select 
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                  >
                    <option value="iso">ISO (YYYY-MM-DD)</option>
                    <option value="br">Brasileiro (DD/MM/YYYY)</option>
                    <option value="us">Americano (MM/DD/YYYY)</option>
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Tipo de Teste</Form.Label>
                  <Form.Select 
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                  >
                    <option value="function">Função de Teste (test_date_conversion)</option>
                    <option value="database">Inserção Real (upsert_medicamento_com_preco)</option>
                  </Form.Select>
                </Form.Group>

                <Button 
                  variant="primary" 
                  onClick={testDateConversion}
                  disabled={isLoading || !date}
                >
                  {isLoading ? 'Testando...' : 'Testar Conversão'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card>
            <Card.Body>
              <h4 className="mb-3">Resultado</h4>
              
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Carregando...</span>
                  </div>
                  <p className="mt-2">Testando a conversão da data...</p>
                </div>
              ) : (
                result && (
                  <div>
                    <Alert variant="success">
                      <strong>Data após conversão: </strong> 
                      {result}
                    </Alert>
                    <p>
                      <strong>Formato de entrada: </strong>
                      {dateFormat === 'iso' ? 'ISO (YYYY-MM-DD)' : 
                       dateFormat === 'br' ? 'Brasileiro (DD/MM/YYYY)' : 
                       'Americano (MM/DD/YYYY)'}
                    </p>
                    <p>
                      <strong>Método de teste: </strong>
                      {testType === 'function' ? 'Função de Teste' : 'Inserção Real'}
                    </p>
                  </div>
                )
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {testResults.length > 0 && (
        <Card className="mb-4">
          <Card.Body>
            <h4 className="mb-3">Histórico de Testes</h4>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Data de Entrada</th>
                  <th>Formato</th>
                  <th>Tipo de Teste</th>
                  <th>Data Convertida</th>
                  <th>Horário do Teste</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((test, index) => (
                  <tr key={index}>
                    <td>{test.dateInput}</td>
                    <td>{test.format}</td>
                    <td>{test.testType === 'function' ? 'Função de Teste' : 'Inserção Real'}</td>
                    <td>{test.dateOutput}</td>
                    <td>{new Date(test.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}

export default TestDatePage;
