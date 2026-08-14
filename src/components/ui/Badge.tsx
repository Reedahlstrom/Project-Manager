import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

const badge = cva(
  'inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-3 text-text-2',
        green: 'bg-green-bg text-green',
        amber: 'bg-amber-bg text-amber',
        red: 'bg-red-bg text-red',
        accent: 'bg-accent-muted text-accent',
      },
    },
    defaultVariants: { tone: 'neutral' },
  }
)

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)} {...props} />
}

/**
 * Project health as a dot.
 *
 * `inline-block` is load-bearing: as a bare inline span, width and height are
 * ignored unless it happens to be a direct flex child, so the dot silently
 * vanished anywhere it was wrapped in another element.
 */
export function HealthDot({ health }: { health: 'green' | 'amber' | 'red' }) {
  const tone = { green: 'bg-green', amber: 'bg-amber', red: 'bg-red' }[health]
  return (
    <span
      className={cn('inline-block size-1.5 shrink-0 rounded-full align-middle', tone)}
      aria-hidden
    />
  )
}
