import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-6 w-6 animate-spin text-violet-300', className)} />
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-white/[0.06]', className)} />
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="glass flex flex-col items-center justify-center gap-3 rounded-3xl px-6 py-14 text-center">
      {icon && <div className="mb-1 rounded-2xl bg-white/5 p-4 text-violet-300">{icon}</div>}
      <h3 className="text-xl font-semibold">{title}</h3>
      {children && <p className="max-w-sm text-sm text-slate-400">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Something went wrong'
  return (
    <div className="glass rounded-3xl border-rose-500/30 px-6 py-10 text-center">
      <p className="font-semibold text-rose-200">Couldn't load this</p>
      <p className="mt-1 text-sm text-slate-400">{msg}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 text-sm font-semibold text-violet-300 hover:text-violet-200">
          Try again
        </button>
      )}
    </div>
  )
}

export function CoinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} aria-hidden>
      <defs>
        <linearGradient id="coin-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#coin-g)" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#b45309" strokeOpacity=".5" strokeWidth="1.5" />
      <path d="M10 8h3a2.5 2.5 0 0 1 0 5h-2v3h-1.5V8z" fill="#92400e" />
    </svg>
  )
}

export function GemIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} aria-hidden>
      <defs>
        <linearGradient id="gem-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a5f3fc" />
          <stop offset=".5" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path d="M6 3h12l4 6-10 12L2 9z" fill="url(#gem-g)" />
      <path d="M2 9h20M8 3l4 18M16 3l-4 18M6 3l2 6M18 3l-2 6" stroke="#fff" strokeOpacity=".35" strokeWidth=".8" fill="none" />
    </svg>
  )
}

export function Price({ coins, gems, className }: { coins?: number | null; gems?: number | null; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-3 font-bold', className)}>
      {coins != null && (
        <span className="inline-flex items-center gap-1">
          <CoinIcon /> {formatNumber(coins)}
        </span>
      )}
      {gems != null && (
        <span className="inline-flex items-center gap-1">
          <GemIcon /> {formatNumber(gems)}
        </span>
      )}
    </span>
  )
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-violet-300/80">{eyebrow}</p>}
        <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 64 64" className="h-8 w-8 drop-shadow-[0_0_12px_rgba(217,70,239,.6)]" aria-hidden>
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a855f7" />
            <stop offset=".55" stopColor="#ec4899" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <g transform="rotate(-8 32 32)">
          <rect x="10" y="4" width="44" height="56" rx="10" fill="url(#logo-g)" />
          <rect x="14" y="8" width="36" height="48" rx="7" fill="#0b0820" opacity=".35" />
          <path d="M26 20h9a8 8 0 0 1 0 16h-5v8h-4z" fill="#fff" />
        </g>
      </svg>
      <span className="font-display text-2xl font-bold tracking-tight">
        Pack<span className="text-gradient">ie</span>
      </span>
    </span>
  )
}
