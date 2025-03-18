import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL ou Key não configurados. Verifique o arquivo .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
