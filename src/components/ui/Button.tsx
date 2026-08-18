import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

const button = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap',
    'transition-[background-color,box-shadow,transform,color] duration-150 ease-out',
    // A button that moves under the finger reads as a physical thing. One
    // pixel is enough — more looks like a bug.
    'active:translate-y-px',
    'disabled:pointer-events-none disabled:opacity-40 disabled:active:translate-y-0',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        // Exactly one primary action per screen. If two things look primary,
        // neither is. The inset top highlight gives it a lit edge, so it sits
        // on the page as an object rather than a coloured rectangle.
        primary: [
          'bg-accent text-accent-contrast shadow-button',
          'hover:bg-accent-hover',
          'active:shadow-none',
        ],
        secondary: [
          'border border-border bg-surface-1 text-text shadow-card',
          'hover:border-border-strong hover:bg-surface-2',
          'active:shadow-none',
        ],
        ghost: 'text-text-2 hover:bg-surface-2 hover:text-text',
        outline: 'border border-border text-text-2 hover:border-border-strong hover:bg-surface-2 hover:text-text',
        // Destructive is muted like every other status colour. Overdue is the
        // only thing in this app allowed to be loud.
        danger: 'bg-red-bg text-red hover:bg-red hover:text-accent-contrast',
      },
      size: {
        // Touch targets stay thumb-sized on a phone. This app is used walking.
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
