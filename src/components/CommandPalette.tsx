import * as RadixDialog from '@radix-ui/react-dialog'
import { Command } from 'cmdk'
import { Zap } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { NAV_ITEMS } from '@/config/nav'
import { cn } from '@/lib/utils'

/**
 * Cmd+K. Navigation today; global search lands in prompt 5.
 *
 * Quick capture is the first item on purpose. Receiving a commandment has to be
 * the fastest thing the app does — two keystrokes from anywhere, including from
 * a screen that has nothing to do with the thing being captured.
 */
/**
 * cmdk renders the group heading into a `[cmdk-group-heading]` element, so it
 * has to be styled through a descendant variant. Utilities only — a custom class
 * like `t-section` cannot be applied through an arbitrary variant, it just
 * silently does nothing.
 */
const GROUP = [
  '[&_[cmdk-group-heading]]:px-2',
  '[&_[cmdk-group-heading]]:pb-1',
  '[&_[cmdk-group-heading]]:pt-2',
  '[&_[cmdk-group-heading]]:text-[11px]',
  '[&_[cmdk-group-heading]]:font-semibold',
  '[&_[cmdk-group-heading]]:uppercase',
  '[&_[cmdk-group-heading]]:tracking-[0.06em]',
  '[&_[cmdk-group-heading]]:text-text-3',
].join(' ')

export function CommandPalette({ onQuickCapture }: { onQuickCapture?: () => void }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const run = useCallback((action: () => void) => {
    setOpen(false)
    action()
  }, [])

  return (
    <RadixDialog.Root open={open} onOpenChange={setOpen}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={cn(
            'fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'duration-150 motion-reduce:animate-none'
          )}
        />
        <RadixDialog.Content
          aria-label="Command palette"
          className={cn(
            'fixed left-1/2 top-[15vh] z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2',
            'overflow-hidden rounded-xl border border-border bg-surface-4 shadow-2xl shadow-black/60',
            'focus:outline-none',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'duration-150 motion-reduce:animate-none'
          )}
        >
          <RadixDialog.Title className="sr-only">Command palette</RadixDialog.Title>
          <Command loop>
            <Command.Input
              autoFocus
              placeholder="Go to, or capture…"
              className={cn(
                'w-full border-b border-border bg-transparent px-4 py-3.5',
                'text-sm text-text placeholder:text-text-3 focus:outline-none'
              )}
            />
            <Command.List className="max-h-72 overflow-y-auto p-2">
              <Command.Empty className="px-2 py-6 text-center t-meta">
                Nothing matches that.
              </Command.Empty>

              {onQuickCapture ? (
                <Command.Group
                  heading="Capture"
                  className={GROUP}
                >
                  <PaletteItem
                    onSelect={() => {
                      run(onQuickCapture)
                    }}
                  >
                    <Zap className="size-4 text-accent" aria-hidden />
                    Quick capture
                  </PaletteItem>
                </Command.Group>
              ) : null}

              <Command.Group
                heading="Go to"
                className={GROUP}
              >
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                  <PaletteItem
                    key={to}
                    onSelect={() => {
                      run(() => {
                        void navigate(to)
                      })
                    }}
                  >
                    <Icon className="size-4 text-text-3" aria-hidden />
                    {label}
                  </PaletteItem>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

function PaletteItem({
  children,
  onSelect,
}: {
  children: React.ReactNode
  onSelect: () => void
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        'flex cursor-default select-none items-center gap-2.5 rounded-lg px-2 py-2',
        'text-sm text-text-2',
        'data-[selected=true]:bg-surface-3 data-[selected=true]:text-text'
      )}
    >
      {children}
    </Command.Item>
  )
}
