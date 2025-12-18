import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { songs } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'

export const getSongs = createServerFn().handler(async () => {
  return await db.select().from(songs).orderBy(desc(songs.points), desc(songs.submittedAt))
})

export const submitSong = createServerFn({ method: 'POST' })
  .inputValidator((data: { title: string; artist: string }) => data)
  .handler(async ({ data }) => {
    const [song] = await db
      .insert(songs)
      .values({
        title: data.title,
        artist: data.artist,
        status: 'pending',
        points: 1,
      })
      .returning()
    return song
  })

export const deleteSong = createServerFn({ method: 'POST' })
  .inputValidator((id: number) => id)
  .handler(async ({ data: id }) => {
    // Delete the song
    await db.delete(songs).where(eq(songs.id, id))
    
    // Increment points for all remaining songs
    await db.update(songs).set({
      points: sql`${songs.points} + 1`
    })
    
    return { success: true }
  })

export const clearQueue = createServerFn({ method: 'POST' }).handler(
  async () => {
    await db.delete(songs)
    return { success: true }
  }
)

export const addPoints = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number; points: number }) => data)
  .handler(async ({ data }) => {
    await db.update(songs)
      .set({ points: sql`${songs.points} + ${data.points}` })
      .where(eq(songs.id, data.id))
    return { success: true }
  })

