"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/',            label: 'Dashboard',   en: 'Dashboard',   color: 'bg-blue-900 hover:bg-blue-700 border-blue-700 text-blue-200' },
  { href: '/reports',     label: 'Reports',     en: 'Reports',     color: 'bg-green-900 hover:bg-green-700 border-green-700 text-green-200' },
  { href: '/markets',     label: 'Markets',     en: 'Markets',     color: 'bg-amber-900 hover:bg-amber-700 border-amber-700 text-amber-200' },
  { href: '/predictions', label: 'Predictions', en: 'Predictions', color: 'bg-purple-900 hover:bg-purple-700 border-purple-700 text-purple-200' },
  { href: '/about',       label: 'About',       en: 'About',       color: 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200' },
]

export default function Nav() {
  const path = usePathname()
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {LINKS.filter(l => l.href !== path).map(l => (
        <Link key={l.href} href={l.href}
          className={`border rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${l.color}`}>
          {l.en}
        </Link>
      ))}
    </div>
  )
}
