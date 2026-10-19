// Replace these placeholders with the project URL and public anon/publishable key.
// Never put a Supabase service_role or secret key in browser code.
export const supabaseUrl = "https://jzjhzjofjvmrmespkxpq.supabase.co";
export const supabaseAnonKey = "sb_publishable_Q4_zKCgrylyYXeBvY8FjmA_svOgITsJ";

export function hasSupabaseConfig() {
  return !supabaseUrl.includes("YOUR_PROJECT_ID")
    && !supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY");
}
