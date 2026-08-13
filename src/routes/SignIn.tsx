import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Select'
import { supabase } from '@/lib/supabase'

/**
 * The inner gate. Cloudflare Access has already established who you are before
 * this screen renders; this establishes which database rows you can see.
 *
 * Deliberately plain. There is no signup, no password reset flow, and no
 * marketing — three accounts exist and they were created by hand.
 */
export function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) setError(signInError.message)
    setBusy(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-5">
      <form onSubmit={(event) => void onSubmit(event)} className="w-full max-w-xs">
        <p className="text-sm font-semibold tracking-tight text-text">Mega Projects</p>
        <p className="mb-6 mt-0.5 t-meta">Alta Labs</p>

        <div className="mb-3">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
            }}
          />
        </div>

        <div className="mb-4">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
            }}
          />
        </div>

        {error ? <p className="mb-3 text-[13px] text-red">{error}</p> : null}

        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}
