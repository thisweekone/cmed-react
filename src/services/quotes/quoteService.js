import { supabase } from '../supabaseClient';

/**
 * Serviço para gerenciar orçamentos
 */
export const quoteService = {
  /**
   * Busca todos os orçamentos
   * @returns {Promise<Array>} Lista de orçamentos
   */
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          medicamentos_base:medicine_id (
            id,
            nome_produto,
            apresentacao,
            laboratorio
          ),
          suppliers:supplier_id (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar orçamentos:', error);
      throw error;
    }
  },

  /**
   * Busca um orçamento pelo ID
   * @param {string} id ID do orçamento
   * @returns {Promise<Object>} Dados do orçamento
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          medicamentos_base:medicine_id (
            id,
            nome_produto,
            apresentacao,
            laboratorio
          ),
          suppliers:supplier_id (
            id,
            name,
            email,
            phone
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Erro ao buscar orçamento com ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Cria um novo orçamento
   * @param {Object} quote Dados do orçamento
   * @returns {Promise<Object>} Orçamento criado
   */
  async create(quote) {
    try {
      // Adiciona timestamps e status padrão
      const newQuote = {
        ...quote,
        status: quote.status || 'pendente',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('quotes')
        .insert([newQuote])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Erro ao criar orçamento:', error);
      throw error;
    }
  },

  /**
   * Atualiza um orçamento existente
   * @param {string} id ID do orçamento
   * @param {Object} quote Dados atualizados do orçamento
   * @returns {Promise<Object>} Orçamento atualizado
   */
  async update(id, quote) {
    try {
      // Atualiza o timestamp
      const updatedQuote = {
        ...quote,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('quotes')
        .update(updatedQuote)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error(`Erro ao atualizar orçamento com ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Remove um orçamento
   * @param {string} id ID do orçamento
   * @returns {Promise<void>}
   */
  async delete(id) {
    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error(`Erro ao remover orçamento com ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Busca todos os fornecedores que possuem um determinado medicamento
   * @param {string} medicineId ID do medicamento
   * @returns {Promise<Array>} Lista de fornecedores com preços
   */
  async getSuppliersForMedicine(medicineId) {
    try {
      const { data, error } = await supabase
        .from('medicine_suppliers')
        .select(`
          id,
          last_quote_price,
          last_quote_date,
          supplier_id,
          suppliers:supplier_id (
            id,
            name,
            email,
            phone
          )
        `)
        .eq('medicine_id', medicineId)
        .order('last_quote_price', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Erro ao buscar fornecedores para o medicamento com ID ${medicineId}:`, error);
      throw error;
    }
  },

  /**
   * Busca orçamentos por paciente
   * @param {string} patientName Nome do paciente
   * @returns {Promise<Array>} Lista de orçamentos
   */
  async getByPatient(patientName) {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          medicamentos_base:medicine_id (
            id,
            nome_produto,
            apresentacao,
            laboratorio
          ),
          suppliers:supplier_id (
            id,
            name
          )
        `)
        .ilike('patient_name', `%${patientName}%`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Erro ao buscar orçamentos para o paciente ${patientName}:`, error);
      throw error;
    }
  },

  /**
   * Atualiza o status de um orçamento
   * @param {string} id ID do orçamento
   * @param {string} status Novo status
   * @returns {Promise<Object>} Orçamento atualizado
   */
  async updateStatus(id, status) {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error(`Erro ao atualizar status do orçamento com ID ${id}:`, error);
      throw error;
    }
  }
};

export default quoteService;
