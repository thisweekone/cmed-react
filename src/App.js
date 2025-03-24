import React from 'react';
import { Routes, Route, Navigate, Link, Outlet, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Container, Nav, Navbar as BootstrapNavbar } from 'react-bootstrap';
import LoginPage from './pages/LoginPage';
import ListPage from './pages/ListPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import ImportPage from './pages/ImportPage';
import SearchPage from './pages/SearchPage';
import TestDatePage from './pages/TestDatePage';
import LogsPage from './pages/LogsPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import SubstanceAnalysisPage from './pages/SubstanceAnalysisPage';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
<<<<<<< HEAD
    <div>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand as={Link} to="/">CMED Manager</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/import">Importar Tabela</Nav.Link>
              <Nav.Link as={Link} to="/list">Listar Medicamentos</Nav.Link>
              <Nav.Link as={Link} to="/logs">Logs de Importação</Nav.Link>
              <Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>
              {/* Botões ocultados conforme solicitado
              <Nav.Link as={Link} to="/search">Pesquisar Medicamentos</Nav.Link>
              <Nav.Link as={Link} to="/test-date">Testar Data</Nav.Link>
              */}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Routes>
        <Route path="/import" element={<ImportPage />} />
        <Route path="/list" element={<ListPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/test-date" element={<TestDatePage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/" element={<ImportPage />} />
=======
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="substance-analysis" element={<SubstanceAnalysisPage />} />
          <Route path="list" element={<ListPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="test-date" element={<TestDatePage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
>>>>>>> e381db1a6681eb40b6bdf8d26cfd15580cb639aa
      </Routes>
    </AuthProvider>
  );
}

function Layout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <>
      <BootstrapNavbar bg="dark" variant="dark" expand="lg">
        <Container>
          <BootstrapNavbar.Brand as={Link} to="/">CMED Manager</BootstrapNavbar.Brand>
          <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
          <BootstrapNavbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>
              <Nav.Link as={Link} to="/substance-analysis">Análise por Substância</Nav.Link>
              <Nav.Link as={Link} to="/list">Lista</Nav.Link>
              <Nav.Link as={Link} to="/import">Importar</Nav.Link>
              <Nav.Link as={Link} to="/logs">Logs</Nav.Link>
              <Nav.Link as={Link} to="/settings">Configurações</Nav.Link>
              <Nav.Link as={Link} to="/search">Buscar</Nav.Link>
            </Nav>
            <Nav>
              <Nav.Link as={Link} to="/profile">
                {user?.email || 'Perfil'}
              </Nav.Link>
              <Nav.Link onClick={handleLogout}>
                Sair
              </Nav.Link>
            </Nav>
          </BootstrapNavbar.Collapse>
        </Container>
      </BootstrapNavbar>
      <Container className="mt-4">
        <Outlet />
      </Container>
    </>
  );
}

export default App;
