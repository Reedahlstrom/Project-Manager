import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Card } from '@/components/ui/Card'
import { Tooltip } from '@/components/ui/Tooltip'
import { useAuth } from '@/contexts/auth-context'
import { toLines, useDailyNote, useSaveDailyNote } from '@/hooks/useDailyNote'
import { fromISO, toISO, todayISO } from '@/lib/dates'
import {
  autoConvert,
  formatLine,
  nextKind,
  parseLine,
  type LineKind,
} from '@/lib/note-lines'
import { cn } from '@/lib/utils'

/**
 * The day's note — notes, checklist and follow-ups in one place.
 *
 * Modelled on the notes app Reed already writes in: a date at the top, headings,
 * checkbox lines that continue when you press Enter, and plain lines for
 * everything that isn't a task. Nothing has to be learned because the prefixes
 * (`# `, `[] `, `- `) are the ones people type by habit anyway.
 *
 * Two things it does that a notes app can't: ticking a box is a checklist you
 * keep inside the day, and any line can graduate into a tracked commitment with
 * a follow-up — so a thought, a task and a thing you owe someone all live in the
 * same place instead of three.
 */
const NOTE_HEIGHT_KEY = 'alta.note-height'
const DEFAULT_HEIGHT = 340
const MIN_HEIGHT = 140
const MAX_HEIGHT = 1200

export function DailyNote({
  date,
  onDateChange,
  onPromote,
  readOnly = false,
}: {
  date: string
  onDateChange: (date: string) => void
  onPromote: (line: string) => void
  readOnly?: boolean
}) {
  const { profile } = useAuth()
  const { data: note } = useDailyNote(date)
  const save = useSaveDailyNote(date)

  const [lines, setLines] = useState<string[]>([''])
  // How tall the writing area is. Reed sets it by dragging the bottom edge and
  // it stays that way — a note you have to resize every morning is worse than
  // one that's the wrong size once.
  const [height, setHeight] = useState(() => {
    const saved = Number(localStorage.getItem(NOTE_HEIGHT_KEY))
    return saved >= MIN_HEIGHT && saved <= MAX_HEIGHT ? saved : DEFAULT_HEIGHT
  })
  const body = useRef<HTMLDivElement | null>(null)
  const inputs = useRef<(HTMLTextAreaElement | null)[]>([])
  const dirty = useRef(false)
  const focusNext = useRef<number | null>(null)

  // Adopt server state only while not mid-edit, so a background refetch can't
  // pull text out from under the cursor.
  useEffect(() => {
    if (dirty.current) return
    setLines(toLines(note?.body ?? ''))
  }, [note?.body])

  useEffect(() => {
    if (focusNext.current === null) return
    const el = inputs.current[focusNext.current]
    el?.focus()
    // Put the caret at the end rather than wherever the browser guesses.
    el?.setSelectionRange(el.value.length, el.value.length)
    focusNext.current = null
  })

  /** Grow a line to fit its content — the textarea equivalent of wrapping. */
  function fit(el: HTMLTextAreaElement | null) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${String(el.scrollHeight)}px`
  }

  // Re-fit every line when the text or the viewport changes.
  useEffect(() => {
    inputs.current.forEach(fit)
  }, [lines])

  useEffect(() => {
    const onResize = () => {
      inputs.current.forEach(fit)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    if (!dirty.current || !profile) return
    const id = window.setTimeout(() => {
      save.mutate({ body: lines.join('\n'), authorId: profile.id })
      dirty.current = false
    }, 700)
    return () => {
      window.clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, profile])

  function edit(next: string[]) {
    dirty.current = true
    setLines(next)
  }

  function setLine(i: number, kind: LineKind, text: string) {
    const next = [...lines]
    next[i] = formatLine(kind, text)
    edit(next)
  }

  function onChange(i: number, raw: string) {
    const parsed = parseLine(lines[i] ?? '')

    // Typing "# " or "[] " converts the line in place — no toolbar needed.
    const converted = parsed.kind === 'text' ? autoConvert(raw) : null
    if (converted) {
      setLine(i, converted.kind, converted.text)
      return
    }

    let clean = raw

    // Typing fast can outrun React's controlled value, so the prefix sometimes
    // arrives back in `raw` and would be stored twice. Strip whatever the line
    // already carries.
    if (parsed.kind === 'heading' && clean.startsWith('# ')) clean = clean.slice(2)
    else if (parsed.kind === 'todo') clean = clean.replace(/^\[\s?\]\s?/, '')
    else if (parsed.kind === 'done') clean = clean.replace(/^\[[xX]\]\s?/, '')

    // Conversion happens on "[]" or "#", so the space the user typed as part of
    // the prefix lands at the front of the text. Swallow it.
    if (parsed.text === '') clean = clean.replace(/^\s+/, '')

    setLine(i, parsed.kind, clean)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, i: number) {
    const parsed = parseLine(lines[i] ?? '')

    if (e.key === 'Enter') {
      e.preventDefault()
      // Enter on an empty checklist item ends the list rather than adding
      // another empty one — the standard escape hatch.
      if ((parsed.kind === 'todo' || parsed.kind === 'done') && parsed.text === '') {
        setLine(i, 'text', '')
        return
      }
      const next = [...lines]
      next.splice(i + 1, 0, formatLine(nextKind(parsed.kind), ''))
      edit(next)
      focusNext.current = i + 1
      return
    }

    if (e.key === 'Backspace' && parsed.text === '') {
      e.preventDefault()
      // Strip the prefix first, so one Backspace un-checkboxes and the next
      // removes the line.
      if (parsed.kind !== 'text') {
        setLine(i, 'text', '')
        return
      }
      if (lines.length > 1) {
        edit(lines.filter((_, n) => n !== i))
        focusNext.current = Math.max(0, i - 1)
      }
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

  const isToday = date === todayISO()
  const heading = isToday
    ? 'Today'
    : fromISO(date).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
  const empty = lines.length === 1 && lines[0] === ''

  function resizeTo(next: number) {
    const clamped = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(next)))
    setHeight(clamped)
    localStorage.setItem(NOTE_HEIGHT_KEY, String(clamped))
  }

  /**
   * Drag the bottom edge to resize.
   *
   * Pointer events rather than mouse events so it works with a finger, and
   * capture so the drag survives the pointer leaving the handle — without it,
   * moving faster than React re-renders drops the drag.
   */
  function onGrab(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    const handle = e.currentTarget
    const startY = e.clientY
    const startHeight = body.current?.offsetHeight ?? height
    handle.setPointerCapture(e.pointerId)

    const move = (ev: PointerEvent) => {
      resizeTo(startHeight + (ev.clientY - startY))
    }
    const up = () => {
      handle.releasePointerCapture(e.pointerId)
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', up)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', up)
  }

  function shift(days: number) {
    const d = fromISO(date)
    d.setDate(d.getDate() + days)
    onDateChange(toISO(d))
  }

  return (
    <Card className="relative px-4 pt-4 pb-4 sm:px-5">
      <div className="mb-4 flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => { shift(-1) }}
          aria-label="Previous day"
          className="rounded-md p-1 text-text-3 transition-colors duration-150 hover:bg-surface-2 hover:text-text"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => { onDateChange(todayISO()) }}
          className="min-w-[10rem] text-center text-[13px] text-text-3 transition-colors duration-150 hover:text-text"
        >
          {heading}
        </button>
        {/* Nothing to write on a day that hasn't happened. */}
        <button
          type="button"
          onClick={() => { shift(1) }}
          disabled={isToday}
          aria-label="Next day"
          className={cn(
            'rounded-md p-1 transition-colors duration-150',
            isToday
              ? 'cursor-default text-transparent'
              : 'text-text-3 hover:bg-surface-2 hover:text-text'
          )}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Clicking the empty space below the last line puts the cursor there,
          the way tapping under the text does in a notes app. */}
      <div
        ref={body}
        style={{ minHeight: `${String(height)}px` }}
        onMouseDown={(e) => {
          if (e.target !== e.currentTarget || readOnly) return
          e.preventDefault()
          const last = inputs.current[lines.length - 1]
          last?.focus()
          last?.setSelectionRange(last.value.length, last.value.length)
        }}
      >
      {empty && readOnly ? (
        <p className="px-1 py-2 t-meta">Nothing written this day.</p>
      ) : (
        lines.map((raw, i) => {
          const { kind, text } = parseLine(raw)
          const checkable = kind === 'todo' || kind === 'done'

          return (
            <div key={i} className="group flex items-start gap-2.5 rounded-md px-1">
              {checkable ? (
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => {
                    setLine(i, kind === 'done' ? 'todo' : 'done', text)
                  }}
                  aria-label={kind === 'done' ? `Uncheck: ${text}` : `Check off: ${text}`}
                  className={cn(
                    'mt-[9px] flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px]',
                    'transition-all duration-200 ease-out active:scale-90',
                    kind === 'done'
                      ? 'border-accent bg-accent text-accent-contrast'
                      : 'border-border-strong hover:border-accent'
                  )}
                >
                  {kind === 'done' ? (
                    <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
                      <path
                        d="M2 6.2 4.6 8.8 10 3.4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </button>
              ) : (
                // Keeps text aligned whether or not there's a checkbox.
                <span className="mt-[9px] size-5 shrink-0" aria-hidden />
              )}

              <textarea
                ref={(el) => {
                  inputs.current[i] = el
                  fit(el)
                }}
                rows={1}
                data-note-line
                value={text}
                readOnly={readOnly}
                onChange={(e) => {
                  onChange(i, e.target.value)
                  fit(e.target)
                }}
                onKeyDown={(e) => {
                  onKeyDown(e, i)
                }}
                placeholder={i === 0 ? 'Write the day…' : ''}
                className={cn(
                  'min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-1',
                  'leading-[1.45] focus:outline-none',
                  'placeholder:text-text-3',
                  kind === 'heading' && 'text-[22px] font-semibold tracking-[-0.02em] text-text',
                  kind === 'text' && 'text-[17px] text-text',
                  kind === 'todo' && 'text-[17px] text-text',
                  kind === 'done' && 'text-[17px] text-text-3 line-through decoration-text-3/50'
                )}
              />

              {/* Any line can become a tracked commitment with a follow-up. */}
              {text.trim() && !readOnly ? (
                <Tooltip content="Track this — due date, follow-up, report back">
                  <button
                    type="button"
                    onClick={() => {
                      onPromote(text.trim())
                    }}
                    aria-label={`Make a commitment from: ${text.trim()}`}
                    className={cn(
                      'mt-[5px] flex size-6 shrink-0 items-center justify-center rounded-md',
                      'text-text-3 transition-colors duration-150',
                      'hover:bg-accent hover:text-accent-contrast',
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
          )
        })
      )}
      </div>

      {/* The grip. Arrow keys resize too, so it isn't mouse-only. */}
      {readOnly ? null : (
        <div
          role="separator"
          aria-label="Resize notes — drag, or use the arrow keys"
          aria-orientation="horizontal"
          tabIndex={0}
          onPointerDown={onGrab}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); resizeTo(height + 40) }
            if (e.key === 'ArrowUp') { e.preventDefault(); resizeTo(height - 40) }
          }}
          onDoubleClick={() => { resizeTo(DEFAULT_HEIGHT) }}
          className={cn(
            'group absolute inset-x-0 bottom-0 flex h-4 cursor-ns-resize',
            'touch-none items-center justify-center rounded-b-xl'
          )}
        >
          <span
            className={cn(
              'h-1 w-10 rounded-full bg-border-strong/60',
              'transition-colors duration-150',
              'group-hover:bg-accent/50 group-focus-visible:bg-accent'
            )}
          />
        </div>
      )}
    </Card>
  )
}
