import { useEffect, useState } from 'react'
import { useAuth } from '../state/AuthContext.jsx'
import RequestCard from '../components/RequestCard.jsx'
import Spinner from '../components/Spinner.jsx'
import { BadgeCheck } from 'lucide-react'
import MapView from '../components/MapView.jsx'

export default function DonorDashboard() {
  const { user, api } = useAuth()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [readiness, setReadiness] = useState(null)

  const fetchNearby = async () => {
    const { data } = await api.get('/api/requests/nearby')
    setRequests(data)
  }
  const fetchHotspots = async () => {
    try { const { data } = await api.get('/api/requests/hotspots'); setHotspots(data) } catch { setHotspots([]) }
  }
  const fetchReadiness = async () => {
    try { const { data } = await api.get('/api/requests/readiness'); setReadiness(data) } catch { setReadiness({ score: 70 }) }
  }

  useEffect(() => {
    let timer
    ;(async () => {
      setLoading(true)
      try { await Promise.all([fetchNearby(), fetchHotspots(), fetchReadiness()]) } finally { setLoading(false) }
      timer = setInterval(async () => { await fetchNearby(); await fetchHotspots(); await fetchReadiness() }, 20000)
    })()
    return () => clearInterval(timer)
  }, [])

  const pledge = async (reqId) => {
    const eta = prompt('Enter your ETA in minutes (e.g., 20):')
    if (eta === null) return
    try {
      const { data } = await api.post(`/api/requests/${reqId}/pledge`, { etaMinutes: Number(eta) })
      alert(`Pledged! Your arrival code is ${data.code}. Show this at the hospital.`)
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to pledge')
    }
  }

  if (loading) return <Spinner />

  const center = user?.location?.coordinates

  return (
    <div className="container-app">
      <div className="grid gap-6">
        <div className="card-glass p-6">
          <div className="text-sm text-gray-300">Donor</div>
          <h2 className="section-title mt-1">Welcome, {user?.name}</h2>
          <div className="text-gray-200 mt-1">Blood Type: <span className="font-semibold text-white">{user?.bloodType}</span></div>
          {readiness && <div className="mt-2 text-sm text-gray-200">Readiness Score: <span className="font-semibold text-white">{readiness.score}</span>/100</div>}
          {center && <div className="mt-4"><MapView center={center} requests={requests} heatpoints={hotspots} /></div>}
        </div>

        <div className="card-glass p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Nearby Emergency Requests</h3>
            <div className="text-xs text-gray-300">Auto-refreshing every 15s</div>
          </div>
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r._id} className="space-y-2">
                <RequestCard request={r} />
                <div>
                  <button className="btn-primary" onClick={() => pledge(r._id)}>Pledge to Donate</button>
                </div>
              </div>
            ))}
            {requests.length === 0 && (
              <div className="text-sm text-gray-300 flex items-center gap-2"><BadgeCheck className="h-4 w-4" /> No nearby requests within 50km.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 