import { supabase } from '../../supabaseClient';

export const priceHistoryService = {
  /**
   * Obtém o histórico de preços para um determinado medicamento-fornecedor
   * @param {string|number} medicineSupplierID - ID do relacionamento medicamento-fornecedor
   * @returns {Promise<Array>} - Lista de registros de histórico de preços
   */
  async getHistoryByMedicineSupplier(medicineSupplierID) {
    try {
      // Converter ID para string para garantir compatibilidade
      const msId = String(medicineSupplierID);
      
      console.log(`Buscando histórico de preços para medicine_supplier_id=${msId}`);
      
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('medicine_supplier_id', msId)
        .order('quote_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar histórico de preços:', error);
      return []; // Retornar array vazio em vez de propagar o erro
    }
  },

  /**
   * Adiciona um novo registro de preço ao histórico
   * @param {Object} priceData - Dados do preço a ser registrado
   * @returns {Promise<Object>} - Registro criado
   */
  async addPriceRecord(priceData) {
    try {
      // Garantir que o ID do relacionamento seja uma string
      if (priceData.medicine_supplier_id) {
        priceData.medicine_supplier_id = String(priceData.medicine_supplier_id);
      }
      
      const { data, error } = await supabase
        .from('price_history')
        .insert([priceData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao adicionar registro de preço:', error);
      throw error;
    }
  },

  /**
   * Atualiza um registro de preço existente
   * @param {string|number} id - ID do registro de preço
   * @param {Object} priceData - Novos dados do preço
   * @returns {Promise<Object>} - Registro atualizado
   */
  async updatePriceRecord(id, priceData) {
    try {
      // Converter ID para string para garantir compatibilidade
      const recordId = String(id);
      
      // Garantir que o ID do relacionamento seja uma string
      if (priceData.medicine_supplier_id) {
        priceData.medicine_supplier_id = String(priceData.medicine_supplier_id);
      }
      
      const { data, error } = await supabase
        .from('price_history')
        .update(priceData)
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao atualizar registro de preço:', error);
      throw error;
    }
  },

  /**
   * Remove um registro de preço do histórico
   * @param {string|number} id - ID do registro de preço
   * @returns {Promise<void>}
   */
  async deletePriceRecord(id) {
    try {
      // Converter ID para string para garantir compatibilidade
      const recordId = String(id);
      
      const { error } = await supabase
        .from('price_history')
        .delete()
        .eq('id', recordId);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao excluir registro de preço:', error);
      throw error;
    }
  },

  /**
   * Obtém o último preço registrado para um medicamento-fornecedor
   * @param {string|number} medicineSupplierID - ID do relacionamento medicamento-fornecedor
   * @returns {Promise<Object|null>} - Último registro de preço ou null se não existir
   */
  async getLatestPrice(medicineSupplierID) {
    try {
      // Converter ID para string para garantir compatibilidade
      const msId = String(medicineSupplierID);
      
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('medicine_supplier_id', msId)
        .order('quote_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignora erro quando não encontra registro
      return data || null;
    } catch (error) {
      console.error('Erro ao buscar último preço:', error);
      return null; // Retornar null em vez de propagar o erro
    }
  },

  /**
   * Obtém estatísticas de preço para um medicamento-fornecedor
   * @param {string|number} medicineSupplierID - ID do relacionamento medicamento-fornecedor
   * @returns {Promise<Object>} - Estatísticas de preço
   */
  async getPriceStats(medicineSupplierID) {
    try {
      // Converter ID para string para garantir compatibilidade
      const msId = String(medicineSupplierID);
      
      console.log(`Buscando estatísticas de preço para medicine_supplier_id=${msId}`);
      
      const { data, error } = await supabase
        .rpc('get_price_statistics', { ms_id: msId });

      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Erro ao buscar estatísticas de preço:', error);
      return null; // Retornar null em vez de propagar o erro
    }
  }
};
