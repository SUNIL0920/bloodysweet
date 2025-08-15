import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'

const hospitalIcon = new L.DivIcon({
  className: 'text-red-500',
  html: '<div style="background:#ef4444;color:white;border-radius:8px;padding:4px 6px;font-size:12px">🏥</div>'
})

function HeatLayer({ points = [] }) {
  const map = useMap()
  // create HeatLayer
  const layer = L.heatLayer(points, { radius: 25, blur: 18, maxZoom: 12 })
  layer.addTo(map)
  return null
}

function SearchControl({ onLocate }) {
  const map = useMap()
  const inputRef = useRef(null)

  useEffect(() => {
    const handler = async (e) => {
      e.preventDefault()
      const q = inputRef.current?.value?.trim()
      if (!q) return
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
        const json = await res.json()
        const top = json?.[0]
        if (top?.lat && top?.lon) {
          const lat = Number(top.lat), lng = Number(top.lon)
          map.setView([lat, lng], 12)
          onLocate && onLocate([lng, lat])
        }
      } catch {}
    }
    const form = document.getElementById('map-search-form')
    form?.addEventListener('submit', handler)
    return () => form?.removeEventListener('submit', handler)
  }, [map, onLocate])

  return (
    <div className="absolute z-[1000] left-2 top-2">
      <form id="map-search-form" className="flex gap-2">
        <input ref={inputRef} placeholder="Search location…" className="input-field-light w-64" />
        <button className="btn-secondary" type="submit">Go</button>
      </form>
    </div>
  )
}

export default function MapView({ center, requests = [], pledges = [], donors = [], heatpoints = [], routes = [], hospitals = [], onSearchLocate, heightClass = 'h-80' }) {
  const [lng, lat] = center || [0,0]
  const heat = (heatpoints || []).map(p => [p.coordinates[1], p.coordinates[0], Math.min(1, (p.count || 1)/5)])

  return (
    <div className={`${heightClass} w-full overflow-hidden rounded-2xl relative`}>
      <MapContainer center={[lat, lng]} zoom={12} scrollWheelZoom className="h-full w-full">
        <SearchControl onLocate={onSearchLocate} />
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {heat.length > 0 && <HeatLayer points={heat} />}
        <CircleMarker center={[lat, lng]} radius={8} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.8 }} />

        {requests.map(r => {
          const [rlng, rlat] = r.location?.coordinates || r.hospital?.location?.coordinates || []
          if (rlat == null) return null
          return (
            <Marker key={r._id} position={[rlat, rlng]} icon={hospitalIcon}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{r.hospital?.name || 'Hospital'}</div>
                  <div>Needs: <strong>{r.bloodType}</strong></div>
                  {typeof r.distanceKm === 'number' && <div>~{r.distanceKm.toFixed(1)} km away</div>}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {pledges.map(p => {
          const [dlng, dlat] = p.donor?.location?.coordinates || []
          if (dlat == null) return null
          return (
            <CircleMarker key={p._id} center={[dlat, dlng]} radius={6} pathOptions={{ color: '#60a5fa', fillColor: '#60a5fa', fillOpacity: 0.8 }}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{p.donor?.name}</div>
                  <div>ETA: {p.etaMinutes || '—'} min</div>
                  <div>Code: <strong>{p.code}</strong></div>
                  {typeof p.availableForMinutes === 'number' && <div>Available: ~{p.availableForMinutes} min</div>}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}

        {donors.map((d, idx) => {
          const [dlng, dlat] = d?.location?.coordinates || []
          if (dlat == null) return null
          return (
            <CircleMarker key={`donor-${d.donorId || idx}`} center={[dlat, dlng]} radius={6} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.85 }}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{d.name || 'Donor'}</div>
                  {d.bloodType && <div>Blood: <strong>{d.bloodType}</strong></div>}
                  {typeof d.distanceKm === 'number' && <div>~{d.distanceKm.toFixed(1)} km away</div>}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}

        {routes.map((r, idx) => (
          <Polyline key={idx} positions={r.coordinates} pathOptions={{ color: '#22c55e', weight: 4, opacity: 0.7 }} />
        ))}

        {hospitals.map((h) => {
          const [hlng, hlat] = h.location?.coordinates || []
          if (hlat == null) return null
          return (
            <Marker key={h._id} position={[hlat, hlng]} icon={hospitalIcon}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{h.name}</div>
                  {typeof h.activeCount === 'number' && <div>Active Requests: <strong>{h.activeCount}</strong></div>}
                  {typeof h.distanceMeters === 'number' && <div>~{(h.distanceMeters/1000).toFixed(1)} km away</div>}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
} 