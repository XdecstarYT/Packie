import type { Card, Pack, PackSlot, Rarity } from './types'

/** Card is still printable (not sold out). */
export function isAvailable(card: Pick<Card, 'is_active' | 'max_print_run' | 'printed_count'>) {
  return card.is_active && (card.max_print_run == null || card.printed_count < card.max_print_run)
}

/**
 * Probability of each rarity for one slot, matching the server:
 * weights are renormalised over rarities that still have available cards.
 */
export function slotRarityOdds(slot: PackSlot, availableRarities: Set<string>): Record<string, number> {
  const entries = Object.entries(slot.weights).filter(([slug, w]) => w > 0 && availableRarities.has(slug))
  const total = entries.reduce((s, [, w]) => s + w, 0)
  const out: Record<string, number> = {}
  if (total === 0) return out
  for (const [slug, w] of entries) out[slug] = w / total
  return out
}

/** Chance that a whole pack contains at least one card of each rarity. */
export function packAtLeastOneOdds(slots: PackSlot[], availableRarities: Set<string>): Record<string, number> {
  const none: Record<string, number> = {}
  for (const slug of availableRarities) none[slug] = 1
  for (const slot of slots) {
    const odds = slotRarityOdds(slot, availableRarities)
    for (const slug of availableRarities) none[slug] *= 1 - (odds[slug] ?? 0)
  }
  const out: Record<string, number> = {}
  for (const slug of availableRarities) out[slug] = 1 - none[slug]
  return out
}

/** Cards that can drop from a pack: explicit pool, else the pack's season, else everything. */
export function packCandidates(
  pack: Pick<Pack, 'id' | 'season_id'>,
  cards: Card[],
  setSeason: Map<string, string | null>,
  pool: { pack_id: string; card_id: string; weight: number }[] = [],
) {
  const own = pool.filter((p) => p.pack_id === pack.id)
  if (own.length) {
    const weights = new Map(own.map((p) => [p.card_id, p.weight]))
    return cards.filter((c) => weights.has(c.id)).map((c) => ({ card: c, weight: weights.get(c.id) ?? 1 }))
  }
  return cards
    .filter((c) => !pack.season_id || (c.set_id && setSeason.get(c.set_id) === pack.season_id))
    .map((c) => ({ card: c, weight: 1 }))
}

function weightedPick<T>(items: T[], weight: (t: T) => number, rand: () => number): T | undefined {
  const total = items.reduce((s, i) => s + weight(i), 0)
  if (total <= 0) return undefined
  let r = rand() * total
  for (const item of items) {
    r -= weight(item)
    if (r < 0) return item
  }
  return items[items.length - 1]
}

export interface SimulationResult {
  packs: number
  byRarity: Record<string, number>
  foils: number
  byCard: Map<string, number>
  hitRate: Record<string, number>
}

/** Monte-Carlo simulation of opening `n` packs (print runs are not consumed). */
export function simulatePacks(
  slots: PackSlot[],
  candidates: { card: Card; weight: number }[],
  rarities: Rarity[],
  n = 10_000,
  rand: () => number = Math.random,
): SimulationResult {
  const raritySlug = new Map(rarities.map((r) => [r.id, r.slug]))
  const avail = candidates.filter((c) => isAvailable(c.card))
  const bySlug = new Map<string, { card: Card; weight: number }[]>()
  for (const c of avail) {
    const slug = raritySlug.get(c.card.rarity_id) ?? 'unknown'
    if (!bySlug.has(slug)) bySlug.set(slug, [])
    bySlug.get(slug)!.push(c)
  }
  const availableSlugs = new Set(bySlug.keys())
  const byRarity: Record<string, number> = {}
  const hits: Record<string, number> = {}
  const byCard = new Map<string, number>()
  let foils = 0

  for (let i = 0; i < n; i++) {
    const seen = new Set<string>()
    for (const slot of slots) {
      const odds = Object.entries(slotRarityOdds(slot, availableSlugs))
      const picked = weightedPick(odds, ([, p]) => p, rand)
      const pool = picked ? bySlug.get(picked[0]) ?? avail : avail
      const choice = weightedPick(pool, (c) => c.weight, rand)
      if (!choice) continue
      const slug = raritySlug.get(choice.card.rarity_id) ?? 'unknown'
      byRarity[slug] = (byRarity[slug] ?? 0) + 1
      byCard.set(choice.card.id, (byCard.get(choice.card.id) ?? 0) + 1)
      seen.add(slug)
      if (rand() < (slot.foil_chance ?? 0)) foils++
    }
    for (const s of seen) hits[s] = (hits[s] ?? 0) + 1
  }
  const hitRate: Record<string, number> = {}
  for (const [s, h] of Object.entries(hits)) hitRate[s] = h / n
  return { packs: n, byRarity, foils, byCard, hitRate }
}

export function formatPct(p: number) {
  if (p <= 0) return '0%'
  if (p < 0.001) return '<0.1%'
  if (p < 0.1) return `${(p * 100).toFixed(1)}%`
  return `${Math.round(p * 100)}%`
}

export const SLOT_PRESETS: Record<string, PackSlot> = {
  'Mostly common': { label: 'Card', weights: { common: 80, uncommon: 18, rare: 2 }, foil_chance: 0.02 },
  Balanced: { label: 'Card', weights: { common: 50, uncommon: 35, rare: 12, epic: 3 }, foil_chance: 0.05 },
  'Uncommon+': { label: 'Card', weights: { uncommon: 60, rare: 30, epic: 10 }, foil_chance: 0.08 },
  'Guaranteed Rare+': {
    label: 'Rare+',
    weights: { rare: 70, epic: 22, legendary: 6, mythic: 2 },
    foil_chance: 0.15,
  },
  'Chase slot': { label: 'Chase', weights: { epic: 70, legendary: 25, mythic: 5 }, foil_chance: 0.35 },
}
