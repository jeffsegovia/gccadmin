import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'

// Nitro builds a plain Node server in .output/ by default; the deploy
// workflow sets NITRO_PRESET=vercel so it writes .vercel/output instead.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
})
