'use client'
import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface ChartPoint { date: string; close: number }

export default function MiniChart() {
  const [data, setData] = useState<ChartPoint[]>([])
  const [price, setPrice] = useState<number | null>(null)
  const [pct, setPct] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/stocks?ticker=BTC-USD&range=max')
      .then(r => r.json())
      .then(d => {
        if (d.chartData) {
          setData(d.chartData.map((x: ChartPoint) => ({
            date: new Date(x.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            close: x.close
          })))
          setPrice(d.price)
          setPct(d.changePercent)
        }
      }).catch(() => {})
  }, [])

  if (data.length === 0) return (
    <div className="flex items-center justify-center h-full text-xs text-gray-600">Loading chart...</div>
  )

  const up = parseFloat(pct || '0') >= 0

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <div className="text-xs text-gray-400">BTC-USD <span className="text-white font-bold">${price?.toLocaleString()}</span></div>
        <span className={`text-xs font-bold ${up ? 'text-green-400' : 'text-red-400'}`}>
          {up ? '+' : ''}{pct}%
        </span>
      </div>
      <div className="flex-1 px-1 pb-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="btcGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f7931a" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f7931a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 8 }} tickLine={false} axisLine={false}
              interval={Math.floor(data.length / 5)} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 8 }} tickLine={false} axisLine={false}
              tickFormatter={v => '$' + (v/1000).toFixed(0) + 'k'} width={36} domain={['auto','auto']} />
            <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '10px' }}
              formatter={(v) => ['$' + Number(v).toLocaleString(), 'BTC']} />
            <Area type="monotone" dataKey="close" stroke="#f7931a" strokeWidth={2} fill="url(#btcGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
