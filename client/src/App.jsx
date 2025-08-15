import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import HomePage from './pages/HomePage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import HospitalDashboard from './pages/HospitalDashboard.jsx'
import DonorDashboard from './pages/DonorDashboard.jsx'
import DonorProfile from './pages/DonorProfile.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container-app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<ProtectedRoute role="hospital" />}> 
            <Route path="/hospital" element={<HospitalDashboard />} />
          </Route>

          <Route element={<ProtectedRoute role="donor" />}> 
            <Route path="/donor" element={<DonorDashboard />} />
            <Route path="/donor/profile" element={<DonorProfile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
