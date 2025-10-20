import { 
  FiFileText, 
  FiBell, 
  FiSettings, 
  FiMail, 
  FiClock, 
  FiRefreshCw,
  FiArrowLeft
} from 'react-icons/fi';
import './Configuracion.css';

export default function Configuracion({ onVolver }) {
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
            return (
              <div key={index} className="configuracion-item">
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
