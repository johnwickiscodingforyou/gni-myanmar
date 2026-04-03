'use client'

import { useEffect, useState } from 'react'

interface Event {
  id: string; title: string; lat: number; lng: number
  location_name: string; source: string; bias: string; url?: string
}

interface Props {
  events: Event[]
  height?: string
}

interface LocationGroup {
  lat: number; lng: number; location_name: string
  events: Event[]; maxBias: string
}

function groupByLocation(events: Event[]): LocationGroup[] {
  const groups: Record<string, LocationGroup> = {}
  events.forEach(ev => {
    if (!ev.lat || !ev.lng) return
    const key = `${parseFloat(String(ev.lat)).toFixed(3)}_${parseFloat(String(ev.lng)).toFixed(3)}`
    if (!groups[key]) {
      groups[key] = {
        lat: ev.lat, lng: ev.lng,
        location_name: ev.location_name || ev.source || 'Unknown',
        events: [], maxBias: 'neutral'
      }
    }
    groups[key].events.push(ev)
    if (ev.bias?.toLowerCase() === 'bearish') groups[key].maxBias = 'bearish'
    else if (ev.bias?.toLowerCase() === 'neutral' && groups[key].maxBias !== 'bearish') groups[key].maxBias = 'neutral'
    else if (ev.bias?.toLowerCase() === 'bullish' && groups[key].maxBias === 'neutral') groups[key].maxBias = 'bullish'
  })
  return Object.values(groups)
}

function getBiasColor(bias: string): string {
  if (bias === 'bearish') return '#ef4444'
  if (bias === 'bullish') return '#22c55e'
  return '#3b82f6'
}

export default function MiniMap({ events, height = '220px' }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [MapComponents, setMapComponents] = useState<any>(null)

  useEffect(() => {
    // Dynamically import react-leaflet + leaflet — same pattern as QS MapView
    import('leaflet').then(L => {
      import('react-leaflet').then(RL => {
        setMapComponents({ L, RL })
      })
    })
  }, [])

  if (!MapComponents) {
    return (
      <div style={{ height, background: '#111827' }}
        className="flex items-center justify-center">
        <span className="animate-pulse text-xs text-gray-600">Loading map...</span>
      </div>
    )
  }

  const { L, RL } = MapComponents
  const { MapContainer, TileLayer, Marker, Popup } = RL

  const locationGroups = groupByLocation(events)

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>{`
        .gni-mini-map .leaflet-popup-content-wrapper {
          background: #111827;
          border: 1px solid #374151;
          border-radius: 8px;
          color: #f9fafb;
          min-width: 200px;
          max-width: 260px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }
        .gni-mini-map .leaflet-popup-tip { background: #111827; }
        .gni-mini-map .leaflet-popup-close-button { color: #9ca3af !important; }
        .gni-mini-map .leaflet-popup-content { margin: 10px 12px; }
        .gni-mini-map .leaflet-container { background: #111827; }
      `}</style>

      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height, width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
        className="gni-mini-map"
        attributionControl={false}
      >
        <style>{`
          .gni-mini-map .leaflet-tile {
            filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
          }
        `}</style>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={10}
        />

        {locationGroups.map((group, idx) => {
          const count = group.events.length
          const color = getBiasColor(group.maxBias)
          const size = count > 1 ? 36 : 28

          const clusterIcon = L.divIcon({
            html: `<div style="
              width:${size}px;height:${size}px;
              border-radius:50%;
              background:${color};
              border:2px solid rgba(255,255,255,0.85);
              box-shadow:0 0 8px ${color},0 0 16px ${color}40;
              display:flex;align-items:center;justify-content:center;
              font-size:${count > 1 ? '11px' : '10px'};
              font-weight:bold;color:white;cursor:pointer;
            ">${count > 1 ? count + ' 📰' : '📰'}</div>`,
            className: '',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
            popupAnchor: [0, -(size / 2) - 4],
          })

          // Build popup — QS style article list
          const articleList = group.events.slice(0, 4).map(ev => {
            const readBtn = ev.url
              ? `<a href="${ev.url}" target="_blank" rel="noopener noreferrer"
                  style="display:inline-block;margin-top:4px;background:#1d4ed8;color:white;
                  padding:2px 8px;border-radius:4px;font-size:10px;font-weight:bold;
                  text-decoration:none;">Read Article →</a>`
              : ''
            return `
              <div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #1f2937;">
                <div style="font-size:10px;color:#9ca3af;margin-bottom:2px;font-family:monospace;">${ev.source || ''}</div>
                <div style="font-size:11px;color:#f9fafb;font-weight:bold;line-height:1.4;">
                  ${(ev.title || '').slice(0, 70)}${(ev.title || '').length > 70 ? '...' : ''}
                </div>
                ${readBtn}
              </div>`
          }).join('')

          const moreText = group.events.length > 4
            ? `<div style="font-size:10px;color:#6b7280;text-align:center;padding-top:4px;">+${group.events.length - 4} more articles</div>`
            : ''

          const popupContent = `
            <div style="font-family:Arial,sans-serif;">
              <div style="font-weight:bold;font-size:12px;color:#60a5fa;
                margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #374151;">
                📍 ${group.location_name} — ${count} article${count !== 1 ? 's' : ''}
              </div>
              <div style="max-height:220px;overflow-y:auto;">
                ${articleList}
                ${moreText}
              </div>
            </div>`

          return (
            <Marker
              key={idx}
              position={[group.lat, group.lng]}
              icon={clusterIcon}
            >
              <Popup maxWidth={280}>
                <div dangerouslySetInnerHTML={{ __html: popupContent }} />
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </>
  )
}
