import { FileAudio, Plus, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/EmptyState'
import { MeetingSheet } from '@/components/meetings/MeetingSheet'
import { Page, Section } from '@/components/Page'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, Row } from '@/components/ui/Card'
import { useMeetings } from '@/hooks/useMeetings'
import type { Meeting } from '@/hooks/useMeetings'
import { useProjects } from '@/hooks/useProjects'

/**
 * Meetings you recorded, and what came out of them.
 *
 * Unfiled ones come first: a meeting with no project is the one thing here that
 * needs a decision, and everything else is already where it belongs.
 */
export function Meetings() {
  const { data: meetings = [], isLoading } = useMeetings()
  const { data: projects = [] } = useProjects()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Meeting | undefined>(undefined)

  const projectName = (id: string | null) =>
    id ? (projects.find((p) => p.id === id)?.name ?? 'Unknown project') : null

  const { unfiled, filed } = useMemo(
    () => ({
      unfiled: meetings.filter((m) => m.project_id === null),
      filed: meetings.filter((m) => m.project_id !== null),
    }),
    [meetings]
  )

  function open(meeting?: Meeting) {
    setEditing(meeting)
    setSheetOpen(true)
  }

  return (
    <Page
      title="Meetings"
      action={
        <Button variant="primary" size="sm" onClick={() => { open() }}>
          <Plus />
          Add notes
        </Button>
      }
    >
      {isLoading ? (
        <p className="px-1 t-meta">Loading…</p>
      ) : meetings.length === 0 ? (
        <EmptyState
          icon={FileAudio}
          line="Paste what your recorder wrote — the summary and action items. It gets filed against a project, the action items become commitments you can accept one at a time, and the notes stay with the project."
          action={
            <Button variant="primary" size="sm" onClick={() => { open() }}>
              <Plus />
              Add the first one
            </Button>
          }
        />
      ) : (
        <>
          {unfiled.length > 0 ? (
            <Section title="Not filed yet" count={unfiled.length}>
              <Card className="border-accent/30 bg-accent-muted p-1">
                {unfiled.map((m) => (
                  <MeetingRow key={m.id} meeting={m} project={null} onOpen={() => { open(m) }} />
                ))}
              </Card>
            </Section>
          ) : null}

          <Section title="All meetings" count={filed.length}>
            {filed.length === 0 ? (
              <p className="px-3 t-meta">Nothing filed yet.</p>
            ) : (
              <Card className="p-1">
                {filed.map((m) => (
                  <MeetingRow
                    key={m.id}
                    meeting={m}
                    project={projectName(m.project_id)}
                    onOpen={() => { open(m) }}
                  />
                ))}
              </Card>
            )}
          </Section>
        </>
      )}

      <MeetingSheet open={sheetOpen} onOpenChange={setSheetOpen} meeting={editing} />
    </Page>
  )
}

function MeetingRow({
  meeting,
  project,
  onOpen,
}: {
  meeting: Meeting
  project: string | null
  onOpen: () => void
}) {
  return (
    <Row className="cursor-pointer items-center" onClick={onOpen}>
      <FileAudio className="size-4 shrink-0 text-text-3" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="t-item line-clamp-2 text-pretty">{meeting.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="t-meta">
            {new Date(meeting.met_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
          {project ? <span className="truncate t-meta">{project}</span> : null}
          {meeting.auto_routed ? <Badge>Auto-filed</Badge> : null}
          {meeting.extracted_at ? null : <Badge tone="accent">Not extracted</Badge>}
        </div>
      </div>
    </Row>
  )
}

export { Sparkles, Link }
