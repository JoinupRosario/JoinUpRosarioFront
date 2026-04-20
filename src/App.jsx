import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/auth/Login';
import SamlSuccess from './pages/auth/SamlSuccess';
import Dashboard from './pages/Dashboard';
import DashboardEntidad from './pages/entidad/DashboardEntidad';
import AsistenciaMTMPublic from './pages/AsistenciaMTMPublic';
import FirmaAcuerdoPracticaPublic from './pages/FirmaAcuerdoPracticaPublic';
import CertificacionPracticaPublic from './pages/CertificacionPracticaPublic';
import EvaluacionMTMPublic from './pages/EvaluacionMTMPublic';
import ErrorBoundary from './components/common/ErrorBoundary';
import './App.css';

// Componente para rutas protegidas
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
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

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

/**
 * Redirección "raíz" de la app: dependiendo del módulo del usuario autenticado
 * lo manda al dashboard que le corresponde.
 *  - entidades  → /entidad
 *  - resto      → /dashboard
 *  - sin sesión → /login
 */
const RootRedirect = () => {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const mod = user?.modulo != null ? String(user.modulo).trim().toLowerCase() : '';
  if (mod === 'entidades') return <Navigate to="/entidad" replace />;
  return <Navigate to="/dashboard" replace />;
};

// Componente principal de la aplicación
function AppContent() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/saml-success" element={<SamlSuccess />} />
        <Route path="/asistencia-mtm/:token" element={<AsistenciaMTMPublic />} />
        <Route path="/firma-acuerdo-practica/:token" element={<FirmaAcuerdoPracticaPublic />} />
        <Route path="/certificacion-practica/:token" element={<CertificacionPracticaPublic />} />
        <Route path="/evaluacion-mtm/responder/:token" element={<EvaluacionMTMPublic />} />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/entidad/*"
          element={
            <ProtectedRoute>
              <DashboardEntidad />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<RootRedirect />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;