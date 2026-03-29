import os

# Create article-events proxy
os.makedirs("app/api/article-events", exist_ok=True)

article_events = """export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://gni-autonomous.vercel.app/api/article-events', {
      headers: { 'X-Client': 'gni-myanmar-v1' },
      next: { revalidate: 300 }
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ events: [] }, { status: 500 })
  }
}
"""

with open("app/api/article-events/route.ts", "w", encoding="utf-8") as f:
    f.write(article_events)
print("Written: app/api/article-events/route.ts")

# Create MiniMap component
os.makedirs("components", exist_ok=True)

minimap = """'use client'
import { useEffect, useRef } from 'react'

interface Event {
  id: string; title: string; lat: number; lng: number
  location_name: string; source: string; bias: string
}

interface Props {
  events: Event[]
  height?: string
}

export default function MiniMap({ events, height = '220px' }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    import('leaflet').then(L => {
      const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [18, 28],
        iconAnchor: [9, 28],
        popupAnchor: [0, -28],
      })

      const map = L.map(mapRef.current!, {
        center: [20, 0],
        zoom: 2,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: false,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 6,
      }).addTo(map)

      events.forEach(ev => {
        if (ev.lat && ev.lng) {
          const color = ev.bias?.toLowerCase() === 'bearish' ? '#ef4444' :
                        ev.bias?.toLowerCase() === 'bullish' ? '#22c55e' : '#3b82f6'

          const circleIcon = L.divIcon({
            html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5)"></div>`,
            className: '',
            iconSize: [10, 10],
            iconAnchor: [5, 5],
          })

          L.marker([ev.lat, ev.lng], { icon: circleIcon })
            .bindPopup(`<b>${ev.location_name || 'Unknown'}</b><br/><small>${ev.title?.slice(0, 60)}...</small>`)
            .addTo(map)
        }
      })

      mapInstanceRef.current = map
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [events])

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={mapRef} style={{ height, width: '100%', background: '#111827' }} />
    </>
  )
}
"""

with open("components/MiniMap.tsx", "w", encoding="utf-8") as f:
    f.write(minimap)
print("Written: components/MiniMap.tsx")

# Create MiniChart component (BTC 1yr)
minichart = """'use client'
import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface ChartPoint { date: string; close: number }

export default function MiniChart() {
  const [data, setData] = useState<ChartPoint[]>([])
  const [price, setPrice] = useState<number | null>(null)
  const [pct, setPct] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/stocks?ticker=BTC-USD&range=1y')
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
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 8 }} tickLine={false} axisLine={false}
              interval={Math.floor(data.length / 5)} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 8 }} tickLine={false} axisLine={false}
              tickFormatter={v => '$' + (v/1000).toFixed(0) + 'k'} width={36} domain={['auto','auto']} />
            <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '10px' }}
              formatter={(v) => ['$' + Number(v).toLocaleString(), 'BTC']} />
            <Area type="monotone" dataKey="close" stroke="#f59e0b" strokeWidth={2} fill="url(#btcGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
"""

with open("components/MiniChart.tsx", "w", encoding="utf-8") as f:
    f.write(minichart)
print("Written: components/MiniChart.tsx")
print("All done.")