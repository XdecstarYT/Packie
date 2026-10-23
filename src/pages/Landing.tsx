import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeftRight, ArrowRight, CalendarClock, Crown, Flame, Gem, Sparkles, Trophy } from 'lucide-react'
import { Logo } from '@/components/ui/misc'
import { Button } from '@/components/ui/Button'
import { PackieCard } from '@/components/PackieCard'
import { PackArt } from '@/components/PackArt'
import { Countdown } from '@/components/Countdown'
import { dropStatus, useCatalog } from '@/hooks/useCatalog'
import { useAuth } from '@/hooks/useAuth'
import { hexToRgba } from '@/lib/utils'

export function Landing() {
  const { session } = useAuth()
  const { catalog, rarityById, setById } = useCatalog()
  const showcase = ['Solarion, Dawnbringer', 'Zephyra, Sky Empress', 'Infernox']
    .map((n) => catalog?.cards.find((c) => c.name === n))
    .filter((c): c is NonNullable<typeof c> => !!c)
  const fallback = catalog?.cards.slice(-3) ?? []
  const hero = showcase.length === 3 ? showcase : fallback
  const liveDrop = catalog?.drops.find((d) => dropStatus(d) === 'live')
  const packs = catalog?.packs.filter((p) => p.is_active).slice(0, 3) ?? []

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-2">
          {session ? (
            <Link to="/welcome">
              <Button>
                Enter Packie <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link to="/signup">
                <Button>Play free</Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-8 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="chip border-violet-400/30 bg-violet-500/10 text-violet-200">
            <Sparkles className="h-3.5 w-3.5" /> Season 1: Origins is live
          </span>
          <h1 className="mt-5 text-5xl font-bold leading-[1.02] sm:text-6xl lg:text-7xl">
            Rip packs.
            <br />
            <span className="text-gradient">Chase legends.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
            Packie is the digital card collecting game where every pack is a surprise. Pull holographic foils, hunt numbered
            limited editions, complete sets, and trade with players around the world.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to={session ? '/welcome' : '/signup'}>
              <Button size="lg">
                {session ? 'Open packs' : 'Start collecting — free'} <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href="#how">
              <Button size="lg" variant="secondary">
                How it works
              </Button>
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-8 text-sm">
            {[
              ['500', 'free coins to start'],
              ['6', 'rarity tiers'],
              ['100', 'Mythics ever printed'],
            ].map(([n, l]) => (
              <div key={l}>
                <p className="font-display text-3xl font-bold">{n}</p>
                <p className="text-slate-400">{l}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="relative mx-auto h-[440px] w-full max-w-[520px] sm:h-[520px]">
          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/30 blur-[90px]" />
          {hero.map((card, i) => {
            const pos = [
              { x: '-58%', r: -14, y: 30, z: 1, d: 0.15 },
              { x: '-50%', r: 0, y: 0, z: 3, d: 0 },
              { x: '-42%', r: 14, y: 30, z: 2, d: 0.3 },
            ][i]
            const offset = [-130, 0, 130][i]
            return (
              <motion.div
                key={card.id}
                className="absolute left-1/2 top-4 w-[210px] sm:w-[250px]"
                style={{ zIndex: pos.z, marginLeft: offset }}
                initial={{ opacity: 0, y: 80, rotate: 0, x: pos.x }}
                animate={{ opacity: 1, y: pos.y, rotate: pos.r, x: pos.x }}
                transition={{ delay: 0.3 + pos.d, type: 'spring', damping: 16 }}
              >
                <div className="animate-float" style={{ animationDelay: `${i * 0.8}s` }}>
                  <PackieCard
                    card={card}
                    rarity={rarityById.get(card.rarity_id)}
                    set={card.set_id ? setById.get(card.set_id) : undefined}
                    foil={i === 1}
                    serial={card.is_limited_edition ? 7 : null}
                  />
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* LIVE DROP */}
      {liveDrop && (
        <section className="mx-auto max-w-7xl px-4 pb-16">
          <div
            className="relative overflow-hidden rounded-[2rem] border border-white/10 p-6 sm:p-10"
            style={{
              background: `radial-gradient(600px 300px at 0% 0%, ${hexToRgba(liveDrop.theme_color, 0.45)}, transparent 70%), radial-gradient(500px 300px at 100% 100%, rgba(139,92,246,.35), transparent 70%), rgba(16,12,43,.7)`,
            }}
          >
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <span className="chip border-rose-400/40 bg-rose-500/15 text-rose-200">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" /> Live drop
                </span>
                <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">{liveDrop.name}</h2>
                <p className="mt-2 max-w-xl text-slate-300">{liveDrop.description}</p>
              </div>
              {liveDrop.ends_at && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Ends in</p>
                  <Countdown to={liveDrop.ends_at} />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-10 px-4 pb-20">
        <h2 className="text-center text-4xl font-semibold">
          Everything a collector <span className="text-gradient">dreams of</span>
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Flame, title: 'Rip packs', text: 'Animated pack openings with real, published odds for every slot.', c: '#f97316' },
            { icon: Crown, title: 'Limited editions', text: 'Numbered cards with fixed print runs. When they’re gone, they’re gone.', c: '#f59e0b' },
            { icon: ArrowLeftRight, title: 'Trade & market', text: 'Swap cards with friends or sell your duplicates for coins.', c: '#22d3ee' },
            { icon: CalendarClock, title: 'Seasons & drops', text: 'New sets every season and timed drops with exclusive deals.', c: '#a855f7' },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass group rounded-3xl p-6 transition hover:-translate-y-1 hover:border-white/20"
            >
              <div
                className="mb-4 inline-flex rounded-2xl p-3"
                style={{ background: hexToRgba(f.c, 0.15), color: f.c, boxShadow: `0 0 30px -10px ${f.c}` }}
              >
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* RARITIES */}
      {catalog && (
        <section className="mx-auto max-w-7xl px-4 pb-20">
          <div className="glass rounded-[2rem] p-6 sm:p-10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300/80">The rarity ladder</p>
                <h2 className="mt-1 text-3xl font-semibold">From Common to Mythic</h2>
              </div>
              <p className="max-w-sm text-sm text-slate-400">Higher tiers glow brighter, shimmer with holo foil and score more collection points.</p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {catalog.rarities.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border p-4 text-center"
                  style={{ borderColor: hexToRgba(r.color, 0.4), background: hexToRgba(r.color, 0.08), boxShadow: `0 0 ${r.sort_order * 6}px -6px ${r.color}` }}
                >
                  <Gem className="mx-auto h-6 w-6" style={{ color: r.color }} />
                  <p className="mt-2 font-display text-lg font-semibold" style={{ color: r.color }}>
                    {r.name}
                  </p>
                  <p className="text-xs text-slate-400">{r.points} pts</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PACKS */}
      {packs.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-24">
          <h2 className="text-center text-4xl font-semibold">Pick your pack</h2>
          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-10 sm:grid-cols-3">
            {packs.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="mx-auto w-52"
              >
                <div className="transition duration-300 hover:-translate-y-2 hover:rotate-[-2deg]">
                  <PackArt pack={p} />
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link to={session ? '/shop' : '/signup'}>
              <Button size="lg">
                <Trophy className="h-5 w-5" /> Claim your 500 free coins
              </Button>
            </Link>
          </div>
        </section>
      )}

      <footer className="border-t border-white/5 py-10 text-center text-sm text-slate-500">
        <Logo className="opacity-80" />
        <p className="mt-3">© {new Date().getFullYear()} Packie. All creatures are original. Coins and gems are virtual and have no cash value.</p>
      </footer>
    </div>
  )
}
