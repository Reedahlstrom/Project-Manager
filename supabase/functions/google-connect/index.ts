/**
 * One-time Google connection.
 *
 * Open this in a browser, approve, done. The refresh token is written straight
 * into the database and never shown on screen or pasted anywhere — the point of
 * doing the OAuth dance properly rather than copying a token by hand is that
 * the secret never passes through a human.
 *
 *   /google-connect          → redirects to Google's consent screen
 *   /google-connect?code=…   → Google returns here; token is stored
 *
 * Protected by a setup key so the URL alone can't be used by anyone who finds
 * it. This function is deployed with --no-verify-jwt because Google's redirect
 * cannot carry a Supabase session.
 */
import { SCOPES, json, requireEnv, serviceClient } from '../_shared/google.ts'

/**
 * The redirect URI is fixed, not derived from the request.
 *
 * `new URL(req.url).origin + pathname` looked obvious and was wrong twice over:
 * Supabase strips the `/functions/v1` prefix before the function sees it, and
 * terminates TLS upstream so the inbound URL is `http`. That produced
 * `http://…supabase.co/google-connect`, which matches nothing registered with
 * Google and fails as redirect_uri_mismatch.
 *
 * It has to match the Cloud Console entry character for character anyway, so
 * hardcoding it is both correct and self-documenting.
 */
const REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')!}/functions/v1/google-connect`

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const redirectUri = REDIRECT_URI

  try {
    const code = url.searchParams.get('code')

    // --- Step 1: send the browser to Google ---------------------------------
    if (!code) {
      const setupKey = requireEnv('SETUP_KEY')
      if (url.searchParams.get('key') !== setupKey) {
        return json({ error: 'Add ?key=<SETUP_KEY> to this URL.' }, 401)
      }

      const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      auth.searchParams.set('client_id', requireEnv('GOOGLE_CLIENT_ID'))
      auth.searchParams.set('redirect_uri', redirectUri)
      auth.searchParams.set('response_type', 'code')
      auth.searchParams.set('scope', SCOPES)
      // Both are required to get a refresh token at all, and `consent` forces
      // Google to reissue one even if you've approved before — otherwise a
      // second run silently returns no refresh token and stores nothing.
      auth.searchParams.set('access_type', 'offline')
      auth.searchParams.set('prompt', 'consent')
      auth.searchParams.set('state', setupKey)

      return Response.redirect(auth.toString(), 302)
    }

    // --- Step 2: Google came back --------------------------------------------
    if (url.searchParams.get('state') !== requireEnv('SETUP_KEY')) {
      return json({ error: 'State mismatch — start again from the beginning.' }, 400)
    }

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: requireEnv('GOOGLE_CLIENT_ID'),
        client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const token = await res.json()
    if (!res.ok) return json({ error: token.error_description ?? token.error }, 400)
    if (!token.refresh_token) {
      return json(
        {
          error:
            'Google returned no refresh token. Remove this app at ' +
            'https://myaccount.google.com/permissions and try again.',
        },
        400
      )
    }

    // Who did we just connect as?
    const who = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    }).then((r) => r.json())

    const db = serviceClient()
    const { error } = await db.from('integration_credentials').upsert({
      provider: 'google',
      refresh_token: token.refresh_token,
      scopes: SCOPES,
      account_email: who.email ?? null,
      updated_at: new Date().toISOString(),
    })
    if (error) return json({ error: error.message }, 500)

    return new Response(
      `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
       <body style="font-family:-apple-system,system-ui,sans-serif;background:#F7F8FA;color:#14171C;
                    display:grid;place-items:center;height:100vh;margin:0;text-align:center">
         <div>
           <h1 style="font-size:1.25rem;margin:0 0 .5rem">Google connected</h1>
           <p style="color:#4A515E;margin:0">${who.email ?? 'account'} &mdash; you can close this tab.</p>
         </div>
       </body>`,
      // Charset must be explicit. Without it the gateway serves this as plain
      // text and you see the markup instead of the page — which looks like a
      // failure at the exact moment the thing has actually succeeded.
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
