import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

const field = [
  'w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-text',
  'transition-colors duration-150 ease-out',
  'placeholder:text-text-3',
  'hover:border-border-strong',
  'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
  'disabled:opacity-40',
].join(' ')

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, 'h-9', className)} {...props} />
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, 'min-h-24 py-2 leading-relaxed', className)} {...props} />
}

/**
 * Dates use the native picker deliberately.
 *
 * A custom calendar is a lot of code and a worse experience on a phone, which is
 * where most dates get set in this app. iOS and Android both give a good wheel
 * for free. `[color-scheme:dark]` is what makes the native widget render dark
 * instead of a white rectangle.
 */
export function DateInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="date"
      className={cn(field, 'h-9 [color-scheme:dark]', className)}
      {...props}
    />
  )
}
