import React from 'react';
import { Routes, Route, Navigate, Link, Outlet, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { 
  Container, 
  Navbar as BootstrapNavbar, 
  Nav, 
  Offcanvas, 
  Button,
  Dropdown
} from 'react-bootstrap';
import { 
  House, 
  List, 
  Upload, 
  Gear, 
  Search, 
  Journal, 
  Calendar3, 
  FileEarmarkText, 
  Person, 
  Building, 
  Receipt, 
  BoxArrowRight,
  MenuButtonWide
} from 'react-bootstrap-icons';
import './styles/App.css';

// Páginas existentes
import LoginPage from './pages/LoginPage';
import ListPage from './pages/ListPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import ImportPage from './pages/ImportPage';
import SearchPage from './pages/SearchPage';
import TestDatePage from './pages/TestDatePage';
import LogsPage from './pages/LogsPage';
import ProfilePage from './pages/ProfilePage';
import SubstanceAnalysisPage from './pages/SubstanceAnalysisPage';

// Novas páginas de fornecedores e orçamentos
import SuppliersList from './pages/suppliers/SuppliersList';
import SupplierDetails from './pages/suppliers/SupplierDetails';
import SupplierEdit from './pages/suppliers/SupplierEdit';
import SupplierMedicines from './pages/suppliers/SupplierMedicines';
import QuotesList from './pages/quotes/QuotesList';
import QuoteCreate from './pages/quotes/QuoteCreate';
import QuoteDetails from './pages/quotes/QuoteDetails';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="list" element={<ProtectedRoute><ListPage /></ProtectedRoute>} />
          <Route path="import" element={<ProtectedRoute><ImportPage /></ProtectedRoute>} />
          <Route path="logs" element={<ProtectedRoute><LogsPage /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="substance-analysis" element={<ProtectedRoute><SubstanceAnalysisPage /></ProtectedRoute>} />
          <Route path="test-date" element={<ProtectedRoute><TestDatePage /></ProtectedRoute>} />
          
          {/* Novas rotas para fornecedores */}
          <Route path="suppliers" element={<ProtectedRoute><SuppliersList /></ProtectedRoute>} />
          <Route path="suppliers/:id" element={<ProtectedRoute><SupplierDetails /></ProtectedRoute>} />
          <Route path="suppliers/edit/:id" element={<ProtectedRoute><SupplierEdit /></ProtectedRoute>} />
          <Route path="suppliers/new" element={<ProtectedRoute><SupplierEdit /></ProtectedRoute>} />
          <Route path="suppliers/:id/medicines" element={<ProtectedRoute><SupplierMedicines /></ProtectedRoute>} />
          
          {/* Novas rotas para orçamentos */}
          <Route path="quotes" element={<ProtectedRoute><QuotesList /></ProtectedRoute>} />
          <Route path="quotes/new" element={<ProtectedRoute><QuoteCreate /></ProtectedRoute>} />
          <Route path="quotes/:id" element={<ProtectedRoute><QuoteDetails /></ProtectedRoute>} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

function Layout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = React.useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleCloseSidebar = () => setShowSidebar(false);
  const handleShowSidebar = () => setShowSidebar(true);

  return (
    <div className="app-container">
      <BootstrapNavbar bg="dark" variant="dark" expand={false} className="mb-0 border-bottom">
        <Container fluid>
          <Button 
            variant="outline-light" 
            className="me-2 d-lg-none" 
            onClick={handleShowSidebar}
          >
            <MenuButtonWide />
          </Button>
          <BootstrapNavbar.Brand as={Link} to="/">CMED Manager</BootstrapNavbar.Brand>
          <Dropdown align="end">
            <Dropdown.Toggle variant="dark" id="dropdown-user">
              <Person className="me-1" /> {user?.email || 'Usuário'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item as={Link} to="/profile">Perfil</Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={handleLogout}>Sair <BoxArrowRight className="ms-2" /></Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Container>
      </BootstrapNavbar>

      <div className="d-flex flex-grow-1">
        {/* Sidebar para telas grandes */}
        <div className="sidebar d-none d-lg-block bg-light" style={{ width: '250px', minHeight: 'calc(100vh - 56px)' }}>
          <div className="p-3">
            <Nav className="flex-column">
              <Nav.Link as={Link} to="/dashboard" className="d-flex align-items-center">
                <House className="me-2" /> Dashboard
              </Nav.Link>
              <Nav.Link as={Link} to="/list" className="d-flex align-items-center">
                <List className="me-2" /> Lista
              </Nav.Link>
              <Nav.Link as={Link} to="/import" className="d-flex align-items-center">
                <Upload className="me-2" /> Importar
              </Nav.Link>
              <Nav.Link as={Link} to="/logs" className="d-flex align-items-center">
                <Journal className="me-2" /> Logs
              </Nav.Link>
              <Nav.Link as={Link} to="/settings" className="d-flex align-items-center">
                <Gear className="me-2" /> Configurações
              </Nav.Link>
              <Nav.Link as={Link} to="/search" className="d-flex align-items-center">
                <Search className="me-2" /> Buscar
              </Nav.Link>
              <Nav.Link as={Link} to="/substance-analysis" className="d-flex align-items-center">
                <FileEarmarkText className="me-2" /> Análise de Substâncias
              </Nav.Link>
              <Nav.Link as={Link} to="/test-date" className="d-flex align-items-center">
                <Calendar3 className="me-2" /> Test Date
              </Nav.Link>
              
              <hr />
              
              <Nav.Link as={Link} to="/suppliers" className="d-flex align-items-center">
                <Building className="me-2" /> Fornecedores
              </Nav.Link>
              <Nav.Link as={Link} to="/quotes" className="d-flex align-items-center">
                <Receipt className="me-2" /> Orçamentos
              </Nav.Link>
            </Nav>
          </div>
        </div>

        {/* Sidebar para telas pequenas (offcanvas) */}
        <Offcanvas show={showSidebar} onHide={handleCloseSidebar} className="sidebar-offcanvas">
          <Offcanvas.Header closeButton>
            <Offcanvas.Title>Menu</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body>
            <Nav className="flex-column">
              <Nav.Link as={Link} to="/dashboard" className="d-flex align-items-center" onClick={handleCloseSidebar}>
                <House className="me-2" /> Dashboard
              </Nav.Link>
              <Nav.Link as={Link} to="/list" className="d-flex align-items-center" onClick={handleCloseSidebar}>
                <List className="me-2" /> Lista
              </Nav.Link>
              <Nav.Link as={Link} to="/import" className="d-flex align-items-center" onClick={handleCloseSidebar}>
                <Upload className="me-2" /> Importar
              </Nav.Link>
              <Nav.Link as={Link} to="/logs" className="d-flex align-items-center" onClick={handleCloseSidebar}>
                <Journal className="me-2" /> Logs
              </Nav.Link>
              <Nav.Link as={Link} to="/settings" className="d-flex align-items-center" onClick={handleCloseSidebar}>
                <Gear className="me-2" /> Configurações
              </Nav.Link>
              <Nav.Link as={Link} to="/search" className="d-flex align-items-center" onClick={handleCloseSidebar}>
                <Search className="me-2" /> Buscar
              </Nav.Link>
              <Nav.Link as={Link} to="/substance-analysis" className="d-flex align-items-center" onClick={handleCloseSidebar}>
                <FileEarmarkText className="me-2" /> Análise de Substâncias
              </Nav.Link>
              <Nav.Link as={Link} to="/test-date" className="d-flex align-items-center" onClick={handleCloseSidebar}>
                <Calendar3 className="me-2" /> Test Date
              </Nav.Link>
              
              <hr />
              
              <Nav.Link as={Link} to="/suppliers" className="d-flex align-items-center" onClick={handleCloseSidebar}>
                <Building className="me-2" /> Fornecedores
              </Nav.Link>
              <Nav.Link as={Link} to="/quotes" className="d-flex align-items-center" onClick={handleCloseSidebar}>
                <Receipt className="me-2" /> Orçamentos
              </Nav.Link>
            </Nav>
          </Offcanvas.Body>
        </Offcanvas>

        {/* Conteúdo principal */}
        <div className="main-content flex-grow-1">
          <Container className="py-3">
            <Outlet />
          </Container>
        </div>
      </div>
    </div>
  );
}

export default App;
