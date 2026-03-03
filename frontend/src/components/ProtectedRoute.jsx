import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useEffect, useState } from 'react'
import Logo from './Logo'

function ProtectedRoute({ children }) {
  const { token, user } = useAuthStore()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Short delay to allow persist middleware to hydrate from localStorage
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  // Show loading briefly while checking localStorage
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] gap-4">
        <Logo size="large" to={null} />
        <span className="text-white/60">Yükleniyor...</span>
      </div>
    )
  }

  // After loading, check auth
  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // We have token, render children (user data is now persisted in localStorage)
  return children || <Outlet />
}

export default ProtectedRoute
