import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import { 
  Save as SaveIcon, 
  ArrowBack as ArrowBackIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  Notes as NotesIcon
} from '@mui/icons-material';
import { insuranceProviderService } from '../../services/insurance/insuranceProviderService';
import { useSnackbar } from 'notistack';

const InsuranceProviderForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const isEditMode = Boolean(id);

  const [provider, setProvider] = useState({
    name: '',
    ans_code: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEditMode) {
      loadProvider();
    }
  }, [id]);

  const loadProvider = async () => {
    try {
      setLoading(true);
      const data = await insuranceProviderService.getById(id);
      setProvider(data);
    } catch (error) {
      console.error('Erro ao carregar dados da operadora:', error);
      enqueueSnackbar('Erro ao carregar dados da operadora', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProvider(prev => ({ ...prev, [name]: value }));
    
    // Limpar erro do campo quando o usuário digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!provider.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (provider.email && !/\S+@\S+\.\S+/.test(provider.email)) {
      newErrors.email = 'Email inválido';
    }
    
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
      
      if (isEditMode) {
        await insuranceProviderService.update(id, provider);
        enqueueSnackbar('Operadora atualizada com sucesso!', { variant: 'success' });
      } else {
        await insuranceProviderService.create(provider);
        enqueueSnackbar('Operadora cadastrada com sucesso!', { variant: 'success' });
      }
      
      navigate('/insurance');
    } catch (error) {
      console.error('Erro ao salvar operadora:', error);
      enqueueSnackbar(`Erro ao salvar operadora de saúde: ${error.message || JSON.stringify(error)}`, { variant: 'error' });
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
          onClick={() => navigate('/insurance')}
          sx={{ mr: 1 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {isEditMode ? 'Editar Operadora' : 'Nova Operadora'}
        </Typography>
      </Box>

      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <BusinessIcon sx={{ mr: 1 }} />
                Informações da Operadora
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Nome da Operadora"
                value={provider.name}
                onChange={handleChange}
                fullWidth
                required
                error={!!errors.name}
                helperText={errors.name}
                disabled={saving}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                name="ans_code"
                label="Código ANS"
                value={provider.ans_code}
                onChange={handleChange}
                fullWidth
                disabled={saving}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 2, display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1 }} />
                Informações de Contato
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                name="contact_name"
                label="Nome do Contato"
                value={provider.contact_name}
                onChange={handleChange}
                fullWidth
                disabled={saving}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                name="phone"
                label="Telefone"
                value={provider.phone}
                onChange={handleChange}
                fullWidth
                disabled={saving}
                InputProps={{
                  startAdornment: <PhoneIcon color="action" sx={{ mr: 1 }} />,
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                name="email"
                label="Email"
                type="email"
                value={provider.email}
                onChange={handleChange}
                fullWidth
                error={!!errors.email}
                helperText={errors.email}
                disabled={saving}
                InputProps={{
                  startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />,
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                name="address"
                label="Endereço"
                value={provider.address}
                onChange={handleChange}
                fullWidth
                multiline
                rows={2}
                disabled={saving}
                InputProps={{
                  startAdornment: <HomeIcon color="action" sx={{ mr: 1, alignSelf: 'flex-start', mt: 1 }} />,
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                name="notes"
                label="Observações"
                value={provider.notes}
                onChange={handleChange}
                fullWidth
                multiline
                rows={3}
                disabled={saving}
                InputProps={{
                  startAdornment: <NotesIcon color="action" sx={{ mr: 1, alignSelf: 'flex-start', mt: 1 }} />,
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/insurance')}
                disabled={saving}
                sx={{ mr: 2, borderRadius: 2 }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                sx={{ borderRadius: 2 }}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default InsuranceProviderForm;
