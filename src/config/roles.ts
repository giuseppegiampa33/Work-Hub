/**
 * Roles and permissions — scoped to a single organization.
 *
 * This file is the source of truth for the **client and server** permission
 * checks. The database mirrors the same matrix inside
 * `public.has_org_permission()` (see `supabase/migrations/0002_rls.sql`), so a
 * compromised client cannot widen its own rights: RLS is the last line.
 *
 * Changing the matrix here means changing it in that SQL function too.
 */

export const ORG_ROLES = ['owner', 'admin', 'manager', 'operator', 'guest'] as const
export type OrgRole = (typeof ORG_ROLES)[number]

export const PERMISSIONS = [
  'org:manage',
  'org:delete',
  'members:view',
  'members:invite',
  'members:remove',
  'members:update_role',
  'clients:view',
  'clients:manage',
  'tickets:view',
  'tickets:view_all',
  'tickets:create',
  'tickets:update',
  'tickets:assign',
  'tickets:delete',
  'tickets:comment',
  'calendar:view',
  'calendar:plan',
  'calendar:plan_others',
  'time:log',
  'time:view_own',
  'time:view_all',
  'reports:view',
  'taxonomy:manage',
  'audit:view',
] as const
export type Permission = (typeof PERMISSIONS)[number]

const OPERATOR_PERMISSIONS: Permission[] = [
  'members:view',
  'clients:view',
  'tickets:view',
  'tickets:view_all',
  'tickets:create',
  'tickets:update',
  'tickets:comment',
  'calendar:view',
  'calendar:plan',
  'time:log',
  'time:view_own',
]

const MANAGER_PERMISSIONS: Permission[] = [
  ...OPERATOR_PERMISSIONS,
  'members:invite',
  'clients:manage',
  'tickets:assign',
  'tickets:delete',
  'calendar:plan_others',
  'time:view_all',
  'reports:view',
  'taxonomy:manage',
  'audit:view',
]

const GUEST_PERMISSIONS: Permission[] = [
  'tickets:view',
  'tickets:comment',
  'clients:view',
  'calendar:view',
  'time:view_own',
]

const ADMIN_PERMISSIONS: Permission[] = [
  ...MANAGER_PERMISSIONS,
  'org:manage',
  'members:remove',
  'members:update_role',
]

/** Full matrix. `owner` holds every permission by definition. */
export const ROLE_PERMISSIONS: Record<OrgRole, readonly Permission[]> = {
  owner: PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  operator: OPERATOR_PERMISSIONS,
  guest: GUEST_PERMISSIONS,
}

export type RoleDescriptor = {
  value: OrgRole
  label: string
  summary: string
  /** Roles that may be assigned by a member holding `members:update_role`. */
  assignable: boolean
  /** Order in pickers and member lists — most privileged first. */
  rank: number
}

export const ROLE_DESCRIPTORS: Record<OrgRole, RoleDescriptor> = {
  owner: {
    value: 'owner',
    label: 'Proprietario',
    summary:
      "Controllo completo dell'organizzazione, incluse fatturazione ed eliminazione dello spazio di lavoro.",
    assignable: false,
    rank: 0,
  },
  admin: {
    value: 'admin',
    label: 'Amministratore',
    summary: 'Gestisce impostazioni, membri e ruoli. Vede e modifica tutti i dati del tenant.',
    assignable: true,
    rank: 1,
  },
  manager: {
    value: 'manager',
    label: 'Responsabile',
    summary:
      'Crea e assegna ticket, pianifica attività, gestisce clienti e tassonomia, consulta i report.',
    assignable: true,
    rank: 2,
  },
  operator: {
    value: 'operator',
    label: 'Operatore',
    summary: 'Lavora sui ticket, pianifica le proprie attività e registra le proprie ore.',
    assignable: true,
    rank: 3,
  },
  guest: {
    value: 'guest',
    label: 'Ospite',
    summary: 'Vede soltanto i ticket e i clienti a cui è stato aggiunto esplicitamente.',
    assignable: true,
    rank: 4,
  },
}

export const ASSIGNABLE_ROLES: OrgRole[] = ORG_ROLES.filter(
  (role) => ROLE_DESCRIPTORS[role].assignable,
)

/** Roles that can be offered in an invite. Ownership is never granted by link. */
export const INVITABLE_ROLES = ['admin', 'manager', 'operator', 'guest'] as const
export type InvitableRole = (typeof INVITABLE_ROLES)[number]

export const ROLES_BY_RANK: OrgRole[] = [...ORG_ROLES].sort(
  (a, b) => ROLE_DESCRIPTORS[a].rank - ROLE_DESCRIPTORS[b].rank,
)

export function roleLabel(role: OrgRole): string {
  return ROLE_DESCRIPTORS[role].label
}

/** Does `role` hold `permission` inside its organization? */
export function roleHas(role: OrgRole | null | undefined, permission: Permission): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role].includes(permission)
}

/** True when the role holds every listed permission. */
export function roleHasAll(
  role: OrgRole | null | undefined,
  permissions: readonly Permission[],
): boolean {
  return permissions.every((permission) => roleHas(role, permission))
}

/** True when the role holds at least one of the listed permissions. */
export function roleHasAny(
  role: OrgRole | null | undefined,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => roleHas(role, permission))
}

/** A member may never grant a role more privileged than their own. */
export function canAssignRole(actor: OrgRole, target: OrgRole): boolean {
  if (!roleHas(actor, 'members:update_role')) return false
  if (target === 'owner') return actor === 'owner'
  return ROLE_DESCRIPTORS[actor].rank <= ROLE_DESCRIPTORS[target].rank
}

/**
 * Which roles the actor may offer in an invite.
 * Owners and admins can invite anyone below ownership; managers can only bring
 * in people who will work under them.
 */
export function invitableRolesFor(actor: OrgRole): InvitableRole[] {
  if (!roleHas(actor, 'members:invite')) return []
  if (actor === 'owner' || actor === 'admin') return [...INVITABLE_ROLES]
  return ['operator', 'guest']
}

export function canInviteRole(actor: OrgRole, target: InvitableRole): boolean {
  return invitableRolesFor(actor).includes(target)
}
