CREATE TABLE "extra_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"diary_id" uuid NOT NULL,
	"routine_id" uuid NOT NULL,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"icon" text DEFAULT '📌',
	"points" integer DEFAULT 1 NOT NULL,
	"completion_value" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extra_activities" ADD CONSTRAINT "extra_activities_diary_id_diaries_id_fk" FOREIGN KEY ("diary_id") REFERENCES "public"."diaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra_activities" ADD CONSTRAINT "extra_activities_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "extra_activities_diary_date_idx" ON "extra_activities" USING btree ("diary_id","date");