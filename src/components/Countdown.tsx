import { useNow } from '@/hooks/useNow'
import { cn } from '@/lib/utils'

export function Countdown({ to, className, compact }: { to: string; className?: string; compact?: boolean }) {
  const now = useNow(1000)
  const diff = Math.max(0, new Date(to).getTime() - now)
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff / 3_600_000) % 24)
  const m = Math.floor((diff / 60_000) % 60)
  const s = Math.floor((diff / 1000) % 60)
  if (compact) {
    return <span className={cn('tabular-nums', className)}>{d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`}</span>
  }
  const parts = [
    ['days', d],
    ['hrs', h],
    ['min', m],
    ['sec', s],
  ] as const
  return (
    <div className={cn('flex gap-2', className)}>
      {parts.map(([label, v]) => (
        <div key={label} className="glass flex min-w-[3.4rem] flex-col items-center rounded-xl px-2 py-1.5">
          <span className="font-display text-2xl font-bold tabular-nums leading-none">{String(v).padStart(2, '0')}</span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
        </div>
      ))}
    </div>
  )
}
