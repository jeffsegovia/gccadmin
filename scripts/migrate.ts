import 'dotenv/config'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

/* Applies migrations/*.sql in name order, each once, each in its own
   transaction, recorded in "_gcc_migrations". Prisma's own
   "_prisma_migrations" is left alone: this database was made by Prisma and
   is only ever added to from here. */
const dir = join(import.meta.dirname, '..', 'migrations')

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    await client.query(
      'CREATE TABLE IF NOT EXISTS "_gcc_migrations" ("name" TEXT PRIMARY KEY, "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)',
    )
    const done = new Set(
      (
        await client.query<{ name: string }>(
          'SELECT "name" FROM "_gcc_migrations"',
        )
      ).rows.map((r) => r.name),
    )
    for (const name of readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort()) {
      if (done.has(name)) continue
      const sql = readFileSync(join(dir, name), 'utf8')
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO "_gcc_migrations" ("name") VALUES ($1)',
          [name],
        )
        await client.query('COMMIT')
        console.log(`applied ${name}`)
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
