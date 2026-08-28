import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string ?? ''
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string ?? ''

// Usar placeholders para que el build no falle — el error real aparece en runtime al hacer la primera request
const effectiveUrl  = supabaseUrl  || 'https://placeholder.supabase.co'
const effectiveAnon = supabaseAnon || 'placeholder-anon-key'

// Cliente sin genérico Database — los services usan tipos explícitos en cada query
export const supabase = createClient(effectiveUrl, effectiveAnon, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
  },
})

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnon
