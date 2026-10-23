import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarClock, Gift, Layers, PackageOpen, Sparkles, Star } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { dropStatus, useCatalog } from '@/hooks/useCatalog'
import { useInstances } from '@/hooks/useCollection'
import { useNow } from '@/hooks/useNow'
import { Button } from '@/components/ui/Button'
import { CoinIcon, EmptyState, GemIcon, SectionTitle, Skeleton } from '@/components/ui/misc'
import { Countdown } from '@/components/Countdown'
import { PackieCard } from '@/components/PackieCard'
import { PackArt } from '@/components/PackArt'
import { errorMessage, supabase } from '@/lib/supabase'
import { formatDate, formatNumber, hexToRgba, levelFromXp } from '@/lib/utils'

const DAILY_MS = 20 * 3600 * 1000

export function HomePage() {
  const { profile, refreshProfile } = useAuth()
  const { catalog, cardById, rarityById, setById } = useCatalog()
  const instances = useInstances(profile?.id)
  const now = useNow(1000)
  const [claiming, setClaiming] = useState(false)
  const settings = useSettingsPreview()

  if (!profile) return null
  const lvl = levelFromXp(profile.xp)
  const nextClaim = profile.last_daily_claim ? new Date(profile.last_daily_claim).getTime() + DAILY_MS : 0
  const canClaim = now >= nextClaim
  const season = catalog?.seasons.find((s) => s.status === 'active')
  const drops = (catalog?.drops ?? []).filter((d) => d.is_published && dropStatus(d, now) !== 'ended')
  const recent = (instances.data ?? []).slice(0, 6)
  const uniqueOwned = new Set((instances.data ?? []).map((i) => i.card_id)).size
  const totalCards = catalog?.cards.filter((c) => c.is_active).length ?? 0
  const featuredPack = catalog?.packs.find((p) => p.is_active)

  async function claim() {
    setClaiming(true)
    const { data, error } = await supabase.rpc('claim_daily_reward')
    setClaiming(false)
    if (error) return toast.error(errorMessage(error))
    const r = data as { coins: number; gems: number }
    toast.success(`Daily reward: +${r.coins} coins${r.gems ? ` & +${r.gems} gem${r.gems > 1 ? 's' : ''}` : ''}!`)
    refreshProfile()
  }

  return (
    <div className="space-y-10">
      {/* Greeting + daily */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2rem] border border-white/10 p-6 sm:p-8"
          style={{
            background: `radial-gradient(600px 300px at 100% 0%, ${hexToRgba(season?.theme_color ?? '#8b5cf6', 0.4)}, transparent 70%), rgba(16,12,43,.7)`,
          }}
        >
          <p className="text-sm font-semibold text-violet-200/80">{season?.name ?? 'Welcome'}</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
            Hey {profile.username}, <span className="text-gradient">ready to rip?</span>
          </h1>
          <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-md">
            <Stat icon={<Star className="h-4 w-4 text-amber-300" />} label="Level" value={lvl.level} />
            <Stat icon={<Layers className="h-4 w-4 text-violet-300" />} label="Cards" value={formatNumber(instances.data?.length ?? 0)} />
            <Stat icon={<Sparkles className="h-4 w-4 text-cyan-300" />} label="Unique" value={`${uniqueOwned}/${totalCards}`} />
          </div>
          <div className="mt-5 sm:max-w-md">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>XP {formatNumber(profile.xp)}</span>
              <span>{formatNumber(lvl.toNext)} to level {lvl.level + 1}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${lvl.progress * 100}%` }} transition={{ duration: 1 }} />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/shop">
              <Button size="lg">
                <PackageOpen className="h-5 w-5" /> Open packs
              </Button>
            </Link>
            <Link to="/collection">
              <Button size="lg" variant="secondary">
                My collection
              </Button>
            </Link>
          </div>
          {season?.ends_at && (
            <p className="mt-6 text-xs text-slate-400">
              Season ends {formatDate(season.ends_at)} · <Countdown to={season.ends_at} compact />
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass relative flex flex-col items-center justify-center overflow-hidden rounded-[2rem] p-6 text-center"
        >
          <div className="pointer-events-none absolute -top-16 h-48 w-48 rounded-full bg-amber-400/25 blur-[60px]" />
          <motion.div
            animate={canClaim ? { rotate: [0, -8, 8, -8, 0], scale: [1, 1.08, 1] } : {}}
            transition={{ repeat: Infinity, repeatDelay: 2, duration: 0.8 }}
            className="relative rounded-3xl bg-gradient-to-br from-amber-300 to-orange-500 p-4 shadow-[0_0_40px_-5px_rgba(251,191,36,.7)]"
          >
            <Gift className="h-10 w-10 text-amber-950" />
          </motion.div>
          <h2 className="relative mt-4 text-2xl font-semibold">Daily reward</h2>
          <p className="relative mt-1 flex items-center gap-3 text-sm text-slate-300">
            <span className="flex items-center gap-1">
              <CoinIcon /> {settings?.daily_reward_coins ?? 150}
            </span>
            {(settings?.daily_reward_gems ?? 1) > 0 && (
              <span className="flex items-center gap-1">
                <GemIcon /> {settings?.daily_reward_gems ?? 1}
              </span>
            )}
          </p>
          {canClaim ? (
            <Button variant="gold" size="lg" className="relative mt-5 w-full" loading={claiming} onClick={claim}>
              Claim now
            </Button>
          ) : (
            <div className="relative mt-5 w-full rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-400">
              Next reward in <Countdown to={new Date(nextClaim).toISOString()} compact className="font-bold text-white" />
            </div>
          )}
        </motion.div>
      </div>

      {/* Drops */}
      {drops.length > 0 && (
        <section>
          <SectionTitle eyebrow="Drops" title="Live & upcoming" />
          <div className="grid gap-4 md:grid-cols-2">
            {drops.map((d) => {
              const status = dropStatus(d, now)
              const featured = (catalog?.dropItems ?? [])
                .filter((i) => i.drop_id === d.id && i.card_id)
                .map((i) => cardById.get(i.card_id!))
                .filter((c): c is NonNullable<typeof c> => !!c)
              return (
                <div
                  key={d.id}
                  className="relative overflow-hidden rounded-[1.75rem] border border-white/10 p-6"
                  style={{ background: `radial-gradient(400px 200px at 0% 0%, ${hexToRgba(d.theme_color, 0.35)}, transparent 70%), rgba(16,12,43,.7)` }}
                >
                  {d.banner_url && <img src={d.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
                  <div className="relative">
                    <span
                      className={
                        status === 'live'
                          ? 'chip border-rose-400/40 bg-rose-500/15 text-rose-200'
                          : 'chip border-sky-400/40 bg-sky-500/15 text-sky-200'
                      }
                    >
                      {status === 'live' ? <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" /> : <CalendarClock className="h-3 w-3" />}
                      {status === 'live' ? 'Live now' : 'Coming soon'}
                    </span>
                    <h3 className="mt-3 text-2xl font-semibold">{d.name}</h3>
                    <p className="mt-1 text-sm text-slate-300">{d.description}</p>
                    <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{status === 'live' ? 'Ends in' : 'Starts in'}</p>
                        <Countdown to={status === 'live' ? d.ends_at ?? d.starts_at : d.starts_at} />
                      </div>
                      {featured.length > 0 && (
                        <div className="flex -space-x-6">
                          {featured.slice(0, 3).map((c, i) => (
                            <div key={c.id} className="w-16" style={{ transform: `rotate(${(i - 1) * 8}deg)` }}>
                              <PackieCard card={c} rarity={rarityById.get(c.rarity_id)} interactive={false} compact />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Recent pulls */}
      <section>
        <SectionTitle
          eyebrow="Your binder"
          title="Recent pulls"
          action={
            <Link to="/collection" className="flex items-center gap-1 text-sm font-semibold text-violet-300 hover:text-violet-200">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
        {instances.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="aspect-[5/7]" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="grid items-center gap-6 md:grid-cols-[1fr_200px]">
            <EmptyState icon={<PackageOpen className="h-8 w-8" />} title="Your binder is empty" action={<Link to="/shop"><Button>Open your first pack</Button></Link>}>
              You've got {formatNumber(profile.coins)} coins — enough for a few packs. Let's go!
            </EmptyState>
            {featuredPack && (
              <Link to="/shop" className="mx-auto hidden w-44 animate-float md:block">
                <PackArt pack={featuredPack} />
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {recent.map((inst, i) => {
              const card = cardById.get(inst.card_id)
              if (!card) return null
              return (
                <motion.div key={inst.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <PackieCard
                    card={card}
                    rarity={rarityById.get(card.rarity_id)}
                    set={card.set_id ? setById.get(card.set_id) : undefined}
                    serial={inst.serial_number}
                    foil={inst.foil}
                    compact
                  />
                </motion.div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {icon} {label}
      </p>
      <p className="mt-0.5 font-display text-2xl font-bold">{value}</p>
    </div>
  )
}

function useSettingsPreview() {
  const q = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('game_settings').select('*').eq('id', 1).single()
      if (error) throw error
      return data
    },
    staleTime: 5 * 60_000,
  })
  return q.data
}
