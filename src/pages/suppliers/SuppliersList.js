import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Table, 
  Button, 
  Form, 
  InputGroup, 
  Spinner, 
  Alert, 
  Badge
} from 'react-bootstrap';
import { 
  Search, 
  PlusCircle, 
  Pencil, 
  Trash, 
  Eye, 
  FileEarmarkMedical
} from 'react-bootstrap-icons';
import { supabase } from '../../supabaseClient';

const SuppliersList = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = suppliers.filter(supplier => 
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.cnpj && supplier.cnpj.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (supplier.main_email && supplier.main_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (supplier.main_phone && supplier.main_phone.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredSuppliers(filtered);
    } else {
      setFilteredSuppliers(suppliers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, suppliers]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      setSuppliers(data || []);
      setFilteredSuppliers(data || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
      setError('Não foi possível carregar a lista de fornecedores.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }
    
    try {
      setLoading(true);
      
      // Verificar se o fornecedor está sendo usado em orçamentos
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('id')
        .eq('supplier_id', id)
        .limit(1);
        
      if (quotesError) throw quotesError;
      
      if (quotes && quotes.length > 0) {
        setError('Este fornecedor não pode ser excluído pois está sendo usado em orçamentos.');
        setDeleteConfirm(null);
        return;
      }
      
      // Excluir contatos do fornecedor
      const { error: contactsError } = await supabase
        .from('supplier_contacts')
        .delete()
        .eq('supplier_id', id);
        
      if (contactsError) throw contactsError;
      
      // Excluir relações com medicamentos
      const { error: medicinesError } = await supabase
        .from('medicine_suppliers')
        .delete()
        .eq('supplier_id', id);
        
      if (medicinesError) throw medicinesError;
      
      // Excluir fornecedor
      const { error: supplierError } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
        
      if (supplierError) throw supplierError;
      
      // Atualizar lista
      setSuppliers(suppliers.filter(supplier => supplier.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error);
      setError('Não foi possível excluir o fornecedor.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  return (
    <Container>
      <h2 className="mb-4">Fornecedores</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={6}>
              <InputGroup>
                <Form.Control
                  placeholder="Buscar por nome, CNPJ, email ou telefone"
                  value={searchTerm}
                  onChange={handleSearch}
                />
                <Button variant="outline-secondary">
                  <Search />
                </Button>
              </InputGroup>
            </Col>
            <Col md={6} className="text-md-end mt-3 mt-md-0">
              <Button variant="primary" as={Link} to="/suppliers/new">
                <PlusCircle className="me-2" /> Novo Fornecedor
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" />
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <Alert variant="info">
          {searchTerm ? 'Nenhum fornecedor encontrado para a busca realizada.' : 'Nenhum fornecedor cadastrado.'}
        </Alert>
      ) : (
        <Card>
          <Card.Body>
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>CNPJ</th>
                    <th>Telefone</th>
                    <th>Email</th>
                    <th>Cidade/UF</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map(supplier => (
                    <tr key={supplier.id}>
                      <td>{supplier.name}</td>
                      <td>{supplier.cnpj || '-'}</td>
                      <td>{supplier.main_phone || '-'}</td>
                      <td>{supplier.main_email || '-'}</td>
                      <td>
                        {supplier.city ? (
                          <>
                            {supplier.city}
                            {supplier.state && `/${supplier.state}`}
                          </>
                        ) : '-'}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button 
                            variant="outline-info" 
                            size="sm" 
                            as={Link} 
                            to={`/suppliers/${supplier.id}`}
                            title="Visualizar detalhes"
                          >
                            <Eye />
                          </Button>
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            as={Link} 
                            to={`/suppliers/edit/${supplier.id}`}
                            title="Editar fornecedor"
                          >
                            <Pencil />
                          </Button>
                          <Button 
                            variant="outline-success" 
                            size="sm" 
                            as={Link} 
                            to={`/suppliers/${supplier.id}/medicines`}
                            title="Gerenciar medicamentos"
                          >
                            <FileEarmarkMedical />
                          </Button>
                          {deleteConfirm === supplier.id ? (
                            <>
                              <Button 
                                variant="danger" 
                                size="sm" 
                                onClick={() => handleDelete(supplier.id)}
                                title="Confirmar exclusão"
                              >
                                Confirmar
                              </Button>
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={cancelDelete}
                                title="Cancelar exclusão"
                              >
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <Button 
                              variant="outline-danger" 
                              size="sm" 
                              onClick={() => handleDelete(supplier.id)}
                              title="Excluir fornecedor"
                            >
                              <Trash />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default SuppliersList;
