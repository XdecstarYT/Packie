import type { CSSProperties } from 'react'
import { Crown, Sparkles } from 'lucide-react'
import type { Pack } from '@/lib/types'
import { cn, hexToRgba, seededRandom } from '@/lib/utils'

interface PackArtProps {
  pack: Pick<Pack, 'id' | 'name' | 'theme_color' | 'art_url' | 'is_limited_edition' | 'slots'>
  className?: string
  /** Hide the label text (e.g. while tearing). */
  bare?: boolean
}

/** A shiny foil booster pack, sized by its container (aspect 5:7.6). */
export function PackArt({ pack, className, bare }: PackArtProps) {
  const c = pack.theme_color || '#8b5cf6'
  const rnd = seededRandom(pack.id)
  const sparkles = Array.from({ length: 14 }, () => ({ x: rnd() * 100, y: rnd() * 100, s: 0.6 + rnd() * 1.4, d: rnd() * 3 }))
  const style: CSSProperties = {
    containerType: 'inline-size',
    background: `linear-gradient(160deg, ${hexToRgba(c, 1)} 0%, ${hexToRgba(c, 0.55)} 35%, #1a1040 70%, ${hexToRgba(c, 0.9)} 100%)`,
    boxShadow: `0 30px 60px -25px ${hexToRgba(c, 0.8)}, inset 0 0 0 1px rgba(255,255,255,.2), inset 0 2px 30px rgba(255,255,255,.15)`,
  }

  return (
    <div className={cn('relative aspect-[5/7.6] w-full overflow-hidden rounded-[4%/2.6%]', className)} style={style}>
      {pack.art_url && <img src={pack.art_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" draggable={false} />}

      {/* foil bands */}
      <div
        className="absolute inset-0 opacity-60 mix-blend-overlay"
        style={{
          background:
            'repeating-linear-gradient(115deg, rgba(255,255,255,.0) 0 8%, rgba(255,255,255,.35) 10%, rgba(255,255,255,0) 14%)',
        }}
      />
      <div className="foil-sheen" />
      <div className="crimp-top" />
      <div className="crimp-bottom" />

      {sparkles.map((s, i) => (
        <span
          key={i}
          className="star animate-twinkle"
          style={{ left: `${s.x}%`, top: `${s.y}%`, transform: `scale(${s.s})`, animationDelay: `${s.d}s` }}
        />
      ))}

      {!bare && (
        <div className="relative flex h-full flex-col items-center justify-between px-[8cqw] pb-[12cqw] pt-[14cqw] text-center">
          <div className="font-display text-[11cqw] font-bold leading-none tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,.5)]">
            Pack<span className="text-amber-200">ie</span>
          </div>

          {!pack.art_url && (
            <div className="relative flex h-[46cqw] w-[46cqw] items-center justify-center">
              <div className="absolute inset-0 animate-spin-slow rounded-full border-[0.8cqw] border-dashed border-white/30" />
              <div className="absolute inset-[12%] rounded-full bg-white/20 blur-xl" />
              {/* fanned card silhouettes */}
              {[-16, 0, 16].map((r, i) => (
                <div
                  key={r}
                  className="absolute h-[34cqw] w-[24cqw] rounded-[2cqw] border border-white/50 bg-white/15 backdrop-blur-sm"
                  style={{ transform: `rotate(${r}deg) translateY(${i === 1 ? -2 : 0}cqw)` }}
                />
              ))}
              <Sparkles className="relative h-[14cqw] w-[14cqw] text-white drop-shadow-[0_0_12px_rgba(255,255,255,.9)]" />
            </div>
          )}

          <div className="w-full">
            {pack.is_limited_edition && (
              <div className="mx-auto mb-[3cqw] inline-flex items-center gap-[1.5cqw] rounded-full bg-black/45 px-[3.5cqw] py-[1cqw] text-[4cqw] font-extrabold uppercase tracking-[0.2em] text-amber-200 ring-1 ring-amber-200/60">
                <Crown className="h-[4.5cqw] w-[4.5cqw]" /> Limited
              </div>
            )}
            <div className="font-display text-[9cqw] font-semibold leading-[1.05] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.6)]">
              {pack.name}
            </div>
            <div className="mt-[2cqw] text-[4.2cqw] font-bold uppercase tracking-[0.25em] text-white/75">
              {pack.slots.length} cards
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
