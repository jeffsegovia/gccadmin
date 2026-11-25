import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'

// Nitro builds the server for wherever it runs: on Vercel it picks the
// Vercel preset by itself (Build Output API, one Node function), locally
// a plain Node server in .output/.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
})
