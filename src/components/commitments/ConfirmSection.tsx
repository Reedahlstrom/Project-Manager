import { useState } from 'react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/auth-context'
import { useConfirmCommitment } from '@/hooks/useCommitments'
import { celebrate } from '@/lib/celebrate'
import { daysAwaiting } from '@/lib/commitment-lists'
import type { CommitmentRow, ProjectRow } from '@/types/models'

/**
 * The other half of the loop: "It is good."
 *
 * Reporting is something Reed does about himself. This is the part only the
 * person who asked can do, and until they do it the commitment is not finished —
 * it is waiting on them.
 *
 * One tap is the whole interaction. A reply is offered but never required,
 * because a confirmation that takes effort is a confirmation that doesn't
 * happen, and an unanswered report is worse than a terse one.
 */
export function ConfirmSection({
  commitments,
  projects,
}: {
  commitments: CommitmentRow[]
  projects: ProjectRow[]
}) {
  const { profile } = useAuth()
  const confirm = useConfirmCommitment()
  const [replyingTo, setReplyingTo] = useState<string | undefined>(undefined)
  const [reply, setReply] = useState('')

  if (commitments.length === 0) return null

  return (
    <section className="mb-8">
      <div className="mb-2 flex items-baseline gap-2 px-1">
        <h2 className="t-section text-accent">Reed reported these</h2>
        <span className="t-meta tabular-nums">{commitments.length}</span>
      </div>

      <div className="grid gap-2">
        {commitments.map((c) => {
          const waiting = daysAwaiting(c) ?? 0
          const project = projects.find((p) => p.id === c.project_id)

          return (
            <Card key={c.id} className="border-accent/30 bg-accent-muted p-4">
              <p className="t-item text-pretty">{c.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {project ? <span className="t-meta">{project.name}</span> : null}
                {waiting >= 2 ? (
                  <Badge tone="amber">waiting {waiting}d on you</Badge>
                ) : null}
              </div>

              {/* What Reed actually said. Confirming without reading it would
                  make the whole loop ceremonial. */}
              {c.report_note ? (
                <p className="mt-2.5 border-l-2 border-accent/40 pl-2.5 text-[13px] leading-relaxed text-text-2">
                  {c.report_note}
                </p>
              ) : null}

              {replyingTo === c.id ? (
                <div className="mt-3">
                  <Input
                    autoFocus
                    value={reply}
                    onChange={(e) => {
                      setReply(e.target.value)
                    }}
                    placeholder="Anything to add?"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        confirm.mutate({
                          id: c.id,
                          note: reply,
                          byId: profile?.id ?? null,
                          inApp: true,
                        })
                        setReplyingTo(undefined)
                        setReply('')
                      }
                    }}
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        confirm.mutate({
                          id: c.id,
                          note: reply,
                          byId: profile?.id ?? null,
                          inApp: true,
                        })
                        setReplyingTo(undefined)
                        setReply('')
                      }}
                    >
                      Send it
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReplyingTo(undefined)
                        setReply('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  {/* One tap closes it. Everything else is optional. */}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(event) => {
                      const r = event.currentTarget.getBoundingClientRect()
                      confirm.mutate({
                        id: c.id,
                        byId: profile?.id ?? null,
                        inApp: true,
                      })
                      // This is the actual end of the loop, not the middle.
                      celebrate({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
                    }}
                  >
                    It&rsquo;s good
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReplyingTo(c.id)
                    }}
                  >
                    Reply first
                  </Button>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </section>
  )
}
