import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Copy, ExternalLink, Link, Pencil, Radio, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { deleteSong, updateSong } from '@/server/songs'

interface Song {
  id: number
  title: string
  artist: string
  nameInChat?: string | null
  notes?: string | null
  genres?: string | null
  songLink?: string | null
  youtubeUrl?: string | null
  spotifyUrl?: string | null
  soundcloudUrl?: string | null
  instagramUrl?: string | null
  tiktokUrl?: string | null
  facebookUrl?: string | null
  points: number
  bananaStickers: number
  archivedAt: Date | string | null
  submitterId?: string | null
}

interface PinnedSongSectionProps {
  archivedSongs: Song[]
  isAdmin: boolean
  submitterId?: string
  clientId?: string
}

export function PinnedSongSection({ archivedSongs, isAdmin, submitterId, clientId }: PinnedSongSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLive, setIsLive] = useState(true)
  const [viewedSongId, setViewedSongId] = useState<number | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editSocialLinksOpen, setEditSocialLinksOpen] = useState(false)
  // Edit form state
  const [editTitle, setEditTitle] = useState('')
  const [editArtist, setEditArtist] = useState('')
  const [editNameInChat, setEditNameInChat] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editGenres, setEditGenres] = useState('')
  const [editSongLink, setEditSongLink] = useState('')
  const [editYoutubeUrl, setEditYoutubeUrl] = useState('')
  const [editSoundcloudUrl, setEditSoundcloudUrl] = useState('')
  const [editInstagramUrl, setEditInstagramUrl] = useState('')
  const [editTiktokUrl, setEditTiktokUrl] = useState('')
  const [editFacebookUrl, setEditFacebookUrl] = useState('')
  const prevLengthRef = useRef(archivedSongs.length)
  const queryClient = useQueryClient()

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Check if user owns the current song
  const idsToCheck = [clientId, submitterId].filter(Boolean)
  const isOwnSong = (song: Song) => song.submitterId && idsToCheck.includes(song.submitterId)

  const startEditing = (song: Song) => {
    setEditTitle(song.title)
    setEditArtist(song.artist)
    setEditNameInChat(song.nameInChat || '')
    setEditNotes(song.notes || '')
    setEditGenres(song.genres || '')
    setEditSongLink(song.songLink || song.spotifyUrl || '')
    setEditYoutubeUrl(song.youtubeUrl || '')
    setEditSoundcloudUrl(song.soundcloudUrl || '')
    setEditInstagramUrl(song.instagramUrl || '')
    setEditTiktokUrl(song.tiktokUrl || '')
    setEditFacebookUrl(song.facebookUrl || '')
    setEditSocialLinksOpen(!!(song.youtubeUrl || song.soundcloudUrl || song.instagramUrl || song.tiktokUrl || song.facebookUrl))
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditSocialLinksOpen(false)
  }

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

  const updateMutation = useMutation({
    mutationFn: (data: { 
      id: number
      title: string
      artist: string
      nameInChat?: string
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
    }) => updateSong({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archivedSongs'] })
      setIsEditing(false)
      setEditSocialLinksOpen(false)
    },
  })

  const handleEditSubmit = (songId: number) => {
    if (editTitle.trim() && editArtist.trim()) {
      updateMutation.mutate({
        id: songId,
        title: editTitle.trim(),
        artist: editArtist.trim(),
        nameInChat: editNameInChat.trim() || undefined,
        notes: editNotes.trim() || undefined,
        genres: editGenres.trim() || undefined,
        songLink: editSongLink.trim() || undefined,
        youtubeUrl: editYoutubeUrl.trim() || undefined,
        soundcloudUrl: editSoundcloudUrl.trim() || undefined,
        instagramUrl: editInstagramUrl.trim() || undefined,
        tiktokUrl: editTiktokUrl.trim() || undefined,
        facebookUrl: editFacebookUrl.trim() || undefined,
        submitterId: submitterId || clientId || '',
        isAdmin,
      })
    }
  }

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

  // Get the song link (prefer songLink, fallback to spotifyUrl for legacy)
  const songLinkUrl = currentSong.songLink || currentSong.spotifyUrl
  const hasSocialLinks = currentSong.youtubeUrl || currentSong.soundcloudUrl || currentSong.instagramUrl || currentSong.tiktokUrl || currentSong.facebookUrl

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
            {isEditing ? (
              /* Edit Form */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-orange-700">Edit Your Song</span>
                  <Button size="sm" variant="ghost" onClick={cancelEditing} className="h-7 w-7 p-0">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Song title *"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                  <Input
                    placeholder="Artist name *"
                    value={editArtist}
                    onChange={(e) => setEditArtist(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Your name in chat"
                    value={editNameInChat}
                    onChange={(e) => setEditNameInChat(e.target.value)}
                  />
                  <Input
                    placeholder="Genres (comma-separated)"
                    value={editGenres}
                    onChange={(e) => setEditGenres(e.target.value)}
                  />
                </div>
                <Input
                  placeholder="Song link (YouTube, Spotify, SoundCloud, etc.)"
                  value={editSongLink}
                  onChange={(e) => setEditSongLink(e.target.value)}
                />
                {/* Social Links - Collapsible */}
                <div className="border rounded-lg overflow-hidden bg-white/50">
                  <button
                    type="button"
                    onClick={() => setEditSocialLinksOpen(!editSocialLinksOpen)}
                    className="w-full flex items-center justify-between p-2 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Artist Socials</span>
                      {(editYoutubeUrl || editSoundcloudUrl || editInstagramUrl || editTiktokUrl || editFacebookUrl) && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          {[editYoutubeUrl, editSoundcloudUrl, editInstagramUrl, editTiktokUrl, editFacebookUrl].filter(Boolean).length}
                        </span>
                      )}
                    </div>
                    {editSocialLinksOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {editSocialLinksOpen && (
                    <div className="p-2 space-y-2 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-red-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-[8px] font-bold">YT</span>
                          </div>
                          <Input placeholder="YouTube" value={editYoutubeUrl} onChange={(e) => setEditYoutubeUrl(e.target.value)} className="flex-1 h-8 text-sm" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-[10px] font-bold">☁</span>
                          </div>
                          <Input placeholder="SoundCloud" value={editSoundcloudUrl} onChange={(e) => setEditSoundcloudUrl(e.target.value)} className="flex-1 h-8 text-sm" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-[8px] font-bold">IG</span>
                          </div>
                          <Input placeholder="Instagram" value={editInstagramUrl} onChange={(e) => setEditInstagramUrl(e.target.value)} className="flex-1 h-8 text-sm" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-black flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-[8px] font-bold">TT</span>
                          </div>
                          <Input placeholder="TikTok" value={editTiktokUrl} onChange={(e) => setEditTiktokUrl(e.target.value)} className="flex-1 h-8 text-sm" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-[8px] font-bold">FB</span>
                          </div>
                          <Input placeholder="Facebook" value={editFacebookUrl} onChange={(e) => setEditFacebookUrl(e.target.value)} className="flex-1 h-8 text-sm" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <Textarea
                  placeholder="Notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleEditSubmit(currentSong.id)}
                    disabled={updateMutation.isPending || !editTitle.trim() || !editArtist.trim()}
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEditing}>
                    Cancel
                  </Button>
                </div>
                {updateMutation.isError && (
                  <p className="text-sm text-red-500">
                    {updateMutation.error instanceof Error ? updateMutation.error.message : 'Failed to update'}
                  </p>
                )}
              </div>
            ) : (
              /* Normal Display */
              <div className="flex items-start gap-4">
                {/* Song details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {currentSong.bananaStickers > 0 && (
                      <span className="flex items-center gap-0.5" title={`${currentSong.bananaStickers} banana sticker${currentSong.bananaStickers > 1 ? 's' : ''}`}>
                        {Array.from({ length: Math.min(currentSong.bananaStickers, 5) }).map((_, i) => (
                          <img key={`banana-${currentSong.id}-${i}`} src="/banana sticker.png" alt="🍌" className="w-5 h-5" />
                        ))}
                        {currentSong.bananaStickers > 5 && <span className="text-xs text-muted-foreground">+{currentSong.bananaStickers - 5}</span>}
                      </span>
                    )}
                    <h3 className="text-xl font-bold truncate">{currentSong.title}</h3>
                    {isOwnSong(currentSong) && (
                      <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">Your Song</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-muted-foreground">by {currentSong.artist}</p>
                    {currentSong.nameInChat && (
                      <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">@{currentSong.nameInChat}</span>
                    )}
                  </div>
                  
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

                  {/* Song Link - THE MAIN LINK TO LISTEN */}
                  {songLinkUrl && (
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <a
                        href={songLinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-colors shadow-md hover:shadow-lg"
                      >
                        <Link className="w-4 h-4" />
                        Listen to Song
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(songLinkUrl)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 font-medium transition-all ${
                          copiedLink
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-purple-400 hover:bg-purple-50'
                        }`}
                        title="Copy link to clipboard"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy Link
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Artist Social Media Links */}
                  {hasSocialLinks && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-1.5">Follow the artist:</p>
                      <div className="flex flex-wrap gap-2">
                        {currentSong.youtubeUrl && (
                          <a
                            href={currentSong.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors"
                            title="YouTube"
                          >
                            <span className="font-bold">YT</span>
                            YouTube
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
                        {currentSong.facebookUrl && (
                          <a
                            href={currentSong.facebookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                            title="Facebook"
                          >
                            <span className="font-bold">FB</span>
                            Facebook
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-2">
                    Picked: {currentSong.archivedAt && formatArchivedTime(currentSong.archivedAt)}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2">
                  {/* Edit button for song owner */}
                  {isOwnSong(currentSong) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(currentSong)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
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
              </div>
            )}

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
                    {archivedSongs.slice(0, Math.min(archivedSongs.length, 10)).map((song, idx) => {
                      // Reverse the visual order: leftmost dot = oldest (highest index), rightmost = newest (index 0)
                      const reversedIdx = archivedSongs.length - 1 - idx
                      return (
                        <button
                          type="button"
                          key={`dot-${song.id}`}
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
                type="button"
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
