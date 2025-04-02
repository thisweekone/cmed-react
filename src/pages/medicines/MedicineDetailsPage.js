import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  CircularProgress, 
  Button, 
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Alert
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  LocalHospital as PatientIcon,
  Store as SupplierIcon,
  AttachMoney as PriceIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import medicineService from '../../services/medicines/medicineService';
import { priceHistoryService } from '../../services/prices/priceHistoryService';
import { formatCurrency } from '../../utils/formatters';

// Componente TabPanel para exibir o conteúdo de cada aba
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`medicine-tabpanel-${index}`}
      aria-labelledby={`medicine-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Página principal de detalhes do medicamento
const MedicineDetailsPage = () => {
  const { medicineId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [loading, setLoading] = useState(true);
  const [medicine, setMedicine] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [priceAnalysis, setPriceAnalysis] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  // Carregar dados do medicamento e informações relacionadas
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Buscar dados do medicamento
        const medicineData = await medicineService.getById(medicineId);
        setMedicine(medicineData);
        
        // Buscar fornecedores do medicamento
        const suppliersData = await medicineService.getMedicineSuppliers(medicineId);
        setSuppliers(suppliersData);
        
        // Buscar pacientes que usam o medicamento
        const patientsData = await medicineService.getMedicinePatients(medicineId);
        setPatients(patientsData);
        
        // Buscar análise de preços
        const priceData = await medicineService.getMedicinePriceAnalysis(medicineId);
        setPriceAnalysis(priceData);
      } catch (error) {
        console.error('Erro ao carregar dados do medicamento:', error);
        enqueueSnackbar('Erro ao carregar dados do medicamento. Por favor, tente novamente.', { 
          variant: 'error' 
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [medicineId, enqueueSnackbar]);

  // Manipulador de mudança de aba
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Função para navegar para a página de histórico de preços
  const handleViewPriceHistory = (supplierId) => {
    navigate(`/medicines/${medicineId}/suppliers/${supplierId}/prices`);
  };

  // Renderizar o conteúdo durante o carregamento
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Renderizar mensagem de erro se o medicamento não for encontrado
  if (!medicine) {
    return (
      <Box sx={{ p: 3 }}>
        <Button 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/medicines')}
          sx={{ mb: 2 }}
        >
          Voltar para Lista de Medicamentos
        </Button>
        <Alert severity="error">
          Medicamento não encontrado. Verifique se o ID está correto.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Cabeçalho com botão de voltar e título */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/medicines')}
          sx={{ mr: 2 }}
        >
          Voltar
        </Button>
        <Typography variant="h5" component="h1">
          Detalhes do Medicamento
        </Typography>
      </Box>

      {/* Informações básicas do medicamento */}
      <Paper sx={{ mb: 3, p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {medicine.produto}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {medicine.apresentacao}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
          <Chip 
            icon={<InfoIcon />} 
            label={`Laboratório: ${medicine.laboratorio}`} 
            variant="outlined" 
          />
          <Chip 
            icon={<InfoIcon />} 
            label={`Classe Terapêutica: ${medicine.classe_terapeutica}`} 
            variant="outlined" 
          />
          <Chip 
            icon={<InfoIcon />} 
            label={`Substância: ${medicine.substancia}`} 
            variant="outlined" 
          />
          {medicine.codigo_ggrem && (
            <Chip 
              icon={<InfoIcon />} 
              label={`Código GGREM: ${medicine.codigo_ggrem}`} 
              variant="outlined" 
            />
          )}
        </Box>
      </Paper>

      {/* Abas para diferentes seções de informações */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab icon={<InfoIcon />} label="Cadastro" />
          <Tab icon={<PriceIcon />} label="Preços" />
          <Tab icon={<SupplierIcon />} label="Fornecedores" />
          <Tab icon={<PatientIcon />} label="Pacientes" />
          <Tab icon={<TrendingUpIcon />} label="Análise de Preços" />
        </Tabs>

        {/* Aba de Cadastro */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Informações Gerais" />
                <CardContent>
                  <Typography variant="body1" gutterBottom>
                    <strong>Nome:</strong> {medicine.produto}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Apresentação:</strong> {medicine.apresentacao}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Laboratório:</strong> {medicine.laboratorio}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Classe Terapêutica:</strong> {medicine.classe_terapeutica}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Substância:</strong> {medicine.substancia}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Informações Regulatórias" />
                <CardContent>
                  <Typography variant="body1" gutterBottom>
                    <strong>Código GGREM:</strong> {medicine.codigo_ggrem || 'Não informado'}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Registro MS:</strong> {medicine.registro_ms || 'Não informado'}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Tipo:</strong> {medicine.tipo || 'Não informado'}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Restrição Hospitalar:</strong> {medicine.restricao_hospitalar ? 'Sim' : 'Não'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Aba de Preços */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Fornecedor</TableCell>
                  <TableCell>Último Preço</TableCell>
                  <TableCell>Data da Cotação</TableCell>
                  <TableCell>Variação</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {suppliers.length > 0 ? (
                  suppliers.map((supplier) => {
                    // Encontrar o fornecedor com o menor preço
                    const isLowestPrice = supplier.price === Math.min(...suppliers.map(s => s.price || Infinity));
                    
                    return (
                      <TableRow 
                        key={supplier.id}
                        sx={{ 
                          backgroundColor: isLowestPrice ? 'rgba(76, 175, 80, 0.1)' : 'inherit'
                        }}
                      >
                        <TableCell>{supplier.name}</TableCell>
                        <TableCell>
                          {supplier.price ? (
                            <Typography 
                              fontWeight={isLowestPrice ? 'bold' : 'normal'}
                              color={isLowestPrice ? 'success.main' : 'inherit'}
                            >
                              {formatCurrency(supplier.price)}
                              {isLowestPrice && (
                                <Chip 
                                  size="small" 
                                  label="Menor Preço" 
                                  color="success" 
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Typography>
                          ) : (
                            'Não disponível'
                          )}
                        </TableCell>
                        <TableCell>
                          {supplier.quote_date ? (
                            format(new Date(supplier.quote_date), 'dd/MM/yyyy', { locale: ptBR })
                          ) : (
                            'Não disponível'
                          )}
                        </TableCell>
                        <TableCell>
                          {supplier.price_variation ? (
                            <Typography 
                              color={supplier.price_variation > 0 ? 'error.main' : 'success.main'}
                            >
                              {supplier.price_variation > 0 ? '+' : ''}{supplier.price_variation.toFixed(2)}%
                            </Typography>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleViewPriceHistory(supplier.id)}
                          >
                            Ver Histórico
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Nenhum fornecedor encontrado para este medicamento.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Aba de Fornecedores */}
        <TabPanel value={tabValue} index={2}>
          {suppliers.length > 0 ? (
            <Grid container spacing={3}>
              {suppliers.map((supplier) => (
                <Grid item xs={12} md={6} lg={4} key={supplier.id}>
                  <Card>
                    <CardHeader 
                      title={supplier.name} 
                      subheader={supplier.cnpj || 'CNPJ não informado'}
                    />
                    <CardContent>
                      <Typography variant="body1" gutterBottom>
                        <strong>Contato:</strong> {supplier.contact_name || 'Não informado'}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        <strong>Telefone:</strong> {supplier.phone || 'Não informado'}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        <strong>Email:</strong> {supplier.email || 'Não informado'}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        <strong>Último Preço:</strong> {supplier.price ? formatCurrency(supplier.price) : 'Não disponível'}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleViewPriceHistory(supplier.id)}
                        >
                          Ver Histórico de Preços
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info">
              Nenhum fornecedor encontrado para este medicamento.
            </Alert>
          )}
        </TabPanel>

        {/* Aba de Pacientes */}
        <TabPanel value={tabValue} index={3}>
          {patients.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>CPF</TableCell>
                    <TableCell>Plano de Saúde</TableCell>
                    <TableCell>Última Prescrição</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>{patient.name}</TableCell>
                      <TableCell>{patient.cpf}</TableCell>
                      <TableCell>{patient.insurance_provider?.name || 'Particular'}</TableCell>
                      <TableCell>
                        {patient.last_prescription_date ? (
                          format(new Date(patient.last_prescription_date), 'dd/MM/yyyy', { locale: ptBR })
                        ) : (
                          'Não disponível'
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => navigate(`/patients/${patient.id}`)}
                        >
                          Ver Paciente
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              Nenhum paciente encontrado utilizando este medicamento.
            </Alert>
          )}
        </TabPanel>

        {/* Aba de Análise de Preços */}
        <TabPanel value={tabValue} index={4}>
          {priceAnalysis ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="Estatísticas de Preço" />
                  <CardContent>
                    <Typography variant="body1" gutterBottom>
                      <strong>Preço Médio:</strong> {formatCurrency(priceAnalysis.average_price)}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Preço Mínimo:</strong> {formatCurrency(priceAnalysis.min_price)}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Preço Máximo:</strong> {formatCurrency(priceAnalysis.max_price)}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Variação:</strong> {priceAnalysis.price_variation.toFixed(2)}%
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Fornecedor Mais Barato:</strong> {priceAnalysis.cheapest_supplier?.name || 'N/A'}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Fornecedor Mais Caro:</strong> {priceAnalysis.most_expensive_supplier?.name || 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="Tendência de Preço" />
                  <CardContent>
                    <Typography variant="body1" gutterBottom>
                      <strong>Tendência:</strong> {' '}
                      <Chip 
                        label={priceAnalysis.trend === 'up' ? 'Alta' : priceAnalysis.trend === 'down' ? 'Baixa' : 'Estável'} 
                        color={priceAnalysis.trend === 'up' ? 'error' : priceAnalysis.trend === 'down' ? 'success' : 'default'}
                      />
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Variação nos Últimos 30 Dias:</strong> {priceAnalysis.variation_30_days.toFixed(2)}%
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Variação nos Últimos 90 Dias:</strong> {priceAnalysis.variation_90_days.toFixed(2)}%
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Última Atualização:</strong> {' '}
                      {priceAnalysis.last_update ? (
                        format(new Date(priceAnalysis.last_update), 'dd/MM/yyyy', { locale: ptBR })
                      ) : (
                        'Não disponível'
                      )}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="info">
              Não há dados suficientes para análise de preços deste medicamento.
            </Alert>
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default MedicineDetailsPage;
