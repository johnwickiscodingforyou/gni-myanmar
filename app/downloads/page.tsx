"use client"
// cache-bust-v3
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import { mm } from '@/lib/mm'

const DATASETS = [
  { name: 'reports', label: 'Intelligence Reports', desc: 'GNI intelligence reports with escalation scores, MAD verdicts, and market analysis', formats: ['csv', 'json'] },
  { name: 'predictions', label: 'GPVS Predictions', desc: 'MAD agent predictions with verification dates and accuracy scores', formats: ['csv', 'json'] },
  { name: 'articles', label: 'Article Archive', desc: 'All collected articles from 25 RSS sources with geo-tags and Myanmar briefs', formats: ['csv', 'json'] },
]

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

export default function DownloadsPage() {
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    // Could fetch download counts from /api here in future
  }, [])

  const handleDownload = async (dataset: string, format: string) => {
    try {
      await fetch('/api/track-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset, format })
      })
    } catch {}
    const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/gni-myanmar-exports/${dataset}.${format}`
    window.open(fileUrl, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="mb-1">
            <h1 className="text-xl font-bold text-white">📥 Downloads</h1>
            <p className="text-xs text-gray-400">Open datasets | Free to download | GNI-R-147</p>
          </div>
          <a href="/" className="inline-block mt-2 mb-1 text-xs text-blue-400 border border-blue-800 rounded px-3 py-1 hover:bg-blue-950 transition-colors">← Dashboard</a>
          <Nav />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-blue-950 border border-blue-800 rounded-xl p-4 mb-6">
          <div className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">Open Intelligence Policy</div>
          <p className="text-xs text-blue-200">{mm.downloads_intro}</p>
        </div>
        <div className="space-y-4">
          {DATASETS.map(ds => (
            <div key={ds.name} className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">{ds.label}</h3>
                  <p className="text-xs text-gray-400">{ds.desc}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {ds.formats.map(fmt => (
                  <button key={fmt} onClick={() => handleDownload(ds.name, fmt)}
                    className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-xs font-bold text-white transition-colors">
                    <span className="text-green-400">↓</span>
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-2">Files updated every 12 hours by myanmar_pipeline.py</div>
          <div className="text-xs text-gray-600">Also available on GitHub Releases: github.com/johnwickiscodingforyou/gni-myanmar/releases</div>
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
