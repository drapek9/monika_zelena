import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const SUPABASE_URL = "https://ldiegklpdcfklfdqlxqb.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaWVna2xwZGNma2xmZHFseHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzAyNTIsImV4cCI6MjA5NDg0NjI1Mn0.ZI0yScrsrh-fyt6lfF3bT3h1J-fzVIRuIZhmbpQiUQM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: globalThis.localStorage,
  },
});
