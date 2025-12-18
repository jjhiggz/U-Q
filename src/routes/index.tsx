import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getSongs, submitSong } from '@/server/songs'
import { Music } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const queryClient = useQueryClient()

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

      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
          <CardDescription>
            {songs.length === 0
              ? 'No songs in queue yet'
              : `${songs.length} song${songs.length === 1 ? '' : 's'} in queue`}
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
              {songs.map((song: { id: number; title: string; artist: string; submittedAt: Date | string }) => (
                <div
                  key={song.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div>
                    <div className="font-medium">{song.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {song.artist}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(song.submittedAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
