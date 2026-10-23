import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  className?: string
  /** "center" dialog or right-side "drawer" */
  variant?: 'center' | 'drawer'
  footer?: ReactNode
}

export function Modal({ open, onClose, title, children, className, variant = 'center', footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={cn('fixed inset-0 z-50 flex', variant === 'center' ? 'items-end justify-center sm:items-center sm:p-4' : 'justify-end')}>
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              'glass-strong relative flex max-h-[92vh] w-full flex-col overflow-hidden shadow-2xl',
              variant === 'center' ? 'rounded-t-3xl sm:max-w-lg sm:rounded-3xl' : 'h-full max-h-none max-w-2xl rounded-l-3xl',
              className,
            )}
            initial={variant === 'center' ? { opacity: 0, y: 40, scale: 0.97 } : { x: '100%' }}
            animate={variant === 'center' ? { opacity: 1, y: 0, scale: 1 } : { x: 0 }}
            exit={variant === 'center' ? { opacity: 0, y: 40, scale: 0.97 } : { x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            {title !== undefined && (
              <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
                <h2 className="text-lg font-semibold">{title}</h2>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
            {footer && <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
