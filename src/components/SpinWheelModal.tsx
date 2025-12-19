import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SpinWheel } from './SpinWheel'
import { Sparkles, Pin, RotateCcw } from 'lucide-react'

interface Song {
  id: number
  title: string
  artist: string
  points: number
  bananaSticker: boolean
}

interface SpinWheelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  songs: Song[]
  onArchiveSong: (id: number) => void
}

export function SpinWheelModal({
  open,
  onOpenChange,
  songs,
  onArchiveSong,
}: SpinWheelModalProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [winner, setWinner] = useState<Song | null>(null)
  const [showResult, setShowResult] = useState(false)

  const handleSpin = () => {
    if (songs.length === 0 || isSpinning) return
    setWinner(null)
    setShowResult(false)
    setIsSpinning(true)
  }

  const handleSpinComplete = useCallback((song: Song) => {
    setWinner(song)
    setIsSpinning(false)
    setShowResult(true)
  }, [])

  const handlePinAndArchive = () => {
    if (winner) {
      onArchiveSong(winner.id)
      setShowResult(false)
      setWinner(null)
    }
  }

  const handleRespin = () => {
    setShowResult(false)
    setWinner(null)
  }

  const handleClose = (open: boolean) => {
    if (!isSpinning) {
      onOpenChange(open)
      if (!open) {
        setShowResult(false)
        setWinner(null)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            Spin the Wheel!
          </DialogTitle>
          <DialogDescription>
            {showResult
              ? 'We have a winner!'
              : 'Songs with more points have bigger slices!'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {showResult && winner ? (
            // Winner display
            <div className="text-center py-8 space-y-6">
              <div className="space-y-2">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-primary">
                  {winner.title}
                </h3>
                <p className="text-lg text-muted-foreground">
                  by {winner.artist}
                </p>
                <p className="text-sm text-muted-foreground">
                  {winner.points} point{winner.points !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex gap-3 justify-center pt-4">
                <Button
                  onClick={handlePinAndArchive}
                  className="gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                >
                  <Pin className="w-4 h-4" />
                  Pin & Archive
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRespin}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Re-spin
                </Button>
              </div>
            </div>
          ) : (
            // Wheel display
            <div className="space-y-6">
              <SpinWheel
                songs={songs}
                isSpinning={isSpinning}
                onSpinComplete={handleSpinComplete}
              />

              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={handleSpin}
                  disabled={isSpinning || songs.length === 0}
                  className="px-12 py-6 text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
                >
                  {isSpinning ? 'Spinning...' : 'SPIN!'}
                </Button>
              </div>

              {songs.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  Add some songs to the queue first!
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

