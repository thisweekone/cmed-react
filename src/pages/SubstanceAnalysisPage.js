import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { supplierService } from '../services/supplierService';
import {
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Autocomplete,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  useTheme,
  useMediaQuery,
  Chip,
  Tooltip,
  IconButton,
  Button,
  Badge,
  Link
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Balance as BalanceIcon,
  Info as InfoIcon,
  Analytics as AnalyticsIcon,
  Chat as ChatIcon,
  Store as StoreIcon,
  LocalOffer as LocalOfferIcon
} from '@mui/icons-material';
import AnalysisChatbot from '../components/AnalysisChatbot';

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <Card sx={{ 
    height: '100%', 
    boxShadow: 3, 
    borderRadius: 2,
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: 6
    }
  }}>
    <CardContent sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography color="textSecondary" gutterBottom variant="subtitle1" fontWeight="medium">
          {title}
        </Typography>
        {Icon && <Icon style={{ color, fontSize: 28 }} />}
      </Box>
      <Typography variant="h4" component="div" sx={{ mt: 1 }}>
        {typeof value === 'number' ? value.toLocaleString('pt-BR', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        }) : value}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const SubstanceAnalysisPage = () => {
  const navigate = useNavigate();
  const [substances, setSubstances] = useState([]);
  const [selectedSubstance, setSelectedSubstance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [stats, setStats] = useState({
    general: {
      mean: 0,
      median: 0,
      max: 0,
      min: 0,
      adjustmentComparison: 0,
      cheapest: { name: '', price: 0 },
      expensive: { name: '', price: 0 }
    },
    byType: [],
    byPresentation: []
  });
  const [medicineList, setMedicineList] = useState([]);
  const [suppliersList, setSuppliersList] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const handleChatOpen = (type, value) => {
    setChatContext({ type, value });
    setChatOpen(true);
  };

  const renderStatCard = (title, value) => (
    <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" component="div" fontWeight="medium" color="textSecondary">
          {title}
        </Typography>
        <Typography variant="h4" component="div" sx={{ mt: 1 }}>
          R$ {value.toFixed(2)}
        </Typography>
      </CardContent>
    </Card>
  );

  useEffect(() => {
    loadSubstances();
  }, []);

  useEffect(() => {
    if (selectedSubstance) {
      loadAnalysis(selectedSubstance);
      loadSuppliers(selectedSubstance);
    }
  }, [selectedSubstance]);

  const loadSubstances = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('medicamentos_base')
        .select('substancia')
        .not('substancia', 'is', null);

      if (searchTerm) {
        query = query.or(`substancia.ilike.%${searchTerm}%,produto.ilike.%${searchTerm}%,laboratorio.ilike.%${searchTerm}%`);
      }

      query = query.order('substancia');

      const { data, error } = await query;

      if (error) throw error;

      const uniqueSubstances = [...new Set(
        data
          .map(item => item.substancia?.trim())
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b, 'pt-BR'));

      setSubstances(uniqueSubstances);
    } catch (error) {
      console.error('Erro ao carregar substâncias:', error);
      setError(error.message);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar lista de substâncias: ' + error.message,
        severity: 'error'
      });
      setSubstances([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysis = async (substance) => {
    if (!substance) return;
    
    try {
      setLoading(true);
      setError(null);

      console.log('Buscando medicamentos para:', substance);

      // Buscar medicamentos com seus preços mais recentes
      const { data, error } = await supabase
        .from('medicamentos_base')
        .select(`
          id,
          substancia,
          produto,
          apresentacao,
          tipo_de_produto,
          precos_historico (
            pf_sem_impostos,
            data_publicacao
          )
        `)
        .eq('substancia', substance)
        .order('id');

      if (error) {
        console.error('Erro na consulta:', error);
        throw error;
      }

      console.log('Dados recebidos:', data);

      if (!data || data.length === 0) {
        throw new Error('Nenhum medicamento encontrado para esta substância');
      }

      // Processar os dados para pegar o preço mais recente de cada medicamento
      const processedData = data.map(med => ({
        ...med,
        pf_sem_impostos: med.precos_historico?.length > 0 
          ? med.precos_historico.reduce((latest, price) => {
              if (!latest || new Date(price.data_publicacao) > new Date(latest.data_publicacao)) {
                return price;
              }
              return latest;
            }, null)?.pf_sem_impostos
          : 0
      }));

      console.log('Dados processados:', processedData);

      // Extrair apenas os preços válidos (não nulos e numéricos)
      const validPrices = processedData
        .map(med => Number(med.pf_sem_impostos))
        .filter(price => !isNaN(price) && price !== null && price > 0);

      console.log('Preços válidos:', validPrices);

      // Calcular estatísticas
      const stats = {
        general: {
          mean: calculateMean(validPrices),
          median: calculateMedian(validPrices),
          max: validPrices.length > 0 ? Math.max(...validPrices) : 0,
          min: validPrices.length > 0 ? Math.min(...validPrices) : 0,
          cheapest: processedData.reduce((acc, med) => {
            const price = Number(med.pf_sem_impostos);
            return (!acc || (price && price < Number(acc.pf_sem_impostos))) ? med : acc;
          }, null),
          expensive: processedData.reduce((acc, med) => {
            const price = Number(med.pf_sem_impostos);
            return (!acc || (price && price > Number(acc.pf_sem_impostos))) ? med : acc;
          }, null)
        },
        byType: Object.entries(
          processedData.reduce((acc, med) => {
            const type = med.tipo_de_produto || 'Não especificado';
            if (!acc[type]) {
              acc[type] = {
                prices: [],
                meds: []
              };
            }
            const price = Number(med.pf_sem_impostos);
            if (!isNaN(price) && price !== null && price > 0) {
              acc[type].prices.push(price);
            }
            acc[type].meds.push(med);
            return acc;
          }, {})
        ).map(([tipo, stats]) => ({
          tipo,
          mean: calculateMean(stats.prices),
          median: calculateMedian(stats.prices),
          max: stats.prices.length > 0 ? Math.max(...stats.prices) : 0,
          min: stats.prices.length > 0 ? Math.min(...stats.prices) : 0,
          count: stats.prices.length
        })),
        byPresentation: Object.entries(
          processedData.reduce((acc, med) => {
            const presentation = med.apresentacao || 'Não especificada';
            if (!acc[presentation]) {
              acc[presentation] = {
                count: 0,
                prices: [],
                meds: []
              };
            }
            const price = Number(med.pf_sem_impostos);
            if (!isNaN(price) && price !== null && price > 0) {
              acc[presentation].prices.push(price);
            }
            acc[presentation].count++;
            acc[presentation].meds.push(med);
            return acc;
          }, {})
        ).map(([apresentacao, stats]) => ({
          apresentacao,
          count: stats.count,
          mean: calculateMean(stats.prices),
          median: calculateMedian(stats.prices),
          min: stats.prices.length > 0 ? {
            price: Math.min(...stats.prices),
            product: stats.meds.find(med => Number(med.pf_sem_impostos) === Math.min(...stats.prices))?.produto
          } : null,
          max: stats.prices.length > 0 ? {
            price: Math.max(...stats.prices),
            product: stats.meds.find(med => Number(med.pf_sem_impostos) === Math.max(...stats.prices))?.produto
          } : null
        })).sort((a, b) => b.count - a.count)
      };

      console.log('Estatísticas calculadas:', stats);

      setStats(stats);
      setMedicineList(processedData);
      
    } catch (error) {
      console.error('Erro ao carregar análise:', error);
      setError(error.message);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar análise: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async (substance) => {
    if (!substance) return;
    
    try {
      setLoadingSuppliers(true);
      setError(null);
      
      const suppliers = await supplierService.getSuppliersBySubstance(substance);
      setSuppliersList(suppliers);
      
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
      setError('Erro ao carregar fornecedores: ' + error.message);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar fornecedores: ' + error.message,
        severity: 'error'
      });
      setSuppliersList([]);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const handleNavigateToSupplier = (supplierId) => {
    // Abrir em uma nova guia
    window.open(`/suppliers/${supplierId}`, '_blank');
  };

  // Funções auxiliares para cálculos estatísticos
  const calculateMean = (numbers) => {
    if (!numbers || numbers.length === 0) return 0;
    const validNumbers = numbers.filter(n => !isNaN(n) && n !== null);
    if (validNumbers.length === 0) return 0;
    const sum = validNumbers.reduce((acc, val) => acc + val, 0);
    return sum / validNumbers.length;
  };

  const calculateMedian = (numbers) => {
    if (!numbers || numbers.length === 0) return 0;
    const validNumbers = numbers.filter(n => !isNaN(n) && n !== null);
    if (validNumbers.length === 0) return 0;
    const sorted = [...validNumbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    return sorted[middle];
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const formatCurrency = (value) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatNumber = (value, decimals = 2) => {
    if (value === undefined || value === null) return '0';
    return Number(value).toFixed(decimals);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper 
            sx={{ 
              p: { xs: 2, md: 3 }, 
              display: 'flex', 
              flexDirection: 'column', 
              borderRadius: 2, 
              boxShadow: 3,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '4px',
                backgroundColor: 'primary.main'
              }
            }}
          >
            <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
              Análise por Substância
              <Tooltip title="Selecione uma substância para visualizar análises detalhadas de preços e estatísticas">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
            <Autocomplete
              options={substances || []}
              loading={loading}
              value={selectedSubstance}
              onChange={(event, newValue) => {
                setSelectedSubstance(newValue);
                if (newValue) {
                  loadAnalysis(newValue);
                }
              }}
              onInputChange={(event, newInputValue) => {
                setSearchTerm(newInputValue || '');
                loadSubstances();
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Selecione a Substância"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: 'primary.main',
                      },
                    }
                  }}
                />
              )}
              getOptionLabel={(option) => option || ''}
              isOptionEqualToValue={(option, value) => option === value}
              filterOptions={(options, { inputValue }) => {
                const inputValueLower = (inputValue || '').toLowerCase();
                return (options || []).filter(option => 
                  option && option.toLowerCase().includes(inputValueLower)
                );
              }}
              autoHighlight
              autoSelect
            />
          </Paper>
        </Grid>

        {loading && (
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress size={60} thickness={4} />
          </Grid>
        )}

        {stats && !loading && (
          <>
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                mb: 2 
              }}>
                <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                  Visão Geral de {selectedSubstance}
                </Typography>
                <Chip 
                  label={`${medicineList.length} medicamentos encontrados`} 
                  color="primary" 
                  size="small"
                  sx={{ 
                    borderRadius: 1,
                    fontWeight: 'medium',
                    mt: { xs: 1, sm: 0 }
                  }} 
                />
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard 
                    title="Preço Médio" 
                    value={stats.general.mean} 
                    icon={MoneyIcon} 
                    color={theme.palette.primary.main}
                    subtitle="Média de todos os medicamentos"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard 
                    title="Preço Mediano" 
                    value={stats.general.median} 
                    icon={BalanceIcon} 
                    color={theme.palette.info.main}
                    subtitle="Valor central da distribuição"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard 
                    title="Menor Preço" 
                    value={stats.general.min} 
                    icon={TrendingDownIcon} 
                    color={theme.palette.success.main}
                    subtitle={stats.general.cheapest?.name ? `${stats.general.cheapest.name.substring(0, 20)}...` : ''}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard 
                    title="Maior Preço" 
                    value={stats.general.max} 
                    icon={TrendingUpIcon} 
                    color={theme.palette.error.main}
                    subtitle={stats.general.expensive?.name ? `${stats.general.expensive.name.substring(0, 20)}...` : ''}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12} sx={{ mt: 3 }}>
              <Paper sx={{ 
                p: { xs: 2, md: 3 }, 
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
                  backgroundColor: 'info.main'
                }
              }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  Análise por Tipo
                  <Chip 
                    label={`${stats.byType.length} tipos`} 
                    color="info" 
                    size="small" 
                    sx={{ ml: 2, borderRadius: 1 }} 
                  />
                </Typography>
                <TableContainer 
                  component={Paper} 
                  sx={{ 
                    boxShadow: 0, 
                    maxHeight: { xs: 300, md: 'none' }, 
                    overflow: 'auto',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    '&::-webkit-scrollbar': {
                      width: '8px',
                      height: '8px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      borderRadius: '4px',
                    }
                  }}
                >
                  <Table size={isMobile ? "small" : "medium"} stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Tipo</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Preço Médio</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Mediana</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Menor Preço</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Maior Preço</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Reajuste CMED</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(stats.byType || []).map((type, index) => (
                        <TableRow 
                          key={index} 
                          hover
                          sx={{
                            '&:nth-of-type(odd)': {
                              backgroundColor: 'action.hover',
                            },
                          }}
                        >
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{type.tipo || 'Não especificado'}</TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(type.mean)}</TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(type.median)}</TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(type.min)}</TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(type.max)}</TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatNumber(type.adjustmentComparison)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} sx={{ mt: 3, mb: 3 }}>
              <Paper sx={{ 
                p: { xs: 2, md: 3 }, 
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
                  backgroundColor: 'secondary.main'
                }
              }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  Análise por Apresentação
                  <Chip 
                    label={`${stats.byPresentation.length} apresentações`} 
                    color="secondary" 
                    size="small" 
                    sx={{ ml: 2, borderRadius: 1 }} 
                  />
                </Typography>
                <TableContainer 
                  component={Paper} 
                  sx={{ 
                    boxShadow: 0, 
                    maxHeight: { xs: 350, md: 400 }, 
                    overflow: 'auto',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    '&::-webkit-scrollbar': {
                      width: '8px',
                      height: '8px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      borderRadius: '4px',
                    }
                  }}
                >
                  <Table size={isMobile ? "small" : "medium"} stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Apresentação</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Quantidade</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Preço Médio</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Mediana</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Menor Preço</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Maior Preço</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(stats.byPresentation || []).map((presentation, index) => (
                        <TableRow 
                          key={index} 
                          hover
                          sx={{
                            '&:nth-of-type(odd)': {
                              backgroundColor: 'action.hover',
                            },
                          }}
                        >
                          <TableCell sx={{ maxWidth: { xs: 120, sm: 200, md: 300 }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <Tooltip title={presentation.apresentacao || 'Não especificada'}>
                              <span>{presentation.apresentacao || 'Não especificada'}</span>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{presentation.count || 0}</TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(presentation.mean)}</TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(presentation.median)}</TableCell>
                          <TableCell align="right">
                            <Box>
                              {formatCurrency(presentation.min?.price)}
                              <Tooltip title={presentation.min?.product || ''}>
                                <Typography variant="caption" sx={{ 
                                  color: 'text.secondary', 
                                  display: 'block', 
                                  maxWidth: { xs: 80, sm: 120, md: 150 }, 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis', 
                                  whiteSpace: 'nowrap' 
                                }}>
                                  {presentation.min?.product || ''}
                                </Typography>
                              </Tooltip>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Box>
                              {formatCurrency(presentation.max?.price)}
                              <Tooltip title={presentation.max?.product || ''}>
                                <Typography variant="caption" sx={{ 
                                  color: 'text.secondary', 
                                  display: 'block', 
                                  maxWidth: { xs: 80, sm: 120, md: 150 }, 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis', 
                                  whiteSpace: 'nowrap' 
                                }}>
                                  {presentation.max?.product || ''}
                                </Typography>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            {/* Seção de Fornecedores */}
            <Grid item xs={12} sx={{ mt: 3, mb: 3 }}>
              <Paper sx={{ 
                p: { xs: 2, md: 3 }, 
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
              }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  <StoreIcon sx={{ mr: 1 }} />
                  Fornecedores com {selectedSubstance}
                  <Chip 
                    label={`${suppliersList.length} fornecedores`} 
                    color="primary" 
                    size="small" 
                    sx={{ ml: 2, borderRadius: 1 }} 
                  />
                </Typography>

                {loadingSuppliers ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <CircularProgress size={40} thickness={4} />
                  </Box>
                ) : suppliersList.length === 0 ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Nenhum fornecedor encontrado com medicamentos contendo esta substância.
                  </Alert>
                ) : (
                  <TableContainer 
                    component={Paper} 
                    sx={{ 
                      boxShadow: 0, 
                      maxHeight: { xs: 350, md: 400 }, 
                      overflow: 'auto',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      '&::-webkit-scrollbar': {
                        width: '8px',
                        height: '8px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        borderRadius: '4px',
                      }
                    }}
                  >
                    <Table size={isMobile ? "small" : "medium"} stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Fornecedor</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Medicamento</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Apresentação</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Laboratório</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Preço</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Data Cotação</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {suppliersList.map((item, index) => (
                          <TableRow 
                            key={index} 
                            hover
                            sx={{
                              '&:nth-of-type(odd)': {
                                backgroundColor: 'action.hover',
                              },
                              backgroundColor: item.cheapest ? 'rgba(76, 175, 80, 0.08)' : 'inherit',
                            }}
                          >
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {item.cheapest && (
                                  <Tooltip title="Menor preço para esta apresentação">
                                    <LocalOfferIcon 
                                      color="success" 
                                      fontSize="small" 
                                      sx={{ mr: 1 }} 
                                    />
                                  </Tooltip>
                                )}
                                <Typography variant="body2" sx={{ fontWeight: item.cheapest ? 'bold' : 'normal' }}>
                                  {item.suppliers?.name || 'Fornecedor não encontrado'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ maxWidth: { xs: 120, sm: 150, md: 200 }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <Tooltip title={item.medicamentos_base?.produto || ''}>
                                <span>{item.medicamentos_base?.produto || ''}</span>
                              </Tooltip>
                            </TableCell>
                            <TableCell sx={{ maxWidth: { xs: 120, sm: 150, md: 200 }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <Tooltip title={item.medicamentos_base?.apresentacao || ''}>
                                <span>{item.medicamentos_base?.apresentacao || ''}</span>
                              </Tooltip>
                            </TableCell>
                            <TableCell>{item.medicamentos_base?.laboratorio || ''}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: item.cheapest ? 'bold' : 'normal', color: item.cheapest ? 'success.main' : 'inherit' }}>
                              {formatCurrency(item.last_quote_price)}
                            </TableCell>
                            <TableCell align="right">{formatDate(item.last_quote_date)}</TableCell>
                            <TableCell align="center">
                              <Button
                                variant="outlined"
                                size="small"
                                color="primary"
                                onClick={() => handleNavigateToSupplier(item.supplier_id)}
                                sx={{ 
                                  borderRadius: 1,
                                  textTransform: 'none',
                                  minWidth: 'auto'
                                }}
                              >
                                Ver Detalhes
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>

            <Box sx={{ mt: 4, mb: 2 }}>
              {stats && !loading && <AnalysisChatbot stats={stats} substance={selectedSubstance} />}
            </Box>
          </>
        )}
      </Grid>

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

export default SubstanceAnalysisPage;
