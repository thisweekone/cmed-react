import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Alert, Button, Card, ProgressBar } from 'react-bootstrap';
import { FiUpload, FiFile, FiCheckCircle } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const FileUploader = ({ onFileLoaded }) => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileInfo, setFileInfo] = useState(null);

  // Função para processar os dados após eles serem carregados
  const processData = useCallback((data, columns, file) => {
    setProgress(90);
    setFileInfo({
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      rows: data.length,
      columns: columns.length
    });
    
    setProgress(100);
    setLoading(false);
    
    // Enviar dados para o componente pai
    onFileLoaded(data, columns, file.name);
  }, [onFileLoaded]);

  // Função para analisar o arquivo de dados
  const parseFileData = useCallback(async (file) => {
    setLoading(true);
    setProgress(10);
    
    try {
      let data = [];
      let columns = [];
      
      // Identificar tipo de arquivo pelo nome
      const fileExt = file.name.split('.').pop().toLowerCase();

      if (fileExt === 'csv') {
        // Processar arquivo CSV
        const text = await file.text();
        setProgress(40);
        
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            data = results.data;
            columns = results.meta.fields;
            setProgress(80);
            
            // Enviar dados para o componente pai
            processData(data, columns, file);
          },
          error: (error) => {
            setError(`Erro ao processar o arquivo CSV: ${error.message}`);
            setLoading(false);
          }
        });
      } else if (['xlsx', 'xls'].includes(fileExt)) {
        // Processar arquivo Excel
        const arrayBuffer = await file.arrayBuffer();
        setProgress(30);
        
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        setProgress(50);
        
        // Pegar a primeira planilha
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        
        // Converter para JSON
        data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        setProgress(70);
        
        if (data.length > 0) {
          columns = data[0];
          // Remover o cabeçalho e converter para objetos
          const rows = data.slice(1).map(row => {
            const obj = {};
            columns.forEach((col, index) => {
              obj[col] = row[index];
            });
            return obj;
          });
          
          // Enviar dados para o componente pai
          processData(rows, columns, file);
        } else {
          setError('Arquivo Excel vazio ou sem cabeçalhos válidos');
          setLoading(false);
        }
      } else {
        setError('Formato de arquivo não suportado. Por favor, envie arquivos CSV, XLS ou XLSX.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Erro ao processar arquivo:', err);
      setError(`Erro ao processar o arquivo: ${err.message || 'Erro desconhecido'}`);
      setLoading(false);
    }
  }, [processData]);

  const onDrop = useCallback((acceptedFiles) => {
    setError(null);
    
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      parseFileData(file);
    } else {
      setError('Nenhum arquivo válido selecionado');
    }
  }, [parseFileData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  });

  return (
    <div className="mb-4">
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      <div 
        {...getRootProps()} 
        className={`dropzone ${isDragActive ? 'active' : ''}`}
        style={{
          border: '2px dashed #0087F7',
          borderRadius: '5px',
          padding: '40px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          backgroundColor: isDragActive ? '#e6f7ff' : '#f8f9fc'
        }}
      >
        <input {...getInputProps()} />
        
        {loading ? (
          <div>
            <p>Processando arquivo...</p>
            <ProgressBar animated now={progress} label={`${progress}%`} className="my-3" />
          </div>
        ) : isDragActive ? (
          <div>
            <FiUpload size={50} color="#0087F7" />
            <p className="mt-3">Solte o arquivo aqui...</p>
          </div>
        ) : (
          <div>
            <FiUpload size={50} color="#0087F7" />
            <p className="mt-3">Arraste e solte um arquivo CSV, XLS ou XLSX aqui, ou clique para selecionar</p>
            <p className="text-muted">Somente arquivos CSV, XLS e XLSX são suportados</p>
          </div>
        )}
      </div>

      {fileInfo && !loading && (
        <Card className="mt-3">
          <Card.Header className="d-flex align-items-center">
            <FiCheckCircle className="text-success me-2" /> Arquivo carregado com sucesso
          </Card.Header>
          <Card.Body>
            <div className="d-flex align-items-center mb-3">
              <FiFile size={24} className="me-2" />
              <div>
                <h5 className="mb-0">{fileInfo.name}</h5>
                <small className="text-muted">
                  Tamanho: {fileInfo.size} • 
                  Linhas: {fileInfo.rows} • 
                  Colunas: {fileInfo.columns}
                </small>
              </div>
            </div>
            <Button 
              variant="outline-secondary" 
              size="sm" 
              onClick={() => {
                setFileInfo(null);
                setError(null);
              }}
            >
              Selecionar outro arquivo
            </Button>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default FileUploader;
