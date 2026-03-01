import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAdminStore } from '../stores/adminStore'
import { ShieldAlert, Loader2 } from 'lucide-react'

function AdminRoute({ children }) {
  const location = useLocation()
  const { adminToken, _hasHydrated } = useAdminStore()

  // Wait for store hydration
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="w-10 h-10 text-[#E50914] animate-spin" />
        <span className="text-white/60 mt-4">Yükleniyor...</span>
      </div>
    )
  }

  // Not logged in - redirect to admin login
  if (!adminToken) {
    return <Navigate to="/admin/giris" replace state={{ from: location }} />
  }

  return children || <Outlet />
}

export default AdminRoute
