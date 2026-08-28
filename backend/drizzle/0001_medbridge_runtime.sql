CREATE EXTENSION IF NOT EXISTS postgis;
--> statement-breakpoint
ALTER TABLE "pharmacies" ALTER COLUMN "user_id" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pharmacies_user_id_unique" ON "pharmacies" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacies_location_gist" ON "pharmacies" USING gist ("location");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listings_status_expiry_idx" ON "listings" USING btree ("status", "expiry_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listings_pharmacy_idx" ON "listings" USING btree ("pharmacy_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_pharmacy_created_idx" ON "notifications" USING btree ("pharmacy_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demand_signals_matching_idx" ON "demand_signals" USING btree ("drug_id", "pincode", "city", "week_start");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ocr_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "requested_by" uuid NOT NULL,
  "status" varchar(20) DEFAULT 'queued' NOT NULL,
  "input_text" text,
  "provider" varchar(50),
  "result" jsonb,
  "error" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ocr_jobs_requester_created_idx" ON "ocr_jobs" USING btree ("requested_by", "created_at");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "ocr_jobs" ADD CONSTRAINT "ocr_jobs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
