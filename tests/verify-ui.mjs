// Headless UI verification — drives Playwright against the dev server in mock
// mode (?mock=1: fake session + in-memory data, zero network).
// Usage: node tests/verify-ui.mjs   (dev server must be running)
import { chromium, devices } from 'playwright'

const PORT = process.env.DEV_PORT ?? '5211'
const BASE = process.env.BASE_URL ?? `http://localhost:${PORT}/`
const SHOTS = '/tmp/almanac-shots'

const results = []
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function verify(label, ctx) {
  const page = await ctx.newPage()
  page.on('pageerror', (err) => record(`${label}/no-page-errors`, false, err.message))

  const step = async (name, fn) => {
    try {
      await fn()
      record(`${label}/${name}`, true)
    } catch (e) {
      record(`${label}/${name}`, false, String(e?.message ?? e).split('\n')[0])
    }
  }

  await page.goto(`${BASE}?mock=1`, { waitUntil: 'networkidle' })

  // 1) Diary renders with mock fixtures
  await step('diary heading', async () => {
    await page.getByRole('heading', { name: 'Diary' }).waitFor({ timeout: 5000 })
  })
  await step('mock badge visible', async () => {
    await page.getByText('Mock', { exact: true }).waitFor()
  })
  await step('diary shows 5 fixture entries', async () => {
    await page.getByRole('link', { name: 'Blade Runner 2049' }).waitFor()
    const n = await page.locator('main ul > li').count()
    if (n !== 5) throw new Error(`expected 5 rows, got ${n}`)
  })
  await page.screenshot({ path: `${SHOTS}/${label}-01-diary.png`, fullPage: true })

  // 2) Media-type filter
  await step('filter Books isolates book entries', async () => {
    await page.getByRole('tab', { name: 'Books' }).click()
    await page.getByRole('link', { name: 'Project Hail Mary' }).waitFor()
    const n = await page.locator('main ul > li').count()
    if (n !== 1) throw new Error(`expected 1 row, got ${n}`)
  })
  await step('filter back to All', async () => {
    await page.getByRole('tab', { name: 'All' }).click()
    const n = await page.locator('main ul > li').count()
    if (n !== 5) throw new Error(`expected 5 rows, got ${n}`)
  })

  // 3) Search + log a game
  await step('search finds Hades', async () => {
    await page.getByRole('link', { name: 'Log' }).click()
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Game' }).click()
    await page.getByRole('searchbox', { name: 'Search titles' }).fill('hades')
    await page.getByRole('button', { name: 'Log Hades', exact: true }).waitFor({ timeout: 5000 })
  })
  await page.screenshot({ path: `${SHOTS}/${label}-02-search.png`, fullPage: true })
  await step('log Hades at 4 stars', async () => {
    await page.getByRole('button', { name: 'Log Hades', exact: true }).click()
    await page.getByRole('dialog').waitFor()
    await page.getByRole('radio', { name: 'Rate 4 stars' }).click()
    await page.getByRole('button', { name: 'Log it' }).click()
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
  })
  await step('diary now has 6 entries', async () => {
    await page.getByRole('link', { name: 'Diary' }).click()
    await page.getByRole('heading', { name: 'Diary' }).waitFor()
    const n = await page.locator('main ul > li').count()
    if (n !== 6) throw new Error(`expected 6 rows, got ${n}`)
  })

  // 4) TV drills into seasons, logs per-season
  await step('log Severance Season 2', async () => {
    await page.getByRole('link', { name: 'Log' }).click()
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'TV' }).click()
    await page.getByRole('searchbox', { name: 'Search titles' }).fill('sever')
    await page.getByRole('button', { name: 'Seasons of Severance' }).click()
    await page.getByRole('button', { name: 'Log Severance Season 2' }).click()
    await page.getByRole('dialog').waitFor()
    await page.getByRole('radio', { name: 'Rate 4.5 stars' }).click()
    await page.getByRole('button', { name: 'Log it' }).click()
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    await page.getByRole('link', { name: 'Diary' }).click()
    await page.getByRole('link', { name: 'Severance — Season 2' }).waitFor()
  })

  // 5) Item detail: metadata + log history + parent link
  await step('season detail links to parent show', async () => {
    await page.getByRole('link', { name: 'Severance — Season 2' }).click()
    await page.getByRole('heading', { name: 'Severance — Season 2' }).waitFor()
    await page.getByText('Log history').waitFor()
    await page.getByRole('link', { name: 'Severance', exact: true }).waitFor()
  })
  await page.screenshot({ path: `${SHOTS}/${label}-03-item.png`, fullPage: true })

  // 6) Edit an entry
  await step('edit entry rating to 3.5', async () => {
    await page.getByRole('button', { name: 'Edit entry' }).first().click()
    await page.getByRole('dialog').waitFor()
    await page.getByRole('radio', { name: 'Rate 3.5 stars' }).click()
    await page.getByRole('button', { name: 'Save changes' }).click()
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    await page.getByText('Rated 3.5 out of 5').waitFor()
  })

  // 7) Delete an entry (two-step confirm)
  await step('delete entry empties history', async () => {
    await page.getByRole('button', { name: 'Delete entry' }).first().click()
    await page.getByRole('button', { name: 'Confirm delete' }).click()
    await page.getByText('No log entries.').waitFor()
  })

  await page.close()
}

const browser = await chromium.launch({ headless: true })
try {
  const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await verify('desktop', desktopCtx)
  await desktopCtx.close()

  const mobileCtx = await browser.newContext({ ...devices['iPhone 13'] })
  await verify('mobile', mobileCtx)
  await mobileCtx.close()
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length > 0) {
  console.log('FAILURES:')
  failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`))
}
process.exit(failed.length === 0 ? 0 : 1)
