import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, Alert, ProgressBar } from 'react-bootstrap';
import { format } from 'date-fns';
import supabase from '../services/supabaseClient';
import FileUploader from '../components/FileUploader';
import DataPreview from '../components/DataPreview';
import { useNavigate } from 'react-router-dom';
import { diagnosticarArquivo, validarDataPublicacao } from '../utils/ImportDiagnostics';
import { atualizarFuncaoConversaoData, limparDadosBanco, verificarConfiguracaoBanco } from '../utils/DatabaseSetup';

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
  const [diagnostico, setDiagnostico] = useState(null);
  const [validacaoData, setValidacaoData] = useState(null);
  const [atualizandoFuncoes, setAtualizandoFuncoes] = useState(false);
  const [statusConfiguracao, setStatusConfiguracao] = useState(null);

  // Verificar se as tabelas necessárias existem no banco de dados
  useEffect(() => {
    checkDatabase();
  }, []);

  const checkDatabase = async () => {
    try {
      const resultado = await verificarConfiguracaoBanco();
      setDbInitialized(resultado.success);
      setStatusConfiguracao(resultado);
      
      if (!resultado.success) {
        setError(`Erro na verificação do banco de dados: ${resultado.message}.`);
      }
    } catch (error) {
      console.error('Erro ao verificar banco de dados:', error);
      setError(`Erro na verificação do banco de dados: ${error.message}.`);
    }
  };
  
  // Função para atualizar as funções do banco de dados
  const handleUpdateFunctions = async () => {
    try {
      setAtualizandoFuncoes(true);
      setError(null);
      
      const resultado = await atualizarFuncaoConversaoData();
      
      if (resultado.success) {
        setSuccess(true);
        setStatusConfiguracao({
          success: true,
          message: 'Funções atualizadas com sucesso!'
        });
      } else {
        setError(`Erro ao atualizar funções: ${resultado.message}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar funções:', error);
      setError(`Erro ao atualizar funções: ${error.message}`);
    } finally {
      setAtualizandoFuncoes(false);
    }
  };
  
  // Função para limpar todos os dados do banco
  const handleClearDatabase = async () => {
    if (!window.confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const resultado = await limparDadosBanco();
      
      if (resultado.success) {
        setSuccess(true);
        alert('Dados limpos com sucesso!');
      } else {
        setError(`Erro ao limpar dados: ${resultado.message}`);
      }
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      setError(`Erro ao limpar dados: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Função chamada quando o arquivo é carregado pelo FileUploader
  const handleFileLoaded = (fileData, fileColumns, name, total, completeData, metadados) => {
    console.log('Dados recebidos do uploader:');
    console.log('fileData:', fileData);
    console.log('fileColumns:', fileColumns);
    console.log('name:', name);
    console.log('total:', total);
    console.log('completeData:', completeData);
    console.log('metadados:', metadados);
    
    // Limpar estados anteriores
    setError(null);
    setDiagnostico(null);
    setValidacaoData(null);
    
    setData(fileData);
    setColumns(fileColumns);
    setFileName(name);
    setTotalRows(total || fileData.length);
    
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
    
    // Tentar encontrar colunas de data para data_publicacao automaticamente
    let dataPublicacaoEncontrada = false;
    if (metadados && metadados.dateCols && metadados.dateCols.length > 0) {
      // Procurar por colunas de data que possam ser a data de publicação
      const possiveisColunasData = metadados.dateCols.filter(col => {
        const colLower = col.toLowerCase();
        return colLower.includes('public') || 
               colLower.includes('data') || 
               colLower.includes('date') || 
               colLower.includes('vigencia');
      });
      
      if (possiveisColunasData.length > 0) {
        // Se encontramos uma coluna de data que parece ser data de publicação, usamos ela
        const primeiraDataAmostra = completeData[0][possiveisColunasData[0]];
        console.log(`Encontrada possível coluna de data de publicação: ${possiveisColunasData[0]}, valor: ${primeiraDataAmostra}`);
        
        if (primeiraDataAmostra) {
          // Verificar se a data está no formato correto
          const validacao = validarDataPublicacao(primeiraDataAmostra);
          if (validacao.valido) {
            setPublicationDate(primeiraDataAmostra);
            dataPublicacaoEncontrada = true;
          }
        }
      }
    }
    
    // Se não encontramos uma data de publicação no arquivo, usamos a data atual
    if (!dataPublicacaoEncontrada) {
      const dataHoje = format(new Date(), 'yyyy-MM-dd');
      setPublicationDate(dataHoje);
    }
    
    for (let i = 0; i < fileColumns.length; i++) {
      const col = fileColumns[i];
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
    }
    
    setMappings(initialMappings);
    
    // Validar a data de publicação
    const resultadoValidacao = validarDataPublicacao(publicationDate);
    setValidacaoData(resultadoValidacao);
    
    // Executar diagnóstico nos dados
    const diagnosticoResult = diagnosticarArquivo(fileData, initialMappings);
    setDiagnostico(diagnosticoResult);
    
    // Se houver problemas graves, mostrar como erro
    if (diagnosticoResult.status === 'error') {
      setError(diagnosticoResult.message + ': ' + diagnosticoResult.detalhes);
    }
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
    
    const missingFields = [];
    for (let i = 0; i < requiredFields.length; i++) {
      const field = requiredFields[i];
      if (!mappings[field]) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      setError(`Os seguintes campos são obrigatórios: ${missingFields.join(', ')}`);
      return;
    }
    
    if (!publicationDate) {
      setError('A data de publicação é obrigatória');
      return;
    }
    
    // Validar a data de publicação novamente
    const validacao = validarDataPublicacao(publicationDate);
    setValidacaoData(validacao);
    
    if (!validacao.valido) {
      setError(`Data de publicação inválida: ${validacao.message}`);
      return;
    }

    // Verificar se temos dados para importar
    const dataToImport = fullData.length > 0 ? fullData : data;
    console.log(`Verificando dados para importação: ${dataToImport.length} registros disponíveis`);
    
    if (!dataToImport || dataToImport.length === 0) {
      setError('Não há dados para importar. Por favor, carregue um arquivo válido.');
      return;
    }

    // Verificar se os campos mapeados existem nos dados
    const sampleRow = dataToImport[0];
    const invalidMappings = [];
    
    for (const [field, column] of Object.entries(mappings)) {
      if (sampleRow[column] === undefined) {
        invalidMappings.push(`${field} -> ${column}`);
      }
    }
    
    if (invalidMappings.length > 0) {
      setError(`Alguns campos mapeados não existem nos dados: ${invalidMappings.join(', ')}`);
      return;
    }

    console.log('Mapeamento de campos:', mappings);
    console.log('Exemplo de dados na primeira linha:', sampleRow);
    
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
        const batchPromises = [];
        for (let i = 0; i < batch.length; i++) {
          batchPromises.push(processRow(batch[i], importId));
        }
        
        // Aguardar conclusão do lote atual
        const results = await Promise.allSettled(batchPromises);
        
        // Processar resultados deste lote
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          processed++;
          if (result.status === 'fulfilled') {
            importados++;
          } else {
            console.error('Erro ao importar linha:', result.reason);
            erros++;
            
            // Mostrar no máximo 5 erros detalhados no console para não sobrecarregar
            if (erros <= 5) {
              console.error('Detalhes do erro:', {
                mensagem: result.reason.message,
                stack: result.reason.stack
              });
            }
          }
        }
        
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

  /* Função para buscar todos os dados do arquivo (usado quando temos apenas amostra) - não utilizada atualmente
  const fetchAllDataForImport = async () => {
    setImportStatus('Buscando dados completos do arquivo...');
    // Verificar se temos os dados completos ou apenas amostra
    if (fullData.length > 0 && fullData.length >= totalRows) {
      return fullData;
    }
    // Retornar os dados disponíveis (este é um fallback)
    return data;
  };
  */

  // Processar uma única linha de dados
  const processRow = async (row, importId) => {
    try {
      // Obter a data formatada com hora para evitar problemas de fuso horário
      const validacaoData = validarDataPublicacao(publicationDate);
      const formattedDate = validacaoData.valido ? 
                            validacaoData.dataFormatada : 
                            `${publicationDate}T12:00:00`; // Fallback com hora fixa
      
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
        pf_sem_impostos: parseFloat(String(row[mappings.pf_sem_impostos] || '0').replace(',', '.')),
        data_publicacao: formattedDate,
        importacao_id: importId
      };
      
      // Verificar se todos os campos obrigatórios têm valores
      const camposVazios = [];
      for (const [campo, valor] of Object.entries(mappedData)) {
        if (valor === undefined || valor === null || valor === '' || (typeof valor === 'number' && isNaN(valor))) {
          camposVazios.push(campo);
        }
      }
      
      if (camposVazios.length > 0) {
        throw new Error(`Campos obrigatórios vazios: ${camposVazios.join(', ')}`);
      }
      
      // Log da data de publicação para depuração
      console.log('Data de publicação original:', publicationDate);
      console.log('Data de publicação formatada sendo enviada:', mappedData.data_publicacao);
      
      // Chamar a função de upsert do Supabase
      const { data, error } = await supabase.rpc(
        'upsert_medicamento_com_preco_v2',
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
      
      if (error) {
        console.error('Erro ao inserir no Supabase:', error);
        console.error('Parâmetros enviados:', {
          substancia: mappedData.substancia,
          laboratorio: mappedData.laboratorio,
          codigo_ggrem: mappedData.codigo_ggrem,
          data_publicacao: mappedData.data_publicacao,
          tipo: typeof mappedData.data_publicacao
        });
        throw error;
      }
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
                  animated
                />
                <div className="mt-3">
                  <p>Registros processados: {processedRows} de {totalRows}</p>
                  <p>Erros: {errorRows}</p>
                </div>
              </Card.Body>
            </Card>
          )}
          
          {/* Seção de Ferramentas de Administração */}
          <Card className="mb-4">
            <Card.Header className="bg-light">
              <h5 className="mb-0">Ferramentas de Administração</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Card className="h-100">
                    <Card.Body>
                      <h6>Status do Banco de Dados</h6>
                      {statusConfiguracao ? (
                        <Alert variant={statusConfiguracao.success ? 'success' : 'danger'}>
                          {statusConfiguracao.message}
                        </Alert>
                      ) : (
                        <p>Verificando configuração do banco...</p>
                      )}
                      <Button 
                        variant="outline-primary" 
                        onClick={checkDatabase}
                        className="me-2"
                      >
                        Verificar Banco
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        onClick={handleUpdateFunctions}
                        disabled={atualizandoFuncoes}
                      >
                        {atualizandoFuncoes ? 'Atualizando...' : 'Atualizar Funções'}
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="h-100">
                    <Card.Body>
                      <h6>Limpeza de Dados</h6>
                      <p>
                        Esta opção limpa todos os registros do banco de dados.
                        Use com cautela, pois esta ação não pode ser desfeita.
                      </p>
                      <Button 
                        variant="danger" 
                        onClick={handleClearDatabase}
                        disabled={loading}
                      >
                        Limpar Todos os Dados
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Card.Body>
          </Card>
          
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
                        <Form.Group controlId="formImportDate">
                          <Form.Label>Data de Publicação</Form.Label>
                          <Form.Control
                            type="date"
                            value={publicationDate}
                            onChange={(e) => {
                              const novaData = e.target.value;
                              setPublicationDate(novaData);
                              
                              // Validar a nova data
                              const validacao = validarDataPublicacao(novaData);
                              setValidacaoData(validacao);
                              
                              // Mostrar aviso se a data for inválida
                              if (!validacao.valido) {
                                setError(`Data inválida: ${validacao.message}`);
                              } else if (validacao.warning) {
                                setError(`Atenção: ${validacao.message}`);
                              } else {
                                setError(null);
                              }
                            }}
                            isInvalid={validacaoData && !validacaoData.valido}
                            isValid={validacaoData && validacaoData.valido && !validacaoData.warning}
                          />
                          {validacaoData && validacaoData.valido && validacaoData.warning && (
                            <Form.Text className="text-warning">
                              Atenção: {validacaoData.message}
                            </Form.Text>
                          )}
                          {validacaoData && !validacaoData.valido && (
                            <Form.Control.Feedback type="invalid">
                              {validacaoData.message}
                            </Form.Control.Feedback>
                          )}
                          <Form.Text className="text-muted">
                            Data de publicação da tabela CMED. Esta data será associada aos preços importados.
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group controlId="formBatchSize">
                          <Form.Label>Tamanho do Lote de Importação</Form.Label>
                          <Form.Control
                            type="number"
                            value={batchSize}
                            onChange={(e) => setBatchSize(parseInt(e.target.value))}
                            min={100}
                            max={1000}
                          />
                          <Form.Text className="text-muted">
                            Quantidade de registros processados por lote. Valores menores podem ser mais estáveis.
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    {/* Seção de diagnóstico */}
                    {diagnostico && (
                      <div className="mb-4">
                        <h6 className="mb-3">Diagnóstico do Arquivo</h6>
                        <Alert variant={
                          diagnostico.status === 'success' ? 'success' : 
                          diagnostico.status === 'warning' ? 'warning' : 'danger'
                        }>
                          <Alert.Heading>{diagnostico.message}</Alert.Heading>
                          <p>{diagnostico.detalhes}</p>
                        </Alert>
                      </div>
                    )}
                    
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
                      ].map((field, index) => (
                        <Col md={6} lg={4} key={index} className="mb-3">
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
