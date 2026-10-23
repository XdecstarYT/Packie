import type { Tables } from './database.types'

export type Profile = Tables<'profiles'>
export type Season = Tables<'seasons'>
export type CardSet = Tables<'sets'>
export type Rarity = Tables<'rarities'>
export type CardRow = Tables<'cards'>
export type CardInstance = Tables<'card_instances'>
export type PackRow = Tables<'packs'>
export type Drop = Tables<'drops'>
export type DropItem = Tables<'drop_items'>
export type MarketListing = Tables<'market_listings'>
export type Trade = Tables<'trades'>
export type Transaction = Tables<'transactions'>
export type GameSettings = Tables<'game_settings'>
export type AuditEntry = Tables<'audit_log'>

export type Element = 'fire' | 'water' | 'earth' | 'air' | 'shadow' | 'light'
export const ELEMENTS: Element[] = ['fire', 'water', 'earth', 'air', 'shadow', 'light']

export interface Ability {
  name: string
  damage?: number | null
  text?: string | null
}

export interface PackSlot {
  label: string
  /** rarity slug -> relative weight */
  weights: Record<string, number>
  /** 0..1 */
  foil_chance: number
}

export type Card = Omit<CardRow, 'abilities' | 'element'> & {
  abilities: Ability[]
  element: Element
}

export type Pack = Omit<PackRow, 'slots'> & { slots: PackSlot[] }

/** A card the player owns, joined with catalog data. */
export interface OwnedCard {
  instance: CardInstance
  card: Card
}

export interface OpenedCard {
  instance_id: string
  card_id: string
  serial_number: number | null
  foil: boolean
}

export function toCard(row: CardRow): Card {
  return {
    ...row,
    element: (row.element as Element) ?? 'fire',
    abilities: Array.isArray(row.abilities) ? (row.abilities as unknown as Ability[]) : [],
  }
}

export function toPack(row: PackRow): Pack {
  return {
    ...row,
    slots: Array.isArray(row.slots) ? (row.slots as unknown as PackSlot[]) : [],
  }
}
