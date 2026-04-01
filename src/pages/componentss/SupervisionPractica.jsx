import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import PdfPreviewModal from '../../components/ui/PdfPreviewModal';
import '../styles/Oportunidades.css';
import './SeguimientosEstudianteMTM.css';

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
function isValidPostulacionId(id) {
  return typeof id === 'string' && OBJECT_ID_REGEX.test(id);
}

const ESTADO_LABEL = {
  borrador: 'Borrador',
  pendiente_firmas: 'Pendiente de firmas',
  cerrado: 'Cerrado',
};

const defaultForm = () => ({
  tipoActividadSeguimiento: 'parcial',
  fecha: '',
  tipoSeguimientoMedio: 'Medio electrónico',
  productoOInforme: '',
  ponderacionPorcentaje: '',
  nota: '',
  aprueba: true,
  observaciones: '',
  seguimientoPlanItemId: '',
});

export default function SupervisionPractica({ onVolver }) {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const postulacionId = pathSegments[pathSegments.length - 1];
  const fileInputRef = useRef(null);
  const fileInputEstRef = useRef(null);

  const { user, hasPermission } = useAuth();
  const moduloRaw = user?.modulo != null ? String(user.modulo).trim().toLowerCase() : '';
  const isEstudiante = moduloRaw === 'estudiante' || moduloRaw === '';
  const isLeader = String(user?.role || '').toLowerCase() === 'leader' || moduloRaw === 'leader';
  const canCoordinacion =
    !isEstudiante &&
    (hasPermission('CLPA') || isLeader || ['admin', 'superadmin'].includes(String(user?.role || '').toLowerCase()));

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [planNota, setPlanNota] = useState(null);
  const [datosCrear, setDatosCrear] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm());
  const [firmando, setFirmando] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [previewPdf, setPreviewPdf] = useState({ open: false, url: null, title: '' });

  const base = `/legalizaciones-practica/supervision-practica`;

  const load = () => {
    if (!postulacionId || !isValidPostulacionId(postulacionId)) return;
    setLoading(true);
    api
      .get(`${base}/${postulacionId}`)
      .then((r) => {
        setList(r.data?.data ?? []);
        setPlanNota(r.data?.planNota ?? null);
        setError(null);
      })
      .catch((e) => setError(e.response?.data?.message || 'Error al cargar supervisión'))
      .finally(() => setLoading(false));
  };

  const loadDatosCrear = () => {
    if (!postulacionId || !isValidPostulacionId(postulacionId) || isEstudiante) return;
    api
      .get(`${base}/datos-crear/${postulacionId}`)
      .then((r) => {
        setDatosCrear(r.data);
        const fp = r.data?.fechaSugeridaParcial;
        const ff = r.data?.fechaSugeridaFinal;
        setForm((f) => ({
          ...f,
          fecha:
            f.tipoActividadSeguimiento === 'final'
              ? ff
                ? new Date(ff).toISOString().slice(0, 10)
                : f.fecha
              : fp
                ? new Date(fp).toISOString().slice(0, 10)
                : f.fecha,
        }));
      })
      .catch(() => setDatosCrear(null));
  };

  useEffect(() => {
    if (!postulacionId || !isValidPostulacionId(postulacionId)) {
      setLoading(false);
      setError('URL inválida.');
      return;
    }
    load();
    if (!isEstudiante) loadDatosCrear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postulacionId, isEstudiante]);

  const resetForm = () => {
    setForm(defaultForm());
    setEditingId(null);
    setShowForm(false);
    if (datosCrear && !isEstudiante) {
      const fp = datosCrear?.fechaSugeridaParcial;
      setForm((f) => ({
        ...defaultForm(),
        fecha: fp ? new Date(fp).toISOString().slice(0, 10) : '',
      }));
    }
  };

  const aplicarFechaSugerida = (tipo, prevForm) => {
    const fp = datosCrear?.fechaSugeridaParcial;
    const ff = datosCrear?.fechaSugeridaFinal;
    const d = tipo === 'final' ? ff : fp;
    return {
      ...prevForm,
      tipoActividadSeguimiento: tipo,
      fecha: d ? new Date(d).toISOString().slice(0, 10) : prevForm.fecha,
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.fecha) {
      Swal.fire({ icon: 'warning', title: 'Fecha', text: 'Indique la fecha del seguimiento.', confirmButtonColor: '#c41e3a' });
      return;
    }
    const payload = {
      tipoActividadSeguimiento: form.tipoActividadSeguimiento,
      fecha: form.fecha,
      tipoSeguimientoMedio: form.tipoSeguimientoMedio || 'Medio electrónico',
      productoOInforme: (form.productoOInforme || '').trim(),
      ponderacionPorcentaje: form.ponderacionPorcentaje === '' ? 0 : Number(form.ponderacionPorcentaje),
      nota: form.nota === '' ? null : Number(form.nota),
      aprueba: Boolean(form.aprueba),
      observaciones: (form.observaciones || '').trim(),
      seguimientoPlanItemId: form.seguimientoPlanItemId || null,
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
          loadDatosCrear();
          Swal.fire({ icon: 'success', title: 'Informe creado', confirmButtonColor: '#c41e3a' });
        })
        .catch((err) => Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message }))
        .finally(() => setSaving(false));
    }
  };

  const handleEdit = (sup) => {
    if (sup.estado !== 'borrador') return;
    setEditingId(sup._id);
    setShowForm(true);
    setForm({
      tipoActividadSeguimiento: sup.tipoActividadSeguimiento === 'final' ? 'final' : 'parcial',
      fecha: sup.fecha ? new Date(sup.fecha).toISOString().slice(0, 10) : '',
      tipoSeguimientoMedio: sup.tipoSeguimientoMedio || 'Medio electrónico',
      productoOInforme: sup.productoOInforme || '',
      ponderacionPorcentaje: sup.ponderacionPorcentaje != null ? String(sup.ponderacionPorcentaje) : '',
      nota: sup.nota != null ? String(sup.nota) : '',
      aprueba: Boolean(sup.aprueba),
      observaciones: sup.observaciones || '',
      seguimientoPlanItemId: sup.seguimientoPlanItemId ? String(sup.seguimientoPlanItemId) : '',
    });
  };

  const handleDelete = (sup) => {
    if (sup.estado !== 'borrador') return;
    Swal.fire({
      title: '¿Eliminar informe?',
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      confirmButtonText: 'Eliminar',
    }).then(({ isConfirmed }) => {
      if (!isConfirmed) return;
      api.delete(`${base}/${postulacionId}/${sup._id}`).then(() => {
        load();
        Swal.fire({ icon: 'success', title: 'Eliminado', confirmButtonColor: '#c41e3a' });
      });
    });
  };

  const enviarFirmas = (supId) => {
    api
      .post(`${base}/${postulacionId}/${supId}/enviar-firmas`)
      .then(() => {
        load();
        Swal.fire({ icon: 'success', title: 'Enviado a firmas', confirmButtonColor: '#c41e3a' });
      })
      .catch((e) => Swal.fire({ icon: 'error', text: e.response?.data?.message }));
  };

  const firmar = (supId, rol) => {
    setFirmando(`${supId}-${rol}`);
    api
      .post(`${base}/${postulacionId}/${supId}/firmar`, { rol })
      .then((r) => {
        load();
        const msg = r.data?.message || 'Firma registrada';
        Swal.fire({ icon: 'success', title: msg, confirmButtonColor: '#c41e3a' });
      })
      .catch((e) => Swal.fire({ icon: 'error', text: e.response?.data?.message }))
      .finally(() => setFirmando(null));
  };

  const verPdf = (supId) => {
    api
      .get(`${base}/${postulacionId}/${supId}/pdf/url`)
      .then((r) => {
        const url = r.data?.url;
        if (url) setPreviewPdf({ open: true, url, title: 'Supervisión de práctica (PDF)' });
      })
      .catch((e) => Swal.fire({ icon: 'error', text: e.response?.data?.message }));
  };

  const verDoc = (supId, docId) => {
    api.get(`${base}/${postulacionId}/${supId}/documentos/${docId}/url`).then((r) => {
      const url = r.data?.url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });
  };

  const triggerUpload = (supId, origen) => {
    const ref = origen === 'estudiante_post_firma' ? fileInputEstRef : fileInputRef;
    if (!ref.current) return;
    ref.current.setAttribute('data-supervision-id', supId);
    ref.current.setAttribute('data-origen', origen);
    ref.current.click();
  };

  const onFile = (e, origenDefault) => {
    const file = e.target.files?.[0];
    const supId = e.target.getAttribute('data-supervision-id');
    const origenAttr = e.target.getAttribute('data-origen') || origenDefault || 'monitor';
    e.target.value = '';
    if (!file || !supId) return;
    setUploadingId(supId);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('origen', origenAttr);
    api
      .post(`${base}/${postulacionId}/${supId}/documentos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(() => {
        load();
        Swal.fire({ icon: 'success', title: 'Documento cargado', confirmButtonColor: '#c41e3a' });
      })
      .catch((err) => Swal.fire({ icon: 'error', text: err.response?.data?.message }))
      .finally(() => setUploadingId(null));
  };

  const seguimientosPlan = Array.isArray(datosCrear?.seguimientosPlan) ? datosCrear.seguimientosPlan : [];

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
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        style={{ display: 'none' }}
        onChange={(ev) => onFile(ev, 'monitor')}
      />
      <input
        ref={fileInputEstRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        style={{ display: 'none' }}
        onChange={(ev) => onFile(ev, 'estudiante_post_firma')}
      />

      <PdfPreviewModal open={previewPdf.open} url={previewPdf.url} title={previewPdf.title} onClose={() => setPreviewPdf({ open: false, url: null, title: '' })} />

      <header className="legalizacion-mtm__topbar">
        <div className="legalizacion-mtm__topbar-left">
          <button type="button" className="legalizacion-mtm__back" onClick={onVolver}>
            ← Volver
          </button>
          <h2 className="legalizacion-mtm__title">Supervisión de la práctica</h2>
        </div>
      </header>

      {planNota && (
        <section className="legalizacion-mtm__section" style={{ marginBottom: 12 }}>
          <p className="legalizacion-mtm__hint">
            Nota definitiva (ponderación informes cerrados):{' '}
            <strong>{planNota.notaDefinitivaSupervision != null ? planNota.notaDefinitivaSupervision : '—'}</strong>
            {' — '}
            Informes completos (incl. final):{' '}
            <strong>{planNota.supervisionInformesCompleto ? 'Sí' : 'No'}</strong>
          </p>
        </section>
      )}

      {!isEstudiante && (
        <div style={{ marginBottom: 16 }}>
          {!showForm && (
            <button
              type="button"
              className="legalizacion-mtm__btn legalizacion-mtm__btn--primary"
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setForm(defaultForm());
                if (datosCrear?.fechaSugeridaParcial) {
                  setForm((f) => ({
                    ...f,
                    fecha: new Date(datosCrear.fechaSugeridaParcial).toISOString().slice(0, 10),
                  }));
                }
              }}
            >
              Nuevo informe de supervisión
            </button>
          )}
        </div>
      )}

      {showForm && !isEstudiante && (
        <section className="legalizacion-mtm__section">
          <h3 className="legalizacion-mtm__section-title">{editingId ? 'Editar borrador' : 'Nuevo informe'}</h3>
          <form onSubmit={handleSubmit} className="legalizacion-mtm__body">
            <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
              <label>
                Actividad
                <select
                  className="form-input"
                  value={form.tipoActividadSeguimiento}
                  onChange={(e) => {
                    const v = e.target.value === 'final' ? 'final' : 'parcial';
                    setForm((f) => aplicarFechaSugerida(v, { ...f, tipoActividadSeguimiento: v }));
                  }}
                >
                  <option value="parcial">Seguimiento parcial</option>
                  <option value="final">Seguimiento final</option>
                </select>
              </label>
              <label>
                Fecha
                <input
                  type="date"
                  className="form-input"
                  required
                  value={form.fecha}
                  onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                />
              </label>
              <label>
                Tipo de seguimiento
                <input
                  className="form-input"
                  value={form.tipoSeguimientoMedio}
                  onChange={(e) => setForm((f) => ({ ...f, tipoSeguimientoMedio: e.target.value }))}
                />
              </label>
              {seguimientosPlan.length > 0 && (
                <label>
                  Ítem del plan (opcional)
                  <select
                    className="form-input"
                    value={form.seguimientoPlanItemId}
                    onChange={(e) => setForm((f) => ({ ...f, seguimientoPlanItemId: e.target.value }))}
                  >
                    <option value="">—</option>
                    {seguimientosPlan.map((s, i) => (
                      <option key={s._id || i} value={s._id || ''}>
                        {(s.tema || s.descripcion || 'Ítem').slice(0, 80)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Producto o informe a entregar
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={form.productoOInforme}
                  onChange={(e) => setForm((f) => ({ ...f, productoOInforme: e.target.value }))}
                />
              </label>
              <label>
                % ponderación
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  className="form-input"
                  value={form.ponderacionPorcentaje}
                  onChange={(e) => setForm((f) => ({ ...f, ponderacionPorcentaje: e.target.value }))}
                />
              </label>
              <label>
                Nota
                <input
                  type="number"
                  step={0.01}
                  className="form-input"
                  value={form.nota}
                  onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))}
                />
              </label>
              <label className="legalizacion-mtm__hint" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.aprueba}
                  onChange={(e) => setForm((f) => ({ ...f, aprueba: e.target.checked }))}
                />
                Aprueba
              </label>
              <label>
                Observaciones (máx. 10 000 caracteres)
                <textarea
                  className="form-textarea"
                  rows={4}
                  maxLength={10000}
                  value={form.observaciones}
                  onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                />
              </label>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button type="submit" className="legalizacion-mtm__btn legalizacion-mtm__btn--primary" disabled={saving}>
                {saving ? 'Guardando…' : editingId ? 'Guardar' : 'Crear'}
              </button>
              <button type="button" className="legalizacion-mtm__btn legalizacion-mtm__btn--secondary" onClick={resetForm}>
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="legalizacion-mtm__section">
        <h3 className="legalizacion-mtm__section-title">Informes registrados</h3>
        {list.length === 0 && <p className="legalizacion-mtm__hint">No hay informes aún.</p>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {list.map((sup) => (
            <li
              key={sup._id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <strong>
                  {sup.tipoActividadSeguimiento === 'final' ? 'Seguimiento final' : 'Seguimiento parcial'} —{' '}
                  {sup.fecha ? new Date(sup.fecha).toLocaleDateString('es-CO') : '—'}
                </strong>
                <span className="legalizacion-mtm__estado legalizacion-mtm__estado--revision">
                  {ESTADO_LABEL[sup.estado] ?? sup.estado}
                </span>
              </div>
              <dl className="legalizacion-mtm__grid" style={{ marginTop: 8 }}>
                <dt>Medio</dt>
                <dd>{sup.tipoSeguimientoMedio || '—'}</dd>
                <dt>Producto / informe</dt>
                <dd>{sup.productoOInforme || '—'}</dd>
                <dt>Ponderación %</dt>
                <dd>{sup.ponderacionPorcentaje ?? '—'}</dd>
                <dt>Nota</dt>
                <dd>{sup.nota != null ? sup.nota : '—'}</dd>
                <dt>Aprueba</dt>
                <dd>{sup.aprueba ? 'Sí' : 'No'}</dd>
                <dt>Plan estudios / Semestre</dt>
                <dd>
                  {sup.planEstudios || '—'} / {sup.semestre || '—'}
                </dd>
                <dt>Correo estudiante</dt>
                <dd>{sup.emailEstudiante || '—'}</dd>
                <dt>Días-horas acumuladas (registro actividades)</dt>
                <dd>{sup.diasHorasAcumuladasAlMomento != null ? sup.diasHorasAcumuladasAlMomento : '—'}</dd>
                <dt>Monitor</dt>
                <dd>
                  {sup.monitorNombres} {sup.monitorApellidos} — {sup.monitorEmail}
                </dd>
              </dl>
              {sup.observaciones ? (
                <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
                  <strong>Observaciones:</strong> {sup.observaciones}
                </p>
              ) : null}

              {sup.estado === 'pendiente_firmas' && (
                <div style={{ marginTop: 8 }}>
                  <p className="legalizacion-mtm__hint">
                    Estudiante: {sup.emailsFirma?.estudiante || '—'} — Monitor: {sup.emailsFirma?.monitor || '—'} — Tutor:{' '}
                    {sup.emailsFirma?.tutor || '—'}
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {['estudiante', 'monitor', 'tutor'].map((rol) => (
                      <li key={rol} style={{ marginBottom: 6 }}>
                        <strong>{rol}</strong>: {sup.firmas?.[rol]?.estado === 'aprobado' ? 'Firmado' : 'Pendiente'}
                        {sup.firmas?.[rol]?.estado !== 'aprobado' && isEstudiante && rol === 'estudiante' ? (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ marginLeft: 8 }}
                            disabled={!!firmando}
                            onClick={() => firmar(sup._id, rol)}
                          >
                            {firmando === `${sup._id}-${rol}` ? '…' : 'Registrar mi firma'}
                          </button>
                        ) : null}
                        {sup.firmas?.[rol]?.estado !== 'aprobado' && canCoordinacion && rol !== 'estudiante' ? (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ marginLeft: 8 }}
                            disabled={!!firmando}
                            onClick={() => firmar(sup._id, rol)}
                          >
                            {firmando === `${sup._id}-${rol}` ? '…' : `Registrar firma (${rol})`}
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {sup.estado === 'cerrado' && sup.pdfS3Key && (
                <button type="button" className="btn-secondary" style={{ marginTop: 8 }} onClick={() => verPdf(sup._id)}>
                  Ver PDF generado
                </button>
              )}

              {!isEstudiante && sup.estado === 'borrador' && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button type="button" className="btn-secondary" onClick={() => handleEdit(sup)}>
                    Editar
                  </button>
                  <button type="button" className="legalizacion-mtm__btn legalizacion-mtm__btn--primary" onClick={() => enviarFirmas(sup._id)}>
                    Enviar a firmas
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => triggerUpload(sup._id, 'monitor')} disabled={uploadingId === sup._id}>
                    {uploadingId === sup._id ? 'Subiendo…' : 'Adjuntar documento (monitor)'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => handleDelete(sup)}>
                    Eliminar
                  </button>
                </div>
              )}

              {!isEstudiante && (sup.estado === 'pendiente_firmas' || sup.estado === 'borrador') && (
                <p className="legalizacion-mtm__hint" style={{ marginTop: 8 }}>
                  {sup.estado === 'pendiente_firmas' &&
                    'Adjunte evidencias antes o durante el flujo de firmas según corresponda.'}
                </p>
              )}

              {!isEstudiante && sup.estado === 'pendiente_firmas' && (
                <button type="button" className="btn-secondary" style={{ marginTop: 8 }} onClick={() => triggerUpload(sup._id, 'monitor')} disabled={uploadingId === sup._id}>
                  {uploadingId === sup._id ? 'Subiendo…' : 'Adjuntar documento'}
                </button>
              )}

              {isEstudiante && sup.estado === 'cerrado' && (
                <button
                  type="button"
                  className="legalizacion-mtm__btn legalizacion-mtm__btn--secondary"
                  style={{ marginTop: 8 }}
                  onClick={() => triggerUpload(sup._id, 'estudiante_post_firma')}
                  disabled={uploadingId === sup._id}
                >
                  {uploadingId === sup._id ? 'Subiendo…' : 'Cargar documento (tras aprobación)'}
                </button>
              )}

              {Array.isArray(sup.documentos) && sup.documentos.length > 0 && (
                <ul style={{ marginTop: 8 }}>
                  {sup.documentos.map((d) => (
                    <li key={d._id || d.key}>
                      <button type="button" className="btn-link" style={{ color: '#c41e3a' }} onClick={() => verDoc(sup._id, d._id)}>
                        {d.originalName || 'Documento'} ({d.origen || '—'})
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
