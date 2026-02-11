import { 
  FiFileText, 
  FiBell, 
  FiSettings, 
  FiMail, 
  FiClock, 
  FiRefreshCw,
  FiArrowLeft,
  FiMapPin
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import '../styles/Configuracion.css';

export default function Configuracion({ onVolver }) {
  const navigate = useNavigate();

  const handleOptionClick = (opcion) => {
    if (opcion.text === 'Gestión de Parámetros') {
      navigate('/dashboard/ubicaciones');
    }
    if (opcion.text === 'Facultades y Programas') {
      navigate('/dashboard/programas-facultades');
    }
  };
  const opcionesConfiguracion = [
    { 
      text: 'Facultades y Programas', 
      icon: FiFileText,
      descripcion: 'Gestionar facultades y programas académicos'
    },
    { 
      text: 'Configuración de alertas', 
      icon: FiBell,
      descripcion: 'Configurar alertas del sistema'
    },
    { 
      text: 'Reglas por oportunidad para postulantes', 
      icon: FiSettings,
      descripcion: 'Definir reglas para postulantes'
    },
    { 
      text: 'Reglas por oportunidad para administradores', 
      icon: FiSettings,
      descripcion: 'Definir reglas para administradores'
    },
    { 
      text: 'Condiciones Curriculares para Práctica', 
      icon: FiSettings,
      descripcion: 'Configurar condiciones curriculares'
    },
    { 
      text: 'Plantillas de notificaciones', 
      icon: FiMail,
      descripcion: 'Gestionar plantillas de notificaciones'
    },
    { 
      text: 'Plantillas de notificaciones de monitorías', 
      icon: FiMail,
      descripcion: 'Plantillas para notificaciones de monitorías'
    },
    { 
      text: 'Plantillas de notificaciones de Prácticas', 
      icon: FiMail,
      descripcion: 'Plantillas para notificaciones de prácticas'
    },
    { 
      text: 'Gestión de períodos para prácticas y monitorías académicas', 
      icon: FiClock,
      descripcion: 'Administrar períodos académicos'
    },
    { 
      text: 'Gestión de estados para prácticas académicas', 
      icon: FiRefreshCw,
      descripcion: 'Gestionar estados de prácticas'
    },
    { 
      text: 'Documentos para legalizar práctica académica', 
      icon: FiFileText,
      descripcion: 'Documentos requeridos para legalización'
    },
    { 
      text: 'Documentos para legalizar monitorías', 
      icon: FiFileText,
      descripcion: 'Documentos requeridos para legalización de monitorías'
    },
    { 
      text: 'Gestión de Parámetros', 
      icon: FiMapPin,
      descripcion: 'Gestionar tipos de documento, niveles de estudio, dedicación, ARLs y otros parámetros del sistema'
    }
  ];

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
          {opcionesConfiguracion.map((opcion, index) => {
            const IconComponent = opcion.icon;
            const isClickable = opcion.text === 'Gestión de Parámetros' || opcion.text === 'Facultades y Programas';
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
