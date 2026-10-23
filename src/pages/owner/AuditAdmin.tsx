import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { AdminHeader, Panel, StatusPill } from '@/components/owner/Admin'
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/misc'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

const TONE: Record<string, 'green' | 'sky' | 'rose' | 'amber' | 'violet'> = { insert: 'green', update: 'sky', delete: 'rose', ban: 'rose', unban: 'green', grant: 'amber', grant_card: 'violet' }

export function AuditAdmin() {
  const [open, setOpen] = useState<number | null>(null)
  const q = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: async () => {
      const { data, error } = await supabase.from('audit_log').select('*, actor:profiles(username)').order('created_at', { ascending: false }).limit(200)
      if (error) throw error
      return data ?? []
    },
  })
  if (q.isLoading) return <PageLoader />
  if (q.error) return <ErrorState error={q.error} onRetry={q.refetch} />

  return (
    <div>
      <AdminHeader title="Audit log" subtitle="Every change made from the owner dashboard (latest 200)." />
      {q.data?.length === 0 ? (
        <EmptyState title="Nothing logged yet">Changes you make to cards, packs, seasons and drops will appear here.</EmptyState>
      ) : (
        <Panel>
          <div className="divide-y divide-white/5">
            {q.data?.map((e) => {
              const diff = e.diff as { new?: { name?: string }; old?: { name?: string } } | null
              const label = diff?.new?.name ?? diff?.old?.name ?? e.entity_id
              return (
                <div key={e.id}>
                  <button onClick={() => setOpen(open === e.id ? null : e.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-white/[0.02]">
                    <StatusPill tone={TONE[e.action] ?? 'sky'}>{e.action}</StatusPill>
                    <span className="font-mono text-xs text-slate-400">{e.entity}</span>
                    <span className="flex-1 truncate font-medium">{label}</span>
                    <span className="hidden text-xs text-slate-500 sm:block">{e.actor?.username ?? 'system'}</span>
                    <span className="text-xs text-slate-500">{formatDate(e.created_at, true)}</span>
                    <ChevronDown className={`h-4 w-4 text-slate-500 transition ${open === e.id ? 'rotate-180' : ''}`} />
                  </button>
                  {open === e.id && <pre className="max-h-80 overflow-auto bg-black/30 px-4 py-3 text-xs text-slate-300">{JSON.stringify(e.diff, null, 2)}</pre>}
                </div>
              )
            })}
          </div>
        </Panel>
      )}
    </div>
  )
}
