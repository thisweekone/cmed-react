import { supabase } from '../../supabaseClient';

export const medicineService = {
  /**
   * Obtém todos os medicamentos cadastrados
   * @returns {Promise<Array>} Lista de medicamentos
   */
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('medicamentos_base')
        .select('*')
        .order('produto');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar medicamentos:', error);
      throw error;
    }
  },

  /**
   * Obtém um medicamento pelo ID
   * @param {string} id ID do medicamento, código GGREM ou nome do produto
   * @returns {Promise<Object>} Dados do medicamento
   */
  async getById(id) {
    try {
      if (!id) {
        console.error('ID do medicamento não fornecido');
        throw new Error('ID do medicamento não fornecido');
      }
      
      // Tentar buscar o medicamento usando diferentes campos
      const { data, error } = await supabase
        .from('medicamentos_base')
        .select('*')
        .or(`id.eq.${id},codigo_ggrem.eq.${id},produto.ilike.%${id}%`)
        .limit(1);

      if (error) {
        console.error(`Erro ao buscar medicamento com ID ${id}:`, error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.error(`Medicamento com ID ${id} não encontrado`);
        throw new Error(`Medicamento com ID ${id} não encontrado`);
      }
      
      return data[0];
    } catch (error) {
      console.error(`Erro ao buscar medicamento com ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Obtém todos os fornecedores de um medicamento específico
   * @param {string} medicineId ID do medicamento
   * @returns {Promise<Array>} Lista de fornecedores do medicamento
   */
  async getSuppliers(medicineId) {
    try {
      const { data, error } = await supabase
        .from('medicine_suppliers')
        .select(`
          id,
          last_quote_price,
          last_quote_date,
          suppliers (
            id,
            name,
            email,
            phone,
            address
          )
        `)
        .eq('medicine_id', medicineId)
        .order('last_quote_price', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Erro ao buscar fornecedores do medicamento ${medicineId}:`, error);
      throw error;
    }
  },

  /**
   * Busca a relação entre um medicamento e um fornecedor
   * @param {string|number} medicineId ID do medicamento
   * @param {string|number} supplierId ID do fornecedor
   * @returns {Promise<Object>} Objeto com os dados da relação ou erro
   */
  async getMedicineSupplierRelation(medicineId, supplierId) {
    try {
      // Converter IDs para string para garantir compatibilidade
      const medId = String(medicineId);
      const supId = String(supplierId);
      
      console.log(`Buscando relação: medicine_id=${medId}, supplier_id=${supId}`);
      
      const { data, error } = await supabase
        .from('medicine_suppliers')
        .select('id, last_quote_price, last_quote_date')
        .eq('medicine_id', medId)
        .eq('supplier_id', supId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignora erro quando não encontra registro
      return { data, error: null };
    } catch (error) {
      console.error(`Erro ao buscar relação entre medicamento ${medicineId} e fornecedor ${supplierId}:`, error);
      return { data: null, error };
    }
  },

  /**
   * Obtém todos os fornecedores de um medicamento com informações de preço
   * @param {string|number} medicineId ID do medicamento
   * @returns {Promise<Array>} Lista de fornecedores com preços
   */
  async getMedicineSuppliers(medicineId) {
    try {
      if (!medicineId) {
        console.error('ID do medicamento não fornecido');
        return [];
      }
      
      // Buscar diretamente da tabela medicine_suppliers usando o código do produto
      // em vez do ID UUID, já que o erro sugere que estamos usando códigos de produto
      const { data, error } = await supabase
        .from('medicine_suppliers')
        .select(`
          id,
          medicine_id,
          supplier:supplier_id (
            id,
            name,
            cnpj,
            contact_name,
            phone,
            email
          ),
          last_quote_price,
          last_quote_date
        `)
        .or(`medicine_id.eq.${medicineId},medicine_id.ilike.%${medicineId}%`);

      if (error) {
        console.error(`Erro ao buscar fornecedores do medicamento ${medicineId}:`, error);
        return [];
      }
      
      // Formatar os dados para facilitar o uso
      return (data || []).map(item => ({
        id: item.supplier.id,
        name: item.supplier.name,
        cnpj: item.supplier.cnpj,
        contact_name: item.supplier.contact_name,
        phone: item.supplier.phone,
        email: item.supplier.email,
        price: item.last_quote_price,
        quote_date: item.last_quote_date,
        relation_id: item.id,
        medicine_id: item.medicine_id,
        // Calcular variação de preço (mock - será implementado com dados reais)
        price_variation: Math.random() > 0.5 ? Math.random() * 10 : -Math.random() * 10
      }));
    } catch (error) {
      console.error(`Erro ao buscar fornecedores do medicamento ${medicineId}:`, error);
      return [];
    }
  },

  /**
   * Obtém todos os pacientes que usam um medicamento específico
   * @param {string|number} medicineId ID do medicamento
   * @returns {Promise<Array>} Lista de pacientes
   */
  async getMedicinePatients(medicineId) {
    try {
      if (!medicineId) {
        console.error('ID do medicamento não fornecido');
        return [];
      }
      
      // Buscar pacientes que usam este medicamento através dos itens de orçamento
      const { data, error } = await supabase
        .from('quote_items')
        .select(`
          id,
          quote:quote_id (
            id,
            patient:patient_id (
              id,
              name,
              cpf,
              email,
              phone,
              birth_date,
              insurance_provider:insurance_provider_id (
                id,
                name,
                ans_code
              )
            ),
            created_at
          )
        `)
        .or(`medicine_id.eq.${medicineId},medicine_id.ilike.%${medicineId}%`);

      if (error) {
        console.error(`Erro ao buscar pacientes do medicamento ${medicineId}:`, error);
        return [];
      }
      
      // Processar os dados para evitar duplicatas e garantir datas corretas
      const patientsMap = new Map();
      
      (data || []).forEach(item => {
        if (!item.quote || !item.quote.patient) return;
        
        const patient = item.quote.patient;
        const patientId = patient.id;
        
        // Se o paciente já foi adicionado, verificar se esta prescrição é mais recente
        if (patientsMap.has(patientId)) {
          const existingPatient = patientsMap.get(patientId);
          const existingDate = new Date(existingPatient.last_prescription);
          const newDate = new Date(item.quote.created_at);
          
          if (newDate > existingDate) {
            existingPatient.last_prescription = item.quote.created_at;
          }
        } else {
          // Adicionar novo paciente ao mapa
          patientsMap.set(patientId, {
            id: patient.id,
            name: patient.name,
            cpf: patient.cpf,
            email: patient.email,
            phone: patient.phone,
            birth_date: patient.birth_date,
            insurance_provider: patient.insurance_provider 
              ? { 
                  id: patient.insurance_provider.id,
                  name: patient.insurance_provider.name,
                  ans_code: patient.insurance_provider.ans_code
                } 
              : null,
            last_prescription: item.quote.created_at
          });
        }
      });
      
      // Converter o mapa em array
      return Array.from(patientsMap.values());
    } catch (error) {
      console.error(`Erro ao buscar pacientes do medicamento ${medicineId}:`, error);
      return [];
    }
  },

  /**
   * Obtém análise de preços para um medicamento específico
   * @param {string|number} medicineId ID do medicamento
   * @returns {Promise<Object>} Dados de análise de preço
   */
  async getMedicinePriceAnalysis(medicineId) {
    try {
      if (!medicineId) {
        console.error('ID do medicamento não fornecido');
        return {
          average_price: 0,
          min_price: 0,
          max_price: 0,
          price_variation: 0,
          cheapest_supplier: null,
          most_expensive_supplier: null,
          suppliers_count: 0
        };
      }
      
      // Buscar fornecedores do medicamento
      const suppliers = await this.getMedicineSuppliers(medicineId);
      
      if (!suppliers || suppliers.length === 0) {
        return {
          average_price: 0,
          min_price: 0,
          max_price: 0,
          price_variation: 0,
          cheapest_supplier: null,
          most_expensive_supplier: null,
          suppliers_count: 0
        };
      }
      
      // Calcular estatísticas de preço
      const prices = suppliers.map(s => s.price).filter(p => p !== null && p !== undefined);
      
      if (prices.length === 0) {
        return {
          average_price: 0,
          min_price: 0,
          max_price: 0,
          price_variation: 0,
          cheapest_supplier: null,
          most_expensive_supplier: null,
          suppliers_count: suppliers.length
        };
      }
      
      const average_price = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const min_price = Math.min(...prices);
      const max_price = Math.max(...prices);
      const price_variation = max_price > 0 ? ((max_price - min_price) / max_price) * 100 : 0;
      
      // Encontrar fornecedores com menor e maior preço
      const cheapest_supplier = suppliers.find(s => s.price === min_price);
      const most_expensive_supplier = suppliers.find(s => s.price === max_price);
      
      return {
        average_price,
        min_price,
        max_price,
        price_variation,
        cheapest_supplier,
        most_expensive_supplier,
        suppliers_count: suppliers.length
      };
    } catch (error) {
      console.error(`Erro ao analisar preços do medicamento ${medicineId}:`, error);
      return {
        average_price: 0,
        min_price: 0,
        max_price: 0,
        price_variation: 0,
        cheapest_supplier: null,
        most_expensive_supplier: null,
        suppliers_count: 0
      };
    }
  },

  /**
   * Adiciona um novo medicamento
   * @param {Object} medicine Dados do medicamento
   * @returns {Promise<Object>} Medicamento criado
   */
  async add(medicine) {
    try {
      const { data, error } = await supabase
        .from('medicamentos_base')
        .insert([medicine])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao adicionar medicamento:', error);
      throw error;
    }
  },

  /**
   * Atualiza um medicamento existente
   * @param {string} id ID do medicamento
   * @param {Object} medicine Novos dados do medicamento
   * @returns {Promise<Object>} Medicamento atualizado
   */
  async update(id, medicine) {
    try {
      const { data, error } = await supabase
        .from('medicamentos_base')
        .update(medicine)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Erro ao atualizar medicamento com ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Remove um medicamento
   * @param {string} id ID do medicamento
   * @returns {Promise<void>}
   */
  async remove(id) {
    try {
      const { error } = await supabase
        .from('medicamentos_base')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error(`Erro ao remover medicamento com ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Associa um medicamento a um fornecedor
   * @param {Object} relation Dados da relação (medicine_id, supplier_id, last_quote_price)
   * @returns {Promise<Object>} Relação criada
   */
  async addSupplier(relation) {
    try {
      const { data, error } = await supabase
        .from('medicine_suppliers')
        .insert([relation])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao associar medicamento ao fornecedor:', error);
      throw error;
    }
  },

  /**
   * Atualiza a relação entre medicamento e fornecedor
   * @param {string} relationId ID da relação
   * @param {Object} relation Novos dados da relação
   * @returns {Promise<Object>} Relação atualizada
   */
  async updateSupplierRelation(relationId, relation) {
    try {
      const { data, error } = await supabase
        .from('medicine_suppliers')
        .update(relation)
        .eq('id', relationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Erro ao atualizar relação com ID ${relationId}:`, error);
      throw error;
    }
  },

  /**
   * Remove a associação entre medicamento e fornecedor
   * @param {string} relationId ID da relação
   * @returns {Promise<void>}
   */
  async removeSupplier(relationId) {
    try {
      const { error } = await supabase
        .from('medicine_suppliers')
        .delete()
        .eq('id', relationId);

      if (error) throw error;
    } catch (error) {
      console.error(`Erro ao remover relação com ID ${relationId}:`, error);
      throw error;
    }
  },

  /**
   * Obtém estatísticas de preço para um fornecedor de medicamento específico
   * @param {string} medicineSupplierRelationId ID da relação entre medicamento e fornecedor
   * @returns {Promise<Object>} Estatísticas de preço
   */
  async getMedicineSupplierPriceStatistics(medicineSupplierRelationId) {
    try {
      if (!medicineSupplierRelationId) {
        console.error('ID da relação medicamento-fornecedor não fornecido');
        return null;
      }
      
      // Chamar a função SQL que calcula as estatísticas
      const { data, error } = await supabase
        .rpc('get_price_statistics', { ms_id: medicineSupplierRelationId });
      
      if (error) {
        console.error(`Erro ao obter estatísticas de preço para a relação ${medicineSupplierRelationId}:`, error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error(`Erro ao obter estatísticas de preço para a relação ${medicineSupplierRelationId}:`, error);
      return null;
    }
  },
};
