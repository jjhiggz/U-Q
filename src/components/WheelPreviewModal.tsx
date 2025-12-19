import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Song {
  id: number
  title: string
  artist: string
  points: number
  bananaStickers: number
}

interface WheelPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  song: Song | null
  allSongs: Song[]
}

const HIGHLIGHTED_COLOR = '#8B5CF6' // Purple for highlighted song
const BANANA_HIGHLIGHTED_COLOR = '#F59E0B' // Amber for highlighted banana song
const GRAYED_COLOR = '#E5E7EB' // Gray for other songs

export function WheelPreviewModal({
  open,
  onOpenChange,
  song,
  allSongs,
}: WheelPreviewModalProps) {
  if (!song) return null

  const bananaSongs = allSongs.filter(s => s.bananaStickers > 0)
  const hasBanana = bananaSongs.length > 0
  
  // Calculate degrees for each section
  // Banana section: only banana songs
  // Regular section: ALL songs (including banana songs)
  let bananaSectionDegrees = 0
  let regularSectionDegrees = 0
  
  if (hasBanana) {
    bananaSectionDegrees = 180
    regularSectionDegrees = 180
  } else {
    regularSectionDegrees = 360
  }

  // Build segments
  interface Segment {
    song: Song
    startAngle: number
    endAngle: number
    isHighlighted: boolean
    isBananaSection: boolean
    segmentId: string
  }
  
  const segments: Segment[] = []
  let currentAngle = -90

  // Banana section segments (only banana songs) - weighted by banana COUNT, not points
  if (hasBanana && bananaSectionDegrees > 0) {
    const totalBananaCount = bananaSongs.reduce((sum, s) => sum + s.bananaStickers, 0)
    
    bananaSongs.forEach((s) => {
      const angle = (s.bananaStickers / totalBananaCount) * bananaSectionDegrees
      
      segments.push({
        song: s,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        isHighlighted: s.id === song.id,
        isBananaSection: true,
        segmentId: `banana-${s.id}`,
      })
      
      currentAngle += angle
    })
  }

  // Regular section segments (ALL songs including banana)
  if (regularSectionDegrees > 0) {
    const regularPointsTotal = allSongs.reduce((sum, s) => sum + (s.points || 1), 0)
    
    allSongs.forEach((s) => {
      const songPoints = s.points || 1
      const angle = (songPoints / regularPointsTotal) * regularSectionDegrees
      
      segments.push({
        song: s,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        isHighlighted: s.id === song.id,
        isBananaSection: false,
        segmentId: `regular-${s.id}`,
      })
      
      currentAngle += angle
    })
  }

  // Calculate percentage chance
  // If the song has banana stickers: appears in BOTH sections
  // Banana section (50%): chance based on BANANA COUNT among banana songs
  // Points section (50%): chance based on POINTS among ALL songs
  let percentChance = 0
  
  if (song.bananaStickers > 0 && hasBanana) {
    // Banana songs appear in both sections
    const totalBananaCount = bananaSongs.reduce((sum, s) => sum + s.bananaStickers, 0)
    const allPointsTotal = allSongs.reduce((sum, s) => sum + (s.points || 1), 0)
    const songPoints = song.points || 1
    
    // Banana section: weighted by banana count
    const chanceInBananaSection = (song.bananaStickers / totalBananaCount) * 0.5
    // Points section: weighted by points
    const chanceInPointsSection = (songPoints / allPointsTotal) * 0.5
    
    percentChance = (chanceInBananaSection + chanceInPointsSection) * 100
  } else {
    // Non-banana songs only appear in points section
    const allPointsTotal = allSongs.reduce((sum, s) => sum + (s.points || 1), 0)
    const songPoints = song.points || 1
    
    const poolChance = hasBanana ? 0.5 : 1 // 50% if banana songs exist, 100% otherwise
    percentChance = (songPoints / allPointsTotal) * poolChance * 100
  }

  // Create SVG arc path
  const createSlicePath = (startAngle: number, endAngle: number) => {
    const radius = 100
    const cx = 110
    const cy = 110
    
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    
    const x1 = cx + radius * Math.cos(startRad)
    const y1 = cy + radius * Math.sin(startRad)
    const x2 = cx + radius * Math.cos(endRad)
    const y2 = cy + radius * Math.sin(endRad)
    
    const largeArc = (endAngle - startAngle) > 180 ? 1 : 0
    
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {song.bananaStickers > 0 && (
              <span className="flex items-center gap-0.5">
                {Array.from({ length: Math.min(song.bananaStickers, 3) }).map((_, i) => (
                  <img key={`banana-${song.id}-${i}`} src="/banana sticker.png" alt="🍌" className="w-5 h-5" />
                ))}
                {song.bananaStickers > 3 && <span className="text-xs">+{song.bananaStickers - 3}</span>}
              </span>
            )}
            {song.title}
          </DialogTitle>
          <DialogDescription>
            by {song.artist} • {song.points} points
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          {/* Mini wheel */}
          <svg width="220" height="220" viewBox="0 0 220 220" className="drop-shadow-lg" aria-label="Preview of spin wheel">
            <title>Preview of spin wheel</title>
            {/* Outer ring */}
            <circle cx="110" cy="110" r="108" fill="none" stroke="#374151" strokeWidth="3" />
            
            {/* Segments */}
            {segments.map((seg) => {
              let color = GRAYED_COLOR
              if (seg.isHighlighted) {
                color = seg.isBananaSection ? BANANA_HIGHLIGHTED_COLOR : HIGHLIGHTED_COLOR
              }
              
              return (
                <path
                  key={seg.segmentId}
                  d={createSlicePath(seg.startAngle, seg.endAngle)}
                  fill={color}
                  stroke="#fff"
                  strokeWidth="1.5"
                />
              )
            })}
            
            {/* Center circle */}
            <circle cx="110" cy="110" r="20" fill="#1f2937" />
            <circle cx="110" cy="110" r="15" fill="#374151" />
          </svg>

          {/* Stats */}
          <div className="mt-6 text-center space-y-2">
            <div className="text-3xl font-bold text-purple-600">
              {percentChance.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              chance of being selected
            </div>
            
            {song.bananaStickers > 0 && hasBanana && (
              <div className="mt-4 text-xs text-muted-foreground bg-muted rounded-lg p-3">
                <span className="font-medium text-amber-600">🍌 Banana sticker bonus! ({song.bananaStickers}x)</span>
                <br />
                Appears in both sections of the wheel, banana section weighted by sticker count
              </div>
            )}
            
            {song.bananaStickers === 0 && hasBanana && (
              <div className="mt-4 text-xs text-muted-foreground bg-muted rounded-lg p-3">
                <span className="font-medium text-gray-600">Regular pool (50% base)</span>
                <br />
                Competes with all songs in regular section
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
