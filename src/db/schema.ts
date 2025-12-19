import { pgTable, serial, varchar, timestamp, integer, text } from 'drizzle-orm/pg-core'

export const songs = pgTable('songs', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  artist: varchar('artist', { length: 255 }).notNull(),
  nameInChat: varchar('name_in_chat', { length: 100 }), // User's name in the chat room
  notes: text('notes'),
  genres: varchar('genres', { length: 500 }),
  // Song link - the actual song to listen to
  songLink: varchar('song_link', { length: 500 }),
  // Social media links - for following the artist
  youtubeUrl: varchar('youtube_url', { length: 500 }),
  soundcloudUrl: varchar('soundcloud_url', { length: 500 }),
  instagramUrl: varchar('instagram_url', { length: 500 }),
  tiktokUrl: varchar('tiktok_url', { length: 500 }),
  facebookUrl: varchar('facebook_url', { length: 500 }),
  // Legacy field (keeping for backward compatibility)
  spotifyUrl: varchar('spotify_url', { length: 500 }),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  points: integer('points').default(1).notNull(),
  bananaStickers: integer('banana_stickers').default(0).notNull(), // count of banana stickers
  submitterId: varchar('submitter_id', { length: 255 }),
  archivedAt: timestamp('archived_at'), // null = in queue, set = archived/pinned
})

export type Song = typeof songs.$inferSelect
export type NewSong = typeof songs.$inferInsert

