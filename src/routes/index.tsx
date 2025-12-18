import { createFileRoute } from '@tanstack/react-router'
import { useUser, SignOutButton } from '@clerk/clerk-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const { isSignedIn, isLoaded } = useUser()

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!isSignedIn) {
    return null
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Music Queue</CardTitle>
          <CardDescription>Welcome to your music queue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignOutButton>
            <Button variant="outline" className="w-full">
              Sign Out
            </Button>
          </SignOutButton>
        </CardContent>
      </Card>
    </div>
  )
}
