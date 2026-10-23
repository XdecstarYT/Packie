import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeftRight, Crown, Home, LayoutGrid, LogOut, ShoppingBag, Store, Trophy, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { CoinIcon, GemIcon, Logo } from './ui/misc'
import { Button } from './ui/Button'
import { cn, formatNumber, levelFromXp } from '@/lib/utils'

const NAV = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/shop', label: 'Shop', icon: ShoppingBag },
  { to: '/collection', label: 'Collection', icon: LayoutGrid },
  { to: '/market', label: 'Market', icon: Store },
  { to: '/trades', label: 'Trades', icon: ArrowLeftRight },
  { to: '/leaderboard', label: 'Ranks', icon: Trophy },
]

export function Avatar({ name, url, className }: { name: string; url?: string | null; className?: string }) {
  if (url) return <img src={url} alt="" className={cn('rounded-full object-cover', className)} />
  const hue = [...name].reduce((h, c) => h + c.charCodeAt(0), 0) % 360
  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-full font-display font-bold text-white', className)}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 85% 60%), hsl(${(hue + 60) % 360} 80% 45%))` }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function CurrencyPills({ coins, gems }: { coins: number; gems: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="glass inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold">
        <CoinIcon className="h-[18px] w-[18px]" />
        <motion.span key={coins} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          {formatNumber(coins)}
        </motion.span>
      </span>
      <span className="glass inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold">
        <GemIcon className="h-[18px] w-[18px]" />
        <motion.span key={gems} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          {formatNumber(gems)}
        </motion.span>
      </span>
    </div>
  )
}

export function AppLayout() {
  const { profile, isOwner, signOut } = useAuth()
  const [menu, setMenu] = useState(false)
  const nav = useNavigate()
  const lvl = levelFromXp(profile?.xp ?? 0)

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Link to="/home" className="shrink-0">
            <Logo />
          </Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    'relative rounded-xl px-3 py-2 text-sm font-semibold transition',
                    isActive ? 'text-white' : 'text-slate-400 hover:text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-xl bg-white/[0.08] ring-1 ring-white/10" />
                    )}
                    {n.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {isOwner && (
              <Button variant="gold" size="sm" onClick={() => nav('/owner')} className="hidden sm:inline-flex">
                <Crown className="h-4 w-4" /> Owner
              </Button>
            )}
            {profile && <CurrencyPills coins={profile.coins} gems={profile.gems} />}
            {profile && (
              <div className="relative">
                <button
                  onClick={() => setMenu((m) => !m)}
                  className="relative ml-1 flex items-center rounded-full ring-2 ring-violet-500/40 transition hover:ring-violet-400"
                  aria-label="Account menu"
                >
                  <Avatar name={profile.username} url={profile.avatar_url} className="h-9 w-9 text-sm" />
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-brand px-1.5 text-[10px] font-extrabold leading-4 ring-2 ring-ink-950">
                    {lvl.level}
                  </span>
                </button>
                <AnimatePresence>
                  {menu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        className="glass-strong absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl p-1.5 shadow-2xl"
                      >
                        <div className="px-3 py-2.5">
                          <p className="font-semibold">{profile.username}</p>
                          <p className="text-xs text-slate-400">
                            Level {lvl.level} · {formatNumber(lvl.toNext)} XP to next
                          </p>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full bg-brand" style={{ width: `${Math.round(lvl.progress * 100)}%` }} />
                          </div>
                        </div>
                        <MenuItem icon={User} label="My profile" onClick={() => { setMenu(false); nav(`/u/${profile.username}`) }} />
                        {isOwner && <MenuItem icon={Crown} label="Owner dashboard" onClick={() => { setMenu(false); nav('/owner') }} />}
                        <MenuItem icon={LogOut} label="Sign out" onClick={async () => { setMenu(false); await signOut(); nav('/') }} />
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>

      {/* mobile bottom nav */}
      <nav className="glass-strong fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl px-1 py-1.5 md:hidden">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              cn('flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold', isActive ? 'bg-white/10 text-white' : 'text-slate-400')
            }
          >
            <n.icon className="h-5 w-5" />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick }: { icon: typeof Home; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.07] hover:text-white">
      <Icon className="h-4 w-4" /> {label}
    </button>
  )
}
