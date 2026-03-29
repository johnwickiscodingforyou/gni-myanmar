content = open("app/page.tsx", "r", encoding="utf-8").read()

# Add imports after the Nav import
old_import = "import Nav from '@/components/Nav'"
new_import = """import Nav from '@/components/Nav'
import dynamic from 'next/dynamic'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const MiniMap = dynamic(() => import('@/components/MiniMap'), { ssr: false })
const MiniChart = dynamic(() => import('@/components/MiniChart'), { ssr: false })"""

content = content.replace(old_import, new_import, 1)

# Add mapEvents state after tickers state
old_state = "  const [loading, setLoading] = useState(true)\n  const [error, setError] = useState('')"
new_state = """  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mapEvents, setMapEvents] = useState<any[]>([])"""

content = content.replace(old_state, new_state, 1)

# Add article-events fetch inside useEffect after the KEY_TICKERS forEach
old_fetch = "    KEY_TICKERS.forEach(({ ticker, label }) => {"
new_fetch = """    fetch('/api/article-events')
      .then(r => r.json())
      .then(d => { setMapEvents(d.events || d.articles || []) })
      .catch(() => {})

    KEY_TICKERS.forEach(({ ticker, label }) => {"""

content = content.replace(old_fetch, new_fetch, 1)

# Add Map + Chart section AFTER the MAD verdict section and BEFORE Latest Report section
old_section = "            {/* LATEST REPORT */}"
new_section = """            {/* MAP + CHART side by side */}
            <section className="mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mini Map */}
                <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
                    <div className="text-xs font-bold text-white">Geopolitical Event Map</div>
                    <a href="https://gni-autonomous.vercel.app/map" target="_blank"
                      className="text-xs text-blue-400 border border-blue-800 rounded px-2 py-0.5">
                      Full Map
                    </a>
                  </div>
                  <div style={{ height: '220px' }}>
                    {mapEvents.length > 0
                      ? <MiniMap events={mapEvents.slice(0, 20)} height="220px" />
                      : <div className="flex items-center justify-center h-full text-xs text-gray-600">Loading map...</div>
                    }
                  </div>
                </div>

                {/* Mini BTC Chart */}
                <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
                    <div className="text-xs font-bold text-white">Bitcoin — 1 Year</div>
                    <a href="/markets" className="text-xs text-amber-400 border border-amber-800 rounded px-2 py-0.5">
                      Markets
                    </a>
                  </div>
                  <div style={{ height: '220px' }}>
                    <MiniChart />
                  </div>
                </div>
              </div>
            </section>

            {/* LATEST REPORT */}"""

content = content.replace(old_section, new_section, 1)

with open("app/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)

# Verify
non_ascii = [c for c in content if ord(c) > 127]
print(f"Written: app/page.tsx ({len(content)} chars)")
print(f"Non-ASCII chars: {len(non_ascii)}")
print("Done.")