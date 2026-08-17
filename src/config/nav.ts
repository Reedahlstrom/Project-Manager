import { CalendarCheck, FolderKanban, Gauge, Star, Users, UserRoundCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** Shown in the mobile bottom bar. */
  primary: boolean
}

/**
 * All six are in the mobile bar.
 *
 * The original plan capped it at four, which left Scorecard reachable only via
 * Cmd+K — a shortcut that does not exist on a phone. A destination you cannot
 * tap is a destination you do not have. Five fits: at 390px that is 78px per
 * target, comfortably above the 44px minimum.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/today', label: 'Today', icon: CalendarCheck, primary: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban, primary: true },
  { to: '/people', label: 'People', icon: Users, primary: true },
  { to: '/paul', label: 'Paul', icon: UserRoundCheck, primary: true },
  { to: '/playbook', label: 'Know', icon: Star, primary: true },
  { to: '/scorecard', label: 'Score', icon: Gauge, primary: true },
]
