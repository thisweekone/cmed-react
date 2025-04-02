import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  Save as SaveIcon, 
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Home as HomeIcon,
  MedicalServices as MedicalIcon,
  Notes as NotesIcon,
  LocalShipping as ShippingIcon,
  ContactPhone as ContactPhoneIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { ptBR } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';
import { patientService } from '../../services/patients/patientService';
import { insuranceProviderService } from '../../services/insurance/insuranceProviderService';
import { cepService } from '../../services/cepService';
import { useSnackbar } from 'notistack';

const PatientForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const isEditMode = Boolean(id);

  const [patient, setPatient] = useState({
    name: '',
    birth_date: null,
    gender: '',
    cpf: '',
    phone: '',
    email: '',
    zipcode: '',
    street: '',
    street_number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    insurance_provider_id: '',
    insurance_card_number: '',
    notes: '',
    has_delivery_address: false,
    delivery_zipcode: '',
    delivery_street: '',
    delivery_street_number: '',
    delivery_complement: '',
    delivery_neighborhood: '',
    delivery_city: '',
    delivery_state: '',
    contacts: []
  });

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [searchingCep, setSearchingCep] = useState(false);
  const [searchingDeliveryCep, setSearchingDeliveryCep] = useState(false);

  useEffect(() => {
    loadProviders();
    if (isEditMode) {
      loadPatient();
    }
  }, [id]);

  const loadPatient = async () => {
    try {
      setLoading(true);
      const data = await patientService.getById(id);
      
      // Formatar a data de nascimento se existir
      if (data.birth_date) {
        data.birth_date = parseISO(data.birth_date);
      }
      
      // Garantir que o campo contacts seja um array
      if (!data.contacts) {
        data.contacts = [];
      }
      
      setPatient(data);
    } catch (error) {
      console.error('Erro ao carregar dados do paciente:', error);
      enqueueSnackbar('Erro ao carregar dados do paciente', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const data = await insuranceProviderService.getAll();
      setProviders(data);
    } catch (error) {
      console.error('Erro ao carregar operadoras:', error);
      enqueueSnackbar('Erro ao carregar operadoras de saúde', { variant: 'error' });
    }
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    
    // Para checkboxes, usar o valor checked
    const newValue = type === 'checkbox' ? checked : value;
    
    setPatient(prev => ({ ...prev, [name]: newValue }));
    
    // Limpar erro do campo quando o usuário digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDateChange = (date) => {
    setPatient(prev => ({ ...prev, birth_date: date }));
    
    // Limpar erro do campo quando o usuário selecionar uma data
    if (errors.birth_date) {
      setErrors(prev => ({ ...prev, birth_date: '' }));
    }
  };

  const handleAddContact = () => {
    setPatient(prev => ({
      ...prev,
      contacts: [
        ...prev.contacts,
        { name: '', relationship: '', phone: '', email: '' }
      ]
    }));
  };

  const handleContactChange = (index, field, value) => {
    const updatedContacts = [...patient.contacts];
    updatedContacts[index] = {
      ...updatedContacts[index],
      [field]: value
    };
    
    setPatient(prev => ({
      ...prev,
      contacts: updatedContacts
    }));
  };

  const handleRemoveContact = (index) => {
    const updatedContacts = patient.contacts.filter((_, i) => i !== index);
    setPatient(prev => ({
      ...prev,
      contacts: updatedContacts
    }));
  };

  const handleSearchCep = async () => {
    if (!patient.zipcode || patient.zipcode.length < 8) {
      enqueueSnackbar('Por favor, informe um CEP válido', { variant: 'warning' });
      return;
    }
    
    try {
      setSearchingCep(true);
      const addressData = await cepService.getAddressByCep(patient.zipcode);
      
      setPatient(prev => ({
        ...prev,
        street: addressData.street || '',
        neighborhood: addressData.neighborhood || '',
        city: addressData.city || '',
        state: addressData.state || '',
        complement: addressData.complement || ''
      }));
      
      enqueueSnackbar('Endereço encontrado com sucesso!', { variant: 'success' });
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      enqueueSnackbar(`Erro ao buscar CEP: ${error.message}`, { variant: 'error' });
    } finally {
      setSearchingCep(false);
    }
  };

  const handleSearchDeliveryCep = async () => {
    if (!patient.delivery_zipcode || patient.delivery_zipcode.length < 8) {
      enqueueSnackbar('Por favor, informe um CEP válido', { variant: 'warning' });
      return;
    }
    
    try {
      setSearchingDeliveryCep(true);
      const addressData = await cepService.getAddressByCep(patient.delivery_zipcode);
      
      setPatient(prev => ({
        ...prev,
        delivery_street: addressData.street || '',
        delivery_neighborhood: addressData.neighborhood || '',
        delivery_city: addressData.city || '',
        delivery_state: addressData.state || '',
        delivery_complement: addressData.complement || ''
      }));
      
      enqueueSnackbar('Endereço de entrega encontrado com sucesso!', { variant: 'success' });
    } catch (error) {
      console.error('Erro ao buscar CEP de entrega:', error);
      enqueueSnackbar(`Erro ao buscar CEP: ${error.message}`, { variant: 'error' });
    } finally {
      setSearchingDeliveryCep(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!patient.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (patient.email && !/\S+@\S+\.\S+/.test(patient.email)) {
      newErrors.email = 'Email inválido';
    }
    
    // Validar emails dos contatos
    patient.contacts.forEach((contact, index) => {
      if (contact.email && !/\S+@\S+\.\S+/.test(contact.email)) {
        newErrors[`contact_${index}_email`] = 'Email inválido';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      enqueueSnackbar('Por favor, corrija os erros no formulário', { variant: 'error' });
      return;
    }
    
    try {
      setSaving(true);
      
      // Preparar dados para envio
      const patientData = { ...patient };
      
      // Formatar a data de nascimento para o formato ISO
      if (patientData.birth_date) {
        patientData.birth_date = format(patientData.birth_date, 'yyyy-MM-dd');
      }
      
      // Se não tiver endereço de entrega, limpar os campos
      if (!patientData.has_delivery_address) {
        patientData.delivery_zipcode = '';
        patientData.delivery_street = '';
        patientData.delivery_street_number = '';
        patientData.delivery_complement = '';
        patientData.delivery_neighborhood = '';
        patientData.delivery_city = '';
        patientData.delivery_state = '';
      }
      
      if (isEditMode) {
        await patientService.update(id, patientData);
        enqueueSnackbar('Paciente atualizado com sucesso!', { variant: 'success' });
      } else {
        await patientService.create(patientData);
        enqueueSnackbar('Paciente cadastrado com sucesso!', { variant: 'success' });
      }
      
      navigate('/patients');
    } catch (error) {
      console.error('Erro ao salvar paciente:', error);
      enqueueSnackbar(`Erro ao salvar paciente: ${error.message || JSON.stringify(error)}`, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton
          color="inherit"
          onClick={() => navigate('/patients')}
          sx={{ mr: 1 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {isEditMode ? 'Editar Paciente' : 'Novo Paciente'}
        </Typography>
      </Box>

      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1 }} />
                Informações Pessoais
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Nome Completo"
                value={patient.name}
                onChange={handleChange}
                fullWidth
                required
                error={!!errors.name}
                helperText={errors.name}
                disabled={saving}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <DatePicker
                  label="Data de Nascimento"
                  value={patient.birth_date}
                  onChange={handleDateChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      error={!!errors.birth_date}
                      helperText={errors.birth_date}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  )}
                  disabled={saving}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                <InputLabel>Gênero</InputLabel>
                <Select
                  name="gender"
                  value={patient.gender}
                  onChange={handleChange}
                  label="Gênero"
                  disabled={saving}
                >
                  <MenuItem value="">Selecione</MenuItem>
                  <MenuItem value="masculino">Masculino</MenuItem>
                  <MenuItem value="feminino">Feminino</MenuItem>
                  <MenuItem value="outro">Outro</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                name="cpf"
                label="CPF"
                value={patient.cpf}
                onChange={handleChange}
                fullWidth
                disabled={saving}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 2, display: 'flex', alignItems: 'center' }}>
                <MedicalIcon sx={{ mr: 1 }} />
                Informações de Saúde
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.insurance_provider_id} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                <InputLabel>Operadora de Saúde</InputLabel>
                <Select
                  name="insurance_provider_id"
                  value={patient.insurance_provider_id || ''}
                  onChange={handleChange}
                  label="Operadora de Saúde"
                  disabled={saving}
                >
                  <MenuItem value="">Nenhuma</MenuItem>
                  {providers.map((provider) => (
                    <MenuItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.insurance_provider_id && (
                  <FormHelperText>{errors.insurance_provider_id}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                name="insurance_card_number"
                label="Número do Cartão do Plano"
                value={patient.insurance_card_number || ''}
                onChange={handleChange}
                fullWidth
                disabled={saving || !patient.insurance_provider_id}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 2, display: 'flex', alignItems: 'center' }}>
                <PhoneIcon sx={{ mr: 1 }} />
                Contato
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                name="phone"
                label="Telefone"
                value={patient.phone}
                onChange={handleChange}
                fullWidth
                disabled={saving}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                name="email"
                label="Email"
                type="email"
                value={patient.email}
                onChange={handleChange}
                fullWidth
                error={!!errors.email}
                helperText={errors.email}
                disabled={saving}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 2, display: 'flex', alignItems: 'center' }}>
                <HomeIcon sx={{ mr: 1 }} />
                Endereço Principal
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                name="zipcode"
                label="CEP"
                value={patient.zipcode || ''}
                onChange={handleChange}
                fullWidth
                disabled={saving}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                placeholder="00000-000"
                InputProps={{
                  endAdornment: (
                    <IconButton 
                      onClick={handleSearchCep} 
                      disabled={saving || searchingCep || !patient.zipcode}
                      size="small"
                    >
                      {searchingCep ? <CircularProgress size={20} /> : <SearchIcon />}
                    </IconButton>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                name="street"
                label="Logradouro"
                value={patient.street || ''}
                onChange={handleChange}
                fullWidth
                disabled={saving}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                name="street_number"
                label="Número"
                value={patient.street_number || ''}
                onChange={handleChange}
                fullWidth
                disabled={saving}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                name="complement"
                label="Complemento"
                value={patient.complement || ''}
                onChange={handleChange}
                fullWidth
                disabled={saving}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                name="neighborhood"
                label="Bairro"
                value={patient.neighborhood || ''}
                onChange={handleChange}
                fullWidth
                disabled={saving}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                name="city"
                label="Cidade"
                value={patient.city || ''}
                onChange={handleChange}
                fullWidth
                disabled={saving}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} md={1}>
              <TextField
                name="state"
                label="UF"
                value={patient.state || ''}
                onChange={handleChange}
                fullWidth
                disabled={saving}
                inputProps={{ maxLength: 2 }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="has_delivery_address"
                    checked={patient.has_delivery_address}
                    onChange={handleChange}
                    disabled={saving}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ShippingIcon sx={{ mr: 1 }} />
                    <Typography>Possui endereço de entrega diferente</Typography>
                  </Box>
                }
              />
            </Grid>

            {patient.has_delivery_address && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 1, mb: 2, display: 'flex', alignItems: 'center' }}>
                    <ShippingIcon sx={{ mr: 1 }} />
                    Endereço de Entrega
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    name="delivery_zipcode"
                    label="CEP de Entrega"
                    value={patient.delivery_zipcode || ''}
                    onChange={handleChange}
                    fullWidth
                    disabled={saving}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    placeholder="00000-000"
                    InputProps={{
                      endAdornment: (
                        <IconButton 
                          onClick={handleSearchDeliveryCep} 
                          disabled={saving || searchingDeliveryCep || !patient.delivery_zipcode}
                          size="small"
                        >
                          {searchingDeliveryCep ? <CircularProgress size={20} /> : <SearchIcon />}
                        </IconButton>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    name="delivery_street"
                    label="Logradouro"
                    value={patient.delivery_street || ''}
                    onChange={handleChange}
                    fullWidth
                    disabled={saving}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    name="delivery_street_number"
                    label="Número"
                    value={patient.delivery_street_number || ''}
                    onChange={handleChange}
                    fullWidth
                    disabled={saving}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    name="delivery_complement"
                    label="Complemento"
                    value={patient.delivery_complement || ''}
                    onChange={handleChange}
                    fullWidth
                    disabled={saving}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    name="delivery_neighborhood"
                    label="Bairro"
                    value={patient.delivery_neighborhood || ''}
                    onChange={handleChange}
                    fullWidth
                    disabled={saving}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    name="delivery_city"
                    label="Cidade"
                    value={patient.delivery_city || ''}
                    onChange={handleChange}
                    fullWidth
                    disabled={saving}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>

                <Grid item xs={12} md={1}>
                  <TextField
                    name="delivery_state"
                    label="UF"
                    value={patient.delivery_state || ''}
                    onChange={handleChange}
                    fullWidth
                    disabled={saving}
                    inputProps={{ maxLength: 2 }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ContactPhoneIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      Contatos Adicionais ({patient.contacts.length})
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {patient.contacts.map((contact, index) => (
                      <Grid item xs={12} key={index}>
                        <Card variant="outlined" sx={{ mb: 2 }}>
                          <CardContent>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <IconButton 
                                  color="error" 
                                  onClick={() => handleRemoveContact(index)}
                                  disabled={saving}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  label="Nome do Contato"
                                  value={contact.name}
                                  onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                                  fullWidth
                                  disabled={saving}
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  label="Relação/Parentesco"
                                  value={contact.relationship}
                                  onChange={(e) => handleContactChange(index, 'relationship', e.target.value)}
                                  fullWidth
                                  disabled={saving}
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  label="Telefone"
                                  value={contact.phone}
                                  onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                                  fullWidth
                                  disabled={saving}
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  label="Email"
                                  type="email"
                                  value={contact.email}
                                  onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                                  fullWidth
                                  error={!!errors[`contact_${index}_email`]}
                                  helperText={errors[`contact_${index}_email`]}
                                  disabled={saving}
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                    <Grid item xs={12}>
                      <Button
                        startIcon={<AddIcon />}
                        onClick={handleAddContact}
                        disabled={saving}
                        variant="outlined"
                        color="primary"
                        sx={{ borderRadius: 2 }}
                      >
                        Adicionar Contato
                      </Button>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 2, display: 'flex', alignItems: 'center' }}>
                <NotesIcon sx={{ mr: 1 }} />
                Observações
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <TextField
                name="notes"
                label="Observações"
                value={patient.notes || ''}
                onChange={handleChange}
                fullWidth
                multiline
                rows={4}
                disabled={saving}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => navigate('/patients')}
                disabled={saving}
                sx={{ mr: 2, borderRadius: 2 }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                disabled={saving}
                sx={{ borderRadius: 2 }}
              >
                {isEditMode ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default PatientForm;
