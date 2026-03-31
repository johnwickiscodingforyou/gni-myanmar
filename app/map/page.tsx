"use client"
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import dynamic from 'next/dynamic'

const FullMap = dynamic(() => import('@/components/MiniMap'), { ssr: false })

interface Article {
  id: string; article_title: string; url: string; source: string
  lat: number; lng: number; escalation_score: number
  myanmar_brief: string; has_geo: boolean; is_selected: boolean
}

interface MapEvent {
  id: string; title: string; lat: number; lng: number
  location_name: string; source: string; bias: string
}

export default function MapPage() {
  const [events, setEvents] = useState<MapEvent[]>([])
  const [briefs, setBriefs] = useState<Article[]>([])
  const [selected, setSelected] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/article-briefs?geo=true&limit=100')
      .then(r => r.json())
      .then(d => {
        const articles = d.articles || []
        setEvents(articles)
        setBriefs(articles)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const findBrief = (title: string) =>
    briefs.find(b => b.article_title?.toLowerCase().includes(title?.toLowerCase().slice(0, 30)))

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="mb-1">
            <h1 className="text-xl font-bold text-white">World Map</h1>
            <p className="text-xs text-gray-400">Geopolitical Event Map | {events.length} events</p>
          </div>
          <Nav />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-4">
        <div className="bg-gray-900 border border-blue-800 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-200 leading-relaxed">ကမ္ဘာ့အပေသဎုး GNI Myanmar အဒောက်ဆုံး geo-tagged articles ကို မြေပုံနှစ် pin တွင့်် ကြည့်ပြည့်သဎုး။ အပာအခြက် pin ကို နှစ်ကြည့်သဎုးအခါ Myanmar ဘာသာ brief ကို အပောက်သပြည့်ပါသဎုး။ အပာအခြက် article card ကို click ဖြစ်အချက် Myanmar brief ကို အပောက်သတွင့်် ဖြစ်ပါသဎုး။</p>
        </div>
        {loading && (
          <div className="space-y-4 animate-pulse">
              <div className="bg-gray-800 rounded-xl w-full" style={{height:"500px"}}></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-800 rounded-xl h-20"></div>
                <div className="bg-gray-800 rounded-xl h-20"></div>
                <div className="bg-gray-800 rounded-xl h-20"></div>
              </div>
            </div>
        )}
        {!loading && (
          <>
            <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden mb-4" style={{ height: '500px' }}>
              {events.length > 0
                ? <FullMap events={events} height="500px" />
                : <div className="flex items-center justify-center h-full text-gray-500">No events available</div>
              }
            </div>
            <div className="text-xs text-gray-500 mb-3">Click a pin to see Myanmar language brief below</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {events.slice(0, 20).map(ev => {
                const brief = findBrief(ev.title)
                return (
                  <div key={ev.id || ev.title}
                    onClick={() => setSelected(brief || null)}
                    className="bg-gray-900 border border-gray-700 rounded-xl p-3 cursor-pointer hover:border-blue-600 transition-colors">
                    <div className="text-xs font-bold text-white mb-1 leading-snug">{ev.title?.slice(0, 80)}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{ev.source}</span>
                      <span>{ev.location_name}</span>
                    </div>
                    {brief?.myanmar_brief && (
                      <div className="mt-2 text-xs text-amber-200 leading-relaxed line-clamp-2">{brief.myanmar_brief}</div>
                    )}
                  </div>
                )
              })}
            </div>
            {selected?.myanmar_brief && (
              <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-amber-700 p-4 z-50">
                <div className="max-w-5xl mx-auto">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-amber-400 font-bold mb-1">Myanmar Brief</div>
                      <p className="text-sm text-amber-100 leading-relaxed">{selected.myanmar_brief}</p>
                      {selected.url && <a href={selected.url} target="_blank" className="text-xs text-blue-400 mt-1 block">Read full article</a>}
                    </div>
                    <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white text-lg shrink-0">x</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <div className="max-w-5xl mx-auto px-4 pb-4">
        <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-3">
          <p className="text-xs text-yellow-300">Disclaimer: GNI reports are for informational purposes only. Not financial advice. Higher Diploma in Computer Science | Spring University Myanmar (SUM)</p>
        </div>
      </div>
      <footer className="border-t border-gray-800 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-gray-600">Global Nexus Insights Myanmar | Higher Diploma in Computer Science | Spring University Myanmar (SUM)</div>
      </footer>
    </div>
  )
}
