/**
 * Turn a meeting transcript into a routed project and a list of proposed
 * action items.
 *
 * Three rules, and the first two are the ones that matter.
 *
 * 1. NOTHING IS WRITTEN AS A COMMITMENT. This returns proposals. Reed accepts
 *    them one at a time in the review screen. A model deciding what he owes
 *    people is exactly the thing this app exists to avoid.
 *
 * 2. RESTRICTED MATERIAL IS NEVER SENT. If the meeting is already filed under a
 *    restricted project, this refuses outright. If it is unrouted, routing runs
 *    on the TITLE ONLY — never the transcript — so a Church meeting cannot be
 *    identified by shipping its contents to an API. Once routing lands on a
 *    restricted project, extraction stops there.
 *
 * 3. RULES BEAT THE MODEL. If a routing rule matches the title, that wins with
 *    no API call at all.
 */
import { json, preflight, serviceClient } from '../_shared/google.ts'

const MODEL = 'claude-sonnet-5'

type Proposal = {
  title: string
  detail: string | null
  owner: 'me' | 'paul' | 'heather' | 'external'
  due_date: string | null
}

async function ask(system: string, user: string, maxTokens = 1200) {
  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? `Anthropic ${String(res.status)}`)
  return (data.content ?? []).map((b: { text?: string }) => b.text ?? '').join('')
}

/** Pull the first JSON object or array out of a reply, tolerating prose or fences. */
function parseJson<T>(text: string): T {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text)?.[1]
  const raw = (fenced ?? text).trim()
  const start = raw.search(/[[{]/)
  if (start === -1) throw new Error('No JSON in the reply')
  return JSON.parse(raw.slice(start)) as T
}

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre

  const db = serviceClient()

  try {
    const { meetingId } = (await req.json()) as { meetingId?: string }
    if (!meetingId) return json({ error: 'meetingId is required' }, 400)

    const { data: meeting, error } = await db
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!meeting) return json({ error: 'Meeting not found' }, 404)

    const { data: projects = [] } = await db
      .from('projects')
      .select('id, name, slug, purpose, sensitivity')
      .is('deleted_at', null)

    const restricted = new Set(
      (projects as { id: string; sensitivity: string }[])
        .filter((p) => p.sensitivity === 'restricted')
        .map((p) => p.id)
    )

    // Already filed somewhere restricted: refuse before anything leaves.
    if (meeting.project_id && restricted.has(meeting.project_id)) {
      return json({
        ok: false,
        refused: true,
        reason:
          'This meeting is filed under a restricted project, so its contents are never sent for extraction. Add the action items by hand.',
      })
    }

    // --- Routing ------------------------------------------------------------
    let projectId: string | null = meeting.project_id
    let autoRouted = false
    let routedBy = 'already filed'

    if (!projectId) {
      const { data: rules = [] } = await db
        .from('routing_rules')
        .select('project_id, kind, value')

      const title = (meeting.title ?? '').toLowerCase()
      const rule = (rules as { project_id: string; kind: string; value: string }[]).find(
        (r) => r.kind === 'keyword' && title.includes(r.value.toLowerCase())
      )

      if (rule) {
        projectId = rule.project_id
        autoRouted = true
        routedBy = 'your routing rule'
      } else {
        // TITLE ONLY. Sending the transcript to work out which project it
        // belongs to would mean sending Church material to decide whether it
        // is Church material.
        const list = (projects as { id: string; name: string; purpose: string | null }[])
          .map((p) => `${p.id} — ${p.name}: ${p.purpose ?? ''}`)
          .join('\n')

        const reply = await ask(
          'You route meetings to projects. Reply with ONLY a JSON object: ' +
            '{"project_id": "<uuid or null>", "confidence": "high"|"low"}. ' +
            'Answer null unless the title clearly names the project or its subject.',
          `Projects:\n${list}\n\nMeeting title: ${meeting.title}`,
          200
        )
        const routed = parseJson<{ project_id: string | null; confidence: string }>(reply)
        if (routed.project_id && routed.confidence === 'high') {
          projectId = routed.project_id
          autoRouted = true
          routedBy = 'the title'
        }
      }
    }

    // Routing may have landed on a restricted project. Stop before the
    // transcript is used for anything.
    if (projectId && restricted.has(projectId)) {
      await db.from('meetings').update({ project_id: projectId, auto_routed: autoRouted }).eq('id', meetingId)
      return json({
        ok: false,
        refused: true,
        projectId,
        reason:
          'Routed to a restricted project, so the transcript was not sent for extraction. Add the action items by hand.',
      })
    }

    // --- Action items -------------------------------------------------------
    const source = [meeting.summary, meeting.transcript].filter(Boolean).join('\n\n')
    if (!source.trim()) return json({ ok: true, projectId, autoRouted, proposals: [] })

    const reply = await ask(
      'You extract action items from meeting notes for Reed Ahlstrom, who runs operations for Paul Ahlstrom.\n' +
        'Reply with ONLY a JSON array. Each item: ' +
        '{"title": "<short imperative>", "detail": "<one sentence of context or null>", ' +
        '"owner": "me"|"paul"|"heather"|"external", "due_date": "<YYYY-MM-DD or null>"}.\n' +
        'Only things someone actually committed to do. Not topics discussed, not ideas raised. ' +
        '"me" is Reed. Return [] if nothing was committed to.',
      `Today is ${new Date().toISOString().slice(0, 10)}.\n\nMeeting: ${meeting.title}\n\n${source.slice(0, 20000)}`
    )

    const proposals = parseJson<Proposal[]>(reply)
      .filter((p) => typeof p.title === 'string' && p.title.trim())
      .slice(0, 25)

    await db
      .from('meetings')
      .update({
        project_id: projectId,
        auto_routed: autoRouted,
        extracted_at: new Date().toISOString(),
      })
      .eq('id', meetingId)

    return json({ ok: true, projectId, autoRouted, routedBy, proposals })
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500)
  }
})
