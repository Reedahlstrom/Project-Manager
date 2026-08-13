import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Dialog'
import { Input, Textarea } from '@/components/ui/Input'
import { Label, Select } from '@/components/ui/Select'
import { useArchiveProject, useSaveProject } from '@/hooks/useProjects'
import type { Health, ProjectRow, ProjectStatus, Sensitivity } from '@/types/models'

const STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
]

const HEALTH = [
  { value: 'green', label: 'Green — on track' },
  { value: 'amber', label: 'Amber — needs attention' },
  { value: 'red', label: 'Red — at risk' },
]

const SENSITIVITY = [
  { value: 'standard', label: 'Standard — all three of you' },
  { value: 'sensitive', label: 'Sensitive — all three, handle with care' },
  { value: 'restricted', label: 'Restricted — you and Paul only' },
]

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function ProjectSheet({
  open,
  onOpenChange,
  project,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: ProjectRow | undefined
}) {
  const save = useSaveProject()
  const archive = useArchiveProject()

  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('active')
  const [health, setHealth] = useState<Health>('green')
  const [healthNote, setHealthNote] = useState('')
  const [sensitivity, setSensitivity] = useState<Sensitivity>('standard')
  const [confirmArchive, setConfirmArchive] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(project?.name ?? '')
    setPurpose(project?.purpose ?? '')
    setStatus(project?.status ?? 'active')
    setHealth(project?.health ?? 'green')
    setHealthNote(project?.health_note ?? '')
    setSensitivity(project?.sensitivity ?? 'standard')
    setConfirmArchive(false)
  }, [open, project])

  const canSave = name.trim() !== ''

  function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    if (!canSave) return
    save.mutate(
      {
        ...(project ? { id: project.id } : {}),
        name: name.trim(),
        slug: project?.slug ?? slugify(name),
        purpose: purpose.trim() || null,
        status,
        health,
        health_note: healthNote.trim() || null,
        sensitivity,
        sort_order: project?.sort_order ?? 99,
      },
      { onSuccess: () => { onOpenChange(false) } }
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={project ? 'Edit project' : 'New project'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="p-name">Name</Label>
          <Input
            id="p-name"
            autoFocus
            value={name}
            onChange={(e) => { setName(e.target.value) }}
          />
        </div>

        <div>
          <Label htmlFor="p-purpose">Purpose</Label>
          <Textarea
            id="p-purpose"
            value={purpose}
            onChange={(e) => { setPurpose(e.target.value) }}
            className="min-h-16"
            placeholder="One line. What does done look like?"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Status</Label>
            <Select
              aria-label="Status"
              value={status}
              onValueChange={(v) => { setStatus(v as ProjectStatus) }}
              options={STATUS}
            />
          </div>
          <div>
            <Label>Health</Label>
            <Select
              aria-label="Health"
              value={health}
              onValueChange={(v) => { setHealth(v as Health) }}
              options={HEALTH}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="p-note">Health note</Label>
          <Input
            id="p-note"
            value={healthNote}
            onChange={(e) => { setHealthNote(e.target.value) }}
            placeholder="Why is it amber?"
          />
        </div>

        <div>
          <Label>Who can see this</Label>
          <Select
            aria-label="Sensitivity"
            value={sensitivity}
            onValueChange={(v) => { setSensitivity(v as Sensitivity) }}
            options={SENSITIVITY}
          />
          {sensitivity === 'restricted' ? (
            <p className="mt-1.5 t-meta">
              Heather cannot see this project, anything inside it, or that it exists.
              Enforced by the database, not by this screen.
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" variant="primary" disabled={!canSave || save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => { onOpenChange(false) }}>
            Cancel
          </Button>

          {project ? (
            <div className="ml-auto">
              {confirmArchive ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    archive.mutate(project.id, {
                      onSuccess: () => { onOpenChange(false) },
                    })
                  }}
                >
                  Really archive?
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setConfirmArchive(true) }}
                >
                  Archive
                </Button>
              )}
            </div>
          ) : null}
        </div>

        {project ? (
          // Soft delete. Nothing with history is ever hard-deleted, so the
          // commitments and notes underneath survive and can be restored.
          <p className="t-meta">Archiving hides the project. Nothing is deleted.</p>
        ) : null}
      </form>
    </Sheet>
  )
}
