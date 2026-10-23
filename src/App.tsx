import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Backdrop } from './components/Backdrop'
import { AppLayout } from './components/AppLayout'
import { RequireAuth, RequireOwner } from './components/Guards'
import { PageLoader } from './components/ui/misc'
import { useAuth } from './hooks/useAuth'
import { Landing } from './pages/Landing'
import { ForgotPassword, Login, Signup, UpdatePassword } from './pages/Auth'
import { HomePage } from './pages/Home'
import { ShopPage } from './pages/Shop'
import { CollectionPage } from './pages/Collection'
import { MarketPage } from './pages/Market'
import { TradesPage } from './pages/Trades'
import { LeaderboardPage } from './pages/Leaderboard'
import { ProfilePage } from './pages/Profile'
import { NotFound } from './pages/NotFound'

const OwnerApp = lazy(() => import('./pages/owner/OwnerApp'))

function AfterLogin() {
  const { session, loading, isOwner } = useAuth()
  if (loading) return <PageLoader />
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={isOwner ? '/owner' : '/home'} replace />
}

export function App() {
  return (
    <>
      <Backdrop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/welcome" element={<AfterLogin />} />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/home" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/trades" element={<TradesPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/u/:username" element={<ProfilePage />} />
        </Route>

        <Route
          path="/owner/*"
          element={
            <RequireOwner>
              <Suspense fallback={<PageLoader />}>
                <OwnerApp />
              </Suspense>
            </RequireOwner>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
