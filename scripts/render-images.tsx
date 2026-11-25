/* Renders the share image (public/og.png) and the app shortcut icons
   (public/shortcuts/*.png) with the installed Chromium:
   `pnpm images`. Drawn from code, so they follow the logo and palette. */
import { readFileSync, mkdirSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ClipboardList, ListChecks, Sprout, UserPlus } from 'lucide-react'
import { createRequire } from 'node:module'

// Playwright is installed with the browser, not as a project dependency.
const require = createRequire(import.meta.url)
type Page = {
  setContent: (html: string) => Promise<void>
  setViewportSize: (size: { width: number; height: number }) => Promise<void>
  screenshot: (options: { path: string }) => Promise<unknown>
  waitForTimeout: (ms: number) => Promise<void>
}
// eslint-disable-next-line import/no-commonjs -- resolved from the global install
const { chromium } = require('playwright') as {
  chromium: {
    launch: () => Promise<{
      newPage: (options: {
        viewport: { width: number; height: number }
      }) => Promise<Page>
      close: () => Promise<void>
    }>
  }
}

const GOLD = '#d6b25e'
const BG = '#0a0a0a'
const logo = `data:image/png;base64,${readFileSync('public/logo.png').toString('base64')}`

const og = `<!doctype html><html><head><style>
  @font-face { font-family: Inter; src: url('${pathToInter()}'); font-weight: 100 900; }
  * { margin: 0; box-sizing: border-box }
  body { width: 1200px; height: 630px; background: ${BG}; color: #f1ede4; font-family: Inter, system-ui, sans-serif; display: flex; flex-direction: column; justify-content: space-between; padding: 72px 80px; }
  .mark { display: flex; align-items: center; gap: 22px }
  .mark img { width: 96px; height: 96px }
  .eyebrow { font: 700 20px ui-monospace, Menlo, monospace; letter-spacing: .2em; color: #a39d90; text-transform: uppercase }
  h1 { font-size: 104px; font-weight: 700; letter-spacing: -.03em; line-height: 1 }
  p { margin-top: 26px; font-size: 36px; line-height: 1.3; color: #b9b3a6; max-width: 900px }
  .rule { display: flex; gap: 10px }
  .rule span { height: 8px; flex: 1; background: #26241f }
  .rule span.on { background: ${GOLD} }
</style></head><body>
  <div class="mark"><img src="${logo}" alt=""><span class="eyebrow">Grace City Church · Morong, Rizal</span></div>
  <div><h1>GCC Admin</h1><p>Cell reports, disciples, soul winning and Sunday attendance, on your phone.</p></div>
  <div class="rule"><span class="on"></span><span class="on"></span><span class="on"></span><span></span><span></span><span></span></div>
</body></html>`

function pathToInter() {
  try {
    const p =
      require.resolve('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')
    return `data:font/woff2;base64,${readFileSync(p).toString('base64')}`
  } catch {
    return ''
  }
}

const SHORTCUTS: Array<[string, LucideIcon]> = [
  ['report', ClipboardList],
  ['attendance', ListChecks],
  ['disciple', UserPlus],
  ['soul-winning', Sprout],
]

function iconPage(Icon: LucideIcon) {
  const svg = renderToStaticMarkup(
    createElement(Icon, { size: 52, color: GOLD, strokeWidth: 2 }),
  )
  return `<!doctype html><html><body style="margin:0;width:96px;height:96px;background:${BG};display:grid;place-items:center">${svg}</body></html>`
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.setContent(og)
await page.waitForTimeout(200)
await page.screenshot({ path: 'public/og.png' })
mkdirSync('public/shortcuts', { recursive: true })
await page.setViewportSize({ width: 96, height: 96 })
for (const [name, Icon] of SHORTCUTS) {
  await page.setContent(iconPage(Icon))
  await page.screenshot({ path: `public/shortcuts/${name}.png` })
}
await browser.close()
console.log('Wrote public/og.png and public/shortcuts/*.png')
