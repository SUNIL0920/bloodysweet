import { useEffect, useState } from 'react'
import { useAuth } from '../state/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
import { Droplets, MapPin, User2, AtSign, Lock, Building2, ShieldPlus, Phone, Heart, Calendar, CheckCircle, FileText, CheckCircle2 } from 'lucide-react'

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

export default function RegisterPage() {
  const { register, loading, api } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    bloodType: 'O+', 
    role: 'donor', 
    age: '', 
    gender: '',
    phone: '', 
    whatsappOptIn: false,
    hospitalName: '',
    hospitalAddress: '',
    capacity: ''
  })
  const [coords, setCoords] = useState([77.5946, 12.9716]) // Default to Bangalore coordinates
  const [error, setError] = useState('')
  const [certFile, setCertFile] = useState(null)
  const [showManualLocation, setShowManualLocation] = useState(false)
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  // Hospital verification docs
  const [licenseFile, setLicenseFile] = useState(null)
  const [registrationProof, setRegistrationProof] = useState(null)
  const [authorityLetter, setAuthorityLetter] = useState(null)
  const [accreditationFile, setAccreditationFile] = useState(null)
  const [verifyModal, setVerifyModal] = useState(null)

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords([pos.coords.longitude, pos.coords.latitude])
        },
        (error) => {
          console.error('Geolocation error:', error)
          // Set default coordinates (can be updated by user)
          setCoords([0, 0])
          setError('Location access denied. Please enable location or enter coordinates manually.')
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      )
    } else {
      setError('Geolocation not supported. Please enter coordinates manually.')
    }
  }, [])

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const setManualLocation = () => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    if (isNaN(lat) || isNaN(lng)) {
      setError('Please enter valid coordinates')
      return
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError('Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180')
      return
    }
    setCoords([lng, lat])
    setShowManualLocation(false)
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Validate required fields
    if (!form.name && form.role === 'donor') {
      return setError('Please enter your full name')
    }
    if (!form.hospitalName && form.role === 'hospital') {
      return setError('Please enter hospital name')
    }
    if (!form.email) {
      return setError('Please enter your email address')
    }
    if (!form.password) {
      return setError('Please enter a password')
    }
    if (!form.bloodType) {
      return setError('Please select your blood type')
    }
    if (!coords) {
      return setError('Please allow location to proceed or enter coordinates manually')
    }
    
    // For hospitals, verify documents BEFORE registration
    if (form.role === 'hospital') {
      // Check if at least one document is uploaded
      if (!licenseFile && !registrationProof && !authorityLetter && !accreditationFile) {
        return setError('Please upload at least one verification document (License, Registration Proof, Authority Letter, or Accreditation Certificate)')
      }
      
      try {
        const uploadDoc = async (file, type) => {
          if (!file) return null
          const ok = ['application/pdf','image/png','image/jpeg']
          if (!ok.includes(file.type)) throw new Error('Only PDF/PNG/JPG allowed')
          if (file.size > 10*1024*1024) throw new Error('File size must be <= 10MB')
          const fd = new FormData()
          fd.append('file', file)
          fd.append('type', type)
          const { data } = await api.post('/api/hospitals/verification/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
          return { type, status: data?.status, verdict: data?.document?.analysis?.verdict, missing: data?.document?.analysis?.regex?.missing || [], ai: !!data?.document?.analysis?.aiSummary }
        }
        
        const results = []
        const r1 = await uploadDoc(licenseFile, 'license'); if (r1) results.push(r1)
        const r2 = await uploadDoc(registrationProof, 'registrationProof'); if (r2) results.push(r2)
        const r3 = await uploadDoc(authorityLetter, 'authorityLetter'); if (r3) results.push(r3)
        const r4 = await uploadDoc(accreditationFile, 'accreditation'); if (r4) results.push(r4)
        
        if (results.length > 0) {
          await api.post('/api/hospitals/verification/submit')
          try {
            const { data } = await api.get('/api/hospitals/verification/mine')
            setVerifyModal({ status: data?.status || 'pending', results })
            return // Wait for user to continue, don't register yet
          } catch {
            setVerifyModal({ status: 'pending', results })
            return // Wait for user to continue, don't register yet
          }
        }
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || 'Document verification failed')
        return
      }
    }
    
    const payload = { 
      ...form, 
      location: { type: 'Point', coordinates: coords },
      name: form.role === 'hospital' ? form.hospitalName : form.name
    }
    
    console.log('Registration payload:', payload)
    console.log('Coordinates:', coords)
    
    const res = await register(payload)
    if (res.ok) {
      if (form.role === 'donor' && certFile) {
        try {
          const ok = ['application/pdf','image/png','image/jpeg']
          if (!ok.includes(certFile.type)) throw new Error('Only PDF/PNG/JPG allowed')
          if (certFile.size > 5*1024*1024) throw new Error('File size must be <= 5MB')
          const fd = new FormData()
          fd.append('file', certFile)
          await api.post('/api/requests/certificates/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        } catch (e) {
          setError(e?.response?.data?.message || e?.message || 'Certificate upload failed')
        }
      }
      // Hospital document verification is now done BEFORE registration
      navigate(form.role === 'hospital' ? '/hospital' : '/donor')
    }
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
                        <label className="label">Gender</label>
                        <select 
                          name="gender" 
                          className="input-field" 
                          value={form.gender} 
                          onChange={onChange}
                        >
                          <option value="">Select…</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
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

                      <div className="md:col-span-2">
                        <label className="label">Medical Conditions (optional)</label>
                        <textarea 
                          name="medicalConditions" 
                          className="input-field" 
                          rows="3" 
                          value={form.medicalConditions || ''} 
                          onChange={onChange} 
                          placeholder="E.g., diabetes, hypertension, past surgeries, etc."
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="label">Upload Medical Certificate (PDF/JPG/PNG, ≤ 5MB, optional)</label>
                        <input 
                          type="file" 
                          accept=".pdf,image/png,image/jpeg" 
                          className="input-field" 
                          onChange={(e)=> setCertFile(e.target.files?.[0] || null)}
                        />
                        <div className="text-xs text-gray-400 mt-1">Attach recent report or fitness certificate if available.</div>
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

                      <div className="md:col-span-2">
                        <div className="text-white font-semibold mt-2 mb-1">Verification Documents</div>
                        <div className="text-xs text-gray-300 mb-3">Provide at least one of the following to speed up verification.</div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="label flex items-center gap-2"><FileText className="h-4 w-4" /> Hospital License (PDF/JPG/PNG)</label>
                            <input type="file" accept=".pdf,image/png,image/jpeg" className="input-field" onChange={(e)=>setLicenseFile(e.target.files?.[0]||null)} />
                          </div>
                          <div>
                            <label className="label flex items-center gap-2"><FileText className="h-4 w-4" /> Registration Proof</label>
                            <input type="file" accept=".pdf,image/png,image/jpeg" className="input-field" onChange={(e)=>setRegistrationProof(e.target.files?.[0]||null)} />
                          </div>
                          <div>
                            <label className="label flex items-center gap-2"><FileText className="h-4 w-4" /> Authority Letter</label>
                            <input type="file" accept=".pdf,image/png,image/jpeg" className="input-field" onChange={(e)=>setAuthorityLetter(e.target.files?.[0]||null)} />
                          </div>
                          <div>
                            <label className="label flex items-center gap-2"><FileText className="h-4 w-4" /> Accreditation Certificate (NABH/ISO)</label>
                            <input type="file" accept=".pdf,image/png,image/jpeg" className="input-field" onChange={(e)=>setAccreditationFile(e.target.files?.[0]||null)} />
                          </div>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-2">
                          Accepted types: PDF/PNG/JPG. Max 10MB per file. Need a sample format? Download templates:
                          <div className="mt-1 flex flex-wrap gap-2">
                            <a className="btn-secondary text-xs" href="http://localhost:5000/api/hospitals/verification/template/license" target="_blank" rel="noopener noreferrer">License Template</a>
                            <a className="btn-secondary text-xs" href="http://localhost:5000/api/hospitals/verification/template/registrationProof" target="_blank" rel="noopener noreferrer">Registration Template</a>
                            <a className="btn-secondary text-xs" href="http://localhost:5000/api/hospitals/verification/template/authorityLetter" target="_blank" rel="noopener noreferrer">Authority Template</a>
                            <a className="btn-secondary text-xs" href="http://localhost:5000/api/hospitals/verification/template/accreditation" target="_blank" rel="noopener noreferrer">Accreditation Template</a>
                          </div>
                        </div>
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
                    {!coords && (
                      <div className="mt-3 pt-3 border-t border-blue-500/20">
                        <button
                          type="button"
                          onClick={() => setShowManualLocation(!showManualLocation)}
                          className="text-sm text-blue-300 hover:text-blue-200 underline"
                        >
                          {showManualLocation ? 'Hide' : 'Enter coordinates manually'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if ('geolocation' in navigator) {
                              navigator.geolocation.getCurrentPosition(
                                (pos) => {
                                  setCoords([pos.coords.longitude, pos.coords.latitude])
                                  setError('')
                                },
                                (error) => {
                                  console.error('Geolocation error:', error)
                                  setError(`Location error: ${error.message}`)
                                }
                              )
                            }
                          }}
                          className="text-sm text-blue-300 hover:text-blue-200 underline ml-3"
                        >
                          Try GPS again
                        </button>
                        {showManualLocation && (
                          <div className="mt-3 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-blue-200">Latitude</label>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="e.g., 12.9716"
                                  value={manualLat}
                                  onChange={(e) => setManualLat(e.target.value)}
                                  className="input-field text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-blue-200">Longitude</label>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="e.g., 77.5946"
                                  value={manualLng}
                                  onChange={(e) => setManualLng(e.target.value)}
                                  className="input-field text-sm"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={setManualLocation}
                              className="btn-secondary text-sm w-full"
                            >
                              Set Location
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-lg">
                      <div className="font-medium">Registration failed</div>
                      <div className="text-sm mt-1">{error}</div>
                      <div className="text-xs text-red-400 mt-2">
                        Please check that all required fields are filled and try again.
                        If the problem persists, check the browser console for more details.
                      </div>
                    </div>
                  )}

                  {/* Debug Info (remove in production) */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 text-xs text-gray-300">
                      <div className="font-medium mb-2">Debug Info:</div>
                      <div>Coordinates: {coords ? `[${coords[0]}, ${coords[1]}]` : 'Not set'}</div>
                      <div>Name: {form.role === 'donor' ? form.name : form.hospitalName}</div>
                      <div>Email: {form.email}</div>
                      <div>Blood Type: {form.bloodType}</div>
                      <div>Role: {form.role}</div>
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
      {verifyModal && (
        <div className="fixed inset-0 bg-black/60 z-[3000] grid place-items-center p-4">
          <div className="card-glass w-full max-w-lg p-6">
            <div className="text-sm text-gray-300">Verification Submitted</div>
            <h3 className="text-white font-semibold text-lg mt-1">AI Check Results</h3>
            {/* Summary Status */}
            <div className="mb-3 p-3 rounded-lg border border-white/10 bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Overall Status:</span>
                <span className={`text-sm font-medium ${(() => {
                  const allPassed = verifyModal.results.every(r => r.verdict === 'pass');
                  return allPassed ? 'text-emerald-400' : 'text-amber-400';
                })()}`}>
                  {(() => {
                    const allPassed = verifyModal.results.every(r => r.verdict === 'pass');
                    const somePassed = verifyModal.results.some(r => r.verdict === 'pass');
                    if (allPassed) return '✅ All Passed';
                    if (somePassed) return '⚠️ Partially Verified';
                    return '❌ Needs Review';
                  })()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Progress:</span>
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      (() => {
                        const passedCount = verifyModal.results.filter(r => r.verdict === 'pass').length;
                        const totalCount = verifyModal.results.length;
                        const percentage = (passedCount / totalCount) * 100;
                        if (percentage === 100) return 'bg-emerald-500';
                        if (percentage >= 50) return 'bg-amber-500';
                        return 'bg-red-500';
                      })()
                    }`}
                    style={{
                      width: `${(() => {
                        const passedCount = verifyModal.results.filter(r => r.verdict === 'pass').length;
                        const totalCount = verifyModal.results.length;
                        return (passedCount / totalCount) * 100;
                      })()}%`
                    }}
                  ></div>
                </div>
                <span className="text-xs text-gray-400">
                  {(() => {
                    const passedCount = verifyModal.results.filter(r => r.verdict === 'pass').length;
                    const totalCount = verifyModal.results.length;
                    return `${passedCount}/${totalCount}`;
                  })()}
                </span>
              </div>
            </div>
            
            <div className="mt-3 space-y-2">
              {verifyModal.results.map((r, idx) => (
                <div key={idx} className="flex items-start justify-between bg-white/5 border border-white/10 rounded-lg p-3">
                  <div>
                    <div className="text-white font-medium capitalize">{r.type.replace(/([A-Z])/g,' $1')}</div>
                    <div className="text-xs text-gray-300">
                      Verdict: <span className={r.verdict==='pass' ? 'text-emerald-300' : r.verdict==='partial' ? 'text-amber-300' : 'text-red-300'}>{r.verdict || 'n/a'}</span>
                      {r.missing?.length ? (
                        <span> • Missing: {r.missing.slice(0,3).join(', ')}{r.missing.length>3?'…':''}</span>
                      ) : null}
                      {r.ai ? ' • AI verified' : ' • Regex verified'}
                    </div>
                  </div>
                  <div className={`badge ${r.verdict==='pass' ? 'bg-emerald-500/20 border-emerald-500/30' : r.verdict==='partial' ? 'bg-amber-500/20 border-amber-500/30' : 'bg-red-500/20 border-red-500/30'}`}>
                    {r.verdict || 'n/a'}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-300 mt-3">
              Status: <span className={`font-medium ${(() => {
                const allPassed = verifyModal.results.every(r => r.verdict === 'pass');
                return allPassed ? 'text-emerald-400' : 'text-amber-400';
              })()}`}>{verifyModal.status}</span>. 
              {(() => {
                const allPassed = verifyModal.results.every(r => r.verdict === 'pass');
                const somePassed = verifyModal.results.some(r => r.verdict === 'pass');
                
                if (allPassed) {
                  return 'All documents verified successfully! You can proceed to your dashboard.';
                } else if (somePassed) {
                  return 'Some documents passed verification. Our team will review the failed ones.';
                } else {
                  return 'Documents need review. Our team will contact you for corrections.';
                }
              })()}
            </div>
            
            {/* Action Instructions */}
            {(() => {
              const allPassed = verifyModal.results.every(r => r.verdict === 'pass');
              if (!allPassed) {
                return (
                  <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-3">
                    <div className="font-medium mb-1">Next Steps:</div>
                    <div>• Review the missing information highlighted above</div>
                    <div>• Update your documents with the required details</div>
                    <div>• Re-upload corrected documents for re-verification</div>
                    <div>• Our team will also manually review your submission</div>
                  </div>
                );
              }
              return null;
            })()}
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn-secondary" onClick={()=>setVerifyModal(null)}>Close</button>
              {(() => {
                const allPassed = verifyModal.results.every(r => r.verdict === 'pass');
                const someFailed = verifyModal.results.some(r => r.verdict !== 'pass');
                
                return (
                  <>
                    {allPassed ? (
                      <button className="btn-primary" onClick={async () => {
                        setVerifyModal(null);
                        // Now register the user since documents passed
                        try {
                          const payload = { 
                            ...form, 
                            location: { type: 'Point', coordinates: coords },
                            name: form.role === 'hospital' ? form.hospitalName : form.name
                          };
                          const res = await register(payload);
                          if (res.ok) {
                            navigate('/hospital');
                          } else {
                            setError(res.error);
                          }
                        } catch (e) {
                          setError('Registration failed after document verification');
                        }
                      }}>
                        Complete Registration & Go to Dashboard
                      </button>
                    ) : someFailed ? (
                      <button className="btn-secondary" onClick={() => {
                        setVerifyModal(null);
                        // Reset form to allow re-upload of documents
                        setLicenseFile(null);
                        setRegistrationProof(null);
                        setAuthorityLetter(null);
                        setAccreditationFile(null);
                        setError('Please re-upload corrected documents and try again.');
                      }}>
                        Re-upload Documents
                      </button>
                    ) : null}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}