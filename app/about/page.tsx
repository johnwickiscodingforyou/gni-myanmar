"use client"
import { useEffect } from 'react'
import Nav from '@/components/Nav'

export default function AboutPage() {

  useEffect(() => {
    fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: '/about' }) }).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="mb-1">
            <h1 className="text-xl font-bold text-white">About GNI Myanmar</h1>
            <p className="text-xs text-gray-400">System Overview | $0.00/month | Team Geeks | SUM</p>
          </div>
          <Nav />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* DREAM SECTION */}
        <div className="bg-gray-900 border border-blue-800 rounded-xl p-6 mb-6">
          <div className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-3">The Dream / အတေအမှန်း</div>
          <p className="text-white text-base font-bold leading-relaxed mb-3">
            Intelligence should not be a privilege. It should be a right.
          </p>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            GNI Myanmar ကို ကမ္ဘာ့ Geopolitics အထောက်အချက်အလပ်အများကို Myanmar ဘာသာဖြင့် ထာပိုလှေအနိုင္ ရည္ရွယ်သဎု့။ Myanmar စာမဏားသဎုး internet အသုံပြန်း 61.1% သိုးသည့တိုင္ (DataReportal 2026) သို့မယ်သိုး Bloomberg Terminal ကဲအပြန်း $1,000 အထက်အကှေအရေးအလို့ $199/year ဖြစ်သဎုး subscription ပင္းပင္းကိုပင္သည့ သို့မယ်သိုး GNI Myanmar ကို အမြေပံသကာပှက်အပြန်း အမြေ $0.00 ဖြစ်အဎား။
          </p>
          <p className="text-gray-400 text-xs leading-relaxed">
            Built as a Higher Diploma final project at Spring University Myanmar (SUM). The goal was never just to pass an exam. The goal was to build something real, something that keeps running after the exam is over, something that serves people.
          </p>
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Monthly Cost',   value: '$0.00',    color: 'text-green-300',  sub: 'Free forever' },
            { label: 'Autonomy Level', value: 'L7',       color: 'text-blue-300',   sub: 'Fully autonomous' },
            { label: 'Pipeline',       value: '2x daily', color: 'text-purple-300', sub: '02:00 + 10:00 UTC' },
            { label: 'Language',       value: 'EN + MY',  color: 'text-amber-300',  sub: 'Bilingual' },
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
              <div className="text-xs text-gray-600 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>

        {/* COST COMPARISON */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
          <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-4">Intelligence Cost Comparison</div>
          <div className="space-y-2">
            {[
              { name: 'Bloomberg Terminal', price: '$31,980/yr', color: 'text-red-400',   bar: 'w-full',    note: 'Single seat' },
              { name: 'Stratfor Worldview', price: '$199/yr',    color: 'text-orange-400', bar: 'w-1/12',   note: 'Individual' },
              { name: 'Human Analyst',      price: '$82,000/yr', color: 'text-yellow-400', bar: 'w-full',   note: 'US average salary' },
              { name: 'GNI Myanmar',        price: '$0.00/yr',   color: 'text-green-400',  bar: 'w-0',      note: 'Open. Free. Always.' },
            ].map(({ name, price, color, note }) => (
              <div key={name} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                <div>
                  <div className="text-sm font-bold text-white">{name}</div>
                  <div className="text-xs text-gray-500">{note}</div>
                </div>
                <div className={`text-sm font-bold ${color}`}>{price}</div>
              </div>
            ))}
          </div>
        </div>

        {/* TECH STACK */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
          <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-4">Infrastructure | $0.00/month proof</div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['AI Engine',      'Groq REST API (Llama 3)',    '$0.00'],
              ['Database',       'Supabase free tier',         '$0.00'],
              ['Pipeline CI/CD', 'GitHub Actions (public)',    '$0.00'],
              ['Hosting',        'Vercel free tier',           '$0.00'],
              ['Telegram Alerts','Bot API',                    '$0.00'],
              ['Data Sources',   '25 RSS feeds via Autonomous','$0.00'],
            ].map(([k, v, cost]) => (
              <div key={k} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                <div>
                  <div className="text-gray-400">{k}</div>
                  <div className="text-gray-600 text-xs">{v}</div>
                </div>
                <span className="text-green-400 font-bold">{cost}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-center">
            <span className="text-green-400 font-bold text-lg">Total: $0.00/month</span>
          </div>
        </div>

        {/* PIPELINE CHAIN */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
          <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-4">Pipeline Chain | ပိုက်လုပြန်းဆက်လှမ်း</div>
          <div className="space-y-2 text-xs">
            {[
              { time: '02:00 + 10:00 UTC', name: 'gni_pipeline',    desc: '425 articles collected, 11 selected, report generated' },
              { time: '02:30 + 10:30 UTC', name: 'gni_mad',         desc: '4-agent MAD debate, verdict + predictions saved' },
              { time: '03:00 + 11:00 UTC', name: 'myanmar_pipeline', desc: '13,900 tokens, Myanmar content generated, Telegram sent' },
              { time: 'Every 30 min',       name: 'gni_heartbeat',   desc: 'System health check, Telegram alert if issues' },
            ].map(({ time, name, desc }) => (
              <div key={name} className="flex items-start gap-3 bg-gray-800 rounded-lg px-3 py-2">
                <span className="text-amber-400 font-mono shrink-0 w-36">{time}</span>
                <div>
                  <span className="text-blue-300 font-bold">{name}</span>
                  <span className="text-gray-400 ml-2">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SOURCE */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-6">
          <div className="text-sm font-bold text-white mb-2">Data Source: GNI_Autonomous</div>
          <p className="text-xs text-gray-400 leading-relaxed mb-3">GNI Myanmar reads intelligence from GNI_Autonomous via secure X-GNI-Key API. GNI_Autonomous runs 4 autonomous pipelines daily producing geopolitical reports, MAD multi-agent debate verdicts, GPVS predictions, and market analysis — all at $0.00/month.</p>
          <a href="https://gni-autonomous.vercel.app" target="_blank" className="inline-block text-xs text-blue-400 border border-blue-800 rounded px-3 py-1 hover:bg-blue-950">View GNI_Autonomous</a>
        </div>

        {/* BUILT BY */}
        <div className="bg-blue-950 border border-blue-800 rounded-xl p-5 mb-6">
          <div className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-2">Built By</div>
          <div className="text-white font-bold text-base mb-1">Team Geeks</div>
          <div className="text-blue-300 text-sm">Higher Diploma in Computer Science</div>
          <div className="text-blue-400 text-xs mt-1">Spring University Myanmar (SUM) | 2026</div>
          <div className="text-gray-500 text-xs mt-2">Pipeline runs autonomously via GitHub Actions (public repo)</div>
        </div>

        <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-4">
          <p className="text-yellow-200 text-xs">Disclaimer: GNI reports are for informational purposes only and do not constitute financial advice. Higher Diploma in Computer Science | Spring University Myanmar (SUM) | Team Geeks</p>
        </div>

      </main>
      <footer className="border-t border-gray-800 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-gray-600">About GNI Myanmar | Higher Diploma in Computer Science | Spring University Myanmar (SUM)</div>
      </footer>
    </div>
  )
}
