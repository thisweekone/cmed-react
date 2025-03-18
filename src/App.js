import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Container, Nav, Navbar } from 'react-bootstrap';
import HomePage from './pages/HomePage';
import ImportPage from './pages/ImportPage';
import ListPage from './pages/ListPage';
import './styles/App.css';

function App() {
  return (
    <div className="App">
      <Navbar bg="primary" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand as={Link} to="/">Sistema CMED</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/">Home</Nav.Link>
              <Nav.Link as={Link} to="/import">Importação</Nav.Link>
              <Nav.Link as={Link} to="/list">Listar Medicamentos</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="mt-4">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/list" element={<ListPage />} />
        </Routes>
      </Container>

      <footer className="footer mt-auto py-3 bg-light">
        <Container>
          <span className="text-muted">Sistema CMED © {new Date().getFullYear()}</span>
        </Container>
      </footer>
    </div>
  );
}

export default App;
