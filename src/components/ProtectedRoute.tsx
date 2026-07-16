import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-muted-foreground">
        <span className="animate-pulse text-sm">Loading…</span>
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
