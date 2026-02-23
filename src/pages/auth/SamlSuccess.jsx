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

  useEffect(() => {
    const processSamlToken = async () => {
      const token = searchParams.get('token');
      const errorParam = searchParams.get('error');
      const msgParam = searchParams.get('msg');

      if (errorParam) {
        const messages = {
          saml_unauthorized: msgParam
            ? decodeURIComponent(msgParam)
            : 'No tienes acceso a esta plataforma. Contacta al administrador.',
          saml_error: 'Ocurrió un error durante la autenticación institucional.',
          saml_session_error: 'Error al iniciar la sesión. Intenta de nuevo.',
        };
        setError(messages[errorParam] || 'Error desconocido en la autenticación.');
        setTimeout(() => navigate('/login', { replace: true }), 4000);
        return;
      }

      if (!token) {
        setError('No se recibió token de autenticación. Redirigiendo...');
        setTimeout(() => navigate('/login', { replace: true }), 3000);
        return;
      }

      try {
        localStorage.setItem('token', token);

        // Retry con backoff: el primer intento post-SAML puede topar con un cold start
        // en Vercel serverless. Reintentamos hasta 4 veces antes de rendirse.
        let user = null;
        const delays = [0, 1500, 3000, 5000];
        for (let i = 0; i < delays.length; i++) {
          if (delays[i] > 0) await new Promise(r => setTimeout(r, delays[i]));
          try {
            const response = await api.get('/users/profile');
            user = response.data;
            break;
          } catch (retryErr) {
            if (i === delays.length - 1) throw retryErr; // último intento → propagar error
            console.warn(`[SAML] Intento ${i + 1} fallido al obtener perfil, reintentando...`);
          }
        }

        loginWithToken(token, user);

        if (user.modulo === 'administrativo') {
          navigate('/dashboard', { replace: true });
        } else {
          // Módulo aún no disponible (estudiante, etc.)
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
        console.error('[SAML] Error obteniendo perfil:', err);
        localStorage.removeItem('token');
        setError('Error al cargar tu perfil. Redirigiendo al login...');
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    };

    processSamlToken();
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'sans-serif',
    }}>
      <div style={{
        background: 'white',
        padding: '40px 50px',
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '420px',
        width: '90%',
      }}>
        {error ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ color: '#c41e3a', marginBottom: '12px', fontSize: '20px' }}>
              Acceso no permitido
            </h2>
            <p style={{ color: '#555', lineHeight: '1.6', marginBottom: '16px' }}>
              {error}
            </p>
            <p style={{ color: '#999', fontSize: '13px' }}>
              Serás redirigido al login en unos segundos...
            </p>
          </>
        ) : (
          <>
            <div style={{
              width: '50px',
              height: '50px',
              border: '5px solid #e0e0e0',
              borderTop: '5px solid #c41e3a',
              borderRadius: '50%',
              animation: 'spin 0.9s linear infinite',
              margin: '0 auto 24px',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <h2 style={{ color: '#333', marginBottom: '10px', fontSize: '20px' }}>
              Autenticando...
            </h2>
            <p style={{ color: '#777', fontSize: '14px' }}>
              Verificando tu cuenta institucional. Por favor espera.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
