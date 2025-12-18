import { os } from '@orpc/server'
import { z } from 'zod'
import { db } from '@/db'
import { songs } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

const submitSongSchema = z.object({
  title: z.string().min(1).max(255),
  artist: z.string().min(1).max(255),
})

export const submitSong = os
  .input(submitSongSchema)
  .handler(async ({ input }) => {
    const [song] = await db
      .insert(songs)
      .values({
        title: input.title,
        artist: input.artist,
        status: 'pending',
      })
      .returning()
    return song
  })

export const getSongs = os.handler(async () => {
  const allSongs = await db.select().from(songs).orderBy(desc(songs.submittedAt))
  return allSongs
})

export const deleteSong = os
  .input(z.object({ id: z.number() }))
  .handler(async ({ input }) => {
    await db.delete(songs).where(eq(songs.id, input.id))
    return { success: true }
  })

export const clearQueue = os.handler(async () => {
  await db.delete(songs)
  return { success: true }
})

export default {
  submitSong,
  getSongs,
  deleteSong,
  clearQueue,
}

