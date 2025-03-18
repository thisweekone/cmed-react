import React, { useState } from 'react';
import { Card, Table, Badge, Form } from 'react-bootstrap';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const DataPreview = ({ data, totalRows }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState(data);

  // Filtrar dados quando o termo de busca mudar
  React.useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(data);
      return;
    }

    const lowercaseSearch = searchTerm.toLowerCase();
    const filtered = data.filter(row => {
      return Object.values(row).some(value => 
        value && String(value).toLowerCase().includes(lowercaseSearch)
      );
    });
    
    setFilteredData(filtered);
  }, [searchTerm, data]);

  // Renderizar uma linha da tabela (item virtualizado)
  const Row = ({ index, style }) => {
    const row = filteredData[index];
    if (!row) return null;
    
    return (
      <tr style={style}>
        <td style={{ width: 50 }}>{index + 1}</td>
        {Object.entries(row).slice(0, 5).map(([key, value], cellIndex) => (
          <td key={cellIndex}>
            {value !== null && value !== undefined 
              ? String(value).length > 50 
                ? String(value).substring(0, 50) + '...' 
                : String(value) 
              : '-'}
          </td>
        ))}
      </tr>
    );
  };

  // Obter as primeiras 5 colunas para exibição
  const displayColumns = data.length > 0 
    ? Object.keys(data[0]).slice(0, 5) 
    : [];

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Prévia dos Dados</h5>
        <div className="d-flex align-items-center">
          <Badge bg="primary" className="me-2">
            {filteredData.length} / {totalRows} registros
          </Badge>
          <Form.Control
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '200px' }}
          />
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <div className="table-responsive">
          <div style={{ height: '400px', width: '100%' }}>
            <AutoSizer>
              {({ height, width }) => (
                <div style={{ height, width }}>
                  <Table striped bordered hover className="mb-0">
                    <thead>
                      <tr>
                        <th style={{ width: 50 }}>#</th>
                        {displayColumns.map((col, index) => (
                          <th key={index} style={{ minWidth: '150px' }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Tabela vazia para manter o cabeçalho com as colunas */}
                    </tbody>
                  </Table>
                  
                  {filteredData.length > 0 ? (
                    <div style={{ height: 'calc(100% - 40px)', width }}>
                      <List
                        height={height - 40} // Altura da tabela menos o cabeçalho
                        itemCount={filteredData.length}
                        itemSize={40} // Altura de cada linha
                        width={width}
                      >
                        {Row}
                      </List>
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-muted">
                        {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum dado disponível'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </AutoSizer>
          </div>
        </div>
      </Card.Body>
      <Card.Footer className="text-muted">
        <small>
          Exibindo prévia dos primeiros {Math.min(data.length, 200)} registros do arquivo. 
          {totalRows > data.length && 
            ` O arquivo completo contém ${totalRows} registros que serão processados na importação.`}
        </small>
      </Card.Footer>
    </Card>
  );
};

export default DataPreview;
