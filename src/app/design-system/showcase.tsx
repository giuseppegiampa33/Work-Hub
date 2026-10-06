'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Inbox,
  Plus,
  Search,
  Ticket,
  Trash2,
} from 'lucide-react'
import { CALENDAR, PAGE_SIZE } from '@/config/app'
import { duration as durationTokens, easing, fontSize, radius, shadow, space, color } from '@/config/tokens'
import { ORG_ROLES, ROLE_DESCRIPTORS, ROLE_PERMISSIONS, roleLabel } from '@/config/roles'
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_STATUS_DESCRIPTORS,
  type TicketPriority,
  type TicketStatus,
} from '@/config/tickets'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Avatar, AvatarGroup, OrgMark, PersonChip } from '@/components/ui/avatar'
import {
  Badge,
  CountBadge,
  FilterChip,
  TicketPriorityBadge,
  TicketStatusBadge,
} from '@/components/ui/badge'
import { Button, IconButton } from '@/components/ui/button'
import { Card, CardBody, CardFooter, CardHeader, StatTile } from '@/components/ui/card'
import {
  CheckboxField,
  RadioCard,
  RadioGroup,
  SwitchField,
} from '@/components/ui/checkbox'
import { Combobox, MultiSelect } from '@/components/ui/combobox'
import { DateInput, DateRangePresets, TimeRangeInput } from '@/components/ui/date-input'
import { ConfirmDialog, DialogClose, DialogContent, Modal } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerSection } from '@/components/ui/drawer'
import { Field, FieldSet } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipProvider,
} from '@/components/ui/menu'
import { BarMeter, ColumnStrip, MeterRow } from '@/components/ui/meter'
import { CodeBlock, DetailRow, Kbd, SectionHeading, Separator } from '@/components/ui/misc'
import { Pagination } from '@/components/ui/pagination'
import { SimpleSelect } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  EmptyState,
  ErrorState,
  InlineEmpty,
  SchemaMissingState,
  Skeleton,
} from '@/components/ui/states'
import {
  SortableHeaderCell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableShell,
  TableToolbar,
} from '@/components/ui/table'
import {
  SegmentedControl,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { notify } from '@/components/ui/toast'

const SECTIONS = [
  { id: 'fondamenti', label: 'Fondamenti' },
  { id: 'colore', label: 'Colore' },
  { id: 'tipografia', label: 'Tipografia' },
  { id: 'forma', label: 'Forma e profondità' },
  { id: 'motion', label: 'Motion' },
  { id: 'azioni', label: 'Azioni' },
  { id: 'form', label: 'Form' },
  { id: 'stato', label: 'Stato e identità' },
  { id: 'dati', label: 'Dati' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'stati', label: 'Stati di contenuto' },
  { id: 'misure', label: 'Misure e report' },
  { id: 'ruoli', label: 'Ruoli' },
] as const

export function DesignSystemShowcase() {
  return (
    <TooltipProvider delayDuration={320}>
      <div className="min-h-dvh bg-canvas pt-safe">
        <header className="sticky top-0 z-header border-b border-line bg-canvas">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2.5">
              <span
                className="inline-flex size-7 items-center justify-center rounded-sm bg-brand text-body-sm font-semibold text-brand-contrast"
                aria-hidden
              >
                W
              </span>
              <div className="flex flex-col">
                <span className="text-subsection-title text-fg">Work-Hub · Design system</span>
                <span className="text-caption text-fg-muted">
                  Componenti reali, non immagini
                </span>
              </div>
            </div>
            <Button asChild variant="secondary" size="sm" iconAfter={<ArrowRight />}>
              <Link href="/login">Vai all&apos;app</Link>
            </Button>
          </div>
        </header>

        <div className="mx-auto grid max-w-[1180px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[180px_minmax(0,1fr)]">
          <nav aria-label="Sezioni" className="hidden lg:block">
            <ul className="sticky top-20 flex flex-col gap-0.5">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block rounded-sm px-2 py-1 text-body-sm text-fg-secondary transition-colors duration-fast hover:bg-surface-hover hover:text-fg"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <main id="main" className="flex min-w-0 flex-col gap-10">
            <IntroSection />
            <ColorSection />
            <TypographySection />
            <ShapeSection />
            <MotionSection />
            <ActionsSection />
            <FormSection />
            <StatusSection />
            <DataSection />
            <OverlaySection />
            <ContentStatesSection />
            <MeasuresSection />
            <RolesSection />
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}

/* -------------------------------------------------------------------------- */

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-4">
      <SectionHeading title={title} description={description} />
      {children}
    </section>
  )
}

function Specimen({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <h3 className="text-table-heading uppercase text-fg-muted">{label}</h3>
        {hint ? <span className="text-caption text-fg-disabled">{hint}</span> : null}
      </div>
      <div
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface p-4',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function IntroSection() {
  return (
    <Section
      id="fondamenti"
      title="Fondamenti"
      description="Operational editorial SaaS: superfici piatte, linee sottili, profondità solo dove qualcosa galleggia davvero. Nessun morfismo, nessuna decorazione."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            title: 'Densità prima di tutto',
            body: 'Riga tabella 44px, titoli brevi, numeri tabulari. Lo schermo serve a confrontare, non a riempire.',
          },
          {
            title: 'La linea raggruppa',
            body: 'Un bordo da 1px separa meglio di un’ombra. Le ombre sono riservate a popover, menu, drawer e modali.',
          },
          {
            title: 'Il motion informa',
            body: 'Fade e translate brevi che dicono da dove arriva una cosa. Nessun bounce, nessuno scale aggressivo.',
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardBody className="flex flex-col gap-1">
              <p className="text-subsection-title text-fg">{item.title}</p>
              <p className="text-body-sm text-fg-muted">{item.body}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </Section>
  )
}

function ColorSection() {
  const groups = [
    { label: 'Canvas e superfici', keys: ['canvas', 'canvas-sunken', 'surface', 'surface-muted', 'surface-sunken', 'surface-hover', 'surface-active', 'surface-selected'] },
    { label: 'Linee', keys: ['line-subtle', 'line', 'line-strong'] },
    { label: 'Testo', keys: ['fg', 'fg-secondary', 'fg-muted', 'fg-disabled', 'fg-inverse'] },
    { label: 'Brand', keys: ['brand', 'brand-hover', 'brand-active', 'brand-subtle', 'brand-line', 'brand-text'] },
    { label: 'Successo', keys: ['success', 'success-subtle', 'success-line', 'success-text'] },
    { label: 'Attenzione', keys: ['warning', 'warning-subtle', 'warning-line', 'warning-text'] },
    { label: 'Errore', keys: ['danger', 'danger-subtle', 'danger-line', 'danger-text'] },
    { label: 'Informazione', keys: ['info', 'info-subtle', 'info-line', 'info-text'] },
    { label: 'Neutro', keys: ['neutral', 'neutral-subtle', 'neutral-line', 'neutral-text'] },
  ] as const

  return (
    <Section
      id="colore"
      title="Colore"
      description="Token semantici: il nome dice il ruolo, non la tinta. Nessun componente usa un esadecimale quando esiste un token."
    >
      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            <h3 className="text-table-heading uppercase text-fg-muted">{group.label}</h3>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {group.keys.map((key) => (
                <li
                  key={key}
                  className="flex items-center gap-2.5 rounded-md border border-line bg-surface p-2"
                >
                  <span
                    className="size-8 shrink-0 rounded-sm border border-line-subtle"
                    style={{ backgroundColor: color[key as keyof typeof color] }}
                    aria-hidden
                  />
                  <span className="flex min-w-0 flex-col">
                    <code className="truncate font-mono text-caption text-fg">--color-{key}</code>
                    <code className="font-mono text-caption text-fg-muted">
                      {color[key as keyof typeof color]}
                    </code>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-line-subtle bg-surface-muted p-3">
        <p className="text-body-sm text-fg-secondary">
          Ogni colore di stato viaggia in quartetto: pieno, riempimento tenue, linea e tono del
          testo. È quello che rende leggibile un badge senza affidare il significato al colore.
        </p>
      </div>
    </Section>
  )
}

/**
 * Explicit class map: Tailwind only emits classes it can see as literals, so a
 * template string like `text-${role}` would silently produce no styles.
 */
const TYPE_CLASSES: Record<keyof typeof fontSize, string> = {
  display: 'text-display',
  'page-title': 'text-page-title',
  'section-title': 'text-section-title',
  'subsection-title': 'text-subsection-title',
  'table-heading': 'text-table-heading uppercase',
  body: 'text-body',
  'body-sm': 'text-body-sm',
  meta: 'text-meta',
  label: 'text-label',
  caption: 'text-caption',
  metric: 'text-metric',
}

function TypographySection() {
  const roles = Object.keys(fontSize) as (keyof typeof fontSize)[]

  return (
    <Section
      id="tipografia"
      title="Tipografia"
      description="Plus Jakarta Sans. Una scala per ruolo: nessuna pagina inventa una dimensione."
    >
      <ul className="flex flex-col divide-y divide-line-subtle rounded-md border border-line bg-surface">
        {roles.map((role) => (
          <li key={role} className="flex flex-wrap items-baseline gap-4 px-4 py-3">
            <code className="w-40 shrink-0 font-mono text-caption text-fg-muted">
              text-{role}
            </code>
            <span className={cn('min-w-0 flex-1 truncate', TYPE_CLASSES[role])}>
              Consuntivazione ore · 8h 30m
            </span>
            <code className="shrink-0 font-mono text-caption text-fg-disabled">
              {fontSize[role][0]} / {fontSize[role][1].lineHeight}
            </code>
          </li>
        ))}
      </ul>

      <Specimen label="Numeri tabulari" hint="durate, ore, date">
        <div className="flex flex-col gap-1">
          <span className="text-body-sm text-fg-muted">Senza tabular-nums</span>
          <code className="font-sans text-body">111,00 · 8h 05m · 1.284</code>
        </div>
        <Separator orientation="vertical" className="h-10" />
        <div className="flex flex-col gap-1">
          <span className="text-body-sm text-fg-muted">Con tabular-nums</span>
          <code className="font-sans text-body" data-numeric>
            111,00 · 8h 05m · 1.284
          </code>
        </div>
      </Specimen>
    </Section>
  )
}

function ShapeSection() {
  return (
    <Section
      id="forma"
      title="Forma e profondità"
      description="Raggi contenuti, bordi sottili, ombre quasi invisibili e solo per superfici che galleggiano."
    >
      <Specimen label="Border radius">
        {(Object.keys(radius) as (keyof typeof radius)[])
          .filter((key) => key !== 'none' && key !== 'full')
          .map((key) => (
            <div key={key} className="flex flex-col items-center gap-1.5">
              <span
                className="size-14 border border-line bg-surface-sunken"
                style={{ borderRadius: radius[key] }}
                aria-hidden
              />
              <code className="font-mono text-caption text-fg-muted">
                {key} · {radius[key]}
              </code>
            </div>
          ))}
      </Specimen>

      <Specimen label="Ombre" hint="solo overlay">
        {(Object.keys(shadow) as (keyof typeof shadow)[])
          .filter((key) => key !== 'none')
          .map((key) => (
            <div key={key} className="flex flex-col items-center gap-1.5">
              <span
                className="size-16 rounded-md bg-surface"
                style={{ boxShadow: shadow[key] }}
                aria-hidden
              />
              <code className="font-mono text-caption text-fg-muted">{key}</code>
            </div>
          ))}
      </Specimen>

      <Specimen label="Spaziatura" hint="scala 4px">
        {(['1', '2', '3', '4', '6', '8', '12', '16'] as const).map((key) => (
          <div key={key} className="flex flex-col items-center gap-1.5">
            <span className="flex h-10 items-end">
              <span
                className="w-4 bg-brand/25"
                style={{ height: space[key] }}
                aria-hidden
              />
            </span>
            <code className="font-mono text-caption text-fg-muted">
              {key} · {space[key]}
            </code>
          </div>
        ))}
      </Specimen>
    </Section>
  )
}

function MotionSection() {
  const [playing, setPlaying] = React.useState(false)

  return (
    <Section
      id="motion"
      title="Motion"
      description="Micro-interazioni 120–200ms, drawer 220–260ms, modali fade + 8px. Tutto rispetta prefers-reduced-motion."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader title="Durate" compact />
          <CardBody padded={false}>
            <ul className="divide-y divide-line-subtle">
              {(Object.keys(durationTokens) as (keyof typeof durationTokens)[]).map((key) => (
                <li key={key} className="flex items-center justify-between gap-3 px-4 py-2">
                  <code className="font-mono text-caption text-fg-secondary">
                    duration-{key}
                  </code>
                  <span className="text-meta text-fg-muted" data-numeric>
                    {durationTokens[key]}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Curve" compact />
          <CardBody padded={false}>
            <ul className="divide-y divide-line-subtle">
              {(Object.keys(easing) as (keyof typeof easing)[]).map((key) => (
                <li key={key} className="flex items-center justify-between gap-3 px-4 py-2">
                  <code className="font-mono text-caption text-fg-secondary">ease-{key}</code>
                  <code className="font-mono text-caption text-fg-muted">{easing[key]}</code>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <Specimen label="Transizione di stato" hint="hover e active cambiano solo il colore">
        <Button variant="primary" size="md">
          Passa sopra
        </Button>
        <Button variant="secondary" size="md">
          Passa sopra
        </Button>
        <Button
          variant="subtle"
          size="md"
          loading={playing}
          onClick={() => {
            setPlaying(true)
            setTimeout(() => setPlaying(false), 1200)
          }}
        >
          Mostra stato loading
        </Button>
      </Specimen>
    </Section>
  )
}

function ActionsSection() {
  return (
    <Section
      id="azioni"
      title="Azioni"
      description="Una sola azione primaria per vista. Le altre sono secondarie, ghost o distruttive."
    >
      <Specimen label="Varianti">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="subtle">Subtle</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="destructive-outline">Destructive outline</Button>
        <Button variant="link">Link</Button>
      </Specimen>

      <Specimen label="Dimensioni">
        <Button variant="secondary" size="xs">
          xs
        </Button>
        <Button variant="secondary" size="sm">
          sm
        </Button>
        <Button variant="secondary" size="md">
          md
        </Button>
        <Button variant="secondary" size="lg">
          lg
        </Button>
      </Specimen>

      <Specimen label="Stati">
        <Button variant="primary" icon={<Plus />}>
          Con icona
        </Button>
        <Button variant="primary" iconAfter={<ArrowRight />}>
          Icona dopo
        </Button>
        <Button variant="primary" loading>
          Loading
        </Button>
        <Button variant="primary" disabled>
          Disabled
        </Button>
        <Button variant="secondary" disabled>
          Disabled
        </Button>
      </Specimen>

      <Specimen label="Icon only" hint="aria-label obbligatorio">
        <IconButton label="Cerca">
          <Search aria-hidden />
        </IconButton>
        <IconButton label="Aggiungi" variant="secondary">
          <Plus aria-hidden />
        </IconButton>
        <IconButton label="Conferma" variant="primary">
          <Check aria-hidden />
        </IconButton>
        <IconButton label="Elimina" variant="destructive">
          <Trash2 aria-hidden />
        </IconButton>
        <IconButton label="Caricamento" loading />
        <IconButton label="Target touch 44px" size="touch" variant="secondary">
          <Plus aria-hidden />
        </IconButton>
        <Spinner size={16} className="text-fg-muted" label="Caricamento" />
      </Specimen>

      <Specimen label="Toast" hint="esito di un'azione, con undo">
        <Button variant="secondary" size="sm" onClick={() => notify.success('Ticket aggiornato')}>
          Successo
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => notify.error('Operazione non riuscita', 'Controlla la connessione.')}
        >
          Errore
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => notify.warning('Scadenza superata', '3 ticket in ritardo.')}
        >
          Attenzione
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            notify.undoable({
              message: 'Ticket #128 eliminato',
              description: 'Puoi annullare per qualche secondo.',
              onUndo: () => notify.success('Ripristinato'),
              onCommit: () => undefined,
            })
          }
        >
          Con undo
        </Button>
      </Specimen>
    </Section>
  )
}

function FormSection() {
  const [text, setText] = React.useState('')
  const [select, setSelect] = React.useState<string | null>('normal')
  const [combo, setCombo] = React.useState<string | null>(null)
  const [multi, setMulti] = React.useState<string[]>(['in_progress'])
  const [checked, setChecked] = React.useState(true)
  const [switched, setSwitched] = React.useState(true)
  const [radio, setRadio] = React.useState('create')
  const [range, setRange] = React.useState({ start: '09:00', end: '10:30' })

  return (
    <Section
      id="form"
      title="Form"
      description="Un solo modello di campo: etichetta, controllo, descrizione o errore. L'errore sostituisce la descrizione, non si somma."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody className="flex flex-col gap-4">
            <FieldSet title="Campi di testo" description="Stati normale, con icona, errore, disabilitato.">
              <Field label="Titolo" htmlFor="ds-title" required>
                <Input
                  id="ds-title"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Aggiornamento flusso mensile"
                />
              </Field>

              <Field label="Ricerca" htmlFor="ds-search" description="Con icona interna.">
                <Input id="ds-search" leading={<Search aria-hidden />} placeholder="Cerca…" />
              </Field>

              <Field label="Email" htmlFor="ds-error" error="Indirizzo email non valido.">
                <Input id="ds-error" defaultValue="mario@" invalid />
              </Field>

              <Field label="Campo disabilitato" htmlFor="ds-disabled">
                <Input id="ds-disabled" value="non modificabile" disabled />
              </Field>

              <Field label="Descrizione" htmlFor="ds-textarea" optional>
                <Textarea id="ds-textarea" rows={3} placeholder="Contesto e vincoli…" />
              </Field>
            </FieldSet>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-4">
            <FieldSet title="Selezione" description="Select nativo-like, combobox cercabile, multi-select per i filtri.">
              <Field label="Priorità" htmlFor="ds-select">
                <SimpleSelect
                  id="ds-select"
                  value={select}
                  onValueChange={setSelect}
                  options={TICKET_PRIORITIES.map((priority) => ({
                    value: priority,
                    label: priority,
                  }))}
                />
              </Field>

              <Field label="Cliente" htmlFor="ds-combo" optional>
                <Combobox
                  id="ds-combo"
                  value={combo}
                  onChange={setCombo}
                  options={[
                    { value: 'a', label: 'Rossi Costruzioni', hint: 'ROS01' },
                    { value: 'b', label: 'Bianchi Impianti', hint: 'BIA02' },
                    { value: 'c', label: 'Verdi Servizi', hint: 'VER03' },
                  ]}
                  clearable
                />
              </Field>

              <Field label="Filtro stato">
                <MultiSelect
                  label="Stato"
                  values={multi}
                  onChange={setMulti}
                  options={TICKET_STATUSES.map((status) => ({
                    value: status,
                    label: TICKET_STATUS_DESCRIPTORS[status].label,
                  }))}
                />
              </Field>

              <Field label="Data" htmlFor="ds-date" optional>
                <DateInput id="ds-date" defaultValue="2025-10-06" />
              </Field>

              <Field label="Orario" htmlFor="ds-range-start">
                <TimeRangeInput
                  idPrefix="ds-range"
                  start={range.start}
                  end={range.end}
                  onChange={setRange}
                />
              </Field>
            </FieldSet>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Specimen label="Checkbox, switch" className="flex-col items-stretch">
          <CheckboxField
            id="ds-check"
            label="Mostra solo i ticket assegnati a me"
            description="Il filtro resta attivo nella sessione."
            checked={checked}
            onCheckedChange={setChecked}
          />
          <CheckboxField
            id="ds-check-disabled"
            label="Opzione non disponibile"
            checked={false}
            onCheckedChange={() => undefined}
            disabled
          />
          <Separator />
          <SwitchField
            id="ds-switch"
            label="Ore fatturabili"
            description="Escludi le attività interne."
            checked={switched}
            onCheckedChange={setSwitched}
          />
        </Specimen>

        <Specimen label="Radio card" className="flex-col items-stretch">
          <RadioGroup value={radio} onValueChange={setRadio} aria-label="Modalità">
            <RadioCard
              value="create"
              id="ds-radio-create"
              title="Crea una nuova organizzazione"
              description="Diventi proprietario e inviti il team."
              icon={<Plus />}
            />
            <RadioCard
              value="join"
              id="ds-radio-join"
              title="Unisciti con un invito"
              description="Serve il link ricevuto da un amministratore."
              icon={<ArrowRight />}
            />
          </RadioGroup>
        </Specimen>
      </div>
    </Section>
  )
}

function StatusSection() {
  return (
    <Section
      id="stato"
      title="Stato e identità"
      description="Nessuna informazione affidata al solo colore: badge e indicatori portano sempre il testo."
    >
      <Specimen label="Stati ticket">
        {TICKET_STATUSES.map((status) => (
          <TicketStatusBadge key={status} status={status as TicketStatus} size="md" />
        ))}
      </Specimen>

      <Specimen label="Priorità" hint="tacche + etichetta">
        {TICKET_PRIORITIES.map((priority) => (
          <TicketPriorityBadge key={priority} priority={priority as TicketPriority} />
        ))}
      </Specimen>

      <Specimen label="Badge generici">
        <Badge tone="neutral">Neutro</Badge>
        <Badge tone="brand">Brand</Badge>
        <Badge tone="info">Info</Badge>
        <Badge tone="success">Successo</Badge>
        <Badge tone="warning">Attenzione</Badge>
        <Badge tone="danger">Errore</Badge>
        <Badge tone="brand" variant="outline">
          Outline
        </Badge>
        <Badge tone="brand" variant="solid">
          Solid
        </Badge>
        <Badge tone="success" size="md" dot>
          Con punto
        </Badge>
        <CountBadge value={12} />
        <CountBadge value={3} tone="danger" />
      </Specimen>

      <Specimen label="Chip filtro">
        <FilterChip label="Stato" value="In lavorazione" onRemove={() => undefined} />
        <FilterChip label="Cliente" value="Rossi Costruzioni" onRemove={() => undefined} />
        <FilterChip
          label="Priorità"
          value="Critica"
          tone="danger"
          onRemove={() => undefined}
        />
      </Specimen>

      <Specimen label="Persone">
        <Avatar name="Mario Rossi" id="u1" size="xs" />
        <Avatar name="Giulia Bianchi" id="u2" size="sm" />
        <Avatar name="Luca Verdi" id="u3" size="md" />
        <Avatar name="Sara Neri" id="u4" size="lg" />
        <Avatar name="Work Hub" id="u5" size="xl" />
        <Separator orientation="vertical" className="h-8" />
        <PersonChip name="Mario Rossi" id="u1" />
        <PersonChip name={null} />
        <Separator orientation="vertical" className="h-8" />
        <AvatarGroup
          people={[
            { id: 'u1', name: 'Mario Rossi' },
            { id: 'u2', name: 'Giulia Bianchi' },
            { id: 'u3', name: 'Luca Verdi' },
            { id: 'u4', name: 'Sara Neri' },
            { id: 'u5', name: 'Paolo Gialli' },
            { id: 'u6', name: 'Anna Blu' },
          ]}
        />
        <Separator orientation="vertical" className="h-8" />
        <OrgMark name="Studio Rossi" size="sm" />
        <OrgMark name="Studio Rossi" size="md" />
        <OrgMark name="Studio Rossi" size="lg" />
      </Specimen>
    </Section>
  )
}

function DataSection() {
  const [sort, setSort] = React.useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'reference',
    direction: 'desc',
  })
  const [page, setPage] = React.useState(1)
  const [view, setView] = React.useState<'table' | 'compact'>('table')

  const rows = [
    { reference: 128, title: 'Aggiornamento flusso mensile', client: 'Rossi Costruzioni', status: 'in_progress', priority: 'high', due: 'Scade domani' },
    { reference: 127, title: 'Manutenzione PC reception', client: 'Bianchi Impianti', status: 'planned', priority: 'normal', due: 'Tra 4 giorni' },
    { reference: 126, title: 'Richiesta nuovo report ore', client: 'Verdi Servizi', status: 'waiting_client', priority: 'low', due: '—' },
    { reference: 125, title: 'Backup server non completato', client: 'Rossi Costruzioni', status: 'new', priority: 'critical', due: '2 giorni di ritardo' },
  ] as const

  return (
    <Section
      id="dati"
      title="Dati"
      description="Tabella, toolbar, ordinamento, riga selezionata, paginazione. Le liste non sono card."
    >
      <TableToolbar
        secondRow={
          <>
            <FilterChip label="Stato" value="In lavorazione" onRemove={() => undefined} />
            <Button variant="ghost" size="xs">
              Azzera filtri
            </Button>
          </>
        }
      >
        <div className="w-full sm:max-w-[260px]">
          <Input inputSize="sm" leading={<Search aria-hidden />} placeholder="Cerca ticket…" />
        </div>
        <MultiSelect
          label="Stato"
          values={['in_progress']}
          onChange={() => undefined}
          options={TICKET_STATUSES.map((status) => ({
            value: status,
            label: TICKET_STATUS_DESCRIPTORS[status].label,
          }))}
        />
        <SegmentedControl
          name="Densità"
          value={view}
          onChange={setView}
          options={[
            { value: 'table', label: 'Normale' },
            { value: 'compact', label: 'Compatta' },
          ]}
          className="ml-auto"
        />
      </TableToolbar>

      <TableShell>
        <Table>
          <caption className="sr-only">Esempio di tabella ticket</caption>
          <TableHead>
            <tr>
              <SortableHeaderCell
                label="N."
                columnKey="reference"
                activeKey={sort.key}
                direction={sort.direction}
                onSort={(key, direction) => setSort({ key, direction })}
                width="72px"
              />
              <TableHeaderCell>Titolo</TableHeaderCell>
              <TableHeaderCell width="180px">Cliente</TableHeaderCell>
              <TableHeaderCell width="150px">Stato</TableHeaderCell>
              <TableHeaderCell width="130px">Priorità</TableHeaderCell>
              <SortableHeaderCell
                label="Scadenza"
                columnKey="due"
                activeKey={sort.key}
                direction={sort.direction}
                onSort={(key, direction) => setSort({ key, direction })}
                width="150px"
              />
            </tr>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow
                key={row.reference}
                interactive
                selected={index === 1}
                compact={view === 'compact'}
              >
                <TableCell numeric className="text-fg-muted">
                  #{row.reference}
                </TableCell>
                <TableCell truncate className="font-medium">
                  {row.title}
                </TableCell>
                <TableCell truncate className="text-fg-secondary">
                  {row.client}
                </TableCell>
                <TableCell>
                  <TicketStatusBadge status={row.status as TicketStatus} short />
                </TableCell>
                <TableCell>
                  <TicketPriorityBadge priority={row.priority as TicketPriority} />
                </TableCell>
                <TableCell numeric className="text-fg-secondary">
                  {row.due}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableShell>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE.tickets}
        total={132}
        onPageChange={setPage}
      />

      <Specimen label="Skeleton di tabella" className="block p-0">
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell width="72px">N.</TableHeaderCell>
              <TableHeaderCell>Titolo</TableHeaderCell>
              <TableHeaderCell width="150px">Stato</TableHeaderCell>
            </tr>
          </TableHead>
          <tbody className="divide-y divide-line-subtle">
            {[0, 1, 2].map((row) => (
              <tr key={row} className="h-row">
                <TableCell>
                  <Skeleton className="h-3 w-8" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-3 w-8/12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-3 w-20" />
                </TableCell>
              </tr>
            ))}
          </tbody>
        </Table>
      </Specimen>

      <Specimen label="Riga di dettaglio" className="block">
        <dl className="flex w-full flex-col">
          <DetailRow label="Cliente">Rossi Costruzioni S.r.l.</DetailRow>
          <DetailRow label="Assegnato a">
            <PersonChip name="Giulia Bianchi" id="u2" />
          </DetailRow>
          <DetailRow label="Ore registrate">
            <span data-numeric>{formatDuration(485)}</span>
          </DetailRow>
          <DetailRow label="Link di invito">
            <CodeBlock value="https://work-hub.vercel.app/invite/5f1c…" />
          </DetailRow>
        </dl>
      </Specimen>
    </Section>
  )
}

function OverlaySection() {
  const [modalOpen, setModalOpen] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  return (
    <Section
      id="overlay"
      title="Overlay"
      description="Modale per una decisione, drawer per un dettaglio, popover per una scelta rapida. Focus gestito, Esc sempre attivo."
    >
      <Specimen label="Trigger">
        <Button variant="secondary" onClick={() => setModalOpen(true)}>
          Apri modale
        </Button>
        <Button variant="destructive-outline" onClick={() => setConfirmOpen(true)}>
          Conferma distruttiva
        </Button>
        <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
          Apri drawer
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" iconAfter={<ChevronDown />}>
              Menu
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Azioni</DropdownMenuLabel>
            <DropdownMenuItem shortcut="E">Modifica</DropdownMenuItem>
            <DropdownMenuItem>Duplica</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem tone="danger">
              <Trash2 aria-hidden />
              Elimina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary">Popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <p className="text-body-sm text-fg-secondary">
              Contenuto libero: filtri, un mini-form, un riepilogo.
            </p>
          </PopoverContent>
        </Popover>

        <Tooltip content="Spiega un controllo icon-only" shortcut="⌘K">
          <IconButton label="Con tooltip" variant="secondary">
            <Search aria-hidden />
          </IconButton>
        </Tooltip>

        <span className="flex items-center gap-1 text-meta text-fg-muted">
          Command palette <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </Specimen>

      <Modal open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          title="Nuovo ticket"
          description="Fade con translate di 8px, 220ms in ingresso."
          footer={
            <>
              <DialogClose asChild>
                <Button variant="secondary">Annulla</Button>
              </DialogClose>
              <Button variant="primary" onClick={() => setModalOpen(false)}>
                Crea ticket
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="Titolo" htmlFor="ds-modal-title" required>
              <Input id="ds-modal-title" autoFocus placeholder="Titolo del ticket" />
            </Field>
            <Field label="Descrizione" htmlFor="ds-modal-desc" optional>
              <Textarea id="ds-modal-desc" rows={3} />
            </Field>
          </div>
        </DialogContent>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Eliminare il ticket?"
        description="Commenti, cronologia e allegati verranno rimossi. Le ore registrate restano."
        confirmLabel="Elimina ticket"
        onConfirm={() => setConfirmOpen(false)}
      />

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent
          title="Aggiornamento flusso mensile"
          description="#128 · aperto 3 giorni fa"
          headerActions={
            <TicketStatusBadge status="in_progress" size="md" />
          }
          footer={
            <div className="flex items-center justify-between gap-2">
              <span className="text-caption text-fg-muted">
                Slide laterale 260ms, bottom sheet sotto 640px.
              </span>
              <Button variant="primary" size="sm" onClick={() => setDrawerOpen(false)}>
                Chiudi
              </Button>
            </div>
          }
        >
          <DrawerSection>
            <dl className="flex flex-col">
              <DetailRow label="Cliente">Rossi Costruzioni</DetailRow>
              <DetailRow label="Assegnato a">
                <PersonChip name="Giulia Bianchi" id="u2" />
              </DetailRow>
              <DetailRow label="Ore">
                <span data-numeric>{formatDuration(195)}</span>
              </DetailRow>
            </dl>
          </DrawerSection>
          <DrawerSection title="Attività">
            <Tabs defaultValue="comments">
              <TabsList>
                <TabsTrigger value="comments">
                  Commenti <CountBadge value={2} />
                </TabsTrigger>
                <TabsTrigger value="history">Cronologia</TabsTrigger>
              </TabsList>
              <TabsContent value="comments" className="pt-4">
                <InlineEmpty>Nessun commento in questo esempio.</InlineEmpty>
              </TabsContent>
              <TabsContent value="history" className="pt-4">
                <InlineEmpty>La cronologia è scritta dai trigger del database.</InlineEmpty>
              </TabsContent>
            </Tabs>
          </DrawerSection>
        </DrawerContent>
      </Drawer>
    </Section>
  )
}

function ContentStatesSection() {
  return (
    <Section
      id="stati"
      title="Stati di contenuto"
      description="Ogni superficie dati gestisce quattro stati oltre a quello normale: vuoto, caricamento, errore, offline."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Empty state" compact />
          <CardBody padded={false}>
            <EmptyState
              icon={Ticket}
              title="Nessun ticket"
              description="Quando arriva una richiesta da un cliente, apri un ticket: resterà tracciato con stato, priorità, responsabile e ore."
              action={
                <Button variant="primary" size="sm" icon={<Plus />}>
                  Apri il primo ticket
                </Button>
              }
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Error state" compact />
          <CardBody padded={false}>
            <ErrorState description="Controlla la connessione oppure riprova fra qualche istante." onRetry={() => undefined} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Setup richiesto" compact />
          <CardBody padded={false}>
            <SchemaMissingState />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Offline e caricamento" compact />
          <CardBody className="flex flex-col gap-3">
            <div
              role="status"
              className="flex items-center justify-center gap-2 rounded-md border border-warning-line bg-warning-subtle px-4 py-1.5 text-meta text-warning-text"
            >
              <AlertTriangle className="size-3.5" aria-hidden />
              Sei offline. Le modifiche non verranno salvate.
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-10/12" />
              <Skeleton className="h-3 w-7/12" />
              <Skeleton className="h-3 w-8/12" />
            </div>
            <InlineEmpty>Variante inline, usata nei drawer.</InlineEmpty>
          </CardBody>
        </Card>
      </div>
    </Section>
  )
}

function MeasuresSection() {
  const [preset, setPreset] = React.useState<string>('month')

  return (
    <Section
      id="misure"
      title="Misure e report"
      description="Una sola tinta per serie, barra al massimo 8px, valore sempre in testo. Il numero non è mai nascosto dietro un tooltip."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Ticket aperti" value={24} footnote="6 assegnati a te" icon={<Ticket />} />
        <StatTile
          label="In ritardo"
          value={3}
          footnote="scadenza superata"
          tone="danger"
          icon={<AlertTriangle />}
        />
        <StatTile
          label="Da assegnare"
          value={5}
          footnote="nessun responsabile"
          tone="warning"
          icon={<Inbox />}
        />
        <StatTile
          label="Ore della settimana"
          value={formatDuration(1870)}
          footnote="8h 05m registrate da te"
          icon={<Clock />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Ore per cliente" description="31h 10m nel periodo" />
          <CardBody padded={false}>
            <div className="flex flex-col gap-1 p-3">
              {[
                { label: 'Rossi Costruzioni', minutes: 960, tickets: 7 },
                { label: 'Bianchi Impianti', minutes: 540, tickets: 4 },
                { label: 'Verdi Servizi', minutes: 330, tickets: 3 },
                { label: 'Senza cliente', minutes: 40, tickets: 0 },
              ].map((row) => (
                <MeterRow
                  key={row.label}
                  label={row.label}
                  sublabel={`${row.tickets} ticket`}
                  value={row.minutes}
                  max={960}
                  formattedValue={formatDuration(row.minutes)}
                  secondaryValue={`${(row.minutes / 60).toFixed(2)} h`}
                />
              ))}
            </div>
          </CardBody>
          <CardFooter>
            <span className="text-caption text-fg-muted">
              Tinta unica: la lunghezza porta già il valore.
            </span>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader title="Andamento giornaliero" description="Ore registrate per giorno" />
          <CardBody>
            <ColumnStrip
              data={[
                { label: 'Lunedì', shortLabel: 'lu', value: 420 },
                { label: 'Martedì', shortLabel: 'ma', value: 480 },
                { label: 'Mercoledì', shortLabel: 'me', value: 360 },
                { label: 'Giovedì', shortLabel: 'gi', value: 510 },
                { label: 'Venerdì', shortLabel: 've', value: 300 },
                { label: 'Sabato', shortLabel: 'sa', value: 0 },
                { label: 'Domenica', shortLabel: 'do', value: 0 },
              ]}
              formatValue={(value) => formatDuration(value)}
              highlightIndex={3}
            />
          </CardBody>
        </Card>
      </div>

      <Specimen label="Meter per stato" className="block">
        <div className="flex w-full flex-col gap-2">
          {(['brand', 'success', 'warning', 'danger', 'info', 'neutral'] as const).map((tone, index) => (
            <div key={tone} className="flex items-center gap-3">
              <code className="w-20 shrink-0 font-mono text-caption text-fg-muted">{tone}</code>
              <BarMeter value={(index + 2) * 12} max={100} tone={tone} label={`${tone}`} />
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen label="Selettore periodo">
        <DateRangePresets active={preset} onSelect={(value) => setPreset(value)} />
      </Specimen>

      <Specimen label="Griglia calendario" hint={`lun–ven ${CALENDAR.dayStartHour}:00–${CALENDAR.dayEndHour}:00`} className="block">
        <div className="flex w-full flex-col gap-2">
          <div className="grid grid-cols-5 gap-1.5">
            {['lun', 'mar', 'mer', 'gio', 'ven'].map((day, dayIndex) => (
              <div key={day} className="flex flex-col gap-1">
                <span className="text-table-heading uppercase text-fg-muted">{day}</span>
                <div className="relative h-24 rounded-sm border border-line-subtle bg-surface-muted">
                  {dayIndex % 2 === 0 ? (
                    <span className="absolute inset-x-1 top-2 flex h-9 flex-col justify-center rounded-sm border-l-2 border-l-brand bg-brand-subtle px-1.5 text-caption text-brand-text">
                      <span data-numeric>09:00</span>
                      <span className="truncate">Flusso giornaliero</span>
                    </span>
                  ) : null}
                  {dayIndex === 1 ? (
                    <span className="absolute inset-x-1 top-14 flex h-8 flex-col justify-center rounded-sm border-l-2 border-l-success bg-success-subtle px-1.5 text-caption text-success-text">
                      <span className="flex items-center gap-1">
                        <Check className="size-3" aria-hidden />
                        <span data-numeric>14:00</span>
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <p className="text-caption text-fg-muted">
            Eventi pianificati in tinta brand, consuntivati in verde con spunta: lo stato non
            dipende dal solo colore.
          </p>
        </div>
      </Specimen>
    </Section>
  )
}

function RolesSection() {
  return (
    <Section
      id="ruoli"
      title="Ruoli e permessi"
      description="La matrice vive in src/config/roles.ts e viene rispecchiata in SQL da has_org_permission(). Questa tabella è generata dalla stessa fonte."
    >
      <TableShell>
        <Table>
          <caption className="sr-only">Matrice ruoli e permessi</caption>
          <TableHead>
            <tr>
              <TableHeaderCell width="150px">Ruolo</TableHeaderCell>
              <TableHeaderCell width="90px" align="right">
                Permessi
              </TableHeaderCell>
              <TableHeaderCell>Cosa può fare</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {ORG_ROLES.map((role) => (
              <TableRow key={role}>
                <TableCell>
                  <Badge tone={role === 'owner' ? 'brand' : 'neutral'} size="md">
                    {roleLabel(role)}
                  </Badge>
                </TableCell>
                <TableCell align="right" numeric className="text-fg-secondary">
                  {ROLE_PERMISSIONS[role].length}
                </TableCell>
                <TableCell className="text-fg-secondary">
                  {ROLE_DESCRIPTORS[role].summary}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableShell>
    </Section>
  )
}
