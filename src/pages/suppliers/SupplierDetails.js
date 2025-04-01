import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Button, 
  Badge, 
  Table, 
  ListGroup, 
  Spinner, 
  Alert 
} from 'react-bootstrap';
import { 
  ArrowLeft, 
  Pencil, 
  Trash, 
  FileEarmarkMedical, 
  Envelope, 
  Telephone, 
  GeoAlt, 
  FileEarmarkText, 
  Calendar3, 
  Building, 
  Person, 
  BriefcaseFill
} from 'react-bootstrap-icons';
import { supplierService } from '../../services/supplierService';
import { formatCurrency } from '../../utils/formatters';

const SupplierDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Carregar dados do fornecedor
      const supplierData = await supplierService.getById(id);
      setSupplier(supplierData);
      
      // Carregar contatos do fornecedor
      const contactsData = await supplierService.getContacts(id);
      setContacts(contactsData);
      
      // Carregar medicamentos do fornecedor
      const medicinesData = await supplierService.getMedicines(id);
      setMedicines(medicinesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Não foi possível carregar os dados do fornecedor.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    
    try {
      setLoading(true);
      await supplierService.delete(id);
      navigate('/suppliers', { state: { message: 'Fornecedor excluído com sucesso!' } });
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error);
      setError('Não foi possível excluir o fornecedor: ' + error.message);
      setDeleteConfirm(false);
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const cancelDelete = () => {
    setDeleteConfirm(false);
  };

  if (loading) {
    return (
      <Container className="my-4 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!supplier) {
    return (
      <Container className="my-4">
        <Card className="text-center">
          <Card.Body>
            <Card.Title>Fornecedor não encontrado</Card.Title>
            <Button 
              as={Link} 
              to="/suppliers" 
              variant="primary" 
              className="mt-3"
            >
              <ArrowLeft className="me-2" /> Voltar para Lista
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="my-4">
      {error && <Alert variant="danger">{error}</Alert>}
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button 
            as={Link} 
            to="/suppliers" 
            variant="outline-secondary"
            className="me-2"
          >
            <ArrowLeft className="me-1" /> Voltar
          </Button>
          <h2 className="d-inline-block mb-0 ms-2">Detalhes do Fornecedor</h2>
        </div>
        <div>
          <Button 
            variant="outline-primary" 
            as={Link} 
            to={`/suppliers/edit/${id}`}
            className="me-2"
          >
            <Pencil className="me-1" /> Editar
          </Button>
          {deleteConfirm ? (
            <>
              <Button 
                variant="danger" 
                onClick={handleDelete}
                className="me-2"
              >
                Confirmar Exclusão
              </Button>
              <Button 
                variant="secondary" 
                onClick={cancelDelete}
              >
                Cancelar
              </Button>
            </>
          ) : (
            <Button 
              variant="outline-danger" 
              onClick={handleDelete}
            >
              <Trash className="me-1" /> Excluir
            </Button>
          )}
        </div>
      </div>

      <Row>
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">Informações do Fornecedor</h5>
            </Card.Header>
            <Card.Body>
              <h4>{supplier.name}</h4>
              {supplier.cnpj && (
                <p className="text-muted mb-3">
                  <Building className="me-2" /> CNPJ: {supplier.cnpj}
                </p>
              )}
              
              <ListGroup variant="flush" className="mb-3">
                {supplier.main_email && (
                  <ListGroup.Item>
                    <Envelope className="me-2 text-primary" /> 
                    <strong>Email:</strong> {supplier.main_email}
                  </ListGroup.Item>
                )}
                
                {supplier.main_phone && (
                  <ListGroup.Item>
                    <Telephone className="me-2 text-primary" /> 
                    <strong>Telefone:</strong> {supplier.main_phone}
                  </ListGroup.Item>
                )}
                
                {(supplier.address || supplier.city || supplier.state) && (
                  <ListGroup.Item>
                    <GeoAlt className="me-2 text-primary" /> 
                    <strong>Endereço:</strong> {supplier.address}
                    {supplier.city && (
                      <span>
                        {supplier.address && ', '}
                        {supplier.city}
                        {supplier.state && `/${supplier.state}`}
                      </span>
                    )}
                  </ListGroup.Item>
                )}
                
                {supplier.notes && (
                  <ListGroup.Item>
                    <FileEarmarkText className="me-2 text-primary" /> 
                    <strong>Observações:</strong> {supplier.notes}
                  </ListGroup.Item>
                )}
                
                <ListGroup.Item>
                  <Calendar3 className="me-2 text-primary" /> 
                  <strong>Cadastrado em:</strong> {formatDate(supplier.created_at)}
                </ListGroup.Item>
                
                {supplier.updated_at && supplier.updated_at !== supplier.created_at && (
                  <ListGroup.Item>
                    <Calendar3 className="me-2 text-primary" /> 
                    <strong>Atualizado em:</strong> {formatDate(supplier.updated_at)}
                  </ListGroup.Item>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">Contatos</h5>
            </Card.Header>
            <Card.Body>
              {contacts.length === 0 ? (
                <Alert variant="info">Nenhum contato cadastrado para este fornecedor.</Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Cargo</th>
                        <th>Telefone</th>
                        <th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map(contact => (
                        <tr key={contact.id}>
                          <td>
                            {contact.name}
                            {contact.is_primary && (
                              <Badge bg="primary" className="ms-2">Principal</Badge>
                            )}
                          </td>
                          <td>{contact.position || '-'}</td>
                          <td>{contact.phone || '-'}</td>
                          <td>{contact.email || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Card>
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Medicamentos</h5>
          <Button 
            variant="light" 
            size="sm" 
            as={Link} 
            to={`/suppliers/${id}/medicines`}
          >
            <FileEarmarkMedical className="me-1" /> Gerenciar Medicamentos
          </Button>
        </Card.Header>
        <Card.Body>
          {medicines.length === 0 ? (
            <Alert variant="info">Nenhum medicamento associado a este fornecedor.</Alert>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>Nome Comercial</th>
                    <th>Princípio Ativo</th>
                    <th>Concentração</th>
                    <th>Laboratório</th>
                    <th>Último Preço</th>
                    <th>Data da Cotação</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map(item => (
                    <tr key={item.id}>
                      <td>{item.medicamentos_base.nome_comercial}</td>
                      <td>{item.medicamentos_base.principio_ativo}</td>
                      <td>{item.medicamentos_base.concentracao}</td>
                      <td>{item.medicamentos_base.laboratorio}</td>
                      <td>
                        {item.last_quote_price 
                          ? formatCurrency(item.last_quote_price) 
                          : '-'}
                      </td>
                      <td>{formatDate(item.last_quote_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default SupplierDetails;
