import { CalendarCheck, FolderKanban, Gauge, Users, UserRoundCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** Shown in the mobile bottom bar. Four maximum — the bar gets unusable past that. */
  primary: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/today', label: 'Today', icon: CalendarCheck, primary: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban, primary: true },
  { to: '/people', label: 'People', icon: Users, primary: true },
  { to: '/paul', label: 'Paul', icon: UserRoundCheck, primary: true },
  { to: '/scorecard', label: 'Scorecard', icon: Gauge, primary: false },
]
