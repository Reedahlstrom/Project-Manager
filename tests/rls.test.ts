/**
 * RLS policy tests — the only tests in this repo that genuinely matter.
 *
 * These run against a REAL Supabase project using REAL user accounts, because
 * row-level security is enforced by Postgres and cannot be meaningfully mocked.
 * A mocked version of this file would pass while the database leaked.
 *
 * What is asserted: Heather cannot read a restricted project, cannot read a note
 * inside one, cannot read a restricted note in an otherwise open project, and
 * cannot read the audit log. Reed can read all of it.
 *
 * Setup: see tests/README.md. Requires .env.test.
 *
 * For a fast check with no credentials, run ./tests/sql/run.sh instead — it
 * exercises the same policies against a local Postgres.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Database } from '@/types/database'

type Client = SupabaseClient<Database>

const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TEST_REED_EMAIL',
  'TEST_REED_PASSWORD',
  'TEST_HEATHER_EMAIL',
  'TEST_HEATHER_PASSWORD',
]

const missing = REQUIRED_VARS.filter((name) => !process.env[name])
const configured = missing.length === 0

if (!configured) {
  // Loud, but not fatal — the unit tests still need to run. `npm run test:rls`
  // exercises the same policies against a local Postgres with no credentials,
  // so an unconfigured machine is not an unverified one.
  console.warn(
    `\n  ⚠  Supabase integration tests SKIPPED — missing ${missing.join(', ')}.` +
      `\n     Copy .env.test.example to .env.test (see tests/README.md).` +
      `\n     Policy coverage without credentials: npm run test:rls\n`
  )
}

// createClient throws on an empty URL at import time, before any skip applies,
// so an unconfigured machine needs something syntactically valid to hold.
// Nothing ever calls it — every suite is skipped.
const UNUSED = 'https://skipped.supabase.co'

function required(name: string): string {
  return process.env[name] ?? UNUSED
}

const SUPABASE_URL = required('SUPABASE_URL')
const ANON_KEY = required('SUPABASE_ANON_KEY')
const SERVICE_KEY = required('SUPABASE_SERVICE_ROLE_KEY')
const REED_EMAIL = required('TEST_REED_EMAIL')
const REED_PASSWORD = required('TEST_REED_PASSWORD')
const HEATHER_EMAIL = required('TEST_HEATHER_EMAIL')
const HEATHER_PASSWORD = required('TEST_HEATHER_PASSWORD')

// Bypasses RLS. Used only to create the fixtures the policies are asserted
// against — never to assert anything itself.
const admin: Client = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

async function signIn(email: string, password: string): Promise<Client> {
  const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Could not sign in as ${email}: ${error.message}`)
  return client
}

let reed: Client
let heather: Client

let restrictedProjectId: string
let openProjectId: string
let noteInRestrictedProjectId: string
let restrictedNoteInOpenProjectId: string

beforeAll(async () => {
  // Root-level hooks still run when every suite is skipped, so this has to bail
  // explicitly or it tries to sign in with empty credentials.
  if (!configured) return

  ;[reed, heather] = await Promise.all([
    signIn(REED_EMAIL, REED_PASSWORD),
    signIn(HEATHER_EMAIL, HEATHER_PASSWORD),
  ])

  const stamp = Date.now()

  const { data: restricted, error: e1 } = await admin
    .from('projects')
    .insert({
      name: `RLS test — restricted ${stamp}`,
      slug: `rls-test-restricted-${stamp}`,
      sensitivity: 'restricted',
    })
    .select('id')
    .single()
  if (e1) throw e1
  restrictedProjectId = restricted.id

  const { data: open, error: e2 } = await admin
    .from('projects')
    .insert({
      name: `RLS test — open ${stamp}`,
      slug: `rls-test-open-${stamp}`,
      sensitivity: 'standard',
    })
    .select('id')
    .single()
  if (e2) throw e2
  openProjectId = open.id

  // A note whose OWN sensitivity is standard, inside a restricted project.
  // This is the cascade case — the one that is easy to get wrong.
  const { data: cascadeNote, error: e3 } = await admin
    .from('notes')
    .insert({
      project_id: restrictedProjectId,
      title: 'Cascade case',
      body: 'Standard note inside a restricted project.',
      sensitivity: 'standard',
    })
    .select('id')
    .single()
  if (e3) throw e3
  noteInRestrictedProjectId = cascadeNote.id

  const { data: directNote, error: e4 } = await admin
    .from('notes')
    .insert({
      project_id: openProjectId,
      title: 'Direct case',
      body: 'Restricted note inside an open project.',
      sensitivity: 'restricted',
    })
    .select('id')
    .single()
  if (e4) throw e4
  restrictedNoteInOpenProjectId = directNote.id
})

afterAll(async () => {
  if (!configured) return
  // Cascades clean up the notes and commitments.
  await admin.from('projects').delete().in('id', [restrictedProjectId, openProjectId])
})

describe.skipIf(!configured)('Heather is locked out of restricted material', () => {
  it('cannot read a restricted project', async () => {
    const { data, error } = await heather
      .from('projects')
      .select('id, name')
      .eq('id', restrictedProjectId)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('cannot see a restricted project in a broad list query', async () => {
    // Filtering by id could mask a policy that leaks on an unfiltered select.
    const { data, error } = await heather.from('projects').select('id, sensitivity')

    expect(error).toBeNull()
    expect(data?.map((row) => row.id)).not.toContain(restrictedProjectId)
    expect(data?.some((row) => row.sensitivity === 'restricted')).toBe(false)
  })

  it('cannot read a standard note that lives inside a restricted project', async () => {
    const { data, error } = await heather
      .from('notes')
      .select('id, body')
      .eq('id', noteInRestrictedProjectId)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('cannot read a restricted note inside an open project', async () => {
    const { data, error } = await heather
      .from('notes')
      .select('id, body')
      .eq('id', restrictedNoteInOpenProjectId)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('cannot read the audit log', async () => {
    const { data } = await heather.from('audit_log').select('id, action, table_name')
    expect(data ?? []).toEqual([])
  })

  it('cannot write into a restricted project', async () => {
    const { error } = await heather.from('commitments').insert({
      project_id: restrictedProjectId,
      title: 'Should never be created',
    })

    expect(error).not.toBeNull()
  })

  it('cannot escalate a project to restricted', async () => {
    const { error } = await heather
      .from('projects')
      .update({ sensitivity: 'restricted' })
      .eq('id', openProjectId)

    expect(error).not.toBeNull()
  })

  it('cannot change her own role', async () => {
    const { data: me } = await heather.from('profiles').select('id').single()
    expect(me).not.toBeNull()

    const { error } = await heather
      .from('profiles')
      .update({ role: 'reed' })
      .eq('id', me?.id ?? '')

    expect(error).not.toBeNull()
  })
})

describe.skipIf(!configured)('Reed can read what Heather cannot', () => {
  it('reads the restricted project', async () => {
    const { data, error } = await reed.from('projects').select('id').eq('id', restrictedProjectId)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('reads the note inside the restricted project', async () => {
    const { data, error } = await reed
      .from('notes')
      .select('id')
      .eq('id', noteInRestrictedProjectId)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('reads the audit log', async () => {
    const { error } = await reed.from('audit_log').select('id').limit(1)
    expect(error).toBeNull()
  })
})

describe.skipIf(!configured)('Constraints that stop things falling through cracks', () => {
  it('refuses a waiting commitment with no follow_up_date', async () => {
    const { error } = await reed.from('commitments').insert({
      project_id: openProjectId,
      title: 'Waiting with no follow-up',
      status: 'waiting',
    })

    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/follow_up/i)
  })

  it('accepts a waiting commitment that has one', async () => {
    const { error } = await reed.from('commitments').insert({
      project_id: openProjectId,
      title: 'Waiting, properly',
      status: 'waiting',
      follow_up_date: '2026-09-01',
    })

    expect(error).toBeNull()
  })

  it('refuses an external commitment with no person attached', async () => {
    const { error } = await reed.from('commitments').insert({
      project_id: openProjectId,
      title: 'Owned by nobody in particular',
      owner_type: 'external',
    })

    expect(error).not.toBeNull()
  })
})
