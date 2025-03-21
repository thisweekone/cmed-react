import { createClient } from '@supabase/supabase-js';

// Definir diretamente as credenciais (apenas para desenvolvimento)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'Disponível' : 'Não disponível');

// Criar cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
