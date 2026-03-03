import { useEffect, useState } from 'react'
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
  RefreshCw
} from 'lucide-react'

const PRIMARY = '#E50914'
const BG_SURFACE = '#141414'
const BORDER = '#2a2a2a'

// Sabit 4 paket yapısı
const DEFAULT_PACKAGES = [
  {
    id: '1',
    name: '1 Aylık Paket',
    description: '30 gün boyunca geçerli',
    monthlyPrice: 100,
    duration: 1,
    durationLabel: 'Ay',
    features: ['1000+ Canlı TV Kanalı', '4K UHD Kalite', '7/24 VIP Destek', 'Tüm Film & Dizi Arşivi'],
    isActive: true,
    popular: false,
    badge: null
  },
  {
    id: '2',
    name: '3 Aylık Paket',
    description: '90 gün boyunca geçerli',
    monthlyPrice: 95,
    duration: 3,
    durationLabel: 'Ay',
    features: ['1000+ Canlı TV Kanalı', '4K UHD Kalite', '7/24 VIP Destek', 'Tüm Film & Dizi Arşivi', '%5 İndirim'],
    isActive: true,
    popular: false,
    badge: '%5'
  },
  {
    id: '3',
    name: '6 Aylık Paket',
    description: '180 gün boyunca geçerli',
    monthlyPrice: 90,
    duration: 6,
    durationLabel: 'Ay',
    features: ['1000+ Canlı TV Kanalı', '4K UHD Kalite', '7/24 VIP Destek', 'Tüm Film & Dizi Arşivi', '%10 İndirim'],
    isActive: true,
    popular: true,
    badge: 'Popüler'
  },
  {
    id: '4',
    name: '12 Aylık Paket',
    description: '365 gün boyunca geçerli',
    monthlyPrice: 80,
    duration: 12,
    durationLabel: 'Ay',
    features: ['1000+ Canlı TV Kanalı', '4K UHD Kalite', '7/24 VIP Destek', 'Tüm Film & Dizi Arşivi', '%20 İndirim'],
    isActive: true,
    popular: false,
    badge: 'En İyi'
  }
]

function AdminPackages() {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    monthlyPrice: 0,
    duration: 1,
    durationLabel: 'Ay',
    features: [],
    isActive: true,
    badge: '',
    popular: false
  })
  const [saving, setSaving] = useState(false)
  const [featureInput, setFeatureInput] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  // localStorage'dan paketleri yükle
  useEffect(() => {
    loadPackages()
  }, [])

  const loadPackages = () => {
    try {
      const stored = localStorage.getItem('flixify-packages')
      if (stored) {
        const parsed = JSON.parse(stored)
        // Mevcut paketleri birleştir (yeni alanlar eklendiyse)
        const merged = DEFAULT_PACKAGES.map(defaultPkg => {
          const storedPkg = parsed.find(p => p.id === defaultPkg.id)
          return storedPkg ? { ...defaultPkg, ...storedPkg } : defaultPkg
        })
        setPackages(merged)
      } else {
        // İlk kez yüklüyor, varsayılanları kaydet
        setPackages(DEFAULT_PACKAGES)
        localStorage.setItem('flixify-packages', JSON.stringify(DEFAULT_PACKAGES))
      }
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Packages load error:', error)
      setPackages(DEFAULT_PACKAGES)
    } finally {
      setLoading(false)
    }
  }

  const savePackages = (newPackages) => {
    try {
      localStorage.setItem('flixify-packages', JSON.stringify(newPackages))
      setPackages(newPackages)
      setLastUpdated(new Date())
      return true
    } catch (error) {
      console.error('Save error:', error)
      return false
    }
  }

  const handleEdit = (pkg) => {
    setEditingPackage(pkg)
    setFormData({
      name: pkg.name,
      description: pkg.description,
      monthlyPrice: pkg.monthlyPrice,
      duration: pkg.duration,
      durationLabel: pkg.durationLabel,
      features: [...pkg.features],
      isActive: pkg.isActive,
      badge: pkg.badge || '',
      popular: pkg.popular || false
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updatedPackages = packages.map(pkg => {
        if (pkg.id === editingPackage.id) {
          return {
            ...pkg,
            ...formData,
            // Toplam fiyatı hesapla
            totalPrice: formData.monthlyPrice * formData.duration
          }
        }
        return pkg
      })
      
      if (savePackages(updatedPackages)) {
        setShowModal(false)
        // Diğer sekmelerin güncellenmesi için event dispatch et
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'flixify-packages',
          newValue: JSON.stringify(updatedPackages)
        }))
      } else {
        alert('Paketler kaydedilemedi')
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Kaydetme başarısız: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (confirm('Tüm paketleri varsayılan değerlere sıfırlamak istediğinize emin misiniz?')) {
      setPackages(DEFAULT_PACKAGES)
      localStorage.setItem('flixify-packages', JSON.stringify(DEFAULT_PACKAGES))
      setLastUpdated(new Date())
      // Event dispatch
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'flixify-packages',
        newValue: JSON.stringify(DEFAULT_PACKAGES)
      }))
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

  const calculateTotalPrice = () => {
    return formData.monthlyPrice * formData.duration
  }

  const calculateDiscount = () => {
    const basePrice = formData.monthlyPrice * formData.duration
    const totalPrice = calculateTotalPrice()
    return basePrice - totalPrice
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
            <Package className="w-6 h-6" style={{ color: PRIMARY }} />
            Paket Yönetimi
          </h1>
          <p className="text-gray-400">
            4 sabit paketi yönetin
            {lastUpdated && (
              <span className="ml-2 text-xs text-gray-500">
                • Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR')}
              </span>
            )}
          </p>
        </div>
        <button 
          onClick={handleReset}
          className="px-4 py-2 rounded-xl font-medium text-white flex items-center gap-2 hover:bg-white/10 transition-colors"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
        >
          <RefreshCw className="w-5 h-5" />
          Varsayılana Sıfırla
        </button>
      </div>

      {/* Info Banner */}
      <div 
        className="p-4 rounded-xl"
        style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}
      >
        <p className="text-blue-400 text-sm">
          ℹ️ Bu 4 paket kullanıcı panelinde gösterilir. Paket özelliklerini düzenleyebilirsiniz.
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
              border: `2px solid ${pkg.popular ? PRIMARY : BORDER}`,
              boxShadow: pkg.popular ? `0 0 20px ${PRIMARY}40` : 'none'
            }}
          >
            {/* Badge */}
            {pkg.badge && (
              <div 
                className="px-4 py-1 text-center text-sm font-bold"
                style={{ 
                  backgroundColor: pkg.popular ? PRIMARY : '#f59e0b',
                  color: 'white'
                }}
              >
                {pkg.badge}
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
                <span className="text-4xl font-black text-white">
                  ₺{pkg.monthlyPrice * pkg.duration}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                ₺{pkg.monthlyPrice}/ay × {pkg.duration} {pkg.durationLabel}
              </p>
              {pkg.duration > 1 && (
                <p className="text-green-400 text-xs mt-2">
                  İndirimli fiyat
                </p>
              )}
            </div>

            {/* Features */}
            <div className="p-6">
              <ul className="space-y-3">
                {pkg.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-gray-300 text-sm">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: PRIMARY }} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="p-6 border-t" style={{ borderColor: BORDER }}>
              <button 
                onClick={() => handleEdit(pkg)}
                className="w-full py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-colors"
                style={{ backgroundColor: PRIMARY }}
              >
                <Edit2 className="w-4 h-4" />
                Düzenle
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && editingPackage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div 
            className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: BG_SURFACE, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                Paket Düzenle: {editingPackage.name}
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
                  <label className="block text-sm text-gray-400 mb-2">Aylık Fiyat (₺)</label>
                  <input
                    type="number"
                    value={formData.monthlyPrice}
                    onChange={(e) => setFormData({ ...formData, monthlyPrice: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Süre (Ay)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    disabled
                    className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Total Price Preview */}
              <div 
                className="p-4 rounded-xl"
                style={{ backgroundColor: 'rgba(229, 9, 20, 0.1)', border: '1px solid rgba(229, 9, 20, 0.3)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Toplam Fiyat:</span>
                  <span className="text-2xl font-bold text-white">₺{calculateTotalPrice()}</span>
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
                  id="popular"
                  checked={formData.popular}
                  onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-600"
                />
                <label htmlFor="popular" className="text-white cursor-pointer">
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
