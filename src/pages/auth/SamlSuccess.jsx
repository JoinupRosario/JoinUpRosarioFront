import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import Swal from 'sweetalert2';

export default function SamlSuccess() {
  const [searchParams] = useSearchParams();
  const { loginWithToken, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [debugLog, setDebugLog] = useState([]);

  const log = (msg) => {
    console.log('[SAML-SUCCESS]', msg);
    setDebugLog(prev => [...prev, `${new Date().toISOString().slice(11,23)} — ${msg}`]);
  };

  useEffect(() => {
    const processSamlToken = async () => {
      const token = searchParams.get('token');
      const errorParam = searchParams.get('error');
      const msgParam = searchParams.get('msg');

      log(`Iniciando — token: ${token ? token.slice(0,20)+'…' : 'NINGUNO'}, error: ${errorParam || 'ninguno'}`);

      if (errorParam) {
        const messages = {
          saml_unauthorized: msgParam
            ? decodeURIComponent(msgParam)
            : 'No tienes acceso a esta plataforma. Contacta al administrador.',
          saml_error: `Error SAML: ${msgParam ? decodeURIComponent(msgParam) : 'desconocido'}`,
          saml_session_error: 'Error al iniciar la sesión. Intenta de nuevo.',
        };
        setError(messages[errorParam] || 'Error desconocido en la autenticación.');
        setTimeout(() => navigate('/login', { replace: true }), 6000);
        return;
      }

      if (!token) {
        log('ERROR: no hay token en la URL');
        setError('No se recibió token de autenticación. Redirigiendo...');
        setTimeout(() => navigate('/login', { replace: true }), 3000);
        return;
      }

      try {
        localStorage.setItem('token', token);
        log('Token guardado en localStorage');

        // Retry con backoff: cubre cold starts de Vercel serverless
        let user = null;
        const delays = [0, 1500, 3000, 5000];
        for (let i = 0; i < delays.length; i++) {
          if (delays[i] > 0) {
            log(`Esperando ${delays[i]}ms antes del intento ${i + 1}…`);
            await new Promise(r => setTimeout(r, delays[i]));
          }
          try {
            log(`Intento ${i + 1}: GET /users/profile…`);
            const response = await api.get('/users/profile');
            user = response.data;
            log(`Perfil OK — modulo: ${user.modulo}, email: ${user.email}`);
            break;
          } catch (retryErr) {
            const status = retryErr.response?.status || 'network/timeout';
            log(`Intento ${i + 1} FALLÓ — status: ${status}, msg: ${retryErr.message}`);
            if (i === delays.length - 1) throw retryErr;
          }
        }

        log('Llamando loginWithToken…');
        await loginWithToken(token, user);
        log(`loginWithToken OK — modulo: ${user.modulo}`);

        if (user.modulo === 'administrativo') {
          log('Redirigiendo a /dashboard');
          navigate('/dashboard', { replace: true });
        } else {
          log(`Módulo "${user.modulo}" no disponible — mostrando aviso`);
          await Swal.fire({
            icon: 'info',
            title: 'Módulo en construcción',
            html: 'Tu módulo estará disponible próximamente.<br/>Gracias por tu paciencia.',
            confirmButtonColor: '#c41e3a',
            confirmButtonText: 'Entendido',
          });
          logout();
          navigate('/login', { replace: true });
        }
      } catch (err) {
        const status = err.response?.status || 'network/timeout';
        const msg = err.response?.data?.message || err.message || 'desconocido';
        log(`ERROR FINAL — status: ${status}, mensaje: ${msg}`);
        localStorage.removeItem('token');
        setError(`Error al cargar tu perfil (${status}: ${msg}). Redirigiendo…`);
        setTimeout(() => navigate('/login', { replace: true }), 6000);
      }
    };

    processSamlToken();
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5',
      fontFamily: 'sans-serif', padding: 20,
    }}>
      <div style={{
        background: 'white', padding: '40px 50px', borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)', textAlign: 'center',
        maxWidth: '520px', width: '100%',
      }}>
        {error ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ color: '#c41e3a', marginBottom: '12px', fontSize: '20px' }}>Acceso no permitido</h2>
            <p style={{ color: '#555', lineHeight: '1.6', marginBottom: '16px' }}>{error}</p>
            <p style={{ color: '#999', fontSize: '13px' }}>Serás redirigido al login en unos segundos...</p>
          </>
        ) : (
          <>
            <div style={{
              width: '50px', height: '50px', border: '5px solid #e0e0e0',
              borderTop: '5px solid #c41e3a', borderRadius: '50%',
              animation: 'spin 0.9s linear infinite', margin: '0 auto 24px',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <h2 style={{ color: '#333', marginBottom: '10px', fontSize: '20px' }}>Autenticando...</h2>
            <p style={{ color: '#777', fontSize: '14px' }}>Verificando tu cuenta institucional. Por favor espera.</p>
          </>
        )}

        {/* Log de diagnóstico temporal — visible en pantalla */}
        {debugLog.length > 0 && (
          <div style={{
            marginTop: 24, textAlign: 'left', background: '#0f172a',
            borderRadius: 8, padding: '12px 16px', maxHeight: 200, overflowY: 'auto',
          }}>
            {debugLog.map((line, i) => (
              <div key={i} style={{
                fontFamily: 'monospace', fontSize: 11, color: line.includes('FALLÓ') || line.includes('ERROR') ? '#f87171' : '#86efac',
                lineHeight: '1.7',
              }}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
