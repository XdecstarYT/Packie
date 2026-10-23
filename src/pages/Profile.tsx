import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useCatalog } from '@/hooks/useCatalog'
import { useInstances } from '@/hooks/useCollection'
import { Avatar } from '@/components/AppLayout'
import { PackieCard } from '@/components/PackieCard'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Fields'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, PageLoader } from '@/components/ui/misc'
import { errorMessage, supabase } from '@/lib/supabase'
import { formatDate, formatNumber, levelFromXp } from '@/lib/utils'

export function ProfilePage() {
  const { username } = useParams()
  const { profile: me, refreshProfile } = useAuth()
  const { cardById, rarityById, setById } = useCatalog()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)

  const q = useQuery({
    queryKey: ['public-profile', username],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, username, avatar_url, bio, xp, created_at, role').ilike('username', username!).maybeSingle()
      if (error) throw error
      return data
    },
  })
  const instances = useInstances(q.data?.id)

  if (q.isLoading) return <PageLoader />
  if (!q.data) return <EmptyState title="Collector not found">No player goes by “{username}”.</EmptyState>
  const p = q.data
  const isMe = me?.id === p.id
  const lvl = levelFromXp(p.xp)
  const list = instances.data ?? []
  const showcase = [...list]
    .map((i) => ({ i, c: cardById.get(i.card_id) }))
    .filter((x): x is { i: (typeof list)[number]; c: NonNullable<ReturnType<typeof cardById.get>> } => !!x.c)
    .sort((a, b) => (rarityById.get(b.c.rarity_id)?.sort_order ?? 0) - (rarityById.get(a.c.rarity_id)?.sort_order ?? 0) || Number(b.i.foil) - Number(a.i.foil))
    .slice(0, 6)
  const score = list.reduce((s, i) => {
    const c = cardById.get(i.card_id)
    return s + (c ? (rarityById.get(c.rarity_id)?.points ?? 0) * (i.foil ? 2 : 1) : 0)
  }, 0)

  return (
    <div>
      <div className="glass relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-[80px]" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar name={p.username} url={p.avatar_url} className="h-24 w-24 text-4xl ring-4 ring-violet-500/40" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold">{p.username}</h1>
              {p.role === 'owner' && <span className="chip border-amber-300/40 bg-amber-400/10 text-amber-200">Packie Team</span>}
            </div>
            <p className="mt-1 text-slate-300">{p.bio || 'Collector since ' + formatDate(p.created_at)}</p>
            <div className="mt-4 flex flex-wrap gap-6 text-sm">
              <div>
                <p className="font-display text-2xl font-bold">{lvl.level}</p>
                <p className="text-slate-400">Level</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold">{formatNumber(list.length)}</p>
                <p className="text-slate-400">Cards</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold">{formatNumber(new Set(list.map((i) => i.card_id)).size)}</p>
                <p className="text-slate-400">Unique</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-gradient">{formatNumber(score)}</p>
                <p className="text-slate-400">Score</p>
              </div>
            </div>
          </div>
          {isMe && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Edit profile
            </Button>
          )}
        </div>
      </div>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">Showcase</h2>
      {showcase.length === 0 ? (
        <EmptyState title="Nothing to show yet">This collector hasn't pulled any cards.</EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {showcase.map(({ i, c }) => (
            <PackieCard key={i.id} card={c} rarity={rarityById.get(c.rarity_id)} set={c.set_id ? setById.get(c.set_id) : undefined} serial={i.serial_number} foil={i.foil} compact />
          ))}
        </div>
      )}

      {editing && me && (
        <EditProfile
          initial={{ username: me.username, bio: me.bio ?? '', avatar_url: me.avatar_url }}
          onClose={() => setEditing(false)}
          onSaved={(u) => {
            refreshProfile()
            qc.invalidateQueries({ queryKey: ['public-profile'] })
            setEditing(false)
            if (u !== username) window.history.replaceState(null, '', `/u/${u}`)
          }}
          userId={me.id}
        />
      )}
    </div>
  )
}

function EditProfile({
  initial,
  onClose,
  onSaved,
  userId,
}: {
  initial: { username: string; bio: string; avatar_url: string | null }
  onClose: () => void
  onSaved: (username: string) => void
  userId: string
}) {
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!/^[A-Za-z0-9_]{3,20}$/.test(form.username)) return toast.error('Username: 3–20 letters, numbers or _')
    setBusy(true)
    const { error } = await supabase.from('profiles').update({ username: form.username, bio: form.bio || null, avatar_url: form.avatar_url }).eq('id', userId)
    setBusy(false)
    if (error) return toast.error(error.code === '23505' ? 'That username is taken' : errorMessage(error))
    toast.success('Profile saved')
    onSaved(form.username)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit profile"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4 p-5">
        <Field label="Avatar URL" hint="Paste a link to an image (optional).">
          <Input value={form.avatar_url ?? ''} onChange={(e) => setForm({ ...form, avatar_url: e.target.value || null })} placeholder="https://…" />
        </Field>
        <Field label="Username">
          <Input value={form.username} maxLength={20} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        </Field>
        <Field label="Bio">
          <Textarea maxLength={160} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Chasing every Mythic…" />
        </Field>
      </div>
    </Modal>
  )
}

