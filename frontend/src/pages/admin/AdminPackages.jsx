import { useEffect, useState } from 'react'
import { useAdminStore } from '../../stores/adminStore'
import { 
  Package, 
  Plus, 
  Edit2, 
  Trash2, 
  Clock,
  CheckCircle2,
  X,
  Save,
  Loader2,
  Sparkles,
  Zap,
  Crown,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Calendar
} from 'lucide-react'

const PRIMARY = '#E50914'
const BG_SURFACE = '#141414'
const BORDER = '#2a2a2a'

// Paket ikonları
const PACKAGE_ICONS = {
  1: Calendar,
  3: TrendingUp,
  6: Zap,
  12: Crown
}

// Paket renkleri
const PACKAGE_COLORS = {
  1: { bg: '#1a1a2e', accent: '#3b82f6', gradient: 'from-blue-600/20 to-blue-900/10' },
  3: { bg: '#1a2e1a', accent: '#10b981', gradient: 'from-emerald-600/20 to-emerald-900/10' },
  6: { bg: '#2e1a1a', accent: '#E50914', gradient: 'from-red-600/20 to-red-900/10' },
  12: { bg: '#2e2a1a', accent: '#f59e0b', gradient: 'from-amber-600/20 to-amber-900/10' }
}

function AdminPackages() {
  const { 
    adminToken,
    fetchPackages,
    createPackage,
    updatePackage,
    deletePackage
  } = useAdminStore()
  
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 100,
    duration: 1,
    features: [],
    badge: '',
    isPopular: false,
    isActive: true
  })
  const [saving, setSaving] = useState(false)
  const [featureInput, setFeatureInput] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  // Load packages from API
  useEffect(() => {
    loadPackages()
  }, [])

  // Veritabanı verisini frontend formatına çevir
  const normalizePackage = (pkg) => {
    const durationDays = pkg.duration_days || pkg.duration || 30
    const duration = Math.ceil(durationDays / 30)
    const description = pkg.description || ''
    const isPopular = description.toLowerCase().includes('popüler') || 
                      description.toLowerCase().includes('en iyi') ||
                      pkg.isPopular === true
    
    let features = pkg.features || []
    if (!features.length && description) {
      const lines = description.split(/[-,]/).map(s => s.trim()).filter(s => s)
      if (lines.length > 1) {
        features = lines.slice(0, 4)
      } else {
        features = [`${durationDays} gün erişim`, 'HD Kalite', '7/24 Destek', 'Tek Cihaz']
      }
    }
    
    let badge = pkg.badge || ''
    if (!badge) {
      if (description.includes('%')) {
        const match = description.match(/%\d+/)
        if (match) badge = match[0] + ' İndirim'
      } else if (isPopular) {
        badge = 'Popüler'
      }
    }
    
    return {
      id: pkg.id,
      name: pkg.name,
      description: description,
      price: parseFloat(pkg.price) || 0,
      duration: duration,
      duration_days: durationDays,
      features: features,
      badge: badge,
      isPopular: isPopular,
      isActive: pkg.isActive !== false,
      created_at: pkg.created_at,
      updated_at: pkg.updated_at
    }
  }

  const loadPackages = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await fetchPackages()
      const rawPackages = result.data?.packages || result.packages || result.data || []
      const normalizedPackages = rawPackages.map(normalizePackage)
      
      setPackages(normalizedPackages)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Load packages error:', err)
      setError(err.message || 'Paketler yüklenemedi')
      setPackages([])
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (pkg) => {
    setEditingPackage(pkg)
    setFormData({
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      duration: pkg.duration || Math.ceil((pkg.duration_days || 30) / 30),
      features: [...(pkg.features || [])],
      badge: pkg.badge || '',
      isPopular: pkg.isPopular || false,
      isActive: pkg.isActive !== false
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingPackage) {
        await updatePackage(editingPackage.id, formData)
      } else {
        await createPackage(formData)
      }
      
      await loadPackages()
      setShowModal(false)
    } catch (err) {
      console.error('Save error:', err)
      alert('Kaydetme başarısız: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (pkg) => {
    if (!confirm(`"${pkg.name}" paketini silmek istediğinize emin misiniz?`)) return
    
    try {
      await deletePackage(pkg.id)
      await loadPackages()
    } catch (err) {
      console.error('Delete error:', err)
      alert('Silme başarısız: ' + err.message)
    }
  }

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({ 
        ...formData, 
        features: [...formData.features, featureInput.trim()] 
      })
      setFeatureInput('')
    }
  }

  const removeFeature = (index) => {
    setFormData({ 
      ...formData, 
      features: formData.features.filter((_, i) => i !== index) 
    })
  }

  // Rozet renk belirle
  const getBadgeStyle = (badge, isPopular) => {
    if (isPopular || badge?.includes('Popüler')) {
      return { bg: PRIMARY, text: 'Popüler', icon: Sparkles }
    }
    if (badge?.includes('En İyi')) {
      return { bg: '#f59e0b', text: badge, icon: Crown }
    }
    if (badge?.includes('%')) {
      return { bg: '#10b981', text: badge, icon: TrendingUp }
    }
    return { bg: '#6366f1', text: badge, icon: Package }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-red-500">{error}</p>
        <button 
          onClick={loadPackages}
          className="px-5 py-2.5 rounded-xl font-medium text-white flex items-center gap-2 hover:bg-red-700 transition-all"
          style={{ backgroundColor: PRIMARY }}
        >
          <RefreshCw className="w-4 h-4" />
          Tekrar Dene
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: `${PRIMARY}20` }}>
              <Package className="w-6 h-6" style={{ color: PRIMARY }} />
            </div>
            Paket Yönetimi
            <span className="text-sm font-medium px-3 py-1 rounded-full bg-white/10 text-gray-400">
              {packages.length} paket
            </span>
          </h1>
          <p className="text-gray-500 mt-2 flex items-center gap-2">
            Abonelik paketlerini düzenleyin ve yönetin
            {lastUpdated && (
              <span className="text-xs text-gray-600">
                • Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR')}
              </span>
            )}
          </p>
        </div>
        <button 
          onClick={loadPackages}
          className="px-4 py-2.5 rounded-xl font-medium text-gray-400 hover:text-white flex items-center gap-2 hover:bg-white/5 transition-all border border-white/10"
        >
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {packages.map((pkg) => {
          const badgeStyle = getBadgeStyle(pkg.badge, pkg.isPopular)
          const BadgeIcon = badgeStyle.icon
          const PackageIcon = PACKAGE_ICONS[pkg.duration] || Package
          const colors = PACKAGE_COLORS[pkg.duration] || PACKAGE_COLORS[1]
          
          return (
            <div 
              key={pkg.id}
              className={`group relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${
                pkg.isPopular ? 'ring-2 ring-red-500/50' : ''
              }`}
              style={{ 
                backgroundColor: colors.bg,
                border: `1px solid ${pkg.isPopular ? PRIMARY : BORDER}`
              }}
            >
              {/* Gradient Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-50`} />
              
              {/* Badge */}
              {(pkg.badge || pkg.isPopular) && (
                <div 
                  className="relative z-10 px-4 py-2 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                  style={{ backgroundColor: badgeStyle.bg }}
                >
                  <BadgeIcon className="w-3.5 h-3.5" />
                  {badgeStyle.text}
                </div>
              )}

              <div className="relative z-10 p-6">
                {/* Icon & Name */}
                <div className="flex items-start gap-4 mb-5">
                  <div 
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: `${colors.accent}20`, color: colors.accent }}
                  >
                    <PackageIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white leading-tight">{pkg.name}</h3>
                    <p className="text-gray-500 text-sm mt-1">{pkg.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-gray-500 text-lg">₺</span>
                    <span className="text-4xl font-black text-white tracking-tight">
                      {pkg.price.toLocaleString('tr-TR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-400 text-sm">
                      {pkg.duration} Ay
                    </span>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-500 text-sm">
                      {pkg.duration_days} gün
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2.5 mb-6">
                  {(pkg.features || []).slice(0, 4).map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-sm">
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${colors.accent}20` }}
                      >
                        <CheckCircle2 className="w-3 h-3" style={{ color: colors.accent }} />
                      </div>
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(pkg)}
                    className="flex-1 py-2.5 px-4 rounded-xl font-medium text-white text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-95"
                    style={{ backgroundColor: colors.accent }}
                  >
                    <Edit2 className="w-4 h-4" />
                    Düzenle
                  </button>
                  <button 
                    onClick={() => handleDelete(pkg)}
                    className="px-3 rounded-xl border border-white/10 text-gray-500 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Hover Glow Effect */}
              <div 
                className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ 
                  background: `radial-gradient(circle at 50% 0%, ${colors.accent}10, transparent 60%)`
                }}
              />
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {packages.length === 0 && (
        <div className="text-center py-16 rounded-2xl border border-dashed border-gray-700">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-700" />
          <p className="text-gray-500 text-lg">Henüz paket bulunmuyor</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: BG_SURFACE, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ backgroundColor: `${PRIMARY}20` }}>
                  <Package className="w-5 h-5" style={{ color: PRIMARY }} />
                </div>
                <h2 className="text-xl font-bold text-white">
                  {editingPackage ? 'Paketi Düzenle' : 'Yeni Paket'}
                </h2>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Package Name */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Paket Adı</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: 6 Aylık Paket"
                  className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-600 focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Açıklama</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Paket açıklaması..."
                  className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-600 focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 transition-all"
                />
              </div>

              {/* Price & Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Fiyat (₺)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₺</span>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Süre (Ay)</label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value={1}>1 Ay</option>
                    <option value={3}>3 Ay</option>
                    <option value={6}>6 Ay</option>
                    <option value={12}>12 Ay</option>
                  </select>
                </div>
              </div>

              {/* Badge */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Rozet (Opsiyonel)</label>
                <input
                  type="text"
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  placeholder="Örn: %10 İndirim, Popüler"
                  className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-600 focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 transition-all"
                />
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.isPopular}
                      onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-red-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                  </div>
                  <span className="text-gray-300 group-hover:text-white transition-colors">Popüler olarak işaretle</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                  </div>
                  <span className="text-gray-300 group-hover:text-white transition-colors">Aktif</span>
                </label>
              </div>

              {/* Features */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">Özellikler</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                    placeholder="Yeni özellik ekle..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-600 focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 transition-all text-sm"
                  />
                  <button
                    onClick={addFeature}
                    className="px-4 py-2.5 rounded-xl font-medium text-white text-sm hover:brightness-110 transition-all"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    Ekle
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.features.map((feature, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 bg-white/5 text-gray-300 border border-white/10"
                    >
                      {feature}
                      <button 
                        onClick={() => removeFeature(idx)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all border border-white/10"
              >
                İptal
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: PRIMARY }}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPackages
