import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Container, Typography, Paper, Button, 
  Grid, TextField, Box, CircularProgress,
  Snackbar, Alert, Autocomplete, InputAdornment,
  Card, CardContent, Divider, Radio, RadioGroup,
  FormControlLabel, FormControl, FormLabel
} from '@mui/material';
import { 
  Save as SaveIcon, 
  ArrowBack as ArrowBackIcon,
  LocalPharmacy as MedicineIcon,
  Business as SupplierIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon,
  HealthAndSafety as HealthIcon
} from '@mui/icons-material';
import { quoteService } from '../../services/quotes/quoteService';
import { supabase } from '../../services/supabaseClient';
import { formatCurrency } from '../../utils/formatters';

const QuoteCreate = () => {
  const navigate = useNavigate();
  const [quote, setQuote] = useState({
    patient_name: '',
    insurance_provider: '',
    medicine_id: '',
    supplier_id: '',
    price: '',
    status: 'pendente'
  });
  const [medicineOptions, setMedicineOptions] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [medicineSearchTerm, setMedicineSearchTerm] = useState('');
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  useEffect(() => {
    if (selectedMedicine) {
      loadSuppliersForMedicine(selectedMedicine.id);
    } else {
      setSupplierOptions([]);
      setSelectedSupplier(null);
    }
  }, [selectedMedicine]);

  const searchMedicines = async (term) => {
    if (!term || term.length < 3) {
      setMedicineOptions([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('medicamentos_base')
        .select('id, nome_produto, apresentacao, laboratorio, pf_sem_impostos')
        .or(`nome_produto.ilike.%${term}%,apresentacao.ilike.%${term}%,laboratorio.ilike.%${term}%`)
        .limit(20);
      
      if (error) throw error;
      setMedicineOptions(data);
    } catch (error) {
      console.error('Erro ao buscar medicamentos:', error);
      showSnackbar('Erro ao buscar medicamentos: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliersForMedicine = async (medicineId) => {
    try {
      setLoading(true);
      const data = await quoteService.getSuppliersForMedicine(medicineId);
      setSupplierOptions(data);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
      showSnackbar('Erro ao carregar fornecedores: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setQuote(prev => ({
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

  const handleSupplierSelect = (supplier) => {
    setSelectedSupplier(supplier);
    
    if (supplier) {
      setQuote(prev => ({
        ...prev,
        supplier_id: supplier.supplier_id,
        price: supplier.last_quote_price || ''
      }));
    } else {
      setQuote(prev => ({
        ...prev,
        supplier_id: '',
        price: ''
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!quote.patient_name.trim()) {
      newErrors.patient_name = 'Nome do paciente é obrigatório';
    }
    
    if (!quote.insurance_provider.trim()) {
      newErrors.insurance_provider = 'Operadora é obrigatória';
    }
    
    if (!selectedMedicine) {
      newErrors.medicine_id = 'Medicamento é obrigatório';
    }
    
    if (!selectedSupplier) {
      newErrors.supplier_id = 'Fornecedor é obrigatório';
    }
    
    if (!quote.price) {
      newErrors.price = 'Preço é obrigatório';
    } else if (isNaN(parseFloat(quote.price.replace(',', '.')))) {
      newErrors.price = 'Preço inválido';
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
      
      // Prepara o objeto de orçamento
      const newQuote = {
        ...quote,
        medicine_id: selectedMedicine.id,
        price: parseFloat(quote.price.replace(',', '.'))
      };
      
      await quoteService.create(newQuote);
      showSnackbar('Orçamento criado com sucesso!', 'success');
      
      setTimeout(() => {
        navigate('/quotes');
      }, 2000);
    } catch (error) {
      console.error('Erro ao criar orçamento:', error);
      showSnackbar('Erro ao criar orçamento: ' + error.message, 'error');
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <Button 
          component={Link} 
          to="/quotes" 
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          Voltar
        </Button>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 'medium' }}>
          Novo Orçamento
        </Typography>
      </Box>

      <Paper 
        sx={{ 
          p: 3, 
          borderRadius: 2, 
          boxShadow: 3,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '4px',
            height: '100%',
            backgroundColor: 'primary.main'
          }
        }}
      >
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                name="patient_name"
                label="Nome do Paciente"
                value={quote.patient_name}
                onChange={handleChange}
                fullWidth
                required
                error={!!errors.patient_name}
                helperText={errors.patient_name}
                disabled={saving}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="insurance_provider"
                label="Operadora de Saúde"
                value={quote.insurance_provider}
                onChange={handleChange}
                fullWidth
                required
                error={!!errors.insurance_provider}
                helperText={errors.insurance_provider}
                disabled={saving}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <HealthIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Autocomplete
                options={medicineOptions}
                getOptionLabel={(option) => `${option.nome_produto} - ${option.apresentacao} (${option.laboratorio})`}
                value={selectedMedicine}
                onChange={(event, newValue) => {
                  setSelectedMedicine(newValue);
                  if (newValue) {
                    setQuote(prev => ({
                      ...prev,
                      medicine_id: newValue.id
                    }));
                  } else {
                    setQuote(prev => ({
                      ...prev,
                      medicine_id: ''
                    }));
                  }
                }}
                inputValue={medicineSearchTerm}
                onInputChange={(event, newInputValue) => {
                  setMedicineSearchTerm(newInputValue);
                  searchMedicines(newInputValue);
                }}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Buscar medicamento" 
                    variant="outlined" 
                    fullWidth
                    required
                    error={!!errors.medicine_id}
                    helperText={errors.medicine_id || "Digite pelo menos 3 caracteres para buscar"}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <MedicineIcon color="primary" />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2
                      }
                    }}
                  />
                )}
                noOptionsText="Nenhum medicamento encontrado"
                loadingText="Buscando medicamentos..."
                loading={loading}
                disabled={saving}
              />
            </Grid>
            
            {selectedMedicine && (
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 2, boxShadow: 1, bgcolor: 'background.default' }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                      {selectedMedicine.nome_produto}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedMedicine.apresentacao}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedMedicine.laboratorio}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <MoneyIcon color="primary" sx={{ mr: 1, fontSize: 20 }} />
                      <Typography variant="body1">
                        {formatCurrency(selectedMedicine.pf_sem_impostos)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
            
            {selectedMedicine && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  <SupplierIcon sx={{ mr: 1 }} />
                  Selecione um Fornecedor
                </Typography>
                
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <CircularProgress />
                  </Box>
                ) : supplierOptions.length === 0 ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Não há fornecedores cadastrados para este medicamento.
                  </Alert>
                ) : (
                  <Grid container spacing={2}>
                    {supplierOptions.map((supplier) => (
                      <Grid item xs={12} md={6} key={supplier.id}>
                        <Card 
                          sx={{ 
                            borderRadius: 2, 
                            boxShadow: selectedSupplier?.id === supplier.id ? 3 : 1,
                            border: selectedSupplier?.id === supplier.id ? '2px solid' : '1px solid',
                            borderColor: selectedSupplier?.id === supplier.id ? 'primary.main' : 'divider',
                            cursor: 'pointer',
                            '&:hover': {
                              boxShadow: 2,
                              borderColor: 'primary.light'
                            }
                          }}
                          onClick={() => handleSupplierSelect(supplier)}
                        >
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                                {supplier.suppliers?.name || 'Fornecedor não encontrado'}
                              </Typography>
                              <Radio 
                                checked={selectedSupplier?.id === supplier.id}
                                onChange={() => handleSupplierSelect(supplier)}
                                color="primary"
                              />
                            </Box>
                            
                            <Divider sx={{ my: 1 }} />
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                              <MoneyIcon color="primary" sx={{ mr: 1, fontSize: 20 }} />
                              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                {formatCurrency(supplier.last_quote_price)}
                              </Typography>
                            </Box>
                            
                            <Typography variant="caption" color="text.secondary">
                              {supplier.suppliers?.email || ''}
                              {supplier.suppliers?.phone && ` • ${supplier.suppliers.phone}`}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
                
                {errors.supplier_id && (
                  <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                    {errors.supplier_id}
                  </Typography>
                )}
              </Grid>
            )}
            
            <Grid item xs={12} md={6}>
              <TextField
                name="price"
                label="Preço do Orçamento"
                value={quote.price}
                onChange={handleChange}
                fullWidth
                required
                error={!!errors.price}
                helperText={errors.price}
                disabled={saving}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon color="primary" />
                      R$
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Status do Orçamento</FormLabel>
                <RadioGroup
                  row
                  name="status"
                  value={quote.status}
                  onChange={handleChange}
                >
                  <FormControlLabel value="pendente" control={<Radio />} label="Pendente" />
                  <FormControlLabel value="aprovado" control={<Radio />} label="Aprovado" />
                  <FormControlLabel value="rejeitado" control={<Radio />} label="Rejeitado" />
                </RadioGroup>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button 
                component={Link} 
                to="/quotes" 
                variant="outlined"
                sx={{ mr: 2, borderRadius: 2 }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                startIcon={<SaveIcon />}
                disabled={saving}
                sx={{ borderRadius: 2 }}
              >
                {saving ? 'Salvando...' : 'Salvar'}
                {saving && <CircularProgress size={24} sx={{ ml: 1 }} />}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', boxShadow: 3, borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default QuoteCreate;
