import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Divider,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Button
} from '@mui/material';
import {
  People as PeopleIcon,
  LocalHospital as HospitalIcon,
  Business as BusinessIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { patientService } from '../../services/patients/patientService';
import { insuranceProviderService } from '../../services/insurance/insuranceProviderService';
import { supplierService } from '../../services/suppliers/supplierService';
import { quoteService } from '../../services/quotes/quoteService';

const StatsSummary = () => {
  const [stats, setStats] = useState({
    patients: { count: 0, loading: true, error: null },
    insuranceProviders: { count: 0, loading: true, error: null },
    suppliers: { count: 0, loading: true, error: null },
    quotes: { count: 0, loading: true, error: null, approved: 0, pending: 0, rejected: 0 }
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    // Carregar estatísticas de pacientes
    try {
      const patients = await patientService.getAll();
      setStats(prev => ({
        ...prev,
        patients: { 
          count: patients.length, 
          loading: false, 
          error: null 
        }
      }));
    } catch (error) {
      console.error('Erro ao carregar estatísticas de pacientes:', error);
      setStats(prev => ({
        ...prev,
        patients: { 
          count: 0, 
          loading: false, 
          error: 'Falha ao carregar dados de pacientes' 
        }
      }));
    }

    // Carregar estatísticas de operadoras
    try {
      const providers = await insuranceProviderService.getAll();
      setStats(prev => ({
        ...prev,
        insuranceProviders: { 
          count: providers.length, 
          loading: false, 
          error: null 
        }
      }));
    } catch (error) {
      console.error('Erro ao carregar estatísticas de operadoras:', error);
      setStats(prev => ({
        ...prev,
        insuranceProviders: { 
          count: 0, 
          loading: false, 
          error: 'Falha ao carregar dados de operadoras' 
        }
      }));
    }

    // Carregar estatísticas de fornecedores
    try {
      const suppliers = await supplierService.getAll();
      setStats(prev => ({
        ...prev,
        suppliers: { 
          count: suppliers.length, 
          loading: false, 
          error: null 
        }
      }));
    } catch (error) {
      console.error('Erro ao carregar estatísticas de fornecedores:', error);
      setStats(prev => ({
        ...prev,
        suppliers: { 
          count: 0, 
          loading: false, 
          error: 'Falha ao carregar dados de fornecedores' 
        }
      }));
    }

    // Carregar estatísticas de orçamentos
    try {
      const quotes = await quoteService.getAll();
      
      // Contar orçamentos por status
      const approved = quotes.filter(quote => quote.status === 'aprovado').length;
      const pending = quotes.filter(quote => quote.status === 'pendente').length;
      const rejected = quotes.filter(quote => quote.status === 'rejeitado').length;
      
      setStats(prev => ({
        ...prev,
        quotes: { 
          count: quotes.length, 
          approved,
          pending,
          rejected,
          loading: false, 
          error: null 
        }
      }));
    } catch (error) {
      console.error('Erro ao carregar estatísticas de orçamentos:', error);
      setStats(prev => ({
        ...prev,
        quotes: { 
          count: 0, 
          approved: 0,
          pending: 0,
          rejected: 0,
          loading: false, 
          error: 'Falha ao carregar dados de orçamentos' 
        }
      }));
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const StatCard = ({ title, count, icon, loading, error, color, link }) => (
    <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
            {title}
          </Typography>
          <Box sx={{ 
            backgroundColor: `${color}.100`, 
            color: `${color}.800`, 
            borderRadius: '50%', 
            p: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {icon}
          </Box>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        ) : (
          <>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
              {count}
            </Typography>
            
            <Divider sx={{ my: 1 }} />
            
            <Button 
              component={Link} 
              to={link} 
              color="primary" 
              endIcon={<ArrowForwardIcon />}
              sx={{ mt: 1, textTransform: 'none', fontWeight: 'medium' }}
            >
              Ver detalhes
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
          <TrendingUpIcon sx={{ mr: 1 }} />
          Resumo do Sistema
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pacientes"
            count={stats.patients.count}
            icon={<PeopleIcon />}
            loading={stats.patients.loading}
            error={stats.patients.error}
            color="primary"
            link="/patients"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Operadoras"
            count={stats.insuranceProviders.count}
            icon={<HospitalIcon />}
            loading={stats.insuranceProviders.loading}
            error={stats.insuranceProviders.error}
            color="secondary"
            link="/insurance"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Fornecedores"
            count={stats.suppliers.count}
            icon={<BusinessIcon />}
            loading={stats.suppliers.loading}
            error={stats.suppliers.error}
            color="success"
            link="/suppliers"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Orçamentos"
            count={stats.quotes.count}
            icon={<ReceiptIcon />}
            loading={stats.quotes.loading}
            error={stats.quotes.error}
            color="warning"
            link="/quotes"
          />
        </Grid>
        
        {!stats.quotes.loading && !stats.quotes.error && stats.quotes.count > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mt: 2, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Status dos Orçamentos
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ 
                    backgroundColor: 'success.100', 
                    p: 2, 
                    borderRadius: 2,
                    textAlign: 'center'
                  }}>
                    <Typography variant="subtitle1" color="success.800">
                      Aprovados
                    </Typography>
                    <Typography variant="h4" color="success.800" sx={{ fontWeight: 'bold' }}>
                      {stats.quotes.approved}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Box sx={{ 
                    backgroundColor: 'info.100', 
                    p: 2, 
                    borderRadius: 2,
                    textAlign: 'center'
                  }}>
                    <Typography variant="subtitle1" color="info.800">
                      Pendentes
                    </Typography>
                    <Typography variant="h4" color="info.800" sx={{ fontWeight: 'bold' }}>
                      {stats.quotes.pending}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Box sx={{ 
                    backgroundColor: 'error.100', 
                    p: 2, 
                    borderRadius: 2,
                    textAlign: 'center'
                  }}>
                    <Typography variant="subtitle1" color="error.800">
                      Rejeitados
                    </Typography>
                    <Typography variant="h4" color="error.800" sx={{ fontWeight: 'bold' }}>
                      {stats.quotes.rejected}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default StatsSummary;
