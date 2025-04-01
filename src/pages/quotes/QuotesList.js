import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Paper, Button, 
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, IconButton, TextField,
  Box, Chip, Snackbar, Alert, CircularProgress,
  Tabs, Tab, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { quoteService } from '../../services/quotes/quoteService';
import { formatCurrency } from '../../utils/formatters';

const QuotesList = () => {
  const [quotes, setQuotes] = useState([]);
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadQuotes();
  }, []);

  useEffect(() => {
    filterQuotes();
  }, [searchTerm, statusFilter, quotes, tabValue]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const data = await quoteService.getAll();
      setQuotes(data);
      setFilteredQuotes(data);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
      showSnackbar('Erro ao carregar orçamentos: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterQuotes = () => {
    let filtered = [...quotes];
    
    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(quote => quote.status === statusFilter);
    }
    
    // Filtro por abas (recentes, antigos)
    if (tabValue === 0) { // Recentes (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(quote => new Date(quote.created_at) >= thirtyDaysAgo);
    } else if (tabValue === 1) { // Antigos (mais de 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(quote => new Date(quote.created_at) < thirtyDaysAgo);
    }
    
    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(quote => 
        (quote.patient_name && quote.patient_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (quote.insurance_provider && quote.insurance_provider.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (quote.medicamentos_base?.nome_produto && quote.medicamentos_base.nome_produto.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (quote.suppliers?.name && quote.suppliers.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setFilteredQuotes(filtered);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este orçamento?')) {
      try {
        await quoteService.delete(id);
        showSnackbar('Orçamento excluído com sucesso!', 'success');
        loadQuotes();
      } catch (error) {
        console.error('Erro ao excluir orçamento:', error);
        showSnackbar('Erro ao excluir orçamento: ' + error.message, 'error');
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await quoteService.updateStatus(id, newStatus);
      showSnackbar('Status atualizado com sucesso!', 'success');
      
      // Atualiza o status localmente
      setQuotes(prev => prev.map(quote => 
        quote.id === id ? { ...quote, status: newStatus } : quote
      ));
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      showSnackbar('Erro ao atualizar status: ' + error.message, 'error');
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'pendente':
        return <Chip label="Pendente" color="warning" size="small" />;
      case 'aprovado':
        return <Chip label="Aprovado" color="success" size="small" />;
      case 'rejeitado':
        return <Chip label="Rejeitado" color="error" size="small" />;
      default:
        return <Chip label={status} color="default" size="small" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 'medium' }}>
            Orçamentos
            {filteredQuotes.length > 0 && (
              <Chip 
                label={`${filteredQuotes.length} orçamentos`} 
                color="primary" 
                size="small" 
                sx={{ ml: 2, borderRadius: 1 }} 
              />
            )}
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            component={Link} 
            to="/quotes/new"
            sx={{ borderRadius: 2 }}
          >
            Novo Orçamento
          </Button>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{ mb: 2 }}
          >
            <Tab label="Recentes (30 dias)" />
            <Tab label="Antigos" />
            <Tab label="Todos" />
          </Tabs>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Buscar orçamento"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ 
                flexGrow: 1,
                maxWidth: { xs: '100%', sm: 300 },
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
              }}
            />
            
            <FormControl 
              size="small" 
              sx={{ 
                minWidth: 150,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            >
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
                startAdornment={<FilterIcon color="action" sx={{ mr: 1 }} />}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="pendente">Pendente</MenuItem>
                <MenuItem value="aprovado">Aprovado</MenuItem>
                <MenuItem value="rejeitado">Rejeitado</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredQuotes.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2, bgcolor: 'background.default' }}>
            <Typography variant="body1">
              {searchTerm || statusFilter !== 'all' 
                ? 'Nenhum orçamento encontrado para os filtros selecionados.' 
                : 'Nenhum orçamento cadastrado.'}
            </Typography>
            {!searchTerm && statusFilter === 'all' && (
              <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                component={Link} 
                to="/quotes/new"
                sx={{ mt: 2, borderRadius: 2 }}
              >
                Criar Orçamento
              </Button>
            )}
          </Paper>
        ) : (
          <TableContainer component={Paper} sx={{ 
            boxShadow: 1, 
            borderRadius: 2,
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '4px',
            }
          }}>
            <Table sx={{ minWidth: 650 }} size="medium">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Paciente</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Operadora</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Medicamento</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Fornecedor</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Valor</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Data</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredQuotes.map((quote) => (
                  <TableRow 
                    key={quote.id}
                    hover
                    sx={{
                      '&:nth-of-type(odd)': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <TableCell component="th" scope="row">
                      {quote.patient_name}
                    </TableCell>
                    <TableCell>{quote.insurance_provider}</TableCell>
                    <TableCell>
                      {quote.medicamentos_base?.nome_produto || 'N/A'}
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        {quote.medicamentos_base?.apresentacao || ''}
                      </Typography>
                    </TableCell>
                    <TableCell>{quote.suppliers?.name || 'N/A'}</TableCell>
                    <TableCell>{formatCurrency(quote.price)}</TableCell>
                    <TableCell>
                      <FormControl 
                        size="small" 
                        fullWidth
                        sx={{ 
                          minWidth: 120,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2
                          }
                        }}
                      >
                        <Select
                          value={quote.status}
                          onChange={(e) => handleStatusChange(quote.id, e.target.value)}
                          displayEmpty
                          renderValue={(value) => getStatusChip(value)}
                          variant="outlined"
                        >
                          <MenuItem value="pendente">Pendente</MenuItem>
                          <MenuItem value="aprovado">Aprovado</MenuItem>
                          <MenuItem value="rejeitado">Rejeitado</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>{formatDate(quote.created_at)}</TableCell>
                    <TableCell align="right">
                      <IconButton 
                        color="info" 
                        component={Link} 
                        to={`/quotes/${quote.id}`}
                        title="Ver detalhes"
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        onClick={() => handleDelete(quote.id)}
                        title="Excluir orçamento"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

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

export default QuotesList;
