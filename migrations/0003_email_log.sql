-- Emails sent on request (reminders, the weekly summary): one row each,
-- so a leader is reminded at most once a day and the screen can say so.
CREATE TABLE IF NOT EXISTS "EmailLog" (
  "id" TEXT PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "sentById" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "EmailLog_kind_key_sentAt_idx" ON "EmailLog"("kind", "key", "sentAt");
