import {
  CalendarDays,
  ChartNoAxesColumn,
  LayoutDashboard,
  Settings,
  Ticket,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Permission } from './roles'

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  /** Hidden when the active role holds none of these permissions. */
  permissions?: readonly Permission[]
  /** Shown in the mobile bottom bar (max 5 entries). */
  mobile?: boolean
  /** Short label for the mobile bar. */
  mobileLabel?: string
}

export const PRIMARY_NAV: readonly NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    mobile: true,
    mobileLabel: 'Home',
  },
  {
    href: '/tickets',
    label: 'Ticket',
    icon: Ticket,
    permissions: ['tickets:view'],
    mobile: true,
    mobileLabel: 'Ticket',
  },
  {
    href: '/calendar',
    label: 'Calendario',
    icon: CalendarDays,
    permissions: ['calendar:view'],
    mobile: true,
    mobileLabel: 'Agenda',
  },
  {
    href: '/clients',
    label: 'Clienti',
    icon: Users,
    permissions: ['clients:view'],
    mobile: true,
    mobileLabel: 'Clienti',
  },
  {
    href: '/reports',
    label: 'Report',
    icon: ChartNoAxesColumn,
    permissions: ['reports:view', 'time:view_own'],
  },
  {
    href: '/settings',
    label: 'Impostazioni',
    icon: Settings,
    mobile: true,
    mobileLabel: 'Altro',
  },
] as const

export type SettingsNavItem = {
  href: string
  label: string
  description: string
  permissions?: readonly Permission[]
}

export const SETTINGS_NAV: readonly SettingsNavItem[] = [
  {
    href: '/settings/profile',
    label: 'Profilo',
    description: 'Nome, avatar e password del tuo account personale.',
  },
  {
    href: '/settings/organization',
    label: 'Organizzazione',
    description: 'Nome, identificativo e logo dello spazio di lavoro.',
    permissions: ['org:manage'],
  },
  {
    href: '/settings/members',
    label: 'Membri e ruoli',
    description: 'Inviti, ruoli e rimozione dei membri del tenant.',
    permissions: ['members:view'],
  },
  {
    href: '/settings/taxonomy',
    label: 'Categorie e attività',
    description: 'Categorie di lavoro e tipi di attività usati in calendario e ore.',
    permissions: ['taxonomy:manage'],
  },
  {
    href: '/settings/audit',
    label: 'Registro attività',
    description: 'Operazioni critiche registrate sul tenant.',
    permissions: ['audit:view'],
  },
] as const

/** Routes that never require an active organization. */
export const ORG_FREE_ROUTES = ['/onboarding', '/invite', '/design-system', '/auth'] as const
