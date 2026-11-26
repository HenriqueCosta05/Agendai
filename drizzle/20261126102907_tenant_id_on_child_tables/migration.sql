-- Adds tenant_id to tables that were only scoped through their parent row.
-- The column is added nullable and backfilled from the parent before it becomes NOT NULL.
ALTER TABLE "schedules" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "time_off" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
UPDATE "schedules" AS s SET "tenant_id" = p."tenant_id" FROM "professionals" AS p WHERE p."id" = s."professional_id";--> statement-breakpoint
UPDATE "time_off" AS t SET "tenant_id" = p."tenant_id" FROM "professionals" AS p WHERE p."id" = t."professional_id";--> statement-breakpoint
UPDATE "waitlist_entries" AS w SET "tenant_id" = c."tenant_id" FROM "class_sessions" AS c WHERE c."id" = w."session_id";--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "time_off" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "schedules_tenant_id_idx" ON "schedules" ("tenant_id");--> statement-breakpoint
CREATE INDEX "time_off_tenant_id_idx" ON "time_off" ("tenant_id");--> statement-breakpoint
CREATE INDEX "waitlist_entries_tenant_id_idx" ON "waitlist_entries" ("tenant_id");--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
