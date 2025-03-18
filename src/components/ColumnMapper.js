import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Card, Table } from 'react-bootstrap';

const REQUIRED_FIELDS = [
  { key: 'substancia', label: 'Substância', required: true },
  { key: 'laboratorio', label: 'Laboratório', required: true },
  { key: 'produto', label: 'Produto', required: true },
  { key: 'apresentacao', label: 'Apresentação', required: false },
  { key: 'codigo_ggrem', label: 'Código GGREM', required: false },
  { key: 'registro', label: 'Registro', required: false },
  { key: 'ean_1', label: 'EAN 1', required: false },
  { key: 'classe_terapeutica', label: 'Classe Terapêutica', required: false },
  { key: 'tipo_de_produto', label: 'Tipo de Produto', required: true },
  { key: 'regime_de_preco', label: 'Regime de Preço', required: true },
  { key: 'pf_sem_impostos', label: 'PF sem Impostos', required: false },
  { key: 'data_publicacao', label: 'Data de Publicação', required: true }
];

const ColumnMapper = ({ sourceColumns, sampleData, onMapComplete }) => {
  const [columnMapping, setColumnMapping] = useState({});
  const [validated, setValidated] = useState(false);

  // Tentar mapear colunas automaticamente baseado em semelhança
  useEffect(() => {
    if (sourceColumns && sourceColumns.length) {
      const initialMapping = {};
      
      REQUIRED_FIELDS.forEach(field => {
        const match = findBestMatch(field.key, field.label, sourceColumns);
        if (match) {
          initialMapping[field.key] = match;
        }
      });
      
      setColumnMapping(initialMapping);
    }
  }, [sourceColumns]);

  // Função para encontrar a melhor correspondência entre colunas
  const findBestMatch = (fieldKey, fieldLabel, availableColumns) => {
    // Lista de possíveis nomes para cada campo
    const possibleNames = {
      substancia: ['substancia', 'substância', 'principio ativo', 'princípio ativo', 'subst'],
      laboratorio: ['laboratorio', 'laboratório', 'lab', 'detentora', 'fabricante'],
      produto: ['produto', 'nome do produto', 'medicamento', 'nome comercial', 'apres'],
      apresentacao: ['apresentacao', 'apresentação', 'formula', 'fórmula'],
      codigo_ggrem: ['codigo', 'código', 'codigo_ggrem', 'código ggrem', 'ggrem'],
      registro: ['registro', 'numero registro', 'número registro', 'reg ms'],
      ean_1: ['ean', 'ean_1', 'ean1', 'codigo barras', 'código barras'],
      classe_terapeutica: ['classe', 'classe_terapeutica', 'classe terapêutica', 'terapeutica'],
      tipo_de_produto: ['tipo', 'tipo_produto', 'tipo de produto', 'tipo_de_produto'],
      regime_de_preco: ['regime', 'regime_preco', 'regime de preco', 'regime_de_preco'],
      pf_sem_impostos: ['pf', 'pf_sem_impostos', 'preco fabrica', 'preço fábrica'],
      data_publicacao: ['data', 'data_publicacao', 'publicação', 'data public']
    };

    // Primeiro, tentar encontrar correspondência exata
    for (const column of availableColumns) {
      const columnLower = column.toLowerCase().trim();
      
      // Verificar correspondência exata
      if (
        columnLower === fieldKey.toLowerCase() || 
        columnLower === fieldLabel.toLowerCase()
      ) {
        return column;
      }
      
      // Verificar alternativas conhecidas
      if (possibleNames[fieldKey] && 
          possibleNames[fieldKey].some(name => columnLower.includes(name.toLowerCase()))) {
        return column;
      }
    }

    // Se não encontrar correspondência exata, procurar por substrings
    for (const column of availableColumns) {
      const columnLower = column.toLowerCase().trim();
      
      if (
        columnLower.includes(fieldKey.toLowerCase()) || 
        fieldKey.toLowerCase().includes(columnLower) ||
        columnLower.includes(fieldLabel.toLowerCase()) ||
        fieldLabel.toLowerCase().includes(columnLower)
      ) {
        return column;
      }
    }

    return null; // Nenhuma correspondência encontrada
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    
    if (form.checkValidity() === false) {
      event.stopPropagation();
      setValidated(true);
      return;
    }
    
    // Verificar se todos os campos obrigatórios estão mapeados
    const missingRequiredFields = REQUIRED_FIELDS.filter(
      field => field.required && !columnMapping[field.key]
    );
    
    if (missingRequiredFields.length > 0) {
      alert(`Por favor, mapeie os seguintes campos obrigatórios: ${missingRequiredFields.map(f => f.label).join(', ')}`);
      return;
    }
    
    // Chamar a função de callback com o mapeamento
    onMapComplete(columnMapping);
  };

  // Renderizar uma amostra dos dados
  const renderDataSample = () => {
    if (!sampleData || sampleData.length === 0) return null;
    
    const sample = sampleData.slice(0, 3);
    
    return (
      <Card className="mb-4">
        <Card.Header>Amostra dos Dados</Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table striped bordered size="sm">
              <thead>
                <tr>
                  {sourceColumns.map((column, idx) => (
                    <th key={idx}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sample.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {sourceColumns.map((column, colIdx) => (
                      <td key={colIdx}>{row[column]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    );
  };

  return (
    <div>
      <h4 className="mb-3">Mapeamento de Colunas</h4>
      <p>
        Por favor, associe as colunas do seu arquivo aos campos do sistema.
        Os campos marcados com * são obrigatórios.
      </p>
      
      {renderDataSample()}
      
      <Form noValidate validated={validated} onSubmit={handleSubmit}>
        <Row>
          {REQUIRED_FIELDS.map((field) => (
            <Col md={6} className="mb-3" key={field.key}>
              <Form.Group>
                <Form.Label>
                  {field.label} {field.required && <span className="text-danger">*</span>}
                </Form.Label>
                <Form.Select
                  required={field.required}
                  value={columnMapping[field.key] || ''}
                  onChange={(e) => {
                    setColumnMapping({
                      ...columnMapping,
                      [field.key]: e.target.value
                    });
                  }}
                >
                  <option value="">Selecione a coluna...</option>
                  {sourceColumns.map((column, idx) => (
                    <option key={idx} value={column}>
                      {column}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  Este campo é obrigatório
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          ))}
        </Row>
        
        <div className="d-flex justify-content-end">
          <Button variant="primary" type="submit">
            Confirmar Mapeamento
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default ColumnMapper;
