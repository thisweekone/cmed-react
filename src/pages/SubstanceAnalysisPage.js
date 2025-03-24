import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
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
  Tooltip,
  IconButton
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Analytics as AnalyticsIcon,
  Chat as ChatIcon
} from '@mui/icons-material';
import AnalysisChatbot from '../components/AnalysisChatbot';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography color="textSecondary" gutterBottom>
          {title}
        </Typography>
        {Icon && <Icon style={{ color }} />}
      </Box>
      <Typography variant="h4" component="div">
        {typeof value === 'number' ? value.toLocaleString('pt-BR', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        }) : value}
      </Typography>
    </CardContent>
  </Card>
);

const SubstanceAnalysisPage = () => {
  const [substances, setSubstances] = useState([]);
  const [selectedSubstance, setSelectedSubstance] = useState(null);
  const [loading, setLoading] = useState(false);
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
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState(null);

  const handleChatOpen = (type, value) => {
    setChatContext({ type, value });
    setChatOpen(true);
  };

  const renderStatCard = (title, value) => (
    <Card sx={{ minWidth: 275, mb: 2 }}>
      <CardContent>
        <Typography variant="h6" component="div">
          {title}
        </Typography>
        <Typography variant="h4" component="div" sx={{ mt: 2 }}>
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Análise por Substância
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
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
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

        {stats && (
          <>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                {renderStatCard("Preço Médio", stats.general.mean)}
              </Grid>
              <Grid item xs={12} md={3}>
                {renderStatCard("Preço Mediano", stats.general.median)}
              </Grid>
              <Grid item xs={12} md={3}>
                {renderStatCard("Menor Preço", stats.general.min)}
              </Grid>
              <Grid item xs={12} md={3}>
                {renderStatCard("Maior Preço", stats.general.max)}
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Análise por Tipo
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tipo</TableCell>
                      <TableCell align="right">Preço Médio</TableCell>
                      <TableCell align="right">Mediana</TableCell>
                      <TableCell align="right">Menor Preço</TableCell>
                      <TableCell align="right">Maior Preço</TableCell>
                      <TableCell align="right">Reajuste CMED</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(stats.byType || []).map((type, index) => (
                      <TableRow key={index}>
                        <TableCell>{type.tipo || 'Não especificado'}</TableCell>
                        <TableCell align="right">{formatCurrency(type.mean)}</TableCell>
                        <TableCell align="right">{formatCurrency(type.median)}</TableCell>
                        <TableCell align="right">{formatCurrency(type.min)}</TableCell>
                        <TableCell align="right">{formatCurrency(type.max)}</TableCell>
                        <TableCell align="right">{formatNumber(type.adjustmentComparison)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Análise por Apresentação
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Apresentação</TableCell>
                      <TableCell align="right">Quantidade</TableCell>
                      <TableCell align="right">Preço Médio</TableCell>
                      <TableCell align="right">Mediana</TableCell>
                      <TableCell align="right">Menor Preço</TableCell>
                      <TableCell align="right">Maior Preço</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(stats.byPresentation || []).map((presentation, index) => (
                      <TableRow key={index}>
                        <TableCell>{presentation.apresentacao || 'Não especificada'}</TableCell>
                        <TableCell align="right">{presentation.count || 0}</TableCell>
                        <TableCell align="right">{formatCurrency(presentation.mean)}</TableCell>
                        <TableCell align="right">{formatCurrency(presentation.median)}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(presentation.min?.price)}
                          <br />
                          <small>{presentation.min?.product || ''}</small>
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(presentation.max?.price)}
                          <br />
                          <small>{presentation.max?.product || ''}</small>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Grid>
          </>
        )}
      </Grid>

      <Box sx={{ mt: 4 }}>
        {stats && <AnalysisChatbot stats={stats} substance={selectedSubstance} />}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SubstanceAnalysisPage;
