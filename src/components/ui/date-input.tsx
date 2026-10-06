'use client'

import * as React from 'react'
import { Calendar, Clock } from 'lucide-react'
import { CALENDAR } from '@/config/app'
import { minutesToTime, timeToMinutes } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Input, type InputProps } from './input'

/**
 * Date and time fields.
 *
 * These wrap the native `date` / `time` inputs on purpose: the platform picker
 * is keyboard-accessible, localised, and on mobile it opens the OS wheel — all
 * things a custom calendar popover has to re-earn. The wrapper only adds the
 * leading icon, the token-driven surface and the quick-step helpers.
 */
export const DateInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'leading'>>(
  function DateInput({ className, ...props }, ref) {
    return (
      <Input
        ref={ref}
        type="date"
        leading={<Calendar aria-hidden />}
        className={cn('[&::-webkit-calendar-picker-indicator]:opacity-60', className)}
        {...props}
      />
    )
  },
)

export const TimeInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'leading'>>(
  function TimeInput({ className, step = 300, ...props }, ref) {
    return (
      <Input
        ref={ref}
        type="time"
        step={step}
        leading={<Clock aria-hidden />}
        className={cn('[&::-webkit-calendar-picker-indicator]:opacity-60', className)}
        {...props}
      />
    )
  },
)

/**
 * Start/end pair with live duration and automatic end adjustment: moving the
 * start keeps the duration, and an end before the start is corrected rather
 * than rejected.
 */
export function TimeRangeInput({
  start,
  end,
  onChange,
  idPrefix,
  disabled,
  invalid,
}: {
  start: string
  end: string
  onChange: (next: { start: string; end: string }) => void
  idPrefix: string
  disabled?: boolean
  invalid?: boolean
}) {
  const startMinutes = timeToMinutes(start)
  const endMinutes = timeToMinutes(end)
  const duration = Math.max(0, endMinutes - startMinutes)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <TimeInput
        id={`${idPrefix}-start`}
        aria-label="Ora di inizio"
        value={start}
        disabled={disabled}
        invalid={invalid}
        inputSize="md"
        className="w-[7.5rem]"
        onChange={(event) => {
          const nextStart = event.target.value || start
          const delta = timeToMinutes(nextStart) - startMinutes
          onChange({ start: nextStart, end: minutesToTime(endMinutes + delta) })
        }}
      />
      <span className="text-meta text-fg-muted" aria-hidden>
        →
      </span>
      <TimeInput
        id={`${idPrefix}-end`}
        aria-label="Ora di fine"
        value={end}
        disabled={disabled}
        invalid={invalid}
        inputSize="md"
        className="w-[7.5rem]"
        onChange={(event) => {
          const nextEnd = event.target.value || end
          const safeEnd =
            timeToMinutes(nextEnd) <= startMinutes
              ? minutesToTime(startMinutes + CALENDAR.minEventMinutes)
              : nextEnd
          onChange({ start, end: safeEnd })
        }}
      />
      <span className="text-meta text-fg-muted" data-numeric>
        {duration > 0 ? `${Math.floor(duration / 60)}h ${String(duration % 60).padStart(2, '0')}m` : '—'}
      </span>
    </div>
  )
}

/** Preset buttons for the report period selector. */
export function DateRangePresets({
  onSelect,
  active,
}: {
  onSelect: (preset: 'week' | 'last-week' | 'month' | 'last-month' | 'quarter') => void
  active?: string
}) {
  const presets = [
    { key: 'week', label: 'Questa settimana' },
    { key: 'last-week', label: 'Settimana scorsa' },
    { key: 'month', label: 'Questo mese' },
    { key: 'last-month', label: 'Mese scorso' },
    { key: 'quarter', label: 'Ultimi 3 mesi' },
  ] as const

  return (
    <div className="flex flex-wrap items-center gap-1">
      {presets.map((preset) => (
        <button
          key={preset.key}
          type="button"
          onClick={() => onSelect(preset.key)}
          aria-pressed={active === preset.key}
          className={cn(
            'rounded-sm px-2 py-1 text-meta transition-colors duration-fast ease-standard',
            'outline-none focus-visible:shadow-[0_0_0_2px_rgb(var(--color-focus)/0.4)]',
            active === preset.key
              ? 'bg-brand-subtle text-brand-text'
              : 'text-fg-secondary hover:bg-surface-hover',
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
