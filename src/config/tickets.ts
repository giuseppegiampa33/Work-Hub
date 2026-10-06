/**
 * Ticket vocabulary: statuses, priorities and their visual mapping.
 *
 * The `tone` of a status/priority maps onto a semantic colour token — never a
 * raw hue — and every badge always renders its label, so meaning is never
 * carried by colour alone.
 */

export const TICKET_STATUSES = [
  'new',
  'to_plan',
  'planned',
  'in_progress',
  'waiting_client',
  'waiting_internal',
  'resolved',
  'closed',
  'cancelled',
] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export const TICKET_PRIORITIES = ['critical', 'high', 'normal', 'low'] as const
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]

export type Tone = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'danger'

export type StatusDescriptor = {
  value: TicketStatus
  label: string
  short: string
  tone: Tone
  /** Open work: counted in “da lavorare”, eligible for overdue checks. */
  open: boolean
  /** Terminal states are excluded from workload metrics. */
  terminal: boolean
  description: string
}

export const TICKET_STATUS_DESCRIPTORS: Record<TicketStatus, StatusDescriptor> = {
  new: {
    value: 'new',
    label: 'Nuovo',
    short: 'Nuovo',
    tone: 'info',
    open: true,
    terminal: false,
    description: 'Richiesta appena ricevuta, non ancora valutata.',
  },
  to_plan: {
    value: 'to_plan',
    label: 'Da pianificare',
    short: 'Da pianif.',
    tone: 'warning',
    open: true,
    terminal: false,
    description: 'Valutata: serve una collocazione in calendario.',
  },
  planned: {
    value: 'planned',
    label: 'Pianificato',
    short: 'Pianificato',
    tone: 'brand',
    open: true,
    terminal: false,
    description: 'Ha almeno un evento pianificato in calendario.',
  },
  in_progress: {
    value: 'in_progress',
    label: 'In lavorazione',
    short: 'In corso',
    tone: 'brand',
    open: true,
    terminal: false,
    description: 'Lavoro attivo in questo momento.',
  },
  waiting_client: {
    value: 'waiting_client',
    label: 'In attesa cliente',
    short: 'Attesa cliente',
    tone: 'warning',
    open: true,
    terminal: false,
    description: 'Sospeso: si attende una risposta o un materiale dal cliente.',
  },
  waiting_internal: {
    value: 'waiting_internal',
    label: 'In attesa interna',
    short: 'Attesa interna',
    tone: 'warning',
    open: true,
    terminal: false,
    description: 'Sospeso: dipende da una persona o da un fornitore interno.',
  },
  resolved: {
    value: 'resolved',
    label: 'Risolto',
    short: 'Risolto',
    tone: 'success',
    open: false,
    terminal: false,
    description: 'Lavoro completato, in attesa di conferma o chiusura.',
  },
  closed: {
    value: 'closed',
    label: 'Chiuso',
    short: 'Chiuso',
    tone: 'neutral',
    open: false,
    terminal: true,
    description: 'Chiuso e archiviato.',
  },
  cancelled: {
    value: 'cancelled',
    label: 'Annullato',
    short: 'Annullato',
    tone: 'neutral',
    open: false,
    terminal: true,
    description: 'Non verrà lavorato.',
  },
}

export type PriorityDescriptor = {
  value: TicketPriority
  label: string
  tone: Tone
  /** Number of filled marks in the priority indicator (out of 4). */
  marks: number
  /** Sort weight — higher comes first. */
  weight: number
}

export const TICKET_PRIORITY_DESCRIPTORS: Record<TicketPriority, PriorityDescriptor> = {
  critical: { value: 'critical', label: 'Critica', tone: 'danger', marks: 4, weight: 40 },
  high: { value: 'high', label: 'Alta', tone: 'warning', marks: 3, weight: 30 },
  normal: { value: 'normal', label: 'Normale', tone: 'neutral', marks: 2, weight: 20 },
  low: { value: 'low', label: 'Bassa', tone: 'neutral', marks: 1, weight: 10 },
}

/** Statuses that represent work still on someone's plate. */
export const OPEN_TICKET_STATUSES: TicketStatus[] = TICKET_STATUSES.filter(
  (status) => TICKET_STATUS_DESCRIPTORS[status].open,
)

export const ACTIVE_TICKET_STATUSES: TicketStatus[] = TICKET_STATUSES.filter(
  (status) => !TICKET_STATUS_DESCRIPTORS[status].terminal,
)

/** Column order for the board-style status breakdown in reports. */
export const TICKET_STATUS_ORDER: TicketStatus[] = [...TICKET_STATUSES]

export function statusLabel(status: TicketStatus): string {
  return TICKET_STATUS_DESCRIPTORS[status].label
}

export function priorityLabel(priority: TicketPriority): string {
  return TICKET_PRIORITY_DESCRIPTORS[priority].label
}

export function isOpenStatus(status: TicketStatus): boolean {
  return TICKET_STATUS_DESCRIPTORS[status].open
}

/** Timeline entry kinds recorded by the database triggers. */
export const TICKET_EVENT_TYPES = [
  'created',
  'status_changed',
  'priority_changed',
  'assignee_changed',
  'due_date_changed',
  'client_changed',
  'comment_added',
  'attachment_added',
  'event_linked',
  'time_logged',
] as const
export type TicketEventType = (typeof TICKET_EVENT_TYPES)[number]
