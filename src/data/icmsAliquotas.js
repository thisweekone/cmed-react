/**
 * Alíquotas de ICMS por estado para medicamentos
 * Fonte: Tabela CMED
 */
export const icmsAliquotas = [
  { uf: 'AC', estado: 'Acre', aliquota: 17 },
  { uf: 'AL', estado: 'Alagoas', aliquota: 17 },
  { uf: 'AM', estado: 'Amazonas', aliquota: 18 },
  { uf: 'AP', estado: 'Amapá', aliquota: 18 },
  { uf: 'BA', estado: 'Bahia', aliquota: 18 },
  { uf: 'CE', estado: 'Ceará', aliquota: 18 },
  { uf: 'DF', estado: 'Distrito Federal', aliquota: 18 },
  { uf: 'ES', estado: 'Espírito Santo', aliquota: 17 },
  { uf: 'GO', estado: 'Goiás', aliquota: 17 },
  { uf: 'MA', estado: 'Maranhão', aliquota: 18 },
  { uf: 'MG', estado: 'Minas Gerais', aliquota: 18 },
  { uf: 'MS', estado: 'Mato Grosso do Sul', aliquota: 17 },
  { uf: 'MT', estado: 'Mato Grosso', aliquota: 17 },
  { uf: 'PA', estado: 'Pará', aliquota: 17 },
  { uf: 'PB', estado: 'Paraíba', aliquota: 18 },
  { uf: 'PE', estado: 'Pernambuco', aliquota: 18 },
  { uf: 'PI', estado: 'Piauí', aliquota: 18 },
  { uf: 'PR', estado: 'Paraná', aliquota: 18 },
  { uf: 'RJ', estado: 'Rio de Janeiro', aliquota: 20 },
  { uf: 'RN', estado: 'Rio Grande do Norte', aliquota: 18 },
  { uf: 'RO', estado: 'Rondônia', aliquota: 17.5 },
  { uf: 'RR', estado: 'Roraima', aliquota: 17 },
  { uf: 'RS', estado: 'Rio Grande do Sul', aliquota: 18 },
  { uf: 'SC', estado: 'Santa Catarina', aliquota: 17 },
  { uf: 'SE', estado: 'Sergipe', aliquota: 18 },
  { uf: 'SP', estado: 'São Paulo', aliquota: 18 },
  { uf: 'TO', estado: 'Tocantins', aliquota: 18 }
];

/**
 * Calcula o preço com ICMS baseado no preço de fábrica (PF) e na alíquota do estado
 * @param {number} precoPF - Preço de fábrica sem impostos
 * @param {number} aliquota - Alíquota de ICMS em percentual (ex: 17 para 17%)
 * @returns {number} - Preço com ICMS aplicado
 */
export const calcularPrecoComICMS = (precoPF, aliquota) => {
  if (!precoPF || isNaN(precoPF) || !aliquota || isNaN(aliquota)) {
    return 0;
  }
  
  // Fórmula: PF / (1 - (ICMS / 100))
  return precoPF / (1 - (aliquota / 100));
};

/**
 * Formata o valor como moeda brasileira
 * @param {number} valor - Valor a ser formatado
 * @returns {string} - Valor formatado como moeda
 */
export const formatarMoeda = (valor) => {
  if (!valor && valor !== 0) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};
