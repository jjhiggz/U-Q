import { useUser } from '@clerk/clerk-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle, ChevronDown, ChevronUp, Eye, Link, Music, Pencil, Plus, Search, Sparkles, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PinnedSongSection } from '@/components/PinnedSongSection'
import { SpinWheelModal } from '@/components/SpinWheelModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { WheelPreviewModal } from '@/components/WheelPreviewModal'
import { getClientId } from '@/lib/client-id'
import { addPoints, archiveSong, clearQueue, deleteSong, getArchivedSongs, getSongs, submitSong, updateBananaStickers, updateSong } from '@/server/songs'

export const Route = createFileRoute('/')({
  component: App,
})

const ADMIN_EMAILS = ['jonathan.higger@gmail.com']

// Search criteria options
type SearchCriteria = 'all' | 'title' | 'artist' | 'chatName' | 'genre'

function App() {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [nameInChat, setNameInChat] = useState('')
  const [notes, setNotes] = useState('')
  const [genres, setGenres] = useState('')
  const [songLink, setSongLink] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [soundcloudUrl, setSoundcloudUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')
  const [socialLinksOpen, setSocialLinksOpen] = useState(false)
  const [spinWheelOpen, setSpinWheelOpen] = useState(false)
  const [previewSong, setPreviewSong] = useState<{ id: number; title: string; artist: string; points: number; bananaStickers: number } | null>(null)
  const [customPointsSongId, setCustomPointsSongId] = useState<number | null>(null)
  const [customPointsValue, setCustomPointsValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>('all')
  const [submitFormOpen, setSubmitFormOpen] = useState(true)
  // Edit state
  const [editingSongId, setEditingSongId] = useState<number | null>(null)
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
  const [editSocialLinksOpen, setEditSocialLinksOpen] = useState(false)
  // Track which songs are expanded (by id)
  const [expandedSongs, setExpandedSongs] = useState<Set<number>>(new Set())
  const queryClient = useQueryClient()
  const { user } = useUser()
  
  const userEmail = user?.primaryEmailAddress?.emailAddress
  const isKnownAdminUser = userEmail ? ADMIN_EMAILS.includes(userEmail) : false
  
  // Collapse submit form by default for admin users
  useEffect(() => {
    if (isKnownAdminUser) {
      setSubmitFormOpen(false)
    }
  }, [isKnownAdminUser])
  
  // Get the anonymous client ID (always available)
  const clientId = useMemo(() => getClientId(), [])
  
  // For submitting, prefer Clerk user ID if logged in
  const submitterId = user?.id || clientId

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['songs'],
    queryFn: () => getSongs(),
    refetchInterval: 5000,
  })

  const { data: archivedSongs = [] } = useQuery({
    queryKey: ['archivedSongs'],
    queryFn: () => getArchivedSongs(),
    refetchInterval: 5000,
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
    mutationFn: (data: { 
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
      allSubmitterIds: string[] 
    }) => submitSong({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
      setTitle('')
      setArtist('')
      setNameInChat('')
      setNotes('')
      setGenres('')
      setSongLink('')
      setYoutubeUrl('')
      setSoundcloudUrl('')
      setInstagramUrl('')
      setTiktokUrl('')
      setFacebookUrl('')
      setSocialLinksOpen(false)
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
      queryClient.invalidateQueries({ queryKey: ['songs'] })
      setEditingSongId(null)
      setEditSocialLinksOpen(false)
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
      queryClient.invalidateQueries({ queryKey: ['archivedSongs'] })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (id: number) => archiveSong({ data: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
      queryClient.invalidateQueries({ queryKey: ['archivedSongs'] })
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
    mutationFn: (data: { id: number; delta: number }) => updateBananaStickers({ data }),
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
        nameInChat: nameInChat.trim() || undefined,
        notes: notes.trim() || undefined,
        genres: genres.trim() || undefined,
        songLink: songLink.trim() || undefined,
        youtubeUrl: youtubeUrl.trim() || undefined,
        soundcloudUrl: soundcloudUrl.trim() || undefined,
        instagramUrl: instagramUrl.trim() || undefined,
        tiktokUrl: tiktokUrl.trim() || undefined,
        facebookUrl: facebookUrl.trim() || undefined,
        submitterId, 
        allSubmitterIds 
      })
    }
  }

  // Helper to get song link from legacy fields or new field
  const getSongLinkFromSong = (song: { songLink?: string | null; spotifyUrl?: string | null }) => 
    song.songLink || song.spotifyUrl || ''

  // Start editing a song
  const startEditing = (song: { id: number; title: string; artist: string; nameInChat?: string | null; notes?: string | null; genres?: string | null; songLink?: string | null; spotifyUrl?: string | null; youtubeUrl?: string | null; soundcloudUrl?: string | null; instagramUrl?: string | null; tiktokUrl?: string | null; facebookUrl?: string | null }) => {
    setEditingSongId(song.id)
    setEditTitle(song.title)
    setEditArtist(song.artist)
    setEditNameInChat(song.nameInChat || '')
    setEditNotes(song.notes || '')
    setEditGenres(song.genres || '')
    setEditSongLink(getSongLinkFromSong(song))
    setEditYoutubeUrl(song.youtubeUrl || '')
    setEditSoundcloudUrl(song.soundcloudUrl || '')
    setEditInstagramUrl(song.instagramUrl || '')
    setEditTiktokUrl(song.tiktokUrl || '')
    setEditFacebookUrl(song.facebookUrl || '')
    // Auto-expand social links if any exist
    setEditSocialLinksOpen(!!(song.youtubeUrl || song.soundcloudUrl || song.instagramUrl || song.tiktokUrl || song.facebookUrl))
  }

  const cancelEditing = () => {
    setEditingSongId(null)
    setEditTitle('')
    setEditArtist('')
    setEditNameInChat('')
    setEditNotes('')
    setEditGenres('')
    setEditSongLink('')
    setEditYoutubeUrl('')
    setEditSoundcloudUrl('')
    setEditInstagramUrl('')
    setEditTiktokUrl('')
    setEditFacebookUrl('')
    setEditSocialLinksOpen(false)
  }

  // Toggle song expansion
  const toggleSongExpanded = (songId: number) => {
    setExpandedSongs(prev => {
      const next = new Set(prev)
      if (next.has(songId)) {
        next.delete(songId)
      } else {
        next.add(songId)
      }
      return next
    })
  }

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
        submitterId,
        isAdmin: isKnownAdminUser,
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

      <PinnedSongSection 
        archivedSongs={archivedSongs} 
        isAdmin={isKnownAdminUser} 
      />

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
        onArchiveSong={(id) => archiveMutation.mutate(id)}
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
              You can edit your submission, or remove it to submit a different song
            </CardDescription>
          </CardHeader>
          <CardContent>
            {editingSongId === userSong.id ? (
              // Edit form
              <div className="space-y-4 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Song Title *</div>
                    <Input
                      placeholder="Enter song title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Artist Name *</div>
                    <Input
                      placeholder="Enter artist name"
                      value={editArtist}
                      onChange={(e) => setEditArtist(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Your Name in Chat</div>
                    <Input
                      placeholder="What's your username in chat?"
                      value={editNameInChat}
                      onChange={(e) => setEditNameInChat(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Genres</div>
                    <Input
                      placeholder="e.g. Rock, Indie, Electronic"
                      value={editGenres}
                      onChange={(e) => setEditGenres(e.target.value)}
                    />
                  </div>
                </div>
                {/* Song Link */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Song Link</div>
                  <Input
                    placeholder="Link to your song (YouTube, Spotify, SoundCloud, etc.)"
                    value={editSongLink}
                    onChange={(e) => setEditSongLink(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">No Apple Music or other paid streaming services</p>
                </div>
                {/* Social Links - Collapsible */}
                <div className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setEditSocialLinksOpen(!editSocialLinksOpen)}
                    className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Artist Socials</span>
                      <span className="text-xs text-muted-foreground">(optional)</span>
                      {(editYoutubeUrl || editSoundcloudUrl || editInstagramUrl || editTiktokUrl || editFacebookUrl) && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          {[editYoutubeUrl, editSoundcloudUrl, editInstagramUrl, editTiktokUrl, editFacebookUrl].filter(Boolean).length} added
                        </span>
                      )}
                    </div>
                    {editSocialLinksOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  {editSocialLinksOpen && (
                    <div className="p-3 space-y-3 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-red-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">YT</span>
                          </div>
                          <Input
                            placeholder="YouTube channel"
                            value={editYoutubeUrl}
                            onChange={(e) => setEditYoutubeUrl(e.target.value)}
                            className="flex-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-orange-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-lg font-bold">☁</span>
                          </div>
                          <Input
                            placeholder="SoundCloud profile"
                            value={editSoundcloudUrl}
                            onChange={(e) => setEditSoundcloudUrl(e.target.value)}
                            className="flex-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">IG</span>
                          </div>
                          <Input
                            placeholder="Instagram profile"
                            value={editInstagramUrl}
                            onChange={(e) => setEditInstagramUrl(e.target.value)}
                            className="flex-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-black flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">TT</span>
                          </div>
                          <Input
                            placeholder="TikTok profile"
                            value={editTiktokUrl}
                            onChange={(e) => setEditTiktokUrl(e.target.value)}
                            className="flex-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">FB</span>
                          </div>
                          <Input
                            placeholder="Facebook page"
                            value={editFacebookUrl}
                            onChange={(e) => setEditFacebookUrl(e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Notes</div>
                  <Textarea
                    placeholder="Any additional notes?"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleEditSubmit(userSong.id)}
                    disabled={updateMutation.isPending || !editTitle.trim() || !editArtist.trim()}
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={cancelEditing}>
                    Cancel
                  </Button>
                </div>
                {updateMutation.isError && (
                  <p className="text-sm text-red-500">
                    {updateMutation.error instanceof Error ? updateMutation.error.message : 'Failed to update song'}
                  </p>
                )}
              </div>
            ) : (
              // Display view
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{userSong.title}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      {userSong.artist}
                      {userSong.nameInChat && (
                        <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">@{userSong.nameInChat}</span>
                      )}
                    </div>
                    {userSong.genres && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {userSong.genres.split(',').map((genre: string) => (
                          <span key={genre.trim()} className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                            {genre.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    {(() => {
                      const userSongLink = userSong.songLink || userSong.spotifyUrl
                      const userHasSocials = userSong.youtubeUrl || userSong.soundcloudUrl || userSong.instagramUrl || userSong.tiktokUrl || userSong.facebookUrl
                      if (!userSongLink && !userHasSocials) return null
                      return (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {userSongLink && (
                            <a 
                              href={userSongLink} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium hover:from-purple-600 hover:to-pink-600 transition-colors"
                              title="Listen to song"
                            >
                              <Link className="w-3 h-3" />
                              Listen
                            </a>
                          )}
                          {userSong.youtubeUrl && (
                            <a href={userSong.youtubeUrl} target="_blank" rel="noopener noreferrer" className="w-5 h-5 rounded bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors" title="YouTube">
                              <span className="text-white text-[8px] font-bold">YT</span>
                            </a>
                          )}
                          {userSong.soundcloudUrl && (
                            <a href={userSong.soundcloudUrl} target="_blank" rel="noopener noreferrer" className="w-5 h-5 rounded bg-orange-500 flex items-center justify-center hover:bg-orange-600 transition-colors" title="SoundCloud">
                              <span className="text-white text-[10px] font-bold">☁</span>
                            </a>
                          )}
                          {userSong.instagramUrl && (
                            <a href={userSong.instagramUrl} target="_blank" rel="noopener noreferrer" className="w-5 h-5 rounded bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center hover:opacity-80 transition-opacity" title="Instagram">
                              <span className="text-white text-[8px] font-bold">IG</span>
                            </a>
                          )}
                          {userSong.tiktokUrl && (
                            <a href={userSong.tiktokUrl} target="_blank" rel="noopener noreferrer" className="w-5 h-5 rounded bg-black flex items-center justify-center hover:bg-gray-800 transition-colors" title="TikTok">
                              <span className="text-white text-[8px] font-bold">TT</span>
                            </a>
                          )}
                          {userSong.facebookUrl && (
                            <a href={userSong.facebookUrl} target="_blank" rel="noopener noreferrer" className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center hover:bg-blue-700 transition-colors" title="Facebook">
                              <span className="text-white text-[8px] font-bold">FB</span>
                            </a>
                          )}
                        </div>
                      )
                    })()}
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
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                      onClick={() => startEditing(userSong)}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
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
              </div>
            )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Your Name in Chat</div>
                    <Input
                      placeholder="What's your username in chat?"
                      value={nameInChat}
                      onChange={(e) => setNameInChat(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">So we know who you are!</p>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Genres</div>
                    <Input
                      placeholder="e.g. Rock, Indie, Electronic"
                      value={genres}
                      onChange={(e) => setGenres(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Separate with commas</p>
                  </div>
                </div>
                
                {/* Song Link */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Song Link</div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <Link className="w-4 h-4 text-white" />
                    </div>
                    <Input
                      placeholder="Link to your song (YouTube, Spotify, SoundCloud, etc.)"
                      value={songLink}
                      onChange={(e) => setSongLink(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">No Apple Music or other paid streaming services</p>
                </div>
                
                {/* Social Links - Collapsible (for following the artist) */}
                <div className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSocialLinksOpen(!socialLinksOpen)}
                    className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Artist Socials</span>
                      <span className="text-xs text-muted-foreground">(optional)</span>
                      {(youtubeUrl || soundcloudUrl || instagramUrl || tiktokUrl || facebookUrl) && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          {[youtubeUrl, soundcloudUrl, instagramUrl, tiktokUrl, facebookUrl].filter(Boolean).length} added
                        </span>
                      )}
                    </div>
                    {socialLinksOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  {socialLinksOpen && (
                    <div className="p-3 space-y-3 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-red-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">YT</span>
                          </div>
                          <Input
                            placeholder="YouTube channel"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            className="flex-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-orange-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-lg font-bold">☁</span>
                          </div>
                          <Input
                            placeholder="SoundCloud profile"
                            value={soundcloudUrl}
                            onChange={(e) => setSoundcloudUrl(e.target.value)}
                            className="flex-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">IG</span>
                          </div>
                          <Input
                            placeholder="Instagram profile"
                            value={instagramUrl}
                            onChange={(e) => setInstagramUrl(e.target.value)}
                            className="flex-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-black flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">TT</span>
                          </div>
                          <Input
                            placeholder="TikTok profile"
                            value={tiktokUrl}
                            onChange={(e) => setTiktokUrl(e.target.value)}
                            className="flex-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">FB</span>
                          </div>
                          <Input
                            placeholder="Facebook page"
                            value={facebookUrl}
                            onChange={(e) => setFacebookUrl(e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Help others follow the artist on social media</p>
                    </div>
                  )}
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

      {!isKnownAdminUser && (
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
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
          <CardTitle>Queue</CardTitle>
          <CardDescription>
            {songs.length === 0
              ? 'No songs in queue yet'
              : `${songs.length} song${songs.length === 1 ? '' : 's'} — ranked by points`}
          </CardDescription>
            </div>
            {songs.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={searchCriteria}
                  onChange={(e) => setSearchCriteria(e.target.value as SearchCriteria)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">All</option>
                  <option value="title">Title</option>
                  <option value="artist">Artist</option>
                  <option value="chatName">Chat Name</option>
                  <option value="genre">Genre</option>
                </select>
                <div className="relative w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={searchCriteria === 'all' ? 'Search...' : `Search by ${searchCriteria}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
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
                const bananaSongs = songs.filter((s: { bananaStickers: number }) => s.bananaStickers > 0)
                const totalBananaCount = bananaSongs.reduce((sum: number, s: { bananaStickers: number }) => sum + s.bananaStickers, 0)
                const allPointsTotal = songs.reduce((sum: number, s: { points: number }) => sum + (s.points || 1), 0)
                const hasBanana = bananaSongs.length > 0
                
                // Filter songs based on search query and criteria
                const query = searchQuery.toLowerCase().trim()
                const filteredSongs = query
                  ? songs.filter((s: { title: string; artist: string; nameInChat?: string | null; genres?: string | null }) => {
                      switch (searchCriteria) {
                        case 'title':
                          return s.title.toLowerCase().includes(query)
                        case 'artist':
                          return s.artist.toLowerCase().includes(query)
                        case 'chatName':
                          return s.nameInChat?.toLowerCase().includes(query) ?? false
                        case 'genre':
                          return s.genres?.toLowerCase().includes(query) ?? false
                        case 'all':
                        default:
                          return s.title.toLowerCase().includes(query) || 
                            s.artist.toLowerCase().includes(query) ||
                            (s.nameInChat?.toLowerCase().includes(query) ?? false) ||
                            (s.genres?.toLowerCase().includes(query) ?? false)
                      }
                    })
                  : songs
                
                if (filteredSongs.length === 0 && query) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      No songs match "{searchQuery}"
                    </div>
                  )
                }
                
                return filteredSongs.map((song: { id: number; title: string; artist: string; nameInChat?: string | null; notes?: string | null; genres?: string | null; songLink?: string | null; youtubeUrl?: string | null; spotifyUrl?: string | null; soundcloudUrl?: string | null; instagramUrl?: string | null; tiktokUrl?: string | null; facebookUrl?: string | null; submittedAt: Date | string; points: number; bananaStickers: number; submitterId: string | null }) => {
                  // Use original index for rank (not filtered index)
                  const originalIndex = songs.findIndex((s: { id: number }) => s.id === song.id)
                  const rank = originalIndex + 1
                  const isTop3 = rank <= 3
                  const rankColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600']
                  const idsToCheck = [clientId, user?.id].filter(Boolean)
                  const isOwnSong = song.submitterId && idsToCheck.includes(song.submitterId)
                  const songLinkUrl = song.songLink || song.spotifyUrl
                  const hasSocialLinks = song.youtubeUrl || song.soundcloudUrl || song.instagramUrl || song.tiktokUrl || song.facebookUrl
                  const hasExtraContent = song.genres || song.notes || songLinkUrl || hasSocialLinks
                  
                  // Determine if song should be expanded
                  // Expanded if: user's own song OR explicitly expanded
                  const isExpanded = isOwnSong || expandedSongs.has(song.id)
                  
                  // Calculate percentage chance
                  // Banana songs appear in BOTH sections (banana section + points section)
                  // Non-banana songs only appear in points section
                  const songPoints = song.points || 1
                  let percentChance = 0
                  
                  if (song.bananaStickers > 0 && hasBanana) {
                    // Banana songs get two chances:
                    // 1. Banana section (50%): song.bananaStickers / totalBananaCount
                    // 2. Points section (50%): songPoints / allPointsTotal
                    const chanceInBanana = totalBananaCount > 0 ? (song.bananaStickers / totalBananaCount) * 0.5 : 0
                    const chanceInPoints = allPointsTotal > 0 ? (songPoints / allPointsTotal) * 0.5 : 0
                    percentChance = (chanceInBanana + chanceInPoints) * 100
                  } else {
                    // Non-banana songs only in points section
                    const poolChance = hasBanana ? 0.5 : 1
                    const chanceInPoints = allPointsTotal > 0 ? songPoints / allPointsTotal : 0
                    percentChance = chanceInPoints * poolChance * 100
                  }
                  
                  // Check if this song is being edited
                  const isEditing = editingSongId === song.id
                  
                  if (isEditing) {
                    return (
                      <div
                        key={song.id}
                        className="p-4 border rounded-lg border-blue-500 bg-blue-50"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-blue-700">Editing Song</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditing}
                              className="h-7 w-7 p-0"
                            >
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
                          {/* Song Link */}
                          <Input
                            placeholder="Song link (YouTube, Spotify, SoundCloud, etc.)"
                            value={editSongLink}
                            onChange={(e) => setEditSongLink(e.target.value)}
                          />
                          {/* Social Links - Collapsible */}
                          <div className="border rounded-lg overflow-hidden bg-white">
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
                              {editSocialLinksOpen ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                            {editSocialLinksOpen && (
                              <div className="p-2 space-y-2 border-t">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-red-500 flex items-center justify-center flex-shrink-0">
                                      <span className="text-white text-[8px] font-bold">YT</span>
                                    </div>
                                    <Input
                                      placeholder="YouTube"
                                      value={editYoutubeUrl}
                                      onChange={(e) => setEditYoutubeUrl(e.target.value)}
                                      className="flex-1 h-8 text-sm"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center flex-shrink-0">
                                      <span className="text-white text-[10px] font-bold">☁</span>
                                    </div>
                                    <Input
                                      placeholder="SoundCloud"
                                      value={editSoundcloudUrl}
                                      onChange={(e) => setEditSoundcloudUrl(e.target.value)}
                                      className="flex-1 h-8 text-sm"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                                      <span className="text-white text-[8px] font-bold">IG</span>
                                    </div>
                                    <Input
                                      placeholder="Instagram"
                                      value={editInstagramUrl}
                                      onChange={(e) => setEditInstagramUrl(e.target.value)}
                                      className="flex-1 h-8 text-sm"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-black flex items-center justify-center flex-shrink-0">
                                      <span className="text-white text-[8px] font-bold">TT</span>
                                    </div>
                                    <Input
                                      placeholder="TikTok"
                                      value={editTiktokUrl}
                                      onChange={(e) => setEditTiktokUrl(e.target.value)}
                                      className="flex-1 h-8 text-sm"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center flex-shrink-0">
                                      <span className="text-white text-[8px] font-bold">FB</span>
                                    </div>
                                    <Input
                                      placeholder="Facebook"
                                      value={editFacebookUrl}
                                      onChange={(e) => setEditFacebookUrl(e.target.value)}
                                      className="flex-1 h-8 text-sm"
                                    />
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
                              onClick={() => handleEditSubmit(song.id)}
                              disabled={updateMutation.isPending || !editTitle.trim() || !editArtist.trim()}
                            >
                              {updateMutation.isPending ? 'Saving...' : 'Save'}
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
                      </div>
                    )
                  }
                  
                  // Collapsed view (single row)
                  if (!isExpanded) {
                    const CollapsedWrapper = hasExtraContent ? 'button' : 'div'
                    return (
                      <CollapsedWrapper
                        key={song.id}
                        type={hasExtraContent ? "button" : undefined}
                        onClick={hasExtraContent ? () => toggleSongExpanded(song.id) : undefined}
                        className={`flex items-center gap-3 px-3 py-2 border rounded-lg transition-colors text-left w-full ${
                          hasExtraContent ? 'cursor-pointer hover:bg-accent' : ''
                        } ${
                          song.bananaStickers > 0 
                            ? 'border-yellow-400 bg-yellow-50' 
                            : isTop3 
                              ? 'border-purple-500/30 bg-purple-500/5' 
                              : ''
                        }`}
                      >
                        {/* Rank */}
                        <div className={`w-6 text-center font-bold text-sm flex-shrink-0 ${isTop3 ? rankColors[rank - 1] : 'text-muted-foreground'}`}>
                          {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
                        </div>
                        
                        {/* Banana indicator */}
                        {song.bananaStickers > 0 && (
                          <span className="flex items-center gap-0.5 flex-shrink-0" title={`${song.bananaStickers} banana sticker${song.bananaStickers > 1 ? 's' : ''}`}>
                            <img src="/banana sticker.png" alt="🍌" className="w-4 h-4" />
                            {song.bananaStickers > 1 && <span className="text-xs text-amber-600">×{song.bananaStickers}</span>}
                          </span>
                        )}
                        
                        {/* Title & Artist inline */}
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <span className="font-medium truncate">{song.title}</span>
                          <span className="text-muted-foreground text-sm truncate">— {song.artist}</span>
                          {song.nameInChat && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded flex-shrink-0">@{song.nameInChat}</span>
                          )}
                        </div>
                        
                        {/* Expand indicator if has extra content */}
                        {hasExtraContent && (
                          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        
                        {/* Points badge */}
                        <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 rounded-full flex-shrink-0">
                          <Sparkles className="w-3 h-3 text-purple-500" />
                          <span className="text-sm font-semibold text-purple-600">{song.points}</span>
                        </div>
                      </CollapsedWrapper>
                    )
                  }
                  
                  // Expanded view (full details)
                  return (
                  <div
                    key={song.id}
                    className={`border rounded-lg transition-colors ${
                      isOwnSong 
                        ? 'border-green-500 bg-green-500/10 ring-1 ring-green-500/30' 
                        : song.bananaStickers > 0 
                          ? 'border-yellow-400 bg-yellow-50' 
                          : isTop3 
                            ? 'border-purple-500/30 bg-purple-500/5' 
                            : ''
                    }`}
                  >
                    {/* Collapsible header - click to collapse (unless it's your own song) */}
                    {(() => {
                      const headerContent = (
                        <>
                          {/* Rank */}
                          <div className={`w-6 text-center font-bold text-sm flex-shrink-0 ${isTop3 ? rankColors[rank - 1] : 'text-muted-foreground'}`}>
                            {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
                          </div>
                          
                          {/* Banana indicator */}
                          {song.bananaStickers > 0 && (
                            <span className="flex items-center gap-0.5 flex-shrink-0" title={`${song.bananaStickers} banana sticker${song.bananaStickers > 1 ? 's' : ''}`}>
                              {Array.from({ length: Math.min(song.bananaStickers, 3) }).map((_, i) => (
                                <img key={`banana-exp-${song.id}-${i}`} src="/banana sticker.png" alt="🍌" className="w-4 h-4" />
                              ))}
                              {song.bananaStickers > 3 && <span className="text-xs text-amber-600">+{song.bananaStickers - 3}</span>}
                            </span>
                          )}
                          
                          {/* Title & Artist */}
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className="font-medium truncate">{song.title}</span>
                            {isOwnSong && <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded flex-shrink-0">You</span>}
                            <span className="text-muted-foreground text-sm truncate">— {song.artist}</span>
                            {song.nameInChat && (
                              <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded flex-shrink-0">@{song.nameInChat}</span>
                            )}
                          </div>
                          
                          {/* Collapse indicator (not for own song) */}
                          {!isOwnSong && (
                            <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          
                          {/* Points badge */}
                          <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 rounded-full flex-shrink-0">
                            <Sparkles className="w-3 h-3 text-purple-500" />
                            <span className="text-sm font-semibold text-purple-600">{song.points}</span>
                          </div>
                        </>
                      )
                      
                      return isOwnSong ? (
                        <div className="flex items-center gap-3 px-3 py-2">
                          {headerContent}
                        </div>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => toggleSongExpanded(song.id)}
                          className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent/50 text-left w-full"
                        >
                          {headerContent}
                        </button>
                      )
                    })()}
                    
                    {/* Expanded content */}
                    <div className="px-3 pb-3 pt-1 border-t border-border/50">
                      <div className="flex items-start gap-4">
                        {/* Song details */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {song.genres && (
                            <div className="flex flex-wrap gap-1">
                              {song.genres.split(',').map((genre) => (
                                <span key={genre.trim()} className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                  {genre.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                          {(songLinkUrl || hasSocialLinks) && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {songLinkUrl && (
                                <a 
                                  href={songLinkUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium hover:from-purple-600 hover:to-pink-600 transition-colors"
                                  title="Listen to song"
                                >
                                  <Link className="w-3 h-3" />
                                  Listen
                                </a>
                              )}
                              {song.youtubeUrl && (
                                <a href={song.youtubeUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="w-5 h-5 rounded bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors" title="YouTube">
                                  <span className="text-white text-[8px] font-bold">YT</span>
                                </a>
                              )}
                              {song.soundcloudUrl && (
                                <a href={song.soundcloudUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="w-5 h-5 rounded bg-orange-500 flex items-center justify-center hover:bg-orange-600 transition-colors" title="SoundCloud">
                                  <span className="text-white text-[10px] font-bold">☁</span>
                                </a>
                              )}
                              {song.instagramUrl && (
                                <a href={song.instagramUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="w-5 h-5 rounded bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center hover:opacity-80 transition-opacity" title="Instagram">
                                  <span className="text-white text-[8px] font-bold">IG</span>
                                </a>
                              )}
                              {song.tiktokUrl && (
                                <a href={song.tiktokUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="w-5 h-5 rounded bg-black flex items-center justify-center hover:bg-gray-800 transition-colors" title="TikTok">
                                  <span className="text-white text-[8px] font-bold">TT</span>
                                </a>
                              )}
                              {song.facebookUrl && (
                                <a href={song.facebookUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center hover:bg-blue-700 transition-colors" title="Facebook">
                                  <span className="text-white text-[8px] font-bold">FB</span>
                                </a>
                              )}
                            </div>
                          )}
                          {song.notes && (
                            <div className="text-xs text-muted-foreground italic">
                              "{song.notes}"
                            </div>
                          )}
                        </div>
                        
                        {/* Right side controls */}
                        <div className="flex items-center gap-2 flex-shrink-0">
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
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-16 h-7 text-xs"
                                    min="1"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation()
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
                                    onClick={(e) => {
                                      e.stopPropagation()
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
                                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-green-600 hover:text-green-700 hover:bg-green-100" onClick={(e) => { e.stopPropagation(); addPointsMutation.mutate({ id: song.id, points: 1 }) }}>+1</Button>
                                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-green-600 hover:text-green-700 hover:bg-green-100" onClick={(e) => { e.stopPropagation(); addPointsMutation.mutate({ id: song.id, points: 5 }) }}>+5</Button>
                                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-green-600 hover:text-green-700 hover:bg-green-100" onClick={(e) => { e.stopPropagation(); addPointsMutation.mutate({ id: song.id, points: 10 }) }}>+10</Button>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); addPointsMutation.mutate({ id: song.id, points: -1 }) }}>-1</Button>
                                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); addPointsMutation.mutate({ id: song.id, points: -5 }) }}>-5</Button>
                                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); addPointsMutation.mutate({ id: song.id, points: -10 }) }}>-10</Button>
                                    </div>
                                  </div>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-100" onClick={(e) => { e.stopPropagation(); setCustomPointsSongId(song.id) }}>
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                  <div className="flex items-center gap-0.5 border rounded px-1 py-0.5 bg-amber-50">
                                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-xs text-amber-700 hover:bg-amber-200" onClick={(e) => { e.stopPropagation(); bananaMutation.mutate({ id: song.id, delta: -1 }) }} disabled={song.bananaStickers === 0} title="Remove banana sticker">-</Button>
                                    <span className="flex items-center gap-0.5 min-w-[28px] justify-center">
                                      <img src="/banana sticker.png" alt="🍌" className="w-3.5 h-3.5" />
                                      <span className="text-xs font-medium text-amber-700">{song.bananaStickers}</span>
                                    </span>
                                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-xs text-amber-700 hover:bg-amber-200" onClick={(e) => { e.stopPropagation(); bananaMutation.mutate({ id: song.id, delta: 1 }) }} title="Add banana sticker">+</Button>
                                  </div>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100" onClick={(e) => { e.stopPropagation(); startEditing(song) }} title="Edit song">
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${song.title}" by ${song.artist}?`)) { deleteMutation.mutate(song.id) } }}>
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
                              className="h-7 px-2 text-muted-foreground hover:text-foreground"
                              onClick={(e) => { e.stopPropagation(); setPreviewSong(song) }}
                              title="See chances on wheel"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
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
