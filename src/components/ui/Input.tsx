import type { ComponentPropsWithRef } from 'react'

import { cn } from '@/lib/utils'

const field = [
  'w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-text',
  'transition-colors duration-150 ease-out',
  'placeholder:text-text-3',
  'hover:border-border-strong',
  'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
  'disabled:opacity-40',
].join(' ')

// React 19 passes `ref` as an ordinary prop, so no forwardRef wrapper is needed
// — but the props type has to be the WithRef variant or TypeScript rejects it.
export function Input({ className, ...props }: ComponentPropsWithRef<'input'>) {
  return <input className={cn(field, 'h-9', className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentPropsWithRef<'textarea'>) {
  return <textarea className={cn(field, 'min-h-24 py-2 leading-relaxed', className)} {...props} />
}

/**
 * Dates use the native picker deliberately.
 *
 * A custom calendar is a lot of code and a worse experience on a phone, which is
 * where most dates get set in this app. iOS and Android both give a good wheel
 * for free. `[color-scheme:light]` keeps the native widget matching the app
 * rather than following the OS setting.
 */
export function DateInput({ className, ...props }: ComponentPropsWithRef<'input'>) {
  return (
    <input
      type="date"
      className={cn(field, 'h-9 [color-scheme:light]', className)}
      {...props}
    />
  )
}
