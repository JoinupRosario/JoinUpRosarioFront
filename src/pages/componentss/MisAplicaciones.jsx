import { useState, useEffect } from 'react';
import { FiX, FiDownload, FiBriefcase, FiBook } from 'react-icons/fi';
import { HiOutlineAcademicCap } from 'react-icons/hi';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import DetalleOportunidadModal from './DetalleOportunidadModal';
import '../styles/MisAplicaciones.css';

const ESTADO_LABELS = {
  aplicado: 'Aplicado',
  empresa_consulto_perfil: 'Consultó perfil',
  empresa_descargo_hv: 'Descargó HV',
  seleccionado_empresa: 'Seleccionado',
  aceptado_estudiante: 'Aceptado',
  rechazado: 'Rechazado',
};

const BADGE_CLASS = {
  aplicado: 'mis-apps__badge--aplicado',
  empresa_consulto_perfil: 'mis-apps__badge--consultado',
  empresa_descargo_hv: 'mis-apps__badge--descargado',
  seleccionado_empresa: 'mis-apps__badge--seleccionado',
  aceptado_estudiante: 'mis-apps__badge--aceptado',
  rechazado: 'mis-apps__badge--rechazado',
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const addBusinessDays = (date, days) => {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
};

function EstadoConfirmacion({ row, submittingResponder, onResponder }) {
  if (row.estado === 'aceptado_estudiante') {
    return <span className="mis-apps__estado-confirmado">✓ Aceptado</span>;
  }
  if (row.estado === 'rechazado' && (row.seleccionadoPorEmpresa || row.seleccionado)) {
    return <span className="mis-apps__estado-rechazado-final">✗ Rechazado</span>;
  }
  if (row.estado === 'seleccionado_empresa') {
    const isMTM = row.tipoOportunidad === 'Monitoría / Tutoría / Mentoría';
    const dias = row.diasHabilesAceptarSeleccion ?? 8;
    const limite = row.seleccionadoAt && isMTM ? addBusinessDays(new Date(row.seleccionadoAt), dias) : null;
    if (limite && new Date() > limite) {
      return <span className="mis-apps__plazo-vencido">Plazo vencido</span>;
    }
    if (row.tieneAceptadaDefinitivaGlobal && row.estado !== 'aceptado_estudiante' && !row.puedeAceptarDefinitivo) {
      return <span className="mis-apps__plazo-vencido" style={{ fontSize: '.78rem' }}>Ya aceptó otra oportunidad</span>;
    }
    return (
      <select
        defaultValue=""
        disabled={!!submittingResponder}
        onChange={(e) => {
          const v = e.target.value;
          e.target.value = '';
          if (v !== 'confirmar' && v !== 'rechazar') return;
          Swal.fire({
            icon: 'question',
            title: v === 'confirmar' ? '¿Confirmar selección?' : '¿Rechazar selección?',
            text: v === 'confirmar'
              ? '¿Está seguro de que desea confirmar esta selección?'
              : '¿Está seguro de que desea rechazar esta selección?',
            showCancelButton: true,
            confirmButtonText: v === 'confirmar' ? 'Sí, confirmar' : 'Sí, rechazar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#c41e3a',
          }).then((r) => { if (r.isConfirmed) onResponder(row, v); });
        }}
      >
        <option value="">Pendiente…</option>
        <option value="confirmar">Confirmar</option>
        <option value="rechazar">Rechazar</option>
      </select>
    );
  }
  return null;
}

function AplicacionCard({ row, submittingResponder, onResponder, onVerOferta }) {
  const badgeClass = BADGE_CLASS[row.estado] || 'mis-apps__badge--default';
  const estadoLabel = ESTADO_LABELS[row.estado] || row.estado || '—';
  const empresa = row.empresa ?? (row.tipoOportunidad === 'Monitoría / Tutoría / Mentoría' ? 'Universidad del Rosario' : '—');
  const estadoOp = row.estadoOportunidad === 'Inactiva' ? 'Cerrada' : (row.estadoOportunidad || '—');
  const confirmacion = <EstadoConfirmacion row={row} submittingResponder={submittingResponder} onResponder={onResponder} />;
  const hasConfirmacion = row.estado === 'aceptado_estudiante'
    || (row.estado === 'rechazado' && (row.seleccionadoPorEmpresa || row.seleccionado))
    || row.estado === 'seleccionado_empresa';

  return (
    <article className="mis-apps__card">
      <div className="mis-apps__card-header">
        <div>
          <p className="mis-apps__card-title">{row.cargo || '—'}</p>
          <p className="mis-apps__card-empresa">{empresa}</p>
        </div>
        <span className={`mis-apps__badge ${badgeClass}`}>{estadoLabel}</span>
      </div>

      <div className="mis-apps__card-meta">
        <div className="mis-apps__meta-item">
          <span>Fecha aplicación</span>
          {fmtDate(row.fechaAplicacion)}
        </div>
        <div className="mis-apps__meta-item">
          <span>Estado oferta</span>
          {estadoOp}
        </div>
        {row.nombreCoordinador && (
          <div className="mis-apps__meta-item">
            <span>Coordinador</span>
            {row.nombreCoordinador}
          </div>
        )}
        <div className="mis-apps__meta-item">
          <span>Perfil consultado</span>
          <span className={row.empresaConsultoPerfil ? 'mis-apps__ico--yes' : 'mis-apps__ico--no'}>
            {row.empresaConsultoPerfil ? '✓ Sí' : '— No'}
          </span>
        </div>
        <div className="mis-apps__meta-item">
          <span>HV descargada</span>
          <span className={row.empresaDescargoHv ? 'mis-apps__ico--yes' : 'mis-apps__ico--no'}>
            {row.empresaDescargoHv ? '✓ Sí' : '— No'}
          </span>
        </div>
        <div className="mis-apps__meta-item">
          <span>Seleccionado</span>
          <span className={(row.seleccionadoPorEmpresa ?? row.seleccionado) ? 'mis-apps__ico--yes' : 'mis-apps__ico--no'}>
            {(row.seleccionadoPorEmpresa ?? row.seleccionado) ? '✓ Sí' : '— No'}
          </span>
        </div>
      </div>

      {(hasConfirmacion || (row.opportunityId || row.oportunidadId)) && (
        <div className="mis-apps__card-footer">
          <div>{hasConfirmacion ? confirmacion : <span />}</div>
          {(row.opportunityId || row.oportunidadId) && (
            <button
              type="button"
              className="mis-apps__detail-btn"
              onClick={() => onVerOferta(row.opportunityId || row.oportunidadId, row.tipoOportunidad)}
            >
              Ver oferta
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default function MisAplicaciones() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [tab, setTab] = useState('practicas');
  const [detalleOferta, setDetalleOferta] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [detalleMTM, setDetalleMTM] = useState(null);
  const [loadingDetalleMTM, setLoadingDetalleMTM] = useState(false);
  const [submittingResponder, setSubmittingResponder] = useState(null);

  const refetch = () => {
    setLoading(true);
    Promise.all([
      api.get('/opportunities/mis-postulaciones')
        .then((r) => (r.data?.data || []).map((row) => ({ ...row, tipoOportunidad: 'Práctica' })))
        .catch(() => []),
      api.get('/oportunidades-mtm/mis-postulaciones')
        .then((r) => {
          const dias = r.data?.diasHabilesAceptarSeleccion ?? 8;
          return (r.data?.data || []).map((row) => ({
            ...row,
            tipoOportunidad: 'Monitoría / Tutoría / Mentoría',
            diasHabilesAceptarSeleccion: dias,
          }));
        })
        .catch(() => []),
    ]).then(([practicas, mtm]) => {
      const merged = [...practicas, ...mtm].sort(
        (a, b) => new Date(b.fechaAplicacion || 0) - new Date(a.fechaAplicacion || 0)
      );
      setData(merged);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { refetch(); }, []);

  const estudianteResponder = (row, accion) => {
    if (accion !== 'confirmar' && accion !== 'rechazar') return;
    const isMTM = row.tipoOportunidad === 'Monitoría / Tutoría / Mentoría';
    const base = isMTM ? `/oportunidades-mtm/${row.oportunidadId}` : `/opportunities/${row.opportunityId}`;
    setSubmittingResponder(row._id);
    api.patch(`${base}/applications/${row._id}/estudiante-responder`, { accion })
      .then(() => refetch())
      .catch((err) => Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || err.message, confirmButtonColor: '#c41e3a' }))
      .finally(() => setSubmittingResponder(null));
  };

  const verOferta = (opportunityId, tipo) => {
    if (!opportunityId) return;
    if (tipo === 'Monitoría / Tutoría / Mentoría') {
      setLoadingDetalleMTM(true);
      setDetalleMTM(null);
      api.get(`/oportunidades-mtm/${opportunityId}`)
        .then((r) => setDetalleMTM(r.data))
        .catch(() => setDetalleMTM(null))
        .finally(() => setLoadingDetalleMTM(false));
    } else {
      setLoadingDetalle(true);
      setDetalleOferta(null);
      api.get(`/opportunities/${opportunityId}`)
        .then((r) => setDetalleOferta(r.data))
        .catch(() => setDetalleOferta(null))
        .finally(() => setLoadingDetalle(false));
    }
  };

  const exportarExcel = () => {
    const subset = tab === 'practicas'
      ? data.filter((r) => r.tipoOportunidad === 'Práctica')
      : data.filter((r) => r.tipoOportunidad !== 'Práctica');
    if (subset.length === 0) {
      Swal.fire({ icon: 'info', title: 'Sin datos', text: 'No hay aplicaciones para exportar en esta pestaña.', confirmButtonColor: '#c41e3a' });
      return;
    }
    const headers = ['Cargo', 'Tipo', 'Empresa', 'Coordinador', 'Fecha aplicación', 'Estado oferta', 'Estado postulación', 'Perfil consultado', 'HV descargada', 'Seleccionado', 'Confirmado/Rechazado'];
    const rows = subset.map((row) => [
      row.cargo || '',
      row.tipoOportunidad || '',
      row.empresa ?? (row.tipoOportunidad === 'Monitoría / Tutoría / Mentoría' ? 'Universidad del Rosario' : ''),
      row.nombreCoordinador ?? '',
      row.fechaAplicacion ? new Date(row.fechaAplicacion).toLocaleDateString('es-CO') : '',
      row.estadoOportunidad === 'Inactiva' ? 'Cerrada' : (row.estadoOportunidad || ''),
      ESTADO_LABELS[row.estado] || row.estado || '',
      row.empresaConsultoPerfil ? 'Sí' : 'No',
      row.empresaDescargoHv ? 'Sí' : 'No',
      (row.seleccionadoPorEmpresa ?? row.seleccionado) ? 'Sí' : 'No',
      row.estado === 'aceptado_estudiante' ? 'Aceptado' : row.estado === 'rechazado' && (row.seleccionadoPorEmpresa || row.seleccionado) ? 'Rechazado' : row.estado === 'seleccionado_empresa' ? 'Pendiente' : '',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tab === 'practicas' ? 'Prácticas' : 'Monitorías');
    XLSX.writeFile(wb, `mis_aplicaciones_${tab}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    Swal.fire({ icon: 'success', title: 'Exportado', text: `${subset.length} registro(s) exportados.`, confirmButtonColor: '#c41e3a', timer: 2000, timerProgressBar: true });
  };

  const practicas = data.filter((r) => r.tipoOportunidad === 'Práctica');
  const monitorias = data.filter((r) => r.tipoOportunidad !== 'Práctica');
  const tabData = tab === 'practicas' ? practicas : monitorias;

  return (
    <div className="dashboard-content mis-apps">
      {/* Hero */}
      <div className="mis-apps__hero">
        <div className="mis-apps__hero-text">
          <h2>Mis aplicaciones</h2>
          <p>Estado de tus postulaciones a prácticas, monitorías, tutorías y mentorías.</p>
        </div>
        {data.length > 0 && (
          <button type="button" className="mis-apps__export-btn" onClick={exportarExcel}>
            <FiDownload size={16} /> Exportar a Excel
          </button>
        )}
      </div>

      {loading ? (
        <div className="mis-apps__loading">
          <div className="loading-spinner" />
          <p>Cargando tus aplicaciones…</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="mis-apps__tabs">
            <button
              type="button"
              className={`mis-apps__tab ${tab === 'practicas' ? 'active' : ''}`}
              onClick={() => setTab('practicas')}
            >
              <FiBriefcase style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Prácticas y Pasantías
              <span className="mis-apps__tab-badge">{practicas.length}</span>
            </button>
            <button
              type="button"
              className={`mis-apps__tab ${tab === 'monitorias' ? 'active' : ''}`}
              onClick={() => setTab('monitorias')}
            >
              <FiBook style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Monitorías, tutorías y mentorías
              <span className="mis-apps__tab-badge">{monitorias.length}</span>
            </button>
          </div>

          {tabData.length === 0 ? (
            <div className="mis-apps__empty">
              {tab === 'practicas'
                ? <FiBriefcase size={48} />
                : <FiBook size={48} />}
              <p style={{ fontWeight: 600, marginTop: 8 }}>
                {tab === 'practicas' ? 'No tienes aplicaciones a prácticas aún.' : 'No tienes aplicaciones a monitorías aún.'}
              </p>
              <p style={{ fontSize: '.88rem' }}>Explora las oportunidades disponibles desde el menú lateral.</p>
            </div>
          ) : (
            <div className="mis-apps__grid">
              {tabData.map((row) => (
                <AplicacionCard
                  key={`${row.tipoOportunidad}-${row._id}`}
                  row={row}
                  submittingResponder={submittingResponder}
                  onResponder={estudianteResponder}
                  onVerOferta={verOferta}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Modales */}
      <DetalleOportunidadModal
        detalle={detalleOferta}
        loading={loadingDetalle}
        onClose={() => setDetalleOferta(null)}
        onAplicar={null}
      />

      {detalleMTM != null && (
        <div className="modal-overlay" onClick={() => !loadingDetalleMTM && setDetalleMTM(null)}>
          <div className="modal-content ofertas-afines-detalle-modal" onClick={(e) => e.stopPropagation()}>
            {loadingDetalleMTM ? (
              <div className="loading-container"><div className="loading-spinner" /><p>Cargando...</p></div>
            ) : (
              <>
                <div className="ofertas-afines-detalle-modal__header">
                  <h3 className="ofertas-afines-detalle-modal__title">
                    <HiOutlineAcademicCap style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    {detalleMTM.nombreCargo}
                  </h3>
                  <button type="button" onClick={() => setDetalleMTM(null)} className="ofertas-afines-detalle-modal__close" aria-label="Cerrar">
                    <FiX size={22} />
                  </button>
                </div>
                <div className="ofertas-afines-detalle-modal__body">
                  <dl className="ofertas-afines-detalle-modal__grid">
                    <dt>Dedicación</dt><dd>{detalleMTM.dedicacionHoras?.value ?? '—'}</dd>
                    <dt>Valor por hora</dt><dd>{detalleMTM.valorPorHora?.value ?? '—'}</dd>
                    <dt>Tipo vinculación</dt><dd>{detalleMTM.tipoVinculacion?.value ?? '—'}</dd>
                    <dt>Periodo</dt><dd>{detalleMTM.periodo?.codigo ?? '—'}</dd>
                    <dt>Categoría</dt><dd>{detalleMTM.categoria?.value ?? '—'}</dd>
                    <dt>Vacantes</dt><dd>{detalleMTM.vacantes ?? '—'}</dd>
                    <dt>Vencimiento</dt><dd>{fmtDate(detalleMTM.fechaVencimiento)}</dd>
                    <dt>Asignaturas</dt>
                    <dd>{detalleMTM.asignaturas?.length > 0 ? detalleMTM.asignaturas.map((a) => a.nombreAsignatura || a.codAsignatura).filter(Boolean).join(', ') : '—'}</dd>
                    <dt>Promedio mínimo</dt><dd>{detalleMTM.promedioMinimo ?? '—'}</dd>
                    <dt>Profesor / responsable</dt><dd>{detalleMTM.nombreProfesor ?? '—'}</dd>
                    <dt>Unidad académica</dt><dd>{detalleMTM.unidadAcademica ?? '—'}</dd>
                    <dt>Horario</dt><dd>{detalleMTM.horario ?? '—'}</dd>
                    <dt>Grupo</dt><dd>{detalleMTM.grupo ?? '—'}</dd>
                    <dt>Programas</dt>
                    <dd>{detalleMTM.programas?.length > 0 ? detalleMTM.programas.map((p) => p.name || p.code).filter(Boolean).join(', ') : '—'}</dd>
                  </dl>
                  {detalleMTM.funciones && (
                    <section className="ofertas-afines-detalle-modal__block">
                      <h4 className="ofertas-afines-detalle-modal__label">Funciones</h4>
                      <p className="ofertas-afines-detalle-modal__text">{detalleMTM.funciones}</p>
                    </section>
                  )}
                  {detalleMTM.requisitos && (
                    <section className="ofertas-afines-detalle-modal__block">
                      <h4 className="ofertas-afines-detalle-modal__label">Requisitos</h4>
                      <p className="ofertas-afines-detalle-modal__text">{detalleMTM.requisitos}</p>
                    </section>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
