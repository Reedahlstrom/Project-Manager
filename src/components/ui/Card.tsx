import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/**
 * A surface. Elevation comes from lightness, never shadow — a drop shadow on a
 * near-black background reads as mud.
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-border bg-surface-1', className)}
      {...props}
    />
  )
}

/** A single actionable line — a commitment, a person. Hover is a lightness step. */
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
