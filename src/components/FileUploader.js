import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Form, Alert, Spinner } from 'react-bootstrap';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { isDataValida, formatarParaISO, converterStringParaData } from '../utils/DateUtils';

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
        // Função para carregar um script externo com retry
        function loadScript(url, retries = 3, delay = 1000) {
          return new Promise((resolve, reject) => {
            try {
              importScripts(url);
              console.log('Script carregado com sucesso:', url);
              resolve();
            } catch (error) {
              if (retries > 0) {
                console.warn(\`Falha ao carregar script \${url}, tentando novamente... Tentativas restantes: \${retries}\`);
                setTimeout(() => {
                  loadScript(url, retries - 1, delay)
                    .then(resolve)
                    .catch(reject);
                }, delay);
              } else {
                console.error('Erro ao carregar script após várias tentativas:', url, error);
                reject(error);
              }
            }
          });
        }

        // Carregar os scripts com retry
        async function loadDependencies() {
          try {
            // Tentar múltiplos CDNs para cada biblioteca
            try {
              await loadScript('https://unpkg.com/papaparse@5.3.0/papaparse.min.js');
            } catch (e1) {
              try {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js');
              } catch (e2) {
                await loadScript('https://cdn.jsdelivr.net/npm/papaparse@5.3.0/papaparse.min.js');
              }
            }

            try {
              await loadScript('https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js');
            } catch (e1) {
              try {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
              } catch (e2) {
                await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
              }
            }

            self.postMessage({ type: 'workerReady' });
          } catch (error) {
            self.postMessage({ 
              type: 'error', 
              error: 'Erro ao carregar bibliotecas externas. Tente novamente ou use outro navegador. ' + error.message 
            });
          }
        }

        // Iniciar carregamento de dependências
        loadDependencies();
        
        let allData = [];
        let headers = [];
        let fileType = '';
        let totalChunks = 0;
        let processedChunks = 0;
        let dataTypePredictions = {}; // Para armazenar previsões de tipos de dados
        
        // Função auxiliar para detectar se um valor é uma data
        function isDate(value) {
          if (!value) return false;
          
          // Converter para string caso seja um número
          const strValue = String(value).trim();
          
          // Verificar padrões comuns de data
          const isoPattern = /^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2})?/;
          const brPattern = /^\\d{2}\\/\\d{2}\\/\\d{4}/;
          const usPattern = /^\\d{1,2}\\/\\d{1,2}\\/\\d{4}/;
          const dotPattern = /^\\d{2}\\.\\d{2}\\.\\d{4}/;
          
          return isoPattern.test(strValue) || 
                 brPattern.test(strValue) || 
                 usPattern.test(strValue) || 
                 dotPattern.test(strValue);
        }
        
        // Função para tentar padronizar uma data para ISO
        function standardizeDate(value) {
          if (!value) return value;
          
          try {
            const strValue = String(value).trim();
            
            // Padrão ISO
            if (/^\\d{4}-\\d{2}-\\d{2}/.test(strValue)) {
              // Já está no formato ISO
              return strValue.split('T')[0]; // Remove parte da hora se existir
            }
            
            // Padrão Brasileiro (DD/MM/YYYY)
            if (/^\\d{2}\\/\\d{2}\\/\\d{4}/.test(strValue)) {
              const parts = strValue.split('/');
              return \`\${parts[2]}-\${parts[1]}-\${parts[0]}\`;
            }
            
            // Padrão Americano (MM/DD/YYYY)
            if (/^\\d{1,2}\\/\\d{1,2}\\/\\d{4}/.test(strValue)) {
              const parts = strValue.split('/');
              // Verificar se é realmente MM/DD ou DD/MM
              const month = parseInt(parts[0], 10);
              const day = parseInt(parts[1], 10);
              
              if (month <= 12) {
                return \`\${parts[2]}-\${month.toString().padStart(2, '0')}-\${day.toString().padStart(2, '0')}\`;
              }
            }
            
            // Formato com pontos (DD.MM.YYYY)
            if (/^\\d{2}\\.\\d{2}\\.\\d{4}/.test(strValue)) {
              const parts = strValue.split('.');
              return \`\${parts[2]}-\${parts[1]}-\${parts[0]}\`;
            }
            
            // Tentar com o Date padrão do JavaScript
            const date = new Date(strValue);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          } catch (e) {
            // Em caso de erro, retornar o valor original
            console.error('Erro ao padronizar data:', e);
          }
          
          return value;
        }
        
        // Função para detectar tipos de dados
        function detectDataTypes(samples, headers) {
          const types = {};
          
          headers.forEach(header => {
            let dateSamples = 0;
            let numericSamples = 0;
            let totalNonEmptySamples = 0;
            
            samples.forEach(row => {
              const value = row[header];
              if (value !== null && value !== undefined && value !== '') {
                totalNonEmptySamples++;
                
                if (isDate(value)) {
                  dateSamples++;
                } else if (!isNaN(parseFloat(value)) && isFinite(value)) {
                  numericSamples++;
                }
              }
            });
            
            // Determinar o tipo mais provável
            if (totalNonEmptySamples > 0) {
              if (dateSamples / totalNonEmptySamples > 0.7) {
                types[header] = 'date';
              } else if (numericSamples / totalNonEmptySamples > 0.7) {
                types[header] = 'numeric';
              } else {
                types[header] = 'string';
              }
            } else {
              types[header] = 'unknown';
            }
          });
          
          return types;
        }
        
        // Função para processar valores com base nos tipos detectados
        function processValuesBasedOnTypes(data, types) {
          return data.map(row => {
            const processedRow = {...row};
            
            Object.keys(types).forEach(header => {
              if (types[header] === 'date' && row[header]) {
                processedRow[header] = standardizeDate(row[header]);
              } else if (types[header] === 'numeric' && row[header]) {
                // Converter vírgula para ponto em valores numéricos
                processedRow[header] = parseFloat(String(row[header]).replace(',', '.'));
              }
            });
            
            return processedRow;
          });
        }

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
                
                // Processar o primeiro chunk para detectar tipos de dados
                if (allData.length === 0 && dataTypePredictions && Object.keys(dataTypePredictions).length === 0) {
                  dataTypePredictions = detectDataTypes(results.data, headers);
                  console.log('Tipos de dados detectados:', dataTypePredictions);
                }
                
                // Processar valores baseado nos tipos detectados
                const processedData = processValuesBasedOnTypes(results.data, dataTypePredictions);
                
                // Enviar chunk para o thread principal
                self.postMessage({ 
                  type: 'chunk', 
                  data: processedData,
                  totalRows: allData.length + processedData.length,
                  progress: processedChunks / totalChunks
                });
                
                // Adicionar apenas os primeiros 200 registros para preview
                if (allData.length < 200) {
                  const remaining = 200 - allData.length;
                  allData = allData.concat(processedData.slice(0, remaining));
                }
                
                processedChunks++;
              },
              complete: function(results) {
                self.postMessage({ 
                  type: 'complete', 
                  headers: headers,
                  sampleData: allData,
                  totalRows: results.meta.cursor,
                  dataTypes: dataTypePredictions
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
                
                // Processar e detectar tipos de dados com uma amostra do início 
                const sampleRows = rows.slice(0, Math.min(100, rows.length));
                const sampleWithHeaders = sampleRows.map(row => {
                  const obj = {};
                  headers.forEach((header, index) => {
                    obj[header] = row[index];
                  });
                  return obj;
                });
                
                // Detectar tipos de dados
                dataTypePredictions = detectDataTypes(sampleWithHeaders, headers.map(h => String(h)));
                console.log('Tipos de dados detectados (Excel):', dataTypePredictions);
                
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
                  
                  // Processar valores com base nos tipos detectados
                  const processedChunk = processValuesBasedOnTypes(chunkWithHeaders, dataTypePredictions);
                  
                  processedChunks++;
                  
                  // Enviar chunk para o thread principal
                  self.postMessage({ 
                    type: 'chunk', 
                    data: processedChunk,
                    totalRows: i + processedChunk.length,
                    progress: processedChunks / totalChunks
                  });
                  
                  // Armazenar apenas os primeiros 200 para preview
                  if (allData.length < 200) {
                    const remaining = 200 - allData.length;
                    allData = allData.concat(processedChunk.slice(0, remaining));
                  }
                }
                
                // Enviar conclusão
                self.postMessage({ 
                  type: 'complete', 
                  headers: headers.map(h => String(h)),
                  sampleData: allData,
                  totalRows: rows.length,
                  dataTypes: dataTypePredictions
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
        const { type, headers, sampleData, data: chunkData, error, progress, totalRows, dataTypes } = e.data;
        
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
              console.log('Tipos de dados detectados:', dataTypes);
              
              // Incluir informações sobre colunas de data
              const dateCols = Object.entries(dataTypes || {})
                .filter(([key, value]) => value === 'date')
                .map(([key]) => key);
                
              console.log('Colunas de data detectadas:', dateCols);
              
              // Passar dados para o componente pai
              onFileLoaded(
                sampleData, 
                headers, 
                file.name, 
                totalRows, 
                dataToPass, 
                { 
                  dataTypes,
                  dateCols 
                }
              );
            }
            break;
            
          case 'error':
            setLoading(false);
            setError(error || 'Erro ao processar arquivo');
            break;
            
          case 'workerReady':
            setWorkerInitialized(true);
            break;
        }
      };
      
      workerRef.current.onerror = (error) => {
        setLoading(false);
        setError(`Erro no worker: ${error.message}`);
      };
      
    }
    
    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [file, onFileLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

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
