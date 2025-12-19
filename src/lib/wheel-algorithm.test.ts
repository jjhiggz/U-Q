import { describe, it, expect } from 'vitest'
import {
  buildWheelLayout,
  selectWinner,
  weightedRandomSelect,
  seededShuffle,
  calculateProbabilities,
  type WheelSong,
} from './wheel-algorithm'

describe('Wheel Algorithm', () => {
  // Test data based on user's example:
  // Song 1: 1 banana sticker, 10 pts
  // Song 2: 2 banana stickers, 15 pts
  // Song 3: 3 banana stickers, 10 pts
  // Songs 4-100: 0 bananas, combined 970 pts (total 1005 pts)

  const createTestSongs = (): WheelSong[] => {
    const songs: WheelSong[] = [
      { id: 1, title: 'Song 1', artist: 'Artist 1', points: 10, bananaStickers: 1 },
      { id: 2, title: 'Song 2', artist: 'Artist 2', points: 15, bananaStickers: 2 },
      { id: 3, title: 'Song 3', artist: 'Artist 3', points: 10, bananaStickers: 3 },
    ]
    
    // Add 97 more songs with 10 points each (970 total for non-banana)
    for (let i = 4; i <= 100; i++) {
      songs.push({
        id: i,
        title: `Song ${i}`,
        artist: `Artist ${i}`,
        points: 10,
        bananaStickers: 0,
      })
    }
    
    return songs
  }

  describe('buildWheelLayout', () => {
    it('should have hasBananaSection=true when banana songs exist', () => {
      const songs = createTestSongs()
      const layout = buildWheelLayout(songs)
      
      expect(layout.hasBananaSection).toBe(true)
      expect(layout.totalBananas).toBe(6) // 1 + 2 + 3 = 6
      expect(layout.totalPoints).toBe(1005) // 10 + 15 + 10 + (97 * 10) = 1005
    })

    it('should have hasBananaSection=false when no banana songs exist', () => {
      const songs: WheelSong[] = [
        { id: 1, title: 'Song 1', artist: 'Artist 1', points: 10, bananaStickers: 0 },
        { id: 2, title: 'Song 2', artist: 'Artist 2', points: 20, bananaStickers: 0 },
      ]
      const layout = buildWheelLayout(songs)
      
      expect(layout.hasBananaSection).toBe(false)
      expect(layout.totalBananas).toBe(0)
    })

    it('should create separate segments for banana section and points section', () => {
      const songs = createTestSongs()
      const layout = buildWheelLayout(songs)
      
      const bananaSegments = layout.segments.filter(s => s.isBananaSection)
      const pointsSegments = layout.segments.filter(s => !s.isBananaSection)
      
      // Banana section should have 3 segments (songs 1, 2, 3)
      expect(bananaSegments.length).toBe(3)
      
      // Points section should have 100 segments (ALL songs)
      expect(pointsSegments.length).toBe(100)
    })

    it('should allocate 180 degrees to banana section', () => {
      const songs = createTestSongs()
      const layout = buildWheelLayout(songs)
      
      const bananaSegments = layout.segments.filter(s => s.isBananaSection)
      const bananaDegreesTotal = bananaSegments.reduce((sum, s) => sum + s.angle, 0)
      
      expect(bananaDegreesTotal).toBeCloseTo(180, 5)
    })

    it('should allocate 180 degrees to points section when bananas exist', () => {
      const songs = createTestSongs()
      const layout = buildWheelLayout(songs)
      
      const pointsSegments = layout.segments.filter(s => !s.isBananaSection)
      const pointsDegreesTotal = pointsSegments.reduce((sum, s) => sum + s.angle, 0)
      
      expect(pointsDegreesTotal).toBeCloseTo(180, 5)
    })

    it('should allocate 360 degrees to points section when no bananas exist', () => {
      const songs: WheelSong[] = [
        { id: 1, title: 'Song 1', artist: 'Artist 1', points: 10, bananaStickers: 0 },
        { id: 2, title: 'Song 2', artist: 'Artist 2', points: 20, bananaStickers: 0 },
      ]
      const layout = buildWheelLayout(songs)
      
      const pointsDegreesTotal = layout.segments.reduce((sum, s) => sum + s.angle, 0)
      expect(pointsDegreesTotal).toBeCloseTo(360, 5)
    })

    it('should weight banana section by banana count, not points', () => {
      const songs = createTestSongs()
      const layout = buildWheelLayout(songs, 12345) // Use seed for deterministic order
      
      const bananaSegments = layout.segments.filter(s => s.isBananaSection)
      
      // Song 1: 1 banana = 1/6 of 180 = 30 degrees
      // Song 2: 2 bananas = 2/6 of 180 = 60 degrees
      // Song 3: 3 bananas = 3/6 of 180 = 90 degrees
      
      const song1Segment = bananaSegments.find(s => s.song.id === 1)
      const song2Segment = bananaSegments.find(s => s.song.id === 2)
      const song3Segment = bananaSegments.find(s => s.song.id === 3)
      
      expect(song1Segment?.angle).toBeCloseTo(30, 1)
      expect(song2Segment?.angle).toBeCloseTo(60, 1)
      expect(song3Segment?.angle).toBeCloseTo(90, 1)
    })

    it('should weight points section by points', () => {
      const songs: WheelSong[] = [
        { id: 1, title: 'Song 1', artist: 'Artist 1', points: 10, bananaStickers: 1 },
        { id: 2, title: 'Song 2', artist: 'Artist 2', points: 30, bananaStickers: 0 },
      ]
      const layout = buildWheelLayout(songs, 12345)
      
      const pointsSegments = layout.segments.filter(s => !s.isBananaSection)
      
      // Total points = 40, so:
      // Song 1: 10/40 of 180 = 45 degrees
      // Song 2: 30/40 of 180 = 135 degrees
      
      const song1Segment = pointsSegments.find(s => s.song.id === 1)
      const song2Segment = pointsSegments.find(s => s.song.id === 2)
      
      expect(song1Segment?.angle).toBeCloseTo(45, 1)
      expect(song2Segment?.angle).toBeCloseTo(135, 1)
    })
  })

  describe('selectWinner', () => {
    it('should select from banana section when randomValue < 0.5 and bananas exist', () => {
      const songs = createTestSongs()
      
      // Use randomValue = 0.3 to force banana section selection
      // Use randomValueWithinSection = 0.5 to pick middle of distribution
      const result = selectWinner(songs, 0.3, 0.5)
      
      expect(result).not.toBeNull()
      expect(result?.fromBananaSection).toBe(true)
      expect(result?.winner.bananaStickers).toBeGreaterThan(0)
    })

    it('should select from points section when randomValue >= 0.5 and bananas exist', () => {
      const songs = createTestSongs()
      
      // Use randomValue = 0.7 to force points section selection
      const result = selectWinner(songs, 0.7, 0.5)
      
      expect(result).not.toBeNull()
      expect(result?.fromBananaSection).toBe(false)
    })

    it('should only select from points section when no bananas exist', () => {
      const songs: WheelSong[] = [
        { id: 1, title: 'Song 1', artist: 'Artist 1', points: 10, bananaStickers: 0 },
        { id: 2, title: 'Song 2', artist: 'Artist 2', points: 20, bananaStickers: 0 },
      ]
      
      // Even with randomValue < 0.5, should not select from banana section
      const result = selectWinner(songs, 0.3, 0.5)
      
      expect(result).not.toBeNull()
      expect(result?.fromBananaSection).toBe(false)
    })

    it('should weight banana section selection by banana count', () => {
      const songs: WheelSong[] = [
        { id: 1, title: 'Song 1', artist: 'Artist 1', points: 100, bananaStickers: 1 },
        { id: 2, title: 'Song 2', artist: 'Artist 2', points: 1, bananaStickers: 99 },
      ]
      // Total bananas = 100
      // Song 1: 1/100 = 1%
      // Song 2: 99/100 = 99%
      
      // With randomValue 0.3 (banana section) and within-section value 0.5,
      // should select song 2 (since 0.5 * 100 = 50 which is > 1)
      const result = selectWinner(songs, 0.3, 0.5)
      
      expect(result?.winner.id).toBe(2)
    })

    it('should weight points section selection by points', () => {
      const songs: WheelSong[] = [
        { id: 1, title: 'Song 1', artist: 'Artist 1', points: 1, bananaStickers: 0 },
        { id: 2, title: 'Song 2', artist: 'Artist 2', points: 99, bananaStickers: 0 },
      ]
      // Total points = 100
      // Song 1: 1/100 = 1%
      // Song 2: 99/100 = 99%
      
      // With within-section value 0.5, should select song 2
      const result = selectWinner(songs, 0.9, 0.5)
      
      expect(result?.winner.id).toBe(2)
    })
  })

  describe('calculateProbabilities', () => {
    it('should calculate correct probabilities for the example scenario', () => {
      const songs = createTestSongs()
      const probs = calculateProbabilities(songs)
      
      // Song 1: 1 banana, 10 points
      // Banana section (50%): 1/6 of 50% = 8.33%
      // Points section (50%): 10/1005 of 50% = 0.497%
      // Total: ~8.83%
      const song1Prob = probs.get(1)
      expect(song1Prob?.bananaProbability).toBeCloseTo(0.0833, 2)
      expect(song1Prob?.pointsProbability).toBeCloseTo(0.00497, 3)
      expect(song1Prob?.totalProbability).toBeCloseTo(0.0883, 2)

      // Song 2: 2 bananas, 15 points
      // Banana section (50%): 2/6 of 50% = 16.67%
      // Points section (50%): 15/1005 of 50% = 0.746%
      // Total: ~17.41%
      const song2Prob = probs.get(2)
      expect(song2Prob?.bananaProbability).toBeCloseTo(0.1667, 2)
      expect(song2Prob?.pointsProbability).toBeCloseTo(0.00746, 3)
      expect(song2Prob?.totalProbability).toBeCloseTo(0.1741, 2)

      // Song 3: 3 bananas, 10 points
      // Banana section (50%): 3/6 of 50% = 25%
      // Points section (50%): 10/1005 of 50% = 0.497%
      // Total: ~25.5%
      const song3Prob = probs.get(3)
      expect(song3Prob?.bananaProbability).toBeCloseTo(0.25, 2)
      expect(song3Prob?.pointsProbability).toBeCloseTo(0.00497, 3)
      expect(song3Prob?.totalProbability).toBeCloseTo(0.255, 2)

      // Non-banana song (e.g., Song 4): 0 bananas, 10 points
      // Banana section: 0%
      // Points section (50%): 10/1005 of 50% = 0.497%
      const song4Prob = probs.get(4)
      expect(song4Prob?.bananaProbability).toBe(0)
      expect(song4Prob?.pointsProbability).toBeCloseTo(0.00497, 3)
      expect(song4Prob?.totalProbability).toBeCloseTo(0.00497, 3)
    })

    it('should give 100% total probability when no bananas exist', () => {
      const songs: WheelSong[] = [
        { id: 1, title: 'Song 1', artist: 'Artist 1', points: 10, bananaStickers: 0 },
        { id: 2, title: 'Song 2', artist: 'Artist 2', points: 30, bananaStickers: 0 },
      ]
      const probs = calculateProbabilities(songs)
      
      const song1Prob = probs.get(1)
      const song2Prob = probs.get(2)
      
      // Without bananas, points section is 100%
      // Song 1: 10/40 = 25%
      // Song 2: 30/40 = 75%
      expect(song1Prob?.totalProbability).toBeCloseTo(0.25, 3)
      expect(song2Prob?.totalProbability).toBeCloseTo(0.75, 3)
      
      // Total should be 100%
      const total = (song1Prob?.totalProbability ?? 0) + (song2Prob?.totalProbability ?? 0)
      expect(total).toBeCloseTo(1.0, 3)
    })
  })

  describe('weightedRandomSelect', () => {
    it('should select items based on weight', () => {
      const items = [
        { name: 'A', weight: 1 },
        { name: 'B', weight: 9 },
      ]
      
      // With random value 0.05 (5% through), should select A (10% of weight)
      const resultA = weightedRandomSelect(items, i => i.weight, 0.05)
      expect(resultA?.name).toBe('A')
      
      // With random value 0.5 (50% through), should select B
      const resultB = weightedRandomSelect(items, i => i.weight, 0.5)
      expect(resultB?.name).toBe('B')
    })

    it('should return null for empty array', () => {
      const result = weightedRandomSelect([], (i: number) => i, 0.5)
      expect(result).toBeNull()
    })

    it('should handle single item', () => {
      const items = [{ name: 'Only', weight: 5 }]
      const result = weightedRandomSelect(items, i => i.weight, 0.999)
      expect(result?.name).toBe('Only')
    })
  })

  describe('seededShuffle', () => {
    it('should produce consistent results with same seed', () => {
      const items = [1, 2, 3, 4, 5]
      
      const result1 = seededShuffle(items, 12345)
      const result2 = seededShuffle(items, 12345)
      
      expect(result1).toEqual(result2)
    })

    it('should produce different results with different seeds', () => {
      const items = [1, 2, 3, 4, 5]
      
      const result1 = seededShuffle(items, 12345)
      const result2 = seededShuffle(items, 54321)
      
      expect(result1).not.toEqual(result2)
    })

    it('should not modify original array', () => {
      const items = [1, 2, 3, 4, 5]
      const original = [...items]
      
      seededShuffle(items, 12345)
      
      expect(items).toEqual(original)
    })

    it('should contain all original items', () => {
      const items = [1, 2, 3, 4, 5]
      const shuffled = seededShuffle(items, 12345)
      
      expect(shuffled.sort()).toEqual(items.sort())
    })
  })

  describe('Statistical distribution tests', () => {
    it('should respect 50/50 split between banana and points sections over many iterations', () => {
      const songs: WheelSong[] = [
        { id: 1, title: 'Banana', artist: 'B', points: 10, bananaStickers: 1 },
        { id: 2, title: 'Regular', artist: 'R', points: 10, bananaStickers: 0 },
      ]
      
      let bananaCount = 0
      let pointsCount = 0
      const iterations = 10000
      
      for (let i = 0; i < iterations; i++) {
        const result = selectWinner(songs)
        if (result?.fromBananaSection) {
          bananaCount++
        } else {
          pointsCount++
        }
      }
      
      const bananaRatio = bananaCount / iterations
      const pointsRatio = pointsCount / iterations
      
      // Should be approximately 50/50 with some tolerance
      expect(bananaRatio).toBeGreaterThan(0.45)
      expect(bananaRatio).toBeLessThan(0.55)
      expect(pointsRatio).toBeGreaterThan(0.45)
      expect(pointsRatio).toBeLessThan(0.55)
    })

    it('should weight banana section by banana count over many iterations', () => {
      const songs: WheelSong[] = [
        { id: 1, title: 'Song 1', artist: 'A', points: 100, bananaStickers: 1 }, // 10% of bananas
        { id: 2, title: 'Song 2', artist: 'B', points: 100, bananaStickers: 9 }, // 90% of bananas
      ]
      
      let song1BananaWins = 0
      let song2BananaWins = 0
      const iterations = 10000
      
      for (let i = 0; i < iterations; i++) {
        // Force banana section selection
        const result = selectWinner(songs, 0.3)
        if (result?.winner.id === 1) {
          song1BananaWins++
        } else {
          song2BananaWins++
        }
      }
      
      const song1Ratio = song1BananaWins / iterations
      const song2Ratio = song2BananaWins / iterations
      
      // Song 1 should get ~10% (1/10 bananas)
      // Song 2 should get ~90% (9/10 bananas)
      expect(song1Ratio).toBeGreaterThan(0.05)
      expect(song1Ratio).toBeLessThan(0.15)
      expect(song2Ratio).toBeGreaterThan(0.85)
      expect(song2Ratio).toBeLessThan(0.95)
    })

    it('should weight points section by points over many iterations', () => {
      const songs: WheelSong[] = [
        { id: 1, title: 'Song 1', artist: 'A', points: 10, bananaStickers: 0 }, // 10% of points
        { id: 2, title: 'Song 2', artist: 'B', points: 90, bananaStickers: 0 }, // 90% of points
      ]
      
      let song1Wins = 0
      let song2Wins = 0
      const iterations = 10000
      
      for (let i = 0; i < iterations; i++) {
        const result = selectWinner(songs)
        if (result?.winner.id === 1) {
          song1Wins++
        } else {
          song2Wins++
        }
      }
      
      const song1Ratio = song1Wins / iterations
      const song2Ratio = song2Wins / iterations
      
      // Song 1 should get ~10% (10/100 points)
      // Song 2 should get ~90% (90/100 points)
      expect(song1Ratio).toBeGreaterThan(0.05)
      expect(song1Ratio).toBeLessThan(0.15)
      expect(song2Ratio).toBeGreaterThan(0.85)
      expect(song2Ratio).toBeLessThan(0.95)
    })
  })

  describe('Edge cases', () => {
    it('should handle single song with banana', () => {
      const songs: WheelSong[] = [
        { id: 1, title: 'Only Song', artist: 'A', points: 10, bananaStickers: 1 },
      ]
      
      const layout = buildWheelLayout(songs)
      const result = selectWinner(songs)
      
      expect(layout.segments.length).toBe(2) // One banana segment, one points segment
      expect(result?.winner.id).toBe(1)
    })

    it('should handle single song without banana', () => {
      const songs: WheelSong[] = [
        { id: 1, title: 'Only Song', artist: 'A', points: 10, bananaStickers: 0 },
      ]
      
      const layout = buildWheelLayout(songs)
      const result = selectWinner(songs)
      
      expect(layout.segments.length).toBe(1) // Only points segment
      expect(layout.hasBananaSection).toBe(false)
      expect(result?.winner.id).toBe(1)
    })

    it('should handle empty song list', () => {
      const layout = buildWheelLayout([])
      const result = selectWinner([])
      
      expect(layout.segments.length).toBe(0)
      expect(layout.hasBananaSection).toBe(false)
      expect(result).toBeNull()
    })

    it('should handle all songs having bananas', () => {
      const songs: WheelSong[] = [
        { id: 1, title: 'Song 1', artist: 'A', points: 10, bananaStickers: 1 },
        { id: 2, title: 'Song 2', artist: 'B', points: 20, bananaStickers: 2 },
      ]
      
      const layout = buildWheelLayout(songs)
      
      // Banana section should have 2 segments
      const bananaSegments = layout.segments.filter(s => s.isBananaSection)
      expect(bananaSegments.length).toBe(2)
      
      // Points section should also have 2 segments (all songs appear there)
      const pointsSegments = layout.segments.filter(s => !s.isBananaSection)
      expect(pointsSegments.length).toBe(2)
    })

    it('should handle songs with 0 points (default to 1)', () => {
      const songs: WheelSong[] = [
        { id: 1, title: 'Song 1', artist: 'A', points: 0, bananaStickers: 0 },
        { id: 2, title: 'Song 2', artist: 'B', points: 0, bananaStickers: 0 },
      ]
      
      const probs = calculateProbabilities(songs)
      
      // Each song should get 50% when both have 0 points (treated as 1)
      expect(probs.get(1)?.totalProbability).toBeCloseTo(0.5, 3)
      expect(probs.get(2)?.totalProbability).toBeCloseTo(0.5, 3)
    })
  })
})

