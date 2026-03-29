"use client"
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'

const GNI = process.env.NEXT_PUBLIC_GNI_API_URL || 'https://gni-autonomous.vercel.app'
const KEY = process.env.NEXT_PUBLIC_GNI_API_KEY || ''

interface Prediction {
  id: string; direction: string; confidence: number
  verify_date: string; accuracy_score: number | null; agent_name: string; created_at: string
}

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${GNI}/api/predictions-list`, {
      headers: { 'X-GNI-Key': KEY, 'X-Client': 'gni-myanmar-v1' }
    })
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
              <h1 className="text-xl font-bold text-white">?? Predictions</h1>
              <p className="text-xs text-gray-400">MAD Agent Predictions | ?????????????????</p>
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
        {loading && <div className="text-center py-20 text-gray-400">? Loading...</div>}

        {pending.length > 0 && (
          <section className="mb-6">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Pending Verification ({pending.length})</div>
            <div className="space-y-3">
              {pending.map(p => (
                <div key={p.id} className="bg-gray-900 border border-amber-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${p.direction?.toLowerCase() === 'bearish' ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>
                      {p.direction?.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">
                      Confidence: <span className="text-white font-bold">{p.confidence ? Math.round(p.confidence * 100) + '%' : 'N/A'}</span>
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Agent: <span className="text-gray-300">{p.agent_name || 'MAD'}</span> |
                    Verify: <span className="text-amber-400">{new Date(p.verify_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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
      <footer className="border-t border-gray-800 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-gray-600">
          Global Nexus Insights Myanmar | Predictions | SUM
        </div>
      </footer>
    </div>
  )
}
