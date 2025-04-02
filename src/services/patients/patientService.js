import { supabase } from '../supabaseClient';

/**
 * Serviço para gerenciar pacientes
 */
export const patientService = {
  /**
   * Busca todos os pacientes
   * @param {Object} options Opções de filtro, ordenação e paginação
   * @returns {Promise<Object>} Objeto contendo a lista de pacientes e o total de registros
   */
  async getAll(options = {}) {
    try {
      // Configurar paginação
      const page = options.page || 0;
      const pageSize = options.pageSize || 25;
      const start = page * pageSize;
      const end = start + pageSize - 1;
      
      // Consulta principal para buscar os dados
      let query = supabase
        .from('patients')
        .select(`
          *,
          insurance_providers:insurance_provider_id (
            id,
            name,
            ans_code
          )
        `, { count: 'exact' }); // Solicitar contagem exata
      
      // Aplicar filtros se fornecidos
      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,cpf.ilike.%${options.search}%`);
      }
      
      if (options.insuranceProviderId) {
        query = query.eq('insurance_provider_id', options.insuranceProviderId);
      }
      
      // Filtros por localização
      if (options.city) {
        query = query.eq('city', options.city);
      }
      
      if (options.state) {
        query = query.eq('state', options.state);
      }
      
      // Aplicar ordenação
      const orderColumn = options.orderBy || 'name';
      const orderDirection = options.orderDirection || { ascending: true };
      query = query.order(orderColumn, orderDirection);
      
      // Aplicar paginação
      query = query.range(start, end);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return {
        data: data || [],
        totalCount: count || 0,
        page,
        pageSize
      };
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error);
      throw error;
    }
  },

  /**
   * Busca um paciente pelo ID
   * @param {string} id ID do paciente
   * @returns {Promise<Object>} Dados do paciente
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          insurance_providers:insurance_provider_id (
            id,
            name,
            ans_code,
            contact_name,
            phone,
            email
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Buscar contatos do paciente
      const contacts = await this.getContacts(id);
      return { ...data, contacts };
    } catch (error) {
      console.error(`Erro ao buscar paciente com ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Cria um novo paciente
   * @param {Object} patient Dados do paciente
   * @returns {Promise<Object>} Paciente criado
   */
  async create(patient) {
    try {
      // Separar contatos do objeto principal
      const { contacts, ...patientData } = patient;
      
      // Inserir paciente
      const { data, error } = await supabase
        .from('patients')
        .insert([patientData])
        .select();
      
      if (error) throw error;
      
      // Se houver contatos, inserir na tabela de contatos
      if (contacts && contacts.length > 0) {
        const patientId = data[0].id;
        const contactsWithPatientId = contacts.map(contact => ({
          ...contact,
          patient_id: patientId
        }));
        
        const { error: contactsError } = await supabase
          .from('patient_contacts')
          .insert(contactsWithPatientId);
        
        if (contactsError) throw contactsError;
      }
      
      return data[0];
    } catch (error) {
      console.error('Erro ao criar paciente:', error);
      throw error;
    }
  },

  /**
   * Atualiza um paciente existente
   * @param {string} id ID do paciente
   * @param {Object} patient Dados atualizados do paciente
   * @returns {Promise<Object>} Paciente atualizado
   */
  async update(id, patient) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .update(patient)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error(`Erro ao atualizar paciente com ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Exclui um paciente
   * @param {string} id ID do paciente
   * @returns {Promise<void>}
   */
  async delete(id) {
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error(`Erro ao excluir paciente com ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Busca orçamentos de um paciente
   * @param {string} patientId ID do paciente
   * @returns {Promise<Array>} Lista de orçamentos do paciente
   */
  async getQuotes(patientId) {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          medicamentos_base:medicine_id (
            id,
            produto,
            apresentacao,
            classe_terapeutica,
            substancia,
            laboratorio
          ),
          suppliers:supplier_id (
            id,
            name,
            phone,
            email
          )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Mapear os campos para os nomes esperados pela interface
      const formattedData = data?.map(quote => ({
        ...quote,
        medicamentos_base: quote.medicamentos_base ? {
          ...quote.medicamentos_base,
          name: quote.medicamentos_base.produto,
          concentration: quote.medicamentos_base.apresentacao,
          pharmaceutical_form: quote.medicamentos_base.classe_terapeutica,
          active_ingredient: quote.medicamentos_base.substancia,
          manufacturer: quote.medicamentos_base.laboratorio
        } : null
      })) || [];
      
      return formattedData;
    } catch (error) {
      console.error(`Erro ao buscar orçamentos do paciente ${patientId}:`, error);
      return []; // Retornar array vazio em caso de erro para evitar quebra da aplicação
    }
  },

  /**
   * Busca medicamentos utilizados por um paciente
   * @param {string} patientId ID do paciente
   * @returns {Promise<Array>} Lista de medicamentos do paciente
   */
  async getMedicines(patientId) {
    try {
      // Buscar medicamentos únicos dos orçamentos do paciente
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          medicamentos_base:medicine_id (
            id,
            produto,
            apresentacao,
            classe_terapeutica,
            substancia,
            laboratorio
          )
        `)
        .eq('patient_id', patientId);
      
      if (error) throw error;
      
      // Extrair medicamentos únicos e mapear para o formato esperado
      const uniqueMedicines = {};
      data?.forEach(quote => {
        if (quote.medicamentos_base) {
          const med = quote.medicamentos_base;
          uniqueMedicines[med.id] = {
            ...med,
            name: med.produto,
            concentration: med.apresentacao,
            pharmaceutical_form: med.classe_terapeutica,
            active_ingredient: med.substancia,
            manufacturer: med.laboratorio
          };
        }
      });
      
      return Object.values(uniqueMedicines);
    } catch (error) {
      console.error(`Erro ao buscar medicamentos do paciente ${patientId}:`, error);
      return []; // Retornar array vazio em caso de erro para evitar quebra da aplicação
    }
  },
  
  /**
   * Busca contatos de um paciente
   * @param {string} patientId ID do paciente
   * @returns {Promise<Array>} Lista de contatos do paciente
   */
  async getContacts(patientId) {
    try {
      const { data, error } = await supabase
        .from('patient_contacts')
        .select('*')
        .eq('patient_id', patientId)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Erro ao buscar contatos do paciente ${patientId}:`, error);
      throw error;
    }
  }
};

export default patientService;
