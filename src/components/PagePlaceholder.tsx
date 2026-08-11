/**
 * Temporary route scaffolding for prompt 1. Prompt 3 replaces this with the real
 * EmptyState component and per-route copy.
 */
export function PagePlaceholder({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-text">{title}</h1>
      <p className="mt-2 max-w-[var(--measure)] text-pretty text-sm text-text-2">{blurb}</p>

      <div className="mt-8 rounded-[var(--radius)] border border-dashed border-border bg-surface-1 px-6 py-12 text-center">
        <p className="text-sm text-text-3">Nothing here yet.</p>
      </div>
    </div>
  )
}
