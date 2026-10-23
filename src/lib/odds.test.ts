import { describe, expect, it } from 'vitest'
import { isAvailable, packAtLeastOneOdds, simulatePacks, slotRarityOdds } from './odds'
import type { Card, PackSlot, Rarity } from './types'
import { seededRandom } from './utils'

const rarity = (slug: string, i: number): Rarity => ({
  id: `r-${slug}`, slug, name: slug, color: '#fff', glow: 'none', points: 1, sort_order: i,
  created_at: '', updated_at: '',
})
const rarities = ['common', 'rare', 'mythic'].map(rarity)

const card = (id: string, slug: string, extra: Partial<Card> = {}): Card => ({
  id, name: id, rarity_id: `r-${slug}`, set_id: null, number_in_set: 1, flavor_text: null, art_url: null,
  element: 'fire', hp: 1, attack: 1, defense: 1, abilities: [], is_limited_edition: false, max_print_run: null,
  printed_count: 0, is_active: true, created_at: '', updated_at: '', ...extra,
})

const slot: PackSlot = { label: 's', weights: { common: 90, rare: 9, mythic: 1 }, foil_chance: 0.1 }

describe('slotRarityOdds', () => {
  it('normalises weights', () => {
    const odds = slotRarityOdds(slot, new Set(['common', 'rare', 'mythic']))
    expect(odds.common).toBeCloseTo(0.9)
    expect(odds.rare).toBeCloseTo(0.09)
    expect(odds.mythic).toBeCloseTo(0.01)
  })

  it('renormalises when a rarity is sold out', () => {
    const odds = slotRarityOdds(slot, new Set(['common', 'rare']))
    expect(odds.mythic).toBeUndefined()
    expect(odds.common + odds.rare).toBeCloseTo(1)
    expect(odds.rare).toBeCloseTo(9 / 99)
  })

  it('ignores zero weights and unknown rarities', () => {
    const odds = slotRarityOdds({ label: '', weights: { common: 0, legendary: 5 }, foil_chance: 0 }, new Set(['common']))
    expect(odds).toEqual({})
  })
})

describe('packAtLeastOneOdds', () => {
  it('combines independent slots', () => {
    const odds = packAtLeastOneOdds([slot, slot], new Set(['common', 'rare', 'mythic']))
    expect(odds.mythic).toBeCloseTo(1 - 0.99 * 0.99)
  })
})

describe('isAvailable', () => {
  it('respects print runs', () => {
    expect(isAvailable(card('a', 'common', { max_print_run: 10, printed_count: 10 }))).toBe(false)
    expect(isAvailable(card('a', 'common', { max_print_run: 10, printed_count: 9 }))).toBe(true)
    expect(isAvailable(card('a', 'common', { is_active: false }))).toBe(false)
  })
})

describe('simulatePacks', () => {
  const cards = [card('c1', 'common'), card('c2', 'common'), card('r1', 'rare'), card('m1', 'mythic')]
  const candidates = cards.map((c) => ({ card: c, weight: 1 }))

  it('matches configured odds within tolerance', () => {
    const res = simulatePacks([slot], candidates, rarities, 20_000, seededRandom('packie'))
    const total = Object.values(res.byRarity).reduce((a, b) => a + b, 0)
    expect(total).toBe(20_000)
    expect(res.byRarity.common / total).toBeGreaterThan(0.88)
    expect(res.byRarity.common / total).toBeLessThan(0.92)
    expect(res.foils / total).toBeGreaterThan(0.08)
    expect(res.foils / total).toBeLessThan(0.12)
  })

  it('never drops sold-out cards', () => {
    const soldOut = [...candidates.slice(0, 3), { card: card('m1', 'mythic', { max_print_run: 1, printed_count: 1 }), weight: 1 }]
    const res = simulatePacks([slot], soldOut, rarities, 5_000, seededRandom('x'))
    expect(res.byCard.get('m1')).toBeUndefined()
    expect(res.byRarity.mythic).toBeUndefined()
  })
})
