import { memo } from 'react'
import { seededRandom } from '@/lib/utils'

/** Animated aurora blobs + twinkling starfield behind every page. */
export const Backdrop = memo(function Backdrop() {
  const rnd = seededRandom('packie-stars')
  const stars = Array.from({ length: 70 }, () => ({
    x: rnd() * 100,
    y: rnd() * 100,
    s: 0.4 + rnd() * 1.2,
    d: rnd() * 4,
  }))
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="aurora-blob left-[-10%] top-[-15%] h-[45vw] w-[45vw] animate-aurora bg-violet-600/40" />
      <div className="aurora-blob right-[-15%] top-[10%] h-[40vw] w-[40vw] animate-aurora bg-fuchsia-600/30 [animation-delay:-7s]" />
      <div className="aurora-blob bottom-[-20%] left-[25%] h-[45vw] w-[45vw] animate-aurora bg-sky-600/25 [animation-delay:-14s]" />
      {stars.map((s, i) => (
        <span
          key={i}
          className="star animate-twinkle"
          style={{ left: `${s.x}%`, top: `${s.y}%`, transform: `scale(${s.s})`, animationDelay: `${s.d}s` }}
        />
      ))}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)',
        }}
      />
    </div>
  )
})
