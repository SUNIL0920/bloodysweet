import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import HomePage from './pages/HomePage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import HospitalDashboard from './pages/HospitalDashboard.jsx'
import DonorDashboard from './pages/DonorDashboard.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute role="hospital" />}> 
            <Route path="/hospital" element={<HospitalDashboard />} />
          </Route>

          <Route element={<ProtectedRoute role="donor" />}> 
            <Route path="/donor" element={<DonorDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
