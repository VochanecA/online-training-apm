import { createClient } from '@supabase/supabase-js';

// Koristite import.meta.env umesto process.env za Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Dodajte proveru za development
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase env varijable nisu postavljene!');
  console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Postoji' : 'Nije postavljeno');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);