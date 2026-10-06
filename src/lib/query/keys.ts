/**
 * Query key factory.
 *
 * Every key starts with the organization id. Switching organization therefore
 * switches cache namespace: no cross-tenant data can ever be served from cache,
 * and invalidation can be scoped to a single tenant.
 */

export type TicketListFilters = {
  search?: string
  status?: string[]
  priority?: string[]
  clientId?: string | null
  assigneeId?: string | null
  categoryId?: string | null
  dueFrom?: string | null
  dueTo?: string | null
  sort?: string
  page?: number
}

export type ClientListFilters = {
  search?: string
  archived?: boolean
  page?: number
}

export type TimeEntryFilters = {
  from: string
  to: string
  userId?: string | null
  clientId?: string | null
  ticketId?: string | null
  page?: number
}

export const queryKeys = {
  org: (organizationId: string) => ['org', organizationId] as const,

  overview: (organizationId: string, from: string, to: string) =>
    ['org', organizationId, 'overview', from, to] as const,

  tickets: {
    all: (organizationId: string) => ['org', organizationId, 'tickets'] as const,
    list: (organizationId: string, filters: TicketListFilters) =>
      ['org', organizationId, 'tickets', 'list', filters] as const,
    detail: (organizationId: string, ticketId: string) =>
      ['org', organizationId, 'tickets', 'detail', ticketId] as const,
    comments: (organizationId: string, ticketId: string) =>
      ['org', organizationId, 'tickets', 'comments', ticketId] as const,
    events: (organizationId: string, ticketId: string) =>
      ['org', organizationId, 'tickets', 'events', ticketId] as const,
    attachments: (organizationId: string, ticketId: string) =>
      ['org', organizationId, 'tickets', 'attachments', ticketId] as const,
    related: (organizationId: string, ticketId: string) =>
      ['org', organizationId, 'tickets', 'related', ticketId] as const,
  },

  clients: {
    all: (organizationId: string) => ['org', organizationId, 'clients'] as const,
    list: (organizationId: string, filters: ClientListFilters) =>
      ['org', organizationId, 'clients', 'list', filters] as const,
    options: (organizationId: string) => ['org', organizationId, 'clients', 'options'] as const,
    detail: (organizationId: string, clientId: string) =>
      ['org', organizationId, 'clients', 'detail', clientId] as const,
    summary: (organizationId: string, clientId: string) =>
      ['org', organizationId, 'clients', 'summary', clientId] as const,
  },

  calendar: {
    all: (organizationId: string) => ['org', organizationId, 'calendar'] as const,
    week: (organizationId: string, weekStart: string, ownerId: string | null) =>
      ['org', organizationId, 'calendar', 'week', weekStart, ownerId ?? 'all'] as const,
  },

  time: {
    all: (organizationId: string) => ['org', organizationId, 'time'] as const,
    list: (organizationId: string, filters: TimeEntryFilters) =>
      ['org', organizationId, 'time', 'list', filters] as const,
  },

  reports: {
    all: (organizationId: string) => ['org', organizationId, 'reports'] as const,
    hoursByClient: (organizationId: string, from: string, to: string) =>
      ['org', organizationId, 'reports', 'hours-by-client', from, to] as const,
    hoursByCategory: (organizationId: string, from: string, to: string) =>
      ['org', organizationId, 'reports', 'hours-by-category', from, to] as const,
    hoursByMember: (organizationId: string, from: string, to: string) =>
      ['org', organizationId, 'reports', 'hours-by-member', from, to] as const,
    daily: (organizationId: string, from: string, to: string) =>
      ['org', organizationId, 'reports', 'daily', from, to] as const,
    ticketsBreakdown: (organizationId: string) =>
      ['org', organizationId, 'reports', 'tickets-breakdown'] as const,
  },

  members: {
    all: (organizationId: string) => ['org', organizationId, 'members'] as const,
    list: (organizationId: string) => ['org', organizationId, 'members', 'list'] as const,
    invites: (organizationId: string) => ['org', organizationId, 'members', 'invites'] as const,
  },

  taxonomy: {
    all: (organizationId: string) => ['org', organizationId, 'taxonomy'] as const,
    categories: (organizationId: string) => ['org', organizationId, 'taxonomy', 'categories'] as const,
    activityTypes: (organizationId: string, categoryId?: string | null) =>
      ['org', organizationId, 'taxonomy', 'activity-types', categoryId ?? 'all'] as const,
  },

  notifications: (organizationId: string) => ['org', organizationId, 'notifications'] as const,

  auditLogs: (organizationId: string, page: number) =>
    ['org', organizationId, 'audit', page] as const,

  search: (organizationId: string, term: string) =>
    ['org', organizationId, 'search', term] as const,
}
