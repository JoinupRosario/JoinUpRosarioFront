import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { HiOutlineBriefcase, HiOutlineOfficeBuilding } from 'react-icons/hi';
import { useAuth } from '../../contexts/AuthContext';
import MisOportunidadesEntidad from './MisOportunidadesEntidad';
import MiEntidad from './MiEntidad';
import Oportunidades from '../componentss/Oportunidades';
import headerLogoImg from '../../assets/images/login/header.png';
import userAvatarImg from '../../assets/images/login/user.png';
import '../Dashboard.css';
import './DashboardEntidad.css';

/**
 * Layout para usuarios con `modulo === 'entidades'`.
 * Reutiliza la maquetación y estilos del Dashboard administrativo / estudiante
 * (Dashboard.css) para mantener una sola línea visual en toda la plataforma.
 *
 * Secciones:
 *  - Mis oportunidades (listado + crear práctica)
 *  - Mi entidad
 */
export default function DashboardEntidad() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Guard: este portal SOLO es para usuarios módulo 'entidades'.
  useEffect(() => {
    if (!user) return;
    const mod = user?.modulo != null ? String(user.modulo).trim().toLowerCase() : '';
    if (mod !== 'entidades') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const company = user?.company || null;
  const contacto = company?.contact || null;
  const fullName =
    user?.name ||
    [contacto?.firstName, contacto?.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    'Usuario entidad';

  const items = [
    {
      id: 'oportunidades',
      label: 'Mis oportunidades',
      Icon: HiOutlineBriefcase,
      path: '/entidad/oportunidades',
    },
    {
      id: 'mi-entidad',
      label: 'Mi entidad',
      Icon: HiOutlineOfficeBuilding,
      path: '/entidad/mi-entidad',
    },
  ];

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const goTo = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  const headerTitle = location.pathname.includes('/entidad/oportunidades/crear')
    ? 'Crear oportunidad'
    : location.pathname.startsWith('/entidad/mi-entidad')
      ? 'Mi entidad'
      : 'Mis oportunidades';

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <button
            className="header-logo-btn"
            onClick={() => navigate('/entidad/oportunidades')}
            title="Ir al inicio"
          >
            <img src={headerLogoImg} alt="Universidad del Rosario" className="header-logo" />
          </button>
          <h1 className="header-page-title">{headerTitle}</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <div className="user-avatar">
              <img src={userAvatarImg} alt="User" className="avatar-img" />
            </div>
            <div className="user-details">
              <span className="user-name">{fullName}</span>
              <span className="user-role">
                Entidad{contacto?.position ? ` · ${contacto.position}` : ''}
              </span>
            </div>
          </div>
          <button className="logout-btn" onClick={logout} title="Cerrar sesión">
            <FiLogOut className="logout-icon" />
          </button>
          <button className="menu-toggle" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <FiX className="menu-icon" /> : <FiMenu className="menu-icon" />}
          </button>
        </div>
      </header>

      <aside className={`sidebar-menu ${menuOpen ? 'open' : ''}`}>
        <nav className="menu-nav">
          {items.map((item) => {
            const IconComponent = item.Icon;
            const active = isActive(item.path);
            return (
              <a
                key={item.id}
                href="#"
                className={`menu-item ${active ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  goTo(item.path);
                }}
              >
                <IconComponent className="menu-item-icon" />
                <span className="menu-text">{item.label}</span>
              </a>
            );
          })}

          {company && (
            <div className="dent-sidebar-company">
              <strong>{company.name || company.legalName || 'Mi entidad'}</strong>
              {contacto?.firstName && (
                <span>
                  {contacto.firstName} {contacto.lastName || ''}
                </span>
              )}
            </div>
          )}
        </nav>
      </aside>

      {menuOpen && <div className="menu-overlay" onClick={() => setMenuOpen(false)} />}

      <main className="dashboard-main">
        <Routes>
          <Route path="oportunidades/crear" element={<Oportunidades entityPortalMode />} />
          <Route path="oportunidades" element={<MisOportunidadesEntidad />} />
          <Route path="mi-entidad" element={<MiEntidad />} />
          <Route path="*" element={<Navigate to="oportunidades" replace />} />
        </Routes>
      </main>

      <footer className="dashboard-footer">
        <span className="footer-link">URJOBS 2.0</span>
        <span className="footer-text">@2025 Powered by JoinUp SAS - All Rights Reserved</span>
      </footer>
    </div>
  );
}
