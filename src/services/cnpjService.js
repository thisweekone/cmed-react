/**
 * Serviço para consulta de dados de CNPJ
 * Utiliza a API pública do ReceitaWS
 */

// Função para formatar o CNPJ (remove caracteres não numéricos)
const formatCnpj = (cnpj) => {
  return cnpj.replace(/[^\d]/g, '');
};

// Função para validar o CNPJ
const isValidCnpj = (cnpj) => {
  const cleanCnpj = formatCnpj(cnpj);
  
  if (cleanCnpj.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleanCnpj)) return false;
  
  // Validação do algoritmo do CNPJ
  let sum = 0;
  let weight = 2;
  
  // Primeiro dígito verificador
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(cleanCnpj.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  
  let digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  
  if (parseInt(cleanCnpj.charAt(12)) !== digit) return false;
  
  // Segundo dígito verificador
  sum = 0;
  weight = 2;
  
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(cleanCnpj.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  
  digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  
  if (parseInt(cleanCnpj.charAt(13)) !== digit) return false;
  
  return true;
};

// Função para formatar o CNPJ para exibição (XX.XXX.XXX/XXXX-XX)
const formatCnpjForDisplay = (cnpj) => {
  const cleanCnpj = formatCnpj(cnpj);
  return cleanCnpj.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
};

/**
 * Consulta os dados de um CNPJ na API do ReceitaWS
 * @param {string} cnpj - CNPJ a ser consultado (pode incluir pontuação)
 * @returns {Promise} - Promise com os dados do CNPJ ou erro
 */
const fetchCnpjData = async (cnpj) => {
  const cleanCnpj = formatCnpj(cnpj);
  
  if (!isValidCnpj(cleanCnpj)) {
    throw new Error('CNPJ inválido');
  }
  
  try {
    // Usando a API pública do BrasilAPI
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
    
    if (!response.ok) {
      throw new Error('Erro ao consultar CNPJ');
    }
    
    const data = await response.json();
    
    // Formatando os dados para o formato esperado pelo nosso sistema
    return {
      cnpj: formatCnpjForDisplay(data.cnpj),
      name: data.razao_social,
      tradeName: data.nome_fantasia,
      address: data.logradouro,
      number: data.numero,
      complement: data.complemento,
      district: data.bairro,
      city: data.municipio,
      state: data.uf,
      zipcode: data.cep,
      email: data.email,
      phone: data.telefone,
      mainActivity: data.cnae_fiscal_descricao,
      openDate: data.data_inicio_atividade,
      legalNature: data.natureza_juridica
    };
  } catch (error) {
    console.error('Erro ao consultar CNPJ:', error);
    throw error;
  }
};

export { fetchCnpjData, isValidCnpj, formatCnpjForDisplay, formatCnpj };
