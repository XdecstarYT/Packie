import { useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { errorMessage, supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'

type TableName = 'cards' | 'packs' | 'seasons' | 'sets' | 'rarities' | 'drops'

// The table name is dynamic here, so use the untyped client view; callers pass rows shaped for `table`.
const db = supabase as unknown as SupabaseClient

export function AdminHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  )
}

export function Panel({ children, className, title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cn('glass rounded-2xl', className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
          <h2 className="text-base font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function StatusPill({ tone, children }: { tone: 'green' | 'amber' | 'slate' | 'rose' | 'sky' | 'violet'; children: ReactNode }) {
  const tones = {
    green: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30',
    amber: 'bg-amber-400/10 text-amber-200 ring-amber-400/30',
    slate: 'bg-white/5 text-slate-400 ring-white/10',
    rose: 'bg-rose-400/10 text-rose-300 ring-rose-400/30',
    sky: 'bg-sky-400/10 text-sky-300 ring-sky-400/30',
    violet: 'bg-violet-400/10 text-violet-200 ring-violet-400/30',
  }
  return <span className={cn('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1', tones[tone])}>{children}</span>
}

/** Insert / update / delete against a catalog table, refreshing cached data. */
export function useAdminMutations(table: TableName) {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['catalog'] })
    qc.invalidateQueries({ queryKey: ['admin'] })
  }

  async function run<T>(fn: () => PromiseLike<{ data: T | null; error: unknown }>, ok: string): Promise<T | null> {
    setBusy(true)
    try {
      const { data, error } = await fn()
      if (error) throw error
      toast.success(ok)
      refresh()
      return data
    } catch (e) {
      toast.error(errorMessage(e))
      return null
    } finally {
      setBusy(false)
    }
  }

  return {
    busy,
    insert: (row: Record<string, unknown>, ok = 'Created') => run(() => db.from(table).insert(row).select().single(), ok),
    update: (id: string, row: Record<string, unknown>, ok = 'Saved') => run(() => db.from(table).update(row).eq('id', id).select().single(), ok),
    remove: (id: string, ok = 'Deleted') => run(() => db.from(table).delete().eq('id', id), ok),
  }
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Delete',
  onConfirm,
  onClose,
  busy,
}: {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
  busy?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3 p-5 text-sm text-slate-300">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" />
        <div>{children}</div>
      </div>
    </Modal>
  )
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-slate-400">
          <tr className="border-b border-white/10">
            {head.map((h, i) => (
              <th key={i} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">{children}</tbody>
      </table>
    </div>
  )
}
