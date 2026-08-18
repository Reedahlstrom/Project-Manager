import { Check, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Dialog'
import { DateInput, Input, Textarea } from '@/components/ui/Input'
import { Label, Select } from '@/components/ui/Select'
import { useAuth } from '@/contexts/auth-context'
import { useSaveCommitment } from '@/hooks/useCommitments'
import {
  useDeleteMeeting,
  useExtractMeeting,
  useSaveMeeting,
  type Meeting,
  type Proposal,
} from '@/hooks/useMeetings'
import { useProjects } from '@/hooks/useProjects'
import { cn } from '@/lib/utils'

const OWNERS = [
  { value: 'me', label: 'Me' },
  { value: 'paul', label: 'Paul' },
  { value: 'heather', label: 'Heather' },
  { value: 'external', label: 'Someone else' },
]

/**
 * Paste in what the recorder wrote, file it, and turn the action items into
 * commitments.
 *
 * Proposals are accepted one at a time and there is no "accept all". A model
 * reading a meeting is good at spotting what was said; it is not the thing that
 * decides what Reed owes people.
 */
export function MeetingSheet({
  open,
  onOpenChange,
  meeting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  meeting?: Meeting | undefined
}) {
  const { profile } = useAuth()
  const { data: projects = [] } = useProjects()
  const save = useSaveMeeting()
  const remove = useDeleteMeeting()
  const extract = useExtractMeeting()
  const saveCommitment = useSaveCommitment()

  const [title, setTitle] = useState('')
  const [metAt, setMetAt] = useState('')
  const [projectId, setProjectId] = useState<string | undefined>(undefined)
  const [summary, setSummary] = useState('')
  const [transcript, setTranscript] = useState('')
  const [meetingId, setMeetingId] = useState<string | undefined>(undefined)

  const [proposals, setProposals] = useState<Proposal[]>([])
  const [accepted, setAccepted] = useState<Set<number>>(new Set())
  const [refusal, setRefusal] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(meeting?.title ?? '')
    setMetAt((meeting?.met_at ?? new Date().toISOString()).slice(0, 10))
    setProjectId(meeting?.project_id ?? undefined)
    setSummary(meeting?.summary ?? '')
    setTranscript(meeting?.transcript ?? '')
    setMeetingId(meeting?.id)
    setProposals([])
    setAccepted(new Set())
    setRefusal(null)
    setConfirmDelete(false)
  }, [open, meeting])

  const canSave = title.trim() !== '' && (transcript.trim() !== '' || summary.trim() !== '')

  async function persist(): Promise<string | undefined> {
    if (!canSave) return undefined
    return save.mutateAsync({
      ...(meetingId ? { id: meetingId } : {}),
      title: title.trim(),
      met_at: new Date(`${metAt}T12:00:00`).toISOString(),
      project_id: projectId ?? null,
      summary: summary.trim() || null,
      transcript: transcript.trim(),
      author_id: profile?.id ?? null,
    })
  }

  async function saveAndExtract() {
    const id = await persist()
    if (!id) return
    setMeetingId(id)
    setRefusal(null)

    const result = await extract.mutateAsync(id)
    if (result.refused) {
      setRefusal(result.reason ?? 'Not sent for extraction.')
      if (result.projectId) setProjectId(result.projectId)
      return
    }
    if (result.projectId) setProjectId(result.projectId)
    setProposals(result.proposals ?? [])
    setAccepted(new Set())
    if ((result.proposals ?? []).length === 0) {
      toast.info('Nothing to extract', { description: 'No action items were committed to.' })
    } else if (result.autoRouted) {
      toast.success(`Filed from ${result.routedBy ?? 'the title'}`)
    }
  }

  function acceptProposal(p: Proposal, i: number) {
    if (!projectId) {
      toast.error('Pick a project first', { description: 'A commitment has to live somewhere.' })
      return
    }
    saveCommitment.mutate(
      {
        project_id: projectId,
        title: p.title,
        detail: p.detail,
        owner_type: p.owner,
        due_date: p.due_date,
        requested_by: p.owner === 'me' ? 'paul' : null,
        created_by: profile?.id ?? null,
        ...(meetingId ? { source_meeting_id: meetingId } : {}),
      },
      {
        onSuccess: () => {
          setAccepted((prev) => new Set(prev).add(i))
        },
      }
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={meeting ? 'Meeting' : 'Add meeting notes'}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="m-title">What was it</Label>
          <Input
            id="m-title"
            autoFocus
            value={title}
            onChange={(e) => { setTitle(e.target.value) }}
            placeholder="Call with Paul about the advisory council"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="m-date">When</Label>
            <DateInput
              id="m-date"
              value={metAt}
              onChange={(e) => { setMetAt(e.target.value) }}
            />
          </div>
          <div>
            <Label>Project</Label>
            <Select
              aria-label="Project"
              value={projectId}
              onValueChange={setProjectId}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Work it out"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="m-summary">Summary</Label>
          <Textarea
            id="m-summary"
            value={summary}
            onChange={(e) => { setSummary(e.target.value) }}
            className="min-h-20"
            placeholder="What your recorder wrote, if it wrote one."
          />
        </div>

        <div>
          <Label htmlFor="m-transcript">Notes or transcript</Label>
          <Textarea
            id="m-transcript"
            value={transcript}
            onChange={(e) => { setTranscript(e.target.value) }}
            className="min-h-32"
            placeholder="Paste the whole thing. It stays with the project."
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={!canSave || save.isPending || extract.isPending}
            onClick={() => void saveAndExtract()}
          >
            <Sparkles />
            {extract.isPending ? 'Reading…' : 'Save and find action items'}
          </Button>
          <Button
            variant="secondary"
            disabled={!canSave || save.isPending}
            onClick={() => {
              void persist().then(() => {
                onOpenChange(false)
              })
            }}
          >
            Just save
          </Button>
        </div>

        {/* Refusals are shown in full. "Something went wrong" on a privacy
            decision teaches you nothing about why. */}
        {refusal ? (
          <div className="rounded-lg border border-amber/40 bg-amber-bg p-3">
            <p className="text-[13px] leading-relaxed text-text-2">{refusal}</p>
          </div>
        ) : null}

        {proposals.length > 0 ? (
          <div>
            <p className="mb-2 t-section">
              Found {proposals.length} — accept the ones that are real
            </p>
            <div className="space-y-2">
              {proposals.map((p, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-lg border p-3 transition-colors duration-150',
                    accepted.has(i)
                      ? 'border-green/40 bg-green-bg'
                      : 'border-border bg-surface-2'
                  )}
                >
                  <p className="t-item text-pretty">{p.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 t-meta">
                    <span>{OWNERS.find((o) => o.value === p.owner)?.label ?? p.owner}</span>
                    {p.due_date ? <span>· due {p.due_date}</span> : null}
                  </div>
                  {p.detail ? (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-text-2">{p.detail}</p>
                  ) : null}

                  {accepted.has(i) ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-green">
                      <Check className="size-3.5" />
                      Added
                    </p>
                  ) : (
                    <div className="mt-2.5 flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => { acceptProposal(p, i) }}
                      >
                        Add it
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setProposals(proposals.filter((_, n) => n !== i))
                        }}
                      >
                        <X />
                        Not real
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 t-meta text-pretty">
              Accepted one at a time on purpose — a model is good at spotting what was said,
              not at deciding what you owe people.
            </p>
          </div>
        ) : null}

        {meeting ? (
          <div className="border-t border-border pt-3">
            {confirmDelete ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  remove.mutate(meeting.id, { onSuccess: () => { onOpenChange(false) } })
                }}
              >
                Really remove?
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => { setConfirmDelete(true) }}>
                Remove this meeting
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </Sheet>
  )
}
