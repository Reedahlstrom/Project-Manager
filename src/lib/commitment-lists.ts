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

  // Finished today and still owing a report. These stay in the section where
  // you did the work rather than jumping to the top the instant you tick them:
  // the loop should close where your eye already is, not somewhere you have to
  // go looking. Anything older surfaces in Report back instead.
  // No requester requirement: most commitments are created without one, and
  // gating on a field nobody filled in means ticking something off just makes
  // it disappear. The sheet asks who when it isn't recorded.
  const doneTodayOwing = commitments.filter(
    (c) =>
      c.status === 'done' &&
      c.reported_back_at === null &&
      (c.completed_at ?? '').slice(0, 10) === today
  )

  return {
    overdue: open
      .filter((c) => c.due_date !== null && c.due_date < today)
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')),

    dueToday: [
      ...open.filter((c) => c.due_date === today),
      // Ticked a moment ago, now showing a Report back action in place.
      ...doneTodayOwing.filter((c) => c.due_date === today || c.due_date === null),
    ],

    // Waiting on someone else, and the follow-up date has arrived.
    chase: open
      .filter(
        (c) => c.status === 'waiting' && c.follow_up_date !== null && c.follow_up_date <= today
      )
      .sort((a, b) => (a.follow_up_date ?? '').localeCompare(b.follow_up_date ?? '')),

    // Done, someone asked for it, and they still don't know it's finished.
    // Your move.
    reportBack: commitments
      .filter(
        (c) =>
          c.status === 'done' &&
          // Older unreported work surfaces at the top only when someone is
          // actually waiting — otherwise finishing a private task would nag.
          c.requested_by !== null &&
          c.reported_back_at === null &&
          // Today's are already visible where they were completed; showing them
          // twice would make the screen look like it had double the work.
          !doneTodayOwing.includes(c)
      )
      .sort((a, b) => (a.completed_at ?? '').localeCompare(b.completed_at ?? '')),

    // Reported, and still unanswered. Their move — but the loop is open until
    // they answer, so it stays visible rather than disappearing the moment you
    // send the message. Oldest first: a report that has gone unanswered for a
    // week is the one worth chasing.
    awaitingConfirmation: commitments
      .filter((c) => c.reported_back_at !== null && c.confirmed_at === null)
      .sort((a, b) => (a.reported_back_at ?? '').localeCompare(b.reported_back_at ?? '')),
  }
}

/**
 * The three acts, by two people.
 *
 * `reported` is deliberately not the end state. It is something Reed sets about
 * himself, so on its own it is self-attested — and the whole point of the
 * cadence is that the person who asked is the one who closes it.
 */
export type LoopState = 'not-owed' | 'to-report' | 'awaiting' | 'closed'

export function loopState(c: CommitmentRow): LoopState {
  if (c.requested_by === null) return 'not-owed'
  if (c.reported_back_at === null) return 'to-report'
  if (c.confirmed_at === null) return 'awaiting'
  return 'closed'
}

/** How long a report has gone unanswered, in whole days. */
export function daysAwaiting(c: CommitmentRow): number | null {
  if (!c.reported_back_at || c.confirmed_at) return null
  return Math.floor((Date.now() - new Date(c.reported_back_at).getTime()) / 86_400_000)
}
