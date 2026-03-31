"use client"
export const dynamic = "force-dynamic"
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import { mm } from '@/lib/mm'

interface Report {
  id: string; title: string; escalation_score: number; escalation_level: string
  sentiment: string; mad_verdict: string; mad_confidence: number
  mad_action_recommendation: string; mad_blind_spot: string
  mad_black_swan_case: string; mad_ostrich_case: string
  plain_narrative: string; quality_score: number
  source_consensus_score: number; deception_level: string
  confidence_interval_width: number; created_at: string
  short_focus_threats: string; long_shoot_threats: string
  market_impact: string; tickers_affected: string[]
}

interface Pillar { pillar: string; sentiment: string; escalation: number; narrative: string; source_count: number }
interface IntelMM { funnel_mm: string; primary_mm: string; geo_mm: string; tech_mm: string; fin_mm: string; mad_mm: string; brief_mm: string; run_date: string }
interface PipelineRun { articles_collected: number; articles_after_funnel: number; top_articles_count: number; created_at: string }

const TABS = ['Brief', 'Funnel', 'Analysis', 'Pillars', 'MAD', 'Predictions']

const CARDS = [
  { num: '01', emoji: '🗞️', label: 'Brief',       desc: 'Myanmar 30-second intel brief and plain narrative summary.',       t: 0, c: 'border-amber-800 text-amber-400' },
  { num: '02', emoji: '🔬', label: 'Funnel',      desc: 'Article funnel — collected, filtered, and selected counts.',       t: 1, c: 'border-blue-800 text-blue-400' },
  { num: '03', emoji: '📊', label: 'Analysis',    desc: 'Primary analysis with escalation score and confidence interval.',  t: 2, c: 'border-purple-800 text-purple-400' },
  { num: '04', emoji: '🏛️', label: 'Pillars',     desc: 'GEO, TECH, FIN pillar breakdown with Myanmar translations.',      t: 3, c: 'border-green-800 text-green-400' },
  { num: '05', emoji: '🤖', label: 'MAD',         desc: 'Multi-agent debate verdict and Myanmar analysis.',                t: 4, c: 'border-red-800 text-red-400' },
  { num: '06', emoji: '🎯', label: 'Predictions', desc: 'GPVS forecast — first verification April 10, 2026.',              t: 5, c: 'border-teal-800 text-teal-400' },
]

export default function IntelPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [intelMM, setIntelMM] = useState<IntelMM | null>(null)
  const [runs, setRuns] = useState<PipelineRun | null>(null)
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [baseline, setBaseline] = useState<{percentile:number;total_non_zero:number}|null>(null)

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(d => { setReport(d.reports?.[0] || null); setBaseline(d.baseline); setLoading(false) })
      .catch(() => setLoading(false))
    fetch('/api/pillar-reports')
      .then(r => r.json())
      .then(d => setPillars(d.pillars || d.reports || d.data || []))
      .catch(() => {})
    fetch('/api/intel-mm')
      .then(r => r.json())
      .then(d => { if (d.summaries?.[0]) setIntelMM(d.summaries[0]) })
      .catch(() => {})
    fetch('/api/pipeline-runs')
      .then(r => r.json())
      .then(d => { if (d.runs?.[0]) setRuns(d.runs[0]) })
      .catch(() => {})
  }, [])

  const certainty = report ? Math.round((1 - (report.confidence_interval_width || 0) / 1.6) * 100) : 0

  const mmBox = (label: string, content: string | null | undefined, color = 'amber') => (
    content ? (
      <div className={`bg-${color}-950 border border-${color}-700 rounded-lg p-3 mt-2`}>
        <div className={`text-xs text-${color}-400 font-bold uppercase tracking-wider mb-1`}>Myanmar</div>
        <p className={`text-xs text-${color}-100 leading-relaxed`}>{content}</p>
      </div>
    ) : null
  )

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="mb-1">
            <h1 className="text-xl font-bold text-white">🔍 Full Intelligence</h1>
            <p className="text-xs text-gray-400">What does the full AI analysis say and what should I know?</p>
          </div>
          <a href="/" className="inline-block mt-2 mb-1 text-xs text-blue-400 border border-blue-800 rounded px-3 py-1 hover:bg-blue-950 transition-colors">← Dashboard</a>
          <Nav />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-4">
        {/* MM DESCRIPTION */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-200 leading-relaxed">{mm.intel_intro}</p>
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
        {!loading && report && (
          <>
            {/* INTEL CARD GRID */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {CARDS.map(({ num, emoji, label, desc, t, c }) => (
                <button key={num} onClick={() => setTab(t)}
                  className={[
                    'bg-gray-900 border rounded-xl p-3 text-left hover:bg-gray-800 transition-colors',
                    c,
                    tab === t ? 'ring-1 ring-purple-500' : ''
                  ].join(' ')}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-600 font-mono">{num}</span>
                    <span className="text-base">{emoji}</span>
                    <span className={'text-xs font-bold ' + c.split(' ')[1]}>{label}</span>
                    <span className="text-xs text-green-600 ml-auto">LIVE</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </button>
              ))}
            </div>
            {/* TAB BAR */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {TABS.map((t, i) => (
                <button key={t} onClick={() => setTab(i)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    i === tab ? 'bg-purple-700 border-purple-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-purple-700'}`}>
                  {t}
                </button>
              ))}
            </div>

            {/* TAB 0: BRIEF */}
            {tab === 0 && (
              <div className="space-y-4">
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
                  <h2 className="text-lg font-bold text-white mb-2">{report.title}</h2>
                  <div className="flex flex-wrap gap-3 text-xs mb-3">
                    <span className={`font-bold px-3 py-1 rounded-full ${report.escalation_level === 'CRITICAL' ? 'bg-red-900 text-red-300' : 'bg-orange-900 text-orange-300'}`}>{report.escalation_level || 'UNKNOWN'}</span>
                    <span className="text-gray-400">Score: <b className="text-white">{report.escalation_score?.toFixed(1)}/10</b></span>
                    <span className="text-gray-400">Quality: <b className="text-white">{report.quality_score?.toFixed(1)}/10</b></span>
                    {certainty > 0 && <span className="text-gray-400">Certainty: <b className="text-white">{certainty}%</b></span>}
                    {(baseline?.total_non_zero ?? 0) >= 10 && <span className="text-gray-400">Percentile: <b className="text-amber-400">Top {baseline?.percentile}%</b></span>}
                  </div>
                  {mmBox('30-Second Brief', intelMM?.brief_mm)}
                  {report.plain_narrative && (
                    <div className="bg-gray-800 rounded-lg p-3 mt-3">
                      <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Plain Narrative (English)</div>
                      <p className="text-xs text-gray-300 leading-relaxed">{report.plain_narrative}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 1: FUNNEL */}
            {tab === 1 && (
              <div className="space-y-4">
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-white mb-4">Intelligence Funnel Result</h3>
                  <div className="space-y-3">
                    {[{label:'Collected',val:runs?.articles_collected||425,color:'blue'},{label:'After Funnel',val:runs?.articles_after_funnel||50,color:'amber'},{label:'Selected',val:runs?.top_articles_count||11,color:'green'}].map(s => (
                      <div key={s.label} className={`bg-${s.color}-950 border border-${s.color}-800 rounded-lg p-3`}>
                        <div className={`text-xs text-${s.color}-400 font-bold uppercase mb-1`}>{s.label}</div>
                        <div className={`text-2xl font-bold text-${s.color}-300`}>{s.val} articles</div>
                      </div>
                    ))}
                  </div>
                  {mmBox('Funnel Summary (Myanmar)', intelMM?.funnel_mm)}
                </div>
              </div>
            )}

            {/* TAB 2: PRIMARY ANALYSIS + CI */}
            {tab === 2 && (
              <div className="space-y-4">
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-white mb-4">Primary Analysis + Confidence Interval</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gray-800 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">Escalation</div>
                      <div className="text-xl font-bold text-white">{report.escalation_score?.toFixed(1)}/10</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">Sentiment</div>
                      <div className={`text-sm font-bold ${report.sentiment === 'bearish' ? 'text-red-400' : 'text-green-400'}`}>{report.sentiment}</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">CI Width</div>
                      <div className="text-sm font-bold text-white">{report.confidence_interval_width?.toFixed(3)}</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">Certainty</div>
                      <div className="text-sm font-bold text-green-400">{certainty}%</div>
                    </div>
                  </div>
                  {report.plain_narrative && (
                    <div className="bg-gray-800 rounded-lg p-3 mb-3">
                      <div className="text-xs text-gray-500 font-bold uppercase mb-1">Plain Narrative</div>
                      <p className="text-xs text-gray-300 leading-relaxed">{report.plain_narrative}</p>
                    </div>
                  )}
                  {mmBox('Primary Analysis (Myanmar)', intelMM?.primary_mm)}
                </div>
              </div>
            )}

            {/* TAB 3: PILLARS */}
            {tab === 3 && (
              <div className="space-y-4">
                {pillars.length === 0 && <div className="text-center py-10 text-gray-500">Loading pillars...</div>}
                {[{key:'GEO',mm:intelMM?.geo_mm,color:'blue'},{key:'TECH',mm:intelMM?.tech_mm,color:'purple'},{key:'FIN',mm:intelMM?.fin_mm,color:'amber'}].map(({key,mm,color}) => {
                  const p = pillars.find(p => (p.pillar || '').toUpperCase().includes(key))
                  return (
                    <div key={key} className="bg-gray-900 border border-gray-700 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`text-sm font-bold px-3 py-1 rounded-full bg-${color}-900 text-${color}-300 border border-${color}-700`}>{key}</span>
                        {p && <span className="text-xs text-gray-400">Sentiment: <b className="text-white">{p.sentiment}</b> | Sources: <b className="text-white">{p.source_count}</b></span>}
                      </div>
                      {p?.narrative && (
                        <div className="bg-gray-800 rounded-lg p-3 mb-2">
                          <div className="text-xs text-gray-500 font-bold uppercase mb-1">English Analysis</div>
                          <p className="text-xs text-gray-300 leading-relaxed">{p.narrative}</p>
                        </div>
                      )}
                      {mmBox(`${key} Pillar (Myanmar)`, mm, color)}
                    </div>
                  )
                })}
              </div>
            )}

            {/* TAB 4: MAD */}
            {tab === 4 && (
              <div className="space-y-4">
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`text-sm font-bold px-4 py-1.5 rounded-full ${report.mad_verdict === 'bearish' ? 'bg-red-900 border border-red-700 text-red-300' : 'bg-green-900 border border-green-700 text-green-300'}`}>{report.mad_verdict?.toUpperCase()}</span>
                    <span className="text-white font-bold text-lg">{Math.round((report.mad_confidence||0)*100)}%</span>
                    <span className="text-xs text-gray-500">confidence</span>
                  </div>
                  {intelMM?.mad_mm && (
                    <div className="bg-purple-950 border border-purple-700 rounded-lg p-4 mb-4">
                      <div className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-2">MAD စီရင်ချက် (Myanmar)</div>
                      <p className="text-sm text-purple-100 leading-relaxed">{intelMM.mad_mm}</p>
                    </div>
                  )}
                  <details className="bg-gray-800 rounded-lg p-3">
                    <summary className="text-xs text-gray-400 cursor-pointer font-bold uppercase">English Original (click to expand)</summary>
                    <div className="mt-3 space-y-2">
                      {report.mad_action_recommendation && <div><div className="text-xs text-blue-400 font-bold mb-1">Action Recommendation</div><p className="text-xs text-gray-300">{report.mad_action_recommendation}</p></div>}
                      {report.mad_blind_spot && <div><div className="text-xs text-purple-400 font-bold mb-1">Blind Spot</div><p className="text-xs text-gray-300">{report.mad_blind_spot}</p></div>}
                      {report.mad_black_swan_case && <div><div className="text-xs text-red-400 font-bold mb-1">Black Swan</div><p className="text-xs text-gray-300">{report.mad_black_swan_case}</p></div>}
                      {report.mad_ostrich_case && <div><div className="text-xs text-amber-400 font-bold mb-1">Ostrich Case</div><p className="text-xs text-gray-300">{report.mad_ostrich_case}</p></div>}
                      {report.short_focus_threats && <div><div className="text-xs text-orange-400 font-bold mb-1">Short Threats</div><p className="text-xs text-gray-300">{report.short_focus_threats}</p></div>}
                      {report.long_shoot_threats && <div><div className="text-xs text-red-400 font-bold mb-1">Long Threats</div><p className="text-xs text-gray-300">{report.long_shoot_threats}</p></div>}
                    </div>
                  </details>
                </div>
              </div>
            )}

            {/* TAB 5: PREDICTIONS SUMMARY */}
            {tab === 5 && (
              <div className="space-y-4">
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-white mb-3">GPVS Predictions</h3>
                  <p className="text-xs text-gray-400 mb-4">First verifications: April 10, 2026</p>
                  <a href="/predictions" className="text-xs text-blue-400 border border-blue-800 rounded px-4 py-2">View All Predictions</a>
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
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-gray-600">GNI Myanmar | Full Intelligence | Higher Diploma in Computer Science | Spring University Myanmar (SUM)</div>
      </footer>
    </div>
  )
}