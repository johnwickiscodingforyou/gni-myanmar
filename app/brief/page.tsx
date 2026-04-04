"use client"
import { useEffect, useState } from 'react'
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts'

interface Report {
  id: string; title: string; summary: string
  sentiment: string; mad_verdict: string; mad_confidence: number
  mad_action_recommendation: string; mad_blind_spot: string
  mad_black_swan_case: string; mad_ostrich_case: string; mad_bull_case: string; mad_bear_case: string
  escalation_score: number; escalation_level: string
  tickers_affected: string[]; location_name: string
  created_at: string; market_impact: string
  short_focus_threats: string; long_shoot_threats: string
  confidence_interval_width: number
}

interface IntelMM {
  brief_mm: string; mad_mm: string; run_date: string
  mad_verdict: string; mad_confidence: number
}

const escColor = (level: string) => {
  switch (level?.toUpperCase()) {
    case 'CRITICAL':  return 'bg-red-950 border-red-700 text-red-400'
    case 'HIGH':      return 'bg-orange-950 border-orange-700 text-orange-400'
    case 'ELEVATED':  return 'bg-yellow-950 border-yellow-700 text-yellow-400'
    case 'MODERATE':  return 'bg-blue-950 border-blue-700 text-blue-400'
    default:          return 'bg-green-950 border-green-700 text-green-400'
  }
}

const escEmoji = (level: string) => {
  switch (level?.toUpperCase()) {
    case 'CRITICAL': return '🔴'
    case 'HIGH':     return '🟠'
    case 'ELEVATED': return '🟡'
    case 'MODERATE': return '🔵'
    default:         return '🟢'
  }
}

const verdictBar = (v: string) => {
  switch (v?.toLowerCase()) {
    case 'bearish': return { bar: 'bg-red-500', track: 'bg-red-950', text: 'text-red-300', badge: 'bg-red-900 border-red-700 text-red-300' }
    case 'bullish': return { bar: 'bg-green-500', track: 'bg-green-950', text: 'text-green-300', badge: 'bg-green-900 border-green-700 text-green-300' }
    default:        return { bar: 'bg-gray-500', track: 'bg-gray-800', text: 'text-gray-300', badge: 'bg-gray-700 border-gray-600 text-gray-300' }
  }
}

export default function BriefPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [intelMM, setIntelMM] = useState<IntelMM | null>(null)
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<Report[]>([])

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(d => {
        const reps = d.reports || []
        setReports(reps)
        const latest = reps.find((r: Report) => r.escalation_score > 0) || reps[0]
        setReport(latest)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    fetch('/api/intel-mm')
      .then(r => r.json())
      .then(d => { if (d.summaries?.[0]) setIntelMM(d.summaries[0]) })
      .catch(() => {})
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="space-y-3 w-full max-w-lg px-4 animate-pulse">
        <div className="bg-gray-800 rounded-xl h-16 w-full"></div>
        <div className="bg-gray-800 rounded-xl h-24 w-full"></div>
        <div className="bg-gray-800 rounded-xl h-32 w-full"></div>
      </div>
    </div>
  )

  if (!report) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center px-4">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-gray-400 text-sm">Pipeline မှ data မရသေးပါ။</p>
        <p className="text-gray-600 text-xs mt-2">Pipeline runs at 02:00 + 10:00 UTC daily</p>
        <a href="/" className="mt-4 inline-block text-xs text-blue-400 border border-blue-800 rounded px-3 py-1">← Dashboard</a>
      </div>
    </div>
  )

  const confidence = report.mad_confidence ? Math.round(report.mad_confidence * 100) : 0
  const vc = verdictBar(report.mad_verdict)
  const sparkData = [...reports].reverse().map((r, i) => ({ i, score: r.escalation_score || 0 }))
  const age = report.created_at ? (() => {
    const h = (Date.now() - new Date(report.created_at).getTime()) / 3600000
    return h < 1 ? Math.floor(h * 60) + 'm ago' : Math.floor(h) + 'h ago'
  })() : ''

  return (
    <div className="min-h-screen bg-gray-950">
      {/* HEADER */}
      <header className="border-b border-gray-800 bg-gray-900 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="text-xs text-blue-400 border border-blue-800 rounded px-2 py-1 hover:bg-blue-950 transition-colors">← Dashboard</a>
              <div>
                <div className="text-sm font-bold text-white">🌐 GNI Myanmar</div>
                <div className="text-xs text-gray-500">30-Second Intel Brief</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-600">{age}</div>
              <span className="text-xs text-gray-500">Auto-generated</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">

        {/* MONITORING STATUS */}
        <section className="mb-4">
          <div className={`rounded-xl border p-4 ${escColor(report.escalation_level)}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{escEmoji(report.escalation_level)}</span>
                <span className="text-sm font-bold uppercase tracking-wider">{report.escalation_level || 'MONITORING'}</span>
                <span className="text-xs opacity-70">Escalation: {report.escalation_score?.toFixed(1)}/10</span>
              </div>
              {sparkData.length >= 3 && (
                <ResponsiveContainer width={80} height={32}>
                  <AreaChart data={sparkData}>
                    <Area type="monotone" dataKey="score" stroke="currentColor" fill="currentColor" fillOpacity={0.2} strokeWidth={2} dot={false} />
                    <Tooltip content={() => null} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="text-sm font-bold leading-snug">{report.title}</p>
            {report.summary && <p className="text-xs opacity-70 mt-1 line-clamp-2">{report.summary}</p>}
          </div>
        </section>

        {/* ACTION RECOMMENDATION */}
        {report.mad_action_recommendation && (
          <section className="mb-4">
            <div className="bg-blue-950 border border-blue-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-400 text-base">🎯</span>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Action Recommendation</span>
              </div>
              <p className="text-sm text-white leading-relaxed">{report.mad_action_recommendation}</p>
            </div>
          </section>
        )}

        {/* MAD VERDICT */}
        <section className="mb-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">MAD စီရင်ချက် / MAD Verdict</div>
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-sm font-bold px-4 py-1.5 rounded-full border ${vc.badge}`}>
                {report.mad_verdict?.toUpperCase()}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Confidence</span>
                  <span className={`text-sm font-bold ${vc.text}`}>{confidence}%</span>
                </div>
                <div className={`w-full rounded-full h-2.5 ${vc.track}`}>
                  <div className={`h-2.5 rounded-full transition-all ${vc.bar}`} style={{ width: `${confidence}%` }}></div>
                </div>
              </div>
            </div>

            {/* Bull + Bear cards side by side */}
            {(report.mad_bull_case || report.mad_bear_case) && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {report.mad_bull_case && (
                  <div className="bg-green-950 border border-green-800 rounded-lg p-2">
                    <div className="text-xs text-green-400 font-bold mb-1">🐂 Bull Case</div>
                    <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">{report.mad_bull_case}</p>
                  </div>
                )}
                {report.mad_bear_case && (
                  <div className="bg-red-950 border border-red-800 rounded-lg p-2">
                    <div className="text-xs text-red-400 font-bold mb-1">🐻 Bear Case</div>
                    <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">{report.mad_bear_case}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* MYANMAR 30-SEC BRIEF */}
        {intelMM?.brief_mm && (
          <section className="mb-4">
            <div className="bg-amber-950 border border-amber-700 rounded-xl p-4">
              <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-2">ဉာဏ်ရည်တု သတင်းချုပ် — Myanmar Brief</div>
              <p className="text-sm text-amber-100 leading-relaxed">{intelMM.brief_mm}</p>
            </div>
          </section>
        )}

        {/* BLIND SPOT WARNING */}
        {report.mad_blind_spot && (
          <section className="mb-4">
            <div className="bg-purple-950 border border-purple-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-purple-400">↗</span>
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Blind Spot Warning</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">{report.mad_blind_spot}</p>
            </div>
          </section>
        )}

        {/* MARKET IMPLICATIONS */}
        {report.tickers_affected?.length > 0 && (
          <section className="mb-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Market Implications</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {report.tickers_affected.slice(0, 6).map((t: string) => (
                  <span key={t} className={`text-xs font-mono font-bold px-2 py-1 rounded flex items-center gap-1 ${report.sentiment?.toLowerCase() === 'bearish' ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>
                    {t} {report.sentiment?.toLowerCase() === 'bearish' ? '↓' : '↑'}
                  </span>
                ))}
              </div>
              <div className="text-xs text-gray-400">
                Sentiment: <span className={report.sentiment?.toLowerCase() === 'bearish' ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
                  {report.sentiment} {report.mad_confidence ? `(${Math.round(report.mad_confidence * 100)}%)` : ''}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* FOOTER NOTE */}
        <div className="text-center text-xs text-gray-600 mb-4">
          Brief generated from latest pipeline run — {age}<br/>
          Updates every pipeline run (02:00 + 10:00 UTC)
        </div>

        {/* NAVIGATION BUTTONS */}
        <section className="mb-4">
          <div className="grid grid-cols-2 gap-3">
            <a href="/intel" className="bg-gray-900 border border-purple-800 rounded-xl p-3 text-center hover:bg-gray-800 transition-colors">
              <div className="text-lg mb-1">🧠</div>
              <div className="text-xs font-bold text-purple-400">Full Intel</div>
              <div className="text-xs text-gray-500">4-agent MAD analysis</div>
            </a>
            <a href="/reports" className="bg-gray-900 border border-teal-800 rounded-xl p-3 text-center hover:bg-gray-800 transition-colors">
              <div className="text-lg mb-1">📋</div>
              <div className="text-xs font-bold text-teal-400">Reports</div>
              <div className="text-xs text-gray-500">Intelligence archive</div>
            </a>
            <a href="/predictions" className="bg-gray-900 border border-pink-800 rounded-xl p-3 text-center hover:bg-gray-800 transition-colors">
              <div className="text-lg mb-1">🎯</div>
              <div className="text-xs font-bold text-pink-400">Predictions</div>
              <div className="text-xs text-gray-500">GPVS verification</div>
            </a>
            <a href="/map" className="bg-gray-900 border border-blue-800 rounded-xl p-3 text-center hover:bg-gray-800 transition-colors">
              <div className="text-lg mb-1">🗺️</div>
              <div className="text-xs font-bold text-blue-400">Event Map</div>
              <div className="text-xs text-gray-500">Geopolitical pins</div>
            </a>
          </div>
        </section>

        <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-3 mb-4">
          <p className="text-yellow-200 text-xs text-center">Not financial advice. GNI reports are for informational purposes only.</p>
        </div>

      </main>

      <footer className="border-t border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-3 text-center text-xs text-gray-600">
          GNI Myanmar | 30-Second Intel Brief | Higher Diploma in Computer Science | Spring University Myanmar (SUM)
        </div>
      </footer>
    </div>
  )
}