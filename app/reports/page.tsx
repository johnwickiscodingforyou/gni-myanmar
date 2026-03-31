"use client"
// v2 build: 2026-03-31 15:04
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'

interface Report {
  id: string; title: string; summary: string
  sentiment: string; mad_verdict: string; mad_confidence: number
  risk_level: string; escalation_score: number; escalation_level: string
  location_name: string; created_at: string; quality_score: number
}

interface IntelMM { mad_mm: string; brief_mm: string; run_date: string }

function safeDate(d: string) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [intelMMs, setIntelMMs] = useState<IntelMM[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(d => { setReports(d.reports || []); setLoading(false) })
      .catch(() => setLoading(false))
    fetch('/api/intel-mm')
      .then(r => r.json())
      .then(d => setIntelMMs(d.summaries || []))
      .catch(() => {})
  }, [])

  const escColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL':  return 'bg-red-900 text-red-300 border-red-700'
      case 'HIGH':      return 'bg-orange-900 text-orange-300 border-orange-700'
      case 'ELEVATED':  return 'bg-yellow-900 text-yellow-300 border-yellow-700'
      case 'MODERATE':  return 'bg-blue-900 text-blue-300 border-blue-700'
      default:          return 'bg-green-900 text-green-300 border-green-700'
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-xl font-bold text-white">Intelligence Reports</h1>
              <p className="text-xs text-gray-400">Intelligence Reports Archive | {reports.length} reports</p>
            </div>
          </div>
          <Nav />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* MM DESCRIPTION */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-200 leading-relaxed">အစီရင်ခံးစာများ GNI ရို့အဒောက်ဆုံး output ဖြစ်သဎုး။ အပာအခြက် report တစ်ခုးစီကို article ငေးရား ၄၂၅ ခုးလြန် အကြေဆပ် ၁၁ ခုးကို သုံပံးသပ်ပြီးပြန်း escalation score (0-10)၊ sentiment၊ MAD verdict နှင့် confidence interval ထုတ်စေးသဎုး။ တစ်နေ့ ၂ ကြီမ် 02:00 နှင့် 10:00 UTC တွင့်် GitHub Actions ဖြစ်အထုတ်မောသဎုး။</p>
        </div>
        {/* HUB DESCRIPTION */}
        <div className="bg-gray-900 border border-teal-800 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-200 leading-relaxed">Intelligence Reports များသည် GNI အဒောက်ဆုံး output ဖြစ်သဎုး။ အပာအခြက် report တစ်ခုးစီကို article ၄၂၅ ခုး လြန် အကြေဆပ် ၁၁ ခုးကို သုံပံးသပ်ပြီးပြန်း escalation score (0-10)၊ sentiment၊ MAD verdict နှင့် confidence interval ထုတ်စေးသဎုး။ Reports များကို တစ်နေ့ ၂ ကြီမ် 02:00 နှင့် 10:00 UTC တွင့် GitHub Actions မှ တစ်ဆုံးထုတ်မောသဎုး။</p>
        </div>
        {loading && <div className="text-center py-20 text-gray-400">Loading...</div>}
        {intelMMs[0]?.brief_mm && (
          <div className="bg-amber-950 border border-amber-700 rounded-xl p-4 mb-6">
            <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-2">နောက်ဆုံး GNI Myanmar Brief</div>
            <p className="text-sm text-amber-100 leading-relaxed">{intelMMs[0].brief_mm}</p>
          </div>
        )}
        <div className="space-y-4">
          {reports.map(r => (
            <div key={r.id} className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="text-base font-bold text-white leading-snug">{r.title}</h2>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {(() => {
                    const lvl = r.escalation_level || (r.risk_level === 'High' ? 'HIGH' : r.risk_level === 'Critical' ? 'CRITICAL' : r.risk_level === 'Medium' ? 'MODERATE' : r.risk_level?.toUpperCase() || '')
                    return lvl ? <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${escColor(lvl)}`}>{lvl}</span> : null
                  })()}
                  <span className={`text-xs font-bold ${r.mad_verdict?.toLowerCase() === 'bearish' ? 'text-red-400' : 'text-green-400'}`}>
                    {r.mad_verdict?.toUpperCase()}
                  </span>
                </div>
              </div>
              {r.summary && (
                <div className="bg-gray-800 rounded-lg p-3 mb-3">
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Summary</div>
                  <p className="text-gray-300 text-xs leading-relaxed">{r.summary?.slice(0, 300)}...</p>
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{r.location_name || 'Global'}</span>
                <span>{safeDate(r.created_at)}</span>
                {r.escalation_score > 0 && <span className="text-white">Score: {r.escalation_score?.toFixed(1)}/10</span>}
                {r.quality_score > 0 && <span>Quality: {r.quality_score?.toFixed(1)}</span>}
                <span className={r.sentiment?.toLowerCase() === 'bearish' ? 'text-red-400' : 'text-green-400'}>{r.sentiment}</span>
              </div>
            </div>
          ))}
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
