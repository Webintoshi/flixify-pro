import { useEffect, useState } from 'react'
import { useAdminStore } from '../../stores/adminStore'
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar,
  Package,
  ExternalLink,
  CheckCircle,
  X,
  Save,
  Loader2
} from 'lucide-react'

const PRIMARY = '#E50914'
const BG_SURFACE = '#141414'
const BORDER = '#2a2a2a'

function AdminUsers() {
  const { 
    fetchUsers, 
    fetchPackages,
    updateUserPackage, 
    extendUserExpiry, 
    updateUserM3U 
  } = useAdminStore()

  const [users, setUsers] = useState([])
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('view') // view, edit, m3u, extend
  const [formData, setFormData] = useState({
    packageId: '',
    expiryDate: '',
    m3uUrl: '',
    extendDays: 30
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [usersData, packagesData] = await Promise.all([
        fetchUsers(),
        fetchPackages()
      ])
      // API returns { status: 'success', data: { users: [...] } }
      const users = usersData.data?.users || usersData.users || []
      const packages = packagesData.data?.packages || packagesData.packages || []
      setUsers(users)
      setPackages(packages)
    } catch (error) {
      console.error('Data load error:', error)
      setUsers([])
      setPackages([])
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => 
    user.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleEdit = (user) => {
    setSelectedUser(user)
    setFormData({
      packageId: user.packageId || '',
      expiryDate: user.expiry || '',
      m3uUrl: user.m3uUrl || '',
      extendDays: 30
    })
    setModalMode('edit')
    setShowModal(true)
  }

  const handleM3U = (user) => {
    setSelectedUser(user)
    setFormData({ ...formData, m3uUrl: user.m3uUrl || '' })
    setModalMode('m3u')
    setShowModal(true)
  }

  const handleExtend = (user) => {
    setSelectedUser(user)
    setFormData({ ...formData, extendDays: 30 })
    setModalMode('extend')
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (modalMode === 'edit') {
        await updateUserPackage(selectedUser.code, {
          packageId: formData.packageId,
          expiryDate: formData.expiryDate
        })
      } else if (modalMode === 'm3u') {
        await updateUserM3U(selectedUser.code, formData.m3uUrl)
      } else if (modalMode === 'extend') {
        await extendUserExpiry(selectedUser.code, formData.extendDays)
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
          <p className="text-gray-400">Kullanıcıları yönetin ve paket atamaları yapın</p>
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
                <th className="p-4 font-medium">Paket</th>
                <th className="p-4 font-medium">Bitiş Tarihi</th>
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
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-lg text-sm" style={{ backgroundColor: 'rgba(229,9,20,0.2)', color: PRIMARY }}>
                      {user.package || 'N/A'}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300">
                    {user.expiresAt ? new Date(user.expiresAt).toLocaleDateString('tr-TR') : '-'}
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
                        onClick={() => handleExtend(user)}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Süre Uzat"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit(user)}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Düzenle"
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
                {modalMode === 'edit' && 'Kullanıcı Düzenle'}
                {modalMode === 'm3u' && 'M3U Link Tanımla'}
                {modalMode === 'extend' && 'Süre Uzat'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-400 text-sm">Kullanıcı</p>
              <code className="text-white font-mono">{selectedUser?.code}</code>
            </div>

            {modalMode === 'edit' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Paket</label>
                  <select
                    value={formData.packageId}
                    onChange={(e) => setFormData({ ...formData, packageId: e.target.value })}
                    className="w-full p-3 rounded-xl text-white focus:outline-none"
                    style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                  >
                    <option value="">Paket Seçin</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>{pkg.name} - ₺{pkg.price}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full p-3 rounded-xl text-white focus:outline-none"
                    style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                  />
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

            {modalMode === 'extend' && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">Eklenecek Gün</label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={formData.extendDays}
                    onChange={(e) => setFormData({ ...formData, extendDays: parseInt(e.target.value) })}
                    min="1"
                    max="365"
                    className="flex-1 p-3 rounded-xl text-white focus:outline-none"
                    style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                  />
                  <span className="text-gray-400">gün</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Yeni bitiş tarihi: {selectedUser?.expiry}
                </p>
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
