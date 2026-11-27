/* Renders the user guides (public/guides/*.pdf) from the HTML beside this
   file with the installed Chromium: `pnpm guides`. The screenshots in img/
   are phone screens of the seeded church (`pnpm seed`), taken at 390px
   wide; retake them when a screen they show changes. */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { GUIDES } from '../../src/config/guides'

// Playwright is installed with the browser, not as a project dependency.
const require = createRequire(import.meta.url)
type Page = {
  goto: (url: string, options: { waitUntil: 'networkidle' }) => Promise<unknown>
  pdf: (options: Record<string, unknown>) => Promise<unknown>
}
// eslint-disable-next-line import/no-commonjs -- resolved from the global install
const { chromium } = require('playwright') as {
  chromium: {
    launch: () => Promise<{
      newPage: () => Promise<Page>
      close: () => Promise<void>
    }>
  }
}

const footer = (title: string) =>
  `<div style="font-family:Arial;font-size:7.5pt;color:#8a847a;width:100%;padding:0 16mm;display:flex;justify-content:space-between"><span>${title} · Grace City Church</span><span class="pageNumber"></span></div>`

const browser = await chromium.launch()
const page = await browser.newPage()
for (const guide of GUIDES) {
  const source = new URL(`./${guide.source}`, import.meta.url)
  await page.goto(source.href, { waitUntil: 'networkidle' })
  const out = fileURLToPath(
    new URL(`../../public${guide.href}`, import.meta.url),
  )
  await page.pdf({
    path: out,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: footer(guide.title),
    margin: { top: '16mm', bottom: '18mm', left: '16mm', right: '16mm' },
  })
  console.log(`${guide.href}`)
}
await browser.close()
