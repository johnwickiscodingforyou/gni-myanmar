"use client"
export const dynamic = "force-dynamic"
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import { mm } from '@/lib/mm'

interface Article {
  id: string
  article_title: string
  url: string
  source: string
  is_selected: boolean
  myanmar_brief: string | null
  run_date: string
  escalation_score: number | null
  english_conclusion: string | null
  myanmar_conclusion: string | null
  translation_status: string | null
  translation_provider: string | null
}

interface DateEntry {
  run_date: string
  selected_count: number
  collected_count: number
}

export default function NewsPage() {
  const [dates, setDates] = useState<DateEntry[]>([])
  const [loadingDates, setLoadingDates] = useState(true)

  // Today's selected articles — always expanded at top
  const [todaySelected, setTodaySelected] = useState<Article[]>([])
  const [loadingToday, setLoadingToday] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Lazy loaded data — keyed by run_date
  const [loadedSelected, setLoadedSelected] = useState<Record<string, Article[]>>({})
  const [loadedCollected, setLoadedCollected] = useState<Record<string, Article[]>>({})
  const [loadingSelected, setLoadingSelected] = useState<Record<string, boolean>>({})
  const [loadingCollected, setLoadingCollected] = useState<Record<string, boolean>>({})

  // Expanded state for collapsed sections
  const [expandedSelectedDates, setExpandedSelectedDates] = useState<Set<string>>(new Set())
  const [expandedCollectedDates, setExpandedCollectedDates] = useState<Set<string>>(new Set())

  const today = new Date().toISOString().split('T')[0]

  // Step 1 — Load dates list (lightweight)
  useEffect(() => {
    fetch('/api/article-dates')
      .then(r => r.json())
      .then(d => { setDates(d.dates || []); setLoadingDates(false) })
      .catch(() => setLoadingDates(false))
  }, [])

  // Step 2 — Load today's selected articles (always expanded)
  useEffect(() => {
    fetch(`/api/article-briefs?selected=true&date=${today}&limit=2000`)
      .then(r => r.json())
      .then(d => { setTodaySelected(d.articles || []); setLoadingToday(false) })
      .catch(() => setLoadingToday(false))
  }, [today])

  // Lazy load selected articles for a past date
  function loadSelectedForDate(date: string) {
    if (loadedSelected[date] || loadingSelected[date]) return
    setLoadingSelected(prev => ({ ...prev, [date]: true }))
    fetch(`/api/article-briefs?selected=true&date=${date}&limit=2000`)
      .then(r => r.json())
      .then(d => {
        setLoadedSelected(prev => ({ ...prev, [date]: d.articles || [] }))
        setLoadingSelected(prev => ({ ...prev, [date]: false }))
      })
      .catch(() => setLoadingSelected(prev => ({ ...prev, [date]: false })))
  }

  // Lazy load collected articles for a date
  function loadCollectedForDate(date: string) {
    if (loadedCollected[date] || loadingCollected[date]) return
    setLoadingCollected(prev => ({ ...prev, [date]: true }))
    fetch(`/api/article-briefs?date=${date}&limit=2000`)
      .then(r => r.json())
      .then(d => {
        // Filter to collected only (is_selected = false)
        const collected = (d.articles || []).filter((a: Article) => !a.is_selected)
        setLoadedCollected(prev => ({ ...prev, [date]: collected }))
        setLoadingCollected(prev => ({ ...prev, [date]: false }))
      })
      .catch(() => setLoadingCollected(prev => ({ ...prev, [date]: false })))
  }

  function toggleSelectedDate(date: string) {
    const next = new Set(expandedSelectedDates)
    if (next.has(date)) {
      next.delete(date)
    } else {
      next.add(date)
      loadSelectedForDate(date)
    }
    setExpandedSelectedDates(next)
  }

  function toggleCollectedDate(date: string) {
    const next = new Set(expandedCollectedDates)
    if (next.has(date)) {
      next.delete(date)
    } else {
      next.add(date)
      loadCollectedForDate(date)
    }
    setExpandedCollectedDates(next)
  }

  const tgLink = (url: string, text: string) =>
    `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`

  function ProviderBadge({ provider }: { provider: string }) {
    const color =
      provider === 'groq'       ? 'text-green-400 border-green-700' :
      provider === 'gemini'     ? 'text-purple-400 border-purple-700' :
      provider === 'cerebras'   ? 'text-blue-400 border-blue-700' :
      provider === 'openrouter' ? 'text-orange-400 border-orange-700' :
      provider === 'github'     ? 'text-cyan-400 border-cyan-700' :
      provider === 'cloudflare' ? 'text-teal-400 border-teal-700' :
      'text-gray-400 border-gray-700'
    return (
      <span className={`text-xs rounded px-1.5 py-0.5 border ${color}`}>
        {provider.toUpperCase()}
      </span>
    )
  }

  function SelectedArticleCard({ a }: { a: Article }) {
    return (
      <div className="bg-gray-900 border border-amber-900 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <a href={a.url} target="_blank" className="text-sm font-bold text-white hover:text-blue-300 leading-snug">
            {a.article_title}
          </a>
          <span className="text-xs text-amber-400 shrink-0 border border-amber-800 rounded px-2 py-0.5">{a.source}</span>
        </div>
        <div className="text-xs text-gray-500 mb-3">{a.run_date}</div>

        {/* English conclusion */}
        {a.english_conclusion && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-blue-400">EN</span>
              <span className="text-xs text-gray-500">Pro-Democracy Myanmar POV</span>
            </div>
            <p className="text-xs text-gray-200 leading-relaxed">{a.english_conclusion}</p>
          </div>
        )}

        {/* Myanmar translated */}
        {a.translation_status === 'translated' && a.myanmar_conclusion ? (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-amber-400">MM</span>
              <span className="text-xs text-green-600 border border-green-800 rounded px-1.5 py-0.5">Translated to Myanmar Language</span>
              {a.translation_provider && <ProviderBadge provider={a.translation_provider} />}
            </div>
            <div className="bg-amber-950 border border-amber-800 rounded-lg p-3">
              <p className="text-xs text-amber-100 leading-relaxed">{a.myanmar_conclusion}</p>
              <a href={tgLink(a.url, a.myanmar_conclusion)} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-2 text-xs text-blue-400 border border-blue-800 rounded px-2 py-0.5 hover:bg-blue-950">
                Share to Telegram
              </a>
            </div>
          </div>
        ) : (a.translation_status === 'pending' || (!a.translation_status && !!a.english_conclusion)) ? (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-amber-500 border border-amber-800 rounded px-2 py-0.5 animate-pulse">
              Myanmar Translation is on the way...
            </span>
          </div>
        ) : null}

        {/* Fallback myanmar_brief */}
        {!a.english_conclusion && a.myanmar_brief && (
          <div>
            <button onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
              className="text-xs text-amber-400 hover:text-amber-300 mb-1">
              {expandedId === a.id ? 'Hide Myanmar Brief' : 'Show Myanmar Brief'}
            </button>
            {expandedId === a.id && (
              <div className="bg-amber-950 border border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-100 leading-relaxed">{a.myanmar_brief}</p>
                <a href={tgLink(a.url, a.myanmar_brief)} target="_blank" rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs text-blue-400 border border-blue-800 rounded px-2 py-0.5 hover:bg-blue-950">
                  Share to Telegram
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Past dates — exclude today
  const pastDates = dates.filter(d => d.run_date !== today)
  const todayEntry = dates.find(d => d.run_date === today)

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

        {/* ═══════════════════════════════════════════════════════
            SECTION 1 — SELECTED ARTICLES (Translated)
        ═══════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-sm font-bold text-white">📌 Selected Articles</div>
            <span className="text-xs text-amber-400 border border-amber-800 rounded px-2 py-0.5">
              Translated · Pro-Democracy Myanmar POV
            </span>
          </div>

          {/* TODAY — always expanded */}
          <div className="mb-3">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-bold text-green-400 border border-green-700 rounded px-2 py-0.5">TODAY</span>
              <span className="text-xs text-gray-400">{today}</span>
              {todayEntry && (
                <span className="text-xs text-gray-500">{todayEntry.selected_count} articles</span>
              )}
            </div>

            {loadingToday && (
              <div className="space-y-2 animate-pulse">
                <div className="bg-gray-800 rounded-xl h-16 w-full"></div>
                <div className="bg-gray-800 rounded-xl h-16 w-full"></div>
              </div>
            )}

            <div className="space-y-3">
              {todaySelected.map(a => <SelectedArticleCard key={a.id} a={a} />)}
              {!loadingToday && todaySelected.length === 0 && (
                <div className="text-xs text-gray-500 border border-gray-800 rounded-xl p-4 text-center">
                  No selected articles yet today — pipeline runs at 02:00 + 10:00 UTC
                </div>
              )}
            </div>
          </div>

          {/* PREVIOUS DATES — collapsed, lazy load on expand */}
          {loadingDates && (
            <div className="space-y-2 animate-pulse">
              <div className="bg-gray-800 rounded-xl h-10 w-full"></div>
              <div className="bg-gray-800 rounded-xl h-10 w-full"></div>
            </div>
          )}

          <div className="space-y-2">
            {pastDates.map(d => (
              <div key={d.run_date} className="border border-gray-800 rounded-xl overflow-hidden">
                {/* Collapsed header */}
                <button
                  onClick={() => toggleSelectedDate(d.run_date)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-400">{d.run_date}</span>
                    <span className="text-xs text-amber-400 border border-amber-900 rounded px-2 py-0.5">
                      {d.selected_count} articles
                    </span>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {expandedSelectedDates.has(d.run_date) ? '▲ Hide' : '▼ Show'}
                  </span>
                </button>

                {/* Expanded content — lazy loaded */}
                {expandedSelectedDates.has(d.run_date) && (
                  <div className="px-4 py-3 space-y-3 bg-gray-950 border-t border-gray-800">
                    {loadingSelected[d.run_date] && (
                      <div className="text-xs text-gray-500 animate-pulse text-center py-4">
                        Loading {d.selected_count} articles...
                      </div>
                    )}
                    {(loadedSelected[d.run_date] || []).map(a => (
                      <SelectedArticleCard key={a.id} a={a} />
                    ))}
                    {!loadingSelected[d.run_date] && (loadedSelected[d.run_date] || []).length === 0 && (
                      <div className="text-xs text-gray-600 text-center py-4">No articles found for this date</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            SECTION 2 — ALL COLLECTED ARTICLES (Links Only)
        ═══════════════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="text-sm font-bold text-white">🗞 All Collected Articles</div>
            <span className="text-xs text-gray-500 border border-gray-700 rounded px-2 py-0.5">
              Last 30 days · Links only
            </span>
          </div>

          {loadingDates && (
            <div className="space-y-2 animate-pulse">
              <div className="bg-gray-800 rounded-xl h-10 w-full"></div>
              <div className="bg-gray-800 rounded-xl h-10 w-full"></div>
            </div>
          )}

          <div className="space-y-2">
            {dates.map(d => (
              <div key={d.run_date} className="border border-gray-800 rounded-xl overflow-hidden">
                {/* Collapsed header */}
                <button
                  onClick={() => toggleCollectedDate(d.run_date)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-400">{d.run_date}</span>
                    <span className="text-xs text-gray-400 border border-gray-700 rounded px-2 py-0.5">
                      {d.collected_count} articles
                    </span>
                    {d.run_date === today && (
                      <span className="text-xs text-green-400 border border-green-800 rounded px-2 py-0.5">TODAY</span>
                    )}
                  </div>
                  <span className="text-gray-500 text-xs">
                    {expandedCollectedDates.has(d.run_date) ? '▲ Hide' : '▼ Show'}
                  </span>
                </button>

                {/* Expanded content — lazy loaded, links only */}
                {expandedCollectedDates.has(d.run_date) && (
                  <div className="bg-gray-950 border-t border-gray-800">
                    {loadingCollected[d.run_date] && (
                      <div className="text-xs text-gray-500 animate-pulse text-center py-4">
                        Loading {d.collected_count} articles...
                      </div>
                    )}
                    {!loadingCollected[d.run_date] && (loadedCollected[d.run_date] || []).length > 0 && (
                      <div className="divide-y divide-gray-800">
                        {(loadedCollected[d.run_date] || []).map((a, i) => (
                          <div key={a.id}
                            className={`flex items-start gap-3 px-4 py-2.5 ${i % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900'} hover:bg-gray-800 transition-colors`}>
                            <span className="text-xs text-gray-600 shrink-0 w-20 truncate">{a.source}</span>
                            <a href={a.url} target="_blank"
                              className="text-xs text-gray-300 hover:text-white flex-1 leading-snug">
                              {a.article_title}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                    {!loadingCollected[d.run_date] && (loadedCollected[d.run_date] || []).length === 0 && (
                      <div className="text-xs text-gray-600 text-center py-4">No collected articles for this date</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <div className="max-w-5xl mx-auto px-4 pb-4 mt-6">
        <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-3">
          <p className="text-xs text-yellow-300">Disclaimer: GNI reports are for informational purposes only. Not financial advice. Higher Diploma in Computer Science | Spring University Myanmar (SUM)</p>
        </div>
      </div>

      <footer className="border-t border-gray-800 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-gray-600">
          GNI Myanmar | News Archive | Higher Diploma in Computer Science | Spring University Myanmar (SUM)
        </div>
      </footer>
    </div>
  )
}
