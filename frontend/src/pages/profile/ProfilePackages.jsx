import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Check, Zap, Clock, Calendar, Shield, X, 
  CreditCard, Landmark, Bitcoin, Copy, CheckCircle, 
  ArrowRight, ExternalLink
} from 'lucide-react';

// Renkler
const PRIMARY = '#E50914';
const BG_DARK = '#0a0a0a';
const BG_SURFACE = '#141414';
const BG_CARD = '#1a1a1a';
const BORDER = '#2a2a2a';

// Tek Paket - Sadece sure secenekleri degisir
const PACKAGE = {
  name: 'Flixify Pro',
  description: 'Tum iceriklere sinirsiz erisim',
  monthlyPrice: 99.90,
  features: [
    '1000+ Canli TV Kanali',
    'Tum Film & Dizi Arsivi',
    '4K UHD Kalite',
    'Sinirsiz Cihaz',
    'VIP Destek'
  ],
  // Admin tarafindan belirlenen sureler ve indirimler
  durations: [
    { months: 1, label: '1 Ay', discount: 0 },
    { months: 3, label: '3 Ay', discount: 5, badge: '%5 Indirim' },
    { months: 6, label: '6 Ay', discount: 10, badge: '%10 Indirim' },
    { months: 12, label: '12 Ay', discount: 20, badge: '%20 Indirim' }
  ]
};

// Admin panelinden gelecek odeme ayarlari
const mockPaymentSettings = {
  creditCardLink: 'https://pay.flixifypro.com/odeme',
  bankTransfer: {
    accountName: 'FLIXIFY PRO DIJITAL HIZMETLER LTD. STI.',
    iban: 'TR00 1234 5678 9012 3456 7890 12'
  },
  cryptoWallet: '0x1234567890abcdef1234567890abcdef12345678'
};

const PAYMENT_METHODS = [
  { id: 'credit_card', name: 'Kredi Karti', icon: CreditCard, color: '#3b82f6' },
  { id: 'bank_transfer', name: 'Havale / EFT', icon: Landmark, color: '#10b981' },
  { id: 'crypto', name: 'Kripto Para', icon: Bitcoin, color: '#f59e0b' }
];

function ProfilePackages() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState(PACKAGE.durations[0]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [currentPackage, setCurrentPackage] = useState(null); // Aktif paket varsa

  useEffect(() => {
    // API'den aktif paket kontrolu
    setTimeout(() => {
      // Mock: Aktif paket varsa goster
      // setCurrentPackage({ expiryDate: '2026-04-01' });
      setLoading(false);
    }, 500);
  }, []);

  const calculatePrice = (duration) => {
    const basePrice = PACKAGE.monthlyPrice * duration.months;
    const discountAmount = basePrice * (duration.discount / 100);
    return basePrice - discountAmount;
  };

  const handleStartPurchase = () => {
    setShowPaymentModal(true);
    setPaymentStep(1);
    setSelectedMethod(null);
  };

  const handleMethodSelect = (methodId) => {
    setSelectedMethod(methodId);
    
    if (methodId === 'credit_card') {
      window.open(mockPaymentSettings.creditCardLink, '_blank');
    } else {
      setPaymentStep(2);
    }
  };

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleGoToPaymentNotification = () => {
    setShowPaymentModal(false);
    navigate('/profil/odemeler');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG_DARK }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: PRIMARY, borderTopColor: 'transparent' }} />
          <p className="text-white">Yukleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: BG_DARK }}>
      {/* Header */}
      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Package className="w-8 h-8" style={{ color: PRIMARY }} />
            Paketim
          </h1>
          <p className="text-white/60">Flixify Pro erisimi satin alin</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6">
        {/* Aktif Paket Varsa */}
        {currentPackage && (
          <div 
            className="p-5 rounded-2xl flex items-center gap-4 mb-6"
            style={{ backgroundColor: 'rgba(70, 211, 105, 0.1)', border: '1px solid rgba(70, 211, 105, 0.3)' }}
          >
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(70, 211, 105, 0.2)' }}>
              <Check className="w-7 h-7" style={{ color: '#46d369' }} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white">Paketiniz Aktif</h2>
              <p className="text-white/60">Bitis tarihi: {new Date(currentPackage.expiryDate).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>
        )}

        {/* Ana Paket Karti */}
        <div 
          className="rounded-3xl p-8 mb-6"
          style={{ backgroundColor: BG_SURFACE, border: `2px solid ${PRIMARY}` }}
        >
          {/* Baslik */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(229, 9, 20, 0.2)' }}>
              <Zap className="w-10 h-10" style={{ color: PRIMARY }} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{PACKAGE.name}</h2>
            <p className="text-white/60">{PACKAGE.description}</p>
          </div>

          {/* Sure Secimi */}
          <div className="mb-8">
            <label className="text-center text-white/60 mb-4 block">
              <Clock className="w-4 h-4 inline mr-2" />
              Kac Aylik Almak Istiyorsunuz?
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PACKAGE.durations.map((dur) => (
                <button
                  key={dur.months}
                  onClick={() => setSelectedDuration(dur)}
                  className="relative py-4 px-3 rounded-xl text-center transition-all"
                  style={{
                    backgroundColor: selectedDuration?.months === dur.months ? PRIMARY : BG_CARD,
                    border: `2px solid ${selectedDuration?.months === dur.months ? PRIMARY : BORDER}`,
                    color: 'white'
                  }}
                >
                  {dur.badge && (
                    <span 
                      className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap"
                      style={{ backgroundColor: '#46d369', color: 'white' }}
                    >
                      {dur.badge}
                    </span>
                  )}
                  <span className="block text-2xl font-bold">{dur.months}</span>
                  <span className="text-xs opacity-70">Ay</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fiyat Ozeti */}
          <div 
            className="p-6 rounded-2xl mb-8"
            style={{ backgroundColor: BG_CARD }}
          >
            <div className="flex justify-between text-sm text-white/60 mb-2">
              <span>Aylik Fiyat</span>
              <span>{PACKAGE.monthlyPrice.toFixed(2)} TL</span>
            </div>
            <div className="flex justify-between text-sm text-white/60 mb-2">
              <span>Sure</span>
              <span>{selectedDuration?.months} Ay</span>
            </div>
            {selectedDuration?.discount > 0 && (
              <div className="flex justify-between text-sm mb-2" style={{ color: '#46d369' }}>
                <span>Indirim (%{selectedDuration.discount})</span>
                <span>-{((PACKAGE.monthlyPrice * selectedDuration.months) * (selectedDuration.discount / 100)).toFixed(2)} TL</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-4 mt-4 flex justify-between items-center">
              <span className="text-white/80">Toplam Tutar</span>
              <span className="text-4xl font-bold text-white">
                {calculatePrice(selectedDuration).toFixed(2)} TL
              </span>
            </div>
          </div>

          {/* Ozellikler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            {PACKAGE.features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: BG_CARD }}>
                <Check className="w-5 h-5 flex-shrink-0" style={{ color: PRIMARY }} />
                <span className="text-white/90">{feature}</span>
              </div>
            ))}
          </div>

          {/* Satin Al Butonu */}
          <button
            onClick={handleStartPurchase}
            className="w-full py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02]"
            style={{ backgroundColor: PRIMARY, color: 'white' }}
          >
            <span>Satin Al</span>
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        {/* Guvenlik Bilgisi */}
        <div 
          className="p-5 rounded-xl flex items-start gap-3"
          style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}
        >
          <Shield className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: '#3b82f6' }} />
          <div>
            <p className="text-white font-medium mb-1">Guvenli Odeme</p>
            <p className="text-white/70 text-sm">Tum odemeleriniz 256-bit SSL sertifikasi ile korunur. Kredi karti bilgileriniz kaydedilmez.</p>
          </div>
        </div>
      </div>

      {/* Odeme Modal */}
      {showPaymentModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
          onClick={() => setShowPaymentModal(false)}
        >
          <div 
            className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: BG_SURFACE, border: `1px solid ${BORDER}` }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {paymentStep === 1 ? 'Odeme Yontemi' : 'Odeme Bilgileri'}
                </h3>
                <p className="text-sm text-white/50 mt-1">
                  {selectedDuration?.months} Aylik - {calculatePrice(selectedDuration).toFixed(2)} TL
                </p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* Adim 1: Odeme Yontemi */}
            {paymentStep === 1 && (
              <>
                <p className="text-white/60 mb-4">Odeme yontemini secin:</p>
                
                <div className="space-y-3 mb-6">
                  {PAYMENT_METHODS.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        onClick={() => handleMethodSelect(method.id)}
                        className="w-full p-4 rounded-xl flex items-center gap-4 transition-all hover:scale-[1.02] text-left"
                        style={{ 
                          backgroundColor: BG_CARD,
                          border: `2px solid ${selectedMethod === method.id ? method.color : BORDER}`
                        }}
                      >
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${method.color}20` }}
                        >
                          <Icon className="w-6 h-6" style={{ color: method.color }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-bold">{method.name}</p>
                          <p className="text-sm text-white/50">
                            {method.id === 'credit_card' ? 'Guvenli odeme sayfasina yonlendiril' : 
                             method.id === 'bank_transfer' ? 'Havale/EFT ile odeme yapin' : 
                             'Kripto para ile odeme yapin'}
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-white/30" />
                      </button>
                    );
                  })}
                </div>

                {/* Sure Degistir */}
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full py-3 rounded-xl font-medium text-white/70"
                  style={{ backgroundColor: BG_CARD }}
                >
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Sureyi Degistir
                </button>
              </>
            )}

            {/* Adim 2: Havale/Kripto Bilgileri */}
            {paymentStep === 2 && selectedMethod && (
              <>
                {/* Toplam Tutar */}
                <div 
                  className="p-4 rounded-xl mb-6 text-center"
                  style={{ backgroundColor: BG_CARD }}
                >
                  <p className="text-white/60 text-sm mb-1">Odemeniz Gereken Tutar</p>
                  <p className="text-3xl font-bold text-white">
                    {calculatePrice(selectedDuration).toFixed(2)} TL
                  </p>
                </div>

                {/* Havale/EFT */}
                {selectedMethod === 'bank_transfer' && (
                  <div className="space-y-4 mb-6">
                    <div 
                      className="p-4 rounded-xl"
                      style={{ backgroundColor: BG_CARD, border: '1px solid rgba(16, 185, 129, 0.3)' }}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <Landmark className="w-5 h-5" style={{ color: '#10b981' }} />
                        <span className="text-white font-bold">Havale / EFT Bilgileri</span>
                      </div>
                      
                      <div className="mb-3">
                        <label className="text-xs text-white/50 block mb-1">Hesap Adi</label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-sm text-white bg-black/30 px-3 py-2 rounded-lg font-mono">
                            {mockPaymentSettings.bankTransfer.accountName}
                          </code>
                          <button
                            onClick={() => handleCopy(mockPaymentSettings.bankTransfer.accountName, 'accountName')}
                            className="p-2 rounded-lg transition-colors"
                            style={{ backgroundColor: copiedField === 'accountName' ? 'rgba(70, 211, 105, 0.2)' : 'rgba(255,255,255,0.1)' }}
                          >
                            {copiedField === 'accountName' ? (
                              <CheckCircle className="w-5 h-5" style={{ color: '#46d369' }} />
                            ) : (
                              <Copy className="w-5 h-5 text-white/60" />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs text-white/50 block mb-1">IBAN</label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-sm text-white bg-black/30 px-3 py-2 rounded-lg font-mono">
                            {mockPaymentSettings.bankTransfer.iban}
                          </code>
                          <button
                            onClick={() => handleCopy(mockPaymentSettings.bankTransfer.iban, 'iban')}
                            className="p-2 rounded-lg transition-colors"
                            style={{ backgroundColor: copiedField === 'iban' ? 'rgba(70, 211, 105, 0.2)' : 'rgba(255,255,255,0.1)' }}
                          >
                            {copiedField === 'iban' ? (
                              <CheckCircle className="w-5 h-5" style={{ color: '#46d369' }} />
                            ) : (
                              <Copy className="w-5 h-5 text-white/60" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                      <p className="text-white/80">
                        <span className="font-bold" style={{ color: '#f59e0b' }}>Not:</span> Havale yaptiktan sonra asagidaki butona tiklayarak bildirim yapin.
                      </p>
                    </div>
                  </div>
                )}

                {/* Kripto */}
                {selectedMethod === 'crypto' && (
                  <div className="space-y-4 mb-6">
                    <div 
                      className="p-4 rounded-xl"
                      style={{ backgroundColor: BG_CARD, border: '1px solid rgba(245, 158, 11, 0.3)' }}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <Bitcoin className="w-5 h-5" style={{ color: '#f59e0b' }} />
                        <span className="text-white font-bold">Kripto Cuzdan Adresi</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs text-white bg-black/30 px-3 py-3 rounded-lg font-mono break-all">
                          {mockPaymentSettings.cryptoWallet}
                        </code>
                        <button
                          onClick={() => handleCopy(mockPaymentSettings.cryptoWallet, 'crypto')}
                          className="p-2 rounded-lg transition-colors flex-shrink-0"
                          style={{ backgroundColor: copiedField === 'crypto' ? 'rgba(70, 211, 105, 0.2)' : 'rgba(255,255,255,0.1)' }}
                        >
                          {copiedField === 'crypto' ? (
                            <CheckCircle className="w-5 h-5" style={{ color: '#46d369' }} />
                          ) : (
                            <Copy className="w-5 h-5 text-white/60" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                      <p className="text-white/80">
                        <span className="font-bold" style={{ color: '#f59e0b' }}>Not:</span> Transfer yaptiktan sonra asagidaki butona tiklayarak bildirim yapin.
                      </p>
                    </div>
                  </div>
                )}

                {/* Odeme Bildirimi Butonu */}
                <button
                  onClick={handleGoToPaymentNotification}
                  className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 mb-3"
                  style={{ backgroundColor: PRIMARY }}
                >
                  <ExternalLink className="w-5 h-5" />
                  Odeme Bildirimi Yap
                </button>

                <button
                  onClick={() => setPaymentStep(1)}
                  className="w-full py-3 rounded-xl font-medium text-white/70"
                  style={{ backgroundColor: BG_CARD }}
                >
                  Baska Yontem Sec
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePackages;
