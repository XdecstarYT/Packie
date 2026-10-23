import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCatalog } from '@/hooks/useCatalog'
import { AdminHeader, ConfirmDialog, Panel, StatusPill, Table, useAdminMutations } from '@/components/owner/Admin'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ColorInput, Field, ImageUpload, Input, Select, Textarea } from '@/components/ui/Fields'
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/misc'
import type { Season } from '@/lib/types'
import { formatDate, fromLocalInput, slugify, toLocalInput } from '@/lib/utils'

const TONE = { active: 'green', draft: 'slate', ended: 'rose' } as const

export function SeasonsAdmin() {
  const { catalog, isLoading, error, refetch } = useCatalog()
  const [editing, setEditing] = useState<Season | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Season | null>(null)
  const m = useAdminMutations('seasons')
  if (isLoading) return <PageLoader />
  if (error || !catalog) return <ErrorState error={error} onRetry={refetch} />

  return (
    <div>
      <AdminHeader
        title="Seasons"
        subtitle="Seasons group sets, packs and drops into a themed release window."
        action={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> New season
          </Button>
        }
      />
      {catalog.seasons.length === 0 ? (
        <EmptyState title="No seasons" action={<Button onClick={() => setEditing('new')}>Create a season</Button>} />
      ) : (
        <Panel>
          <Table head={['Season', 'Status', 'Starts', 'Ends', 'Sets', 'Packs', '']}>
            {catalog.seasons.map((s) => (
              <tr key={s.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2.5 font-semibold">
                    <span className="h-3 w-3 rounded-full" style={{ background: s.theme_color }} />
                    {s.name}
                  </span>
                  <span className="text-xs text-slate-500">{s.slug}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={TONE[s.status as keyof typeof TONE] ?? 'slate'}>{s.status}</StatusPill>
                </td>
                <td className="px-4 py-3 text-slate-300">{formatDate(s.starts_at)}</td>
                <td className="px-4 py-3 text-slate-300">{formatDate(s.ends_at)}</td>
                <td className="px-4 py-3 tabular-nums">{catalog.sets.filter((x) => x.season_id === s.id).length}</td>
                <td className="px-4 py-3 tabular-nums">{catalog.packs.filter((x) => x.season_id === s.id).length}</td>
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
      {editing && <SeasonEditor season={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        title="Delete season?"
        busy={m.busy}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await m.remove(deleting.id)
          setDeleting(null)
        }}
      >
        Delete <b>{deleting?.name}</b>? Its sets, packs and drops are kept but will no longer belong to a season.
      </ConfirmDialog>
    </div>
  )
}

function SeasonEditor({ season, onClose }: { season: Season | null; onClose: () => void }) {
  const m = useAdminMutations('seasons')
  const [f, setF] = useState({
    name: season?.name ?? '',
    slug: season?.slug ?? '',
    description: season?.description ?? '',
    theme_color: season?.theme_color ?? '#8b5cf6',
    banner_url: season?.banner_url ?? null,
    starts_at: toLocalInput(season?.starts_at),
    ends_at: toLocalInput(season?.ends_at),
    status: season?.status ?? 'draft',
  })
  async function save() {
    if (!f.name.trim()) return toast.error('Name the season')
    const row = {
      ...f,
      name: f.name.trim(),
      slug: f.slug || slugify(f.name),
      description: f.description || null,
      starts_at: fromLocalInput(f.starts_at),
      ends_at: fromLocalInput(f.ends_at),
    }
    const ok = season ? await m.update(season.id, row) : await m.insert(row, 'Season created')
    if (ok) onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={season ? 'Edit season' : 'New season'}
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
        <Field label="Name">
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: season ? f.slug : slugify(e.target.value) })} placeholder="Season 2: Tides" />
        </Field>
        <Field label="Slug">
          <Input value={f.slug} onChange={(e) => setF({ ...f, slug: slugify(e.target.value) })} />
        </Field>
        <Field label="Description">
          <Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              <option value="draft">Draft (hidden)</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
            </Select>
          </Field>
          <Field label="Theme color">
            <ColorInput value={f.theme_color} onChange={(v) => setF({ ...f, theme_color: v })} />
          </Field>
          <Field label="Starts">
            <Input type="datetime-local" value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} />
          </Field>
          <Field label="Ends">
            <Input type="datetime-local" value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} />
          </Field>
        </div>
        <Field label="Banner (optional)">
          <ImageUpload value={f.banner_url} onChange={(u) => setF({ ...f, banner_url: u })} folder="seasons" />
        </Field>
      </div>
    </Modal>
  )
}
