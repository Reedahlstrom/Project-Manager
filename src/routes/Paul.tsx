import { useMemo, useState } from 'react'

import { Page } from '@/components/Page'
import { Badge, HealthDot } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, Row } from '@/components/ui/Card'
import {
  useCommitments,
  useCompleteCommitment,
  useSaveCommitment,
} from '@/hooks/useCommitments'
import { useProjects } from '@/hooks/useProjects'
import { relativeDays, todayISO } from '@/lib/dates'
import type { CommitmentRow } from '@/types/models'

/**
 * Paul's screen. One page, phone-first, readable in ninety seconds.
 *
 * Capped at five items on purpose. A list of twenty things Paul could do is a
 * list he closes; five things only he can do is a list he works. Everything
 * else on this page is one line per project and nothing more — no counts, no
 * charts, no sidebar clutter.
 */
export function Paul() {
  const { data: commitments = [] } = useCommitments()
  const { data: projects = [] } = useProjects()
  const complete = useCompleteCommitment()
  const save = useSaveCommitment()
  const [handedOff, setHandedOff] = useState<Set<string>>(new Set())

  const his = useMemo(() => {
    const today = todayISO()
    const soon = new Date()
    soon.setDate(soon.getDate() + 7)
    const cutoff = soon.toISOString().slice(0, 10)

    return commitments
      .filter(
        (c) =>
          c.owner_type === 'paul' &&
          c.status !== 'done' &&
          c.status !== 'dropped' &&
          (c.due_date === null || c.due_date <= cutoff)
      )
      .sort((a, b) => {
        // No due date sorts last; otherwise soonest first.
        if (a.due_date === null) return 1
        if (b.due_date === null) return -1
        return a.due_date.localeCompare(b.due_date)
      })
      .slice(0, 5)
      .map((c) => ({ commitment: c, overdue: c.due_date !== null && c.due_date < today }))
  }, [commitments])

  const active = projects.filter((p) => p.status === 'active')

  /** "Talk to Reed about this" — hands it back rather than leaving it stuck. */
  function handOff(c: CommitmentRow) {
    save.mutate({
      id: c.id,
      project_id: c.project_id,
      title: `Talk to Paul about: ${c.title}`,
      owner_type: 'me',
      requested_by: 'paul',
      status: 'open',
    })
    setHandedOff((prev) => new Set(prev).add(c.id))
  }

  return (
    <Page title="This week">
      <section className="mb-8">
        <h2 className="mb-2 px-1 t-section">Only you can do these</h2>
        {his.length === 0 ? (
          <Card className="px-4 py-6 text-center">
            <p className="text-sm text-text-2">Nothing needs you this week.</p>
          </Card>
        ) : (
          <div className="grid gap-2">
            {his.map(({ commitment, overdue }) => (
              <Card key={commitment.id} className="p-4">
                <p className="t-item text-pretty">{commitment.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="t-meta">
                    {projects.find((p) => p.id === commitment.project_id)?.name}
                  </span>
                  {commitment.due_date ? (
                    <Badge tone={overdue ? 'red' : 'neutral'}>
                      {relativeDays(commitment.due_date)}
                    </Badge>
                  ) : null}
                </div>
                {commitment.detail ? (
                  <p className="mt-2 text-[13px] leading-relaxed text-text-2">
                    {commitment.detail}
                  </p>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => { complete(commitment) }}
                  >
                    Done
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={handedOff.has(commitment.id)}
                    onClick={() => { handOff(commitment) }}
                  >
                    {handedOff.has(commitment.id) ? 'Sent to Reed' : 'Talk to Reed about this'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 px-1 t-section">Where things stand</h2>
        <Card className="p-1">
          {active.map((project) => (
            <Row key={project.id} className="items-start">
              <span className="mt-1.5">
                <HealthDot health={project.health} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="t-item">{project.name}</p>
                <p className="t-meta text-pretty">
                  {project.health_note ??
                    { green: 'On track.', amber: 'Needs attention.', red: 'At risk.' }[
                      project.health
                    ]}
                </p>
              </div>
            </Row>
          ))}
        </Card>
      </section>
    </Page>
  )
}
