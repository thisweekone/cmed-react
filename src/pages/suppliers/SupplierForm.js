import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Card, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { fetchCnpjData, isValidCnpj } from '../../services/cnpjService';
import { Search, Plus, Trash } from 'react-bootstrap-icons';
import { formatCNPJ, unformatCNPJ, formatPhone, unformatPhone, formatCEP, unformatCEP } from '../../utils/formatters';

const SupplierForm = ({ supplier = null }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    address: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
    zip_code: '',
    main_phone: '',
    main_email: '',
    website: '',
    notes: ''
  });
  
  const [contacts, setContacts] = useState([
    { name: '', phone: '', email: '', position: '', is_primary: false }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [cnpjError, setCnpjError] = useState(null);
  
  useEffect(() => {
    const fetchSupplier = async () => {
      if (isEditing) {
        setLoading(true);
        try {
          const { data: supplierData, error: supplierError } = await supabase
            .from('suppliers')
            .select('*')
            .eq('id', id)
            .single();
            
          if (supplierError) throw supplierError;
          
          const { data: contactsData, error: contactsError } = await supabase
            .from('supplier_contacts')
            .select('*')
            .eq('supplier_id', id)
            .order('is_primary', { ascending: false });
            
          if (contactsError) throw contactsError;
          
          const formattedData = {
            ...supplierData,
            cnpj: supplierData.cnpj ? formatCNPJ(supplierData.cnpj) : '',
            main_phone: supplierData.main_phone ? formatPhone(supplierData.main_phone) : '',
            phone: supplierData.phone ? formatPhone(supplierData.phone) : '',
            zip_code: supplierData.zip_code ? formatCEP(supplierData.zip_code) : '',
          };
          
          setFormData(formattedData);
          
          if (contactsData && contactsData.length > 0) {
            const formattedContacts = contactsData.map(contact => ({
              ...contact,
              phone: contact.phone ? formatPhone(contact.phone) : ''
            }));
            setContacts(formattedContacts);
          }
          
        } catch (error) {
          console.error('Erro ao carregar fornecedor:', error);
          setError('Não foi possível carregar os dados do fornecedor.');
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchSupplier();
  }, [id, isEditing]);
  
  const handleFetchCnpj = async () => {
    const cnpj = formData.cnpj;
    
    if (!cnpj) {
      setCnpjError('Informe um CNPJ para consultar.');
      return;
    }
    
    const cleanCnpj = unformatCNPJ(cnpj);
    
    if (!isValidCnpj(cleanCnpj)) {
      setCnpjError('CNPJ inválido.');
      return;
    }
    
    setLoadingCnpj(true);
    setCnpjError(null);
    
    try {
      const cnpjData = await fetchCnpjData(cnpj);
      
      const streetAddress = cnpjData.address || '';
      
      setFormData({
        ...formData,
        cnpj: formatCNPJ(cnpjData.cnpj || ''),
        name: cnpjData.name || '',
        address: cnpjData.address || '',
        number: cnpjData.number || '',
        complement: cnpjData.complement || '',
        district: cnpjData.district || '',
        city: cnpjData.city || '',
        state: cnpjData.state || '',
        zip_code: formatCEP(cnpjData.zipcode || ''),
        main_phone: formatPhone(cnpjData.phone || ''),
        phone: formatPhone(cnpjData.phone || ''),
        main_email: cnpjData.email || '',
        email: cnpjData.email || ''
      });
      
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
      setCnpjError('Não foi possível consultar o CNPJ. Verifique se o CNPJ é válido e tente novamente.');
    } finally {
      setLoadingCnpj(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'cnpj') {
      if (value.length <= 18) {
        const unformatted = unformatCNPJ(value);
        setFormData({ ...formData, [name]: formatCNPJ(unformatted) });
      }
    } else if (name === 'main_phone' || name === 'phone') {
      const unformatted = unformatPhone(value);
      setFormData({ ...formData, [name]: formatPhone(unformatted) });
    } else if (name === 'zip_code') {
      if (value.length <= 9) {
        const unformatted = unformatCEP(value);
        setFormData({ ...formData, [name]: formatCEP(unformatted) });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  
  const handleContactChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    const updatedContacts = [...contacts];
    
    if (name === 'phone') {
      const unformatted = unformatPhone(value);
      updatedContacts[index] = { ...updatedContacts[index], [name]: formatPhone(unformatted) };
    } else {
      updatedContacts[index] = { ...updatedContacts[index], [name]: newValue };
    }
    
    if (name === 'is_primary' && newValue === true) {
      updatedContacts.forEach((contact, i) => {
        if (i !== index) {
          updatedContacts[i] = { ...updatedContacts[i], is_primary: false };
        }
      });
    }
    
    setContacts(updatedContacts);
  };
  
  const handleAddContact = () => {
    setContacts([...contacts, { name: '', phone: '', email: '', position: '', is_primary: false }]);
  };
  
  const handleRemoveContact = (index) => {
    const updatedContacts = [...contacts];
    updatedContacts.splice(index, 1);
    setContacts(updatedContacts);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    let supplierId = id;
    
    try {
      // Preparar dados para salvar (remover máscaras)
      const supplierData = {
        name: formData.name || '',
        cnpj: formData.cnpj ? unformatCNPJ(formData.cnpj) : '',
        address: formData.address || '',
        number: formData.number || '',
        complement: formData.complement || '',
        district: formData.district || '',
        city: formData.city || '',
        state: formData.state || '',
        zip_code: formData.zip_code ? unformatCEP(formData.zip_code) : '',
        main_phone: formData.main_phone ? unformatPhone(formData.main_phone) : '',
        phone: formData.phone ? unformatPhone(formData.phone) : '',
        main_email: formData.main_email || '',
        email: formData.email || '',
        website: formData.website || '',
        notes: formData.notes || ''
      };
      
      // Adicionar timestamps
      if (!isEditing) {
        // Para novos registros, definir created_at e updated_at
        supplierData.created_at = new Date().toISOString();
        supplierData.updated_at = new Date().toISOString();
      } else {
        // Para atualizações, apenas atualizar updated_at
        supplierData.updated_at = new Date().toISOString();
      }
      
      // Remover campos vazios para evitar problemas com o Supabase
      Object.keys(supplierData).forEach(key => {
        if (supplierData[key] === null) {
          supplierData[key] = '';
        }
      });
      
      console.log('Dados a serem salvos:', supplierData);
      
      if (isEditing) {
        const { error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('id', id);
          
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('suppliers')
          .insert(supplierData)
          .select();
          
        if (error) throw error;
        supplierId = data[0].id;
      }
      
      if (supplierId) {
        if (isEditing) {
          await supabase
            .from('supplier_contacts')
            .delete()
            .eq('supplier_id', supplierId);
        }
        
        const contactsWithSupplierId = contacts
          .filter(contact => contact.name && contact.name.trim() !== '') 
          .map(contact => ({
            name: contact.name || '',
            phone: contact.phone ? unformatPhone(contact.phone) : '',
            email: contact.email || '',
            position: contact.position || '',
            is_primary: contact.is_primary || false,
            supplier_id: supplierId
          }));
        
        if (contactsWithSupplierId.length > 0) {
          const { error } = await supabase
            .from('supplier_contacts')
            .insert(contactsWithSupplierId);
            
          if (error) throw error;
        }
      }
      
      setSuccess(true);
      
      setTimeout(() => {
        navigate('/suppliers');
      }, 2000);
      
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error);
      setError('Não foi possível salvar o fornecedor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && !loadingCnpj) {
    return (
      <div className="d-flex justify-content-center my-5">
        <Spinner animation="border" />
      </div>
    );
  }
  
  return (
    <div>
      <h2>{isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">Fornecedor salvo com sucesso!</Alert>}
      
      <Form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <Card.Header>Informações Básicas</Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>CNPJ</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      name="cnpj"
                      value={formData.cnpj}
                      onChange={handleChange}
                      placeholder="00.000.000/0000-00"
                    />
                    <Button 
                      variant="outline-secondary" 
                      onClick={handleFetchCnpj}
                      disabled={loadingCnpj}
                    >
                      {loadingCnpj ? <Spinner size="sm" animation="border" /> : <Search />}
                    </Button>
                  </InputGroup>
                  {cnpjError && <Form.Text className="text-danger">{cnpjError}</Form.Text>}
                  <Form.Text className="text-muted">
                    Clique no botão de busca para preencher automaticamente os dados do fornecedor.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nome / Razão Social *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Endereço</Form.Label>
                  <Form.Control
                    type="text"
                    name="address"
                    value={formData.address || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Número</Form.Label>
                  <Form.Control
                    type="text"
                    name="number"
                    value={formData.number || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Complemento</Form.Label>
                  <Form.Control
                    type="text"
                    name="complement"
                    value={formData.complement || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Bairro</Form.Label>
                  <Form.Control
                    type="text"
                    name="district"
                    value={formData.district || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Cidade</Form.Label>
                  <Form.Control
                    type="text"
                    name="city"
                    value={formData.city || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Estado</Form.Label>
                  <Form.Control
                    type="text"
                    name="state"
                    value={formData.state || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>CEP</Form.Label>
                  <Form.Control
                    type="text"
                    name="zip_code"
                    value={formData.zip_code || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Telefone Principal</Form.Label>
                  <Form.Control
                    type="text"
                    name="main_phone"
                    value={formData.main_phone || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Telefone</Form.Label>
                  <Form.Control
                    type="text"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Principal</Form.Label>
                  <Form.Control
                    type="email"
                    name="main_email"
                    value={formData.main_email || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Website</Form.Label>
                  <Form.Control
                    type="text"
                    name="website"
                    value={formData.website || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Observações</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={formData.notes || ''}
                onChange={handleChange}
              />
            </Form.Group>
          </Card.Body>
        </Card>
        
        <Card className="mb-4">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <span>Pessoas de Contato</span>
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={handleAddContact}
            >
              <Plus /> Adicionar Contato
            </Button>
          </Card.Header>
          <Card.Body>
            {contacts.map((contact, index) => (
              <div key={index} className="mb-4 pb-3 border-bottom">
                <Row className="align-items-center mb-2">
                  <Col>
                    <h6>Contato #{index + 1}</h6>
                  </Col>
                  <Col xs="auto">
                    <Button 
                      variant="outline-danger" 
                      size="sm" 
                      onClick={() => handleRemoveContact(index)}
                      disabled={contacts.length === 1}
                    >
                      <Trash /> Remover
                    </Button>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nome</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={contact.name}
                        onChange={(e) => handleContactChange(index, e)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Cargo</Form.Label>
                      <Form.Control
                        type="text"
                        name="position"
                        value={contact.position}
                        onChange={(e) => handleContactChange(index, e)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Telefone</Form.Label>
                      <Form.Control
                        type="text"
                        name="phone"
                        value={contact.phone}
                        onChange={(e) => handleContactChange(index, e)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={contact.email}
                        onChange={(e) => handleContactChange(index, e)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Contato principal"
                    name="is_primary"
                    checked={contact.is_primary}
                    onChange={(e) => handleContactChange(index, e)}
                  />
                </Form.Group>
              </div>
            ))}
          </Card.Body>
        </Card>
        
        <div className="d-flex justify-content-between">
          <Button variant="secondary" onClick={() => navigate('/suppliers')}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <Spinner size="sm" animation="border" className="me-2" /> : null}
            Salvar Fornecedor
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default SupplierForm;
