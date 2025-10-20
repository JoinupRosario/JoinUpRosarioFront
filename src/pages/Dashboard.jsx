import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  FiUsers, 
  FiLogOut, 
  FiMenu,
  FiX,
  FiTrendingUp,
  FiClock,
  FiCheckCircle,
  FiAlertCircle
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
import Configuracion from './Configuracion';
import Reportes from './Reportes';
import StatCard from '../components/ui/StatCard';
import SimpleChart from '../components/ui/SimpleChart';
import RecentActivity from '../components/ui/RecentActivity';
import './Dashboard.css';

export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [vistaActual, setVistaActual] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Datos de ejemplo para el dashboard
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalStudents: 0,
      activePractices: 0,
      availableOpportunities: 0,
      registeredCompanies: 0
    },
    charts: {
      applicationsByMonth: [],
      practiceStatus: [],
      applicationTrends: []
    },
    recentActivity: []
  });

  // Simular carga de datos
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Datos de ejemplo
      setDashboardData({
        stats: {
          totalStudents: 1247,
          activePractices: 89,
          availableOpportunities: 23,
          registeredCompanies: 156
        },
        charts: {
          applicationsByMonth: [
            { label: 'Ene', value: 45 },
            { label: 'Feb', value: 52 },
            { label: 'Mar', value: 38 },
            { label: 'Abr', value: 67 },
            { label: 'May', value: 73 },
            { label: 'Jun', value: 89 }
          ],
          practiceStatus: [
            { label: 'En Progreso', value: 89 },
            { label: 'Completadas', value: 234 },
            { label: 'Pendientes', value: 45 },
            { label: 'Canceladas', value: 12 }
          ],
          applicationTrends: [
            { label: 'Sem 1', value: 12 },
            { label: 'Sem 2', value: 18 },
            { label: 'Sem 3', value: 15 },
            { label: 'Sem 4', value: 22 },
            { label: 'Sem 5', value: 28 },
            { label: 'Sem 6', value: 35 }
          ]
        },
        recentActivity: [
          {
            type: 'application',
            description: 'Nueva postulación de María González para práctica en Microsoft',
            user: 'María González',
            timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
            status: 'pending'
          },
          {
            type: 'company',
            description: 'Nueva empresa registrada: TechCorp Solutions',
            user: 'Admin',
            timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
            status: 'approved'
          },
          {
            type: 'practice',
            description: 'Práctica completada por Juan Pérez en Google',
            user: 'Juan Pérez',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            status: 'completed'
          },
          {
            type: 'approval',
            description: 'Aprobación de práctica para Ana Rodríguez',
            user: 'Admin',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
            status: 'approved'
          },
          {
            type: 'notification',
            description: 'Recordatorio: 5 prácticas vencen esta semana',
            user: 'Sistema',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
            status: 'pending'
          }
        ]
      });
      
      setLoading(false);
    };

    loadDashboardData();
  }, []);

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
          {vistaActual === 'configuracion' && (
            <h1 className="header-page-title">Configuración</h1>
          )}
          {vistaActual === 'reportes' && (
            <h1 className="header-page-title">Reportes</h1>
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
          <div className="dashboard-content">
            {/* Welcome Section */}
            <div className="dashboard-welcome">
              <h2>Bienvenido/a, {user?.name}</h2>
              <p>Aquí tienes un resumen de la actividad del sistema de gestión de prácticas</p>
            </div>

            {/* Stats Cards */}
            <div className="dashboard-stats">
              <StatCard
                title="Total Estudiantes"
                value={dashboardData.stats.totalStudents.toLocaleString()}
                change="+12%"
                changeType="positive"
                icon={FiUsers}
                color="primary"
                loading={loading}
              />
              <StatCard
                title="Prácticas Activas"
                value={dashboardData.stats.activePractices}
                change="+5%"
                changeType="positive"
                icon={FiCheckCircle}
                color="success"
                loading={loading}
              />
              <StatCard
                title="Oportunidades Disponibles"
                value={dashboardData.stats.availableOpportunities}
                change="-2%"
                changeType="negative"
                icon={HiOutlineChartPie}
                color="warning"
                loading={loading}
              />
              <StatCard
                title="Empresas Registradas"
                value={dashboardData.stats.registeredCompanies}
                change="+8%"
                changeType="positive"
                icon={HiOutlineOfficeBuilding}
                color="info"
                loading={loading}
              />
            </div>

            {/* Charts Section */}
            <div className="dashboard-charts">
              <SimpleChart
                title="Postulaciones por Mes"
                data={dashboardData.charts.applicationsByMonth}
                type="bar"
                height={250}
                loading={loading}
              />
              <SimpleChart
                title="Estado de Prácticas"
                data={dashboardData.charts.practiceStatus}
                type="pie"
                height={250}
                loading={loading}
              />
              <SimpleChart
                title="Tendencia de Postulaciones"
                data={dashboardData.charts.applicationTrends}
                type="line"
                height={250}
                loading={loading}
              />
            </div>

            {/* Recent Activity */}
            <div className="dashboard-activity">
              <RecentActivity
                title="Actividad Reciente"
                activities={dashboardData.recentActivity}
                loading={loading}
                maxItems={6}
              />
            </div>
          </div>
        )}
        {vistaActual === 'configuracion-personal' && (
          <ConfiguracionPersonal onVolver={handleVolver} />
        )}
        {vistaActual === 'configuracion' && (
          <Configuracion onVolver={handleVolver} />
        )}
        {vistaActual === 'reportes' && (
          <Reportes onVolver={handleVolver} />
        )}
        {vistaActual !== 'dashboard' && vistaActual !== 'configuracion-personal' && vistaActual !== 'configuracion' && vistaActual !== 'reportes' && (
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
