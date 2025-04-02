import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Tooltip,
  Tab,
  Tabs
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Home as HomeIcon,
  MedicalServices as MedicalIcon,
  Notes as NotesIcon,
  Receipt as ReceiptIcon,
  Add as AddIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { patientService } from '../../services/patients/patientService';
import { useSnackbar } from 'notistack';
import ConfirmDialog from '../../components/ConfirmDialog';

const PatientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [patient, setPatient] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    loadPatient();
  }, [id]);

  const loadPatient = async () => {
    try {
      setLoading(true);
      const patientData = await patientService.getById(id);
      setPatient(patientData);
      
      // Carregar orçamentos do paciente
      const quotesData = await patientService.getQuotes(id);
      setQuotes(quotesData);
      
      // Carregar medicamentos do paciente
      const medicinesData = await patientService.getMedicines(id);
      setMedicines(medicinesData);
      
      setError(null);
    } catch (error) {
      console.error('Erro ao carregar dados do paciente:', error);
      setError('Falha ao carregar dados do paciente. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await patientService.delete(id);
      enqueueSnackbar('Paciente excluído com sucesso!', { variant: 'success' });
      navigate('/patients');
    } catch (error) {
      console.error('Erro ao excluir paciente:', error);
      enqueueSnackbar('Erro ao excluir paciente. Por favor, tente novamente.', { variant: 'error' });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/patients')}
          sx={{ mt: 2, borderRadius: 2 }}
        >
          Voltar para a lista
        </Button>
      </Box>
    );
  }

  if (!patient) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Paciente não encontrado.</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/patients')}
          sx={{ mt: 2, borderRadius: 2 }}
        >
          Voltar para a lista
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            color="inherit"
            onClick={() => navigate('/patients')}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Detalhes do Paciente
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/patients/edit/${id}`)}
            sx={{ mr: 1, borderRadius: 2 }}
          >
            Editar
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteClick}
            sx={{ borderRadius: 2 }}
          >
            Excluir
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ mr: 1 }} />
              {patient.name}
            </Typography>
            
            {patient.insurance_providers && (
              <Chip
                label={patient.insurance_providers.name}
                color="primary"
                sx={{ mb: 2, borderRadius: 2 }}
              />
            )}
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Documento:
                </Typography>
                <Typography variant="body1">
                  {patient.document || '-'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Data de Nascimento:
                </Typography>
                <Typography variant="body1">
                  {patient.birth_date ? formatDate(patient.birth_date) : '-'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Gênero:
                </Typography>
                <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                  {patient.gender || '-'}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <PhoneIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Telefone:
                </Typography>
                <Typography variant="body1">
                  {patient.phone || '-'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <EmailIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Email:
                </Typography>
                <Typography variant="body1">
                  {patient.email || '-'}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <HomeIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Endereço:
                </Typography>
                <Typography variant="body1">
                  {patient.address || '-'}
                </Typography>
              </Grid>
              
              {patient.notes && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                      <NotesIcon fontSize="small" sx={{ mr: 0.5 }} />
                      Observações:
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                      {patient.notes}
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Resumo
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total de Orçamentos:
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {quotes.length}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Medicamentos Utilizados:
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {medicines.length}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Último Orçamento:
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {quotes.length > 0 ? formatDate(quotes[0].created_at) : '-'}
                  </Typography>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={<AddIcon />}
                  component={Link}
                  to={`/quotes/create?patientId=${id}`}
                  sx={{ mt: 1, borderRadius: 2 }}
                >
                  Novo Orçamento
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ borderRadius: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<ReceiptIcon />} 
            label="Orçamentos" 
            iconPosition="start"
          />
          <Tab 
            icon={<MedicalIcon />} 
            label="Medicamentos" 
            iconPosition="start"
          />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {tabValue === 0 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Orçamentos do Paciente
                </Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<AddIcon />}
                  component={Link}
                  to={`/quotes/create?patientId=${id}`}
                  sx={{ borderRadius: 2 }}
                >
                  Novo Orçamento
                </Button>
              </Box>
              
              {quotes.length === 0 ? (
                <Alert severity="info">
                  Este paciente ainda não possui orçamentos.
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Data</TableCell>
                        <TableCell>Medicamentos</TableCell>
                        <TableCell>Valor Total</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {quotes.map((quote) => (
                        <TableRow key={quote.id} hover>
                          <TableCell>{formatDate(quote.created_at)}</TableCell>
                          <TableCell>
                            {quote.quote_items && quote.quote_items.length > 0 ? (
                              <Box>
                                {quote.quote_items.map((item, index) => (
                                  <div key={item.id}>
                                    {item.medicamentos_base?.nome_produto || 'Medicamento não encontrado'}
                                    {index < quote.quote_items.length - 1 && ', '}
                                  </div>
                                ))}
                              </Box>
                            ) : (
                              'Nenhum medicamento'
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(quote.total_price)}</TableCell>
                          <TableCell>
                            <Chip
                              label={quote.status}
                              color={
                                quote.status === 'aprovado' ? 'success' :
                                quote.status === 'rejeitado' ? 'error' : 'default'
                              }
                              size="small"
                              sx={{ borderRadius: 2 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Visualizar">
                              <IconButton
                                color="info"
                                onClick={() => navigate(`/quotes/${quote.id}`)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
          
          {tabValue === 1 && (
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Medicamentos Utilizados
              </Typography>
              
              {medicines.length === 0 ? (
                <Alert severity="info">
                  Este paciente ainda não utiliza nenhum medicamento.
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {medicines.map((medicine) => (
                    <Grid item xs={12} sm={6} md={4} key={medicine.id}>
                      <Card sx={{ height: '100%', borderRadius: 2 }}>
                        <CardContent>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                            {medicine.nome_produto}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {medicine.apresentacao}
                          </Typography>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2">
                            <strong>Laboratório:</strong> {medicine.laboratorio}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Preço Fábrica:</strong> {formatCurrency(medicine.pf_sem_impostos)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          )}
        </Box>
      </Paper>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Confirmar exclusão"
        content={`Tem certeza que deseja excluir o paciente "${patient.name}"? Esta ação não pode ser desfeita e todos os orçamentos associados serão perdidos.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </Box>
  );
};

export default PatientDetails;
