import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftRight, Check, Plus, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useCatalog } from '@/hooks/useCatalog'
import { useInstances } from '@/hooks/useCollection'
import { PackieCard } from '@/components/PackieCard'
import { Avatar } from '@/components/AppLayout'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Fields'
import { CoinIcon, EmptyState, PageLoader, SectionTitle } from '@/components/ui/misc'
import { errorMessage, supabase } from '@/lib/supabase'
import type { CardInstance, Profile, Trade } from '@/lib/types'
import { cn, formatNumber, timeAgo } from '@/lib/utils'

function useTrades(userId: string | undefined) {
  return useQuery({
    queryKey: ['trades', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*, from:profiles!trades_from_user_fkey(id, username, avatar_url), to:profiles!trades_to_user_fkey(id, username, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data ?? []
    },
  })
}

function useInstancesById(ids: string[]) {
  return useQuery({
    queryKey: ['instances-by-id', [...ids].sort().join(',')],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('card_instances').select('*').in('id', ids)
      if (error) throw error
      return new Map((data ?? []).map((i) => [i.id, i]))
    },
  })
}

export function TradesPage() {
  const { profile, refreshProfile } = useAuth()
  const trades = useTrades(profile?.id)
  const qc = useQueryClient()
  const [tab, setTab] = useState<'incoming' | 'outgoing' | 'history'>('incoming')
  const [composer, setComposer] = useState(false)
  const allIds = useMemo(() => (trades.data ?? []).flatMap((t) => [...t.offered_instance_ids, ...t.requested_instance_ids]), [trades.data])
  const instances = useInstancesById(allIds)

  if (!profile) return null
  if (trades.isLoading) return <PageLoader />

  const list = (trades.data ?? []).filter((t) =>
    tab === 'incoming' ? t.status === 'pending' && t.to_user === profile.id : tab === 'outgoing' ? t.status === 'pending' && t.from_user === profile.id : t.status !== 'pending',
  )
  const incomingCount = (trades.data ?? []).filter((t) => t.status === 'pending' && t.to_user === profile.id).length

  async function respond(t: Trade, action: 'accept' | 'decline' | 'cancel') {
    const { data, error } = await supabase.rpc('respond_trade', { p_trade_id: t.id, p_action: action })
    if (error) return toast.error(errorMessage(error))
    if (action === 'accept' && data === 'cancelled') toast.error('Those cards changed hands — the trade was cancelled.')
    else toast.success(action === 'accept' ? 'Trade complete!' : action === 'decline' ? 'Trade declined' : 'Trade cancelled')
    qc.invalidateQueries({ queryKey: ['trades'] })
    qc.invalidateQueries({ queryKey: ['instances'] })
    refreshProfile()
  }

  return (
    <div>
      <SectionTitle
        eyebrow="Trading"
        title="Trade with collectors"
        action={
          <Button onClick={() => setComposer(true)}>
            <Plus className="h-4 w-4" /> New trade
          </Button>
        }
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ['incoming', `Incoming${incomingCount ? ` (${incomingCount})` : ''}`],
            ['outgoing', 'Sent'],
            ['history', 'History'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn('rounded-xl px-4 py-2 text-sm font-semibold transition', tab === k ? 'bg-white/10 text-white ring-1 ring-white/15' : 'text-slate-400 hover:text-white')}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<ArrowLeftRight className="h-8 w-8" />} title="No trades here" action={<Button onClick={() => setComposer(true)}>Propose a trade</Button>}>
          Find a collector by username and offer a swap.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {list.map((t) => (
            <div key={t.id} className="glass rounded-2xl p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Avatar name={t.from?.username ?? '?'} url={t.from?.avatar_url} className="h-7 w-7 text-xs" />
                  <span className="font-semibold">{t.from?.username}</span>
                  <ArrowLeftRight className="h-4 w-4 text-slate-500" />
                  <Avatar name={t.to?.username ?? '?'} url={t.to?.avatar_url} className="h-7 w-7 text-xs" />
                  <span className="font-semibold">{t.to?.username}</span>
                  <span className="text-xs text-slate-500">· {timeAgo(t.created_at)}</span>
                </div>
                <span
                  className={cn(
                    'chip capitalize',
                    t.status === 'accepted' && 'text-emerald-300',
                    t.status === 'pending' && 'text-amber-200',
                    (t.status === 'declined' || t.status === 'cancelled') && 'text-slate-400',
                  )}
                >
                  {t.status}
                </span>
              </div>
              {t.message && <p className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-sm italic text-slate-300">“{t.message}”</p>}
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <TradeSide title={`${t.from?.username} gives`} ids={t.offered_instance_ids} coins={t.offered_coins} instances={instances.data} />
                <ArrowLeftRight className="mx-auto hidden h-6 w-6 text-violet-300 md:block" />
                <TradeSide title={`${t.to?.username} gives`} ids={t.requested_instance_ids} instances={instances.data} />
              </div>
              {t.status === 'pending' && (
                <div className="mt-4 flex justify-end gap-2">
                  {t.to_user === profile.id ? (
                    <>
                      <Button variant="ghost" onClick={() => respond(t, 'decline')}>
                        <X className="h-4 w-4" /> Decline
                      </Button>
                      <Button onClick={() => respond(t, 'accept')}>
                        <Check className="h-4 w-4" /> Accept trade
                      </Button>
                    </>
                  ) : (
                    <Button variant="danger" onClick={() => respond(t, 'cancel')}>
                      Cancel offer
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {composer && <TradeComposer me={profile} onClose={() => setComposer(false)} />}
    </div>
  )
}

function TradeSide({ title, ids, coins, instances }: { title: string; ids: string[]; coins?: number; instances?: Map<string, CardInstance> }) {
  const { cardById, rarityById } = useCatalog()
  return (
    <div className="rounded-xl bg-white/[0.03] p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">{title}</p>
      <div className="flex flex-wrap gap-2">
        {ids.map((id) => {
          const inst = instances?.get(id)
          const card = inst ? cardById.get(inst.card_id) : undefined
          return card && inst ? (
            <div key={id} className="w-16 sm:w-20">
              <PackieCard card={card} rarity={rarityById.get(card.rarity_id)} serial={inst.serial_number} foil={inst.foil} compact interactive={false} />
            </div>
          ) : (
            <div key={id} className="aspect-[5/7] w-16 animate-pulse rounded-lg bg-white/5 sm:w-20" />
          )
        })}
        {!!coins && (
          <span className="flex items-center gap-1 self-center rounded-xl bg-amber-400/10 px-3 py-2 font-bold text-amber-200">
            <CoinIcon /> {formatNumber(coins)}
          </span>
        )}
        {ids.length === 0 && !coins && <span className="text-sm text-slate-500">Nothing</span>}
      </div>
    </div>
  )
}

function TradeComposer({ me, onClose }: { me: Profile; onClose: () => void }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [partner, setPartner] = useState<Pick<Profile, 'id' | 'username' | 'avatar_url'> | null>(null)
  const [offered, setOffered] = useState<Set<string>>(new Set())
  const [requested, setRequested] = useState<Set<string>>(new Set())
  const [coins, setCoins] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const mine = useInstances(me.id)
  const theirs = useInstances(partner?.id)

  const results = useQuery({
    queryKey: ['player-search', search],
    enabled: search.trim().length >= 2 && !partner,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${search.trim()}%`)
        .neq('id', me.id)
        .eq('is_banned', false)
        .limit(8)
      if (error) throw error
      return data ?? []
    },
  })

  async function send() {
    if (!partner) return
    setBusy(true)
    const { error } = await supabase.rpc('create_trade', {
      p_to_user: partner.id,
      p_offered: [...offered],
      p_requested: [...requested],
      p_offered_coins: parseInt(coins, 10) || 0,
      p_message: message,
    })
    setBusy(false)
    if (error) return toast.error(errorMessage(error))
    toast.success(`Trade offer sent to ${partner.username}`)
    qc.invalidateQueries({ queryKey: ['trades'] })
    onClose()
  }

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else if (next.size < 10) next.add(id)
    setter(next)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="New trade"
      variant="drawer"
      footer={
        partner && (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={busy} onClick={send} disabled={offered.size === 0 && requested.size === 0}>
              Send offer
            </Button>
          </>
        )
      }
    >
      <div className="space-y-6 p-5">
        {!partner ? (
          <div>
            <Field label="Trade with">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by username…" className="pl-9" />
              </div>
            </Field>
            <div className="mt-3 space-y-1.5">
              {(results.data ?? []).map((p) => (
                <button key={p.id} onClick={() => setPartner(p)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/[0.06]">
                  <Avatar name={p.username} url={p.avatar_url} className="h-8 w-8 text-sm" />
                  <span className="font-semibold">{p.username}</span>
                </button>
              ))}
              {search.trim().length >= 2 && results.data?.length === 0 && <p className="text-sm text-slate-500">No players found.</p>}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              <span className="flex items-center gap-2">
                <Avatar name={partner.username} url={partner.avatar_url} className="h-8 w-8 text-sm" />
                <span className="font-semibold">{partner.username}</span>
              </span>
              <button className="text-xs font-semibold text-slate-400 hover:text-white" onClick={() => { setPartner(null); setRequested(new Set()) }}>
                Change
              </button>
            </div>
            <Picker title={`You give (${offered.size}/10)`} items={mine.data ?? []} selected={offered} onToggle={(id) => toggle(offered, setOffered, id)} loading={mine.isLoading} />
            <Field label="Add coins (optional)">
              <div className="relative">
                <CoinIcon className="absolute left-3 top-1/2 -translate-y-1/2" />
                <Input type="number" min={0} max={me.coins} value={coins} onChange={(e) => setCoins(e.target.value)} className="pl-9" placeholder="0" />
              </div>
            </Field>
            <Picker title={`You get (${requested.size}/10)`} items={theirs.data ?? []} selected={requested} onToggle={(id) => toggle(requested, setRequested, id)} loading={theirs.isLoading} />
            <Field label="Message (optional)">
              <Textarea maxLength={200} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Fair swap? 🙂" />
            </Field>
          </>
        )}
      </div>
    </Modal>
  )
}

function Picker({ title, items, selected, onToggle, loading }: { title: string; items: CardInstance[]; selected: Set<string>; onToggle: (id: string) => void; loading: boolean }) {
  const { cardById, rarityById } = useCatalog()
  return (
    <div>
      <p className="label">{title}</p>
      {loading ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <p className="rounded-xl bg-white/5 px-3 py-4 text-center text-sm text-slate-500">No cards</p>
      ) : (
        <div className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto rounded-xl bg-white/[0.02] p-2 sm:grid-cols-5">
          {items.map((inst) => {
            const card = cardById.get(inst.card_id)
            if (!card) return null
            const on = selected.has(inst.id)
            return (
              <button key={inst.id} onClick={() => onToggle(inst.id)} className={cn('relative rounded-lg transition', on ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-ink-900' : 'opacity-80 hover:opacity-100')}>
                <PackieCard card={card} rarity={rarityById.get(card.rarity_id)} serial={inst.serial_number} foil={inst.foil} compact interactive={false} />
                {on && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-violet-500 p-0.5">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
