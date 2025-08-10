import { useEffect, useState } from 'react'
import { useAuth } from '../state/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
import { Droplets, MapPin, User2, AtSign, Lock, Building2, ShieldPlus } from 'lucide-react'

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

export default function RegisterPage() {
  const { register, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', bloodType: 'O+', role: 'donor' })
  const [coords, setCoords] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCoords([pos.coords.longitude, pos.coords.latitude])
      })
    }
  }, [])

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!coords) return setError('Please allow location to proceed.')
    const payload = { ...form, location: { type: 'Point', coordinates: coords } }
    const res = await register(payload)
    if (res.ok) navigate(form.role === 'hospital' ? '/hospital' : '/donor')
    else setError(res.error)
  }

  return (
    <div className="container-app">
      <div className="grid lg:grid-cols-2 gap-6 items-stretch">
        <div className="card-glass p-6">
          <div className="text-sm text-gray-300">Join the network</div>
          <h2 className="section-title mt-1">Create your account</h2>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">Name</label>
              <div className="relative">
                <User2 className="absolute left-3 top-2.5 h-4 w-4 text-white/60" />
                <input name="name" className="input-field pl-9" value={form.name} onChange={onChange} required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-2.5 h-4 w-4 text-white/60" />
                  <input type="email" name="email" className="input-field pl-9" value={form.email} onChange={onChange} required />
                </div>
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-white/60" />
                  <input type="password" name="password" className="input-field pl-9" value={form.password} onChange={onChange} required />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`card-glass px-3 py-2 flex items-center gap-2 cursor-pointer ${form.role==='donor'?'ring-2 ring-red-500':''}`}>
                    <input type="radio" name="role" value="donor" checked={form.role==='donor'} onChange={onChange} className="hidden" />
                    <ShieldPlus className="h-4 w-4" /> Donor
                  </label>
                  <label className={`card-glass px-3 py-2 flex items-center gap-2 cursor-pointer ${form.role==='hospital'?'ring-2 ring-red-500':''}`}>
                    <input type="radio" name="role" value="hospital" checked={form.role==='hospital'} onChange={onChange} className="hidden" />
                    <Building2 className="h-4 w-4" /> Hospital
                  </label>
                </div>
              </div>
              <div>
                <label className="label">Blood Type</label>
                <select name="bloodType" className="input-field" value={form.bloodType} onChange={onChange}>
                  {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
            </div>
            <div className="text-xs text-gray-300 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" /> {coords ? 'Location enabled' : 'Please allow location permissions'}
            </div>
            {error && <div className="text-sm text-red-300">{error}</div>}
            <button disabled={loading} className="btn-primary w-full justify-center text-base py-2.5"><Droplets className="h-4 w-4" /> {loading ? 'Please wait…' : 'Create Account'}</button>
          </form>
        </div>

        <div className="card-glass p-6">
          <div className="text-sm text-gray-300">Why join?</div>
          <ul className="mt-3 space-y-3 text-gray-200">
            <li className="flex gap-3"><span className="h-2 w-2 rounded-full bg-red-400 mt-2"></span> Get real-time emergency alerts when your blood type is needed nearby.</li>
            <li className="flex gap-3"><span className="h-2 w-2 rounded-full bg-indigo-300 mt-2"></span> Help hospitals reduce critical wait times for blood units.</li>
            <li className="flex gap-3"><span className="h-2 w-2 rounded-full bg-emerald-300 mt-2"></span> Your data is protected with modern encryption and authentication.</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 