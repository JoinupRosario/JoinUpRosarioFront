import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../services/api';
import PdfPreviewModal from '../../components/ui/PdfPreviewModal';
import '../styles/Oportunidades.css';
import './SeguimientosEstudianteMTM.css';

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
function isValidPostulacionId(id) {
  return typeof id === 'string' && OBJECT_ID_REGEX.test(id);
}

const ESTADO_LABEL = {
  pendiente_revision: 'Pendiente de revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

/** Texto migrado con muchos \\n sueltos: compacta párrafos para listado de seguimientos. */
function normalizarTextoSeguimientoMostrar(raw) {
  if (raw == null) return '';
  let s = String(raw).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!s) return '';
  return s
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n+/g, ' ').replace(/[ \t\f\v]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

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

export default function SeguimientosMTM({ onVolver, compact = false, isAdmin = false, postulacionId: postulacionIdProp }) {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const fromPath = pathSegments[pathSegments.length - 1];
  const postulacionId =
    postulacionIdProp && isValidPostulacionId(postulacionIdProp)
      ? postulacionIdProp
      : isValidPostulacionId(fromPath)
        ? fromPath
        : '';
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
  const [todosSeguimientosResueltos, setTodosSeguimientosResueltos] = useState(false);
  const [tieneAlgunAprobado, setTieneAlgunAprobado] = useState(false);
  const [legalizacionEstado, setLegalizacionEstado] = useState(null);
  const [solicitandoFinalizacion, setSolicitandoFinalizacion] = useState(false);
  const [seleccionadosMasivo, setSeleccionadosMasivo] = useState(new Set()); // IDs para aprobación/rechazo masivo
  const [accionMasivaLoading, setAccionMasivaLoading] = useState(false);
  const [actividadesPlan, setActividadesPlan] = useState([]); // Actividades del plan de trabajo para el select
  const [previewSoporte, setPreviewSoporte] = useState({ open: false, url: null, title: '' });

  const load = () => {
    if (!postulacionId || !isValidPostulacionId(postulacionId)) return;
    setLoading(true);
    api.get(`/oportunidades-mtm/seguimientos/${postulacionId}`)
      .then((r) => {
        setList(r.data?.data ?? []);
        setTotalHorasAprobadas(r.data?.totalHorasAprobadas ?? 0);
        setTodosSeguimientosResueltos(!!r.data?.todosSeguimientosResueltos);
        setTieneAlgunAprobado(!!r.data?.tieneAlgunAprobado);
        setLegalizacionEstado(r.data?.legalizacionEstado ?? null);
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
      .then((r) => {
        if (r.data?.url) {
          setPreviewSoporte({
            open: true,
            url: r.data.url,
            title: seg.documentoSoporte?.originalName || 'Documento de soporte',
          });
        } else {
          Swal.fire({ icon: 'warning', title: 'No disponible', text: 'No se pudo cargar el documento.', confirmButtonColor: '#c41e3a' });
        }
      })
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
        setTieneAlgunAprobado(!!r.data?.tieneAlgunAprobado);
        setLegalizacionEstado(r.data?.legalizacionEstado ?? null);
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
          setTieneAlgunAprobado(!!r.data?.tieneAlgunAprobado);
          setLegalizacionEstado(r.data?.legalizacionEstado ?? null);
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
    <div
      className={`dashboard-content legalizacion-mtm ${compact ? 'seguimientos-mtm--compact' : 'legalizacion-mtm--full segmtm-estudiante'}`}
    >
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
          {legalizacionEstado === 'finalizada' && (
            <p style={{ fontSize: '0.875rem', color: '#166534', fontWeight: 600, marginTop: 8, marginBottom: 0, padding: '6px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
              ✅ MTM finalizada — vista de solo lectura. No se pueden realizar cambios sobre los seguimientos.
            </p>
          )}
          {legalizacionEstado !== 'finalizada' && todosSeguimientosResueltos && (
            <p style={{ fontSize: '0.9rem', color: '#059669', marginTop: 6, marginBottom: 0 }}>
              Todas las actividades están resueltas.
              {legalizacionEstado === 'solicitada_finalizacion' && ' El estudiante ya solicitó la finalización — puedes confirmarla desde la pestaña de datos de la legalización.'}
            </p>
          )}
        </div>
      )}

      {/* HU011: Botón solicitar finalización (solo estudiante) */}
      {!isAdmin && tieneAlgunAprobado && legalizacionEstado === 'aprobada' && (
        <div className="segmtm-finalizar-banner">
          <div className="segmtm-finalizar-banner__text">
            <strong>¿Tu monitoría está lista para finalizar?</strong>
            <span>Tienes seguimientos aprobados. Puedes solicitar el cierre de tu MTM al coordinador.</span>
          </div>
          <button
            type="button"
            className="btn-guardar segmtm-finalizar-banner__btn"
            disabled={solicitandoFinalizacion}
            onClick={async () => {
              const confirm = await Swal.fire({
                icon: 'question',
                title: '¿Solicitar finalización?',
                html: 'Se notificará al coordinador para que confirme el cierre de tu monitoría.<br/><br/>Esta acción <strong>no se puede deshacer</strong>.',
                showCancelButton: true,
                confirmButtonText: 'Sí, solicitar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#c41e3a',
              });
              if (!confirm.isConfirmed) return;
              setSolicitandoFinalizacion(true);
              try {
                await api.post(`/oportunidades-mtm/legalizaciones/${postulacionId}/solicitar-finalizacion`);
                setLegalizacionEstado('solicitada_finalizacion');
                Swal.fire({
                  icon: 'success',
                  title: '¡Solicitud enviada!',
                  text: 'El coordinador recibirá la notificación para confirmar el cierre de tu monitoría.',
                  confirmButtonColor: '#c41e3a',
                });
              } catch (e) {
                Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo enviar la solicitud.', confirmButtonColor: '#c41e3a' });
              } finally {
                setSolicitandoFinalizacion(false);
              }
            }}
          >
            {solicitandoFinalizacion ? 'Enviando...' : 'Solicitar finalización de MTM'}
          </button>
        </div>
      )}

      {!isAdmin && legalizacionEstado === 'solicitada_finalizacion' && (
        <div className="segmtm-finalizar-banner segmtm-finalizar-banner--pendiente">
          <span>⏳ <strong>Solicitud de finalización enviada.</strong> El coordinador está pendiente de confirmar el cierre de tu monitoría.</span>
        </div>
      )}

      {!isAdmin && legalizacionEstado === 'finalizada' && (
        <div className="segmtm-finalizar-banner segmtm-finalizar-banner--ok">
          <span>✅ <strong>Monitoría finalizada.</strong> El coordinador confirmó el cierre de tu MTM.</span>
        </div>
      )}

      {!isAdmin && legalizacionEstado !== 'finalizada' && (
      <form onSubmit={handleSubmit} className="seguimientos-mtm-form segmtm-est__form">
        <h4>{editingId ? 'Editar seguimiento' : 'Nuevo seguimiento'}</h4>
        <div className="segmtm-est__form-grid">
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
        <label className="legalizacion-mtm__label-block segmtm-est__field-comments">
          <span className="legalizacion-mtm__label">Comentarios</span>
          <textarea
            className="legalizacion-mtm__input"
            value={form.comentarios}
            onChange={(e) => setForm((f) => ({ ...f, comentarios: e.target.value }))}
            placeholder="Comentarios y observaciones"
            rows={2}
          />
        </label>
        <div className="segmtm-est__form-actions">
          <button type="submit" className="btn-guardar" disabled={saving}>
            {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Registrar'}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={resetForm}>Cancelar</button>
          )}
        </div>
      </form>
      )}

      <section className={compact ? 'segmtm-est__registros segmtm-est__registros--embedded' : 'segmtm-est__registros'}>
        <div className="segmtm-est__registros-header">
          <h3 className="legalizacion-mtm__section-title">Registros</h3>
          {isAdmin && pendientesIds.length > 0 && legalizacionEstado !== 'finalizada' && (
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
          <p className={compact ? undefined : 'segmtm-est__empty'} style={compact ? { color: '#6b7280' } : undefined}>
            {isAdmin
              ? 'No hay seguimientos registrados por el estudiante.'
              : 'No hay seguimientos. Registre una actividad arriba.'}
          </p>
        ) : (
          <div
            className={`seguimientos-mtm-list segmtm-est__list${compact ? ' segmtm-est__list--compact' : ''}`}
          >
            {list.map((seg) => {
              const canEdit = seg.estado === 'pendiente_revision';
              const estadoLabel = ESTADO_LABEL[seg.estado] || seg.estado;
              const estadoCard =
                seg.estado === 'aprobado' ? 'segmtm-est__card--ok' : seg.estado === 'rechazado' ? 'segmtm-est__card--err' : 'segmtm-est__card--pend';
              const comentarioTxt = normalizarTextoSeguimientoMostrar(seg.comentarios || seg.descripcion);
              return (
                <div
                  key={seg._id}
                  className={`segmtm-est__card ${estadoCard}${compact ? ' segmtm-est__card--compact' : ''}`}
                >
                  <div className="segmtm-est__card-head">
                    <div className="segmtm-est__card-head-main">
                      {isAdmin && seg.estado === 'pendiente_revision' && legalizacionEstado !== 'finalizada' && (
                        <label className="segmtm-est__card-check">
                          <input
                            type="checkbox"
                            checked={seleccionadosMasivo.has(seg._id)}
                            onChange={() => toggleSeleccionMasivo(seg._id)}
                          />
                        </label>
                      )}
                      <div className="segmtm-est__card-titles">
                        <span className="segmtm-est__card-tipo">{seg.tipoActividad || seg.tipo || '—'}</span>
                        <span className="segmtm-est__card-fecha">
                          {seg.fecha ? new Date(seg.fecha).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : '—'}
                        </span>
                        <span className={`segmtm-est__card-badge segmtm-est__card-badge--${seg.estado === 'aprobado' ? 'ok' : seg.estado === 'rechazado' ? 'err' : 'pend'}`}>
                          {estadoLabel}
                        </span>
                      </div>
                    </div>
                    {canEdit && !isAdmin && legalizacionEstado !== 'finalizada' && (
                      <div className="segmtm-est__card-actions">
                        <button type="button" className="btn-secondary segmtm-est__btn-xs" onClick={() => handleEdit(seg)}>Editar</button>
                        <button type="button" className="btn-secondary segmtm-est__btn-xs segmtm-est__btn-danger" onClick={() => handleDelete(seg)}>Eliminar</button>
                      </div>
                    )}
                    {isAdmin && seg.estado === 'pendiente_revision' && legalizacionEstado !== 'finalizada' && (
                      <div className="segmtm-est__card-actions">
                        <button type="button" className="btn-guardar segmtm-est__btn-xs" disabled={accionSeguimientoId === seg._id} onClick={() => handleAprobar(seg)}>
                          {accionSeguimientoId === seg._id ? '...' : 'Aprobar'}
                        </button>
                        <button type="button" className="btn-secondary segmtm-est__btn-xs segmtm-est__btn-danger" disabled={accionSeguimientoId === seg._id} onClick={() => handleRechazar(seg)}>Rechazar</button>
                      </div>
                    )}
                  </div>
                  <div className="segmtm-est__card-stats">
                    {seg.numeroEstudiantesConvocados != null && <span>Convocados: {seg.numeroEstudiantesConvocados}</span>}
                    {seg.numeroEstudiantesAtendidos != null && <span>Atendidos: {seg.numeroEstudiantesAtendidos}</span>}
                    {seg.cantidadHoras != null && <span>Horas: {seg.cantidadHoras}</span>}
                  </div>
                  {comentarioTxt ? (
                    <p className="segmtm-est__comentarios">{comentarioTxt}</p>
                  ) : null}
                  {seg.estado === 'rechazado' && seg.rechazoMotivo && (
                    <p className="segmtm-est__rechazo-motivo">Motivo rechazo: {seg.rechazoMotivo}</p>
                  )}
                  <div className="segmtm-est__card-audit">
                    {seg.creadoPor?.name && (
                      <span>Registrado por: <strong>{seg.creadoPor.name}</strong></span>
                    )}
                    {seg.estado === 'aprobado' && (seg.aprobadoPor?.name || seg.aprobadoAt) && (
                      <span className="segmtm-est__card-audit--ok">
                        Aprobado por: <strong>{seg.aprobadoPor?.name || '—'}</strong>
                        {seg.aprobadoAt && <> el {new Date(seg.aprobadoAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</>}
                      </span>
                    )}
                    {seg.estado === 'rechazado' && seg.rechazadoAt && (
                      <span className="segmtm-est__card-audit--err">
                        Rechazado el {new Date(seg.rechazadoAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div className="segmtm-est__card-doc">
                    <div className="segmtm-est__card-doc-title">Documento de soporte</div>
                    {seg.documentoSoporte?.key ? (
                      <div className="segmtm-est__card-doc-row">
                        <span className="segmtm-est__card-doc-name">
                          {seg.documentoSoporte?.originalName || 'Archivo adjunto'}
                        </span>
                        <button type="button" className="btn-secondary segmtm-est__btn-xs" onClick={() => openDocUrl(seg)}>
                          Ver
                        </button>
                        {isAdmin && (
                          <button type="button" className="btn-secondary segmtm-est__btn-xs" onClick={() => downloadDocAdmin(seg)}>
                            Descargar
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="segmtm-est__card-doc-row">
                        <span className="segmtm-est__card-doc-empty">Sin documento adjunto</span>
                        {canEdit && !isAdmin && (
                          <button
                            type="button"
                            className="btn-secondary segmtm-est__btn-xs"
                            disabled={uploadingDocId === seg._id}
                            onClick={() => triggerUploadDoc(seg._id)}
                          >
                            {uploadingDocId === seg._id ? 'Subiendo...' : 'Subir documento soporte (PDF)'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <PdfPreviewModal
        open={previewSoporte.open}
        onClose={() => setPreviewSoporte({ open: false, url: null, title: '' })}
        title={previewSoporte.title}
        url={previewSoporte.url}
      />
    </div>
  );
}
