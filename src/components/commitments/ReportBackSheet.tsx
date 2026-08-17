import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Dialog'
import { Textarea } from '@/components/ui/Input'
import { Label } from '@/components/ui/Select'
import { useReportBack } from '@/hooks/useCommitments'
import type { CommitmentRow, OwnerType, ProjectRow } from '@/types/models'

const WHO: Record<OwnerType, string> = {
  me: 'me',
  paul: 'Paul',
  heather: 'Heather',
  external: 'them',
}

/**
 * Closing the loop, properly.
 *
 * Marking something "reported" used to be a boolean flip that recorded nothing —
 * no what, no receipt, and `report_note` sat unused in the schema. That made the
 * third step of the cadence the weakest one, when it is the step that actually
 * builds trust.
 *
 * The real workflow is that the report happens somewhere else — an email, a
 * text, a hallway. So this drafts the message for you to send, then records what
 * you said. Copying the update is the primary action; marking it reported is
 * what you do on the way back.
 */
export function ReportBackSheet({
  open,
  onOpenChange,
  commitment,
  project,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  commitment: CommitmentRow | undefined
  project: ProjectRow | undefined
}) {
  const reportBack = useReportBack()
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setNote(commitment?.report_note ?? '')
    setCopied(false)
  }, [open, commitment])

  if (!commitment) return null

  const who = commitment.requested_by ? WHO[commitment.requested_by] : 'them'
  const done = commitment.completed_at
    ? new Date(commitment.completed_at).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
      })
    : 'today'

  // A message worth sending as-is, not a template with blanks in it.
  const draft = [
    `${commitment.title} — done${commitment.completed_at ? ` (${done})` : ''}.`,
    project ? `Project: ${project.name}` : '',
    note.trim(),
  ]
    .filter(Boolean)
    .join('\n\n')

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
      toast.success('Copied — paste it to ' + who)
    } catch {
      toast.error('Could not copy', { description: 'Select the text and copy it manually.' })
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Report back to ${who}`}
      description="They asked for this and don't know it's finished yet."
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <p className="t-item text-pretty">{commitment.title}</p>
          <p className="mt-1 t-meta">
            {project ? `${project.name} · ` : ''}Finished {done}
          </p>
        </div>

        <div>
          <Label htmlFor="report-note">What are you telling them?</Label>
          <Textarea
            id="report-note"
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
              setCopied(false)
            }}
            className="min-h-24"
            placeholder="Anything they should know — what you found, what you'd do next, what you need from them."
          />
          <p className="mt-1.5 t-meta">
            Optional, but this is the record of what you said and when.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <p className="mb-1.5 t-section">The message</p>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-text-2">{draft}</p>
          <Button variant="secondary" size="sm" className="mt-2.5" onClick={() => void copyDraft()}>
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copied' : 'Copy the update'}
          </Button>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            variant="primary"
            onClick={() => {
              reportBack.mutate({ id: commitment.id, note: note.trim() || null })
              onOpenChange(false)
              toast.success(`Loop closed with ${who}`, { description: commitment.title })
            }}
          >
            Mark as reported
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Not yet
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
