import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Gift, Search, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useCatalog } from '@/hooks/useCatalog'
import { useInstances } from '@/hooks/useCollection'
import { AdminHeader, Panel, StatusPill, Table } from '@/components/owner/Admin'
import { Avatar } from '@/components/AppLayout'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Fields'
import { CoinIcon, ErrorState, GemIcon, PageLoader } from '@/components/ui/misc'
import { errorMessage, supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { cn, formatDate, formatNumber, levelFromXp, timeAgo } from '@/lib/utils'

export function PlayersAdmin() {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Profile | null>(null)
  const players = useQuery({
    queryKey: ['admin', 'players', q],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100)
      if (q.trim()) query = query.ilike('username', `%${q.trim()}%`)
      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })

  return (
    <div>
      <AdminHeader title="Players" subtitle="Look up collectors, grant rewards and moderate accounts." />
      <div className="glass mb-5 rounded-2xl p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by username…" className="pl-9" />
        </div>
      </div>
      {players.isLoading ? (
        <PageLoader />
      ) : players.error ? (
        <ErrorState error={players.error} onRetry={players.refetch} />
      ) : (
        <Panel>
          <Table head={['Player', 'Level', 'Coins', 'Gems', 'Joined', 'Status']}>
            {(players.data ?? []).map((p) => (
              <tr key={p.id} className="cursor-pointer hover:bg-white/[0.03]" onClick={() => setSelected(p)}>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2.5 font-semibold">
                    <Avatar name={p.username} url={p.avatar_url} className="h-8 w-8 text-sm" />
                    {p.username}
                    {p.role === 'owner' && <StatusPill tone="amber">Owner</StatusPill>}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">{levelFromXp(p.xp).level}</td>
                <td className="px-4 py-3 tabular-nums">{formatNumber(p.coins)}</td>
                <td className="px-4 py-3 tabular-nums">{formatNumber(p.gems)}</td>
                <td className="px-4 py-3 text-slate-400">{formatDate(p.created_at)}</td>
                <td className="px-4 py-3">{p.is_banned ? <StatusPill tone="rose">Banned</StatusPill> : <StatusPill tone="green">Active</StatusPill>}</td>
              </tr>
            ))}
          </Table>
        </Panel>
      )}
      {selected && <PlayerDrawer player={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function PlayerDrawer({ player, onClose }: { player: Profile; onClose: () => void }) {
  const qc = useQueryClient()
  const { catalog, cardById } = useCatalog()
  const instances = useInstances(player.id)
  const [coins, setCoins] = useState('')
  const [gems, setGems] = useState('')
  const [note, setNote] = useState('')
  const [cardId, setCardId] = useState('')
  const [busy, setBusy] = useState(false)
  const live = useQuery({
    queryKey: ['admin', 'player', player.id],
    queryFn: async () => {
      const [p, tx] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', player.id).single(),
        supabase.from('transactions').select('*').eq('user_id', player.id).order('created_at', { ascending: false }).limit(25),
      ])
      if (p.error) throw p.error
      return { profile: p.data, tx: tx.data ?? [] }
    },
  })
  const p = live.data?.profile ?? player
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin'] })
    qc.invalidateQueries({ queryKey: ['instances', player.id] })
  }

  async function grant() {
    const c = parseInt(coins) || 0
    const g = parseInt(gems) || 0
    if (!c && !g) return toast.error('Enter coins or gems (negative to deduct)')
    setBusy(true)
    const { error } = await supabase.rpc('owner_grant_currency', { p_user_id: player.id, p_coins: c, p_gems: g, p_note: note })
    setBusy(false)
    if (error) return toast.error(errorMessage(error))
    toast.success('Balance updated')
    setCoins('')
    setGems('')
    setNote('')
    refresh()
  }
  async function grantCard() {
    if (!cardId) return
    setBusy(true)
    const { error } = await supabase.rpc('owner_grant_card', { p_user_id: player.id, p_card_id: cardId })
    setBusy(false)
    if (error) return toast.error(errorMessage(error))
    toast.success(`Gave ${cardById.get(cardId)?.name}`)
    setCardId('')
    refresh()
    qc.invalidateQueries({ queryKey: ['catalog'] })
  }
  async function toggleBan() {
    setBusy(true)
    const { error } = await supabase.rpc('owner_set_ban', { p_user_id: player.id, p_banned: !p.is_banned })
    setBusy(false)
    if (error) return toast.error(errorMessage(error))
    toast.success(p.is_banned ? 'Player unbanned' : 'Player banned')
    refresh()
  }

  return (
    <Modal open onClose={onClose} variant="drawer" title={p.username}>
      <div className="space-y-5 p-5">
        <div className="flex items-center gap-4">
          <Avatar name={p.username} url={p.avatar_url} className="h-16 w-16 text-2xl" />
          <div>
            <p className="text-xl font-semibold">{p.username}</p>
            <p className="text-sm text-slate-400">
              Level {levelFromXp(p.xp).level} · {formatNumber(instances.data?.length ?? 0)} cards · joined {formatDate(p.created_at)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-xl p-3">
            <p className="flex items-center gap-1 text-xs text-slate-400">
              <CoinIcon /> Coins
            </p>
            <p className="font-display text-2xl font-bold">{formatNumber(p.coins)}</p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="flex items-center gap-1 text-xs text-slate-400">
              <GemIcon /> Gems
            </p>
            <p className="font-display text-2xl font-bold">{formatNumber(p.gems)}</p>
          </div>
        </div>

        <Panel title={<span className="flex items-center gap-2"><Gift className="h-4 w-4 text-amber-300" /> Grant or deduct currency</span>}>
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Coins">
                <Input type="number" value={coins} onChange={(e) => setCoins(e.target.value)} placeholder="e.g. 500 or -100" />
              </Field>
              <Field label="Gems">
                <Input type="number" value={gems} onChange={(e) => setGems(e.target.value)} placeholder="e.g. 5" />
              </Field>
            </div>
            <Field label="Note (shown in their history)">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tournament prize" />
            </Field>
            <Button loading={busy} onClick={grant}>
              Apply
            </Button>
          </div>
        </Panel>

        <Panel title="Give a card">
          <div className="flex gap-2 p-4">
            <Select value={cardId} onChange={(e) => setCardId(e.target.value)}>
              <option value="">Choose a card…</option>
              {catalog?.cards.map((c) => (
                <option key={c.id} value={c.id} disabled={c.max_print_run != null && c.printed_count >= c.max_print_run}>
                  {c.name}
                  {c.max_print_run ? ` (${c.max_print_run - c.printed_count} left)` : ''}
                </option>
              ))}
            </Select>
            <Button variant="secondary" loading={busy} disabled={!cardId} onClick={grantCard}>
              Give
            </Button>
          </div>
        </Panel>

        <Panel title="Recent activity">
          <div className="max-h-72 divide-y divide-white/5 overflow-y-auto">
            {(live.data?.tx ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{t.note ?? t.type}</p>
                  <p className="text-xs capitalize text-slate-500">
                    {t.type.replace('_', ' ')} · {timeAgo(t.created_at)}
                  </p>
                </div>
                <div className="text-right text-xs font-bold tabular-nums">
                  {t.coins_delta !== 0 && <p className={cn(t.coins_delta > 0 ? 'text-emerald-300' : 'text-rose-300')}>{t.coins_delta > 0 ? '+' : ''}{formatNumber(t.coins_delta)} coins</p>}
                  {t.gems_delta !== 0 && <p className={cn(t.gems_delta > 0 ? 'text-emerald-300' : 'text-rose-300')}>{t.gems_delta > 0 ? '+' : ''}{formatNumber(t.gems_delta)} gems</p>}
                </div>
              </div>
            ))}
            {live.data?.tx.length === 0 && <p className="px-4 py-3 text-sm text-slate-500">No activity yet.</p>}
          </div>
        </Panel>

        {p.role !== 'owner' && (
          <Button variant={p.is_banned ? 'secondary' : 'danger'} loading={busy} onClick={toggleBan} className="w-full">
            {p.is_banned ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />} {p.is_banned ? 'Unban player' : 'Ban player'}
          </Button>
        )}
      </div>
    </Modal>
  )
}
