import { Check, MessageSquareReply, Send } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Row } from '@/components/ui/Card'
import { Tooltip } from '@/components/ui/Tooltip'
import { daysSince, relativeDays } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { CommitmentRow, ProjectRow } from '@/types/models'

const OWNER_LABEL: Record<string, string> = {
  me: 'Me',
  paul: 'Paul',
  heather: 'Heather',
  external: 'External',
}

export function CommitmentItem({
  commitment,
  project,
  focused,
  variant = 'default',
  onComplete,
  onNudge,
  onReportBack,
  onEdit,
}: {
  commitment: CommitmentRow
  project?: ProjectRow | undefined
  focused: boolean
  variant?: 'default' | 'overdue' | 'chase' | 'report'
  onComplete?: (() => void) | undefined
  onNudge?: (() => void) | undefined
  onReportBack?: ((origin: { x: number; y: number }) => void) | undefined
  onEdit?: (() => void) | undefined
}) {
  const waitedDays = daysSince(commitment.last_nudged_at ?? commitment.created_at)

  // Ticked off and not yet reported. The row stays where it was and grows a
  // second action, so the whole loop happens in one place.
  //
  // Deliberately does NOT require a requester. Most commitments were created
  // without one, and gating the loop on a field nobody filled in means ticking
  // something off just makes it vanish — which is the opposite of the point.
  // If nobody is recorded, the sheet asks who.
  const owesReport = commitment.status === 'done' && commitment.reported_back_at === null

  const who = commitment.requested_by
    ? (OWNER_LABEL[commitment.requested_by] ?? commitment.requested_by)
    : ''

  return (
    <Row
      className={cn(
        'items-center',
        focused && 'ring-1 ring-accent ring-inset',
        owesReport && variant !== 'report' && 'bg-accent-muted'
      )}
      data-commitment-id={commitment.id}
    >
      {variant === 'report' ? (
        <MessageSquareReply className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
      ) : owesReport ? (
        // Step one is done. The tick stays filled so the progress is visible,
        // and the row is clearly not finished — because it isn't.
        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[5px] bg-green text-white">
          <Check className="size-3" />
        </span>
      ) : (
        <Tooltip content="Mark done (x)">
          <button
            type="button"
            onClick={onComplete}
            aria-label={`Complete: ${commitment.title}`}
            className={cn(
              'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[5px] border',
              'border-border-strong text-transparent transition-colors duration-150 ease-out',
              'hover:border-accent hover:text-accent'
            )}
          >
            <Check className="size-3" />
          </button>
        </Tooltip>
      )}

      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p
          className={cn(
            't-item line-clamp-2 text-pretty',
            variant === 'overdue' && 'text-text',
            owesReport && 'text-text-2 line-through decoration-text-3/40'
          )}
        >
          {commitment.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {project ? (
            <span className="max-w-[60%] truncate t-meta">{project.name}</span>
          ) : null}

          {variant === 'overdue' && commitment.due_date && !owesReport ? (
            <Badge tone="red">{relativeDays(commitment.due_date)}</Badge>
          ) : null}

          {variant === 'chase' ? (
            <>
              <Badge tone="amber">
                {OWNER_LABEL[commitment.owner_type] ?? commitment.owner_type}
              </Badge>
              {waitedDays !== null && waitedDays > 0 ? (
                <span className="t-meta">
                  {commitment.last_nudged_at ? 'nudged' : 'waiting'} {String(waitedDays)}d
                </span>
              ) : null}
            </>
          ) : null}

          {variant === 'report' && commitment.requested_by ? (
            <Badge tone="accent">for {who}</Badge>
          ) : null}

          {variant === 'default' && commitment.due_date && !owesReport ? (
            <span className="t-meta">{relativeDays(commitment.due_date)}</span>
          ) : null}
        </div>
      </button>

      {variant === 'chase' ? (
        <Button variant="ghost" size="sm" onClick={onNudge}>
          <Send />
          Nudged
        </Button>
      ) : null}

      {/* The second tap, in the same row as the first. */}
      {owesReport || variant === 'report' ? (
        <Button
          variant={owesReport && variant !== 'report' ? 'primary' : 'ghost'}
          size="sm"
          onClick={(event) => {
            const r = event.currentTarget.getBoundingClientRect()
            onReportBack?.({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
          }}
        >
          Report back
        </Button>
      ) : null}
    </Row>
  )
}
