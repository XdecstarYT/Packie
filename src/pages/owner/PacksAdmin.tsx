import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Copy, Crown, Dice5, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { packAvailability, useCatalog } from '@/hooks/useCatalog'
import { AdminHeader, ConfirmDialog, Panel, StatusPill, useAdminMutations } from '@/components/owner/Admin'
import { PackArt } from '@/components/PackArt'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ColorInput, Field, ImageUpload, Input, Select, Textarea, Toggle } from '@/components/ui/Fields'
import { CoinIcon, EmptyState, ErrorState, GemIcon, PageLoader } from '@/components/ui/misc'
import { SLOT_PRESETS, formatPct, isAvailable, packAtLeastOneOdds, packCandidates, simulatePacks, slotRarityOdds, type SimulationResult } from '@/lib/odds'
import { errorMessage, supabase } from '@/lib/supabase'
import type { Pack, PackSlot } from '@/lib/types'
import { cn, formatNumber, fromLocalInput, toLocalInput } from '@/lib/utils'

export function PacksAdmin() {
  const { catalog, isLoading, error, refetch } = useCatalog()
  const [editing, setEditing] = useState<Pack | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Pack | null>(null)
  const m = useAdminMutations('packs')

  if (isLoading) return <PageLoader />
  if (error || !catalog) return <ErrorState error={error} onRetry={refetch} />

  return (
    <div>
      <AdminHeader
        title="Packs & pricing"
        subtitle="Design packs, set prices and odds, and control supply."
        action={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> New pack
          </Button>
        }
      />
      {catalog.packs.length === 0 ? (
        <EmptyState title="No packs yet" action={<Button onClick={() => setEditing('new')}>Create a pack</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {catalog.packs.map((p) => {
            const avail = packAvailability(p)
            return (
              <div key={p.id} className="glass flex gap-4 rounded-2xl p-4">
                <button className="w-24 shrink-0" onClick={() => setEditing(p)}>
                  <PackArt pack={p} />
                </button>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate font-semibold">{p.name}</h3>
                    {p.is_active ? avail.ok ? <StatusPill tone="green">On sale</StatusPill> : <StatusPill tone="amber">{avail.reason}</StatusPill> : <StatusPill tone="slate">Draft</StatusPill>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm font-semibold">
                    {p.price_coins != null && (
                      <span className="flex items-center gap-1">
                        <CoinIcon /> {formatNumber(p.price_coins)}
                      </span>
                    )}
                    {p.price_gems != null && (
                      <span className="flex items-center gap-1">
                        <GemIcon /> {formatNumber(p.price_gems)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {p.slots.length} cards · {formatNumber(p.sold_count)} opened
                    {p.total_supply != null && ` of ${formatNumber(p.total_supply)}`}
                  </p>
                  {p.is_limited_edition && (
                    <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-200">
                      <Crown className="h-3 w-3" /> Limited edition
                    </span>
                  )}
                  <div className="mt-auto flex gap-1 pt-3">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(p)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing({ ...p, id: '', name: `${p.name} (copy)`, sold_count: 0, is_active: false })}
                    >
                      <Copy className="h-3.5 w-3.5" /> Duplicate
                    </Button>
                    <Button size="sm" variant="ghost" className="ml-auto text-rose-300" onClick={() => setDeleting(p)} aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && <PackEditor pack={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        title={deleting && deleting.sold_count > 0 ? 'Retire this pack?' : 'Delete pack?'}
        confirmLabel={deleting && deleting.sold_count > 0 ? 'Take off sale' : 'Delete'}
        busy={m.busy}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          if (deleting.sold_count > 0) await m.update(deleting.id, { is_active: false }, 'Pack taken off sale')
          else await m.remove(deleting.id)
          setDeleting(null)
        }}
      >
        {deleting && deleting.sold_count > 0
          ? `"${deleting.name}" has been opened ${formatNumber(deleting.sold_count)} times. It will be taken off sale but kept for history.`
          : `Permanently delete "${deleting?.name}"?`}
      </ConfirmDialog>
    </div>
  )
}

interface PackForm {
  name: string
  description: string
  theme_color: string
  art_url: string | null
  season_id: string
  sell_coins: boolean
  price_coins: string
  sell_gems: boolean
  price_gems: string
  is_limited_edition: boolean
  total_supply: string
  per_user_limit: string
  available_from: string
  available_until: string
  is_active: boolean
  sort_order: string
  slots: PackSlot[]
  customPool: boolean
  pool: Map<string, number>
}

function PackEditor({ pack, onClose }: { pack: Pack | null; onClose: () => void }) {
  const { catalog, rarityById, setSeason } = useCatalog()
  const qc = useQueryClient()
  const isNew = !pack || !pack.id
  const existingPool = (catalog?.pool ?? []).filter((p) => pack?.id && p.pack_id === pack.id)
  const [f, setF] = useState<PackForm>(() => ({
    name: pack?.name ?? '',
    description: pack?.description ?? '',
    theme_color: pack?.theme_color ?? '#8b5cf6',
    art_url: pack?.art_url ?? null,
    season_id: pack?.season_id ?? catalog?.seasons.find((s) => s.status === 'active')?.id ?? '',
    sell_coins: pack ? pack.price_coins != null : true,
    price_coins: String(pack?.price_coins ?? 200),
    sell_gems: pack ? pack.price_gems != null : false,
    price_gems: String(pack?.price_gems ?? 2),
    is_limited_edition: pack?.is_limited_edition ?? false,
    total_supply: pack?.total_supply ? String(pack.total_supply) : '',
    per_user_limit: pack?.per_user_limit ? String(pack.per_user_limit) : '',
    available_from: toLocalInput(pack?.available_from),
    available_until: toLocalInput(pack?.available_until),
    is_active: pack?.is_active ?? false,
    sort_order: String(pack?.sort_order ?? (catalog?.packs.length ?? 0) + 1),
    slots: pack?.slots.length ? pack.slots : [0, 1, 2, 3].map((i) => ({ ...SLOT_PRESETS['Mostly common'], label: `Card ${i + 1}` })).concat({ ...SLOT_PRESETS['Guaranteed Rare+'] }),
    customPool: (catalog?.pool ?? []).some((p) => pack?.id && p.pack_id === pack.id),
    pool: new Map((catalog?.pool ?? []).filter((p) => pack?.id && p.pack_id === pack.id).map((p) => [p.card_id, p.weight])),
  }))
  const [busy, setBusy] = useState(false)
  const [sim, setSim] = useState<SimulationResult | null>(null)
  const [tab, setTab] = useState<'basics' | 'odds' | 'pool'>('basics')
  const set = <K extends keyof PackForm>(k: K, v: PackForm[K]) => setF((p) => ({ ...p, [k]: v }))
  const rarities = catalog?.rarities ?? []

  const draftPack = { id: pack?.id || 'draft', season_id: f.season_id || null }
  const candidates = useMemo(
    () =>
      packCandidates(
        draftPack,
        catalog?.cards ?? [],
        setSeason,
        f.customPool ? [...f.pool.entries()].map(([card_id, weight]) => ({ pack_id: draftPack.id, card_id, weight })) : [],
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog, setSeason, f.customPool, f.pool, f.season_id, pack?.id],
  )
  const availableSlugs = new Set(candidates.filter((c) => isAvailable(c.card)).map((c) => rarityById.get(c.card.rarity_id)?.slug).filter((s): s is string => !!s))
  const perPack = packAtLeastOneOdds(f.slots, availableSlugs)

  function updateSlot(i: number, patch: Partial<PackSlot>) {
    set('slots', f.slots.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  }

  async function save() {
    if (!f.name.trim()) return toast.error('Name your pack')
    if (!f.sell_coins && !f.sell_gems) return toast.error('Set a coin or gem price')
    if (f.slots.length === 0) return toast.error('Add at least one card slot')
    if (f.slots.some((s) => Object.values(s.weights).every((w) => !w))) return toast.error('Every slot needs at least one rarity weight')
    if (f.is_limited_edition && !(parseInt(f.total_supply) > 0)) return toast.error('Limited packs need a total supply')
    if (f.customPool && f.pool.size === 0) return toast.error('Pick at least one card for the custom pool')
    const row = {
      name: f.name.trim(),
      description: f.description.trim() || null,
      theme_color: f.theme_color,
      art_url: f.art_url,
      season_id: f.season_id || null,
      price_coins: f.sell_coins ? Math.max(0, parseInt(f.price_coins) || 0) : null,
      price_gems: f.sell_gems ? Math.max(0, parseInt(f.price_gems) || 0) : null,
      is_limited_edition: f.is_limited_edition,
      total_supply: f.is_limited_edition ? parseInt(f.total_supply) : f.total_supply ? parseInt(f.total_supply) || null : null,
      per_user_limit: parseInt(f.per_user_limit) || null,
      available_from: fromLocalInput(f.available_from),
      available_until: fromLocalInput(f.available_until),
      is_active: f.is_active,
      sort_order: parseInt(f.sort_order) || 0,
      slots: f.slots.map((s) => ({
        label: s.label || 'Card',
        weights: Object.fromEntries(Object.entries(s.weights).filter(([, w]) => w > 0)),
        foil_chance: Math.min(1, Math.max(0, s.foil_chance)),
      })),
    }
    setBusy(true)
    try {
      const res = isNew ? await supabase.from('packs').insert(row).select().single() : await supabase.from('packs').update(row).eq('id', pack!.id).select().single()
      if (res.error) throw res.error
      const id = res.data.id
      // Sync the card pool.
      const wanted = f.customPool ? f.pool : new Map<string, number>()
      const stale = existingPool.filter((p) => !wanted.has(p.card_id)).map((p) => p.card_id)
      if (stale.length) {
        const { error } = await supabase.from('pack_card_pool').delete().eq('pack_id', id).in('card_id', stale)
        if (error) throw error
      }
      if (wanted.size) {
        const { error } = await supabase
          .from('pack_card_pool')
          .upsert([...wanted.entries()].map(([card_id, weight]) => ({ pack_id: id, card_id, weight })))
        if (error) throw error
      }
      toast.success(isNew ? 'Pack created' : 'Pack saved')
      qc.invalidateQueries({ queryKey: ['catalog'] })
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const previewPack = { id: pack?.id || 'new', name: f.name || 'New pack', theme_color: f.theme_color, art_url: f.art_url, is_limited_edition: f.is_limited_edition, slots: f.slots }

  return (
    <Modal
      open
      onClose={onClose}
      variant="drawer"
      className="max-w-5xl"
      title={isNew ? 'New pack' : `Edit ${pack!.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} onClick={save}>
            {isNew ? 'Create pack' : 'Save pack'}
          </Button>
        </>
      }
    >
      <div className="sticky top-0 z-10 flex gap-1 border-b border-white/10 bg-ink-900/95 px-5 py-2 backdrop-blur">
        {(
          [
            ['basics', 'Basics & pricing'],
            ['odds', `Odds (${f.slots.length} slots)`],
            ['pool', 'Card pool'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={cn('rounded-lg px-3 py-1.5 text-sm font-semibold', tab === k ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white')}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'basics' && (
        <div className="grid gap-6 p-5 md:grid-cols-[1fr_200px]">
          <div className="space-y-4">
            <Field label="Name">
              <Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Shadow Week Pack" />
            </Field>
            <Field label="Description">
              <Textarea value={f.description} onChange={(e) => set('description', e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Season">
                <Select value={f.season_id} onChange={(e) => set('season_id', e.target.value)}>
                  <option value="">Any season (all cards)</option>
                  {catalog?.seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Theme color">
                <ColorInput value={f.theme_color} onChange={(v) => set('theme_color', v)} />
              </Field>
            </div>

            <Panel title="Pricing">
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Toggle checked={f.sell_coins} onChange={(v) => set('sell_coins', v)} label="Sell for coins" />
                  {f.sell_coins && (
                    <div className="relative">
                      <CoinIcon className="absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input type="number" min={0} value={f.price_coins} onChange={(e) => set('price_coins', e.target.value)} className="pl-9" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Toggle checked={f.sell_gems} onChange={(v) => set('sell_gems', v)} label="Sell for gems" />
                  {f.sell_gems && (
                    <div className="relative">
                      <GemIcon className="absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input type="number" min={0} value={f.price_gems} onChange={(e) => set('price_gems', e.target.value)} className="pl-9" />
                    </div>
                  )}
                </div>
              </div>
              <p className="px-4 pb-4 text-xs text-slate-500">Drops can override the coin price temporarily (see Drops).</p>
            </Panel>

            <Toggle
              checked={f.is_limited_edition}
              onChange={(v) => set('is_limited_edition', v)}
              label="Limited edition pack"
              description="Only a fixed number can ever be opened. Shows a supply bar in the shop."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={f.is_limited_edition ? 'Total supply' : 'Total supply (optional)'}>
                <Input type="number" min={1} value={f.total_supply} onChange={(e) => set('total_supply', e.target.value)} placeholder="Unlimited" />
              </Field>
              <Field label="Limit per player (optional)">
                <Input type="number" min={1} value={f.per_user_limit} onChange={(e) => set('per_user_limit', e.target.value)} placeholder="No limit" />
              </Field>
              <Field label="On sale from (optional)">
                <Input type="datetime-local" value={f.available_from} onChange={(e) => set('available_from', e.target.value)} />
              </Field>
              <Field label="On sale until (optional)">
                <Input type="datetime-local" value={f.available_until} onChange={(e) => set('available_until', e.target.value)} />
              </Field>
            </div>
            <Field label="Pack art (optional)" hint="Leave empty for the generated foil wrapper.">
              <ImageUpload value={f.art_url} onChange={(u) => set('art_url', u)} folder="packs" aspect="aspect-[5/4]" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <Toggle checked={f.is_active} onChange={(v) => set('is_active', v)} label="Published" description="Visible and purchasable in the shop." />
              <Field label="Shop order">
                <Input type="number" value={f.sort_order} onChange={(e) => set('sort_order', e.target.value)} />
              </Field>
            </div>
          </div>
          <div className="md:sticky md:top-16 md:self-start">
            <p className="label">Preview</p>
            <PackArt pack={previewPack} />
          </div>
        </div>
      )}

      {tab === 'odds' && (
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-400">Add slot:</span>
            {Object.entries(SLOT_PRESETS).map(([name, preset]) => (
              <Button key={name} size="sm" variant="secondary" onClick={() => set('slots', [...f.slots, { ...preset, weights: { ...preset.weights }, label: preset.label === 'Card' ? `Card ${f.slots.length + 1}` : preset.label }])}>
                <Plus className="h-3 w-3" /> {name}
              </Button>
            ))}
          </div>

          <div className="space-y-3">
            {f.slots.map((slot, i) => {
              const odds = slotRarityOdds(slot, availableSlugs)
              return (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-bold">{i + 1}</span>
                    <Input value={slot.label} onChange={(e) => updateSlot(i, { label: e.target.value })} className="w-48" />
                    <label className="flex items-center gap-2 text-xs text-slate-400">
                      Foil chance
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={Math.round(slot.foil_chance * 1000) / 10}
                        onChange={(e) => updateSlot(i, { foil_chance: (parseFloat(e.target.value) || 0) / 100 })}
                        className="w-20"
                      />
                      %
                    </label>
                    <div className="ml-auto flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => set('slots', [...f.slots.slice(0, i + 1), { ...slot, weights: { ...slot.weights } }, ...f.slots.slice(i + 1)])} aria-label="Duplicate slot">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-rose-300" onClick={() => set('slots', f.slots.filter((_, j) => j !== i))} aria-label="Remove slot">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {rarities.map((r) => (
                      <label key={r.id} className={cn('rounded-xl border px-3 py-2', availableSlugs.has(r.slug) ? 'border-white/10' : 'border-dashed border-white/10 opacity-50')}>
                        <span className="flex items-center justify-between text-xs font-semibold" style={{ color: r.color }}>
                          {r.name}
                          <span className="tabular-nums text-slate-400">{odds[r.slug] ? formatPct(odds[r.slug]) : '—'}</span>
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={slot.weights[r.slug] ?? 0}
                          onChange={(e) => updateSlot(i, { weights: { ...slot.weights, [r.slug]: Math.max(0, parseFloat(e.target.value) || 0) } })}
                          className="mt-1 w-full bg-transparent text-lg font-bold tabular-nums outline-none"
                          aria-label={`${r.name} weight`}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <Panel
            title="Odds per pack"
            action={
              <Button size="sm" onClick={() => setSim(simulatePacks(f.slots, candidates, rarities, 10_000))}>
                <Dice5 className="h-4 w-4" /> Simulate 10,000 packs
              </Button>
            }
          >
            <div className="overflow-x-auto p-4">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-2 text-left">Rarity</th>
                    <th className="py-2 text-right">Cards available</th>
                    <th className="py-2 text-right">≥1 per pack (math)</th>
                    {sim && <th className="py-2 text-right">≥1 per pack (sim)</th>}
                    {sim && <th className="py-2 text-right">Share of all cards (sim)</th>}
                  </tr>
                </thead>
                <tbody>
                  {rarities.map((r) => {
                    const count = candidates.filter((c) => c.card.rarity_id === r.id && isAvailable(c.card)).length
                    const totalSim = sim ? Object.values(sim.byRarity).reduce((a, b) => a + b, 0) : 0
                    return (
                      <tr key={r.id} className="border-t border-white/5">
                        <td className="py-2 font-semibold" style={{ color: r.color }}>
                          {r.name}
                        </td>
                        <td className="py-2 text-right tabular-nums text-slate-400">{count}</td>
                        <td className="py-2 text-right font-bold tabular-nums">{formatPct(perPack[r.slug] ?? 0)}</td>
                        {sim && <td className="py-2 text-right tabular-nums">{formatPct(sim.hitRate[r.slug] ?? 0)}</td>}
                        {sim && <td className="py-2 text-right tabular-nums text-slate-300">{formatPct((sim.byRarity[r.slug] ?? 0) / Math.max(1, totalSim))}</td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {sim && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <p className="rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-300">
                    Foils: <b className="text-white">{formatNumber(sim.foils)}</b> ({formatPct(sim.foils / (sim.packs * Math.max(1, f.slots.length)))} of cards)
                  </p>
                  <p className="rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-300">
                    Rarest pull: <b className="text-white">{(() => {
                      const ids = [...sim.byCard.entries()].sort((a, b) => a[1] - b[1])[0]
                      const c = ids ? catalog?.cards.find((x) => x.id === ids[0]) : undefined
                      return c ? `${c.name} (${ids![1]}×)` : '—'
                    })()}</b>
                  </p>
                </div>
              )}
              <p className="mt-3 text-xs text-slate-500">Rarity weights are renormalised over rarities that still have printable cards, exactly like the server.</p>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'pool' && (
        <div className="space-y-4 p-5">
          <Toggle
            checked={f.customPool}
            onChange={(v) => set('customPool', v)}
            label="Use a custom card pool"
            description={f.customPool ? 'Only the cards ticked below can drop. Weight makes a card more or less common within its rarity.' : 'Off: every active card in the selected season can drop.'}
          />
          {f.customPool && (
            <>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => set('pool', new Map((catalog?.cards ?? []).filter((c) => !f.season_id || (c.set_id && setSeason.get(c.set_id) === f.season_id)).map((c) => [c.id, f.pool.get(c.id) ?? 1])))}>
                  Select season cards
                </Button>
                <Button size="sm" variant="ghost" onClick={() => set('pool', new Map())}>
                  Clear
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {(catalog?.cards ?? []).map((c) => {
                  const on = f.pool.has(c.id)
                  const r = rarityById.get(c.rarity_id)
                  return (
                    <div key={c.id} className={cn('flex items-center gap-3 rounded-xl border px-3 py-2', on ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10')}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {
                          const next = new Map(f.pool)
                          if (on) next.delete(c.id)
                          else next.set(c.id, 1)
                          set('pool', next)
                        }}
                        className="h-4 w-4 accent-violet-500"
                        aria-label={`Include ${c.name}`}
                      />
                      <span className="flex-1 truncate text-sm font-semibold">{c.name}</span>
                      <span className="text-xs font-semibold" style={{ color: r?.color }}>
                        {r?.name}
                      </span>
                      {on && (
                        <input
                          type="number"
                          min={0.1}
                          step={0.1}
                          value={f.pool.get(c.id)}
                          onChange={(e) => set('pool', new Map(f.pool).set(c.id, Math.max(0.1, parseFloat(e.target.value) || 1)))}
                          className="w-16 rounded-lg bg-white/5 px-2 py-1 text-right text-sm"
                          aria-label="Weight"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
