CREATE TABLE "music_submission_data" (
	"submission_id" integer PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"artist" varchar(255) NOT NULL,
	"name_in_chat" varchar(100),
	"notes" text,
	"genres" varchar(500),
	"song_link" varchar(500),
	"youtube_url" varchar(500),
	"soundcloud_url" varchar(500),
	"instagram_url" varchar(500),
	"tiktok_url" varchar(500),
	"facebook_url" varchar(500),
	"spotify_url" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "queues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" varchar(120) NOT NULL,
	"queue_type" varchar(50) DEFAULT 'music' NOT NULL,
	"visibility" varchar(50) DEFAULT 'private' NOT NULL,
	"current_submission_id" integer,
	"initial_points" integer DEFAULT 1 NOT NULL,
	"points_increment_on_archive" integer DEFAULT 1 NOT NULL,
	"banana_boosts_enabled" boolean DEFAULT true NOT NULL,
	"authenticated_submission_limit" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"queue_id" uuid NOT NULL,
	"submitter_user_id" text,
	"points" integer DEFAULT 1 NOT NULL,
	"paid_banana_boost_count" integer DEFAULT 0 NOT NULL,
	"granted_banana_boost_count" integer DEFAULT 0 NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "submitter_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"display_name" varchar(120),
	"artist_name" varchar(255),
	"chat_name" varchar(100),
	"youtube_url" varchar(500),
	"soundcloud_url" varchar(500),
	"instagram_url" varchar(500),
	"tiktok_url" varchar(500),
	"facebook_url" varchar(500),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "handle" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "active_queue_id" uuid;--> statement-breakpoint
ALTER TABLE "music_submission_data" ADD CONSTRAINT "music_submission_data_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queues" ADD CONSTRAINT "queues_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_queue_id_queues_id_fk" FOREIGN KEY ("queue_id") REFERENCES "public"."queues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submitter_user_id_user_id_fk" FOREIGN KEY ("submitter_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submitter_profiles" ADD CONSTRAINT "submitter_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "queues_owner_name_unique" ON "queues" USING btree ("owner_user_id","name");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_handle_unique" UNIQUE("handle");