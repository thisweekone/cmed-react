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
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  LocalPharmacy as MedicineIcon, 
  ArrowBack as ArrowBackIcon,
  Business as BusinessIcon,
  Timeline as TimelineIcon,
  ShowChart as ShowChartIcon,
  AttachMoney as MoneyIcon,
  Bookmark as BookmarkIcon,
  Assessment as AssessmentIcon,
  Person as PersonIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { medicineService } from '../../services/medicines/medicineService';

const MedicineDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [medicine, setMedicine] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [priceAnalysis, setPriceAnalysis] = useState(null);
  
  useEffect(() => {
    loadData();
  }, [id]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      // Buscar dados do medicamento
      const medicineData = await medicineService.getById(id);
      
      if (!medicineData) {
        throw new Error('Medicamento não encontrado');
      }
      
      setMedicine(medicineData);
      
      // Buscar fornecedores do medicamento
      const suppliersData = await medicineService.getMedicineSuppliers(medicineData.id);
      setSuppliers(suppliersData);
      
      // Buscar pacientes que usam o medicamento
      const patientsData = await medicineService.getMedicinePatients(medicineData.id);
      setPatients(patientsData);
      
      // Buscar análise de preços
      const priceAnalysisData = await medicineService.getMedicinePriceAnalysis(medicineData.id);
      setPriceAnalysis(priceAnalysisData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Ocorreu um erro ao carregar os dados. Por favor, tente novamente.');
    } finally {
      setLoading(false);
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
        <MedicineIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h4" component="h1" gutterBottom>
          Detalhes do Medicamento
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" gutterBottom>
              {medicine?.produto}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {medicine?.laboratorio}
            </Typography>
          </Box>
          <Box>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(-1)}
            >
              Voltar
            </Button>
          </Box>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Informações do Medicamento
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Princípio Ativo
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {medicine?.substancia || '-'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Apresentação
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {medicine?.apresentacao || '-'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Classe Terapêutica
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {medicine?.classe_terapeutica || '-'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Tipo de Medicamento
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {medicine?.tipo_medicamento || '-'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Registro ANVISA
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {medicine?.registro_anvisa || '-'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Código GGREM
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {medicine?.ggrem || '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Informações de Preço CMED
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      PF 0%
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {medicine?.pf0 ? formatCurrency(medicine.pf0) : '-'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      PF 17%
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {medicine?.pf17 ? formatCurrency(medicine.pf17) : '-'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      PF 17,5%
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {medicine?.pf175 ? formatCurrency(medicine.pf175) : '-'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      PF 18%
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {medicine?.pf18 ? formatCurrency(medicine.pf18) : '-'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      PF 20%
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {medicine?.pf20 ? formatCurrency(medicine.pf20) : '-'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      PMC 0%
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {medicine?.pmc0 ? formatCurrency(medicine.pmc0) : '-'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      PMC 17%
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {medicine?.pmc17 ? formatCurrency(medicine.pmc17) : '-'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      PMC 18%
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {medicine?.pmc18 ? formatCurrency(medicine.pmc18) : '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {priceAnalysis && priceAnalysis.suppliers_count > 0 && (
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, boxShadow: 2, mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <AssessmentIcon sx={{ mr: 1 }} /> Análise de Preços
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', height: '100%', borderRadius: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Preço Médio
                      </Typography>
                      <Typography variant="h5" sx={{ mt: 1, color: 'primary.main' }}>
                        {formatCurrency(priceAnalysis.average_price)}
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', height: '100%', borderRadius: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Menor Preço
                      </Typography>
                      <Typography variant="h5" sx={{ mt: 1, color: 'success.main' }}>
                        {formatCurrency(priceAnalysis.min_price)}
                      </Typography>
                      {priceAnalysis.cheapest_supplier && (
                        <Typography variant="caption" display="block">
                          {priceAnalysis.cheapest_supplier.name}
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', height: '100%', borderRadius: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Maior Preço
                      </Typography>
                      <Typography variant="h5" sx={{ mt: 1, color: 'error.main' }}>
                        {formatCurrency(priceAnalysis.max_price)}
                      </Typography>
                      {priceAnalysis.most_expensive_supplier && (
                        <Typography variant="caption" display="block">
                          {priceAnalysis.most_expensive_supplier.name}
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', height: '100%', borderRadius: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Variação de Preço
                      </Typography>
                      <Typography variant="h5" sx={{ mt: 1 }}>
                        {priceAnalysis.price_variation.toFixed(2)}%
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', height: '100%', borderRadius: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Fornecedores
                      </Typography>
                      <Typography variant="h5" sx={{ mt: 1 }}>
                        {priceAnalysis.suppliers_count}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
        
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mt: 4 }}>
          <BusinessIcon sx={{ mr: 1 }} /> Fornecedores
        </Typography>
        
        {suppliers.length === 0 ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            Nenhum fornecedor encontrado para este medicamento.
          </Alert>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 1, borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.light' }}>
                  <TableCell>Fornecedor</TableCell>
                  <TableCell>Último Preço</TableCell>
                  <TableCell>Data da Cotação</TableCell>
                  <TableCell>Contato</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {suppliers
                  .sort((a, b) => (a.last_quote_price || Infinity) - (b.last_quote_price || Infinity))
                  .map((supplier, index) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {index === 0 && supplier.last_quote_price && (
                            <Chip 
                              label="Menor Preço" 
                              color="success" 
                              size="small" 
                              sx={{ mr: 1 }} 
                            />
                          )}
                          {supplier.name}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {supplier.last_quote_price 
                          ? formatCurrency(supplier.last_quote_price) 
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {supplier.last_quote_date 
                          ? formatDate(supplier.last_quote_date) 
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {supplier.phone || supplier.email || '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Histórico de Preços">
                          <IconButton 
                            color="primary"
                            component={Link}
                            to={`/medicines/${id}/suppliers/${supplier.id}/prices`}
                          >
                            <TimelineIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Detalhes do Fornecedor">
                          <IconButton 
                            color="info"
                            component={Link}
                            to={`/suppliers/${supplier.id}`}
                          >
                            <BusinessIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mt: 4 }}>
          <PersonIcon sx={{ mr: 1 }} /> Pacientes
        </Typography>
        
        {patients.length === 0 ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            Nenhum paciente encontrado para este medicamento.
          </Alert>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 1, borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.light' }}>
                  <TableCell>Nome</TableCell>
                  <TableCell>CPF</TableCell>
                  <TableCell>Convênio</TableCell>
                  <TableCell>Última Prescrição</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>{patient.name}</TableCell>
                    <TableCell>{patient.cpf}</TableCell>
                    <TableCell>
                      {patient.insurance_provider ? patient.insurance_provider.name : '-'}
                    </TableCell>
                    <TableCell>
                      {patient.last_prescription ? formatDate(patient.last_prescription) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Ver Paciente">
                        <IconButton 
                          color="primary"
                          component={Link}
                          to={`/patients/${patient.id}`}
                        >
                          <PersonIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Histórico de Prescrições">
                        <IconButton 
                          color="info"
                          component={Link}
                          to={`/patients/${patient.id}/prescriptions`}
                        >
                          <HistoryIcon />
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
    </Container>
  );
};

export default MedicineDetails;
