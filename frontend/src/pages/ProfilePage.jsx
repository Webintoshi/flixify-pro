import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useState } from 'react';
import { 
  User, Package, CreditCard, Monitor, Settings, LogOut, 
  ChevronRight, Shield, Copy, Check
} from 'lucide-react';
import '../styles/profile.css';

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

  const handleCopyCode = async () => {
    if (!rawCode) return;
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Kopyalama hatasi:', err);
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
            <button 
              className="profile-code-btn"
              onClick={handleCopyCode}
              title="Hesap kodunu kopyala"
            >
              <span className="profile-code-text">{formattedCode}</span>
              {copied ? (
                <Check className="w-3.5 h-3.5 copy-icon copied" />
              ) : (
                <Copy className="w-3.5 h-3.5 copy-icon" />
              )}
            </button>
          </div>
        </div>

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
