'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { modalVariants, scrimVariants } from '@/config/motion'
import { cn } from '@/lib/utils'
import { Button, IconButton } from './button'

/**
 * Modal.
 *
 * Radix owns focus trapping, scroll locking and `aria-modal`; Framer Motion
 * owns the transition (fade + 8px rise, 220ms in / 140ms out). `forceMount` on
 * the portal lets the exit animation finish before unmount.
 */
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  children,
  className,
  size = 'md',
  title,
  description,
  footer,
  /** Hide the close affordance for flows that must be completed. */
  hideClose,
  onOpenAutoFocus,
}: {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
  title: React.ReactNode
  description?: React.ReactNode
  footer?: React.ReactNode
  hideClose?: boolean
  onOpenAutoFocus?: (event: Event) => void
}) {
  const widths = {
    sm: 'sm:max-w-[420px]',
    md: 'sm:max-w-[560px]',
    lg: 'sm:max-w-[760px]',
  }[size]

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay asChild>
        <motion.div
          variants={scrimVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed inset-0 z-modal bg-overlay/30"
        />
      </DialogPrimitive.Overlay>
      {/*
        Centring is done with flexbox, never with `-translate-x-1/2`: Framer
        Motion owns `transform` on the panel (it animates y and scale) and
        would overwrite a Tailwind translate, leaving the modal off-centre.
        The wrapper ignores pointer events so a click still reaches the scrim.
      */}
      <div className="pointer-events-none fixed inset-0 z-modal flex items-center justify-center p-4">
        <DialogPrimitive.Content
          asChild
          onOpenAutoFocus={onOpenAutoFocus}
          aria-describedby={description ? undefined : ''}
        >
          <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              'pointer-events-auto w-full',
              'flex max-h-[calc(100dvh-64px)] flex-col overflow-hidden',
              'rounded-lg border border-line bg-surface shadow-overlay gpu',
              widths,
              className,
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line-subtle px-5 py-4">
              <div className="flex min-w-0 flex-col gap-1">
                <DialogPrimitive.Title className="text-section-title text-fg">
                  {title}
                </DialogPrimitive.Title>
                {description ? (
                  <DialogPrimitive.Description className="text-meta text-fg-muted">
                    {description}
                  </DialogPrimitive.Description>
                ) : null}
              </div>
              {hideClose ? null : (
                <DialogPrimitive.Close asChild>
                  <IconButton label="Chiudi" size="sm" className="-mr-1 -mt-1">
                    <X aria-hidden />
                  </IconButton>
                </DialogPrimitive.Close>
              )}
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

            {footer ? (
              <footer className="flex flex-col-reverse gap-2 border-t border-line-subtle bg-surface-muted px-5 py-3 sm:flex-row sm:justify-end">
                {footer}
              </footer>
            ) : null}
          </motion.div>
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  )
}

/** Wraps `Dialog` so the exit animation runs; use instead of `Dialog` directly. */
export function Modal({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>{open ? children : null}</AnimatePresence>
    </DialogPrimitive.Root>
  )
}

/**
 * Confirmation dialog for destructive or irreversible actions.
 * The confirm button states the action ("Elimina ticket"), never "OK".
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Annulla',
  onConfirm,
  loading,
  tone = 'destructive',
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  loading?: boolean
  tone?: 'destructive' | 'primary'
  children?: React.ReactNode
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        title={title}
        description={description}
        footer={
          <>
            <DialogPrimitive.Close asChild>
              <Button variant="secondary" size="md">
                {cancelLabel}
              </Button>
            </DialogPrimitive.Close>
            <Button
              variant={tone === 'destructive' ? 'destructive' : 'primary'}
              size="md"
              loading={loading}
              onClick={() => void onConfirm()}
            >
              {confirmLabel}
            </Button>
          </>
        }
      >
        {children ?? (
          <p className="text-body-sm text-fg-secondary">
            Questa operazione non può essere annullata.
          </p>
        )}
      </DialogContent>
    </Modal>
  )
}
