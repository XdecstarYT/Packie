import { useRef, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import { Shield, Sparkles, Swords } from 'lucide-react'
import { CardArt, ElementGlyph } from './CardArt'
import { ELEMENT_THEME } from '@/lib/elements'
import type { Card, CardSet, Rarity } from '@/lib/types'
import { cn, hexToRgba } from '@/lib/utils'

export interface PackieCardProps {
  card: Pick<
    Card,
    | 'id'
    | 'name'
    | 'element'
    | 'hp'
    | 'attack'
    | 'defense'
    | 'abilities'
    | 'flavor_text'
    | 'art_url'
    | 'number_in_set'
    | 'is_limited_edition'
    | 'max_print_run'
  >
  rarity?: Rarity
  set?: CardSet
  serial?: number | null
  foil?: boolean
  /** Interactive tilt + holo on hover. */
  interactive?: boolean
  className?: string
  onClick?: () => void
  /** Hide small print on tiny thumbnails. */
  compact?: boolean
}

/**
 * The Packie trading card. Sized by its container (aspect 5:7) and all
 * typography scales with container query units, so one design works from
 * thumbnail to full-screen reveal.
 */
export function PackieCard({ card, rarity, set, serial, foil, interactive = true, className, onClick, compact }: PackieCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const theme = ELEMENT_THEME[card.element] ?? ELEMENT_THEME.fire
  const color = rarity?.color ?? '#94a3b8'
  const tier = Math.max(0, (rarity?.sort_order ?? 1) - 1)
  const prismatic = rarity?.glow === 'prismatic'
  const holoAlways = foil || prismatic
  const holoOnHover = holoAlways || tier >= 3
  const ability = card.abilities[0]

  function onMove(e: ReactMouseEvent<HTMLDivElement>) {
    if (!interactive || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    const el = ref.current
    el.style.transform = `perspective(900px) rotateY(${(px - 0.5) * 18}deg) rotateX(${(0.5 - py) * 18}deg) scale(1.03)`
    el.style.setProperty('--mx', `${px * 100}%`)
    el.style.setProperty('--my', `${py * 100}%`)
    el.style.setProperty('--bx', `${40 + px * 20}%`)
    el.style.setProperty('--by', `${40 + py * 20}%`)
    if (holoOnHover) el.style.setProperty('--holo-opacity', '1')
  }
  function onLeave() {
    if (!ref.current) return
    ref.current.style.transform = ''
    ref.current.style.setProperty('--holo-opacity', holoAlways ? '0.55' : '0')
  }

  const glowStyle: CSSProperties = {
    containerType: 'inline-size',
    ['--holo-opacity' as string]: holoAlways ? '0.55' : '0',
    boxShadow:
      tier >= 2
        ? `0 0 ${10 + tier * 8}px -2px ${hexToRgba(color, 0.35 + tier * 0.08)}, 0 25px 50px -20px rgba(0,0,0,.9)`
        : '0 20px 40px -20px rgba(0,0,0,.9)',
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={cn(
        'card-3d relative aspect-[5/7] w-full select-none rounded-[6%/4.3%] transition-transform duration-200 ease-out',
        onClick && 'cursor-pointer',
        className,
      )}
      style={glowStyle}
    >
      {/* Frame */}
      <div
        className={cn('absolute inset-0 rounded-[5cqw] p-[1.6cqw]', prismatic && 'prismatic-border')}
        style={
          prismatic
            ? undefined
            : { background: `linear-gradient(145deg, ${color}, ${hexToRgba(color, 0.35)} 40%, ${color} 70%, ${hexToRgba(color, 0.5)})` }
        }
      >
        <div
          className="relative flex h-full flex-col overflow-hidden rounded-[3.8cqw] p-[3cqw]"
          style={{
            background: `linear-gradient(170deg, ${hexToRgba(theme.via, 0.55)} 0%, #120d2e 38%, #0b0820 100%)`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-[2cqw]">
            <h3 className="truncate font-display text-[7.2cqw] font-semibold leading-tight text-white drop-shadow">{card.name}</h3>
            <div className="flex shrink-0 items-center gap-[1cqw]">
              <span className="text-[4cqw] font-bold text-rose-200/90">HP</span>
              <span className="font-display text-[7cqw] font-bold leading-none text-white">{card.hp}</span>
              <span
                className="flex h-[8cqw] w-[8cqw] items-center justify-center rounded-full"
                style={{ background: `radial-gradient(circle at 35% 30%, ${theme.from}, ${theme.via})`, boxShadow: `0 0 8px ${hexToRgba(theme.from, 0.6)}` }}
              >
                <ElementGlyph element={card.element} className="h-[5.5cqw] w-[5.5cqw]" />
              </span>
            </div>
          </div>

          {/* Art */}
          <div
            className="relative mt-[2cqw] aspect-[10/7] w-full overflow-hidden rounded-[2.5cqw]"
            style={{ boxShadow: `inset 0 0 0 0.6cqw ${hexToRgba(color, 0.7)}, 0 0 0 0.4cqw rgba(0,0,0,.5)` }}
          >
            {card.art_url ? (
              <img src={card.art_url} alt={card.name} className="h-full w-full object-cover" draggable={false} />
            ) : (
              <CardArt seed={card.id} element={card.element} tier={tier} className="h-full w-full" />
            )}
            {card.is_limited_edition && (
              <span className="absolute left-[2cqw] top-[2cqw] rounded-[1.5cqw] bg-black/65 px-[2cqw] py-[0.6cqw] text-[3.6cqw] font-extrabold uppercase tracking-wider text-amber-300 ring-1 ring-amber-300/50 backdrop-blur">
                {serial ? `#${serial}` : 'Limited'} / {card.max_print_run}
              </span>
            )}
            {foil && (
              <span className="absolute right-[2cqw] top-[2cqw] flex items-center gap-[0.8cqw] rounded-[1.5cqw] bg-white/85 px-[1.8cqw] py-[0.6cqw] text-[3.4cqw] font-extrabold uppercase tracking-wider text-violet-700">
                <Sparkles className="h-[3.6cqw] w-[3.6cqw]" /> Foil
              </span>
            )}
          </div>

          {/* Type line */}
          <div
            className="mt-[2cqw] flex items-center justify-between rounded-[1.6cqw] px-[2.5cqw] py-[1cqw] text-[3.8cqw] font-bold uppercase tracking-wider"
            style={{ background: `linear-gradient(90deg, ${hexToRgba(theme.via, 0.5)}, ${hexToRgba(color, 0.25)})` }}
          >
            <span className="text-white/90">{theme.label} creature</span>
            <span style={{ color }}>{rarity?.name ?? ''}</span>
          </div>

          {/* Ability */}
          {ability && (
            <div className="mt-[2.4cqw] flex-1">
              <div className="flex items-baseline justify-between gap-[2cqw]">
                <span className="font-display text-[5.4cqw] font-semibold text-white">{ability.name}</span>
                {ability.damage != null && <span className="font-display text-[6.4cqw] font-bold text-white">{ability.damage}</span>}
              </div>
              {!compact && ability.text && <p className="mt-[0.6cqw] text-[3.8cqw] leading-snug text-slate-300">{ability.text}</p>}
              {!compact && card.flavor_text && (
                <p className="mt-[1.6cqw] line-clamp-2 text-[3.3cqw] italic leading-snug text-slate-400">“{card.flavor_text}”</p>
              )}
            </div>
          )}
          {!ability && <div className="flex-1" />}

          {/* Footer */}
          <div className="mt-[1.5cqw] flex items-center justify-between border-t border-white/10 pt-[1.6cqw] text-[3.4cqw] font-semibold text-slate-400">
            <span className="flex items-center gap-[2.5cqw]">
              <span className="flex items-center gap-[0.8cqw]">
                <Swords className="h-[3.8cqw] w-[3.8cqw] text-rose-300" />
                {card.attack}
              </span>
              <span className="flex items-center gap-[0.8cqw]">
                <Shield className="h-[3.8cqw] w-[3.8cqw] text-sky-300" />
                {card.defense}
              </span>
            </span>
            <span className="flex items-center gap-[1.4cqw]">
              {set?.code ?? 'PKE'} · {String(card.number_in_set ?? 0).padStart(3, '0')}
              <span
                className="inline-block h-[3.4cqw] w-[3.4cqw] rotate-45 rounded-[0.6cqw]"
                style={{ background: color, boxShadow: `0 0 6px ${color}` }}
              />
            </span>
          </div>

          {foil && <div className="foil-sheen" />}
        </div>
      </div>
      <div className="holo" />
    </div>
  )
}

/** Card back used in the pack-opening flip. */
export function CardBack({ className }: { className?: string }) {
  return (
    <div className={cn('relative aspect-[5/7] w-full rounded-[6%/4.3%]', className)} style={{ containerType: 'inline-size' }}>
      <div className="absolute inset-0 rounded-[5cqw] bg-brand p-[1.6cqw]">
        <div className="relative flex h-full items-center justify-center overflow-hidden rounded-[3.8cqw] bg-ink-900">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,255,255,.08) 0 2px, transparent 2px 12px), repeating-linear-gradient(-45deg, rgba(255,255,255,.08) 0 2px, transparent 2px 12px)',
            }}
          />
          <div className="absolute h-[70cqw] w-[70cqw] animate-spin-slow rounded-full border-[0.8cqw] border-dashed border-white/15" />
          <div className="absolute h-[50cqw] w-[50cqw] rounded-full bg-brand opacity-40 blur-2xl" />
          <span className="relative font-display text-[14cqw] font-bold text-white drop-shadow-[0_0_20px_rgba(236,72,153,.8)]">
            Pack<span className="text-amber-300">ie</span>
          </span>
        </div>
      </div>
    </div>
  )
}
