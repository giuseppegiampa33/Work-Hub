'use client'

import * as React from 'react'
import type { OrgRole, Permission } from '@/config/roles'
import { roleHas, roleHasAny } from '@/config/roles'

export type SessionOrganization = {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  role: OrgRole
}

export type SessionView = {
  userId: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  organizations: SessionOrganization[]
  activeOrganization: SessionOrganization
}

type SessionContextValue = SessionView & {
  organizationId: string
  role: OrgRole
  can: (permission: Permission) => boolean
  canAny: (permissions: readonly Permission[]) => boolean
  isOwnerOrAdmin: boolean
}

const SessionContext = React.createContext<SessionContextValue | null>(null)

/**
 * Makes the server-resolved session available to client components.
 *
 * Permissions are checked here only to decide what to *render*; the server
 * action and the RLS policy decide what actually happens. Hiding a button is a
 * usability choice, never a security boundary.
 */
export function SessionProvider({
  value,
  children,
}: {
  value: SessionView
  children: React.ReactNode
}) {
  const contextValue = React.useMemo<SessionContextValue>(() => {
    const role = value.activeOrganization.role
    return {
      ...value,
      organizationId: value.activeOrganization.id,
      role,
      can: (permission: Permission) => roleHas(role, permission),
      canAny: (permissions: readonly Permission[]) => roleHasAny(role, permissions),
      isOwnerOrAdmin: role === 'owner' || role === 'admin',
    }
  }, [value])

  return <SessionContext.Provider value={contextValue}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const context = React.useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used inside the application shell')
  }
  return context
}

/** Renders children only when the active role holds the permission. */
export function Can({
  permission,
  any,
  children,
  fallback = null,
}: {
  permission?: Permission
  any?: readonly Permission[]
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { can, canAny } = useSession()
  const allowed = permission ? can(permission) : any ? canAny(any) : true
  return <>{allowed ? children : fallback}</>
}
