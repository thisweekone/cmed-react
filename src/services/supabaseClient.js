import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wampborlfglfrqlrvfht.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhbXBib3JsZmdsZnJxbHJ2Zmh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3OTM0MjYsImV4cCI6MjA1MjM2OTQyNn0.ZS54zJIB38VOxAsor-_IW81DTDBlvo6fElKZn0K9-fQ';

console.log('Iniciando conexão com Supabase...');

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
});

// Debug de eventos de autenticação
supabase.auth.onAuthStateChange((event, session) => {
  console.debug('Supabase Auth Event:', event);
  console.debug('Supabase Auth Session:', session);
});

// Teste de conexão inicial
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Erro ao verificar sessão:', error);
  } else {
    console.log('Sessão verificada:', data?.session ? 'Usuário logado' : 'Sem usuário');
  }
});

export default supabase;
