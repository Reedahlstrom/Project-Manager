import { Check, Undo2 } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, Row } from '@/components/ui/Card'
import { useReportBack } from '@/hooks/useCommitments'
import type { CommitmentRow, OwnerType } from '@/types/models'

const WHO: Record<OwnerType, string> = {
  me: 'me',
  paul: 'Paul',
  heather: 'Heather',
  external: 'them',
}

/**
 * What's finished on this project, and whether the loop was actually closed.
 *
 * Done and reported are different states, so they get different treatment:
 * something Paul asked for that he still hasn't heard about is not finished in
 * any sense that matters, and it says so here rather than only on Today.
 */
export function DoneList({
  commitments,
  onReport,
}: {
  commitments: CommitmentRow[]
  onReport: (c: CommitmentRow) => void
}) {
  const reportBack = useReportBack()

  if (commitments.length === 0) {
    return <p className="px-3 t-meta">Nothing finished yet.</p>
  }

  return (
    <Card className="p-1">
      {commitments.map((c) => {
        const owed = c.requested_by !== null
        const closed = c.reported_back_at !== null

        return (
          <Row key={c.id} className="items-center">
            <Check
              className={owed && !closed ? 'size-4 shrink-0 text-amber' : 'size-4 shrink-0 text-green'}
              aria-hidden
            />

            <div className="min-w-0 flex-1">
              <p className="t-item line-clamp-2 text-pretty">{c.title}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                {c.completed_at ? (
                  <span className="t-meta">
                    Done {new Date(c.completed_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                ) : null}
                {owed ? (
                  closed ? (
                    <Badge tone="green">
                      Reported to {WHO[c.requested_by as OwnerType]}
                      {c.reported_back_at
                        ? ' ' + new Date(c.reported_back_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : ''}
                    </Badge>
                  ) : (
                    <Badge tone="amber">
                      {WHO[c.requested_by as OwnerType]} not told yet
                    </Badge>
                  )
                ) : (
                  <span className="t-meta">Self-directed</span>
                )}
              </div>

              {/* The receipt. Without this, "reported" is a claim; with it,
                  there is a record of what was said and when. */}
              {closed && c.report_note ? (
                <p className="mt-1.5 border-l-2 border-border pl-2.5 text-[13px] leading-relaxed text-text-2">
                  {c.report_note}
                </p>
              ) : null}
            </div>

            {owed && !closed ? (
              <Button variant="secondary" size="sm" onClick={() => { onReport(c) }}>
                Report back
              </Button>
            ) : owed && closed ? (
              // Reversible: marking it reported by accident shouldn't be permanent.
              <Button
                variant="ghost"
                size="sm"
                className="text-text-3"
                aria-label="Undo reported"
                onClick={() => { reportBack.mutate({ id: c.id, note: null, undo: true }) }}
              >
                <Undo2 />
              </Button>
            ) : null}
          </Row>
        )
      })}
    </Card>
  )
}
