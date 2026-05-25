import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Helper to access public schema tables with correct typing.
 *
 * Supabase's generic resolution with hand-written Database types can fail
 * for complex schemas. This helper provides a clean typed interface for
 * new public schema tables until types are auto-generated from the live DB.
 *
 * Usage:
 *   const db = publicDb(supabase)
 *   await db.from('profiles').update({ full_name: 'Jane' }).eq('id', userId)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function publicDb(supabase: SupabaseClient<Database> | any) {
  return supabase as SupabaseClient<Database, 'public'>
}
