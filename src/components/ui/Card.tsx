import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/**
 * A surface.
 *
 * Depth is a hairline border plus a layered shadow — a tight contact shadow
 * under the edge and a soft cast below it. One blur alone makes a card look
 * like it's floating; two make it look like it's resting on the page.
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-border bg-surface-1 shadow-card', className)}
      {...props}
    />
  )
}

/** A single actionable line — a commitment, a person. */
export function Row({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-lg px-3 py-2.5',
        'transition-colors duration-150 ease-out hover:bg-surface-2',
        className
      )}
      {...props}
    />
  )
}
