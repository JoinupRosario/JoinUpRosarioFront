import { 
  FiArrowLeft,
  FiHome,
  FiActivity,
  FiClock,
  FiSettings,
  FiTrendingUp,
  FiAward,
  FiCheckSquare,
  FiBarChart,
  FiCalendar,
  FiFlag,
  FiRotateCcw,
  FiShuffle,
  FiGlobe,
  FiTrendingDown,
  FiFileText,
  FiUsers,
  FiMail,
  FiRefreshCw,
  FiCheckCircle
} from 'react-icons/fi';
import '../styles/Reportes.css';

export default function Reportes({ onVolver }) {
  const reportes = [
    // Fila 1
    { 
      nombre: 'Detallado Ofertas SPE', 
      icono: FiHome,
      descripcion: 'Reporte detallado de ofertas SPE'
    },
    { 
      nombre: 'Estadístico SPE', 
      icono: FiActivity,
      descripcion: 'Estadísticas de SPE'
    },
    { 
      nombre: 'Seguimiento de Ofertas', 
      icono: FiClock,
      descripcion: 'Seguimiento de ofertas'
    },
    { 
      nombre: 'Detalle de Ofertas', 
      icono: FiSettings,
      descripcion: 'Detalle de ofertas'
    },
    { 
      nombre: 'Ofertas por Entidad', 
      icono: FiTrendingUp,
      descripcion: 'Ofertas agrupadas por entidad'
    },
    { 
      nombre: 'Oferta por Programa', 
      icono: FiAward,
      descripcion: 'Ofertas por programa académico'
    },
    
    // Fila 2
    { 
      nombre: 'Oferta por Estado', 
      icono: FiCheckSquare,
      descripcion: 'Ofertas por estado'
    },
    { 
      nombre: 'Comportamiento Salarial', 
      icono: FiBarChart,
      descripcion: 'Análisis de comportamiento salarial'
    },
    { 
      nombre: 'Cierre Oportunidades', 
      icono: FiCalendar,
      descripcion: 'Cierre de oportunidades'
    },
    { 
      nombre: 'Detallado Legalizaciones', 
      icono: FiFlag,
      descripcion: 'Detalle de legalizaciones'
    },
    { 
      nombre: 'Seguimiento Prácticas', 
      icono: FiRotateCcw,
      descripcion: 'Seguimiento de prácticas'
    },
    { 
      nombre: 'Histórico Estados Ofertas', 
      icono: FiShuffle,
      descripcion: 'Histórico de estados de ofertas'
    },
    
    // Fila 3
    { 
      nombre: 'Revisión Oportunidades', 
      icono: FiShuffle,
      descripcion: 'Revisión de oportunidades'
    },
    { 
      nombre: 'Entidades/Contactos', 
      icono: FiTrendingUp,
      descripcion: 'Reporte de entidades y contactos'
    },
    { 
      nombre: 'Oportunidades vencidas', 
      icono: FiTrendingDown,
      descripcion: 'Oportunidades vencidas'
    },
    { 
      nombre: 'Aplicaciones de Prácticas', 
      icono: FiAward,
      descripcion: 'Aplicaciones de prácticas'
    },
    { 
      nombre: 'Postulantes', 
      icono: FiUsers,
      descripcion: 'Reporte de postulantes'
    },
    { 
      nombre: 'Postulantes SPE', 
      icono: FiUsers,
      descripcion: 'Postulantes SPE'
    },
    
    // Fila 4
    { 
      nombre: 'Postulantes Exp. Laboral', 
      icono: FiUsers,
      descripcion: 'Postulantes con experiencia laboral'
    },
    { 
      nombre: 'Ofertas Transnacionales', 
      icono: FiGlobe,
      descripcion: 'Ofertas transnacionales'
    },
    { 
      nombre: 'Acuerdos de Vinculación', 
      icono: FiFileText,
      descripcion: 'Acuerdos de vinculación'
    },
    { 
      nombre: 'SNIES', 
      icono: FiGlobe,
      descripcion: 'Reporte SNIES'
    },
    { 
      nombre: 'Reporte Monitores - Prácticas', 
      icono: FiFileText,
      descripcion: 'Reporte de monitores para prácticas'
    },
    { 
      nombre: 'Certificaciones Práctica', 
      icono: FiAward,
      descripcion: 'Certificaciones de práctica'
    },
    
    // Fila 5
    { 
      nombre: 'Evaluaciones Práctica', 
      icono: FiCheckCircle,
      descripcion: 'Evaluaciones de práctica'
    },
    { 
      nombre: 'Histórico Prácticas', 
      icono: FiBarChart,
      descripcion: 'Histórico de prácticas'
    },
    { 
      nombre: 'Estadístico General - Prácticas', 
      icono: FiActivity,
      descripcion: 'Estadísticas generales de prácticas'
    },
    { 
      nombre: 'Notificaciones', 
      icono: FiMail,
      descripcion: 'Reporte de notificaciones'
    },
    { 
      nombre: 'Detalle de Ofertas de Monitorías', 
      icono: FiSettings,
      descripcion: 'Detalle de ofertas de monitorías'
    },
    { 
      nombre: 'Detallado Legalizaciones de Monitorías', 
      icono: FiFlag,
      descripcion: 'Detalle de legalizaciones de monitorías'
    },
    
    // Fila 6
    { 
      nombre: 'Seguimiento Monitorías', 
      icono: FiRefreshCw,
      descripcion: 'Seguimiento de monitorías'
    },
    { 
      nombre: 'Aplicaciones de Of. Monitorías', 
      icono: FiAward,
      descripcion: 'Aplicaciones de ofertas de monitorías'
    },
    { 
      nombre: 'Evaluaciones Monitorías', 
      icono: FiCheckCircle,
      descripcion: 'Evaluaciones de monitorías'
    },
    { 
      nombre: 'Histórico Monitorías', 
      icono: FiBarChart,
      descripcion: 'Histórico de monitorías'
    },
    { 
      nombre: 'Estadístico Monitorías', 
      icono: FiActivity,
      descripcion: 'Estadísticas de monitorías'
    },
    { 
      nombre: 'Graduados con monitorias, tutorias y mentorias', 
      icono: FiActivity,
      descripcion: 'Graduados con monitorías, tutorías y mentorías'
    }
  ];

  const handleReporteClick = (reporte) => {
    console.log('Generando reporte:', reporte.nombre);
    alert(`Generando reporte: ${reporte.nombre}`);
  };

  return (
    <div className="reportes-content">
      <div className="reportes-section">
        <div className="reportes-header">
          <button className="btn-volver" onClick={onVolver}>
            <FiArrowLeft className="btn-icon" />
            Volver
          </button>
          <div className="section-header">
            <h3>REPORTES</h3>
          </div>
        </div>

        <div className="reportes-grid">
          {reportes.map((reporte, index) => {
            const IconComponent = reporte.icono;
            return (
              <div 
                key={index} 
                className="reporte-item"
                onClick={() => handleReporteClick(reporte)}
                title={reporte.descripcion}
              >
                <div className="reporte-icon">
                  <IconComponent />
                </div>
                <div className="reporte-text">
                  {reporte.nombre}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
