import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useState, useEffect } from 'react';
import { 
  User, Package, CreditCard, Monitor, Settings, LogOut, 
  ChevronRight, Shield, Copy, Check, Clock, Calendar
} from 'lucide-react';
import '../styles/profile.css';

// Kalan gün hesaplama
const getRemainingDays = (expiresAt) => {
  if (!expiresAt) return { days: 0, status: 'none', color: '#6b7280', text: 'Tanımsız' }
  
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

const menuItems = [
  { path: '/profil/paketler', label: 'Paketlerim', icon: Package },
  { path: '/profil/odemeler', label: 'Ödemelerim', icon: CreditCard },
  { path: '/profil/cihazlar', label: 'Cihazlarım', icon: Monitor },
  { path: '/profil/ayarlar', label: 'Ayarlar', icon: Settings },
];

function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formattedCode = user?.code ? user.code.match(/.{4}/g)?.join(' ') : '';
  const rawCode = user?.code || '';
  const [copied, setCopied] = useState(false);
  const [remainingTime, setRemainingTime] = useState(null);

  useEffect(() => {
    if (user?.expiresAt) {
      setRemainingTime(getRemainingDays(user.expiresAt));
    }
  }, [user?.expiresAt]);

  const handleCopyCode = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!rawCode) {
      console.warn('Kopyalanacak kod yok');
      return;
    }
    
    try {
      // Modern clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(rawCode);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = rawCode;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (!successful) throw new Error('execCommand failed');
      }
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Kopyalama hatasi:', err);
      // Fallback: prompt ile göster
      window.prompt('Kodunuzu kopyalayın:', rawCode);
    }
  };

  return (
    <div className="profile-layout">
      {/* Sidebar */}
      <aside className="profile-sidebar">
        <div className="sidebar-header">
          <div className="profile-avatar-large">
            <User className="w-8 h-8" />
          </div>
          <div className="profile-info-compact">
            <span className="profile-name">Profilim</span>
            <div 
              className="profile-code-wrapper"
              onClick={handleCopyCode}
              title="Kodu kopyalamak için tıklayın"
              style={{ cursor: 'pointer' }}
            >
              <span className="profile-code-text">{formattedCode || 'Yükleniyor...'}</span>
              <span className="profile-code-copy-btn">
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" style={{ color: '#46d369' }} />
                    <span style={{ color: '#46d369', fontSize: '0.7rem' }}>Kopyalandı!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span style={{ fontSize: '0.7rem' }}>Kopyala</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Kalan Süre Kartı */}
        {remainingTime && (
          <div 
            className="mx-4 mb-4 p-4 rounded-xl"
            style={{ 
              backgroundColor: `${remainingTime.color}15`,
              border: `1px solid ${remainingTime.color}30`
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4" style={{ color: remainingTime.color }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: remainingTime.color }}>
                Kalan Süre
              </span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {remainingTime.days} <span className="text-sm font-normal text-gray-400">gün</span>
            </p>
            <p className="text-xs" style={{ color: remainingTime.color }}>
              {remainingTime.text}
            </p>
            {user?.expiresAt && (
              <p className="text-xs text-gray-500 mt-2">
                Bitiş: {new Date(user.expiresAt).toLocaleDateString('tr-TR')}
              </p>
            )}
          </div>
        )}

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/profil'}
              className={({ isActive }) => 
                `sidebar-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
              <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="security-badge">
            <Shield className="w-4 h-4" />
            <span>Güvenli Hesap</span>
          </div>
          <button className="logout-btn-sidebar" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            <span>Oturumu Kapat</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="profile-main">
        <Outlet />
      </main>
    </div>
  );
}

export default ProfilePage;
