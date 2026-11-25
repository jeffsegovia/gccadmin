# GCC Admin v3

The cell group, attendance and discipleship system of Grace City Church.
A rewrite of v2 (Next.js + Prisma) on **TanStack Start**, **Drizzle** and
**base-ui (shadcn)**, deployed on **Vercel**, mobile-first and installable
(PWA). Sign-in stays on **Clerk**, and the app runs on **the same Postgres
database** as v2.

## What's in it

- **Home**: the week at a glance, the next service, who hasn't reported,
  Sunday attendance and church status.
- **Disciples**: list, filters, import/export (Excel), detail with growth
  process and 12-week attendance, promote/demote primary leaders.
- **Disciple portal** (`/me/<token>`): a private link per non-primary
  disciple, made by their leader; no sign-in. Shows their leader, what's
  coming up, growth step, attendance and lessons, lets them fix their
  phone and address, and lets an assistant leader **report a cell group**
  for the people they handle (the network leader is their primary leader).
- **Cell reports**: by week, filters, PDF, new/edit with a draft kept on
  the device and a suggested next lesson.
- **Soul winning**: soul-winning and consolidation sessions, new believers,
  "Make disciple".
- **Attendance** (fixed, offline-first): see below.
- **Cell group lessons**, **Growth process**, **Leaders** and **Users**
  (admins), **My profile**, and the public **GCC Resources** (`/resources`).
- Light, dark (default) or device theme; square corners; gold from the
  church's shield.

## Attendance: what changed

v2 saved a whole list on Save, which caused real data loss. Now:

1. **Each tap is saved on its own** (mark or unmark one person), so a
   filter or tab can never drop anyone.
2. **Guests aren't deleted and re-made on save** (v2's delete also removed
   every guest with no attendance at all). Their ids, inviters and disciple
   links stay.
3. **First-timer vs returning comes from each guest's first service date**,
   so last week's first-timers stay first-timers on last week's sheet.
4. **Closed services are locked on the server**, not just greyed out.
5. **Offline-first**: taps and new guests are kept on the device
   (`src/lib/attendance/outbox.ts`) and synced when the connection is back.
   New guests get their id on the device, so retries never double them. The
   installed app keeps each opened sheet for offline use (`public/sw.js`).

Soul winning had the same delete bug (removing every believer with no
session); fixed too. Editing a cell report now keeps its id.

## Database

Drizzle maps onto the tables Prisma made (`src/db/schema.ts`): same names,
columns, enums and join tables. Nothing is renamed or dropped, so v2 and
v3 can run against the same database during the switch. New things come
from `migrations/*.sql` (additive only), applied once each by
`pnpm db:migrate` and recorded in `_gcc_migrations`:

- `0001`: `Disciple.contactNo`, the `DisciplePortalLink` table, two indexes.

## Roles

As in v2, from the Clerk user's public metadata: `role: 'admin' | 'leader'`,
and `pastor: true` (sees every network). Users › an account sets them. A
signed-in account without a role sees Request access. If the Clerk session
token carries `metadata` (v2's setup) it's read from there; otherwise from
Clerk's API.

## Running it

```bash
pnpm install
cp .env.template .env      # fill in DATABASE_URL at least
pnpm db:migrate
pnpm dev                   # http://localhost:3040
```

Local preview: with no Clerk keys in `.env`, `pnpm dev` signs you in as a
stand-in admin (`DEV_ROLE=leader` to see a leader's view). On an empty local
database, `pnpm seed` adds a small church to click around in (and a portal
link at `/me/preview-portal-joshua-reyes`).

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## Branches

As in Osamu: work on `feat/*`, `fix/*`, `release/*` or `hotfix/*`
branches and open pull requests into `development`. Merging into
`development` deploys staging (a Vercel preview); merging `development`
into `main` deploys production.

## Deploying to Vercel

GitHub Actions deploys (`.github/workflows/deploy.yml`), not Vercel's Git
integration (`vercel.json` turns that off so nothing deploys twice). On a
push to `main` or `development` it runs the format check, lint, type
check and tests, applies `migrations/` to that environment's database,
then builds with `vercel build` (Nitro picks the Vercel preset) and
deploys the prebuilt output.

Set up once:

1. Create the Vercel project (`vercel link`) and set the variables from
   `.env.template` for Production and Preview (production Clerk keys,
   `DATABASE_URL` as the pooled connection string, `CRON_SECRET`).
2. In GitHub, add two environments, `production` and `development`, each
   with the secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
   (from `.vercel/project.json`) and `DATABASE_URL`. Optionally set the
   variable `STAGING_DOMAIN` on `development` to alias each staging
   deploy.

## Emails

The copies are in `src/lib/email/templates.ts`; `pnpm email:preview`
writes them all to `email-preview.html`. Scheduled emails run from
Vercel Cron (`vite.config.ts` lists the schedule, in UTC):

| Email                         | When (Manila) | To                                                              |
| ----------------------------- | ------------- | --------------------------------------------------------------- |
| Weekly nudge                  | Saturday 5 PM | Primary leaders with no report this week                        |
| Weekly summary and birthdays  | Monday 7 AM   | Admins and pastors; each leader with birthdays in their network |
| Overdue reports               | Monday 8 AM   | Primary leaders with no report in 14 days                       |
| Attendance still open         | Monday 9 AM   | Admins, if last Sunday isn't locked                             |
| Report from a disciple's page | When filed    | Their network leader                                            |

They send only with `EMAIL_REMINDERS=on`.

## Share image and shortcuts

`public/og.png` (the link preview) and the installed app's shortcut icons
(`public/shortcuts/`) are drawn by `pnpm images` with the preinstalled
Chromium. The shortcuts (long-press the app icon) are in
`public/manifest.webmanifest`: New cell report, Take attendance, Add a
disciple and New soul-winning session.
