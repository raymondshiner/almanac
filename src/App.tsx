import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/auth/AuthProvider'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import AppShell from '@/components/AppShell'

const Login = lazy(() => import('@/routes/Login'))
const Diary = lazy(() => import('@/routes/Diary'))
const LogSearch = lazy(() => import('@/routes/LogSearch'))
const ItemDetail = lazy(() => import('@/routes/ItemDetail'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Suspense
              fallback={
                <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
                  Loading…
                </div>
              }
            >
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppShell />}>
                    <Route path="/" element={<Diary />} />
                    <Route path="/log" element={<LogSearch />} />
                    <Route path="/item/:id" element={<ItemDetail />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
      <Toaster />
    </ThemeProvider>
  )
}
