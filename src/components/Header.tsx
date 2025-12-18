import { Link } from '@tanstack/react-router'
import ClerkHeader from '../integrations/clerk/header-user.tsx'

export default function Header() {
  return (
    <header className="p-4 flex items-center justify-between bg-gray-800 text-white shadow-lg">
      <Link to="/">
        <h1 className="text-xl font-semibold">
          <img
            src="/tanstack-word-logo-white.svg"
            alt="Music Queue"
            className="h-10"
          />
        </h1>
      </Link>
      <ClerkHeader />
    </header>
  )
}
