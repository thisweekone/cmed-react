import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { insuranceProviderService } from '../../services/insurance/insuranceProviderService';
import { patientService } from '../../services/patients/patientService';
import { useSnackbar } from 'notistack';
import ConfirmDialog from '../../components/ConfirmDialog';

const InsuranceProviderPatients = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [provider, setProvider] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar dados da operadora
      const providerData = await insuranceProviderService.getById(id);
      setProvider(providerData);
      
      // Carregar pacientes da operadora
      const patientsData = await insuranceProviderService.getPatients(id);
      setPatients(patientsData);
      
      setError(null);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Falha ao carregar dados. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // Implementar busca filtrada no futuro
    loadData();
  };

  const handleClearSearch = () => {
    setSearch('');
    loadData();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteClick = (patient) => {
    setPatientToDelete(patient);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await patientService.delete(patientToDelete.id);
      enqueueSnackbar('Paciente excluído com sucesso!', { variant: 'success' });
      loadData();
    } catch (error) {
      console.error('Erro ao excluir paciente:', error);
      enqueueSnackbar('Erro ao excluir paciente. Por favor, tente novamente.', { variant: 'error' });
    } finally {
      setDeleteDialogOpen(false);
      setPatientToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setPatientToDelete(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      return dateString;
    }
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
            onClick={() => navigate(`/insurance/${id}`)}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Pacientes da Operadora
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          component={Link}
          to={`/patients/create?insuranceId=${id}`}
          sx={{ borderRadius: 2 }}
        >
          Novo Paciente
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <BusinessIcon color="primary" sx={{ fontSize: 32, mr: 2 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'medium' }}>
              {provider.name}
            </Typography>
            {provider.code && (
              <Typography variant="body2" color="text.secondary">
                Código ANS: {provider.code}
              </Typography>
            )}
          </Box>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <TextField
            label="Buscar paciente"
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ flexGrow: 1, minWidth: '200px' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          
          <Button
            variant="outlined"
            onClick={handleSearch}
            sx={{ borderRadius: 2 }}
          >
            Buscar
          </Button>
        </Box>

        {patients.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            Esta operadora ainda não possui pacientes cadastrados.
          </Alert>
        ) : (
          <>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Total de pacientes: <Chip label={patients.length} color="primary" size="small" sx={{ ml: 1 }} />
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Documento</TableCell>
                    <TableCell>Data de Nascimento</TableCell>
                    <TableCell>Contato</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {patients
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((patient) => (
                      <TableRow key={patient.id} hover>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {patient.name}
                          </Typography>
                          {patient.gender && (
                            <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                              {patient.gender}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{patient.document || '-'}</TableCell>
                        <TableCell>{patient.birth_date ? formatDate(patient.birth_date) : '-'}</TableCell>
                        <TableCell>
                          {patient.phone && <div>{patient.phone}</div>}
                          {patient.email && <div>{patient.email}</div>}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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
                            <Tooltip title="Excluir">
                              <IconButton
                                color="error"
                                onClick={() => handleDeleteClick(patient)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={patients.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Linhas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </>
        )}
      </Paper>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Confirmar exclusão"
        content={`Tem certeza que deseja excluir o paciente "${patientToDelete?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </Box>
  );
};

export default InsuranceProviderPatients;
