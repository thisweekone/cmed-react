import React from 'react';
import { Routes, Route, Navigate, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
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
  MenuButtonWide,
  People,
  Hospital,
  BarChartFill
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

// Novas páginas de pacientes
import PatientList from './pages/patients/PatientList';
import PatientForm from './pages/patients/PatientForm';
import PatientDetails from './pages/patients/PatientDetails';

// Novas páginas de operadoras de saúde
import InsuranceProviderList from './pages/insurance/InsuranceProviderList';
import InsuranceProviderForm from './pages/insurance/InsuranceProviderForm';
import InsuranceProviderDetails from './pages/insurance/InsuranceProviderDetails';
import InsuranceProviderPatients from './pages/insurance/InsuranceProviderPatients';

// Página de análise de dados
import AnalyticsPage from './pages/analytics/AnalyticsPage';

// Página de histórico de preços
import PriceHistoryPage from './pages/medicines/PriceHistoryPage';
import MedicineDetails from './pages/medicines/MedicineDetails';

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
          
          {/* Novas rotas para pacientes */}
          <Route path="patients" element={<ProtectedRoute><PatientList /></ProtectedRoute>} />
          <Route path="patients/create" element={<ProtectedRoute><PatientForm /></ProtectedRoute>} />
          <Route path="patients/edit/:id" element={<ProtectedRoute><PatientForm /></ProtectedRoute>} />
          <Route path="patients/:id" element={<ProtectedRoute><PatientDetails /></ProtectedRoute>} />
          
          {/* Novas rotas para operadoras de saúde */}
          <Route path="insurance" element={<ProtectedRoute><InsuranceProviderList /></ProtectedRoute>} />
          <Route path="insurance/create" element={<ProtectedRoute><InsuranceProviderForm /></ProtectedRoute>} />
          <Route path="insurance/edit/:id" element={<ProtectedRoute><InsuranceProviderForm /></ProtectedRoute>} />
          <Route path="insurance/:id" element={<ProtectedRoute><InsuranceProviderDetails /></ProtectedRoute>} />
          <Route path="insurance/:id/patients" element={<ProtectedRoute><InsuranceProviderPatients /></ProtectedRoute>} />
          
          {/* Rota para análise de dados */}
          <Route path="analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          
          {/* Rota para histórico de preços */}
          <Route path="medicines/:medicineId/suppliers/:supplierId/prices" element={<ProtectedRoute><PriceHistoryPage /></ProtectedRoute>} />
          
          {/* Rota para detalhes do medicamento */}
          <Route path="medicines/:id" element={<ProtectedRoute><MedicineDetails /></ProtectedRoute>} />
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
  const location = useLocation();

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

  // Verificar se um link está ativo
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <div className="app-container">
      <BootstrapNavbar expand={false} className="navbar-expressmed mb-0">
        <Container fluid>
          <Button 
            variant="link" 
            className="me-2 d-lg-none text-white" 
            onClick={handleShowSidebar}
          >
            <MenuButtonWide size={24} />
          </Button>
          <BootstrapNavbar.Brand as={Link} to="/" className="navbar-brand-expressmed">
            <img src="/images/expressmed-logo.svg" alt="ExpressMed Logo" className="navbar-logo" />
            ExpressMed
          </BootstrapNavbar.Brand>
          <Dropdown align="end" className="user-dropdown">
            <Dropdown.Toggle id="dropdown-user">
              <Person size={20} className="me-2" /> {user?.email?.split('@')[0] || 'Usuário'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item as={Link} to="/profile">
                <Person size={16} className="me-2" /> Perfil
              </Dropdown.Item>
              <Dropdown.Item as={Link} to="/settings">
                <Gear size={16} className="me-2" /> Configurações
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={handleLogout}>
                <BoxArrowRight size={16} className="me-2" /> Sair
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Container>
      </BootstrapNavbar>

      <div className="d-flex flex-grow-1">
        {/* Sidebar para telas grandes */}
        <div className="sidebar d-none d-lg-block">
          <div className="sidebar-header">
            <img src="/images/expressmed-logo.svg" alt="ExpressMed Logo" height="40" className="d-block mx-auto mb-2" />
          </div>
          <div className="px-3">
            <Nav className="flex-column">
              <div className="sidebar-category">Principal</div>
              <Nav.Link 
                as={Link} 
                to="/dashboard" 
                className={`d-flex align-items-center ${isActive('/dashboard') ? 'active' : ''}`}
              >
                <House className="nav-icon" /> Dashboard
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/list" 
                className={`d-flex align-items-center ${isActive('/list') ? 'active' : ''}`}
              >
                <List className="nav-icon" /> Medicamentos
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/search" 
                className={`d-flex align-items-center ${isActive('/search') ? 'active' : ''}`}
              >
                <Search className="nav-icon" /> Buscar
              </Nav.Link>
              
              <div className="sidebar-category">Gestão</div>
              <Nav.Link 
                as={Link} 
                to="/patients" 
                className={`d-flex align-items-center ${isActive('/patients') ? 'active' : ''}`}
              >
                <People className="nav-icon" /> Pacientes
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/quotes" 
                className={`d-flex align-items-center ${isActive('/quotes') ? 'active' : ''}`}
              >
                <Receipt className="nav-icon" /> Orçamentos
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/suppliers" 
                className={`d-flex align-items-center ${isActive('/suppliers') ? 'active' : ''}`}
              >
                <Building className="nav-icon" /> Fornecedores
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/insurance" 
                className={`d-flex align-items-center ${isActive('/insurance') ? 'active' : ''}`}
              >
                <Hospital className="nav-icon" /> Operadoras
              </Nav.Link>
              
              <div className="sidebar-category">Análises</div>
              <Nav.Link 
                as={Link} 
                to="/substance-analysis" 
                className={`d-flex align-items-center ${isActive('/substance-analysis') ? 'active' : ''}`}
              >
                <FileEarmarkText className="nav-icon" /> Substâncias
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/analytics" 
                className={`d-flex align-items-center ${isActive('/analytics') ? 'active' : ''}`}
              >
                <BarChartFill className="nav-icon" /> Dados
              </Nav.Link>
              
              <div className="sidebar-category">Sistema</div>
              <Nav.Link 
                as={Link} 
                to="/import" 
                className={`d-flex align-items-center ${isActive('/import') ? 'active' : ''}`}
              >
                <Upload className="nav-icon" /> Importar
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/logs" 
                className={`d-flex align-items-center ${isActive('/logs') ? 'active' : ''}`}
              >
                <Journal className="nav-icon" /> Logs
              </Nav.Link>
            </Nav>
          </div>
        </div>

        {/* Sidebar para telas pequenas (offcanvas) */}
        <Offcanvas show={showSidebar} onHide={handleCloseSidebar} className="sidebar-offcanvas">
          <Offcanvas.Header closeButton>
            <Offcanvas.Title className="d-flex align-items-center">
              <img src="/images/expressmed-logo.svg" alt="ExpressMed Logo" height="30" className="me-2" />
              ExpressMed
            </Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body>
            <Nav className="flex-column">
              <div className="sidebar-category">Principal</div>
              <Nav.Link 
                as={Link} 
                to="/dashboard" 
                className={`d-flex align-items-center ${isActive('/dashboard') ? 'active' : ''}`}
                onClick={handleCloseSidebar}
              >
                <House className="nav-icon" /> Dashboard
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/list" 
                className={`d-flex align-items-center ${isActive('/list') ? 'active' : ''}`}
                onClick={handleCloseSidebar}
              >
                <List className="nav-icon" /> Medicamentos
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/search" 
                className={`d-flex align-items-center ${isActive('/search') ? 'active' : ''}`}
                onClick={handleCloseSidebar}
              >
                <Search className="nav-icon" /> Buscar
              </Nav.Link>
              
              <div className="sidebar-category">Gestão</div>
              <Nav.Link 
                as={Link} 
                to="/patients" 
                className={`d-flex align-items-center ${isActive('/patients') ? 'active' : ''}`}
                onClick={handleCloseSidebar}
              >
                <People className="nav-icon" /> Pacientes
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/quotes" 
                className={`d-flex align-items-center ${isActive('/quotes') ? 'active' : ''}`}
                onClick={handleCloseSidebar}
              >
                <Receipt className="nav-icon" /> Orçamentos
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/suppliers" 
                className={`d-flex align-items-center ${isActive('/suppliers') ? 'active' : ''}`}
                onClick={handleCloseSidebar}
              >
                <Building className="nav-icon" /> Fornecedores
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/insurance" 
                className={`d-flex align-items-center ${isActive('/insurance') ? 'active' : ''}`}
                onClick={handleCloseSidebar}
              >
                <Hospital className="nav-icon" /> Operadoras
              </Nav.Link>
              
              <div className="sidebar-category">Análises</div>
              <Nav.Link 
                as={Link} 
                to="/substance-analysis" 
                className={`d-flex align-items-center ${isActive('/substance-analysis') ? 'active' : ''}`}
                onClick={handleCloseSidebar}
              >
                <FileEarmarkText className="nav-icon" /> Substâncias
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/analytics" 
                className={`d-flex align-items-center ${isActive('/analytics') ? 'active' : ''}`}
                onClick={handleCloseSidebar}
              >
                <BarChartFill className="nav-icon" /> Dados
              </Nav.Link>
              
              <div className="sidebar-category">Sistema</div>
              <Nav.Link 
                as={Link} 
                to="/import" 
                className={`d-flex align-items-center ${isActive('/import') ? 'active' : ''}`}
                onClick={handleCloseSidebar}
              >
                <Upload className="nav-icon" /> Importar
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/logs" 
                className={`d-flex align-items-center ${isActive('/logs') ? 'active' : ''}`}
                onClick={handleCloseSidebar}
              >
                <Journal className="nav-icon" /> Logs
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
