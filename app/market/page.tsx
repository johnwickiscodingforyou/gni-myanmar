"use client"
export const dynamic = "force-dynamic"
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import { mm } from '@/lib/mm'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const TABS = [
  { label: 'Commodity', tickers: [{ t: 'GC=F', l: 'Gold' }, { t: 'CL=F', l: 'Crude Oil' }, { t: 'SI=F', l: 'Silver' }, { t: 'NG=F', l: 'Natural Gas' }] },
  { label: 'Index',     tickers: [{ t: 'SPY', l: 'S&P 500' }, { t: 'QQQ', l: 'Nasdaq' }, { t: 'DIA', l: 'Dow Jones' }, { t: 'EEM', l: 'Emerging Markets' }] },
  { label: 'Stocks',    tickers: [{ t: 'XOM', l: 'ExxonMobil' }, { t: 'LMT', l: 'Lockheed Martin' }, { t: 'RTX', l: 'Raytheon' }, { t: 'CVX', l: 'Chevron' }] },
  { label: 'Forex',     tickers: [{ t: 'DX-Y.NYB', l: 'USD Index' }, { t: 'EURUSD=X', l: 'EUR/USD' }, { t: 'JPY=X', l: 'USD/JPY' }, { t: 'THBUSD=X', l: 'THB/USD' }] },
  { label: 'Crypto',    tickers: [{ t: 'BTC-USD', l: 'Bitcoin' }, { t: 'ETH-USD', l: 'Ethereum' }, { t: 'BNB-USD', l: 'BNB' }, { t: 'SOL-USD', l: 'Solana' }] },
  { label: 'Bond',      tickers: [{ t: 'TLT', l: 'US 20Y Bond' }, { t: 'IEF', l: 'US 7-10Y Bond' }, { t: 'SHY', l: 'US 1-3Y Bond' }, { t: 'GLD', l: 'Gold ETF' }] },
]

interface TickerData { t: string; l: string; price: number; change: number; pct: number; chart: {date:string;close:number}[] }
interface MarketBrief { category: string; myanmar_brief: string; run_date: string }

export default function MarketPage() {
  const [tab, setTab] = useState(0)
  const [data, setData] = useState<Record<string, TickerData>>({})
  const [briefs, setBriefs] = useState<MarketBrief[]>([])
  const [loading, setLoading] = useState<Record<string,boolean>>({})

  useEffect(() => {
    fetch('/api/market-briefs')
      .then(r => r.json()).then(d => setBriefs(d.briefs || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const tickers = TABS[tab].tickers
    tickers.forEach(({ t, l }) => {
      if (data[t]) return
      setLoading(prev => ({ ...prev, [t]: true }))
      fetch(`/api/stocks?ticker=${encodeURIComponent(t)}&range=7d`)
        .then(r => r.json())
        .then(d => {
          if (d.price) setData(prev => ({ ...prev, [t]: { t, l, price: d.price, change: d.change || 0, pct: parseFloat(d.changePercent || '0'), chart: d.chartData || [] } }))
          setLoading(prev => ({ ...prev, [t]: false }))
        }).catch(() => setLoading(prev => ({ ...prev, [t]: false })))
    })
  }, [tab])

  const currentBrief = briefs.find(b => b.category === TABS[tab].label)

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="mb-1">
            <h1 className="text-xl font-bold text-white">📈 Market</h1>
            <p className="text-xs text-gray-400">Global Market Intelligence | Yahoo Finance</p>
          </div>
          <a href="/" className="inline-block mt-2 mb-1 text-xs text-blue-400 border border-blue-800 rounded px-3 py-1 hover:bg-blue-950 transition-colors">← Dashboard</a>
          <Nav />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-4">
        <div className="bg-gray-900 border border-amber-800 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-200 leading-relaxed">{mm.market_intro}</p>
        </div>
        <div className="flex gap-2 mb-4 flex-wrap">
          {TABS.map((tb, i) => (
            <button key={tb.label} onClick={() => setTab(i)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                i === tab ? 'bg-amber-700 border-amber-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-amber-700'}`}>
              {tb.label}
            </button>
          ))}
        </div>
        {currentBrief?.myanmar_brief && (
          <div className="bg-amber-950 border border-amber-700 rounded-xl p-4 mb-4">
            <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-2">ဈေးကွက်သုံးသပ်ချက် / Market Brief (Myanmar)</div>
            <p className="text-sm text-amber-100 leading-relaxed">{currentBrief.myanmar_brief}</p>
          </div>
        )}
        <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden overflow-x-auto">
          <div className="grid grid-cols-4 px-2 sm:px-4 py-2 border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
            <div className="col-span-2">Instrument</div>
            <div className="text-right">Price</div>
            <div className="text-right">3D Change</div>
          </div>
          {TABS[tab].tickers.map(({ t, l }) => {
            const d = data[t]
            const isLoading = loading[t]
            const up = (d?.pct || 0) >= 0
            return (
              <div key={t} className="grid grid-cols-4 px-4 py-3 border-b border-gray-800 hover:bg-gray-800 transition-colors">
                <div className="col-span-2">
                  <div className="text-sm font-bold text-white">{l}</div>
                  <div className="text-xs text-gray-600 font-mono">{t}</div>
                </div>
                <div className="text-right text-sm font-bold text-white self-center">
                  {isLoading ? '...' : d ? '$' + d.price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '-'}
                </div>
                <div className="text-right self-center">
                  {d && <span className={`text-xs font-bold px-2 py-1 rounded ${up ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                    {up ? '+' : ''}{d.pct.toFixed(2)}%
                  </span>}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-3 text-center text-xs text-gray-600">Data: Yahoo Finance via GNI | Not financial advice</div>
      </main>
      <div className="max-w-5xl mx-auto px-4 pb-4">
        <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-3">
          <p className="text-xs text-yellow-300">Disclaimer: GNI reports are for informational purposes only. Not financial advice. Higher Diploma in Computer Science | Spring University Myanmar (SUM)</p>
        </div>
      </div>
      <footer className="border-t border-gray-800 mt-4">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-gray-600">Global Nexus Insights Myanmar | Higher Diploma in Computer Science | Spring University Myanmar (SUM)</div>
      </footer>
    </div>
  )
}
