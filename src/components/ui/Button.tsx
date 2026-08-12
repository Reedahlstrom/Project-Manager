import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

const button = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap',
    'transition-colors duration-150 ease-out',
    'disabled:pointer-events-none disabled:opacity-40',
    // Touch targets stay thumb-sized on a phone. This app is used walking.
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        // Exactly one primary action per screen. If two things look primary,
        // neither is.
        primary: 'bg-accent text-accent-contrast hover:bg-accent-hover',
        secondary: 'bg-surface-3 text-text hover:bg-surface-4',
        ghost: 'text-text-2 hover:bg-surface-2 hover:text-text',
        outline: 'border border-border text-text-2 hover:bg-surface-2 hover:text-text',
        // Destructive is muted like every other status colour. Overdue is the
        // only thing in this app allowed to be loud.
        danger: 'bg-red-bg text-red hover:bg-red hover:text-bg',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-9 px-4 text-sm',
        lg: 'h-11 px-5 text-sm',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  }
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button> & { children?: ReactNode }

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(button({ variant, size }), className)} {...props} />
}
