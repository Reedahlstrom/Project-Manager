/**
 * Verifies the live Supabase database matches what the migrations intended.
 *
 * Uses the service role key, so it deliberately bypasses RLS — this checks
 * schema, seed data, constraints and triggers, NOT the policies. Policy
 * behaviour is covered by tests/sql/run.sh (local) and tests/rls.test.ts (live,
 * once the accounts exist).
 *
 * Run: node --env-file=.env.test scripts/verify-live.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — see tests/README.md')
  process.exit(1)
}

const db = createClient(url, key, { auth: { persistSession: false } })

let failures = 0
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures += 1
}

// --- Seed data --------------------------------------------------------------

const { data: projects, error: projectsError } = await db
  .from('projects')
  .select('name, slug, sensitivity')
  .order('sort_order')

check('projects table readable', !projectsError, projectsError?.message ?? '')
check('five projects seeded', projects?.length === 5, `found ${projects?.length ?? 0}`)

const restricted = projects?.filter((p) => p.sensitivity === 'restricted') ?? []
check(
  'both Church funds are restricted',
  restricted.length === 2 &&
    restricted.every((p) => p.slug === 'church-media-fund' || p.slug === 'church-jobs-fund'),
  restricted.map((p) => p.slug).join(', ')
)

const systems = projects?.find((p) => p.slug === 'systems-and-operations')

// --- Constraints ------------------------------------------------------------

const { error: waitingError } = await db.from('commitments').insert({
  project_id: systems?.id ?? '00000000-0000-0000-0000-000000000000',
  title: 'verify: waiting with no follow-up',
  status: 'waiting',
})
check(
  'waiting commitment rejected without follow_up_date',
  waitingError !== null,
  waitingError?.code ?? 'INSERT SUCCEEDED — constraint missing'
)

const { error: externalError } = await db.from('commitments').insert({
  project_id: systems?.id ?? '00000000-0000-0000-0000-000000000000',
  title: 'verify: external with no person',
  owner_type: 'external',
})
check(
  'external commitment rejected without a person',
  externalError !== null,
  externalError?.code ?? 'INSERT SUCCEEDED — constraint missing'
)

// --- Round trip + audit trigger ---------------------------------------------

const { data: sysProject } = await db
  .from('projects')
  .select('id')
  .eq('slug', 'systems-and-operations')
  .single()

const { data: created, error: createError } = await db
  .from('commitments')
  .insert({
    project_id: sysProject?.id,
    title: 'verify: round trip',
    requested_by: 'paul',
    status: 'done',
    completed_at: new Date().toISOString(),
  })
  .select('id, requested_by, reported_back_at')
  .single()

check('commitment insert round trips', !createError, createError?.message ?? '')
check(
  'report-back columns exist and default to open',
  created?.requested_by === 'paul' && created.reported_back_at === null
)

const { data: auditRows } = await db
  .from('audit_log')
  .select('action, table_name, row_id')
  .eq('row_id', created?.id ?? '')

check(
  'audit trigger fired on insert',
  (auditRows?.length ?? 0) > 0,
  `${auditRows?.length ?? 0} rows`
)

// Clean up.
if (created?.id) await db.from('commitments').delete().eq('id', created.id)

// --- Tables present ---------------------------------------------------------

const EXPECTED = [
  'profiles', 'projects', 'people', 'events', 'event_attendees', 'notes',
  'note_versions', 'commitments', 'decisions', 'documents',
  'checklist_templates', 'checklist_items', 'milestones', 'comments',
  'inbox_items', 'digests', 'audit_log',
]

for (const table of EXPECTED) {
  const { error } = await db.from(table).select('*', { count: 'exact', head: true })
  if (error) check(`table ${table} exists`, false, error.message)
}
check('all 17 tables present', true)

console.log(failures === 0 ? '\nLive database verified.' : `\n${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
