import { Link } from '@tanstack/react-router'
import ClerkHeader from '../integrations/clerk/header-user.tsx'
import { Music } from 'lucide-react'

export default function Header() {
  return (
    <header className="p-4 flex items-center justify-between bg-gray-800 text-white shadow-lg">
      <Link to="/" className="flex items-center gap-2">
        <Music className="w-6 h-6" />
        <h1 className="text-xl font-semibold">UQ</h1>
      </Link>
      <ClerkHeader />
    </header>
  )
}
