"use client"
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'

const GNI = process.env.NEXT_PUBLIC_GNI_API_URL || 'https://gni-autonomous.vercel.app'
const KEY = process.env.NEXT_PUBLIC_GNI_API_KEY || ''

interface Report {
  id: string; title: string; myanmar_summary: string; summary: string
  sentiment: string; mad_verdict: string; risk_level: string
  location_name: string; created_at: string
}

const riskBg = (r: string) => {
  switch (r?.toLowerCase()) {
    case 'critical': return 'bg-red-600 text-white'
    case 'high': return 'bg-orange-500 text-white'
    case 'medium': return 'bg-yellow-500 text-black'
    default: return 'bg-green-600 text-white'
  }
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/reports`, {
      headers: { 'X-Client': 'gni-myanmar-v1' }
    })
      .then(r => r.json())
      .then(d => { setReports(d.reports || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-xl font-bold text-white">?? Reports</h1>
              <p className="text-xs text-gray-400">Intelligence Reports | ??????????????</p>
            </div>
            <span className="text-xs text-gray-400">{reports.length} reports</span>
          </div>
          <Nav />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading && <div className="text-center py-20 text-gray-400">? Loading...</div>}
        <div className="space-y-4">
          {reports.map(r => (
            <div key={r.id} className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="text-base font-bold text-white">{r.title}</h2>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${riskBg(r.risk_level)}`}>
                    {r.risk_level?.toUpperCase()}
                  </span>
                  <span className={`text-xs font-bold ${r.mad_verdict?.toLowerCase() === 'bearish' ? 'text-red-400' : 'text-green-400'}`}>
                    {r.mad_verdict?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 mb-3">
                <div className="text-xs text-amber-400 font-bold mb-1">??????????</div>
                <p className="text-gray-300 text-sm leading-relaxed">{r.myanmar_summary || r.summary?.slice(0, 200) || 'N/A'}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>?? {r.location_name || 'Global'}</span>
                <span>{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                <span className={r.sentiment?.toLowerCase() === 'bearish' ? 'text-red-400' : 'text-green-400'}>{r.sentiment}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
      <footer className="border-t border-gray-800 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-gray-600">
          Global Nexus Insights Myanmar | Reports | SUM
        </div>
      </footer>
    </div>
  )
}
