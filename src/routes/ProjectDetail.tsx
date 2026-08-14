import { ArrowLeft, CalendarDays, Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { CommitmentSheet } from '@/components/commitments/CommitmentSheet'
import { DocumentsSection } from '@/components/projects/DocumentsSection'
import { EventSheet } from '@/components/projects/EventSheet'
import { ProjectSheet } from '@/components/projects/ProjectSheet'
import { Section } from '@/components/Page'
import { CommitmentItem } from '@/components/today/CommitmentItem'
import { Badge, HealthDot } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, Row } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { useAuth } from '@/contexts/auth-context'
import { useCommitments, useCompleteCommitment } from '@/hooks/useCommitments'
import { useDeleteNote, useProjectNotes, useSaveNote } from '@/hooks/useNotes'
import { useFutureEvents, useProjects } from '@/hooks/useProjects'
import { formatEventTime, todayISO } from '@/lib/dates'
import type { CommitmentRow, EventRow, NoteRow } from '@/types/models'

/**
 * Everything about one project on one screen.
 *
 * Ordered by what actually happens: you write down what just happened, you see
 * what's outstanding, then the dates. Notes sit at the top because documenting
 * and following up is the main job this screen does.
 */
export function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { data: projects = [], isLoading } = useProjects()
  const project = projects.find((p) => p.slug === slug)

  const { data: allCommitments = [] } = useCommitments()
  const { data: events = [] } = useFutureEvents()
  const { data: notes = [] } = useProjectNotes(project?.id)
  const complete = useCompleteCommitment()

  const [projectSheet, setProjectSheet] = useState(false)
  const [commitmentSheet, setCommitmentSheet] = useState(false)
  const [editingCommitment, setEditingCommitment] = useState<CommitmentRow | undefined>(undefined)
  const [seedTitle, setSeedTitle] = useState<string | undefined>(undefined)
  const [seedDetail, setSeedDetail] = useState<string | undefined>(undefined)
  const [eventSheet, setEventSheet] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventRow | undefined>(undefined)

  const commitments = useMemo(
    () => allCommitments.filter((c) => c.project_id === project?.id),
    [allCommitments, project?.id]
  )
  const open = commitments.filter((c) => c.status !== 'done' && c.status !== 'dropped')
  const today = todayISO()
  const overdue = open.filter((c) => c.due_date !== null && c.due_date < today)
  const projectEvents = events.filter((e) => e.project_id === project?.id)

  if (isLoading) return <p className="px-1 t-meta">Loading…</p>

  if (!project) {
    return (
      <div>
        <BackLink />
        <h1 className="t-page">Project not found</h1>
        <p className="mt-2 t-body">
          It may have been archived, or the link is stale.
        </p>
      </div>
    )
  }

  return (
    <div>
      <BackLink />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <HealthDot health={project.health} />
            <h1 className="t-page">{project.name}</h1>
            {project.sensitivity === 'restricted' ? (
              <Badge tone="red">
                <Lock className="size-3" aria-hidden />
                Restricted
              </Badge>
            ) : project.sensitivity === 'sensitive' ? (
              <Badge>Sensitive</Badge>
            ) : null}
          </div>
          {project.purpose ? <p className="mt-1.5 t-body">{project.purpose}</p> : null}
          {project.health_note ? (
            <p className="mt-1 text-[13px] text-text-2">{project.health_note}</p>
          ) : null}
        </div>

        <Button variant="ghost" size="sm" onClick={() => { setProjectSheet(true) }}>
          <Pencil />
          Edit
        </Button>
      </div>

      {/* Notes first — this is the thing you came here to do. */}
      <NoteComposer projectId={project.id} />

      <Section title="Notes" count={notes.length}>
        {notes.length === 0 ? (
          <p className="px-3 t-meta">
            Nothing documented yet. Anything you write here is the record of what happened.
          </p>
        ) : (
          <div className="grid gap-2">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                projectId={project.id}
                onFollowUp={() => {
                  setEditingCommitment(undefined)
                  setSeedTitle(followUpTitle(note))
                  // The note itself is the context for the follow-up.
                  setSeedDetail(note.body)
                  setCommitmentSheet(true)
                }}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Open" count={open.length}>
        {open.length === 0 ? (
          <p className="px-3 t-meta">Nothing outstanding.</p>
        ) : (
          <Card className="p-1">
            {[...overdue, ...open.filter((c) => !overdue.includes(c))].map((c) => (
              <CommitmentItem
                key={c.id}
                commitment={c}
                focused={false}
                variant={overdue.includes(c) ? 'overdue' : 'default'}
                onComplete={() => { complete(c) }}
                onEdit={() => {
                  setEditingCommitment(c)
                  setSeedTitle(undefined)
                  setSeedDetail(undefined)
                  setCommitmentSheet(true)
                }}
              />
            ))}
          </Card>
        )}
        <div className="mt-2 px-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingCommitment(undefined)
              setSeedTitle(undefined)
              setSeedDetail(undefined)
              setCommitmentSheet(true)
            }}
          >
            <Plus />
            Add something to do
          </Button>
        </div>
      </Section>

      <Section title="Dates" count={projectEvents.length}>
        {projectEvents.length === 0 ? (
          <p className="px-3 t-meta">Nothing scheduled.</p>
        ) : (
          <Card className="p-1">
            {projectEvents.map((event) => (
              <Row
                key={event.id}
                className="cursor-pointer items-center"
                onClick={() => {
                  setEditingEvent(event)
                  setEventSheet(true)
                }}
              >
                <CalendarDays className="size-4 shrink-0 text-text-3" aria-hidden />
                <span className="min-w-0 flex-1 line-clamp-2 t-item">{event.title}</span>
                <span className="shrink-0 t-meta">
                  {formatEventTime(event.starts_at, event.timezone)}
                </span>
              </Row>
            ))}
          </Card>
        )}
        <div className="mt-2 px-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingEvent(undefined)
              setEventSheet(true)
            }}
          >
            <Plus />
            Add a date
          </Button>
        </div>
      </Section>

      <Section title="Documents">
        <DocumentsSection projectId={project.id} />
      </Section>

      <ProjectSheet open={projectSheet} onOpenChange={setProjectSheet} project={project} />
      <CommitmentSheet
        open={commitmentSheet}
        onOpenChange={setCommitmentSheet}
        commitment={editingCommitment}
        initialTitle={seedTitle}
        initialDetail={seedDetail}
      />
      <EventSheet
        open={eventSheet}
        onOpenChange={setEventSheet}
        projectId={project.id}
        event={editingEvent}
      />
    </div>
  )
}

/**
 * A short, editable starting title.
 *
 * Taking the note's "first line" was wrong: a note written as a paragraph has
 * exactly one line, so the title became the whole note. Prefer an explicit
 * title, then the first sentence, then a word-boundary trim — and put the full
 * note in the detail field where the context is actually useful.
 */
const MAX_TITLE = 70

function followUpTitle(note: NoteRow) {
  if (note.title?.trim()) return note.title.trim()

  const firstLine = note.body.split('\n')[0]?.trim() ?? ''
  const sentence = /^(.+?[.!?])(\s|$)/.exec(firstLine)?.[1]?.trim() ?? firstLine
  if (sentence.length <= MAX_TITLE) return sentence

  const clipped = sentence.slice(0, MAX_TITLE)
  const lastSpace = clipped.lastIndexOf(' ')
  return `${(lastSpace > 40 ? clipped.slice(0, lastSpace) : clipped).trim()}…`
}

function BackLink() {
  return (
    <Link
      to="/projects"
      className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-text-3 transition-colors duration-150 hover:text-text"
    >
      <ArrowLeft className="size-3.5" aria-hidden />
      Projects
    </Link>
  )
}

function NoteComposer({ projectId }: { projectId: string }) {
  const { session } = useAuth()
  const save = useSaveNote(projectId)
  const [body, setBody] = useState('')
  const [title, setTitle] = useState('')

  const canSave = body.trim() !== ''

  return (
    <Card className="mb-7 p-3">
      <Input
        value={title}
        onChange={(e) => { setTitle(e.target.value) }}
        placeholder="Title (optional)"
        aria-label="Note title"
        className="mb-2 border-transparent bg-transparent px-1 font-medium hover:border-transparent"
      />
      <Textarea
        value={body}
        onChange={(e) => { setBody(e.target.value) }}
        placeholder="What happened? What did they say? What do you owe anyone?"
        aria-label="Note"
        className="min-h-20 border-transparent bg-transparent px-1 hover:border-transparent"
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="t-meta">
          {/* Sensitivity is inherited from the project, so there's no field for it. */}
          Inherits this project&rsquo;s privacy.
        </p>
        <Button
          variant="primary"
          size="sm"
          disabled={!canSave || save.isPending}
          onClick={() => {
            save.mutate(
              {
                project_id: projectId,
                title: title.trim() || null,
                body: body.trim(),
                author_id: session?.user.id ?? null,
              },
              {
                onSuccess: () => {
                  setBody('')
                  setTitle('')
                },
              }
            )
          }}
        >
          {save.isPending ? 'Saving…' : 'Save note'}
        </Button>
      </div>
    </Card>
  )
}

function NoteCard({
  note,
  projectId,
  onFollowUp,
}: {
  note: NoteRow
  projectId: string
  onFollowUp: () => void
}) {
  const remove = useDeleteNote(projectId)
  const when = new Date(note.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <Card className="p-3.5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        {note.title ? <p className="t-item">{note.title}</p> : <span />}
        <span className="t-meta shrink-0">{when}</span>
      </div>
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-text-2">{note.body}</p>
      <div className="mt-2.5 flex items-center gap-1 border-t border-border pt-2.5">
        {/* The whole point: a note becomes the thing you owe someone. */}
        <Button variant="ghost" size="sm" onClick={onFollowUp}>
          <Plus />
          Follow up on this
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-text-3"
          onClick={() => { remove.mutate(note.id) }}
          aria-label="Delete note"
        >
          <Trash2 />
        </Button>
      </div>
    </Card>
  )
}
