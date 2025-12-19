import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { songs } from '@/db/schema'
import { eq, desc, sql, inArray } from 'drizzle-orm'

// Detect link type from URL
const detectLinkType = (url: string): 'youtube' | 'spotify' | 'soundcloud' | null => {
  const lower = url.toLowerCase()
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube'
  if (lower.includes('spotify.com')) return 'spotify'
  if (lower.includes('soundcloud.com')) return 'soundcloud'
  return null
}

export const getSongs = createServerFn().handler(async () => {
  return await db.select().from(songs).orderBy(desc(songs.bananaSticker), desc(songs.points), desc(songs.submittedAt))
})

export const checkCanSubmit = createServerFn({ method: 'POST' })
  .inputValidator((submitterId: string) => submitterId)
  .handler(async ({ data: submitterId }) => {
    if (!submitterId) {
      return { canSubmit: true }
    }
    
    const existingSong = await db
      .select({ id: songs.id })
      .from(songs)
      .where(eq(songs.submitterId, submitterId))
      .limit(1)
    
    return { 
      canSubmit: existingSong.length === 0,
      existingSongId: existingSong[0]?.id ?? null
    }
  })

export const submitSong = createServerFn({ method: 'POST' })
  .inputValidator((data: { 
    title: string
    artist: string
    notes?: string
    genres?: string
    link?: string
    submitterId: string
    allSubmitterIds?: string[] 
  }) => data)
  .handler(async ({ data }) => {
    // Check if user already has a song in queue
    // Check all possible IDs (handles login/logout transitions)
    const idsToCheck = data.allSubmitterIds?.filter(Boolean) ?? (data.submitterId ? [data.submitterId] : [])
    
    if (idsToCheck.length > 0) {
      const existingSong = await db
        .select({ id: songs.id })
        .from(songs)
        .where(inArray(songs.submitterId, idsToCheck))
        .limit(1)
      
      if (existingSong.length > 0) {
        throw new Error('You already have a song in the queue. Wait until it gets picked!')
      }
    }
    
    // Validate and detect link type if provided
    let linkType: 'youtube' | 'spotify' | 'soundcloud' | null = null
    if (data.link) {
      linkType = detectLinkType(data.link)
      if (!linkType) {
        throw new Error('Only YouTube, Spotify, and SoundCloud links are accepted')
      }
    }
    
    const [song] = await db
      .insert(songs)
      .values({
        title: data.title,
        artist: data.artist,
        notes: data.notes || null,
        genres: data.genres || null,
        link: data.link || null,
        linkType,
        status: 'pending',
        points: 1,
        submitterId: data.submitterId || null,
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
      // Never allow points to drop below 1
      .set({ points: sql`GREATEST(${songs.points} + ${data.points}, 1)` })
      .where(eq(songs.id, data.id))
    return { success: true }
  })

export const toggleBananaSticker = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number; value: boolean }) => data)
  .handler(async ({ data }) => {
    await db.update(songs)
      .set({ bananaSticker: data.value })
      .where(eq(songs.id, data.id))
    return { success: true }
  })

