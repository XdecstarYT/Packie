import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-display text-8xl font-bold text-gradient">404</p>
      <h1 className="text-2xl font-semibold">This card isn't in any pack</h1>
      <p className="text-slate-400">The page you're looking for doesn't exist.</p>
      <Link to="/">
        <Button>Back to Packie</Button>
      </Link>
    </div>
  )
}
