import { useEffect, useState, useMemo } from 'react'
import { buildWheelLayout, selectWinner, type WheelSong, type WheelSegment } from '../lib/wheel-algorithm'

interface Song {
  id: number
  title: string
  artist: string
  points: number
  bananaStickers: number // count of banana stickers
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

interface DisplaySegment extends WheelSegment {
  color: string
}

export function SpinWheel({ songs, isSpinning, onSpinComplete }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0)
  const [hasSpun, setHasSpun] = useState(false)
  
  const shuffleSeed = useMemo(() => {
    return songs.reduce((acc, s) => acc + s.id, 0)
  }, [songs])

  // Convert songs to WheelSong format and build layout
  const wheelSongs: WheelSong[] = useMemo(() => 
    songs.map(s => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      points: s.points,
      bananaStickers: s.bananaStickers,
    })), [songs])

  const layout = useMemo(() => buildWheelLayout(wheelSongs, shuffleSeed), [wheelSongs, shuffleSeed])

  // Add colors to segments for display
  const displaySegments: DisplaySegment[] = useMemo(() => {
    let bananaColorIndex = 0
    let regularColorIndex = 0

    return layout.segments.map(seg => ({
      ...seg,
      color: seg.isBananaSection
        ? BANANA_COLORS[bananaColorIndex++ % BANANA_COLORS.length]
        : REGULAR_COLORS[regularColorIndex++ % REGULAR_COLORS.length],
    }))
  }, [layout.segments])

  // Handle spin logic
  useEffect(() => {
    if (isSpinning && !hasSpun && displaySegments.length > 0) {
      // Use the algorithm to select a winner
      const result = selectWinner(wheelSongs)
      
      if (!result) {
        console.error('Could not select winner')
        return
      }

      const { winner, fromBananaSection } = result
      
      // Find the winning segment
      const segmentPrefix = fromBananaSection ? 'banana' : 'points'
      const winningSeg = displaySegments.find(s => s.segmentId === `${segmentPrefix}-${winner.id}`)
      
      if (!winningSeg) {
        console.error('Could not find winning segment for song:', winner)
        return
      }
      
      // Calculate rotation to land on this segment
      // The pointer is at the top (-90 degrees / 270 degrees)
      // For segment at midAngle θ to be under pointer after rotation R:
      // θ + R ≡ 270 (mod 360)
      // R ≡ 270 - θ (mod 360)
      
      // Calculate the base rotation that aligns this segment with the pointer
      const baseRotation = 270 - winningSeg.midAngle
      
      // Normalize to 0-360
      const baseNormalized = ((baseRotation % 360) + 360) % 360
      
      // Current wheel position (normalized)
      const currentNormalized = ((rotation % 360) + 360) % 360
      
      // How much more do we need to rotate to reach the target?
      let deltaToTarget = baseNormalized - currentNormalized
      if (deltaToTarget <= 0) deltaToTarget += 360
      
      // Add full spins for visual effect (must be exact multiple of 360!)
      const numExtraSpins = Math.floor(5 + Math.random() * 4) // 5-8 full spins
      const extraSpins = numExtraSpins * 360
      
      const finalRotation = rotation + deltaToTarget + extraSpins
      
      // Debug log
      console.log('Spin debug:', {
        winner: winner.title,
        midAngle: winningSeg.midAngle,
        baseRotation,
        currentNormalized,
        deltaToTarget,
        extraSpins,
        finalRotation,
        finalMod360: finalRotation % 360,
        expectedPosition: (winningSeg.midAngle + finalRotation) % 360
      })
      
      setRotation(finalRotation)
      setHasSpun(true)

      // Find the original song object to return
      const originalSong = songs.find(s => s.id === winner.id)
      if (originalSong) {
        setTimeout(() => {
          onSpinComplete(originalSong)
        }, 4000)
      }
    }
  }, [isSpinning, hasSpun, displaySegments, wheelSongs, songs, rotation, onSpinComplete])

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
    const cx = 160
    const cy = 160
    
    // Normalize angle to 0-360
    const normalizedAngle = ((midAngle % 360) + 360) % 360
    
    // Determine if text would be upside down (between 90 and 270 degrees)
    const isBottomHalf = normalizedAngle > 90 && normalizedAngle < 270
    
    // For wide segments (> 30 degrees), use tangential text (along the arc)
    // For narrow segments, use radial text (along the radius)
    const isWideSegment = segmentAngle > 30
    
    const rad = (midAngle * Math.PI) / 180
    
    if (isWideSegment) {
      // Tangential text - positioned in the middle of the segment, along the arc
      const textRadius = 90
      const x = cx + textRadius * Math.cos(rad)
      const y = cy + textRadius * Math.sin(rad)
      
      // Rotate text to be tangent to the circle (perpendicular to radius)
      // Add 90 to make it perpendicular, flip if on bottom half
      const textRotation = isBottomHalf ? midAngle - 90 : midAngle + 90
      
      return { x, y, rotation: textRotation, anchor: 'middle' as const }
    } else {
      // Radial text - along the radius for narrow segments
      const textRadius = isBottomHalf ? 75 : 95
      const x = cx + textRadius * Math.cos(rad)
      const y = cy + textRadius * Math.sin(rad)
      
      // Text follows the radius - flip if on bottom half so it's always readable
      const textRotation = isBottomHalf ? midAngle + 180 : midAngle
      const anchor: 'start' | 'end' = isBottomHalf ? 'end' : 'start'
      
      return { x, y, rotation: textRotation, anchor }
    }
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
        {displaySegments.map((seg) => {
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
              {/* Song title - follows radius for easy debugging */}
              {showText && (
                <text
                  x={textPos.x}
                  y={textPos.y}
                  fill="#1f2937"
                  fontSize={seg.angle > 25 ? 10 : 8}
                  fontWeight="600"
                  textAnchor={textPos.anchor}
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
        {layout.hasBananaSection ? (
          <>
            <div className="flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-200 rounded text-yellow-800">
                <img src="/banana sticker.png" alt="🍌" className="w-4 h-4" /> 50% - weighted by banana count
              </span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="px-2 py-0.5 bg-gray-200 rounded text-gray-700">
                50% - weighted by points (all songs)
              </span>
            </div>
          </>
        ) : (
          <div>Segment size = probability (weighted by points)</div>
        )}
      </div>
    </div>
  )
}
