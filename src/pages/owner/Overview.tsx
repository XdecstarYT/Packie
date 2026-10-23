import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Coins, Crown, Layers, Package, Plus, Rocket, Sparkles, Store, Users } from 'lucide-react'
import { AdminHeader, Panel } from '@/components/owner/Admin'
import { Button } from '@/components/ui/Button'
import { ErrorState, PageLoader } from '@/components/ui/misc'
import { supabase } from '@/lib/supabase'
import { formatNumber } from '@/lib/utils'

interface OwnerStats {
  players: number
  new_players_7d: number
  packs_opened_today: number
  packs_opened_7d: number
  packs_opened_total: number
  coins_spent_7d: number
  gems_spent_7d: number
  cards_in_circulation: number
  active_listings: number
  daily: { day: string; opened: number; coins: number }[]
  top_packs: { id: string; name: string; theme_color: string; opened: number; coins: number }[]
  limited_cards: { id: string; name: string; printed_count: number; max_print_run: number; remaining: number }[]
}

export function Overview() {
  const q = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_owner_stats')
      if (error) throw error
      return data as unknown as OwnerStats
    },
    refetchInterval: 30_000,
  })
  if (q.isLoading) return <PageLoader />
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />
  const s = q.data

  const kpis = [
    { label: 'Players', value: s.players, sub: `+${s.new_players_7d} this week`, icon: Users },
    { label: 'Packs opened today', value: s.packs_opened_today, sub: `${formatNumber(s.packs_opened_7d)} this week`, icon: Package },
    { label: 'Coins spent (7d)', value: s.coins_spent_7d, sub: `${formatNumber(s.gems_spent_7d)} gems`, icon: Coins },
    { label: 'Cards in circulation', value: s.cards_in_circulation, sub: `${formatNumber(s.active_listings)} on market`, icon: Layers },
  ]
  const maxTop = Math.max(1, ...s.top_packs.map((p) => p.opened))

  return (
    <div>
      <AdminHeader
        title="Overview"
        subtitle="How Packie is doing right now."
        action={
          <>
            <Link to="/owner/cards">
              <Button variant="secondary">
                <Sparkles className="h-4 w-4" /> New card
              </Button>
            </Link>
            <Link to="/owner/packs">
              <Button variant="secondary">
                <Plus className="h-4 w-4" /> New pack
              </Button>
            </Link>
            <Link to="/owner/drops">
              <Button>
                <Rocket className="h-4 w-4" /> Schedule drop
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{k.label}</p>
              <k.icon className="h-4 w-4 text-slate-500" />
            </div>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums">{formatNumber(k.value)}</p>
            <p className="mt-0.5 text-xs text-slate-400">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Packs opened · last 14 days">
          <DailyBars data={s.daily} />
        </Panel>
        <Panel title="Top packs">
          <div className="space-y-3 p-5">
            {s.top_packs.map((p) => (
              <div key={p.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">{p.name}</span>
                  <span className="tabular-nums text-slate-300">{formatNumber(p.opened)} opened</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full" style={{ width: `${(p.opened / maxTop) * 100}%`, background: p.theme_color }} />
                </div>
              </div>
            ))}
            {s.top_packs.length === 0 && <p className="text-sm text-slate-500">No packs yet.</p>}
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" title={<span className="flex items-center gap-2"><Crown className="h-4 w-4 text-amber-300" /> Limited editions remaining</span>}>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {s.limited_cards.map((c) => {
            const pct = c.printed_count / c.max_print_run
            return (
              <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{c.name}</span>
                  <span className="tabular-nums text-slate-300">
                    {formatNumber(c.remaining)} left
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-amber-300" style={{ width: `${pct * 100}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatNumber(c.printed_count)} / {formatNumber(c.max_print_run)} printed
                </p>
              </div>
            )
          })}
          {s.limited_cards.length === 0 && <p className="text-sm text-slate-500">No limited-edition cards yet.</p>}
        </div>
      </Panel>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Store className="h-3.5 w-3.5" /> {formatNumber(s.packs_opened_total)} packs opened all-time · refreshes every 30s
      </div>
    </div>
  )
}

/** Single-series bar chart: one hue, rounded tops, hover tooltip, recessive axis. */
function DailyBars({ data }: { data: OwnerStats['daily'] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640
  const H = 220
  const pad = { l: 36, r: 8, t: 16, b: 28 }
  const max = Math.max(4, ...data.map((d) => d.opened))
  const niceMax = Math.ceil(max / 4) * 4
  const bw = (W - pad.l - pad.r) / Math.max(1, data.length)
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / niceMax)
  const ticks = [0, niceMax / 2, niceMax]

  return (
    <div className="relative p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Packs opened per day">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,.07)" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-500 text-[11px]">
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.l + i * bw + 2
          const w = Math.max(2, bw - 4)
          const h = Math.max(0, y(0) - y(d.opened))
          const r = Math.min(4, w / 2, h)
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x},${y(0)} V${y(d.opened) + r} Q${x},${y(d.opened)} ${x + r},${y(d.opened)} H${x + w - r} Q${x + w},${y(d.opened)} ${x + w},${y(d.opened) + r} V${y(0)}Z`}
                  fill={hover === i ? '#c4b5fd' : '#a78bfa'}
                />
              )}
              {(i % 2 === 0 || data.length <= 7) && (
                <text x={x + w / 2} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[10px]">
                  {new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </text>
              )}
            </g>
          )
        })}
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,.2)" />
      </svg>
      {hover != null && data[hover] && (
        <div
          className="glass-strong pointer-events-none absolute top-2 rounded-lg px-3 py-2 text-xs shadow-xl"
          style={{ left: `calc(${((pad.l + (hover + 0.5) * bw) / W) * 100}% - 50px)` }}
        >
          <p className="font-semibold text-white">{new Date(data[hover].day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
          <p className="text-slate-300">{formatNumber(data[hover].opened)} packs</p>
          <p className="text-slate-400">{formatNumber(data[hover].coins)} coins</p>
        </div>
      )}
    </div>
  )
}
