import { useState, useEffect } from 'react';
import { FiX, FiDownload } from 'react-icons/fi';
import { HiOutlineAcademicCap } from 'react-icons/hi';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
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
  const [submittingResponder, setSubmittingResponder] = useState(null);

  const addBusinessDays = (date, days) => {
    const d = new Date(date);
    let added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) added++;
    }
    return d;
  };

  const refetch = () => {
    setLoading(true);
    Promise.all([
      api.get('/opportunities/mis-postulaciones').then((r) => (r.data?.data || []).map((row) => ({ ...row, tipoOportunidad: 'Práctica' }))).catch(() => []),
      api.get('/oportunidades-mtm/mis-postulaciones').then((r) => {
        const dias = r.data?.diasHabilesAceptarSeleccion ?? 8;
        return (r.data?.data || []).map((row) => ({ ...row, tipoOportunidad: 'Monitoría / Tutoría / Mentoría', diasHabilesAceptarSeleccion: dias }));
      }).catch(() => []),
    ]).then(([practicas, mtm]) => {
      const merged = [...practicas, ...mtm].sort((a, b) => new Date(b.fechaAplicacion || 0) - new Date(a.fechaAplicacion || 0));
      setData(merged);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    refetch();
  }, []);

  const estudianteResponder = (row, accion) => {
    if (accion !== 'confirmar' && accion !== 'rechazar') return;
    const id = row._id;
    const isMTM = row.tipoOportunidad === 'Monitoría / Tutoría / Mentoría';
    const base = isMTM ? `/oportunidades-mtm/${row.oportunidadId}` : `/opportunities/${row.opportunityId}`;
    const url = `${base}/applications/${id}/estudiante-responder`;
    setSubmittingResponder(id);
    api.patch(url, { accion })
      .then(() => refetch())
      .catch((err) => {
        const msg = err.response?.data?.message || err.message || 'Error al guardar';
        alert(msg);
      })
      .finally(() => setSubmittingResponder(null));
  };

  const exportarExcel = () => {
    if (data.length === 0) {
      Swal.fire({ icon: 'info', title: 'Sin datos', text: 'No hay aplicaciones para exportar.', confirmButtonColor: '#c41e3a' });
      return;
    }
    const headers = [
      'Cargo', 'Tipo', 'Empresa', 'Nombre coordinador', 'Fecha de aplicación', 'Estado oportunidad', 'Estado postulación',
      'Consulta perfil', 'Descarga HV', 'Seleccionado', 'Estado Confirmado/Rechazado'
    ];
    const rows = data.map((row) => [
      row.cargo || '',
      row.tipoOportunidad || '',
      row.empresa ?? (row.tipoOportunidad === 'Monitoría / Tutoría / Mentoría' ? 'Universidad del Rosario' : ''),
      row.nombreCoordinador ?? '',
      row.fechaAplicacion ? new Date(row.fechaAplicacion).toLocaleDateString('es-CO') : '',
      row.estadoOportunidad === 'Inactiva' ? 'Cerrada' : (row.estadoOportunidad || ''),
      ESTADO_LABELS[row.estado] || row.estado || '',
      row.empresaConsultoPerfil ? 'Sí' : 'No',
      row.empresaDescargoHv ? 'Sí' : 'No',
      row.seleccionadoPorEmpresa ?? row.seleccionado ? 'Sí' : 'No',
      row.estado === 'aceptado_estudiante' ? 'Aceptado' : row.estado === 'rechazado' && (row.seleccionadoPorEmpresa || row.seleccionado) ? 'Rechazado' : row.estado === 'seleccionado_empresa' ? 'Pendiente' : '',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mis aplicaciones');
    XLSX.writeFile(wb, `mis_aplicaciones_${new Date().toISOString().slice(0, 10)}.xlsx`);
    Swal.fire({ icon: 'success', title: 'Exportado', text: `Se exportaron ${data.length} registro(s) a Excel.`, confirmButtonColor: '#c41e3a', timer: 2000, timerProgressBar: true });
  };

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
    <div className="dashboard-content mis-aplicaciones-content">
      <div className="dashboard-welcome" style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h2>Mis aplicaciones</h2>
          <p style={{ margin: 0 }}>Estado de sus postulaciones a ofertas de práctica y de monitorías, tutorías y mentorías.</p>
        </div>
        {data.length > 0 && (
          <button type="button" className="btn-guardar" onClick={exportarExcel} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <FiDownload size={18} /> Exportar a Excel
          </button>
        )}
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
        <div className="oportunidades-section mis-aplicaciones-table-wrap">
          <table className="postulants-table mis-aplicaciones-table" style={{ minWidth: '800px' }}>
            <thead>
              <tr>
                <th>Cargo</th>
                <th>Tipo</th>
                <th>Empresa</th>
                <th>Nombre coordinador</th>
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
                  <td>{row.nombreCoordinador ?? '—'}</td>
                  <td>
                    {row.fechaAplicacion
                      ? new Date(row.fechaAplicacion).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : '—'}
                  </td>
                  <td>{row.estadoOportunidad === 'Inactiva' ? 'Cerrada' : (row.estadoOportunidad || '—')}</td>
                  <td>{ESTADO_LABELS[row.estado] || row.estado || '—'}</td>
                  <td>{row.empresaConsultoPerfil ? 'Sí' : 'No'}</td>
                  <td>{row.empresaDescargoHv ? 'Sí' : 'No'}</td>
                  <td>{row.seleccionadoPorEmpresa ?? row.seleccionado ? 'Sí' : 'No'}</td>
                  <td>
                    {row.estado === 'aceptado_estudiante'
                      ? 'Aceptado'
                      : row.estado === 'rechazado' && (row.seleccionadoPorEmpresa || row.seleccionado)
                        ? 'Rechazado'
                        :                         row.estado === 'seleccionado_empresa'
                          ? (() => {
                              const isMTM = row.tipoOportunidad === 'Monitoría / Tutoría / Mentoría';
                              const dias = row.diasHabilesAceptarSeleccion ?? 8;
                              const limite = row.seleccionadoAt && isMTM ? addBusinessDays(new Date(row.seleccionadoAt), dias) : null;
                              const plazoVencido = limite && new Date() > limite;
                              const bloqueadoPorAceptacion = !!row.tieneAceptadaDefinitivaGlobal && row.estado !== 'aceptado_estudiante' && !row.puedeAceptarDefinitivo;
                              return plazoVencido ? (
                                <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Plazo vencido</span>
                              ) : bloqueadoPorAceptacion ? (
                                <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                                  Ya aceptó otra oportunidad definitivamente
                                </span>
                              ) : (
                              <select
                                value=""
                                disabled={!!submittingResponder}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  e.target.value = '';
                                  if (v !== 'confirmar' && v !== 'rechazar') return;
                                  const esConfirmar = v === 'confirmar';
                                  const titulo = esConfirmar ? '¿Confirmar selección?' : '¿Rechazar selección?';
                                  const texto = esConfirmar
                                    ? '¿Está seguro de que desea confirmar esta selección? Quedará registrado como aceptado.'
                                    : '¿Está seguro de que desea rechazar esta selección? La postulación quedará como rechazada.';
                                  const btn = esConfirmar ? 'Sí, confirmar' : 'Sí, rechazar';
                                  Swal.fire({
                                    icon: 'question',
                                    title: titulo,
                                    text: texto,
                                    showCancelButton: true,
                                    confirmButtonText: btn,
                                    cancelButtonText: 'Cancelar',
                                    confirmButtonColor: '#c41e3a',
                                  }).then((result) => {
                                    if (result.isConfirmed) estudianteResponder(row, v);
                                  });
                                }}
                                style={{ minWidth: '120px', padding: '4px 6px' }}
                              >
                                <option value="">Pendiente — Confirmar / Rechazar</option>
                                <option value="confirmar">Confirmar</option>
                                <option value="rechazar">Rechazar</option>
                              </select>
                              );
                            })()
                          : '—'}
                  </td>
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
