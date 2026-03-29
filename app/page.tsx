"use client"
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'

interface Report {
  id: string; title: string; myanmar_summary: string; summary: string
  sentiment: string; mad_verdict: string; mad_confidence: number
  mad_action_recommendation: string; mad_blind_spot: string
  mad_black_swan_case: string; mad_ostrich_case: string
  risk_level: string; tickers_affected: string[]
  location_name: string; created_at: string
  market_impact: string; short_focus_threats: string; long_shoot_threats: string
  escalation_score: number; escalation_level: string
}

const riskBg = (r: string) => {
  switch (r?.toLowerCase()) {
    case 'critical': return 'bg-red-600 text-white'
    case 'high': return 'bg-orange-500 text-white'
    case 'medium': return 'bg-yellow-500 text-black'
    default: return 'bg-green-600 text-white'
  }
}

const verdictBg = (v: string) => {
  switch (v?.toLowerCase()) {
    case 'bearish': return 'bg-red-900 border border-red-700 text-red-300'
    case 'bullish': return 'bg-green-900 border border-green-700 text-green-300'
    default: return 'bg-gray-700 border border-gray-600 text-gray-300'
  }
}

const verdictEmoji = (v: string) => {
  switch (v?.toLowerCase()) {
    case 'bearish': return 'BEARISH'
    case 'bullish': return 'BULLISH'
    default: return 'NEUTRAL'
  }
}

export default function Dashboard() {
  const [reports, setReports] = useState<Report[]>([])
  const [tickers, setTickers] = useState<{label:string;price:number;changePercent:string}[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const KEY_TICKERS = [
    { ticker: 'SPY', label: 'S&P 500' },
    { ticker: 'GC=F', label: 'Gold' },
    { ticker: 'CL=F', label: 'Oil' },
    { ticker: 'BTC-USD', label: 'Bitcoin' },
  ]

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(d => { setReports(d.reports || []); setLoading(false) })
      .catch(() => { setError('???? ?????????'); setLoading(false) })

    KEY_TICKERS.forEach(({ ticker, label }) => {
      fetch(`/api/stocks?ticker=${encodeURIComponent(ticker)}&range=7d`)
        .then(r => r.json())
        .then(d => {
          if (!d.error && d.price) {
            setTickers(prev => [...prev, { label, price: d.price, changePercent: d.changePercent }])
          }
        }).catch(() => {})
    })
  }, [])

  const latest = reports[0]

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">GNI Myanmar</h1>
              <p className="text-xs text-gray-400">Global Nexus Insights | Myanmar Intelligence | L7 Autonomous | $0.00/month</p>
            </div>
            {latest && (
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${riskBg(latest.risk_level)}`}>
                {latest.risk_level?.toUpperCase()}
              </span>
            )}
          </div>
          <Nav />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading && <div className="text-center py-20 text-gray-400">Loading...</div>}
        {error && <div className="text-center py-10 text-red-400">{error}</div>}

        {!loading && latest && (
          <>
            {/* ?? SECTION 1: MAD VERDICT ?? */}
            <section className="mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">MAD Verdict ? ????????? ???????????????????</div>
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-base font-bold px-4 py-1.5 rounded-full ${verdictBg(latest.mad_verdict)}`}>
                      {verdictEmoji(latest.mad_verdict)}
                    </span>
                    <div>
                      <div className="text-xs text-gray-500">Confidence</div>
                      <div className="text-white font-bold text-lg">
                        {latest.mad_confidence ? Math.round(latest.mad_confidence * 100) + '%' : 'N/A'}
                      </div>
                    </div>
                    {latest.escalation_level && (
                      <div>
                        <div className="text-xs text-gray-500">Escalation</div>
                        <div className="text-orange-400 font-bold">{latest.escalation_level}</div>
                      </div>
                    )}
                  </div>
                  <a href="https://gni-autonomous.vercel.app/debate" target="_blank"
                    className="text-xs text-blue-400 border border-blue-800 rounded px-3 py-1 hover:border-blue-500 transition-colors">
                    Full Debate ?
                  </a>
                </div>

                {/* Action Recommendation */}
                {latest.mad_action_recommendation && (
                  <div className="bg-blue-950 border border-blue-800 rounded-lg p-3 mb-3">
                    <div className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">Action Recommendation</div>
                    <p className="text-sm text-white leading-relaxed">{latest.mad_action_recommendation}</p>
                  </div>
                )}

                {/* Blind Spot */}
                {latest.mad_blind_spot && (
                  <div className="bg-purple-950 border border-purple-800 rounded-lg p-3 mb-3">
                    <div className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-1">Blind Spot ? ???????? ???????????????</div>
                    <p className="text-xs text-gray-300 leading-relaxed">{latest.mad_blind_spot}</p>
                  </div>
                )}

                {/* Black Swan + Ostrich side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {latest.mad_black_swan_case && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                      <div className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">Black Swan Case</div>
                      <p className="text-xs text-gray-300 leading-relaxed">{latest.mad_black_swan_case?.slice(0, 200)}...</p>
                    </div>
                  )}
                  {latest.mad_ostrich_case && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                      <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">Ostrich Case ? ???????????????</div>
                      <p className="text-xs text-gray-300 leading-relaxed">{latest.mad_ostrich_case?.slice(0, 200)}...</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ?? SECTION 2: LATEST REPORT + MYANMAR SUMMARY ?? */}
            <section className="mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">????????? Intelligence Report</div>
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h2 className="text-lg font-bold text-white leading-snug">{latest.title}</h2>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${riskBg(latest.risk_level)}`}>
                    {latest.risk_level?.toUpperCase()}
                  </span>
                </div>

                {/* Myanmar Summary -- MAIN CONTENT */}
                <div className="bg-gray-800 border-l-4 border-amber-500 rounded-lg p-4 mb-4">
                  <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-2">?????????? ???????????</div>
                  <p className="text-gray-100 text-sm leading-relaxed">{latest.myanmar_summary || '??????????? ?????????'}</p>
                </div>

                {/* Meta info */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Sentiment</div>
                    <div className={`font-bold text-sm ${latest.sentiment?.toLowerCase() === 'bearish' ? 'text-red-400' : 'text-green-400'}`}>
                      {latest.sentiment}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Location</div>
                    <div className="font-bold text-white text-sm">{latest.location_name || 'Global'}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Published</div>
                    <div className="font-bold text-white text-sm">
                      {new Date(latest.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Tickers */}
                {latest.tickers_affected?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {latest.tickers_affected.slice(0, 6).map((t: string) => (
                      <span key={t} className="bg-blue-900 text-blue-300 text-xs font-mono px-2 py-1 rounded">{t}</span>
                    ))}
                  </div>
                )}

                {/* Market Impact */}
                {latest.market_impact && (
                  <div className="bg-gray-800 rounded-lg p-3 mb-3">
                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Market Impact</div>
                    <p className="text-xs text-gray-300 leading-relaxed">{latest.market_impact?.slice(0, 200)}...</p>
                  </div>
                )}
              </div>
            </section>

            {/* ?? SECTION 3: THREATS ?? */}
            {(latest.short_focus_threats || latest.long_shoot_threats) && (
              <section className="mb-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Threat Analysis ? ??????????????? ???????????????????</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {latest.short_focus_threats && (
                    <div className="bg-gray-900 border border-orange-800 rounded-xl p-4">
                      <div className="text-xs text-orange-400 font-bold uppercase tracking-wider mb-2">Short-Term Threats (6-12 ?)</div>
                      <p className="text-xs text-gray-300 leading-relaxed">{latest.short_focus_threats?.slice(0, 250)}...</p>
                    </div>
                  )}
                  {latest.long_shoot_threats && (
                    <div className="bg-gray-900 border border-red-800 rounded-xl p-4">
                      <div className="text-xs text-red-400 font-bold uppercase tracking-wider mb-2">Long-Term Threats (1+ ????)</div>
                      <p className="text-xs text-gray-300 leading-relaxed">{latest.long_shoot_threats?.slice(0, 250)}...</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ?? SECTION 4: MINI MARKETS ?? */}
            {tickers.length > 0 && (
              <section className="mb-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">??????? ??????? ? Key Markets</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {tickers.map(({ label, price, changePercent }) => {
                    const pct = parseFloat(changePercent)
                    const up = pct >= 0
                    return (
                      <div key={label} className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-center">
                        <div className="text-xs text-gray-500 mb-1">{label}</div>
                        <div className="text-sm font-bold text-white">${price?.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                        <div className={`text-xs font-bold mt-1 ${up ? 'text-green-400' : 'text-red-400'}`}>
                          {up ? '+' : ''}{pct.toFixed(2)}%
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="text-right mt-1">
                  <a href="/markets" className="text-xs text-blue-400 hover:text-blue-300">??????? ???????? ?</a>
                </div>
              </section>
            )}

            {/* ?? SECTION 5: PREVIOUS REPORTS ?? */}
            {reports.length > 1 && (
              <section className="mb-6">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">???? Reports ????</div>
                <div className="space-y-3">
                  {reports.slice(1, 4).map(r => (
                    <div key={r.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4 hover:border-gray-500 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-sm font-bold text-white">{r.title}</h3>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${riskBg(r.risk_level)}`}>
                          {r.risk_level?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {r.myanmar_summary?.slice(0, 150) || r.summary?.slice(0, 150)}...
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                        <span>{r.location_name || 'Global'}</span>
                        <span>{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        <span className={r.mad_verdict?.toLowerCase() === 'bearish' ? 'text-red-400' : 'text-green-400'}>{r.mad_verdict?.toUpperCase()}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-right mt-2">
                  <a href="/reports" className="text-xs text-green-400 hover:text-green-300">Reports ??????? ???????? ?</a>
                </div>
              </section>
            )}

            <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-3">
              <p className="text-yellow-200 text-xs">?????????? - GNI Reports ??????? ?????????????? ????????????????????? ?????????????? ????????????????</p>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-gray-800 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-gray-600">
          Global Nexus Insights Myanmar | Higher Diploma in Computer Science | Spring University Myanmar (SUM)
        </div>
      </footer>
    </div>
  )
}
