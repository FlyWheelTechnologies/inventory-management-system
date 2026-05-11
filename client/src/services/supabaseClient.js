import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase credentials missing!");
} else {
  console.log("Supabase Client Initialized:", supabaseUrl);
  if (supabaseAnonKey.startsWith("sb_publishable_")) {
    console.warn("WARNING: VITE_SUPABASE_PUBLISHABLE_KEY looks like a Paystack key, not a Supabase key.");
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
