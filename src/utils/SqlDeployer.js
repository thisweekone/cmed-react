import { supabase } from '../supabaseClient';

/**
 * Utilitário para aplicação de funções SQL no banco de dados Supabase
 */
class SqlDeployer {
  /**
   * Verifica se uma função SQL existe no banco de dados
   * @param {string} functionName - Nome da função a verificar
   * @returns {Promise<boolean>} - true se a função existe, false caso contrário
   */
  static async checkFunctionExists(functionName) {
    try {
      const { data, error } = await supabase.rpc('pg_get_function_def', {
        p_schema_name: 'public',
        p_function_name: functionName
      });
      
      return !!data && !error;
    } catch (error) {
      console.error(`Erro ao verificar função ${functionName}:`, error);
      return false;
    }
  }

  /**
   * Aplica uma função SQL no banco de dados
   * @param {string} functionDefinition - Definição completa da função SQL (CREATE OR REPLACE FUNCTION...)
   * @returns {Promise<{success: boolean, message: string}>} - Resultado da operação
   */
  static async applyFunction(functionDefinition) {
    try {
      // NOTA: Em ambiente de produção, o Supabase não permite executar diretamente SQL 
      // via client SDK por razões de segurança. Esta função é apenas para demonstração.
      // Em produção, o SQL deve ser aplicado usando:
      // 1. Editor SQL do Supabase
      // 2. Migrations via Supabase CLI
      // 3. API específica para administração
      
      console.log('Aplicando função SQL:', functionDefinition.substring(0, 100) + '...');
      
      return {
        success: true,
        message: 'Função aplicada com sucesso (simulação)'
      };
    } catch (error) {
      console.error('Erro ao aplicar função SQL:', error);
      return {
        success: false,
        message: `Erro ao aplicar função: ${error.message}`
      };
    }
  }

  /**
   * Obtém a definição de uma função SQL existente
   * @param {string} functionName - Nome da função
   * @returns {Promise<string|null>} - Definição da função ou null se não existir
   */
  static async getFunctionDefinition(functionName) {
    try {
      const { data, error } = await supabase.rpc('pg_get_function_def', {
        p_schema_name: 'public',
        p_function_name: functionName
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Erro ao obter definição da função ${functionName}:`, error);
      return null;
    }
  }

  /**
   * Lista as funções SQL disponíveis no banco de dados
   * @returns {Promise<string[]>} - Lista de nomes das funções
   */
  static async listFunctions() {
    try {
      // Exemplo simplificado - em um ambiente real seria necessário consultar
      // as tabelas do sistema PostgreSQL para listar funções
      const testFunctions = [
        'obter_anos_disponiveis',
        'analise_por_categoria_terapeutica',
        'analise_correlacao_cambio',
        'analise_elasticidade_por_faixa',
        'analise_genericos_vs_referencia',
        'projecao_impacto_financeiro'
      ];
      
      const existingFunctions = [];
      
      for (const func of testFunctions) {
        const exists = await this.checkFunctionExists(func);
        if (exists) {
          existingFunctions.push(func);
        }
      }
      
      return existingFunctions;
    } catch (error) {
      console.error('Erro ao listar funções:', error);
      return [];
    }
  }
}

export default SqlDeployer;
