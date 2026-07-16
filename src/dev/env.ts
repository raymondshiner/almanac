// Dev-only mock switch (schoolhouse pattern). Runs the whole app with a fake
// signed-in user and an in-memory Supabase — no auth, no network, no secrets.
// NEVER active in a production build: every use-site is gated on the literal
// import.meta.env.DEV so the mock modules tree-shake out of `vite build`.
//
// Turn on with either:
//   • VITE_DEV_MOCK=1 npm run dev
//   • visit any URL with ?mock=1  (sticky via localStorage; ?mock=0 turns off)
import type { Session } from '@supabase/supabase-js'

function detectMock(): boolean {
  if (!import.meta.env.DEV) return false
  if (import.meta.env.VITE_DEV_MOCK === '1') return true
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (params.has('mock')) {
    const on = params.get('mock') !== '0'
    try {
      localStorage.setItem('dev-mock', on ? '1' : '0')
    } catch {
      /* private mode / storage disabled */
    }
    return on
  }
  try {
    return localStorage.getItem('dev-mock') === '1'
  } catch {
    return false
  }
}

export const DEV_MOCK = detectMock()

export const FAKE_UID = '00000000-0000-0000-0000-000000000001'

export const fakeSession = {
  access_token: 'mock-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mock-refresh-token',
  user: {
    id: FAKE_UID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'dev@almanac.test',
    app_metadata: { provider: 'mock' },
    user_metadata: { full_name: 'Dev Logger' },
    created_at: new Date().toISOString(),
  },
} as unknown as Session
