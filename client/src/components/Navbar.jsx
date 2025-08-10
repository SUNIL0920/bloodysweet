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
    <nav className="sticky top-0 z-40">
      <div className="container-app">
        <div className="card-glass px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-red-600 grid place-items-center shadow-lg">
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
                <Link to="/hospital" className="btn-secondary"><Hospital className="h-4 w-4" /> Dashboard</Link>
                <button onClick={handleLogout} className="btn-primary"><LogOut className="h-4 w-4" /> Logout</button>
              </>
            )}
            {user && user.role === 'donor' && (
              <>
                <Link to="/donor" className="btn-secondary"><HeartHandshake className="h-4 w-4" /> Dashboard</Link>
                <button onClick={handleLogout} className="btn-primary"><LogOut className="h-4 w-4" /> Logout</button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 