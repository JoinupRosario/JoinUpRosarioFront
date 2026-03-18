import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../styles/Oportunidades.css';

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
function isValidPostulacionId(id) {
  return typeof id === 'string' && OBJECT_ID_REGEX.test(id);
}

const ESTADO_LABEL = {
  pendiente_revision: 'Pendiente de revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

const defaultForm = () => ({
  fecha: '',
  tipoActividad: '',
  tipoActividadSelect: '', // valor del select (tema del plan o '__otro__')
  tipoActividadOtro: '',   // texto cuando se elige "Otro (especificar)"
  numeroEstudiantesConvocados: '',
  numeroEstudiantesAtendidos: '',
  cantidadHoras: '',
  comentarios: '',
});

export default function SeguimientosMTM({ onVolver, compact = false, isAdmin = false }) {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const postulacionId = pathSegments[pathSegments.length - 1];
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [totalHorasAprobadas, setTotalHorasAprobadas] = useState(0);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm());
  const [uploadingDocId, setUploadingDocId] = useState(null);
  const [accionSeguimientoId, setAccionSeguimientoId] = useState(null); // aprobar/rechazar loading
  const [todosSeguimientosResueltos, setTodosSeguimientosResueltos] = useState(false); // HU009: para finalizar MTM
  const [seleccionadosMasivo, setSeleccionadosMasivo] = useState(new Set()); // IDs para aprobación/rechazo masivo
  const [accionMasivaLoading, setAccionMasivaLoading] = useState(false);
  const [actividadesPlan, setActividadesPlan] = useState([]); // Actividades del plan de trabajo para el select

  const load = () => {
    if (!postulacionId || !isValidPostulacionId(postulacionId)) return;
    setLoading(true);
    api.get(`/oportunidades-mtm/seguimientos/${postulacionId}`)
      .then((r) => {
        setList(r.data?.data ?? []);
        setTotalHorasAprobadas(r.data?.totalHorasAprobadas ?? 0);
        setTodosSeguimientosResueltos(!!r.data?.todosSeguimientosResueltos);
        setActividadesPlan(r.data?.actividadesPlan ?? []);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const {
      fecha,
      tipoActividad,
      tipoActividadSelect,
      tipoActividadOtro,
      numeroEstudiantesConvocados,
      numeroEstudiantesAtendidos,
      cantidadHoras,
      comentarios,
    } = form;
    const tipoActividadFinal = actividadesPlan.length > 0
      ? (tipoActividadSelect === '__otro__' ? (tipoActividadOtro || '').trim() : (tipoActividadSelect || '').trim())
      : (tipoActividad || '').trim();
    if (!tipoActividadFinal) {
      Swal.fire({ icon: 'warning', title: 'Tipo de actividad requerido', text: 'Seleccione o indique el tipo de actividad.', confirmButtonColor: '#c41e3a' });
      return;
    }
    const payload = {
      fecha: fecha || undefined,
      tipoActividad: tipoActividadFinal || undefined,
      numeroEstudiantesConvocados: numeroEstudiantesConvocados !== '' ? Number(numeroEstudiantesConvocados) : undefined,
      numeroEstudiantesAtendidos: numeroEstudiantesAtendidos !== '' ? Number(numeroEstudiantesAtendidos) : undefined,
      cantidadHoras: cantidadHoras !== '' ? Number(cantidadHoras) : undefined,
      comentarios: (comentarios || '').trim() || undefined,
    };
    setSaving(true);
    if (editingId) {
      api.put(`/oportunidades-mtm/seguimientos/${postulacionId}/${editingId}`, payload)
        .then((r) => {
          setList((prev) => prev.map((s) => (s._id === editingId ? r.data?.seguimiento : s)));
          resetForm();
          Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Seguimiento actualizado.', confirmButtonColor: '#c41e3a' });
        })
        .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo actualizar.', confirmButtonColor: '#c41e3a' }))
        .finally(() => setSaving(false));
    } else {
      api.post(`/oportunidades-mtm/seguimientos/${postulacionId}`, payload)
        .then((r) => {
          setList((prev) => [r.data?.seguimiento, ...prev]);
          resetForm();
          Swal.fire({ icon: 'success', title: 'Registrado', text: 'Seguimiento registrado. Queda en Pendiente de revisión.', confirmButtonColor: '#c41e3a' });
        })
        .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo crear.', confirmButtonColor: '#c41e3a' }))
        .finally(() => setSaving(false));
    }
  };

  const handleEdit = (seg) => {
    if (seg.estado !== 'pendiente_revision') return;
    const tema = seg.tipoActividad ?? seg.tipo ?? '';
    const enPlan = actividadesPlan.includes(tema);
    setEditingId(seg._id);
    setForm({
      fecha: seg.fecha ? new Date(seg.fecha).toISOString().slice(0, 10) : '',
      tipoActividad: tema,
      tipoActividadSelect: enPlan ? tema : '__otro__',
      tipoActividadOtro: enPlan ? '' : tema,
      numeroEstudiantesConvocados: seg.numeroEstudiantesConvocados ?? '',
      numeroEstudiantesAtendidos: seg.numeroEstudiantesAtendidos ?? '',
      cantidadHoras: seg.cantidadHoras ?? '',
      comentarios: seg.comentarios ?? seg.descripcion ?? '',
    });
  };

  const handleDelete = (seg) => {
    if (seg.estado !== 'pendiente_revision') return;
    Swal.fire({
      icon: 'warning',
      title: 'Eliminar seguimiento',
      text: '¿Está seguro de eliminar este registro?',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c41e3a',
    }).then(({ isConfirmed }) => {
      if (!isConfirmed) return;
      api.delete(`/oportunidades-mtm/seguimientos/${postulacionId}/${seg._id}`)
        .then(() => {
          setList((prev) => prev.filter((s) => s._id !== seg._id));
          setTotalHorasAprobadas((prev) => (seg.estado === 'aprobado' ? Math.max(0, prev - (seg.cantidadHoras || 0)) : prev));
          if (editingId === seg._id) resetForm();
          Swal.fire({ icon: 'success', title: 'Eliminado', confirmButtonColor: '#c41e3a' });
        })
        .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo eliminar.', confirmButtonColor: '#c41e3a' }));
    });
  };

  const triggerUploadDoc = (seguimientoId) => {
    if (!fileInputRef.current) return;
    fileInputRef.current.setAttribute('data-seguimiento-id', seguimientoId);
    fileInputRef.current.click();
  };

  const onFileSelect = (e) => {
    const file = e.target.files?.[0];
    const segId = fileInputRef.current?.getAttribute('data-seguimiento-id');
    e.target.value = '';
    if (!file || !segId) return;
    if (file.type !== 'application/pdf') {
      Swal.fire({ icon: 'warning', title: 'Solo PDF', text: 'El documento de soporte debe ser PDF.', confirmButtonColor: '#c41e3a' });
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    setUploadingDocId(segId);
    api.post(`/oportunidades-mtm/seguimientos/${postulacionId}/${segId}/documento`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
      .then((r) => {
        setList((prev) => prev.map((s) => (s._id === segId ? r.data?.seguimiento : s)));
        Swal.fire({ icon: 'success', title: 'Documento subido', confirmButtonColor: '#c41e3a' });
      })
      .catch((err) => Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo subir.', confirmButtonColor: '#c41e3a' }))
      .finally(() => setUploadingDocId(null));
  };

  const openDocUrl = (seg) => {
    if (!seg.documentoSoporte?.key) return;
    const urlPath = isAdmin ? 'documento/url-admin' : 'documento/url';
    api.get(`/oportunidades-mtm/seguimientos/${postulacionId}/${seg._id}/${urlPath}`)
      .then((r) => window.open(r.data?.url, '_blank'))
      .catch((err) => Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo abrir.', confirmButtonColor: '#c41e3a' }));
  };

  const downloadDocAdmin = (seg) => {
    if (!seg.documentoSoporte?.key) return;
    api.get(`/oportunidades-mtm/seguimientos/${postulacionId}/${seg._id}/documento/descarga`, { responseType: 'blob' })
      .then((res) => {
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = (seg.documentoSoporte?.originalName || 'soporte-seguimiento.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch((err) => Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo descargar.', confirmButtonColor: '#c41e3a' }));
  };

  const handleAprobar = (seg) => {
    setAccionSeguimientoId(seg._id);
    api.patch(`/oportunidades-mtm/seguimientos/${postulacionId}/${seg._id}/aprobar`)
      .then((r) => {
        setList((prev) => prev.map((s) => (s._id === seg._id ? r.data?.seguimiento : s)));
        setTotalHorasAprobadas((prev) => prev + (seg.cantidadHoras || 0));
        Swal.fire({ icon: 'success', title: 'Aprobado', confirmButtonColor: '#c41e3a' });
      })
      .catch((err) => Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo aprobar.', confirmButtonColor: '#c41e3a' }))
      .finally(() => setAccionSeguimientoId(null));
  };

  const handleRechazar = (seg) => {
    Swal.fire({
      icon: 'warning',
      title: 'Rechazar seguimiento',
      text: 'Indique el motivo del rechazo (opcional):',
      input: 'textarea',
      inputPlaceholder: 'Motivo',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c41e3a',
    }).then(({ isConfirmed, value }) => {
      if (!isConfirmed) return;
      setAccionSeguimientoId(seg._id);
      api.patch(`/oportunidades-mtm/seguimientos/${postulacionId}/${seg._id}/rechazar`, { motivo: value || '' })
        .then((r) => {
          setList((prev) => prev.map((s) => (s._id === seg._id ? r.data?.seguimiento : s)));
          Swal.fire({ icon: 'success', title: 'Rechazado', confirmButtonColor: '#c41e3a' });
        })
        .catch((err) => Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo rechazar.', confirmButtonColor: '#c41e3a' }))
        .finally(() => setAccionSeguimientoId(null));
    });
  };

  // HU009: aprobación/rechazo masivo
  const pendientesIds = list.filter((s) => s.estado === 'pendiente_revision').map((s) => s._id);
  const toggleSeleccionMasivo = (id) => {
    setSeleccionadosMasivo((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const seleccionarTodosPendientes = () => {
    if (seleccionadosMasivo.size === pendientesIds.length) setSeleccionadosMasivo(new Set());
    else setSeleccionadosMasivo(new Set(pendientesIds));
  };
  const handleAprobarMasivo = () => {
    const ids = Array.from(seleccionadosMasivo).filter((id) => pendientesIds.includes(id));
    if (ids.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Seleccione al menos un seguimiento en Pendiente de revisión.', confirmButtonColor: '#c41e3a' });
      return;
    }
    setAccionMasivaLoading(true);
    api.post(`/oportunidades-mtm/seguimientos/${postulacionId}/accion-masiva`, { accion: 'aprobar', seguimientoIds: ids })
      .then((r) => {
        setList(r.data?.data ?? []);
        setTotalHorasAprobadas(r.data?.totalHorasAprobadas ?? 0);
        setTodosSeguimientosResueltos(!!r.data?.todosSeguimientosResueltos);
        setSeleccionadosMasivo(new Set());
        Swal.fire({ icon: 'success', title: r.data?.message || 'Aprobados', confirmButtonColor: '#c41e3a' });
      })
      .catch((err) => Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo aprobar.', confirmButtonColor: '#c41e3a' }))
      .finally(() => setAccionMasivaLoading(false));
  };
  const handleRechazarMasivo = () => {
    const ids = Array.from(seleccionadosMasivo).filter((id) => pendientesIds.includes(id));
    if (ids.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Seleccione al menos un seguimiento en Pendiente de revisión.', confirmButtonColor: '#c41e3a' });
      return;
    }
    Swal.fire({
      icon: 'warning',
      title: 'Rechazar seguimientos seleccionados',
      text: 'Indique el motivo del rechazo (opcional):',
      input: 'textarea',
      inputPlaceholder: 'Motivo',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c41e3a',
    }).then(({ isConfirmed, value }) => {
      if (!isConfirmed) return;
      setAccionMasivaLoading(true);
      api.post(`/oportunidades-mtm/seguimientos/${postulacionId}/accion-masiva`, { accion: 'rechazar', seguimientoIds: ids, motivo: value || '' })
        .then((r) => {
          setList(r.data?.data ?? []);
          setTotalHorasAprobadas(r.data?.totalHorasAprobadas ?? 0);
          setTodosSeguimientosResueltos(!!r.data?.todosSeguimientosResueltos);
          setSeleccionadosMasivo(new Set());
          Swal.fire({ icon: 'success', title: r.data?.message || 'Rechazados', confirmButtonColor: '#c41e3a' });
        })
        .catch((err) => Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo rechazar.', confirmButtonColor: '#c41e3a' }))
        .finally(() => setAccionMasivaLoading(false));
    });
  };

  if (loading && list.length === 0) {
    return (
      <div className="dashboard-content">
        <div className="loading-container"><div className="loading-spinner" /><p>Cargando...</p></div>
      </div>
    );
  }
  if (error && list.length === 0) {
    return (
      <div className="dashboard-content">
        <p style={{ color: '#c41e3a' }}>{error}</p>
        {onVolver && <button type="button" className="btn-secondary" onClick={onVolver}>Volver</button>}
      </div>
    );
  }

  return (
    <div className={`dashboard-content legalizacion-mtm ${compact ? 'seguimientos-mtm--compact' : 'legalizacion-mtm--full'}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={onFileSelect}
      />
      {onVolver && (
        <header className="legalizacion-mtm__topbar">
          <button type="button" className="legalizacion-mtm__back" onClick={onVolver}>← Volver</button>
          <h2 className="legalizacion-mtm__title">Seguimientos Plan de Trabajo</h2>
        </header>
      )}
      {!compact && isAdmin && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.95rem', color: '#374151', margin: 0 }}>
            Total horas aprobadas (reporte reconocimiento DAF): <strong>{totalHorasAprobadas}</strong>
          </p>
          {todosSeguimientosResueltos && (
            <p style={{ fontSize: '0.9rem', color: '#059669', marginTop: 6, marginBottom: 0 }}>
              Todas las actividades están aprobadas o rechazadas. La MTM puede finalizarse según corresponda.
            </p>
          )}
        </div>
      )}

      {!isAdmin && (
      <form onSubmit={handleSubmit} className="seguimientos-mtm-form" style={{ marginBottom: 24, padding: 16, background: '#f9fafb', borderRadius: 8 }}>
        <h4 style={{ marginTop: 0 }}>{editingId ? 'Editar seguimiento' : 'Nuevo seguimiento'}</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
          {actividadesPlan.length > 0 ? (
            <>
              <label className="legalizacion-mtm__label-block">
                <span className="legalizacion-mtm__label">Tipo de actividad *</span>
                <select
                  className="legalizacion-mtm__input"
                  value={form.tipoActividadSelect}
                  onChange={(e) => setForm((f) => ({ ...f, tipoActividadSelect: e.target.value }))}
                >
                  <option value="">Seleccione una actividad del plan</option>
                  {actividadesPlan.map((tema) => (
                    <option key={tema} value={tema}>{tema}</option>
                  ))}
                  <option value="__otro__">Otro (especificar)</option>
                </select>
              </label>
              {form.tipoActividadSelect === '__otro__' && (
                <label className="legalizacion-mtm__label-block" style={{ gridColumn: '1 / -1' }}>
                  <span className="legalizacion-mtm__label">Especifique el tipo de actividad</span>
                  <input
                    type="text"
                    className="legalizacion-mtm__input"
                    value={form.tipoActividadOtro}
                    onChange={(e) => setForm((f) => ({ ...f, tipoActividadOtro: e.target.value }))}
                    placeholder="Ej. Tutoría grupal"
                  />
                </label>
              )}
            </>
          ) : (
            <label className="legalizacion-mtm__label-block">
              <span className="legalizacion-mtm__label">Tipo de actividad *</span>
              <input
                type="text"
                className="legalizacion-mtm__input"
                value={form.tipoActividad}
                onChange={(e) => setForm((f) => ({ ...f, tipoActividad: e.target.value }))}
                placeholder="Ej. Tutoría grupal"
              />
            </label>
          )}
          <label className="legalizacion-mtm__label-block">
            <span className="legalizacion-mtm__label">Fecha *</span>
            <input
              type="date"
              className="legalizacion-mtm__input"
              value={form.fecha}
              onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
            />
          </label>
          <label className="legalizacion-mtm__label-block">
            <span className="legalizacion-mtm__label">Est. convocados</span>
            <input
              type="number"
              min={0}
              className="legalizacion-mtm__input"
              value={form.numeroEstudiantesConvocados}
              onChange={(e) => setForm((f) => ({ ...f, numeroEstudiantesConvocados: e.target.value }))}
              placeholder="0"
            />
          </label>
          <label className="legalizacion-mtm__label-block">
            <span className="legalizacion-mtm__label">Est. atendidos</span>
            <input
              type="number"
              min={0}
              className="legalizacion-mtm__input"
              value={form.numeroEstudiantesAtendidos}
              onChange={(e) => setForm((f) => ({ ...f, numeroEstudiantesAtendidos: e.target.value }))}
              placeholder="0"
            />
          </label>
          <label className="legalizacion-mtm__label-block">
            <span className="legalizacion-mtm__label">Cantidad de horas</span>
            <input
              type="number"
              min={0}
              step={0.5}
              className="legalizacion-mtm__input"
              value={form.cantidadHoras}
              onChange={(e) => setForm((f) => ({ ...f, cantidadHoras: e.target.value }))}
              placeholder="0"
            />
          </label>
        </div>
        <label className="legalizacion-mtm__label-block" style={{ marginBottom: 12 }}>
          <span className="legalizacion-mtm__label">Comentarios</span>
          <textarea
            className="legalizacion-mtm__input"
            value={form.comentarios}
            onChange={(e) => setForm((f) => ({ ...f, comentarios: e.target.value }))}
            placeholder="Comentarios y observaciones"
            rows={2}
          />
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn-guardar" disabled={saving}>
            {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Registrar'}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={resetForm}>Cancelar</button>
          )}
        </div>
      </form>
      )}

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <h3 className="legalizacion-mtm__section-title" style={{ margin: 0 }}>Registros</h3>
          {isAdmin && pendientesIds.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={seleccionadosMasivo.size === pendientesIds.length && pendientesIds.length > 0}
                  onChange={seleccionarTodosPendientes}
                />
                Seleccionar todos los pendientes
              </label>
              <button type="button" className="btn-guardar" style={{ fontSize: 13 }} disabled={accionMasivaLoading || seleccionadosMasivo.size === 0} onClick={handleAprobarMasivo}>
                {accionMasivaLoading ? '...' : `Aprobar seleccionados (${seleccionadosMasivo.size})`}
              </button>
              <button type="button" className="btn-secondary" style={{ fontSize: 13, color: '#dc2626' }} disabled={accionMasivaLoading || seleccionadosMasivo.size === 0} onClick={handleRechazarMasivo}>
                Rechazar seleccionados
              </button>
            </div>
          )}
        </div>
        {list.length === 0 ? (
          <p style={{ color: '#6b7280' }}>
            {isAdmin
              ? 'No hay seguimientos registrados por el estudiante.'
              : 'No hay seguimientos. Registre una actividad arriba.'}
          </p>
        ) : (
          <div className="seguimientos-mtm-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.map((seg) => {
              const canEdit = seg.estado === 'pendiente_revision';
              const estadoLabel = ESTADO_LABEL[seg.estado] || seg.estado;
              return (
                <div
                  key={seg._id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 12,
                    background: '#fff',
                    borderLeft: seg.estado === 'aprobado' ? '4px solid #16a34a' : seg.estado === 'rechazado' ? '4px solid #dc2626' : '4px solid #f59e0b',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      {isAdmin && seg.estado === 'pendiente_revision' && (
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                          <input
                            type="checkbox"
                            checked={seleccionadosMasivo.has(seg._id)}
                            onChange={() => toggleSeleccionMasivo(seg._id)}
                          />
                        </label>
                      )}
                      <div>
                      <span style={{ fontWeight: 600, marginRight: 8 }}>{seg.tipoActividad || seg.tipo || '—'}</span>
                      <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                        {seg.fecha ? new Date(seg.fecha).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : '—'}
                      </span>
                      <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 6, fontSize: 12, background: seg.estado === 'aprobado' ? '#dcfce7' : seg.estado === 'rechazado' ? '#fee2e2' : '#fef3c7', color: seg.estado === 'aprobado' ? '#166534' : seg.estado === 'rechazado' ? '#991b1b' : '#92400e' }}>
                        {estadoLabel}
                      </span>
                      </div>
                    </div>
                    {canEdit && !isAdmin && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => handleEdit(seg)}>Editar</button>
                        <button type="button" className="btn-secondary" style={{ fontSize: 12, color: '#dc2626' }} onClick={() => handleDelete(seg)}>Eliminar</button>
                      </div>
                    )}
                    {isAdmin && seg.estado === 'pendiente_revision' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn-guardar" style={{ fontSize: 12 }} disabled={accionSeguimientoId === seg._id} onClick={() => handleAprobar(seg)}>
                          {accionSeguimientoId === seg._id ? '...' : 'Aprobar'}
                        </button>
                        <button type="button" className="btn-secondary" style={{ fontSize: 12, color: '#dc2626' }} disabled={accionSeguimientoId === seg._id} onClick={() => handleRechazar(seg)}>Rechazar</button>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 14, color: '#374151' }}>
                    {seg.numeroEstudiantesConvocados != null && <span style={{ marginRight: 12 }}>Convocados: {seg.numeroEstudiantesConvocados}</span>}
                    {seg.numeroEstudiantesAtendidos != null && <span style={{ marginRight: 12 }}>Atendidos: {seg.numeroEstudiantesAtendidos}</span>}
                    {seg.cantidadHoras != null && <span>Horas: {seg.cantidadHoras}</span>}
                  </div>
                  {(seg.comentarios || seg.descripcion) && (
                    <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{seg.comentarios || seg.descripcion}</p>
                  )}
                  {seg.estado === 'rechazado' && seg.rechazoMotivo && (
                    <p style={{ marginTop: 6, fontSize: 13, color: '#b91c1c' }}>Motivo rechazo: {seg.rechazoMotivo}</p>
                  )}
                  {/* Estados y responsables visibles */}
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #f3f4f6', fontSize: 12, color: '#6b7280', display: 'flex', flexWrap: 'wrap', gap: '12px 16px' }}>
                    {seg.creadoPor?.name && (
                      <span>Registrado por: <strong style={{ color: '#374151' }}>{seg.creadoPor.name}</strong></span>
                    )}
                    {seg.estado === 'aprobado' && (seg.aprobadoPor?.name || seg.aprobadoAt) && (
                      <span style={{ color: '#166534' }}>
                        Aprobado por: <strong>{seg.aprobadoPor?.name || '—'}</strong>
                        {seg.aprobadoAt && <> el {new Date(seg.aprobadoAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</>}
                      </span>
                    )}
                    {seg.estado === 'rechazado' && seg.rechazadoAt && (
                      <span style={{ color: '#991b1b' }}>
                        Rechazado el {new Date(seg.rechazadoAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {seg.documentoSoporte?.key ? (
                      <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => (isAdmin ? downloadDocAdmin(seg) : openDocUrl(seg))}>
                        {isAdmin ? 'Descargar documento soporte' : 'Ver documento soporte'}
                      </button>
                    ) : canEdit && !isAdmin && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: 12 }}
                        disabled={uploadingDocId === seg._id}
                        onClick={() => triggerUploadDoc(seg._id)}
                      >
                        {uploadingDocId === seg._id ? 'Subiendo...' : 'Subir documento soporte (PDF)'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
