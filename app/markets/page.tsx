"use client"
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'

const GNI = process.env.NEXT_PUBLIC_GNI_API_URL || 'https://gni-autonomous.vercel.app'
const KEY = process.env.NEXT_PUBLIC_GNI_API_KEY || ''

const TICKERS = [
  { ticker: 'SPY', label: 'S&P 500 ETF' },
  { ticker: 'GC=F', label: 'Gold Futures' },
  { ticker: 'CL=F', label: 'Crude Oil' },
  { ticker: 'BTC-USD', label: 'Bitcoin' },
  { ticker: 'DX-Y.NYB', label: 'USD Index' },
  { ticker: 'EURUSD=X', label: 'EUR/USD' },
  { ticker: 'GLD', label: 'Gold ETF' },
  { ticker: 'XOM', label: 'ExxonMobil' },
  { ticker: '^VIX', label: 'VIX Fear Index' },
  { ticker: 'LMT', label: 'Lockheed Martin' },
]

interface TickerData { ticker: string; label: string; price: number; changePercent: string }

export default function MarketsPage() {
  const [tickers, setTickers] = useState<TickerData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let done = 0
    const results: TickerData[] = []
    TICKERS.forEach(({ ticker, label }) => {
      fetch(`${GNI}/api/stocks?ticker=${encodeURIComponent(ticker)}&range=7d`, {
        headers: { 'X-Client': 'gni-myanmar-v1' }
      })
        .then(r => r.json())
        .then(d => { if (!d.error && d.price) results.push({ ticker, label, price: d.price, changePercent: d.changePercent }) })
        .catch(() => {})
        .finally(() => {
          done++
          if (done === TICKERS.length) {
            const sorted = TICKERS.map(t => results.find(r => r.ticker === t.ticker)).filter(Boolean) as TickerData[]
            setTickers(sorted)
            setLoading(false)
          }
        })
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-xl font-bold text-white">?? Markets</h1>
              <p className="text-xs text-gray-400">Key Market Indicators | ????????????????</p>
            </div>
            <a href={`${GNI}/stocks`} target="_blank" className="text-xs text-blue-400 border border-blue-800 rounded px-3 py-1">
              Full Markets ?
            </a>
          </div>
          <Nav />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading && <div className="text-center py-20 text-gray-400">? Loading market data...</div>}
        {tickers.length > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
            <div className="grid grid-cols-4 px-4 py-2 border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
              <div className="col-span-2">Instrument</div>
              <div className="text-right">Price</div>
              <div className="text-right">Change %</div>
            </div>
            {tickers.map(({ ticker, label, price, changePercent }) => {
              const pct = parseFloat(changePercent)
              const up = pct >= 0
              return (
                <div key={ticker} className="grid grid-cols-4 px-4 py-3 border-b border-gray-800 hover:bg-gray-800 transition-colors">
                  <div className="col-span-2">
                    <div className="text-sm font-bold text-white">{label}</div>
                    <div className="text-xs text-gray-600 font-mono">{ticker}</div>
                  </div>
                  <div className="text-right text-sm font-bold text-white self-center">
                    ${price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-right self-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${up ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                      {up ? '+' : ''}{pct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="mt-4 text-center text-xs text-gray-600">Data: Yahoo Finance via GNI | Not financial advice</div>
      </main>
      <footer className="border-t border-gray-800 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-gray-600">
          Global Nexus Insights Myanmar | Markets | SUM
        </div>
      </footer>
    </div>
  )
}
