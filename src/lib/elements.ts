import type { Element } from './types'

export interface ElementTheme {
  label: string
  from: string
  via: string
  to: string
  accent: string
  emoji: string
}

export const ELEMENT_THEME: Record<Element, ElementTheme> = {
  fire: { label: 'Fire', from: '#ff7a18', via: '#e5383b', to: '#3d0a12', accent: '#ffb347', emoji: '🔥' },
  water: { label: 'Water', from: '#38bdf8', via: '#2563eb', to: '#071a3d', accent: '#7dd3fc', emoji: '💧' },
  earth: { label: 'Earth', from: '#a3e635', via: '#15803d', to: '#0d2412', accent: '#bef264', emoji: '🌿' },
  air: { label: 'Air', from: '#e0f2fe', via: '#67e8f9', to: '#0e3a4a', accent: '#cffafe', emoji: '🌪️' },
  shadow: { label: 'Shadow', from: '#c084fc', via: '#6d28d9', to: '#12052b', accent: '#e9d5ff', emoji: '🌙' },
  light: { label: 'Light', from: '#fff7ae', via: '#fbbf24', to: '#5b2b00', accent: '#fef3c7', emoji: '☀️' },
}
