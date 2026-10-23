import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Crown, LayoutGrid, RotateCcw, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PackArt } from './PackArt'
import { CardBack, PackieCard } from './PackieCard'
import { Button } from './ui/Button'
import type { Card, CardSet, OpenedCard, Pack, Rarity } from '@/lib/types'
import { cn, hexToRgba } from '@/lib/utils'

interface Props {
  pack: Pack
  results: OpenedCard[]
  cardById: Map<string, Card>
  rarityById: Map<string, Rarity>
  setById: Map<string, CardSet>
  /** Card ids the player owned before this pack, for "NEW" badges. */
  ownedBefore: Set<string>
  onClose: () => void
  onOpenAnother?: () => void
}

type Stage = 'pack' | 'tear' | 'cards' | 'summary'

function Burst({ color, big }: { color: string; big?: boolean }) {
  const n = big ? 36 : 22
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {Array.from({ length: n }, (_, i) => {
        const a = (Math.PI * 2 * i) / n
        const d = (big ? 260 : 180) + (i % 3) * 40
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ width: i % 4 === 0 ? 10 : 6, height: i % 4 === 0 ? 10 : 6, background: i % 3 === 0 ? '#fff' : color, boxShadow: `0 0 12px ${color}` }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, opacity: 0, scale: 0.3 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        )
      })}
      <motion.span
        className="absolute rounded-full"
        style={{ border: `3px solid ${color}` }}
        initial={{ width: 40, height: 40, opacity: 0.9 }}
        animate={{ width: big ? 700 : 480, height: big ? 700 : 480, opacity: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
    </div>
  )
}

export function PackOpening({ pack, results, cardById, rarityById, setById, ownedBefore, onClose, onOpenAnother }: Props) {
  const [stage, setStage] = useState<Stage>('pack')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const items = useMemo(
    () =>
      results
        .map((r) => {
          const card = cardById.get(r.card_id)
          const rarity = card ? rarityById.get(card.rarity_id) : undefined
          return card ? { ...r, card, rarity, tier: Math.max(0, (rarity?.sort_order ?? 1) - 1) } : null
        })
        .filter((x): x is NonNullable<typeof x> => !!x),
    [results, cardById, rarityById],
  )
  const best = items.reduce((m, it) => Math.max(m, it.tier), 0)
  const current = items[index]

  const rip = useCallback(() => {
    if (stage !== 'pack') return
    setStage('tear')
    setTimeout(() => setStage('cards'), 1100)
  }, [stage])

  const advance = useCallback(() => {
    if (stage === 'pack') return rip()
    if (stage !== 'cards') return
    if (!flipped) return setFlipped(true)
    if (index + 1 >= items.length) return setStage('summary')
    setFlipped(false)
    setIndex((i) => i + 1)
  }, [stage, flipped, index, items.length, rip])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault()
        advance()
      }
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [advance, onClose])

  const glowColor = stage === 'cards' && flipped && current?.rarity ? current.rarity.color : pack.theme_color

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-ink-950/95 backdrop-blur-xl">
      {/* ambient glow */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
        animate={{ backgroundColor: hexToRgba(glowColor, 0.45), scale: stage === 'tear' ? 1.4 : 1 }}
        transition={{ duration: 0.6 }}
      />
      {stage === 'cards' && flipped && current && current.tier >= 3 && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[140vmin] w-[140vmin] -translate-x-1/2 -translate-y-1/2 animate-spin-slow opacity-40"
          style={{
            background: `repeating-conic-gradient(from 0deg, ${hexToRgba(current.rarity?.color ?? '#fff', 0.35)} 0deg 6deg, transparent 6deg 18deg)`,
            maskImage: 'radial-gradient(circle, black 10%, transparent 60%)',
          }}
        />
      )}

      <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-slate-300 hover:bg-white/20 hover:text-white" aria-label="Close">
        <X className="h-5 w-5" />
      </button>

      {/* PACK */}
      <AnimatePresence>
        {(stage === 'pack' || stage === 'tear') && (
          <motion.div
            key="pack"
            className="relative w-[min(68vw,300px)] cursor-pointer"
            onClick={rip}
            initial={{ scale: 0.6, opacity: 0, y: 60 }}
            animate={
              stage === 'tear'
                ? { x: [0, -8, 8, -10, 10, -6, 0], rotate: [0, -2, 2, -3, 3, 0], scale: 1.05 }
                : { scale: 1, opacity: 1, y: 0 }
            }
            exit={{ scale: 1.25, opacity: 0, filter: 'brightness(3)' }}
            transition={stage === 'tear' ? { duration: 0.8 } : { type: 'spring', damping: 14 }}
          >
            <div className={cn(stage === 'pack' && 'animate-float')}>
              <div className="relative">
                <PackArt pack={pack} />
                {/* tear strip */}
                <motion.div
                  className="absolute inset-x-0 top-0 h-[14%] overflow-hidden rounded-t-[4%]"
                  animate={stage === 'tear' ? { y: -260, x: 120, rotate: 35, opacity: 0 } : {}}
                  transition={{ delay: 0.55, duration: 0.6, ease: 'easeIn' }}
                  style={{ background: `linear-gradient(180deg, ${pack.theme_color}, transparent)` }}
                >
                  <div className="crimp-top" />
                  <div className="absolute inset-x-0 bottom-0 border-b-2 border-dashed border-white/60" />
                </motion.div>
                {stage === 'tear' && (
                  <motion.div
                    className="absolute inset-x-0 top-[12%] h-2 bg-white"
                    style={{ boxShadow: '0 0 40px 20px rgba(255,255,255,.8)' }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                  />
                )}
              </div>
            </div>
            {stage === 'pack' && (
              <motion.p
                className="mt-8 text-center font-display text-xl font-semibold text-white"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                Tap to rip it open
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CARDS */}
      {stage === 'cards' && current && (
        <div className="relative flex flex-col items-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-slate-400">
            Card {index + 1} of {items.length}
            {current.tier >= 3 && !flipped && <span className="ml-2 text-amber-300">· something shiny…</span>}
          </p>
          <div className="relative" style={{ perspective: 1400 }}>
            {/* remaining stack */}
            {items.slice(index + 1).map((_, i) => (
              <div
                key={i}
                className="absolute inset-0 w-[min(72vw,320px)]"
                style={{ transform: `translate(${(i + 1) * 6}px, ${(i + 1) * 6}px) rotate(${(i + 1) * 2}deg)`, zIndex: -i - 1, opacity: 0.6 - i * 0.1 }}
              >
                <CardBack />
              </div>
            ))}
            <AnimatePresence mode="popLayout">
              <motion.div
                key={current.instance_id}
                className="relative w-[min(72vw,320px)] cursor-pointer"
                style={{ transformStyle: 'preserve-3d' }}
                onClick={advance}
                initial={{ y: 40, opacity: 0, rotateY: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, rotateY: flipped ? 180 : 0, scale: flipped && current.tier >= 3 ? 1.06 : 1 }}
                exit={{ x: -420, rotate: -20, opacity: 0, transition: { duration: 0.35 } }}
                transition={{ type: 'spring', damping: 18, stiffness: 160 }}
              >
                <div style={{ backfaceVisibility: 'hidden' }}>
                  <motion.div
                    animate={current.tier >= 3 ? { x: [0, -3, 3, -3, 3, 0] } : {}}
                    transition={{ repeat: Infinity, repeatDelay: 0.8, duration: 0.4 }}
                    className="rounded-[6%/4.3%]"
                    style={current.tier >= 3 ? { boxShadow: `0 0 60px -5px ${current.rarity?.color}` } : undefined}
                  >
                    <CardBack />
                  </motion.div>
                </div>
                <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                  <PackieCard
                    card={current.card}
                    rarity={current.rarity}
                    set={current.card.set_id ? setById.get(current.card.set_id) : undefined}
                    serial={current.serial_number}
                    foil={current.foil}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
            {flipped && current.tier >= 2 && <Burst key={`b${index}`} color={current.rarity?.color ?? '#fff'} big={current.tier >= 4} />}
          </div>

          <div className="mt-6 h-16 text-center">
            <AnimatePresence mode="wait">
              {flipped ? (
                <motion.div key={`l${index}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <p className="font-display text-2xl font-bold" style={{ color: current.rarity?.color }}>
                    {current.rarity?.name}
                    {current.foil && ' · Foil'}
                    {current.serial_number && ` · #${current.serial_number}`}
                  </p>
                  {!ownedBefore.has(current.card_id) && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/40">
                      <Sparkles className="h-3 w-3" /> New to your collection
                    </span>
                  )}
                </motion.div>
              ) : (
                <motion.p key={`h${index}`} className="text-sm text-slate-400" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  Tap the card to reveal
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <button onClick={() => setStage('summary')} className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-white">
            Reveal all
          </button>
        </div>
      )}

      {/* SUMMARY */}
      {stage === 'summary' && (
        <motion.div className="relative w-full max-w-5xl overflow-y-auto px-4 py-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">{pack.name}</p>
            <h2 className="mt-2 text-4xl font-bold">
              {best >= 4 ? (
                <span className="text-gradient">Legendary pull!</span>
              ) : best >= 3 ? (
                'Epic pack!'
              ) : (
                'Nice pulls!'
              )}
            </h2>
          </div>
          <div className="mx-auto mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {items.map((it, i) => (
              <motion.div
                key={it.instance_id}
                initial={{ opacity: 0, y: 30, rotate: -6 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ delay: i * 0.08, type: 'spring', damping: 15 }}
                className="relative"
              >
                <PackieCard
                  card={it.card}
                  rarity={it.rarity}
                  set={it.card.set_id ? setById.get(it.card.set_id) : undefined}
                  serial={it.serial_number}
                  foil={it.foil}
                  compact
                />
                {!ownedBefore.has(it.card_id) && (
                  <span className="absolute -right-2 -top-2 z-10 rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-950 shadow-lg">
                    New
                  </span>
                )}
                {it.serial_number && (
                  <span className="absolute -left-2 -top-2 z-10 flex items-center gap-1 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-extrabold text-amber-950 shadow-lg">
                    <Crown className="h-3 w-3" />#{it.serial_number}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {onOpenAnother && (
              <Button size="lg" onClick={onOpenAnother}>
                <RotateCcw className="h-5 w-5" /> Open another
              </Button>
            )}
            <Link to="/collection" onClick={onClose}>
              <Button size="lg" variant="secondary">
                <LayoutGrid className="h-5 w-5" /> View collection
              </Button>
            </Link>
            <Button size="lg" variant="ghost" onClick={onClose}>
              Done
            </Button>
          </div>
        </motion.div>
      )}
    </div>,
    document.body,
  )
}
