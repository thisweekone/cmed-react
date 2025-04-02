import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Divider,
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
  Tabs,
  Chip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  Notes as NotesIcon,
  People as PeopleIcon,
  ReceiptLong as ReceiptIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { insuranceProviderService } from '../../services/insurance/insuranceProviderService';
import { useSnackbar } from 'notistack';
import ConfirmDialog from '../../components/ConfirmDialog';

const InsuranceProviderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [provider, setProvider] = useState(null);
  const [patients, setPatients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    loadProvider();
  }, [id]);

  const loadProvider = async () => {
    try {
      setLoading(true);
      const providerData = await insuranceProviderService.getById(id);
      setProvider(providerData);
      
      // Carregar pacientes da operadora
      const patientsData = await insuranceProviderService.getPatients(id);
      setPatients(patientsData);
      
      // Carregar orçamentos da operadora
      const quotesData = await insuranceProviderService.getQuotes(id);
      setQuotes(quotesData);
      
      setError(null);
    } catch (error) {
      console.error('Erro ao carregar dados da operadora:', error);
      setError('Falha ao carregar dados da operadora. Por favor, tente novamente.');
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
      await insuranceProviderService.delete(id);
      enqueueSnackbar('Operadora excluída com sucesso!', { variant: 'success' });
      navigate('/insurance');
    } catch (error) {
      console.error('Erro ao excluir operadora:', error);
      enqueueSnackbar('Erro ao excluir operadora. Por favor, tente novamente.', { variant: 'error' });
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
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
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
          onClick={() => navigate('/insurance')}
          sx={{ mt: 2, borderRadius: 2 }}
        >
          Voltar para a lista
        </Button>
      </Box>
    );
  }

  if (!provider) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Operadora não encontrada.</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/insurance')}
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
            onClick={() => navigate('/insurance')}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Detalhes da Operadora
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/insurance/edit/${id}`)}
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
              <BusinessIcon sx={{ mr: 1 }} />
              {provider.name}
            </Typography>
            
            {provider.code && (
              <Chip
                label={`Código ANS: ${provider.code}`}
                color="primary"
                sx={{ mb: 2, borderRadius: 2 }}
              />
            )}
            
            <Grid container spacing={2}>
              {provider.contact_name && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
                    Contato:
                  </Typography>
                  <Typography variant="body1">
                    {provider.contact_name}
                  </Typography>
                </Grid>
              )}
              
              {provider.contact_phone && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <PhoneIcon fontSize="small" sx={{ mr: 0.5 }} />
                    Telefone:
                  </Typography>
                  <Typography variant="body1">
                    {provider.contact_phone}
                  </Typography>
                </Grid>
              )}
              
              {provider.contact_email && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <EmailIcon fontSize="small" sx={{ mr: 0.5 }} />
                    Email:
                  </Typography>
                  <Typography variant="body1">
                    {provider.contact_email}
                  </Typography>
                </Grid>
              )}
              
              {provider.address && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                      <HomeIcon fontSize="small" sx={{ mr: 0.5 }} />
                      Endereço:
                    </Typography>
                    <Typography variant="body1">
                      {provider.address}
                    </Typography>
                  </Grid>
                </>
              )}
              
              {provider.notes && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                      <NotesIcon fontSize="small" sx={{ mr: 0.5 }} />
                      Observações:
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                      {provider.notes}
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
                    Total de Pacientes:
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {patients.length}
                  </Typography>
                </Box>
                
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
                  startIcon={<PeopleIcon />}
                  component={Link}
                  to={`/patients/create?insuranceId=${id}`}
                  sx={{ mt: 1, borderRadius: 2 }}
                >
                  Novo Paciente
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
            icon={<PeopleIcon />} 
            label="Pacientes" 
            iconPosition="start"
          />
          <Tab 
            icon={<ReceiptIcon />} 
            label="Orçamentos" 
            iconPosition="start"
          />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {tabValue === 0 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Pacientes da Operadora
                </Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<PersonIcon />}
                  component={Link}
                  to={`/patients/create?insuranceId=${id}`}
                  sx={{ borderRadius: 2 }}
                >
                  Novo Paciente
                </Button>
              </Box>
              
              {patients.length === 0 ? (
                <Alert severity="info">
                  Esta operadora ainda não possui pacientes cadastrados.
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nome</TableCell>
                        <TableCell>Documento</TableCell>
                        <TableCell>Contato</TableCell>
                        <TableCell align="right">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {patients.map((patient) => (
                        <TableRow key={patient.id} hover>
                          <TableCell>
                            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                              {patient.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {patient.birth_date ? formatDate(patient.birth_date) : ''}
                            </Typography>
                          </TableCell>
                          <TableCell>{patient.document || '-'}</TableCell>
                          <TableCell>
                            {patient.phone && <div>{patient.phone}</div>}
                            {patient.email && <div>{patient.email}</div>}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Visualizar">
                              <IconButton
                                color="info"
                                onClick={() => navigate(`/patients/${patient.id}`)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Editar">
                              <IconButton
                                color="primary"
                                onClick={() => navigate(`/patients/edit/${patient.id}`)}
                              >
                                <EditIcon />
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
                Orçamentos da Operadora
              </Typography>
              
              {quotes.length === 0 ? (
                <Alert severity="info">
                  Esta operadora ainda não possui orçamentos.
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Data</TableCell>
                        <TableCell>Paciente</TableCell>
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
                            {quote.patients ? (
                              <Link to={`/patients/${quote.patient_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                  {quote.patients.name}
                                </Typography>
                              </Link>
                            ) : (
                              'Paciente não encontrado'
                            )}
                          </TableCell>
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
        </Box>
      </Paper>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Confirmar exclusão"
        content={`Tem certeza que deseja excluir a operadora "${provider.name}"? Esta ação não pode ser desfeita e pode afetar pacientes vinculados a esta operadora.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </Box>
  );
};

export default InsuranceProviderDetails;
