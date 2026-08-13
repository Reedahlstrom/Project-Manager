import type { Session } from '@supabase/supabase-js'
import { useEffect, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'

import { AuthContext } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'

/**
 * Supabase Auth is the inner gate. Cloudflare Access is the outer one, and both
 * are required — Access establishes who you are, this establishes which rows
 * you can see.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const { data: profile, isFetched } = useQuery({
    queryKey: ['profile', session?.user.id],
    enabled: Boolean(session),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session?.user.id ?? '')
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  return (
    <AuthContext
      value={{
        session,
        profile: profile ?? null,
        loading,
        profileMissing: Boolean(session) && isFetched && !profile,
      }}
    >
      {children}
    </AuthContext>
  )
}
