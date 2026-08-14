import { Search } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { CommandPalette } from '@/components/CommandPalette'
import { Toaster } from '@/components/ui/Toaster'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { NAV_ITEMS } from '@/config/nav'
import { cn } from '@/lib/utils'

// Placeholder until auth lands. Prompt 4 replaces this with the signed-in user.
const CURRENT_USER = { name: 'Reed', initials: 'R' }

export function AppShell() {
  const primary = NAV_ITEMS.filter((item) => item.primary)
  const navigate = useNavigate()

  return (
    <TooltipProvider>
      <div className="min-h-dvh bg-bg text-text">
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r border-border bg-surface-1 md:flex">
          <div className="px-4 pb-4 pt-6">
            <p className="text-sm font-semibold tracking-tight text-text">Mega Projects</p>
            <p className="mt-0.5 t-meta">Alta Labs</p>
          </div>

          <button
            type="button"
            onClick={() => {
              // Reuse the real shortcut so there is one code path to keep working.
              document.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
              )
            }}
            className={cn(
              'mx-3 mb-3 flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5',
              'text-left text-[13px] text-text-3 transition-colors duration-150 ease-out',
              'hover:border-border-strong hover:text-text-2'
            )}
          >
            <Search className="size-3.5 shrink-0" aria-hidden />
            <span className="flex-1">Search</span>
            <kbd className="rounded border border-border px-1 font-sans text-[10px] text-text-3">
              ⌘K
            </kbd>
          </button>

          <nav className="flex flex-1 flex-col gap-0.5 px-3">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm',
                    'transition-colors duration-150 ease-out',
                    isActive
                      ? 'bg-surface-3 font-medium text-text'
                      : 'text-text-2 hover:bg-surface-2 hover:text-text'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn('size-4 shrink-0', isActive ? 'text-accent' : '')}
                      aria-hidden
                    />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2.5 border-t border-border px-4 py-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[11px] font-medium text-text-2">
              {CURRENT_USER.initials}
            </span>
            <span className="text-[13px] text-text-2">{CURRENT_USER.name}</span>
          </div>
        </aside>

        <main className="pb-20 md:pb-0 md:pl-56">
          <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
            <Outlet />
          </div>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-surface-1/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          {primary.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[10px]',
                  'transition-colors duration-150 ease-out',
                  isActive ? 'text-accent' : 'text-text-3'
                )
              }
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Quick capture sends you to Today, where the capture field lives.
            Prompt 4 replaces this with capture that happens in place. */}
        <CommandPalette
          onQuickCapture={() => {
            void navigate('/today')
            window.requestAnimationFrame(() => {
              document.querySelector<HTMLInputElement>('[data-capture-field]')?.focus()
            })
          }}
        />
        <Toaster />
      </div>
    </TooltipProvider>
  )
}
