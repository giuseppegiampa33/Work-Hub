'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Command } from 'cmdk'
import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownLeft, Search, Ticket, Users } from 'lucide-react'
import { modalVariants, scrimVariants } from '@/config/motion'
import { TICKET_STATUS_DESCRIPTORS, type TicketStatus } from '@/config/tickets'
import { useWorkspaceSearch } from '@/features/search/queries'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Kbd } from '@/components/ui/misc'
import { Spinner } from '@/components/ui/spinner'
import { useVisibleNavItems } from './sidebar'
import { useSession } from './session-provider'

type PaletteContextValue = { open: () => void }
const PaletteContext = React.createContext<PaletteContextValue | null>(null)

export function useCommandPalette() {
  const context = React.useContext(PaletteContext)
  if (!context) throw new Error('useCommandPalette must be used inside the application shell')
  return context
}

/**
 * Command palette — the keyboard path through the app.
 *
 * Opens on ⌘K / Ctrl+K, lists navigation and create actions immediately, and
 * queries the workspace once the term reaches two characters. The result list
 * is already limited server-side, so there is nothing to virtualize.
 */
export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((previous) => !previous)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const value = React.useMemo(() => ({ open: () => setOpen(true) }), [])

  return (
    <PaletteContext.Provider value={value}>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </PaletteContext.Provider>
  )
}

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const { organizationId, can } = useSession()
  const navItems = useVisibleNavItems()
  const [term, setTerm] = React.useState('')
  const { data, isFetching } = useWorkspaceSearch(organizationId, term)

  React.useEffect(() => {
    if (!open) setTerm('')
  }, [open])

  const go = (href: string) => {
    onOpenChange(false)
    router.push(href)
  }

  const results = data ?? []
  const tickets = results.filter((row) => row.kind === 'ticket')
  const clients = results.filter((row) => row.kind === 'client')
  const members = results.filter((row) => row.kind === 'member')
  const searching = term.trim().length >= 2

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                variants={scrimVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="fixed inset-0 z-command bg-overlay/30"
              />
            </DialogPrimitive.Overlay>
            {/* Flex centring, not a Tailwind translate: Framer Motion owns
                `transform` on the panel and would overwrite it. */}
            <div className="pointer-events-none fixed inset-0 z-command flex items-start justify-center px-4 pt-[12vh]">
              <DialogPrimitive.Content asChild aria-describedby={undefined}>
                <motion.div
                  variants={modalVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className={cn(
                    'pointer-events-auto w-full max-w-[560px]',
                    'overflow-hidden rounded-lg border border-line bg-surface shadow-overlay gpu',
                  )}
                >
                <DialogPrimitive.Title className="sr-only">
                  Ricerca e comandi
                </DialogPrimitive.Title>
                <Command loop shouldFilter={!searching} className="flex flex-col">
                  <div className="flex items-center gap-2 border-b border-line-subtle px-3">
                    <Search className="size-4 shrink-0 text-fg-muted" aria-hidden />
                    <Command.Input
                      value={term}
                      onValueChange={setTerm}
                      placeholder="Cerca ticket, clienti, persone o vai a…"
                      className="h-11 w-full bg-transparent text-body text-fg outline-none placeholder:text-fg-disabled"
                    />
                    {isFetching ? <Spinner size={14} className="text-fg-muted" /> : null}
                    <Kbd className="hidden sm:inline-flex">Esc</Kbd>
                  </div>

                  <Command.List className="max-h-[min(420px,56dvh)] overflow-y-auto p-1.5">
                    {searching && results.length === 0 && !isFetching ? (
                      <Command.Empty className="px-3 py-6 text-center text-body-sm text-fg-muted">
                        Nessun risultato per “{term.trim()}”.
                      </Command.Empty>
                    ) : null}

                    {tickets.length > 0 ? (
                      <PaletteGroup heading="Ticket">
                        {tickets.map((row) => (
                          <PaletteItem
                            key={`ticket-${row.id}`}
                            value={`ticket-${row.id}`}
                            onSelect={() => go(`/tickets?ticket=${row.id}`)}
                            icon={<Ticket aria-hidden />}
                            title={row.title}
                            subtitle={row.subtitle}
                            trailing={
                              <span className="flex items-center gap-2">
                                <Badge
                                  tone={
                                    TICKET_STATUS_DESCRIPTORS[row.badge as TicketStatus]?.tone ??
                                    'neutral'
                                  }
                                  size="sm"
                                >
                                  {TICKET_STATUS_DESCRIPTORS[row.badge as TicketStatus]?.short ??
                                    row.badge}
                                </Badge>
                                <span className="text-caption text-fg-muted" data-numeric>
                                  #{row.reference}
                                </span>
                              </span>
                            }
                          />
                        ))}
                      </PaletteGroup>
                    ) : null}

                    {clients.length > 0 ? (
                      <PaletteGroup heading="Clienti">
                        {clients.map((row) => (
                          <PaletteItem
                            key={`client-${row.id}`}
                            value={`client-${row.id}`}
                            onSelect={() => go(`/clients/${row.id}`)}
                            icon={<Users aria-hidden />}
                            title={row.title}
                            subtitle={row.subtitle}
                          />
                        ))}
                      </PaletteGroup>
                    ) : null}

                    {members.length > 0 ? (
                      <PaletteGroup heading="Persone">
                        {members.map((row) => (
                          <PaletteItem
                            key={`member-${row.id}`}
                            value={`member-${row.id}`}
                            onSelect={() => go('/settings/members')}
                            icon={<Avatar id={row.id} name={row.title} size="xs" />}
                            title={row.title}
                            subtitle={row.subtitle}
                          />
                        ))}
                      </PaletteGroup>
                    ) : null}

                    {!searching ? (
                      <>
                        <PaletteGroup heading="Azioni">
                          {can('tickets:create') ? (
                            <PaletteItem
                              value="new-ticket"
                              onSelect={() => go('/tickets?new=1')}
                              icon={<Ticket aria-hidden />}
                              title="Nuovo ticket"
                              trailing={<Kbd>N</Kbd>}
                            />
                          ) : null}
                          {can('clients:manage') ? (
                            <PaletteItem
                              value="new-client"
                              onSelect={() => go('/clients?new=1')}
                              icon={<Users aria-hidden />}
                              title="Nuovo cliente"
                            />
                          ) : null}
                          {can('time:log') ? (
                            <PaletteItem
                              value="log-time"
                              onSelect={() => go('/calendar?log=1')}
                              icon={<CornerDownLeft aria-hidden />}
                              title="Registra ore"
                            />
                          ) : null}
                        </PaletteGroup>

                        <PaletteGroup heading="Vai a">
                          {navItems.map((item) => (
                            <PaletteItem
                              key={item.href}
                              value={`nav-${item.href}`}
                              onSelect={() => go(item.href)}
                              icon={<item.icon aria-hidden />}
                              title={item.label}
                            />
                          ))}
                        </PaletteGroup>
                      </>
                    ) : null}
                  </Command.List>
                </Command>
                </motion.div>
              </DialogPrimitive.Content>
            </div>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}

function PaletteGroup({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className={cn(
        '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2',
        '[&_[cmdk-group-heading]]:text-table-heading [&_[cmdk-group-heading]]:uppercase',
        '[&_[cmdk-group-heading]]:text-fg-muted',
      )}
    >
      {children}
    </Command.Group>
  )
}

function PaletteItem({
  value,
  onSelect,
  icon,
  title,
  subtitle,
  trailing,
}: {
  value: string
  onSelect: () => void
  icon?: React.ReactNode
  title: string
  subtitle?: string
  trailing?: React.ReactNode
}) {
  return (
    <Command.Item
      value={value}
      keywords={[title, subtitle ?? '']}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-2 py-2',
        'text-body-sm text-fg outline-none',
        'data-[selected=true]:bg-surface-hover',
        '[&>span>svg]:size-4 [&>span>svg]:text-fg-muted',
      )}
    >
      {icon ? <span className="flex shrink-0 items-center">{icon}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{title}</span>
        {subtitle && subtitle !== '—' ? (
          <span className="truncate text-caption text-fg-muted">{subtitle}</span>
        ) : null}
      </span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </Command.Item>
  )
}
