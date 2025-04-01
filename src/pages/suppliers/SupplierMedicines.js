import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Button, 
  Table, 
  Form, 
  Modal, 
  InputGroup, 
  Spinner, 
  Alert, 
  Badge 
} from 'react-bootstrap';
import { 
  ArrowLeft, 
  PlusCircle, 
  Trash, 
  Pencil, 
  CurrencyDollar, 
  Search, 
  Building 
} from 'react-bootstrap-icons';
import { supplierService } from '../../services/supplierService';
import { supabase } from '../../supabaseClient';
import { formatCurrency } from '../../utils/formatters';

const SupplierMedicines = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [medicineOptions, setMedicineOptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [priceNotes, setPriceNotes] = useState('');
  const [currentMedicineSupplier, setCurrentMedicineSupplier] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

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
      
      // Carregar medicamentos do fornecedor
      const medicinesData = await supplierService.getMedicines(id);
      setMedicines(medicinesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Não foi possível carregar os dados do fornecedor e seus medicamentos.');
    } finally {
      setLoading(false);
    }
  };

  const searchMedicines = async (term) => {
    if (!term || term.length < 3) {
      setMedicineOptions([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('medicamentos_base')
        .select('id, produto, substancia, apresentacao, laboratorio')
        .or(`produto.ilike.%${term}%,substancia.ilike.%${term}%,laboratorio.ilike.%${term}%`)
        .limit(20);
      
      if (error) throw error;
      
      // Filtra os medicamentos que já estão associados a este fornecedor
      const existingMedicineIds = medicines.map(m => m.medicine_id);
      const filteredOptions = data.filter(m => !existingMedicineIds.includes(m.id));
      
      setMedicineOptions(filteredOptions);
    } catch (error) {
      console.error('Erro ao buscar medicamentos:', error);
      setError('Erro ao buscar medicamentos: ' + error.message);
    }
  };

  const handleAddMedicine = async () => {
    if (!selectedMedicine) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const medicineSuppplier = {
        medicine_id: selectedMedicine.id,
        supplier_id: id,
        last_quote_price: 0,
        last_quote_date: new Date().toISOString()
      };
      
      await supplierService.addMedicine(medicineSuppplier);
      setSuccess('Medicamento adicionado com sucesso!');
      
      // Recarrega a lista de medicamentos
      loadData();
      
      // Limpa o formulário
      setSelectedMedicine(null);
      setSearchTerm('');
      setShowAddModal(false);
    } catch (error) {
      console.error('Erro ao adicionar medicamento:', error);
      setError('Erro ao adicionar medicamento: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMedicine = async (medicineSupplier) => {
    if (window.confirm('Tem certeza que deseja remover este medicamento do fornecedor?')) {
      try {
        setSaving(true);
        setError(null);
        
        await supplierService.removeMedicine(medicineSupplier.id);
        setSuccess('Medicamento removido com sucesso!');
        
        // Atualiza a lista de medicamentos
        setMedicines(prev => prev.filter(m => m.id !== medicineSupplier.id));
      } catch (error) {
        console.error('Erro ao remover medicamento:', error);
        setError('Erro ao remover medicamento: ' + error.message);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleOpenPriceModal = (medicineSupplier) => {
    setCurrentMedicineSupplier(medicineSupplier);
    setNewPrice(medicineSupplier.last_quote_price?.toString() || '');
    setPriceNotes('');
    setShowPriceModal(true);
  };

  const handleOpenHistoryModal = async (medicineSupplier) => {
    setCurrentMedicineSupplier(medicineSupplier);
    setLoadingHistory(true);
    setError(null);
    
    try {
      const historyData = await supplierService.getPriceHistory(medicineSupplier.id);
      setPriceHistory(historyData);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Erro ao carregar histórico de preços:', error);
      setError('Erro ao carregar histórico de preços: ' + error.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUpdatePrice = async () => {
    if (!currentMedicineSupplier || !newPrice) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const price = parseFloat(newPrice.replace(',', '.'));
      
      await supplierService.updateMedicine(currentMedicineSupplier.id, {
        last_quote_price: price,
        last_quote_date: new Date().toISOString(),
        notes: priceNotes || null
      });
      
      setSuccess('Preço atualizado com sucesso!');
      
      // Atualiza a lista de medicamentos
      setMedicines(prev => prev.map(m => 
        m.id === currentMedicineSupplier.id 
          ? { ...m, last_quote_price: price, last_quote_date: new Date().toISOString() } 
          : m
      ));
      
      setShowPriceModal(false);
    } catch (error) {
      console.error('Erro ao atualizar preço:', error);
      setError('Erro ao atualizar preço: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    searchMedicines(term);
  };

  const handleSelectMedicine = (medicine) => {
    setSelectedMedicine(medicine);
    setSearchTerm(medicine ? `${medicine.produto} - ${medicine.laboratorio}` : '');
    setMedicineOptions([]);
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
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button 
            as={Link} 
            to={`/suppliers/${id}`} 
            variant="outline-secondary"
            className="me-2"
          >
            <ArrowLeft className="me-1" /> Voltar
          </Button>
          <h2 className="d-inline-block mb-0 ms-2">Medicamentos do Fornecedor</h2>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setShowAddModal(true)}
        >
          <PlusCircle className="me-1" /> Adicionar Medicamento
        </Button>
      </div>
      
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Fornecedor: {supplier.name}</h5>
            {supplier.cnpj && <span><Building className="me-1" /> CNPJ: {supplier.cnpj}</span>}
          </div>
        </Card.Header>
      </Card>
      
      {medicines.length === 0 ? (
        <Alert variant="info">
          Este fornecedor ainda não possui medicamentos associados. Clique em "Adicionar Medicamento" para começar.
        </Alert>
      ) : (
        <Card>
          <Card.Body>
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
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map(item => (
                    <tr key={item.id}>
                      <td>{item.medicamentos_base.produto}</td>
                      <td>{item.medicamentos_base.substancia}</td>
                      <td>{item.medicamentos_base.apresentacao}</td>
                      <td>{item.medicamentos_base.laboratorio}</td>
                      <td>
                        {item.last_quote_price 
                          ? formatCurrency(item.last_quote_price) 
                          : '-'}
                      </td>
                      <td>{formatDate(item.last_quote_date)}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            onClick={() => handleOpenPriceModal(item)}
                            title="Atualizar preço"
                          >
                            <CurrencyDollar />
                          </Button>
                          <Button 
                            variant="outline-info" 
                            size="sm" 
                            onClick={() => handleOpenHistoryModal(item)}
                            title="Histórico de preços"
                          >
                            <i className="bi bi-clock-history"></i>
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            onClick={() => handleRemoveMedicine(item)}
                            title="Remover medicamento"
                          >
                            <Trash />
                          </Button>
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
      
      {/* Modal para adicionar medicamento */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Adicionar Medicamento</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Buscar Medicamento</Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Digite o nome do medicamento, princípio ativo ou laboratório"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  autoFocus
                />
                <Button variant="outline-secondary">
                  <Search />
                </Button>
              </InputGroup>
              <Form.Text className="text-muted">
                Digite pelo menos 3 caracteres para buscar
              </Form.Text>
            </Form.Group>
            
            {medicineOptions.length > 0 && (
              <div className="mb-3">
                <div className="list-group">
                  {medicineOptions.map(medicine => (
                    <button
                      key={medicine.id}
                      type="button"
                      className="list-group-item list-group-item-action"
                      onClick={() => handleSelectMedicine(medicine)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{medicine.produto}</strong>
                          <div className="text-muted small">
                            {medicine.substancia} {medicine.apresentacao && `- ${medicine.apresentacao}`}
                          </div>
                          <div className="text-muted small">
                            {medicine.laboratorio}
                          </div>
                        </div>
                        <div>
                          -
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {selectedMedicine && (
              <Alert variant="info">
                <strong>Medicamento selecionado:</strong> {selectedMedicine.produto} - {selectedMedicine.laboratorio}
              </Alert>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAddMedicine} 
            disabled={!selectedMedicine || saving}
          >
            {saving ? <><Spinner animation="border" size="sm" /> Salvando...</> : 'Adicionar'}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Modal de Histórico de Preços */}
      <Modal
        show={showHistoryModal}
        onHide={() => setShowHistoryModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Histórico de Preços</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingHistory ? (
            <div className="text-center py-4">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Carregando...</span>
              </Spinner>
            </div>
          ) : (
            <>
              {currentMedicineSupplier && (
                <Alert variant="info" className="mb-3">
                  <strong>Medicamento:</strong> {currentMedicineSupplier.medicamentos_base.produto}
                  <div className="small">
                    {currentMedicineSupplier.medicamentos_base.laboratorio}
                  </div>
                </Alert>
              )}
              
              {priceHistory.length === 0 ? (
                <Alert variant="warning">
                  Não há histórico de preços para este medicamento.
                </Alert>
              ) : (
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Preço</th>
                      <th>Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceHistory.map(item => (
                      <tr key={item.id}>
                        <td>{formatDate(item.quote_date)}</td>
                        <td>{formatCurrency(item.price)}</td>
                        <td>{item.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowHistoryModal(false)}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Modal de Atualização de Preço */}
      <Modal
        show={showPriceModal}
        onHide={() => setShowPriceModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Atualizar Preço</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentMedicineSupplier && (
            <Form>
              <Alert variant="info" className="mb-3">
                <strong>Medicamento:</strong> {currentMedicineSupplier.medicamentos_base.produto}
                <div className="small">
                  {currentMedicineSupplier.medicamentos_base.laboratorio}
                </div>
              </Alert>
              
              <Form.Group className="mb-3">
                <Form.Label>Novo Preço (R$)</Form.Label>
                <InputGroup>
                  <InputGroup.Text>R$</InputGroup.Text>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                  />
                </InputGroup>
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Observações (opcional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={priceNotes}
                  onChange={(e) => setPriceNotes(e.target.value)}
                  placeholder="Adicione informações relevantes sobre esta cotação"
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPriceModal(false)}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleUpdatePrice}
            disabled={saving}
          >
            {saving ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Salvando...
              </>
            ) : 'Atualizar Preço'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default SupplierMedicines;
