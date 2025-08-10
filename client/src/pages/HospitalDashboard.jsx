import { useEffect, useState } from 'react'
import { useAuth } from '../state/AuthContext.jsx'
import RequestCard from '../components/RequestCard.jsx'
import Spinner from '../components/Spinner.jsx'
import { PlusCircle, CheckCircle2 } from 'lucide-react'
import MapView from '../components/MapView.jsx'

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

export default function HospitalDashboard() {
  const { user, api, socket } = useAuth()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState([])
  const [bloodType, setBloodType] = useState('O+')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [pledges, setPledges] = useState([])

  const fetchMine = async () => {
    const { data } = await api.get('/api/requests/mine')
    setRequests(data)
  }

  const fetchPledges = async (id) => {
    if (!id) return setPledges([])
    const { data } = await api.get(`/api/requests/${id}/pledges`)
    setPledges(data)
  }

  useEffect(() => {
    let timer
    ;(async () => {
      setLoading(true)
      try { await fetchMine() } finally { setLoading(false) }
      timer = setInterval(async () => { await fetchMine(); if (selected) await fetchPledges(selected) }, 10000)
    })()

    if (socket) {
      socket.on('pledge:new', (evt) => {
        if (evt.requestId === selected) setPledges((p)=>[evt.pledge, ...p])
      })
      socket.on('pledge:arrived', (evt) => {
        if (evt.requestId === selected) setPledges((p)=>p.filter(x=>x._id !== evt.pledgeId))
      })
    }

    return () => { clearInterval(timer); socket?.off('pledge:new'); socket?.off('pledge:arrived') }
  }, [selected, socket])

  const createRequest = async (e) => {
    e.preventDefault()
    setError('')
    try { await api.post('/api/requests', { bloodType }); await fetchMine() } catch (e) { setError(e?.response?.data?.message || 'Failed to create request') }
  }

  const fulfill = async (request) => { try { await api.put(`/api/requests/${request._id}/fulfill`); await fetchMine() } catch {} }

  const verifyArrival = async () => {
    if (!selected) return
    const code = prompt('Enter the donor code to verify arrival:')
    if (!code) return
    try { await api.post(`/api/requests/${selected}/verify-arrival`, { code }); await fetchMine(); await fetchPledges(selected) } catch (e) { alert(e?.response?.data?.message || 'Failed to verify') }
  }

  if (loading) return <Spinner />

  const active = requests.filter(r => r.status === 'active')
  const fulfilled = requests.filter(r => r.status === 'fulfilled')
  const center = user?.location?.coordinates

  return (
    <div className="container-app">
      <div className="grid gap-6">
        <div className="card-glass p-6">
          <div className="text-sm text-gray-300">Hospital</div>
          <h2 className="section-title mt-1">Welcome, {user?.name}</h2>
          <form onSubmit={createRequest} className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="label">Create New Request</label>
              <select className="input-field" value={bloodType} onChange={(e)=>setBloodType(e.target.value)}>
                {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
              </select>
            </div>
            <button className="btn-primary"><PlusCircle className="h-4 w-4" /> Create</button>
            {error && <div className="text-sm text-red-300">{error}</div>}
          </form>
        </div>

        <div className="card-glass p-6">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-lg font-semibold text-white">Pledged Donors Map</h3>
            <select className="input-field" value={selected || ''} onChange={async (e)=>{ setSelected(e.target.value || null); await fetchPledges(e.target.value) }}>
              <option value="">Select active request…</option>
              {active.map(r => <option key={r._id} value={r._id}>{r.bloodType} at {r.hospital?.name}</option>)}
            </select>
            <button className="btn-secondary" onClick={verifyArrival}><CheckCircle2 className="h-4 w-4" /> Verify Arrival</button>
          </div>
          {center && <MapView center={center} pledges={pledges} />}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card-glass p-6">
            <h3 className="text-lg font-semibold text-white mb-3">Active Requests</h3>
            <div className="space-y-3">
              {active.map(r => <RequestCard key={r._id} request={r} onFulfill={fulfill} />)}
              {active.length === 0 && <div className="text-sm text-gray-300">No active requests</div>}
            </div>
          </div>
          <div className="card-glass p-6">
            <h3 className="text-lg font-semibold text-white mb-3">Fulfilled</h3>
            <div className="space-y-3">
              {fulfilled.map(r => <RequestCard key={r._id} request={r} />)}
              {fulfilled.length === 0 && <div className="text-sm text-gray-300">No fulfilled requests yet</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 