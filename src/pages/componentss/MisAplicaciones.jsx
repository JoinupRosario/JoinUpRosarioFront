import { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { HiOutlineAcademicCap } from 'react-icons/hi';
import api from '../../services/api';
import DetalleOportunidadModal from './DetalleOportunidadModal';
import '../styles/Oportunidades.css';

const ESTADO_LABELS = {
  aplicado: 'Aplicado',
  empresa_consulto_perfil: 'Empresa consultó perfil',
  empresa_descargo_hv: 'Empresa descargó HV',
  seleccionado_empresa: 'Seleccionado por empresa',
  aceptado_estudiante: 'Aceptado por estudiante',
  rechazado: 'Rechazado',
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function MisAplicaciones() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [detalleOferta, setDetalleOferta] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [detalleMTM, setDetalleMTM] = useState(null);
  const [loadingDetalleMTM, setLoadingDetalleMTM] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get('/opportunities/mis-postulaciones').then((r) => (r.data?.data || []).map((row) => ({ ...row, tipoOportunidad: 'Práctica' }))).catch(() => []),
      api.get('/oportunidades-mtm/mis-postulaciones').then((r) => (r.data?.data || []).map((row) => ({ ...row, tipoOportunidad: 'Monitoría / Tutoría / Mentoría' }))).catch(() => []),
    ]).then(([practicas, mtm]) => {
      if (cancelled) return;
      const merged = [...practicas, ...mtm].sort((a, b) => new Date(b.fechaAplicacion || 0) - new Date(a.fechaAplicacion || 0));
      setData(merged);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const verOferta = (opportunityId, tipo) => {
    if (!opportunityId) return;
    if (tipo === 'Monitoría / Tutoría / Mentoría') {
      setLoadingDetalleMTM(true);
      setDetalleMTM(null);
      api.get(`/oportunidades-mtm/${opportunityId}`).then((res) => setDetalleMTM(res.data)).catch(() => setDetalleMTM(null)).finally(() => setLoadingDetalleMTM(false));
    } else {
      setLoadingDetalle(true);
      setDetalleOferta(null);
      api.get(`/opportunities/${opportunityId}`).then((res) => setDetalleOferta(res.data)).catch(() => setDetalleOferta(null)).finally(() => setLoadingDetalle(false));
    }
  };

  return (
    <div className="dashboard-content">
      <div className="dashboard-welcome" style={{ marginBottom: '1rem' }}>
        <h2>Mis aplicaciones</h2>
        <p>Estado de sus postulaciones a ofertas de práctica y de monitorías, tutorías y mentorías.</p>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Cargando...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="empty-state">
          <p>Aún no ha aplicado a ninguna oportunidad.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#6b7280' }}>
            Use Oportunidades de práctica u Oportunidades de monitoría para ver ofertas y postularse.
          </p>
        </div>
      ) : (
        <div className="oportunidades-section" style={{ overflowX: 'auto' }}>
          <table className="postulants-table" style={{ minWidth: '800px' }}>
            <thead>
              <tr>
                <th>Cargo</th>
                <th>Tipo</th>
                <th>Empresa</th>
                <th>Fecha de aplicación</th>
                <th>Estado oportunidad</th>
                <th>Estado postulación</th>
                <th>Se realizó consulta perfil</th>
                <th>Se realizó descarga HV</th>
                <th>Seleccionado</th>
                <th>Estado (Confirmado/Rechazado)</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={`${row.tipoOportunidad}-${row._id}`}>
                  <td>{row.cargo || '—'}</td>
                  <td>{row.tipoOportunidad || '—'}</td>
                  <td>{row.empresa ?? (row.tipoOportunidad === 'Monitoría / Tutoría / Mentoría' ? 'Universidad del Rosario' : '—')}</td>
                  <td>
                    {row.fechaAplicacion
                      ? new Date(row.fechaAplicacion).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : '—'}
                  </td>
                  <td>{row.estadoOportunidad || '—'}</td>
                  <td>{ESTADO_LABELS[row.estado] || row.estado || '—'}</td>
                  <td>{row.empresaConsultoPerfil ? 'Sí' : 'No'}</td>
                  <td>{row.empresaDescargoHv ? 'Sí' : 'No'}</td>
                  <td>{row.seleccionadoPorEmpresa ?? row.seleccionado ? 'Sí' : 'No'}</td>
                  <td>{row.aceptadoPorEstudiante ? 'Aceptado' : row.estadoConfirmacion === 'rechazado' ? 'Rechazado' : row.estadoConfirmacion === 'confirmado' ? 'Confirmado' : '—'}</td>
                  <td>
                    {(row.opportunityId || row.oportunidadId) ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        onClick={() => verOferta(row.opportunityId || row.oportunidadId, row.tipoOportunidad)}
                      >
                        Ver detalle
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetalleOportunidadModal
        detalle={detalleOferta}
        loading={loadingDetalle}
        onClose={() => { setDetalleOferta(null); }}
        onAplicar={null}
      />

      {/* Modal detalle MTM — mismas clases que en OfertasMonitoria para consistencia */}
      {detalleMTM != null && (
        <div className="modal-overlay" onClick={() => !loadingDetalleMTM && setDetalleMTM(null)}>
          <div className="modal-content ofertas-afines-detalle-modal" onClick={(e) => e.stopPropagation()}>
            {loadingDetalleMTM ? (
              <div className="loading-container"><div className="loading-spinner" /><p>Cargando...</p></div>
            ) : (
              <>
                <div className="ofertas-afines-detalle-modal__header">
                  <h3 className="ofertas-afines-detalle-modal__title"><HiOutlineAcademicCap style={{ marginRight: 8, verticalAlign: 'middle' }} />{detalleMTM.nombreCargo}</h3>
                  <button type="button" onClick={() => setDetalleMTM(null)} className="ofertas-afines-detalle-modal__close" aria-label="Cerrar"><FiX size={22} /></button>
                </div>
                <div className="ofertas-afines-detalle-modal__body">
                  <dl className="ofertas-afines-detalle-modal__grid">
                    <dt>Dedicación</dt>
                    <dd>{detalleMTM.dedicacionHoras?.value ?? '—'}</dd>
                    <dt>Valor por hora</dt>
                    <dd>{detalleMTM.valorPorHora?.value ?? '—'}</dd>
                    <dt>Tipo vinculación</dt>
                    <dd>{detalleMTM.tipoVinculacion?.value ?? '—'}</dd>
                    <dt>Periodo</dt>
                    <dd>{detalleMTM.periodo?.codigo ?? '—'}</dd>
                    <dt>Categoría</dt>
                    <dd>{detalleMTM.categoria?.value ?? '—'}</dd>
                    <dt>Vacantes</dt>
                    <dd>{detalleMTM.vacantes ?? '—'}</dd>
                    <dt>Vencimiento</dt>
                    <dd>{fmtDate(detalleMTM.fechaVencimiento)}</dd>
                    <dt>Asignaturas</dt>
                    <dd>{detalleMTM.asignaturas?.length > 0 ? detalleMTM.asignaturas.map((a) => a.nombreAsignatura || a.codAsignatura).filter(Boolean).join(', ') : '—'}</dd>
                    <dt>Promedio mínimo</dt>
                    <dd>{detalleMTM.promedioMinimo ?? '—'}</dd>
                    <dt>Profesor / responsable</dt>
                    <dd>{detalleMTM.nombreProfesor ?? '—'}</dd>
                    <dt>Unidad académica</dt>
                    <dd>{detalleMTM.unidadAcademica ?? '—'}</dd>
                    <dt>Horario</dt>
                    <dd>{detalleMTM.horario ?? '—'}</dd>
                    <dt>Grupo</dt>
                    <dd>{detalleMTM.grupo ?? '—'}</dd>
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
