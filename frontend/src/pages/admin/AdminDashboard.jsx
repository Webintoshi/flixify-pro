import { useEffect, useState } from 'react'
import { useAdminStore } from '../../stores/adminStore'
import { 
  Users, 
  Package, 
  CreditCard, 
  TrendingUp,
  Calendar,
  Clock,
  Activity
} from 'lucide-react'

const PRIMARY = '#E50914'
const BG_SURFACE = '#141414'
const BORDER = '#2a2a2a'

function AdminDashboard() {
  const { fetchDashboardStats } = useAdminStore()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await fetchDashboardStats()
      setStats(data)
    } catch (error) {
      console.error('Stats load error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mock data for demonstration
  const mockStats = {
    totalUsers: 1250,
    activeUsers: 980,
    expiredUsers: 270,
    totalPackages: 5,
    totalPayments: 456,
    pendingPayments: 23,
    todayRevenue: 12500,
    monthlyRevenue: 145000,
    recentUsers: [
      { id: 1, code: 'A1B2C3D4', package: 'Premium', expiry: '2024-12-31', status: 'active' },
      { id: 2, code: 'E5F6G7H8', package: 'Standart', expiry: '2024-11-15', status: 'active' },
      { id: 3, code: 'I9J0K1L2', package: 'Temel', expiry: '2024-10-01', status: 'expired' },
    ],
    recentPayments: [
      { id: 1, user: 'A1B2C3D4', amount: 150, method: 'Havale', status: 'pending', date: '2024-03-15' },
      { id: 2, user: 'E5F6G7H8', amount: 300, method: 'Kredi Kartı', status: 'approved', date: '2024-03-14' },
    ]
  }

  const displayStats = stats || mockStats

  const statCards = [
    { 
      title: 'Toplam Kullanıcı', 
      value: displayStats.totalUsers, 
      icon: Users, 
      color: '#3b82f6',
      subtitle: `${displayStats.activeUsers} Aktif`
    },
    { 
      title: 'Paket Sayısı', 
      value: displayStats.totalPackages, 
      icon: Package, 
      color: '#10b981',
      subtitle: 'Aktif Paketler'
    },
    { 
      title: 'Bekleyen Ödemeler', 
      value: displayStats.pendingPayments, 
      icon: CreditCard, 
      color: '#f59e0b',
      subtitle: 'Onay Bekliyor'
    },
    { 
      title: 'Aylık Gelir', 
      value: `₺${displayStats.monthlyRevenue.toLocaleString()}`, 
      icon: TrendingUp, 
      color: '#8b5cf6',
      subtitle: `Bugün: ₺${displayStats.todayRevenue.toLocaleString()}`
    },
  ]

  const getStatusBadge = (status) => {
    const styles = {
      active: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981', text: 'Aktif' },
      expired: { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', text: 'Süresi Dolmuş' },
      pending: { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', text: 'Bekliyor' },
      approved: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981', text: 'Onaylandı' },
    }
    const style = styles[status] || styles.pending
    return (
      <span 
        className="px-2 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: style.bg, color: style.color }}
      >
        {style.text}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">Sistem genel görünümü</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock className="w-4 h-4" />
          {new Date().toLocaleDateString('tr-TR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div 
              key={index}
              className="p-6 rounded-2xl"
              style={{ backgroundColor: BG_SURFACE, border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}20` }}
                >
                  <Icon className="w-6 h-6" style={{ color: stat.color }} />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
              <p className="text-gray-400 text-sm">{stat.title}</p>
              <p className="text-xs mt-2" style={{ color: stat.color }}>{stat.subtitle}</p>
            </div>
          )
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div 
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: BG_SURFACE, border: `1px solid ${BORDER}` }}
        >
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: PRIMARY }} />
              Son Eklenen Kullanıcılar
            </h2>
            <button className="text-sm text-gray-400 hover:text-white transition-colors">
              Tümünü Gör
            </button>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-500 text-sm">
                    <th className="pb-3 font-medium">Kod</th>
                    <th className="pb-3 font-medium">Paket</th>
                    <th className="pb-3 font-medium">Bitiş</th>
                    <th className="pb-3 font-medium">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {displayStats.recentUsers.map((user) => (
                    <tr key={user.id} className="border-t" style={{ borderColor: BORDER }}>
                      <td className="py-3 text-white font-mono">{user.code}</td>
                      <td className="py-3 text-gray-300">{user.package}</td>
                      <td className="py-3 text-gray-400 text-sm">{user.expiry}</td>
                      <td className="py-3">{getStatusBadge(user.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        <div 
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: BG_SURFACE, border: `1px solid ${BORDER}` }}
        >
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5" style={{ color: PRIMARY }} />
              Son Ödemeler
            </h2>
            <button className="text-sm text-gray-400 hover:text-white transition-colors">
              Tümünü Gör
            </button>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-500 text-sm">
                    <th className="pb-3 font-medium">Kullanıcı</th>
                    <th className="pb-3 font-medium">Tutar</th>
                    <th className="pb-3 font-medium">Yöntem</th>
                    <th className="pb-3 font-medium">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {displayStats.recentPayments.map((payment) => (
                    <tr key={payment.id} className="border-t" style={{ borderColor: BORDER }}>
                      <td className="py-3 text-white font-mono">{payment.user}</td>
                      <td className="py-3 text-white font-bold">₺{payment.amount}</td>
                      <td className="py-3 text-gray-400 text-sm">{payment.method}</td>
                      <td className="py-3">{getStatusBadge(payment.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Chart Placeholder */}
      <div 
        className="rounded-2xl p-6"
        style={{ backgroundColor: BG_SURFACE, border: `1px solid ${BORDER}` }}
      >
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" style={{ color: PRIMARY }} />
          Son 7 Günlük Aktivite
        </h2>
        <div className="h-64 flex items-end justify-between gap-2">
          {[40, 65, 45, 80, 55, 90, 70].map((height, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div 
                className="w-full rounded-t-lg transition-all hover:opacity-80"
                style={{ 
                  height: `${height}%`, 
                  backgroundColor: PRIMARY,
                  opacity: 0.8
                }}
              />
              <span className="text-xs text-gray-500">
                {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'][index]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
