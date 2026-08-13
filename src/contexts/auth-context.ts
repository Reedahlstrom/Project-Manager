import type { Session } from '@supabase/supabase-js'
import { createContext, use } from 'react'

import type { ProfileRow } from '@/types/database'

export type AuthState = {
  session: Session | null
  profile: ProfileRow | null
  loading: boolean
  /**
   * Signed in, but no `profiles` row. Every RLS policy runs through
   * `is_member()`, which looks for one — so this state renders as a fully
   * working app containing nothing at all, and has to be named rather than
   * mistaken for an empty database.
   */
  profileMissing: boolean
}

// Split from AuthProvider so that file only exports components and Fast Refresh
// keeps working.
export const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  loading: true,
  profileMissing: false,
})

export function useAuth() {
  return use(AuthContext)
}
