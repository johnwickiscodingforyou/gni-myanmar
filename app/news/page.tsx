"use client"
export const dynamic = "force-dynamic"
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import { mm } from '@/lib/mm'

interface Article {
  id: string; article_title: string; url: string; source: string
  is_selected: boolean; myanmar_brief: string | null
  run_date: string; escalation_score: number | null
  english_conclusion: string | null
  myanmar_conclusion: string | null
  translation_status: string | null
  translation_provider: string | null
}

export default function NewsPage() {
  const [selected, setSelected] = useState<Article[]>([])
  const [collected, setCollected] = useState<Article[]>([])
  const [loadingSel, setLoadingSel] = useState(true)
  const [loadingAll, setLoadingAll] = useState(true)
  const [displayCount, setDisplayCount] = useState(50)
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

  const tgLink = (url: string, text: string) =>
    `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="mb-1">
            <h1 className="text-xl font-bold text-white">📰 News Archive</h1>
            <p className="text-xs text-gray-400">What are the key articles driving GNI intelligence analysis?</p>
          </div>
          <a href="/" className="inline-block mt-2 mb-1 text-xs text-blue-400 border border-blue-800 rounded px-3 py-1 hover:bg-blue-950 transition-colors">← Dashboard</a>
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

                {/* Title + Source */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <a href={a.url} target="_blank" className="text-sm font-bold text-white hover:text-blue-300 leading-snug">{a.article_title}</a>
                  <span className="text-xs text-amber-400 shrink-0 border border-amber-800 rounded px-2 py-0.5">{a.source}</span>
                </div>
                <div className="text-xs text-gray-500 mb-3">{a.run_date}</div>

                {/* English conclusion — always shown */}
                {a.english_conclusion && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-blue-400">EN</span>
                      <span className="text-xs text-gray-500">Pro-Democracy Myanmar POV</span>
                    </div>
                    <p className="text-xs text-gray-200 leading-relaxed">{a.english_conclusion}</p>
                  </div>
                )}

                {/* Myanmar — translated */}
                {a.translation_status === 'translated' && a.myanmar_conclusion ? (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-amber-400">MM</span>
                      <span className="text-xs text-green-600 border border-green-800 rounded px-1.5 py-0.5">Translated to Myanmar Language</span>
                      {a.translation_provider && (
                        <span className={`text-xs rounded px-1.5 py-0.5 border ${
                          a.translation_provider === 'groq'       ? 'text-green-400 border-green-700' :
                          a.translation_provider === 'gemini'     ? 'text-purple-400 border-purple-700' :
                          a.translation_provider === 'cerebras'   ? 'text-blue-400 border-blue-700' :
                          a.translation_provider === 'openrouter'   ? 'text-orange-400 border-orange-700' :
                          a.translation_provider === 'github'       ? 'text-cyan-400 border-cyan-700' :
                          a.translation_provider === 'cloudflare'   ? 'text-teal-400 border-teal-700' :
                          'text-gray-400 border-gray-700'
                        }`}>{a.translation_provider.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="bg-amber-950 border border-amber-800 rounded-lg p-3">
                      <p className="text-xs text-amber-100 leading-relaxed">{a.myanmar_conclusion}</p>
                      <a href={tgLink(a.url, a.myanmar_conclusion)} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-xs text-blue-400 border border-blue-800 rounded px-2 py-0.5 hover:bg-blue-950">Share to Telegram</a>
                    </div>
                  </div>
                ) : (a.translation_status === 'pending' || (!a.translation_status && !!a.english_conclusion)) ? (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-amber-500 border border-amber-800 rounded px-2 py-0.5 animate-pulse">Myanmar Translation is on the way...</span>
                  </div>
                ) : null}

                {/* Fallback: old myanmar_brief only */}
                {!a.english_conclusion && a.myanmar_brief && (
                  <div>
                    <button onClick={() => setExpandedId(expandedId === a.id ? null : a.id)} className="text-xs text-amber-400 hover:text-amber-300 mb-1">
                      {expandedId === a.id ? 'Hide Myanmar Brief' : 'Show Myanmar Brief'}
                    </button>
                    {expandedId === a.id && (
                      <div className="bg-amber-950 border border-amber-800 rounded-lg p-3">
                        <p className="text-xs text-amber-100 leading-relaxed">{a.myanmar_brief}</p>
                        <a href={tgLink(a.url, a.myanmar_brief)} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-xs text-blue-400 border border-blue-800 rounded px-2 py-0.5 hover:bg-blue-950">Share to Telegram</a>
                      </div>
                    )}
                  </div>
                )}

              </div>
            ))}
          </div>
        </div>

        {/* SECTION B: COLLECTED ARTICLES */}
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
            {allCollected.slice(0, displayCount).map((a, i) => (
              <div key={a.id} className={`flex items-start gap-3 px-4 py-3 ${i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'} hover:bg-gray-700 transition-colors border-b border-gray-800`}>
                <span className="text-xs text-gray-600 shrink-0 w-16">{a.source}</span>
                <a href={a.url} target="_blank" className="text-xs text-gray-300 hover:text-white flex-1">{a.article_title}</a>
                <span className="text-xs text-gray-600 shrink-0">{a.run_date}</span>
              </div>
            ))}
          </div>

          {displayCount < allCollected.length && (
            <div className="text-center mt-3">
              <button onClick={() => setDisplayCount(prev => prev + 50)} className="text-xs text-blue-400 border border-blue-800 rounded px-4 py-1.5 hover:bg-blue-950">
                Load More ({Math.min(50, allCollected.length - displayCount)} more of {allCollected.length} total)
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
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-gray-600">GNI Myanmar | News Archive | Higher Diploma in Computer Science | Spring University Myanmar (SUM)</div>
      </footer>
    </div>
  )
}