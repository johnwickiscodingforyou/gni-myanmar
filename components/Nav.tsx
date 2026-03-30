"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PRIMARY = [
  { href: '/',       label: 'Dashboard', color: 'bg-blue-900 hover:bg-blue-700 border-blue-700 text-blue-200' },
  { href: '/map',    label: 'Map',       color: 'bg-blue-900 hover:bg-blue-700 border-blue-700 text-blue-200' },
  { href: '/market', label: 'Market',    color: 'bg-amber-900 hover:bg-amber-700 border-amber-700 text-amber-200' },
  { href: '/news',   label: 'News',      color: 'bg-green-900 hover:bg-green-700 border-green-700 text-green-200' },
  { href: '/intel',  label: 'Intel',     color: 'bg-purple-900 hover:bg-purple-700 border-purple-700 text-purple-200' },
]

const SECONDARY = [
  { href: '/reports',     label: 'Reports',     color: 'bg-teal-900 hover:bg-teal-700 border-teal-700 text-teal-200' },
  { href: '/predictions', label: 'Predictions', color: 'bg-pink-900 hover:bg-pink-700 border-pink-700 text-pink-200' },
  { href: '/health',      label: 'Health',      color: 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200' },
  { href: '/downloads',   label: 'Downloads',   color: 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200' },
  { href: '/about',       label: 'About',       color: 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200' },
]

export default function Nav() {
  const path = usePathname()
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2 mb-1">
        {PRIMARY.filter(l => l.href !== path).map(l => (
          <Link key={l.href} href={l.href}
            className={`border rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${l.color}`}>
            {l.label}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {SECONDARY.filter(l => l.href !== path).map(l => (
          <Link key={l.href} href={l.href}
            className={`border rounded-lg px-2 py-1 text-xs transition-colors ${l.color}`}>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
