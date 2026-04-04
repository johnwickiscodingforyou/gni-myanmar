"use client"
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import { mm } from '@/lib/mm'
import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/components/MiniMap'), { ssr: false })

interface ArticleEvent {
  id: string
  source: string
  bias: string
  title: string
  url: string
  summary: string
  stage3_score: number
  location_name: string
  lat: number
  lng: number
  created_at: string
}

interface MapEvent {
  id: string
  title: string
  lat: number
  lng: number
  location_name: string
  source: string
  bias: string
  url?: string
}

interface Article {
  id: string
  article_title: string
  url: string
  source: string
  myanmar_brief: string | null
}

export default function MapPage() {
  const [events, setEvents] = useState<MapEvent[]>([])
  const [briefs, setBriefs] = useState<Article[]>([])
  const [selected, setSelected] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [daysFilter, setDaysFilter] = useState(7)

  // Fetch briefs once for Myanmar slide-up panel
  useEffect(() => {
    fetch('/api/article-briefs?geo=true&limit=200')
      .then(r => r.json())
      .then(d => setBriefs(d.articles || []))
      .catch(() => {})
  }, [])

  // Re-fetch article-events on every filter change — real server-side filtering like QS
  useEffect(() => {
    setLoading(true)
    fetch(`/api/article-events?days=${daysFilter}`)
      .then(r => r.json())
      .then(d => {
        const rawEvents: ArticleEvent[] = d.events || []
        const mapped: MapEvent[] = rawEvents
          .filter(e => e.lat !== null && e.lng !== null)
          .map(e => ({
            id: e.id,
            title: e.title,
            lat: e.lat,
            lng: e.lng,
            location_name: e.location_name,
            source: e.source,
            url: e.url,
            bias: !e.stage3_score       ? 'neutral'
                : e.stage3_score >= 15  ? 'bearish'
                : e.stage3_score >= 10  ? 'bearish'
                : e.stage3_score >= 7   ? 'neutral'
                : 'bullish',
          }))
        setEvents(mapped)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [daysFilter])

  const findBrief = (title: string) =>
    briefs.find(b => b.article_title?.toLowerCase().includes(title?.toLowerCase().slice(0, 30)))

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* HEADER */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <a href="/" className="inline-block mb-2 text-xs text-blue-400 border border-blue-800 rounded px-3 py-1 hover:bg-blue-950 transition-colors">← Dashboard</a>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-white">🗺 World Map</h1>
              <p className="text-xs text-gray-400 mt-0.5 max-w-xl">{mm.map_intro}</p>
            </div>
            {/* DAYS FILTER — re-fetches on click like QS */}
            <div className="flex gap-2 shrink-0">
              {[1, 3, 7, 14].map(d => (
                <button key={d} onClick={() => setDaysFilter(d)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    daysFilter === d ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <Nav />
        </div>
      </header>

      {/* LEGEND */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-6 text-xs text-gray-400 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-600 inline-block shrink-0"></span>
          Bearish / High Risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block shrink-0"></span>
          Neutral / Medium Risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block shrink-0"></span>
          Bullish / Low Risk
        </span>
        <span className="text-gray-600 hidden md:inline">
          {loading ? 'Loading...' : `${events.length} events | last ${daysFilter}d`} | Click pin for details
        </span>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="flex items-center justify-center h-96 text-gray-400 animate-pulse">
          <p>Loading events...</p>
        </div>
      )}

      {/* FULL SCREEN MAP */}
      {!loading && (
        <MapView events={events} height="calc(100vh - 140px)" />
      )}

      {/* BELOW MAP — source cards */}
      {!loading && (
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-gray-500">
              Showing <span className="text-white font-bold">{events.length}</span> events (last {daysFilter}d)
            </div>
          </div>

          <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Sources in current analysis</div>
          <div className="text-xs text-gray-600 mb-3">Click a card to see Myanmar brief</div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {events.slice(0, 24).map(ev => {
              const brief = findBrief(ev.title)
              const bias = ev.bias?.toLowerCase()
              const dotColor = bias === 'bearish' ? 'bg-red-500' : bias === 'bullish' ? 'bg-green-500' : 'bg-yellow-500'
              return (
                <div key={ev.id || ev.title}
                  onClick={() => setSelected(brief || null)}
                  className="bg-gray-900 border border-gray-700 rounded-xl p-3 cursor-pointer hover:border-blue-600 transition-colors">
                  <div className="flex items-start gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${dotColor}`}></span>
                    <div className="text-xs font-bold text-white leading-snug">
                      {ev.title?.slice(0, 75)}{(ev.title?.length || 0) > 75 ? '...' : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 ml-4">
                    <span>{ev.source}</span>
                  </div>
                  {brief?.myanmar_brief && (
                    <div className="mt-2 ml-4 text-xs text-amber-200 leading-relaxed line-clamp-2">{brief.myanmar_brief}</div>
                  )}
                </div>
              )
            })}
          </div>

          {events.length > 24 && (
            <div className="text-center mt-3 text-xs text-gray-600">
              Showing 24 of {events.length} events — use time filter to narrow results
            </div>
          )}

          <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-3 mt-4">
            <p className="text-xs text-yellow-300">Disclaimer: GNI reports are for informational purposes only. Not financial advice. Higher Diploma in Computer Science | Spring University Myanmar (SUM)</p>
          </div>
        </div>
      )}

      {/* MYANMAR BRIEF SLIDE-UP PANEL — unique to GNI Myanmar! */}
      {selected?.myanmar_brief && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-amber-700 p-4 z-50 shadow-2xl">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">Myanmar Brief</div>
                <p className="text-sm text-amber-100 leading-relaxed">{selected.myanmar_brief}</p>
                {selected.url && (
                  <a href={selected.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-400 mt-2 inline-block border border-blue-800 rounded px-2 py-0.5 hover:bg-blue-950">
                    Read full article →
                  </a>
                )}
              </div>
              <button onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-white shrink-0 border border-gray-700 rounded px-2 py-0.5 hover:border-gray-500 transition-colors">
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-gray-600">
          GNI Myanmar | World Map | Higher Diploma in Computer Science | Spring University Myanmar (SUM)
        </div>
      </footer>
    </div>
  )
}
