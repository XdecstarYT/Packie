import { useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { errorMessage, uploadAsset } from '@/lib/supabase'

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn('input', props.className)} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={cn('input resize-y', props.className)} />
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn('input appearance-none bg-ink-900 pr-8', props.className)}>
      {children}
    </select>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  description?: ReactNode
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full items-center justify-between gap-4 rounded-xl border px-3.5 py-3 text-left transition',
        checked ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
      )}
    >
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {description && <span className="block text-xs text-slate-400">{description}</span>}
      </span>
      <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-brand' : 'bg-white/15')}>
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  )
}

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" maxLength={7} />
    </div>
  )
}

export function ImageUpload({
  value,
  onChange,
  folder,
  aspect = 'aspect-video',
}: {
  value: string | null
  onChange: (url: string | null) => void
  folder: string
  aspect?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handle(file: File | undefined) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return toast.error('Images must be under 5 MB')
    setBusy(true)
    try {
      onChange(await uploadAsset(file, folder))
      toast.success('Image uploaded')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={cn(
        'group relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/[0.03] transition hover:border-violet-400/50',
        aspect,
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        handle(e.dataTransfer.files[0])
      }}
    >
      {value ? (
        <>
          <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex flex-col items-center gap-2 p-4 text-sm text-slate-400"
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
          <span>{busy ? 'Uploading…' : 'Drop an image or click to upload'}</span>
          <span className="text-xs text-slate-500">PNG, JPG, WEBP or GIF · max 5 MB</span>
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
    </div>
  )
}
