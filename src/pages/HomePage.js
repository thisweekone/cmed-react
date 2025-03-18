import React from 'react';
import { Card, Button, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div>
      <div className="jumbotron bg-light p-5 rounded mb-4">
        <h1 className="display-4">Sistema de Importação CMED</h1>
        <p className="lead">
          Bem-vindo ao sistema de importação e visualização de dados da tabela de medicamentos da CMED.
          Este sistema permite importar arquivos CSV, XLS e XLSX, validar os dados e armazená-los no Supabase.
        </p>
        <hr className="my-4" />
        <p>
          Utilize as opções abaixo para navegar pelo sistema.
        </p>
        <Link to="/import">
          <Button variant="primary">Importar Dados</Button>
        </Link>
      </div>

      <Row className="mt-4">
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>Importação de Dados</Card.Header>
            <Card.Body>
              <Card.Title>Importe Dados da CMED</Card.Title>
              <Card.Text>
                Carregue arquivos CSV, XLS ou XLSX com dados da tabela CMED.
                O sistema irá mapear as colunas automaticamente e validar os dados.
              </Card.Text>
              <Link to="/import">
                <Button variant="outline-primary">Ir para Importação</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>Listar Medicamentos</Card.Header>
            <Card.Body>
              <Card.Title>Visualize os Dados Importados</Card.Title>
              <Card.Text>
                Consulte os medicamentos cadastrados no banco de dados Supabase.
                Visualize informações detalhadas sobre cada medicamento.
              </Card.Text>
              <Link to="/list">
                <Button variant="outline-primary">Listar Medicamentos</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HomePage;
