# GCC Admin

The cell group, disciple and attendance system of Grace City Church
(v3: TanStack Start, Drizzle on v2's Prisma tables, Clerk, Vercel). See
README.md for how it's built and deployed.

## Working with Jeff

- Generic English, not British: "color", "optimize".
- Ask with options and a recommendation (recommended first).
- Parity with v2 is a rule: no v2 feature is removed. A feature can be
  refactored, optimized or added to.
- Branches are `feat/*`, `fix/*`, `release/*` or `hotfix/*`, merged into
  `development` (staging), then `main` (production). Deploys run from
  GitHub Actions only.
- Emails go out on a mutation or an opt-in button, as in Reviu; never on
  a schedule (no cron). Copies in `src/lib/email/templates.ts` are signed
  off by Jeff before they change.

## Conventions (as in Osamu)

- Route loaders and server functions, `router.invalidate()` after a
  mutation. No TanStack Query.
- `src/server/<feature>/<feature>.functions.ts` for server functions,
  `*.server.ts` for server-only helpers; Zod schemas shared with forms in
  `src/lib/<feature>/`; pure logic in `src/lib/`, tested in `__tests__/`.
- The database keeps v2's Prisma tables; changes are additive SQL in
  `migrations/` (`pnpm db:migrate`).
- Osamu's soft, petite look: corners from `--radius` (8px, capped at
  12px; cards `rounded-xl`), tiny badges (`Pill`, 20px), a chevron at the
  end of every list row that opens something (`RowChevron`; table rows are
  clickable without one), no gender color
  coding. Dark by default with a dark top bar in light mode; tokens in
  `src/styles.css`, components use tokens only. Controls in a row share
  one height (40px; `Segmented` matches the selects).
- Dialogs are `ResponsiveDialog` (a sheet on phones, its top bar's submit
  mirrors the form's). Saving buttons are `SubmitButton`/`PendingButton`.
- Times are Manila (`src/lib/dates.ts`); calendar days are stored as UTC
  midnight.
- Comments explain why. Prettier: no semicolons, single quotes.

## Commands

```bash
pnpm dev            # http://localhost:3040 (no Clerk keys: preview mode)
pnpm db:migrate && pnpm seed
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm email:preview  # every email, with sample data
pnpm images         # share image and shortcut icons
```
