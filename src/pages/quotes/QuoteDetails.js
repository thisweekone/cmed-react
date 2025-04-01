import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Container, Typography, Paper, Button, 
  Grid, Box, Chip, Divider, Card, CardContent,
  CircularProgress, Snackbar, Alert, IconButton,
  List, ListItem, ListItemText, ListItemIcon,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, InputAdornment, FormControl, Select, MenuItem
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  LocalPharmacy as MedicineIcon,
  Business as SupplierIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon,
  HealthAndSafety as HealthIcon,
  CalendarToday as CalendarIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { quoteService } from '../../services/quotes/quoteService';
import { formatCurrency } from '../../utils/formatters';

const QuoteDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [openPriceDialog, setOpenPriceDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  useEffect(() => {
    loadQuote();
  }, [id]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      const data = await quoteService.getById(id);
      setQuote(data);
      setNewStatus(data.status);
      setNewPrice(data.price?.toString() || '');
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
      showSnackbar('Erro ao carregar orçamento: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja excluir este orçamento?')) {
      try {
        await quoteService.delete(id);
        showSnackbar('Orçamento excluído com sucesso!', 'success');
        
        setTimeout(() => {
          navigate('/quotes');
        }, 2000);
      } catch (error) {
        console.error('Erro ao excluir orçamento:', error);
        showSnackbar('Erro ao excluir orçamento: ' + error.message, 'error');
      }
    }
  };

  const handleUpdateStatus = async () => {
    try {
      setSaving(true);
      
      await quoteService.updateStatus(id, newStatus);
      showSnackbar('Status atualizado com sucesso!', 'success');
      
      // Atualiza o status localmente
      setQuote(prev => ({ ...prev, status: newStatus }));
      
      setOpenStatusDialog(false);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      showSnackbar('Erro ao atualizar status: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePrice = async () => {
    try {
      setSaving(true);
      
      const price = parseFloat(newPrice.replace(',', '.'));
      
      await quoteService.updatePrice(id, price);
      showSnackbar('Preço atualizado com sucesso!', 'success');
      
      // Atualiza o preço localmente
      setQuote(prev => ({ ...prev, price }));
      
      setOpenPriceDialog(false);
    } catch (error) {
      console.error('Erro ao atualizar preço:', error);
      showSnackbar('Erro ao atualizar preço: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'pendente':
        return <Chip label="Pendente" color="warning" />;
      case 'aprovado':
        return <Chip label="Aprovado" color="success" />;
      case 'rejeitado':
        return <Chip label="Rejeitado" color="error" />;
      default:
        return <Chip label={status} color="default" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!quote) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="h6">Orçamento não encontrado</Typography>
          <Button 
            component={Link} 
            to="/quotes" 
            variant="contained" 
            sx={{ mt: 2, borderRadius: 2 }}
            startIcon={<ArrowBackIcon />}
          >
            Voltar para Lista
          </Button>
        </Paper>
      </Container>
    );
  }

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
        <Typography variant="h5" component="h1" sx={{ flexGrow: 1, fontWeight: 'medium' }}>
          Detalhes do Orçamento
        </Typography>
        <Button 
          variant="outlined" 
          color="error" 
          startIcon={<DeleteIcon />} 
          onClick={handleDelete}
          sx={{ borderRadius: 2, ml: 1 }}
        >
          Excluir
        </Button>
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
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 'medium' }}>
                  Orçamento #{id.substring(0, 8)}
                </Typography>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    ml: 2,
                    cursor: 'pointer',
                    '&:hover': {
                      '& .MuiChip-root': {
                        boxShadow: 2
                      },
                      '& .MuiSvgIcon-root': {
                        opacity: 1
                      }
                    }
                  }}
                  onClick={() => setOpenStatusDialog(true)}
                >
                  {getStatusChip(quote.status)}
                  <EditIcon 
                    fontSize="small" 
                    sx={{ ml: 0.5, opacity: 0.6, transition: 'opacity 0.2s' }} 
                  />
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                <CalendarIcon fontSize="small" sx={{ mr: 0.5 }} />
                Criado em: {formatDate(quote.created_at)}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          <Grid item xs={12} md={6}>
            <Card 
              sx={{ 
                height: '100%',
                borderRadius: 2, 
                boxShadow: 1,
                bgcolor: 'background.default'
              }}
            >
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  <PersonIcon sx={{ mr: 1 }} />
                  Informações do Paciente
                </Typography>
                
                <List dense disablePadding>
                  <ListItem disableGutters>
                    <ListItemText 
                      primary="Nome do Paciente" 
                      secondary={quote.patient_name} 
                      primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                      secondaryTypographyProps={{ variant: 'body1' }}
                    />
                  </ListItem>
                  
                  <ListItem disableGutters>
                    <ListItemText 
                      primary="Operadora de Saúde" 
                      secondary={quote.insurance_provider} 
                      primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                      secondaryTypographyProps={{ variant: 'body1' }}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card 
              sx={{ 
                height: '100%',
                borderRadius: 2, 
                boxShadow: 1,
                bgcolor: 'background.default'
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                    <MoneyIcon sx={{ mr: 1 }} />
                    Valor do Orçamento
                  </Typography>
                  <IconButton 
                    size="small" 
                    color="primary"
                    onClick={() => setOpenPriceDialog(true)}
                    title="Editar preço"
                  >
                    <EditIcon />
                  </IconButton>
                </Box>
                
                <Typography variant="h4" sx={{ mt: 2, mb: 1, color: 'primary.main', fontWeight: 'medium' }}>
                  {formatCurrency(quote.price)}
                </Typography>
                
                <Typography variant="body2" color="text.secondary">
                  {quote.status === 'aprovado' 
                    ? 'Orçamento aprovado' 
                    : quote.status === 'rejeitado'
                      ? 'Orçamento rejeitado'
                      : 'Orçamento pendente de aprovação'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card 
              sx={{ 
                height: '100%',
                borderRadius: 2, 
                boxShadow: 1,
                bgcolor: 'background.default'
              }}
            >
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  <MedicineIcon sx={{ mr: 1 }} />
                  Medicamento
                </Typography>
                
                {quote.medicamentos_base ? (
                  <>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {quote.medicamentos_base.nome_produto}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {quote.medicamentos_base.apresentacao}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {quote.medicamentos_base.laboratorio}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <MoneyIcon color="primary" sx={{ mr: 1, fontSize: 20 }} />
                      <Typography variant="body1">
                        {formatCurrency(quote.medicamentos_base.pf_sem_impostos)}
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          (Preço de fábrica)
                        </Typography>
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Typography variant="body1" color="text.secondary">
                    Medicamento não encontrado
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card 
              sx={{ 
                height: '100%',
                borderRadius: 2, 
                boxShadow: 1,
                bgcolor: 'background.default'
              }}
            >
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  <SupplierIcon sx={{ mr: 1 }} />
                  Fornecedor
                </Typography>
                
                {quote.suppliers ? (
                  <>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {quote.suppliers.name}
                    </Typography>
                    
                    {quote.suppliers.email && (
                      <Typography variant="body2" color="text.secondary">
                        Email: {quote.suppliers.email}
                      </Typography>
                    )}
                    
                    {quote.suppliers.phone && (
                      <Typography variant="body2" color="text.secondary">
                        Telefone: {quote.suppliers.phone}
                      </Typography>
                    )}
                    
                    {quote.suppliers.address && (
                      <Typography variant="body2" color="text.secondary">
                        Endereço: {quote.suppliers.address}
                      </Typography>
                    )}
                    
                    <Button 
                      component={Link} 
                      to={`/suppliers/${quote.supplier_id}`} 
                      variant="outlined" 
                      size="small"
                      sx={{ mt: 2, borderRadius: 2 }}
                    >
                      Ver Fornecedor
                    </Button>
                  </>
                ) : (
                  <Typography variant="body1" color="text.secondary">
                    Fornecedor não encontrado
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Dialog para atualizar status */}
      <Dialog 
        open={openStatusDialog} 
        onClose={() => setOpenStatusDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Atualizar Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            >
              <MenuItem value="pendente">Pendente</MenuItem>
              <MenuItem value="aprovado">Aprovado</MenuItem>
              <MenuItem value="rejeitado">Rejeitado</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setOpenStatusDialog(false)} 
            variant="outlined"
            sx={{ borderRadius: 2 }}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleUpdateStatus} 
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={saving}
            sx={{ borderRadius: 2 }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
            {saving && <CircularProgress size={24} sx={{ ml: 1 }} />}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para atualizar preço */}
      <Dialog 
        open={openPriceDialog} 
        onClose={() => setOpenPriceDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Atualizar Preço</DialogTitle>
        <DialogContent>
          <TextField
            label="Novo Preço"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            fullWidth
            margin="normal"
            type="text"
            InputProps={{
              startAdornment: <InputAdornment position="start">R$</InputAdornment>,
            }}
            sx={{ 
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
          
          <Typography variant="caption" color="text.secondary">
            Preço atual: {formatCurrency(quote.price)}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setOpenPriceDialog(false)} 
            variant="outlined"
            sx={{ borderRadius: 2 }}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleUpdatePrice} 
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!newPrice || saving}
            sx={{ borderRadius: 2 }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
            {saving && <CircularProgress size={24} sx={{ ml: 1 }} />}
          </Button>
        </DialogActions>
      </Dialog>

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

export default QuoteDetails;
