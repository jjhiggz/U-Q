import { pgTable, serial, varchar, timestamp, integer, boolean, text } from 'drizzle-orm/pg-core'

export const songs = pgTable('songs', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  artist: varchar('artist', { length: 255 }).notNull(),
  notes: text('notes'),
  genres: varchar('genres', { length: 500 }),
  link: varchar('link', { length: 500 }),
  linkType: varchar('link_type', { length: 20 }), // 'youtube' | 'spotify' | 'soundcloud'
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  points: integer('points').default(1).notNull(),
  bananaSticker: boolean('banana_sticker').default(false).notNull(),
  submitterId: varchar('submitter_id', { length: 255 }),
})

export type Song = typeof songs.$inferSelect
export type NewSong = typeof songs.$inferInsert

