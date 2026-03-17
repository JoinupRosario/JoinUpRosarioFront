import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../services/api';
import PdfPreviewModal from '../../components/ui/PdfPreviewModal';
import '../styles/Oportunidades.css';

const LIST_IDS = { EPS: 'L_EPS', BANCO: 'L_BANCO' };
const TIPO_CUENTA_OPCIONES = [{ value: 'Ahorros', label: 'Ahorros' }, { value: 'Corriente', label: 'Corriente' }];
const MAX_FILE_MB = 5;
const DOC_TIPO_API = { certificadoEps: 'certificado_eps', certificacionBancaria: 'certificacion_bancaria', rut: 'rut' };

export default function DetalleLegalizacionMTM({ onVolver }) {
  const location = useLocation();
  const postulacionId = location.pathname.split('/').filter(Boolean).pop();

  const [loading, setLoading] = useState(true);
  const [legalizacion, setLegalizacion] = useState(null);
  const [oportunidad, setOportunidad] = useState(null);
  const [estudiante, setEstudiante] = useState(null);
  const [listas, setListas] = useState({ eps: [], banco: [] });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [remitiendo, setRemitiendo] = useState(false);
  const [form, setForm] = useState({ eps: '', tipoCuentaValor: '', banco: '', numeroCuenta: '' });
  const [error, setError] = useState(null);
  const [tabActiva, setTabActiva] = useState('datos');
  const [previewPdf, setPreviewPdf] = useState({ open: false, url: null, title: '' });
  const [deletingDoc, setDeletingDoc] = useState(null);

  useEffect(() => {
    if (!postulacionId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.get(`/oportunidades-mtm/legalizaciones/${postulacionId}`),
      api.get('/locations/items/' + LIST_IDS.EPS + '?limit=200').catch(() => ({ data: [] })),
      api.get('/locations/items/' + LIST_IDS.BANCO + '?limit=200').catch(() => ({ data: [] })),
    ])
      .then(([legRes, epsRes, bancoRes]) => {
        const leg = legRes.data?.legalizacion;
        const opp = legRes.data?.oportunidad;
        const est = legRes.data?.estudiante;
        setLegalizacion(leg);
        setOportunidad(opp);
        setEstudiante(est);
        setForm({
          eps: leg?.eps?._id ?? leg?.eps ?? '',
          tipoCuentaValor: leg?.tipoCuentaValor ?? '',
          banco: leg?.banco?._id ?? leg?.banco ?? '',
          numeroCuenta: leg?.numeroCuenta ?? '',
        });
        setListas({
          eps: epsRes.data?.data ?? (Array.isArray(epsRes.data) ? epsRes.data : []),
          banco: bancoRes.data?.data ?? (Array.isArray(bancoRes.data) ? bancoRes.data : []),
        });
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Error al cargar');
      })
      .finally(() => setLoading(false));
  }, [postulacionId]);

  const handleSave = () => {
    setSaving(true);
    api.put(`/oportunidades-mtm/legalizaciones/${postulacionId}`, {
      eps: form.eps || null,
      tipoCuentaValor: form.tipoCuentaValor || null,
      banco: form.banco || null,
      numeroCuenta: form.numeroCuenta?.trim() || null,
    })
      .then((r) => {
        setLegalizacion(r.data?.legalizacion);
        Swal.fire({
          icon: 'success',
          title: 'Guardado',
          text: 'Los datos se guardaron correctamente.',
          confirmButtonColor: '#c41e3a',
        });
      })
      .catch((e) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: e.response?.data?.message || 'No se pudo guardar.',
          confirmButtonColor: '#c41e3a',
        });
      })
      .finally(() => setSaving(false));
  };

  const handleFile = (tipo, e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      alert(`El archivo no puede superar ${MAX_FILE_MB} MB`);
      return;
    }
    if (file.type !== 'application/pdf') {
      alert('Solo se permiten archivos PDF');
      return;
    }
    setUploading(tipo);
    const fd = new FormData();
    fd.append('tipo', tipo);
    fd.append('file', file);
    api.post(`/oportunidades-mtm/legalizaciones/${postulacionId}/documentos`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
      .then((r) => setLegalizacion(r.data?.legalizacion))
      .catch((e) => alert(e.response?.data?.message || 'Error al subir'))
      .finally(() => { setUploading(null); e.target.value = ''; });
  };

  const handleRemitir = async () => {
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: 'Enviar a revisión',
      text: '¿Remitir la legalización a revisión? No podrá editarla después.',
      showCancelButton: true,
      confirmButtonText: 'Sí, remitir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c41e3a',
      cancelButtonColor: '#6b7280',
      customClass: { popup: 'swal-popup-legalizacion', confirmButton: 'swal-btn-remitir', cancelButton: 'swal-btn-cancel' },
    });
    if (!isConfirmed) return;
    setRemitiendo(true);
    api.post(`/oportunidades-mtm/legalizaciones/${postulacionId}/remitir-revision`)
      .then((r) => {
        setLegalizacion(r.data?.legalizacion);
        Swal.fire({
          icon: 'success',
          title: 'Enviado a revisión',
          text: 'La legalización fue remitida correctamente.',
          confirmButtonColor: '#c41e3a',
        });
      })
      .catch((e) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: e.response?.data?.message || 'No se pudo remitir a revisión.',
          confirmButtonColor: '#c41e3a',
        });
      })
      .finally(() => setRemitiendo(false));
  };

  const isBorrador = legalizacion?.estado === 'borrador';
  const enAjuste = legalizacion?.estado === 'en_ajuste';
  const puedeEditar = isBorrador || enAjuste;
  const docs = legalizacion?.documentos || {};
  const todosDocumentosCargados = !!(docs.certificadoEps?.key && docs.certificacionBancaria?.key && docs.rut?.key);
  const datosCompletos = !!(form.eps && form.tipoCuentaValor && form.banco && form.numeroCuenta?.trim());
  const puedeEnviarRevision = puedeEditar && todosDocumentosCargados && datosCompletos;
  const docPuedeSubir = (docField) => {
    if (!puedeEditar) return false;
    if (enAjuste) {
      const doc = docs[docField];
      return doc?.estadoDocumento === 'rechazado' || !doc?.key;
    }
    return true;
  };

  const handleVerPdf = async (docField, fileName) => {
    const tipo = DOC_TIPO_API[docField];
    if (!tipo) return;
    try {
      const { data } = await api.get(`/oportunidades-mtm/legalizaciones/${postulacionId}/documentos/${tipo}/url`);
      if (data?.url) setPreviewPdf({ open: true, url: data.url, title: fileName || 'Vista previa' });
      else Swal.fire({ icon: 'warning', title: 'No disponible', text: 'No se pudo cargar el documento.', confirmButtonColor: '#c41e3a' });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo abrir el documento.', confirmButtonColor: '#c41e3a' });
    }
  };

  const descargarCedulaPerfil = (postulantId, cedulaAttachment) => {
    if (!postulantId || !cedulaAttachment?._id) return;
    api
      .get(`/postulants/${postulantId}/attachments/${cedulaAttachment._id}/download`, { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = cedulaAttachment.name || 'cedula.pdf';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      })
      .catch((e) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: e.response?.data?.message || 'No se pudo descargar el documento.',
          confirmButtonColor: '#c41e3a',
        });
      });
  };

  const handleEliminarDoc = async (docField) => {
    const tipo = DOC_TIPO_API[docField];
    if (!tipo) return;
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: 'Eliminar documento',
      text: '¿Está seguro de que desea eliminar este documento? Se borrará también del almacenamiento.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c41e3a',
      cancelButtonColor: '#6b7280',
    });
    if (!isConfirmed) return;
    setDeletingDoc(tipo);
    api.delete(`/oportunidades-mtm/legalizaciones/${postulacionId}/documentos/${tipo}`)
      .then((r) => {
        setLegalizacion(r.data?.legalizacion);
        Swal.fire({ icon: 'success', title: 'Eliminado', text: 'El documento fue eliminado correctamente.', confirmButtonColor: '#c41e3a' });
      })
      .catch((e) => {
        Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo eliminar el documento.', confirmButtonColor: '#c41e3a' });
      })
      .finally(() => setDeletingDoc(null));
  };

  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="loading-container"><div className="loading-spinner" /><p>Cargando...</p></div>
      </div>
    );
  }
  if (error || !legalizacion) {
    return (
      <div className="dashboard-content">
        <p style={{ color: '#c41e3a' }}>{error || 'No se encontró la legalización'}</p>
        <button type="button" className="btn-secondary" onClick={onVolver}>Volver</button>
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
          <h2 className="legalizacion-mtm__title">Detalle de la oportunidad — Legalización</h2>
        </div>
        {(isBorrador || enAjuste) && (
          <div className="legalizacion-mtm__topbar-actions">
            <button
              type="button"
              className="legalizacion-mtm__btn legalizacion-mtm__btn--secondary"
              onClick={handleSave}
              disabled={saving || !puedeEditar}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              className="legalizacion-mtm__btn legalizacion-mtm__btn--primary"
              onClick={handleRemitir}
              disabled={remitiendo || !puedeEnviarRevision}
              title={!puedeEnviarRevision ? 'Complete datos generales y cargue los tres documentos para poder enviar a revisión' : ''}
            >
              {remitiendo ? 'Enviando...' : enAjuste ? 'Volver a enviar a revisión' : 'Enviar a revisión'}
            </button>
          </div>
        )}
      </header>

      {!isBorrador && legalizacion?.estado !== 'borrador' && (
        <p className={`legalizacion-mtm__estado legalizacion-mtm__estado--${legalizacion?.estado === 'aprobada' ? 'ok' : legalizacion?.estado === 'rechazada' ? 'error' : legalizacion?.estado === 'en_ajuste' ? 'error' : 'revision'}`}>
          {legalizacion?.estado === 'en_revision' && 'Estado: En revisión por la coordinación.'}
          {legalizacion?.estado === 'aprobada' && 'Estado: Aprobada.'}
          {legalizacion?.estado === 'rechazada' && `Estado: Rechazada. ${legalizacion.rechazoMotivo || ''}`}
          {legalizacion?.estado === 'en_ajuste' && (
            <>Estado: En ajuste. Debe corregir los documentos indicados como rechazados y volver a enviar a revisión. {legalizacion.rechazoMotivo && `Motivo: ${legalizacion.rechazoMotivo}`}</>
          )}
        </p>
      )}

      <div className="legalizacion-mtm__tabs">
        <button
          type="button"
          className={`legalizacion-mtm__tab ${tabActiva === 'datos' ? 'legalizacion-mtm__tab--active' : ''}`}
          onClick={() => setTabActiva('datos')}
        >
          Datos generales
        </button>
        <button
          type="button"
          className={`legalizacion-mtm__tab ${tabActiva === 'documentos' ? 'legalizacion-mtm__tab--active' : ''}`}
          onClick={() => setTabActiva('documentos')}
        >
          Cargue documentos
        </button>
      </div>

      <div className="legalizacion-mtm__body">
        {tabActiva === 'datos' && (
          <div className="legalizacion-mtm__panels">
            <section className="legalizacion-mtm__section">
              <h3 className="legalizacion-mtm__section-title">Datos del estudiante</h3>
              <dl className="legalizacion-mtm__grid">
                <dt>Nombre</dt>
                <dd>{estudiante?.nombre ?? '—'}</dd>
                <dt>Correo institucional</dt>
                <dd>{estudiante?.correoInstitucional ?? '—'}</dd>
                <dt>Correo electrónico alterno</dt>
                <dd>{estudiante?.correoAlterno ?? '—'}</dd>
                <dt>Identificación</dt>
                <dd>{estudiante?.identificacion ?? '—'}</dd>
                <dt>Cédula de ciudadanía</dt>
                <dd>
                  {estudiante?.cedulaAttachment ? (
                    <span>
                      Precargado del perfil.{' '}
                      <button
                        type="button"
                        className="legalizacion-mtm__doc-preview-btn"
                        onClick={() => descargarCedulaPerfil(estudiante.postulantId, estudiante.cedulaAttachment)}
                      >
                        Ver / Descargar
                      </button>
                    </span>
                  ) : (
                    '—'
                  )}
                </dd>
                <dt>Celular</dt>
                <dd>{estudiante?.celular ?? '—'}</dd>
                <dt>Dirección</dt>
                <dd>{estudiante?.direccion ?? '—'}</dd>
                <dt>Zona de residencia</dt>
                <dd>{estudiante?.zonaResidencia ?? '—'}</dd>
                <dt>Localidad / Barrio</dt>
                <dd>{estudiante?.localidadBarrio ?? '—'}</dd>
                <dt>Facultad</dt>
                <dd>{estudiante?.facultad ?? '—'}</dd>
                <dt>Programa</dt>
                <dd>{estudiante?.programa ?? '—'}</dd>
              </dl>
            </section>

            <section className="legalizacion-mtm__section">
              <h3 className="legalizacion-mtm__section-title">Datos de la monitoría</h3>
              <dl className="legalizacion-mtm__grid">
                <dt>Nombre de la MTM</dt>
                <dd>{oportunidad?.nombreCargo ?? '—'}</dd>
                <dt>Periodo</dt>
                <dd>{oportunidad?.periodo?.codigo ?? '—'}</dd>
                <dt>Coordinador / Profesor</dt>
                <dd>{oportunidad?.profesorResponsable ? [oportunidad.profesorResponsable.nombres, oportunidad.profesorResponsable.apellidos].filter(Boolean).join(' ') : (oportunidad?.nombreProfesor ?? '—')}</dd>
                <dt>Correo del coordinador</dt>
                <dd>{oportunidad?.profesorResponsable?.user?.email ?? '—'}</dd>
                <dt>Categoría</dt>
                <dd>{oportunidad?.categoria?.value ?? oportunidad?.categoria?.description ?? '—'}</dd>
                <dt>Valor por hora</dt>
                <dd>{oportunidad?.valorPorHora?.value ?? oportunidad?.valorPorHora?.description ?? '—'}</dd>
                <dt>Asignaturas</dt>
                <dd>{oportunidad?.asignaturas?.length ? oportunidad.asignaturas.map((a) => a.nombreAsignatura || a.codAsignatura).filter(Boolean).join(', ') : '—'}</dd>
              </dl>
            </section>

            <section className="legalizacion-mtm__section">
              <h3 className="legalizacion-mtm__section-title">Datos bancarios</h3>
              <p className="legalizacion-mtm__hint">
                EPS, tipo de cuenta, banco y número de cuenta.
              </p>
              <div className="legalizacion-mtm__form">
                <label className="legalizacion-mtm__field">
                  <span className="legalizacion-mtm__label">EPS</span>
                  <select
                    className="legalizacion-mtm__input"
                    value={form.eps}
                    onChange={(e) => setForm((f) => ({ ...f, eps: e.target.value }))}
                    disabled={!puedeEditar}
                  >
                    <option value="">Seleccione</option>
                    {listas.eps.map((it) => (
                      <option key={it._id} value={it._id}>{it.value ?? it.description ?? it._id}</option>
                    ))}
                  </select>
                </label>
                <label className="legalizacion-mtm__field">
                  <span className="legalizacion-mtm__label">Tipo de cuenta</span>
                  <select
                    className="legalizacion-mtm__input"
                    value={form.tipoCuentaValor}
                    onChange={(e) => setForm((f) => ({ ...f, tipoCuentaValor: e.target.value }))}
                    disabled={!puedeEditar}
                  >
                    <option value="">Seleccione</option>
                    {TIPO_CUENTA_OPCIONES.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>
                <label className="legalizacion-mtm__field">
                  <span className="legalizacion-mtm__label">Banco</span>
                  <select
                    className="legalizacion-mtm__input"
                    value={form.banco}
                    onChange={(e) => setForm((f) => ({ ...f, banco: e.target.value }))}
                    disabled={!puedeEditar}
                  >
                    <option value="">Seleccione</option>
                    {listas.banco.map((it) => (
                      <option key={it._id} value={it._id}>{it.value ?? it.description ?? it._id}</option>
                    ))}
                  </select>
                </label>
                <label className="legalizacion-mtm__field">
                  <span className="legalizacion-mtm__label">Número de cuenta</span>
                  <input
                    type="text"
                    className="legalizacion-mtm__input"
                    value={form.numeroCuenta}
                    onChange={(e) => setForm((f) => ({ ...f, numeroCuenta: e.target.value }))}
                    disabled={!puedeEditar}
                    placeholder="Número de cuenta"
                  />
                </label>
              </div>
            </section>
          </div>
        )}

        {tabActiva === 'documentos' && (
          <section className="legalizacion-mtm__section legalizacion-mtm__section--docs">
            <h3 className="legalizacion-mtm__section-title">Documentos (PDF, máx. {MAX_FILE_MB} MB)</h3>
            <p className="legalizacion-mtm__hint">
              {enAjuste
                ? 'Los documentos rechazados deben ser reemplazados. Suba de nuevo el archivo y vuelva a enviar a revisión.'
                : 'Certificado EPS, Certificación bancaria y RUT. Debe cargar los tres para poder enviar a revisión.'}
            </p>
            <div className="legalizacion-mtm__docs-list">
              {[
                { field: 'certificadoEps', label: 'Certificado EPS', api: 'certificado_eps' },
                { field: 'certificacionBancaria', label: 'Certificación bancaria', api: 'certificacion_bancaria' },
                { field: 'rut', label: 'RUT', api: 'rut' },
              ].map(({ field, label, api }) => {
                const doc = docs[field];
                const estadoDoc = doc?.estadoDocumento;
                const rechazado = estadoDoc === 'rechazado';
                const puedeSubir = docPuedeSubir(field);
                return (
                  <div key={field} className="legalizacion-mtm__doc-item">
                    <span className="legalizacion-mtm__doc-name">{label}</span>
                    {rechazado && doc?.motivoRechazo && (
                      <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}><strong>Rechazado:</strong> {doc.motivoRechazo}</p>
                    )}
                    {estadoDoc === 'aprobado' && <span style={{ fontSize: 12, color: '#16a34a', marginLeft: 8 }}>Aprobado</span>}
                    <label className="legalizacion-mtm__doc-file-wrap">
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        disabled={!puedeSubir || uploading}
                        onChange={(e) => handleFile(api, e)}
                        className="legalizacion-mtm__file-input"
                      />
                      <span className="legalizacion-mtm__file-label">{rechazado ? 'Reemplazar archivo' : 'Seleccionar archivo'}</span>
                    </label>
                    {doc?.originalName && (
                      <div className="legalizacion-mtm__doc-actions">
                        <button type="button" className="legalizacion-mtm__doc-ok legalizacion-mtm__doc-preview-btn" onClick={() => handleVerPdf(field === 'certificadoEps' ? 'certificadoEps' : field === 'certificacionBancaria' ? 'certificacionBancaria' : 'rut', doc.originalName)}>
                          ✓ {doc.originalName} — Ver
                        </button>
                        {puedeSubir && (
                          <button type="button" className="legalizacion-mtm__doc-delete" onClick={() => handleEliminarDoc(field === 'certificadoEps' ? 'certificadoEps' : field === 'certificacionBancaria' ? 'certificacionBancaria' : 'rut')} disabled={deletingDoc === api}>
                            {deletingDoc === api ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        )}
                      </div>
                    )}
                    {uploading === api && <span className="legalizacion-mtm__doc-loading">Cargando...</span>}
                  </div>
                );
              })}
            </div>
            {puedeEditar && !puedeEnviarRevision && (
              <p className="legalizacion-mtm__remitir-hint">
                Para enviar a revisión debe guardar los datos generales y cargar los tres documentos.
              </p>
            )}
          </section>
        )}
      </div>

      <PdfPreviewModal
        open={previewPdf.open}
        onClose={() => setPreviewPdf({ open: false, url: null, title: '' })}
        title={previewPdf.title}
        url={previewPdf.url}
      />
    </div>
  );
}
