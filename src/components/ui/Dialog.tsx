import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Dialog and Sheet share Radix's primitive and differ only in how they arrive.
 *
 * Sheet is the one used for editing on a phone: it slides from the bottom, which
 * puts the form under the thumb rather than under the notch.
 *
 * The `motion-reduce:` variants are not decoration — they are the
 * prefers-reduced-motion contract. Every animation in this app has one.
 */

const overlay = cn(
  'fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]',
  'data-[state=open]:animate-in data-[state=open]:fade-in-0',
  'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
  'duration-150 motion-reduce:animate-none'
)

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  // Always controlled. `exactOptionalPropertyTypes` makes an optional-and-
  // undefined prop unassignable to Radix's `open?: boolean`, and a dialog whose
  // open state lives somewhere you can't see is a bug waiting to happen anyway.
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={overlay} />
        <RadixDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2',
            'rounded-xl border border-border bg-surface-4 p-5 shadow-2xl shadow-black/60',
            'focus:outline-none',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'duration-150 motion-reduce:animate-none'
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <RadixDialog.Title className="text-base font-semibold text-text">
                {title}
              </RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-1 t-body">
                  {description}
                </RadixDialog.Description>
              ) : null}
            </div>
            <RadixDialog.Close
              aria-label="Close"
              className="-mr-1 -mt-1 rounded-md p-1 text-text-3 transition-colors duration-150 hover:bg-surface-3 hover:text-text"
            >
              <X className="size-4" />
            </RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  // Always controlled. `exactOptionalPropertyTypes` makes an optional-and-
  // undefined prop unassignable to Radix's `open?: boolean`, and a dialog whose
  // open state lives somewhere you can't see is a bug waiting to happen anyway.
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={overlay} />
        <RadixDialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto',
            'rounded-t-2xl border-t border-border bg-surface-4 p-5',
            'pb-[calc(1.25rem+env(safe-area-inset-bottom))]',
            'focus:outline-none',
            // On desktop it becomes a right-hand panel instead.
            'sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[26rem]',
            'sm:rounded-none sm:rounded-l-2xl sm:border-l sm:border-t-0',
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom',
            'sm:data-[state=open]:slide-in-from-right sm:data-[state=open]:slide-in-from-bottom-0',
            'duration-200 motion-reduce:animate-none'
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <RadixDialog.Title className="text-base font-semibold text-text">
                {title}
              </RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-1 t-body">
                  {description}
                </RadixDialog.Description>
              ) : null}
            </div>
            <RadixDialog.Close
              aria-label="Close"
              className="-mr-1 -mt-1 rounded-md p-1 text-text-3 transition-colors duration-150 hover:bg-surface-3 hover:text-text"
            >
              <X className="size-4" />
            </RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
