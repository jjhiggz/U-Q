import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { songs } from '@/db/schema'
import { eq, desc, sql, inArray, isNull, isNotNull } from 'drizzle-orm'


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

// Validate that a URL is valid and not from a paid streaming service
const isValidSongLink = (url: string): { valid: boolean; error?: string } => {
  try {
    const parsed = new URL(url)
    const lower = parsed.hostname.toLowerCase()
    
    // Block paid streaming services
    if (lower.includes('music.apple.com') || lower.includes('itunes.apple.com')) {
      return { valid: false, error: 'Apple Music links are not allowed - please use a free streaming service' }
    }
    if (lower.includes('tidal.com')) {
      return { valid: false, error: 'Tidal links are not allowed - please use a free streaming service' }
    }
    if (lower.includes('deezer.com')) {
      return { valid: false, error: 'Deezer links are not allowed - please use a free streaming service' }
    }
    if (lower.includes('amazon.com') || lower.includes('music.amazon')) {
      return { valid: false, error: 'Amazon Music links are not allowed - please use a free streaming service' }
    }
    
    return { valid: true }
  } catch {
    return { valid: false, error: 'Please enter a valid URL' }
  }
}

// Validate social media URLs
const validateSocialUrl = (url: string, platform: 'instagram' | 'tiktok' | 'youtube' | 'soundcloud' | 'facebook'): boolean => {
  const lower = url.toLowerCase()
  switch (platform) {
    case 'instagram':
      return lower.includes('instagram.com') || lower.includes('instagr.am')
    case 'tiktok':
      return lower.includes('tiktok.com') || lower.includes('vm.tiktok.com')
    case 'youtube':
      return lower.includes('youtube.com') || lower.includes('youtu.be')
    case 'soundcloud':
      return lower.includes('soundcloud.com')
    case 'facebook':
      return lower.includes('facebook.com') || lower.includes('fb.com') || lower.includes('fb.watch')
    default:
      return false
  }
}

export const submitSong = createServerFn({ method: 'POST' })
  .inputValidator((data: { 
    title: string
    artist: string
    notes?: string
    genres?: string
    songLink?: string
    youtubeUrl?: string
    soundcloudUrl?: string
    instagramUrl?: string
    tiktokUrl?: string
    facebookUrl?: string
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
    
    // Validate song link if provided
    if (data.songLink) {
      const validation = isValidSongLink(data.songLink)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
    }
    
    // Validate social media URLs if provided
    if (data.youtubeUrl && !validateSocialUrl(data.youtubeUrl, 'youtube')) {
      throw new Error('Invalid YouTube URL')
    }
    if (data.soundcloudUrl && !validateSocialUrl(data.soundcloudUrl, 'soundcloud')) {
      throw new Error('Invalid SoundCloud URL')
    }
    if (data.instagramUrl && !validateSocialUrl(data.instagramUrl, 'instagram')) {
      throw new Error('Invalid Instagram URL')
    }
    if (data.tiktokUrl && !validateSocialUrl(data.tiktokUrl, 'tiktok')) {
      throw new Error('Invalid TikTok URL')
    }
    if (data.facebookUrl && !validateSocialUrl(data.facebookUrl, 'facebook')) {
      throw new Error('Invalid Facebook URL')
    }
    
    const [song] = await db
      .insert(songs)
      .values({
        title: data.title,
        artist: data.artist,
        notes: data.notes || null,
        genres: data.genres || null,
        songLink: data.songLink || null,
        youtubeUrl: data.youtubeUrl || null,
        soundcloudUrl: data.soundcloudUrl || null,
        instagramUrl: data.instagramUrl || null,
        tiktokUrl: data.tiktokUrl || null,
        facebookUrl: data.facebookUrl || null,
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

export const updateSong = createServerFn({ method: 'POST' })
  .inputValidator((data: { 
    id: number
    title: string
    artist: string
    notes?: string
    genres?: string
    songLink?: string
    youtubeUrl?: string
    soundcloudUrl?: string
    instagramUrl?: string
    tiktokUrl?: string
    facebookUrl?: string
    submitterId: string
    isAdmin?: boolean
  }) => data)
  .handler(async ({ data }) => {
    // Fetch the song to verify ownership
    const [existingSong] = await db
      .select()
      .from(songs)
      .where(eq(songs.id, data.id))
      .limit(1)
    
    if (!existingSong) {
      throw new Error('Song not found')
    }
    
    // Only allow edit if admin or owner
    if (!data.isAdmin && existingSong.submitterId !== data.submitterId) {
      throw new Error('You can only edit your own songs')
    }
    
    // Validate song link if provided
    if (data.songLink) {
      const validation = isValidSongLink(data.songLink)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
    }
    
    // Validate social media URLs if provided
    if (data.youtubeUrl && !validateSocialUrl(data.youtubeUrl, 'youtube')) {
      throw new Error('Invalid YouTube URL')
    }
    if (data.soundcloudUrl && !validateSocialUrl(data.soundcloudUrl, 'soundcloud')) {
      throw new Error('Invalid SoundCloud URL')
    }
    if (data.instagramUrl && !validateSocialUrl(data.instagramUrl, 'instagram')) {
      throw new Error('Invalid Instagram URL')
    }
    if (data.tiktokUrl && !validateSocialUrl(data.tiktokUrl, 'tiktok')) {
      throw new Error('Invalid TikTok URL')
    }
    if (data.facebookUrl && !validateSocialUrl(data.facebookUrl, 'facebook')) {
      throw new Error('Invalid Facebook URL')
    }
    
    const [updated] = await db
      .update(songs)
      .set({
        title: data.title,
        artist: data.artist,
        notes: data.notes || null,
        genres: data.genres || null,
        songLink: data.songLink || null,
        youtubeUrl: data.youtubeUrl || null,
        soundcloudUrl: data.soundcloudUrl || null,
        instagramUrl: data.instagramUrl || null,
        tiktokUrl: data.tiktokUrl || null,
        facebookUrl: data.facebookUrl || null,
      })
      .where(eq(songs.id, data.id))
      .returning()
    
    return updated
  })

