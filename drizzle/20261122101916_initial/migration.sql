CREATE TYPE "booking_status" AS ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show');--> statement-breakpoint
CREATE TYPE "outbox_status" AS ENUM('pending', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "user_role" AS ENUM('admin', 'professional', 'client');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"period" tstzrange NOT NULL,
	"status" "booking_status" DEFAULT 'pending'::"booking_status" NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_tenant_idempotency_uq" UNIQUE("tenant_id","idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "class_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"period" tstzrange NOT NULL,
	"capacity" integer NOT NULL,
	CONSTRAINT "class_sessions_capacity_positive" CHECK ("capacity" >= 1)
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'pending'::"outbox_status" NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professionals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL UNIQUE,
	"unit_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "professionals_id_tenant_uq" UNIQUE("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" text PRIMARY KEY,
	"family_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"family_expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"revoked" boolean DEFAULT false NOT NULL,
	"claims" jsonb
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"professional_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	CONSTRAINT "schedules_weekday_range" CHECK ("weekday" BETWEEN 0 AND 6),
	CONSTRAINT "schedules_time_order" CHECK ("start_time" < "end_time")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"duration_min" integer NOT NULL,
	"buffer_min" integer DEFAULT 0 NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_id_tenant_uq" UNIQUE("id","tenant_id"),
	CONSTRAINT "services_duration_positive" CHECK ("duration_min" > 0),
	CONSTRAINT "services_buffer_non_negative" CHECK ("buffer_min" >= 0),
	CONSTRAINT "services_capacity_positive" CHECK ("capacity" >= 1)
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_off" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"professional_id" uuid NOT NULL,
	"period" tstzrange NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "units_id_tenant_uq" UNIQUE("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'client'::"user_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_id_tenant_uq" UNIQUE("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"session_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"offered_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	CONSTRAINT "waitlist_session_client_uq" UNIQUE("session_id","client_id"),
	CONSTRAINT "waitlist_session_position_uq" UNIQUE("session_id","position")
);
--> statement-breakpoint
CREATE INDEX "bookings_professional_id_idx" ON "bookings" ("professional_id");--> statement-breakpoint
CREATE INDEX "bookings_client_id_idx" ON "bookings" ("client_id");--> statement-breakpoint
CREATE INDEX "class_sessions_tenant_id_idx" ON "class_sessions" ("tenant_id");--> statement-breakpoint
CREATE INDEX "outbox_events_status_idx" ON "outbox_events" ("status","created_at");--> statement-breakpoint
CREATE INDEX "professionals_tenant_id_idx" ON "professionals" ("tenant_id");--> statement-breakpoint
CREATE INDEX "professionals_unit_id_idx" ON "professionals" ("unit_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens" ("family_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_family_expires_at_idx" ON "refresh_tokens" ("family_expires_at");--> statement-breakpoint
CREATE INDEX "schedules_professional_id_idx" ON "schedules" ("professional_id");--> statement-breakpoint
CREATE INDEX "services_tenant_id_idx" ON "services" ("tenant_id");--> statement-breakpoint
CREATE INDEX "time_off_professional_id_idx" ON "time_off" ("professional_id");--> statement-breakpoint
CREATE INDEX "units_tenant_id_idx" ON "units" ("tenant_id");--> statement-breakpoint
CREATE INDEX "users_tenant_id_idx" ON "users" ("tenant_id");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_professional_id_professionals_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_users_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_service_id_services_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_unit_id_units_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_professional_id_professionals_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_professional_id_professionals_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_session_id_class_sessions_id_fkey" FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_client_id_users_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE;