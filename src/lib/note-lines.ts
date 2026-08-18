/**
 * Line types for a daily note.
 *
 * Stored as plain text with markdown-ish prefixes rather than structured rows,
 * so the whole day is still one string: it round-trips, it is searchable, and
 * pasting text in from anywhere Just Works. The prefixes are the ones people
 * already type by habit.
 *
 *   # Urgent        heading
 *   [] call Terri   unchecked item
 *   [x] call Terri  checked item
 *   anything else   plain text
 */
export type LineKind = 'heading' | 'todo' | 'done' | 'text'

export type ParsedLine = {
  kind: LineKind
  /** The text without its prefix — what gets displayed and edited. */
  text: string
}

export function parseLine(raw: string): ParsedLine {
  if (raw.startsWith('# ')) return { kind: 'heading', text: raw.slice(2) }
  if (raw === '#') return { kind: 'heading', text: '' }
  if (/^\[[xX]\]\s?/.test(raw)) return { kind: 'done', text: raw.replace(/^\[[xX]\]\s?/, '') }
  if (/^\[\s?\]\s?/.test(raw)) return { kind: 'todo', text: raw.replace(/^\[\s?\]\s?/, '') }
  return { kind: 'text', text: raw }
}

export function formatLine(kind: LineKind, text: string): string {
  switch (kind) {
    case 'heading':
      return `# ${text}`
    case 'todo':
      return `[] ${text}`
    case 'done':
      return `[x] ${text}`
    default:
      return text
  }
}

/**
 * What a new line should be when you press Enter.
 *
 * A checklist continues as a checklist — that is the behaviour every notes app
 * has and the reason lists are quick to write. A heading does not: you write one
 * heading and then things under it.
 */
export function nextKind(current: LineKind): LineKind {
  if (current === 'todo' || current === 'done') return 'todo'
  return 'text'
}

/**
 * Prefixes typed inline convert the line as you go, so you never reach for a
 * toolbar. Returns null when nothing should change.
 */
export function autoConvert(text: string): { kind: LineKind; text: string } | null {
  if (text.startsWith('# ')) return { kind: 'heading', text: text.slice(2) }
  if (text === '[]' || text === '[] ') return { kind: 'todo', text: '' }
  if (text.startsWith('[] ')) return { kind: 'todo', text: text.slice(3) }
  if (text.startsWith('- ')) return { kind: 'todo', text: text.slice(2) }
  return null
}
