"use client"
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'

const GNI = process.env.NEXT_PUBLIC_GNI_API_URL || 'https://gni-autonomous.vercel.app'
const KEY = process.env.NEXT_PUBLIC_GNI_API_KEY || ''

interface Report {
  id: string; title: string; myanmar_summary: string; summary: string
  sentiment: string; mad_verdict: string; mad_confidence: number
  mad_action_recommendation: string; risk_level: string
  tickers_affected: string[]; location_name: string; created_at: string
  market_impact: string; mad_blind_spot: string
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
    default: return 'bg-gray-700 text-gray-300'
  }
}

export default function Dashboard() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/reports`, {
      headers: { 'X-Client': 'gni-myanmar-v1' }
    })
      .then(r => r.json())
      .then(d => { setReports(d.reports || []); setLoading(false) })
      .catch(() => { setError('Failed to load reports'); setLoading(false) })
  }, [])

  const latest = reports[0]

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">?? GNI Myanmar</h1>
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
        {loading && <div className="text-center py-20 text-gray-400">? Loading...</div>}
        {error && <div className="text-center py-20 text-red-400">{error}</div>}

        {!loading && latest && (
          <>
            {/* MAD Verdict */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${verdictBg(latest.mad_verdict)}`}>
                  {latest.mad_verdict?.toLowerCase() === 'bearish' ? '??' : latest.mad_verdict?.toLowerCase() === 'bullish' ? '??' : '?'} {latest.mad_verdict?.toUpperCase()}
                </span>
                <span className="text-xs text-gray-400">
                  Confidence: <span className="font-bold text-white">{latest.mad_confidence ? Math.round(latest.mad_confidence * 100) + '%' : 'N/A'}</span>
                </span>
              </div>
              <a href={`${GNI}/debate`} target="_blank"
                className="text-xs text-blue-400 border border-blue-800 rounded px-2 py-1">
                Full Analysis ?
              </a>
            </div>

            {/* Action Recommendation */}
            {latest.mad_action_recommendation && (
              <div className="bg-blue-950 border border-blue-800 rounded-xl px-4 py-3 mb-4">
                <div className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">Action Recommendation</div>
                <p className="text-sm text-white">{latest.mad_action_recommendation}</p>
              </div>
            )}

            {/* Latest Report */}
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Latest Intelligence Report</div>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="text-lg font-bold text-white leading-snug">{latest.title}</h2>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${riskBg(latest.risk_level)}`}>
                  {latest.risk_level?.toUpperCase()}
                </span>
              </div>

              {/* Myanmar Summary */}
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-2">?????????? ???????????</div>
                <p className="text-gray-200 text-sm leading-relaxed">{latest.myanmar_summary || '??????????? ?????????'}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Sentiment</div>
                  <div className={`font-bold text-sm ${latest.sentiment?.toLowerCase() === 'bearish' ? 'text-red-400' : 'text-green-400'}`}>{latest.sentiment}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Location</div>
                  <div className="font-bold text-white text-sm">?? {latest.location_name || 'Global'}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Published</div>
                  <div className="font-bold text-white text-sm">
                    {new Date(latest.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {latest.tickers_affected?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {latest.tickers_affected.slice(0, 5).map((t: string) => (
                    <span key={t} className="bg-blue-900 text-blue-300 text-xs font-mono px-2 py-1 rounded">{t}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Previous Reports */}
            {reports.length > 1 && (
              <section className="mb-6">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Previous Reports</div>
                <div className="space-y-3">
                  {reports.slice(1, 5).map(r => (
                    <div key={r.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-sm font-bold text-white">{r.title}</h3>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${riskBg(r.risk_level)}`}>
                          {r.risk_level?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">{r.myanmar_summary?.slice(0, 150) || r.summary?.slice(0, 150)}...</p>
                      <div className="text-xs text-gray-600 mt-2">
                        {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-3">
              <p className="text-yellow-200 text-xs">?? Disclaimer: GNI reports are for informational purposes only. Not financial advice.</p>
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
