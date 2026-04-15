import { useMemo, useState } from 'react';
import {
  FiArrowLeft,
  FiActivity,
  FiSettings,
  FiTrendingUp,
  FiAward,
  FiCheckSquare,
  FiBarChart,
  FiCalendar,
  FiFlag,
  FiShuffle,
  FiGlobe,
  FiFileText,
  FiUsers,
  FiRefreshCw,
  FiCheckCircle,
  FiDownload,
  FiX,
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import ReporteFiltrosModal from './ReporteFiltrosModal';
import ReporteResultadoModal from './ReporteResultadoModal';
import '../styles/Reportes.css';

/** Claves de acciones con lógica implementada (API + modal + export). */
const REPORT_ACTION_IDS = {
  ESTADISTICO_MTM: 'estadistico_mtm',
};

/**
 * Reportes cuyos criterios aún no están acordados con negocio: no abren el modal de filtros
 * (solo alerta «en desarrollo»). Alineado a `reportFilterDefinitions.js`: `fields: []` o
 * `functionalDefinitionPending` a nivel de informe (p. ej. SNIES, escenarios, evaluaciones MTM).
 * Al darlos de alta, quitar el id de aquí y completar campos en el back.
 */
const REPORTE_IDS_FILTROS_EN_DESARROLLO = new Set([
  'mon-daf-reconocimiento',
  'mon-historico',
  'prac-escenarios-vs-contactos',
  'prac-snies',
]);

/** Informes sin parámetros: no abren modal; generan con criterios fijos (back alineado en reportFilterDefinitions). */
const REPORTE_IDS_SIN_MODAL_FILTROS = new Set(['mon-graduados', 'mon-daf-vinculacion']);

/**
 * Categorías de la vista; agregar entradas aquí para nuevas pestañas.
 * Cada categoría referencia la clave en REPORTES_POR_CATEGORIA.
 */
const REPORTE_CATEGORIES = [
  { id: 'practicas', label: 'Prácticas' },
  { id: 'monitorias', label: 'Monitorías' },
];

const REPORTES_POR_CATEGORIA = {
  practicas: [
    {
      id: 'prac-detalle-oportunidades',
      titulo: 'Detalle de oportunidades',
      descripcion: 'Detalle de oportunidades de práctica y pasantía',
      icono: FiSettings,
    },
    {
      id: 'prac-entidades-contactos',
      titulo: 'Entidades-contactos',
      descripcion: 'Relación de entidades y contactos',
      icono: FiTrendingUp,
    },
    {
      id: 'prac-estadisticos-general',
      titulo: 'Estadísticos general-prácticas',
      descripcion: 'Estadísticos generales de prácticas',
      icono: FiActivity,
    },
    {
      id: 'prac-legalizacion-reporte-general',
      titulo: 'Módulo legalización – Reporte general',
      descripcion: 'Reporte general del módulo de legalización',
      icono: FiFileText,
    },
    {
      id: 'prac-legalizacion-eval-seguimiento',
      titulo: 'Módulo legalización – Evaluaciones de seguimiento',
      descripcion: 'Evaluaciones de seguimiento en legalización',
      icono: FiCheckCircle,
    },
    {
      id: 'prac-cierre-oportunidades',
      titulo: 'Cierre de oportunidades',
      descripcion: 'Cierre de oportunidades',
      icono: FiCalendar,
    },
    {
      id: 'prac-escenarios-vs-contactos',
      titulo: 'Relación escenarios de práctica vs contactos',
      descripcion: 'Escenarios de práctica frente a contactos',
      icono: FiShuffle,
    },
    {
      id: 'prac-postulantes',
      titulo: 'Postulantes',
      descripcion: 'Reporte de postulantes',
      icono: FiUsers,
    },
    {
      id: 'prac-acuerdos-vinculacion',
      titulo: 'Acuerdos de vinculación',
      descripcion: 'Acuerdos de vinculación',
      icono: FiFileText,
    },
    {
      id: 'prac-snies',
      titulo: 'Reporte SNIES',
      descripcion: 'Reporte SNIES',
      icono: FiGlobe,
    },
  ],
  monitorias: [
    {
      id: 'mon-detalle-ofertas',
      titulo: 'Detalle de ofertas de monitorías',
      descripcion: 'Detalle de ofertas de monitorías',
      icono: FiSettings,
    },
    {
      id: 'mon-detallado-legalizaciones',
      titulo: 'Detallado legalizaciones de monitorías',
      descripcion: 'Estadísticas de legalización MTM por estado y periodo',
      icono: FiFlag,
    },
    {
      id: 'mon-seguimiento',
      titulo: 'Seguimiento monitorías',
      descripcion: 'Seguimiento de monitorías',
      icono: FiRefreshCw,
    },
    {
      id: 'mon-aplicaciones-ofertas',
      titulo: 'Aplicaciones de ofertas de monitorías',
      descripcion: 'Aplicaciones a ofertas de monitorías',
      icono: FiAward,
    },
    {
      id: 'mon-evaluaciones',
      titulo: 'Evaluaciones monitorías',
      descripcion: 'Evaluaciones de monitorías',
      icono: FiCheckCircle,
    },
    {
      id: 'mon-historico',
      titulo: 'Histórico monitorías',
      descripcion: 'Histórico de monitorías',
      icono: FiBarChart,
    },
    {
      id: 'mon-estadistico',
      titulo: 'Estadístico monitorías',
      descripcion: 'Estadísticas de monitorías',
      icono: FiActivity,
      actionId: REPORT_ACTION_IDS.ESTADISTICO_MTM,
    },
    {
      id: 'mon-graduados',
      titulo: 'Graduados con monitorías, tutorías y mentorías',
      descripcion: 'Graduados con monitorías, tutorías y mentorías',
      icono: FiUsers,
    },
    {
      id: 'mon-planes-trabajo',
      titulo: 'Reporte de planes de trabajo',
      descripcion: 'Planes de trabajo',
      icono: FiCheckSquare,
    },
    {
      id: 'mon-asistencia',
      titulo: 'Reporte de asistencia',
      descripcion: 'Asistencia',
      icono: FiCalendar,
    },
    {
      id: 'mon-daf-vinculacion',
      titulo: 'Informe DAF Vinculación',
      descripcion: 'Informe DAF Vinculación',
      icono: FiFileText,
    },
    {
      id: 'mon-daf-reconocimiento',
      titulo: 'Informe DAF reconocimiento',
      descripcion: 'Informe DAF reconocimiento',
      icono: FiAward,
    },
  ],
};

export default function Reportes({ onVolver }) {
  const { hasPermission } = useAuth();
  const canVerReportes = hasPermission('AMRE') || hasPermission('GPAG');
  const [modalMTM, setModalMTM] = useState({ open: false, data: null, loading: false });
  const [modalParametros, setModalParametros] = useState({ open: false, reporte: null });
  const DEFAULT_REPORT_PAGE_SIZE = 25;

  const [resultadoReporte, setResultadoReporte] = useState({
    open: false,
    loading: false,
    error: null,
    payload: null,
    titulo: '',
    reporteOrigen: null,
    filtersSnapshot: {},
    page: 1,
    pageSize: DEFAULT_REPORT_PAGE_SIZE,
  });
  const [categoriaActiva, setCategoriaActiva] = useState('practicas');

  const listaReportes = useMemo(
    () => REPORTES_POR_CATEGORIA[categoriaActiva] ?? [],
    [categoriaActiva]
  );

  const abrirModalParametros = (reporte) => {
    if (!canVerReportes) return;
    setModalParametros({ open: true, reporte });
  };

  const cerrarModalParametros = () => {
    setModalParametros({ open: false, reporte: null });
  };

  /**
   * Tras confirmar filtros en el modal.
   * `filterValues` queda listo para la fase de generación (query/export); las rutas con lógica ya implementada siguen igual.
   */
  const ejecutarFlujoReporte = async (reporte, _filterValues = {}) => {
    if (reporte.actionId === REPORT_ACTION_IDS.ESTADISTICO_MTM) {
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
    const filters = _filterValues && typeof _filterValues === 'object' && !Array.isArray(_filterValues) ? _filterValues : {};
    const ps = resultadoReporte.pageSize || DEFAULT_REPORT_PAGE_SIZE;
    setResultadoReporte({
      open: true,
      loading: true,
      error: null,
      payload: null,
      titulo: reporte.titulo || '',
      reporteOrigen: reporte,
      filtersSnapshot: filters,
      page: 1,
      pageSize: ps,
    });
    try {
      const { data } = await api.post(
        `/reporting-filters/reports/${encodeURIComponent(reporte.id)}/generate`,
        { filters, page: 1, pageSize: ps }
      );
      setResultadoReporte((prev) => ({
        ...prev,
        loading: false,
        payload: data,
        page: data?.pagination?.page ?? 1,
        pageSize: data?.pagination?.pageSize ?? ps,
      }));
    } catch (err) {
      const d = err.response?.data;
      const msg =
        (typeof d === 'string' ? d : d?.message || d?.pendingReason) ||
        err.message ||
        'No se pudo generar el reporte.';
      setResultadoReporte((prev) => ({ ...prev, loading: false, error: String(msg) }));
    }
  };

  const cargarPaginaReporte = async (page, nextPageSize) => {
    const id = resultadoReporte.reporteOrigen?.id;
    if (!id) return;
    const snap = resultadoReporte.filtersSnapshot ?? {};
    const ps = nextPageSize ?? resultadoReporte.pageSize ?? DEFAULT_REPORT_PAGE_SIZE;
    setResultadoReporte((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data } = await api.post(`/reporting-filters/reports/${encodeURIComponent(id)}/generate`, {
        filters: snap,
        page,
        pageSize: ps,
      });
      setResultadoReporte((prev) => ({
        ...prev,
        loading: false,
        payload: data,
        page: data?.pagination?.page ?? page,
        pageSize: data?.pagination?.pageSize ?? ps,
      }));
    } catch (err) {
      const d = err.response?.data;
      const msg =
        (typeof d === 'string' ? d : d?.message || d?.pendingReason) || err.message || 'No se pudo cargar la página.';
      setResultadoReporte((prev) => ({ ...prev, loading: false, error: String(msg) }));
    }
  };

  const exportarReporteExcelCompleto = async () => {
    const id = resultadoReporte.reporteOrigen?.id;
    if (!id) throw new Error('Sin reporte');
    const snap = resultadoReporte.filtersSnapshot ?? {};
    const { data } = await api.post(`/reporting-filters/reports/${encodeURIComponent(id)}/generate`, {
      filters: snap,
      exportAll: true,
    });
    return data;
  };

  const cerrarResultadoReporte = () => {
    setResultadoReporte({
      open: false,
      loading: false,
      error: null,
      payload: null,
      titulo: '',
      reporteOrigen: null,
      filtersSnapshot: {},
      page: 1,
      pageSize: DEFAULT_REPORT_PAGE_SIZE,
    });
  };

  const volverDesdeResultadoAFiltros = () => {
    const origin = resultadoReporte.reporteOrigen;
    cerrarResultadoReporte();
    if (origin && !REPORTE_IDS_SIN_MODAL_FILTROS.has(origin.id)) {
      abrirModalParametros(origin);
    }
  };

  const handleFiltrosModalSubmit = (reporte, filterValues) => {
    cerrarModalParametros();
    void ejecutarFlujoReporte(reporte, filterValues);
  };

  const handleReporteClick = (reporte) => {
    if (!canVerReportes) return;
    if (REPORTE_IDS_FILTROS_EN_DESARROLLO.has(reporte.id)) {
      void Swal.fire({
        icon: 'info',
        title: reporte.titulo,
        text: 'Este reporte está en desarrollo: los filtros y la generación estarán disponibles próximamente.',
        confirmButtonColor: '#c41e3a',
      });
      return;
    }
    if (REPORTE_IDS_SIN_MODAL_FILTROS.has(reporte.id)) {
      void ejecutarFlujoReporte(reporte, {});
      return;
    }
    abrirModalParametros(reporte);
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

        <div className="reportes-tabs-bar" role="tablist" aria-label="Categorías de reportes">
          {REPORTE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={categoriaActiva === cat.id}
              className={`reportes-tab-btn${categoriaActiva === cat.id ? ' active' : ''}`}
              onClick={() => setCategoriaActiva(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="reportes-grid" role="tabpanel">
          {listaReportes.map((reporte, index) => {
            const IconComponent = reporte.icono;
            const sinFiltros = REPORTE_IDS_FILTROS_EN_DESARROLLO.has(reporte.id);
            return (
              <div
                key={reporte.id}
                className={`reporte-item reporte-item--tone-${index % 6}${sinFiltros ? ' reporte-item--sin-filtros' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={
                  sinFiltros
                    ? `${reporte.titulo}. En desarrollo; al activar se muestra un aviso.`
                    : `${reporte.titulo}. ${reporte.descripcion}`
                }
                onClick={() => handleReporteClick(reporte)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleReporteClick(reporte);
                  }
                }}
                title={
                  sinFiltros
                    ? 'Pulse para ver un aviso: reporte en desarrollo, sin modal de filtros aún.'
                    : reporte.descripcion
                }
              >
                {sinFiltros && (
                  <span className="reporte-item-badge" aria-hidden="true">
                    En desarrollo
                  </span>
                )}
                <div className="reporte-icon">
                  <IconComponent />
                </div>
                <div className="reporte-text">{reporte.titulo}</div>
              </div>
            );
          })}
        </div>
      </div>

      {modalParametros.open && modalParametros.reporte && (
        <ReporteFiltrosModal
          open={modalParametros.open}
          reporte={modalParametros.reporte}
          onClose={cerrarModalParametros}
          onSubmit={handleFiltrosModalSubmit}
        />
      )}

      <ReporteResultadoModal
        open={resultadoReporte.open}
        onClose={cerrarResultadoReporte}
        loading={resultadoReporte.loading}
        error={resultadoReporte.error}
        payload={resultadoReporte.payload}
        fallbackTitle={resultadoReporte.titulo}
        onExportExcel={exportarReporteExcelCompleto}
        onPageChange={(page) => void cargarPaginaReporte(page)}
        onPageSizeChange={(nextPs) => void cargarPaginaReporte(1, nextPs)}
        onVolverFiltros={
          resultadoReporte.reporteOrigen && !REPORTE_IDS_SIN_MODAL_FILTROS.has(resultadoReporte.reporteOrigen.id)
            ? volverDesdeResultadoAFiltros
            : undefined
        }
      />

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

    </div>
  );
}
