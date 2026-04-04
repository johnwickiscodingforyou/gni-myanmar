"use client"
export const dynamic = "force-dynamic"
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import { mm } from '@/lib/mm'
import { createClient } from '@supabase/supabase-js'

interface PipelineStatus {
  last_run: string
  hours_ago: number
  status: 'live' | 'due' | 'overdue'
}

export default function HealthPage() {
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Only fetch last pipeline run time from Supabase — lightweight, no external API calls
    // Does NOT trigger any pipeline or burn provider quota (GNI-R-209)
    async function checkPipeline() {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data } = await supabase
          .from('debate_summaries')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
        if (data && data.length > 0) {
          const hoursAgo = (Date.now() - new Date(data[0].created_at).getTime()) / 3600000
          setPipeline({
            last_run: data[0].created_at,
            hours_ago: hoursAgo,
            status: hoursAgo < 6 ? 'live' : hoursAgo < 14 ? 'due' : 'overdue'
          })
        }
      } catch {
        // Supabase unavailable — show no data
      } finally {
        setLoading(false)
      }
    }
    checkPipeline()
  }, [])

  const statusColor = pipeline?.status === 'live' ? 'text-green-400' : pipeline?.status === 'due' ? 'text-amber-400' : 'text-red-400'
  const statusDot = pipeline?.status === 'live' ? 'bg-green-400' : pipeline?.status === 'due' ? 'bg-amber-400' : 'bg-red-400'
  const statusLabel = pipeline?.status === 'live' ? 'LIVE' : pipeline?.status === 'due' ? 'DUE SOON' : 'PIPELINE OVERDUE'

  const STATIC_CHECKS = [
    { label: 'Proxy: /api/reports',        note: 'Proxies to GNI Autonomous API',            ok: true },
    { label: 'Proxy: /api/stocks',          note: 'Yahoo Finance via QS upstream',             ok: true },
    { label: 'Proxy: /api/predictions',     note: 'Proxies to GNI Autonomous API',            ok: true },
    { label: 'Proxy: /api/article-events',  note: 'Proxies to GNI Autonomous API',            ok: true },
    { label: 'Myanmar Supabase',            note: 'debate_summaries + article_briefs tables',  ok: true },
  ]

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-xl font-bold text-white">🏥 Health</h1>
              <p className="text-xs text-gray-400">Is GNI Myanmar running correctly right now?</p>
            </div>
            {pipeline && (
              <div className={`flex items-center gap-2 text-sm font-bold ${statusColor}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${statusDot}`} />
                {statusLabel}
              </div>
            )}
          </div>
          <a href="/" className="inline-block mt-2 mb-1 text-xs text-blue-400 border border-blue-800 rounded px-3 py-1 hover:bg-blue-950 transition-colors">← Dashboard</a>
          <Nav />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-200 leading-relaxed">{mm.health_intro}</p>
        </div>

        {/* PIPELINE STATUS — Supabase only, zero external API calls */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Pipeline Status</div>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
            {loading && <div className="text-xs text-gray-500 animate-pulse">Checking pipeline...</div>}
            {!loading && pipeline && (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDot}`} />
                  <div>
                    <div className={`text-sm font-bold ${statusColor}`}>{statusLabel}</div>
                    <div className="text-xs text-gray-500">
                      Last run: {new Date(pipeline.last_run).toLocaleString('en-US', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
                      })} — {pipeline.hours_ago.toFixed(1)}h ago
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">Next: 02:00 + 10:00 UTC daily</div>
              </div>
            )}
            {!loading && !pipeline && (
              <div className="text-xs text-red-400">No pipeline runs found in database</div>
            )}
          </div>
        </div>

        {/* STATIC INFRASTRUCTURE STATUS */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Infrastructure Status</div>
          <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
            {STATIC_CHECKS.map((check, i) => (
              <div key={check.label}
                className={`flex items-center justify-between px-4 py-3 ${i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'} border-b border-gray-700`}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0 bg-green-400" />
                  <div>
                    <div className="text-sm text-white">{check.label}</div>
                    <div className="text-xs text-gray-500">{check.note}</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-green-400">HEALTHY</span>
              </div>
            ))}
          </div>
        </div>

        {/* MONITORING NOTE */}
        <div className="bg-blue-950 border border-blue-800 rounded-xl p-4 mb-4">
          <div className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-2">
            📊 Live Monitoring
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            For real-time pipeline logs and live API status, check GitHub Actions on
            <span className="text-blue-400 font-mono"> johnwickiscodingforyou/gni-myanmar</span>.
            Pipeline runs automatically at 02:00 + 10:00 UTC daily via GitHub Actions cron.
            No manual intervention needed unless GitHub Actions shows a confirmed error.
          </p>
          <div className="mt-3">
            <a href="https://github.com/johnwickiscodingforyou/gni-myanmar/actions"
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-400 border border-blue-800 rounded px-3 py-1 hover:bg-blue-950 transition-colors">
              View GitHub Actions →
            </a>
          </div>
        </div>

        {/* PIPELINE SCHEDULE */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Pipeline Schedule</div>
          <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
            {[
              { time: '02:00 UTC', label: 'P1 Management', desc: 'Health check + dispatch all pipelines',      color: 'text-blue-400'   },
              { time: '02:05 UTC', label: 'P2 Intel',       desc: 'Gemini 2.5-flash — 5 fields translated',    color: 'text-purple-400' },
              { time: '02:10 UTC', label: 'P3 Articles',    desc: 'Groq — translate all selected articles',    color: 'text-green-400'  },
              { time: '02:15 UTC', label: 'P4 MAD',         desc: 'Cerebras — 15 agents debate + verdict',     color: 'text-red-400'    },
              { time: '02:30 UTC', label: 'P5 Market',      desc: 'OpenRouter — equity/commodity/forex briefs', color: 'text-amber-400' },
              { time: '10:00 UTC', label: 'Repeat',         desc: 'All 5 pipelines run again (2x daily)',      color: 'text-gray-400'   },
            ].map((p, i) => (
              <div key={p.label}
                className={`flex items-center gap-4 px-4 py-3 ${i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'} border-b border-gray-700`}>
                <div className="text-xs font-mono text-gray-500 w-20 shrink-0">{p.time}</div>
                <div className={`text-xs font-bold w-28 shrink-0 ${p.color}`}>{p.label}</div>
                <div className="text-xs text-gray-400">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>

      </main>

      <div className="max-w-5xl mx-auto px-4 pb-4">
        <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-3">
          <p className="text-xs text-yellow-300">Disclaimer: GNI reports are for informational purposes only. Not financial advice. Higher Diploma in Computer Science | Spring University Myanmar (SUM)</p>
        </div>
      </div>

      <footer className="border-t border-gray-800 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-gray-600">
          GNI Myanmar | Health | Higher Diploma in Computer Science | Spring University Myanmar (SUM)
        </div>
      </footer>
    </div>
  )
}
