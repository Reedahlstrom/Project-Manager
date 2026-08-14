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
  onReportBack?: (() => void) | undefined
  onEdit?: (() => void) | undefined
}) {
  const waitedDays = daysSince(commitment.last_nudged_at ?? commitment.created_at)

  return (
    <Row
      className={cn(
        'items-center',
        // Focus is a ring, not a background change — the background already
        // carries meaning here.
        focused && 'ring-1 ring-accent ring-inset'
      )}
      data-commitment-id={commitment.id}
    >
      {variant !== 'report' ? (
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
      ) : (
        <MessageSquareReply className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
      )}

      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 flex-1 text-left"
      >
        {/* Wrap to two lines rather than truncate. On a phone a truncated
            commitment reads as "Send the pre-read packet to every con…", which
            tells you nothing about what you actually have to do. */}
        <p className={cn('t-item line-clamp-2 text-pretty', variant === 'overdue' && 'text-text')}>
          {commitment.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {/* Truncated, not wrapped. A long project name spilling onto a second
              line pushed the badges to a third and made the row three deep on a
              phone — the metadata should stay one line under the title. */}
          {project ? (
            <span className="max-w-[60%] truncate t-meta">{project.name}</span>
          ) : null}

          {variant === 'overdue' && commitment.due_date ? (
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
            <Badge tone="accent">
              for {OWNER_LABEL[commitment.requested_by] ?? commitment.requested_by}
            </Badge>
          ) : null}

          {variant === 'default' && commitment.due_date ? (
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

      {variant === 'report' ? (
        <Button variant="ghost" size="sm" onClick={onReportBack}>
          Reported
        </Button>
      ) : null}
    </Row>
  )
}
