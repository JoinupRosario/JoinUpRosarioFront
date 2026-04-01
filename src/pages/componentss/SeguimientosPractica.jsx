import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import '../styles/Oportunidades.css';
import './SeguimientosEstudianteMTM.css';

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
function isValidPostulacionId(id) {
  return typeof id === 'string' && OBJECT_ID_REGEX.test(id);
}

const ESTADO_LABEL = {
  pendiente_revision: 'Pendiente de aprobación',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

const defaultForm = () => ({
  actividad: '',
  tipoActividadSelect: '',
  tipoActividadOtro: '',
  fechaInicio: '',
  fechaFin: '',
  observaciones: '',
  descripcion: '',
  unidadTiempo: 'horas',
  cantidad: '',
});

export default function SeguimientosPractica({ onVolver }) {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const postulacionId = pathSegments[pathSegments.length - 1];
  const fileInputRef = useRef(null);

  const { user, hasPermission } = useAuth();
  const moduloRaw = user?.modulo != null ? String(user.modulo).trim().toLowerCase() : '';
  const isEstudiante = moduloRaw === 'estudiante' || moduloRaw === '';
  const isLeader = String(user?.role || '').toLowerCase() === 'leader' || moduloRaw === 'leader';
  /** Coordinación/admin: nunca mezclar con vista estudiante aunque el token traiga CLPA por error. */
  const canCoordinacion =
    !isEstudiante &&
    (hasPermission('CLPA') || isLeader || ['admin', 'superadmin'].includes(String(user?.role || '').toLowerCase()));

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [totals, setTotals] = useState(null);
  const [pendientes, setPendientes] = useState(0);
  const [planMeta, setPlanMeta] = useState(null);
  const [actividadesPlan, setActividadesPlan] = useState([]);
  const [parametros, setParametros] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm());
  const [uploadingDocId, setUploadingDocId] = useState(null);
  const [accionId, setAccionId] = useState(null);

  const base = `/legalizaciones-practica/seguimientos-practica`;

  const load = () => {
    if (!postulacionId || !isValidPostulacionId(postulacionId)) return;
    setLoading(true);
    api
      .get(`${base}/${postulacionId}`)
      .then((r) => {
        setList(r.data?.data ?? []);
        setTotals(r.data?.totals ?? null);
        setPendientes(r.data?.pendientesRevision ?? 0);
        setPlanMeta(r.data?.planPractica ?? null);
        setActividadesPlan(r.data?.actividadesPlan ?? []);
        setParametros(r.data?.parametros ?? null);
        setError(null);
      })
      .catch((e) => setError(e.response?.data?.message || 'Error al cargar seguimientos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!postulacionId || !isValidPostulacionId(postulacionId)) {
      setLoading(false);
      setError('URL inválida.');
      return;
    }
    load();
  }, [postulacionId]);

  const resetForm = () => {
    setForm(defaultForm());
    setEditingId(null);
  };

  const tipoActividadFinal = () => {
    if (actividadesPlan.length > 0) {
      if (form.tipoActividadSelect === '__otro__') return (form.tipoActividadOtro || '').trim();
      return (form.tipoActividadSelect || '').trim();
    }
    return (form.actividad || '').trim() ? form.actividad : '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const tipo = actividadesPlan.length > 0 ? tipoActividadFinal() : (form.actividad || '').trim();
    if (!tipo) {
      Swal.fire({ icon: 'warning', title: 'Tipo / actividad', text: 'Indique el tipo de actividad.', confirmButtonColor: '#c41e3a' });
      return;
    }
    const actividadTitulo = actividadesPlan.length > 0 ? (form.actividad || '').trim() || tipo : tipo;
    if (!actividadTitulo) {
      Swal.fire({ icon: 'warning', title: 'Actividad', text: 'Describa la actividad.', confirmButtonColor: '#c41e3a' });
      return;
    }
    if (!form.fechaInicio || !form.fechaFin) {
      Swal.fire({ icon: 'warning', title: 'Fechas', text: 'Indique fecha inicio y fin.', confirmButtonColor: '#c41e3a' });
      return;
    }
    if (form.cantidad === '' || Number(form.cantidad) <= 0) {
      Swal.fire({ icon: 'warning', title: 'Tiempo', text: 'Registre horas o días (valor mayor a cero).', confirmButtonColor: '#c41e3a' });
      return;
    }

    const payload = {
      actividad: actividadTitulo,
      tipoActividad: tipo,
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin,
      observaciones: (form.observaciones || '').trim(),
      descripcion: (form.descripcion || '').trim(),
      unidadTiempo: form.unidadTiempo === 'dias' ? 'dias' : 'horas',
      cantidad: Number(form.cantidad),
    };

    setSaving(true);
    if (editingId) {
      api
        .put(`${base}/${postulacionId}/${editingId}`, payload)
        .then(() => {
          resetForm();
          load();
          Swal.fire({ icon: 'success', title: 'Actualizado', confirmButtonColor: '#c41e3a' });
        })
        .catch((err) => Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message }))
        .finally(() => setSaving(false));
    } else {
      api
        .post(`${base}/${postulacionId}`, payload)
        .then(() => {
          resetForm();
          load();
          Swal.fire({ icon: 'success', title: 'Registrado', text: 'Queda pendiente de aprobación del monitor.', confirmButtonColor: '#c41e3a' });
        })
        .catch((err) => Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message }))
        .finally(() => setSaving(false));
    }
  };

  const handleEdit = (seg) => {
    if (seg.estado !== 'pendiente_revision' && seg.estado !== 'rechazado') return;
    const tipo = seg.tipoActividad || '';
    const enPlan = actividadesPlan.includes(tipo);
    setEditingId(seg._id);
    setForm({
      actividad: seg.actividad || '',
      tipoActividadSelect: actividadesPlan.length ? (enPlan ? tipo : '__otro__') : '',
      tipoActividadOtro: enPlan ? '' : tipo,
      fechaInicio: seg.fechaInicio ? new Date(seg.fechaInicio).toISOString().slice(0, 10) : '',
      fechaFin: seg.fechaFin ? new Date(seg.fechaFin).toISOString().slice(0, 10) : '',
      observaciones: seg.observaciones || '',
      descripcion: seg.descripcion || '',
      unidadTiempo: seg.unidadTiempo === 'dias' ? 'dias' : 'horas',
      cantidad: seg.cantidad != null ? String(seg.cantidad) : '',
    });
  };

  const handleDelete = (seg) => {
    if (seg.estado !== 'pendiente_revision') return;
    Swal.fire({
      title: '¿Eliminar?',
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      confirmButtonText: 'Eliminar',
    }).then(({ isConfirmed }) => {
      if (!isConfirmed) return;
      api.delete(`${base}/${postulacionId}/${seg._id}`).then(() => {
        load();
        Swal.fire({ icon: 'success', title: 'Eliminado', confirmButtonColor: '#c41e3a' });
      });
    });
  };

  const aprobar = (id) => {
    setAccionId(id);
    api
      .patch(`${base}/${postulacionId}/${id}/aprobar`)
      .then(() => {
        load();
        Swal.fire({ icon: 'success', title: 'Aprobado', confirmButtonColor: '#c41e3a' });
      })
      .catch((e) => Swal.fire({ icon: 'error', text: e.response?.data?.message }))
      .finally(() => setAccionId(null));
  };

  const rechazar = async (id) => {
    const { value: obs } = await Swal.fire({
      title: 'Observaciones (obligatorio)',
      input: 'textarea',
      inputPlaceholder: 'Motivo del rechazo',
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      confirmButtonText: 'Rechazar',
      inputValidator: (v) => (!v || !String(v).trim() ? 'Indique observaciones' : null),
    });
    if (!obs) return;
    setAccionId(id);
    api
      .patch(`${base}/${postulacionId}/${id}/rechazar`, { observaciones: obs })
      .then(() => {
        load();
        Swal.fire({ icon: 'success', title: 'Rechazado', confirmButtonColor: '#c41e3a' });
      })
      .catch((e) => Swal.fire({ icon: 'error', text: e.response?.data?.message }))
      .finally(() => setAccionId(null));
  };

  const triggerUpload = (seguimientoId) => {
    if (!fileInputRef.current) return;
    fileInputRef.current.setAttribute('data-seguimiento-id', seguimientoId);
    fileInputRef.current.click();
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    const segId = fileInputRef.current?.getAttribute('data-seguimiento-id');
    e.target.value = '';
    if (!file || !segId) return;
    setUploadingDocId(segId);
    const fd = new FormData();
    fd.append('file', file);
    api
      .post(`${base}/${postulacionId}/${segId}/documentos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(() => {
        load();
        Swal.fire({ icon: 'success', title: 'Documento cargado', confirmButtonColor: '#c41e3a' });
      })
      .catch((err) => Swal.fire({ icon: 'error', text: err.response?.data?.message }))
      .finally(() => setUploadingDocId(null));
  };

  const verDoc = (segId, docId) => {
    api.get(`${base}/${postulacionId}/${segId}/documentos/${docId}/url`).then((r) => {
      const url = r.data?.url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });
  };

  const cerrarCaso = () => {
    Swal.fire({
      title: '¿Cerrar caso de seguimiento?',
      text: 'El estudiante no podrá registrar más actividades.',
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      confirmButtonText: 'Cerrar',
    }).then(({ isConfirmed }) => {
      if (!isConfirmed) return;
      api
        .post(`/legalizaciones-practica/plan-practica/${postulacionId}/cerrar-seguimiento-caso`)
        .then(() => {
          load();
          Swal.fire({ icon: 'success', title: 'Caso cerrado', confirmButtonColor: '#c41e3a' });
        })
        .catch((e) => Swal.fire({ icon: 'error', text: e.response?.data?.message }));
    });
  };

  const puedeEditarForm = isEstudiante && !planMeta?.seguimientoCasoCerrado;

  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-content">
        <p style={{ color: '#c41e3a' }}>{error}</p>
        <button type="button" className="btn-secondary" onClick={onVolver}>
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-content legalizacion-mtm legalizacion-mtm--full">
      <header className="legalizacion-mtm__topbar">
        <div className="legalizacion-mtm__topbar-left">
          <button type="button" className="legalizacion-mtm__back" onClick={onVolver}>
            ← Volver
          </button>
          <h2 className="legalizacion-mtm__title">Seguimiento — Plan de práctica</h2>
        </div>
        <div className="legalizacion-mtm__topbar-actions" style={{ flexWrap: 'wrap', gap: 8 }}>
          {canCoordinacion && (
            <>
              <button
                type="button"
                className="legalizacion-mtm__btn legalizacion-mtm__btn--secondary"
                onClick={() => {
                  api
                    .get('/legalizaciones-practica/seguimientos-practica/admin/reporte-csv', { responseType: 'blob' })
                    .then((res) => {
                      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = `reporte_seguimientos_practica_${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                      URL.revokeObjectURL(a.href);
                    })
                    .catch(() => Swal.fire({ icon: 'error', title: 'Error al exportar' }));
                }}
              >
                Exportar CSV
              </button>
              <button
                type="button"
                className="legalizacion-mtm__btn legalizacion-mtm__btn--secondary"
                onClick={() => {
                  api.get('/legalizaciones-practica/seguimientos-practica/admin/estadisticas').then((r) => {
                    Swal.fire({
                      title: 'Estadísticas',
                      html: `<pre style="text-align:left;font-size:12px">${JSON.stringify(r.data, null, 2)}</pre>`,
                      width: 480,
                      confirmButtonColor: '#c41e3a',
                    });
                  });
                }}
              >
                Estadísticas
              </button>
            </>
          )}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              api
                .get(`/legalizaciones-practica/seguimientos-practica/${postulacionId}/registro-documento`, { responseType: 'text' })
                .then((res) => {
                  const w = window.open('', '_blank');
                  if (w) {
                    w.document.write(res.data);
                    w.document.close();
                  }
                })
                .catch(() => Swal.fire({ icon: 'error', title: 'No se pudo generar el documento' }));
            }}
          >
            Ver registro (documento)
          </button>
          {canCoordinacion && !planMeta?.seguimientoCasoCerrado && (
            <button type="button" className="btn-guardar" onClick={cerrarCaso}>
              Cerrar caso (líder)
            </button>
          )}
        </div>
      </header>

      {planMeta?.seguimientoCasoCerrado && (
        <p className="legalizacion-mtm__estado legalizacion-mtm__estado--ok" style={{ margin: '12px 0' }}>
          Caso de seguimiento cerrado. Solo consulta de registros.
        </p>
      )}

      {totals && (
        <section className="legalizacion-mtm__section" style={{ marginTop: 12 }}>
          <h3 className="legalizacion-mtm__section-title">Totales aprobados</h3>
          <p>
            Días: <strong>{totals.totalDiasAprobados ?? 0}</strong> — Horas: <strong>{totals.totalHorasAprobadas ?? 0}</strong> — Acumulado
            (h-eq):{' '}
            <strong>
              {typeof totals.totalDiasHorasAcumuladas === 'number'
                ? totals.totalDiasHorasAcumuladas.toFixed(2)
                : totals.totalDiasHorasAcumuladas ?? '—'}
            </strong>
            {parametros?.horasPorDiaEquivalente != null && (
              <span style={{ color: '#6b7280', fontSize: 13 }}> (equiv. {parametros.horasPorDiaEquivalente} h/día)</span>
            )}
          </p>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Pendientes de aprobación: {pendientes}</p>
        </section>
      )}

      {puedeEditarForm && (
        <form className="legalizacion-mtm__section" onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <h3 className="legalizacion-mtm__section-title">{editingId ? 'Editar actividad' : 'Nueva actividad'}</h3>
          {actividadesPlan.length > 0 ? (
            <>
              <label className="legalizacion-mtm__hint">Tipo de actividad</label>
              <select
                className="form-input"
                style={{ maxWidth: 480, marginBottom: 8 }}
                value={form.tipoActividadSelect}
                onChange={(e) => setForm((f) => ({ ...f, tipoActividadSelect: e.target.value }))}
              >
                <option value="">Seleccione…</option>
                {actividadesPlan.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value="__otro__">Otro (especificar)</option>
              </select>
              {form.tipoActividadSelect === '__otro__' && (
                <input
                  className="form-input"
                  placeholder="Especifique el tipo"
                  value={form.tipoActividadOtro}
                  onChange={(e) => setForm((f) => ({ ...f, tipoActividadOtro: e.target.value }))}
                  style={{ marginBottom: 8 }}
                />
              )}
              <label className="legalizacion-mtm__hint">Nombre / descripción corta de la actividad</label>
              <input
                className="form-input"
                value={form.actividad}
                onChange={(e) => setForm((f) => ({ ...f, actividad: e.target.value }))}
                style={{ marginBottom: 8 }}
              />
            </>
          ) : (
            <>
              <label className="legalizacion-mtm__hint">Actividad</label>
              <input
                className="form-input"
                value={form.actividad}
                onChange={(e) => setForm((f) => ({ ...f, actividad: e.target.value }))}
                style={{ marginBottom: 8 }}
              />
            </>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <div>
              <label className="legalizacion-mtm__hint">Fecha inicio</label>
              <input
                type="date"
                className="form-input"
                value={form.fechaInicio}
                onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))}
              />
            </div>
            <div>
              <label className="legalizacion-mtm__hint">Fecha fin</label>
              <input
                type="date"
                className="form-input"
                value={form.fechaFin}
                onChange={(e) => setForm((f) => ({ ...f, fechaFin: e.target.value }))}
              />
            </div>
          </div>
          <label className="legalizacion-mtm__hint">Unidad de tiempo reportada</label>
          <div style={{ marginBottom: 8 }}>
            <label style={{ marginRight: 16 }}>
              <input
                type="radio"
                checked={form.unidadTiempo === 'horas'}
                onChange={() => setForm((f) => ({ ...f, unidadTiempo: 'horas' }))}
              />{' '}
              Horas
            </label>
            <label>
              <input
                type="radio"
                checked={form.unidadTiempo === 'dias'}
                onChange={() => setForm((f) => ({ ...f, unidadTiempo: 'dias' }))}
              />{' '}
              Días
            </label>
          </div>
          <label className="legalizacion-mtm__hint">Cantidad ({form.unidadTiempo === 'dias' ? 'días' : 'horas'})</label>
          <input
            type="number"
            min={0}
            step={0.5}
            className="form-input"
            style={{ maxWidth: 160 }}
            value={form.cantidad}
            onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
          />
          <label className="legalizacion-mtm__hint">Observaciones</label>
          <textarea className="form-textarea" rows={2} value={form.observaciones} onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} />
          <label className="legalizacion-mtm__hint">Descripción (máx. 5000 caracteres)</label>
          <textarea
            className="form-textarea"
            rows={4}
            maxLength={5000}
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
          />
          <div style={{ marginTop: 12 }}>
            <button type="submit" className="btn-guardar" disabled={saving}>
              {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Registrar actividad'}
            </button>
            {editingId && (
              <button type="button" className="btn-secondary" style={{ marginLeft: 8 }} onClick={resetForm}>
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      )}

      <section className="legalizacion-mtm__section" style={{ marginTop: 24 }}>
        <h3 className="legalizacion-mtm__section-title">Registros</h3>
        <div className="oportunidades-section legaliz-mtm-table-wrap">
          <table className="legaliz-mtm-table">
            <thead>
              <tr>
                <th>Actividad</th>
                <th>Tipo</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Tiempo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s._id}>
                  <td>{s.actividad}</td>
                  <td>{s.tipoActividad}</td>
                  <td>{s.fechaInicio ? new Date(s.fechaInicio).toLocaleDateString('es-CO') : '—'}</td>
                  <td>{s.fechaFin ? new Date(s.fechaFin).toLocaleDateString('es-CO') : '—'}</td>
                  <td>
                    {s.cantidad} {s.unidadTiempo === 'dias' ? 'd' : 'h'}
                  </td>
                  <td>
                    <span title={s.observacionesRechazo || ''}>{ESTADO_LABEL[s.estado] ?? s.estado}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {puedeEditarForm && (s.estado === 'pendiente_revision' || s.estado === 'rechazado') && (
                        <>
                          <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => handleEdit(s)}>
                            Editar
                          </button>
                          {s.estado === 'pendiente_revision' && (
                            <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => handleDelete(s)}>
                              Eliminar
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: 12 }}
                            disabled={uploadingDocId === s._id}
                            onClick={() => triggerUpload(s._id)}
                          >
                            {uploadingDocId === s._id ? '…' : 'Adjunto'}
                          </button>
                        </>
                      )}
                      {(s.documentos || []).map((d) => (
                        <button key={d._id} type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => verDoc(s._id, d._id)}>
                          Ver doc
                        </button>
                      ))}
                      {canCoordinacion && s.estado === 'pendiente_revision' && (
                        <>
                          <button
                            type="button"
                            className="btn-guardar"
                            style={{ fontSize: 12 }}
                            disabled={accionId === s._id}
                            onClick={() => aprobar(s._id)}
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: 12 }}
                            disabled={accionId === s._id}
                            onClick={() => rechazar(s._id)}
                          >
                            Rechazar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p style={{ color: '#6b7280' }}>No hay registros aún.</p>}
        </div>
      </section>

      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={onFile} accept=".pdf,.png,.jpg,.jpeg,.docx,application/pdf" />
    </div>
  );
}
