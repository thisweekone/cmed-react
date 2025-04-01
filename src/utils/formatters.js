/**
 * Formata um valor numérico para o formato de moeda brasileira (R$)
 * @param {number} value - Valor a ser formatado
 * @param {boolean} showSymbol - Se deve mostrar o símbolo R$ (padrão: true)
 * @returns {string} Valor formatado como moeda
 */
export const formatCurrency = (value, showSymbol = true) => {
  if (value === null || value === undefined) {
    return showSymbol ? 'R$ 0,00' : '0,00';
  }
  
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  const formatted = formatter.format(value);
  
  return showSymbol ? formatted : formatted.replace('R$', '').trim();
};

/**
 * Formata uma data para o formato brasileiro (DD/MM/YYYY)
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data formatada
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleDateString('pt-BR');
};

/**
 * Formata uma data e hora para o formato brasileiro (DD/MM/YYYY HH:MM)
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data e hora formatada
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleDateString('pt-BR') + ' ' + 
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Formata um número de telefone brasileiro
 * @param {string} phone - Número de telefone a ser formatado
 * @returns {string} Número de telefone formatado
 */
export const formatPhone = (phone) => {
  if (!phone) return '';
  
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Verifica o tamanho para determinar se é celular ou fixo
  if (cleaned.length === 11) {
    // Celular com DDD (11 dígitos)
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    // Telefone fixo com DDD (10 dígitos)
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 9) {
    // Celular sem DDD (9 dígitos)
    return cleaned.replace(/(\d{5})(\d{4})/, '$1-$2');
  } else if (cleaned.length === 8) {
    // Telefone fixo sem DDD (8 dígitos)
    return cleaned.replace(/(\d{4})(\d{4})/, '$1-$2');
  }
  
  // Se não se encaixar em nenhum formato conhecido, retorna como está
  return phone;
};

/**
 * Remove a formatação de um número de telefone
 * @param {string} phone - Número de telefone formatado
 * @returns {string} Número de telefone sem formatação
 */
export const unformatPhone = (phone) => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

/**
 * Formata um CNPJ para o formato XX.XXX.XXX/XXXX-XX
 * @param {string} cnpj - CNPJ a ser formatado
 * @returns {string} CNPJ formatado
 */
export const formatCNPJ = (cnpj) => {
  if (!cnpj) return '';
  
  // Remove todos os caracteres não numéricos
  const cleaned = cnpj.replace(/\D/g, '');
  
  // Aplica a máscara de CNPJ
  return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

/**
 * Remove a formatação de um CNPJ
 * @param {string} cnpj - CNPJ formatado
 * @returns {string} CNPJ sem formatação
 */
export const unformatCNPJ = (cnpj) => {
  if (!cnpj) return '';
  return cnpj.replace(/\D/g, '');
};

/**
 * Formata um CEP para o formato XXXXX-XXX
 * @param {string} cep - CEP a ser formatado
 * @returns {string} CEP formatado
 */
export const formatCEP = (cep) => {
  if (!cep) return '';
  
  // Remove todos os caracteres não numéricos
  const cleaned = cep.replace(/\D/g, '');
  
  // Aplica a máscara de CEP
  return cleaned.replace(/^(\d{5})(\d{3})$/, '$1-$2');
};

/**
 * Remove a formatação de um CEP
 * @param {string} cep - CEP formatado
 * @returns {string} CEP sem formatação
 */
export const unformatCEP = (cep) => {
  if (!cep) return '';
  return cep.replace(/\D/g, '');
};
