import { CalendarDays, FolderKanban, Lock } from 'lucide-react'
import { useMemo } from 'react'

import { EmptyState } from '@/components/EmptyState'
import { Page } from '@/components/Page'
import { Badge, HealthDot } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { useCommitments } from '@/hooks/useCommitments'
import { useFutureEvents, useProjects, useUpdateProjectHealth } from '@/hooks/useProjects'
import { formatEventTime, todayISO } from '@/lib/dates'
import type { EventRow, Health, ProjectRow } from '@/types/models'

const HEALTH_OPTIONS = [
  { value: 'green', label: 'Green — on track' },
  { value: 'amber', label: 'Amber — needs attention' },
  { value: 'red', label: 'Red — at risk' },
]

/**
 * The portfolio at a glance. One card per project: how it's doing, what's next,
 * and how much is outstanding.
 *
 * Health is editable inline because a status you have to open a form to change
 * is a status that goes stale.
 */
export function Projects() {
  const { data: projects = [], isLoading } = useProjects()
  const { data: commitments = [] } = useCommitments()
  const { data: events = [] } = useFutureEvents()
  const updateHealth = useUpdateProjectHealth()

  const byProject = useMemo(() => {
    const today = todayISO()
    const map = new Map<string, { open: number; overdue: number; next?: EventRow }>()

    for (const project of projects) map.set(project.id, { open: 0, overdue: 0 })

    for (const c of commitments) {
      if (c.status === 'done' || c.status === 'dropped') continue
      const entry = map.get(c.project_id)
      if (!entry) continue
      entry.open += 1
      if (c.due_date !== null && c.due_date < today) entry.overdue += 1
    }

    // Events arrive sorted, so the first hit per project is the next one.
    for (const event of events) {
      const entry = map.get(event.project_id)
      if (entry && !entry.next) entry.next = event
    }

    return map
  }, [projects, commitments, events])

  if (isLoading) {
    return (
      <Page title="Projects">
        <p className="px-1 t-meta">Loading…</p>
      </Page>
    )
  }

  if (projects.length === 0) {
    return (
      <Page title="Projects">
        <EmptyState
          icon={FolderKanban}
          line="No projects yet. The five seeded ones should be here — if this stays empty you're signed in without a profile row, so the database is returning nothing."
        />
      </Page>
    )
  }

  return (
    <Page title="Projects">
      <div className="grid gap-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            stats={byProject.get(project.id) ?? { open: 0, overdue: 0 }}
            onHealthChange={(health) => {
              updateHealth.mutate({ id: project.id, health })
            }}
          />
        ))}
      </div>
    </Page>
  )
}

function ProjectCard({
  project,
  stats,
  onHealthChange,
}: {
  project: ProjectRow
  stats: { open: number; overdue: number; next?: EventRow }
  onHealthChange: (health: Health) => void
}) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <HealthDot health={project.health} />
            <h2 className="t-item">{project.name}</h2>
            {/* Restricted projects are Reed and Paul only. Saying so on the card
                means you never have to guess before pasting something in. */}
            {project.sensitivity === 'restricted' ? (
              <Badge tone="red">
                <Lock className="size-3" aria-hidden />
                Restricted
              </Badge>
            ) : project.sensitivity === 'sensitive' ? (
              <Badge>Sensitive</Badge>
            ) : null}
          </div>
          {project.purpose ? (
            <p className="mt-1 max-w-[var(--measure)] text-pretty text-[13px] leading-relaxed text-text-2">
              {project.purpose}
            </p>
          ) : null}
        </div>

        <div className="w-44 shrink-0">
          <Select
            aria-label={`Health for ${project.name}`}
            value={project.health}
            onValueChange={(value) => {
              onHealthChange(value as Health)
            }}
            options={HEALTH_OPTIONS}
          />
        </div>
      </div>

      {project.health_note ? (
        <p className="mt-3 text-[13px] leading-relaxed text-text-2">{project.health_note}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3">
        {stats.overdue > 0 ? (
          <Badge tone="red">
            {stats.overdue} overdue
          </Badge>
        ) : null}
        <span className="t-meta">
          {stats.open} open {stats.open === 1 ? 'commitment' : 'commitments'}
        </span>
        {stats.next ? (
          <span className="inline-flex items-center gap-1.5 t-meta">
            <CalendarDays className="size-3.5" aria-hidden />
            {stats.next.title} · {formatEventTime(stats.next.starts_at, stats.next.timezone)}
          </span>
        ) : (
          <span className="t-meta">No events scheduled</span>
        )}
      </div>
    </Card>
  )
}
