import { useState, useEffect } from 'react'
import { useAuth } from '../state/AuthContext.jsx'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../state/ToastContext.jsx'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const { api } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const toast = useToast()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      toast.error('Invalid reset link')
      navigate('/login')
    }
  }, [token, navigate, toast])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    try {
      await api.post('/api/auth/reset-password', {
        token,
        newPassword: password
      })
      setSuccess(true)
      toast.success('Password reset successfully!')
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen" style={{ backgroundImage: 'url(/images/auth-blood-bg.jpg)', backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
        <div className="container-app">
          <div className="max-w-md mx-auto card-glass p-6 text-center">
            <div className="bg-green-500/20 p-4 rounded-lg mb-4">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-2" />
              <h2 className="text-green-300 font-semibold mb-2">Password Reset Successful!</h2>
              <p className="text-green-200 text-sm">
                Your password has been updated successfully.
              </p>
            </div>
            
            <button 
              onClick={() => navigate('/login')}
              className="btn-primary w-full justify-center"
            >
              Continue to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundImage: 'url(/images/auth-blood-bg.jpg)', backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      <div className="container-app">
        <div className="max-w-md mx-auto card-glass p-6">
          <div className="text-sm text-gray-300">Reset Password</div>
          <h2 className="section-title mt-1 text-glow">Set New Password</h2>
          <div className="section-subtitle">Enter your new password below</div>
          
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-white/60" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="input-field pl-9 pr-10" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  minLength="6"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-white/60 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="label">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-white/60" />
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  className="input-field pl-9 pr-10" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                  minLength="6"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-white/60 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button 
              disabled={loading || !password || !confirmPassword} 
              className="btn-primary w-full justify-center text-base py-2.5"
            >
              <Lock className="h-4 w-4" /> 
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
          
          <div className="text-sm text-gray-300 mt-4 text-center">
            <button 
              onClick={() => navigate('/login')}
              className="text-blue-300 hover:text-blue-200 underline"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


