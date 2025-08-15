import { useEffect, useState } from 'react'
import { useAuth } from '../state/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
import { Droplets, MapPin, User2, AtSign, Lock, Building2, ShieldPlus, Phone, Heart, Calendar, CheckCircle } from 'lucide-react'

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

export default function RegisterPage() {
  const { register, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    bloodType: 'O+', 
    role: 'donor', 
    age: '', 
    phone: '', 
    whatsappOptIn: false,
    hospitalName: '',
    hospitalAddress: '',
    capacity: ''
  })
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
    
    const payload = { 
      ...form, 
      location: { type: 'Point', coordinates: coords },
      name: form.role === 'hospital' ? form.hospitalName : form.name
    }
    
    const res = await register(payload)
    if (res.ok) navigate(form.role === 'hospital' ? '/hospital' : '/donor')
    else setError(res.error)
  }

  return (
    <div className="min-h-screen">
      <div className="container-app py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 bg-red-500/20 text-red-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Heart className="h-4 w-4" />
              Join the Blood Donation Network
            </div>
            <h1 className="section-title mb-3">Create Your Account</h1>
            <p className="section-subtitle max-w-2xl mx-auto">
              Choose your role and help save lives through our blood donation platform
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Role Selection */}
            <div className="lg:col-span-1">
              <div className="card-glass p-6 sticky top-6">
                <h3 className="text-xl font-semibold text-white mb-4">Choose Your Role</h3>
                
                <div className="space-y-3">
                  <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    form.role === 'donor' 
                      ? 'border-red-500 bg-red-500/20 shadow-lg' 
                      : 'border-white/10 hover:border-white/20'
                  }`}>
                    <input 
                      type="radio" 
                      name="role" 
                      value="donor" 
                      checked={form.role === 'donor'} 
                      onChange={onChange} 
                      className="hidden" 
                    />
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${form.role === 'donor' ? 'bg-red-500 text-white' : 'bg-white/10'}`}>
                        <ShieldPlus className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">Blood Donor</h4>
                        <p className="text-sm text-gray-300 mt-1">Register as a blood donor to help save lives</p>
                      </div>
                    </div>
                  </label>

                  <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    form.role === 'hospital' 
                      ? 'border-blue-500 bg-blue-500/20 shadow-lg' 
                      : 'border-white/10 hover:border-white/20'
                  }`}>
                    <input 
                      type="radio" 
                      name="role" 
                      value="hospital" 
                      checked={form.role === 'hospital'} 
                      onChange={onChange} 
                      className="hidden" 
                    />
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${form.role === 'hospital' ? 'bg-blue-500 text-white' : 'bg-white/10'}`}>
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">Hospital</h4>
                        <p className="text-sm text-gray-300 mt-1">Register your hospital to manage blood requests</p>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Benefits */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h4 className="font-semibold text-white mb-3">Why Join?</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Real-time emergency alerts
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Save lives in your community
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Secure and confidential
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Registration Form */}
            <div className="lg:col-span-2">
              <div className="card-glass p-8">
                <div className="flex items-center gap-3 mb-6">
                  {form.role === 'donor' ? (
                    <>
                      <div className="p-2 bg-red-500/20 rounded-lg">
                        <ShieldPlus className="h-6 w-6 text-red-400" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">Donor Registration</h2>
                        <p className="text-gray-300">Join our network of lifesaving donors</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Building2 className="h-6 w-6 text-blue-400" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">Hospital Registration</h2>
                        <p className="text-gray-300">Register your hospital to manage blood requests</p>
                      </div>
                    </>
                  )}
                </div>

                <form onSubmit={submit} className="space-y-6">
                  {/* Common Fields */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="label">
                        {form.role === 'donor' ? 'Full Name' : 'Hospital Name'}
                      </label>
                      <div className="relative">
                        {form.role === 'donor' ? (
                          <User2 className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        ) : (
                          <Building2 className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        )}
                        <input 
                          name={form.role === 'donor' ? 'name' : 'hospitalName'} 
                          className="input-field pl-10" 
                          value={form.role === 'donor' ? form.name : form.hospitalName} 
                          onChange={onChange} 
                          required 
                          placeholder={form.role === 'donor' ? 'Enter your full name' : 'Enter hospital name'}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label">Email Address</label>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input 
                          type="email" 
                          name="email" 
                          className="input-field pl-10" 
                          value={form.email} 
                          onChange={onChange} 
                          required 
                          placeholder="Enter your email"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="label">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input 
                          type="password" 
                          name="password" 
                          className="input-field pl-10" 
                          value={form.password} 
                          onChange={onChange} 
                          required 
                          placeholder="Create a strong password"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input 
                          name="phone" 
                          className="input-field pl-10" 
                          value={form.phone} 
                          onChange={onChange} 
                          placeholder="+91XXXXXXXXXX"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Role-specific Fields */}
                  {form.role === 'donor' ? (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="label">Age</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                          <input 
                            type="number" 
                            min="16" 
                            max="100" 
                            name="age" 
                            className="input-field pl-10" 
                            value={form.age || ''} 
                            onChange={onChange} 
                            placeholder="Enter your age"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label">Blood Type</label>
                        <div className="relative">
                          <Droplets className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                          <select 
                            name="bloodType" 
                            className="input-field pl-10" 
                            value={form.bloodType} 
                            onChange={onChange}
                          >
                            {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="label">Hospital Address</label>
                        <textarea 
                          name="hospitalAddress" 
                          className="input-field" 
                          value={form.hospitalAddress} 
                          onChange={onChange} 
                          rows="3"
                          placeholder="Enter hospital address"
                        />
                      </div>

                      <div>
                        <label className="label">Blood Bank Capacity (Units)</label>
                        <input 
                          type="number" 
                          name="capacity" 
                          className="input-field" 
                          value={form.capacity} 
                          onChange={onChange} 
                          placeholder="Enter capacity"
                        />
                      </div>
                    </div>
                  )}

                  {/* WhatsApp Opt-in for donors */}
                  {form.role === 'donor' && (
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          name="whatsappOptIn" 
                          checked={form.whatsappOptIn} 
                          onChange={(e) => setForm({ ...form, whatsappOptIn: e.target.checked })} 
                          className="mt-1"
                        />
                        <div>
                          <span className="font-medium text-white">Receive WhatsApp alerts</span>
                          <p className="text-sm text-gray-300 mt-1">
                            Get notified about nearby blood requests via WhatsApp
                          </p>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Location Status */}
                  <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-blue-400" />
                      <div>
                        <span className="font-medium text-blue-300">
                          {coords ? 'Location enabled' : 'Location required'}
                        </span>
                        <p className="text-sm text-blue-200">
                          {coords ? 'Your location will be used to find nearby blood requests' : 'Please allow location permissions to continue'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button 
                    disabled={loading || !coords} 
                    className="btn-primary w-full justify-center text-base py-3 text-lg font-medium"
                  >
                    <Droplets className="h-5 w-5" /> 
                    {loading ? 'Creating Account...' : `Register as ${form.role === 'donor' ? 'Donor' : 'Hospital'}`}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}