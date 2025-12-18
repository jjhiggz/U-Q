import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core'

export const songs = pgTable('songs', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  artist: varchar('artist', { length: 255 }).notNull(),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
})

export type Song = typeof songs.$inferSelect
export type NewSong = typeof songs.$inferInsert

