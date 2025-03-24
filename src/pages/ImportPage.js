import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Button, Form, Alert, Card, ProgressBar, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import FileUploader from '../components/FileUploader';
import { formatarData, validarData } from '../utils/DateUtils';
import { atualizarFuncaoConversaoData, limparDadosBanco } from '../utils/DatabaseSetup';
import { processarArquivo } from '../utils/FileProcessor';
import { salvarLog } from '../utils/LogUtils';

function ImportPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mappings, setMappings] = useState({});
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [availableSheets, setAvailableSheets] = useState([]);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    // Limpar estados quando o componente é montado
    setFile(null);
    setError(null);
    setSuccess(false);
    setProgress(0);
    setPreviewData(null);
    setShowPreview(false);
  }, []);

  const handleFileChange = async (uploadedFile) => {
    setFile(uploadedFile);
    setError(null);
    setSuccess(false);
    setProgress(0);
    setPreviewData(null);
    setShowPreview(false);

    try {
      const fileData = await readFileData(uploadedFile);
      
      // Processar o arquivo e obter preview
      const { data: previewRows, headers, sheets } = await processarArquivo(fileData);
      
      if (sheets && sheets.length > 0) {
        setAvailableSheets(sheets);
        setSelectedSheet(sheets[0]);
      }

      // Configurar mapeamento inicial
      const initialMappings = {};
      if (headers) {
        headers.forEach(header => {
          initialMappings[header] = '';
        });
      }
      setMappings(initialMappings);

      // Mostrar preview dos dados
      setPreviewData({
        headers,
        rows: previewRows
      });
      setShowPreview(true);

    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      setError('Erro ao processar o arquivo: ' + error.message);
    }
  };

  const readFileData = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Erro ao ler arquivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImport = async () => {
    if (!file) {
      setError('Por favor, selecione um arquivo para importar.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setProgress(0);

    // Criar um novo AbortController
    abortControllerRef.current = new AbortController();

    try {
      const fileData = await readFileData(file);
      
      // Processar e importar os dados
      await processAndImportData(fileData);

      setSuccess(true);
      setProgress(100);
      
      // Registrar log de sucesso
      await salvarLog({
        tipo: 'IMPORTACAO',
        status: 'SUCESSO',
        arquivo: file.name,
        detalhes: 'Importação concluída com sucesso'
      });

    } catch (error) {
      console.error('Erro durante importação:', error);
      setError('Erro durante a importação: ' + error.message);
      
      // Registrar log de erro
      await salvarLog({
        tipo: 'IMPORTACAO',
        status: 'ERRO',
        arquivo: file.name,
        detalhes: error.message
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setError('Importação cancelada pelo usuário.');
  };

  const handleClear = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await limparDadosBanco();
      setSuccess(true);
      
      // Registrar log de limpeza
      await salvarLog({
        tipo: 'LIMPEZA',
        status: 'SUCESSO',
        detalhes: 'Banco de dados limpo com sucesso'
      });
      
    } catch (error) {
      console.error('Erro ao limpar banco:', error);
      setError('Erro ao limpar banco de dados: ' + error.message);
      
      // Registrar log de erro na limpeza
      await salvarLog({
        tipo: 'LIMPEZA',
        status: 'ERRO',
        detalhes: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingChange = (header, value) => {
    setMappings(prev => ({
      ...prev,
      [header]: value
    }));
  };

  return (
    <Container className="mt-4">
      <h2>Importar Tabela CMED</h2>
      
      {error && (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" className="mt-3">
          Operação realizada com sucesso!
        </Alert>
      )}

      <Card className="mt-4">
        <Card.Body>
          <Row>
            <Col>
              <FileUploader onFileSelect={handleFileChange} />
            </Col>
          </Row>

          {isLoading && (
            <Row className="mt-3">
              <Col>
                <ProgressBar now={progress} label={`${progress}%`} />
              </Col>
            </Row>
          )}

          {showPreview && previewData && (
            <div className="mt-4">
              <h4>Preview dos Dados</h4>
              {availableSheets.length > 0 && (
                <Form.Group className="mb-3">
                  <Form.Label>Selecione a Planilha:</Form.Label>
                  <Form.Control
                    as="select"
                    value={selectedSheet}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                  >
                    {availableSheets.map((sheet, index) => (
                      <option key={index} value={sheet}>{sheet}</option>
                    ))}
                  </Form.Control>
                </Form.Group>
              )}
              
              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      {previewData.headers.map((header, index) => (
                        <th key={index}>
                          {header}
                          <Form.Control
                            as="select"
                            size="sm"
                            className="mt-2"
                            value={mappings[header] || ''}
                            onChange={(e) => handleMappingChange(header, e.target.value)}
                          >
                            <option value="">Selecione...</option>
                            <option value="produto">Produto</option>
                            <option value="apresentacao">Apresentação</option>
                            <option value="tipo_produto">Tipo de Produto</option>
                            <option value="categoria">Categoria</option>
                            <option value="classe_terapeutica">Classe Terapêutica</option>
                            <option value="laboratorio">Laboratório</option>
                            <option value="preco">Preço</option>
                            <option value="data_publicacao">Data de Publicação</option>
                          </Form.Control>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {Object.values(row).map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
          )}

          <Row className="mt-3">
            <Col>
              <Button 
                variant="primary" 
                onClick={handleImport}
                disabled={isLoading || !file}
                className="me-2"
              >
                {isLoading ? 'Importando...' : 'Importar'}
              </Button>
              
              {isLoading && (
                <Button 
                  variant="warning" 
                  onClick={handleCancel}
                  className="me-2"
                >
                  Cancelar
                </Button>
              )}
              
              <Button 
                variant="danger" 
                onClick={handleClear}
                disabled={isLoading}
                className="me-2"
              >
                Limpar Banco
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default ImportPage;
