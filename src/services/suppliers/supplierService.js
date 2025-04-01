import { supabase } from '../supabaseClient';

/**
 * Serviço para gerenciar fornecedores
 */
export const supplierService = {
  /**
   * Busca todos os fornecedores
   * @returns {Promise<Array>} Lista de fornecedores
   */
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      throw error;
    }
  },

  /**
   * Busca um fornecedor pelo ID
   * @param {string} id ID do fornecedor
   * @returns {Promise<Object>} Dados do fornecedor
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Erro ao buscar fornecedor com ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Cria um novo fornecedor
   * @param {Object} supplier Dados do fornecedor
   * @returns {Promise<Object>} Fornecedor criado
   */
  async create(supplier) {
    try {
      // Adiciona timestamps
      const newSupplier = {
        ...supplier,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('suppliers')
        .insert([newSupplier])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
      throw error;
    }
  },

  /**
   * Atualiza um fornecedor existente
   * @param {string} id ID do fornecedor
   * @param {Object} supplier Dados atualizados do fornecedor
   * @returns {Promise<Object>} Fornecedor atualizado
   */
  async update(id, supplier) {
    try {
      // Atualiza o timestamp
      const updatedSupplier = {
        ...supplier,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('suppliers')
        .update(updatedSupplier)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error(`Erro ao atualizar fornecedor com ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Remove um fornecedor
   * @param {string} id ID do fornecedor
   * @returns {Promise<void>}
   */
  async delete(id) {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error(`Erro ao remover fornecedor com ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Busca todos os medicamentos associados a um fornecedor
   * @param {string} supplierId ID do fornecedor
   * @returns {Promise<Array>} Lista de medicamentos
   */
  async getMedicines(supplierId) {
    try {
      const { data, error } = await supabase
        .from('medicine_suppliers')
        .select(`
          id,
          last_quote_price,
          last_quote_date,
          medicine_id,
          medicamentos_base:medicine_id (
            id,
            nome_produto,
            apresentacao,
            laboratorio,
            tipo_de_produto,
            pf_sem_impostos
          )
        `)
        .eq('supplier_id', supplierId);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Erro ao buscar medicamentos do fornecedor com ID ${supplierId}:`, error);
      throw error;
    }
  },

  /**
   * Adiciona um medicamento a um fornecedor
   * @param {Object} medicineSuppplier Dados da relação medicamento-fornecedor
   * @returns {Promise<Object>} Relação criada
   */
  async addMedicine(medicineSuppplier) {
    try {
      // Adiciona timestamps
      const newMedicineSupplier = {
        ...medicineSuppplier,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('medicine_suppliers')
        .insert([newMedicineSupplier])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Erro ao adicionar medicamento ao fornecedor:', error);
      throw error;
    }
  },

  /**
   * Remove um medicamento de um fornecedor
   * @param {string} medicineSupplierId ID da relação medicamento-fornecedor
   * @returns {Promise<void>}
   */
  async removeMedicine(medicineSupplierId) {
    try {
      const { error } = await supabase
        .from('medicine_suppliers')
        .delete()
        .eq('id', medicineSupplierId);
      
      if (error) throw error;
    } catch (error) {
      console.error(`Erro ao remover medicamento do fornecedor:`, error);
      throw error;
    }
  },

  /**
   * Atualiza o preço de cotação de um medicamento para um fornecedor
   * @param {string} medicineSupplierId ID da relação medicamento-fornecedor
   * @param {number} price Novo preço
   * @returns {Promise<Object>} Relação atualizada
   */
  async updateMedicinePrice(medicineSupplierId, price) {
    try {
      const { data, error } = await supabase
        .from('medicine_suppliers')
        .update({
          last_quote_price: price,
          last_quote_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', medicineSupplierId)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error(`Erro ao atualizar preço do medicamento:`, error);
      throw error;
    }
  }
};

export default supplierService;
