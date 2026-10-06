'use client'

import * as React from 'react'
import { Command } from 'cmdk'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from './menu'
import { fieldSurface, inputSizes } from './input'

export type ComboboxOption = {
  value: string
  label: string
  /** Second line in the list (client email, category name, …). */
  hint?: string
  /** Rendered before the label — avatar, tone dot. */
  leading?: React.ReactNode
  disabled?: boolean
  keywords?: string[]
}

/**
 * Searchable single-select.
 *
 * Used wherever the option list can grow with the tenant (clients, assignees,
 * activity types) — a native `<select>` stops being usable past ~20 entries.
 * Filtering happens in the browser over an already-paginated option set; large
 * lists pass `onSearchChange` and filter server-side instead.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Seleziona…',
  searchPlaceholder = 'Cerca…',
  emptyMessage = 'Nessun risultato.',
  inputSize = 'md',
  disabled,
  invalid,
  id,
  clearable,
  className,
  onSearchChange,
  loading,
  footer,
  'aria-describedby': describedBy,
}: {
  value: string | null | undefined
  onChange: (value: string | null) => void
  options: ComboboxOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  inputSize?: keyof typeof inputSizes
  disabled?: boolean
  invalid?: boolean
  id?: string
  clearable?: boolean
  className?: string
  /** Set to filter server-side; the component then renders options verbatim. */
  onSearchChange?: (term: string) => void
  loading?: boolean
  footer?: React.ReactNode
  'aria-describedby'?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const selected = options.find((option) => option.value === value)

  React.useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          // ARIA 1.2 select-only combobox. Radix's PopoverTrigger injects
          // `aria-controls` and `aria-expanded` into this child at runtime, which
          // the static lint rule cannot see.
          // eslint-disable-next-line jsx-a11y/role-has-required-aria-props
          role="combobox"
          aria-expanded={open}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          className={cn(
            fieldSurface,
            inputSizes[inputSize],
            'flex items-center justify-between gap-2 text-left',
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected?.leading}
            <span className={cn('truncate', !selected && 'text-fg-disabled')}>
              {selected?.label ?? placeholder}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-0.5">
            {clearable && selected && !disabled ? (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Rimuovi selezione"
                onClick={(event) => {
                  event.stopPropagation()
                  onChange(null)
                }}
                className="inline-flex size-5 items-center justify-center rounded-xs text-fg-muted hover:bg-surface-active hover:text-fg"
              >
                <X className="size-3.5" aria-hidden />
              </span>
            ) : null}
            <ChevronsUpDown className="size-4 text-fg-muted" aria-hidden />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        padded={false}
        className="w-[var(--radix-popover-trigger-width)] min-w-[240px]"
      >
        <Command
          /** Server-side filtering: the parent already narrowed the list. */
          shouldFilter={!onSearchChange}
          loop
          className="flex flex-col"
        >
          <div className="border-b border-line-subtle p-1.5">
            <Command.Input
              value={search}
              onValueChange={(next) => {
                setSearch(next)
                onSearchChange?.(next)
              }}
              placeholder={searchPlaceholder}
              className={cn(
                'h-8 w-full rounded-sm bg-transparent px-2 text-body-sm text-fg',
                'outline-none placeholder:text-fg-disabled',
              )}
            />
          </div>
          <Command.List className="max-h-64 overflow-y-auto p-1">
            {loading ? (
              <div className="px-2 py-3 text-meta text-fg-muted">Caricamento…</div>
            ) : (
              <Command.Empty className="px-2 py-3 text-meta text-fg-muted">
                {emptyMessage}
              </Command.Empty>
            )}
            {options.map((option) => (
              <Command.Item
                key={option.value}
                value={option.label}
                keywords={option.keywords}
                disabled={option.disabled}
                onSelect={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={cn(
                  'flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5',
                  'text-body-sm text-fg outline-none',
                  'data-[selected=true]:bg-surface-hover',
                  'data-[disabled=true]:pointer-events-none data-[disabled=true]:text-fg-disabled',
                )}
              >
                {option.leading}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.hint ? (
                  <span className="shrink-0 text-caption text-fg-muted">{option.hint}</span>
                ) : null}
                {option.value === value ? (
                  <Check className="size-3.5 shrink-0 text-brand" aria-hidden />
                ) : null}
              </Command.Item>
            ))}
          </Command.List>
          {footer ? <div className="border-t border-line-subtle p-1">{footer}</div> : null}
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Multi-select used for table filters (status, priority). Keeps the selected
 * values as chips in the trigger so the active filter is readable at a glance.
 */
export function MultiSelect({
  values,
  onChange,
  options,
  label,
  inputSize = 'sm',
  className,
  emptyLabel = 'Tutti',
}: {
  values: string[]
  onChange: (values: string[]) => void
  options: ComboboxOption[]
  label: string
  inputSize?: keyof typeof inputSizes
  className?: string
  emptyLabel?: string
}) {
  const [open, setOpen] = React.useState(false)
  const selectedLabels = options
    .filter((option) => values.includes(option.value))
    .map((option) => option.label)

  const summary =
    selectedLabels.length === 0
      ? emptyLabel
      : selectedLabels.length <= 2
        ? selectedLabels.join(', ')
        : `${selectedLabels.length} selezionati`

  const toggle = (optionValue: string) => {
    onChange(
      values.includes(optionValue)
        ? values.filter((item) => item !== optionValue)
        : [...values, optionValue],
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          className={cn(
            fieldSurface,
            inputSizes[inputSize],
            'flex w-auto items-center gap-1.5 whitespace-nowrap text-left',
            values.length > 0 && 'border-brand-line bg-brand-subtle/60',
            className,
          )}
        >
          <span className="text-fg-muted">{label}:</span>
          <span className="max-w-[18ch] truncate font-medium text-fg">{summary}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent padded={false} className="min-w-[220px]">
        <Command loop className="flex flex-col">
          <Command.List className="max-h-72 overflow-y-auto p-1">
            {options.map((option) => {
              const checked = values.includes(option.value)
              return (
                <Command.Item
                  key={option.value}
                  value={option.label}
                  onSelect={() => toggle(option.value)}
                  className={cn(
                    'flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5',
                    'text-body-sm text-fg outline-none data-[selected=true]:bg-surface-hover',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex size-4 shrink-0 items-center justify-center rounded-xs border',
                      checked ? 'border-brand bg-brand text-brand-contrast' : 'border-line-strong',
                    )}
                    aria-hidden
                  >
                    {checked ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                  {option.leading}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </Command.Item>
              )
            })}
          </Command.List>
          {values.length > 0 ? (
            <div className="border-t border-line-subtle p-1">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full rounded-sm px-2 py-1.5 text-left text-meta text-fg-secondary hover:bg-surface-hover"
              >
                Azzera selezione
              </button>
            </div>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
