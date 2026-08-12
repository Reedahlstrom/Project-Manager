import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * An empty state says what belongs here and offers the one action that puts it
 * there. It never apologises and it never says "no data".
 *
 * The `compact` variant is for an empty section inside a populated screen — an
 * empty "Chase these" is good news and shouldn't take up half the viewport.
 */
export function EmptyState({
  icon: Icon,
  line,
  action,
  compact = false,
  className,
}: {
  icon?: LucideIcon
  line: string
  action?: ReactNode
  compact?: boolean
  className?: string
}) {
  if (compact) {
    return (
      <p className={cn('px-3 py-2 t-meta', className)}>{line}</p>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center',
        className
      )}
    >
      {Icon ? <Icon className="mb-3 size-5 text-text-3" aria-hidden /> : null}
      <p className="max-w-sm text-pretty text-sm text-text-2">{line}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
