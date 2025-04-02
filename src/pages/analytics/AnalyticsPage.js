import React, { useState, useEffect } from 'react';
import { Container, Grid, Paper, Typography, Box, CircularProgress, Alert, Tabs, Tab, Card, CardContent, Divider } from '@mui/material';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { patientService } from '../../services/patients/patientService';
import { insuranceProviderService } from '../../services/insurance/insuranceProviderService';
import { quoteService } from '../../services/quotes/quoteService';
import { medicineService } from '../../services/medicines/medicineService';
import { 
  Analytics as AnalyticsIcon, 
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  LocalHospital as HospitalIcon,
  Medication as MedicationIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';

const AnalyticsPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    patients: [],
    insuranceProviders: [],
    quotes: [],
    medicines: []
  });
  const [stats, setStats] = useState({
    patientsByInsurance: [],
    quotesByStatus: [],
    quotesByMonth: [],
    topMedicines: [],
    topInsuranceProviders: []
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Carregar dados dos pacientes
      const patientsData = await patientService.getAll();
      
      // Carregar dados das operadoras
      const providersData = await insuranceProviderService.getAll();
      
      // Carregar dados dos orçamentos
      const quotesData = await quoteService.getAll();
      
      // Carregar dados dos medicamentos
      const medicinesData = await medicineService.getAll();

      setData({
        patients: patientsData || [],
        insuranceProviders: providersData || [],
        quotes: quotesData || [],
        medicines: medicinesData || []
      });

      // Processar estatísticas
      processStatistics(patientsData, providersData, quotesData, medicinesData);
      
      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar dados para análise:', err);
      setError('Ocorreu um erro ao carregar os dados para análise. Por favor, tente novamente mais tarde.');
      setLoading(false);
    }
  };

  const processStatistics = (patients, providers, quotes, medicines) => {
    // Pacientes por operadora
    const patientsByInsurance = [];
    if (patients && patients.length > 0 && providers && providers.length > 0) {
      // Criar um mapa de contagem de pacientes por operadora
      const insuranceCount = {};
      
      patients.forEach(patient => {
        if (patient.insurance_provider_id) {
          insuranceCount[patient.insurance_provider_id] = (insuranceCount[patient.insurance_provider_id] || 0) + 1;
        }
      });
      
      // Converter para o formato necessário para o gráfico
      Object.keys(insuranceCount).forEach(providerId => {
        const provider = providers.find(p => p.id === providerId);
        if (provider) {
          patientsByInsurance.push({
            name: provider.name,
            value: insuranceCount[providerId]
          });
        }
      });
      
      // Ordenar por quantidade (decrescente)
      patientsByInsurance.sort((a, b) => b.value - a.value);
    }

    // Orçamentos por status
    const quotesByStatus = [];
    if (quotes && quotes.length > 0) {
      const statusCount = {
        pendente: 0,
        aprovado: 0,
        rejeitado: 0
      };
      
      quotes.forEach(quote => {
        if (quote.status && statusCount.hasOwnProperty(quote.status)) {
          statusCount[quote.status]++;
        }
      });
      
      quotesByStatus.push(
        { name: 'Pendentes', value: statusCount.pendente },
        { name: 'Aprovados', value: statusCount.aprovado },
        { name: 'Rejeitados', value: statusCount.rejeitado }
      );
    }

    // Orçamentos por mês (últimos 6 meses)
    const quotesByMonth = [];
    if (quotes && quotes.length > 0) {
      // Obter os últimos 6 meses
      const today = new Date();
      const months = [];
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push({
          month: d.getMonth(),
          year: d.getFullYear(),
          label: format(d, 'MMM/yyyy', { locale: ptBR })
        });
      }
      
      // Contar orçamentos por mês
      months.forEach(monthData => {
        const count = quotes.filter(quote => {
          const quoteDate = new Date(quote.created_at);
          return quoteDate.getMonth() === monthData.month && 
                 quoteDate.getFullYear() === monthData.year;
        }).length;
        
        quotesByMonth.push({
          name: monthData.label,
          quantidade: count
        });
      });
    }

    // Top medicamentos mais orçados
    const topMedicines = [];
    if (quotes && quotes.length > 0 && medicines && medicines.length > 0) {
      const medicineCount = {};
      
      quotes.forEach(quote => {
        if (quote.medicine_id) {
          medicineCount[quote.medicine_id] = (medicineCount[quote.medicine_id] || 0) + 1;
        }
      });
      
      // Converter para array e ordenar
      const sortedMedicines = Object.keys(medicineCount)
        .map(id => ({ id, count: medicineCount[id] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5
      
      // Adicionar nomes dos medicamentos
      sortedMedicines.forEach(item => {
        const medicine = medicines.find(m => m.id === item.id);
        if (medicine) {
          topMedicines.push({
            name: medicine.name,
            quantidade: item.count
          });
        }
      });
    }

    // Top operadoras com mais pacientes
    const topInsuranceProviders = patientsByInsurance.slice(0, 5);

    setStats({
      patientsByInsurance,
      quotesByStatus,
      quotesByMonth,
      topMedicines,
      topInsuranceProviders
    });
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const renderPieChart = (data, title, icon) => (
    <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>{title}</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Quantidade']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <Typography variant="body1" color="text.secondary">
              Não há dados suficientes para exibir este gráfico
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderBarChart = (data, title, dataKey, icon) => (
    <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>{title}</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={dataKey} fill="#8884d8">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <Typography variant="body1" color="text.secondary">
              Não há dados suficientes para exibir este gráfico
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderLineChart = (data, title, dataKey, icon) => (
    <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>{title}</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={dataKey} stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <Typography variant="body1" color="text.secondary">
              Não há dados suficientes para exibir este gráfico
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderStatCards = () => {
    const cards = [
      {
        title: 'Total de Pacientes',
        value: data.patients.length,
        icon: <PeopleIcon sx={{ color: 'primary.main' }} />,
        color: 'primary.main'
      },
      {
        title: 'Total de Operadoras',
        value: data.insuranceProviders.length,
        icon: <HospitalIcon sx={{ color: 'secondary.main' }} />,
        color: 'secondary.main'
      },
      {
        title: 'Total de Medicamentos',
        value: data.medicines.length,
        icon: <MedicationIcon sx={{ color: 'success.main' }} />,
        color: 'success.main'
      },
      {
        title: 'Total de Orçamentos',
        value: data.quotes.length,
        icon: <ReceiptIcon sx={{ color: 'warning.main' }} />,
        color: 'warning.main'
      }
    ];

    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {cards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle1" color="text.secondary">
                      {card.title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 1 }}>
                      {card.value}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    backgroundColor: `${card.color}15`, 
                    borderRadius: '50%',
                    p: 1.5,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderOverviewTab = () => (
    <>
      {renderStatCards()}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          {renderPieChart(stats.patientsByInsurance, 'Pacientes por Operadora', <HospitalIcon sx={{ color: 'primary.main' }} />)}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderPieChart(stats.quotesByStatus, 'Orçamentos por Status', <ReceiptIcon sx={{ color: 'secondary.main' }} />)}
        </Grid>
        <Grid item xs={12}>
          {renderLineChart(stats.quotesByMonth, 'Orçamentos por Mês', 'quantidade', <TrendingUpIcon sx={{ color: 'success.main' }} />)}
        </Grid>
      </Grid>
    </>
  );

  const renderPatientsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        {renderPieChart(stats.patientsByInsurance, 'Pacientes por Operadora', <HospitalIcon sx={{ color: 'primary.main' }} />)}
      </Grid>
      <Grid item xs={12} md={6}>
        {renderBarChart(stats.topInsuranceProviders, 'Top 5 Operadoras com Mais Pacientes', 'value', <PeopleIcon sx={{ color: 'secondary.main' }} />)}
      </Grid>
    </Grid>
  );

  const renderQuotesTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        {renderPieChart(stats.quotesByStatus, 'Orçamentos por Status', <ReceiptIcon sx={{ color: 'primary.main' }} />)}
      </Grid>
      <Grid item xs={12} md={6}>
        {renderBarChart(stats.topMedicines, 'Top 5 Medicamentos Mais Orçados', 'quantidade', <MedicationIcon sx={{ color: 'secondary.main' }} />)}
      </Grid>
      <Grid item xs={12}>
        {renderLineChart(stats.quotesByMonth, 'Orçamentos por Mês', 'quantidade', <TrendingUpIcon sx={{ color: 'success.main' }} />)}
      </Grid>
    </Grid>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AnalyticsIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h4" component="h1" gutterBottom>
          Análise de Dados
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              aria-label="análise de dados tabs"
              variant="fullWidth"
            >
              <Tab label="Visão Geral" icon={<AnalyticsIcon />} iconPosition="start" />
              <Tab label="Pacientes" icon={<PeopleIcon />} iconPosition="start" />
              <Tab label="Orçamentos" icon={<ReceiptIcon />} iconPosition="start" />
            </Tabs>
          </Box>
          
          {tabValue === 0 && renderOverviewTab()}
          {tabValue === 1 && renderPatientsTab()}
          {tabValue === 2 && renderQuotesTab()}
        </Paper>
      )}
    </Container>
  );
};

export default AnalyticsPage;
