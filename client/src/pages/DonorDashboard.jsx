import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../state/AuthContext.jsx'
import RequestCard from '../components/RequestCard.jsx'
import PledgeModal from '../components/PledgeModal.jsx'
import Spinner from '../components/Spinner.jsx'
import { BadgeCheck, Filter, ToggleLeft, ToggleRight, History, Award, QrCode } from 'lucide-react'
import { useToast } from '../state/ToastContext.jsx'
import MapView from '../components/MapView.jsx'
import CodeBadge from '../components/CodeBadge.jsx'
import FeedbackModal from '../components/FeedbackModal.jsx'

export default function DonorDashboard() {
  const { user, api, socket, refreshUser, setUser } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [readiness, setReadiness] = useState(null)
  const [pledges, setPledges] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [pledgeFor, setPledgeFor] = useState(null)
  const [activeCode, setActiveCode] = useState('')
  const [feedbackFor, setFeedbackFor] = useState(null)
  const [onlyCompatible, setOnlyCompatible] = useState(true)
  const [maxDistanceKm, setMaxDistanceKm] = useState(50)
  const [availableNow, setAvailableNow] = useState(user?.availableNow ?? true)
  const [routes, setRoutes] = useState([])

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
  const fetchPledges = async () => {
    try { const { data } = await api.get('/api/requests/pledges/mine'); setPledges(data) } catch { setPledges([]) }
  }

  useEffect(() => {
    let timer
    ;(async () => {
      setLoading(true)
      try { await Promise.all([fetchNearby(), fetchHotspots(), fetchReadiness(), fetchPledges()]) } finally { setLoading(false) }
      timer = setInterval(async () => { await fetchNearby(); await fetchHotspots(); await fetchReadiness(); await fetchPledges() }, 20000)
    })()
    // restore active code from localStorage
    const saved = localStorage.getItem(`activeArrivalCode:${user?._id||''}`)
    if (saved) setActiveCode(saved)
    ;(async () => {
      const near = user?.location?.coordinates?.join(',')
      if (near) {
        try { const res = await api.get(`/api/hospitals/summary?near=${encodeURIComponent(near)}&radiusKm=50`); setHospitals(res.data) } catch {}
      }
    })()
    if (socket) {
      socket.on('request:new', async ()=>{ await fetchNearby() })
      socket.on('requests:simulate', async ()=>{ await fetchNearby(); await fetchHotspots() })
      socket.on('donor:clear-code', (evt)=>{
        if (evt?.donorId === user?._id) {
          localStorage.removeItem(`activeArrivalCode:${user?._id}`)
          setActiveCode('')
        }
      })
    }
    return () => { clearInterval(timer); socket?.off('request:new'); socket?.off('requests:simulate'); socket?.off('donor:clear-code') }
  }, [])

  const openPledge = (req) => setPledgeFor(req)
  const submitPledge = async ({ etaMinutes, availableForMinutes }) => {
    const reqId = pledgeFor?._id
    if (!reqId) return
    try {
      const { data } = await api.post(`/api/requests/${reqId}/pledge`, { etaMinutes, availableForMinutes })
      const stay = isFinite(Number(availableForMinutes)) ? ` • Available ~${Number(availableForMinutes)} min` : ''
      const hospitalName = data?.request?.hospital?.name || 'Hospital'
      toast.success(`Pledged at ${hospitalName} • Code ${data.code}${stay}`)
      setActiveCode(data.code)
      localStorage.setItem(`activeArrivalCode:${user?._id}`, data.code)
      setPledgeFor(null)

      // Build driving route from donor location to hospital and display on map
      try {
        const donorCoord = user?.location?.coordinates
        const hospitalCoord = data?.request?.hospital?.location?.coordinates
        if (donorCoord && hospitalCoord) {
          const from = `${donorCoord[0]},${donorCoord[1]}`
          const to = `${hospitalCoord[0]},${hospitalCoord[1]}`
          const url = `https://router.project-osrm.org/route/v1/driving/${from};${to}?geometries=geojson&overview=full`
          const res = await fetch(url)
          const json = await res.json()
          const coordsLine = json?.routes?.[0]?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || []
          if (coordsLine.length) setRoutes([{ coordinates: coordsLine }])
        }
      } catch {}
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to pledge')
    }
  }

  const updateAvailability = async () => {
    const next = !availableNow
    try { await api.put('/api/requests/availability', { availableNow: next }); setAvailableNow(next) } catch {}
  }

  const submitFeedback = async ({ rating, comment }) => {
    if (!feedbackFor) return
    try { await api.post(`/api/requests/pledges/${feedbackFor._id}/feedback`, { rating, comment }); toast.success('Thanks for your feedback!'); setFeedbackFor(null) } catch (e) { toast.error(e?.response?.data?.message || 'Failed to submit feedback') }
  }

  const redeemHealthCheck = async () => {
    try {
      const { data } = await api.post('/api/requests/health-check/redeem')
      if (data?.ok && data?.user) {
        setUser(data.user)
        toast.success('Health check redeemed. 100 credits deducted.')
      } else {
        await refreshUser()
        toast.success('Health check redeemed.')
      }
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to redeem'
      toast.error(msg)
    }
  }

  // When pledges refresh, if there is an active pledged item, build route to its hospital
  useEffect(() => {
    (async () => {
      try {
        const active = pledges?.find(p => p.status === 'pledged') || pledges?.find(p => p.status === 'arrived')
        const donorCoord = user?.location?.coordinates
        const hospitalCoord = active?.request?.hospital?.location?.coordinates
        if (active && donorCoord && hospitalCoord) {
          const from = `${donorCoord[0]},${donorCoord[1]}`
          const to = `${hospitalCoord[0]},${hospitalCoord[1]}`
          const url = `https://router.project-osrm.org/route/v1/driving/${from};${to}?geometries=geojson&overview=full`
          const res = await fetch(url)
          const json = await res.json()
          const coordsLine = json?.routes?.[0]?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || []
          if (coordsLine.length) setRoutes([{ coordinates: coordsLine }])
        }
      } catch {}
    })()
  }, [JSON.stringify(pledges), user?.location?.coordinates?.[0], user?.location?.coordinates?.[1]])

  const filteredRequests = useMemo(() => {
    return (requests || [])
      .filter(r => (r.distanceKm ?? (r.distanceMeters ? r.distanceMeters/1000 : 999)) <= maxDistanceKm)
      .filter(r => onlyCompatible ? r.compatibilityScore : true)
  }, [requests, onlyCompatible, maxDistanceKm])

  if (loading) return <Spinner />

  const center = user?.location?.coordinates

  return (
    <div className="container-app">
      <div className="grid gap-6">
        {/* Summary */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card-glass p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-300">Blood Credits</div>
              <div className="text-white font-semibold text-xl flex items-center gap-2"><Award className="h-5 w-5" /> {user?.creditPoints || 0}</div>
            </div>
            <button className="btn-primary disabled:opacity-50" disabled={(user?.creditPoints||0) < 100} onClick={redeemHealthCheck}>Redeem 100</button>
          </div>
          <div className="card-glass p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-300">Availability</div>
              <div className="text-white font-semibold text-xl flex items-center gap-2">{availableNow ? 'Available' : 'Unavailable'}</div>
            </div>
            <button className="btn-secondary" onClick={updateAvailability}>{availableNow ? <><ToggleRight className="h-4 w-4" /> Toggle</> : <><ToggleLeft className="h-4 w-4" /> Toggle</>}</button>
          </div>
          <div className="card-glass p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-300">Active Arrival Code</div>
              <div className="text-white font-semibold text-xl flex items-center gap-2"><QrCode className="h-5 w-5" /> {activeCode || '—'}</div>
            </div>
          </div>
        </div>
        {/* Main content: Map + Requests */}
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 card-glass p-8">
            <div className="text-sm text-gray-300 mb-3">Hospitals & Heatmap</div>
            {center && (
              <MapView center={center} requests={requests} heatpoints={hotspots} hospitals={hospitals} routes={routes} heightClass="h-[480px]" onSearchLocate={async (pt)=>{
                try { const res = await api.get(`/api/hospitals/summary?near=${encodeURIComponent(pt.join(','))}&radiusKm=50`); setHospitals(res.data) } catch {}
              }} />
            )}
          </div>
          <div className="lg:col-span-2 card-glass p-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Filter className="h-4 w-4" /> Nearby Emergency Requests</h3>
              <div className="text-xs text-gray-300">Auto-refreshing every 20s</div>
            </div>
            <details className="mb-4 open:mb-4">
              <summary className="cursor-pointer text-sm text-gray-200">Filters</summary>
              <div className="mt-3 grid md:grid-cols-3 gap-3">
                <div>
                  <label className="label">Max Distance (km)</label>
                  <input type="range" min="5" max="50" step="5" value={maxDistanceKm} onChange={(e)=>setMaxDistanceKm(Number(e.target.value))} className="w-full" />
                  <div className="text-xs text-gray-300">{maxDistanceKm} km</div>
                </div>
                <div>
                  <label className="label">Only Compatible</label>
                  <div>
                    <button className="btn-secondary" onClick={()=>setOnlyCompatible(!onlyCompatible)}>{onlyCompatible ? 'Yes' : 'No'}</button>
                  </div>
                </div>
                <div>
                  <label className="label">Availability</label>
                  <button className="btn-secondary" onClick={updateAvailability}>{availableNow ? <><ToggleRight className="h-4 w-4" /> Available</> : <><ToggleLeft className="h-4 w-4" /> Unavailable</>}</button>
                </div>
              </div>
            </details>
            <div className="space-y-3">
              {filteredRequests.map(r => (
                <div key={r._id} className="space-y-2">
                  <RequestCard request={r} />
                  <div className="flex items-center gap-2">
                    <button className="btn-primary" onClick={() => openPledge(r)}>Pledge to Donate</button>
                  </div>
                </div>
              ))}
              {filteredRequests.length === 0 && (
                <div className="text-sm text-gray-300 flex items-center gap-2"><BadgeCheck className="h-4 w-4" /> No nearby requests within selected distance.</div>
              )}
            </div>
          </div>
        </div>

        {/* Pledge history */}
        <div className="card-glass p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2"><History className="h-4 w-4" /> My Pledges</h3>
          </div>
          <div className="space-y-3">
            {pledges.map(p => (
              <div key={p._id} className="card-glass p-3 flex items-center justify-between">
                <div className="text-sm text-gray-200">
                  <div className="text-white font-medium">{p.request?.hospital?.name}</div>
                  <div className="text-xs text-gray-300">{p.request?.bloodType} • pledged {new Date(p.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="badge">{p.status}</div>
                  {(p.status === 'arrived' || p.request?.status === 'fulfilled') && !p.feedbackRating && (
                    <button className="btn-secondary" onClick={()=>setFeedbackFor(p)}>Give Feedback</button>
                  )}
                </div>
              </div>
            ))}
            {pledges.length === 0 && <div className="text-xs text-gray-300">No pledges yet.</div>}
          </div>
        </div>
      </div>
      <CodeBadge code={activeCode} />
      <PledgeModal open={!!pledgeFor} onClose={()=>setPledgeFor(null)} onSubmit={submitPledge} request={pledgeFor} />
      <FeedbackModal open={!!feedbackFor} onClose={()=>setFeedbackFor(null)} onSubmit={submitFeedback} pledge={feedbackFor} />
    </div>
  )
} 