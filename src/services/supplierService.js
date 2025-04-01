import { supabase } from '../supabaseClient';

/**
 * Serviço para gerenciamento de fornecedores
 */
const supplierService = {
  /**
   * Busca todos os fornecedores
   * @returns {Promise<Array>} Lista de fornecedores
   */
  async getAll() {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
      
    if (error) throw error;
    return data || [];
  },
  
  /**
   * Busca um fornecedor pelo ID
   * @param {string} id ID do fornecedor
   * @returns {Promise<Object>} Dados do fornecedor
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data;
  },
  
  /**
   * Busca os contatos de um fornecedor
   * @param {string} supplierId ID do fornecedor
   * @returns {Promise<Array>} Lista de contatos do fornecedor
   */
  async getContacts(supplierId) {
    const { data, error } = await supabase
      .from('supplier_contacts')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('is_primary', { ascending: false });
      
    if (error) throw error;
    return data || [];
  },
  
  /**
   * Cria um novo fornecedor
   * @param {Object} supplier Dados do fornecedor
   * @returns {Promise<Object>} Fornecedor criado
   */
  async create(supplier) {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(supplier)
      .select();
      
    if (error) throw error;
    return data[0];
  },
  
  /**
   * Atualiza um fornecedor existente
   * @param {string} id ID do fornecedor
   * @param {Object} supplier Dados atualizados do fornecedor
   * @returns {Promise<Object>} Fornecedor atualizado
   */
  async update(id, supplier) {
    const { data, error } = await supabase
      .from('suppliers')
      .update(supplier)
      .eq('id', id)
      .select();
      
    if (error) throw error;
    return data[0];
  },
  
  /**
   * Exclui um fornecedor
   * @param {string} id ID do fornecedor
   * @returns {Promise<void>}
   */
  async delete(id) {
    // Primeiro verifica se o fornecedor está sendo usado em orçamentos
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('id')
      .eq('supplier_id', id)
      .limit(1);
      
    if (quotesError) throw quotesError;
    
    if (quotes && quotes.length > 0) {
      throw new Error('Este fornecedor não pode ser excluído pois está sendo usado em orçamentos.');
    }
    
    // Exclui os contatos do fornecedor
    const { error: contactsError } = await supabase
      .from('supplier_contacts')
      .delete()
      .eq('supplier_id', id);
      
    if (contactsError) throw contactsError;
    
    // Exclui as relações com medicamentos
    const { error: medicinesError } = await supabase
      .from('medicine_suppliers')
      .delete()
      .eq('supplier_id', id);
      
    if (medicinesError) throw medicinesError;
    
    // Exclui o fornecedor
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  },
  
  /**
   * Salva os contatos de um fornecedor (exclui os existentes e insere os novos)
   * @param {string} supplierId ID do fornecedor
   * @param {Array} contacts Lista de contatos
   * @returns {Promise<Array>} Lista de contatos salvos
   */
  async saveContacts(supplierId, contacts) {
    // Primeiro exclui todos os contatos existentes
    const { error: deleteError } = await supabase
      .from('supplier_contacts')
      .delete()
      .eq('supplier_id', supplierId);
      
    if (deleteError) throw deleteError;
    
    // Se não há contatos para inserir, retorna array vazio
    if (!contacts || contacts.length === 0) {
      return [];
    }
    
    // Filtra contatos sem nome e adiciona o supplier_id
    const contactsToInsert = contacts
      .filter(contact => contact.name && contact.name.trim() !== '')
      .map(contact => ({
        ...contact,
        supplier_id: supplierId
      }));
    
    // Se não há contatos válidos, retorna array vazio
    if (contactsToInsert.length === 0) {
      return [];
    }
    
    // Insere os novos contatos
    const { data, error } = await supabase
      .from('supplier_contacts')
      .insert(contactsToInsert)
      .select();
      
    if (error) throw error;
    return data;
  },
  
  /**
   * Busca medicamentos associados a um fornecedor
   * @param {string} supplierId ID do fornecedor
   * @returns {Promise<Array>} Lista de medicamentos do fornecedor
   */
  async getMedicines(supplierId) {
    const { data, error } = await supabase
      .from('medicine_suppliers')
      .select(`
        id,
        last_quote_price,
        last_quote_date,
        medicine_id,
        medicamentos_base:medicine_id (
          id,
          produto,
          substancia,
          apresentacao,
          laboratorio
        )
      `)
      .eq('supplier_id', supplierId);
      
    if (error) throw error;
    return data || [];
  },
  
  /**
   * Associa um medicamento a um fornecedor
   * @param {Object} medicineSuppplier Dados da associação
   * @returns {Promise<Object>} Associação criada
   */
  async addMedicine(medicineSuppplier) {
    const { data, error } = await supabase
      .from('medicine_suppliers')
      .insert(medicineSuppplier)
      .select();
      
    if (error) throw error;
    return data[0];
  },
  
  /**
   * Atualiza a associação entre medicamento e fornecedor
   * @param {string} id ID da associação
   * @param {Object} medicineSuppplier Dados atualizados
   * @returns {Promise<Object>} Associação atualizada
   */
  async updateMedicine(id, medicineSuppplier) {
    // Primeiro, registrar o novo preço no histórico
    if (medicineSuppplier.last_quote_price !== undefined) {
      try {
        const notes = medicineSuppplier.notes;
        
        // Remover o campo notes do objeto medicineSuppplier antes de atualizar
        const updateData = { ...medicineSuppplier };
        delete updateData.notes;
        
        await supabase
          .from('price_history')
          .insert({
            medicine_supplier_id: id,
            price: medicineSuppplier.last_quote_price,
            quote_date: medicineSuppplier.last_quote_date || new Date().toISOString(),
            notes: notes || null
          });
      } catch (error) {
        console.error('Erro ao salvar histórico de preço:', error);
        // Continua mesmo se houver erro no histórico
      }
    }
    
    // Remover o campo notes antes de atualizar
    const updateData = { ...medicineSuppplier };
    if (updateData.notes !== undefined) {
      delete updateData.notes;
    }
    
    // Atualiza os dados na tabela medicine_suppliers
    const { data, error } = await supabase
      .from('medicine_suppliers')
      .update(updateData)
      .eq('id', id)
      .select();
      
    if (error) throw error;
    return data[0];
  },
  
  /**
   * Remove a associação entre medicamento e fornecedor
   * @param {string} id ID da associação
   * @returns {Promise<void>}
   */
  async removeMedicine(id) {
    const { error } = await supabase
      .from('medicine_suppliers')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  },
  
  /**
   * Busca o histórico de preços de um medicamento para um fornecedor
   * @param {string} medicineSupplierID ID da associação entre medicamento e fornecedor
   * @returns {Promise<Object>} Histórico de preços e dados da CMED
   */
  async getPriceHistory(medicineSupplierID) {
    try {
      // Primeiro, obter a associação medicine_supplier para saber qual é o medicamento
      const { data: medicineSupplier, error: msError } = await supabase
        .from('medicine_suppliers')
        .select('*, medicamentos_base:medicine_id(*)')
        .eq('id', medicineSupplierID)
        .single();
        
      if (msError) throw msError;
      
      // Buscar o histórico de preços do fornecedor
      const { data: priceHistory, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('medicine_supplier_id', medicineSupplierID)
        .order('quote_date', { ascending: false });
        
      if (error) throw error;
      
      // Buscar os preços da CMED para este medicamento
      const { data: cmedPrices, error: cmedError } = await supabase
        .from('precos_historico')
        .select('*')
        .eq('medicamento_id', medicineSupplier.medicine_id)
        .order('data_publicacao', { ascending: true });
        
      if (cmedError) {
        console.error('Erro ao buscar preços CMED:', cmedError);
        // Se houver erro, continuamos com os dados que temos
        return {
          priceHistory: priceHistory || [],
          cmedPrices: [],
          reajustesCMED: [],
          medicineInfo: medicineSupplier?.medicamentos_base || {}
        };
      }
      
      // Buscar reajustes CMED para comparação
      const { data: reajustesCMED, error: reajustesError } = await supabase
        .from('reajustes_anuais')
        .select('*')
        .order('ano', { ascending: true });
        
      if (reajustesError) {
        console.error('Erro ao buscar reajustes CMED:', reajustesError);
        // Se houver erro, continuamos com os dados que temos
        return {
          priceHistory: priceHistory || [],
          cmedPrices: cmedPrices || [],
          reajustesCMED: [],
          medicineInfo: medicineSupplier?.medicamentos_base || {}
        };
      }
      
      // Processar os dados da CMED para incluir o ano e calcular variações
      const cmedProcessed = (cmedPrices || []).map((item, index) => {
        const ano = new Date(item.data_publicacao).getFullYear();
        let variacao_percentual = 0;
        
        if (index > 0 && cmedPrices[index - 1].pf_sem_impostos) {
          const precoAnterior = parseFloat(cmedPrices[index - 1].pf_sem_impostos);
          const precoAtual = parseFloat(item.pf_sem_impostos);
          variacao_percentual = precoAnterior > 0 
            ? ((precoAtual - precoAnterior) / precoAnterior * 100)
            : 0;
        }
        
        return {
          ...item,
          ano,
          variacao_percentual: parseFloat(variacao_percentual.toFixed(2))
        };
      });
      
      // Adicionar a informação do preço CMED correspondente a cada preço do fornecedor
      const enrichedPriceHistory = (priceHistory || []).map(item => {
        const quoteDate = new Date(item.quote_date);
        
        // Encontrar o preço CMED mais recente em relação à data da cotação
        let cmedPrice = null;
        for (let i = 0; i < cmedProcessed.length; i++) {
          const cmedDate = new Date(cmedProcessed[i].data_publicacao);
          if (cmedDate <= quoteDate) {
            cmedPrice = cmedProcessed[i];
          } else {
            break; // Já passamos da data da cotação
          }
        }
        
        let acimaCMED = false;
        let diferencaPercentual = 0;
        
        if (cmedPrice && cmedPrice.pf_sem_impostos) {
          const precoCMED = parseFloat(cmedPrice.pf_sem_impostos);
          const precoFornecedor = parseFloat(item.price);
          
          diferencaPercentual = precoCMED > 0 
            ? ((precoFornecedor - precoCMED) / precoCMED * 100)
            : 0;
            
          acimaCMED = precoFornecedor > precoCMED;
        }
        
        return {
          ...item,
          cmed_price: cmedPrice ? cmedPrice.pf_sem_impostos : null,
          cmed_date: cmedPrice ? cmedPrice.data_publicacao : null,
          acima_cmed: acimaCMED,
          diferenca_percentual: parseFloat(diferencaPercentual.toFixed(2))
        };
      });
      
      return {
        priceHistory: enrichedPriceHistory || [],
        cmedPrices: cmedProcessed || [],
        reajustesCMED: reajustesCMED || [],
        medicineInfo: medicineSupplier?.medicamentos_base || {}
      };
    } catch (error) {
      console.error('Erro ao buscar histórico de preços:', error);
      throw error;
    }
  },
  
  /**
   * Busca fornecedores que possuem medicamentos com uma determinada substância
   * @param {string} substance Substância ativa
   * @returns {Promise<Array>} Lista de fornecedores com seus medicamentos
   */
  async getSuppliersBySubstance(substance) {
    try {
      // Primeiro, buscar os IDs dos medicamentos com a substância especificada
      const { data: medicamentos, error: medicamentosError } = await supabase
        .from('medicamentos_base')
        .select('id')
        .eq('substancia', substance);
        
      if (medicamentosError) throw medicamentosError;
      if (!medicamentos || medicamentos.length === 0) return [];
      
      const medicineIds = medicamentos.map(med => med.id);
      
      // Buscar as associações entre medicamentos e fornecedores
      const { data: associations, error: associationsError } = await supabase
        .from('medicine_suppliers')
        .select(`
          id,
          last_quote_price,
          last_quote_date,
          medicine_id,
          supplier_id,
          medicamentos_base:medicine_id (
            id,
            produto,
            substancia,
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
        .in('medicine_id', medicineIds)
        .order('last_quote_price', { ascending: true });
        
      if (associationsError) throw associationsError;
      
      // Agrupar por apresentação para destacar o mais barato
      const byPresentation = associations.reduce((acc, item) => {
        const apresentacao = item.medicamentos_base?.apresentacao || 'Não especificada';
        
        if (!acc[apresentacao]) {
          acc[apresentacao] = [];
        }
        
        acc[apresentacao].push(item);
        return acc;
      }, {});
      
      // Para cada apresentação, ordenar por preço e marcar o mais barato
      Object.keys(byPresentation).forEach(apresentacao => {
        byPresentation[apresentacao].sort((a, b) => {
          const priceA = a.last_quote_price || Number.MAX_VALUE;
          const priceB = b.last_quote_price || Number.MAX_VALUE;
          return priceA - priceB;
        });
        
        // Marcar o primeiro (mais barato) como cheapest
        if (byPresentation[apresentacao].length > 0) {
          byPresentation[apresentacao][0].cheapest = true;
        }
      });
      
      // Transformar de volta em um array
      return Object.values(byPresentation).flat();
    } catch (error) {
      console.error('Erro ao buscar fornecedores por substância:', error);
      throw error;
    }
  }
};

export { supplierService };
