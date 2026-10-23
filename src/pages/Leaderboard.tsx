import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Crown, Medal, Trophy } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/AppLayout'
import { EmptyState, ErrorState, PageLoader, SectionTitle } from '@/components/ui/misc'
import { supabase } from '@/lib/supabase'
import { cn, formatNumber, levelFromXp } from '@/lib/utils'

export function LeaderboardPage() {
  const { profile } = useAuth()
  const q = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leaderboard', { p_limit: 100 })
      if (error) throw error
      return data ?? []
    },
  })
  if (q.isLoading) return <PageLoader />
  if (q.error) return <ErrorState error={q.error} onRetry={q.refetch} />
  const rows = q.data ?? []
  const podium = rows.slice(0, 3)
  const medal = ['#fbbf24', '#cbd5e1', '#d97706']

  return (
    <div>
      <SectionTitle eyebrow="Leaderboard" title="Top collectors" />
      {rows.length === 0 ? (
        <EmptyState icon={<Trophy className="h-8 w-8" />} title="No collectors yet" />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-3 items-end gap-3 sm:gap-6">
            {[1, 0, 2].map((idx) => {
              const r = podium[idx]
              if (!r) return <div key={idx} />
              return (
                <motion.div
                  key={r.user_id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className={cn('glass flex flex-col items-center rounded-3xl p-4 text-center sm:p-6', idx === 0 && 'pb-10 sm:pb-14')}
                  style={{ boxShadow: `0 0 50px -20px ${medal[idx]}` }}
                >
                  <div className="relative">
                    {idx === 0 && <Crown className="absolute -top-6 left-1/2 h-6 w-6 -translate-x-1/2 text-amber-300" />}
                    <Avatar name={r.username} url={r.avatar_url} className={cn('ring-4', idx === 0 ? 'h-20 w-20 text-3xl' : 'h-14 w-14 text-xl')} />
                  </div>
                  <Link to={`/u/${r.username}`} className="mt-3 truncate font-semibold hover:underline">
                    {r.username}
                  </Link>
                  <p className="font-display text-2xl font-bold" style={{ color: medal[idx] }}>
                    {formatNumber(r.collection_score)}
                  </p>
                  <p className="text-xs text-slate-400">points</p>
                </motion.div>
              )
            })}
          </div>

          <div className="glass overflow-hidden rounded-3xl">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Collector</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">Level</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">Cards</th>
                  <th className="hidden px-4 py-3 text-right md:table-cell">Unique</th>
                  <th className="px-4 py-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.user_id} className={cn('border-t border-white/5', r.user_id === profile?.id && 'bg-violet-500/10')}>
                    <td className="px-4 py-3 font-bold text-slate-400">{i < 3 ? <Medal className="h-5 w-5" style={{ color: medal[i] }} /> : i + 1}</td>
                    <td className="px-4 py-3">
                      <Link to={`/u/${r.username}`} className="flex items-center gap-2.5 font-semibold hover:underline">
                        <Avatar name={r.username} url={r.avatar_url} className="h-8 w-8 text-sm" />
                        {r.username}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">{levelFromXp(r.xp).level}</td>
                    <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">{formatNumber(r.cards_owned)}</td>
                    <td className="hidden px-4 py-3 text-right tabular-nums md:table-cell">{formatNumber(r.unique_cards)}</td>
                    <td className="px-4 py-3 text-right font-display text-base font-bold tabular-nums">{formatNumber(r.collection_score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
