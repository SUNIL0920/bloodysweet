import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'

export default function ProtectedRoute({ role }) {
  const { user, token } = useAuth()
  const location = useLocation()

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
} 