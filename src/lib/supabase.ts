import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://krdbfsdbgpuukbtuimpw.supabase.co'
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZGJmc2RiZ3B1dWtidHVpbXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NzM1MDEsImV4cCI6MjEwNTA0OTUwMX0.6QFF3SKZ7GgihbCT-rT_YPQ8H3ufm1kUKvy0uF-u7_M'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
