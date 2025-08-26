import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'
import { Droplets, LogOut, Hospital, ShieldPlus, HeartHandshake } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <>
    <nav className="fixed top-0 left-0 right-0 z-40">
      <div className="container-app">
        <div className="card-glass px-6 py-4 flex items-center justify-between" style={{backdropFilter:'saturate(1.2) blur(12px)'}}>
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 grid place-items-center shadow-lg shadow-red-900/30">
              <Droplets className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-white font-semibold leading-none">Blood Alert</div>
              <div className="text-[10px] text-gray-300 -mt-0.5">Save time, save lives</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {!user && (
              <>
                <Link to="/login" className="btn-secondary">Login</Link>
                <Link to="/register" className="btn-primary">Get Started</Link>
              </>
            )}
            {user && user.role === 'hospital' && (
              <>
                <Link to="/hospital" className="btn-secondary glass-hover"><Hospital className="h-4 w-4" /> Dashboard</Link>
                <button onClick={handleLogout} className="btn-primary"><LogOut className="h-4 w-4" /> Logout</button>
              </>
            )}
            {user && user.role === 'donor' && (
              <>
                <Link to="/donor" className="btn-secondary glass-hover"><HeartHandshake className="h-4 w-4" /> Dashboard</Link>
                <Link to="/donor/profile" className="btn-secondary glass-hover"><ShieldPlus className="h-4 w-4" /> Profile</Link>
                <button onClick={handleLogout} className="btn-primary"><LogOut className="h-4 w-4" /> Logout</button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
    {/* spacer to offset fixed navbar height */}
    <div className="h-20" />
    </>
  )
} 