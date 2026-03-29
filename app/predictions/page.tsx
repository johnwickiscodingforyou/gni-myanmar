"use client"
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'

interface Prediction {
  id: string; direction: string; confidence: number
  verify_date: string; accuracy_score: number | null
  agent_name: string; created_at: string
}

function safeDate(d: string) {
  if (!d) return 'TBD'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return 'TBD'
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

  const pending = predictions.filter(p => !p.accuracy_score)
  const verified = predictions.filter(p => p.accuracy_score)

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-xl font-bold text-white">GNI Predictions</h1>
              <p className="text-xs text-gray-400">MAD Agent Predictions | ခန့်မှန်းချက်များ</p>
            </div>
            <div className="text-xs text-gray-400">
              <span className="text-amber-400 font-bold">{pending.length}</span> pending |
              <span className="text-green-400 font-bold ml-1">{verified.length}</span> verified
            </div>
          </div>
          <Nav />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading && <div className="text-center py-20 text-gray-400">Loading...</div>}

        {pending.length > 0 && (
          <section className="mb-6">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Pending Verification ({pending.length})</div>
            <div className="space-y-3">
              {pending.slice(0, 20).map(p => (
                <div key={p.id} className="bg-gray-900 border border-amber-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${p.direction?.toLowerCase() === 'bearish' ? 'bg-red-900 text-red-300' : p.direction?.toLowerCase() === 'bullish' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'}`}>
                      {p.direction?.toUpperCase() || 'PENDING'}
                    </span>
                    <span className="text-xs text-gray-400">
                      Confidence: <span className="text-white font-bold">
                        {p.confidence && p.confidence > 0 ? Math.round(p.confidence * 100) + '%' : 'N/A'}
                      </span>
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Agent: <span className="text-gray-300">{p.agent_name || 'MAD'}</span> |
                    Verify: <span className="text-amber-400">{safeDate(p.verify_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {verified.length > 0 && (
          <section className="mb-6">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Verified ({verified.length})</div>
            <div className="space-y-3">
              {verified.map(p => (
                <div key={p.id} className="bg-gray-900 border border-green-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${p.direction?.toLowerCase() === 'bearish' ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>
                      {p.direction?.toUpperCase()}
                    </span>
                    <span className={`text-sm font-bold ${(p.accuracy_score || 0) >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                      GPVS: {p.accuracy_score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && predictions.length === 0 && (
          <div className="text-center py-20 text-gray-500">No predictions yet</div>
        )}

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500">Earliest GPVS verification: April 10, 2026</p>
        </div>
      </main>
      
      {/* DISCLAIMER */}
      <div className='max-w-5xl mx-auto px-4 pb-4'>
        <div className='bg-yellow-950 border border-yellow-800 rounded-xl p-3'>
          <p className='text-xs text-yellow-300'>
            &#9888;&#65039; <strong>Disclaimer:</strong> GNI reports are for informational purposes only and do not constitute financial advice. Always conduct your own research before making investment decisions.
          </p>
        </div>
      </div>
      <footer className="border-t border-gray-800 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-gray-600">
          Global Nexus Insights Myanmar | Predictions | Higher Diploma in Computer Science | Spring University Myanmar (SUM)
        </div>
      </footer>
    </div>
  )
}
