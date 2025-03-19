/**
 * Utilitários para diagnóstico da importação de dados CMED
 */

/**
 * Verifica problemas comuns em um arquivo de dados importado
 * @param {Array} data - Dados a serem verificados
 * @param {Object} mappings - Mapeamento de colunas
 * @returns {Object} Relatório de diagnóstico
 */
const diagnosticarArquivo = (data, mappings) => {
  // Se não tiver dados, retorna erro
  if (!data || data.length === 0) {
    return {
      status: 'error',
      message: 'Arquivo vazio ou inválido',
      detalhes: 'Nenhum dado foi encontrado para análise'
    };
  }

  // Verificar se todos os campos obrigatórios estão mapeados
  const camposObrigatorios = [
    'substancia', 'laboratorio', 'produto', 'apresentacao',
    'codigo_ggrem', 'registro', 'ean_1', 'classe_terapeutica',
    'tipo_de_produto', 'regime_de_preco', 'pf_sem_impostos'
  ];

  const camposNaoMapeados = camposObrigatorios.filter(campo => !mappings[campo]);
  
  // Se tiver campos não mapeados, retorna erro
  if (camposNaoMapeados.length > 0) {
    return {
      status: 'error',
      message: 'Campos obrigatórios não mapeados',
      detalhes: `Os seguintes campos não foram mapeados: ${camposNaoMapeados.join(', ')}`
    };
  }

  // Verificar se as colunas mapeadas existem nos dados
  const primeiraLinha = data[0];
  const camposInexistentes = [];
  
  Object.entries(mappings).forEach(([campo, coluna]) => {
    if (primeiraLinha[coluna] === undefined) {
      camposInexistentes.push(`${campo} (coluna '${coluna}')`);
    }
  });

  if (camposInexistentes.length > 0) {
    return {
      status: 'error',
      message: 'Colunas mapeadas não existem nos dados',
      detalhes: `As seguintes colunas não foram encontradas: ${camposInexistentes.join(', ')}`
    };
  }

  // Verificar valores inválidos
  const amostraLinhas = data.slice(0, Math.min(10, data.length));
  const problemas = {
    valoresVazios: {},
    valoresInvalidos: {}
  };

  // Conta quantos valores vazios ou inválidos existem para cada campo
  amostraLinhas.forEach((linha, index) => {
    Object.entries(mappings).forEach(([campo, coluna]) => {
      const valor = linha[coluna];
      
      // Verificar valores vazios
      if (valor === undefined || valor === null || valor === '') {
        problemas.valoresVazios[campo] = (problemas.valoresVazios[campo] || 0) + 1;
      }
      
      // Verificar valores inválidos para campos numéricos
      if (campo === 'pf_sem_impostos') {
        const valorNumerico = parseFloat(String(valor || '0').replace(',', '.'));
        if (isNaN(valorNumerico)) {
          problemas.valoresInvalidos[campo] = (problemas.valoresInvalidos[campo] || 0) + 1;
        }
      }
    });
  });

  // Verificar se há muitos problemas nas primeiras linhas
  const camposComProblemas = [];
  
  Object.entries(problemas.valoresVazios).forEach(([campo, quantidade]) => {
    if (quantidade > amostraLinhas.length / 2) {  // Mais da metade das linhas com problema
      camposComProblemas.push(`${campo} (${quantidade}/${amostraLinhas.length} valores vazios)`);
    }
  });
  
  Object.entries(problemas.valoresInvalidos).forEach(([campo, quantidade]) => {
    if (quantidade > 0) {
      camposComProblemas.push(`${campo} (${quantidade}/${amostraLinhas.length} valores inválidos)`);
    }
  });

  if (camposComProblemas.length > 0) {
    return {
      status: 'warning',
      message: 'Possíveis problemas detectados nos dados',
      detalhes: `Os seguintes campos têm valores problemáticos: ${camposComProblemas.join(', ')}`,
      problemas
    };
  }

  // Análise de amostra de dados (primeiras 5 linhas)
  const amostraDados = {};
  const amostra = data.slice(0, 5);
  
  camposObrigatorios.forEach(campo => {
    amostraDados[campo] = amostra.map(linha => linha[mappings[campo]]);
  });

  // Se tudo estiver ok, retorna sucesso
  return {
    status: 'success',
    message: 'Arquivo válido para importação',
    detalhes: 'Todos os campos foram mapeados corretamente e os dados parecem válidos',
    amostraDados
  };
};

/**
 * Valida uma data de publicação
 * @param {string} data - Data a ser validada
 * @returns {Object} Resultado da validação
 */
const validarDataPublicacao = (data) => {
  if (!data) {
    return {
      valido: false,
      message: 'Data não fornecida'
    };
  }

  // Verifica se a data está no formato yyyy-MM-dd
  const regexISO = /^\d{4}-\d{2}-\d{2}$/;
  if (!regexISO.test(data)) {
    return {
      valido: false,
      message: 'Data deve estar no formato ISO (YYYY-MM-DD)'
    };
  }

  // Verificar se é uma data válida
  const partes = data.split('-');
  const ano = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1;  // JavaScript meses são 0-11
  const dia = parseInt(partes[2], 10);
  
  const dataObj = new Date(ano, mes, dia);
  
  if (dataObj.getFullYear() !== ano || dataObj.getMonth() !== mes || dataObj.getDate() !== dia) {
    return {
      valido: false,
      message: 'Data inválida'
    };
  }

  // Verificar se não é uma data futura
  const hoje = new Date();
  if (dataObj > hoje) {
    return {
      valido: true,
      warning: 'A data é futura',
      message: 'A data fornecida é posterior à data atual'
    };
  }

  // Formatar como ISO com hora 12:00:00 para evitar problemas de fuso horário
  const dataFormatada = `${data}T12:00:00`;

  return {
    valido: true,
    message: 'Data válida',
    dataFormatada
  };
};

export { diagnosticarArquivo, validarDataPublicacao };
