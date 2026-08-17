import { CalendarDays, Inbox, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { CommitmentSheet } from '@/components/commitments/CommitmentSheet'
import { ReportBackSheet } from '@/components/commitments/ReportBackSheet'
import { EmptyState } from '@/components/EmptyState'
import { Page, Section } from '@/components/Page'
import { CommitmentItem } from '@/components/today/CommitmentItem'
import { Button } from '@/components/ui/Button'
import { Card, Row } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/auth-context'
import {
  partition,
  useCommitments,
  useCompleteCommitment,
  useLogNudge,
} from '@/hooks/useCommitments'
import { useCapture, useDismissInboxItem, useInbox } from '@/hooks/useInbox'
import { useProjects, useUpcomingEvents } from '@/hooks/useProjects'
import { formatEventTime } from '@/lib/dates'
import type { CommitmentRow } from '@/types/models'

/**
 * Today — the cadence of trust, top to bottom.
 *
 *   Report back   someone is waiting to hear from you  <- first, on purpose
 *
 * Deliberately absent: anything already reported and waiting on the other
 * person to confirm. Once you have told them it is their move, and a list you
 * cannot act on is someone else's to-do list on your screen. That state lives
 * where it can be acted on — Paul's view — and is counted on the Scorecard.
 *   Capture       receive the commandment (fastest thing in the app)
 *   Overdue       what you should already have done
 *   Due today     what you're doing now
 *   Chase these   someone owes you
 *
 * Empty sections collapse to a single line rather than a card, so a quiet day
 * doesn't cost six screens of scrolling to discover there's nothing to do.
 */
export function Today() {
  const { session } = useAuth()
  const { data: commitments = [], isLoading } = useCommitments()
  const { data: projects = [] } = useProjects()
  const { data: inbox = [] } = useInbox()
  const { data: events = [] } = useUpcomingEvents()

  const capture = useCapture(session?.user.id)
  const complete = useCompleteCommitment()
  const nudge = useLogNudge()
  const dismiss = useDismissInboxItem()

  const [draft, setDraft] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<CommitmentRow | undefined>(undefined)
  const [seedTitle, setSeedTitle] = useState<string | undefined>(undefined)
  const [reporting, setReporting] = useState<CommitmentRow | undefined>(undefined)
  // Where the tap happened, so the confetti comes out of the button.
  const [burstFrom, setBurstFrom] = useState<{ x: number; y: number } | undefined>(undefined)
  const captureRef = useRef<HTMLInputElement>(null)

  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  )
  const lists = useMemo(() => partition(commitments), [commitments])

  // One flat ordered list so j/k moves through the screen the way it reads.
  const focusable = useMemo(
    () => [...lists.reportBack, ...lists.overdue, ...lists.dueToday, ...lists.chase],
    [lists]
  )
  const [focusIndex, setFocusIndex] = useState(-1)

  const openNew = useCallback((title?: string) => {
    setEditing(undefined)
    setSeedTitle(title)
    setSheetOpen(true)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true

      if (event.key === 'Escape') {
        ;(document.activeElement as HTMLElement | null)?.blur()
        setFocusIndex(-1)
        return
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key === 'c') {
        event.preventDefault()
        captureRef.current?.focus()
        return
      }
      if (event.key === 'j' || event.key === 'k') {
        event.preventDefault()
        setFocusIndex((current) => {
          const next = event.key === 'j' ? current + 1 : current - 1
          return Math.max(0, Math.min(next, focusable.length - 1))
        })
        return
      }
      if (event.key === 'x') {
        const target_ = focusable[focusIndex]
        if (target_ && target_.status !== 'done') {
          event.preventDefault()
          complete(target_)
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [focusable, focusIndex, complete])

  function onCapture(event: React.SyntheticEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    // Clear first. The field is empty before the request is even sent.
    setDraft('')
    capture.mutate(text)
  }

  let focusCursor = -1
  const nextFocusIndex = () => {
    focusCursor += 1
    return focusCursor
  }

  return (
    <Page
      title="Today"
      action={
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            openNew()
          }}
        >
          <Plus />
          New
        </Button>
      }
    >
      <form onSubmit={onCapture} className="mb-8">
        <Input
          ref={captureRef}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
          }}
          placeholder="Capture anything…"
          aria-label="Quick capture"
          className="h-11"
          data-capture-field
        />
        {/* Keyboard shortcuts are meaningless on a phone — there is no
            keyboard until you tap a field, and none of these apply then. */}
        <p className="mt-1.5 hidden px-1 t-meta sm:block">
          Press <Key>c</Key> from anywhere · <Key>j</Key>/<Key>k</Key> to move ·{' '}
          <Key>x</Key> to complete
        </p>
      </form>

      {isLoading ? (
        <p className="t-meta px-3">Loading…</p>
      ) : (
        <>
          {/* First on the screen, deliberately. An overdue commitment is at
              least visible to the person waiting; work you finished and never
              mentioned is invisible to them — they still think you haven't
              done it. That is the quieter way trust erodes, so it goes above
              everything else. */}
          {lists.reportBack.length > 0 ? (
            <section className="mb-7">
              <div className="mb-2 flex items-baseline gap-2 px-3">
                <h2 className="t-section text-accent">Report back</h2>
                <span className="t-meta tabular-nums">{lists.reportBack.length}</span>
              </div>
              <Card className="border-accent/30 bg-accent-muted p-1">
                {lists.reportBack.map((commitment) => (
                  <CommitmentItem
                    key={commitment.id}
                    commitment={commitment}
                    project={projectsById.get(commitment.project_id)}
                    focused={focusIndex === nextFocusIndex()}
                    variant="report"
                    onReportBack={(origin) => {
                      setBurstFrom(origin)
                      setReporting(commitment)
                    }}
                    onEdit={() => {
                      setEditing(commitment)
                      setSheetOpen(true)
                    }}
                  />
                ))}
              </Card>
              <p className="mt-1.5 px-3 t-meta">
                Finished, but the person who asked hasn&rsquo;t been told.
              </p>
            </section>
          ) : null}

          <List
            title="Overdue"
            items={lists.overdue}
            emptyLine="Nothing overdue."
            render={(commitment) => (
              <CommitmentItem
                key={commitment.id}
                commitment={commitment}
                project={projectsById.get(commitment.project_id)}
                focused={focusIndex === nextFocusIndex()}
                variant="overdue"
                onReportBack={(origin) => {
                  setBurstFrom(origin)
                  setReporting(commitment)
                }}
                onComplete={() => {
                  complete(commitment)
                }}
                onEdit={() => {
                  setEditing(commitment)
                  setSheetOpen(true)
                }}
              />
            )}
          />

          <List
            title="Due today"
            items={lists.dueToday}
            emptyLine="Nothing due today."
            render={(commitment) => (
              <CommitmentItem
                key={commitment.id}
                commitment={commitment}
                project={projectsById.get(commitment.project_id)}
                focused={focusIndex === nextFocusIndex()}
                onReportBack={(origin) => {
                  setBurstFrom(origin)
                  setReporting(commitment)
                }}
                onComplete={() => {
                  complete(commitment)
                }}
                onEdit={() => {
                  setEditing(commitment)
                  setSheetOpen(true)
                }}
              />
            )}
          />

          <List
            title="Chase these"
            items={lists.chase}
            emptyLine="Nobody owes you anything right now."
            render={(commitment) => (
              <CommitmentItem
                key={commitment.id}
                commitment={commitment}
                project={projectsById.get(commitment.project_id)}
                focused={focusIndex === nextFocusIndex()}
                variant="chase"
                onComplete={() => {
                  complete(commitment)
                }}
                onNudge={() => {
                  nudge.mutate({ id: commitment.id })
                }}
                onEdit={() => {
                  setEditing(commitment)
                  setSheetOpen(true)
                }}
              />
            )}
          />

          <Section title="Next 7 days">
            {events.length === 0 ? (
              <p className="px-3 t-meta">Nothing scheduled.</p>
            ) : (
              <Card className="p-1">
                {events.map((event) => (
                  <Row key={event.id} className="items-center">
                    <CalendarDays className="size-4 shrink-0 text-text-3" aria-hidden />
                    <span className="min-w-0 flex-1 line-clamp-2 t-item">{event.title}</span>
                    <span className="shrink-0 t-meta">
                      {formatEventTime(event.starts_at, event.timezone)}
                    </span>
                  </Row>
                ))}
              </Card>
            )}
          </Section>

          <Section title="Inbox" count={inbox.length}>
            {inbox.length === 0 ? (
              <EmptyState
                icon={Inbox}
                line="Anything you capture lands here until you turn it into a commitment or throw it away."
              />
            ) : (
              <Card className="p-1">
                {/* Stacked on a phone. Side by side, the buttons took most of
                    the row and squeezed the captured text into one word per
                    line — unreadable, and the text is the thing you're triaging. */}
                {inbox.map((item) => (
                  <Row key={item.id} className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                    <span className="min-w-0 flex-1 text-pretty t-item">{item.raw_text}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          openNew(item.raw_text)
                          dismiss.mutate(item.id)
                        }}
                      >
                        Make it a commitment
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          dismiss.mutate(item.id)
                        }}
                      >
                        Drop
                      </Button>
                    </div>
                  </Row>
                ))}
              </Card>
            )}
          </Section>
        </>
      )}

      <ReportBackSheet
        open={reporting !== undefined}
        onOpenChange={(o) => {
          if (!o) setReporting(undefined)
        }}
        commitment={reporting}
        project={reporting ? projectsById.get(reporting.project_id) : undefined}
        burstFrom={burstFrom}
      />
      <CommitmentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        commitment={editing}
        initialTitle={seedTitle}
        onSaved={() => {
          setSeedTitle(undefined)
        }}
      />
    </Page>
  )
}

/** An empty section collapses to one line. A quiet day should read as quiet. */
function List({
  title,
  items,
  emptyLine,
  render,
}: {
  title: string
  items: CommitmentRow[]
  emptyLine: string
  render: (commitment: CommitmentRow) => React.ReactNode
}) {
  return (
    <Section title={title} count={items.length}>
      {items.length === 0 ? (
        <p className="px-3 t-meta">{emptyLine}</p>
      ) : (
        <Card className="p-1">{items.map(render)}</Card>
      )}
    </Section>
  )
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border px-1 font-sans text-[10px] text-text-3">
      {children}
    </kbd>
  )
}
