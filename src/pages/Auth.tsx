import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { supabase, errorMessage } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Fields'
import { Logo } from '@/components/ui/misc'
import { CardBack } from '@/components/PackieCard'

function AuthShell({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
        <div className="relative hidden h-[460px] lg:block">
          {[-18, -6, 6].map((r, i) => (
            <motion.div
              key={r}
              className="absolute left-1/2 top-1/2 w-56"
              initial={{ opacity: 0, rotate: 0, x: '-50%', y: '-50%' }}
              animate={{ opacity: 1, rotate: r, x: `${-50 + (i - 1) * 30}%`, y: '-50%' }}
              transition={{ delay: i * 0.12, type: 'spring', damping: 14 }}
            >
              <CardBack />
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mx-auto w-full max-w-md rounded-[2rem] p-7 sm:p-9"
        >
          <Link to="/">
            <Logo />
          </Link>
          <h1 className="mt-6 text-3xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </motion.div>
      </div>
    </div>
  )
}

export function Login() {
  const { session, isOwner, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const loc = useLocation()
  const from = (loc.state as { from?: string } | null)?.from

  if (!loading && session) return <Navigate to={from ?? (isOwner ? '/owner' : '/home')} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) return toast.error(error.message === 'Invalid login credentials' ? 'Wrong email or password' : error.message)
    toast.success('Welcome back!')
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle={
        <>
          New to Packie?{' '}
          <Link to="/signup" className="font-semibold text-violet-300 hover:text-violet-200">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs font-semibold text-slate-400 hover:text-white">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Log in
        </Button>
      </form>
    </AuthShell>
  )
}

const signupSchema = z.object({
  username: z.string().regex(/^[A-Za-z0-9_]{3,20}$/, 'Username: 3–20 letters, numbers or _'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export function Signup() {
  const { session, loading } = useAuth()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  if (!loading && session) return <Navigate to="/welcome" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = signupSchema.safeParse(form)
    if (!parsed.success) return toast.error(parsed.error.issues[0].message)
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { username: parsed.data.username },
        emailRedirectTo: `${window.location.origin}/welcome`,
      },
    })
    setBusy(false)
    if (error) return toast.error(errorMessage(error))
    if (!data.session) setSent(true)
    else toast.success('Welcome to Packie! 500 coins added.')
  }

  if (sent) {
    return (
      <AuthShell title="Check your inbox" subtitle="One last step before your first pack.">
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/5 p-6 text-center">
          <MailCheck className="h-10 w-10 text-emerald-300" />
          <p className="text-sm text-slate-300">
            We sent a confirmation link to <span className="font-semibold text-white">{form.email}</span>. Click it to activate
            your account and claim your starter coins.
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Start collecting"
      subtitle={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-violet-300 hover:text-violet-200">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Username" hint="This is how other collectors will see you.">
          <Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="CardShark" maxLength={20} />
        </Field>
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="new-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Create account & get 500 coins
        </Button>
        <p className="text-center text-xs text-slate-500">Coins and gems are virtual items with no real-world value.</p>
      </form>
    </AuthShell>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/update-password`,
    })
    setBusy(false)
    if (error) return toast.error(error.message)
    setSent(true)
  }

  return (
    <AuthShell title="Reset password" subtitle={<Link to="/login" className="font-semibold text-violet-300">Back to log in</Link>}>
      {sent ? (
        <p className="rounded-2xl bg-white/5 p-5 text-sm text-slate-300">If an account exists for {email}, a reset link is on its way.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  )
}

export function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY' || s) setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return toast.error('Password must be at least 8 characters')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success('Password updated')
    nav('/welcome')
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Make it a strong one.">
      {!ready ? (
        <p className="text-sm text-slate-400">Open this page from the link in your reset email.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="New password">
            <Input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Update password
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
