import { useState } from 'react'
import { useAuth } from '../state/AuthContext.jsx'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { AtSign, Lock, LogIn } from 'lucide-react'
import ForgotPasswordModal from '../components/ForgotPasswordModal.jsx'

export default function LoginPage() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const res = await login(email, password)
    if (res.ok) navigate(from === '/' ? '/donor' : from)
    else setError(res.error)
  }

  return (
    <div className="min-h-screen" style={{ backgroundImage: 'url(/images/auth-blood-bg.jpg)', backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      <div className="container-app">
        <div className="max-w-md mx-auto card-glass p-6">
        <div className="text-sm text-gray-300">Welcome back</div>
        <h2 className="section-title mt-1 text-glow">Sign in</h2>
        <div className="section-subtitle">Access your dashboard</div>
        {error && <div className="text-sm text-red-300 mt-2">{error}</div>}
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <AtSign className="absolute left-3 top-2.5 h-4 w-4 text-white/60" />
              <input type="email" className="input-field pl-9" value={email} onChange={(e)=>setEmail(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-white/60" />
              <input type="password" className="input-field pl-9" value={password} onChange={(e)=>setPassword(e.target.value)} required />
            </div>
          </div>
          <button disabled={loading} className="btn-primary w-full justify-center text-base py-2.5"><LogIn className="h-4 w-4" /> {loading ? 'Please wait…' : 'Sign In'}</button>
        </form>
        <div className="text-sm text-gray-300 mt-4 text-center space-y-2">
          <div>
            <button 
              onClick={() => setShowForgotPassword(true)}
              className="text-blue-300 hover:text-blue-200 underline"
            >
              Forgot your password?
            </button>
          </div>
          <div>
            No account? <Link to="/register" className="text-white underline">Create one</Link>
          </div>
        </div>
        </div>
      </div>

      <ForgotPasswordModal 
        open={showForgotPassword} 
        onClose={() => setShowForgotPassword(false)} 
      />
    </div>
  )
} 