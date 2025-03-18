import React, { useState, useEffect, useCallback } from 'react';
import { Table, Spinner, Alert, Form, InputGroup, Button, Pagination } from 'react-bootstrap';
import supabase from '../services/supabaseClient';

const ListPage = () => {
  const [medicamentos, setMedicamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  const fetchMedicamentos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Calcular a partir de qual registro começar
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      // Obter contagem total
      const { count } = await supabase
        .from('medicamentos')
        .select('*', { count: 'exact', head: true });
      
      setTotalCount(count || 0);

      // Consulta principal com paginação
      let query = supabase
        .from('medicamentos')
        .select('*')
        .range(from, to);

      // Adicionar filtro de pesquisa se necessário
      if (searchTerm) {
        query = query.or(`substancia.ilike.%${searchTerm}%,produto.ilike.%${searchTerm}%,laboratorio.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setMedicamentos(data || []);
    } catch (err) {
      console.error('Erro ao buscar medicamentos:', err);
      setError('Não foi possível carregar os medicamentos. Verifique a conexão com o Supabase.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, itemsPerPage]);

  useEffect(() => {
    fetchMedicamentos();
  }, [currentPage, searchTerm, fetchMedicamentos]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchMedicamentos();
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Calcular total de páginas
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Renderizar paginação
  const renderPagination = () => {
    const items = [];
    const maxPageItems = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPageItems / 2));
    let endPage = Math.min(totalPages, startPage + maxPageItems - 1);
    
    if (endPage - startPage + 1 < maxPageItems) {
      startPage = Math.max(1, endPage - maxPageItems + 1);
    }

    items.push(
      <Pagination.Prev 
        key="prev" 
        disabled={currentPage === 1}
        onClick={() => handlePageChange(currentPage - 1)}
      />
    );

    if (startPage > 1) {
      items.push(
        <Pagination.Item key={1} onClick={() => handlePageChange(1)}>
          1
        </Pagination.Item>
      );
      if (startPage > 2) {
        items.push(<Pagination.Ellipsis key="ellipsis1" />);
      }
    }

    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <Pagination.Item 
          key={page} 
          active={page === currentPage}
          onClick={() => handlePageChange(page)}
        >
          {page}
        </Pagination.Item>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<Pagination.Ellipsis key="ellipsis2" />);
      }
      items.push(
        <Pagination.Item 
          key={totalPages} 
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }

    items.push(
      <Pagination.Next 
        key="next" 
        disabled={currentPage === totalPages}
        onClick={() => handlePageChange(currentPage + 1)}
      />
    );

    return <Pagination>{items}</Pagination>;
  };

  return (
    <div>
      <h2 className="mb-4">Listar Medicamentos</h2>
      
      <Form onSubmit={handleSearch} className="mb-4">
        <InputGroup>
          <Form.Control
            placeholder="Buscar por substância, produto ou laboratório"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button variant="primary" type="submit">
            Buscar
          </Button>
          {searchTerm && (
            <Button 
              variant="outline-secondary" 
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
                setTimeout(fetchMedicamentos, 0);
              }}
            >
              Limpar
            </Button>
          )}
        </InputGroup>
      </Form>

      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
          <p className="mt-2">Carregando medicamentos...</p>
        </div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : medicamentos.length > 0 ? (
        <>
          <div className="mb-3">
            <small className="text-muted">
              Mostrando {medicamentos.length} de {totalCount} medicamentos
            </small>
          </div>
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Substância</th>
                  <th>Laboratório</th>
                  <th>Produto</th>
                  <th>Apresentação</th>
                  <th>PF sem Impostos</th>
                  <th>Data Publicação</th>
                </tr>
              </thead>
              <tbody>
                {medicamentos.map((med) => (
                  <tr key={med.id}>
                    <td>{med.id}</td>
                    <td>{med.substancia}</td>
                    <td>{med.laboratorio}</td>
                    <td>{med.produto}</td>
                    <td>{med.apresentacao}</td>
                    <td>
                      {med.pf_sem_impostos 
                        ? `R$ ${Number(med.pf_sem_impostos).toFixed(2)}`.replace('.', ',')
                        : '-'}
                    </td>
                    <td>
                      {med.data_publicacao 
                        ? new Date(med.data_publicacao).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          
          <div className="d-flex justify-content-center mt-4">
            {renderPagination()}
          </div>
        </>
      ) : (
        <Alert variant="info">
          Nenhum medicamento encontrado{searchTerm ? ` para a busca "${searchTerm}"` : ''}.
        </Alert>
      )}
    </div>
  );
};

export default ListPage;
