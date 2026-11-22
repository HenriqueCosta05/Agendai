-- Range constraints that the Drizzle schema cannot express.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_period_not_empty" CHECK (NOT isempty("period"));--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_period_not_empty" CHECK (NOT isempty("period"));--> statement-breakpoint
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_period_not_empty" CHECK (NOT isempty("period"));--> statement-breakpoint
-- A professional cannot hold two active bookings that overlap in time.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist ("professional_id" WITH =, "period" WITH &&)
  WHERE ("status" IN ('pending', 'confirmed'));
