import { createClient } from '@supabase/supabase-js';

// Definir diretamente as credenciais (apenas para desenvolvimento)
const supabaseUrl = 'https://wampborlfglfrqlrvfht.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhbXBib3JsZmdsZnJxbHJ2Zmh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3OTM0MjYsImV4cCI6MjA1MjM2OTQyNn0.ZS54zJIB38VOxAsor-_IW81DTDBlvo6fElKZn0K9-fQ';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'Disponível' : 'Não disponível');

// Criar cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
