/**
 * Pull Google Calendar into `events`.
 *
 * Meetings are the thing you follow up on, so this is the half of the
 * integration that matters most. Events are matched to a project by routing
 * rules you write — attendee, sender domain, or a keyword in the title —
 * because a meeting silently landing under the wrong project is worse than one
 * that lands nowhere.
 *
 * Unmatched meetings are not discarded. They go to the inbox, where you file
 * them in a tap and can teach the router with a rule.
 */
import { accessToken, json, serviceClient } from '../_shared/google.ts'

type GEvent = {
  id: string
  status?: string
  summary?: string
  description?: string
  location?: string
  hangoutLink?: string
  htmlLink?: string
  updated?: string
  start?: { dateTime?: string; date?: string; timeZone?: string }
  end?: { dateTime?: string; date?: string }
  attendees?: { email?: string; responseStatus?: string }[]
  organizer?: { email?: string }
}

type Rule = { project_id: string; kind: string; value: string; always: boolean }

/** First matching rule wins; rules are ordered most specific first. */
function route(event: GEvent, rules: Rule[]): string | null {
  const attendees = (event.attendees ?? []).map((a) => (a.email ?? '').toLowerCase())
  const organizer = (event.organizer?.email ?? '').toLowerCase()
  const haystack = `${event.summary ?? ''} ${event.description ?? ''}`.toLowerCase()
  const all = [...attendees, organizer].filter(Boolean)

  const order = ['attendee', 'sender', 'domain', 'keyword']
  for (const kind of order) {
    for (const rule of rules.filter((r) => r.kind === kind)) {
      const value = rule.value.toLowerCase()
      if (kind === 'attendee' || kind === 'sender') {
        if (all.some((a) => a === value)) return rule.project_id
      } else if (kind === 'domain') {
        if (all.some((a) => a.endsWith(`@${value}`) || a.endsWith(`.${value}`))) return rule.project_id
      } else if (haystack.includes(value)) {
        return rule.project_id
      }
    }
  }
  return null
}

Deno.serve(async () => {
  const db = serviceClient()
  const started = new Date().toISOString()

  try {
    const token = await accessToken(db)
    const { data: rules = [] } = await db
      .from('routing_rules')
      .select('project_id, kind, value, always')

    // A month back for meetings you still owe follow-up on, three months
    // forward for what's coming.
    const timeMin = new Date(Date.now() - 30 * 86_400_000).toISOString()
    const timeMax = new Date(Date.now() + 90 * 86_400_000).toISOString()

    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
    url.searchParams.set('timeMin', timeMin)
    url.searchParams.set('timeMax', timeMax)
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('orderBy', 'startTime')
    url.searchParams.set('maxResults', '250')

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error?.message ?? 'Calendar fetch failed')

    const events: GEvent[] = body.items ?? []
    let synced = 0
    let inboxed = 0
    let skipped = 0

    for (const event of events) {
      if (event.status === 'cancelled') { skipped++; continue }
      // All-day entries are usually holidays and birthdays, not meetings.
      const startsAt = event.start?.dateTime
      if (!startsAt) { skipped++; continue }

      const projectId = route(event, rules as Rule[])

      if (!projectId) {
        // Unrouted: surface it once rather than dropping it.
        const ref = `cal:${event.id}`
        const { error } = await db.from('inbox_items').insert({
          raw_text: `Meeting: ${event.summary ?? '(no title)'} — ${new Date(startsAt).toLocaleString()}`,
          source: 'email',
          source_ref: ref,
          source_url: event.htmlLink ?? null,
        })
        // Unique violation just means we already surfaced it.
        if (!error) inboxed++
        continue
      }

      const { error } = await db
        .from('events')
        .upsert(
          {
            project_id: projectId,
            title: event.summary ?? '(no title)',
            starts_at: startsAt,
            ends_at: event.end?.dateTime ?? null,
            timezone: event.start?.timeZone ?? 'America/Denver',
            location: event.location ?? null,
            virtual_link: event.hangoutLink ?? event.htmlLink ?? null,
            agenda: event.description ?? null,
            external_source: 'google_calendar',
            external_id: event.id,
            external_updated_at: event.updated ?? null,
          },
          { onConflict: 'external_source,external_id' }
        )
      if (error) throw new Error(`Upserting "${event.summary}": ${error.message}`)
      synced++
    }

    await db.from('integration_state').upsert({
      provider: 'google_calendar',
      last_run_at: started,
      last_error: null,
      updated_at: new Date().toISOString(),
    })

    return json({ ok: true, seen: events.length, synced, inboxed, skipped })
  } catch (err) {
    await db.from('integration_state').upsert({
      provider: 'google_calendar',
      last_run_at: started,
      last_error: String(err),
      updated_at: new Date().toISOString(),
    })
    return json({ ok: false, error: String(err) }, 500)
  }
})
