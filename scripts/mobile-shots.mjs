/**
 * iPhone screenshots of every screen, with real device emulation.
 *
 * The browser-automation resize tool changes the OS window but not the rendered
 * viewport, so it silently produced desktop layouts. This uses Playwright's
 * iPhone descriptor — correct width, device pixel ratio, and touch — which is
 * the only way to actually see what Reed sees.
 *
 * Signs in as a temporary QA account, seeds a little realistic data so screens
 * aren't all empty states, shoots every route, then cleans up.
 *
 * Run: node --env-file=.env.test scripts/mobile-shots.mjs [baseUrl]
 */
import { chromium, devices } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { mkdirSync, rmSync } from 'node:fs'

const BASE = process.argv[2] ?? 'https://altalabs.pages.dev'
const OUT = 'mobile-shots'
const EMAIL = 'qa-mobile@altalabs.test'
const PASSWORD = 'QaMobile!2026#altalabs'

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// --- account -----------------------------------------------------------------
const existing = (await admin.auth.admin.listUsers({ perPage: 200 })).data.users.find(
  (u) => u.email === EMAIL
)
if (existing) {
  await admin.from('profiles').delete().eq('id', existing.id)
  await admin.auth.admin.deleteUser(existing.id)
}
const { data: created } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
})
await admin.from('profiles').upsert({ id: created.user.id, name: 'Reed', role: 'reed', email: EMAIL })

// --- seed realistic data so layouts are tested with content ------------------
const { data: projects } = await admin.from('projects').select('id, slug')
const angel = projects.find((p) => p.slug === 'angel-bac')
const obra = projects.find((p) => p.slug === 'obra')

const day = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
const iso = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

const seeded = { commitments: [], notes: [], events: [], inbox: [] }

async function add(table, row, bucket) {
  const { data, error } = await admin.from(table).insert(row).select('id').single()
  if (error) throw new Error(`${table}: ${error.message}`)
  seeded[bucket].push(data.id)
  return data.id
}

await add('commitments', {
  project_id: angel.id,
  title: 'Send the pre-read packet to every confirmed advisor',
  due_date: day(-3),
  owner_type: 'me',
  requested_by: 'paul',
}, 'commitments')

await add('commitments', {
  project_id: obra.id,
  title: 'Review the Q3 pipeline numbers with Brad before Thursday',
  due_date: day(0),
  owner_type: 'me',
}, 'commitments')

await add('commitments', {
  project_id: angel.id,
  title: 'Venue confirmation from the Provo conference centre',
  status: 'waiting',
  follow_up_date: day(-2),
  owner_type: 'external',
  owner_person_id: null,
}, 'commitments').catch(async () => {
  // external requires a person; fall back to a paul-owned wait
  await add('commitments', {
    project_id: angel.id,
    title: 'Venue confirmation from the Provo conference centre',
    status: 'waiting',
    follow_up_date: day(-2),
    owner_type: 'paul',
  }, 'commitments')
})

await add('commitments', {
  project_id: angel.id,
  title: 'Draft the advisory council invitation list',
  status: 'done',
  completed_at: new Date().toISOString(),
  requested_by: 'paul',
}, 'commitments')

await add('commitments', {
  project_id: obra.id,
  title: 'Decide whether Obra runs its own BDR team or outsources it',
  due_date: day(2),
  owner_type: 'paul',
}, 'commitments')

await add('notes', {
  project_id: angel.id,
  title: 'Call with Paul, Tuesday',
  body: 'Paul wants the council seated by October. He is thinking eight to ten people, weighted toward distribution and content credibility rather than finance.\n\nHe asked me to draft the invitation list and get it to him before the board meeting.',
}, 'notes')

await add('notes', {
  project_id: angel.id,
  body: 'Swag lead times are longer than expected — 10 weeks from art approval. If the convening is in October we are already close to the line.',
}, 'notes')

await add('events', {
  project_id: angel.id,
  title: 'First advisory council convening',
  type: 'convening',
  starts_at: iso(21),
  timezone: 'America/Denver',
  location: 'Provo',
}, 'events')

await add('inbox_items', {
  raw_text: 'Ask Heather how she handled the swag vendor last time',
  created_by: created.user.id,
}, 'inbox')

// --- shoot --------------------------------------------------------------------
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({ ...devices['iPhone 15 Pro'] })
const page = await context.newPage()

const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' })
await page.fill('#email', EMAIL)
await page.fill('#password', PASSWORD)
await page.click('button[type=submit]')
// Wait on something that only exists once signed in AND is visible on mobile —
// the sidebar nav is in the DOM but hidden at this width.
await page.waitForSelector('[data-capture-field]', { state: 'visible', timeout: 20000 })
await page.waitForTimeout(1500)

const shots = [
  ['01-today', `${BASE}/today`],
  ['02-projects', `${BASE}/projects`],
  ['03-project-detail', `${BASE}/projects/angel-bac`],
  ['04-people', `${BASE}/people`],
  ['05-paul', `${BASE}/paul`],
  ['06-scorecard', `${BASE}/scorecard`],
]

for (const [name, url] of shots) {
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  console.log('shot', name)
}

// Sheets, which are where narrow layouts usually break.
await page.goto(`${BASE}/projects/angel-bac`, { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
await page.getByRole('button', { name: /Add something to do/i }).click()
await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/07-commitment-sheet.png` })
console.log('shot 07-commitment-sheet')

await page.keyboard.press('Escape')
await page.waitForTimeout(400)
await page.getByRole('button', { name: /Add a date/i }).click()
await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/08-event-sheet.png` })
console.log('shot 08-event-sheet')

await page.keyboard.press('Escape')
await page.waitForTimeout(400)
await page.getByRole('button', { name: /^Edit$/ }).click()
await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/09-project-sheet.png` })
console.log('shot 09-project-sheet')

await browser.close()

// --- cleanup ------------------------------------------------------------------
for (const id of seeded.commitments) await admin.from('commitments').delete().eq('id', id)
for (const id of seeded.notes) await admin.from('notes').delete().eq('id', id)
for (const id of seeded.events) await admin.from('events').delete().eq('id', id)
for (const id of seeded.inbox) await admin.from('inbox_items').delete().eq('id', id)
await admin.from('profiles').delete().eq('id', created.user.id)
await admin.auth.admin.deleteUser(created.user.id)

console.log('\nconsole errors:', errors.length ? errors : 'none')
console.log('cleaned up.')
