import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';

const USER_ROLES = {
  ADMIN: 'Administrador sistemas',
  OPERATOR: 'Operador',
  USER: 'Usuário'
};

const SettingsPage = () => {
  const [users, setUsers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // 'create' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: '',
    name: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(users);
    } catch (error) {
      showSnackbar('Erro ao carregar usuários: ' + error.message, 'error');
    }
  };

  const handleOpenDialog = (mode, user = null) => {
    setDialogMode(mode);
    setSelectedUser(user);
    setFormData(user ? {
      email: user.email,
      password: '',
      role: user.role,
      name: user.name
    } : {
      email: '',
      password: '',
      role: '',
      name: ''
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    setFormData({
      email: '',
      password: '',
      role: '',
      name: ''
    });
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {
    try {
      if (dialogMode === 'create') {
        // Create new user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password
        });

        if (authError) throw authError;

        // Create user profile in users table
        const { error: profileError } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            email: formData.email,
            role: formData.role,
            name: formData.name,
            active: true
          }]);

        if (profileError) throw profileError;

        showSnackbar('Usuário criado com sucesso!', 'success');
      } else {
        // Update user profile
        const { error: profileError } = await supabase
          .from('users')
          .update({
            role: formData.role,
            name: formData.name
          })
          .eq('id', selectedUser.id);

        if (profileError) throw profileError;

        // Update password if provided
        if (formData.password) {
          const { error: passwordError } = await supabase.auth.updateUser({
            password: formData.password
          });

          if (passwordError) throw passwordError;
        }

        showSnackbar('Usuário atualizado com sucesso!', 'success');
      }

      handleCloseDialog();
      fetchUsers();
    } catch (error) {
      showSnackbar('Erro: ' + error.message, 'error');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ active: !user.active })
        .eq('id', user.id);

      if (error) throw error;

      showSnackbar(`Usuário ${user.active ? 'inativado' : 'ativado'} com sucesso!`, 'success');
      fetchUsers();
    } catch (error) {
      showSnackbar('Erro ao alterar status do usuário: ' + error.message, 'error');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      // Delete user from Supabase Auth
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      if (authError) throw authError;

      // Delete user profile
      const { error: profileError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (profileError) throw profileError;

      showSnackbar('Usuário excluído com sucesso!', 'success');
      fetchUsers();
    } catch (error) {
      showSnackbar('Erro ao excluir usuário: ' + error.message, 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom sx={{ mt: 3 }}>
        Configurações
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Gerenciamento de Usuários
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleOpenDialog('create')}
          sx={{ mb: 2 }}
        >
          Novo Usuário
        </Button>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Perfil</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{user.active ? 'Ativo' : 'Inativo'}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenDialog('edit', user)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleToggleActive(user)}>
                      <BlockIcon color={user.active ? 'action' : 'error'} />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(user)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {dialogMode === 'create' ? 'Novo Usuário' : 'Editar Usuário'}
        </DialogTitle>
        <DialogContent>
          <TextField
            name="name"
            label="Nome"
            value={formData.name}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
          <TextField
            name="email"
            label="Email"
            value={formData.email}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            disabled={dialogMode === 'edit'}
          />
          <TextField
            name="password"
            label={dialogMode === 'create' ? 'Senha' : 'Nova Senha (opcional)'}
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Perfil</InputLabel>
            <Select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
            >
              {Object.entries(USER_ROLES).map(([key, value]) => (
                <MenuItem key={key} value={value}>
                  {value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {dialogMode === 'create' ? 'Criar' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SettingsPage;
