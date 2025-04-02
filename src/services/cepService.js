/**
 * Serviço para consulta de CEP via API ViaCEP
 */
export const cepService = {
  /**
   * Busca informações de endereço a partir do CEP
   * @param {string} cep CEP a ser consultado (apenas números ou com hífen)
   * @returns {Promise<Object>} Dados do endereço
   */
  async getAddressByCep(cep) {
    try {
      // Remover caracteres não numéricos do CEP
      const cleanCep = cep.replace(/\D/g, '');
      
      if (cleanCep.length !== 8) {
        throw new Error('CEP deve conter 8 dígitos');
      }
      
      // Consultar a API ViaCEP
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      // Verificar se o CEP é válido
      if (data.erro) {
        throw new Error('CEP não encontrado');
      }
      
      // Retornar os dados no formato da aplicação
      return {
        zipcode: cleanCep,
        street: data.logradouro,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf,
        complement: data.complemento || ''
      };
    } catch (error) {
      console.error('Erro ao consultar CEP:', error);
      throw error;
    }
  },
  
  /**
   * Formata um endereço completo a partir dos dados da API
   * @param {Object} addressData Dados do endereço retornados pela API
   * @returns {Object} Dados do endereço formatados
   */
  formatAddress(addressData) {
    const { street, neighborhood, city, state, complement, zipcode } = addressData;
    
    return {
      street,
      neighborhood,
      city,
      state,
      complement,
      zipcode
    };
  }
};

export default cepService;
