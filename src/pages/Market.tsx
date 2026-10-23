import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, ShoppingCart, Store } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useCatalog } from '@/hooks/useCatalog'
import { PackieCard } from '@/components/PackieCard'
import { Avatar } from '@/components/AppLayout'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Fields'
import { CoinIcon, EmptyState, ErrorState, PageLoader, SectionTitle } from '@/components/ui/misc'
import { Modal } from '@/components/ui/Modal'
import { errorMessage, supabase } from '@/lib/supabase'
import { cn, formatNumber, timeAgo } from '@/lib/utils'

type Tab = 'browse' | 'mine' | 'history'

function useListings() {
  return useQuery({
    queryKey: ['market'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_listings')
        .select('*, instance:card_instances(*), seller:profiles!market_listings_seller_id_fkey(username, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(300)
      if (error) throw error
      return data ?? []
    },
  })
}
type Listing = NonNullable<ReturnType<typeof useListings>['data']>[number]

export function MarketPage() {
  const { profile, refreshProfile } = useAuth()
  const { catalog, cardById, rarityById, setById } = useCatalog()
  const listings = useListings()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('browse')
  const [q, setQ] = useState('')
  const [rarity, setRarity] = useState('all')
  const [sort, setSort] = useState<'new' | 'low' | 'high'>('new')
  const [confirm, setConfirm] = useState<Listing | null>(null)
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => {
    const all = listings.data ?? []
    let list: Listing[]
    if (tab === 'browse') list = all.filter((l) => l.status === 'active' && l.seller_id !== profile?.id)
    else if (tab === 'mine') list = all.filter((l) => l.status === 'active' && l.seller_id === profile?.id)
    else list = all.filter((l) => l.status === 'sold' && (l.seller_id === profile?.id || l.buyer_id === profile?.id))
    const term = q.trim().toLowerCase()
    list = list.filter((l) => {
      const card = l.instance ? cardById.get(l.instance.card_id) : undefined
      if (!card) return false
      if (rarity !== 'all' && card.rarity_id !== rarity) return false
      return !term || card.name.toLowerCase().includes(term)
    })
    return [...list].sort((a, b) =>
      sort === 'low' ? a.price_coins - b.price_coins : sort === 'high' ? b.price_coins - a.price_coins : b.created_at.localeCompare(a.created_at),
    )
  }, [listings.data, tab, q, rarity, sort, cardById, profile?.id])

  async function buy(l: Listing) {
    setBusy(true)
    const { error } = await supabase.rpc('buy_listing', { p_listing_id: l.id })
    setBusy(false)
    if (error) return toast.error(errorMessage(error))
    toast.success('Card purchased! Check your collection.')
    setConfirm(null)
    refreshProfile()
    qc.invalidateQueries({ queryKey: ['market'] })
    qc.invalidateQueries({ queryKey: ['instances'] })
  }

  async function cancel(l: Listing) {
    const { error } = await supabase.rpc('cancel_listing', { p_listing_id: l.id })
    if (error) return toast.error(errorMessage(error))
    toast.success('Listing removed')
    qc.invalidateQueries({ queryKey: ['market'] })
  }

  if (listings.isLoading) return <PageLoader />
  if (listings.error) return <ErrorState error={listings.error} onRetry={listings.refetch} />

  const confirmCard = confirm?.instance ? cardById.get(confirm.instance.card_id) : undefined

  return (
    <div>
      <SectionTitle eyebrow="Marketplace" title="Buy & sell cards" />
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ['browse', 'Browse'],
            ['mine', 'My listings'],
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

      <div className="glass mb-6 flex flex-col gap-2 rounded-2xl p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search listings…" className="pl-9" />
        </div>
        <Select value={rarity} onChange={(e) => setRarity(e.target.value)} className="sm:w-44" aria-label="Rarity">
          <option value="all">All rarities</option>
          {catalog?.rarities.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="sm:w-44" aria-label="Sort">
          <option value="new">Newest</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Store className="h-8 w-8" />} title={tab === 'browse' ? 'No listings yet' : tab === 'mine' ? 'You have nothing listed' : 'No sales yet'}>
          {tab === 'mine' ? 'List a card from your collection to sell it for coins.' : 'Check back soon — collectors list new cards all the time.'}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {rows.map((l) => {
            const card = l.instance ? cardById.get(l.instance.card_id) : undefined
            if (!card || !l.instance) return null
            return (
              <div key={l.id} className="glass flex flex-col rounded-2xl p-3">
                <PackieCard
                  card={card}
                  rarity={rarityById.get(card.rarity_id)}
                  set={card.set_id ? setById.get(card.set_id) : undefined}
                  serial={l.instance.serial_number}
                  foil={l.instance.foil}
                  compact
                />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-display text-lg font-bold">
                    <CoinIcon className="h-5 w-5" />
                    {formatNumber(l.price_coins)}
                  </span>
                  <span className="text-[11px] text-slate-500">{timeAgo(l.sold_at ?? l.created_at)}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                  <Avatar name={l.seller?.username ?? '?'} url={l.seller?.avatar_url} className="h-5 w-5 text-[10px]" />
                  {l.seller?.username}
                </div>
                {tab === 'browse' && (
                  <Button size="sm" className="mt-3" onClick={() => setConfirm(l)} disabled={(profile?.coins ?? 0) < l.price_coins}>
                    <ShoppingCart className="h-4 w-4" /> Buy
                  </Button>
                )}
                {tab === 'mine' && (
                  <Button size="sm" variant="danger" className="mt-3" onClick={() => cancel(l)}>
                    Remove
                  </Button>
                )}
                {tab === 'history' && (
                  <p className={cn('mt-3 text-center text-xs font-bold', l.seller_id === profile?.id ? 'text-emerald-300' : 'text-sky-300')}>
                    {l.seller_id === profile?.id ? 'Sold' : 'Bought'}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {confirm && confirmCard && (
        <Modal
          open
          onClose={() => setConfirm(null)}
          title="Confirm purchase"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button loading={busy} onClick={() => buy(confirm)}>
                <CoinIcon /> Buy for {formatNumber(confirm.price_coins)}
              </Button>
            </>
          }
        >
          <div className="flex items-center gap-5 p-5">
            <div className="w-32 shrink-0">
              <PackieCard card={confirmCard} rarity={rarityById.get(confirmCard.rarity_id)} serial={confirm.instance?.serial_number} foil={confirm.instance?.foil} compact interactive={false} />
            </div>
            <div>
              <p className="text-lg font-semibold">{confirmCard.name}</p>
              <p className="text-sm text-slate-400">Sold by {confirm.seller?.username}</p>
              <p className="mt-3 text-sm text-slate-300">
                Your balance after: <span className="font-bold text-white">{formatNumber((profile?.coins ?? 0) - confirm.price_coins)}</span> coins
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
