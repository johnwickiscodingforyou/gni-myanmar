"use client"
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import { mm } from '@/lib/mm'
import dynamic from 'next/dynamic'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

const MiniMap = dynamic(() => import('@/components/MiniMap'), { ssr: false })
const MiniChart = dynamic(() => import('@/components/MiniChart'), { ssr: false })

interface Report {
  id: string; title: string; summary: string
  sentiment: string; mad_verdict: string; mad_confidence: number
  mad_action_recommendation: string; mad_blind_spot: string
  mad_black_swan_case: string; mad_ostrich_case: string
  risk_level: string; tickers_affected: string[]
  location_name: string; created_at: string
  market_impact: string; short_focus_threats: string; long_shoot_threats: string
  escalation_score: number; escalation_level: string
  plain_narrative: string; quality_score: number
  source_consensus_score: number; deception_level: string
  confidence_interval_width: number
}

interface IntelMM { brief_mm: string; mad_mm: string; run_date: string }

const escColor = (level: string) => {
  switch (level?.toUpperCase()) {
    case 'CRITICAL':  return 'text-red-400 border-red-700 bg-red-950'
    case 'HIGH':      return 'text-orange-400 border-orange-700 bg-orange-950'
    case 'ELEVATED':  return 'text-yellow-400 border-yellow-700 bg-yellow-950'
    case 'MODERATE':  return 'text-blue-400 border-blue-700 bg-blue-950'
    default:          return 'text-green-400 border-green-700 bg-green-950'
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

const verdictColor = (v: string) => {
  switch (v?.toLowerCase()) {
    case 'bearish': return 'bg-red-900 border border-red-700 text-red-300'
    case 'bullish': return 'bg-green-900 border border-green-700 text-green-300'
    default:        return 'bg-gray-700 border border-gray-600 text-gray-300'
  }
}

function safeDate(d: string) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Dashboard() {
  const [reports, setReports] = useState<Report[]>([])
  const [intelMM, setIntelMM] = useState<IntelMM | null>(null)
  const [tickers, setTickers] = useState<{label:string;price:number;changePercent:string}[]>([])
  const [mapEvents, setMapEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [baseline, setBaseline] = useState<{percentile:number;total_non_zero:number} | null>(null)

  const KEY_TICKERS = [
    { ticker: 'SPY',     label: 'S&P 500' },
    { ticker: 'GC=F',    label: 'Gold' },
    { ticker: 'CL=F',    label: 'Oil' },
    { ticker: 'BTC-USD', label: 'Bitcoin' },
  ]

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(d => { setReports(d.reports || []); setBaseline(d.baseline); setLoading(false) })
      .catch(() => setLoading(false))

    fetch('/api/article-events')
      .then(r => r.json())
      .then(d => setMapEvents(d.events || d.articles || []))
      .catch(() => {})

    fetch('/api/intel-mm')
      .then(r => r.json())
      .then(d => { if (d.summaries?.[0]) setIntelMM(d.summaries[0]) })
      .catch(() => {})

    KEY_TICKERS.forEach(({ ticker, label }) => {
      fetch(`/api/stocks?ticker=${encodeURIComponent(ticker)}&range=7d`)
        .then(r => r.json())
        .then(d => { if (!d.error && d.price) setTickers(prev => [...prev, { label, price: d.price, changePercent: d.changePercent }]) })
        .catch(() => {})
    })
  }, [])

  const latest = reports[0]
  const sparkData = [...reports].reverse().map((r, i) => ({ i, score: r.escalation_score || 0 }))
  const certainty = latest ? Math.round((1 - (latest.confidence_interval_width || 0) / 1.6) * 100) : 0
  const isDivergence = latest && latest.sentiment && latest.mad_verdict &&
    latest.sentiment.toLowerCase() !== latest.mad_verdict.toLowerCase() &&
    latest.sentiment.toLowerCase() !== 'neutral' &&
    latest.mad_verdict.toLowerCase() !== 'neutral'

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-xl font-bold text-white">🌐 GNI Myanmar</h1>
              <p className="text-xs text-gray-400">What is happening in the world right now, and what does it mean for Myanmar?</p>
            </div>
            {latest && (
              <div className="flex items-center gap-2">
                <span className="text-lg">{escEmoji(latest.escalation_level)}</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${escColor(latest.escalation_level)}`}>
                  {latest.escalation_level || latest.risk_level?.toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <a href="/" className="inline-block mt-2 mb-1 text-xs text-blue-400 border border-blue-800 rounded px-3 py-1 hover:bg-blue-950 transition-colors">← Dashboard</a>
          <Nav />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* HUB DESCRIPTION */}
        <div className="bg-gray-900 border border-blue-800 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-200 leading-relaxed">{mm.dashboard_intro}</p>
        </div>
        {loading && (
          <div className="space-y-4 animate-pulse">
              <div className="bg-gray-800 rounded-xl h-32 w-full"></div>
              <div className="bg-gray-800 rounded-xl h-24 w-full"></div>
              <div className="bg-gray-800 rounded-xl h-24 w-full"></div>
              <div className="flex gap-3">
                <div className="bg-gray-800 rounded-xl h-16 flex-1"></div>
                <div className="bg-gray-800 rounded-xl h-16 flex-1"></div>
              </div>
            </div>
        )}

        {!loading && latest && (
          <>
            {/* ORIENTATION + LAST RUN */}
            <section className="mb-4">
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 leading-relaxed mb-1">
                      GNI Myanmar သဎုး ကမ္ဘာ့ Geopolitics သတင္းများကို GNI Autonomous API ဖြင့်ရယူပြီး Groq AI ဖြင့် တစ်နေ့ ၂ ကြိမ် update ဖြစ်သဎု့။ Myanmar reader များ Geopolitics ကို ဆွပ်ကူစွာ နားလဎည့နိုင္ ရည္ရွယ်သဎုး။
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-gray-500 mb-1">Last updated</div>
                    <div className="text-xs font-bold text-green-400">
                      {latest.created_at ? (() => {
                        const ms = Date.now() - new Date(latest.created_at).getTime()
                        const h = Math.floor(ms / 3600000)
                        const m = Math.floor((ms % 3600000) / 60000)
                        if (h > 14) return h + 'h ago'
                        if (h >= 1) return h + 'h ' + m + 'm ago'
                        return m + 'm ago'
                      })() : 'Unknown'}
                    </div>
                    <div className={`text-xs mt-1 font-bold ${
                      (() => {
                        if (!latest.created_at) return 'text-gray-500'
                        const h = (Date.now() - new Date(latest.created_at).getTime()) / 3600000
                        return h > 14 ? 'text-amber-400' : 'text-green-400'
                      })()
                    }`}>
                      {(() => {
                        if (!latest.created_at) return 'Status unknown'
                        const h = (Date.now() - new Date(latest.created_at).getTime()) / 3600000
                        return h > 14 ? 'Pipeline due' : 'Live'
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </section>
            {/* ESCALATION HERO */}
            <section className="mb-4">
              <div className={`rounded-xl border p-5 ${escColor(latest.escalation_level)}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs uppercase tracking-wider opacity-70 mb-1">Escalation Score</div>
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-bold">{latest.escalation_score?.toFixed(1) || '0.0'}</span>
                      <span className="text-xl opacity-60 mb-1">/10</span>
                      <span className="text-lg font-bold ml-2">{latest.escalation_level}</span>
                    </div>
                    {baseline && baseline.total_non_zero >= 10 && (
                      <div className="text-xs opacity-70 mt-1">Today is top {baseline.percentile}% of all time</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wider opacity-70 mb-1">Trend</div>
                    {sparkData.length >= 3 && (
                      <ResponsiveContainer width={120} height={50}>
                        <AreaChart data={sparkData}>
                          <Area type="monotone" dataKey="score" stroke="currentColor" fill="currentColor" fillOpacity={0.2} strokeWidth={2} dot={false} />
                          <Tooltip content={() => null} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
                {/* Certainty + Quality + Consensus row */}
                <div className="flex flex-wrap gap-3 text-xs opacity-80">
                  {certainty > 0 && <span>Model Certainty: <b>{certainty}%</b></span>}
                  {latest.quality_score > 0 && <span>Quality: <b>{latest.quality_score >= 8 ? 'Excellent' : latest.quality_score >= 6 ? 'Good' : 'Fair'} ({latest.quality_score?.toFixed(1)})</b></span>}
                  {latest.source_consensus_score > 0 && <span>Source Agreement: <b>{Math.round(latest.source_consensus_score * 100)}%</b></span>}
                  {latest.deception_level && latest.deception_level !== 'none' && <span className="text-yellow-300">Narrative Diversity: <b>{latest.deception_level}</b></span>}
                </div>
              </div>
            </section>

            {/* MYANMAR 30-SEC BRIEF */}
            {intelMM?.brief_mm && (
              <section className="mb-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">ဉာဏ်ရည်တု သတင်းချုပ် / 30-Second Intel Brief</div>
                <div className="bg-amber-950 border border-amber-700 rounded-xl p-4">
                  <p className="text-amber-100 text-sm leading-relaxed">{intelMM.brief_mm}</p>
                </div>
              </section>
            )}

            {/* DIVERGENCE SIGNAL */}
            {isDivergence && (
              <section className="mb-4">
                <div className="bg-yellow-950 border border-yellow-600 rounded-xl p-3 flex items-center gap-3">
                  <span className="text-yellow-400 text-lg">⚠️</span>
                  <div>
                    <div className="text-xs text-yellow-400 font-bold uppercase tracking-wider">Divergence Detected</div>
                    <p className="text-xs text-yellow-200">Pipeline sentiment ({latest.sentiment?.toUpperCase()}) disagrees with MAD verdict ({latest.mad_verdict?.toUpperCase()}). Situation is ambiguous.</p>
                  </div>
                </div>
              </section>
            )}

            {/* MAD VERDICT */}
            <section className="mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">MAD စီရင်ချက် / MAD Verdict</div>
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-base font-bold px-4 py-1.5 rounded-full ${verdictColor(latest.mad_verdict)}`}>
                      {latest.mad_verdict?.toUpperCase()}
                    </span>
                    <div>
                      <div className="text-xs text-gray-500">ယုံကြည်မှု / Confidence</div>
                      <div className="text-white font-bold text-lg">{latest.mad_confidence ? Math.round(latest.mad_confidence * 100) + '%' : 'N/A'}</div>
                    </div>
                  </div>
                  <a href="/intel" className="text-xs text-blue-400 border border-blue-800 rounded px-3 py-1">Full Intel</a>
                </div>
                {latest.mad_action_recommendation && (
                  <div className="bg-blue-950 border border-blue-800 rounded-lg p-3 mb-3">
                    <div className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">အကြံပြုချက် / Action Recommendation</div>
                    <p className="text-sm text-white leading-relaxed">{latest.mad_action_recommendation}</p>
                  </div>
                )}
                {latest.mad_blind_spot && (
                  <div className="bg-purple-950 border border-purple-800 rounded-lg p-3 mb-3">
                    <div className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-1">မမြင်နိုင်သောအချက် / Blind Spot</div>
                    <p className="text-xs text-gray-300 leading-relaxed">{latest.mad_blind_spot}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {latest.mad_black_swan_case && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                      <div className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">Black Swan Case</div>
                      <p className="text-xs text-gray-300 leading-relaxed">{latest.mad_black_swan_case}</p>
                    </div>
                  )}
                  {latest.mad_ostrich_case && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                      <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">Ostrich Case</div>
                      <p className="text-xs text-gray-300 leading-relaxed">{latest.mad_ostrich_case}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* PLAIN NARRATIVE */}
            {latest.plain_narrative && (
              <section className="mb-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Intelligence Narrative (English)</div>
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                  <p className="text-sm text-gray-200 leading-relaxed">{latest.plain_narrative}</p>
                </div>
              </section>
            )}

            {/* MAP + CHART */}
            <section className="mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
                    <div className="text-xs font-bold text-white">ကမ္ဘာ့ပြဒါး / World Map</div>
                    <a href="/map" className="text-xs text-blue-400 border border-blue-800 rounded px-2 py-0.5">Full Map</a>
                  </div>
                  <div style={{ height: '220px' }}>
                    {mapEvents.length > 0
                      ? <MiniMap events={mapEvents.slice(0, 20)} height="220px" />
                      : <div className="flex items-center justify-center h-full text-xs text-gray-600">Loading map...</div>
                    }
                  </div>
                </div>
                <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
                    <div className="text-xs font-bold text-white">Bitcoin — 1 Year</div>
                    <a href="/market" className="text-xs text-amber-400 border border-amber-800 rounded px-2 py-0.5">Markets</a>
                  </div>
                  <div style={{ height: '220px' }}><MiniChart /></div>
                </div>
              </div>
            </section>

            {/* LATEST REPORT */}
            <section className="mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">နောက်ဆုံး GNI အစီရင်ခံစာ / Latest Intelligence Report</div>
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
                <h2 className="text-lg font-bold text-white leading-snug mb-3">{latest.title}</h2>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Sentiment</div>
                    <div className={`font-bold text-sm ${latest.sentiment?.toLowerCase() === 'bearish' ? 'text-red-400' : 'text-green-400'}`}>{latest.sentiment}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Location</div>
                    <div className="font-bold text-white text-sm">{latest.location_name || 'Global'}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Published</div>
                    <div className="font-bold text-white text-sm">{safeDate(latest.created_at)}</div>
                  </div>
                </div>
                {latest.tickers_affected?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {latest.tickers_affected.slice(0, 6).map((t: string) => (
                      <span key={t} className="bg-blue-900 text-blue-300 text-xs font-mono px-2 py-1 rounded">{t}</span>
                    ))}
                  </div>
                )}
                {latest.market_impact && (
                  <div className="bg-gray-800 rounded-lg p-3 mb-3">
                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">ဈေးကွက်သက်ရောက်မှု / Market Impact</div>
                    <p className="text-xs text-gray-300 leading-relaxed">{latest.market_impact}</p>
                  </div>
                )}
              </div>
            </section>

            {/* THREATS */}
            {(latest.short_focus_threats || latest.long_shoot_threats) && (
              <section className="mb-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">ခြိမ်းခြောက်မှုသုံးသပ်ချက် / Threat Analysis</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {latest.short_focus_threats && (
                    <div className="bg-gray-900 border border-orange-800 rounded-xl p-4">
                      <div className="text-xs text-orange-400 font-bold uppercase tracking-wider mb-2">Short-Term Threats (6-12 months)</div>
                      <p className="text-xs text-gray-300 leading-relaxed">{latest.short_focus_threats}</p>
                    </div>
                  )}
                  {latest.long_shoot_threats && (
                    <div className="bg-gray-900 border border-red-800 rounded-xl p-4">
                      <div className="text-xs text-red-400 font-bold uppercase tracking-wider mb-2">Long-Term Threats (1+ years)</div>
                      <p className="text-xs text-gray-300 leading-relaxed">{latest.long_shoot_threats}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* KEY MARKETS */}
            {tickers.length > 0 && (
              <section className="mb-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">ဈေးကွက်အနေအထား / Key Markets</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {tickers.map(({ label, price, changePercent }) => {
                    const pct = parseFloat(changePercent)
                    const up = pct >= 0
                    return (
                      <div key={label} className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-center">
                        <div className="text-xs text-gray-500 mb-1">{label}</div>
                        <div className="text-sm font-bold text-white">${price?.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                        <div className={`text-xs font-bold mt-1 ${up ? 'text-green-400' : 'text-red-400'}`}>{up ? '+' : ''}{pct.toFixed(2)}%</div>
                      </div>
                    )
                  })}
                </div>
                <div className="text-right mt-1"><a href="/market" className="text-xs text-blue-400 hover:text-blue-300">View All Markets</a></div>
              </section>
            )}

            {/* SUB-PAGE INTRO ROWS */}
            <section className="mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Analysis Pages</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { num:"01", href:"/map",         label:"World Map",    desc:"ကမ္ဘာ့အပေသဎုး geo-tagged articles ကို မြေပုံနှစ် pin တွင့်် မြေမြေ ကြည့်သဎုး။ Myanmar brief ပါသဎုး။",   color:"border-blue-800 text-blue-400" },
                  { num:"02", href:"/market",      label:"Markets",      desc:"Commodity, Index, Stocks, Forex, Crypto, Bond tab 6 ခုးပါသဎုး။ Yahoo Finance အခြက်ရေး။ Myanmar brief ပါသဎုး။",       color:"border-amber-800 text-amber-400" },
                  { num:"03", href:"/news",        label:"News Archive",  desc:"အကြေဆပ်ချ articles 120+ နှင့် collected 900+ ပါသဎုး။ Myanmar brief toggle ဖြစ်ကြည့်နိုင္။",      color:"border-green-800 text-green-400" },
                  { num:"04", href:"/intel",       label:"Full Intel",    desc:"အပြည့်ဆုံး analysis hub။ Brief, Funnel, Analysis, Pillars, MAD, Predictions tab 6 ခုးပါသဎုး။ Myanmar translation ပါသဎုး။",    color:"border-purple-800 text-purple-400" },
                  { num:"05", href:"/reports",     label:"Reports",       desc:"အစီရင်ခံးစာ archive။ Escalation score, MAD verdict, Myanmar brief ပါသဎုး။ တစ်နေ့ 2 ကြီမ် အကြေဆပ်သဎုး။",      color:"border-teal-800 text-teal-400" },
                  { num:"06", href:"/predictions", label:"Predictions",   desc:"MAD agent ခန့မှန်းချက်များ။ GPVS accuracy track လုပ်သဎုး။ April 10 verification ဖြစ်သဎုး။",    color:"border-pink-800 text-pink-400" },
                  { num:"07", href:"/downloads",   label:"Downloads",     desc:"Reports, predictions, articles CSV နှင့် JSON ဖြစ် ဒောင်းလုဒ်နိုင္။ Free ဖြစ်သဎုး။",      color:"border-gray-600 text-gray-400" },
                  { num:"08", href:"/about",       label:"About",         desc:"GNI Myanmar အကြေဆပ်, tech stack, cost breakdown, L4-L7 journey နှင့် pipeline chain တို့ပါသဎုး။",          color:"border-gray-600 text-gray-400" },
                ].map(({ num, href, label, desc, color }) => (
                  <a key={href} href={href} className={`bg-gray-900 border rounded-xl p-3 hover:bg-gray-800 transition-colors ${color}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-600 font-mono">{num}</span>
                      <span className={`text-xs font-bold ${color.split(' ')[1]}`}>{label}</span>
                      <span className="text-xs text-green-600 ml-auto">LIVE</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </a>
                ))}
              </div>
            </section>
                        {/* PREVIOUS REPORTS */}
            {reports.length > 1 && (
              <section className="mb-6">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">ယခင်အစီရင်ခံစာများ / Previous Reports</div>
                <div className="space-y-3">
                  {reports.slice(1, 4).map(r => (
                    <div key={r.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4 hover:border-gray-500 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-sm font-bold text-white">{r.title}</h3>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${r.mad_verdict?.toLowerCase() === 'bearish' ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>{r.mad_verdict?.toUpperCase()}</span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{r.summary?.slice(0, 150)}...</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                        <span>{r.location_name || 'Global'}</span>
                        <span>{safeDate(r.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-right mt-2"><a href="/reports" className="text-xs text-green-400 hover:text-green-300">View All Reports</a></div>
              </section>
            )}

            <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-3">
              <p className="text-yellow-200 text-xs">Disclaimer: GNI reports are for informational purposes only. Not financial advice. Higher Diploma in Computer Science | Spring University Myanmar (SUM)</p>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-gray-800 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-gray-600">
          GNI Myanmar | Dashboard | Higher Diploma in Computer Science | Spring University Myanmar (SUM)
        </div>
      </footer>
    </div>
  )
}
