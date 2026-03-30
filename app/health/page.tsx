"use client"
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'

interface HealthData {
  status: string
  checks: Record<string, { ok: boolean; ms?: number; status?: number | string }>
  timestamp: string
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<string>('')

  const runCheck = () => {
    setLoading(true)
    fetch('/api/health')
      .then(r => r.json())
      .then(d => { setHealth(d); setLoading(false); setLastChecked(new Date().toLocaleTimeString()) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { runCheck() }, [])

  const statusColor = (ok: boolean) => ok ? 'text-green-400' : 'text-red-400'
  const statusDot = (ok: boolean) => ok ? 'bg-green-400' : 'bg-red-400'
  const statusLabel = (ok: boolean) => ok ? 'HEALTHY' : 'DEGRADED'

  const checkLabels: Record<string, string> = {
    proxy_reports:        'Proxy: /api/reports',
    proxy_stocks:         'Proxy: /api/stocks',
    proxy_predictions:    'Proxy: /api/predictions',
    proxy_article_events: 'Proxy: /api/article-events',
    autonomous_api:       'Autonomous API',
    myanmar_supabase:     'Myanmar Supabase',
    pipeline_last_run:    'Pipeline Last Run',
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-xl font-bold text-white">စနစ်ကျန်းမာရေး / Health</h1>
              <p className="text-xs text-gray-400">System self-check | All GNI Myanmar systems</p>
            </div>
            {health && (
              <div className={`flex items-center gap-2 text-sm font-bold ${health.status === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${health.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'}`} />
                {health.status?.toUpperCase()}
              </div>
            )}
          </div>
          <Nav />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading && <div className="text-center py-20 text-gray-400">Running health checks...</div>}
        {health && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-gray-500">Last checked: {lastChecked}</div>
              <button onClick={runCheck} className="text-xs text-blue-400 border border-blue-800 rounded px-3 py-1 hover:bg-blue-950">Re-check</button>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
              {Object.entries(health.checks).map(([key, val], i) => (
                <div key={key} className={`flex items-center justify-between px-4 py-3 ${i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'} border-b border-gray-700`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${statusDot(val.ok)}`} />
                    <span className="text-sm text-white">{checkLabels[key] || key}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {val.ms !== undefined && val.ms > 0 && <span className="text-gray-500">{val.ms}ms</span>}
                    {val.status !== undefined && <span className="text-gray-400">{String(val.status)}</span>}
                    <span className={`font-bold ${statusColor(val.ok)}`}>{statusLabel(val.ok)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-gray-600 text-center">{health.timestamp}</div>
          </>
        )}
      </main>
      <footer className="border-t border-gray-800 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-gray-600">Global Nexus Insights Myanmar | Higher Diploma in Computer Science | Spring University Myanmar (SUM)</div>
      </footer>
    </div>
  )
}
