import { todayISO } from '@/lib/dates'
import type { CommitmentRow } from '@/types/models'

/**
 * The four lists on Today, derived in one pass.
 *
 * Deliberately a pure function in its own module, importing nothing but dates
 * and types. It used to live in `useCommitments`, which meant testing it pulled
 * in the Supabase client — and that client throws at import time when env vars
 * are missing. So the unit tests passed locally, where `.env.local` exists, and
 * failed in CI where it doesn't. Logic this important should not need a
 * database connection to be verifiable.
 *
 * `chase` and `reportBack` are the two symmetric halves of the cadence:
 * someone owes us, and we owe someone.
 */
export function partition(commitments: CommitmentRow[]) {
  const today = todayISO()
  const open = commitments.filter((c) => c.status !== 'done' && c.status !== 'dropped')

  return {
    overdue: open
      .filter((c) => c.due_date !== null && c.due_date < today)
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')),

    dueToday: open.filter((c) => c.due_date === today),

    // Waiting on someone else, and the follow-up date has arrived.
    chase: open
      .filter(
        (c) => c.status === 'waiting' && c.follow_up_date !== null && c.follow_up_date <= today
      )
      .sort((a, b) => (a.follow_up_date ?? '').localeCompare(b.follow_up_date ?? '')),

    // Done, someone asked for it, and they still don't know it's finished.
    reportBack: commitments
      .filter((c) => c.status === 'done' && c.requested_by !== null && c.reported_back_at === null)
      .sort((a, b) => (a.completed_at ?? '').localeCompare(b.completed_at ?? '')),
  }
}
