import { Link, NavLink, Outlet } from 'react-router-dom'
import { LogOut, NotebookText, Plus } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { DEV_MOCK } from '@/dev/env'
import { cn } from '@/lib/utils'

function EnvBadges() {
  const host = typeof window !== 'undefined' ? window.location.hostname : ''
  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?)$/.test(host)
  const isMock = import.meta.env.DEV && DEV_MOCK
  if (!isLocal && !isMock) return null
  return (
    <span className="flex items-center gap-1">
      {isLocal && (
        <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-sky-500 uppercase">
          Local
        </span>
      )}
      {isMock && (
        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-500 uppercase">
          Mock
        </span>
      )}
    </span>
  )
}

const navCls = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
  )

export default function AppShell() {
  const { user, signOut } = useAuth()
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <NotebookText className="size-5" />
            Almanac
          </Link>
          <EnvBadges />
          <nav className="ml-auto flex items-center gap-1">
            <NavLink to="/" end className={navCls}>
              Diary
            </NavLink>
            <NavLink to="/log" className={navCls}>
              <span className="flex items-center gap-1">
                <Plus className="size-4" />
                Log
              </span>
            </NavLink>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              title={user?.email ?? undefined}
              onClick={signOut}
            >
              <LogOut />
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
