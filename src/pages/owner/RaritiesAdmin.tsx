import { useState } from 'react'
import { Gem, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCatalog } from '@/hooks/useCatalog'
import { AdminHeader, ConfirmDialog, Panel, Table, useAdminMutations } from '@/components/owner/Admin'
import { PackieCard } from '@/components/PackieCard'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ColorInput, Field, Input, Select } from '@/components/ui/Fields'
import { ErrorState, PageLoader } from '@/components/ui/misc'
import type { Rarity } from '@/lib/types'
import { slugify } from '@/lib/utils'

export function RaritiesAdmin() {
  const { catalog, isLoading, error, refetch } = useCatalog()
  const [editing, setEditing] = useState<Rarity | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Rarity | null>(null)
  const m = useAdminMutations('rarities')
  if (isLoading) return <PageLoader />
  if (error || !catalog) return <ErrorState error={error} onRetry={refetch} />

  return (
    <div>
      <AdminHeader
        title="Rarities"
        subtitle="Tiers, colors and glow effects. Order controls how special a rarity looks."
        action={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> New rarity
          </Button>
        }
      />
      <Panel>
        <Table head={['Order', 'Rarity', 'Slug', 'Glow', 'Score points', 'Cards', '']}>
          {catalog.rarities.map((r) => (
            <tr key={r.id} className="hover:bg-white/[0.02]">
              <td className="px-4 py-3 tabular-nums text-slate-400">{r.sort_order}</td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-2 font-semibold" style={{ color: r.color }}>
                  <Gem className="h-4 w-4" /> {r.name}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs">{r.slug}</td>
              <td className="px-4 py-3 capitalize text-slate-300">{r.glow}</td>
              <td className="px-4 py-3 tabular-nums">{r.points}</td>
              <td className="px-4 py-3 tabular-nums">{catalog.cards.filter((c) => c.rarity_id === r.id).length}</td>
              <td className="px-4 py-3 text-right">
                <Button size="sm" variant="ghost" onClick={() => setEditing(r)} aria-label="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="text-rose-300" onClick={() => setDeleting(r)} aria-label="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      </Panel>
      {editing && <RarityEditor rarity={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        title="Delete rarity?"
        busy={m.busy}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await m.remove(deleting.id)
          setDeleting(null)
        }}
      >
        Delete <b>{deleting?.name}</b>? This only works if no cards use it. Pack slots referencing “{deleting?.slug}” will ignore it.
      </ConfirmDialog>
    </div>
  )
}

function RarityEditor({ rarity, onClose }: { rarity: Rarity | null; onClose: () => void }) {
  const { catalog } = useCatalog()
  const m = useAdminMutations('rarities')
  const [f, setF] = useState({
    name: rarity?.name ?? '',
    slug: rarity?.slug ?? '',
    color: rarity?.color ?? '#94a3b8',
    glow: rarity?.glow ?? 'soft',
    points: String(rarity?.points ?? 1),
    sort_order: String(rarity?.sort_order ?? (catalog?.rarities.length ?? 0) + 1),
  })
  const sample = catalog?.cards[0]
  async function save() {
    if (!f.name.trim()) return toast.error('Name the rarity')
    const row = { name: f.name.trim(), slug: f.slug || slugify(f.name), color: f.color, glow: f.glow, points: parseInt(f.points) || 0, sort_order: parseInt(f.sort_order) || 0 }
    const ok = rarity ? await m.update(rarity.id, row) : await m.insert(row, 'Rarity created')
    if (ok) onClose()
  }
  const previewRarity = { ...(rarity ?? ({} as Rarity)), ...f, points: parseInt(f.points) || 0, sort_order: parseInt(f.sort_order) || 0, id: 'preview' } as Rarity
  return (
    <Modal
      open
      onClose={onClose}
      title={rarity ? 'Edit rarity' : 'New rarity'}
      className="sm:max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={m.busy} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-6 p-5 sm:grid-cols-[1fr_180px]">
        <div className="space-y-4">
          <Field label="Name">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: rarity ? f.slug : slugify(e.target.value) })} />
          </Field>
          <Field label="Slug" hint={rarity ? 'Changing the slug breaks pack slots that use it.' : 'Used in pack odds and CSV imports.'}>
            <Input value={f.slug} onChange={(e) => setF({ ...f, slug: slugify(e.target.value) })} />
          </Field>
          <Field label="Color">
            <ColorInput value={f.color} onChange={(v) => setF({ ...f, color: v })} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Glow">
              <Select value={f.glow} onChange={(e) => setF({ ...f, glow: e.target.value })}>
                <option value="none">None</option>
                <option value="soft">Soft</option>
                <option value="strong">Strong</option>
                <option value="prismatic">Prismatic</option>
              </Select>
            </Field>
            <Field label="Points">
              <Input type="number" min={0} value={f.points} onChange={(e) => setF({ ...f, points: e.target.value })} />
            </Field>
            <Field label="Order">
              <Input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value })} />
            </Field>
          </div>
        </div>
        {sample && (
          <div>
            <p className="label">Preview</p>
            <PackieCard card={sample} rarity={previewRarity} compact />
          </div>
        )}
      </div>
    </Modal>
  )
}
