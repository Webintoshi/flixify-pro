import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import Logo from './Logo'

function ProtectedRoute({ children }) {
  const { token, _hasHydrated } = useAuthStore()
  const location = useLocation()

  // Wait for Zustand persist to complete rehydration from localStorage
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] gap-4">
        <Logo size="large" to={null} />
        <span className="text-white/60">Yükleniyor...</span>
      </div>
    )
  }

  // After rehydration, check if user is authenticated
  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // User is authenticated, render protected content
  return children || <Outlet />
}

export default ProtectedRoute
