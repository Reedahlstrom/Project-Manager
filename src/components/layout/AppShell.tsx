import { NavLink, Outlet } from 'react-router-dom'

import { NAV_ITEMS } from '@/config/nav'
import { cn } from '@/lib/utils'

/**
 * The app shell: sidebar on desktop, bottom bar on mobile.
 *
 * Prompt 3 does the real design pass on this — including the Cmd+K trigger and
 * the signed-in user. This version exists so the routes have somewhere to live.
 */
export function AppShell() {
  const primary = NAV_ITEMS.filter((item) => item.primary)

  return (
    <div className="min-h-dvh bg-bg text-text">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-border bg-surface-1 md:flex">
        <div className="px-5 py-6">
          <span className="text-sm font-semibold tracking-tight text-text">Cadence</span>
          <p className="mt-0.5 text-xs text-text-3">Alta Labs</p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150',
                  isActive
                    ? 'bg-surface-3 text-text'
                    : 'text-text-2 hover:bg-surface-2 hover:text-text'
                )
              }
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="pb-20 md:pb-0 md:pl-60">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-surface-1/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {primary.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors duration-150',
                isActive ? 'text-accent' : 'text-text-3'
              )
            }
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
