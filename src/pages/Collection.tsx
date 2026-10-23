import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Crown, EyeOff, Eye, PackageOpen, Search, Sparkles, Store, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useCatalog } from '@/hooks/useCatalog'
import { useInstances } from '@/hooks/useCollection'
import { PackieCard } from '@/components/PackieCard'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Fields'
import { CoinIcon, EmptyState, ErrorState, PageLoader, SectionTitle } from '@/components/ui/misc'
import { ELEMENT_THEME } from '@/lib/elements'
import { errorMessage, supabase } from '@/lib/supabase'
import { ELEMENTS, type Card, type CardInstance } from '@/lib/types'
import { cn, formatDate, formatNumber } from '@/lib/utils'

export function CollectionPage() {
  const { profile } = useAuth()
  const { catalog, isLoading, error, refetch, rarityById, setById } = useCatalog()
  const instances = useInstances(profile?.id)
  const [q, setQ] = useState('')
  const [setId, setSetId] = useState('all')
  const [rarity, setRarity] = useState('all')
  const [element, setElement] = useState('all')
  const [special, setSpecial] = useState<'all' | 'foil' | 'limited'>('all')
  const [showMissing, setShowMissing] = useState(false)
  const [sort, setSort] = useState<'number' | 'rarity' | 'recent' | 'count'>('number')
  const [detail, setDetail] = useState<Card | null>(null)

  const byCard = useMemo(() => {
    const m = new Map<string, CardInstance[]>()
    for (const i of instances.data ?? []) {
      if (!m.has(i.card_id)) m.set(i.card_id, [])
      m.get(i.card_id)!.push(i)
    }
    return m
  }, [instances.data])

  const rows = useMemo(() => {
    if (!catalog) return []
    const term = q.trim().toLowerCase()
    const list = catalog.cards
      .filter((c) => byCard.has(c.id) || (showMissing && c.is_active))
      .filter((c) => setId === 'all' || c.set_id === setId)
      .filter((c) => rarity === 'all' || c.rarity_id === rarity)
      .filter((c) => element === 'all' || c.element === element)
      .filter((c) => !term || c.name.toLowerCase().includes(term))
      .filter((c) => {
        const owned = byCard.get(c.id) ?? []
        if (special === 'foil') return owned.some((i) => i.foil)
        if (special === 'limited') return c.is_limited_edition
        return true
      })
    const rOrder = (c: Card) => rarityById.get(c.rarity_id)?.sort_order ?? 0
    const latest = (c: Card) => Math.max(0, ...(byCard.get(c.id) ?? []).map((i) => new Date(i.acquired_at).getTime()))
    return [...list].sort((a, b) => {
      if (sort === 'rarity') return rOrder(b) - rOrder(a) || (a.number_in_set ?? 0) - (b.number_in_set ?? 0)
      if (sort === 'recent') return latest(b) - latest(a)
      if (sort === 'count') return (byCard.get(b.id)?.length ?? 0) - (byCard.get(a.id)?.length ?? 0)
      return (a.number_in_set ?? 0) - (b.number_in_set ?? 0)
    })
  }, [catalog, byCard, q, setId, rarity, element, special, showMissing, sort, rarityById])

  if (isLoading || instances.isLoading) return <PageLoader />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (!catalog) return null

  const total = instances.data?.length ?? 0

  return (
    <div>
      <SectionTitle eyebrow="Collection" title={`${formatNumber(total)} cards collected`} />

      {/* Set progress */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.sets.map((s) => {
          const cards = catalog.cards.filter((c) => c.set_id === s.id && (c.is_active || byCard.has(c.id)))
          const owned = cards.filter((c) => byCard.has(c.id)).length
          const pct = cards.length ? owned / cards.length : 0
          return (
            <div key={s.id} className="glass rounded-2xl p-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.code}</p>
                </div>
                <p className="font-display text-xl font-bold">
                  {owned}
                  <span className="text-sm text-slate-500">/{cards.length}</span>
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.8 }} />
              </div>
              {pct === 1 && <p className="mt-2 text-xs font-bold text-amber-300">★ Set complete!</p>}
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="glass mb-6 flex flex-col gap-3 rounded-2xl p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cards…" className="pl-9" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:flex">
          <Select value={setId} onChange={(e) => setSetId(e.target.value)} aria-label="Set">
            <option value="all">All sets</option>
            {catalog.sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select value={rarity} onChange={(e) => setRarity(e.target.value)} aria-label="Rarity">
            <option value="all">All rarities</option>
            {catalog.rarities.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
          <Select value={element} onChange={(e) => setElement(e.target.value)} aria-label="Element">
            <option value="all">All elements</option>
            {ELEMENTS.map((el) => (
              <option key={el} value={el}>
                {ELEMENT_THEME[el].label}
              </option>
            ))}
          </Select>
          <Select value={special} onChange={(e) => setSpecial(e.target.value as typeof special)} aria-label="Special">
            <option value="all">Any finish</option>
            <option value="foil">Foils only</option>
            <option value="limited">Limited editions</option>
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort">
            <option value="number">Set number</option>
            <option value="rarity">Rarity</option>
            <option value="recent">Recently pulled</option>
            <option value="count">Most copies</option>
          </Select>
        </div>
        <Button variant={showMissing ? 'primary' : 'secondary'} onClick={() => setShowMissing((v) => !v)} className="shrink-0">
          {showMissing ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} {showMissing ? 'Showing missing' : 'Show missing'}
        </Button>
      </div>

      {total === 0 && !showMissing ? (
        <EmptyState icon={<PackageOpen className="h-8 w-8" />} title="No cards yet" action={<Link to="/shop"><Button>Visit the shop</Button></Link>}>
          Open a pack to start your collection.
        </EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState icon={<Search className="h-8 w-8" />} title="No matches">
          Try clearing a filter.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {rows.map((card, i) => {
            const owned = byCard.get(card.id) ?? []
            const has = owned.length > 0
            const best = owned.find((o) => o.serial_number) ?? owned.find((o) => o.foil) ?? owned[0]
            return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="relative"
              >
                <div className={cn(!has && 'opacity-30 grayscale')}>
                  <PackieCard
                    card={card}
                    rarity={rarityById.get(card.rarity_id)}
                    set={card.set_id ? setById.get(card.set_id) : undefined}
                    serial={best?.serial_number}
                    foil={best?.foil}
                    compact
                    onClick={has ? () => setDetail(card) : undefined}
                  />
                </div>
                {owned.length > 1 && (
                  <span className="absolute -right-2 -top-2 z-10 rounded-full bg-white px-2 py-0.5 text-xs font-extrabold text-ink-900 shadow-lg">×{owned.length}</span>
                )}
                {!has && (
                  <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Not owned</span>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {detail && (
        <CardDetailModal
          card={detail}
          copies={byCard.get(detail.id) ?? []}
          onClose={() => setDetail(null)}
          editable
        />
      )}
    </div>
  )
}

export function CardDetailModal({
  card,
  copies,
  onClose,
  editable,
}: {
  card: Card
  copies: CardInstance[]
  onClose: () => void
  editable?: boolean
}) {
  const { rarityById, setById } = useCatalog()
  const { profile } = useAuth()
  const qc = useQueryClient()
  const rarity = rarityById.get(card.rarity_id)
  const [selected, setSelected] = useState<string>(copies[0]?.id ?? '')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const copy = copies.find((c) => c.id === selected) ?? copies[0]

  const listings = useQuery({
    queryKey: ['my-listings', profile?.id],
    enabled: !!profile && editable,
    queryFn: async () => {
      const { data, error } = await supabase.from('market_listings').select('*').eq('seller_id', profile!.id).eq('status', 'active')
      if (error) throw error
      return data ?? []
    },
  })
  const listingFor = (id: string) => listings.data?.find((l) => l.card_instance_id === id)

  async function list() {
    const n = parseInt(price, 10)
    if (!copy || !n || n < 1) return toast.error('Enter a price in coins')
    setBusy(true)
    const { error } = await supabase.rpc('list_on_market', { p_instance_id: copy.id, p_price: n })
    setBusy(false)
    if (error) return toast.error(errorMessage(error))
    toast.success('Listed on the market')
    setPrice('')
    qc.invalidateQueries({ queryKey: ['my-listings'] })
    qc.invalidateQueries({ queryKey: ['market'] })
  }

  async function unlist(listingId: string) {
    setBusy(true)
    const { error } = await supabase.rpc('cancel_listing', { p_listing_id: listingId })
    setBusy(false)
    if (error) return toast.error(errorMessage(error))
    toast.success('Listing removed')
    qc.invalidateQueries({ queryKey: ['my-listings'] })
    qc.invalidateQueries({ queryKey: ['market'] })
  }

  const activeListing = copy ? listingFor(copy.id) : undefined

  return (
    <Modal open onClose={onClose} title={card.name} className="sm:max-w-3xl">
      <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,300px)_1fr]">
        <div className="mx-auto w-full max-w-[300px]">
          <PackieCard
            card={card}
            rarity={rarity}
            set={card.set_id ? setById.get(card.set_id) : undefined}
            serial={copy?.serial_number}
            foil={copy?.foil}
          />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className="chip" style={{ color: rarity?.color }}>
              {rarity?.name}
            </span>
            <span className="chip">{ELEMENT_THEME[card.element].label}</span>
            {card.is_limited_edition && (
              <span className="chip text-amber-200">
                <Crown className="h-3 w-3" /> {formatNumber(card.printed_count)} / {formatNumber(card.max_print_run)} printed
              </span>
            )}
          </div>

          <h4 className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-400">Your copies ({copies.length})</h4>
          <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {copies.map((c) => {
              const l = listingFor(c.id)
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition',
                    c.id === copy?.id ? 'border-violet-400/50 bg-violet-500/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
                  )}
                >
                  <span className="flex items-center gap-2">
                    {c.serial_number ? <span className="font-bold text-amber-300">#{c.serial_number}</span> : <span className="text-slate-400">Standard</span>}
                    {c.foil && (
                      <span className="chip border-violet-300/40 text-violet-200">
                        <Sparkles className="h-3 w-3" /> Foil
                      </span>
                    )}
                    {l && (
                      <span className="chip border-emerald-300/40 text-emerald-200">
                        <Tag className="h-3 w-3" /> Listed {formatNumber(l.price_coins)}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-slate-500">
                    {c.acquired_from} · {formatDate(c.acquired_at)}
                  </span>
                </button>
              )
            })}
          </div>

          {editable && copy && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h4 className="flex items-center gap-2 font-semibold">
                <Store className="h-4 w-4 text-violet-300" /> Sell on the market
              </h4>
              {activeListing ? (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-300">
                    Listed for <span className="font-bold text-white">{formatNumber(activeListing.price_coins)}</span> coins
                  </p>
                  <Button variant="danger" size="sm" loading={busy} onClick={() => unlist(activeListing.id)}>
                    Remove listing
                  </Button>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <div className="relative flex-1">
                    <CoinIcon className="absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price in coins" className="pl-9" />
                  </div>
                  <Button loading={busy} onClick={list}>
                    List
                  </Button>
                </div>
              )}
              <p className="mt-2 text-xs text-slate-500">A small market fee is taken from the sale price.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
