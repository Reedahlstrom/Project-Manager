import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type Option = { value: string; label: string }

export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  className,
  'aria-label': ariaLabel,
}: {
  // Required, but allowed to be undefined — under `exactOptionalPropertyTypes`
  // an optional prop cannot receive an explicit undefined, and "nothing selected
  // yet" is a normal state for a form field.
  value: string | undefined
  onValueChange?: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  'aria-label'?: string
}) {
  // Spread conditionally rather than passing `undefined`: under
  // `exactOptionalPropertyTypes` an explicit undefined is not the same as an
  // absent prop, and Radix declares both of these optional.
  const controlled = {
    ...(value !== undefined && { value }),
    ...(onValueChange !== undefined && { onValueChange }),
  }

  return (
    <RadixSelect.Root {...controlled}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        className={cn(
          'inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg',
          'border border-border bg-surface-2 px-3 text-sm text-text',
          'transition-colors duration-150 ease-out hover:border-border-strong',
          'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
          'data-[placeholder]:text-text-3',
          className
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown className="size-4 text-text-3" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden',
            'rounded-lg border border-border bg-surface-3 p-1 shadow-xl shadow-black/40'
          )}
        >
          <RadixSelect.Viewport>
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                className={cn(
                  'relative flex cursor-default select-none items-center rounded-md',
                  'py-1.5 pl-7 pr-2 text-sm text-text-2 outline-none',
                  'data-[highlighted]:bg-surface-4 data-[highlighted]:text-text',
                  'data-[state=checked]:text-text'
                )}
              >
                <RadixSelect.ItemIndicator className="absolute left-2">
                  <Check className="size-3.5 text-accent" />
                </RadixSelect.ItemIndicator>
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-text-2">
      {children}
    </label>
  )
}
