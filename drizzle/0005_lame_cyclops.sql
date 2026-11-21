CREATE TABLE IF NOT EXISTS "bank_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_account_id" text NOT NULL,
	"external_account_name" text NOT NULL,
	"account_id" text NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "external_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bank_connections_user_id_provider_idx" ON "bank_connections" ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_account_id_external_id_idx" ON "transactions" ("account_id","external_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
