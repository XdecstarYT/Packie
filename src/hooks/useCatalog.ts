import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toCard, toPack, type Card, type CardSet, type Drop, type DropItem, type Pack, type Rarity, type Season } from '@/lib/types'

export interface Catalog {
  rarities: Rarity[]
  seasons: Season[]
  sets: CardSet[]
  cards: Card[]
  packs: Pack[]
  drops: Drop[]
  dropItems: DropItem[]
  pool: { pack_id: string; card_id: string; weight: number }[]
}

async function fetchCatalog(): Promise<Catalog> {
  const [rarities, seasons, sets, cards, packs, drops, dropItems, pool] = await Promise.all([
    supabase.from('rarities').select('*').order('sort_order'),
    supabase.from('seasons').select('*').order('starts_at', { ascending: false, nullsFirst: false }),
    supabase.from('sets').select('*').order('created_at'),
    supabase.from('cards').select('*').order('number_in_set', { nullsFirst: false }),
    supabase.from('packs').select('*').order('sort_order'),
    supabase.from('drops').select('*').order('starts_at'),
    supabase.from('drop_items').select('*'),
    supabase.from('pack_card_pool').select('*'),
  ])
  for (const r of [rarities, seasons, sets, cards, packs, drops, dropItems, pool]) {
    if (r.error) throw r.error
  }
  return {
    rarities: rarities.data ?? [],
    seasons: seasons.data ?? [],
    sets: sets.data ?? [],
    cards: (cards.data ?? []).map(toCard),
    packs: (packs.data ?? []).map(toPack),
    drops: drops.data ?? [],
    dropItems: dropItems.data ?? [],
    pool: pool.data ?? [],
  }
}

/** The whole game catalog (small enough to load at once and cache). */
export function useCatalog() {
  const q = useQuery({ queryKey: ['catalog'], queryFn: fetchCatalog, staleTime: 60_000 })
  const helpers = useMemo(() => {
    const data = q.data
    const rarityById = new Map((data?.rarities ?? []).map((r) => [r.id, r]))
    const cardById = new Map((data?.cards ?? []).map((c) => [c.id, c]))
    const setById = new Map((data?.sets ?? []).map((s) => [s.id, s]))
    const packById = new Map((data?.packs ?? []).map((p) => [p.id, p]))
    const setSeason = new Map((data?.sets ?? []).map((s) => [s.id, s.season_id]))
    return { rarityById, cardById, setById, packById, setSeason }
  }, [q.data])
  return { ...q, catalog: q.data, ...helpers }
}

export type DropStatus = 'live' | 'upcoming' | 'ended'
export function dropStatus(d: Pick<Drop, 'starts_at' | 'ends_at'>, now = Date.now()): DropStatus {
  if (new Date(d.starts_at).getTime() > now) return 'upcoming'
  if (d.ends_at && new Date(d.ends_at).getTime() <= now) return 'ended'
  return 'live'
}

export type PackAvailability = { ok: true } | { ok: false; reason: string }
export function packAvailability(p: Pack, now = Date.now()): PackAvailability {
  if (!p.is_active) return { ok: false, reason: 'Unavailable' }
  if (p.available_from && new Date(p.available_from).getTime() > now) return { ok: false, reason: 'Coming soon' }
  if (p.available_until && new Date(p.available_until).getTime() <= now) return { ok: false, reason: 'Sale ended' }
  if (p.total_supply != null && p.sold_count >= p.total_supply) return { ok: false, reason: 'Sold out' }
  return { ok: true }
}

/** Live-drop discount for a pack, if any. */
export function dropPrice(catalog: Catalog | undefined, packId: string): number | null {
  if (!catalog) return null
  let best: number | null = null
  for (const item of catalog.dropItems) {
    if (item.pack_id !== packId || item.special_price_coins == null) continue
    const drop = catalog.drops.find((d) => d.id === item.drop_id)
    if (!drop || !drop.is_published || dropStatus(drop) !== 'live') continue
    best = best == null ? item.special_price_coins : Math.min(best, item.special_price_coins)
  }
  return best
}
