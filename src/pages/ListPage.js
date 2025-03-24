import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, Table, Spinner, Alert, Form, InputGroup, Button, 
  Pagination, Modal, Card, Tabs, Tab, Badge, ListGroup, Row, Col
} from 'react-bootstrap';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { supabase } from '../supabaseClient';
import { formatarDataBancoDados } from '../utils/DateUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Cores para as linhas do gráfico comparativo
const CHART_COLORS = [
  'rgb(75, 192, 192)',
  'rgb(255, 99, 132)',
  'rgb(54, 162, 235)',
  'rgb(255, 159, 64)',
  'rgb(153, 102, 255)',
  'rgb(201, 203, 207)',
  'rgb(255, 205, 86)',
  'rgb(22, 160, 133)',
  'rgb(142, 68, 173)',
  'rgb(243, 156, 18)'
];

const ListPage = () => {
  const [medicamentos, setMedicamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 25; 
  
  // Estado para modal de histórico de preços
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedMedicamento, setSelectedMedicamento] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reajustesCMED, setReajustesCMED] = useState([]);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });

  // Novo estado para medicamentos selecionados
  const [selectedMedicamentos, setSelectedMedicamentos] = useState([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonData, setComparisonData] = useState([]);
  const [loadingComparison, setLoadingComparison] = useState(false);

  const fetchMedicamentos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Calcular a partir de qual registro começar
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      // Consulta para buscar medicamentos com os preços históricos relacionados
      let query = supabase
        .from('medicamentos_base')
        .select(`
          *,
          precos_historico:precos_historico(
            data_publicacao,
            pf_sem_impostos
          )
        `, { count: 'exact' })
        .order('substancia', { ascending: true })
        .range(from, to);

      // Adicionar filtro de pesquisa se necessário
      if (searchTerm) {
        query = query.or(`substancia.ilike.%${searchTerm}%,produto.ilike.%${searchTerm}%,laboratorio.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Processar os dados para obter o preço mais recente de cada medicamento
      const processedData = data.map(item => {
        // Ordenar preços do mais recente para o mais antigo
        const precos = item.precos_historico || [];
        const precosOrdenados = [...precos].sort((a, b) => 
          new Date(b.data_publicacao) - new Date(a.data_publicacao)
        );
        
        // Obter o preço mais recente
        const precoMaisRecente = precosOrdenados.length > 0 ? precosOrdenados[0] : null;
        
        return {
          ...item,
          preco_recente: precoMaisRecente ? precoMaisRecente.pf_sem_impostos : null,
          data_preco_recente: precoMaisRecente ? precoMaisRecente.data_publicacao : null
        };
      });
      
      setMedicamentos(processedData || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Erro ao buscar medicamentos:', err);
      setError('Não foi possível carregar os medicamentos. Verifique a conexão com o Supabase.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, itemsPerPage]);

  // Buscar dados quando a página carregar ou mudar os filtros
  useEffect(() => {
    fetchMedicamentos();
  }, [currentPage, fetchMedicamentos]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchMedicamentos();
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };
  
  // Função para buscar histórico de preços de um medicamento
  const fetchPriceHistory = async (medicamentoId) => {
    try {
      setLoadingHistory(true);
      
      // Buscar histórico de preços
      const { data: precoData, error: precoError } = await supabase
        .from('precos_historico')
        .select('data_publicacao, pf_sem_impostos')
        .eq('medicamento_id', medicamentoId)
        .order('data_publicacao', { ascending: true });
        
      if (precoError) throw precoError;
      
      // Buscar reajustes CMED para comparação
      const { data: reajustesData, error: reajustesError } = await supabase
        .from('reajustes_anuais')
        .select('*')
        .order('ano', { ascending: true });
        
      if (reajustesError) throw reajustesError;
      
      // Calcular variações percentuais dos preços
      let dadosComVariacao = [];
      if (precoData && precoData.length > 0) {
        dadosComVariacao = precoData.map((item, index) => {
          if (index === 0) {
            // Primeiro item não tem variação
            return {
              ...item,
              variacao_percentual: 0,
              ano: new Date(item.data_publicacao).getFullYear()
            };
          } else {
            // Calcular variação em relação ao preço anterior
            const precoAnterior = precoData[index - 1].pf_sem_impostos;
            const precoAtual = item.pf_sem_impostos;
            const variacao = precoAnterior > 0 
              ? ((precoAtual - precoAnterior) / precoAnterior * 100)
              : 0;
            
            return {
              ...item,
              variacao_percentual: parseFloat(variacao.toFixed(2)),
              ano: new Date(item.data_publicacao).getFullYear()
            };
          }
        });
      }
      
      setPriceHistory(dadosComVariacao || []);
      setReajustesCMED(reajustesData || []);
    } catch (err) {
      console.error('Erro ao buscar histórico de preços:', err);
      setError('Não foi possível carregar o histórico de preços.');
    } finally {
      setLoadingHistory(false);
    }
  };
  
  // Abrir modal de histórico
  const handleShowHistory = (medicamento) => {
    setSelectedMedicamento(medicamento);
    setShowHistoryModal(true);
    fetchPriceHistory(medicamento.id);
  };

  // Função para selecionar/desselecionar medicamento
  const toggleMedicamentoSelection = (medicamento) => {
    const isSelected = selectedMedicamentos.some(med => med.id === medicamento.id);
    
    if (isSelected) {
      setSelectedMedicamentos(selectedMedicamentos.filter(med => med.id !== medicamento.id));
    } else {
      setSelectedMedicamentos([...selectedMedicamentos, medicamento]);
    }
  };

  // Função para remover medicamento da seleção
  const removeMedicamentoFromSelection = (medicamentoId) => {
    setSelectedMedicamentos(selectedMedicamentos.filter(med => med.id !== medicamentoId));
  };

  // Função para buscar histórico de preços de múltiplos medicamentos
  const fetchComparisonData = async () => {
    if (selectedMedicamentos.length === 0) return;
    
    try {
      setLoadingComparison(true);
      
      // Coletar IDs dos medicamentos selecionados
      const medicamentoIds = selectedMedicamentos.map(med => med.id);
      
      // Buscar histórico de preços para todos os medicamentos selecionados
      const { data, error } = await supabase
        .from('precos_historico')
        .select('medicamento_id, data_publicacao, pf_sem_impostos')
        .in('medicamento_id', medicamentoIds)
        .order('data_publicacao', { ascending: true });
        
      if (error) throw error;
      
      setComparisonData(data || []);
    } catch (err) {
      console.error('Erro ao buscar dados comparativos:', err);
      setError('Não foi possível carregar os dados comparativos.');
    } finally {
      setLoadingComparison(false);
    }
  };

  // Abrir modal de comparação
  const handleOpenComparison = () => {
    setShowComparisonModal(true);
    fetchComparisonData();
  };

  // Calcular total de páginas
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Renderizar paginação
  const renderPagination = () => {
    const items = [];
    const maxPageItems = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPageItems / 2));
    let endPage = Math.min(totalPages, startPage + maxPageItems - 1);
    
    if (endPage - startPage + 1 < maxPageItems) {
      startPage = Math.max(1, endPage - maxPageItems + 1);
    }

    items.push(
      <Pagination.Prev 
        key="prev" 
        disabled={currentPage === 1}
        onClick={() => handlePageChange(currentPage - 1)}
      />
    );

    if (startPage > 1) {
      items.push(
        <Pagination.Item key={1} onClick={() => handlePageChange(1)}>
          1
        </Pagination.Item>
      );
      if (startPage > 2) {
        items.push(<Pagination.Ellipsis key="ellipsis1" />);
      }
    }

    for (let number = startPage; number <= endPage; number++) {
      items.push(
        <Pagination.Item 
          key={number} 
          active={number === currentPage}
          onClick={() => handlePageChange(number)}
        >
          {number}
        </Pagination.Item>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<Pagination.Ellipsis key="ellipsis2" />);
      }
      items.push(
        <Pagination.Item 
          key={totalPages} 
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }

    items.push(
      <Pagination.Next 
        key="next" 
        disabled={currentPage === totalPages}
        onClick={() => handlePageChange(currentPage + 1)}
      />
    );

    return <Pagination>{items}</Pagination>;
  };
  
  // Calcular dados para os gráficos quando o histórico de preços mudar
  useEffect(() => {
    if (priceHistory && priceHistory.length > 0) {
      const labels = priceHistory.map(p => formatarDataBancoDados(p.data_publicacao));
      
      const data = {
        labels,
        datasets: [
          {
            label: 'Preço Fábrica (R$)',
            data: priceHistory.map(p => p.pf_sem_impostos),
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
          }
        ],
      };
      
      setChartData(data);
    }
  }, [priceHistory]);

  // Preparar dados para o gráfico comparativo
  const prepareComparisonChartData = () => {
    if (!comparisonData || comparisonData.length === 0) return null;
    
    // Obter lista de todas as datas únicas
    const allDates = [...new Set(comparisonData.map(item => item.data_publicacao))];
    allDates.sort((a, b) => new Date(a) - new Date(b));
    
    // Formatar datas para exibição
    const labels = allDates.map(date => formatarDataBancoDados(date));
    
    // Criar datasets para cada medicamento
    const datasets = selectedMedicamentos.map((med, index) => {
      // Filtrar dados para este medicamento
      const medData = comparisonData.filter(item => item.medicamento_id === med.id);
      
      // Para cada data, encontrar o preço correspondente ou null
      const dataPoints = allDates.map(date => {
        const point = medData.find(item => item.data_publicacao === date);
        return point ? point.pf_sem_impostos : null;
      });
      
      const colorIndex = index % CHART_COLORS.length;
      
      return {
        label: `${med.substancia} - ${med.apresentacao}`,
        data: dataPoints,
        borderColor: CHART_COLORS[colorIndex],
        backgroundColor: CHART_COLORS[colorIndex].replace('rgb', 'rgba').replace(')', ', 0.5)'),
        borderWidth: 2,
      };
    });
    
    return {
      labels,
      datasets
    };
  };
  
  // Opções para o gráfico de histórico de preços
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Histórico de Preços',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: R$ ${context.parsed.y.toFixed(2).replace('.', ',')}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value) {
            return 'R$ ' + value.toFixed(2).replace('.', ',');
          }
        },
        title: {
          display: true,
          text: 'Preço Fábrica'
        }
      }
    }
  };

  // Opções para o gráfico de comparação
  const comparisonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Comparação: Variação de Preço vs. Reajuste CMED',
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2) + '%';
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Percentual (%)'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      }
    }
  };
  
  // Formatar preço
  const formatPrice = (price) => {
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  // Preparar dados para a tabela comparativa
  const prepareComparisonTableData = () => {
    if (!comparisonData || comparisonData.length === 0) return [];
    
    // Obter lista de todas as datas únicas
    const allDates = [...new Set(comparisonData.map(item => item.data_publicacao))];
    allDates.sort((a, b) => new Date(a) - new Date(b));
    
    return allDates.map(date => {
      const row = {
        data: formatarDataBancoDados(date),
      };
      
      // Adicionar preço para cada medicamento nesta data
      selectedMedicamentos.forEach(med => {
        const priceData = comparisonData.find(
          item => item.medicamento_id === med.id && item.data_publicacao === date
        );
        
        row[`med_${med.id}`] = priceData ? priceData.pf_sem_impostos : null;
      });
      
      return row;
    });
  };

  // Função para exportar comparação em PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = "Comparação de Preços de Medicamentos";
    
    // Configuração do título
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    
    // Configuração da data
    doc.setFontSize(10);
    doc.text(`Data do relatório: ${formatarDataBancoDados(new Date().toISOString())}`, 14, 28);
    
    // Legenda de medicamentos
    doc.setFontSize(12);
    doc.text("Medicamentos comparados:", 14, 38);
    
    let yPosition = 45;
    selectedMedicamentos.forEach((med, index) => {
      doc.setFontSize(10);
      doc.text(`${index + 1}. ${med.substancia} - ${med.apresentacao}`, 18, yPosition);
      yPosition += 6;
    });
    
    // Preparar dados para a tabela
    const rows = prepareComparisonTableData();
    if (rows.length === 0) {
      doc.setFontSize(12);
      doc.text("Não há dados para exibir", 14, yPosition + 10);
      doc.save("comparacao_precos.pdf");
      return;
    }
    
    // Montar cabeçalho da tabela
    const headers = [
      { header: 'Data', dataKey: 'data' }
    ];
    
    selectedMedicamentos.forEach(med => {
      headers.push({ 
        header: `${med.substancia}`, 
        dataKey: `med_${med.id}` 
      });
    });
    
    // Converter dados para o formato esperado pelo jspdf-autotable
    const data = rows.map(row => {
      const rowData = { data: row.data };
      selectedMedicamentos.forEach(med => {
        const value = row[`med_${med.id}`];
        rowData[`med_${med.id}`] = value !== null ? `R$ ${value.toFixed(2).replace('.', ',')}` : '-';
      });
      return rowData;
    });
    
    // Criar tabela
    autoTable(doc, {
      startY: yPosition + 10,
      head: [headers.map(h => h.header)],
      body: data.map(row => headers.map(h => row[h.dataKey])),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [75, 75, 75] }
    });
    
    // Adicionar rodapé
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: "center" });
    }
    
    doc.save("comparacao_precos.pdf");
  };
  
  // Função para exportar comparação em Excel
  const exportToExcel = () => {
    const rows = prepareComparisonTableData();
    if (rows.length === 0) {
      alert("Não há dados para exportar");
      return;
    }
    
    // Formatar dados para Excel
    const excelData = rows.map(row => {
      const newRow = { "Data": row.data };
      selectedMedicamentos.forEach(med => {
        const value = row[`med_${med.id}`];
        newRow[`${med.substancia} - ${med.apresentacao}`] = 
          value !== null ? value : null;
      });
      return newRow;
    });
    
    // Criar workbook e worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Configurar largura das colunas
    const colWidths = [];
    selectedMedicamentos.forEach(() => colWidths.push({ wch: 30 }));
    colWidths.unshift({ wch: 12 }); // Para a coluna de data
    ws['!cols'] = colWidths;
    
    // Adicionar a planilha ao workbook
    XLSX.utils.book_append_sheet(wb, ws, "Comparação de Preços");
    
    // Gerar arquivo e salvar
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, "comparacao_precos.xlsx");
  };

  return (
    <Container className="mt-4">
      <h2>Lista de Medicamentos</h2>
      
      <Form onSubmit={handleSearch} className="mb-3">
        <InputGroup>
          <Form.Control
            type="text"
            placeholder="Buscar por substância, produto ou laboratório"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button variant="primary" type="submit">
            Buscar
          </Button>
        </InputGroup>
      </Form>
      
      {/* Lista de medicamentos selecionados */}
      {selectedMedicamentos.length > 0 && (
        <Card className="mb-3">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <div>
              Medicamentos Selecionados ({selectedMedicamentos.length})
            </div>
            <div>
              <Button 
                variant="success" 
                size="sm" 
                onClick={handleOpenComparison}
                disabled={selectedMedicamentos.length < 2}
              >
                Comparar Preços
              </Button>
            </div>
          </Card.Header>
          <ListGroup variant="flush">
            {selectedMedicamentos.map(med => (
              <ListGroup.Item key={`selected-${med.id}`} className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>{med.substancia}</strong> - {med.laboratorio} ({med.apresentacao})
                </div>
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={() => removeMedicamentoFromSelection(med.id)}
                >
                  Remover
                </Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Card>
      )}
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
        </div>
      ) : (
        <>
          <div className="mb-3 d-flex justify-content-between align-items-center">
            <span>
              Mostrando {medicamentos.length} de {totalCount} medicamentos
            </span>
            {totalPages > 1 && renderPagination()}
          </div>
          
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>Selecionar</th>
                <th>Substância</th>
                <th>Laboratório</th>
                <th>Produto</th>
                <th>Apresentação</th>
                <th>Código GGREM</th>
                <th>Tipo</th>
                <th>Preço Atual</th>
                <th>Última Atualiz.</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {medicamentos.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center">Nenhum medicamento encontrado</td>
                </tr>
              ) : (
                medicamentos.map((med) => (
                  <tr key={med.id}>
                    <td className="text-center">
                      <Form.Check 
                        type="checkbox"
                        checked={selectedMedicamentos.some(item => item.id === med.id)}
                        onChange={() => toggleMedicamentoSelection(med)}
                        aria-label={`Selecionar ${med.substancia}`}
                      />
                    </td>
                    <td>{med.substancia}</td>
                    <td>{med.laboratorio}</td>
                    <td>{med.produto}</td>
                    <td>{med.apresentacao}</td>
                    <td>{med.codigo_ggrem}</td>
                    <td>{med.tipo_de_produto}</td>
                    <td>
                      {med.preco_recente 
                        ? `R$ ${med.preco_recente.toFixed(2).replace('.', ',')}` 
                        : '-'}
                    </td>
                    <td>
                      {med.data_preco_recente 
                        ? formatarDataBancoDados(med.data_preco_recente) 
                        : '-'}
                    </td>
                    <td>
                      <Button 
                        variant="info" 
                        size="sm" 
                        onClick={() => handleShowHistory(med)}
                      >
                        Ver Histórico
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
          
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-3">
              {renderPagination()}
            </div>
          )}
        </>
      )}
      
      {/* Modal de Histórico de Preços */}
      <Modal 
        show={showHistoryModal} 
        onHide={() => setShowHistoryModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Histórico de Preços
            {selectedMedicamento && (
              <div className="fs-6 fw-normal text-muted">
                {selectedMedicamento.produto} - {selectedMedicamento.apresentacao}
              </div>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingHistory ? (
            <div className="text-center my-3">
              <Spinner animation="border" />
            </div>
          ) : (
            <Tabs defaultActiveKey="chart">
              <Tab eventKey="chart" title="Gráfico">
                {priceHistory.length > 0 ? (
                  <div style={{ height: '400px' }}>
                    <Line options={chartOptions} data={chartData} />
                  </div>
                ) : (
                  <Alert variant="info">
                    Não há dados históricos de preços para este medicamento.
                  </Alert>
                )}
              </Tab>
              <Tab eventKey="comparison" title="Comparação com Reajustes CMED">
                {priceHistory.length > 1 ? (
                  <div>
                    <div className="mb-3">
                      <Alert variant="info">
                        Este gráfico compara a variação percentual do preço deste medicamento
                        com os reajustes oficiais da CMED para cada ano.
                      </Alert>
                    </div>
                    <div style={{ height: '400px' }}>
                      <Bar 
                        options={comparisonChartOptions} 
                        data={{
                          labels: priceHistory.filter(p => p.ano).map(p => p.ano.toString()),
                          datasets: [
                            {
                              type: 'line',
                              label: 'Variação de Preço do Medicamento (%)',
                              data: priceHistory.filter(p => p.variacao_percentual !== undefined).map(p => p.variacao_percentual),
                              borderColor: 'rgb(53, 162, 235)',
                              backgroundColor: 'rgba(53, 162, 235, 0.5)',
                              yAxisID: 'y',
                              borderWidth: 2,
                              tension: 0.1
                            },
                            {
                              type: 'bar',
                              label: 'Reajuste CMED Oficial (%)',
                              data: priceHistory
                                .filter(p => p.ano)
                                .map(p => {
                                  const reajusteAno = reajustesCMED.find(r => r.ano === p.ano);
                                  return reajusteAno ? reajusteAno.percentual : null;
                                }),
                              borderColor: 'rgb(255, 99, 132)',
                              backgroundColor: 'rgba(255, 99, 132, 0.5)',
                              yAxisID: 'y',
                              borderRadius: 5
                            }
                          ]
                        }} 
                      />
                    </div>
                    
                    <div className="mt-4">
                      <h5>Análise de Variação</h5>
                      <Table striped bordered hover size="sm">
                        <thead>
                          <tr>
                            <th>Ano</th>
                            <th>Variação do Medicamento (%)</th>
                            <th>Reajuste CMED (%)</th>
                            <th>Diferença</th>
                            <th>Análise</th>
                          </tr>
                        </thead>
                        <tbody>
                          {priceHistory
                            .filter(p => p.variacao_percentual !== undefined && p.ano)
                            .map((p, index) => {
                              const reajusteAno = reajustesCMED.find(r => r.ano === p.ano);
                              const reajusteCMED = reajusteAno ? reajusteAno.percentual : null;
                              const diferenca = reajusteCMED !== null 
                                ? (p.variacao_percentual - reajusteCMED).toFixed(2)
                                : '-';
                              
                              let analise = '-';
                              let badgeVariant = 'secondary';
                              
                              if (reajusteCMED !== null) {
                                const dif = p.variacao_percentual - reajusteCMED;
                                if (Math.abs(dif) < 0.5) {
                                  analise = 'Alinhado com CMED';
                                  badgeVariant = 'success';
                                } else if (dif > 0) {
                                  analise = 'Acima do reajuste';
                                  badgeVariant = 'danger';
                                } else {
                                  analise = 'Abaixo do reajuste';
                                  badgeVariant = 'primary';
                                }
                              }
                              
                              return (
                                <tr key={index}>
                                  <td>{p.ano}</td>
                                  <td>{p.variacao_percentual.toFixed(2)}%</td>
                                  <td>{reajusteCMED !== null ? `${reajusteCMED.toFixed(2)}%` : '-'}</td>
                                  <td>
                                    {diferenca !== '-' && (
                                      <>
                                        {parseFloat(diferenca) > 0 ? (
                                          <span className="text-danger">▲ </span>
                                        ) : parseFloat(diferenca) < 0 ? (
                                          <span className="text-success">▼ </span>
                                        ) : null}
                                        {diferenca}%
                                      </>
                                    )}
                                  </td>
                                  <td><Badge bg={badgeVariant}>{analise}</Badge></td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <Alert variant="info">
                    São necessários pelo menos dois registros de preço para mostrar a comparação.
                  </Alert>
                )}
              </Tab>
              <Tab eventKey="table" title="Tabela">
                {priceHistory.length > 0 ? (
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Data de Publicação</th>
                        <th>Preço Fábrica sem Impostos (R$)</th>
                        <th>Variação Percentual (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceHistory.map((item, index) => (
                        <tr key={index}>
                          <td>{formatarDataBancoDados(item.data_publicacao)}</td>
                          <td>R$ {item.pf_sem_impostos.toFixed(2).replace('.', ',')}</td>
                          <td>{item.variacao_percentual}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <Alert variant="info">
                    Não há dados históricos de preços para este medicamento.
                  </Alert>
                )}
              </Tab>
            </Tabs>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowHistoryModal(false)}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Modal de Comparação de Preços */}
      <Modal 
        show={showComparisonModal} 
        onHide={() => setShowComparisonModal(false)}
        size="xl"
        fullscreen="lg-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Comparação de Preços
            <div className="fs-6 fw-normal text-muted">
              {selectedMedicamentos.length} medicamentos selecionados
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingComparison ? (
            <div className="text-center my-3">
              <Spinner animation="border" />
              <p className="mt-2">Carregando dados comparativos...</p>
            </div>
          ) : (
            <Tabs defaultActiveKey="chart">
              <Tab eventKey="chart" title="Gráfico">
                {comparisonData.length > 0 ? (
                  <div style={{ height: '500px' }}>
                    <Line 
                      options={chartOptions} 
                      data={prepareComparisonChartData()} 
                    />
                  </div>
                ) : (
                  <Alert variant="info">
                    Não há dados históricos de preços para comparação.
                  </Alert>
                )}
              </Tab>
              <Tab eventKey="table" title="Tabela">
                {comparisonData.length > 0 ? (
                  <div className="table-responsive">
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>Data</th>
                          {selectedMedicamentos.map(med => (
                            <th key={`header-${med.id}`}>
                              {med.substancia}<br/>
                              <small>{med.apresentacao}</small>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {prepareComparisonTableData().map((row, index) => (
                          <tr key={`row-${index}`}>
                            <td>{row.data}</td>
                            {selectedMedicamentos.map(med => (
                              <td key={`cell-${med.id}-${index}`}>
                                {row[`med_${med.id}`] !== null 
                                  ? formatPrice(row[`med_${med.id}`]) 
                                  : '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <Alert variant="info">
                    Não há dados históricos de preços para comparação.
                  </Alert>
                )}
              </Tab>
              <Tab eventKey="export" title="Exportar">
                <div className="p-3">
                  <h5>Exportar comparação de preços</h5>
                  <p className="text-muted">
                    Escolha o formato para baixar a comparação de preços dos medicamentos selecionados.
                  </p>
                  
                  <Row className="mt-4">
                    <Col md={6}>
                      <Card className="text-center mb-3">
                        <Card.Body>
                          <i className="bi bi-file-earmark-pdf" style={{ fontSize: '2rem', color: '#dc3545' }}></i>
                          <Card.Title className="mt-3">Documento PDF</Card.Title>
                          <Card.Text>
                            Exportar para um documento PDF com tabela formatada.
                          </Card.Text>
                          <Button variant="danger" onClick={exportToPDF}>
                            <i className="bi bi-download me-1"></i> Baixar PDF
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                    
                    <Col md={6}>
                      <Card className="text-center mb-3">
                        <Card.Body>
                          <i className="bi bi-file-earmark-excel" style={{ fontSize: '2rem', color: '#198754' }}></i>
                          <Card.Title className="mt-3">Planilha Excel</Card.Title>
                          <Card.Text>
                            Exportar para uma planilha Excel editável.
                          </Card.Text>
                          <Button variant="success" onClick={exportToExcel}>
                            <i className="bi bi-download me-1"></i> Baixar Excel
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </div>
              </Tab>
            </Tabs>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowComparisonModal(false)}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ListPage;
