import type { ReactNode } from 'react'

export function Page({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <h1 className="t-page">{title}</h1>
        {action}
      </div>
      {children}
    </div>
  )
}

/**
 * A titled block within a screen. On Today these are Overdue, Due today, Chase
 * these, and Report back — and the order they appear in is the whole design.
 */
export function Section({
  title,
  count,
  children,
}: {
  title: string
  count?: number
  children: ReactNode
}) {
  return (
    <section className="mb-7">
      <div className="mb-2 flex items-baseline gap-2 px-3">
        <h2 className="t-section">{title}</h2>
        {count !== undefined && count > 0 ? (
          <span className="t-meta tabular-nums">{count}</span>
        ) : null}
      </div>
      {children}
    </section>
  )
}
