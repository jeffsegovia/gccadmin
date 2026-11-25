-- Insights and Home filter reports and disciples by these.
CREATE INDEX IF NOT EXISTS "SoulWinningReport_date_idx" ON "SoulWinningReport"("date");
CREATE INDEX IF NOT EXISTS "Disciple_active_idx" ON "Disciple"("isDeleted", "isActive");
