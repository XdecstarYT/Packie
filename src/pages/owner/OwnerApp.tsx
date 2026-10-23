import { useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  CalendarRange,
  Coins,
  Crown,
  Gem,
  History,
  Layers,
  Menu,
  Package,
  Rocket,
  Sparkles,
  Users,
} from 'lucide-react'
import { Logo } from '@/components/ui/misc'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Overview } from './Overview'
import { CardsAdmin } from './CardsAdmin'
import { PacksAdmin } from './PacksAdmin'
import { SeasonsAdmin } from './SeasonsAdmin'
import { SetsAdmin } from './SetsAdmin'
import { RaritiesAdmin } from './RaritiesAdmin'
import { DropsAdmin } from './DropsAdmin'
import { PlayersAdmin } from './PlayersAdmin'
import { EconomyAdmin } from './EconomyAdmin'
import { AuditAdmin } from './AuditAdmin'

const NAV = [
  { to: '/owner', label: 'Overview', icon: BarChart3, end: true },
  { to: '/owner/cards', label: 'Cards', icon: Sparkles },
  { to: '/owner/packs', label: 'Packs & pricing', icon: Package },
  { to: '/owner/drops', label: 'Drops', icon: Rocket },
  { to: '/owner/seasons', label: 'Seasons', icon: CalendarRange },
  { to: '/owner/sets', label: 'Sets', icon: Layers },
  { to: '/owner/rarities', label: 'Rarities', icon: Gem },
  { to: '/owner/players', label: 'Players', icon: Users },
  { to: '/owner/economy', label: 'Economy', icon: Coins },
  { to: '/owner/audit', label: 'Audit log', icon: History },
]

export default function OwnerApp() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-5">
        <Link to="/owner" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300/20 to-orange-400/20 px-2.5 py-1 text-xs font-bold text-amber-200 ring-1 ring-amber-300/30">
          <Crown className="h-3.5 w-3.5" /> Owner dashboard
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                isActive ? 'bg-white/10 text-white ring-1 ring-white/10' : 'text-slate-400 hover:bg-white/5 hover:text-white',
              )
            }
          >
            <n.icon className="h-[18px] w-[18px]" />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link to="/home" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 hover:bg-white/5 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to the game
        </Link>
        <p className="px-3 pt-1 text-xs text-slate-500">Signed in as {profile?.username}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="glass-strong fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/10 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="glass-strong absolute inset-y-0 left-0 w-72">{sidebar}</aside>
        </div>
      )}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/5 bg-ink-950/70 px-4 backdrop-blur-xl lg:hidden">
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <Logo />
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <Routes>
          <Route index element={<Overview />} />
          <Route path="cards" element={<CardsAdmin />} />
          <Route path="packs" element={<PacksAdmin />} />
          <Route path="drops" element={<DropsAdmin />} />
          <Route path="seasons" element={<SeasonsAdmin />} />
          <Route path="sets" element={<SetsAdmin />} />
          <Route path="rarities" element={<RaritiesAdmin />} />
          <Route path="players" element={<PlayersAdmin />} />
          <Route path="economy" element={<EconomyAdmin />} />
          <Route path="audit" element={<AuditAdmin />} />
          <Route path="*" element={<Navigate to="/owner" replace />} />
        </Routes>
      </main>
    </div>
  )
}
