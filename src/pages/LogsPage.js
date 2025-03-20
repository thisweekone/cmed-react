import React, { useState, useEffect } from 'react';
import { Container, Table, Card, Alert, Spinner, Badge, Form, InputGroup, Pagination } from 'react-bootstrap';
import { supabase } from '../supabaseClient';
import { formatarDataBancoDados } from '../utils/DateUtils';

const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLogs, setFilteredLogs] = useState([]);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const recordsPerPage = 20;

  useEffect(() => {
    fetchImportLogs();
  }, []);

  useEffect(() => {
    if (logs.length > 0) {
      const filtered = logs.filter(log => 
        log.nome_arquivo.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLogs(filtered);
      setTotalPages(Math.ceil(filtered.length / recordsPerPage));
      setCurrentPage(1); // Voltar para a primeira página quando o filtro mudar
    }
  }, [searchTerm, logs]);

  const fetchImportLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('importacoes')
        .select('*')
        .order('data_importacao', { ascending: false });

      if (error) {
        throw error;
      }

      setLogs(data || []);
      setFilteredLogs(data || []);
      setTotalPages(Math.ceil((data || []).length / recordsPerPage));
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar logs de importação:', error);
      setError('Não foi possível carregar os logs de importação. Por favor, tente novamente mais tarde.');
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${formatarDataBancoDados(dateStr)} ${date.toLocaleTimeString('pt-BR')}`;
  };

  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case 'concluído':
      case 'concluido':
      case 'success':
        return <Badge bg="success">Concluído</Badge>;
      case 'erro':
      case 'error':
        return <Badge bg="danger">Erro</Badge>;
      case 'pendente':
      case 'pending':
        return <Badge bg="warning">Pendente</Badge>;
      case 'processando':
      case 'processing':
      case 'em_andamento':
        return <Badge bg="info">Processando</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };
  
  // Obter registros da página atual
  const getCurrentRecords = () => {
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    return filteredLogs.slice(indexOfFirstRecord, indexOfLastRecord);
  };
  
  // Renderizar componente de paginação
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    const pageItems = [];
    
    // Adicionar botão Anterior
    pageItems.push(
      <Pagination.Prev 
        key="prev" 
        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
      />
    );
    
    // Mostrar até 5 páginas + primeira e última
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    // Ajustar início se estiver perto do final
    if (endPage === totalPages) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    // Sempre mostrar primeira página
    if (startPage > 1) {
      pageItems.push(
        <Pagination.Item key={1} onClick={() => setCurrentPage(1)}>
          1
        </Pagination.Item>
      );
      
      // Mostrar ellipsis após a primeira se houver um gap
      if (startPage > 2) {
        pageItems.push(<Pagination.Ellipsis key="ellipsis1" disabled />);
      }
    }
    
    // Adicionar páginas intermediárias
    for (let i = startPage; i <= endPage; i++) {
      pageItems.push(
        <Pagination.Item 
          key={i} 
          active={i === currentPage}
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </Pagination.Item>
      );
    }
    
    // Sempre mostrar última página
    if (endPage < totalPages) {
      // Mostrar ellipsis antes da última se houver um gap
      if (endPage < totalPages - 1) {
        pageItems.push(<Pagination.Ellipsis key="ellipsis2" disabled />);
      }
      
      pageItems.push(
        <Pagination.Item 
          key={totalPages} 
          onClick={() => setCurrentPage(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }
    
    // Adicionar botão Próximo
    pageItems.push(
      <Pagination.Next 
        key="next" 
        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages}
      />
    );
    
    return (
      <Pagination className="justify-content-center mt-4 mb-5">
        {pageItems}
      </Pagination>
    );
  };

  return (
    <Container className="mt-4">
      <h2>Logs de Importação</h2>
      <p className="text-muted">
        Histórico de todos os arquivos importados para o sistema
      </p>

      {error && (
        <Alert variant="danger">
          {error}
        </Alert>
      )}

      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Filtrar Logs</Card.Title>
          <Form.Group>
            <InputGroup>
              <Form.Control
                type="text"
                placeholder="Buscar por nome do arquivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <InputGroup.Text>
                <i className="bi bi-search"></i>
              </InputGroup.Text>
            </InputGroup>
          </Form.Group>
        </Card.Body>
      </Card>

      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
          <p className="mt-2">Carregando logs de importação...</p>
        </div>
      ) : filteredLogs.length > 0 ? (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="text-muted">
              Mostrando {getCurrentRecords().length} de {filteredLogs.length} registros
            </span>
            <span className="text-muted">
              Página {currentPage} de {totalPages}
            </span>
          </div>
          
          <div className="table-responsive">
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nome do Arquivo</th>
                  <th>Data de Importação</th>
                  <th>Total de Registros</th>
                  <th>Importados</th>
                  <th>Com Erro</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentRecords().map((log, index) => (
                  <tr key={log.id}>
                    <td>{(currentPage - 1) * recordsPerPage + index + 1}</td>
                    <td>{log.nome_arquivo}</td>
                    <td>{formatDate(log.data_importacao)}</td>
                    <td>{log.total_registros}</td>
                    <td>{log.registros_importados}</td>
                    <td>{log.registros_com_erro}</td>
                    <td>{getStatusBadge(log.status)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          
          {renderPagination()}
        </>
      ) : (
        <Alert variant="info">
          {searchTerm ? 'Nenhum resultado encontrado para sua busca.' : 'Nenhum log de importação disponível.'}
        </Alert>
      )}
    </Container>
  );
};

export default LogsPage;
