/**
 * Is everything actually running?
 *
 * Written because the two worst failures in this app were both silent: Gmail
 * stopped syncing for three days with a green checkmark next to it, and calendar
 * sync failed on every single run while the UI showed nothing. Neither would
 * have survived one look at this output.
 *
 *   npm run health
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SITE = 'https://altalabsstuff.org'

const db = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const ok = (b) => (b ? '  OK  ' : ' FAIL ')
const ago = (iso) => {
  if (!iso) return 'never'
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${String(mins)}m ago`
  const hrs = Math.round(mins / 60)
  return hrs < 48 ? `${String(hrs)}h ago` : `${String(Math.round(hrs / 24))}d ago`
}

const problems = []
function check(label, pass, detail = '') {
  console.log(`[${ok(pass)}] ${label.padEnd(26)} ${detail}`)
  if (!pass) problems.push(label)
}

console.log('\n── The site ──────────────────────────────────────────')
for (const url of [SITE, 'https://altalabs.pages.dev']) {
  try {
    const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } })
    const html = await res.text()
    const asset = /assets\/index-([A-Za-z0-9_-]+)\.js/.exec(html)?.[1] ?? '?'
    check(new URL(url).host, res.ok, `http ${String(res.status)} · build ${asset}`)
  } catch (err) {
    check(new URL(url).host, false, String(err))
  }
}

console.log('\n── The schedule ──────────────────────────────────────')
const { data: jobs = [] } = await db.rpc('sync_schedule')
for (const name of ['triage-email', 'sync-calendar']) {
  const job = jobs.find((j) => j.job_name === name)
  check(name, Boolean(job?.active), job ? `every ${job.schedule.replace('*/', '').split(' ')[0]} min` : 'NOT SCHEDULED')
}

console.log('\n── Google ────────────────────────────────────────────')
const { data: cred } = await db
  .from('integration_credentials')
  .select('account_email')
  .eq('provider', 'google')
  .maybeSingle()
check('connected as', Boolean(cred), cred?.account_email ?? 'NOT CONNECTED')

const { data: state = [] } = await db.from('integration_state').select('*')
for (const s of state) {
  // A run that succeeded long ago is not health. Stale is a failure.
  const mins = s.last_run_at ? (Date.now() - new Date(s.last_run_at).getTime()) / 60000 : Infinity
  const limit = s.provider === 'gmail' ? 30 : 90
  check(
    s.provider,
    mins < limit && !s.last_error,
    s.last_error ? `ERROR: ${s.last_error.slice(0, 46)}` : `ran ${ago(s.last_run_at)}`
  )
}

console.log('\n── The functions ─────────────────────────────────────')
for (const fn of ['triage-email', 'sync-calendar', 'extract-meeting']) {
  try {
    // A browser call preflights first; curl never does, which is exactly how
    // the missing CORS headers went unnoticed.
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: 'OPTIONS',
      headers: { Origin: SITE, 'Access-Control-Request-Method': 'POST' },
    })
    check(`${fn} (browser-callable)`, res.headers.has('access-control-allow-origin'), `http ${String(res.status)}`)
  } catch (err) {
    check(fn, false, String(err))
  }
}

console.log('\n── Anthropic ─────────────────────────────────────────')
try {
  const { data: m } = await db
    .from('meetings')
    .insert({ title: 'health check', transcript: 'Reed will send the list Friday.' })
    .select('id')
    .single()
  const res = await fetch(`${SUPABASE_URL}/functions/v1/extract-meeting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ meetingId: m.id }),
  })
  const out = await res.json()
  check('key works', out.ok === true, out.error ?? `extracted ${String(out.proposals?.length ?? 0)} item(s)`)
  await db.from('meetings').delete().eq('id', m.id)
} catch (err) {
  check('key works', false, String(err))
}

console.log('\n── Your data ─────────────────────────────────────────')
for (const [table, label] of [
  ['projects', 'projects'],
  ['commitments', 'commitments'],
  ['meetings', 'meetings'],
  ['daily_notes', 'daily notes'],
  ['events', 'calendar events'],
  ['playbook', 'ball knowledge'],
]) {
  const { count } = await db.from(table).select('*', { count: 'exact', head: true }).is('deleted_at', null)
  console.log(`         ${label.padEnd(26)} ${String(count ?? 0)}`)
}

const { count: owing } = await db
  .from('commitments')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'done')
  .not('requested_by', 'is', null)
  .is('reported_back_at', null)
console.log(`         ${'owed a report back'.padEnd(26)} ${String(owing ?? 0)}`)

console.log(
  problems.length
    ? `\n${String(problems.length)} problem(s): ${problems.join(', ')}\n`
    : '\nEverything is running.\n'
)
process.exit(problems.length ? 1 : 0)
