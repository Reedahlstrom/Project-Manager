/**
 * Poll Gmail, decide what deserves your attention, and put it in the inbox.
 *
 * Three rules govern this function, and they are the difference between a tool
 * that helps and one that quietly leaks.
 *
 * 1. FLAGGED MAIL BECOMES AN INBOX ITEM, NEVER A COMMITMENT. A model decides
 *    what is worth looking at; only you decide what you owe someone.
 *
 * 2. A ROUTING RULE SHORT-CIRCUITS THE MODEL. If the sender matches a rule you
 *    wrote, it is flagged without an API call — no cost, no latency, and no
 *    chance a classifier decides Paul isn't important today.
 *
 * 3. MESSAGE BODIES ARE NOT SENT TO THE MODEL BY DEFAULT. Metadata decides most
 *    cases. Body text is only included when EMAIL_TRIAGE_INCLUDE_BODY is
 *    explicitly enabled, and never for a message routed to a restricted
 *    project. This mailbox carries Church correspondence.
 *
 * Nothing is remembered in memory — `processed_messages` is the seen-set,
 * because this process does not survive between ticks.
 */
import { accessToken, claim, json, recordDecision, release, serviceClient } from '../_shared/google.ts'

const MODEL = 'claude-sonnet-5'
const MAX_PER_RUN = 25

type Rule = { project_id: string; kind: string; value: string; always: boolean }

function header(headers: { name: string; value: string }[], name: string) {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function senderAddress(from: string) {
  return (/<([^>]+)>/.exec(from)?.[1] ?? from).trim().toLowerCase()
}

function matchRule(from: string, subject: string, rules: Rule[]): Rule | null {
  const address = senderAddress(from)
  const domain = address.split('@')[1] ?? ''
  for (const rule of rules) {
    const value = rule.value.toLowerCase()
    if (rule.kind === 'sender' && address === value) return rule
    if (rule.kind === 'domain' && (domain === value || domain.endsWith(`.${value}`))) return rule
    if (rule.kind === 'keyword' && subject.toLowerCase().includes(value)) return rule
  }
  return null
}

const TRIAGE_PROMPT = `You are triaging inbound email for Reed Ahlstrom, who runs operations for Paul Ahlstrom across four efforts: an Angel Studios business advisory council, a Church Media Fund, a Church Jobs Fund, and a company called Obra.

Decide whether this needs Reed's personal attention.

Reply with ONLY "YES" or "NO" on the first line, then one short sentence of reason on the second.

YES when:
- A real person is asking Reed or Paul for something, or expecting a reply
- It concerns an advisor, investor, partner, or a Church contact
- It is time-sensitive, or a decision is waiting on someone
- Scheduling that requires a human judgement call

NO when:
- Automated notification, receipt, or system-generated mail nobody expects a reply to
- Newsletter, marketing, or social notification
- Calendar accept/decline, or a document-share notification
- Anything from a no-reply address with no action needed

Email:
From: {from}
Subject: {subject}
{bodyBlock}`

async function askModel(from: string, subject: string, body: string | null) {
  const key = Deno.env.get('ANTHROPIC_API_KEY')
  // No key configured: fail toward showing it rather than silently dropping it.
  if (!key) return { flag: true, reason: 'No triage key set — surfacing by default' }

  const prompt = TRIAGE_PROMPT.replace('{from}', from)
    .replace('{subject}', subject)
    .replace('{bodyBlock}', body ? `Body (excerpt): ${body.slice(0, 600)}` : '(body withheld)')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    // An API failure must not swallow the message. Surface it and move on.
    return { flag: true, reason: `Triage unavailable (${String(res.status)}) — surfacing` }
  }

  const data = await res.json()
  const text = (data.content ?? []).map((b: { text?: string }) => b.text ?? '').join('')
  const [verdict, ...rest] = text.trim().split('\n')
  return { flag: verdict.trim().toUpperCase().startsWith('YES'), reason: rest.join(' ').trim() }
}

Deno.serve(async () => {
  const db = serviceClient()
  const started = new Date().toISOString()
  const includeBody = Deno.env.get('EMAIL_TRIAGE_INCLUDE_BODY') === 'true'

  try {
    const token = await accessToken(db)
    const { data: rules = [] } = await db
      .from('routing_rules')
      .select('project_id, kind, value, always')

    // Restricted projects never have their mail bodies sent anywhere.
    const { data: restricted = [] } = await db
      .from('projects')
      .select('id')
      .eq('sensitivity', 'restricted')
    const restrictedIds = new Set((restricted as { id: string }[]).map((p) => p.id))

    const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
    listUrl.searchParams.set('q', 'in:inbox newer_than:2d -category:promotions -category:social')
    listUrl.searchParams.set('maxResults', String(MAX_PER_RUN))

    const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${token}` } })
    const list = await listRes.json()
    if (!listRes.ok) throw new Error(list.error?.message ?? 'Gmail list failed')

    let flagged = 0
    let ignored = 0
    let alreadySeen = 0

    for (const { id } of list.messages ?? []) {
      // The insert is the lock. If we don't own it, someone already handled it.
      if (!(await claim(db, 'gmail', id))) { alreadySeen++; continue }

      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata` +
            '&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date',
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const msg = await msgRes.json()
        if (!msgRes.ok) throw new Error(msg.error?.message ?? 'Gmail get failed')

        const headers = msg.payload?.headers ?? []
        const from = header(headers, 'From')
        const subject = header(headers, 'Subject') || '(no subject)'
        const snippet: string = msg.snippet ?? ''

        const rule = matchRule(from, subject, rules as Rule[])
        const isRestricted = rule ? restrictedIds.has(rule.project_id) : false

        let flag: boolean
        let reason: string

        if (rule?.always) {
          // Deterministic short-circuit — no model call at all.
          flag = true
          reason = `Matched your rule: ${rule.kind} ${rule.value}`
        } else {
          const body = includeBody && !isRestricted ? snippet : null
          const verdict = await askModel(from, subject, body)
          flag = verdict.flag
          reason = verdict.reason
        }

        if (flag) {
          const name = from.includes('<') ? from.split('<')[0].replace(/"/g, '').trim() : from
          const { error } = await db.from('inbox_items').insert({
            raw_text: `${name}: ${subject}`,
            source: 'email',
            source_ref: `gmail:${id}`,
            source_url: `https://mail.google.com/mail/u/0/#inbox/${msg.threadId ?? id}`,
            project_id: rule?.project_id ?? null,
          })
          if (error && error.code !== '23505') throw new Error(error.message)
          flagged++
          await recordDecision(db, 'gmail', id, 'flagged', reason)
        } else {
          ignored++
          await recordDecision(db, 'gmail', id, 'ignored', reason)
        }
      } catch (err) {
        // Give the claim back so a transient failure retries next tick instead
        // of losing the message forever.
        await release(db, 'gmail', id)
        throw err
      }
    }

    await db.from('integration_state').upsert({
      provider: 'gmail',
      last_run_at: started,
      last_error: null,
      updated_at: new Date().toISOString(),
    })

    return json({ ok: true, seen: (list.messages ?? []).length, flagged, ignored, alreadySeen })
  } catch (err) {
    await db.from('integration_state').upsert({
      provider: 'gmail',
      last_run_at: started,
      last_error: String(err),
      updated_at: new Date().toISOString(),
    })
    return json({ ok: false, error: String(err) }, 500)
  }
})
