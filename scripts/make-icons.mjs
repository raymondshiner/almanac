// Renders the PWA icon set from the favicon monogram via headless Chromium.
// Usage: npm run make-icons   (regenerates public/pwa-*.png + apple-touch-icon)
import { chromium } from 'playwright'

const tile = (size) => `<!doctype html>
<html><head><style>
  * { margin: 0 }
  body { width: ${size}px; height: ${size}px; background: #1C1E26;
         display: grid; place-items: center }
  span { font: bold ${Math.round(size * 0.62)}px Georgia, 'Times New Roman', serif;
         color: #00E8C6; transform: translateY(-${Math.round(size * 0.03)}px) }
</style></head><body><span>A</span></body></html>`

const browser = await chromium.launch()
const page = await browser.newPage()
for (const [size, path] of [
  [512, 'public/pwa-512x512.png'],
  [192, 'public/pwa-192x192.png'],
  [180, 'public/apple-touch-icon.png'],
]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(tile(size))
  await page.screenshot({ path })
  console.log(`wrote ${path}`)
}
await browser.close()
