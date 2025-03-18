import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Form, Alert, Spinner } from 'react-bootstrap';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const FileUploader = ({ onFileLoaded }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [workerInitialized, setWorkerInitialized] = useState(false);
  const [fullDataBuffer, setFullDataBuffer] = useState([]);
  const fileInputRef = useRef(null);
  const workerRef = useRef(null);
  const dataBufferRef = useRef([]);

  // Inicializar Web Worker
  useEffect(() => {
    // Função para criar o código do worker como Blob
    const createWorkerBlob = () => {
      const workerCode = `
        // Worker para processamento de CSV/Excel
        importScripts('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js');
        importScripts('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
        
        let allData = [];
        let headers = [];
        let fileType = '';
        let totalChunks = 0;
        let processedChunks = 0;

        self.onmessage = function(e) {
          const { type, data } = e.data;
          
          if (type === 'processCSV') {
            const { file, chunkSize } = data;
            fileType = 'csv';
            
            Papa.parse(file, {
              header: true,
              dynamicTyping: true,
              skipEmptyLines: true,
              chunk: function(results, parser) {
                if (headers.length === 0 && results.meta.fields) {
                  headers = results.meta.fields;
                }
                
                // Enviar chunk para o thread principal
                self.postMessage({ 
                  type: 'chunk', 
                  data: results.data,
                  totalRows: allData.length + results.data.length,
                  progress: processedChunks / totalChunks
                });
                
                // Adicionar apenas os primeiros 200 registros para preview
                if (allData.length < 200) {
                  const remaining = 200 - allData.length;
                  allData = allData.concat(results.data.slice(0, remaining));
                }
                
                processedChunks++;
              },
              complete: function(results) {
                self.postMessage({ 
                  type: 'complete', 
                  headers: headers,
                  sampleData: allData,
                  totalRows: results.meta.cursor
                });
              },
              error: function(error) {
                self.postMessage({ type: 'error', error: error.message });
              },
              // Estimar número total de chunks para cálculo de progresso
              beforeFirstChunk: function(chunk) {
                const lines = chunk.split('\\n').length;
                const fileSize = file.size;
                const avgLineSize = chunk.length / lines;
                totalChunks = Math.ceil(fileSize / (chunkSize || 500000));
              }
            });
          } 
          else if (type === 'processExcel') {
            fileType = 'excel';
            try {
              const { arrayBuffer } = data;
              const workbook = XLSX.read(arrayBuffer, { type: 'array' });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              
              // Converter para JSON
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              
              if (jsonData.length > 0) {
                headers = jsonData[0];
                
                // Processar em chunks
                const chunkSize = 1000;
                const rows = jsonData.slice(1); // Remove header row
                totalChunks = Math.ceil(rows.length / chunkSize);
                
                // Processar dados em chunks para não congelar
                for (let i = 0; i < rows.length; i += chunkSize) {
                  const chunk = rows.slice(i, i + chunkSize);
                  
                  // Converter chunk para objetos com cabeçalhos
                  const chunkWithHeaders = chunk.map(row => {
                    const obj = {};
                    headers.forEach((header, index) => {
                      obj[header] = row[index];
                    });
                    return obj;
                  });
                  
                  processedChunks++;
                  
                  // Enviar chunk para o thread principal
                  self.postMessage({ 
                    type: 'chunk', 
                    data: chunkWithHeaders,
                    totalRows: i + chunkWithHeaders.length,
                    progress: processedChunks / totalChunks
                  });
                  
                  // Armazenar apenas os primeiros 200 para preview
                  if (allData.length < 200) {
                    const remaining = 200 - allData.length;
                    allData = allData.concat(chunkWithHeaders.slice(0, remaining));
                  }
                }
                
                // Enviar conclusão
                self.postMessage({ 
                  type: 'complete', 
                  headers: headers.map(h => String(h)),
                  sampleData: allData,
                  totalRows: rows.length
                });
              } else {
                self.postMessage({ type: 'error', error: 'Arquivo vazio ou inválido' });
              }
            } catch (error) {
              self.postMessage({ type: 'error', error: error.message });
            }
          }
        };
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      return URL.createObjectURL(blob);
    };

    // Inicializar o worker apenas se estiver em um ambiente browser
    if (typeof window !== 'undefined' && !workerRef.current) {
      const workerUrl = createWorkerBlob();
      workerRef.current = new Worker(workerUrl);
      
      // Configurar event handlers
      workerRef.current.onmessage = (e) => {
        const { type, headers, sampleData, data: chunkData, error, progress, totalRows } = e.data;
        
        switch (type) {
          case 'chunk':
            setProgress(Math.min(99, progress * 100));
            // Acumular todos os dados no buffer
            if (chunkData && chunkData.length > 0) {
              dataBufferRef.current = [...dataBufferRef.current, ...chunkData];
              console.log(`Recebido chunk com ${chunkData.length} registros. Total acumulado: ${dataBufferRef.current.length}`);
            }
            break;
            
          case 'complete':
            setLoading(false);
            setProgress(100);
            console.log(`Processamento completo. Dados acumulados: ${dataBufferRef.current.length}, Total esperado: ${totalRows}`);
            if (onFileLoaded && headers && sampleData) {
              // Verificar se temos todos os dados ou apenas amostra
              const dataToPass = dataBufferRef.current.length > 0 ? dataBufferRef.current : sampleData;
              console.log(`Enviando ${dataToPass.length} registros para ImportPage`);
              onFileLoaded(sampleData, headers, file.name, totalRows, dataToPass);
            }
            break;
            
          case 'error':
            setLoading(false);
            setError(error || 'Erro ao processar arquivo');
            break;
        }
      };
      
      workerRef.current.onerror = (error) => {
        setLoading(false);
        setError(`Erro no worker: ${error.message}`);
      };
      
      setWorkerInitialized(true);
    }
    
    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [file, onFileLoaded]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      dataBufferRef.current = [];
      setProgress(0);
    }
  };

  const processFile = async () => {
    if (!file) {
      setError('Por favor, selecione um arquivo.');
      return;
    }

    setLoading(true);
    setProgress(0);
    setError(null);

    try {
      const fileExtension = file.name.split('.').pop().toLowerCase();

      // Processar CSV via worker
      if (fileExtension === 'csv') {
        workerRef.current.postMessage({ 
          type: 'processCSV', 
          data: { file, chunkSize: 500000 } 
        });
      }
      // Processar Excel via worker
      else if (['xlsx', 'xls'].includes(fileExtension)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const arrayBuffer = e.target.result;
          workerRef.current.postMessage({ 
            type: 'processExcel', 
            data: { arrayBuffer }
          });
        };
        reader.readAsArrayBuffer(file);
      } 
      else {
        setLoading(false);
        setError('Formato de arquivo não suportado. Por favor, envie um arquivo CSV, XLS ou XLSX.');
      }
    } catch (err) {
      setLoading(false);
      setError(`Erro ao processar arquivo: ${err.message}`);
      console.error('Erro ao processar arquivo:', err);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}

        <Form.Group controlId="fileUpload" className="mb-3">
          <Form.Label>Selecione um arquivo CSV, XLS ou XLSX:</Form.Label>
          <Form.Control
            ref={fileInputRef}
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={handleFileChange}
            disabled={loading}
          />
          <Form.Text className="text-muted">
            O arquivo deve conter os dados da tabela CMED para importação.
          </Form.Text>
        </Form.Group>

        {progress > 0 && progress < 100 && (
          <div className="mb-3">
            <div className="progress">
              <div 
                className="progress-bar" 
                role="progressbar" 
                style={{ width: `${progress}%` }} 
                aria-valuenow={progress} 
                aria-valuemin="0" 
                aria-valuemax="100"
              >
                {Math.round(progress)}%
              </div>
            </div>
            <small className="text-muted mt-1 d-block">
              Processando arquivo, por favor aguarde...
            </small>
          </div>
        )}

        <div className="d-flex justify-content-end">
          {loading ? (
            <Button variant="primary" disabled>
              <Spinner animation="border" size="sm" className="me-2" />
              Processando...
            </Button>
          ) : (
            <Button 
              variant="primary" 
              onClick={processFile} 
              disabled={!file || !workerInitialized}
            >
              Carregar Arquivo
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default FileUploader;
