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
  TurkishLira
} from 'lucide-react'

const PRIMARY = '#E50914'
const BG_SURFACE = '#141414'
const BORDER = '#2a2a2a'

function AdminPackages() {
  const { fetchPackages, createPackage, updatePackage, deletePackage } = useAdminStore()
  
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: 30,
    features: [],
    isActive: true
  })
  const [saving, setSaving] = useState(false)
  const [featureInput, setFeatureInput] = useState('')

  useEffect(() => {
    loadPackages()
  }, [])

  const loadPackages = async () => {
    try {
      const data = await fetchPackages()
      setPackages(data.packages || [])
    } catch (error) {
      console.error('Packages load error:', error)
      // Mock data
      setPackages([
        { id: 1, name: 'Temel', description: 'Temel paket ile başlayın', price: 50, duration: 30, features: ['100+ Kanal', 'SD Kalite'], isActive: true, userCount: 150 },
        { id: 2, name: 'Standart', description: 'En popüler paket', price: 100, duration: 30, features: ['500+ Kanal', 'HD Kalite', 'Film & Dizi'], isActive: true, userCount: 450 },
        { id: 3, name: 'Premium', description: 'Tam deneyim', price: 150, duration: 30, features: ['1000+ Kanal', '4K Kalite', 'Film & Dizi', 'Canlı Spor'], isActive: true, userCount: 320 },
        { id: 4, name: 'Aile', description: 'Aile boyu eğlence', price: 200, duration: 30, features: ['1000+ Kanal', '4K Kalite', 'Çocuk Kanalları', 'Eşzamanlı 4 Cihaz'], isActive: true, userCount: 180 },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingPackage(null)
    setFormData({
      name: '',
      description: '',
      price: '',
      duration: 30,
      features: [],
      isActive: true
    })
    setShowModal(true)
  }

  const handleEdit = (pkg) => {
    setEditingPackage(pkg)
    setFormData({
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      duration: pkg.duration,
      features: [...pkg.features],
      isActive: pkg.isActive
    })
    setShowModal(true)
  }

  const handleDelete = async (packageId) => {
    if (!confirm('Bu paketi silmek istediğinize emin misiniz?')) return
    try {
      await deletePackage(packageId)
      await loadPackages()
    } catch (error) {
      console.error('Delete error:', error)
      alert('Paket silinemedi')
    }
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
    } catch (error) {
      console.error('Save error:', error)
      alert('Kaydetme başarısız')
    } finally {
      setSaving(false)
    }
  }

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({ ...formData, features: [...formData.features, featureInput.trim()] })
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6" style={{ color: PRIMARY }} />
            Paket Yönetimi
          </h1>
          <p className="text-gray-400">Satış paketlerini yönetin</p>
        </div>
        <button 
          onClick={handleAdd}
          className="px-4 py-2 rounded-xl font-medium text-white flex items-center gap-2"
          style={{ backgroundColor: PRIMARY }}
        >
          <Plus className="w-5 h-5" />
          Yeni Paket
        </button>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div 
            key={pkg.id}
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: BG_SURFACE, border: `1px solid ${BORDER}` }}
          >
            {/* Header */}
            <div className="p-6 border-b" style={{ borderColor: BORDER }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{pkg.name}</h3>
                  <p className="text-gray-400 text-sm mt-1">{pkg.description}</p>
                </div>
                {!pkg.isActive && (
                  <span className="px-2 py-1 rounded-full text-xs bg-gray-700 text-gray-400">
                    Pasif
                  </span>
                )}
              </div>
              
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">₺{pkg.price}</span>
                <span className="text-gray-500">/ {pkg.duration} gün</span>
              </div>
            </div>

            {/* Features */}
            <div className="p-6">
              <ul className="space-y-3">
                {pkg.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-gray-300">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: PRIMARY }} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Stats & Actions */}
            <div className="p-6 border-t" style={{ borderColor: BORDER }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-gray-400">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{pkg.userCount} kullanıcı</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEdit(pkg)}
                  className="flex-1 py-2 rounded-lg font-medium text-white hover:bg-white/10 transition-colors"
                  style={{ backgroundColor: '#2a2a2a' }}
                >
                  Düzenle
                </button>
                <button 
                  onClick={() => handleDelete(pkg.id)}
                  className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

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
              <div>
                <label className="block text-sm text-gray-400 mb-2">Paket Adı</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: Premium"
                  className="w-full p-3 rounded-xl text-white focus:outline-none"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Açıklama</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Paket açıklaması"
                  className="w-full p-3 rounded-xl text-white focus:outline-none"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Fiyat (₺)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="100"
                    className="w-full p-3 rounded-xl text-white focus:outline-none"
                    style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Süre (Gün)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full p-3 rounded-xl text-white focus:outline-none"
                    style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Özellikler</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    placeholder="Özellik ekle..."
                    className="flex-1 p-3 rounded-xl text-white focus:outline-none"
                    style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                  />
                  <button
                    onClick={addFeature}
                    className="px-4 py-3 rounded-xl font-medium text-white"
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
                      style={{ backgroundColor: 'rgba(229,9,20,0.2)', color: PRIMARY }}
                    >
                      {feature}
                      <button onClick={() => removeFeature(idx)} className="hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="isActive" className="text-gray-300">Aktif</label>
              </div>
            </div>

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

export default AdminPackages
