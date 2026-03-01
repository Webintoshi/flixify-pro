import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import Logo from './Logo'

function ProtectedRoute({ children }) {
  const { token, user } = useAuthStore()
  const location = useLocation()

  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // If we have token but no user data, we're still loading
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] gap-4">
        <Logo size="large" to={null} />
        <span className="text-white/60">Yükleniyor...</span>
      </div>
    )
  }

  return children || <Outlet />
}

export default ProtectedRoute
