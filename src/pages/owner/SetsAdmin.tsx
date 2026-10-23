import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCatalog } from '@/hooks/useCatalog'
import { AdminHeader, ConfirmDialog, Panel, Table, useAdminMutations } from '@/components/owner/Admin'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Fields'
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/misc'
import type { CardSet } from '@/lib/types'

export function SetsAdmin() {
  const { catalog, isLoading, error, refetch } = useCatalog()
  const [editing, setEditing] = useState<CardSet | 'new' | null>(null)
  const [deleting, setDeleting] = useState<CardSet | null>(null)
  const m = useAdminMutations('sets')
  if (isLoading) return <PageLoader />
  if (error || !catalog) return <ErrorState error={error} onRetry={refetch} />

  return (
    <div>
      <AdminHeader
        title="Sets"
        subtitle="Sets are numbered collections players complete."
        action={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> New set
          </Button>
        }
      />
      {catalog.sets.length === 0 ? (
        <EmptyState title="No sets" action={<Button onClick={() => setEditing('new')}>Create a set</Button>} />
      ) : (
        <Panel>
          <Table head={['Set', 'Code', 'Season', 'Cards', '']}>
            {catalog.sets.map((s) => (
              <tr key={s.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.description}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                <td className="px-4 py-3 text-slate-300">{catalog.seasons.find((x) => x.id === s.season_id)?.name ?? '—'}</td>
                <td className="px-4 py-3 tabular-nums">{catalog.cards.filter((c) => c.set_id === s.id).length}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(s)} aria-label="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-rose-300" onClick={() => setDeleting(s)} aria-label="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        </Panel>
      )}
      {editing && <SetEditor set={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        title="Delete set?"
        busy={m.busy}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await m.remove(deleting.id)
          setDeleting(null)
        }}
      >
        Delete <b>{deleting?.name}</b>? Its cards are kept but will no longer belong to a set.
      </ConfirmDialog>
    </div>
  )
}

function SetEditor({ set, onClose }: { set: CardSet | null; onClose: () => void }) {
  const { catalog } = useCatalog()
  const m = useAdminMutations('sets')
  const [f, setF] = useState({
    name: set?.name ?? '',
    code: set?.code ?? '',
    description: set?.description ?? '',
    season_id: set?.season_id ?? catalog?.seasons[0]?.id ?? '',
  })
  async function save() {
    if (!f.name.trim() || !f.code.trim()) return toast.error('Name and code are required')
    const row = { name: f.name.trim(), code: f.code.trim().toUpperCase(), description: f.description || null, season_id: f.season_id || null }
    const ok = set ? await m.update(set.id, row) : await m.insert(row, 'Set created')
    if (ok) onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={set ? 'Edit set' : 'New set'}
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
      <div className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <Field label="Name">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Tides Base Set" />
          </Field>
          <Field label="Code">
            <Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="S2-BASE" className="font-mono uppercase" />
          </Field>
        </div>
        <Field label="Season">
          <Select value={f.season_id} onChange={(e) => setF({ ...f, season_id: e.target.value })}>
            <option value="">No season</option>
            {catalog?.seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description">
          <Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
      </div>
    </Modal>
  )
}
