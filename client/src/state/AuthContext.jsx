import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'

const AuthContext = createContext(null)

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
});

// Debug: Log the actual API URL being used
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL)
console.log('Final API baseURL:', 'http://localhost:5000')

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(false)
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      ;(async () => {
        try {
          const { data } = await api.get('/api/auth/me')
          setUser(data.user)
          try { localStorage.setItem('userId', data.user?._id || '') } catch {}
        } catch {
          setUser(null)
          setToken(null)
          localStorage.removeItem('token')
        }
      })()

      // init socket
      const s = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', { transports: ['websocket'] })
      setSocket(s)
      // join private room after connect
      s.on('connect', () => {
        try {
          const uid = localStorage.getItem('userId')
          if (uid) s.emit('auth', uid)
        } catch {}
      })
      return () => { s.disconnect() }
    }
  }, [token])

  // If user state becomes available later, ensure socket joins the room
  useEffect(() => {
    if (socket && user?._id) {
      try { socket.emit('auth', user._id) } catch {}
    }
  }, [socket, user?._id])

  const login = async (email, password) => {
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/login', { email, password })
      // clear any previous donor arrival codes from other sessions
      try { Object.keys(localStorage).forEach(k => { if (k.startsWith('activeArrivalCode:')) localStorage.removeItem(k) }) } catch {}
      setToken(data.token)
      localStorage.setItem('token', data.token)
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
      setUser(data.user)
      try { localStorage.setItem('userId', data.user?._id || '') } catch {}
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e?.response?.data?.message || 'Login failed' }
    } finally {
      setLoading(false)
    }
  }

  const register = async (payload) => {
    setLoading(true)
    try {
      console.log('Sending registration request to:', '/api/auth/register')
      const { data } = await api.post('/api/auth/register', payload)
      try { Object.keys(localStorage).forEach(k => { if (k.startsWith('activeArrivalCode:')) localStorage.removeItem(k) }) } catch {}
      setToken(data.token)
      localStorage.setItem('token', data.token)
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
      setUser(data.user)
      try { localStorage.setItem('userId', data.user?._id || '') } catch {}
      return { ok: true }
    } catch (e) {
      console.error('Registration error:', e)
      console.error('Error response:', e?.response?.data)
      return { ok: false, error: e?.response?.data?.message || 'Registration failed' }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    try { Object.keys(localStorage).forEach(k => { if (k.startsWith('activeArrivalCode:')) localStorage.removeItem(k) }) } catch {}
    delete api.defaults.headers.common['Authorization']
    if (socket) socket.disconnect()
  }

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/api/auth/me')
      setUser(data.user)
    } catch {}
  }

  const value = useMemo(() => ({ user, token, loading, login, logout, register, api, socket, refreshUser, setUser }), [user, token, loading, socket])

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext) 