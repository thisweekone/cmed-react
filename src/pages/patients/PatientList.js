import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  MedicalServices as MedicalIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { patientService } from '../../services/patients/patientService';
import { insuranceProviderService } from '../../services/insurance/insuranceProviderService';
import { useSnackbar } from 'notistack';
import ConfirmDialog from '../../components/ConfirmDialog';

const PatientList = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  useEffect(() => {
    loadPatients();
    loadProviders();
  }, [page, rowsPerPage]);

  const loadPatients = async (filters = {}) => {
    try {
      setLoading(true);
      const options = {
        search: search,
        insuranceProviderId: selectedProvider || undefined,
        page: page,
        pageSize: rowsPerPage,
        ...filters
      };
      const result = await patientService.getAll(options);
      setPatients(result.data || []);
      setTotalCount(result.totalCount || 0);
      setError(null);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      setError('Falha ao carregar a lista de pacientes. Por favor, tente novamente.');
      setPatients([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const data = await insuranceProviderService.getAll();
      setProviders(data || []);
    } catch (error) {
      console.error('Erro ao carregar operadoras:', error);
      setProviders([]);
    }
  };

  const handleSearch = () => {
    setPage(0); // Voltar para a primeira página ao pesquisar
    loadPatients({ page: 0 });
  };

  const handleClearSearch = () => {
    setSearch('');
    setSelectedProvider('');
    setPage(0); // Voltar para a primeira página ao limpar a pesquisa
    loadPatients({ search: '', insuranceProviderId: undefined, page: 0 });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  const handleProviderFilter = (providerId) => {
    setSelectedProvider(providerId);
    setPage(0); // Voltar para a primeira página ao filtrar
    loadPatients({ insuranceProviderId: providerId, page: 0 });
  };

  const handleDeleteClick = (patient) => {
    setPatientToDelete(patient);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await patientService.delete(patientToDelete.id);
      enqueueSnackbar('Paciente excluído com sucesso!', { variant: 'success' });
      loadPatients({ page: 0 }); // Recarregar a primeira página após excluir
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Pacientes
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          component={Link}
          to="/patients/create"
          sx={{ borderRadius: 2 }}
        >
          Novo Paciente
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
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
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {providers.map(provider => (
              <Chip
                key={provider.id}
                label={provider.name}
                onClick={() => handleProviderFilter(provider.id)}
                color={selectedProvider === provider.id ? 'primary' : 'default'}
                variant={selectedProvider === provider.id ? 'filled' : 'outlined'}
                sx={{ borderRadius: 2 }}
              />
            ))}
            {selectedProvider && (
              <Chip
                label="Limpar filtros"
                onClick={handleClearSearch}
                variant="outlined"
                color="secondary"
                sx={{ borderRadius: 2 }}
              />
            )}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : patients.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            Nenhum paciente encontrado.
          </Alert>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>CPF</TableCell>
                    <TableCell>Contato</TableCell>
                    <TableCell>Operadora</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.id} hover>
                      <TableCell>{patient.name}</TableCell>
                      <TableCell>{patient.cpf || '-'}</TableCell>
                      <TableCell>
                        {patient.phone || patient.email ? (
                          <>
                            {patient.phone && <div>{patient.phone}</div>}
                            {patient.email && <div>{patient.email}</div>}
                          </>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {patient.insurance_providers ? (
                          <Chip 
                            label={patient.insurance_providers.name} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                            sx={{ borderRadius: 2 }}
                          />
                        ) : (
                          '-'
                        )}
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
                          <Tooltip title="Medicamentos">
                            <IconButton
                              color="success"
                              onClick={() => navigate(`/patients/${patient.id}/medicines`)}
                            >
                              <MedicalIcon />
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
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={totalCount}
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

export default PatientList;
