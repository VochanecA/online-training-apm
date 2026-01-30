// lib/supabase.ts - OVO JE VEROVATNO PROBLEM
import { createClient } from '@supabase/supabase-js';

// OVO JE ANON KEY - NE MOŽE DA KREIRA KORISNIKE
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// OVO JE SERVICE ROLE KEY - OVO TREBA DA KORISTITE ZA ADMIN OPERACIJE
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ⭐⭐⭐ KREIRAJTE POSEBNOG KLIJENTA ZA ADMIN OPERACIJE ⭐⭐⭐
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});