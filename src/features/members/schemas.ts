import { z } from 'zod'
import { SITE_URL } from '@/config/app'
import { INVITABLE_ROLES, ORG_ROLES } from '@/config/roles'

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Inserisci un indirizzo email valido.'),
  role: z.enum(INVITABLE_ROLES),
})

export const updateMemberRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(ORG_ROLES),
})

/** Canonical invite link. Kept next to the schema so both sides agree on it. */
export function inviteUrl(token: string): string {
  return `${SITE_URL}/invite/${token}`
}
