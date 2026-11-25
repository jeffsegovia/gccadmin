-- GCC Admin v3: additive only. Nothing Prisma made is renamed or dropped.

-- A disciple's phone number, for the portal's "Fix your details".
ALTER TABLE "Disciple" ADD COLUMN IF NOT EXISTS "contactNo" TEXT;

-- A non-primary disciple's no-login page (see src/db/schema.ts).
CREATE TABLE IF NOT EXISTS "DisciplePortalLink" (
  "id" TEXT PRIMARY KEY,
  "discipleId" TEXT NOT NULL REFERENCES "Disciple"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "token" TEXT NOT NULL,
  "createdById" TEXT,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "lastOpenedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "DisciplePortalLink_discipleId_key" ON "DisciplePortalLink"("discipleId");
CREATE UNIQUE INDEX IF NOT EXISTS "DisciplePortalLink_token_key" ON "DisciplePortalLink"("token");

-- Faster attendance sheets: who was at a service, and a guest's services.
CREATE INDEX IF NOT EXISTS "Attendance_date_idx" ON "Attendance"("date");
CREATE INDEX IF NOT EXISTS "CellReport_date_idx" ON "CellReport"("date");
