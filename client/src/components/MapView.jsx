import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet'
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

export default function MapView({ center, requests = [], pledges = [], heatpoints = [] }) {
  const [lng, lat] = center || [0,0]
  const heat = (heatpoints || []).map(p => [p.coordinates[1], p.coordinates[0], Math.min(1, (p.count || 1)/5)])

  return (
    <div className="h-80 w-full overflow-hidden rounded-2xl">
      <MapContainer center={[lat, lng]} zoom={12} scrollWheelZoom className="h-full w-full">
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
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
} 