import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { DateInput, Input, Textarea } from '@/components/ui/Input'
import { Label, Select } from '@/components/ui/Select'
import { Sheet } from '@/components/ui/Dialog'
import { usePeople, useProjects } from '@/hooks/useProjects'
import { useSaveCommitment } from '@/hooks/useCommitments'
import { defaultFollowUp, todayISO } from '@/lib/dates'
import type { CommitmentRow, CommitmentStatus, OwnerType } from '@/types/models'

const OWNERS: { value: OwnerType; label: string }[] = [
  { value: 'me', label: 'Me' },
  { value: 'paul', label: 'Paul' },
  { value: 'heather', label: 'Heather' },
  { value: 'external', label: 'Someone else' },
]

const STATUSES: { value: CommitmentStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'waiting', label: 'Waiting on someone' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
  { value: 'dropped', label: 'Dropped' },
]

export function CommitmentSheet({
  open,
  onOpenChange,
  commitment,
  defaultProjectId,
  initialTitle,
  initialDetail,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  commitment?: CommitmentRow | undefined
  /** The project you're standing in. Beats "whichever project sorts first". */
  defaultProjectId?: string | undefined
  initialTitle?: string | undefined
  initialDetail?: string | undefined
  onSaved?: (() => void) | undefined
}) {
  const { data: projects = [] } = useProjects()
  const { data: people = [] } = usePeople()
  const save = useSaveCommitment()

  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [projectId, setProjectId] = useState<string | undefined>(undefined)
  const [ownerType, setOwnerType] = useState<OwnerType>('me')
  const [ownerPersonId, setOwnerPersonId] = useState<string | undefined>(undefined)
  // Defaults to Paul, because that is the job. Almost everything here is
  // something Paul asked for, and a default that matches the exception means
  // the loop silently never exists.
  const [requestedBy, setRequestedBy] = useState<string>('paul')
  const [dueDate, setDueDate] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [status, setStatus] = useState<CommitmentStatus>('open')

  useEffect(() => {
    if (!open) return
    setTitle(commitment?.title ?? initialTitle ?? '')
    setDetail(commitment?.detail ?? initialDetail ?? '')
    // Editing keeps its own project; creating uses the one you're looking at.
    // Falling back to projects[0] meant opening this from inside Church Media
    // Fund pre-selected Angel BAC — a wrong default that saves silently.
    setProjectId(commitment?.project_id ?? defaultProjectId ?? projects[0]?.id)
    setOwnerType(commitment?.owner_type ?? 'me')
    setOwnerPersonId(commitment?.owner_person_id ?? undefined)
    setRequestedBy(commitment?.requested_by ?? (commitment ? 'none' : 'paul'))
    // New work is nearly always for today. Editing never gets a date invented
    // for it.
    setDueDate(commitment?.due_date ?? (commitment ? '' : todayISO()))
    setFollowUp(commitment?.follow_up_date ?? '')
    setStatus(commitment?.status ?? 'open')
  }, [open, commitment, defaultProjectId, initialTitle, initialDetail, projects])

  // A waiting commitment with no follow-up date is exactly the thing that falls
  // through the cracks. The database refuses to store one; the form fills it in
  // three business days out the moment you choose 'waiting', so the constraint
  // is never something you have to think about.
  function onStatusChange(next: string) {
    const value = next as CommitmentStatus
    setStatus(value)
    if (value === 'waiting' && !followUp) setFollowUp(defaultFollowUp())
  }

  const waitingNeedsFollowUp = status === 'waiting' && !followUp
  const externalNeedsPerson =
    (ownerType === 'external' && !ownerPersonId) ||
    (requestedBy === 'external' && !ownerPersonId)
  const canSave = title.trim() !== '' && projectId && !waitingNeedsFollowUp && !externalNeedsPerson

  function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    if (!canSave) return

    save.mutate(
      {
        ...(commitment ? { id: commitment.id } : {}),
        project_id: projectId,
        title: title.trim(),
        detail: detail.trim() || null,
        owner_type: ownerType,
        owner_person_id: ownerPersonId ?? null,
        requested_by: requestedBy === 'none' ? null : (requestedBy as OwnerType),
        requested_by_person_id: requestedBy === 'external' ? (ownerPersonId ?? null) : null,
        due_date: dueDate || null,
        follow_up_date: followUp || null,
        status,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          onSaved?.()
        },
      }
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={commitment ? 'Edit commitment' : 'New commitment'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">What</Label>
          <Input
            id="title"
            autoFocus
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
            }}
            placeholder="Send the pre-read to the council"
          />
        </div>

        <div>
          <Label htmlFor="detail">Detail</Label>
          <Textarea
            id="detail"
            value={detail}
            onChange={(event) => {
              setDetail(event.target.value)
            }}
            className="min-h-16"
          />
        </div>

        <div>
          <Label>Project</Label>
          <Select
            aria-label="Project"
            value={projectId}
            onValueChange={setProjectId}
            options={projects.map((project) => ({ value: project.id, label: project.name }))}
            placeholder="Pick a project"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Owner</Label>
            <Select
              aria-label="Owner"
              value={ownerType}
              onValueChange={(value) => {
                setOwnerType(value as OwnerType)
              }}
              options={OWNERS}
            />
          </div>
          <div>
            <Label>Asked by</Label>
            <Select
              aria-label="Asked by"
              value={requestedBy}
              onValueChange={setRequestedBy}
              options={[{ value: 'none', label: 'Nobody' }, ...OWNERS]}
            />
          </div>
        </div>

        {ownerType === 'external' || requestedBy === 'external' ? (
          <div>
            <Label>Which person</Label>
            <Select
              aria-label="Person"
              value={ownerPersonId}
              onValueChange={setOwnerPersonId}
              options={people.map((person) => ({
                value: person.id,
                label: person.org ? `${person.name} · ${person.org}` : person.name,
              }))}
              placeholder={people.length ? 'Pick someone' : 'No people yet'}
            />
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="due">Due</Label>
            <DateInput
              id="due"
              value={dueDate}
              onChange={(event) => {
                setDueDate(event.target.value)
              }}
            />
          </div>
          <div>
            <Label htmlFor="followup">Chase on</Label>
            <DateInput
              id="followup"
              value={followUp}
              onChange={(event) => {
                setFollowUp(event.target.value)
              }}
            />
          </div>
        </div>

        <div>
          <Label>Status</Label>
          <Select
            aria-label="Status"
            value={status}
            onValueChange={onStatusChange}
            options={STATUSES}
          />
          {status === 'waiting' ? (
            <p className="mt-1.5 t-meta">
              Waiting means someone owes you. It shows up in Chase these on the date above.
            </p>
          ) : null}
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="submit" variant="primary" disabled={!canSave || save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
