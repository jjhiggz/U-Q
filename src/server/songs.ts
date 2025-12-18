import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { songs } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export const getSongs = createServerFn().handler(async () => {
  return await db.select().from(songs).orderBy(desc(songs.submittedAt))
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
      })
      .returning()
    return song
  })

export const deleteSong = createServerFn({ method: 'POST' })
  .inputValidator((id: number) => id)
  .handler(async ({ data: id }) => {
    await db.delete(songs).where(eq(songs.id, id))
    return { success: true }
  })

export const clearQueue = createServerFn({ method: 'POST' }).handler(
  async () => {
    await db.delete(songs)
    return { success: true }
  }
)

