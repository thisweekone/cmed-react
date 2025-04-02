import { supabase } from '../supabaseClient';

/**
 * Serviço para gerenciar orçamentos
 */
export const quoteService = {
  /**
   * Busca todos os orçamentos
   * @param {Object} options Opções de filtro e ordenação
   * @returns {Promise<Array>} Lista de orçamentos
   */
  async getAll(options = {}) {
    try {
      let query = supabase
        .from('quotes')
        .select(`
          *,
          patients:patient_id (
            id,
            name,
            document
          ),
          insurance_providers:insurance_provider_id (
            id,
            name
          ),
          quote_items:quote_items (
            id,
            medicine_id,
            supplier_id,
            quantity,
            unit_price,
            margin_percentage,
            final_price,
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
          )
        `);
      
      // Aplicar filtros se fornecidos
      if (options.search) {
        query = query.or(`patients.name.ilike.%${options.search}%,insurance_providers.name.ilike.%${options.search}%`);
      }
      
      if (options.status) {
        query = query.eq('status', options.status);
      }
      
      if (options.patientId) {
        query = query.eq('patient_id', options.patientId);
      }
      
      if (options.insuranceProviderId) {
        query = query.eq('insurance_provider_id', options.insuranceProviderId);
      }
      
      // Aplicar ordenação
      const orderColumn = options.orderBy || 'created_at';
      const orderDirection = options.orderDirection || { ascending: false };
      query = query.order(orderColumn, orderDirection);
      
      const { data, error } = await query;
      
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
          patients:patient_id (
            id,
            name,
            document,
            phone,
            email,
            address
          ),
          insurance_providers:insurance_provider_id (
            id,
            name,
            code
          ),
          quote_items:quote_items (
            id,
            medicine_id,
            supplier_id,
            quantity,
            unit_price,
            margin_percentage,
            final_price,
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
   * Cria um novo orçamento com seus itens
   * @param {Object} quote Dados do orçamento
   * @param {Array} quoteItems Itens do orçamento
   * @returns {Promise<Object>} Orçamento criado
   */
  async create(quote, quoteItems) {
    // Iniciar uma transação
    const { data, error } = await supabase.rpc('create_quote_with_items', {
      quote_data: quote,
      items_data: quoteItems
    });

    if (error) {
      console.error('Erro ao criar orçamento:', error);
      throw error;
    }

    return data;
  },

  /**
   * Atualiza um orçamento existente
   * @param {string} id ID do orçamento
   * @param {Object} quote Dados atualizados do orçamento
   * @param {Array} quoteItems Itens atualizados do orçamento
   * @returns {Promise<Object>} Orçamento atualizado
   */
  async update(id, quote, quoteItems) {
    // Iniciar uma transação
    const { data, error } = await supabase.rpc('update_quote_with_items', {
      quote_id: id,
      quote_data: quote,
      items_data: quoteItems
    });

    if (error) {
      console.error(`Erro ao atualizar orçamento com ID ${id}:`, error);
      throw error;
    }

    return data;
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
   * Busca fornecedores para um medicamento
   * @param {string} medicineId ID do medicamento
   * @returns {Promise<Array>} Lista de fornecedores
   */
  async getSuppliersForMedicine(medicineId) {
    try {
      const { data, error } = await supabase
        .from('medicine_suppliers')
        .select(`id, last_quote_price, supplier_id, suppliers:supplier_id (id, name, email, phone)`)
        .eq('medicine_id', medicineId)
        .order('last_quote_price', { ascending: true });
      
      if (error) throw error;
      
      // Marcar o fornecedor com menor preço
      if (data && data.length > 0) {
        const lowestPriceSupplier = data[0]; // Já está ordenado pelo menor preço
        data.forEach(supplier => {
          supplier.isLowestPrice = supplier.id === lowestPriceSupplier.id;
        });
      }
      
      return data || [];
    } catch (error) {
      console.error(`Erro ao buscar fornecedores para o medicamento com ID ${medicineId}:`, error);
      throw error;
    }
  },

  /**
   * Busca pacientes que usam um determinado medicamento
   * @param {string} medicineId ID do medicamento
   * @returns {Promise<Array>} Lista de pacientes
   */
  async getPatientsUsingMedicine(medicineId) {
    try {
      const { data, error } = await supabase
        .from('quote_items')
        .select(`
          id,
          quotes:quote_id (
            id,
            patient_id,
            patients:patient_id (
              id,
              name,
              document,
              phone,
              email,
              insurance_provider_id,
              insurance_providers:insurance_provider_id (
                id,
                name
              )
            )
          )
        `)
        .eq('medicine_id', medicineId);
      
      if (error) throw error;
      
      // Extrair pacientes únicos
      const patientsMap = new Map();
      
      if (data) {
        data.forEach(item => {
          if (item.quotes && item.quotes.patients) {
            const patient = item.quotes.patients;
            if (!patientsMap.has(patient.id)) {
              patientsMap.set(patient.id, patient);
            }
          }
        });
      }
      
      return Array.from(patientsMap.values());
    } catch (error) {
      console.error(`Erro ao buscar pacientes que usam o medicamento com ID ${medicineId}:`, error);
      throw error;
    }
  },

  /**
   * Calcula o preço total de um orçamento baseado nos itens
   * @param {Array} items Itens do orçamento
   * @returns {number} Preço total
   */
  calculateTotalPrice(items) {
    if (!items || !items.length) return 0;
    
    return items.reduce((total, item) => {
      const itemTotal = (parseFloat(item.final_price) || 0) * (parseInt(item.quantity) || 1);
      return total + itemTotal;
    }, 0);
  }
};

export default quoteService;
