import { useEffect, useState } from 'react'
import { useAdminStore } from '../../stores/adminStore'
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2,
  Calendar,
  Clock,
  CheckCircle,
  X,
  Save,
  Loader2
} from 'lucide-react'

const PRIMARY = '#E50914'
const BG_SURFACE = '#141414'
const BORDER = '#2a2a2a'

// Kullanım süresi seçenekleri (gün bazlı)
const DURATION_OPTIONS = [
  { value: 30, label: '30 Gün', description: '1 Aylık kullanım', color: '#3b82f6' },
  { value: 90, label: '90 Gün', description: '3 Aylık kullanım', color: '#8b5cf6', popular: true },
  { value: 180, label: '180 Gün', description: '6 Aylık kullanım', color: '#f59e0b' },
  { value: 365, label: '365 Gün', description: '1 Yıllık kullanım', color: '#10b981', best: true }
]

function AdminUsers() {
  const { 
    fetchUsers, 
    updateUserExpiry, 
    updateUserM3U 
  } = useAdminStore()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('view') // expiry, m3u
  const [formData, setFormData] = useState({
    durationDays: 30,
    m3uUrl: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const usersData = await fetchUsers()
      const users = usersData.data?.users || usersData.users || []
      setUsers(users)
    } catch (error) {
      console.error('Data load error:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => 
    user.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Yeni bitiş tarihini hesapla
  const calculateNewExpiry = (days) => {
    const today = new Date()
    const expiryDate = new Date(today)
    expiryDate.setDate(today.getDate() + parseInt(days))
    return expiryDate.toLocaleDateString('tr-TR')
  }

  // Kalan gün sayısını hesapla
  const getRemainingDays = (expiresAt) => {
    if (!expiresAt) return { days: 0, status: 'expired', color: '#ef4444' }
    
    const expiry = new Date(expiresAt)
    const today = new Date()
    const diffTime = expiry - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return { days: 0, status: 'expired', color: '#ef4444', text: 'Süresi Doldu' }
    } else if (diffDays <= 7) {
      return { days: diffDays, status: 'critical', color: '#ef4444', text: `${diffDays} gün kaldı` }
    } else if (diffDays <= 30) {
      return { days: diffDays, status: 'warning', color: '#f59e0b', text: `${diffDays} gün kaldı` }
    } else {
      return { days: diffDays, status: 'active', color: '#10b981', text: `${diffDays} gün kaldı` }
    }
  }

  const handleSetExpiry = (user) => {
    setSelectedUser(user)
    setFormData({ ...formData, durationDays: 30 })
    setModalMode('expiry')
    setShowModal(true)
  }

  const handleM3U = (user) => {
    setSelectedUser(user)
    setFormData({ ...formData, m3uUrl: user.m3uUrl || '' })
    setModalMode('m3u')
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (modalMode === 'expiry') {
        // Bugünden itibaren seçilen gün kadar ekle
        await updateUserExpiry(selectedUser.code, formData.durationDays)
      } else if (modalMode === 'm3u') {
        await updateUserM3U(selectedUser.code, formData.m3uUrl)
      }
      await loadData()
      setShowModal(false)
    } catch (error) {
      console.error('Save error:', error)
      alert('İşlem başarısız: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      active: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981', text: 'Aktif' },
      expired: { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', text: 'Süresi Dolmuş' },
      suspended: { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', text: 'Askıya Alındı' },
    }
    const style = styles[status] || styles.expired
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6" style={{ color: PRIMARY }} />
            Kullanıcı Yönetimi
          </h1>
          <p className="text-gray-400">Kullanıcıları yönetin ve erişim sürelerini tanımlayın</p>
        </div>
        <button 
          className="px-4 py-2 rounded-xl font-medium text-white flex items-center gap-2"
          style={{ backgroundColor: PRIMARY }}
        >
          <Plus className="w-5 h-5" />
          Yeni Kullanıcı
        </button>
      </div>

      {/* Search */}
      <div 
        className="p-4 rounded-2xl"
        style={{ backgroundColor: BG_SURFACE, border: `1px solid ${BORDER}` }}
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Kullanıcı kodu veya e-posta ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
          />
        </div>
      </div>

      {/* Users Table */}
      <div 
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: BG_SURFACE, border: `1px solid ${BORDER}` }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b" style={{ borderColor: BORDER }}>
                <th className="p-4 font-medium">Kullanıcı Kodu</th>
                <th className="p-4 font-medium">Notlar</th>
                <th className="p-4 font-medium">Bitiş Tarihi</th>
                <th className="p-4 font-medium">Kalan Süre</th>
                <th className="p-4 font-medium">Durum</th>
                <th className="p-4 font-medium">M3U</th>
                <th className="p-4 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: BORDER }}>
                  <td className="p-4">
                    <code className="text-white font-mono text-sm">{user.code}</code>
                  </td>
                  <td className="p-4 text-gray-300">{user.adminNotes || '-'}</td>
                  <td className="p-4 text-gray-300">
                    {user.expiresAt ? new Date(user.expiresAt).toLocaleDateString('tr-TR') : '-'}
                  </td>
                  <td className="p-4">
                    {user.expiresAt ? (
                      (() => {
                        const remaining = getRemainingDays(user.expiresAt)
                        return (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: remaining.color }}
                            />
                            <span className="text-sm font-medium" style={{ color: remaining.color }}>
                              {remaining.text}
                            </span>
                          </div>
                        )
                      })()
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="p-4">{getStatusBadge(user.status)}</td>
                  <td className="p-4">
                    {user.m3uUrl ? (
                      <button 
                        onClick={() => handleM3U(user)}
                        className="text-green-500 hover:text-green-400 flex items-center gap-1 text-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Tanımlı
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleM3U(user)}
                        className="text-gray-500 hover:text-white text-sm"
                      >
                        Tanımla
                      </button>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleSetExpiry(user)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                        style={{ 
                          backgroundColor: user.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(229,9,20,0.2)',
                          color: user.status === 'active' ? '#10b981' : PRIMARY
                        }}
                        title="Erişim Süresi Tanımla"
                      >
                        <Clock className="w-4 h-4" />
                        {user.status === 'active' ? 'Uzat' : 'Tanımla'}
                      </button>
                      <button 
                        onClick={() => handleM3U(user)}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="M3U Düzenle"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-500 transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Kullanıcı bulunamadı
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div 
            className="w-full max-w-md rounded-2xl p-6"
            style={{ backgroundColor: BG_SURFACE, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {modalMode === 'expiry' && 'Erişim Süresi Tanımla'}
                {modalMode === 'm3u' && 'M3U Link Tanımla'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#1a1a1a' }}>
              <p className="text-gray-400 text-sm mb-1">Kullanıcı</p>
              <code className="text-white font-mono text-lg">{selectedUser?.code}</code>
              {selectedUser?.expiresAt && (
                <p className="text-sm mt-2" style={{ color: '#f59e0b' }}>
                  Mevcut bitiş: {new Date(selectedUser.expiresAt).toLocaleDateString('tr-TR')}
                </p>
              )}
            </div>

            {modalMode === 'expiry' && (
              <div className="space-y-4">
                <label className="block text-sm text-gray-400 mb-3">Kullanım Süresi Seçin</label>
                <div className="grid grid-cols-2 gap-3">
                  {DURATION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setFormData({ ...formData, durationDays: option.value })}
                      className="relative p-4 rounded-xl text-left transition-all"
                      style={{
                        backgroundColor: formData.durationDays === option.value ? `${option.color}20` : '#1a1a1a',
                        border: `2px solid ${formData.durationDays === option.value ? option.color : '#2a2a2a'}`,
                      }}
                    >
                      {/* Badge */}
                      {(option.popular || option.best) && (
                        <span 
                          className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ 
                            backgroundColor: option.best ? PRIMARY : option.color,
                            color: '#fff'
                          }}
                        >
                          {option.best ? '🔥 En İyi' : '⭐ Popüler'}
                        </span>
                      )}
                      
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4" style={{ color: option.color }} />
                        <span className="text-white font-bold">{option.label}</span>
                      </div>
                      <p className="text-xs" style={{ color: '#6b7280' }}>{option.description}</p>
                    </button>
                  ))}
                </div>

                {/* Özet */}
                <div 
                  className="mt-4 p-4 rounded-xl"
                  style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Yeni Bitiş Tarihi:</span>
                    <span className="text-white font-bold">
                      {calculateNewExpiry(formData.durationDays)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Bugünden itibaren {formData.durationDays} gün eklenecek
                  </p>
                </div>
              </div>
            )}

            {modalMode === 'm3u' && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">M3U Playlist URL</label>
                <input
                  type="url"
                  value={formData.m3uUrl}
                  onChange={(e) => setFormData({ ...formData, m3uUrl: e.target.value })}
                  placeholder="http://example.com/playlist.m3u"
                  className="w-full p-3 rounded-xl text-white focus:outline-none"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                />
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl font-medium text-white hover:bg-white/5 transition-colors"
                style={{ backgroundColor: '#2a2a2a' }}
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: PRIMARY }}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsers
