import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AdminHeader, Panel } from '@/components/owner/Admin'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Fields'
import { CoinIcon, ErrorState, GemIcon, PageLoader } from '@/components/ui/misc'
import { errorMessage, supabase } from '@/lib/supabase'

export function EconomyAdmin() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('game_settings').select('*').eq('id', 1).single()
      if (error) throw error
      return data
    },
  })
  const [f, setF] = useState({ starting_coins: '', starting_gems: '', daily_reward_coins: '', daily_reward_gems: '', market_fee_pct: '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (q.data)
      setF({
        starting_coins: String(q.data.starting_coins),
        starting_gems: String(q.data.starting_gems),
        daily_reward_coins: String(q.data.daily_reward_coins),
        daily_reward_gems: String(q.data.daily_reward_gems),
        market_fee_pct: String(q.data.market_fee_pct),
      })
  }, [q.data])

  if (q.isLoading) return <PageLoader />
  if (q.error) return <ErrorState error={q.error} onRetry={q.refetch} />

  async function save() {
    setBusy(true)
    const { error } = await supabase
      .from('game_settings')
      .update({
        starting_coins: parseInt(f.starting_coins) || 0,
        starting_gems: parseInt(f.starting_gems) || 0,
        daily_reward_coins: parseInt(f.daily_reward_coins) || 0,
        daily_reward_gems: parseInt(f.daily_reward_gems) || 0,
        market_fee_pct: Math.min(50, Math.max(0, parseFloat(f.market_fee_pct) || 0)),
      })
      .eq('id', 1)
    setBusy(false)
    if (error) return toast.error(errorMessage(error))
    toast.success('Economy settings saved')
    qc.invalidateQueries({ queryKey: ['settings'] })
  }

  return (
    <div>
      <AdminHeader title="Economy" subtitle="Tune how many coins and gems flow into the game." action={<Button loading={busy} onClick={save}>Save settings</Button>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="New player bonus">
          <div className="space-y-4 p-5">
            <Field label="Starting coins">
              <div className="relative">
                <CoinIcon className="absolute left-3 top-1/2 -translate-y-1/2" />
                <Input type="number" min={0} value={f.starting_coins} onChange={(e) => setF({ ...f, starting_coins: e.target.value })} className="pl-9" />
              </div>
            </Field>
            <Field label="Starting gems">
              <div className="relative">
                <GemIcon className="absolute left-3 top-1/2 -translate-y-1/2" />
                <Input type="number" min={0} value={f.starting_gems} onChange={(e) => setF({ ...f, starting_gems: e.target.value })} className="pl-9" />
              </div>
            </Field>
          </div>
        </Panel>
        <Panel title="Daily reward">
          <div className="space-y-4 p-5">
            <Field label="Coins per claim">
              <Input type="number" min={0} value={f.daily_reward_coins} onChange={(e) => setF({ ...f, daily_reward_coins: e.target.value })} />
            </Field>
            <Field label="Gems per claim">
              <Input type="number" min={0} value={f.daily_reward_gems} onChange={(e) => setF({ ...f, daily_reward_gems: e.target.value })} />
            </Field>
            <p className="text-xs text-slate-500">Players can claim once every 20 hours.</p>
          </div>
        </Panel>
        <Panel title="Marketplace">
          <div className="space-y-4 p-5">
            <Field label="Sale fee (%)" hint="Taken from the seller's proceeds. Acts as a coin sink. Max 50%.">
              <Input type="number" min={0} max={50} step={0.5} value={f.market_fee_pct} onChange={(e) => setF({ ...f, market_fee_pct: e.target.value })} />
            </Field>
          </div>
        </Panel>
      </div>
    </div>
  )
}
