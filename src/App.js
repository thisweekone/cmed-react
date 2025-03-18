import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Container, Nav, Navbar } from 'react-bootstrap';
import ImportPage from './pages/ImportPage';
import SearchPage from './pages/SearchPage';
import ListPage from './pages/ListPage';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
    <div>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand as={Link} to="/">CMED Manager</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/import">Importar Tabela</Nav.Link>
              <Nav.Link as={Link} to="/list">Listar Medicamentos</Nav.Link>
              <Nav.Link as={Link} to="/search">Pesquisar Medicamentos</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Routes>
        <Route path="/import" element={<ImportPage />} />
        <Route path="/list" element={<ListPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/" element={<ImportPage />} />
      </Routes>
    </div>
  );
}

export default App;
