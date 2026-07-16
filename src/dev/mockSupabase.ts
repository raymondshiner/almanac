// In-memory stand-in for supabase-js, used only in mock mode (see env.ts).
// Supports exactly the surface the app uses: from().select/insert/update/upsert/
// delete with eq/in/order/single/maybeSingle, the media_items(*) embed on
// log_entries, and composite-key upserts, plus stubbed auth + functions.
// No network, no RLS — it just returns everything in a table (RLS is the
// server's job in real mode).
import { fakeSession } from './env'
import { makeInitialDb, type MockDb } from './fixtures'

type Row = Record<string, unknown>
type Filter =
  | { kind: 'eq'; col: string; val: unknown }
  | { kind: 'in'; col: string; val: unknown[] }
type Order = { col: string; ascending: boolean }
type Result = { data: unknown; error: { message: string } | null }

// Lazy singleton so this module has no import-time side effects (keeps it
// tree-shakeable out of production builds).
let _db: MockDb | null = null
const db = (): MockDb => (_db ??= makeInitialDb())

const clone = <T,>(v: T): T => structuredClone(v)
const uuid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `mock-${Math.random().toString(36).slice(2)}`
const nowISO = () => new Date().toISOString()

function matches(r: Row, filters: Filter[]): boolean {
  return filters.every((f) => {
    switch (f.kind) {
      case 'eq':
        return r[f.col] === f.val
      case 'in':
        return f.val.includes(r[f.col])
    }
  })
}

function sortRows(rows: Row[], orders: Order[]): Row[] {
  if (orders.length === 0) return rows
  return [...rows].sort((a, b) => {
    for (const o of orders) {
      const av = a[o.col] as never
      const bv = b[o.col] as never
      if (av < bv) return o.ascending ? -1 : 1
      if (av > bv) return o.ascending ? 1 : -1
    }
    return 0
  })
}

/** Attach the media_items embed (the only embedded resource the app selects). */
function applyItemEmbed(rows: Row[], select: string | null): Row[] {
  if (!select || !select.includes('media_items')) return rows
  const items = db()['media_items'] ?? []
  return rows.map((e) => ({
    ...e,
    media_items: clone(items.find((i) => i.id === e.item_id) ?? null),
  }))
}

class MockQuery implements PromiseLike<Result> {
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
  private payload: Row | Row[] | null = null
  private filters: Filter[] = []
  private orders: Order[] = []
  private selectStr: string | null = null
  private returnRows = false
  private singleRow = false
  private maybeRow = false
  private conflict: string[] | null = null
  private table: string

  constructor(table: string) {
    this.table = table
  }

  select(cols = '*') {
    if (this.op === 'select') this.selectStr = cols
    else this.returnRows = true
    return this
  }
  insert(v: Row | Row[]) {
    this.op = 'insert'
    this.payload = v
    return this
  }
  update(v: Row) {
    this.op = 'update'
    this.payload = v
    return this
  }
  upsert(v: Row | Row[], opts?: { onConflict?: string }) {
    this.op = 'upsert'
    this.payload = v
    this.conflict = opts?.onConflict?.split(',').map((s) => s.trim()) ?? null
    return this
  }
  delete() {
    this.op = 'delete'
    return this
  }
  eq(col: string, val: unknown) {
    this.filters.push({ kind: 'eq', col, val })
    return this
  }
  in(col: string, val: unknown[]) {
    this.filters.push({ kind: 'in', col, val })
    return this
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, ascending: opts?.ascending ?? true })
    return this
  }
  single() {
    this.singleRow = true
    return this
  }
  maybeSingle() {
    this.maybeRow = true
    return this
  }

  then<R1 = Result, R2 = never>(
    onFulfilled?: ((v: Result) => R1 | PromiseLike<R1>) | null,
    onRejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return Promise.resolve(this.run()).then(onFulfilled, onRejected)
  }

  private shape(rows: Row[]): Result {
    if (this.singleRow) {
      if (rows.length === 0)
        return { data: null, error: { message: 'No rows found' } }
      return { data: clone(rows[0]), error: null }
    }
    if (this.maybeRow)
      return { data: rows[0] ? clone(rows[0]) : null, error: null }
    return { data: clone(rows), error: null }
  }

  private run(): Result {
    try {
      const table = (db()[this.table] ??= [])
      switch (this.op) {
        case 'insert':
          return this.doInsert(table)
        case 'upsert':
          return this.doUpsert(table)
        case 'update':
          return this.doUpdate(table)
        case 'delete':
          return this.doDelete(table)
        default:
          return this.doSelect(table)
      }
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } }
    }
  }

  private doSelect(table: Row[]): Result {
    let rows = table.filter((r) => matches(r, this.filters))
    rows = sortRows(rows, this.orders)
    rows = applyItemEmbed(rows, this.selectStr)
    return this.shape(rows)
  }

  private materialize(input: Row): Row {
    return { id: uuid(), created_at: nowISO(), parent_id: null, ...input }
  }

  private doInsert(table: Row[]): Result {
    const items = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map(
      (r) => this.materialize(r),
    )
    table.push(...items.map(clone))
    return this.returnRows ? this.shape(items) : { data: null, error: null }
  }

  private doUpsert(table: Row[]): Result {
    const items = Array.isArray(this.payload) ? this.payload : [this.payload!]
    const out: Row[] = []
    for (const it of items) {
      const existing = this.conflict
        ? table.find((r) => this.conflict!.every((k) => r[k] === it[k]))
        : undefined
      if (existing) {
        Object.assign(existing, it)
        out.push(existing)
      } else {
        const created = this.materialize(it)
        table.push(created)
        out.push(created)
      }
    }
    return this.returnRows ? this.shape(out) : { data: null, error: null }
  }

  private doUpdate(table: Row[]): Result {
    const hit = table.filter((r) => matches(r, this.filters))
    for (const r of hit) Object.assign(r, this.payload)
    return this.returnRows ? this.shape(hit) : { data: null, error: null }
  }

  private doDelete(table: Row[]): Result {
    const hit = table.filter((r) => matches(r, this.filters))
    const removed = clone(hit)
    const gone = new Set(hit)
    db()[this.table] = table.filter((r) => !gone.has(r))
    return this.returnRows ? this.shape(removed) : { data: null, error: null }
  }
}

const auth = {
  async getSession() {
    return { data: { session: fakeSession }, error: null }
  },
  onAuthStateChange() {
    return { data: { subscription: { unsubscribe() {} } } }
  },
  async signInWithOAuth() {
    return { data: { provider: 'mock', url: null }, error: null }
  },
  async signOut() {
    return { error: null }
  },
}

const functions = {
  // Real search goes through lib/metadata.ts, which routes to mockMetadata in
  // mock mode before ever touching this stub.
  async invoke() {
    return { data: null, error: { message: 'functions disabled in mock mode' } }
  },
}

export const mockClient = {
  from: (table: string) => new MockQuery(table),
  auth,
  functions,
}
