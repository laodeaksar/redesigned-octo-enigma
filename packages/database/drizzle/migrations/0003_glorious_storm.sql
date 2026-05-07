CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" varchar(45),
	"method" varchar(10) NOT NULL,
	"path" text NOT NULL,
	"user_agent" text,
	"status_code" smallint NOT NULL,
	"error_code" varchar(60) NOT NULL,
	"user_id" varchar(36),
	"user_email" varchar(255),
	"user_role" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"order_number" varchar(100),
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "products_fts_idx";--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "city_id" varchar(20);--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_ip_idx" ON "audit_logs" USING btree ("ip");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_status_code_idx" ON "audit_logs" USING btree ("status_code");--> statement-breakpoint
CREATE INDEX "audit_logs_error_code_idx" ON "audit_logs" USING btree ("error_code");--> statement-breakpoint
CREATE INDEX "push_order_idx" ON "push_subscriptions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "push_user_order_idx" ON "push_subscriptions" USING btree ("user_id","order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlists_user_product_uniq" ON "wishlists" USING btree ("user_id","product_id");