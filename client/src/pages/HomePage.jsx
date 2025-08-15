import { Link } from 'react-router-dom'
import { HeartPulse, MapPin, ShieldCheck, Waves, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../state/AuthContext.jsx'

export default function HomePage() {
  const { user, api } = useAuth()
  const [active, setActive] = useState([])
  const [geo, setGeo] = useState(null)

  useEffect(() => {
    ;(async () => { try { const { data } = await api.get('/api/requests/active'); setActive((data||[]).slice(0,5)) } catch { setActive([]) } })()
    if ('geolocation' in navigator) { navigator.geolocation.getCurrentPosition((pos)=>{ setGeo([pos.coords.longitude, pos.coords.latitude]) }) }
  }, [])

  const rel = (iso) => { if(!iso) return ''; const mins=Math.max(0,Math.round((Date.now()-new Date(iso).getTime())/60000)); if(mins<1) return 'just now'; if(mins<60) return `${mins}m ago`; return `${Math.round(mins/60)}h ago` }
  const distKm = (r) => { try{ if(!geo||!r?.location?.coordinates) return null; const [a,b]=geo; const [c,d]=r.location.coordinates; const R=6371; const t=(v)=>v*Math.PI/180; const dLat=t(d-b), dLng=t(c-a); const A=Math.sin(dLat/2)**2+Math.cos(t(b))*Math.cos(t(d))*Math.sin(dLng/2)**2; return R*2*Math.atan2(Math.sqrt(A),Math.sqrt(1-A)); }catch{return null} }
  const primaryCtaHref = user ? (user.role==='hospital'?'/hospital':'/donor') : '/register'

  return (
    <div className="flex-1">
      <div className="container-app flex-1">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-5">
            <div className="bg-black/30 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-2xl space-y-4">
              <div className="inline-flex items-center gap-2 text-xs text-white/90 bg-white/10 rounded-full px-3 py-1 w-max">
                <Sparkles className="h-3.5 w-3.5" /> Real-time alerts. Community powered.
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white text-glow">Mobilize donors in minutes, not hours</h1>
              <p className="text-white/95 leading-relaxed">Hospitals post a need. Nearby compatible donors get alerted and can pledge in one tap. Fast, secure, and community driven.</p>
              <p className="text-white/90 text-sm">{user ? `Welcome back, ${user.name}. Head to your dashboard to continue.` : 'Create an account to post urgent requests or receive alerts when your blood type is needed.'}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Link to={primaryCtaHref} className="btn-primary text-base px-5 py-2.5">{user ? 'Go to Dashboard' : 'Get Started'}</Link>
                {!user && <Link to="/login" className="btn-secondary text-base px-5 py-2.5">Sign In</Link>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="card-glass p-3 text-center glass-hover">
                <HeartPulse className="h-6 w-6 mx-auto text-red-400" />
                <div className="text-xs mt-1 text-gray-100">Blood Types</div>
                <div className="text-sm font-semibold">All supported</div>
              </div>
              <div className="card-glass p-3 text-center glass-hover">
                <MapPin className="h-6 w-6 mx-auto text-indigo-300" />
                <div className="text-xs mt-1 text-gray-100">Proximity</div>
                <div className="text-sm font-semibold">50 km radius</div>
              </div>
              <div className="card-glass p-3 text-center glass-hover">
                <ShieldCheck className="h-6 w-6 mx-auto text-emerald-300" />
                <div className="text-xs mt-1 text-gray-100">Security</div>
                <div className="text-sm font-semibold">JWT protected</div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-red-500/20 blur-3xl rounded-full" />
            <div className="card-glass p-6 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-100">Live Activity</div>
                <Link to={primaryCtaHref} className="text-xs text-red-300 hover:text-red-200 underline">View all</Link>
              </div>
              <div className="grid gap-3">
                {active.map(r => {
                  const km = distKm(r); const subtitle = km!=null?`~${km.toFixed(1)} km`:'within 50km'
                  return (
                    <div key={r._id} className="card-glass p-3 flex items-center justify-between glass-hover">
                      <div className="flex items-center gap-3">
                        <Waves className="h-5 w-5 text-red-300" />
                        <div>
                          <div className="font-medium text-white">{r.bloodType} needed at {r.hospital?.name || 'Hospital'}</div>
                          <div className="text-xs text-gray-200">{subtitle}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-200">{rel(r.createdAt)}</div>
                    </div>
                  )
                })}
                {active.length === 0 && <div className="text-xs text-gray-300">No live activity right now.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 