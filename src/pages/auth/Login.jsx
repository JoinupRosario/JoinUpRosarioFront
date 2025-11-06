import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';
// Importar imágenes
import arquitectonicoImg from '../../assets/images/login/arquitectonico.jpg';
import logoRosarioImg from '../../assets/images/login/logodesarrollorosario370.png';
import logoURjobsImg from '../../assets/images/login/URjobs-oscuro.jpg';
import logoHCMImg from '../../assets/images/login/logohcm.png';
import logoSPEImg from '../../assets/images/login/spe.png';
import userIconImg from '../../assets/images/login/user.png';
import keysIconImg from '../../assets/images/login/keys.png';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState('es');

  const { login } = useAuth();
  const navigate = useNavigate();

  // Textos traducidos
  const translations = {
    es: {
      users: 'USUARIOS',
      entity: 'ENTIDAD',
      universityLogin: 'Ingresar como Comunidad Universitaria',
      forgotUser: 'Olvidó su usuario',
      forgotPassword: 'Olvidó su contraseña',
      downloadStudent: 'Descargue aquí el instructivo para estudiantes',
      downloadCompany: 'Descargue aquí el instructivo para empresas',
      userPlaceholder: 'Usuario',
      passwordPlaceholder: 'Contraseña',
      loginButton: 'Ingreso',
      loading: 'Cargando...',
      registerEntity: 'Registre su entidad',
      recoverPassword: 'Recupere su contraseña',
      dataPolicy: 'Política de tratamiento de datos personales',
      city: 'Bogotá',
      service: 'Vinculado a la red de prestadores del Servicio Público de Empleo.',
      resolution: 'Autorizado por la Resolución 439 de 2018'
    },
    en: {
      users: 'USERS',
      entity: 'ENTITY',
      universityLogin: 'Login as University Community',
      forgotUser: 'Forgot your username',
      forgotPassword: 'Forgot your password',
      downloadStudent: 'Download the student guide here',
      downloadCompany: 'Download the company guide here',
      userPlaceholder: 'Username',
      passwordPlaceholder: 'Password',
      loginButton: 'Login',
      loading: 'Loading...',
      registerEntity: 'Register your entity',
      recoverPassword: 'Recover your password',
      dataPolicy: 'Personal data processing policy',
      city: 'Bogotá',
      service: 'Linked to the network of Public Employment Service providers.',
      resolution: 'Authorized by Resolution 439 of 2018'
    }
  };

  const t = translations[language];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData.email, formData.password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  const cssVars = {
    '--user-icon': `url(${userIconImg})`,
    '--keys-icon': `url(${keysIconImg})`
  };

  return (
    <div 
      className="login-container"
      style={cssVars}
    >
      {/* Sección principal */}
      <div className="main-content">
        {/* Lado izquierdo - Imagen de fondo */}
        <div className="left-section">
          <img 
            src={arquitectonicoImg} 
            alt="Patio Universidad del Rosario" 
            className="background-image"
          />
        </div>

        {/* Lado derecho - Formulario de login */}
        <div className="right-section">
          {/* Header con logos */}
          <div className="login-header">
            <div className="header-left">
              <img 
                src={logoRosarioImg} 
                alt="Universidad del Rosario" 
                className="ur-logo"
              />
            </div>
            <div className="header-right">
              <img 
                src={logoURjobsImg} 
                alt="UR JOBS" 
                className="urjobs-logo"
              />
            </div>
          </div>

          {/* Formulario */}
          <div className="login-form">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* Sección USUARIOS */}
            <div className="form-section">
              <h2 className="section-title">{t.users}</h2>
              <button className="university-login-btn">
                {t.universityLogin}
              </button>
              <div className="links">
                <a href="#" className="link">{t.forgotUser}</a>
                <a href="#" className="link">{t.forgotPassword}</a>
                <a href="https://storage.googleapis.com/joinup-rosario-prod/public/Instructivo_Practicas_Pasantias_UR_Estudiantes.pdf" target="_blank" rel="noopener noreferrer" className="link">{t.downloadStudent}</a>
              </div>
            </div>

            {/* Sección ENTIDAD */}
            <div className="form-section">
              <h2 className="section-title">{t.entity}</h2>
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <div className="input-field user-field">
                    <input
                      type="text"
                      name="email"
                      placeholder={t.userPlaceholder}
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="input-field password-field">
                    <input
                      type="password"
                      name="password"
                      placeholder={t.passwordPlaceholder}
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <button type="submit" className="login-btn" disabled={loading}>
                    {loading ? t.loading : t.loginButton}
                  </button>
                </div>
              </form>
              <div className="links">
                <a href="#" className="link">{t.registerEntity}</a>
                <a href="#" className="link">{t.recoverPassword}</a>
                <a href="https://storage.googleapis.com/joinup-rosario-prod/public/Instructivo_Practicas_Pasantias_UR_Entidades_V4.pdf" target="_blank" rel="noopener noreferrer" className="link">{t.downloadCompany}</a>
              </div>
            </div>
          </div>

          {/* Política de datos */}
          <div className="policy-section">
            <a href="https://repository.urosario.edu.co/server/api/core/bitstreams/79f9bc01-3363-455a-bd5c-11da864f2fc3/content?sequence=12" target="_blank" rel="noopener noreferrer" className="policy-link">{t.dataPolicy}</a>
          </div>

          {/* Información de contacto */}
          <div className="contact-info">
            <p><strong>{t.city}</strong></p>
            <p>urjobs@urosario.edu.co</p>
            <p>Tel.:57 601 2970200 Ext.: 3244-2373-2330-2319-2364</p>
          </div>

          {/* Footer con logos institucionales */}
          <div className="login-footer">
            <div className="footer-logos">
              <img 
                src={logoHCMImg} 
                alt="HCM" 
                className="footer-logo logohcm"
              />
              <img 
                src={logoSPEImg} 
                alt="SPE" 
                className="footer-logo logospe"
              />
            </div>
            <div className="footer-text">
              <p>{t.service}</p>
              <p>{t.resolution}</p>
            </div>
          </div>

          {/* Copyright y selector de idioma */}
          <div className="copyright-section">
            <div className="language-selector">
              <span className="language-label">Lenguaje:</span>
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
                className="language-select"
              >
                <option value="es">es</option>
                <option value="en">en</option>
              </select>
            </div>
            <div className="copyright-text">
              <p>@2025 Powered by JoinUp SAS - All Rights Reserved</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

