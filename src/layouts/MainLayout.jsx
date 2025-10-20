import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './MainLayout.css';

const menuItems = [
  { text: 'Dashboard', icon: '📊', path: '/dashboard' },
  { text: 'Estudiantes', icon: '👥', path: '/students' },
  { text: 'Empresas', icon: '🏢', path: '/companies' },
  { text: 'Oportunidades', icon: '💼', path: '/opportunities' },
  { text: 'Pasantías', icon: '🎓', path: '/internships' },
  { text: 'Reportes', icon: '📈', path: '/reports' },
  { text: 'Configuración', icon: '⚙️', path: '/admin' },
];

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { user, logout } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuToggle = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const handleLogout = () => {
    logout();
    setShowProfileMenu(false);
  };

  return (
    <div className="main-layout">
      {/* App Bar */}
      <div className="app-bar">
        <button 
          className="menu-button"
          onClick={handleDrawerToggle}
        >
          ☰
        </button>
        <h1 className="app-title">Sistema de Gestión</h1>
        <div className="profile-section">
          <button 
            className="profile-button"
            onClick={handleProfileMenuToggle}
          >
            👤 {user?.name || 'Usuario'}
          </button>
          {showProfileMenu && (
            <div className="profile-menu">
              <button className="menu-item">Perfil</button>
              <button className="menu-item" onClick={handleLogout}>
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Prácticas y Pasantías</h2>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <a key={item.text} href={item.path} className="nav-item">
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.text}</span>
            </a>
          ))}
        </nav>
      </div>

      {/* Overlay para móvil */}
      {mobileOpen && (
        <div 
          className="sidebar-overlay"
          onClick={handleDrawerToggle}
        ></div>
      )}

      {/* Contenido principal */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
