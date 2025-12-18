import { useEffect, useState, useMemo } from 'react'

interface Song {
  id: number
  title: string
  artist: string
  points: number
}

interface SpinWheelProps {
  songs: Song[]
  isSpinning: boolean
  onSpinComplete: (song: Song) => void
}

const COLORS = [
  '#FF6B6B', // coral red
  '#4ECDC4', // teal
  '#45B7D1', // sky blue
  '#96CEB4', // sage green
  '#FFEAA7', // soft yellow
  '#DDA0DD', // plum
  '#98D8C8', // mint
  '#F7DC6F', // gold
  '#BB8FCE', // lavender
  '#85C1E9', // light blue
  '#F8B500', // amber
  '#00CED1', // dark cyan
]

export function SpinWheel({ songs, isSpinning, onSpinComplete }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0)
  const [hasSpun, setHasSpun] = useState(false)

  // Calculate total points and segment data
  const { totalPoints, segments } = useMemo(() => {
    const total = songs.reduce((sum, song) => sum + (song.points || 1), 0)
    let currentAngle = -90 // Start from top
    
    const segs = songs.map((song, index) => {
      const points = song.points || 1
      const angle = (points / total) * 360
      const startAngle = currentAngle
      const endAngle = currentAngle + angle
      currentAngle = endAngle
      
      return {
        song,
        index,
        startAngle,
        endAngle,
        angle,
        midAngle: startAngle + angle / 2,
      }
    })
    
    return { totalPoints: total, segments: segs }
  }, [songs])

  useEffect(() => {
    if (isSpinning && !hasSpun && songs.length > 0) {
      // Weighted random selection based on points
      const random = Math.random() * totalPoints
      let cumulative = 0
      let winningIndex = 0
      
      for (let i = 0; i < songs.length; i++) {
        cumulative += songs[i].points || 1
        if (random <= cumulative) {
          winningIndex = i
          break
        }
      }
      
      const winningSeg = segments[winningIndex]
      
      // Calculate target angle to land on this segment
      // The pointer is at top (0 degrees visual = -90 in our system)
      // We need to rotate so the segment's midpoint is at the top
      const targetAngle = -winningSeg.midAngle - 90
      
      // Add multiple full rotations for visual effect (5-8 spins)
      const fullRotations = (5 + Math.random() * 3) * 360
      const finalRotation = rotation + fullRotations + targetAngle - (rotation % 360)
      
      setRotation(finalRotation)
      setHasSpun(true)

      // Wait for animation to complete, then trigger callback
      setTimeout(() => {
        onSpinComplete(songs[winningIndex])
      }, 4000)
    }
  }, [isSpinning, hasSpun, songs, segments, totalPoints, rotation, onSpinComplete])

  // Reset when not spinning
  useEffect(() => {
    if (!isSpinning) {
      setHasSpun(false)
    }
  }, [isSpinning])

  // Truncate text to fit in segment
  const truncateText = (text: string, angle: number) => {
    // Smaller segments get shorter text
    const maxLength = Math.max(5, Math.floor(angle / 15))
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 1) + '…'
  }

  // Create pie slice path with variable angles
  const createSlicePath = (startAngle: number, endAngle: number) => {
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    
    const radius = 150
    const centerX = 160
    const centerY = 160
    
    const x1 = centerX + radius * Math.cos(startRad)
    const y1 = centerY + radius * Math.sin(startRad)
    const x2 = centerX + radius * Math.cos(endRad)
    const y2 = centerY + radius * Math.sin(endRad)
    
    const largeArc = (endAngle - startAngle) > 180 ? 1 : 0
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
  }

  // Calculate text position for each segment
  const getTextTransform = (midAngle: number, segmentAngle: number) => {
    // Place text closer to edge for better readability
    const textRadius = segmentAngle > 30 ? 85 : 100
    const centerX = 160
    const centerY = 160
    
    const rad = (midAngle * Math.PI) / 180
    const x = centerX + textRadius * Math.cos(rad)
    const y = centerY + textRadius * Math.sin(rad)
    
    // Rotate text to be readable
    let textRotation = midAngle + 90
    // Flip text if it would be upside down
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
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
        }}
      >
        {/* Outer ring */}
        <circle cx="160" cy="160" r="158" fill="none" stroke="#374151" strokeWidth="4" />
        
        {/* Segments - sized by points */}
        {segments.map((seg) => {
          const textPos = getTextTransform(seg.midAngle, seg.angle)
          const showText = seg.angle > 8 // Only show text if segment is big enough
          
          return (
            <g key={seg.song.id}>
              <path
                d={createSlicePath(seg.startAngle, seg.endAngle)}
                fill={COLORS[seg.index % COLORS.length]}
                stroke="#fff"
                strokeWidth="2"
              />
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
        
        {/* Center circle */}
        <circle cx="160" cy="160" r="25" fill="#1f2937" />
        <circle cx="160" cy="160" r="20" fill="#374151" />
        <circle cx="160" cy="160" r="8" fill="#6b7280" />
      </svg>
      
      {/* Points legend */}
      <div className="mt-4 text-xs text-muted-foreground text-center">
        Segment size = probability (based on points)
      </div>
    </div>
  )
}
