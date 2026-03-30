"use client"
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'

interface Prediction {
  id: string; direction: string; confidence: number
  verify_date: string; accuracy_score: number | null
  agent_name: string; created_at: string
  asset: string; horizon: string
}

function safeDate(d: string) {
  if (!d) return 'TBD'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return 'TBD'
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(d: string) {
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

  const pending  = predictions.filter(p => !p.accuracy_score)
  const verified = predictions.filter(p => p.accuracy_score)
  const correctCount  = verified.filter(p => (p.accuracy_score || 0) >= 70).length
  const accuracyPct   = verified.length >= 5 ? Math.round(correctCount / verified.length * 100) : null

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-xl font-bold text-white">ခန့်မှန်းချက်များ / Predictions</h1>
              <p className="text-xs text-gray-400">GPVS Verification System | MAD Agent Predictions</p>
            </div>
            <div className="text-xs text-gray-400 text-right">
              <div><span className="text-amber-400 font-bold">{pending.length}</span> pending</div>
              <div><span className="text-green-400 font-bold">{verified.length}</span> verified</div>
            </div>
          </div>
          <Nav />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading && <div className="text-center py-20 text-gray-400">Loading...</div>}
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
                const days = daysUntil(p.verify_date)
                return (
                  <div key={p.id} className="bg-gray-900 border border-gray-700 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          p.direction?.toLowerCase() === 'bearish' ? 'bg-red-900 text-red-300' :
                          p.direction?.toLowerCase() === 'bullish' ? 'bg-green-900 text-green-300' :
                          'bg-gray-700 text-gray-300'}`}>{p.direction?.toUpperCase() || 'PENDING'}</span>
                        {p.asset && <span className="text-xs text-blue-300 font-mono">{p.asset}</span>}
                        {p.horizon && <span className="text-xs text-gray-500">{p.horizon}</span>}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-white font-bold">{p.confidence && p.confidence > 0 ? Math.round(p.confidence * 100) + '%' : 'N/A'}</div>
                        <div className="text-xs text-amber-400">{days ? `${days}d` : safeDate(p.verify_date)}</div>
                      </div>
                    </div>
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
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.direction?.toLowerCase() === 'bearish' ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>{p.direction?.toUpperCase()}</span>
                      {p.asset && <span className="text-xs text-blue-300 font-mono">{p.asset}</span>}
                    </div>
                    <span className={`text-sm font-bold ${(p.accuracy_score || 0) >= 70 ? 'text-green-400' : 'text-red-400'}`}>GPVS: {p.accuracy_score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <div className="max-w-5xl mx-auto px-4 pb-4">
        <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-3">
          <p className="text-xs text-yellow-300">Disclaimer: Predictions are for informational purposes only. Not financial advice.</p>
        </div>
      </div>
      <footer className="border-t border-gray-800 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-gray-600">Global Nexus Insights Myanmar | Higher Diploma in Computer Science | Spring University Myanmar (SUM)</div>
      </footer>
    </div>
  )
}
