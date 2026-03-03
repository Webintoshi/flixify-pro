import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useEffect, useState } from 'react'
import Logo from './Logo'

function ProtectedRoute({ children }) {
  const { token, syncToken } = useAuthStore()
  const location = useLocation()
  const [isChecking, setIsChecking] = useState(true)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    // Check localStorage directly for token
    const checkAuth = () => {
      try {
        const stored = localStorage.getItem('iptv-auth-storage')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.state?.token) {
            setHasToken(true)
            syncToken() // Sync to API headers
          }
        }
      } catch (e) {
        console.error('Auth check error:', e)
      }
      setIsChecking(false)
    }

    checkAuth()
  }, [syncToken])

  // Show loading while checking localStorage
  if (isChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] gap-4">
        <Logo size="large" to={null} />
        <span className="text-white/60">Yükleniyor...</span>
      </div>
    )
  }

  // After checking, verify authentication
  if (!token && !hasToken) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // User is authenticated, render protected content
  return children || <Outlet />
}

export default ProtectedRoute
