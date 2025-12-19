import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@clerk/clerk-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SpinWheelModal } from '@/components/SpinWheelModal'
import { WheelPreviewModal } from '@/components/WheelPreviewModal'
import { getSongs, submitSong, clearQueue, deleteSong, addPoints, toggleBananaSticker } from '@/server/songs'
import { getClientId } from '@/lib/client-id'
import { Music, Trash2, Sparkles, Plus, Eye, CheckCircle, Search, Youtube, Link, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: App,
})

const ADMIN_EMAILS = ['jonathan.higger@gmail.com']

function App() {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [notes, setNotes] = useState('')
  const [genres, setGenres] = useState('')
  const [link, setLink] = useState('')
  const [spinWheelOpen, setSpinWheelOpen] = useState(false)
  const [previewSong, setPreviewSong] = useState<{ id: number; title: string; artist: string; points: number; bananaSticker: boolean } | null>(null)
  const [customPointsSongId, setCustomPointsSongId] = useState<number | null>(null)
  const [customPointsValue, setCustomPointsValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [submitFormOpen, setSubmitFormOpen] = useState(true)
  const queryClient = useQueryClient()
  const { user } = useUser()
  
  const userEmail = user?.primaryEmailAddress?.emailAddress
  const isKnownAdminUser = userEmail ? ADMIN_EMAILS.includes(userEmail) : false
  
  // Get the anonymous client ID (always available)
  const clientId = useMemo(() => getClientId(), [])
  
  // For submitting, prefer Clerk user ID if logged in
  const submitterId = user?.id || clientId

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['songs'],
    queryFn: () => getSongs(),
  })

  // Check if user already has a song in the queue
  // Check both Clerk user ID and anonymous client ID to handle login/logout transitions
  const userSong = useMemo(() => {
    const idsToCheck = [clientId, user?.id].filter(Boolean)
    if (idsToCheck.length === 0) return null
    return songs.find((s: { submitterId: string | null }) => 
      s.submitterId && idsToCheck.includes(s.submitterId)
    ) ?? null
  }, [songs, clientId, user?.id])

  const submitMutation = useMutation({
    mutationFn: (data: { title: string; artist: string; notes?: string; genres?: string; link?: string; submitterId: string; allSubmitterIds: string[] }) => submitSong({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
      setTitle('')
      setArtist('')
      setNotes('')
      setGenres('')
      setLink('')
    },
  })

  const clearMutation = useMutation({
    mutationFn: () => clearQueue(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSong({ data: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
    },
  })

  const addPointsMutation = useMutation({
    mutationFn: (data: { id: number; points: number }) => addPoints({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
      setCustomPointsSongId(null)
      setCustomPointsValue('')
    },
  })

  const bananaMutation = useMutation({
    mutationFn: (data: { id: number; value: boolean }) => toggleBananaSticker({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Admins can always submit, regular users only if they don't have a song
    if (title.trim() && artist.trim() && (isKnownAdminUser || !userSong)) {
      const allSubmitterIds = isKnownAdminUser ? [] : [clientId, user?.id].filter((id): id is string => Boolean(id))
      submitMutation.mutate({ 
        title: title.trim(), 
        artist: artist.trim(), 
        notes: notes.trim() || undefined,
        genres: genres.trim() || undefined,
        link: link.trim() || undefined,
        submitterId, 
        allSubmitterIds 
      })
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
          <Music className="w-10 h-10" />
          UQ
        </h1>
        <p className="text-muted-foreground">
          Your Queue — submit songs for review
        </p>
      </div>

      {isKnownAdminUser && (
        <Card className="mb-6 border-purple-500/50 bg-purple-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Admin Control Panel</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button
              onClick={() => setSpinWheelOpen(true)}
              disabled={songs.length === 0}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Spin the Wheel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('Are you sure you want to clear the entire queue?')) {
                  clearMutation.mutate()
                }
              }}
              disabled={clearMutation.isPending || songs.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {clearMutation.isPending ? 'Clearing...' : 'Clear Queue'}
            </Button>
          </CardContent>
        </Card>
      )}

      <SpinWheelModal
        open={spinWheelOpen}
        onOpenChange={setSpinWheelOpen}
        songs={songs}
        onDeleteSong={(id) => deleteMutation.mutate(id)}
      />

      <WheelPreviewModal
        open={previewSong !== null}
        onOpenChange={(open) => !open && setPreviewSong(null)}
        song={previewSong}
        allSongs={songs}
      />

      {/* User's existing song card - only show for non-admins who have a song */}
      {userSong && !isKnownAdminUser && (
        <Card className="mb-6 border-green-500/50 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Your Song is in the Queue!
            </CardTitle>
            <CardDescription>
              You can submit another song once "{userSong.title}" gets picked, or remove it to submit a different one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {userSong.title}
                    {userSong.link && (
                      <a 
                        href={userSong.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{userSong.artist}</div>
                  {userSong.genres && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {userSong.genres.split(',').map((genre: string) => (
                        <span key={genre.trim()} className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                          {genre.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  {userSong.notes && (
                    <div className="text-xs text-muted-foreground mt-1 italic">
                      "{userSong.notes}"
                    </div>
                  )}
                  <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {userSong.points} points
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={() => {
                    if (confirm(`Remove "${userSong.title}" from the queue?`)) {
                      deleteMutation.mutate(userSong.id)
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit form - always show for admins, only show for non-admins without a song */}
      {(isKnownAdminUser || !userSong) && (
        <Card className="mb-6">
          <CardHeader 
            className="cursor-pointer select-none" 
            onClick={() => setSubmitFormOpen(!submitFormOpen)}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Submit a Song</CardTitle>
                <CardDescription>
                  {isKnownAdminUser 
                    ? 'As an admin, you can submit unlimited songs'
                    : 'Enter the song title and artist name'
                  }
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {submitFormOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {submitFormOpen && (
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Song Title *</div>
                    <Input
                      placeholder="Enter song title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Artist Name *</div>
                    <Input
                      placeholder="Enter artist name"
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Genres</div>
                  <Input
                    placeholder="e.g. Rock, Indie, Electronic"
                    value={genres}
                    onChange={(e) => setGenres(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Separate multiple genres with commas</p>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Link</div>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="YouTube, Spotify, or SoundCloud link"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Only YouTube, Spotify, and SoundCloud links are accepted</p>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Notes</div>
                  <Textarea
                    placeholder="Any additional notes? (e.g. 'Start at 1:30', 'Check out the bridge!')"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button type="submit" disabled={submitMutation.isPending} className="w-full">
                  {submitMutation.isPending ? 'Submitting...' : 'Submit Song'}
                </Button>
                {submitMutation.isError && (
                  <p className="text-sm text-red-500 text-center">
                    {submitMutation.error instanceof Error ? submitMutation.error.message : 'Failed to submit song'}
                  </p>
                )}
              </form>
            </CardContent>
          )}
        </Card>
      )}

      <Card className="mb-6 border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            How Points Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">The higher your points, the more likely you are to be picked</span> when the wheel spins!
          </p>
          <div className="space-y-2">
            <p className="font-medium">Ways to earn more points:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><span className="text-foreground">Stay on the board</span> — Every time a song gets picked, all remaining songs get +1 point</li>
              <li><span className="text-foreground">Be a good person in chat</span> — I might give bonus points to cool people!</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>
            {songs.length === 0
              ? 'No songs in queue yet'
              : `${songs.length} song${songs.length === 1 ? '' : 's'} — ranked by points`}
          </CardDescription>
            </div>
            {songs.length > 0 && (
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search songs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading queue...
            </div>
          ) : songs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Be the first to submit a song!
            </div>
          ) : (
            <div className="space-y-2">
              {(() => {
                // Pre-calculate totals for percentage calculations
                const bananaSongs = songs.filter((s: { bananaSticker: boolean }) => s.bananaSticker)
                const bananaPointsTotal = bananaSongs.reduce((sum: number, s: { points: number }) => sum + (s.points || 1), 0)
                const allPointsTotal = songs.reduce((sum: number, s: { points: number }) => sum + (s.points || 1), 0)
                const hasBanana = bananaSongs.length > 0
                
                // Filter songs based on search query
                const query = searchQuery.toLowerCase().trim()
                const filteredSongs = query
                  ? songs.filter((s: { title: string; artist: string; genres?: string | null }) => 
                      s.title.toLowerCase().includes(query) || 
                      s.artist.toLowerCase().includes(query) ||
                      (s.genres?.toLowerCase().includes(query) ?? false)
                    )
                  : songs
                
                if (filteredSongs.length === 0 && query) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      No songs match "{searchQuery}"
                    </div>
                  )
                }
                
                return filteredSongs.map((song: { id: number; title: string; artist: string; notes?: string | null; genres?: string | null; link?: string | null; linkType?: string | null; submittedAt: Date | string; points: number; bananaSticker: boolean; submitterId: string | null }) => {
                  // Use original index for rank (not filtered index)
                  const originalIndex = songs.findIndex((s: { id: number }) => s.id === song.id)
                  const rank = originalIndex + 1
                  const isTop3 = rank <= 3
                  const rankColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600']
                  const idsToCheck = [clientId, user?.id].filter(Boolean)
                  const isOwnSong = song.submitterId && idsToCheck.includes(song.submitterId)
                  
                  // Calculate percentage chance
                  // Banana songs appear in BOTH sections (banana section + regular section)
                  // Regular songs only appear in regular section
                  const songPoints = song.points || 1
                  let percentChance = 0
                  
                  if (song.bananaSticker && hasBanana) {
                    // Banana songs get two chances:
                    // 1. Banana section (50%): songPoints / bananaPointsTotal
                    // 2. Regular section (50%): songPoints / allPointsTotal
                    const chanceInBanana = bananaPointsTotal > 0 ? (songPoints / bananaPointsTotal) * 0.5 : 0
                    const chanceInRegular = allPointsTotal > 0 ? (songPoints / allPointsTotal) * 0.5 : 0
                    percentChance = (chanceInBanana + chanceInRegular) * 100
                  } else {
                    // Non-banana songs only in regular section
                    const poolChance = hasBanana ? 0.5 : 1
                    const chanceInRegular = allPointsTotal > 0 ? songPoints / allPointsTotal : 0
                    percentChance = chanceInRegular * poolChance * 100
                  }
                  
                  return (
                  <div
                    key={song.id}
                    className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-accent transition-colors ${
                      isOwnSong 
                        ? 'border-green-500 bg-green-500/10 ring-1 ring-green-500/30' 
                        : song.bananaSticker 
                          ? 'border-yellow-400 bg-yellow-50' 
                          : isTop3 
                            ? 'border-purple-500/30 bg-purple-500/5' 
                            : ''
                    }`}
                  >
                    {/* Rank */}
                    <div className={`w-8 text-center font-bold text-lg ${isTop3 ? rankColors[rank - 1] : 'text-muted-foreground'}`}>
                      {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
                    </div>
                    
                    {/* Song info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        {song.bananaSticker && <img src="/banana sticker.png" alt="🍌" className="w-5 h-5" title="Banana Sticker - 50% priority pool" />}
                        {song.title}
                        {isOwnSong && <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">You</span>}
                        {song.link && (
                          <a 
                            href={song.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title={`Open on ${song.linkType === 'youtube' ? 'YouTube' : song.linkType === 'spotify' ? 'Spotify' : 'SoundCloud'}`}
                          >
                            {song.linkType === 'youtube' ? (
                              <Youtube className="w-4 h-4 text-red-500" />
                            ) : song.linkType === 'spotify' ? (
                              <span className="text-green-500 text-sm font-bold">●</span>
                            ) : (
                              <span className="text-orange-500 text-sm font-bold">☁</span>
                            )}
                          </a>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {song.artist}
                      </div>
                      {song.genres && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {song.genres.split(',').map((genre) => (
                            <span key={genre.trim()} className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                              {genre.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                      {song.notes && (
                        <div className="text-xs text-muted-foreground mt-1 italic truncate">
                          "{song.notes}"
                        </div>
                      )}
                    </div>
                    
                    {/* Admin controls */}
                    {isKnownAdminUser && (
                      <div className="flex items-center gap-1">
                        {customPointsSongId === song.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              placeholder="pts"
                              value={customPointsValue}
                              onChange={(e) => setCustomPointsValue(e.target.value)}
                              className="w-16 h-7 text-xs"
                              min="1"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => {
                                const pts = parseInt(customPointsValue, 10)
                                if (pts > 0) {
                                  addPointsMutation.mutate({ id: song.id, points: pts })
                                }
                              }}
                              disabled={!customPointsValue || parseInt(customPointsValue, 10) <= 0}
                            >
                              Add
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-1 text-xs"
                              onClick={() => {
                                setCustomPointsSongId(null)
                                setCustomPointsValue('')
                              }}
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-100"
                              onClick={() => addPointsMutation.mutate({ id: song.id, points: 1 })}
                            >
                              +1
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-100"
                              onClick={() => addPointsMutation.mutate({ id: song.id, points: 5 })}
                            >
                              +5
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-100"
                              onClick={() => addPointsMutation.mutate({ id: song.id, points: 10 })}
                            >
                              +10
                            </Button>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-100"
                                  onClick={() => addPointsMutation.mutate({ id: song.id, points: -1 })}
                                >
                                  -1
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-100"
                                  onClick={() => addPointsMutation.mutate({ id: song.id, points: -5 })}
                                >
                                  -5
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-100"
                                  onClick={() => addPointsMutation.mutate({ id: song.id, points: -10 })}
                                >
                                  -10
                                </Button>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                              onClick={() => setCustomPointsSongId(song.id)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-7 px-2 text-xs ${song.bananaSticker ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                              onClick={() => bananaMutation.mutate({ id: song.id, value: !song.bananaSticker })}
                              title={song.bananaSticker ? 'Remove banana sticker' : 'Add banana sticker (50% priority)'}
                            >
                              <img src="/banana sticker.png" alt="🍌" className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-100"
                              onClick={() => {
                                if (confirm(`Delete "${song.title}" by ${song.artist}?`)) {
                                  deleteMutation.mutate(song.id)
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* See in wheel button - only show if 2% or higher chance */}
                    {percentChance >= 2 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setPreviewSong(song)}
                        title="See chances on wheel"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {/* Points badge */}
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/10 rounded-full">
                      <Sparkles className="w-3 h-3 text-purple-500" />
                      <span className="text-sm font-semibold text-purple-600">{song.points}</span>
                      <span className="text-xs text-purple-500/70">pts</span>
                    </div>
                  </div>
                )
              })
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
