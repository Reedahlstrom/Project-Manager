/**
 * The cadence of trust, unit tested.
 *
 * `partition` decides what lands in Chase these and Report back. If it is wrong,
 * things fall through the cracks silently — no error, no crash, just a
 * commitment that never appears on a screen again. That makes it the highest
 * value logic in the app to test.
 */
import { describe, expect, it } from 'vitest'

import { partition } from '@/lib/commitment-lists'
import { addBusinessDays, defaultFollowUp, isOverdue, toISO, todayISO } from '@/lib/dates'
import type { CommitmentRow } from '@/types/models'

const TODAY = todayISO()
const YESTERDAY = toISO(new Date(Date.now() - 86_400_000))
const TOMORROW = toISO(new Date(Date.now() + 86_400_000))

function commitment(overrides: Partial<CommitmentRow> = {}): CommitmentRow {
  return {
    id: crypto.randomUUID(),
    project_id: 'project-1',
    event_id: null,
    title: 'A thing',
    detail: null,
    owner_type: 'me',
    owner_person_id: null,
    due_date: null,
    follow_up_date: null,
    status: 'open',
    blocked_reason: null,
    source: 'manual',
    source_note_id: null,
    last_nudged_at: null,
    completed_at: null,
    created_by: null,
    deleted_at: null,
    requested_by: null,
    requested_by_person_id: null,
    reported_back_at: null,
    report_note: null,
    confirmed_at: null,
    confirmed_by: null,
    confirmed_in_app: false,
    confirmation_note: null,
    source_daily_note_id: null,
    source_meeting_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('business days', () => {
  it('skips the weekend', () => {
    // Friday 2026-08-14 + 1 business day is Monday, not Saturday.
    const friday = new Date(2026, 7, 14)
    expect(toISO(addBusinessDays(friday, 1))).toBe('2026-08-17')
  })

  it('never lands a three-day follow-up on a weekend', () => {
    for (let offset = 0; offset < 14; offset++) {
      const start = new Date(2026, 7, 10 + offset)
      const day = addBusinessDays(start, 3).getDay()
      expect(day).not.toBe(0)
      expect(day).not.toBe(6)
    }
  })

  it('defaults the follow-up to a weekday', () => {
    const day = new Date(`${defaultFollowUp()}T12:00:00`).getDay()
    expect([1, 2, 3, 4, 5]).toContain(day)
  })
})

describe('overdue', () => {
  it('counts yesterday but not today', () => {
    expect(isOverdue(YESTERDAY)).toBe(true)
    expect(isOverdue(TODAY)).toBe(false)
    expect(isOverdue(TOMORROW)).toBe(false)
    expect(isOverdue(null)).toBe(false)
  })
})

describe('Chase these — someone owes us', () => {
  it('includes a waiting commitment whose follow-up has arrived', () => {
    const rows = [commitment({ status: 'waiting', follow_up_date: TODAY })]
    expect(partition(rows).chase).toHaveLength(1)
  })

  it('excludes one whose follow-up is still in the future', () => {
    const rows = [commitment({ status: 'waiting', follow_up_date: TOMORROW })]
    expect(partition(rows).chase).toEqual([])
  })

  it('excludes open commitments — waiting means someone else owes it', () => {
    const rows = [commitment({ status: 'open', follow_up_date: YESTERDAY })]
    expect(partition(rows).chase).toEqual([])
  })

  it('puts the longest-waiting first', () => {
    const rows = [
      commitment({ title: 'recent', status: 'waiting', follow_up_date: TODAY }),
      commitment({ title: 'stale', status: 'waiting', follow_up_date: YESTERDAY }),
    ]
    expect(partition(rows).chase.map((row) => row.title)).toEqual(['stale', 'recent'])
  })
})

describe('Report back — we owe someone', () => {
  it('includes a done commitment that somebody asked for', () => {
    const rows = [commitment({ status: 'done', requested_by: 'paul' })]
    expect(partition(rows).reportBack).toHaveLength(1)
  })

  it('excludes it once the loop is closed', () => {
    const rows = [
      commitment({
        status: 'done',
        requested_by: 'paul',
        reported_back_at: new Date().toISOString(),
      }),
    ]
    expect(partition(rows).reportBack).toEqual([])
  })

  it('excludes self-directed work — there is nobody to report to', () => {
    const rows = [commitment({ status: 'done', requested_by: null })]
    expect(partition(rows).reportBack).toEqual([])
  })

  it('excludes work that is not finished yet', () => {
    const rows = [commitment({ status: 'open', requested_by: 'paul' })]
    expect(partition(rows).reportBack).toEqual([])
  })
})

describe('Report back — you owe someone an update', () => {
  it('appears once done and someone asked', () => {
    const rows = [commitment({ status: 'done', requested_by: 'paul' })]
    expect(partition(rows).reportBack).toHaveLength(1)
  })

  it('clears once you have told them', () => {
    const rows = [
      commitment({
        status: 'done',
        requested_by: 'paul',
        reported_back_at: new Date().toISOString(),
      }),
    ]
    expect(partition(rows).reportBack).toEqual([])
  })

  it('never appears for self-directed work', () => {
    expect(partition([commitment({ status: 'done', requested_by: null })]).reportBack).toEqual([])
  })
})

describe('Overdue and Due today', () => {
  it('separates yesterday from today', () => {
    const rows = [
      commitment({ title: 'late', due_date: YESTERDAY }),
      commitment({ title: 'now', due_date: TODAY }),
      commitment({ title: 'later', due_date: TOMORROW }),
    ]
    const lists = partition(rows)
    expect(lists.overdue.map((row) => row.title)).toEqual(['late'])
    expect(lists.dueToday.map((row) => row.title)).toEqual(['now'])
  })

  it('never shows completed or dropped work as overdue', () => {
    const rows = [
      commitment({ due_date: YESTERDAY, status: 'done' }),
      commitment({ due_date: YESTERDAY, status: 'dropped' }),
    ]
    expect(partition(rows).overdue).toEqual([])
  })
})
