'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { transition } from '@/config/motion'
import { cn } from '@/lib/utils'

/**
 * Bar meter — the report workhorse.
 *
 * Design rules applied here (and the reasons):
 *  - one hue for every bar in a series. Darkening the bar by value would
 *    double-encode length as colour and burn the only free channel;
 *  - the track is a lighter step of the same ramp, so the unfilled part still
 *    reads as part of the measure;
 *  - 4px rounded data-end, square at the baseline, bar capped at 8px so the row
 *    stays a table row and not a chart;
 *  - the value is a direct label in text ink, never in the bar's colour.
 */
export function BarMeter({
  value,
  max,
  tone = 'brand',
  className,
  label,
  animate = true,
}: {
  value: number
  max: number
  tone?: 'brand' | 'info' | 'success' | 'warning' | 'danger' | 'neutral'
  className?: string
  /** Accessible description; the visible value lives next to the bar. */
  label?: string
  animate?: boolean
}) {
  const reduceMotion = useReducedMotion()
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0

  const fill = {
    brand: 'bg-brand',
    info: 'bg-info',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    neutral: 'bg-neutral',
  }[tone]

  const track = {
    brand: 'bg-brand-subtle',
    info: 'bg-info-subtle',
    success: 'bg-success-subtle',
    warning: 'bg-warning-subtle',
    danger: 'bg-danger-subtle',
    neutral: 'bg-neutral-subtle',
  }[tone]

  return (
    <div
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-xs', track, className)}
    >
      <motion.div
        className={cn('h-full rounded-r-xs', fill)}
        initial={animate && !reduceMotion ? { width: 0 } : false}
        animate={{ width: `${ratio * 100}%` }}
        transition={reduceMotion ? { duration: 0 } : transition.enter}
      />
    </div>
  )
}

/**
 * One row of a ranked magnitude list: name, bar, value.
 * This *is* the table view — the numbers are never gated behind a tooltip.
 */
export function MeterRow({
  label,
  sublabel,
  value,
  formattedValue,
  secondaryValue,
  max,
  tone = 'brand',
  href,
  onClick,
}: {
  label: string
  sublabel?: string
  value: number
  formattedValue: string
  secondaryValue?: string
  max: number
  tone?: 'brand' | 'info' | 'success' | 'warning' | 'danger' | 'neutral'
  href?: string
  onClick?: () => void
}) {
  const interactive = Boolean(href || onClick)

  const content = (
    <>
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-body-sm text-fg">{label}</span>
          {sublabel ? (
            <span className="shrink-0 text-caption text-fg-muted">{sublabel}</span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-baseline gap-2">
          <span className="text-body-sm font-medium text-fg" data-numeric>
            {formattedValue}
          </span>
          {secondaryValue ? (
            <span className="text-caption text-fg-muted" data-numeric>
              {secondaryValue}
            </span>
          ) : null}
        </span>
      </div>
      <BarMeter value={value} max={max} tone={tone} label={`${label}: ${formattedValue}`} />
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          'flex flex-col gap-1.5 rounded-sm px-1 py-1.5',
          'transition-colors duration-fast ease-standard hover:bg-surface-hover',
          'focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgb(var(--color-focus)/0.4)]',
        )}
      >
        {content}
      </Link>
    )
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1.5 px-1 py-1.5',
        interactive && 'cursor-pointer rounded-sm hover:bg-surface-hover',
      )}
    >
      {content}
    </div>
  )
}

/**
 * Compact column strip for a short time series (one working week or month).
 * Single series, single hue, hairline baseline, value only on the tallest
 * column and on today.
 */
export function ColumnStrip({
  data,
  formatValue,
  className,
  highlightIndex,
}: {
  data: { label: string; shortLabel: string; value: number; emphasis?: boolean }[]
  formatValue: (value: number) => string
  className?: string
  highlightIndex?: number
}) {
  const reduceMotion = useReducedMotion()
  const max = Math.max(1, ...data.map((item) => item.value))
  const peakIndex = data.reduce(
    (best, item, index) => (item.value > (data[best]?.value ?? 0) ? index : best),
    0,
  )

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex h-24 items-end gap-1.5">
        {data.map((item, index) => {
          const ratio = item.value / max
          const showValue = item.value > 0 && (index === peakIndex || index === highlightIndex)
          return (
            <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="block h-4 text-caption text-fg-secondary" data-numeric>
                {showValue ? formatValue(item.value) : null}
              </span>
              <div className="flex w-full flex-1 items-end justify-center">
                <motion.div
                  title={`${item.label}: ${formatValue(item.value)}`}
                  className={cn(
                    'w-full max-w-6 rounded-t-xs',
                    index === highlightIndex ? 'bg-brand' : 'bg-brand/55',
                    item.value === 0 && 'bg-line-subtle',
                  )}
                  initial={reduceMotion ? false : { height: 0 }}
                  animate={{ height: `${Math.max(item.value === 0 ? 2 : 6, ratio * 100)}%` }}
                  transition={
                    reduceMotion ? { duration: 0 } : { ...transition.enter, delay: index * 0.015 }
                  }
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-1.5 border-t border-line-subtle pt-1.5">
        {data.map((item, index) => (
          <span
            key={item.label}
            className={cn(
              'min-w-0 flex-1 truncate text-center text-caption',
              index === highlightIndex ? 'font-medium text-fg-secondary' : 'text-fg-muted',
            )}
          >
            {item.shortLabel}
          </span>
        ))}
      </div>
    </div>
  )
}
