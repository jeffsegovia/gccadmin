import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

/* One small pool per server instance. On Vercel each function instance
   keeps its own; use the database's pooled connection string (e.g. Neon's
   or Supabase's "-pooler" host) as DATABASE_URL so many instances don't
   exhaust Postgres connections. It must be a plain postgres:// URL, not a
   Prisma Accelerate one. */
const globalForDb = globalThis as unknown as { gccPool?: pg.Pool }

const pool =
  globalForDb.gccPool ??
  new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 })
globalForDb.gccPool = pool

export const db = drizzle({ client: pool })
export type Db = typeof db
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
