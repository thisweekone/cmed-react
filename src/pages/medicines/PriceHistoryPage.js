import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Grid, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Card,
  CardContent,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import { 
  Timeline as TimelineIcon, 
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  ShowChart as ShowChartIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSnackbar } from 'notistack';
import { priceHistoryService } from '../../services/prices/priceHistoryService';
import { medicineService } from '../../services/medicines/medicineService';
import { supplierService } from '../../services/suppliers/supplierService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';

const PriceHistoryPage = () => {
  const { medicineId, supplierId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [medicineData, setMedicineData] = useState(null);
  const [supplierData, setSupplierData] = useState(null);
  const [medicineSupplierData, setMedicineSupplierData] = useState(null);
  const [priceStats, setPriceStats] = useState(null);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);
  const [formData, setFormData] = useState({
    price: '',
    quote_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });
  
  useEffect(() => {
    loadData();
  }, [medicineId, supplierId]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      // Buscar dados do medicamento
      const medicine = await medicineService.getById(medicineId);
      setMedicineData(medicine);
      
      // Buscar dados do fornecedor
      const supplier = await supplierService.getById(supplierId);
      setSupplierData(supplier);
      
      // Buscar relação medicamento-fornecedor
      const medicineSupplierId = await getMedicineSupplierID();
      
      if (medicineSupplierId) {
        setMedicineSupplierData({ id: medicineSupplierId });
        
        // Buscar histórico de preços
        const history = await priceHistoryService.getHistoryByMedicineSupplier(medicineSupplierId);
        setPriceHistory(history);
        
        // Buscar estatísticas de preço
        const stats = await priceHistoryService.getPriceStats(medicineSupplierId);
        setPriceStats(stats);
      } else {
        setError('Relação entre medicamento e fornecedor não encontrada');
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Ocorreu um erro ao carregar os dados. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  const getMedicineSupplierID = async () => {
    try {
      const { data, error } = await medicineService.getMedicineSupplierRelation(medicineId, supplierId);
      
      if (error) throw error;
      return data?.id || null;
    } catch (err) {
      console.error('Erro ao buscar relação medicamento-fornecedor:', err);
      return null;
    }
  };
  
  const handleOpenDialog = (price = null) => {
    if (price) {
      // Modo de edição
      setEditingPrice(price);
      setFormData({
        price: price.price,
        quote_date: format(new Date(price.quote_date), 'yyyy-MM-dd'),
        notes: price.notes || ''
      });
    } else {
      // Modo de adição
      setEditingPrice(null);
      setFormData({
        price: '',
        quote_date: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
      });
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPrice(null);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = async () => {
    if (!formData.price || !formData.quote_date) {
      enqueueSnackbar('Preço e data são campos obrigatórios', { variant: 'error' });
      return;
    }
    
    try {
      if (editingPrice) {
        // Atualizar registro existente
        await priceHistoryService.updatePriceRecord(editingPrice.id, {
          price: parseFloat(formData.price),
          quote_date: new Date(formData.quote_date),
          notes: formData.notes
        });
        
        enqueueSnackbar('Registro de preço atualizado com sucesso', { variant: 'success' });
      } else {
        // Adicionar novo registro
        await priceHistoryService.addPriceRecord({
          medicine_supplier_id: medicineSupplierData.id,
          price: parseFloat(formData.price),
          quote_date: new Date(formData.quote_date),
          notes: formData.notes
        });
        
        enqueueSnackbar('Novo preço registrado com sucesso', { variant: 'success' });
      }
      
      // Recarregar dados
      handleCloseDialog();
      loadData();
    } catch (err) {
      console.error('Erro ao salvar registro de preço:', err);
      enqueueSnackbar('Erro ao salvar registro de preço', { variant: 'error' });
    }
  };
  
  const handleDeletePrice = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este registro de preço?')) {
      try {
        await priceHistoryService.deletePriceRecord(id);
        enqueueSnackbar('Registro de preço excluído com sucesso', { variant: 'success' });
        
        // Recarregar dados
        loadData();
      } catch (err) {
        console.error('Erro ao excluir registro de preço:', err);
        enqueueSnackbar('Erro ao excluir registro de preço', { variant: 'error' });
      }
    }
  };
  
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch (err) {
      return 'Data inválida';
    }
  };
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`;
  };
  
  const getChartData = () => {
    // Ordenar por data (mais antiga para mais recente)
    const sortedData = [...priceHistory].sort((a, b) => 
      new Date(a.quote_date) - new Date(b.quote_date)
    );
    
    return sortedData.map(item => ({
      date: format(new Date(item.quote_date), 'dd/MM/yyyy'),
      price: item.price
    }));
  };
  
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
        >
          Voltar
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <TimelineIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h4" component="h1" gutterBottom>
          Histórico de Preços
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" gutterBottom>
              {medicineData?.name}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Fornecedor: {supplierData?.name}
            </Typography>
          </Box>
          <Box>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(-1)}
              sx={{ mr: 1 }}
            >
              Voltar
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Registrar Novo Preço
            </Button>
          </Box>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {/* Estatísticas de preço */}
        {priceStats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Último Preço
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1, fontWeight: 'bold', color: 'primary.main' }}>
                    {formatCurrency(priceStats.latest)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Preço Médio
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1, fontWeight: 'bold' }}>
                    {formatCurrency(priceStats.average)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Preço Mínimo
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1, fontWeight: 'bold', color: 'success.main' }}>
                    {formatCurrency(priceStats.min)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Preço Máximo
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1, fontWeight: 'bold', color: 'error.main' }}>
                    {formatCurrency(priceStats.max)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Variação
                  </Typography>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      mt: 1, 
                      fontWeight: 'bold',
                      color: priceStats.variation >= 0 ? 'error.main' : 'success.main'
                    }}
                  >
                    {formatPercentage(priceStats.variation)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total de Registros
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1, fontWeight: 'bold' }}>
                    {priceStats.count}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
        
        {/* Gráfico de evolução de preços */}
        {priceHistory.length > 1 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <ShowChartIcon sx={{ mr: 1 }} /> Evolução de Preços
            </Typography>
            <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 1 }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={getChartData()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)}
                    domain={['dataMin', 'dataMax']}
                  />
                  <ChartTooltip 
                    formatter={(value) => [formatCurrency(value), 'Preço']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    name="Preço" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Box>
        )}
        
        {/* Tabela de histórico de preços */}
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <TimelineIcon sx={{ mr: 1 }} /> Registros de Preço
        </Typography>
        
        {priceHistory.length === 0 ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            Nenhum registro de preço encontrado. Clique em "Registrar Novo Preço" para adicionar o primeiro registro.
          </Alert>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 1, borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.light' }}>
                  <TableCell>Data da Cotação</TableCell>
                  <TableCell>Preço</TableCell>
                  <TableCell>Observações</TableCell>
                  <TableCell>Data de Registro</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {priceHistory.map((price) => (
                  <TableRow key={price.id}>
                    <TableCell>{formatDate(price.quote_date)}</TableCell>
                    <TableCell>{formatCurrency(price.price)}</TableCell>
                    <TableCell>{price.notes || '-'}</TableCell>
                    <TableCell>{formatDate(price.created_at)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleOpenDialog(price)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeletePrice(price.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      
      {/* Diálogo para adicionar/editar preço */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPrice ? 'Editar Registro de Preço' : 'Registrar Novo Preço'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Preço (R$)"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  type="number"
                  inputProps={{ step: '0.01', min: '0' }}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Data da Cotação"
                  name="quote_date"
                  value={formData.quote_date}
                  onChange={handleInputChange}
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Observações"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingPrice ? 'Atualizar' : 'Registrar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PriceHistoryPage;
