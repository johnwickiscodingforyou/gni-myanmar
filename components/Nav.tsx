"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/map',         label: 'Map',         color: 'bg-blue-900 hover:bg-blue-700 border-blue-700 text-blue-200',       tip: 'ကမ္ဘာ့ geopolitical ဖြစ်ရပ်များကို မြေပုံပေါ်တွင် Myanmar brief နှင့်အတူ ကြည့်ရှုနိုင်သည်။' },
  { href: '/market',      label: 'Market',      color: 'bg-amber-900 hover:bg-amber-700 border-amber-700 text-amber-200',   tip: 'Commodity, Index, Stocks, Forex, Crypto, Bond — Yahoo Finance မှ live data ကို tab ၆ ခုဖြင့် ကြည့်ရှုနိုင်သည်။' },
  { href: '/news',        label: 'News',        color: 'bg-green-900 hover:bg-green-700 border-green-700 text-green-200',   tip: 'Selected articles နှင့် collected articles 30 ရက် archive ။ Date အလိုက် lazy loading ဖြင့် ဖတ်ရှုနိုင်သည်။' },
  { href: '/intel',       label: 'Intel',       color: 'bg-purple-900 hover:bg-purple-700 border-purple-700 text-purple-200', tip: 'အပြည့်အစုံ AI သုံးသပ်ချက် hub ။ Brief, Funnel, Analysis, Pillars, MAD, Predictions tab ၆ ခုပါဝင်သည်။' },
  { href: '/reports',     label: 'Reports',     color: 'bg-teal-900 hover:bg-teal-700 border-teal-700 text-teal-200',       tip: 'GNI intelligence reports archive ။ Escalation score, MAD verdict နှင့် Myanmar brief ပါဝင်သည်။' },
  { href: '/predictions', label: 'Predictions', color: 'bg-pink-900 hover:bg-pink-700 border-pink-700 text-pink-200',       tip: 'MAD agent ခန့်မှန်းချက်များကို GPVS စနစ်ဖြင့် မှန်ကန်မှု စစ်ဆေးသည်။ April 10, 2026 တွင် ပထမဆုံး verification ။' },
  { href: '/health',      label: 'Health',      color: 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200',       tip: 'GNI Myanmar ၏ API, database, pipeline များ real-time ကျန်းမာရေး စစ်ဆေးချက်ကို ကြည့်ရှုနိုင်သည်။' },
  { href: '/downloads',   label: 'Downloads',   color: 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200',       tip: 'Reports, predictions, articles များကို CSV နှင့် JSON ဖြင့် အခမဲ့ ဒေါင်းလုဒ်ယူနိုင်သည်။ Login မလိုပါ။' },
  { href: '/about',       label: 'About',       color: 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200',       tip: 'GNI Myanmar အကြောင်း — mission, pipeline chain, cost breakdown နှင့် L4-L7 journey ပါဝင်သည်။' },
]

export default function Nav() {
  const path = usePathname()
  return (
    <div className="mt-2 relative">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {LINKS.filter(l => l.href !== path).map(l => (
          <div key={l.href} className="relative group shrink-0">
            <Link href={l.href}
              className={`border rounded-lg px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap block ${l.color}`}>
              {l.label}
            </Link>
            <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block w-56 bg-gray-900 border border-gray-700 rounded-lg p-2 shadow-xl pointer-events-none">
              <p className="text-xs text-gray-300 leading-relaxed">{l.tip}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}