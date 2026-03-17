import { useState } from 'react';
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
  FiCheckCircle,
  FiDownload,
  FiX
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import '../styles/Reportes.css';

const REPORTE_ESTADISTICO_MONITORIAS = 'Estadístico Monitorías';
const REPORTE_ESTADISTICO_LEGALIZACION_MTM = 'Estadísticas de legalización MTM';

export default function Reportes({ onVolver }) {
  const { hasPermission } = useAuth();
  const canVerReportes = hasPermission('AMRE') || hasPermission('GPAG');
  const [modalMTM, setModalMTM] = useState({ open: false, data: null, loading: false });
  const [modalLegalizacion, setModalLegalizacion] = useState({ open: false, data: null, loading: false });
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
    },
    {
      nombre: REPORTE_ESTADISTICO_LEGALIZACION_MTM,
      icono: FiFileText,
      descripcion: 'Estadísticas de legalización MTM por estado y periodo'
    }
  ];

  const handleReporteClick = async (reporte) => {
    if (!canVerReportes) return;
    if (reporte.nombre === REPORTE_ESTADISTICO_MONITORIAS) {
      setModalMTM({ open: true, data: null, loading: true });
      try {
        const { data } = await api.get('/oportunidades-mtm/reportes/estadisticas');
        setModalMTM({ open: true, data: data, loading: false });
      } catch (err) {
        setModalMTM({ open: false, data: null, loading: false });
        Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo cargar el reporte.', confirmButtonColor: '#c41e3a' });
      }
      return;
    }
    if (reporte.nombre === REPORTE_ESTADISTICO_LEGALIZACION_MTM) {
      setModalLegalizacion({ open: true, data: null, loading: true });
      try {
        const { data } = await api.get('/oportunidades-mtm/legalizaciones-admin/estadisticas');
        setModalLegalizacion({ open: true, data: data, loading: false });
      } catch (err) {
        setModalLegalizacion({ open: false, data: null, loading: false });
        Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo cargar.', confirmButtonColor: '#c41e3a' });
      }
      return;
    }
    console.log('Generando reporte:', reporte.nombre);
    Swal.fire({ icon: 'info', title: reporte.nombre, text: 'Este reporte estará disponible próximamente.', confirmButtonColor: '#c41e3a' });
  };

  const exportarEstadisticasMTMExcel = () => {
    const d = modalMTM.data;
    if (!d?.resumen) return;
    const wb = XLSX.utils.book_new();
    const resumenRows = [
      ['Estadísticas MTM', ''],
      ['Generado', d.generadoAt ? new Date(d.generadoAt).toLocaleString('es-CO') : ''],
      [''],
      ['Resumen', 'Valor'],
      ['Total oportunidades', d.resumen.totalOportunidades ?? 0],
      ['Total postulaciones', d.resumen.totalPostulaciones ?? 0],
      ['Aceptadas por estudiante', d.resumen.aceptadas ?? 0],
      ['Rechazadas', d.resumen.rechazadas ?? 0],
      ['Pendientes de respuesta (seleccionados)', d.resumen.pendientesRespuesta ?? 0],
      ['Aplicadas', d.resumen.aplicadas ?? 0],
      ['En revisión (consulta/descarga HV)', d.resumen.enRevision ?? 0],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(resumenRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');
    if (d.porPeriodo && d.porPeriodo.length > 0) {
      const headers = ['Periodo', 'Total postulaciones', 'Aceptadas', 'Rechazadas', 'Seleccionadas pendientes'];
      const rows = d.porPeriodo.map((p) => [p.periodo, p.totalPostulaciones, p.aceptadas, p.rechazadas, p.seleccionadasPendientes]);
      const ws2 = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws2, 'Por periodo');
    }
    XLSX.writeFile(wb, `estadisticas_mtm_${new Date().toISOString().slice(0, 10)}.xlsx`);
    Swal.fire({ icon: 'success', title: 'Exportado', text: 'Archivo Excel generado.', confirmButtonColor: '#c41e3a', timer: 2000, timerProgressBar: true });
  };

  const exportarEstadisticasLegalizacionExcel = () => {
    const d = modalLegalizacion.data;
    if (!d) return;
    const wb = XLSX.utils.book_new();
    const resumenRows = [
      ['Estadísticas de legalización MTM', ''],
      ['Generado', d.generadoAt ? new Date(d.generadoAt).toLocaleString('es-CO') : ''],
      [''],
      ['Total legalizaciones', d.total ?? 0],
      ['Borrador', d.borrador ?? 0],
      ['En revisión', d.en_revision ?? 0],
      ['Aprobada', d.aprobada ?? 0],
      ['Rechazada', d.rechazada ?? 0],
      ['En ajuste', d.en_ajuste ?? 0],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(resumenRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');
    if (d.porPeriodo && d.porPeriodo.length > 0) {
      const headers = ['Periodo', 'Total', 'Borrador', 'En revisión', 'Aprobada', 'Rechazada', 'En ajuste'];
      const rows = d.porPeriodo.map((p) => [p.periodo, p.total, p.borrador, p.en_revision, p.aprobada, p.rechazada, p.en_ajuste]);
      const ws2 = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws2, 'Por periodo');
    }
    XLSX.writeFile(wb, `estadisticas_legalizacion_mtm_${new Date().toISOString().slice(0, 10)}.xlsx`);
    Swal.fire({ icon: 'success', title: 'Exportado', text: 'Archivo Excel generado.', confirmButtonColor: '#c41e3a', timer: 2000, timerProgressBar: true });
  };

  if (!canVerReportes) {
    return (
      <div className="reportes-content">
        <div className="reportes-section">
          <p className="reportes-sin-permiso">No tiene permiso para ver o generar reportes (AMRE / GPAG).</p>
          <button className="btn-volver" onClick={onVolver}>
            <FiArrowLeft className="btn-icon" />
            Volver
          </button>
        </div>
      </div>
    );
  }

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

      {/* Modal Estadístico Monitorías */}
      {modalMTM.open && (
        <div className="reportes-modal-overlay" onClick={() => !modalMTM.loading && setModalMTM({ open: false, data: null, loading: false })}>
          <div className="reportes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reportes-modal-header">
              <h3>Estadísticas Monitorías, Tutorías y Mentorías</h3>
              <button type="button" className="reportes-modal-close" onClick={() => setModalMTM({ open: false, data: null, loading: false })} aria-label="Cerrar"><FiX size={22} /></button>
            </div>
            <div className="reportes-modal-body">
              {modalMTM.loading ? (
                <div className="reportes-modal-loading"><div className="loading-spinner" /> Cargando estadísticas...</div>
              ) : modalMTM.data?.resumen ? (
                <>
                  <div className="reportes-mtm-resumen">
                    <h4>Resumen general</h4>
                    <div className="reportes-mtm-cards">
                      <div className="reportes-mtm-card"><span className="reportes-mtm-card-value">{modalMTM.data.resumen.totalOportunidades ?? 0}</span><span className="reportes-mtm-card-label">Oportunidades</span></div>
                      <div className="reportes-mtm-card"><span className="reportes-mtm-card-value">{modalMTM.data.resumen.totalPostulaciones ?? 0}</span><span className="reportes-mtm-card-label">Postulaciones</span></div>
                      <div className="reportes-mtm-card highlight"><span className="reportes-mtm-card-value">{modalMTM.data.resumen.aceptadas ?? 0}</span><span className="reportes-mtm-card-label">Aceptadas</span></div>
                      <div className="reportes-mtm-card"><span className="reportes-mtm-card-value">{modalMTM.data.resumen.rechazadas ?? 0}</span><span className="reportes-mtm-card-label">Rechazadas</span></div>
                      <div className="reportes-mtm-card"><span className="reportes-mtm-card-value">{modalMTM.data.resumen.pendientesRespuesta ?? 0}</span><span className="reportes-mtm-card-label">Pend. respuesta</span></div>
                      <div className="reportes-mtm-card"><span className="reportes-mtm-card-value">{modalMTM.data.resumen.aplicadas ?? 0}</span><span className="reportes-mtm-card-label">Aplicadas</span></div>
                    </div>
                  </div>
                  {modalMTM.data.porPeriodo?.length > 0 && (
                    <div className="reportes-mtm-tabla-wrap">
                      <h4>Por periodo académico</h4>
                      <table className="reportes-mtm-tabla">
                        <thead>
                          <tr>
                            <th>Periodo</th>
                            <th>Postulaciones</th>
                            <th>Aceptadas</th>
                            <th>Rechazadas</th>
                            <th>Pend. respuesta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modalMTM.data.porPeriodo.map((p, i) => (
                            <tr key={i}>
                              <td>{p.periodo}</td>
                              <td>{p.totalPostulaciones}</td>
                              <td>{p.aceptadas}</td>
                              <td>{p.rechazadas}</td>
                              <td>{p.seleccionadasPendientes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="reportes-modal-footer">
                    <button type="button" className="btn-guardar" onClick={exportarEstadisticasMTMExcel}><FiDownload className="btn-icon" /> Exportar a Excel</button>
                    <button type="button" className="btn-volver" onClick={() => setModalMTM({ open: false, data: null, loading: false })}>Cerrar</button>
                  </div>
                </>
              ) : (
                <p className="reportes-modal-empty">No hay datos para mostrar.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Estadísticas de legalización MTM */}
      {modalLegalizacion.open && (
        <div className="reportes-modal-overlay" onClick={() => !modalLegalizacion.loading && setModalLegalizacion({ open: false, data: null, loading: false })}>
          <div className="reportes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reportes-modal-header">
              <h3>Estadísticas de legalización MTM</h3>
              <button type="button" className="reportes-modal-close" onClick={() => setModalLegalizacion({ open: false, data: null, loading: false })} aria-label="Cerrar"><FiX size={22} /></button>
            </div>
            <div className="reportes-modal-body">
              {modalLegalizacion.loading ? (
                <div className="reportes-modal-loading"><div className="loading-spinner" /> Cargando...</div>
              ) : modalLegalizacion.data ? (
                <>
                  <div className="reportes-mtm-resumen">
                    <h4>Resumen por estado</h4>
                    <div className="reportes-mtm-cards">
                      <div className="reportes-mtm-card"><span className="reportes-mtm-card-value">{modalLegalizacion.data.total ?? 0}</span><span className="reportes-mtm-card-label">Total</span></div>
                      <div className="reportes-mtm-card"><span className="reportes-mtm-card-value">{modalLegalizacion.data.borrador ?? 0}</span><span className="reportes-mtm-card-label">Borrador</span></div>
                      <div className="reportes-mtm-card"><span className="reportes-mtm-card-value">{modalLegalizacion.data.en_revision ?? 0}</span><span className="reportes-mtm-card-label">En revisión</span></div>
                      <div className="reportes-mtm-card highlight"><span className="reportes-mtm-card-value">{modalLegalizacion.data.aprobada ?? 0}</span><span className="reportes-mtm-card-label">Aprobada</span></div>
                      <div className="reportes-mtm-card"><span className="reportes-mtm-card-value">{modalLegalizacion.data.rechazada ?? 0}</span><span className="reportes-mtm-card-label">Rechazada</span></div>
                      <div className="reportes-mtm-card"><span className="reportes-mtm-card-value">{modalLegalizacion.data.en_ajuste ?? 0}</span><span className="reportes-mtm-card-label">En ajuste</span></div>
                    </div>
                  </div>
                  {modalLegalizacion.data.porPeriodo?.length > 0 && (
                    <div className="reportes-mtm-tabla-wrap">
                      <h4>Por periodo académico</h4>
                      <table className="reportes-mtm-tabla">
                        <thead>
                          <tr>
                            <th>Periodo</th>
                            <th>Total</th>
                            <th>Borrador</th>
                            <th>En revisión</th>
                            <th>Aprobada</th>
                            <th>Rechazada</th>
                            <th>En ajuste</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modalLegalizacion.data.porPeriodo.map((p, i) => (
                            <tr key={i}>
                              <td>{p.periodo}</td>
                              <td>{p.total}</td>
                              <td>{p.borrador}</td>
                              <td>{p.en_revision}</td>
                              <td>{p.aprobada}</td>
                              <td>{p.rechazada}</td>
                              <td>{p.en_ajuste}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="reportes-modal-footer">
                    <button type="button" className="btn-guardar" onClick={exportarEstadisticasLegalizacionExcel}><FiDownload className="btn-icon" /> Exportar a Excel</button>
                    <button type="button" className="btn-volver" onClick={() => setModalLegalizacion({ open: false, data: null, loading: false })}>Cerrar</button>
                  </div>
                </>
              ) : (
                <p className="reportes-modal-empty">No hay datos para mostrar.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
