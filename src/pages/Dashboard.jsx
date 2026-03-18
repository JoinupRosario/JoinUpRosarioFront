import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FiUsers, 
  FiLogOut, 
  FiMenu,
  FiX,
  FiHome,
  FiUser,
  FiSearch,
  FiBookmark,
  FiList,
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
import ConfiguracionPersonal from './componentss/ConfiguracionPersonal';
import ConfiguracionEstudiante from './componentss/ConfiguracionEstudiante';
import HomeEstudiante from './componentss/HomeEstudiante';
import Roles from './componentss/Roles';
import Configuracion from './componentss/Configuracion';
import ProgramasYFacultades from './componentss/programasFacultades/ProgramasYFacultades';
import ProgramDetail from './componentss/programasFacultades/ProgramDetail';
import FacultyDetail from './componentss/programasFacultades/FacultyDetail';
import Reportes from './componentss/Reportes';
import Ubicaciones from './componentss/Ubicaciones';
import Users from './componentss/Users';
import Companies from './componentss/Companies';
import Sucursales from './componentss/Sucursales';
import Periodos from './componentss/periodos/Periodos';
import ConfiguracionAsignaturas from './componentss/ConfiguracionAsignaturas';
import CondicionesCurriculares from './componentss/CondicionesCurriculares';
import ParametrizacionDocumentos from './componentss/parametrizacionDocumentos/ParametrizacionDocumentos';
import DocumentosLegalizacionPractica from './componentss/documentosLegalizacionPractica/DocumentosLegalizacionPractica';
import ReglasNegocio from './componentss/ReglasNegocio';
import NotificacionMonitorias from './componentss/notificaciones/notificacionMonitorias/NotificacionMonitorias';
import NotificacionPracticas from './componentss/notificaciones/notificacionPracticas/NotificacionPracticas';
import Oportunidades from './componentss/Oportunidades';
import StatCard from '../components/ui/StatCard';
import SimpleChart from '../components/ui/SimpleChart';
import Postulants  from './componentss/postulants/postulants';
import PostulantStatusLog from './componentss/postulants/postulantLogs/PostulantStatusLog';
import PostulantDocumentLog from './componentss/postulants/postulantLogs/PostulantDocumentLog';
import PostulantProfile from './componentss/postulants/PostulantProfile';
import Student from './componentss/students/student';
import OfertasAfines from './componentss/OfertasAfines';
import OfertasMonitoria from './componentss/OfertasMonitoria';
import MisAplicaciones from './componentss/MisAplicaciones';
import LegalizacionesMonitorias from './componentss/LegalizacionesMonitorias';
import DetalleLegalizacionMTM from './componentss/DetalleLegalizacionMTM';
import AdminLegalizacionMonitorias from './componentss/AdminLegalizacionMonitorias';
import AdminDetalleLegalizacionMTM from './componentss/AdminDetalleLegalizacionMTM';
import PlanDeTrabajoMTM from './componentss/PlanDeTrabajoMTM';
import SeguimientosMTM from './componentss/SeguimientosMTM';
import api from '../services/api';
// Importar imágenes
import headerLogoImg from '../assets/images/login/header.png';
import userAvatarImg from '../assets/images/login/user.png';
import './Dashboard.css';

/** Oculta visualmente menú Sucursales, badge Sede y vistas de sedes; la lógica y datos se mantienen. */
const HIDE_SUCURSALES_UI = true;

export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sedeUsuario, setSedeUsuario] = useState([]);
  const { user, logout, loading: authLoading, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Sucursales del usuario (login las envía; si no, se cargan desde API para sesiones restauradas)
  useEffect(() => {
    if (!user) {
      setSedeUsuario([]);
      return;
    }
    if (user.sucursales?.length > 0) {
      setSedeUsuario(user.sucursales);
      return;
    }
    api.get('/user-sucursales').then((res) => {
      setSedeUsuario(res.data?.sucursales || []);
    }).catch(() => setSedeUsuario([]));
  }, [user]);

  // Usuario con módulo estudiante o módulo vacío (migrados mal): solo directorio activo y vista estudiante
  const moduloRaw = user?.modulo != null ? String(user.modulo).trim().toLowerCase() : '';
  const isEstudiante = moduloRaw === 'estudiante' || moduloRaw === '';

  // Permiso acceso al módulo Postulantes (para menú y redirección)
  const hasAMPO = hasPermission('AMPO');
  // Ver perfil postulante (sin esto solo puede ver la lista, no abrir el perfil)
  const hasVPPO = hasPermission('VPPO');
  const hasEMIP = hasPermission('EMIP');
  // Módulos administrativos (menú y redirección por URL)
  const hasAMRO = hasPermission('AMRO');  // Roles
  const hasLRO = hasPermission('LRO');   // Listar roles
  const hasCRO = hasPermission('CRO');   // Crear rol
  const hasEDRO = hasPermission('EDRO'); // Editar rol y permisos
  const hasCEDRO = hasPermission('CEDRO'); // Activar/desactivar rol
  const hasRolesAccess = hasAMRO || hasLRO || hasCRO || hasEDRO || hasCEDRO;
  const hasAMUS = hasPermission('AMUS'); // Usuarios
  const hasAMRE = hasPermission('AMRE'); // Reportes
  const hasAMSU = hasPermission('AMSU'); // Sucursales
  const hasAMCO = hasPermission('AMCO'); // Configuración
  const hasAAME = hasPermission('AAME'); // Entidades / Empresas
  const hasAMOP = hasPermission('AMOP'); // Oportunidades
  const hasAMPR = hasPermission('AMPR'); // Estudiantes habilitados / Legalizaciones prácticas
  const hasCLPA = hasPermission('CLPA') || hasPermission('VTLP'); // Legalizaciones de prácticas
  const hasAMMO = hasPermission('AMMO') || hasPermission('LLMO'); // Legalizaciones de monitorías
  // Permisos por gráfica/estadística del Dashboard (cada una visible solo con su permiso)
  const hasDASH_EST = hasPermission('DASH_EST');   // Total Estudiantes
  const hasDASH_PRA = hasPermission('DASH_PRA');   // Prácticas Activas
  const hasDASH_OPO = hasPermission('DASH_OPO');   // Oportunidades Disponibles
  const hasDASH_EMP = hasPermission('DASH_EMP');   // Empresas Registradas
  const hasDASH_POS = hasPermission('DASH_POS');   // Postulaciones por Mes
  const hasDASH_EDP = hasPermission('DASH_EDP');   // Estado de Prácticas
  const hasDASH_TEN = hasPermission('DASH_TEN');   // Tendencia de Postulaciones
  const hasCFAPER = hasPermission('CFAPER');       // Configuración personal

  // ID del postulante del usuario estudiante (para enlace "Mi perfil")
  const [postulantIdMe, setPostulantIdMe] = useState(null);
  const [postulantMeLoaded, setPostulantMeLoaded] = useState(false);
  useEffect(() => {
    if (!isEstudiante || !user) {
      setPostulantMeLoaded(true);
      return;
    }
    api.get('/postulants/me')
      .then((res) => {
        if (res.data?._id) setPostulantIdMe(res.data._id);
        setPostulantMeLoaded(true);
      })
      .catch(() => {
        setPostulantIdMe(null);
        setPostulantMeLoaded(true);
      });
  }, [isEstudiante, user]);

  // Mapeo de rutas a vistas
  const routeToVista = {
    '/dashboard': 'dashboard',
    '/dashboard/mi-perfil': 'mi-perfil',
    '/dashboard/busqueda-avanzada': 'busqueda-avanzada',
    '/dashboard/oportunidades-practica': 'oportunidades-practica',
    '/dashboard/oportunidades-monitoria': 'oportunidades-monitoria',
    '/dashboard/mis-aplicaciones': 'mis-aplicaciones',
    '/dashboard/usuarios': 'usuarios',
    '/dashboard/entidades': 'entidades',
    '/dashboard/oportunidades': 'oportunidades',
    '/dashboard/postulants': 'postulants',
    '/dashboard/postulantes/states-log': 'documents-log',
    '/dashboard/estudiantes': 'estudiantes',
    '/dashboard/legalizaciones': 'legalizaciones',
    '/dashboard/monitorias': 'monitorias',
    '/dashboard/roles': 'roles',
    '/dashboard/sucursales': 'sucursales',
    '/dashboard/reportes': 'reportes',
    '/dashboard/configuracion': 'configuracion',
    '/dashboard/configuracion-personal': 'configuracion-personal',
    '/dashboard/ubicaciones': 'ubicaciones',
    '/dashboard/programas-facultades': 'programas-facultades',
    '/dashboard/periodos': 'periodos',
    '/dashboard/asignaturas': 'asignaturas',
    '/dashboard/condiciones-curriculares': 'condiciones-curriculares',
    '/dashboard/configuracion-documentos': 'configuracion-documentos',
    '/dashboard/documentos-legalizacion-practica': 'documentos-legalizacion-practica',
    '/dashboard/reglas-negocio': 'reglas-negocio',
    '/dashboard/plantillas-notificacion-monitoria': 'plantillas-monitoria',
    '/dashboard/plantillas-notificacion-practicas': 'plantillas-practicas'
  };

  // Mapeo de vistas a rutas
  const vistaToRoute = {
    'dashboard': '/dashboard',
    'mi-perfil': '/dashboard/mi-perfil',
    'busqueda-avanzada': '/dashboard/busqueda-avanzada',
    'oportunidades-practica': '/dashboard/oportunidades-practica',
    'oportunidades-monitoria': '/dashboard/oportunidades-monitoria',
    'mis-aplicaciones': '/dashboard/mis-aplicaciones',
    'usuarios': '/dashboard/usuarios',
    'entidades': '/dashboard/entidades',
    'oportunidades': '/dashboard/oportunidades',
    'postulants': '/dashboard/postulants',
    'estudiantes': '/dashboard/estudiantes',
    'legalizaciones': '/dashboard/legalizaciones',
    'monitorias': '/dashboard/monitorias',
    'roles': '/dashboard/roles',
    'sucursales': '/dashboard/sucursales',
    'reportes': '/dashboard/reportes',
    'configuracion': '/dashboard/configuracion',
    'configuracion-personal': '/dashboard/configuracion-personal',
    'ubicaciones': '/dashboard/ubicaciones',
    'programas-facultades': '/dashboard/programas-facultades',
    'periodos': '/dashboard/periodos',
    'asignaturas': '/dashboard/asignaturas',
    'condiciones-curriculares': '/dashboard/condiciones-curriculares',
    'configuracion-documentos': '/dashboard/configuracion-documentos',
    'documentos-legalizacion-practica': '/dashboard/documentos-legalizacion-practica',
    'reglas-negocio': '/dashboard/reglas-negocio',
    'plantillas-monitoria': '/dashboard/plantillas-notificacion-monitoria',
    'plantillas-practicas': '/dashboard/plantillas-notificacion-practicas'
  };

  // Obtener vista actual basada en la URL
  const getVistaFromRoute = (pathname) => {
    const path = pathname || location.pathname;
    // Buscar coincidencia exacta primero
    if (routeToVista[path]) {
      return routeToVista[path];
    }
    // Si la ruta comienza con /dashboard/postulantes/historial-estados, es el log
    if (path.startsWith('/dashboard/postulantes/historial-estados')) {
      return 'postulants-log';
    }
    // Si la ruta comienza con /dashboard/postulantes/documentlog, es el log de documentos
    if (path.startsWith('/dashboard/postulantes/documentlog')) {
      return 'postulants-document-log';
    }
    // Si la ruta comienza con /dashboard/postulantes/ y tiene un ID, es el perfil
    const postulantProfileMatch = path.match(/^\/dashboard\/postulantes\/([^/]+)$/);
    if (postulantProfileMatch) {
      return 'postulant-profile';
    }
    // Detalle de programa: /dashboard/programas-facultades/programa/:id
    if (path.match(/^\/dashboard\/programas-facultades\/programa\/[^/]+$/)) {
      return 'program-detail';
    }
    // Detalle de facultad: /dashboard/programas-facultades/facultad/:id
    if (path.match(/^\/dashboard\/programas-facultades\/facultad\/[^/]+$/)) {
      return 'faculty-detail';
    }
    if (path === '/dashboard/configuracion-documentos') {
      return 'configuracion-documentos';
    }
    if (path === '/dashboard/documentos-legalizacion-practica') {
      return 'documentos-legalizacion-practica';
    }
    if (path === '/dashboard/reglas-negocio') {
      return 'reglas-negocio';
    }
    if (path === '/dashboard/plantillas-notificacion-monitoria') return 'plantillas-monitoria';
    if (path === '/dashboard/plantillas-notificacion-practicas') return 'plantillas-practicas';
    if (path.match(/^\/dashboard\/monitorias\/detalle\/[^/]+$/)) return 'monitorias-detalle';
    if (path.match(/^\/dashboard\/monitorias\/revision\/[^/]+$/)) return 'monitorias-revision';
    if (path.match(/^\/dashboard\/monitorias\/plan\/[^/]+$/)) return 'monitorias-plan';
    if (path.match(/^\/dashboard\/monitorias\/seguimientos\/[^/]+$/)) return 'monitorias-seguimientos';
    // Si no hay coincidencia exacta, devolver 'dashboard' por defecto
    return 'dashboard';
  };

  // Inicializar estado basado en la URL actual
  const [vistaActual, setVistaActual] = useState(() => {
    return getVistaFromRoute(location.pathname);
  });

  // Redirigir a perfil del postulante cuando el estudiante entra a mi-perfil y ya tenemos el id
  useEffect(() => {
    if (vistaActual === 'mi-perfil' && postulantIdMe && postulantMeLoaded) {
      navigate(`/dashboard/postulantes/${postulantIdMe}`, { replace: true });
    }
  }, [vistaActual, postulantIdMe, postulantMeLoaded, navigate]);

  // Estudiantes no pueden ver la vista administrativa de listado de postulantes
  useEffect(() => {
    if (isEstudiante && vistaActual === 'postulants') {
      navigate('/dashboard', { replace: true });
    }
  }, [isEstudiante, vistaActual, navigate]);

  // Sin permiso AMPO: redirigir a dashboard si entró por URL a una vista de postulantes
  const postulantViews = ['postulants', 'postulant-profile', 'postulants-log', 'postulants-document-log'];
  useEffect(() => {
    if (!isEstudiante && !hasAMPO && postulantViews.includes(vistaActual)) {
      navigate('/dashboard', { replace: true });
      return;
    }
    // Tiene AMPO pero está en perfil de postulante sin VPPO ni EMIP: solo puede ver lista, no perfil
    if (!isEstudiante && vistaActual === 'postulant-profile' && !hasVPPO && !hasEMIP) {
      navigate('/dashboard/postulantes', { replace: true });
    }
  }, [isEstudiante, hasAMPO, hasVPPO, hasEMIP, vistaActual, navigate]);

  // Sin permiso al módulo: redirigir si entró por URL
  const configViews = ['configuracion', 'periodos', 'programas-facultades', 'program-detail', 'faculty-detail', 'asignaturas', 'condiciones-curriculares', 'configuracion-documentos', 'documentos-legalizacion-practica', 'reglas-negocio', 'plantillas-monitoria', 'plantillas-practicas', 'ubicaciones'];
  const configViewPermisos = {
    'programas-facultades': ['CFPP'], 'program-detail': ['CFPP'], 'faculty-detail': ['CFPP'],
    'periodos': ['AMGP', 'EPMO', 'GPPR', 'GPMO'],
    'asignaturas': ['CFASIG'],
    'condiciones-curriculares': ['CFCC'],
    'configuracion-documentos': ['CFDL'],
    'documentos-legalizacion-practica': ['CFDL'],
    'reglas-negocio': ['CFOP', 'CFOA'],
    'plantillas-monitoria': ['CFNM'],
    'plantillas-practicas': ['CFNP'],
    'ubicaciones': ['AMLS', 'GPAR']
  };
  useEffect(() => {
    if (vistaActual === 'configuracion-personal' && !hasCFAPER) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (isEstudiante) return;
    const sinPermiso = {
      'roles': !hasRolesAccess,
      'usuarios': !hasAMUS,
      'reportes': !hasAMRE,
      'sucursales': !hasAMSU,
      'entidades': !hasAAME,
      'oportunidades': !hasAMOP,
      'estudiantes': !hasAMPR,
      'legalizaciones': !hasCLPA,
      'monitorias': !hasAMMO
    };
    if (sinPermiso[vistaActual]) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (vistaActual === 'configuracion' && !hasAMCO) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (configViewPermisos[vistaActual]) {
      const permisosRequeridos = configViewPermisos[vistaActual];
      const tieneAlguno = permisosRequeridos.some((p) => hasPermission(p));
      if (!tieneAlguno) navigate('/dashboard/configuracion', { replace: true });
    } else if (configViews.includes(vistaActual) && vistaActual !== 'configuracion' && !hasAMCO) {
      navigate('/dashboard', { replace: true });
    }
  }, [isEstudiante, hasCFAPER, hasRolesAccess, hasAMUS, hasAMRE, hasAMSU, hasAMCO, hasAAME, hasAMOP, hasAMPR, hasCLPA, hasAMMO, vistaActual, navigate, hasPermission]);

  // Esperar a que termine la verificación de autenticación antes de renderizar
  if (authLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Cargando...
      </div>
    );
  }

  // Sincronizar vistaActual con la URL cuando cambia (incluyendo refresh)
  useEffect(() => {
    // Asegurar que la vista se sincronice correctamente después de la autenticación
    if (!authLoading) {
      const nuevaVista = getVistaFromRoute(location.pathname);
      setVistaActual(nuevaVista);
    }
  }, [location.pathname, authLoading]);

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
    }
  });

  // Cargar datos del dashboard (stats) para usuarios no estudiantes
  useEffect(() => {
    if (isEstudiante) return;
    const loadDashboardData = async () => {
      setLoading(true);
      let apiStats = { totalStudents: 0, availableOpportunities: 0, registeredCompanies: 0 };
      try {
        const statsRes = await api.get('/dashboard/stats');
        apiStats = statsRes?.data || apiStats;
      } catch (err) {
        console.error('Error cargando estadísticas del dashboard', err);
      }
      setDashboardData((prev) => ({
        stats: {
          totalStudents: apiStats.totalStudents ?? 0,
          activePractices: prev.stats.activePractices ?? 0,
          availableOpportunities: apiStats.availableOpportunities ?? 0,
          registeredCompanies: apiStats.registeredCompanies ?? 0
        },
        charts: {
          applicationsByMonth: Array.isArray(apiStats.applicationsByMonth) && apiStats.applicationsByMonth.length > 0
            ? apiStats.applicationsByMonth
            : [{ label: 'Sin datos', value: 0 }],
          practiceStatus: prev.charts.practiceStatus,
          applicationTrends: Array.isArray(apiStats.applicationTrends) && apiStats.applicationTrends.length > 1
            ? apiStats.applicationTrends
            : [{ label: 'N/D', value: 0 }, { label: 'N/D', value: 0 }]
        }
      }));
      setLoading(false);
    };

    loadDashboardData();
  }, [isEstudiante]);

  const menuItemsAdmin = [
    { text: 'Usuarios', Icon: FiUsers, vista: 'usuarios' },
    { text: 'Entidades', Icon: HiOutlineOfficeBuilding, vista: 'entidades' },
    { text: 'Oportunidades', Icon: HiOutlineChartPie, vista: 'oportunidades' },
    { text: 'Postulantes', Icon: HiOutlineAcademicCap, vista: 'postulants' },
    { text: 'Estudiantes Habilitados para Prácticas', Icon: HiOutlinePencilAlt, vista: 'estudiantes' },
    { text: 'Legalizaciones de Prácticas', Icon: HiOutlineAcademicCap, vista: 'legalizaciones' },
    { text: 'Legalizaciones de Monitorías', Icon: HiOutlineDocumentText, vista: 'monitorias' },
    { text: 'Roles', Icon: HiOutlineKey, vista: 'roles' },
    { text: 'Sucursales', Icon: HiOutlineBriefcase, vista: 'sucursales' },
    { text: 'Reportes', Icon: HiOutlineChartBar, vista: 'reportes' },
    { text: 'Configuración', Icon: HiOutlineCog, vista: 'configuracion' },
    { text: 'Configuración Personal', Icon: HiOutlineCog, vista: 'configuracion-personal' },
  ];

  const menuItemsEstudiante = [
    { text: 'Inicio', Icon: FiHome, vista: 'dashboard' },
    { text: 'Mi perfil', Icon: FiUser, vista: 'mi-perfil' },
    { text: 'Búsqueda avanzada', Icon: FiSearch, vista: 'busqueda-avanzada' },
    { text: 'Oportunidades de práctica', Icon: FiBookmark, vista: 'oportunidades-practica' },
    { text: 'Oportunidades de monitoría', Icon: HiOutlineAcademicCap, vista: 'oportunidades-monitoria' },
    { text: 'Mis aplicaciones', Icon: FiList, vista: 'mis-aplicaciones' },
    { text: 'Legalizaciones de Prácticas', Icon: HiOutlineAcademicCap, vista: 'legalizaciones' },
    { text: 'Legalizaciones de Monitorías', Icon: HiOutlineDocumentText, vista: 'monitorias' },
    { text: 'Configuración', Icon: HiOutlineCog, vista: 'configuracion-personal' },
  ];

  // Ocultar ítems del menú según permiso de acceso al módulo
  const menuItems = (isEstudiante ? menuItemsEstudiante : menuItemsAdmin).filter((item) => {
        if (item.vista === 'configuracion-personal') return hasCFAPER;
        if (item.vista === 'postulants') return hasAMPO;
        if (item.vista === 'roles') return hasRolesAccess;
        if (item.vista === 'usuarios') return hasAMUS;
        if (item.vista === 'reportes') return hasAMRE;
        if (item.vista === 'sucursales') return hasAMSU;
        if (item.vista === 'configuracion') return hasAMCO;
        if (item.vista === 'entidades') return hasAAME;
        if (item.vista === 'oportunidades') return hasAMOP;
        if (item.vista === 'estudiantes') return hasAMPR;
        if (item.vista === 'legalizaciones') return hasCLPA;
        if (item.vista === 'monitorias') return hasAMMO;
        return true;
      });

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMenuClick = (vista) => {
    if (isEstudiante && vista === 'mi-perfil' && postulantIdMe) {
      navigate(`/dashboard/postulantes/${postulantIdMe}`);
      setMenuOpen(false);
      return;
    }
    const ruta = vistaToRoute[vista] || '/dashboard';
    navigate(ruta);
    setMenuOpen(false);
  };

  const isMenuItemActive = (item) => {
    if (vistaActual === item.vista) return true;
    if (isEstudiante && item.vista === 'mi-perfil' && vistaActual === 'postulant-profile') return true;
    return false;
  };

  const handleVolver = () => {
    navigate('/dashboard');
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <button 
            className="header-logo-btn"
            onClick={() => navigate('/dashboard')}
            title="Ir al Dashboard Principal"
          >
            <img 
              src={headerLogoImg} 
              alt="Universidad del Rosario" 
              className="header-logo"
            />
          </button>
          {{
            'usuarios':                 'Usuarios',
            'entidades':                'Entidades',
            'oportunidades':            'Oportunidades',
            'postulants':               'Postulantes',
            'mi-perfil':                'Mi perfil',
            'busqueda-avanzada':        'Búsqueda avanzada',
            'oportunidades-practica':   'Oportunidades de práctica',
            'oportunidades-monitoria':  'Oportunidades de monitoría',
            'mis-aplicaciones':         'Mis aplicaciones',
            'estudiantes':              'Estudiantes Habilitados para Prácticas',
            'legalizaciones':           'Legalizaciones de Prácticas',
            'monitorias':               'Legalizaciones de Monitorías',
            'monitorias-detalle':       'Detalle de la oportunidad — Legalización',
            'monitorias-revision':      'Revisión de legalización MTM',
            'monitorias-plan':          'Plan de trabajo MTM',
            'monitorias-seguimientos':  'Seguimientos MTM',
            'roles':                    'Gestión de Roles',
            'sucursales':               'Sucursales',
            'reportes':                 'Reportes',
            'configuracion':            'Configuración',
            'configuracion-personal':   'Configuración Personal',
            'periodos':                 'Gestión de Períodos',
            'asignaturas':              'Configuración de Asignaturas',
            'configuracion-documentos': 'Parametrización de Documentos',
            'documentos-legalizacion-practica': 'Documentos legalización práctica',
            'reglas-negocio':           'Reglas de negocio',
            'programas-facultades':     'Programas y Facultades',
            'faculty-detail':           'Detalle de Facultad',
            'condiciones-curriculares': 'Condiciones Curriculares',
            'ubicaciones':              'Ubicaciones',
            'plantillas-monitoria':     'Plantillas de notificaciones de monitorías',
            'plantillas-practicas':     'Plantillas de notificaciones de Prácticas',
          }[vistaActual] && (
            <h1 className="header-page-title">
              {{
                'usuarios':                 'Usuarios',
                'entidades':                'Entidades',
                'oportunidades':            'Oportunidades',
                'postulants':               'Postulantes',
                'mi-perfil':                'Mi perfil de postulante',
                'busqueda-avanzada':        'Búsqueda avanzada',
                'oportunidades-practica':   'Oportunidades de práctica',
                'oportunidades-monitoria':  'Oportunidades de monitoría',
                'mis-aplicaciones':         'Mis aplicaciones',
                'estudiantes':              'Estudiantes Habilitados para Prácticas',
                'legalizaciones':           'Legalizaciones de Prácticas',
                'monitorias':               'Legalizaciones de Monitorías',
                'monitorias-detalle':       'Detalle de la oportunidad — Legalización',
                'monitorias-revision':      'Revisión de legalización MTM',
                'monitorias-plan':          'Plan de trabajo MTM',
                'monitorias-seguimientos':  'Seguimientos MTM',
                'roles':                    'Gestión de Roles',
                'sucursales':               'Sucursales',
                'reportes':                 'Reportes',
                'configuracion':            'Configuración',
                'configuracion-personal':   'Configuración Personal',
                'periodos':                 'Gestión de Períodos',
                'asignaturas':              'Configuración de Asignaturas',
                'configuracion-documentos': 'Parametrización de Documentos',
                'documentos-legalizacion-practica': 'Documentos legalización práctica',
                'reglas-negocio':           'Reglas de negocio',
                'programas-facultades':     'Programas y Facultades',
                'faculty-detail':           'Detalle de Facultad',
                'condiciones-curriculares': 'Condiciones Curriculares',
                'ubicaciones':              'Ubicaciones',
                'plantillas-monitoria':     'Plantillas de notificaciones de monitorías',
                'plantillas-practicas':     'Plantillas de notificaciones de Prácticas',
              }[vistaActual]}
            </h1>
          )}
        </div>
        <div className="header-right">
          <div className="user-info">
            <div className="user-avatar">
              <img 
                src={userAvatarImg} 
                alt="User" 
                className="avatar-img"
              />
            </div>
            <div className="user-details">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{isEstudiante ? 'Postulante' : (user?.role || '')}</span>
              {/* Sucursales/Sede ocultos visualmente; datos y rutas se mantienen */}
              {!HIDE_SUCURSALES_UI && (user?.sucursales?.length > 0 || sedeUsuario?.length > 0) && (
                <span className="user-sede" title="Sede(s)">
                  Sede: {(user?.sucursales || sedeUsuario || []).map((s) => s.nombre).filter(Boolean).join(', ') || '—'}
                </span>
              )}
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
          {menuItems.filter((item) => !HIDE_SUCURSALES_UI || item.vista !== 'sucursales').map((item, index) => {
            const IconComponent = item.Icon;
            const active = isMenuItemActive(item);
            return (
              <a 
                key={index} 
                href="#" 
                className={`menu-item ${active ? 'active' : ''}`}
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
            {isEstudiante ? (
              <HomeEstudiante />
            ) : (
              <>
            <div className="dashboard-welcome">
              <h2>Bienvenido/a, {user?.name}</h2>
              <p>Aquí tienes un resumen de la actividad del sistema de gestión de prácticas</p>
            </div>

            <div className="dashboard-stats">
              {hasDASH_EST && (
                <StatCard
                  title="Total Estudiantes"
                  value={dashboardData.stats.totalStudents.toLocaleString()}
                  change="+12%"
                  changeType="positive"
                  icon={FiUsers}
                  color="primary"
                  loading={loading}
                />
              )}
              {hasDASH_PRA && (
                <StatCard
                  title="Prácticas Activas"
                  value={dashboardData.stats.activePractices}
                  change="+5%"
                  changeType="positive"
                  icon={FiCheckCircle}
                  color="success"
                  loading={loading}
                />
              )}
              {hasDASH_OPO && (
                <StatCard
                  title="Oportunidades Disponibles"
                  value={dashboardData.stats.availableOpportunities}
                  change="-2%"
                  changeType="negative"
                  icon={HiOutlineChartPie}
                  color="warning"
                  loading={loading}
                />
              )}
              {hasDASH_EMP && (
                <StatCard
                  title="Empresas Registradas"
                  value={dashboardData.stats.registeredCompanies}
                  change="+8%"
                  changeType="positive"
                  icon={HiOutlineOfficeBuilding}
                  color="info"
                  loading={loading}
                />
              )}
            </div>
            <div className="dashboard-charts">
              {hasDASH_POS && (
                <SimpleChart
                  title="Postulaciones por Mes"
                  data={dashboardData.charts.applicationsByMonth}
                  type="bar"
                  height={250}
                  loading={loading}
                />
              )}
              {hasDASH_EDP && (
                <SimpleChart
                  title="Estado de Prácticas"
                  data={dashboardData.charts.practiceStatus}
                  type="pie"
                  height={250}
                  loading={loading}
                />
              )}
              {hasDASH_TEN && (
                <SimpleChart
                  title="Tendencia de Postulaciones"
                  data={dashboardData.charts.applicationTrends}
                  type="line"
                  height={250}
                  loading={loading}
                />
              )}
            </div>
              </>
            )}
          </div>
        )}
        {vistaActual === 'mi-perfil' && (
          <div className="dashboard-content" style={{ padding: '2rem' }}>
            {!postulantMeLoaded ? (
              <p>Cargando su perfil...</p>
            ) : postulantIdMe ? (
              <p>Redirigiendo a su perfil...</p>
            ) : (
              <div className="dashboard-welcome">
                <h2>Sin perfil de postulante</h2>
                <p>No tiene un perfil de postulante asociado a su cuenta. Contacte al administrador para completar su registro.</p>
              </div>
            )}
          </div>
        )}
        {vistaActual === 'busqueda-avanzada' && (
          <div className="dashboard-content">
            <div className="dashboard-welcome">
              <h2>Búsqueda avanzada</h2>
              <p>Busque ofertas de práctica por criterios avanzados. Esta sección estará disponible próximamente.</p>
            </div>
          </div>
        )}
        {vistaActual === 'oportunidades-practica' && (
          <OfertasAfines />
        )}
        {vistaActual === 'oportunidades-monitoria' && (
          <OfertasMonitoria />
        )}
        {vistaActual === 'mis-aplicaciones' && (
          <MisAplicaciones />
        )}
        {vistaActual === 'legalizaciones' && (
          <div className="dashboard-content">
            <div className="dashboard-welcome">
              <h2>Legalizaciones de Prácticas</h2>
              <p>Gestión de legalizaciones de prácticas. Esta sección estará disponible próximamente.</p>
            </div>
          </div>
        )}
        {/* Legalizaciones de monitorías: estudiante ve sus aceptadas y su detalle; admin ve listado y revisión (otro componente) */}
        {vistaActual === 'monitorias' && isEstudiante && <LegalizacionesMonitorias />}
        {vistaActual === 'monitorias' && !isEstudiante && <AdminLegalizacionMonitorias />}
        {vistaActual === 'monitorias-detalle' && isEstudiante && (
          <DetalleLegalizacionMTM onVolver={() => navigate('/dashboard/monitorias')} />
        )}
        {vistaActual === 'monitorias-detalle' && !isEstudiante && (
          <div className="dashboard-content">
            <div className="dashboard-welcome">
              <p>Use la vista de revisión desde el listado de legalizaciones.</p>
              <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard/monitorias')}>Ir al listado</button>
            </div>
          </div>
        )}
        {vistaActual === 'monitorias-revision' && (
          <AdminDetalleLegalizacionMTM onVolver={() => navigate('/dashboard/monitorias')} />
        )}
        {vistaActual === 'monitorias-plan' && isEstudiante && (
          <PlanDeTrabajoMTM onVolver={() => navigate('/dashboard/monitorias')} />
        )}
        {vistaActual === 'monitorias-plan' && !isEstudiante && (
          <div className="dashboard-content">
            <div className="dashboard-welcome">
              <p>El plan de trabajo se gestiona desde la vista del estudiante.</p>
              <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard/monitorias')}>Ir al listado</button>
            </div>
          </div>
        )}
        {vistaActual === 'monitorias-seguimientos' && (
          <SeguimientosMTM onVolver={() => navigate('/dashboard/monitorias')} />
        )}
        {vistaActual === 'configuracion-personal' && (
          hasCFAPER
            ? (isEstudiante
                ? <ConfiguracionEstudiante onVolver={handleVolver} />
                : <ConfiguracionPersonal onVolver={handleVolver} />)
            : (
                <div className="dashboard-content" style={{ padding: '2rem' }}>
                  <p>No tiene permiso para acceder a Configuración personal.</p>
                  <button type="button" className="btn btn-primary" onClick={() => setVistaActual('dashboard')}>Volver al inicio</button>
                </div>
              )
        )}
        {vistaActual === 'configuracion' && (
          <Configuracion onVolver={handleVolver} />
        )}
        {vistaActual === 'entidades' && (
          <Companies onVolver={handleVolver} />
        )}
        {vistaActual === 'reportes' && (
          <Reportes onVolver={handleVolver} />
        )}
        {vistaActual === 'roles' && (
          <Roles onVolver={handleVolver} />)}
        {vistaActual === 'usuarios' && (
         <Users onVolver={handleVolver} />
        )}
        {vistaActual === 'sucursales' && (
          <Sucursales onVolver={handleVolver} />
        )}
        {vistaActual === 'oportunidades' && (
          <Oportunidades onVolver={handleVolver} />
        )}
        {vistaActual === 'postulants' && !isEstudiante && (
          <Postulants onVolver={handleVolver} />
        )}
        {vistaActual === 'postulants-log' && (
          <PostulantStatusLog onVolver={() => navigate('/dashboard/postulants')} />
        )}
        {vistaActual === 'postulants-document-log' && (
          <PostulantDocumentLog onVolver={() => navigate('/dashboard/postulants')} />
        )}
        {vistaActual === 'postulant-profile' && (
          <PostulantProfile onVolver={handleVolver} />
        )}
        {vistaActual === 'estudiantes' && (
          <Student onVolver={handleVolver} />
        )}
        {vistaActual === 'ubicaciones' && (
          <Ubicaciones onVolver={handleVolver} />
        )}
        {vistaActual === 'programas-facultades' && (
          <ProgramasYFacultades onVolver={() => navigate('/dashboard/configuracion')} />
        )}
        {vistaActual === 'program-detail' && (
          <ProgramDetail onVolver={() => navigate('/dashboard/programas-facultades')} />
        )}
        {vistaActual === 'faculty-detail' && (
          <FacultyDetail onVolver={() => navigate('/dashboard/programas-facultades?tab=facultades')} />
        )}
        {vistaActual === 'periodos' && (
          <Periodos onVolver={() => navigate('/dashboard/configuracion')} />
        )}
        {vistaActual === 'asignaturas' && (
          <ConfiguracionAsignaturas onVolver={() => navigate('/dashboard/configuracion')} />
        )}
        {vistaActual === 'condiciones-curriculares' && (
          <CondicionesCurriculares onVolver={() => navigate('/dashboard/configuracion')} />
        )}
        {vistaActual === 'configuracion-documentos' && (
          <ParametrizacionDocumentos onVolver={() => navigate('/dashboard/configuracion')} />
        )}
        {vistaActual === 'documentos-legalizacion-practica' && (
          <DocumentosLegalizacionPractica onVolver={() => navigate('/dashboard/configuracion')} />
        )}
        {vistaActual === 'reglas-negocio' && (
          <ReglasNegocio onVolver={() => navigate('/dashboard/configuracion')} />
        )}
        {vistaActual === 'plantillas-monitoria' && (
          <NotificacionMonitorias onVolver={() => navigate('/dashboard/configuracion')} />
        )}
        {vistaActual === 'plantillas-practicas' && (
          <NotificacionPracticas onVolver={() => navigate('/dashboard/configuracion')} />
        )}

      {/* ELIMINA O COMENTA ESTA SECCIÓN */}
{/* 
{vistaActual !== 'dashboard' && vistaActual !== 'configuracion-personal' && vistaActual !== 'configuracion' && vistaActual !== 'reportes' && (
  <div className="welcome-section">
    <h2>{vistaActual.charAt(0).toUpperCase() + vistaActual.slice(1).replace('-', ' ')}</h2>
    <p>Esta sección está en desarrollo...</p>
  </div>
)}
*/}
        
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <span className="footer-link">URJOBS 2.0</span>
        <span className="footer-text">@2025 Powered by JoinUp SAS - All Rights Reserved</span>
      </footer>
    </div>
  );
}
