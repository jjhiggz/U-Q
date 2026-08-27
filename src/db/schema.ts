import {
	pgTable,
	serial,
	varchar,
	timestamp,
	integer,
	text,
	boolean,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "@/server/auth/auth.table";

export const queues = pgTable(
	"queues",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerUserId: text("owner_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 120 }).notNull(),
		queueType: varchar("queue_type", { length: 50 }).default("music").notNull(),
		visibility: varchar("visibility", { length: 50 })
			.default("private")
			.notNull(),
		currentSubmissionId: integer("current_submission_id"),
		initialPoints: integer("initial_points").default(1).notNull(),
		pointsIncrementOnArchive: integer("points_increment_on_archive")
			.default(1)
			.notNull(),
		bananaBoostsEnabled: boolean("banana_boosts_enabled")
			.default(true)
			.notNull(),
		authenticatedSubmissionLimit: integer("authenticated_submission_limit")
			.default(1)
			.notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("queues_owner_name_unique").on(table.ownerUserId, table.name),
	],
);

export const submitterProfiles = pgTable("submitter_profiles", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	displayName: varchar("display_name", { length: 120 }),
	artistName: varchar("artist_name", { length: 255 }),
	chatName: varchar("chat_name", { length: 100 }),
	youtubeUrl: varchar("youtube_url", { length: 500 }),
	soundcloudUrl: varchar("soundcloud_url", { length: 500 }),
	instagramUrl: varchar("instagram_url", { length: 500 }),
	tiktokUrl: varchar("tiktok_url", { length: 500 }),
	facebookUrl: varchar("facebook_url", { length: 500 }),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const submissions = pgTable("submissions", {
	id: serial("id").primaryKey(),
	queueId: uuid("queue_id")
		.notNull()
		.references(() => queues.id, { onDelete: "cascade" }),
	submitterUserId: text("submitter_user_id").references(() => user.id, {
		onDelete: "set null",
	}),
	points: integer("points").default(1).notNull(),
	paidBananaBoostCount: integer("paid_banana_boost_count").default(0).notNull(),
	grantedBananaBoostCount: integer("granted_banana_boost_count")
		.default(0)
		.notNull(),
	submittedAt: timestamp("submitted_at").defaultNow().notNull(),
	archivedAt: timestamp("archived_at"),
});

export const musicSubmissionData = pgTable("music_submission_data", {
	submissionId: integer("submission_id")
		.primaryKey()
		.references(() => submissions.id, { onDelete: "cascade" }),
	title: varchar("title", { length: 255 }).notNull(),
	artist: varchar("artist", { length: 255 }).notNull(),
	nameInChat: varchar("name_in_chat", { length: 100 }),
	notes: text("notes"),
	genres: varchar("genres", { length: 500 }),
	songLink: varchar("song_link", { length: 500 }),
	youtubeUrl: varchar("youtube_url", { length: 500 }),
	soundcloudUrl: varchar("soundcloud_url", { length: 500 }),
	instagramUrl: varchar("instagram_url", { length: 500 }),
	tiktokUrl: varchar("tiktok_url", { length: 500 }),
	facebookUrl: varchar("facebook_url", { length: 500 }),
	spotifyUrl: varchar("spotify_url", { length: 500 }),
});

export type Queue = typeof queues.$inferSelect;
export type NewQueue = typeof queues.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type MusicSubmissionData = typeof musicSubmissionData.$inferSelect;
export type NewMusicSubmissionData = typeof musicSubmissionData.$inferInsert;
export type SubmitterProfile = typeof submitterProfiles.$inferSelect;
export type NewSubmitterProfile = typeof submitterProfiles.$inferInsert;

export interface MusicQueueItem {
	readonly id: number;
	readonly queueId: string;
	readonly title: string;
	readonly artist: string;
	readonly nameInChat: string | null;
	readonly notes: string | null;
	readonly genres: string | null;
	readonly songLink: string | null;
	readonly youtubeUrl: string | null;
	readonly soundcloudUrl: string | null;
	readonly instagramUrl: string | null;
	readonly tiktokUrl: string | null;
	readonly facebookUrl: string | null;
	readonly spotifyUrl: string | null;
	readonly submittedAt: Date;
	readonly points: number;
	readonly paidBananaBoostCount: number;
	readonly grantedBananaBoostCount: number;
	readonly bananaStickers: number;
	readonly submittedByUserId: string | null;
	readonly archivedAt: Date | null;
}

export const songs = pgTable("songs", {
	id: serial("id").primaryKey(),
	title: varchar("title", { length: 255 }).notNull(),
	artist: varchar("artist", { length: 255 }).notNull(),
	nameInChat: varchar("name_in_chat", { length: 100 }), // User's name in the chat room
	notes: text("notes"),
	genres: varchar("genres", { length: 500 }),
	// Song link - the actual song to listen to
	songLink: varchar("song_link", { length: 500 }),
	// Social media links - for following the artist
	youtubeUrl: varchar("youtube_url", { length: 500 }),
	soundcloudUrl: varchar("soundcloud_url", { length: 500 }),
	instagramUrl: varchar("instagram_url", { length: 500 }),
	tiktokUrl: varchar("tiktok_url", { length: 500 }),
	facebookUrl: varchar("facebook_url", { length: 500 }),
	// Legacy field (keeping for backward compatibility)
	spotifyUrl: varchar("spotify_url", { length: 500 }),
	submittedAt: timestamp("submitted_at").defaultNow().notNull(),
	status: varchar("status", { length: 50 }).default("pending").notNull(),
	points: integer("points").default(1).notNull(),
	bananaStickers: integer("banana_stickers").default(0).notNull(), // count of banana stickers
	submitterId: varchar("submitter_id", { length: 255 }),
	submittedByUserId: text("submitted_by_user_id").references(() => user.id),
	archivedAt: timestamp("archived_at"), // null = in queue, set = archived/pinned
});

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;
