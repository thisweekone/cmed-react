import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Snackbar,
  Alert,
  Grid
} from '@mui/material';

const ProfilePage = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('name, phone')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setFormData(prev => ({
          ...prev,
          email: user.email,
          name: data?.name || '',
          phone: data?.phone || ''
        }));
      } catch (error) {
        console.error('Error loading profile:', error);
        showError('Erro ao carregar perfil');
      }
    };

    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const showSuccess = (message) => {
    setSnackbar({ open: true, message, severity: 'success' });
  };

  const showError = (message) => {
    setSnackbar({ open: true, message, severity: 'error' });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update profile data
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          phone: formData.phone
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      showSuccess('Perfil atualizado com sucesso');
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        email: formData.email
      });

      if (error) throw error;

      showSuccess('Email atualizado com sucesso. Verifique sua caixa de entrada.');
    } catch (error) {
      console.error('Error updating email:', error);
      showError('Erro ao atualizar email');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.newPassword !== formData.confirmPassword) {
        throw new Error('As senhas não coincidem');
      }

      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (error) throw error;

      showSuccess('Senha atualizada com sucesso');
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      console.error('Error updating password:', error);
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Perfil do Usuário
        </Typography>

        <Box component="form" onSubmit={handleUpdateProfile} sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Informações Básicas
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nome"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
              >
                Atualizar Perfil
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Box component="form" onSubmit={handleUpdateEmail} sx={{ mt: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Alterar Email
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Novo Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
              >
                Atualizar Email
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Box component="form" onSubmit={handleUpdatePassword} sx={{ mt: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Alterar Senha
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nova Senha"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Confirmar Nova Senha"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
              >
                Atualizar Senha
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProfilePage;
