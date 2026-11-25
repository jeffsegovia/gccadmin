import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

// Studio only: tables change through migrations/*.sql (pnpm db:migrate).
export default defineConfig({
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
})
