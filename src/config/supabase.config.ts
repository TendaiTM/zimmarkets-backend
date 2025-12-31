import { createClient } from '@supabase/supabase-js';

export const supabaseConfig = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_ANON_KEY,
};

export const supabaseClient = createClient(
  supabaseConfig.supabaseUrl as string,
  supabaseConfig.supabaseKey as string
);