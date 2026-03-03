import { Navigate, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useEffect, useState } from 'react'
import Logo from './Logo'

function ProtectedRoute({ children }) {
  const { token, user, fetchUser, _hasHydrated } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Wait for store hydration
    if (!_hasHydrated) return

    const loadUser = async () => {
      if (token && !user) {
        // We have token but no user, try to fetch user
        try {
          await fetchUser()
        } catch (error) {
          console.error('Failed to fetch user:', error)
        }
      }
      setIsLoading(false)
    }

    loadUser()
  }, [_hasHydrated, token, user, fetchUser])

  // Show loading while hydrating or fetching user
  if (!_hasHydrated || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] gap-4">
        <Logo size="large" to={null} />
        <span className="text-white/60">Yükleniyor...</span>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return children || <Outlet />
}

export default ProtectedRoute
