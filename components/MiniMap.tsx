'use client'
import { useEffect, useRef } from 'react'

interface Event {
  id: string; title: string; lat: number; lng: number
  location_name: string; source: string; bias: string
  url?: string
}

interface Props {
  events: Event[]
  height?: string
}

// Group events by location (lat+lng key) — same as QS MapView
function groupByLocation(events: Event[]) {
  const groups: Record<string, { lat: number; lng: number; location_name: string; events: Event[]; maxBias: string }> = {}
  events.forEach(ev => {
    if (!ev.lat || !ev.lng) return
    const key = `${parseFloat(ev.lat.toString()).toFixed(3)}_${parseFloat(ev.lng.toString()).toFixed(3)}`
    if (!groups[key]) {
      groups[key] = { lat: ev.lat, lng: ev.lng, location_name: ev.location_name || ev.source || 'Unknown', events: [], maxBias: 'neutral' }
    }
    groups[key].events.push(ev)
    // Bearish takes priority, then neutral, then bullish
    if (ev.bias?.toLowerCase() === 'bearish') groups[key].maxBias = 'bearish'
    else if (ev.bias?.toLowerCase() === 'neutral' && groups[key].maxBias !== 'bearish') groups[key].maxBias = 'neutral'
  })
  return Object.values(groups)
}

export default function MiniMap({ events, height = '220px' }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    import('leaflet').then(L => {
      const map = L.map(mapRef.current!, {
        center: [20, 0],
        zoom: 2,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: false,
      })

      // Dark CartoDB tiles — same as QS
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 6,
      }).addTo(map)

      // Group by location — QS style clustering
      const groups = groupByLocation(events)

      groups.forEach(group => {
        const count = group.events.length
        const bias = group.maxBias
        const color = bias === 'bearish' ? '#ef4444' : bias === 'bullish' ? '#22c55e' : '#3b82f6'
        const size = count > 1 ? 36 : 28

        // QS-style numbered cluster badge
        const clusterIcon = L.divIcon({
          html: `<div style="
            width:${size}px;height:${size}px;
            border-radius:50%;
            background:${color};
            border:2px solid rgba(255,255,255,0.85);
            box-shadow:0 0 8px ${color},0 0 16px ${color}40;
            display:flex;align-items:center;justify-content:center;
            font-size:${count > 1 ? '11px' : '10px'};
            font-weight:bold;color:white;
            cursor:pointer;
          ">${count > 1 ? count + ' 📰' : '📰'}</div>`,
          className: '',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          popupAnchor: [0, -(size / 2) - 4],
        })

        // Build popup content — QS style with article list
        const articleList = group.events.slice(0, 4).map(ev => {
          const readBtn = ev.url
            ? `<a href="${ev.url}" target="_blank" rel="noopener noreferrer"
                style="display:inline-block;margin-top:4px;background:#1d4ed8;color:white;
                padding:2px 8px;border-radius:4px;font-size:10px;font-weight:bold;
                text-decoration:none;">Read →</a>`
            : ''
          return `
            <div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #1f2937;">
              <div style="font-size:10px;color:#9ca3af;margin-bottom:2px;">${ev.source || ''}</div>
              <div style="font-size:11px;color:#f9fafb;font-weight:bold;line-height:1.3;">
                ${(ev.title || '').slice(0, 70)}${(ev.title || '').length > 70 ? '...' : ''}
              </div>
              ${readBtn}
            </div>`
        }).join('')

        const moreText = group.events.length > 4
          ? `<div style="font-size:10px;color:#6b7280;text-align:center;">+${group.events.length - 4} more articles</div>`
          : ''

        const popupContent = `
          <div style="font-family:Arial,sans-serif;min-width:200px;max-width:260px;">
            <div style="font-weight:bold;font-size:12px;color:#60a5fa;
              margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #374151;">
              📍 ${group.location_name} — ${count} article${count !== 1 ? 's' : ''}
            </div>
            <div style="max-height:200px;overflow-y:auto;">
              ${articleList}
              ${moreText}
            </div>
          </div>`

        L.marker([group.lat, group.lng], { icon: clusterIcon })
          .bindPopup(popupContent, {
            maxWidth: 280,
            className: 'gni-popup',
          })
          .addTo(map)
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
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>{`
        .gni-popup .leaflet-popup-content-wrapper {
          background: #111827;
          border: 1px solid #374151;
          border-radius: 8px;
          color: #f9fafb;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }
        .gni-popup .leaflet-popup-tip {
          background: #111827;
        }
        .gni-popup .leaflet-popup-close-button {
          color: #9ca3af !important;
        }
        .gni-popup .leaflet-popup-content {
          margin: 10px 12px;
        }
      `}</style>
      <div ref={mapRef} style={{ height, width: '100%', background: '#111827' }} />
    </>
  )
}
