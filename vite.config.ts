import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'

// Scheduled emails (src/server/email/reminders.server.ts), in UTC:
// Manila is UTC+8, so 09:00 UTC Saturday is 5 PM Saturday in Manila.
const crons = [
  { path: '/api/cron/weekly-nudge', schedule: '0 9 * * 6' }, // Sat 5 PM
  { path: '/api/cron/weekly-summary', schedule: '0 23 * * 0' }, // Mon 7 AM
  { path: '/api/cron/overdue', schedule: '0 0 * * 1' }, // Mon 8 AM
  { path: '/api/cron/attendance', schedule: '0 1 * * 1' }, // Mon 9 AM
]

// Nitro builds the server for wherever it runs: under `vercel build` (the
// deploy workflow) the Vercel preset writes .vercel/output, crons
// included; locally a plain Node server in .output/.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    nitro({ vercel: { config: { version: 3, crons } } }),
    viteReact(),
  ],
})
