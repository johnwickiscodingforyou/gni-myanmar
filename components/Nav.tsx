"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/map',         label: 'Map',         color: 'bg-blue-900 hover:bg-blue-700 border-blue-700 text-blue-200',     tip: 'Geopolitical events pinned on world map with Myanmar briefs' },
  { href: '/market',      label: 'Market',      color: 'bg-amber-900 hover:bg-amber-700 border-amber-700 text-amber-200', tip: 'Global markets: Commodity, Index, Stocks, Forex, Crypto, Bond' },
  { href: '/news',        label: 'News',        color: 'bg-green-900 hover:bg-green-700 border-green-700 text-green-200', tip: '150+ selected articles and 900+ collected articles with Myanmar briefs' },
  { href: '/intel',       label: 'Intel',       color: 'bg-purple-900 hover:bg-purple-700 border-purple-700 text-purple-200', tip: 'Full AI analysis: Brief, Funnel, Analysis, Pillars, MAD, Predictions' },
  { href: '/reports',     label: 'Reports',     color: 'bg-teal-900 hover:bg-teal-700 border-teal-700 text-teal-200',     tip: 'Intelligence reports archive with escalation scores and MAD verdicts' },
  { href: '/predictions', label: 'Predictions', color: 'bg-pink-900 hover:bg-pink-700 border-pink-700 text-pink-200',     tip: 'MAD agent predictions tracked by GPVS verification system' },
  { href: '/health',      label: 'Health',      color: 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200',     tip: 'Real-time system health check for all GNI Myanmar services' },
  { href: '/downloads',   label: 'Downloads',   color: 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200',     tip: 'Download raw intelligence data as CSV or JSON — free, no login' },
  { href: '/about',       label: 'About',       color: 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200',     tip: 'About GNI Myanmar — mission, pipeline chain, cost breakdown, journey' },
]

export default function Nav() {
  const path = usePathname()
  return (
    <div className="mt-2 relative">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {LINKS.filter(l => l.href !== path).map(l => (
          <div key={l.href} className="relative group shrink-0">
            <Link href={l.href}
              className={`border rounded-lg px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap block ${l.color}`}>
              {l.label}
            </Link>
            <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block w-52 bg-gray-900 border border-gray-700 rounded-lg p-2 shadow-xl pointer-events-none">
              <p className="text-xs text-gray-300 leading-relaxed">{l.tip}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}