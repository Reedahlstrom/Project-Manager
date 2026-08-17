import { useMemo, useState } from 'react'

import { Page } from '@/components/Page'
import { HealthDot } from '@/components/ui/Badge'
import { ReportBackSheet } from '@/components/commitments/ReportBackSheet'
import { Button } from '@/components/ui/Button'
import { Card, Row } from '@/components/ui/Card'
import { useCommitments } from '@/hooks/useCommitments'
import { useProjects } from '@/hooks/useProjects'
import { todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { CommitmentRow } from '@/types/models'

/**
 * Computed, never self-reported.
 *
 * Every number here is derived from what actually happened. There is no field
 * anywhere in this app where you grade yourself, because a scorecard you can
 * type into is a scorecard that flatters you.
 */
export function Scorecard() {
  const { data: commitments = [] } = useCommitments()
  const { data: projects = [] } = useProjects()
  const [reporting, setReporting] = useState<CommitmentRow | undefined>(undefined)

  const stats = useMemo(() => {
    const today = todayISO()
    const quarterStart = startOfQuarter()

    const mine = commitments.filter((c) => c.owner_type === 'me')
    const closedThisQuarter = mine.filter(
      (c) => c.status === 'done' && c.completed_at !== null && c.completed_at >= quarterStart
    )
    const onTime = closedThisQuarter.filter(
      (c) => c.due_date === null || (c.completed_at ?? '').slice(0, 10) <= c.due_date
    )

    const paulOverdue = commitments.filter(
      (c) =>
        c.owner_type === 'paul' &&
        c.status !== 'done' &&
        c.status !== 'dropped' &&
        c.due_date !== null &&
        c.due_date < today
    ).length

    // The anti-dropped-ball metric: waiting on someone, past the chase date,
    // and never chased. Target is zero and it is the number that matters most.
    const unchased = commitments.filter(
      (c) =>
        c.status === 'waiting' &&
        c.follow_up_date !== null &&
        c.follow_up_date < today &&
        c.last_nudged_at === null
    ).length

    // Loops left open: finished, someone asked, still not told.
    const unreported = commitments.filter(
      (c) => c.status === 'done' && c.requested_by !== null && c.reported_back_at === null
    ).length

    return {
      onTimeRate: closedThisQuarter.length
        ? Math.round((onTime.length / closedThisQuarter.length) * 100)
        : null,
      closedCount: closedThisQuarter.length,
      paulOverdue,
      unchased,
      unreported,
    }
  }, [commitments])

  const perProject = useMemo(() => {
    const quarterStart = startOfQuarter()
    return projects
      .filter((p) => p.status === 'active')
      .map((p) => ({
        project: p,
        closed: commitments.filter(
          (c) =>
            c.project_id === p.id &&
            c.status === 'done' &&
            c.completed_at !== null &&
            c.completed_at >= quarterStart
        ).length,
        open: commitments.filter(
          (c) => c.project_id === p.id && c.status !== 'done' && c.status !== 'dropped'
        ).length,
      }))
  }, [projects, commitments])

  // A count you cannot act on is trivia. These are the actual rows.
  const openLoops = useMemo(
    () =>
      commitments
        .filter((c) => c.status === 'done' && c.requested_by !== null && c.reported_back_at === null)
        .sort((a, b) => (a.completed_at ?? '').localeCompare(b.completed_at ?? '')),
    [commitments]
  )

  return (
    <Page title="Scorecard">
      <div className="mb-7 grid gap-3 sm:grid-cols-2">
        <Stat
          label="On-time rate"
          value={stats.onTimeRate === null ? '—' : `${String(stats.onTimeRate)}%`}
          target="Target 95%"
          good={stats.onTimeRate === null || stats.onTimeRate >= 95}
          note={
            stats.closedCount === 0
              ? 'Nothing closed this quarter yet.'
              : `${String(stats.closedCount)} closed this quarter`
          }
        />
        <Stat
          label="Left waiting, never chased"
          value={String(stats.unchased)}
          target="Target 0"
          good={stats.unchased === 0}
          note="Past the chase date with no nudge logged."
        />
        <Stat
          label="Loops still open"
          value={String(stats.unreported)}
          target="Target 0"
          good={stats.unreported === 0}
          note="Done, but the person who asked hasn't been told."
        />
        <Stat
          label="Paul overdue"
          value={String(stats.paulOverdue)}
          target="Target 0"
          good={stats.paulOverdue === 0}
          note="His commitments past their due date."
        />
      </div>

      {openLoops.length > 0 ? (
        <section className="mb-7">
          <div className="mb-2 flex items-baseline gap-2 px-1">
            <h2 className="t-section text-accent">Waiting on a report from you</h2>
            <span className="t-meta tabular-nums">{openLoops.length}</span>
          </div>
          <Card className="border-accent/30 bg-accent-muted p-1">
            {openLoops.map((c) => (
              <Row key={c.id} className="items-center">
                <div className="min-w-0 flex-1">
                  <p className="t-item line-clamp-2 text-pretty">{c.title}</p>
                  <p className="t-meta">
                    {projects.find((p) => p.id === c.project_id)?.name}
                    {c.completed_at
                      ? ` · finished ${new Date(c.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                      : ''}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => { setReporting(c) }}>
                  Report back
                </Button>
              </Row>
            ))}
          </Card>
        </section>
      ) : null}

      <h2 className="mb-2 px-1 t-section">By project, this quarter</h2>
      <Card className="p-1">
        {perProject.map(({ project, closed, open }) => (
          <Row key={project.id} className="items-center">
            <HealthDot health={project.health} />
            <span className="min-w-0 flex-1 truncate t-item">{project.name}</span>
            <span className="t-meta tabular-nums">{closed} closed</span>
            <span className="t-meta tabular-nums">{open} open</span>
          </Row>
        ))}
      </Card>

      <p className="mt-4 px-1 t-meta">
        These only mean something after a few weeks of real use.
      </p>

      <ReportBackSheet
        open={reporting !== undefined}
        onOpenChange={(o) => {
          if (!o) setReporting(undefined)
        }}
        commitment={reporting}
        project={projects.find((p) => p.id === reporting?.project_id)}
      />
    </Page>
  )
}

function startOfQuarter() {
  const now = new Date()
  return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString()
}

function Stat({
  label,
  value,
  target,
  note,
  good,
}: {
  label: string
  value: string
  target: string
  note: string
  good: boolean
}) {
  return (
    <Card className="p-4">
      <p className="t-section">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span
          className={cn(
            'text-3xl font-semibold tabular-nums tracking-tight',
            good ? 'text-text' : 'text-red'
          )}
        >
          {value}
        </span>
        <span className="t-meta">{target}</span>
      </div>
      <p className="mt-1 t-meta text-pretty">{note}</p>
    </Card>
  )
}
