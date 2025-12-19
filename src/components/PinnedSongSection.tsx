import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { deleteSong } from '@/server/songs'
import { ChevronLeft, ChevronRight, Trash2, Youtube, Radio } from 'lucide-react'

interface Song {
  id: number
  title: string
  artist: string
  notes?: string | null
  genres?: string | null
  youtubeUrl?: string | null
  spotifyUrl?: string | null
  soundcloudUrl?: string | null
  instagramUrl?: string | null
  tiktokUrl?: string | null
  points: number
  bananaStickers: number
  archivedAt: Date | string | null
}

interface PinnedSongSectionProps {
  archivedSongs: Song[]
  isAdmin: boolean
}

export function PinnedSongSection({ archivedSongs, isAdmin }: PinnedSongSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLive, setIsLive] = useState(true)
  const [viewedSongId, setViewedSongId] = useState<number | null>(null)
  const prevLengthRef = useRef(archivedSongs.length)
  const queryClient = useQueryClient()

  // When in live mode, always snap to the most recent (index 0)
  // When not in live mode, maintain position on the same song by ID
  useEffect(() => {
    if (isLive) {
      if (currentIndex !== 0) {
        setCurrentIndex(0)
      }
      setViewedSongId(null)
    } else if (viewedSongId !== null) {
      // Find the current song by ID to maintain position
      const newIndex = archivedSongs.findIndex(s => s.id === viewedSongId)
      if (newIndex !== -1 && newIndex !== currentIndex) {
        setCurrentIndex(newIndex)
      }
    }
    prevLengthRef.current = archivedSongs.length
  }, [isLive, archivedSongs, currentIndex, viewedSongId])

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSong({ data: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archivedSongs'] })
      // Adjust index if we deleted the last item
      if (currentIndex >= archivedSongs.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
      }
    },
  })

  if (archivedSongs.length === 0) {
    return null
  }

  // archivedSongs is sorted by archivedAt DESC (newest first at index 0)
  // We want left=oldest, right=newest, so we reverse the mental model:
  // - Left arrow goes to higher index (older)
  // - Right arrow goes to lower index (newer)
  const currentSong = archivedSongs[currentIndex]
  const hasOlder = currentIndex < archivedSongs.length - 1
  const hasNewer = currentIndex > 0

  const goToOlder = () => {
    if (hasOlder) {
      const newIndex = currentIndex + 1
      setIsLive(false) // Exit live mode when navigating to older
      setCurrentIndex(newIndex)
      setViewedSongId(archivedSongs[newIndex].id) // Track the song we're viewing
    }
  }

  const goToNewer = () => {
    if (hasNewer) {
      const newIndex = currentIndex - 1
      setCurrentIndex(newIndex)
      setViewedSongId(archivedSongs[newIndex].id) // Track the song we're viewing
    }
  }

  const goLive = () => {
    setIsLive(true)
    setCurrentIndex(0)
    setViewedSongId(null) // Clear tracked song when going live
  }

  const formatArchivedTime = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleString()
  }

  const hasSocialLinks = currentSong.youtubeUrl || currentSong.spotifyUrl || currentSong.soundcloudUrl || currentSong.instagramUrl || currentSong.tiktokUrl

  return (
    <Card className="mb-6 border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center">
          {/* Older (left) button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={goToOlder}
            disabled={!hasOlder}
            className="h-full rounded-none px-3 hover:bg-yellow-500/20 disabled:opacity-30"
            title="Older pick"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          {/* Song content */}
          <div className="flex-1 py-4 px-2">
            <div className="flex items-start gap-4">
              {/* Song details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {currentSong.bananaStickers > 0 && (
                    <span className="flex items-center gap-0.5" title={`${currentSong.bananaStickers} banana sticker${currentSong.bananaStickers > 1 ? 's' : ''}`}>
                      {Array.from({ length: Math.min(currentSong.bananaStickers, 5) }).map((_, i) => (
                        <img key={i} src="/banana sticker.png" alt="🍌" className="w-5 h-5" />
                      ))}
                      {currentSong.bananaStickers > 5 && <span className="text-xs text-muted-foreground">+{currentSong.bananaStickers - 5}</span>}
                    </span>
                  )}
                  <h3 className="text-xl font-bold truncate">{currentSong.title}</h3>
                </div>
                <p className="text-muted-foreground">by {currentSong.artist}</p>
                
                {currentSong.genres && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {currentSong.genres.split(',').map((genre) => (
                      <span key={genre.trim()} className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                        {genre.trim()}
                      </span>
                    ))}
                  </div>
                )}
                
                {currentSong.notes && (
                  <p className="text-sm text-muted-foreground mt-2 italic">"{currentSong.notes}"</p>
                )}

                {/* Social Media Links */}
                {hasSocialLinks && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {currentSong.youtubeUrl && (
                      <a
                        href={currentSong.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors"
                        title="YouTube"
                      >
                        <Youtube className="w-3.5 h-3.5" />
                        YouTube
                      </a>
                    )}
                    {currentSong.spotifyUrl && (
                      <a
                        href={currentSong.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors"
                        title="Spotify"
                      >
                        <span className="text-sm font-bold">●</span>
                        Spotify
                      </a>
                    )}
                    {currentSong.soundcloudUrl && (
                      <a
                        href={currentSong.soundcloudUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 transition-colors"
                        title="SoundCloud"
                      >
                        <span className="text-sm font-bold">☁</span>
                        SoundCloud
                      </a>
                    )}
                    {currentSong.instagramUrl && (
                      <a
                        href={currentSong.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white text-xs font-medium hover:opacity-90 transition-opacity"
                        title="Instagram"
                      >
                        <span className="font-bold">IG</span>
                        Instagram
                      </a>
                    )}
                    {currentSong.tiktokUrl && (
                      <a
                        href={currentSong.tiktokUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black text-white text-xs font-medium hover:bg-gray-800 transition-colors"
                        title="TikTok"
                      >
                        <span className="font-bold">TT</span>
                        TikTok
                      </a>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-2">
                  Picked: {currentSong.archivedAt && formatArchivedTime(currentSong.archivedAt)}
                </p>
              </div>

              {/* Admin delete button */}
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Permanently delete "${currentSong.title}" by ${currentSong.artist}?`)) {
                      deleteMutation.mutate(currentSong.id)
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="text-red-600 hover:text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>

            {/* Carousel indicator and live button */}
            <div className="flex justify-between items-center mt-3">
              {/* Left spacer for centering */}
              <div className="w-20" />
              
              {/* Center: dots and count */}
              {archivedSongs.length > 1 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {archivedSongs.length - currentIndex} of {archivedSongs.length} picks
                  </span>
                  <div className="flex gap-1">
                    {archivedSongs.slice(0, Math.min(archivedSongs.length, 10)).map((_, idx) => {
                      // Reverse the visual order: leftmost dot = oldest (highest index), rightmost = newest (index 0)
                      const reversedIdx = archivedSongs.length - 1 - idx
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setCurrentIndex(reversedIdx)
                            if (reversedIdx !== 0) {
                              setIsLive(false)
                              setViewedSongId(archivedSongs[reversedIdx].id)
                            } else {
                              setIsLive(true)
                              setViewedSongId(null)
                            }
                          }}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            reversedIdx === currentIndex ? 'bg-yellow-500' : 'bg-gray-300 hover:bg-gray-400'
                          }`}
                        />
                      )
                    })}
                    {archivedSongs.length > 10 && (
                      <span className="text-xs text-muted-foreground ml-1">...</span>
                    )}
                  </div>
                </div>
              ) : (
                <div />
              )}
              
              {/* Right: Live button */}
              <button
                onClick={goLive}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all ${
                  isLive 
                    ? 'bg-red-500 text-white cursor-default' 
                    : 'bg-gray-200 text-gray-600 cursor-pointer hover:bg-red-100 hover:text-red-500'
                }`}
                title={isLive ? 'Live - showing latest pick' : 'Click to go live'}
              >
                <div className="relative">
                  <Radio className="w-3.5 h-3.5" />
                  {isLive && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full animate-pulse" />
                  )}
                  {!isLive && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-bounce" />
                  )}
                </div>
                <span className={`text-xs font-semibold ${!isLive ? 'animate-pulse' : ''}`}>
                  LIVE
                </span>
              </button>
            </div>
          </div>

          {/* Newer (right) button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNewer}
            disabled={!hasNewer || isLive}
            className="h-full rounded-none px-3 hover:bg-yellow-500/20 disabled:opacity-30"
            title={isLive ? 'Already on latest' : 'Newer pick'}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
