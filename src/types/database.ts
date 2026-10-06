/**
 * Typed contract for the Supabase schema (see `supabase/migrations`).
 *
 * Hand-maintained rather than generated: the shape is small enough to review,
 * and keeping it in the repo means `npm run typecheck` fails the moment a query
 * drifts from the schema. Relationships are declared so PostgREST embedded
 * selects (`client:clients(name)`) stay type-safe instead of being cast.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

/** Columns with a database default or a trigger-provided value. */
type WithDefaults<Row, Optional extends keyof Row> = Omit<Row, Optional> &
  Partial<Pick<Row, Optional>>

type Timestamps = 'id' | 'created_at' | 'updated_at'

export type OrgRole = 'owner' | 'admin' | 'manager' | 'operator' | 'guest'

export type TicketStatusDb =
  | 'new'
  | 'to_plan'
  | 'planned'
  | 'in_progress'
  | 'waiting_client'
  | 'waiting_internal'
  | 'resolved'
  | 'closed'
  | 'cancelled'

export type TicketPriorityDb = 'critical' | 'high' | 'normal' | 'low'

export type TicketEventTypeDb =
  | 'created'
  | 'status_changed'
  | 'priority_changed'
  | 'assignee_changed'
  | 'due_date_changed'
  | 'client_changed'
  | 'comment_added'
  | 'attachment_added'
  | 'event_linked'
  | 'time_logged'

export type SemanticTone = 'brand' | 'info' | 'success' | 'warning' | 'danger' | 'neutral'

/* -------------------------------------------------------------------------- */
/* Row shapes                                                                 */
/* -------------------------------------------------------------------------- */

export type ProfileRow = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type OrganizationRow = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type OrganizationMemberRow = {
  id: string
  organization_id: string
  user_id: string
  role: OrgRole
  created_at: string
  updated_at: string
}

export type InviteRow = {
  id: string
  organization_id: string
  email: string
  role: OrgRole
  token: string
  invited_by: string | null
  expires_at: string
  accepted_at: string | null
  accepted_by: string | null
  revoked_at: string | null
  created_at: string
  updated_at: string
}

export type CategoryRow = {
  id: string
  organization_id: string
  name: string
  tone: SemanticTone
  icon: string | null
  position: number
  is_archived: boolean
  created_at: string
  updated_at: string
}

export type ActivityTypeRow = {
  id: string
  organization_id: string
  category_id: string
  name: string
  default_duration_minutes: number
  position: number
  is_archived: boolean
  created_at: string
  updated_at: string
}

export type ClientRow = {
  id: string
  organization_id: string
  name: string
  code: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  is_archived: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ClientMemberRow = {
  id: string
  organization_id: string
  client_id: string
  user_id: string
  created_at: string
}

export type TicketRow = {
  id: string
  organization_id: string
  reference: number
  client_id: string | null
  creator_id: string | null
  assignee_id: string | null
  category_id: string | null
  activity_type_id: string | null
  title: string
  description: string | null
  status: TicketStatusDb
  priority: TicketPriorityDb
  due_date: string | null
  resolved_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export type TicketWatcherRow = {
  id: string
  organization_id: string
  ticket_id: string
  user_id: string
  created_at: string
}

export type TicketCommentRow = {
  id: string
  organization_id: string
  ticket_id: string
  author_id: string | null
  body: string
  created_at: string
  updated_at: string
}

export type TicketAttachmentRow = {
  id: string
  organization_id: string
  ticket_id: string
  uploaded_by: string | null
  storage_path: string
  file_name: string
  mime_type: string | null
  size_bytes: number
  created_at: string
}

export type TicketEventRow = {
  id: string
  organization_id: string
  ticket_id: string
  actor_id: string | null
  type: TicketEventTypeDb
  from_value: string | null
  to_value: string | null
  metadata: Json | null
  created_at: string
}

export type CalendarEventRow = {
  id: string
  organization_id: string
  owner_id: string
  ticket_id: string | null
  client_id: string | null
  category_id: string | null
  activity_type_id: string | null
  title: string
  description: string | null
  starts_at: string
  ends_at: string
  is_planned: boolean
  is_completed: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type TimeEntryRow = {
  id: string
  organization_id: string
  user_id: string
  client_id: string | null
  ticket_id: string | null
  category_id: string | null
  activity_type_id: string | null
  calendar_event_id: string | null
  entry_date: string
  start_time: string | null
  end_time: string | null
  duration_minutes: number
  description: string | null
  is_billable: boolean
  created_at: string
  updated_at: string
}

export type NotificationRow = {
  id: string
  organization_id: string
  user_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

export type AuditLogRow = {
  id: string
  organization_id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Json | null
  created_at: string
}

/* -------------------------------------------------------------------------- */
/* Function payloads                                                          */
/* -------------------------------------------------------------------------- */

export type InvitePreviewResult = {
  organization_id: string
  organization_name: string
  organization_logo_url: string | null
  email: string
  role: OrgRole
  expires_at: string
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
}

export type PendingInviteResult = {
  token: string
  organization_id: string
  organization_name: string
  role: OrgRole
  expires_at: string
}

export type HoursByClientRow = {
  client_id: string | null
  client_name: string
  minutes: number
  billable_minutes: number
  entries: number
  tickets: number
}

export type HoursByCategoryRow = {
  category_id: string | null
  category_name: string
  tone: SemanticTone
  activity_type_id: string | null
  activity_type_name: string
  minutes: number
  entries: number
}

export type HoursByMemberRow = {
  user_id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  minutes: number
  billable_minutes: number
  entries: number
  days_logged: number
}

export type TicketsBreakdownRow = {
  status: TicketStatusDb
  priority: TicketPriorityDb
  total: number
}

export type DailyHoursRow = {
  day: string
  minutes: number
  billable_minutes: number
}

export type SearchResultRow = {
  kind: 'ticket' | 'client' | 'member'
  id: string
  title: string
  subtitle: string
  badge: string
  reference: number | null
}

export type OrganizationOverview = {
  tickets: {
    open: number
    unassigned: number
    mine: number
    overdue: number
    due_in_range: number
    resolved_in_range: number
    by_status: Partial<Record<TicketStatusDb, number>>
    by_priority: Partial<Record<TicketPriorityDb, number>>
  } | null
  time: {
    minutes_in_range: number
    my_minutes_in_range: number
    billable_minutes_in_range: number
    entries_in_range: number
  } | null
  calendar: {
    planned: number
    completed: number
    mine: number
    planned_minutes: number
  } | null
  counts: {
    clients: number
    members: number
    categories: number
    pending_invites: number
  }
}

/* -------------------------------------------------------------------------- */
/* Database                                                                   */
/* -------------------------------------------------------------------------- */

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: WithDefaults<ProfileRow, 'created_at' | 'updated_at'>
        Update: Partial<ProfileRow>
        Relationships: []
      }
      organizations: {
        Row: OrganizationRow
        Insert: WithDefaults<OrganizationRow, Timestamps | 'logo_url' | 'created_by'>
        Update: Partial<OrganizationRow>
        Relationships: [
          {
            foreignKeyName: 'organizations_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      organization_members: {
        Row: OrganizationMemberRow
        Insert: WithDefaults<OrganizationMemberRow, Timestamps | 'role'>
        Update: Partial<OrganizationMemberRow>
        Relationships: [
          {
            foreignKeyName: 'organization_members_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      invites: {
        Row: InviteRow
        Insert: WithDefaults<
          InviteRow,
          | Timestamps
          | 'token'
          | 'role'
          | 'expires_at'
          | 'accepted_at'
          | 'accepted_by'
          | 'revoked_at'
          | 'invited_by'
        >
        Update: Partial<InviteRow>
        Relationships: [
          {
            foreignKeyName: 'invites_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invites_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invites_accepted_by_fkey'
            columns: ['accepted_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      categories: {
        Row: CategoryRow
        Insert: WithDefaults<
          CategoryRow,
          Timestamps | 'tone' | 'icon' | 'position' | 'is_archived'
        >
        Update: Partial<CategoryRow>
        Relationships: [
          {
            foreignKeyName: 'categories_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      activity_types: {
        Row: ActivityTypeRow
        Insert: WithDefaults<
          ActivityTypeRow,
          Timestamps | 'default_duration_minutes' | 'position' | 'is_archived'
        >
        Update: Partial<ActivityTypeRow>
        Relationships: [
          {
            foreignKeyName: 'activity_types_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_types_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      clients: {
        Row: ClientRow
        Insert: WithDefaults<
          ClientRow,
          | Timestamps
          | 'code'
          | 'email'
          | 'phone'
          | 'address'
          | 'notes'
          | 'is_archived'
          | 'created_by'
        >
        Update: Partial<ClientRow>
        Relationships: [
          {
            foreignKeyName: 'clients_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'clients_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      client_members: {
        Row: ClientMemberRow
        Insert: WithDefaults<ClientMemberRow, 'id' | 'created_at'>
        Update: Partial<ClientMemberRow>
        Relationships: [
          {
            foreignKeyName: 'client_members_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      tickets: {
        Row: TicketRow
        Insert: WithDefaults<
          TicketRow,
          | Timestamps
          | 'reference'
          | 'status'
          | 'priority'
          | 'client_id'
          | 'creator_id'
          | 'assignee_id'
          | 'category_id'
          | 'activity_type_id'
          | 'description'
          | 'due_date'
          | 'resolved_at'
          | 'closed_at'
        >
        Update: Partial<TicketRow>
        Relationships: [
          {
            foreignKeyName: 'tickets_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_creator_id_fkey'
            columns: ['creator_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_assignee_id_fkey'
            columns: ['assignee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_activity_type_id_fkey'
            columns: ['activity_type_id']
            isOneToOne: false
            referencedRelation: 'activity_types'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_watchers: {
        Row: TicketWatcherRow
        Insert: WithDefaults<TicketWatcherRow, 'id' | 'created_at'>
        Update: Partial<TicketWatcherRow>
        Relationships: [
          {
            foreignKeyName: 'ticket_watchers_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_watchers_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_comments: {
        Row: TicketCommentRow
        Insert: WithDefaults<TicketCommentRow, Timestamps | 'author_id'>
        Update: Partial<TicketCommentRow>
        Relationships: [
          {
            foreignKeyName: 'ticket_comments_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_comments_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_attachments: {
        Row: TicketAttachmentRow
        Insert: WithDefaults<
          TicketAttachmentRow,
          'id' | 'created_at' | 'uploaded_by' | 'mime_type' | 'size_bytes'
        >
        Update: Partial<TicketAttachmentRow>
        Relationships: [
          {
            foreignKeyName: 'ticket_attachments_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_attachments_uploaded_by_fkey'
            columns: ['uploaded_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_events: {
        Row: TicketEventRow
        Insert: WithDefaults<
          TicketEventRow,
          'id' | 'created_at' | 'actor_id' | 'from_value' | 'to_value' | 'metadata'
        >
        Update: Partial<TicketEventRow>
        Relationships: [
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_events_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      calendar_events: {
        Row: CalendarEventRow
        Insert: WithDefaults<
          CalendarEventRow,
          | Timestamps
          | 'ticket_id'
          | 'client_id'
          | 'category_id'
          | 'activity_type_id'
          | 'description'
          | 'is_planned'
          | 'is_completed'
          | 'created_by'
        >
        Update: Partial<CalendarEventRow>
        Relationships: [
          {
            foreignKeyName: 'calendar_events_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'calendar_events_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'calendar_events_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'calendar_events_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'calendar_events_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'calendar_events_activity_type_id_fkey'
            columns: ['activity_type_id']
            isOneToOne: false
            referencedRelation: 'activity_types'
            referencedColumns: ['id']
          },
        ]
      }
      time_entries: {
        Row: TimeEntryRow
        Insert: WithDefaults<
          TimeEntryRow,
          | Timestamps
          | 'client_id'
          | 'ticket_id'
          | 'category_id'
          | 'activity_type_id'
          | 'calendar_event_id'
          | 'start_time'
          | 'end_time'
          | 'description'
          | 'is_billable'
        >
        Update: Partial<TimeEntryRow>
        Relationships: [
          {
            foreignKeyName: 'time_entries_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'time_entries_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'time_entries_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'time_entries_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'time_entries_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'time_entries_activity_type_id_fkey'
            columns: ['activity_type_id']
            isOneToOne: false
            referencedRelation: 'activity_types'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'time_entries_calendar_event_id_fkey'
            columns: ['calendar_event_id']
            isOneToOne: false
            referencedRelation: 'calendar_events'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: NotificationRow
        Insert: WithDefaults<NotificationRow, 'id' | 'created_at' | 'body' | 'link' | 'read_at'>
        Update: Partial<NotificationRow>
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      audit_logs: {
        Row: AuditLogRow
        Insert: WithDefaults<
          AuditLogRow,
          'id' | 'created_at' | 'actor_id' | 'entity_id' | 'metadata'
        >
        Update: Partial<AuditLogRow>
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<never, never>
    Functions: {
      create_organization: {
        Args: { p_name: string; p_slug: string }
        Returns: OrganizationRow
      }
      organization_slug_available: {
        Args: { p_slug: string }
        Returns: boolean
      }
      invite_preview: {
        Args: { p_token: string }
        Returns: InvitePreviewResult[]
      }
      my_pending_invites: {
        Args: Record<PropertyKey, never>
        Returns: PendingInviteResult[]
      }
      accept_invite: {
        Args: { p_token: string }
        Returns: string
      }
      organization_overview: {
        Args: { p_org: string; p_from: string; p_to: string }
        Returns: Json
      }
      report_hours_by_client: {
        Args: { p_org: string; p_from: string; p_to: string }
        Returns: HoursByClientRow[]
      }
      report_hours_by_category: {
        Args: { p_org: string; p_from: string; p_to: string }
        Returns: HoursByCategoryRow[]
      }
      report_hours_by_member: {
        Args: { p_org: string; p_from: string; p_to: string }
        Returns: HoursByMemberRow[]
      }
      report_tickets_breakdown: {
        Args: { p_org: string }
        Returns: TicketsBreakdownRow[]
      }
      report_daily_hours: {
        Args: { p_org: string; p_from: string; p_to: string }
        Returns: DailyHoursRow[]
      }
      search_workspace: {
        Args: { p_org: string; p_query: string; p_limit?: number }
        Returns: SearchResultRow[]
      }
      complete_calendar_event: {
        Args: {
          p_event: string
          p_duration_minutes?: number | null
          p_description?: string | null
          p_is_billable?: boolean
          /** Fuso del client, così l'ora registrata è quella di lavoro. */
          p_timezone?: string
        }
        Returns: string
      }
      is_org_member: { Args: { p_org: string }; Returns: boolean }
      current_org_role: { Args: { p_org: string }; Returns: OrgRole }
      has_org_permission: { Args: { p_org: string; p_permission: string }; Returns: boolean }
    }
    Enums: {
      org_role: OrgRole
      ticket_status: TicketStatusDb
      ticket_priority: TicketPriorityDb
      ticket_event_type: TicketEventTypeDb
      semantic_tone: SemanticTone
    }
    CompositeTypes: Record<never, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type InsertDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type UpdateDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
