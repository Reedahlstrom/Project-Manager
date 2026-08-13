/**
 * Date helpers.
 *
 * Commitments use `date` columns, not timestamps — "due Tuesday" means Tuesday
 * wherever you are, and shifting it by timezone is how a due date silently
 * becomes yesterday. Everything here works on `YYYY-MM-DD` strings in local time
 * and never touches UTC.
 */

export function todayISO(): string {
  return toISO(new Date())
}

export function toISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromISO(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1)
}

/**
 * Business days forward, skipping weekends.
 *
 * The default follow-up is three business days out: chase on Thursday for
 * something you asked about on Monday, and never land a follow-up on a Saturday
 * where it will be seen on Monday having already looked overdue for two days.
 */
export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from)
  let remaining = days
  while (remaining > 0) {
    result.setDate(result.getDate() + 1)
    const day = result.getDay()
    if (day !== 0 && day !== 6) remaining -= 1
  }
  return result
}

export function defaultFollowUp(): string {
  return toISO(addBusinessDays(new Date(), 3))
}

export function isOverdue(due: string | null): boolean {
  return due !== null && due < todayISO()
}

export function isToday(due: string | null): boolean {
  return due === todayISO()
}

/** "3 days ago", "today", "in 2 days" — for how long something has been waiting. */
export function relativeDays(iso: string | null): string {
  if (!iso) return ''
  const diff = Math.round((fromISO(iso).getTime() - fromISO(todayISO()).getTime()) / 86_400_000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === -1) return 'yesterday'
  if (diff < 0) return `${String(Math.abs(diff))}d ago`
  return `in ${String(diff)}d`
}

/** How long we have been waiting, in whole days. Used by "Chase these". */
export function daysSince(isoTimestamp: string | null): number | null {
  if (!isoTimestamp) return null
  const then = new Date(isoTimestamp)
  return Math.floor((Date.now() - then.getTime()) / 86_400_000)
}

export function formatDayLabel(iso: string): string {
  return fromISO(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatEventTime(startsAt: string, timezone: string): string {
  const date = new Date(startsAt)
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const day = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  // The zone abbreviation is always shown — a convening happens in a place.
  const zone =
    new Intl.DateTimeFormat(undefined, { timeZone: timezone, timeZoneName: 'short' })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value ?? ''
  return `${day} · ${time} ${zone}`.trim()
}
