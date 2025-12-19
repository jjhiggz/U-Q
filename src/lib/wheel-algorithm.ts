/**
 * Spin Wheel Algorithm
 * 
 * The wheel is divided into two sections when banana stickers exist:
 * 
 * 1. BANANA SECTION (50% of wheel, 180 degrees)
 *    - Only songs with banana stickers appear here
 *    - Weighted by banana sticker COUNT (not points)
 *    - Song's slice = (song's bananas / total bananas) * 180 degrees
 * 
 * 2. POINTS SECTION (50% of wheel, 180 degrees) 
 *    - ALL songs appear here (including banana songs)
 *    - Weighted by points
 *    - Song's slice = (song's points / total points) * 180 degrees
 * 
 * When no banana stickers exist, the entire wheel (360 degrees) is the points section.
 * 
 * Selection process:
 * 1. If banana songs exist: 50% chance to pick from banana section, 50% from points section
 * 2. Within banana section: weighted random by banana count
 * 3. Within points section: weighted random by points
 */

export interface WheelSong {
  id: number
  title: string
  artist: string
  points: number
  bananaStickers: number // count of banana stickers (0 = no banana)
}

export interface WheelSegment {
  song: WheelSong
  startAngle: number
  endAngle: number
  angle: number
  midAngle: number
  isBananaSection: boolean
  segmentId: string
}

export interface WheelLayout {
  segments: WheelSegment[]
  hasBananaSection: boolean
  totalBananas: number
  totalPoints: number
}

/**
 * Calculate the wheel layout with segments for all songs.
 * Songs with banana stickers appear twice: once in banana section, once in points section.
 * Songs without banana stickers only appear in points section.
 */
export const buildWheelLayout = (songs: WheelSong[], shuffleSeed?: number): WheelLayout => {
  if (songs.length === 0) {
    return { segments: [], hasBananaSection: false, totalBananas: 0, totalPoints: 0 }
  }

  const bananaSongs = songs.filter(s => s.bananaStickers > 0)
  const totalBananas = bananaSongs.reduce((sum, s) => sum + s.bananaStickers, 0)
  const totalPoints = songs.reduce((sum, s) => sum + (s.points || 1), 0)
  const hasBananaSection = totalBananas > 0

  // Shuffle songs for display (keeps order consistent within session)
  const shuffledBananaSongs = shuffleSeed !== undefined 
    ? seededShuffle(bananaSongs, shuffleSeed)
    : bananaSongs
  const shuffledAllSongs = shuffleSeed !== undefined
    ? seededShuffle(songs, shuffleSeed + 1)
    : songs

  const segments: WheelSegment[] = []
  let currentAngle = -90 // Start from top of wheel

  // BANANA SECTION: 180 degrees (only if banana songs exist)
  if (hasBananaSection) {
    const bananaDegreesTotal = 180

    for (const song of shuffledBananaSongs) {
      // Weight by banana count, not points
      const angle = (song.bananaStickers / totalBananas) * bananaDegreesTotal

      segments.push({
        song,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        angle,
        midAngle: currentAngle + angle / 2,
        isBananaSection: true,
        segmentId: `banana-${song.id}`,
      })

      currentAngle += angle
    }
  }

  // POINTS SECTION: ALL songs compete (180 degrees if bananas exist, 360 if not)
  const pointsDegreesTotal = hasBananaSection ? 180 : 360

  for (const song of shuffledAllSongs) {
    const songPoints = song.points || 1
    const angle = (songPoints / totalPoints) * pointsDegreesTotal

    segments.push({
      song,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      angle,
      midAngle: currentAngle + angle / 2,
      isBananaSection: false,
      segmentId: `points-${song.id}`,
    })

    currentAngle += angle
  }

  return { segments, hasBananaSection, totalBananas, totalPoints }
}

/**
 * Select a winner from the wheel.
 * 
 * @param songs - Array of songs to pick from
 * @param randomValue - Optional random value between 0 and 1 for section selection (testing)
 * @param randomValueWithinSection - Optional random value for weighted selection within section (testing)
 * @returns The winning song and whether it was from banana section
 */
export const selectWinner = (
  songs: WheelSong[],
  randomValue?: number,
  randomValueWithinSection?: number
): { winner: WheelSong; fromBananaSection: boolean } | null => {
  if (songs.length === 0) return null

  const bananaSongs = songs.filter(s => s.bananaStickers > 0)
  const totalBananas = bananaSongs.reduce((sum, s) => sum + s.bananaStickers, 0)
  const hasBananaSection = totalBananas > 0

  const rand1 = randomValue ?? Math.random()
  const rand2 = randomValueWithinSection ?? Math.random()

  // Step 1: Pick which section (50/50 if banana songs exist)
  const fromBananaSection = hasBananaSection && rand1 < 0.5

  if (fromBananaSection) {
    // Step 2a: Within banana section, pick based on banana count (weighted random)
    const winner = weightedRandomSelect(bananaSongs, s => s.bananaStickers, rand2)
    return winner ? { winner, fromBananaSection: true } : null
  }
  
  // Step 2b: Within points section, pick based on points (weighted random, ALL songs)
  const winner = weightedRandomSelect(songs, s => s.points || 1, rand2)
  return winner ? { winner, fromBananaSection: false } : null
}

/**
 * Weighted random selection from an array.
 * 
 * @param items - Array of items to select from
 * @param getWeight - Function to get weight for each item
 * @param randomValue - Random value between 0 and 1
 * @returns The selected item
 */
export const weightedRandomSelect = <T>(
  items: T[],
  getWeight: (item: T) => number,
  randomValue: number
): T | null => {
  if (items.length === 0) return null
  
  const totalWeight = items.reduce((sum, item) => sum + getWeight(item), 0)
  if (totalWeight === 0) return items[0]

  const targetWeight = randomValue * totalWeight
  let cumulative = 0

  for (const item of items) {
    cumulative += getWeight(item)
    if (targetWeight <= cumulative) {
      return item
    }
  }

  // Fallback to last item (shouldn't happen with valid random values)
  return items[items.length - 1]
}

/**
 * Seeded random shuffle for consistent ordering within a session.
 */
export const seededShuffle = <T>(array: T[], seed: number): T[] => {
  const shuffled = [...array]
  let currentIndex = shuffled.length
  let currentSeed = seed

  const random = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280
    return currentSeed / 233280
  }

  while (currentIndex > 0) {
    const randomIndex = Math.floor(random() * currentIndex)
    currentIndex--
    ;[shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]]
  }

  return shuffled
}

/**
 * Calculate expected probabilities for each song in the wheel.
 * Useful for testing and documentation.
 */
export const calculateProbabilities = (songs: WheelSong[]): Map<number, { bananaProbability: number; pointsProbability: number; totalProbability: number }> => {
  const result = new Map<number, { bananaProbability: number; pointsProbability: number; totalProbability: number }>()
  
  const bananaSongs = songs.filter(s => s.bananaStickers > 0)
  const totalBananas = bananaSongs.reduce((sum, s) => sum + s.bananaStickers, 0)
  const totalPoints = songs.reduce((sum, s) => sum + (s.points || 1), 0)
  const hasBananaSection = totalBananas > 0

  for (const song of songs) {
    const bananaProbability = hasBananaSection && song.bananaStickers > 0
      ? 0.5 * (song.bananaStickers / totalBananas) // 50% chance to be in banana section * share of banana section
      : 0

    const pointsProbability = hasBananaSection
      ? 0.5 * ((song.points || 1) / totalPoints) // 50% chance to be in points section * share of points section
      : (song.points || 1) / totalPoints // 100% of wheel is points section

    result.set(song.id, {
      bananaProbability,
      pointsProbability,
      totalProbability: bananaProbability + pointsProbability,
    })
  }

  return result
}

