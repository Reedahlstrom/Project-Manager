import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Card } from '@/components/ui/Card'
import { Tooltip } from '@/components/ui/Tooltip'
import { useAuth } from '@/contexts/auth-context'
import { toLines, useDailyNote, useSaveDailyNote } from '@/hooks/useDailyNote'
import { todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'

/**
 * The day's note: one line per thought, and a + to turn any of them into a
 * commitment.
 *
 * Line-based rather than a single textarea, because the whole point is that a
 * line is a unit you can act on. Enter makes the next one, Backspace on an
 * empty line removes it — the shape people already expect from a notes app,
 * so nothing has to be learned.
 *
 * Saving is debounced and silent. A note you have to remember to save is a note
 * you lose.
 */
export function DailyNote({
  date = todayISO(),
  onPromote,
  readOnly = false,
}: {
  date?: string
  onPromote: (line: string) => void
  readOnly?: boolean
}) {
  const { profile } = useAuth()
  const { data: note } = useDailyNote(date)
  const save = useSaveDailyNote(date)

  const [lines, setLines] = useState<string[]>([''])
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const dirty = useRef(false)
  // Focus the line we just created, once React has rendered it.
  const focusNext = useRef<number | null>(null)

  // Adopt server state only while the user isn't mid-edit, so a background
  // refetch can't yank text out from under the cursor.
  useEffect(() => {
    if (dirty.current) return
    setLines(toLines(note?.body ?? ''))
  }, [note?.body])

  useEffect(() => {
    if (focusNext.current === null) return
    inputs.current[focusNext.current]?.focus()
    focusNext.current = null
  })

  // Debounced autosave.
  useEffect(() => {
    if (!dirty.current || !profile) return
    const id = window.setTimeout(() => {
      save.mutate({ body: lines.join('\n'), authorId: profile.id })
      dirty.current = false
    }, 700)
    return () => {
      window.clearTimeout(id)
    }
    // `save` is a stable mutation object; including it would re-arm the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, profile])

  function edit(next: string[]) {
    dirty.current = true
    setLines(next)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>, i: number) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const next = [...lines]
      next.splice(i + 1, 0, '')
      edit(next)
      focusNext.current = i + 1
      return
    }
    // Backspace on an empty line removes it and puts the cursor at the end of
    // the line above — the standard behaviour, and the one that makes tidying
    // up feel effortless.
    if (e.key === 'Backspace' && lines[i] === '' && lines.length > 1) {
      e.preventDefault()
      const next = lines.filter((_, n) => n !== i)
      edit(next)
      focusNext.current = Math.max(0, i - 1)
      return
    }
    if (e.key === 'ArrowUp' && i > 0) {
      e.preventDefault()
      inputs.current[i - 1]?.focus()
    }
    if (e.key === 'ArrowDown' && i < lines.length - 1) {
      e.preventDefault()
      inputs.current[i + 1]?.focus()
    }
  }

  const empty = lines.length === 1 && lines[0] === ''

  return (
    <Card className="p-1.5">
      {empty && readOnly ? (
        <p className="px-2.5 py-2 t-meta">Nothing written this day.</p>
      ) : (
        lines.map((line, i) => (
          <div key={i} className="group flex items-center gap-1.5 rounded-lg px-1.5 hover:bg-surface-2">
            <span
              className={cn(
                'size-1.5 shrink-0 rounded-full transition-colors duration-150',
                line.trim() ? 'bg-text-3' : 'bg-transparent'
              )}
              aria-hidden
            />

            <input
              ref={(el) => {
                inputs.current[i] = el
              }}
              value={line}
              readOnly={readOnly}
              onChange={(e) => {
                const next = [...lines]
                next[i] = e.target.value
                edit(next)
              }}
              onKeyDown={(e) => {
                onKeyDown(e, i)
              }}
              placeholder={i === 0 ? 'What happened today…' : ''}
              className={cn(
                'min-w-0 flex-1 bg-transparent py-2 text-sm text-text',
                'placeholder:text-text-3 focus:outline-none'
              )}
            />

            {/* The whole point: any line can graduate into a commitment. */}
            {line.trim() ? (
              <Tooltip content="Make this a commitment">
                <button
                  type="button"
                  onClick={() => {
                    onPromote(line.trim())
                  }}
                  aria-label={`Make a commitment from: ${line.trim()}`}
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-md',
                    'text-text-3 transition-colors duration-150',
                    'hover:bg-accent hover:text-accent-contrast',
                    // Always visible on touch, where there is no hover to reveal it.
                    'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100'
                  )}
                >
                  <Plus className="size-3.5" />
                </button>
              </Tooltip>
            ) : (
              <span className="size-6 shrink-0" />
            )}
          </div>
        ))
      )}
    </Card>
  )
}
