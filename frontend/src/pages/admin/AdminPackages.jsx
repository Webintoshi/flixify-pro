import { useEffect, useState } from 'react'
import { useAdminStore } from '../../stores/adminStore'
import { 
  Package, 
  Plus, 
  Edit2, 
  Trash2, 
  Clock,
  Users,
  CheckCircle,
  X,
  Save,
  Loader2,
  TurkishLira,
  RefreshCw,
  AlertCircle
} from 'lucide-react'

const PRIMARY = '#E50914'
const BG_SURFACE = '#141414'
const BORDER = '#2a2a2a'

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
    // duration_days -> duration (ay cinsinden)
    const durationDays = pkg.duration_days || pkg.duration || 30
    const duration = Math.ceil(durationDays / 30) // Günü aya çevir
    
    // Description'dan badge ve popülerlik bilgisi çıkar
    const description = pkg.description || ''
    const isPopular = description.toLowerCase().includes('popüler') || 
                      description.toLowerCase().includes('en iyi') ||
                      pkg.isPopular === true
    
    // Basit feature listesi oluştur (description'dan veya default)
    let features = pkg.features || []
    if (!features.length && description) {
      // Description'dan özellikler çıkar
      const lines = description.split(/[-,]/).map(s => s.trim()).filter(s => s)
      if (lines.length > 1) {
        features = lines.slice(0, 3) // İlk 3 özelliği al
      } else {
        features = [`${durationDays} gün erişim`, 'HD Kalite', '7/24 Destek']
      }
    }
    
    // Badge belirle
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
      duration_days: durationDays, // Orijinal değeri de sakla
      features: features,
      badge: badge,
      isPopular: isPopular,
      isActive: pkg.isActive !== false, // Varsayılan true
      created_at: pkg.created_at,
      updated_at: pkg.updated_at
    }
  }

  const loadPackages = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await fetchPackages()
      
      // Backend'den gelen farklı yanıt formatlarını destekle
      const rawPackages = result.data?.packages || result.packages || result.data || []
      
      // Veritabanı yapısını frontend yapısına çevir
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
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
          className="px-4 py-2 rounded-xl font-medium text-white flex items-center gap-2"
          style={{ backgroundColor: PRIMARY }}
        >
          <RefreshCw className="w-4 h-4" />
          Tekrar Dene
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6" style={{ color: PRIMARY }} />
            Paket Yönetimi
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({packages.length} paket)
            </span>
          </h1>
          <p className="text-gray-400">
            Supabase veritabanından paketleri yönetin
            {lastUpdated && (
              <span className="ml-2 text-xs text-gray-500">
                • Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR')}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={loadPackages}
            className="px-3 py-2 rounded-xl font-medium text-white flex items-center gap-2 hover:bg-white/10 transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div 
        className="p-4 rounded-xl"
        style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}
      >
        <p className="text-blue-400 text-sm">
          ℹ️ Bu paketler Supabase veritabanında saklanır ve kullanıcı panelinde gösterilir.
        </p>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {packages.map((pkg) => (
          <div 
            key={pkg.id}
            className="rounded-2xl overflow-hidden transition-all hover:scale-[1.02]"
            style={{ 
              backgroundColor: BG_SURFACE, 
              border: `2px solid ${pkg.isPopular ? PRIMARY : BORDER}`,
              boxShadow: pkg.isPopular ? `0 0 20px ${PRIMARY}40` : 'none'
            }}
          >
            {/* Badge */}
            {(pkg.badge || pkg.isPopular) && (
              <div 
                className="px-4 py-1 text-center text-sm font-bold"
                style={{ 
                  backgroundColor: pkg.isPopular ? PRIMARY : '#f59e0b',
                  color: 'white'
                }}
              >
                {pkg.badge || (pkg.isPopular ? 'Popüler' : '')}
              </div>
            )}

            {/* Header */}
            <div className="p-6 border-b" style={{ borderColor: BORDER }}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-bold text-white">{pkg.name}</h3>
                {!pkg.isActive && (
                  <span className="px-2 py-1 rounded-full text-xs bg-gray-700 text-gray-400">
                    Pasif
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm">{pkg.description}</p>
            </div>

            {/* Price */}
            <div className="p-6 text-center border-b" style={{ borderColor: BORDER }}>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-black text-white">₺{pkg.price}</span>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                {pkg.duration || Math.ceil((pkg.duration_days || 30) / 30)} Ay
                {pkg.duration_days && (
                  <span className="text-gray-600 text-xs ml-1">({pkg.duration_days} gün)</span>
                )}
              </p>
            </div>

            {/* Features */}
            <div className="p-6">
              <ul className="space-y-3">
                {(pkg.features || []).map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-gray-300 text-sm">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: PRIMARY }} />
                    {feature}
                  </li>
                ))}
                {(!pkg.features || pkg.features.length === 0) && (
                  <li className="text-gray-500 text-sm italic">Özellik bulunmuyor</li>
                )}
              </ul>
            </div>

            {/* Actions */}
            <div className="p-6 border-t" style={{ borderColor: BORDER }} className="flex gap-2">
              <button 
                onClick={() => handleEdit(pkg)}
                className="flex-1 py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-colors"
                style={{ backgroundColor: PRIMARY }}
              >
                <Edit2 className="w-4 h-4" />
                Düzenle
              </button>
              <button 
                onClick={() => handleDelete(pkg)}
                className="p-3 rounded-xl hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {packages.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 mb-4">Henüz paket bulunmuyor</p>
          <p className="text-gray-500 text-sm">
            Supabase'de packages tablosu oluşturulmalı
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div 
            className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: BG_SURFACE, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingPackage ? 'Paket Düzenle' : 'Yeni Paket'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Package Name */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Paket Adı</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Açıklama</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Price & Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Fiyat (₺)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Süre (Ay)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              {/* Badge */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Rozet (Opsiyonel)</label>
                <input
                  type="text"
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  placeholder="Örn: Popüler, %5 İndirim"
                  className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Popular Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPopular"
                  checked={formData.isPopular}
                  onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-600"
                />
                <label htmlFor="isPopular" className="text-white cursor-pointer">
                  Popüler olarak işaretle
                </label>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-600"
                />
                <label htmlFor="isActive" className="text-white cursor-pointer">
                  Paket aktif (kullanıcılarda göster)
                </label>
              </div>

              {/* Features */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Özellikler</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                    placeholder="Özellik ekle..."
                    className="flex-1 px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white focus:outline-none focus:border-red-600"
                  />
                  <button
                    onClick={addFeature}
                    className="px-4 py-2 rounded-xl font-medium text-white"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    Ekle
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.features.map((feature, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      style={{ backgroundColor: 'rgba(229, 9, 20, 0.2)', color: '#fca5a5' }}
                    >
                      {feature}
                      <button 
                        onClick={() => removeFeature(idx)}
                        className="hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl font-medium text-white hover:bg-white/10 transition-colors"
                style={{ backgroundColor: '#2a2a2a' }}
              >
                İptal
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                style={{ backgroundColor: PRIMARY }}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPackages
