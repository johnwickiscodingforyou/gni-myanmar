"use client"
export const dynamic = "force-dynamic"
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import { mm } from '@/lib/mm'

interface Article {
  id: string; article_title: string; url: string; source: string
  is_selected: boolean; myanmar_brief: string | null
  run_date: string; escalation_score: number | null
}

export default function NewsPage() {
  const [selected, setSelected] = useState<Article[]>([])
  const [collected, setCollected] = useState<Article[]>([])
  const [loadingSel, setLoadingSel] = useState(true)
  const [loadingAll, setLoadingAll] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/article-briefs?selected=true&limit=500')
      .then(r => r.json())
      .then(d => { setSelected(d.articles || []); setLoadingSel(false) })
      .catch(() => setLoadingSel(false))
    fetch('/api/article-briefs?limit=500')
      .then(r => r.json())
      .then(d => { setCollected(d.articles || []); setLoadingAll(false) })
      .catch(() => setLoadingAll(false))
  }, [])

  const allCollected = collected.filter(a => !a.is_selected)

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="mb-1">
            <h1 className="text-xl font-bold text-white">News Archive</h1>
            <p className="text-xs text-gray-400">365-day archive | Selected + Collected articles</p>
          </div>
          <Nav />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-4">
        <div className="bg-gray-900 border border-green-800 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-200 leading-relaxed">{mm.news_intro}</p>
        </div>

        {/* SECTION A: SELECTED ARTICLES */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-white">Selected Articles</div>
            <span className="text-xs text-amber-400 border border-amber-800 rounded px-2 py-0.5">{selected.length} articles</span>
          </div>
          {loadingSel && (
          <div className="space-y-2 animate-pulse">
              <div className="bg-gray-800 rounded-xl h-12 w-full"></div>
              <div className="bg-gray-800 rounded-xl h-12 w-full"></div>
              <div className="bg-gray-800 rounded-xl h-12 w-3/4"></div>
            </div>
          )}
          <div className="space-y-3">
            {selected.map(a => (
              <div key={a.id} className="bg-gray-900 border border-amber-900 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <a href={a.url} target="_blank" className="text-sm font-bold text-white hover:text-blue-300 leading-snug">{a.article_title}</a>
                  <span className="text-xs text-amber-400 shrink-0 border border-amber-800 rounded px-2 py-0.5">{a.source}</span>
                </div>
                <div className="text-xs text-gray-500 mb-2">{a.run_date}</div>
                {a.myanmar_brief && (
                  <div>
                    <button onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                      className="text-xs text-amber-400 hover:text-amber-300 mb-1">
                      {expandedId === a.id ? 'Hide Myanmar Brief' : 'Show Myanmar Brief'}
                    </button>
                    {expandedId === a.id && (
                      <div className="bg-amber-950 border border-amber-800 rounded-lg p-3">
                        <p className="text-xs text-amber-100 leading-relaxed">{a.myanmar_brief}</p>
                        <a
                          href={`https://t.me/share/url?url=${encodeURIComponent(a.url)}&text=${encodeURIComponent(a.myanmar_brief || a.article_title)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-block mt-2 text-xs text-blue-400 border border-blue-800 rounded px-2 py-0.5 hover:bg-blue-950">
                          Share to Telegram
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SECTION B: ALL COLLECTED ARTICLES */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-white">စုဆောင်းထားသော သတင်းများ / Collected Articles</div>
            <span className="text-xs text-gray-400 border border-gray-700 rounded px-2 py-0.5">{allCollected.length} articles</span>
          </div>
          {loadingAll && (
          <div className="space-y-2 animate-pulse">
              <div className="bg-gray-800 rounded-xl h-12 w-full"></div>
              <div className="bg-gray-800 rounded-xl h-12 w-full"></div>
              <div className="bg-gray-800 rounded-xl h-12 w-3/4"></div>
            </div>
          )}
          <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
            {(showAll ? allCollected : allCollected.slice(0, 30)).map((a, i) => (
              <div key={a.id} className={`flex items-start gap-3 px-4 py-3 ${i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'} hover:bg-gray-700 transition-colors border-b border-gray-800`}>
                <span className="text-xs text-gray-600 shrink-0 w-16">{a.source}</span>
                <a href={a.url} target="_blank" className="text-xs text-gray-300 hover:text-white flex-1">{a.article_title}</a>
                <span className="text-xs text-gray-600 shrink-0">{a.run_date}</span>
              </div>
            ))}
          </div>
          {allCollected.length > 30 && (
            <div className="text-center mt-3">
              <button onClick={() => setShowAll(!showAll)}
                className="text-xs text-blue-400 border border-blue-800 rounded px-4 py-1.5 hover:bg-blue-950">
                {showAll ? 'Show Less' : `Show All ${allCollected.length} Articles`}
              </button>
            </div>
          )}
        </div>
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
