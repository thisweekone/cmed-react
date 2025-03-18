import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, Alert, ProgressBar } from 'react-bootstrap';
import { format } from 'date-fns';
import supabase from '../services/supabaseClient';
import FileUploader from '../components/FileUploader';
import DataPreview from '../components/DataPreview';
import { useNavigate } from 'react-router-dom';

const ImportPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [fullData, setFullData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [fileName, setFileName] = useState('');
  const [totalRows, setTotalRows] = useState(0);
  const [mappings, setMappings] = useState({});
  const [dbInitialized, setDbInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [publicationDate, setPublicationDate] = useState('');
  const [importId, setImportId] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [processedRows, setProcessedRows] = useState(0);
  const [errorRows, setErrorRows] = useState(0);
  const [importStatus, setImportStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [batchSize, setBatchSize] = useState(500);

  // Verificar se as tabelas necessárias existem no banco de dados
  useEffect(() => {
    checkDatabase();
  }, []);

  const checkDatabase = async () => {
    const { data, error } = await supabase
      .from('medicamentos_base')
      .select('id')
      .limit(1);
    if (error) {
      console.error('Erro ao verificar banco de dados:', error);
      setError(`Erro na verificação do banco de dados: ${error.message}.`);
    } else {
      setDbInitialized(true);
    }
  };

  // Função chamada quando o arquivo é carregado pelo FileUploader
  const handleFileLoaded = (fileData, fileColumns, name, total, completeData) => {
    console.log('Dados recebidos do uploader:');
    console.log('fileData:', fileData);
    console.log('fileColumns:', fileColumns);
    console.log('name:', name);
    console.log('total:', total);
    console.log('completeData:', completeData);
    
    setData(fileData);
    setColumns(fileColumns);
    setFileName(name);
    setTotalRows(total || fileData.length);
    setError(null);
    
    // Armazenar dados completos, se disponíveis
    if (completeData && completeData.length > 0) {
      console.log(`Recebidos ${completeData.length} registros completos do uploader`);
      setFullData(completeData);
    } else {
      console.log('Apenas dados de preview disponíveis');
      setFullData(fileData);
    }
    
    // Iniciar com mappings vazios ou tentar mapear automaticamente
    const initialMappings = {};
    fileColumns.forEach(col => {
      // Tenta fazer um mapeamento automático por correspondência aproximada
      const normalizedCol = col.toLowerCase();
      if (normalizedCol.includes('subst') || normalizedCol.includes('princip')) {
        initialMappings['substancia'] = col;
      } else if (normalizedCol.includes('laborat')) {
        initialMappings['laboratorio'] = col;
      } else if (normalizedCol.includes('produt') && !normalizedCol.includes('tipo')) {
        initialMappings['produto'] = col;
      } else if (normalizedCol.includes('apres')) {
        initialMappings['apresentacao'] = col;
      } else if (normalizedCol.includes('ggrem') || (normalizedCol.includes('cod') && normalizedCol.includes('gg'))) {
        initialMappings['codigo_ggrem'] = col;
      } else if (normalizedCol.includes('regist')) {
        initialMappings['registro'] = col;
      } else if (normalizedCol.includes('ean') || normalizedCol.includes('barc')) {
        initialMappings['ean_1'] = col;
      } else if (normalizedCol.includes('clas') && (normalizedCol.includes('terap') || normalizedCol.includes('terapêutica'))) {
        initialMappings['classe_terapeutica'] = col;
      } else if (normalizedCol.includes('tipo') && normalizedCol.includes('prod')) {
        initialMappings['tipo_de_produto'] = col;
      } else if (normalizedCol.includes('regim') && normalizedCol.includes('pre')) {
        initialMappings['regime_de_preco'] = col;
      } else if (normalizedCol.includes('pf') && (normalizedCol.includes('sem') || normalizedCol.includes('0%'))) {
        initialMappings['pf_sem_impostos'] = col;
      }
    });
    
    setMappings(initialMappings);
    
    // Definir a data de publicação para o dia atual por padrão
    setPublicationDate(format(new Date(), 'yyyy-MM-dd'));
  };

  // Função para criar o registro de importação
  const createImportRecord = async () => {
    const { data, error } = await supabase
      .from('importacoes')
      .insert([
        {
          nome_arquivo: fileName,
          total_registros: totalRows,
          registros_importados: 0,
          registros_com_erro: 0,
          status: 'em_andamento'
        }
      ])
      .select();

    if (error) {
      console.error('Erro ao criar registro de importação:', error);
      throw new Error(`Erro ao criar registro de importação: ${error.message}`);
    }
    
    return data[0].id;
  };

  // Atualiza o registro de importação
  const updateImportRecord = async (id, importados, erros, status) => {
    const { error } = await supabase
      .from('importacoes')
      .update({
        registros_importados: importados,
        registros_com_erro: erros,
        status: status
      })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar registro de importação:', error);
    }
  };

  // Função principal para importar os dados
  const importData = async () => {
    // Verifica se as colunas necessárias estão mapeadas
    const requiredFields = ['substancia', 'laboratorio', 'produto', 'apresentacao', 
                           'codigo_ggrem', 'registro', 'ean_1', 'classe_terapeutica', 
                           'tipo_de_produto', 'regime_de_preco', 'pf_sem_impostos'];
    
    const missingFields = requiredFields.filter(field => !mappings[field]);
    
    if (missingFields.length > 0) {
      setError(`Os seguintes campos são obrigatórios: ${missingFields.join(', ')}`);
      return;
    }
    
    if (!publicationDate) {
      setError('A data de publicação é obrigatória');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      setIsImporting(true);
      setImportStatus('Preparando importação...');
      setImportProgress(0);
      setProcessedRows(0);
      setErrorRows(0);
      
      // Criar o registro de importação
      const importId = await createImportRecord();
      setImportId(importId);
      setImportStatus('Iniciando processamento de dados...');
      
      // Inicializar contadores
      let importados = 0;
      let erros = 0;
      let processed = 0;
      
      // Processar em lotes
      const dataToImport = fullData.length > 0 ? fullData : data;
      console.log(`Iniciando importação com ${dataToImport.length} registros em lotes de ${batchSize}`);

      // Dividir em lotes
      const batches = [];
      for (let i = 0; i < dataToImport.length; i += batchSize) {
        batches.push(dataToImport.slice(i, i + batchSize));
      }
      
      setImportStatus(`Importando ${dataToImport.length} registros em ${batches.length} lotes...`);
      console.log(`Dividido em ${batches.length} lotes`);
      
      // Processar cada lote
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        setImportStatus(`Processando lote ${batchIndex + 1} de ${batches.length}...`);
        console.log(`Processando lote ${batchIndex + 1} com ${batch.length} registros`);
        
        // Criar array de promessas para inserção em paralelo (limitada)
        const batchPromises = batch.map(row => processRow(row, importId));
        
        // Aguardar conclusão do lote atual
        const results = await Promise.allSettled(batchPromises);
        
        // Processar resultados deste lote
        results.forEach(result => {
          processed++;
          if (result.status === 'fulfilled') {
            importados++;
          } else {
            console.error('Erro ao importar linha:', result.reason);
            erros++;
          }
        });
        
        // Atualizar progresso e contadores
        const progress = (processed / dataToImport.length) * 100;
        setImportProgress(progress);
        setProcessedRows(importados);
        setErrorRows(erros);
        console.log(`Lote ${batchIndex + 1} concluído. Progresso: ${Math.round(progress)}%, Importados: ${importados}, Erros: ${erros}`);
        
        // Atualizar o registro de importação a cada lote
        await updateImportRecord(importId, importados, erros, 'em_andamento');
      }
      
      // Finalizar a importação
      await updateImportRecord(importId, importados, erros, 'concluido');
      setImportStatus('Importação concluída!');
      setImportProgress(100);
      setSuccess(true);
      
    } catch (err) {
      console.error('Erro durante a importação:', err);
      setError(`Erro durante a importação: ${err.message}`);
      
      // Atualizar o registro de importação em caso de erro
      if (importId) {
        await updateImportRecord(importId, processedRows, errorRows, 'erro');
      }
    } finally {
      setLoading(false);
      setIsImporting(false);
    }
  };

  // Função para buscar todos os dados do arquivo (usado quando temos apenas amostra)
  const fetchAllDataForImport = async () => {
    setImportStatus('Buscando dados completos do arquivo...');
    // Verificar se temos os dados completos ou apenas amostra
    if (fullData.length > 0 && fullData.length >= totalRows) {
      return fullData;
    }
    // Retornar os dados disponíveis (este é um fallback)
    return data;
  };

  // Processar uma única linha de dados
  const processRow = async (row, importId) => {
    try {
      // Mapear os campos de acordo com as configurações do usuário
      const mappedData = {
        substancia: row[mappings.substancia],
        laboratorio: row[mappings.laboratorio],
        produto: row[mappings.produto],
        apresentacao: row[mappings.apresentacao],
        codigo_ggrem: row[mappings.codigo_ggrem],
        registro: row[mappings.registro],
        ean_1: row[mappings.ean_1],
        classe_terapeutica: row[mappings.classe_terapeutica],
        tipo_de_produto: row[mappings.tipo_de_produto],
        regime_de_preco: row[mappings.regime_de_preco],
        pf_sem_impostos: parseFloat(String(row[mappings.pf_sem_impostos]).replace(',', '.')),
        data_publicacao: publicationDate,
        importacao_id: importId
      };
      
      // Chamar a função de upsert do Supabase
      const { data, error } = await supabase.rpc(
        'upsert_medicamento_com_preco',
        {
          p_substancia: mappedData.substancia,
          p_laboratorio: mappedData.laboratorio,
          p_produto: mappedData.produto,
          p_apresentacao: mappedData.apresentacao,
          p_codigo_ggrem: mappedData.codigo_ggrem,
          p_registro: mappedData.registro,
          p_ean_1: mappedData.ean_1,
          p_classe_terapeutica: mappedData.classe_terapeutica,
          p_tipo_de_produto: mappedData.tipo_de_produto,
          p_regime_de_preco: mappedData.regime_de_preco,
          p_data_publicacao: mappedData.data_publicacao,
          p_pf_sem_impostos: mappedData.pf_sem_impostos,
          p_importacao_id: mappedData.importacao_id
        }
      );
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao processar linha:', error);
      throw error;
    }
  };

  const handleColumnMappingChange = (dbField, fileColumn) => {
    setMappings({
      ...mappings,
      [dbField]: fileColumn
    });
  };

  return (
    <Container fluid className="py-4">
      <h1 className="mb-4">Importar Tabela CMED</h1>
      
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" onClose={() => setSuccess(false)} dismissible>
          Importação concluída com sucesso! {processedRows} registros foram importados e {errorRows} tiveram erros.
          <div className="mt-2">
            <Button variant="outline-success" onClick={() => navigate('/list')}>
              Ver Medicamentos Importados
            </Button>
          </div>
        </Alert>
      )}
      
      {!dbInitialized && !error ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="mt-3">Verificando banco de dados...</p>
        </div>
      ) : (
        <>
          <FileUploader onFileLoaded={handleFileLoaded} />
          
          {isImporting && (
            <Card className="mb-4">
              <Card.Body>
                <h5 className="card-title">Status da Importação</h5>
                <p>{importStatus}</p>
                <ProgressBar 
                  now={importProgress} 
                  label={`${Math.round(importProgress)}%`} 
                  variant="primary"
                  className="mb-3"
                />
                <div className="d-flex justify-content-between small text-muted">
                  <div>Processados: {processedRows} de {totalRows}</div>
                  <div>Erros: {errorRows}</div>
                </div>
              </Card.Body>
            </Card>
          )}
          
          {data.length > 0 && columns.length > 0 && (
            <>
              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">Configurações de Importação</h5>
                </Card.Header>
                <Card.Body>
                  <Form>
                    <Row className="mb-3">
                      <Col md={6}>
                        <Form.Group controlId="batchSize">
                          <Form.Label>Tamanho do Lote</Form.Label>
                          <Form.Control
                            type="number"
                            min="100"
                            max="1000"
                            step="100"
                            value={batchSize}
                            onChange={(e) => setBatchSize(parseInt(e.target.value))}
                          />
                          <Form.Text className="text-muted">
                            Número de registros a serem processados em cada lote.
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group controlId="publicationDate">
                          <Form.Label>Data de Publicação</Form.Label>
                          <Form.Control
                            type="date"
                            value={publicationDate}
                            onChange={(e) => setPublicationDate(e.target.value)}
                            required
                          />
                          <Form.Text className="text-muted">
                            Data de publicação da tabela CMED.
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <h6 className="mt-4 mb-3">Mapeamento de Colunas</h6>
                    <p className="text-muted small">
                      Selecione quais colunas do arquivo correspondem aos campos do banco de dados.
                    </p>
                    
                    <Row>
                      {[
                        { id: 'substancia', label: 'Substância' },
                        { id: 'laboratorio', label: 'Laboratório' },
                        { id: 'produto', label: 'Produto' },
                        { id: 'apresentacao', label: 'Apresentação' },
                        { id: 'codigo_ggrem', label: 'Código GGREM' },
                        { id: 'registro', label: 'Registro' },
                        { id: 'ean_1', label: 'EAN 1' },
                        { id: 'classe_terapeutica', label: 'Classe Terapêutica' },
                        { id: 'tipo_de_produto', label: 'Tipo de Produto' },
                        { id: 'regime_de_preco', label: 'Regime de Preço' },
                        { id: 'pf_sem_impostos', label: 'PF sem Impostos' }
                      ].map(field => (
                        <Col md={6} lg={4} key={field.id} className="mb-3">
                          <Form.Group controlId={`mapping-${field.id}`}>
                            <Form.Label>{field.label}</Form.Label>
                            <Form.Select
                              value={mappings[field.id] || ''}
                              onChange={(e) => handleColumnMappingChange(field.id, e.target.value)}
                            >
                              <option value="">Selecione uma coluna</option>
                              {columns.map((col, index) => (
                                <option key={index} value={col}>
                                  {col}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      ))}
                    </Row>
                  </Form>
                </Card.Body>
              </Card>
              
              <DataPreview data={data} totalRows={totalRows} />
              
              <div className="d-flex justify-content-end mb-5">
                <Button 
                  variant="primary" 
                  size="lg"
                  onClick={importData}
                  disabled={loading}
                >
                  {loading ? 'Importando...' : 'Iniciar Importação'}
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </Container>
  );
};

export default ImportPage;
