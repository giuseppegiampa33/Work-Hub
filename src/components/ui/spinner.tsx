import { cn } from '@/lib/utils'

/**
 * Indeterminate progress. A rotating arc rather than a pulsing dot: rotation
 * survives `prefers-reduced-motion` being honoured (the element stops but the
 * arc still reads as "busy") and costs one composited transform.
 */
export function Spinner({
  size = 16,
  className,
  label,
}: {
  size?: number
  className?: string
  /** Pass when the spinner is the only thing announcing the busy state. */
  label?: string
}) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('inline-flex items-center justify-center', className)}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        className="animate-spin gpu"
      >
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2" />
        <path
          d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}
