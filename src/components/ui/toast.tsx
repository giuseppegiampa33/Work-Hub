'use client'

import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner'
import { AlertTriangle, Check, Info, TriangleAlert } from 'lucide-react'
import { DURATION } from '@/config/motion'

/**
 * Toasts.
 *
 * Reserved for the outcome of an action the user just took. They are not a
 * notification channel (that is the bell in the top bar) and they never carry
 * information the page cannot also show.
 *
 * `notify.undoable` is the pattern used for destructive-but-recoverable work:
 * the row is removed optimistically, the toast holds the undo window, and the
 * commit runs only when the toast expires.
 */
export function ToastViewport() {
  return (
    <SonnerToaster
      position="bottom-right"
      offset={16}
      gap={8}
      duration={4500}
      visibleToasts={3}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: [
            'flex w-[min(380px,calc(100vw-32px))] items-start gap-2.5',
            'rounded-md border border-line bg-surface p-3 shadow-toast',
            'font-sans text-body-sm text-fg',
          ].join(' '),
          title: 'text-body-sm font-medium text-fg',
          description: 'text-meta text-fg-muted',
          actionButton: [
            'ml-auto shrink-0 rounded-sm border border-line bg-surface px-2 py-1',
            'text-meta font-medium text-fg-secondary',
            'transition-colors duration-fast hover:bg-surface-hover hover:text-fg',
          ].join(' '),
          cancelButton: 'text-meta text-fg-muted hover:text-fg-secondary',
          icon: 'mt-0.5 shrink-0 [&_svg]:size-4',
          error: 'border-danger-line',
          success: 'border-success-line',
          warning: 'border-warning-line',
          info: 'border-info-line',
        },
      }}
      icons={{
        success: <Check className="text-success" aria-hidden />,
        error: <AlertTriangle className="text-danger" aria-hidden />,
        warning: <TriangleAlert className="text-warning" aria-hidden />,
        info: <Info className="text-info" aria-hidden />,
      }}
      style={{
        // Keeps toasts clear of the mobile bottom navigation and the notch.
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--mobile-nav-height))',
      }}
    />
  )
}

export const notify = {
  success(message: string, description?: string) {
    return sonnerToast.success(message, { description })
  },
  error(message: string, description?: string) {
    return sonnerToast.error(message, { description, duration: 6500 })
  },
  warning(message: string, description?: string) {
    return sonnerToast.warning(message, { description })
  },
  info(message: string, description?: string) {
    return sonnerToast.info(message, { description })
  },
  loading(message: string) {
    return sonnerToast.loading(message)
  },
  dismiss(id?: string | number) {
    sonnerToast.dismiss(id)
  },

  /**
   * Shows an undo window, then commits. `onUndo` is called if the user acts
   * within `window` ms; `onCommit` runs otherwise.
   */
  undoable({
    message,
    description,
    onUndo,
    onCommit,
    window: undoWindow = 6000,
  }: {
    message: string
    description?: string
    onUndo: () => void
    onCommit: () => void | Promise<void>
    window?: number
  }) {
    let undone = false
    const id = sonnerToast(message, {
      description,
      duration: undoWindow,
      action: {
        label: 'Annulla',
        onClick: () => {
          undone = true
          onUndo()
        },
      },
      onAutoClose: () => {
        if (!undone) void onCommit()
      },
      onDismiss: () => {
        if (!undone) void onCommit()
      },
    })
    return id
  },

  /** Progress for a promise, with the three terminal states pre-wired. */
  promise<T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string },
  ) {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    })
  },
}

/** Exposed so the design-system page can document the timings. */
export const TOAST_ENTER_MS = DURATION.moderate * 1000
