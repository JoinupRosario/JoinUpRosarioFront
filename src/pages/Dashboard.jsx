import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  FiUsers, 
  FiLogOut, 
  FiMenu,
  FiX 
} from 'react-icons/fi';
import { 
  HiOutlineOfficeBuilding,
  HiOutlineChartPie,
  HiOutlineAcademicCap,
  HiOutlinePencilAlt,
  HiOutlineDocumentText,
  HiOutlineKey,
  HiOutlineBriefcase,
  HiOutlineChartBar,
  HiOutlineCog
} from 'react-icons/hi';
import ConfiguracionPersonal from './ConfiguracionPersonal';
import './Dashboard.css';

export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [vistaActual, setVistaActual] = useState('dashboard');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { text: 'Usuarios', Icon: FiUsers, vista: 'usuarios' },
    { text: 'Entidades', Icon: HiOutlineOfficeBuilding, vista: 'entidades' },
    { text: 'Oportunidades', Icon: HiOutlineChartPie, vista: 'oportunidades' },
    { text: 'Postulantes', Icon: HiOutlineAcademicCap, vista: 'postulantes' },
    { text: 'Estudiantes Habilitados para Prácticas', Icon: HiOutlinePencilAlt, vista: 'estudiantes' },
    { text: 'Legalizaciones de Prácticas', Icon: HiOutlineAcademicCap, vista: 'legalizaciones' },
    { text: 'Legalizaciones de Monitorías', Icon: HiOutlineDocumentText, vista: 'monitorias' },
    { text: 'Roles', Icon: HiOutlineKey, vista: 'roles' },
    { text: 'Sucursales', Icon: HiOutlineBriefcase, vista: 'sucursales' },
    { text: 'Reportes', Icon: HiOutlineChartBar, vista: 'reportes' },
    { text: 'Configuración', Icon: HiOutlineCog, vista: 'configuracion' },
    { text: 'Configuración Personal', Icon: HiOutlineCog, vista: 'configuracion-personal' },
  ];

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMenuClick = (vista) => {
    setVistaActual(vista);
    setMenuOpen(false);
  };

  const handleVolver = () => {
    setVistaActual('dashboard');
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <img 
            src="/src/assets/images/login/header.png" 
            alt="Universidad del Rosario" 
            className="header-logo"
          />
          {vistaActual === 'configuracion-personal' && (
            <h1 className="header-page-title">Administrar notificaciones</h1>
          )}
        </div>
        <div className="header-right">
          <div className="user-info">
            <div className="user-avatar">
              <img 
                src="/src/assets/images/login/user.png" 
                alt="User" 
                className="avatar-img"
              />
            </div>
            <div className="user-details">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.role}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">
            <FiLogOut className="logout-icon" />
          </button>
          <button className="menu-toggle" onClick={toggleMenu}>
            {menuOpen ? <FiX className="menu-icon" /> : <FiMenu className="menu-icon" />}
          </button>
        </div>
      </header>

      {/* Sidebar Menu */}
      <aside className={`sidebar-menu ${menuOpen ? 'open' : ''}`}>
        <nav className="menu-nav">
          {menuItems.map((item, index) => {
            const IconComponent = item.Icon;
            return (
              <a 
                key={index} 
                href="#" 
                className="menu-item" 
                onClick={(e) => {
                  e.preventDefault();
                  handleMenuClick(item.vista);
                }}
              >
                <IconComponent className="menu-item-icon" />
                <span className="menu-text">{item.text}</span>
              </a>
            );
          })}
        </nav>
      </aside>

      {/* Overlay */}
      {menuOpen && <div className="menu-overlay" onClick={toggleMenu}></div>}

      {/* Main Content */}
      <main className="dashboard-main">
        {vistaActual === 'dashboard' && (
          <div className="welcome-section">
            <h2>Bienvenido/a, {user?.name}</h2>
          </div>
        )}
        {vistaActual === 'configuracion-personal' && (
          <ConfiguracionPersonal onVolver={handleVolver} />
        )}
        {vistaActual !== 'dashboard' && vistaActual !== 'configuracion-personal' && (
          <div className="welcome-section">
            <h2>{vistaActual.charAt(0).toUpperCase() + vistaActual.slice(1).replace('-', ' ')}</h2>
            <p>Esta sección está en desarrollo...</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <span className="footer-link">JoinUp HCM</span>
        <span className="footer-text">@ 2019 Powered by Qdit S.A.S - All Rights Reserved</span>
      </footer>
    </div>
  );
}
