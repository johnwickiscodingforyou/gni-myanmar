"use client"
export const dynamic = "force-dynamic"
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import { mm } from '@/lib/mm'

interface Prediction {
  id: string; agent: string; horizon: string
  prediction: string; verify_by: string | null
  outcome: string | null; accurate: boolean | null
  verified_at: string | null; verified_by: string | null
  created_at: string; report_id: string
}

function safeDate(d: string | null) {
  if (!d) return 'TBD'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return 'TBD'
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(d: string | null) {
  if (!d) return null
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return null
  const days = Math.ceil((dt.getTime() - Date.now()) / 86400000)
  return days > 0 ? days : null
}

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/predictions')
      .then(r => r.json())
      .then(d => { setPredictions(d.predictions || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const pending  = predictions.filter(p => !p.verified_at)
  const verified = predictions.filter(p => p.verified_at)
  const correctCount  = verified.filter(p => p.accurate === true).length
  const accuracyPct   = verified.length >= 5 ? Math.round(correctCount / verified.length * 100) : null

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-xl font-bold text-white">🎯 Predictions</h1>
              <p className="text-xs text-gray-400">What did GNI predict and has reality confirmed it?</p>
            </div>
            <div className="text-xs text-gray-400 text-right">
              <div><span className="text-amber-400 font-bold">{pending.length}</span> pending</div>
              <div><span className="text-green-400 font-bold">{verified.length}</span> verified</div>
            </div>
          </div>
          <a href="/" className="inline-block mt-2 mb-1 text-xs text-blue-400 border border-blue-800 rounded px-3 py-1 hover:bg-blue-950 transition-colors">← Dashboard</a>
          <Nav />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* MM INTRO */}
        <div className="bg-gray-900 border border-pink-800 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-200 leading-relaxed">{mm.predictions_intro}</p>
        </div>
        {/* COUNTDOWN */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 sm:p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Next GPVS Verification</div>
            <div className="text-sm font-bold text-amber-400">April 10, 2026</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Days remaining</div>
            <div className="text-2xl font-bold text-white">
              {Math.max(0, Math.ceil((new Date("2026-04-10").getTime() - Date.now()) / 86400000))}
            </div>
          </div>
        </div>
        {loading && (
          <div className="space-y-2 animate-pulse">
            <div className="bg-gray-800 rounded-xl h-12 w-full"></div>
            <div className="bg-gray-800 rounded-xl h-12 w-full"></div>
            <div className="bg-gray-800 rounded-xl h-12 w-3/4"></div>
          </div>
        )}
        {accuracyPct !== null && (
          <div className="bg-green-950 border border-green-700 rounded-xl p-4 mb-6 text-center">
            <div className="text-xs text-green-400 font-bold uppercase tracking-wider mb-1">GPVS Track Record</div>
            <div className="text-3xl font-bold text-green-300">{accuracyPct}%</div>
            <div className="text-xs text-green-500">{correctCount}/{verified.length} predictions correct</div>
          </div>
        )}
        {accuracyPct === null && verified.length === 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6 text-center">
            <div className="text-xs text-gray-500 mb-1">GPVS Track Record</div>
            <div className="text-sm text-gray-400">{predictions.length} predictions pending verification</div>
            <div className="text-xs text-gray-600 mt-1">Track record activates April 10, 2026</div>
          </div>
        )}
        {pending.length > 0 && (
          <section className="mb-6">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">စစ်ဆေးစောင့်ဆိုင်းဆဲ / Pending ({pending.length})</div>
            <div className="space-y-2">
              {pending.slice(0, 30).map(p => {
                const days = daysUntil(p.verify_by)
                return (
                  <div key={p.id} className="bg-gray-900 border border-gray-700 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-900 text-blue-300">{p.agent?.toUpperCase() || 'AGENT'}</span>
                        {p.horizon && <span className="text-xs text-gray-500">{p.horizon}</span>}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-amber-400">{days ? `${days}d` : safeDate(p.verify_by)}</div>
                      </div>
                    </div>
                    {p.prediction && <p className="text-xs text-gray-400 mt-2 leading-relaxed">{p.prediction.slice(0, 120)}...</p>}
                  </div>
                )
              })}
            </div>
          </section>
        )}
        {verified.length > 0 && (
          <section className="mb-6">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">စစ်ဆေးပြီး / Verified ({verified.length})</div>
            <div className="space-y-2">
              {verified.map(p => (
                <div key={p.id} className="bg-gray-900 border border-green-800 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-900 text-blue-300">{p.agent?.toUpperCase()}</span>
                      {p.horizon && <span className="text-xs text-gray-500">{p.horizon}</span>}
                    </div>
                    <span className={`text-sm font-bold ${p.accurate === true ? 'text-green-400' : 'text-red-400'}`}>
                      {p.accurate === true ? 'CORRECT' : 'INCORRECT'}
                    </span>
                  </div>
                  {p.outcome && <p className="text-xs text-gray-400 mt-1 leading-relaxed">{p.outcome.slice(0, 100)}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <div className="max-w-5xl mx-auto px-4 pb-4">
        {/* FUTURE ROADMAP */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-4">
          <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">Coming as GPVS Accumulates</div>
          <div className="space-y-3">
            {[
              { num: "01", title: "Validation Log", status: "FUTURE", date: "April 10, 2026+",
                desc: "GPVS scorecard သဎုး agent တစ်ခုးစီ အခြက်ရေးကို အမှန်သဎုး။ Predictions verify ဖြစ်အစြပြီး accuracy ပြန်ပါသဎုး။" },
              { num: "02", title: "Model Learning", status: "FUTURE", date: "Q3 2026",
                desc: "အအံထောက် outcome များ ကောင်းသမှန်းအခြေး၊ source bias correction နှင့် GNI အကြေဆပ်လိုန်း self-correct ဖြစ်သဎုး ကိုသိုးတွင့်် အဖည့အရား" },
              { num: "03", title: "Pattern Library", status: "FUTURE", date: "Q4 2026",
                desc: "သမို့အပြန်းအပြန်း escalation pattern ကို historical sequence နှင့် အည်သာအခါသဎုးအခါ ကို predict ဖြစ်သဎုး။ GNI အမြေသဎုး advanced capability ဖြစ်သဎုး။" },
            ].map(({ num, title, status, date, desc }) => (
              <div key={title} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-mono">{num}</span>
                    <span className="text-sm font-bold text-white">{title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-400 border border-amber-800 rounded px-2 py-0.5">{status}</span>
                    <span className="text-xs text-gray-500">{date}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
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
