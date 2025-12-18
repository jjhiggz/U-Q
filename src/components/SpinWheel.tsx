import { useEffect, useState } from 'react'

interface Song {
  id: number
  title: string
  artist: string
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

  const numSegments = songs.length
  const segmentAngle = 360 / numSegments

  useEffect(() => {
    if (isSpinning && !hasSpun) {
      // Calculate random winning index
      const winningIndex = Math.floor(Math.random() * numSegments)
      
      // Calculate the rotation needed to land on the winning segment
      // We want the pointer (at top, 0 degrees) to point to the middle of the winning segment
      // Segments are drawn starting from the right (3 o'clock position)
      // So we need to rotate to bring the winning segment to the top
      const segmentMiddle = winningIndex * segmentAngle + segmentAngle / 2
      
      // We want the segment to end up at the top (270 degrees in standard position, but our pointer is at top)
      // The wheel rotates clockwise, so we subtract the segment position
      const targetAngle = 360 - segmentMiddle + 90 // +90 to account for pointer at top
      
      // Add multiple full rotations for visual effect (5-8 spins)
      const fullRotations = (5 + Math.random() * 3) * 360
      const finalRotation = rotation + fullRotations + targetAngle
      
      setRotation(finalRotation)
      setHasSpun(true)

      // Wait for animation to complete, then trigger callback
      setTimeout(() => {
        onSpinComplete(songs[winningIndex])
      }, 4000) // Match the CSS transition duration
    }
  }, [isSpinning, hasSpun, songs, numSegments, segmentAngle, rotation, onSpinComplete])

  // Reset when not spinning
  useEffect(() => {
    if (!isSpinning) {
      setHasSpun(false)
    }
  }, [isSpinning])

  // Truncate text to fit in segment
  const truncateText = (text: string, maxLength: number = 15) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 2) + '...'
  }

  // Create pie slice path
  const createSlicePath = (index: number) => {
    const startAngle = index * segmentAngle - 90 // Start from top
    const endAngle = startAngle + segmentAngle
    
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    
    const radius = 150
    const centerX = 160
    const centerY = 160
    
    const x1 = centerX + radius * Math.cos(startRad)
    const y1 = centerY + radius * Math.sin(startRad)
    const x2 = centerX + radius * Math.cos(endRad)
    const y2 = centerY + radius * Math.sin(endRad)
    
    const largeArc = segmentAngle > 180 ? 1 : 0
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
  }

  // Calculate text position and rotation for each segment
  const getTextTransform = (index: number) => {
    const angle = index * segmentAngle + segmentAngle / 2 - 90
    const radius = 90 // Distance from center for text
    const centerX = 160
    const centerY = 160
    
    const rad = (angle * Math.PI) / 180
    const x = centerX + radius * Math.cos(rad)
    const y = centerY + radius * Math.sin(rad)
    
    // Rotate text to be readable
    let textRotation = angle + 90
    // Flip text if it would be upside down
    if (angle > 0 && angle < 180) {
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
    <div className="relative flex items-center justify-center">
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
        
        {/* Segments */}
        {songs.map((song, index) => {
          const textPos = getTextTransform(index)
          return (
            <g key={song.id}>
              <path
                d={createSlicePath(index)}
                fill={COLORS[index % COLORS.length]}
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                x={textPos.x}
                y={textPos.y}
                fill="#1f2937"
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${textPos.rotation}, ${textPos.x}, ${textPos.y})`}
                className="pointer-events-none select-none"
              >
                {truncateText(song.title)}
              </text>
            </g>
          )
        })}
        
        {/* Center circle */}
        <circle cx="160" cy="160" r="25" fill="#1f2937" />
        <circle cx="160" cy="160" r="20" fill="#374151" />
        <circle cx="160" cy="160" r="8" fill="#6b7280" />
      </svg>
    </div>
  )
}

