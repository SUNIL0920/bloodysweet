import { Link } from 'react-router-dom'
import { HeartPulse, MapPin, ShieldCheck, Waves, Sparkles } from 'lucide-react'

export default function HomePage() {
  return (
    <div>
      <div className="container-app">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 text-xs text-white/80 bg-white/10 rounded-full px-3 py-1">
              <Sparkles className="h-3.5 w-3.5" /> Real-time alerts. Community powered.
            </div>
            <h1 className="section-title">Mobilize donors in minutes, not hours</h1>
            <p className="text-gray-200/90 leading-relaxed">
              Hospitals broadcast urgent requests. Donors nearby get notified instantly. Seamless, secure, and built to save lives.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/register" className="btn-primary text-base px-5 py-2.5">Get Started</Link>
              <Link to="/login" className="btn-secondary text-base px-5 py-2.5">Sign In</Link>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="card-glass p-3 text-center">
                <HeartPulse className="h-6 w-6 mx-auto text-red-400" />
                <div className="text-xs mt-1 text-gray-200">Blood Types</div>
                <div className="text-sm font-semibold">All supported</div>
              </div>
              <div className="card-glass p-3 text-center">
                <MapPin className="h-6 w-6 mx-auto text-indigo-300" />
                <div className="text-xs mt-1 text-gray-200">Proximity</div>
                <div className="text-sm font-semibold">50 km radius</div>
              </div>
              <div className="card-glass p-3 text-center">
                <ShieldCheck className="h-6 w-6 mx-auto text-emerald-300" />
                <div className="text-xs mt-1 text-gray-200">Security</div>
                <div className="text-sm font-semibold">JWT protected</div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-red-500/20 blur-3xl rounded-full" />
            <div className="card-glass p-6 relative">
              <div className="text-sm text-gray-200 mb-2">Live Activity</div>
              <div className="grid gap-3">
                {[
                  { title: 'O+ needed at City Hospital', time: '2m ago' },
                  { title: 'AB- urgent at Metro Care', time: '8m ago' },
                  { title: 'A+ required at LifeLine', time: '12m ago' },
                ].map((x, i) => (
                  <div key={i} className="card-glass p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Waves className="h-5 w-5 text-red-300" />
                      <div>
                        <div className="font-medium text-white">{x.title}</div>
                        <div className="text-xs text-gray-300">within 50km</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-300">{x.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 