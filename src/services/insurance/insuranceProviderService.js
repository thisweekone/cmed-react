import { supabase } from '../supabaseClient';

/**
 * Serviço para gerenciar operadoras de saúde
 */
export const insuranceProviderService = {
  /**
   * Busca todas as operadoras de saúde
   * @param {Object} options Opções de filtro e ordenação
   * @returns {Promise<Array>} Lista de operadoras
   */
  async getAll(options = {}) {
    try {
      let query = supabase
        .from('insurance_providers')
        .select('*');
      
      // Aplicar filtros se fornecidos
      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,ans_code.ilike.%${options.search}%`);
      }
      
      // Aplicar ordenação
      const orderColumn = options.orderBy || 'name';
      const orderDirection = options.orderDirection || { ascending: true };
      query = query.order(orderColumn, orderDirection);
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar operadoras de saúde:', error);
      throw error;
    }
  },

  /**
   * Busca uma operadora de saúde pelo ID
   * @param {string} id ID da operadora
   * @returns {Promise<Object>} Dados da operadora
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('insurance_providers')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Erro ao buscar operadora com ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Cria uma nova operadora de saúde
   * @param {Object} provider Dados da operadora
   * @returns {Promise<Object>} Operadora criada
   */
  async create(provider) {
    try {
      const { data, error } = await supabase
        .from('insurance_providers')
        .insert([provider])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Erro ao criar operadora de saúde:', error);
      throw error;
    }
  },

  /**
   * Atualiza uma operadora de saúde existente
   * @param {string} id ID da operadora
   * @param {Object} provider Dados atualizados da operadora
   * @returns {Promise<Object>} Operadora atualizada
   */
  async update(id, provider) {
    try {
      const { data, error } = await supabase
        .from('insurance_providers')
        .update(provider)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error(`Erro ao atualizar operadora com ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Exclui uma operadora de saúde
   * @param {string} id ID da operadora
   * @returns {Promise<void>}
   */
  async delete(id) {
    try {
      const { error } = await supabase
        .from('insurance_providers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error(`Erro ao excluir operadora com ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Busca pacientes de uma operadora
   * @param {string} providerId ID da operadora
   * @returns {Promise<Array>} Lista de pacientes da operadora
   */
  async getPatients(providerId) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('insurance_provider_id', providerId);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Erro ao buscar pacientes da operadora ${providerId}:`, error);
      throw error;
    }
  },

  /**
   * Busca estatísticas de uma operadora
   * @param {string} providerId ID da operadora
   * @returns {Promise<Object>} Estatísticas da operadora
   */
  async getStats(providerId) {
    try {
      // Buscar contagem de pacientes
      const { count: patientCount, error: patientError } = await supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('insurance_provider_id', providerId);
      
      if (patientError) throw patientError;
      
      // Buscar contagem de orçamentos
      const { count: quoteCount, error: quoteError } = await supabase
        .from('quotes')
        .select('id', { count: 'exact', head: true })
        .eq('insurance_provider_id', providerId);
      
      if (quoteError) throw quoteError;
      
      // Buscar valor total de orçamentos
      const { data: quoteData, error: quoteSumError } = await supabase
        .from('quotes')
        .select('price')
        .eq('insurance_provider_id', providerId);
      
      if (quoteSumError) throw quoteSumError;
      
      const totalValue = quoteData?.reduce((sum, quote) => sum + (parseFloat(quote.price) || 0), 0) || 0;
      
      return {
        patientCount: patientCount || 0,
        quoteCount: quoteCount || 0,
        totalValue
      };
    } catch (error) {
      console.error(`Erro ao buscar estatísticas da operadora ${providerId}:`, error);
      throw error;
    }
  }
};

export default insuranceProviderService;
