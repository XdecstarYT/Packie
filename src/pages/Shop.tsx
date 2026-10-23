import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { Clock, Crown, Info, PackageOpen, Users } from 'lucide-react'
import { toast } from 'sonner'
import { dropPrice, dropStatus, packAvailability, useCatalog } from '@/hooks/useCatalog'
import { useAuth } from '@/hooks/useAuth'
import { useInstances } from '@/hooks/useCollection'
import { PackArt } from '@/components/PackArt'
import { PackOpening } from '@/components/PackOpening'
import { Countdown } from '@/components/Countdown'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { CoinIcon, EmptyState, ErrorState, GemIcon, PageLoader, SectionTitle } from '@/components/ui/misc'
import { isAvailable, packAtLeastOneOdds, packCandidates, slotRarityOdds, formatPct } from '@/lib/odds'
import { errorMessage, supabase } from '@/lib/supabase'
import type { OpenedCard, Pack } from '@/lib/types'
import { cn, formatNumber, hexToRgba } from '@/lib/utils'

export function useOpenPack() {
  const qc = useQueryClient()
  const { profile, refreshProfile } = useAuth()
  const [busy, setBusy] = useState(false)

  async function open(pack: Pack, currency: 'coins' | 'gems'): Promise<OpenedCard[] | null> {
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('buy_and_open_pack', { p_pack_id: pack.id, p_currency: currency })
      if (error) throw error
      const res = data as unknown as { cards: OpenedCard[] }
      return res.cards
    } catch (e) {
      toast.error(errorMessage(e))
      return null
    } finally {
      setBusy(false)
      refreshProfile()
      qc.invalidateQueries({ queryKey: ['catalog'] })
      qc.invalidateQueries({ queryKey: ['instances', profile?.id] })
    }
  }
  return { open, busy }
}

export function ShopPage() {
  const { catalog, isLoading, error, refetch, cardById, rarityById, setById, setSeason } = useCatalog()
  const { profile } = useAuth()
  const instances = useInstances(profile?.id)
  const [selected, setSelected] = useState<Pack | null>(null)
  const [opening, setOpening] = useState<{ pack: Pack; results: OpenedCard[]; ownedBefore: Set<string> } | null>(null)
  const { open, busy } = useOpenPack()

  const packs = useMemo(() => catalog?.packs.filter((p) => p.is_active) ?? [], [catalog])
  const liveDrop = catalog?.drops.find((d) => d.is_published && dropStatus(d) === 'live')

  if (isLoading) return <PageLoader />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  async function buy(pack: Pack, currency: 'coins' | 'gems') {
    const ownedBefore = new Set((instances.data ?? []).map((i) => i.card_id))
    const results = await open(pack, currency)
    if (results) {
      setSelected(null)
      setOpening({ pack, results, ownedBefore })
    }
  }

  return (
    <div>
      {liveDrop && (
        <div
          className="mb-10 overflow-hidden rounded-[2rem] border border-white/10 p-6 sm:p-8"
          style={{
            background: `radial-gradient(500px 250px at 0% 0%, ${hexToRgba(liveDrop.theme_color, 0.4)}, transparent 70%), rgba(16,12,43,.7)`,
          }}
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="chip border-rose-400/40 bg-rose-500/15 text-rose-200">
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" /> Live drop
              </span>
              <h1 className="mt-2 text-3xl font-semibold">{liveDrop.name}</h1>
              <p className="mt-1 max-w-xl text-sm text-slate-300">{liveDrop.description}</p>
            </div>
            {liveDrop.ends_at && <Countdown to={liveDrop.ends_at} />}
          </div>
        </div>
      )}

      <SectionTitle eyebrow="Pack shop" title="Choose your pack" />

      {packs.length === 0 ? (
        <EmptyState icon={<PackageOpen className="h-8 w-8" />} title="No packs on sale">
          New packs are on the way. Check back soon!
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((p, i) => {
            const avail = packAvailability(p)
            const special = dropPrice(catalog, p.id)
            return (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setSelected(p)}
                className="glass group relative flex flex-col items-center overflow-hidden rounded-[2rem] p-6 text-left transition hover:-translate-y-1 hover:border-white/20"
              >
                <div className="pointer-events-none absolute -top-20 h-60 w-60 rounded-full blur-[70px]" style={{ background: hexToRgba(p.theme_color, 0.45) }} />
                <div className="relative w-44 transition duration-500 group-hover:-rotate-3 group-hover:scale-105">
                  <PackArt pack={p} />
                </div>
                <div className="relative mt-6 w-full">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-semibold">{p.name}</h3>
                    {p.is_limited_edition && (
                      <span className="chip shrink-0 border-amber-300/40 bg-amber-400/10 text-amber-200">
                        <Crown className="h-3 w-3" /> Limited
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">{p.description}</p>
                  {p.total_supply != null && <SupplyBar sold={p.sold_count} total={p.total_supply} color={p.theme_color} />}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="flex items-center gap-3 text-lg font-bold">
                      {p.price_coins != null && (
                        <span className="flex items-center gap-1.5">
                          <CoinIcon className="h-5 w-5" />
                          {special != null ? (
                            <>
                              <span className="text-amber-200">{formatNumber(special)}</span>
                              <span className="text-sm font-semibold text-slate-500 line-through">{formatNumber(p.price_coins)}</span>
                            </>
                          ) : (
                            formatNumber(p.price_coins)
                          )}
                        </span>
                      )}
                      {p.price_gems != null && (
                        <span className="flex items-center gap-1.5 text-cyan-100">
                          <GemIcon className="h-5 w-5" />
                          {p.price_gems}
                        </span>
                      )}
                    </span>
                    <span className={cn('rounded-xl px-3 py-1.5 text-sm font-bold', avail.ok ? 'bg-brand text-white' : 'bg-white/10 text-slate-400')}>
                      {avail.ok ? 'Open' : avail.reason}
                    </span>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      )}

      {selected && catalog && (
        <PackDetail
          pack={selected}
          onClose={() => setSelected(null)}
          onBuy={(c) => buy(selected, c)}
          busy={busy}
          special={dropPrice(catalog, selected.id)}
          coins={profile?.coins ?? 0}
          gems={profile?.gems ?? 0}
          availableRarities={
            new Set(
              packCandidates(selected, catalog.cards, setSeason, catalog.pool)
                .filter((c) => isAvailable(c.card))
                .map((c) => rarityById.get(c.card.rarity_id)?.slug)
                .filter((s): s is string => !!s),
            )
          }
          rarities={catalog.rarities}
        />
      )}

      {opening && (
        <PackOpening
          pack={opening.pack}
          results={opening.results}
          cardById={cardById}
          rarityById={rarityById}
          setById={setById}
          ownedBefore={opening.ownedBefore}
          onClose={() => setOpening(null)}
          onOpenAnother={() => {
            const p = opening.pack
            setOpening(null)
            setSelected(catalog?.packs.find((x) => x.id === p.id) ?? p)
          }}
        />
      )}
    </div>
  )
}

function SupplyBar({ sold, total, color }: { sold: number; total: number; color: string }) {
  const left = Math.max(0, total - sold)
  const pct = Math.min(100, (sold / total) * 100)
  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between text-xs font-semibold">
        <span className="text-slate-400">
          <Users className="mr-1 inline h-3 w-3" />
          {formatNumber(left)} of {formatNumber(total)} left
        </span>
        <span style={{ color }}>{Math.round(pct)}% claimed</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function PackDetail({
  pack,
  onClose,
  onBuy,
  busy,
  special,
  coins,
  gems,
  availableRarities,
  rarities,
}: {
  pack: Pack
  onClose: () => void
  onBuy: (c: 'coins' | 'gems') => void
  busy: boolean
  special: number | null
  coins: number
  gems: number
  availableRarities: Set<string>
  rarities: { slug: string; name: string; color: string; sort_order: number }[]
}) {
  const avail = packAvailability(pack)
  const priceCoins = special ?? pack.price_coins
  const perPack = packAtLeastOneOdds(pack.slots, availableRarities)
  const sorted = [...rarities].sort((a, b) => a.sort_order - b.sort_order).filter((r) => (perPack[r.slug] ?? 0) > 0)

  return (
    <Modal open onClose={onClose} title={pack.name} className="sm:max-w-2xl">
      <div className="grid gap-6 p-5 sm:grid-cols-[180px_1fr]">
        <div className="mx-auto w-40 sm:w-full">
          <PackArt pack={pack} />
        </div>
        <div>
          <p className="text-sm text-slate-300">{pack.description}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="chip">{pack.slots.length} cards</span>
            {pack.per_user_limit && <span className="chip">Limit {pack.per_user_limit} per player</span>}
            {pack.available_until && (
              <span className="chip">
                <Clock className="h-3 w-3" /> Ends <Countdown to={pack.available_until} compact />
              </span>
            )}
          </div>

          <h4 className="mt-5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-400">
            <Info className="h-3.5 w-3.5" /> Drop rates
          </h4>
          <div className="mt-2 overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.04] text-xs text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Rarity</th>
                  {pack.slots.map((s, i) => (
                    <th key={i} className="hidden px-2 py-2 text-right font-semibold md:table-cell" title={s.label}>
                      #{i + 1}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-semibold">Per pack</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.slug} className="border-t border-white/5">
                    <td className="px-3 py-2 font-semibold" style={{ color: r.color }}>
                      {r.name}
                    </td>
                    {pack.slots.map((s, i) => {
                      const p = slotRarityOdds(s, availableRarities)[r.slug] ?? 0
                      return (
                        <td key={i} className="hidden px-2 py-2 text-right tabular-nums text-slate-400 md:table-cell">
                          {p ? formatPct(p) : '—'}
                        </td>
                      )
                    })}
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{formatPct(perPack[r.slug] ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">“Per pack” is the chance of at least one card of that rarity. Sold-out cards are removed from the odds.</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-white/10 p-5 sm:flex-row sm:justify-end">
        {!avail.ok ? (
          <Button disabled size="lg">
            {avail.reason}
          </Button>
        ) : (
          <>
            {pack.price_gems != null && (
              <Button size="lg" variant="secondary" loading={busy} disabled={gems < pack.price_gems} onClick={() => onBuy('gems')}>
                <GemIcon className="h-5 w-5" /> Open for {pack.price_gems}
              </Button>
            )}
            {priceCoins != null && (
              <Button size="lg" loading={busy} disabled={coins < priceCoins} onClick={() => onBuy('coins')}>
                <CoinIcon className="h-5 w-5" /> Open for {formatNumber(priceCoins)}
              </Button>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
