/**
 * PLACEHOLDER — replaced in prompt 2.
 *
 * Prompt 2 creates the schema and then regenerates this file with:
 *   npm run db:types
 *
 * Until then this is a permissive stand-in so the typed Supabase client
 * compiles. Do not hand-edit the generated version — it is derived from the
 * database and any manual change will be silently overwritten.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
