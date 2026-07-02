import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If supabase env vars not set, supabase will be null and app uses offline/guest mode
export const supabase = (url && key && !url.includes('xxxx'))
  ? createClient(url, key)
  : null;

export const isSupabaseEnabled = !!supabase;
