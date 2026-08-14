/**
 * Shared Google plumbing for the Edge Functions.
 *
 * The refresh token lives in `integration_credentials`, a table with RLS on and
 * no select policy at all — only the service role inside a function can read
 * it. A token that grants whole-mailbox read should never be one query away
 * from the browser bundle.
 */
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'openid',
  'email',
].join(' ')

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing ${name}. Set it with: supabase secrets set ${name}=…`)
  return value
}

/** Exchange a refresh token for a short-lived access token. */
export async function accessToken(db: SupabaseClient): Promise<string> {
  const { data, error } = await db
    .from('integration_credentials')
    .select('refresh_token')
    .eq('provider', 'google')
    .maybeSingle()

  if (error) throw new Error(`Reading credentials failed: ${error.message}`)
  if (!data) throw new Error('Google is not connected yet. Visit the google-connect function first.')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      refresh_token: data.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(`Token refresh failed: ${json.error_description ?? json.error}`)
  return json.access_token as string
}

/**
 * Have we already handled this message?
 *
 * The insert IS the lock. Two overlapping cron ticks both try to claim the same
 * id and exactly one wins, so a slow run overlapping the next one can't double
 * process. Returns true if this invocation owns it.
 */
export async function claim(
  db: SupabaseClient,
  source: string,
  externalId: string
): Promise<boolean> {
  const { error } = await db
    .from('processed_messages')
    .insert({ source, external_id: externalId })
  // 23505 = unique violation = someone else already claimed it.
  if (error) return error.code !== '23505' ? Promise.reject(new Error(error.message)) : false
  return true
}

export async function recordDecision(
  db: SupabaseClient,
  source: string,
  externalId: string,
  decision: string,
  reason: string
) {
  await db
    .from('processed_messages')
    .update({ decision, reason })
    .eq('source', source)
    .eq('external_id', externalId)
}

/** Release a claim so a transient failure retries next tick rather than vanishing. */
export async function release(db: SupabaseClient, source: string, externalId: string) {
  await db.from('processed_messages').delete().eq('source', source).eq('external_id', externalId)
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
