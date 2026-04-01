import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/auth/Login';
import SamlSuccess from './pages/auth/SamlSuccess';
import Dashboard from './pages/Dashboard';
import AsistenciaMTMPublic from './pages/AsistenciaMTMPublic';
import FirmaAcuerdoPracticaPublic from './pages/FirmaAcuerdoPracticaPublic';
import CertificacionPracticaPublic from './pages/CertificacionPracticaPublic';
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
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
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