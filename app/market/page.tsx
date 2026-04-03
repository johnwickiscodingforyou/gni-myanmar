"use client"
export const dynamic = "force-dynamic"
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import { mm } from '@/lib/mm'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface StockData {
  ticker: string; name: string; price: number
  change: string; changePercent: string
  rangeChange: string; rangeChangePercent: string
  currency: string
  chartData: { date: string; close: number }[]
}
interface MarketBrief { category: string; myanmar_brief: string; run_date: string }

const RANGES = [
  { label: '3D',  value: '3d'  },
  { label: '7D',  value: '7d'  },
  { label: '1M',  value: '1m'  },
  { label: '1Y',  value: '1y'  },
  { label: '10Y', value: '10y' },
]

const CATEGORIES = [
  { key: 'Commodity', label: 'Commodity', emoji: '🛢️' },
  { key: 'Index',     label: 'Index',     emoji: '📊' },
  { key: 'Stocks',   label: 'Stocks',    emoji: '🏢' },
  { key: 'Forex',    label: 'Forex',     emoji: '💱' },
  { key: 'Crypto',   label: 'Crypto',    emoji: '🃏' },
  { key: 'Bond',     label: 'Bond',      emoji: '📜' },
]

const CATEGORY_TICKERS: Record<string, { ticker: string; label: string; note: string }[]> = {
  Commodity: [
    { ticker: 'CL=F',   label: 'Crude Oil',    note: 'WTI crude benchmark. Rises with Middle East conflict, OPEC cuts, and supply disruptions.' },
    { ticker: 'BZ=F',   label: 'Brent Crude',  note: 'Global oil benchmark. Reflects geopolitical risk in oil-producing regions.' },
    { ticker: 'NG=F',   label: 'Natural Gas',  note: 'Energy price signal. Spiked when Russia weaponised gas supply against Europe in 2022.' },
    { ticker: 'GC=F',   label: 'Gold',         note: 'Safe-haven asset. Rises during crises, wars, and when confidence in fiat currency falls.' },
    { ticker: 'SI=F',   label: 'Silver',       note: 'Dual role: safe haven + industrial metal. Tracks gold but more volatile.' },
    { ticker: 'HG=F',   label: 'Copper',       note: 'Economic growth indicator. Rising copper = expanding global industrial activity.' },
    { ticker: 'ZS=F',   label: 'Soybeans',     note: 'Food security signal. Ukraine war + China demand drives soybean price volatility.' },
    { ticker: 'ZW=F',   label: 'Wheat',        note: 'Food weapon signal. Ukraine conflict directly disrupted global wheat supply chains.' },
    { ticker: 'GLD',    label: 'Gold ETF',     note: 'Accessible gold exposure. Tracks physical gold price without futures complexity.' },
    { ticker: 'GDX',    label: 'Gold Miners',  note: 'Amplified gold signal. Miners move 2-3x gold price -- stronger crisis indicator.' },
  ],
  Index: [
    { ticker: 'SPY',    label: 'US500 (S&P 500)',  note: 'Global confidence barometer. 500 largest US companies. Falling SPY = global worry.' },
    { ticker: '^DJI',   label: 'US30 (Dow Jones)', note: '30 blue-chip US companies. Oldest US index, watched by policymakers worldwide.' },
    { ticker: '^NDX',   label: 'US100 (Nasdaq)',   note: 'Tech-heavy index. Sensitive to AI, semiconductors, and US-China tech war.' },
    { ticker: '^N225',  label: 'JP225 (Nikkei)',   note: 'Japan market. Key Asia-Pacific hub -- reacts to yen strength and regional tensions.' },
    { ticker: '^FTSE',  label: 'GB100 (FTSE)',     note: 'UK market. Reflects Brexit impact, energy sector weight, and London financial health.' },
    { ticker: '^GDAXI', label: 'DE40 (DAX)',       note: 'German market. Europe largest economy -- energy crisis and Russia sanctions hit hard.' },
    { ticker: 'FXI',    label: 'China ETF',        note: 'China market proxy. Myanmar largest trading partner -- FXI fall = China slowdown.' },
    { ticker: 'EWJ',    label: 'Japan ETF',        note: 'Japan equity exposure. Tracks Nikkei companies including Toyota, Sony, SoftBank.' },
    { ticker: 'EWT',    label: 'Taiwan ETF',       note: 'Taiwan market. TSMC-heavy -- any China-Taiwan tension hits this immediately.' },
    { ticker: 'EWY',    label: 'Korea ETF',        note: 'South Korea market. Samsung, SK Hynix, Hyundai -- North Korea risk proxy.' },
  ],
  Stocks: [
    { ticker: 'AAPL',   label: 'Apple',               note: 'World most valuable company. Supply chain runs through Asia -- US-China tensions affect costs.' },
    { ticker: 'TSLA',   label: 'Tesla',               note: 'EV bellwether. Sensitive to China sales, lithium prices, and Elon Musk news.' },
    { ticker: 'MSFT',   label: 'Microsoft',           note: 'Cloud and AI leader. Azure growth drives valuation -- AI arms race beneficiary.' },
    { ticker: 'AMZN',   label: 'Amazon',              note: 'E-commerce and cloud giant. AWS is the backbone of the modern internet.' },
    { ticker: 'META',   label: 'Meta',                note: 'Social media and VR. Regulatory risk in EU and US directly impacts valuation.' },
    { ticker: 'NVDA',   label: 'Nvidia',              note: 'AI chip monopoly. Export controls to China are the single biggest risk factor.' },
    { ticker: 'JPM',    label: 'JPMorgan',            note: 'Largest US bank. Falls sharply in financial crises -- early warning indicator.' },
    { ticker: 'XOM',    label: 'ExxonMobil',          note: 'Oil supermajor. Rises when conflicts threaten supply -- geopolitical risk proxy.' },
    { ticker: 'LMT',    label: 'Lockheed Martin',     note: 'Defence giant. Rises when military conflicts escalate -- direct war indicator.' },
    { ticker: 'SOXX',   label: 'Semiconductors ETF',  note: 'Chip industry basket. Tech war, Taiwan risk, and AI demand all move SOXX.' },
  ],
  Forex: [
    { ticker: 'EURUSD=X', label: 'EUR/USD',        note: 'Most traded pair. Euro weakness signals European energy/political stress.' },
    { ticker: 'GBPUSD=X', label: 'GBP/USD',        note: 'Sterling reflects UK economic health and post-Brexit trade confidence.' },
    { ticker: 'AUDUSD=X', label: 'AUD/USD',         note: 'Commodity currency. Tracks iron ore and China demand -- risk-on/off signal.' },
    { ticker: 'JPY=X',    label: 'USD/JPY',         note: 'Yen is a safe haven. USD/JPY falls when global fear rises (yen strengthens).' },
    { ticker: 'DX-Y.NYB', label: 'DXY (USD Index)', note: 'Dollar strength index. Strong DXY weakens all other currencies including Myanmar kyat.' },
    { ticker: 'CNY=X',    label: 'USD/CNY',         note: 'Yuan rate. China controls this tightly -- devaluation signals trade war escalation.' },
    { ticker: 'CHFUSD=X', label: 'CHF/USD',         note: 'Swiss franc is a safe haven. Rises when European political risk spikes.' },
    { ticker: 'CADUSD=X', label: 'CAD/USD',         note: 'Petrocurrency. Tracks oil prices closely -- rises with energy sector strength.' },
    { ticker: 'INRUSD=X', label: 'INR/USD',         note: 'Indian rupee. Key South Asian currency -- tracks India growth and oil import costs.' },
    { ticker: 'THBUSD=X', label: 'THB/USD',         note: 'Thai baht. Closest major currency to Myanmar -- tracks Southeast Asian risk.' },
  ],
  Crypto: [
    { ticker: 'BTC-USD',  label: 'Bitcoin',          note: 'Sanctions evasion signal and dollar confidence barometer. Rises during capital flight.' },
    { ticker: 'ETH-USD',  label: 'Ethereum',         note: 'Smart contract platform. DeFi and regulatory risk drive ETH price movements.' },
    { ticker: 'BNB-USD',  label: 'Binance',          note: 'Exchange token. Tracks Binance health -- regulatory crackdowns hit BNB first.' },
    { ticker: 'SOL-USD',  label: 'Solana',           note: 'High-speed blockchain. Developer activity and network reliability drive valuation.' },
    { ticker: 'XRP-USD',  label: 'Ripple',           note: 'Cross-border payment token. SEC lawsuit resolution was key price catalyst.' },
    { ticker: 'ADA-USD',  label: 'Cardano',          note: 'Research-driven blockchain. Academic approach to smart contracts and DeFi.' },
    { ticker: 'AVAX-USD', label: 'Avalanche',        note: 'Fast finality blockchain. DeFi ecosystem growth drives AVAX demand.' },
    { ticker: 'DOGE-USD', label: 'Dogecoin',         note: 'Meme coin. Elon Musk tweets are the primary price driver -- sentiment indicator.' },
    { ticker: 'COIN',     label: 'Coinbase',         note: 'Largest US crypto exchange. Regulatory environment directly impacts COIN valuation.' },
    { ticker: 'HACK',     label: 'Cybersecurity ETF',note: 'Cyber defence basket. State-sponsored attacks and geopolitical tensions drive demand.' },
  ],
  Bond: [
    { ticker: '^TNX',   label: 'US 10Y Treasury',     note: 'Most important rate globally. Rising yield = tighter financial conditions worldwide.' },
    { ticker: '^TYX',   label: 'US 30Y Treasury',     note: 'Long-term US borrowing cost. Inflation expectations drive 30Y yield movements.' },
    { ticker: '^FVX',   label: 'US 5Y Treasury',      note: 'Medium-term rate expectations. Fed policy outlook drives 5Y yield closely.' },
    { ticker: 'TLT',    label: 'US Bond ETF',         note: 'Safe haven ETF. Rises when investors panic and flee to US government bonds.' },
    { ticker: 'HYG',    label: 'High Yield Bonds',    note: 'Early crisis warning. HYG falls before equities when credit stress appears.' },
    { ticker: 'EMB',    label: 'EM Bonds',            note: 'Emerging market sovereign debt. Relevant to ASEAN economies including Myanmar.' },
    { ticker: '^IRX',   label: 'US 13W T-Bill',       note: 'Short-term safe haven rate. Spikes when financial system stress is acute.' },
    { ticker: 'SHY',    label: 'Short-Term Bond ETF', note: 'Low-duration safety. Investors rotate here from equities during uncertainty.' },
    { ticker: 'LQD',    label: 'Corp Bond ETF',       note: 'Investment-grade corporate debt. Spreads widen in recessions and credit stress.' },
    { ticker: '^VIX',   label: 'VIX Fear Index',      note: 'Market fear gauge. Above 30 = panic. Single most important stress signal.' },
  ],
}

function formatPrice(price: number) {
  if (!price) return '--'
  return price >= 1000
    ? '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '$' + price.toFixed(2)
}

function formatDate(dateStr: string, range: string) {
  const date = new Date(dateStr)
  if (range === '3d' || range === '7d' || range === '1m') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function MarketPage() {
  const [selectedCategory, setSelectedCategory] = useState('Commodity')
  const [selectedTicker, setSelectedTicker] = useState('CL=F')
  const [selectedRange, setSelectedRange] = useState('1y')
  const rangeLabel = RANGES.find(r => r.value === selectedRange)?.label || selectedRange.toUpperCase()
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [priceCache, setPriceCache] = useState<Record<string, { price: number; changePercent: string; change: string }>>({})
  const [loadingCategory, setLoadingCategory] = useState(false)
  const [briefs, setBriefs] = useState<MarketBrief[]>([])

  useEffect(() => {
    fetch('/api/market-briefs')
      .then(r => r.json()).then(d => setBriefs(d.briefs || [])).catch(() => {})
  }, [])

  // Fetch all tickers in category on switch — QS priceCache pattern
  useEffect(() => {
    setLoadingCategory(true)
    const tickers = CATEGORY_TICKERS[selectedCategory] || []
    let completed = 0
    tickers.forEach(({ ticker }) => {
      if (priceCache[ticker]) {
        completed++
        if (completed === tickers.length) setLoadingCategory(false)
        return
      }
      fetch(`/api/stocks?ticker=${encodeURIComponent(ticker)}&range=7d`)
        .then(r => r.json())
        .then(data => {
          if (!data.error) {
            setPriceCache(prev => ({
              ...prev,
              [ticker]: { price: data.price, changePercent: data.changePercent, change: data.change }
            }))
          }
        })
        .catch(() => {})
        .finally(() => {
          completed++
          if (completed === tickers.length) setLoadingCategory(false)
        })
    })
    if (tickers.length === 0) setLoadingCategory(false)
  }, [selectedCategory])

  // Fetch chart data on ticker/range change
  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`/api/stocks?ticker=${encodeURIComponent(selectedTicker)}&range=${selectedRange}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else {
          setStockData(data)
          setPriceCache(prev => ({
            ...prev,
            [data.ticker]: { price: data.price, changePercent: data.changePercent, change: data.change }
          }))
        }
      })
      .catch(() => setError('Failed to load stock data'))
      .finally(() => setLoading(false))
  }, [selectedTicker, selectedRange])

  const isRangePositive = stockData ? parseFloat(stockData.rangeChangePercent || stockData.changePercent) >= 0 : true
  const chartColor = isRangePositive ? '#22c55e' : '#ef4444'
  const chartData = stockData?.chartData?.map(d => ({ ...d, date: formatDate(d.date, selectedRange) })) || []
  const tickCount = selectedRange === '3d' ? 3 : selectedRange === '7d' ? 7 : 8
  const currentNote = CATEGORY_TICKERS[selectedCategory]?.find(t => t.ticker === selectedTicker)?.note || ''
  const currentLabel = CATEGORY_TICKERS[selectedCategory]?.find(t => t.ticker === selectedTicker)?.label || selectedTicker
  const currentBrief = briefs.find(b => b.category === selectedCategory)

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="mb-1">
            <h1 className="text-xl font-bold text-white">📈 Market</h1>
            <p className="text-xs text-gray-400">How are global markets reacting to geopolitical events?</p>
          </div>
          <a href="/" className="inline-block mt-2 mb-1 text-xs text-blue-400 border border-blue-800 rounded px-3 py-1 hover:bg-blue-950 transition-colors">← Dashboard</a>
          <Nav />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">

        {/* MYANMAR BRIEF */}
        {currentBrief?.myanmar_brief && (
          <div className="bg-amber-950 border border-amber-700 rounded-xl p-4 mb-4">
            <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-2">ဈေးကွက်သုံးသပ်ချက် / Market Brief (Myanmar)</div>
            <p className="text-sm text-amber-100 leading-relaxed">{currentBrief.myanmar_brief}</p>
          </div>
        )}

        {/* 6 CATEGORY TABS — QS style */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {CATEGORIES.map(({ key, label, emoji }) => (
            <button key={key}
              onClick={() => {
                setSelectedCategory(key)
                const first = CATEGORY_TICKERS[key]?.[0]
                if (first) setSelectedTicker(first.ticker)
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors border ${
                selectedCategory === key
                  ? 'bg-blue-700 border-blue-500 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
              }`}>
              <span>{emoji}</span><span>{label}</span>
            </button>
          ))}
        </div>

        {/* SIDE BY SIDE: Table LEFT + Chart RIGHT — QS style */}
        <div className="flex gap-4" style={{ minHeight: '520px' }}>

          {/* LEFT — Instrument Table */}
          <div className="w-1/3 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden flex flex-col">
            <div className="grid grid-cols-4 px-3 py-2 border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider shrink-0">
              <div className="col-span-2">Instrument</div>
              <div className="text-right">Change</div>
              <div className="text-right">%</div>
            </div>
            <div className="overflow-y-auto flex-1">
              {loadingCategory && (
                <div className="px-4 py-8 text-center text-xs text-gray-500">Loading {selectedCategory}...</div>
              )}
              {!loadingCategory && (CATEGORY_TICKERS[selectedCategory] || []).map(({ ticker, label }) => {
                const cached = priceCache[ticker]
                const pct = cached ? parseFloat(cached.changePercent) : null
                const isUp = pct !== null ? pct >= 0 : null
                return (
                  <button key={ticker} onClick={() => setSelectedTicker(ticker)}
                    className={`w-full grid grid-cols-4 px-3 py-2.5 border-b border-gray-800 hover:bg-gray-800 transition-colors text-left ${
                      selectedTicker === ticker ? 'bg-gray-800 border-l-2 border-l-blue-500' : ''
                    }`}>
                    <div className="col-span-2">
                      <div className="text-xs font-bold text-white truncate">{label}</div>
                      <div className="text-xs text-gray-600 font-mono">{ticker}</div>
                    </div>
                    <div className={`text-right text-xs font-bold self-center ${isUp === null ? 'text-gray-500' : isUp ? 'text-green-400' : 'text-red-400'}`}>
                      {cached?.change ? (isUp ? '+' : '') + cached.change : '--'}
                    </div>
                    <div className="text-right self-center">
                      {pct !== null ? (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isUp ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                          {isUp ? '+' : ''}{pct.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">--</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* RIGHT — Chart */}
          <div className="w-2/3 bg-gray-900 border border-gray-700 rounded-xl p-4 flex flex-col">

            {/* Range selector */}
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex gap-2">
                {RANGES.map(({ label, value }) => (
                  <button key={value} onClick={() => setSelectedRange(value)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      selectedRange === value ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
              {stockData && (
                <div className={`text-xs font-bold px-2 py-1 rounded ${isRangePositive ? 'text-green-400 bg-green-950' : 'text-red-400 bg-red-950'}`}>
                  {rangeLabel}: {isRangePositive ? '+' : ''}{stockData.rangeChangePercent || stockData.changePercent}%
                </div>
              )}
            </div>

            {/* Chart area */}
            <div className="flex-1 min-h-0">
              {loading && (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading chart...</div>
              )}
              {error && (
                <div className="flex items-center justify-center h-full text-red-400 text-sm">⚠️ {error}</div>
              )}
              {!loading && !error && stockData && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 9 }} tickLine={false} axisLine={false}
                      interval={Math.floor(chartData.length / tickCount)} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} tickLine={false} axisLine={false}
                      tickFormatter={v => '$' + v.toLocaleString()} width={60} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb', fontSize: '11px' }}
                      formatter={(value) => ['$' + Number(value).toLocaleString(), 'Price']}
                    />
                    <Area type="monotone" dataKey="close" stroke={chartColor} strokeWidth={2}
                      fill="url(#colorClose)" dot={false} activeDot={{ r: 4, fill: chartColor }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Price + instrument note — QS style */}
            {stockData && !loading && (
              <div className="mt-3 shrink-0 border-t border-gray-800 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-white font-bold text-base">{currentLabel}</div>
                    <div className="text-xs text-gray-500 font-mono">{stockData.ticker} — {stockData.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold text-lg">{formatPrice(stockData.price)}</div>
                    {priceCache[selectedTicker] && (
                      <div className={`text-xs font-bold ${parseFloat(priceCache[selectedTicker].changePercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {parseFloat(priceCache[selectedTicker].changePercent) >= 0 ? '▲' : '▼'} {priceCache[selectedTicker].change} ({priceCache[selectedTicker].changePercent}%) today
                      </div>
                    )}
                  </div>
                </div>
                {currentNote && (
                  <div className="bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-400 leading-relaxed">
                    <span className="text-gray-300 font-bold">Note: </span>{currentNote}
                  </div>
                )}
              </div>
            )}

            {/* MYANMAR BRIEF IN CHART — unique to GNI Myanmar! */}
            {currentBrief?.myanmar_brief && (
              <div className="mt-3 shrink-0 bg-amber-950 border border-amber-800 rounded-lg p-3">
                <div className="text-xs text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <span>🇲🇲</span>
                  <span>Myanmar Market Brief — {selectedCategory}</span>
                </div>
                <p className="text-amber-200 text-xs leading-relaxed">{currentBrief.myanmar_brief}</p>
              </div>
            )}

          </div>
        </div>

        <div className="mt-3 text-center text-xs text-gray-600">Data: Yahoo Finance via GNI | Not financial advice</div>

        <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-3 mt-4">
          <p className="text-xs text-yellow-300">Disclaimer: GNI reports are for informational purposes only. Not financial advice. Higher Diploma in Computer Science | Spring University Myanmar (SUM)</p>
        </div>
      </div>

      <footer className="border-t border-gray-800 mt-4">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-gray-600">
          GNI Myanmar | Market | Higher Diploma in Computer Science | Spring University Myanmar (SUM)
        </div>
      </footer>
    </div>
  )
}
