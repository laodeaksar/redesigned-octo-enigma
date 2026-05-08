CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider" varchar(30) NOT NULL,
	"transaction_id" varchar(100),
	"order_id" varchar(150),
	"payment_status" varchar(30),
	"outcome" varchar(30) NOT NULL,
	"outcome_detail" text,
	"ip" varchar(45),
	"raw_payload" jsonb
);
--> statement-breakpoint
CREATE INDEX "webhook_events_created_at_idx" ON "webhook_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhook_events_provider_idx" ON "webhook_events" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "webhook_events_transaction_id_idx" ON "webhook_events" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "webhook_events_order_id_idx" ON "webhook_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "webhook_events_outcome_idx" ON "webhook_events" USING btree ("outcome");--> statement-breakpoint
CREATE INDEX "webhook_events_ip_idx" ON "webhook_events" USING btree ("ip");