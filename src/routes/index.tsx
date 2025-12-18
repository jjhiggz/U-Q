import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@clerk/clerk-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SpinWheelModal } from '@/components/SpinWheelModal'
import { getSongs, submitSong, clearQueue, deleteSong, addPoints } from '@/server/songs'
import { Music, Trash2, Sparkles, Plus } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: App,
})

const ADMIN_EMAILS = ['jonathan.higger@gmail.com']

function App() {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [spinWheelOpen, setSpinWheelOpen] = useState(false)
  const [customPointsSongId, setCustomPointsSongId] = useState<number | null>(null)
  const [customPointsValue, setCustomPointsValue] = useState('')
  const queryClient = useQueryClient()
  const { user } = useUser()
  
  const userEmail = user?.primaryEmailAddress?.emailAddress
  const isKnownAdminUser = userEmail ? ADMIN_EMAILS.includes(userEmail) : false

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['songs'],
    queryFn: () => getSongs(),
  })

  const submitMutation = useMutation({
    mutationFn: (data: { title: string; artist: string }) => submitSong({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
      setTitle('')
      setArtist('')
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim() && artist.trim()) {
      submitMutation.mutate({ title: title.trim(), artist: artist.trim() })
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
          <Music className="w-10 h-10" />
          Music Queue
        </h1>
        <p className="text-muted-foreground">
          Submit a song for review during the livestream
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Submit a Song</CardTitle>
          <CardDescription>
            Enter the song title and artist name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Song Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Artist Name"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={submitMutation.isPending} className="w-full">
              {submitMutation.isPending ? 'Submitting...' : 'Submit Song'}
            </Button>
          </form>
        </CardContent>
      </Card>

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
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>
            {songs.length === 0
              ? 'No songs in queue yet'
              : `${songs.length} song${songs.length === 1 ? '' : 's'} — ranked by points`}
          </CardDescription>
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
              {songs.map((song: { id: number; title: string; artist: string; submittedAt: Date | string; points: number }, index: number) => {
                const rank = index + 1
                const isTop3 = rank <= 3
                const rankColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600']
                
                return (
                  <div
                    key={song.id}
                    className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-accent transition-colors ${isTop3 ? 'border-purple-500/30 bg-purple-500/5' : ''}`}
                  >
                    {/* Rank */}
                    <div className={`w-8 text-center font-bold text-lg ${isTop3 ? rankColors[rank - 1] : 'text-muted-foreground'}`}>
                      {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
                    </div>
                    
                    {/* Song info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{song.title}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {song.artist}
                      </div>
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
                                const pts = parseInt(customPointsValue)
                                if (pts > 0) {
                                  addPointsMutation.mutate({ id: song.id, points: pts })
                                }
                              }}
                              disabled={!customPointsValue || parseInt(customPointsValue) <= 0}
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
                    
                    {/* Points badge */}
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/10 rounded-full">
                      <Sparkles className="w-3 h-3 text-purple-500" />
                      <span className="text-sm font-semibold text-purple-600">{song.points}</span>
                      <span className="text-xs text-purple-500/70">pts</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
