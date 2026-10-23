import { memo, useId } from 'react'
import { ELEMENT_THEME } from '@/lib/elements'
import type { Element } from '@/lib/types'
import { seededRandom } from '@/lib/utils'

/** Element glyphs centred on 0,0, roughly 40 units tall. */
const GLYPHS: Record<Element, { d: string; stroke?: boolean }> = {
  fire: { d: 'M0,-20 C8,-10 14,-4 12,6 C10,15 4,20 0,20 C-4,20 -10,15 -12,6 C-13,-2 -6,-6 -4,-14 C-2,-8 2,-6 0,-20Z' },
  water: { d: 'M0,-20 C6,-10 14,-2 14,7 A14,14 0 0 1 -14,7 C-14,-2 -6,-10 0,-20Z' },
  earth: { d: 'M-15,15 C-16,-6 0,-18 17,-18 C17,2 5,16 -15,15Z' },
  air: { d: 'M-17,-5 H7 A6,6 0 1 0 1,-11 M-17,5 H13 A6,6 0 1 1 7,11 M-12,0 H3', stroke: true },
  shadow: { d: 'M6,-18 A18,18 0 1 0 6,18 A14,14 0 1 1 6,-18Z' },
  light: {
    d: Array.from({ length: 16 }, (_, i) => {
      const r = i % 2 === 0 ? 20 : 8
      const a = (Math.PI * 2 * i) / 16 - Math.PI / 2
      return `${i === 0 ? 'M' : 'L'}${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`
    }).join(' ') + 'Z',
  },
}

export function ElementGlyph({ element, className }: { element: Element; className?: string }) {
  const g = GLYPHS[element]
  const t = ELEMENT_THEME[element]
  return (
    <svg viewBox="-24 -24 48 48" className={className} aria-hidden>
      <path
        d={g.d}
        fill={g.stroke ? 'none' : t.accent}
        stroke={g.stroke ? t.accent : 'none'}
        strokeWidth={g.stroke ? 4 : 0}
        strokeLinecap="round"
      />
    </svg>
  )
}

interface CardArtProps {
  seed: string
  element: Element
  /** 0 = common … 5 = mythic */
  tier?: number
  className?: string
}

/**
 * Procedural creature art: every card gets a unique, deterministic little monster
 * built from its id + element. Used when the owner hasn't uploaded art.
 */
export const CardArt = memo(function CardArt({ seed, element, tier = 0, className }: CardArtProps) {
  const uid = useId().replace(/:/g, '')
  const t = ELEMENT_THEME[element]
  const rnd = seededRandom(seed + element)
  const r = (min: number, max: number) => min + rnd() * (max - min)
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)]

  const glowX = r(60, 140)
  const glowY = r(30, 70)
  const bodyRx = r(30, 42)
  const bodyRy = r(28, 38)
  const cx = 100
  const cy = 86
  const top = cy - bodyRy
  const eyeGap = r(9, 15)
  const eyeR = r(6, 8.5)
  const eyeY = cy - bodyRy * r(0.25, 0.45)
  const cyclops = element === 'shadow' && rnd() > 0.5
  const ears = pick(['pointy', 'round', 'horns', 'antenna', 'fins', 'tuft'] as const)
  const mouth = pick(['smile', 'grin', 'fang', 'o'] as const)
  const terrain = Array.from({ length: 9 }, (_, i) => `${i * 25},${118 + r(-8, 6)}`).join(' L')
  const particles = Array.from({ length: 10 + tier * 5 }, () => ({
    x: r(0, 200),
    y: r(0, 120),
    s: r(0.6, 2.2),
    o: r(0.25, 0.9),
  }))
  const glyph = GLYPHS[element]

  return (
    <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={t.from} />
          <stop offset="0.5" stopColor={t.via} />
          <stop offset="1" stopColor={t.to} />
        </linearGradient>
        <radialGradient id={`glow${uid}`} cx={glowX / 200} cy={glowY / 140} r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.4" stopColor={t.accent} stopOpacity="0.25" />
          <stop offset="1" stopColor={t.accent} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`body${uid}`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor={t.accent} />
          <stop offset="0.55" stopColor={t.from} />
          <stop offset="1" stopColor={t.via} />
        </radialGradient>
        <filter id={`soft${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      <rect width="200" height="140" fill={`url(#bg${uid})`} />
      <rect width="200" height="140" fill={`url(#glow${uid})`} />

      {/* aura rings / rays scale with rarity */}
      <g opacity={0.15 + tier * 0.07} stroke={t.accent} fill="none">
        {Array.from({ length: 2 + tier }, (_, i) => (
          <circle key={i} cx={cx} cy={cy - 6} r={46 + i * 13} strokeWidth={1.2} strokeDasharray={i % 2 ? '3 6' : undefined} />
        ))}
      </g>
      {(element === 'light' || element === 'fire' || tier >= 4) && (
        <g opacity={0.12 + tier * 0.03} fill={t.accent}>
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={`M${cx},${cy - 6} L${cx - 5},-20 L${cx + 5},-20Z`} transform={`rotate(${i * 30} ${cx} ${cy - 6})`} />
          ))}
        </g>
      )}

      {particles.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.s} fill="#fff" opacity={p.o} />
      ))}

      {/* ground */}
      <path d={`M0,140 L${terrain} L200,140Z`} fill={t.to} opacity="0.85" />
      <ellipse cx={cx} cy={cy + bodyRy + 2} rx={bodyRx * 0.9} ry="5" fill="#000" opacity="0.35" />

      {/* creature */}
      <g>
        <ellipse cx={cx} cy={cy} rx={bodyRx + 6} ry={bodyRy + 6} fill={t.accent} opacity="0.35" filter={`url(#soft${uid})`} />

        {ears === 'pointy' && (
          <g fill={t.via}>
            <path d={`M${cx - bodyRx * 0.7},${top + 10} L${cx - bodyRx * 0.55},${top - 16} L${cx - bodyRx * 0.15},${top + 4}Z`} />
            <path d={`M${cx + bodyRx * 0.7},${top + 10} L${cx + bodyRx * 0.55},${top - 16} L${cx + bodyRx * 0.15},${top + 4}Z`} />
          </g>
        )}
        {ears === 'round' && (
          <g fill={t.via}>
            <circle cx={cx - bodyRx * 0.6} cy={top + 4} r="10" />
            <circle cx={cx + bodyRx * 0.6} cy={top + 4} r="10" />
            <circle cx={cx - bodyRx * 0.6} cy={top + 4} r="5" fill={t.accent} opacity="0.7" />
            <circle cx={cx + bodyRx * 0.6} cy={top + 4} r="5" fill={t.accent} opacity="0.7" />
          </g>
        )}
        {ears === 'horns' && (
          <g fill="none" stroke={t.accent} strokeWidth="5" strokeLinecap="round">
            <path d={`M${cx - bodyRx * 0.45},${top + 6} Q${cx - bodyRx * 0.9},${top - 10} ${cx - bodyRx * 0.6},${top - 20}`} />
            <path d={`M${cx + bodyRx * 0.45},${top + 6} Q${cx + bodyRx * 0.9},${top - 10} ${cx + bodyRx * 0.6},${top - 20}`} />
          </g>
        )}
        {ears === 'antenna' && (
          <g stroke={t.via} strokeWidth="2.5">
            <line x1={cx - 8} y1={top + 4} x2={cx - 14} y2={top - 16} />
            <line x1={cx + 8} y1={top + 4} x2={cx + 14} y2={top - 16} />
            <circle cx={cx - 14} cy={top - 18} r="4.5" fill="#fff" stroke="none" />
            <circle cx={cx + 14} cy={top - 18} r="4.5" fill="#fff" stroke="none" />
          </g>
        )}
        {ears === 'fins' && (
          <g fill={t.accent} opacity="0.9">
            <path d={`M${cx - bodyRx + 2},${cy} Q${cx - bodyRx - 18},${cy - 18} ${cx - bodyRx - 10},${cy + 10}Z`} />
            <path d={`M${cx + bodyRx - 2},${cy} Q${cx + bodyRx + 18},${cy - 18} ${cx + bodyRx + 10},${cy + 10}Z`} />
            <path d={`M${cx - 6},${top + 2} Q${cx},${top - 18} ${cx + 8},${top + 2}Z`} />
          </g>
        )}
        {ears === 'tuft' && (
          <g fill={t.via}>
            {[-10, 0, 10].map((dx) => (
              <path key={dx} d={`M${cx + dx - 6},${top + 6} Q${cx + dx},${top - 14} ${cx + dx + 6},${top + 6}Z`} />
            ))}
          </g>
        )}

        {/* feet */}
        <ellipse cx={cx - bodyRx * 0.45} cy={cy + bodyRy - 2} rx="9" ry="6" fill={t.via} />
        <ellipse cx={cx + bodyRx * 0.45} cy={cy + bodyRy - 2} rx="9" ry="6" fill={t.via} />

        <ellipse cx={cx} cy={cy} rx={bodyRx} ry={bodyRy} fill={`url(#body${uid})`} />
        <ellipse cx={cx} cy={cy + bodyRy * 0.35} rx={bodyRx * 0.58} ry={bodyRy * 0.48} fill="#fff" opacity="0.22" />
        <ellipse cx={cx - bodyRx * 0.35} cy={cy - bodyRy * 0.5} rx={bodyRx * 0.25} ry={bodyRy * 0.14} fill="#fff" opacity="0.45" />

        {/* eyes */}
        {cyclops ? (
          <g>
            <circle cx={cx} cy={eyeY} r={eyeR * 1.6} fill="#fff" />
            <circle cx={cx + 1} cy={eyeY + 1} r={eyeR} fill="#1a1033" />
            <circle cx={cx - 2} cy={eyeY - 3} r={eyeR * 0.35} fill="#fff" />
          </g>
        ) : (
          [-1, 1].map((side) => (
            <g key={side}>
              <circle cx={cx + side * eyeGap} cy={eyeY} r={eyeR} fill="#fff" />
              <circle cx={cx + side * eyeGap + 1} cy={eyeY + 1} r={eyeR * 0.62} fill="#1a1033" />
              <circle cx={cx + side * eyeGap - 1.5} cy={eyeY - 2} r={eyeR * 0.26} fill="#fff" />
            </g>
          ))
        )}

        {/* blush + mouth */}
        <circle cx={cx - eyeGap - 8} cy={eyeY + 10} r="4" fill="#ff6b9a" opacity="0.45" />
        <circle cx={cx + eyeGap + 8} cy={eyeY + 10} r="4" fill="#ff6b9a" opacity="0.45" />
        {mouth === 'smile' && (
          <path d={`M${cx - 6},${eyeY + 11} Q${cx},${eyeY + 17} ${cx + 6},${eyeY + 11}`} stroke="#1a1033" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        )}
        {mouth === 'grin' && <path d={`M${cx - 8},${eyeY + 10} Q${cx},${eyeY + 20} ${cx + 8},${eyeY + 10}Z`} fill="#1a1033" />}
        {mouth === 'fang' && (
          <g>
            <path d={`M${cx - 7},${eyeY + 11} Q${cx},${eyeY + 16} ${cx + 7},${eyeY + 11}`} stroke="#1a1033" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d={`M${cx - 4},${eyeY + 12.5} l1.5,4 l1.5,-3.6Z`} fill="#fff" />
          </g>
        )}
        {mouth === 'o' && <ellipse cx={cx} cy={eyeY + 13} rx="3" ry="3.6" fill="#1a1033" />}

        {/* element crest on the belly */}
        <g transform={`translate(${cx} ${cy + bodyRy * 0.38}) scale(0.42)`} opacity="0.9">
          <path
            d={glyph.d}
            fill={glyph.stroke ? 'none' : '#fff'}
            stroke={glyph.stroke ? '#fff' : 'none'}
            strokeWidth={glyph.stroke ? 5 : 0}
            strokeLinecap="round"
          />
        </g>

        {/* crown for legendary+ */}
        {tier >= 4 && (
          <path
            d={`M${cx - 14},${top - 4} L${cx - 16},${top - 20} L${cx - 7},${top - 11} L${cx},${top - 24} L${cx + 7},${top - 11} L${cx + 16},${top - 20} L${cx + 14},${top - 4}Z`}
            fill="#fde047"
            stroke="#a16207"
            strokeWidth="1"
          />
        )}
      </g>
    </svg>
  )
})
