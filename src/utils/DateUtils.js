/**
 * Utilidades para manipulação de datas
 */

import { format, parse, isValid } from 'date-fns';

/**
 * Detecta o formato da data em uma string
 * @param {string} dateString - String contendo uma data
 * @returns {string|null} O formato detectado ou null se não for possível detectar
 */
export const detectarFormatoData = (dateString) => {
  if (!dateString) return null;
  
  // Remove espaços em branco
  const trimmed = dateString.trim();
  
  // Verifica se é um formato ISO (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return 'yyyy-MM-dd';
  }
  
  // Verifica se é formato brasileiro (DD/MM/YYYY)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return 'dd/MM/yyyy';
  }
  
  // Verifica se é formato americano (MM/DD/YYYY)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    // Precisamos diferenciar entre DD/MM/YYYY e MM/DD/YYYY
    // Verificamos se o primeiro número pode ser um mês válido (1-12)
    const firstPart = parseInt(trimmed.split('/')[0], 10);
    if (firstPart > 0 && firstPart <= 12) {
      return 'MM/dd/yyyy';
    }
  }
  
  // Verifica formato com barras invertidas (DD\\MM\\YYYY)
  if (/^\d{2}\\\d{2}\\\d{4}$/.test(trimmed)) {
    return 'dd\\\\MM\\\\yyyy';
  }
  
  // Formato com pontos (DD.MM.YYYY)
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
    return 'dd.MM.yyyy';
  }
  
  return null;
};

/**
 * Converte uma string de data para um objeto Date
 * @param {string} dateString - String contendo uma data
 * @returns {Date|null} Objeto Date ou null se não for possível converter
 */
export const converterStringParaData = (dateString) => {
  if (!dateString) return null;
  
  try {
    // Tenta detectar o formato
    const formato = detectarFormatoData(dateString);
    
    if (formato) {
      const dataConvertida = parse(dateString, formato, new Date());
      if (isValid(dataConvertida)) {
        return dataConvertida;
      }
    }
    
    // Se não conseguir detectar o formato, tenta converter diretamente
    const dataDirecta = new Date(dateString);
    if (isValid(dataDirecta)) {
      return dataDirecta;
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao converter data:', error);
    return null;
  }
};

/**
 * Formata uma data para o formato ISO (YYYY-MM-DD)
 * @param {Date|string} data - Data a ser formatada
 * @returns {string|null} Data formatada ou null se a entrada for inválida
 */
export const formatarParaISO = (data) => {
  try {
    // Se for string, tenta converter para Date primeiro
    if (typeof data === 'string') {
      data = converterStringParaData(data);
      if (!data) return null;
    }
    
    // Verifica se é um objeto Date válido
    if (!(data instanceof Date) || isNaN(data)) {
      return null;
    }
    
    // Formata para ISO
    return format(data, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Erro ao formatar data para ISO:', error);
    return null;
  }
};

/**
 * Formata uma data para o formato ISO com hora fixa para evitar problemas de fuso horário
 * @param {Date|string} data - Data a ser formatada
 * @returns {string|null} Data formatada com hora fixa ou null se a entrada for inválida
 */
export const formatarParaISOComHora = (data) => {
  const dataISO = formatarParaISO(data);
  if (!dataISO) return null;
  
  // Adiciona hora fixa (meio-dia) para evitar problemas de fuso horário
  return `${dataISO}T12:00:00`;
};

/**
 * Verifica se uma string contém uma data válida
 * @param {string} dateString - String a ser verificada
 * @returns {boolean} True se for uma data válida, false caso contrário
 */
export const isDataValida = (dateString) => {
  return converterStringParaData(dateString) !== null;
};

/**
 * Formata uma data do banco de dados para exibição, sem considerar fuso horário
 * @param {string} dateStr - String de data do banco de dados (formato ISO)
 * @returns {string} Data formatada para exibição (DD/MM/YYYY)
 */
export const formatarDataBancoDados = (dateStr) => {
  if (!dateStr) return '';
  
  try {
    // Para evitar problemas de fuso horário, tratamos a data como string
    // Extrai apenas a parte da data se vier com hora
    const dataLimpa = dateStr.split('T')[0];
    
    // Se a data estiver no formato ISO (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataLimpa)) {
      const [ano, mes, dia] = dataLimpa.split('-');
      return `${dia}/${mes}/${ano}`;
    }
    
    // Se já estiver em outro formato, retorna como está
    return dateStr;
  } catch (error) {
    console.error('Erro ao formatar data do banco:', error);
    return dateStr;
  }
};
