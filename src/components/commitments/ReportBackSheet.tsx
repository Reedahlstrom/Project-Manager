import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Dialog'
import { Textarea } from '@/components/ui/Input'
import { Label, Select } from '@/components/ui/Select'
import { useReportBack, useSaveCommitment } from '@/hooks/useCommitments'
import { celebrate } from '@/lib/celebrate'
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
  burstFrom,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  commitment: CommitmentRow | undefined
  project: ProjectRow | undefined
  /** Where the tap happened, so the celebration comes out of the button. */
  burstFrom?: { x: number; y: number } | undefined
}) {
  const reportBack = useReportBack()
  const save = useSaveCommitment()
  const [note, setNote] = useState('')
  // Most existing commitments were created without a requester. Rather than
  // refusing to report, ask here — one dropdown, pre-set to the likely answer.
  const [recipient, setRecipient] = useState<OwnerType>('paul')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setNote(commitment?.report_note ?? '')
    setRecipient(commitment?.requested_by ?? 'paul')
    setCopied(false)
  }, [open, commitment])

  if (!commitment) return null

  const who = WHO[commitment.requested_by ?? recipient]
  const needsRecipient = commitment.requested_by === null
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

        {/* Only shown when nobody was recorded, so the common path stays one
            field long. */}
        {needsRecipient ? (
          <div>
            <Label>Who are you telling?</Label>
            <Select
              aria-label="Who are you telling"
              value={recipient}
              onValueChange={(v) => { setRecipient(v as OwnerType) }}
              options={[
                { value: 'paul', label: 'Paul' },
                { value: 'heather', label: 'Heather' },
                { value: 'external', label: 'Someone else' },
              ]}
            />
          </div>
        ) : null}

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
              // Record who it was for, so the loop has two ends rather than one.
              if (needsRecipient) {
                save.mutate({
                  id: commitment.id,
                  project_id: commitment.project_id,
                  title: commitment.title,
                  requested_by: recipient,
                })
              }
              reportBack.mutate({ id: commitment.id, note: note.trim() || null })
              onOpenChange(false)
              // The sheet has to be on its way out before the confetti fires,
              // or it lands behind the panel and you miss the whole thing.
              window.setTimeout(() => {
                celebrate(burstFrom)
              }, 180)
              toast.success(`Told ${who} — now waiting on their yes`, {
                description: commitment.title,
              })
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
