import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Dialog'
import { Input, Textarea } from '@/components/ui/Input'
import { Label, Select } from '@/components/ui/Select'
import {
  isoToLocalInput,
  localInputToISO,
  localTimezone,
  useDeleteEvent,
  useSaveEvent,
} from '@/hooks/useEvents'
import type { EventRow, EventStatus, EventType } from '@/types/models'

const TYPES = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'convening', label: 'Convening' },
  { value: 'launch', label: 'Launch' },
  { value: 'deadline', label: 'Deadline' },
]

const STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function EventSheet({
  open,
  onOpenChange,
  projectId,
  event,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  event?: EventRow | undefined
}) {
  const save = useSaveEvent()
  const remove = useDeleteEvent()

  const [title, setTitle] = useState('')
  const [type, setType] = useState<EventType>('meeting')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [location, setLocation] = useState('')
  const [link, setLink] = useState('')
  const [agenda, setAgenda] = useState('')
  const [status, setStatus] = useState<EventStatus>('planned')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(event?.title ?? '')
    setType(event?.type ?? 'meeting')
    setStartsAt(isoToLocalInput(event?.starts_at ?? null))
    setEndsAt(isoToLocalInput(event?.ends_at ?? null))
    setLocation(event?.location ?? '')
    setLink(event?.virtual_link ?? '')
    setAgenda(event?.agenda ?? '')
    setStatus(event?.status ?? 'planned')
    setConfirmDelete(false)
  }, [open, event])

  const canSave = title.trim() !== '' && startsAt !== ''

  function onSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!canSave) return
    save.mutate(
      {
        ...(event ? { id: event.id } : {}),
        project_id: projectId,
        title: title.trim(),
        type,
        starts_at: localInputToISO(startsAt),
        ends_at: endsAt ? localInputToISO(endsAt) : null,
        // Stored explicitly: the event happens in a place, and reading it back
        // in a different zone must not silently change what time it is.
        timezone: event?.timezone ?? localTimezone(),
        location: location.trim() || null,
        virtual_link: link.trim() || null,
        agenda: agenda.trim() || null,
        status,
      },
      { onSuccess: () => { onOpenChange(false) } }
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={event ? 'Edit date' : 'New date'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="e-title">What</Label>
          <Input
            id="e-title"
            autoFocus
            value={title}
            onChange={(ev) => { setTitle(ev.target.value) }}
            placeholder="First advisory council convening"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <Select
              aria-label="Type"
              value={type}
              onValueChange={(v) => { setType(v as EventType) }}
              options={TYPES}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select
              aria-label="Status"
              value={status}
              onValueChange={(v) => { setStatus(v as EventStatus) }}
              options={STATUSES}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="e-start">Starts</Label>
          <Input
            id="e-start"
            type="datetime-local"
            className="[color-scheme:light]"
            value={startsAt}
            onChange={(ev) => { setStartsAt(ev.target.value) }}
          />
        </div>

        <div>
          <Label htmlFor="e-end">Ends (optional)</Label>
          <Input
            id="e-end"
            type="datetime-local"
            className="[color-scheme:light]"
            value={endsAt}
            onChange={(ev) => { setEndsAt(ev.target.value) }}
          />
        </div>

        <div>
          <Label htmlFor="e-loc">Where</Label>
          <Input
            id="e-loc"
            value={location}
            onChange={(ev) => { setLocation(ev.target.value) }}
            placeholder="Provo, or a room name"
          />
        </div>

        <div>
          <Label htmlFor="e-link">Link</Label>
          <Input
            id="e-link"
            value={link}
            onChange={(ev) => { setLink(ev.target.value) }}
            placeholder="https://…"
          />
        </div>

        <div>
          <Label htmlFor="e-agenda">Agenda</Label>
          <Textarea
            id="e-agenda"
            value={agenda}
            onChange={(ev) => { setAgenda(ev.target.value) }}
            className="min-h-20"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" variant="primary" disabled={!canSave || save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => { onOpenChange(false) }}>
            Cancel
          </Button>
          {event ? (
            <div className="ml-auto">
              {confirmDelete ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    remove.mutate(event.id, { onSuccess: () => { onOpenChange(false) } })
                  }}
                >
                  Really remove?
                </Button>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setConfirmDelete(true) }}>
                  Remove
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </form>
    </Sheet>
  )
}
