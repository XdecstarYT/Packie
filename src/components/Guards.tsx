import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PageLoader } from './ui/misc'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, profile } = useAuth()
  const loc = useLocation()
  if (loading) return <PageLoader />
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if (profile?.is_banned) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold">Account suspended</h1>
        <p className="mt-2 text-slate-400">This account has been suspended by the Packie team.</p>
      </div>
    )
  }
  return <>{children}</>
}

/** UI-only gate. Real protection lives in Postgres RLS + is_owner(). */
export function RequireOwner({ children }: { children: ReactNode }) {
  const { session, loading, isOwner } = useAuth()
  if (loading) return <PageLoader />
  if (!session) return <Navigate to="/login" replace />
  if (!isOwner) return <Navigate to="/home" replace />
  return <>{children}</>
}
