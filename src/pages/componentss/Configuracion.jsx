import { 
  FiFileText, 
  FiBell, 
  FiSettings, 
  FiMail, 
  FiClock, 
  FiRefreshCw,
  FiArrowLeft,
  FiMapPin,
  FiBook
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../styles/Configuracion.css';

export default function Configuracion({ onVolver }) {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canAMCO = hasPermission('AMCO');

  const handleOptionClick = (opcion) => {
    if (opcion.text === 'Gestión de Parámetros') {
      navigate('/dashboard/ubicaciones');
    }
    if (opcion.text === 'Facultades y Programas') {
      navigate('/dashboard/programas-facultades');
    }
    if (opcion.text === 'Gestión de periodos para prácticas') {
      navigate('/dashboard/periodos?tipo=practica');
    }
    if (opcion.text === 'Gestión de periodos para monitorías') {
      navigate('/dashboard/periodos?tipo=monitoria');
    }
    if (opcion.text === 'Configuración Asignaturas') {
      navigate('/dashboard/asignaturas');
    }
    if (opcion.text === 'Condiciones Curriculares para Práctica') {
      navigate('/dashboard/condiciones-curriculares');
    }
    if (opcion.text === 'Parametrización de documentos') {
      navigate('/dashboard/configuracion-documentos');
    }
    if (opcion.text === 'Documentos para legalizar práctica académica') {
      navigate('/dashboard/documentos-legalizacion-practica');
    }
    if (opcion.text === 'Documentos para legalizar monitorías') {
      navigate('/dashboard/documentos-legalizacion-monitoria');
    }
    if (opcion.text === 'Configurar reglas de negocio') {
      navigate('/dashboard/reglas-negocio');
    }
    if (opcion.text === 'Plantillas de notificaciones de monitorías') {
      navigate('/dashboard/plantillas-notificacion-monitoria');
    }
    if (opcion.text === 'Plantillas de notificaciones de Prácticas') {
      navigate('/dashboard/plantillas-notificacion-practicas');
    }
    if (opcion.text === 'Plantillas de evaluación MTM') {
      navigate('/dashboard/surveys-mtm');
    }
  };
  const opcionesConfiguracion = [
    { text: 'Facultades y Programas', icon: FiFileText, descripcion: 'Gestionar facultades y programas académicos', permiso: 'CFPP' },
    { text: 'Configuración de alertas', icon: FiBell, descripcion: 'Configurar alertas del sistema', permiso: 'CFAL' },
    { text: 'Reglas por oportunidad para postulantes', icon: FiSettings, descripcion: 'Definir reglas para postulantes', permiso: 'CFOP' },
    { text: 'Reglas por oportunidad para administradores', icon: FiSettings, descripcion: 'Definir reglas para administradores', permiso: 'CFOA' },
    { text: 'Condiciones Curriculares para Práctica', icon: FiSettings, descripcion: 'Configurar condiciones curriculares', permiso: 'CFCC' },
    { text: 'Plantillas de notificaciones', icon: FiMail, descripcion: 'Gestionar plantillas de notificaciones', permiso: 'CFNG' },
    { text: 'Plantillas de notificaciones de monitorías', icon: FiMail, descripcion: 'Plantillas para notificaciones de monitorías', permiso: 'CFNM' },
    { text: 'Plantillas de notificaciones de Prácticas', icon: FiMail, descripcion: 'Plantillas de prácticas y oportunidad, más eventos generales (entidad, tutores, credenciales)', permiso: 'CFNP' },
    { text: 'Gestión de periodos para prácticas', icon: FiClock, descripcion: 'Parametrización de período académico para prácticas (RQ 4.3)', permiso: 'GPPR' },
    { text: 'Gestión de periodos para monitorías', icon: FiClock, descripcion: 'Parametrización de período académico para monitorías (RQ 4.2.1)', permiso: 'GPMO' },
    { text: 'Gestión de estados para prácticas académicas', icon: FiRefreshCw, descripcion: 'Gestionar estados de prácticas', permiso: 'GEPA' },
    { text: 'Documentos para legalizar práctica académica', icon: FiFileText, descripcion: 'Documentos requeridos para legalización', permiso: 'CDDP' },
    { text: 'Documentos para legalizar monitorías', icon: FiFileText, descripcion: 'Documentos requeridos para legalización de monitorías', permiso: 'CDDM' },
    { text: 'Gestión de Parámetros', icon: FiMapPin, descripcion: 'Gestionar tipos de documento, niveles de estudio, dedicación, ARLs y otros parámetros del sistema', permiso: 'GPAR' },
    { text: 'Configurar reglas de negocio', icon: FiSettings, descripcion: 'Vencimientos, MTM, apoyo económico, programa/tipo de práctica (URJOBS) y otras reglas', permiso: 'CFOP' },
    { text: 'Configuración Asignaturas', icon: FiBook, descripcion: 'Cargar y gestionar asignaturas ofertadas desde el servidor SFTP (ASIGNATURAS_OFERTADAS_UXXI)', permiso: 'CFASIG' },
    { text: 'Parametrización de documentos', icon: FiFileText, descripcion: 'Configurar formatos y tipos de documentos (hoja de vida y otros que se requieran)', permiso: 'CFDL' },
    { text: 'Plantillas de evaluación MTM', icon: FiFileText, descripcion: 'Diseñar formularios para autoevaluación del monitor, evaluación de estudiantes y evaluación del profesor (HU011)', permiso: 'CESM' }
  ];

  const opcionesClickables = ['Gestión de Parámetros', 'Configurar reglas de negocio', 'Facultades y Programas', 'Gestión de periodos para prácticas', 'Gestión de periodos para monitorías', 'Configuración Asignaturas', 'Condiciones Curriculares para Práctica', 'Parametrización de documentos', 'Documentos para legalizar práctica académica', 'Documentos para legalizar monitorías', 'Plantillas de notificaciones de monitorías', 'Plantillas de notificaciones de Prácticas', 'Plantillas de evaluación MTM'];

  if (!canAMCO) {
    return (
      <div className="configuracion-content">
        <div className="configuracion-section">
          <p className="configuracion-sin-permiso">No tiene permiso para acceder a Configuración (AMCO).</p>
          <button className="btn-volver" onClick={onVolver}>
            <FiArrowLeft className="btn-icon" />
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="configuracion-content">
      <div className="configuracion-section">
        <div className="configuracion-header">
          <button className="btn-volver" onClick={onVolver}>
            <FiArrowLeft className="btn-icon" />
            Volver
          </button>
          <div className="section-header">
            <h3>CONFIGURACIÓN</h3>
          </div>
        </div>

        <div className="configuracion-list">
          {opcionesConfiguracion
            .filter((opcion) => opcion.permiso && hasPermission(opcion.permiso))
            .map((opcion, index) => {
              const IconComponent = opcion.icon;
              const isClickable = opcionesClickables.includes(opcion.text);
              return (
                <div
                  key={index}
                  className={`configuracion-item ${isClickable ? 'clickable' : ''}`}
                  onClick={() => isClickable && handleOptionClick(opcion)}
                  style={isClickable ? { cursor: 'pointer' } : {}}
                >
                  <div className="configuracion-icon">
                    <IconComponent />
                  </div>
                  <div className="configuracion-info">
                    <h4 className="configuracion-title">{opcion.text}</h4>
                    <p className="configuracion-descripcion">{opcion.descripcion}</p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
