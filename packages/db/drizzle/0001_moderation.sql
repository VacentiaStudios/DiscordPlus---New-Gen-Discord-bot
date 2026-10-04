CREATE TYPE "public"."case_source" AS ENUM('command', 'automod', 'manual', 'system');--> statement-breakpoint
CREATE TYPE "public"."case_type" AS ENUM('warn', 'timeout', 'untimeout', 'kick', 'ban', 'unban');--> statement-breakpoint
CREATE TABLE "channel_locks" (
	"channel_id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"previous_allow" text,
	"previous_deny" text,
	"locked_by" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mod_cases" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mod_cases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guild_id" text NOT NULL,
	"case_number" integer NOT NULL,
	"type" "case_type" NOT NULL,
	"source" "case_source" NOT NULL,
	"target_id" text NOT NULL,
	"target_tag" text NOT NULL,
	"moderator_id" text NOT NULL,
	"moderator_tag" text NOT NULL,
	"reason" text,
	"duration_ms" bigint,
	"expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"log_channel_id" text,
	"log_message_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "settings_audit" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "settings_audit_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guild_id" text NOT NULL,
	"section" text NOT NULL,
	"actor_id" text NOT NULL,
	"actor_name" text NOT NULL,
	"changes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel_locks" ADD CONSTRAINT "channel_locks_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mod_cases" ADD CONSTRAINT "mod_cases_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings_audit" ADD CONSTRAINT "settings_audit_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mod_cases_guild_number_idx" ON "mod_cases" USING btree ("guild_id","case_number");--> statement-breakpoint
CREATE INDEX "mod_cases_guild_target_idx" ON "mod_cases" USING btree ("guild_id","target_id");--> statement-breakpoint
CREATE INDEX "mod_cases_guild_created_idx" ON "mod_cases" USING btree ("guild_id","created_at");--> statement-breakpoint
CREATE INDEX "mod_cases_pending_bans_idx" ON "mod_cases" USING btree ("expires_at") WHERE "mod_cases"."type" = 'ban' and "mod_cases"."active" and "mod_cases"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "settings_audit_guild_created_idx" ON "settings_audit" USING btree ("guild_id","created_at");