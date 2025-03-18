import React, { useState } from 'react';
import { Card, Button, Alert, Spinner, Tabs, Tab } from 'react-bootstrap';
import FileUploader from '../components/FileUploader';
import ColumnMapper from '../components/ColumnMapper';
import supabase from '../services/supabaseClient';

const ImportPage = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [fileData, setFileData] = useState(null);
  const [fileColumns, setFileColumns] = useState([]);
  const [fileName, setFileName] = useState('');
  const [mappedData, setMappedData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileLoaded = (data, columns, name) => {
    setFileData(data);
    setFileColumns(columns);
    setFileName(name);
    setActiveTab('map');
  };

  const handleMapComplete = (columnMapping) => {
    try {
      // Transformar os dados de acordo com o mapeamento
      const transformedData = fileData.map(row => {
        const newRow = {};
        
        // Para cada campo em nossa aplicação
        Object.entries(columnMapping).forEach(([targetField, sourceColumn]) => {
          // Se a coluna de origem existe nos dados
          if (sourceColumn && row[sourceColumn] !== undefined) {
            // Tratamento especial para alguns campos
            if (targetField === 'pf_sem_impostos') {
              // Converter para número e tratar formatos de moeda
              let value = row[sourceColumn];
              if (typeof value === 'string') {
                // Remover R$, espaços e trocar vírgula por ponto
                value = value.replace(/R\$|\s/g, '').replace(',', '.');
              }
              newRow[targetField] = parseFloat(value) || null;
            } 
            else if (targetField === 'data_publicacao') {
              // Tratar data
              let dateValue = row[sourceColumn];
              if (dateValue) {
                // Tentar converter de formatos comuns como DD/MM/YYYY
                if (typeof dateValue === 'string' && dateValue.includes('/')) {
                  const parts = dateValue.split('/');
                  if (parts.length === 3) {
                    // Assumir DD/MM/YYYY
                    dateValue = `${parts[2]}-${parts[1]}-${parts[0]}`;
                  }
                }
                // Se for um objeto Date do Excel
                if (typeof dateValue === 'number') {
                  // Converter número do Excel para data JavaScript
                  const excelEpoch = new Date(1899, 11, 30);
                  const millisPerDay = 24 * 60 * 60 * 1000;
                  dateValue = new Date(excelEpoch.getTime() + dateValue * millisPerDay);
                  dateValue = dateValue.toISOString().split('T')[0];
                }
                newRow[targetField] = dateValue;
              } else {
                newRow[targetField] = null;
              }
            }
            else {
              // Para outros campos, converter para string
              newRow[targetField] = String(row[sourceColumn]);
            }
          } else {
            newRow[targetField] = null;
          }
        });
        
        return newRow;
      });
      
      // Armazenar os dados transformados
      setMappedData(transformedData);
      setActiveTab('confirm');
    } catch (err) {
      console.error('Erro ao mapear dados:', err);
      setError(`Erro ao processar o mapeamento: ${err.message}`);
    }
  };

  const handleUpload = async () => {
    if (!mappedData || mappedData.length === 0) {
      setError('Nenhum dado disponível para importação');
      return;
    }
    
    setUploading(true);
    setError(null);
    setUploadResult(null);
    
    try {
      // Registrar a importação
      const { data: importData, error: importError } = await supabase
        .from('importacoes')
        .insert([
          { 
            nome_arquivo: fileName,
            total_registros: mappedData.length,
            data_importacao: new Date().toISOString()
          }
        ])
        .select();
      
      if (importError) throw importError;
      
      const importId = importData[0].id;
      
      // Inserir os medicamentos em lotes para evitar exceder limites
      const batchSize = 100;
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < mappedData.length; i += batchSize) {
        const batch = mappedData.slice(i, i + batchSize).map(item => ({
          ...item,
          importacao_id: importId
        }));
        
        const { data, error } = await supabase
          .from('medicamentos')
          .insert(batch);
        
        if (error) {
          console.error('Erro ao inserir lote:', error);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }
      }
      
      // Atualizar o status da importação
      await supabase
        .from('importacoes')
        .update({ 
          registros_importados: successCount,
          registros_com_erro: errorCount,
          status: errorCount > 0 ? 'parcial' : 'completo'
        })
        .eq('id', importId);
      
      setUploadResult({
        importId,
        total: mappedData.length,
        success: successCount,
        errors: errorCount
      });
      
      // Resetar estado se completou com sucesso
      if (errorCount === 0) {
        setTimeout(() => {
          setFileData(null);
          setFileColumns([]);
          setFileName('');
          setMappedData(null);
          setActiveTab('upload');
        }, 3000);
      }
    } catch (err) {
      console.error('Erro na importação:', err);
      setError(`Erro ao realizar importação: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const renderUploadTab = () => (
    <div>
      <h4 className="mb-3">Carregar Arquivo</h4>
      <p>
        Selecione um arquivo CSV, XLS ou XLSX contendo dados da tabela CMED para importação.
        O sistema irá processar o arquivo e permitirá que você mapeie as colunas.
      </p>
      <FileUploader onFileLoaded={handleFileLoaded} />
    </div>
  );

  const renderMapTab = () => (
    <ColumnMapper 
      sourceColumns={fileColumns}
      sampleData={fileData?.slice(0, 5) || []}
      onMapComplete={handleMapComplete}
    />
  );

  const renderConfirmTab = () => (
    <div>
      <h4 className="mb-3">Confirmar Importação</h4>
      
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      
      {uploadResult && (
        <Alert 
          variant={uploadResult.errors > 0 ? "warning" : "success"}
          onClose={() => setUploadResult(null)} 
          dismissible
        >
          <Alert.Heading>
            {uploadResult.errors > 0 
              ? "Importação concluída com avisos" 
              : "Importação concluída com sucesso"}
          </Alert.Heading>
          <p>
            ID da importação: <strong>{uploadResult.importId}</strong><br />
            Total de registros: <strong>{uploadResult.total}</strong><br />
            Registros importados: <strong>{uploadResult.success}</strong><br />
            Registros com erro: <strong>{uploadResult.errors}</strong>
          </p>
        </Alert>
      )}
      
      <Card className="mb-4">
        <Card.Header>Resumo da Importação</Card.Header>
        <Card.Body>
          <div>
            <p><strong>Arquivo:</strong> {fileName}</p>
            <p><strong>Total de registros:</strong> {mappedData?.length || 0}</p>
            <p><strong>Campos mapeados:</strong> {
              mappedData && Object.keys(mappedData[0]).length
            }</p>
          </div>
          
          <div className="d-flex justify-content-end">
            {uploading ? (
              <Button variant="primary" disabled>
                <Spinner animation="border" size="sm" className="me-2" />
                Importando...
              </Button>
            ) : (
              <Button 
                variant="primary" 
                onClick={handleUpload}
                disabled={!mappedData || mappedData.length === 0}
              >
                Iniciar Importação
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>
      
      <Card>
        <Card.Header>Amostra dos Dados a Serem Importados</Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <table className="table table-sm table-striped table-bordered">
              <thead>
                <tr>
                  {mappedData && Object.keys(mappedData[0]).map((key, idx) => (
                    <th key={idx}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mappedData?.slice(0, 5).map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {Object.values(row).map((value, valIdx) => (
                      <td key={valIdx}>{value !== null ? String(value) : '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );

  return (
    <div>
      <h2 className="mb-4">Importação de Dados CMED</h2>
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => {
          // Só permitir navegação para abas anteriores ou a atual
          if (
            (k === 'upload') || 
            (k === 'map' && fileData) ||
            (k === 'confirm' && mappedData)
          ) {
            setActiveTab(k);
          }
        }}
        className="mb-4"
      >
        <Tab eventKey="upload" title="1. Carregar Arquivo">
          {renderUploadTab()}
        </Tab>
        <Tab 
          eventKey="map" 
          title="2. Mapear Colunas"
          disabled={!fileData}
        >
          {fileData && renderMapTab()}
        </Tab>
        <Tab 
          eventKey="confirm" 
          title="3. Confirmar Importação"
          disabled={!mappedData}
        >
          {mappedData && renderConfirmTab()}
        </Tab>
      </Tabs>
    </div>
  );
};

export default ImportPage;
