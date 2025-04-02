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
  Tooltip,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  People as PeopleIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { insuranceProviderService } from '../../services/insurance/insuranceProviderService';
import { useSnackbar } from 'notistack';
import ConfirmDialog from '../../components/ConfirmDialog';

const InsuranceProviderList = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState(null);
  
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async (filters = {}) => {
    try {
      setLoading(true);
      const options = {
        search: search,
        ...filters
      };
      const data = await insuranceProviderService.getAll(options);
      setProviders(data);
      setError(null);
    } catch (error) {
      console.error('Erro ao carregar operadoras:', error);
      setError('Falha ao carregar a lista de operadoras. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadProviders();
  };

  const handleClearSearch = () => {
    setSearch('');
    loadProviders({ search: '' });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteClick = (provider) => {
    setProviderToDelete(provider);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await insuranceProviderService.delete(providerToDelete.id);
      enqueueSnackbar('Operadora excluída com sucesso!', { variant: 'success' });
      loadProviders();
    } catch (error) {
      console.error('Erro ao excluir operadora:', error);
      enqueueSnackbar('Erro ao excluir operadora. Por favor, tente novamente.', { variant: 'error' });
    } finally {
      setDeleteDialogOpen(false);
      setProviderToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setProviderToDelete(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Operadoras de Saúde
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          component={Link}
          to="/insurance/create"
          sx={{ borderRadius: 2 }}
        >
          Nova Operadora
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <TextField
            label="Buscar operadora"
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

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : providers.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            Nenhuma operadora encontrada.
          </Alert>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Código ANS</TableCell>
                    <TableCell>Contato</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {providers
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((provider) => (
                      <TableRow key={provider.id} hover>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {provider.name}
                          </Typography>
                        </TableCell>
                        <TableCell>{provider.code || '-'}</TableCell>
                        <TableCell>
                          {provider.contact_name || provider.contact_email || provider.contact_phone ? (
                            <>
                              {provider.contact_name && <div>{provider.contact_name}</div>}
                              {provider.contact_email && <div>{provider.contact_email}</div>}
                              {provider.contact_phone && <div>{provider.contact_phone}</div>}
                            </>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Tooltip title="Visualizar">
                              <IconButton
                                color="info"
                                onClick={() => navigate(`/insurance/${provider.id}`)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Editar">
                              <IconButton
                                color="primary"
                                onClick={() => navigate(`/insurance/edit/${provider.id}`)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Pacientes">
                              <IconButton
                                color="success"
                                onClick={() => navigate(`/insurance/${provider.id}/patients`)}
                              >
                                <PeopleIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir">
                              <IconButton
                                color="error"
                                onClick={() => handleDeleteClick(provider)}
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
              count={providers.length}
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
        content={`Tem certeza que deseja excluir a operadora "${providerToDelete?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </Box>
  );
};

export default InsuranceProviderList;
