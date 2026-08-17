import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Dialog'
import { Input, Textarea } from '@/components/ui/Input'
import { Label } from '@/components/ui/Select'
import { useAuth } from '@/contexts/auth-context'
import { useDeletePlaybookEntry, useSavePlaybookEntry } from '@/hooks/usePlaybook'
import type { PlaybookEntry } from '@/hooks/usePlaybook'
import { cn } from '@/lib/utils'

/**
 * Add or edit one piece of ball knowledge.
 *
 * Two fields are required — a category and a name — and everything else is
 * optional, because this only stays useful if writing something down is faster
 * than deciding not to. Categories are free text with the existing ones as
 * one-tap chips: invent "Golf courses" the first time, tap it forever after.
 */
export function PlaybookSheet({
  open,
  onOpenChange,
  entry,
  categories,
  defaultCategory,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: PlaybookEntry | undefined
  categories: string[]
  defaultCategory?: string | undefined
}) {
  const { profile } = useAuth()
  const save = useSavePlaybookEntry()
  const remove = useDeletePlaybookEntry()

  const [category, setCategory] = useState('')
  const [name, setName] = useState('')
  const [area, setArea] = useState('')
  const [note, setNote] = useState('')
  const [who, setWho] = useState('Paul')
  const [isGoTo, setIsGoTo] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setCategory(entry?.category ?? defaultCategory ?? '')
    setName(entry?.name ?? '')
    setArea(entry?.area ?? '')
    setNote(entry?.note ?? '')
    setWho(entry?.who ?? 'Paul')
    setIsGoTo(entry?.is_go_to ?? false)
    setConfirmDelete(false)
  }, [open, entry, defaultCategory])

  const canSave = category.trim() !== '' && name.trim() !== ''

  function submit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!canSave) return
    save.mutate(
      {
        ...(entry ? { id: entry.id } : {}),
        category: category.trim(),
        name: name.trim(),
        area: area.trim() || null,
        note: note.trim() || null,
        who: who.trim() || null,
        is_go_to: isGoTo,
        created_by: profile?.id ?? null,
      },
      { onSuccess: () => { onOpenChange(false) } }
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={entry ? 'Edit' : 'Add to ball knowledge'}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="pb-category">Kind of thing</Label>
          <Input
            id="pb-category"
            value={category}
            onChange={(e) => { setCategory(e.target.value) }}
            placeholder="Restaurants, Gifts, Venues, Golf courses…"
          />
          {categories.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCategory(c) }}
                  className={cn(
                    'rounded-md px-2 py-1 text-[11px] font-medium transition-colors duration-150',
                    category === c
                      ? 'bg-accent text-accent-contrast'
                      : 'bg-surface-3 text-text-2 hover:bg-surface-4 hover:text-text'
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <Label htmlFor="pb-name">What is it</Label>
          <Input
            id="pb-name"
            autoFocus
            value={name}
            onChange={(e) => { setName(e.target.value) }}
            placeholder="Sol Agave"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pb-area">Where</Label>
            <Input
              id="pb-area"
              value={area}
              onChange={(e) => { setArea(e.target.value) }}
              placeholder="American Fork"
            />
          </div>
          <div>
            <Label htmlFor="pb-who">Whose</Label>
            <Input
              id="pb-who"
              value={who}
              onChange={(e) => { setWho(e.target.value) }}
              placeholder="Paul"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="pb-note">What you need to remember</Label>
          <Textarea
            id="pb-note"
            value={note}
            onChange={(e) => { setNote(e.target.value) }}
            className="min-h-20"
            placeholder="Why it's the pick. Who it suits. Anything you'd otherwise have to ask."
          />
        </div>

        {/* The field that turns a list into a decision. */}
        <button
          type="button"
          onClick={() => { setIsGoTo(!isGoTo) }}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left',
            'transition-colors duration-150',
            isGoTo
              ? 'border-accent bg-accent-muted'
              : 'border-border bg-surface-2 hover:border-border-strong'
          )}
        >
          <Star
            className={cn('size-4 shrink-0', isGoTo ? 'fill-accent text-accent' : 'text-text-3')}
          />
          <span className="flex-1">
            <span className="block text-sm font-medium text-text">This is the go-to</span>
            <span className="block t-meta">
              The default answer here — shown first, so you don&rsquo;t have to choose.
            </span>
          </span>
        </button>

        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" variant="primary" disabled={!canSave || save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => { onOpenChange(false) }}>
            Cancel
          </Button>
          {entry ? (
            <div className="ml-auto">
              {confirmDelete ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    remove.mutate(entry.id, { onSuccess: () => { onOpenChange(false) } })
                  }}
                >
                  Really remove?
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setConfirmDelete(true) }}
                >
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
