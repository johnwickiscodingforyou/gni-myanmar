"use client"
import Nav from '@/components/Nav'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="mb-1">
            <h1 className="text-xl font-bold text-white">About GNI Myanmar</h1>
            <p className="text-xs text-gray-400">About | အကြောင်းအရာ</p>
          </div>
          <Nav />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-3">GNI Myanmar အကြောင်း</h2>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Global Nexus Insights (GNI) သည် နိုင်ငံတကာ ဘူမိနိုင်ငံရေး သတင်းအချက်အလက်များကို AI နည်းပညာဖြင့် စုဆောင်းပြီး နေ့စဉ် အစီရင်ခံစာများ ထုတ်ပြန်သည့် စနစ်တစ်ခုဖြစ်သည်။
          </p>
          <p className="text-gray-300 text-sm leading-relaxed">
            This Myanmar version presents GNI intelligence reports in Myanmar language,
            making global geopolitical analysis accessible to Myanmar readers at zero cost.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Monthly Cost', value: '$0.00', color: 'text-green-300', sub: 'Free forever' },
            { label: 'Autonomy', value: 'L7', color: 'text-blue-300', sub: 'Fully autonomous' },
            { label: 'Pipeline', value: '2x daily', color: 'text-purple-300', sub: '02:00 + 10:00 UTC' },
            { label: 'Language', value: 'EN + MY', color: 'text-amber-300', sub: 'Bilingual' },
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
              <div className="text-xs text-gray-600 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Technology Stack</h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['AI Engine', 'Groq (Llama 3)'],
              ['Database', 'Supabase'],
              ['Pipeline', 'GitHub Actions'],
              ['Hosting', 'Vercel'],
              ['Data Sources', '25 RSS feeds'],
              ['Affiliation', 'Spring University Myanmar (SUM)'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between bg-gray-800 rounded-lg px-3 py-2">
                <span className="text-gray-500">{k}</span>
                <span className="text-white font-bold">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-6">
          <div className="text-sm font-bold text-white mb-3">GNI_Autonomous Source</div>
          <p className="text-xs text-gray-400 leading-relaxed">
            GNI Myanmar reads intelligence data from GNI_Autonomous via secure API.
            GNI_Autonomous runs 4 autonomous pipelines daily producing geopolitical intelligence reports,
            MAD multi-agent debate verdicts, and market analysis — all at $0.00/month cost.
          </p>
          <a href="https://gni-autonomous.vercel.app" target="_blank"
            className="inline-block mt-3 text-xs text-blue-400 border border-blue-800 rounded px-3 py-1">
            View GNI_Autonomous
          </a>
        </div>

        <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-4">
          <p className="text-yellow-200 text-xs">
            Disclaimer: GNI reports are for informational purposes only and do not constitute financial advice.
            Higher Diploma in Computer Science | Spring University Myanmar (SUM) | Team Geeks
          </p>
        </div>
      </main>
      <footer className="border-t border-gray-800 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-gray-600">
          Global Nexus Insights Myanmar | Higher Diploma in Computer Science | Spring University Myanmar (SUM)
        </div>
      </footer>
    </div>
  )
}