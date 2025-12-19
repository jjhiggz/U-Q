import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { songs } from '@/db/schema'
import { eq, desc, sql, inArray, isNull, isNotNull } from 'drizzle-orm'

// Validate URL for a specific platform
const validateUrl = (url: string, platform: 'youtube' | 'spotify' | 'soundcloud' | 'instagram' | 'tiktok'): boolean => {
  const lower = url.toLowerCase()
  switch (platform) {
    case 'youtube':
      return lower.includes('youtube.com') || lower.includes('youtu.be')
    case 'spotify':
      return lower.includes('spotify.com')
    case 'soundcloud':
      return lower.includes('soundcloud.com')
    case 'instagram':
      return lower.includes('instagram.com') || lower.includes('instagr.am')
    case 'tiktok':
      return lower.includes('tiktok.com') || lower.includes('vm.tiktok.com')
    default:
      return false
  }
}

export const getSongs = createServerFn().handler(async () => {
  return await db.select().from(songs)
    .where(isNull(songs.archivedAt))
    .orderBy(desc(songs.bananaStickers), desc(songs.points), desc(songs.submittedAt))
})

export const getArchivedSongs = createServerFn().handler(async () => {
  return await db.select().from(songs)
    .where(isNotNull(songs.archivedAt))
    .orderBy(desc(songs.archivedAt))
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
    youtubeUrl?: string
    spotifyUrl?: string
    soundcloudUrl?: string
    instagramUrl?: string
    tiktokUrl?: string
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
    
    // Validate social media URLs if provided
    if (data.youtubeUrl && !validateUrl(data.youtubeUrl, 'youtube')) {
      throw new Error('Invalid YouTube URL')
    }
    if (data.spotifyUrl && !validateUrl(data.spotifyUrl, 'spotify')) {
      throw new Error('Invalid Spotify URL')
    }
    if (data.soundcloudUrl && !validateUrl(data.soundcloudUrl, 'soundcloud')) {
      throw new Error('Invalid SoundCloud URL')
    }
    if (data.instagramUrl && !validateUrl(data.instagramUrl, 'instagram')) {
      throw new Error('Invalid Instagram URL')
    }
    if (data.tiktokUrl && !validateUrl(data.tiktokUrl, 'tiktok')) {
      throw new Error('Invalid TikTok URL')
    }
    
    const [song] = await db
      .insert(songs)
      .values({
        title: data.title,
        artist: data.artist,
        notes: data.notes || null,
        genres: data.genres || null,
        youtubeUrl: data.youtubeUrl || null,
        spotifyUrl: data.spotifyUrl || null,
        soundcloudUrl: data.soundcloudUrl || null,
        instagramUrl: data.instagramUrl || null,
        tiktokUrl: data.tiktokUrl || null,
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
    // Delete the song permanently
    await db.delete(songs).where(eq(songs.id, id))
    return { success: true }
  })

export const archiveSong = createServerFn({ method: 'POST' })
  .inputValidator((id: number) => id)
  .handler(async ({ data: id }) => {
    // Archive the song (mark as picked)
    await db.update(songs)
      .set({ archivedAt: new Date() })
      .where(eq(songs.id, id))
    
    // Increment points for all remaining (non-archived) songs
    await db.update(songs)
      .set({ points: sql`${songs.points} + 1` })
      .where(isNull(songs.archivedAt))
    
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

export const updateBananaStickers = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number; delta: number }) => data)
  .handler(async ({ data }) => {
    await db.update(songs)
      // Never allow banana stickers to drop below 0
      .set({ bananaStickers: sql`GREATEST(${songs.bananaStickers} + ${data.delta}, 0)` })
      .where(eq(songs.id, data.id))
    return { success: true }
  })

