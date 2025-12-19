import { useEffect, useState, useMemo } from 'react'

interface Song {
  id: number
  title: string
  artist: string
  points: number
  bananaSticker: boolean
}

interface SpinWheelProps {
  songs: Song[]
  isSpinning: boolean
  onSpinComplete: (song: Song) => void
}

// Regular song colors - varied and colorful
const REGULAR_COLORS = [
  '#FF6B6B', // coral red
  '#4ECDC4', // teal
  '#45B7D1', // sky blue
  '#96CEB4', // sage green
  '#DDA0DD', // plum
  '#98D8C8', // mint
  '#BB8FCE', // lavender
  '#85C1E9', // light blue
  '#F8B500', // amber
  '#00CED1', // dark cyan
  '#FF8C94', // salmon
  '#77DD77', // pastel green
]

// Banana song colors - different shades of yellow/gold
const BANANA_COLORS = [
  '#FFE135', // bright yellow
  '#FFD700', // gold
  '#FFC300', // amber yellow
  '#FFDF00', // golden yellow
  '#F4D03F', // saffron
  '#F7DC6F', // pale gold
  '#FFEC8B', // light goldenrod
  '#FFE4B5', // moccasin
  '#FFEAA7', // soft yellow
  '#FFB347', // pastel orange
]

interface Segment {
  song: Song
  startAngle: number
  endAngle: number
  angle: number
  midAngle: number
  isBananaSection: boolean // true = in banana section of wheel
  color: string
  segmentId: string // unique id for segments (song can appear twice)
}

// Seeded random shuffle to keep order consistent during a session
const seededShuffle = <T,>(array: T[], seed: number): T[] => {
  const shuffled = [...array]
  let currentIndex = shuffled.length
  
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  
  while (currentIndex > 0) {
    const randomIndex = Math.floor(random() * currentIndex)
    currentIndex--
    ;[shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]]
  }
  
  return shuffled
}

export function SpinWheel({ songs, isSpinning, onSpinComplete }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0)
  const [hasSpun, setHasSpun] = useState(false)
  
  const shuffleSeed = useMemo(() => {
    return songs.reduce((acc, s) => acc + s.id, 0)
  }, [songs])

  // Banana songs (for banana section)
  const bananaSongs = useMemo(() => songs.filter(s => s.bananaSticker), [songs])
  
  // All songs go in the regular section (including banana songs)
  const allSongsForRegular = useMemo(() => songs, [songs])

  // Shuffled versions for wheel display
  const { shuffledBananaSongs, shuffledRegularSongs } = useMemo(() => {
    return {
      shuffledBananaSongs: seededShuffle(bananaSongs, shuffleSeed),
      shuffledRegularSongs: seededShuffle(allSongsForRegular, shuffleSeed + 1),
    }
  }, [bananaSongs, allSongsForRegular, shuffleSeed])

  // Build wheel segments
  // Banana section: only banana songs (yellow colors)
  // Regular section: ALL songs including banana songs (varied colors)
  const segments = useMemo(() => {
    const hasBanana = shuffledBananaSongs.length > 0
    const hasAny = shuffledRegularSongs.length > 0
    
    let bananaDegreesTotal = 0
    let regularDegreesTotal = 0
    
    if (hasBanana && hasAny) {
      bananaDegreesTotal = 180 // Banana songs get 50% in their own section
      regularDegreesTotal = 180 // All songs (including banana) share the other 50%
    } else if (hasAny) {
      regularDegreesTotal = 360 // No banana songs, everyone gets full wheel
    }
    
    const segs: Segment[] = []
    let currentAngle = -90

    // Add banana section segments (only banana songs, yellow colors)
    if (hasBanana && bananaDegreesTotal > 0) {
      const bananaPointsTotal = shuffledBananaSongs.reduce((sum, s) => sum + (s.points || 1), 0)
      
      shuffledBananaSongs.forEach((song, i) => {
        const songPoints = song.points || 1
        const angle = (songPoints / bananaPointsTotal) * bananaDegreesTotal
        
        segs.push({
          song,
          startAngle: currentAngle,
          endAngle: currentAngle + angle,
          angle,
          midAngle: currentAngle + angle / 2,
          isBananaSection: true,
          color: BANANA_COLORS[i % BANANA_COLORS.length],
          segmentId: `banana-${song.id}`,
        })
        
        currentAngle += angle
      })
    }

    // Add regular section segments (ALL songs, varied colors)
    if (hasAny && regularDegreesTotal > 0) {
      const regularPointsTotal = shuffledRegularSongs.reduce((sum, s) => sum + (s.points || 1), 0)
      
      shuffledRegularSongs.forEach((song, i) => {
        const songPoints = song.points || 1
        const angle = (songPoints / regularPointsTotal) * regularDegreesTotal
        
        segs.push({
          song,
          startAngle: currentAngle,
          endAngle: currentAngle + angle,
          angle,
          midAngle: currentAngle + angle / 2,
          isBananaSection: false,
          color: REGULAR_COLORS[i % REGULAR_COLORS.length],
          segmentId: `regular-${song.id}`,
        })
        
        currentAngle += angle
      })
    }
    
    return segs
  }, [shuffledBananaSongs, shuffledRegularSongs])

  // Handle spin logic
  useEffect(() => {
    if (isSpinning && !hasSpun && segments.length > 0) {
      const hasBanana = bananaSongs.length > 0
      
      // Step 1: Pick which pool (50/50 if banana songs exist)
      let selectedPool: Song[]
      let fromBananaSection: boolean
      
      if (hasBanana) {
        fromBananaSection = Math.random() < 0.5
        selectedPool = fromBananaSection ? bananaSongs : allSongsForRegular
      } else {
        fromBananaSection = false
        selectedPool = allSongsForRegular
      }
      
      // Step 2: Within the pool, pick based on points (weighted random)
      const poolPointsTotal = selectedPool.reduce((sum, s) => sum + (s.points || 1), 0)
      const randomPoint = Math.random() * poolPointsTotal
      let cumulative = 0
      let winner = selectedPool[0]
      
      for (const song of selectedPool) {
        cumulative += song.points || 1
        if (randomPoint <= cumulative) {
          winner = song
          break
        }
      }
      
      // Step 3: Find the winning segment (from the correct section)
      const segmentPrefix = fromBananaSection ? 'banana' : 'regular'
      const winningSeg = segments.find(s => s.segmentId === `${segmentPrefix}-${winner.id}`)
      
      if (!winningSeg) {
        console.error('Could not find winning segment for song:', winner)
        return
      }
      
      // Step 4: Calculate rotation to land on this segment
      const angleToTop = -90 - winningSeg.midAngle
      const extraSpins = (5 + Math.random() * 3) * 360
      const finalRotation = rotation + extraSpins + angleToTop
      
      setRotation(finalRotation)
      setHasSpun(true)

      setTimeout(() => {
        onSpinComplete(winner)
      }, 4000)
    }
  }, [isSpinning, hasSpun, segments, bananaSongs, allSongsForRegular, rotation, onSpinComplete])

  // Reset spin state
  useEffect(() => {
    if (!isSpinning) {
      setHasSpun(false)
    }
  }, [isSpinning])

  const truncateText = (text: string, angle: number) => {
    const maxLength = Math.max(5, Math.floor(angle / 15))
    if (text.length <= maxLength) return text
    return `${text.substring(0, maxLength - 1)}…`
  }

  const createSlicePath = (startAngle: number, endAngle: number) => {
    const radius = 150
    const cx = 160
    const cy = 160
    
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    
    const x1 = cx + radius * Math.cos(startRad)
    const y1 = cy + radius * Math.sin(startRad)
    const x2 = cx + radius * Math.cos(endRad)
    const y2 = cy + radius * Math.sin(endRad)
    
    const largeArc = (endAngle - startAngle) > 180 ? 1 : 0
    
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
  }

  const getTextPosition = (midAngle: number, segmentAngle: number) => {
    const textRadius = segmentAngle > 30 ? 85 : 100
    const cx = 160
    const cy = 160
    
    const rad = (midAngle * Math.PI) / 180
    const x = cx + textRadius * Math.cos(rad)
    const y = cy + textRadius * Math.sin(rad)
    
    let textRotation = midAngle + 90
    if (midAngle > 0 && midAngle < 180) {
      textRotation += 180
    }
    
    return { x, y, rotation: textRotation }
  }

  if (songs.length === 0) {
    return (
      <div className="flex items-center justify-center h-80">
        <p className="text-muted-foreground">No songs in queue to spin!</p>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
        <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-red-600 drop-shadow-lg" />
      </div>
      
      {/* Wheel */}
      <svg
        width="320"
        height="320"
        viewBox="0 0 320 320"
        className="drop-shadow-2xl"
        aria-label="Spin wheel showing song queue"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
        }}
      >
        <title>Spin wheel showing song queue</title>
        {/* Outer ring */}
        <circle cx="160" cy="160" r="158" fill="none" stroke="#374151" strokeWidth="4" />
        
        {/* Segments */}
        {segments.map((seg) => {
          const textPos = getTextPosition(seg.midAngle, seg.angle)
          const showText = seg.angle > 8
          
          return (
            <g key={seg.segmentId}>
              <path
                d={createSlicePath(seg.startAngle, seg.endAngle)}
                fill={seg.color}
                stroke="#fff"
                strokeWidth="2"
              />
              {/* Banana indicator for banana section */}
              {seg.isBananaSection && seg.angle > 15 && (
                <text
                  x={160 + 125 * Math.cos((seg.midAngle * Math.PI) / 180)}
                  y={160 + 125 * Math.sin((seg.midAngle * Math.PI) / 180)}
                  fontSize="12"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  🍌
                </text>
              )}
              {/* Song title */}
              {showText && (
                <text
                  x={textPos.x}
                  y={textPos.y}
                  fill="#1f2937"
                  fontSize={seg.angle > 25 ? 11 : 9}
                  fontWeight="600"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textPos.rotation}, ${textPos.x}, ${textPos.y})`}
                  className="pointer-events-none select-none"
                >
                  {truncateText(seg.song.title, seg.angle)}
                </text>
              )}
            </g>
          )
        })}
        
        {/* Center hub */}
        <circle cx="160" cy="160" r="25" fill="#1f2937" />
        <circle cx="160" cy="160" r="20" fill="#374151" />
        <circle cx="160" cy="160" r="8" fill="#6b7280" />
      </svg>
      
      {/* Legend */}
      <div className="mt-4 text-xs text-muted-foreground text-center space-y-1">
        <div>Segment size = probability (based on points)</div>
        {bananaSongs.length > 0 && (
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-200 rounded text-yellow-800">
              <img src="/banana sticker.png" alt="🍌" className="w-4 h-4" /> 50% (banana only)
            </span>
            <span>+</span>
            <span className="px-2 py-0.5 bg-gray-200 rounded text-gray-700">
              50% (everyone)
            </span>
          </div>
        )}
        {bananaSongs.length > 0 && (
          <div className="text-[10px] text-muted-foreground/70">
            Banana songs appear in both sections!
          </div>
        )}
      </div>
    </div>
  )
}
