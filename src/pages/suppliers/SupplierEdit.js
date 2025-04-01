import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { ArrowLeft } from 'react-bootstrap-icons';
import SupplierForm from './SupplierForm';
import { supplierService } from '../../services/suppliers/supplierService';

const SupplierEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNewSupplier = !id;
  const [supplier, setSupplier] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });
  const [loading, setLoading] = useState(!isNewSupplier);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  useEffect(() => {
    if (!isNewSupplier) {
      loadSupplier();
    }
  }, [id]);

  const loadSupplier = async () => {
    try {
      const data = await supplierService.getById(id);
      if (data) {
        setSupplier(data);
      } else {
        showSnackbar('Fornecedor não encontrado', 'error');
        navigate('/suppliers');
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedor:', error);
      showSnackbar('Erro ao carregar fornecedor: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSupplier(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpa o erro do campo quando o usuário começa a digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!supplier.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (supplier.email && !/\S+@\S+\.\S+/.test(supplier.email)) {
      newErrors.email = 'Email inválido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      showSnackbar('Por favor, corrija os erros no formulário', 'error');
      return;
    }
    
    try {
      setSaving(true);
      
      if (isNewSupplier) {
        await supplierService.create(supplier);
        showSnackbar('Fornecedor criado com sucesso!', 'success');
      } else {
        await supplierService.update(id, supplier);
        showSnackbar('Fornecedor atualizado com sucesso!', 'success');
      }
      
      setTimeout(() => {
        navigate('/suppliers');
      }, 2000);
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error);
      showSnackbar('Erro ao salvar fornecedor: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  if (loading) {
    return (
      <Container className="my-4 d-flex justify-content-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="my-4">
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <Button 
              as={Link} 
              to="/suppliers" 
              variant="outline-secondary"
              className="me-2"
            >
              <ArrowLeft className="me-1" /> Voltar
            </Button>
            <h4 className="mb-0">{isNewSupplier ? 'Novo Fornecedor' : 'Editar Fornecedor'}</h4>
          </div>
        </Card.Header>
        <Card.Body>
          <SupplierForm 
            supplier={supplier} 
            onChange={handleChange} 
            onSubmit={handleSubmit} 
            errors={errors} 
            saving={saving} 
          />
        </Card.Body>
      </Card>

      <Alert 
        variant={snackbar.severity} 
        show={snackbar.open} 
        onClose={handleCloseSnackbar} 
        dismissible
        className="mt-4"
      >
        {snackbar.message}
      </Alert>
    </Container>
  );
};

export default SupplierEdit;
