'use client'
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
