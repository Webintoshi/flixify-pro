import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, Zap, Crown, Tv, Film, Smartphone, Headphones,
  CreditCard, Landmark, Bitcoin, Copy, CheckCircle, 
  Sparkles, AlertCircle, Loader2
} from 'lucide-react';

// ============================================
// 🎨 THEME
// ============================================
const THEME = {
  primary: '#E50914',
  primaryGlow: 'rgba(229, 9, 20, 0.4)',
  bgDeepest: '#0a0a0a',
  bgSurface: '#141414',
  bgCard: '#1a1a1a',
  border: 'rgba(255,255,255,0.08)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.5)',
  success: '#46d369',
  discount: '#f59e0b',
};

// Icon mapping
const ICONS = {
  tv: Tv,
  film: Film,
  '4k': Sparkles,
  device: Smartphone,
  support: Headphones,
  crown: Crown,
};

// ============================================
// 🎯 LOAD PACKAGES FROM ADMIN PANEL
// ============================================
const loadAdminPackages = () => {
  try {
    const stored = localStorage.getItem('flixify-packages');
    if (stored) {
      const packages = JSON.parse(stored);
      // Sadece aktif paketleri al ve sırala (süreye göre)
      const activePackages = packages
        .filter(p => p.isActive)
        .sort((a, b) => a.duration - b.duration)
        .map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          duration: p.duration,
          durationLabel: p.durationLabel,
          monthlyPrice: p.monthlyPrice,
          totalPrice: p.monthlyPrice * p.duration,
          features: p.features || [],
          badge: p.badge || null,
          popular: p.popular || false,
          isActive: p.isActive
        }));
      
      if (activePackages.length > 0) {
        return activePackages;
      }
    }
  } catch (e) {
    console.error('[ProfilePackages] Load error:', e);
  }
  
  // Fallback defaults
  return [
    { id: '1', name: '1 Aylık Paket', description: '30 gün erişim', duration: 1, durationLabel: 'Ay', monthlyPrice: 100, totalPrice: 100, features: ['1000+ Canlı TV', '4K Kalite', 'VIP Destek'], badge: null, popular: false },
    { id: '2', name: '3 Aylık Paket', description: '90 gün erişim', duration: 3, durationLabel: 'Ay', monthlyPrice: 95, totalPrice: 285, features: ['1000+ Canlı TV', '4K Kalite', 'VIP Destek', '%5 İndirim'], badge: '%5', popular: false },
    { id: '3', name: '6 Aylık Paket', description: '180 gün erişim', duration: 6, durationLabel: 'Ay', monthlyPrice: 90, totalPrice: 540, features: ['1000+ Canlı TV', '4K Kalite', 'VIP Destek', '%10 İndirim'], badge: 'Popüler', popular: true },
    { id: '4', name: '12 Aylık Paket', description: '365 gün erişim', duration: 12, durationLabel: 'Ay', monthlyPrice: 80, totalPrice: 960, features: ['1000+ Canlı TV', '4K Kalite', 'VIP Destek', '%20 İndirim'], badge: 'En İyi', popular: false },
  ];
};

// ============================================
// 🎯 MAIN COMPONENT
// ============================================
function ProfilePackages() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, fetchUser } = useAuthStore();
  
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState(location.state?.message || null);
  const [copied, setCopied] = useState(false);

  // Load packages
  useEffect(() => {
    const pkgs = loadAdminPackages();
    setPackages(pkgs);
    setSelectedPackage(pkgs.find(p => p.popular) || pkgs[2] || pkgs[0]);
    setLoading(false);
  }, []);

  // Listen for admin panel updates
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'flixify-packages') {
        const pkgs = loadAdminPackages();
        setPackages(pkgs);
        if (selectedPackage) {
          const updated = pkgs.find(p => p.id === selectedPackage.id);
          if (updated) setSelectedPackage(updated);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [selectedPackage]);

  // Clear alert
  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => setAlertMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  // Auto-refresh user data
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) fetchUser();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: THEME.bgDeepest }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: THEME.primary }} />
      </div>
    );
  }

  const hasActivePackage = user?.expiresAt && new Date(user.expiresAt) > new Date();

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: THEME.bgDeepest }}>
      {/* Header */}
      <div className="px-6 py-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
          style={{ background: `linear-gradient(135deg, ${THEME.primary}40 0%, ${THEME.primary}20 100%)` }}
        >
          <Crown className="w-8 h-8" style={{ color: THEME.primary }} />
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl md:text-4xl font-black text-white mb-2"
        >
          Flixify Pro
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg"
          style={{ color: THEME.discount }}
        >
          Sınırsız Eğlence
        </motion.p>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-2"
          style={{ color: THEME.textMuted }}
        >
          Tüm içeriklere sınırsız erişim
        </motion.p>
      </div>

      {/* Alert */}
      <AnimatePresence>
        {alertMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-6 mb-6 p-4 rounded-xl flex items-center gap-3"
            style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#ef4444' }} />
            <p style={{ color: '#fca5a5' }}>{alertMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Package Status */}
      {hasActivePackage && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-6 mb-8 p-4 rounded-xl flex items-center gap-4"
          style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.3)' }}>
            <CheckCircle className="w-5 h-5" style={{ color: THEME.success }} />
          </div>
          <div>
            <p className="font-bold" style={{ color: THEME.success }}>Aktif Paketiniz Var</p>
            <p className="text-sm" style={{ color: THEME.textSecondary }}>
              Bitiş: {new Date(user.expiresAt).toLocaleDateString('tr-TR')}
            </p>
          </div>
        </motion.div>
      )}

      {/* Package Selection */}
      <div className="px-6 max-w-6xl mx-auto">
        <p className="text-center mb-8" style={{ color: THEME.textMuted }}>
          Ne kadar süreyle erişmek istiyorsunuz?
        </p>

        {/* Package Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedPackage(pkg)}
              className={`relative rounded-2xl p-5 cursor-pointer transition-all duration-300 ${
                selectedPackage?.id === pkg.id ? 'scale-105' : 'hover:scale-102'
              }`}
              style={{
                backgroundColor: selectedPackage?.id === pkg.id ? THEME.bgCard : THEME.bgSurface,
                border: `2px solid ${selectedPackage?.id === pkg.id ? THEME.primary : THEME.border}`,
                boxShadow: selectedPackage?.id === pkg.id ? `0 0 30px ${THEME.primaryGlow}` : 'none'
              }}
            >
              {/* Badge */}
              {pkg.badge && (
                <div 
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                  style={{ 
                    backgroundColor: pkg.popular ? THEME.primary : THEME.discount,
                    color: 'white'
                  }}
                >
                  {pkg.badge}
                </div>
              )}

              {/* Duration */}
              <div className="text-center mb-4 pt-2">
                <span className="text-4xl font-black text-white">{pkg.duration}</span>
                <span className="text-lg text-white/70 ml-1">{pkg.durationLabel}</span>
              </div>

              {/* Price */}
              <div className="text-center mb-4">
                <span className="text-2xl font-bold text-white">₺{pkg.totalPrice}</span>
                <p className="text-sm mt-1" style={{ color: THEME.textMuted }}>
                  ₺{pkg.monthlyPrice}/ay
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-4">
                {pkg.features.slice(0, 4).map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm" style={{ color: THEME.textSecondary }}>
                    <Check className="w-4 h-4 flex-shrink-0" style={{ color: THEME.success }} />
                    <span className="truncate">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Selection Indicator */}
              <div 
                className={`w-full py-2 rounded-xl text-center font-medium transition-colors ${
                  selectedPackage?.id === pkg.id 
                    ? 'text-white' 
                    : 'text-white/50'
                }`}
                style={{ 
                  backgroundColor: selectedPackage?.id === pkg.id ? THEME.primary : 'rgba(255,255,255,0.1)'
                }}
              >
                {selectedPackage?.id === pkg.id ? 'Seçildi' : 'Seç'}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Selected Package Details */}
        {selectedPackage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-6 mb-8"
            style={{ backgroundColor: THEME.bgCard, border: `1px solid ${THEME.border}` }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">{selectedPackage.name}</h2>
                <p style={{ color: THEME.textSecondary }}>{selectedPackage.description}</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-white">₺{selectedPackage.totalPrice}</span>
                <p className="text-sm" style={{ color: THEME.textMuted }}>Toplam ödeme</p>
              </div>
            </div>

            {/* All Features */}
            <div className="mt-6 pt-6 border-t" style={{ borderColor: THEME.border }}>
              <h3 className="text-sm font-medium mb-4" style={{ color: THEME.textMuted }}>Paket Özellikleri</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {selectedPackage.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(70, 211, 105, 0.2)' }}
                    >
                      <Check className="w-3 h-3" style={{ color: THEME.success }} />
                    </div>
                    <span className="text-sm" style={{ color: THEME.textSecondary }}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Payment Methods */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: THEME.bgSurface, border: `1px solid ${THEME.border}` }}>
          <h2 className="text-lg font-bold text-white mb-4">Ödeme Yöntemi Seçin</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button className="p-4 rounded-xl flex items-center gap-3 transition-all hover:scale-105" style={{ backgroundColor: THEME.bgCard }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                <CreditCard className="w-5 h-5" style={{ color: '#3b82f6' }} />
              </div>
              <div className="text-left">
                <p className="font-medium text-white">Kredi Kartı</p>
                <p className="text-xs" style={{ color: THEME.textMuted }}>Anında aktif</p>
              </div>
            </button>

            <button className="p-4 rounded-xl flex items-center gap-3 transition-all hover:scale-105" style={{ backgroundColor: THEME.bgCard }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                <Landmark className="w-5 h-5" style={{ color: '#10b981' }} />
              </div>
              <div className="text-left">
                <p className="font-medium text-white">Havale / EFT</p>
                <p className="text-xs" style={{ color: THEME.textMuted }}>Manuel onay</p>
              </div>
            </button>

            <button className="p-4 rounded-xl flex items-center gap-3 transition-all hover:scale-105" style={{ backgroundColor: THEME.bgCard }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>
                <Bitcoin className="w-5 h-5" style={{ color: '#f59e0b' }} />
              </div>
              <div className="text-left">
                <p className="font-medium text-white">Kripto Para</p>
                <p className="text-xs" style={{ color: THEME.textMuted }}>Bitcoin & Altcoin</p>
              </div>
            </button>
          </div>

          {/* Purchase Button */}
          <button 
            className="w-full mt-6 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: THEME.primary, color: 'white' }}
            onClick={() => alert('Ödeme sistemi entegrasyonu gerekiyor')}
          >
            <Zap className="w-5 h-5" />
            {selectedPackage ? `₺${selectedPackage.totalPrice} - Satın Al` : 'Paket Seçin'}
          </button>

          <p className="text-center mt-4 text-xs" style={{ color: THEME.textMuted }}>
            Ödeme yaptıktan sonra paketiniz otomatik aktifleşecektir.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProfilePackages;
