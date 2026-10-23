import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Crown, FileUp, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useCatalog } from '@/hooks/useCatalog'
import { AdminHeader, ConfirmDialog, StatusPill, useAdminMutations } from '@/components/owner/Admin'
import { PackieCard } from '@/components/PackieCard'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, ImageUpload, Input, Select, Textarea, Toggle } from '@/components/ui/Fields'
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/misc'
import { ELEMENT_THEME } from '@/lib/elements'
import { errorMessage, supabase } from '@/lib/supabase'
import { ELEMENTS, type Ability, type Card, type Element } from '@/lib/types'
import { cn, formatNumber } from '@/lib/utils'

interface CardForm {
  name: string
  set_id: string
  number_in_set: string
  rarity_id: string
  element: Element
  hp: string
  attack: string
  defense: string
  abilities: Ability[]
  flavor_text: string
  art_url: string | null
  is_limited_edition: boolean
  max_print_run: string
  is_active: boolean
}

function toForm(c: Card | null, defaults: { set_id: string; rarity_id: string; number: number }): CardForm {
  return {
    name: c?.name ?? '',
    set_id: c?.set_id ?? defaults.set_id,
    number_in_set: String(c?.number_in_set ?? defaults.number),
    rarity_id: c?.rarity_id ?? defaults.rarity_id,
    element: c?.element ?? 'fire',
    hp: String(c?.hp ?? 60),
    attack: String(c?.attack ?? 15),
    defense: String(c?.defense ?? 10),
    abilities: c?.abilities?.length ? c.abilities : [{ name: '', damage: 20, text: '' }],
    flavor_text: c?.flavor_text ?? '',
    art_url: c?.art_url ?? null,
    is_limited_edition: c?.is_limited_edition ?? false,
    max_print_run: c?.max_print_run ? String(c.max_print_run) : '',
    is_active: c?.is_active ?? true,
  }
}

export function CardsAdmin() {
  const { catalog, isLoading, error, refetch, rarityById, setById } = useCatalog()
  const [editing, setEditing] = useState<Card | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Card | null>(null)
  const [importing, setImporting] = useState(false)
  const [q, setQ] = useState('')
  const [setFilter, setSetFilter] = useState('all')
  const [rarityFilter, setRarityFilter] = useState('all')
  const m = useAdminMutations('cards')

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (catalog?.cards ?? [])
      .filter((c) => setFilter === 'all' || c.set_id === setFilter)
      .filter((c) => rarityFilter === 'all' || c.rarity_id === rarityFilter)
      .filter((c) => !term || c.name.toLowerCase().includes(term))
  }, [catalog, q, setFilter, rarityFilter])

  if (isLoading) return <PageLoader />
  if (error || !catalog) return <ErrorState error={error} onRetry={refetch} />

  return (
    <div>
      <AdminHeader
        title="Cards"
        subtitle={`${catalog.cards.length} cards across ${catalog.sets.length} sets`}
        action={
          <>
            <Button variant="secondary" onClick={() => setImporting(true)}>
              <FileUp className="h-4 w-4" /> Import CSV
            </Button>
            <Button onClick={() => setEditing('new')} disabled={!catalog.rarities.length}>
              <Plus className="h-4 w-4" /> New card
            </Button>
          </>
        }
      />

      <div className="glass mb-5 flex flex-col gap-2 rounded-2xl p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cards…" className="pl-9" />
        </div>
        <Select value={setFilter} onChange={(e) => setSetFilter(e.target.value)} className="sm:w-48" aria-label="Set">
          <option value="all">All sets</option>
          {catalog.sets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} className="sm:w-44" aria-label="Rarity">
          <option value="all">All rarities</option>
          {catalog.rarities.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No cards" action={<Button onClick={() => setEditing('new')}>Create a card</Button>}>
          Cards you create appear here.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {rows.map((c) => (
            <div key={c.id} className="group relative">
              <div className={cn(!c.is_active && 'opacity-40')}>
                <PackieCard card={c} rarity={rarityById.get(c.rarity_id)} set={c.set_id ? setById.get(c.set_id) : undefined} compact onClick={() => setEditing(c)} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-1 text-xs">
                <span className="text-slate-400">
                  {formatNumber(c.printed_count)}
                  {c.max_print_run ? ` / ${formatNumber(c.max_print_run)}` : ''} printed
                </span>
                <span className="flex gap-1">
                  {!c.is_active && <StatusPill tone="slate">Hidden</StatusPill>}
                  {c.is_limited_edition && (
                    <StatusPill tone="amber">
                      <Crown className="h-3 w-3" />
                    </StatusPill>
                  )}
                </span>
              </div>
              <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button onClick={() => setEditing(c)} className="rounded-lg bg-black/70 p-1.5 hover:bg-black" aria-label="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setDeleting(c)} className="rounded-lg bg-black/70 p-1.5 text-rose-300 hover:bg-black" aria-label="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <CardEditor card={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {importing && <CsvImport onClose={() => setImporting(false)} />}
      <ConfirmDialog
        open={!!deleting}
        title={deleting && deleting.printed_count > 0 ? 'Hide this card?' : 'Delete card?'}
        confirmLabel={deleting && deleting.printed_count > 0 ? 'Hide card' : 'Delete'}
        busy={m.busy}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          if (deleting.printed_count > 0) await m.update(deleting.id, { is_active: false }, 'Card hidden from new packs')
          else await m.remove(deleting.id)
          setDeleting(null)
        }}
      >
        {deleting && deleting.printed_count > 0 ? (
          <>
            <b>{deleting.name}</b> is already owned by players ({formatNumber(deleting.printed_count)} printed), so it can't be deleted. Hiding it removes it
            from the catalog and stops it dropping from packs. Players keep their copies.
          </>
        ) : (
          <>
            Permanently delete <b>{deleting?.name}</b>? This can't be undone.
          </>
        )}
      </ConfirmDialog>
    </div>
  )
}

function CardEditor({ card, onClose }: { card: Card | null; onClose: () => void }) {
  const { catalog, rarityById, setById } = useCatalog()
  const m = useAdminMutations('cards')
  const firstSet = catalog?.sets[0]?.id ?? ''
  const nextNumber = (catalog?.cards.filter((c) => c.set_id === firstSet).length ?? 0) + 1
  const [f, setF] = useState<CardForm>(() => toForm(card, { set_id: firstSet, rarity_id: catalog?.rarities[0]?.id ?? '', number: nextNumber }))
  const set = <K extends keyof CardForm>(k: K, v: CardForm[K]) => setF((p) => ({ ...p, [k]: v }))

  const preview: Card = {
    ...(card ?? ({} as Card)),
    id: card?.id ?? 'preview-' + f.name,
    name: f.name || 'New card',
    set_id: f.set_id || null,
    number_in_set: parseInt(f.number_in_set) || null,
    rarity_id: f.rarity_id,
    element: f.element,
    hp: parseInt(f.hp) || 0,
    attack: parseInt(f.attack) || 0,
    defense: parseInt(f.defense) || 0,
    abilities: f.abilities.filter((a) => a.name),
    flavor_text: f.flavor_text || null,
    art_url: f.art_url,
    is_limited_edition: f.is_limited_edition,
    max_print_run: f.is_limited_edition ? parseInt(f.max_print_run) || null : null,
    printed_count: card?.printed_count ?? 0,
    is_active: f.is_active,
  }

  async function save() {
    if (!f.name.trim()) return toast.error('Give the card a name')
    if (!f.rarity_id) return toast.error('Pick a rarity')
    const run = parseInt(f.max_print_run)
    if (f.is_limited_edition && (!run || run < 1)) return toast.error('Limited editions need a print run')
    if (card && f.is_limited_edition && run < card.printed_count) return toast.error(`Print run can't be below the ${card.printed_count} already printed`)
    const row = {
      name: f.name.trim(),
      set_id: f.set_id || null,
      number_in_set: parseInt(f.number_in_set) || null,
      rarity_id: f.rarity_id,
      element: f.element,
      hp: parseInt(f.hp) || 0,
      attack: parseInt(f.attack) || 0,
      defense: parseInt(f.defense) || 0,
      abilities: f.abilities
        .filter((a) => a.name.trim())
        .map((a) => ({ name: a.name.trim(), damage: a.damage == null || Number.isNaN(a.damage) ? null : a.damage, text: a.text?.trim() || null })),
      flavor_text: f.flavor_text.trim() || null,
      art_url: f.art_url,
      is_limited_edition: f.is_limited_edition,
      max_print_run: f.is_limited_edition ? run : null,
      is_active: f.is_active,
    }
    const ok = card ? await m.update(card.id, row, 'Card saved') : await m.insert(row, 'Card created')
    if (ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      variant="drawer"
      className="max-w-4xl"
      title={card ? `Edit ${card.name}` : 'New card'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={m.busy} onClick={save}>
            {card ? 'Save changes' : 'Create card'}
          </Button>
        </>
      }
    >
      <div className="grid gap-6 p-5 md:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
            <Field label="Name">
              <Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Emberkit" maxLength={40} />
            </Field>
            <Field label="Number">
              <Input type="number" min={1} value={f.number_in_set} onChange={(e) => set('number_in_set', e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Set">
              <Select value={f.set_id} onChange={(e) => set('set_id', e.target.value)}>
                <option value="">No set</option>
                {catalog?.sets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Rarity">
              <Select value={f.rarity_id} onChange={(e) => set('rarity_id', e.target.value)}>
                {catalog?.rarities.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Element">
              <Select value={f.element} onChange={(e) => set('element', e.target.value as Element)}>
                {ELEMENTS.map((el) => (
                  <option key={el} value={el}>
                    {ELEMENT_THEME[el].emoji} {ELEMENT_THEME[el].label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="HP">
              <Input type="number" min={0} value={f.hp} onChange={(e) => set('hp', e.target.value)} />
            </Field>
            <Field label="Attack">
              <Input type="number" min={0} value={f.attack} onChange={(e) => set('attack', e.target.value)} />
            </Field>
            <Field label="Defense">
              <Input type="number" min={0} value={f.defense} onChange={(e) => set('defense', e.target.value)} />
            </Field>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="label mb-0">Abilities</span>
              {f.abilities.length < 2 && (
                <button className="text-xs font-semibold text-violet-300" onClick={() => set('abilities', [...f.abilities, { name: '', damage: 20, text: '' }])}>
                  + Add ability
                </button>
              )}
            </div>
            <div className="space-y-2">
              {f.abilities.map((a, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex gap-2">
                    <Input
                      value={a.name}
                      placeholder="Ability name"
                      onChange={(e) => set('abilities', f.abilities.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    />
                    <Input
                      type="number"
                      className="w-24"
                      value={a.damage ?? ''}
                      placeholder="Dmg"
                      onChange={(e) => set('abilities', f.abilities.map((x, j) => (j === i ? { ...x, damage: e.target.value === '' ? null : parseInt(e.target.value) } : x)))}
                    />
                    {f.abilities.length > 1 && (
                      <button onClick={() => set('abilities', f.abilities.filter((_, j) => j !== i))} className="px-1 text-slate-500 hover:text-rose-300" aria-label="Remove ability">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Input
                    className="mt-2"
                    value={a.text ?? ''}
                    placeholder="What does it do?"
                    onChange={(e) => set('abilities', f.abilities.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                  />
                </div>
              ))}
            </div>
          </div>

          <Field label="Flavor text">
            <Textarea value={f.flavor_text} onChange={(e) => set('flavor_text', e.target.value)} maxLength={140} placeholder="A short line of lore…" />
          </Field>

          <Field label="Artwork" hint="Leave empty to use Packie's procedural creature art.">
            <div className="max-w-xs"><ImageUpload value={f.art_url} onChange={(u) => set('art_url', u)} folder="cards" aspect="aspect-[10/7]" /></div>
          </Field>

          <Toggle
            checked={f.is_limited_edition}
            onChange={(v) => set('is_limited_edition', v)}
            label="Limited edition"
            description="Numbered copies with a fixed print run. Each pulled copy gets a serial number."
          />
          {f.is_limited_edition && (
            <Field label="Max print run" hint={card ? `${card.printed_count} already printed` : undefined}>
              <Input type="number" min={1} value={f.max_print_run} onChange={(e) => set('max_print_run', e.target.value)} placeholder="e.g. 100" />
            </Field>
          )}
          <Toggle checked={f.is_active} onChange={(v) => set('is_active', v)} label="Active" description="Inactive cards are hidden and never drop from packs." />
        </div>

        <div className="md:sticky md:top-0 md:self-start">
          <p className="label">Live preview</p>
          <PackieCard card={preview} rarity={rarityById.get(f.rarity_id)} set={f.set_id ? setById.get(f.set_id) : undefined} serial={f.is_limited_edition ? 1 : null} />
        </div>
      </div>
    </Modal>
  )
}

/** Minimal CSV parser with quoted-field support. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      if (row.some((c) => c.trim())) rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim())) rows.push(row)
  return rows
}

const CSV_EXAMPLE = `name,rarity,element,hp,attack,defense,ability,damage,ability_text,flavor,number,limited,print_run
Glimmerbug,common,light,40,12,8,Glow Flick,15,Dazzles the target.,It lights up dark forests.,31,false,
Voltaroo,rare,air,90,30,20,Static Hop,50,Chains to a second target.,Never stops bouncing.,32,true,250`

function CsvImport({ onClose }: { onClose: () => void }) {
  const { catalog } = useCatalog()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [setId, setSetId] = useState(catalog?.sets[0]?.id ?? '')
  const [busy, setBusy] = useState(false)

  const parsed = useMemo(() => {
    const rows = parseCsv(text.trim())
    if (rows.length < 2) return { cards: [], errors: [] as string[] }
    const head = rows[0].map((h) => h.trim().toLowerCase())
    const idx = (k: string) => head.indexOf(k)
    const errors: string[] = []
    const bySlug = new Map((catalog?.rarities ?? []).map((r) => [r.slug, r.id]))
    const cards = rows.slice(1).flatMap((r, i) => {
      const get = (k: string) => (idx(k) >= 0 ? (r[idx(k)] ?? '').trim() : '')
      const name = get('name')
      const rarity = bySlug.get(get('rarity').toLowerCase())
      const element = (get('element').toLowerCase() || 'fire') as Element
      if (!name) {
        errors.push(`Row ${i + 2}: missing name`)
        return []
      }
      if (!rarity) {
        errors.push(`Row ${i + 2}: unknown rarity "${get('rarity')}"`)
        return []
      }
      if (!ELEMENTS.includes(element)) {
        errors.push(`Row ${i + 2}: unknown element "${element}"`)
        return []
      }
      const limited = ['true', 'yes', '1'].includes(get('limited').toLowerCase())
      const run = parseInt(get('print_run')) || null
      if (limited && !run) {
        errors.push(`Row ${i + 2}: limited cards need a print_run`)
        return []
      }
      return [
        {
          name,
          rarity_id: rarity,
          element,
          set_id: setId || null,
          hp: parseInt(get('hp')) || 50,
          attack: parseInt(get('attack')) || 10,
          defense: parseInt(get('defense')) || 10,
          abilities: get('ability') ? [{ name: get('ability'), damage: parseInt(get('damage')) || null, text: get('ability_text') || null }] : [],
          flavor_text: get('flavor') || null,
          number_in_set: parseInt(get('number')) || null,
          is_limited_edition: limited,
          max_print_run: limited ? run : null,
        },
      ]
    })
    return { cards, errors }
  }, [text, catalog, setId])

  async function run() {
    if (!parsed.cards.length) return
    setBusy(true)
    const { error } = await supabase.from('cards').insert(parsed.cards)
    setBusy(false)
    if (error) return toast.error(errorMessage(error))
    toast.success(`Imported ${parsed.cards.length} cards`)
    qc.invalidateQueries({ queryKey: ['catalog'] })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Import cards from CSV"
      className="sm:max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} disabled={!parsed.cards.length || parsed.errors.length > 0} onClick={run}>
            Import {parsed.cards.length || ''} cards
          </Button>
        </>
      }
    >
      <div className="space-y-4 p-5">
        <Field label="Add to set">
          <Select value={setId} onChange={(e) => setSetId(e.target.value)}>
            <option value="">No set</option>
            {catalog?.sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="CSV" hint="Rarity uses the rarity slug (common, rare…). Elements: fire, water, earth, air, shadow, light.">
          <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={CSV_EXAMPLE} className="font-mono text-xs" />
        </Field>
        <button className="text-xs font-semibold text-violet-300" onClick={() => setText(CSV_EXAMPLE)}>
          Use example
        </button>
        <label className="ml-4 cursor-pointer text-xs font-semibold text-violet-300">
          Upload .csv file
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => setText((await e.target.files?.[0]?.text()) ?? '')} />
        </label>
        {parsed.errors.length > 0 && (
          <ul className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
            {parsed.errors.map((er) => (
              <li key={er}>{er}</li>
            ))}
          </ul>
        )}
        {parsed.cards.length > 0 && parsed.errors.length === 0 && <p className="text-sm text-emerald-300">{parsed.cards.length} cards ready to import.</p>}
      </div>
    </Modal>
  )
}
