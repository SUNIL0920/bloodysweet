import { useState } from 'react'
import { useAuth } from '../state/AuthContext.jsx'
import { useToast } from '../state/ToastContext.jsx'
import { AtSign, Mail, X, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordModal({ open, onClose }) {
  const { api } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      setSent(true)
      toast.success('Password reset instructions sent to your email!')
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setSent(false)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card-glass p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Reset Password</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!sent ? (
          <>
            <p className="text-gray-300 text-sm mb-4">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input 
                    type="email" 
                    className="input-field pl-10" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={handleClose} 
                  className="btn-secondary flex-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </button>
                <button 
                  type="submit" 
                  disabled={loading || !email} 
                  className="btn-primary flex-1 justify-center"
                >
                  <Mail className="h-4 w-4" />
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="bg-green-500/20 p-4 rounded-lg mb-4">
              <Mail className="h-12 w-12 text-green-400 mx-auto mb-2" />
              <h4 className="text-green-300 font-semibold mb-2">Check Your Email</h4>
              <p className="text-green-200 text-sm">
                We've sent password reset instructions to <strong>{email}</strong>
              </p>
            </div>
            
            <div className="text-xs text-gray-400 mb-4">
              <p>• Check your spam folder if you don't see the email</p>
              <p>• The reset link will expire in 1 hour</p>
            </div>

            <button 
              onClick={handleClose} 
              className="btn-primary w-full justify-center"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


