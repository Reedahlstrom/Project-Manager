import { Hammer } from 'lucide-react'

/**
 * An honest placeholder.
 *
 * The previous version described what a screen *would* do in the present tense,
 * which read as a working feature returning no data. That is worse than saying
 * nothing — it makes an unbuilt screen indistinguishable from a broken one.
 */
export function NotBuiltYet({ line }: { line: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <Hammer className="mb-3 size-5 text-text-3" aria-hidden />
      <p className="mb-1 text-sm font-medium text-text">Not built yet</p>
      <p className="max-w-sm text-pretty text-sm text-text-2">{line}</p>
    </div>
  )
}
