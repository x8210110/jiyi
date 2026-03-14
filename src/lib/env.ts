export const env = {
  supabaseUrl:
    typeof import.meta.env.VITE_SUPABASE_URL === 'string'
      ? (import.meta.env.VITE_SUPABASE_URL as string)
      : undefined,
  supabaseAnonKey:
    typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string'
      ? (import.meta.env.VITE_SUPABASE_ANON_KEY as string)
      : undefined,
}

