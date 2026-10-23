import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { dropStatus, useCatalog } from '@/hooks/useCatalog'
import { AdminHeader, ConfirmDialog, Panel, StatusPill, useAdminMutations } from '@/components/owner/Admin'
import { Countdown } from '@/components/Countdown'
import { PackieCard } from '@/components/PackieCard'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ColorInput, Field, ImageUpload, Input, Select, Textarea, Toggle } from '@/components/ui/Fields'
import { CoinIcon, EmptyState, ErrorState, PageLoader } from '@/components/ui/misc'
import { errorMessage, supabase } from '@/lib/supabase'
import type { Drop } from '@/lib/types'
import { formatDate, formatNumber, fromLocalInput, hexToRgba, toLocalInput } from '@/lib/utils'

export function DropsAdmin() {
  const { catalog, isLoading, error, refetch, packById, cardById, rarityById } = useCatalog()
  const [editing, setEditing] = useState<Drop | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Drop | null>(null)
  const m = useAdminMutations('drops')
  if (isLoading) return <PageLoader />
  if (error || !catalog) return <ErrorState error={error} onRetry={refetch} />
  const sorted = [...catalog.drops].sort((a, b) => b.starts_at.localeCompare(a.starts_at))

  return (
    <div>
      <AdminHeader
        title="Drops"
        subtitle="Timed events with countdowns, featured chase cards and special pack prices."
        action={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> Schedule drop
          </Button>
        }
      />
      {sorted.length === 0 ? (
        <EmptyState title="No drops scheduled" action={<Button onClick={() => setEditing('new')}>Schedule a drop</Button>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sorted.map((d) => {
            const st = dropStatus(d)
            const items = catalog.dropItems.filter((i) => i.drop_id === d.id)
            return (
              <div
                key={d.id}
                className="rounded-2xl border border-white/10 p-5"
                style={{ background: `radial-gradient(400px 200px at 0% 0%, ${hexToRgba(d.theme_color, 0.25)}, transparent 70%), rgba(16,12,43,.6)` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex gap-1.5">
                      {!d.is_published ? (
                        <StatusPill tone="slate">Draft</StatusPill>
                      ) : st === 'live' ? (
                        <StatusPill tone="rose">Live</StatusPill>
                      ) : st === 'upcoming' ? (
                        <StatusPill tone="sky">Scheduled</StatusPill>
                      ) : (
                        <StatusPill tone="slate">Ended</StatusPill>
                      )}
                    </div>
                    <h3 className="mt-2 text-xl font-semibold">{d.name}</h3>
                    <p className="text-xs text-slate-400">
                      {formatDate(d.starts_at, true)} → {d.ends_at ? formatDate(d.ends_at, true) : 'open-ended'}
                    </p>
                  </div>
                  <div className="flex">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(d)} aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-rose-300" onClick={() => setDeleting(d)} aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {st !== 'ended' && (
                  <p className="mt-2 text-sm text-slate-300">
                    {st === 'live' ? 'Ends in ' : 'Starts in '}
                    <Countdown to={st === 'live' ? d.ends_at ?? d.starts_at : d.starts_at} compact className="font-bold text-white" />
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  {items
                    .filter((i) => i.pack_id)
                    .map((i) => (
                      <span key={i.id} className="chip">
                        {packById.get(i.pack_id!)?.name ?? 'Pack'}
                        {i.special_price_coins != null && (
                          <span className="flex items-center gap-1 text-amber-200">
                            · <CoinIcon className="h-3 w-3" />
                            {formatNumber(i.special_price_coins)}
                          </span>
                        )}
                      </span>
                    ))}
                  <div className="ml-auto flex -space-x-4">
                    {items
                      .filter((i) => i.card_id)
                      .slice(0, 4)
                      .map((i) => {
                        const c = cardById.get(i.card_id!)
                        return c ? (
                          <div key={i.id} className="w-12">
                            <PackieCard card={c} rarity={rarityById.get(c.rarity_id)} compact interactive={false} />
                          </div>
                        ) : null
                      })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {editing && <DropEditor drop={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        title="Delete drop?"
        busy={m.busy}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await m.remove(deleting.id)
          setDeleting(null)
        }}
      >
        Delete <b>{deleting?.name}</b>? Packs and cards are not affected.
      </ConfirmDialog>
    </div>
  )
}

function DropEditor({ drop, onClose }: { drop: Drop | null; onClose: () => void }) {
  const { catalog, cardById } = useCatalog()
  const qc = useQueryClient()
  const existing = (catalog?.dropItems ?? []).filter((i) => drop && i.drop_id === drop.id)
  const [f, setF] = useState({
    name: drop?.name ?? '',
    description: drop?.description ?? '',
    theme_color: drop?.theme_color ?? '#f59e0b',
    banner_url: drop?.banner_url ?? null,
    season_id: drop?.season_id ?? catalog?.seasons.find((s) => s.status === 'active')?.id ?? '',
    starts_at: toLocalInput(drop?.starts_at ?? new Date(Date.now() + 86_400_000).toISOString()),
    ends_at: toLocalInput(drop?.ends_at ?? new Date(Date.now() + 8 * 86_400_000).toISOString()),
    is_published: drop?.is_published ?? false,
  })
  const [packs, setPacks] = useState<{ pack_id: string; special: string }[]>(
    existing.filter((i) => i.pack_id).map((i) => ({ pack_id: i.pack_id!, special: i.special_price_coins != null ? String(i.special_price_coins) : '' })),
  )
  const [cards, setCards] = useState<string[]>(existing.filter((i) => i.card_id).map((i) => i.card_id!))
  const [addCard, setAddCard] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!f.name.trim()) return toast.error('Name the drop')
    if (!f.starts_at) return toast.error('Pick a start time')
    if (f.ends_at && new Date(f.ends_at) <= new Date(f.starts_at)) return toast.error('End must be after start')
    setBusy(true)
    try {
      const row = {
        name: f.name.trim(),
        description: f.description || null,
        theme_color: f.theme_color,
        banner_url: f.banner_url,
        season_id: f.season_id || null,
        starts_at: fromLocalInput(f.starts_at)!,
        ends_at: fromLocalInput(f.ends_at),
        is_published: f.is_published,
      }
      const res = drop ? await supabase.from('drops').update(row).eq('id', drop.id).select().single() : await supabase.from('drops').insert(row).select().single()
      if (res.error) throw res.error
      const id = res.data.id
      if (existing.length) {
        const { error } = await supabase.from('drop_items').delete().eq('drop_id', id)
        if (error) throw error
      }
      const items = [
        ...packs.filter((p) => p.pack_id).map((p) => ({ drop_id: id, pack_id: p.pack_id, special_price_coins: p.special ? parseInt(p.special) : null })),
        ...cards.map((card_id) => ({ drop_id: id, card_id })),
      ]
      if (items.length) {
        const { error } = await supabase.from('drop_items').insert(items)
        if (error) throw error
      }
      toast.success(drop ? 'Drop saved' : 'Drop scheduled')
      qc.invalidateQueries({ queryKey: ['catalog'] })
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      variant="drawer"
      title={drop ? 'Edit drop' : 'Schedule a drop'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} onClick={save}>
            Save drop
          </Button>
        </>
      }
    >
      <div className="space-y-4 p-5">
        <Field label="Name">
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Shadow Week" />
        </Field>
        <Field label="Description">
          <Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts">
            <Input type="datetime-local" value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} />
          </Field>
          <Field label="Ends (optional)">
            <Input type="datetime-local" value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} />
          </Field>
          <Field label="Season">
            <Select value={f.season_id} onChange={(e) => setF({ ...f, season_id: e.target.value })}>
              <option value="">None</option>
              {catalog?.seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Theme color">
            <ColorInput value={f.theme_color} onChange={(v) => setF({ ...f, theme_color: v })} />
          </Field>
        </div>

        <Panel title="Packs in this drop" action={<Button size="sm" variant="secondary" onClick={() => setPacks([...packs, { pack_id: catalog?.packs[0]?.id ?? '', special: '' }])}><Plus className="h-3 w-3" /> Add pack</Button>}>
          <div className="space-y-2 p-4">
            {packs.length === 0 && <p className="text-sm text-slate-500">Attach packs to promote them — optionally at a special coin price while the drop is live.</p>}
            {packs.map((p, i) => (
              <div key={i} className="flex gap-2">
                <Select value={p.pack_id} onChange={(e) => setPacks(packs.map((x, j) => (j === i ? { ...x, pack_id: e.target.value } : x)))}>
                  {catalog?.packs.map((pk) => (
                    <option key={pk.id} value={pk.id}>
                      {pk.name} ({pk.price_coins ?? '—'} coins)
                    </option>
                  ))}
                </Select>
                <div className="relative w-40 shrink-0">
                  <CoinIcon className="absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input type="number" min={0} placeholder="Special price" value={p.special} onChange={(e) => setPacks(packs.map((x, j) => (j === i ? { ...x, special: e.target.value } : x)))} className="pl-9" />
                </div>
                <Button variant="ghost" onClick={() => setPacks(packs.filter((_, j) => j !== i))} aria-label="Remove">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Featured chase cards">
          <div className="p-4">
            <div className="flex gap-2">
              <Select value={addCard} onChange={(e) => setAddCard(e.target.value)}>
                <option value="">Choose a card…</option>
                {catalog?.cards
                  .filter((c) => !cards.includes(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
              <Button variant="secondary" disabled={!addCard} onClick={() => { setCards([...cards, addCard]); setAddCard('') }}>
                Add
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {cards.map((id) => (
                <span key={id} className="chip">
                  {cardById.get(id)?.name}
                  <button onClick={() => setCards(cards.filter((c) => c !== id))} aria-label="Remove">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </Panel>

        <Field label="Banner (optional)">
          <ImageUpload value={f.banner_url} onChange={(u) => setF({ ...f, banner_url: u })} folder="drops" />
        </Field>
        <Toggle checked={f.is_published} onChange={(v) => setF({ ...f, is_published: v })} label="Published" description="Players see the countdown as soon as it's published." />
      </div>
    </Modal>
  )
}
