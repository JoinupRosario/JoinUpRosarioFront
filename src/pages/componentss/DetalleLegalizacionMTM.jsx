import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiEye, FiX } from 'react-icons/fi';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import '../styles/Oportunidades.css';
import './DetalleLegalizacionEstudiante.css';

const LIST_IDS = { EPS: 'L_EPS', BANCO: 'L_FINANCIAL_BANK' };
const TIPO_CUENTA_OPCIONES = [{ value: 'Ahorros', label: 'Ahorros' }, { value: 'Corriente', label: 'Corriente' }];
const MAX_FILE_MB = 5;

function defIdStr(def) {
  return def?._id != null ? String(def._id) : '';
}

/** Atributo accept del input file según extensiones configuradas en la definición. */
function acceptAttrForDefMon(def) {
  const codes = (def?.extensionCodes || [])
    .map((s) => String(s || '').replace(/^\./, '').trim().toLowerCase())
    .filter(Boolean);
  if (!codes.length) return '.pdf,application/pdf';
  const dots = codes.map((c) => `.${c}`).join(',');
  const mimes = [];
  if (codes.some((c) => c === 'pdf')) mimes.push('application/pdf');
  if (codes.some((c) => c === 'jpg' || c === 'jpeg')) mimes.push('image/jpeg');
  if (codes.some((c) => c === 'png')) mimes.push('image/png');
  if (codes.some((c) => c === 'webp')) mimes.push('image/webp');
  if (codes.some((c) => c === 'doc')) mimes.push('application/msword');
  if (codes.some((c) => c === 'docx')) mimes.push('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  return [dots, ...mimes].filter(Boolean).join(',');
}

export default function DetalleLegalizacionMTM({ onVolver }) {
  const location = useLocation();
  const postulacionId = location.pathname.split('/').filter(Boolean).pop();

  const [loading, setLoading] = useState(true);
  const [legalizacion, setLegalizacion] = useState(null);
  const [oportunidad, setOportunidad] = useState(null);
  const [estudiante, setEstudiante] = useState(null);
  const [listas, setListas] = useState({ eps: [], banco: [] });
  const [uploading, setUploading] = useState(null);
  const [remitiendo, setRemitiendo] = useState(false);
  const [form, setForm] = useState({ eps: '', tipoCuentaValor: '', banco: '', numeroCuenta: '' });
  const [error, setError] = useState(null);
  const [tabActiva, setTabActiva] = useState('datos');
  const [deletingDoc, setDeletingDoc] = useState(null);
  /** Vista previa documento: { url?, name, loading?, error? } | null */
  const [previewDoc, setPreviewDoc] = useState(null);
  const [asistenciaLink, setAsistenciaLink] = useState('');
  const [planAprobado, setPlanAprobado] = useState(false);
  const [definicionesDocumentos, setDefinicionesDocumentos] = useState([]);

  useEffect(() => {
    if (!postulacionId) return;
    setLoading(true);
    setError(null);
    setAsistenciaLink('');
    Promise.all([
      api.get(`/oportunidades-mtm/legalizaciones/${postulacionId}`),
      api.get('/locations/items/' + LIST_IDS.EPS + '?limit=200').catch(() => ({ data: [] })),
      api.get('/locations/items/' + LIST_IDS.BANCO + '?limit=200').catch(() => ({ data: [] })),
    ])
      .then(([legRes, epsRes, bancoRes]) => {
        const leg = legRes.data?.legalizacion;
        const opp = legRes.data?.oportunidad;
        const est = legRes.data?.estudiante;
        const pa = legRes.data?.planAprobado === true;
        setPlanAprobado(pa);
        if (!pa) setAsistenciaLink('');
        setDefinicionesDocumentos(Array.isArray(legRes.data?.definicionesDocumentos) ? legRes.data.definicionesDocumentos : []);
        setLegalizacion(leg);
        setOportunidad(opp);
        setEstudiante(est);
        setForm({
          eps: leg?.eps?._id ?? leg?.eps ?? '',
          tipoCuentaValor: leg?.tipoCuentaValor ?? '',
          banco: leg?.banco?._id ?? leg?.banco ?? '',
          numeroCuenta: leg?.numeroCuenta != null ? String(leg.numeroCuenta).replace(/\D/g, '') : '',
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

  const guardarDatosBancarios = () =>
    api.put(`/oportunidades-mtm/legalizaciones/${postulacionId}`, {
      eps: form.eps || null,
      tipoCuentaValor: form.tipoCuentaValor || null,
      banco: form.banco || null,
      numeroCuenta: form.numeroCuenta?.trim() || null,
    });

  const handleFile = (definitionId, e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      alert(`El archivo no puede superar ${MAX_FILE_MB} MB`);
      return;
    }
    setUploading(definitionId);
    const fd = new FormData();
    fd.append('definitionId', definitionId);
    fd.append('file', file);
    api.post(`/oportunidades-mtm/legalizaciones/${postulacionId}/documentos`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
      .then((r) => setLegalizacion(r.data?.legalizacion))
      .catch((err) => alert(err.response?.data?.message || 'Error al subir'))
      .finally(() => { setUploading(null); if (e?.target) e.target.value = ''; });
  };

  const handleRemitir = async () => {
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: 'Enviar a revisión',
      html: 'Se guardarán sus datos bancarios (EPS, banco, cuenta) y luego se enviará la legalización a revisión. <strong>No podrá editarla después.</strong>',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar y enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c41e3a',
      cancelButtonColor: '#6b7280',
      customClass: { popup: 'swal-popup-legalizacion', confirmButton: 'swal-btn-remitir', cancelButton: 'swal-btn-cancel' },
    });
    if (!isConfirmed) return;
    setRemitiendo(true);
    try {
      const putRes = await guardarDatosBancarios();
      setLegalizacion(putRes.data?.legalizacion);
      const remRes = await api.post(`/oportunidades-mtm/legalizaciones/${postulacionId}/remitir-revision`);
      setLegalizacion(remRes.data?.legalizacion);
      Swal.fire({
        icon: 'success',
        title: 'Enviado a revisión',
        text: 'Los datos se guardaron y la legalización fue remitida correctamente.',
        confirmButtonColor: '#c41e3a',
      });
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'No se pudo completar el envío.';
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: msg,
        confirmButtonColor: '#c41e3a',
      });
    } finally {
      setRemitiendo(false);
    }
  };

  const isCreada = legalizacion?.estado === 'creada' || legalizacion?.estado === 'borrador';
  const enAjuste = legalizacion?.estado === 'en_ajuste';
  const puedeEditar = isCreada || enAjuste;
  const docs = legalizacion?.documentos || {};
  const obligatorias = definicionesDocumentos.filter((d) => d.documentMandatory);
  const algunArchivoSubido = definicionesDocumentos.some((d) => docs[defIdStr(d)]?.key);
  const todosDocumentosCargados =
    definicionesDocumentos.length > 0 &&
    obligatorias.every((d) => docs[defIdStr(d)]?.key) &&
    (obligatorias.length > 0 || algunArchivoSubido);
  const datosCompletos = !!(form.eps && form.tipoCuentaValor && form.banco && form.numeroCuenta?.trim());
  const puedeEnviarRevision = puedeEditar && todosDocumentosCargados && datosCompletos;
  const docPuedeSubir = (def) => {
    const id = defIdStr(def);
    if (!id || !puedeEditar) return false;
    if (enAjuste) {
      const doc = docs[id];
      return doc?.estadoDocumento === 'rechazado' || !doc?.key;
    }
    return true;
  };

  const abrirVistaPrevia = async (definitionId, nombreArchivo) => {
    if (!definitionId || !postulacionId) return;
    setPreviewDoc({ name: nombreArchivo || 'Documento', loading: true, url: null, error: null });
    try {
      const { data } = await api.get(
        `/oportunidades-mtm/legalizaciones/${postulacionId}/documentos/${definitionId}/url`
      );
      const url = data?.url;
      if (!url) throw new Error('No se recibió URL de descarga');
      setPreviewDoc({ name: nombreArchivo || 'Documento', loading: false, url, error: null });
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'No se pudo obtener la vista previa.';
      setPreviewDoc({ name: nombreArchivo || 'Documento', loading: false, url: null, error: msg });
    }
  };

  const cerrarVistaPrevia = () => setPreviewDoc(null);

  useEffect(() => {
    if (!previewDoc) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setPreviewDoc(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewDoc]);

  const handleEliminarDoc = async (definitionId) => {
    if (!definitionId) return;
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
    setDeletingDoc(definitionId);
    api.delete(`/oportunidades-mtm/legalizaciones/${postulacionId}/documentos/${definitionId}`)
      .then((r) => {
        setLegalizacion(r.data?.legalizacion);
        Swal.fire({ icon: 'success', title: 'Eliminado', text: 'El documento fue eliminado correctamente.', confirmButtonColor: '#c41e3a' });
      })
      .catch((e) => {
        Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo eliminar el documento.', confirmButtonColor: '#c41e3a' });
      })
      .finally(() => setDeletingDoc(null));
  };

  const handleObtenerLinkAsistencia = async () => {
    try {
      const { data } = await api.get(`/oportunidades-mtm/legalizaciones/${postulacionId}/link-asistencia`);
      const link = data?.link;
      if (!link) return;
      setAsistenciaLink(link);
      await navigator.clipboard.writeText(link);
      Swal.fire({ icon: 'success', title: 'Link copiado', text: 'El link de asistencia se copió al portapapeles.', confirmButtonColor: '#c41e3a' });
    } catch (e) {
      const msg = e.response?.data?.message || 'No se pudo obtener el link de asistencia.';
      Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#c41e3a' });
    }
  };

  const handleExportarReporteAsistencia = async () => {
    try {
      const { data } = await api.get(`/oportunidades-mtm/legalizaciones/${postulacionId}/reporte-asistencia`);
      const list = data?.data ?? [];
      if (!list.length) {
        Swal.fire({ icon: 'warning', title: 'Sin registros', text: 'No hay asistencias registradas para exportar.', confirmButtonColor: '#c41e3a' });
        return;
      }
      const headers = [
        'Código monitoría', 'Nombre y apellido monitor', 'Identificación monitor', 'Correo monitor',
        'Nombre y apellido coordinador', 'Periodo académico', 'Nombre actividad',
        'Nombres estudiante', 'Apellidos estudiante', 'Identificación estudiante', 'Programa estudiante', 'Fecha diligenciamiento',
      ];
      const rows = list.map((row) => [
        row.codigoMonitoria ?? '',
        row.nombreApellidoMonitor ?? '',
        row.identificacionMonitor ?? '',
        row.correoMonitor ?? '',
        row.nombreApellidoCoordinador ?? '',
        row.periodoAcademico ?? '',
        row.nombreActividad ?? '',
        row.nombresEstudiante ?? '',
        row.apellidosEstudiante ?? '',
        row.identificacionEstudiante ?? '',
        row.programaEstudiante ?? '',
        row.fechaDiligenciamiento ? new Date(row.fechaDiligenciamiento).toLocaleString('es-CO') : '',
      ]);
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, 'Asistencia MTM');
      XLSX.writeFile(wb, `asistencia_mtm_${new Date().toISOString().slice(0, 10)}.xlsx`);
      Swal.fire({ icon: 'success', title: 'Exportado', text: `Se exportaron ${list.length} registro(s).`, confirmButtonColor: '#c41e3a', timer: 1800, timerProgressBar: true });
    } catch (e) {
      const msg = e.response?.data?.message || 'No se pudo exportar el reporte de asistencia.';
      Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#c41e3a' });
    }
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
    <div className="dashboard-content legalizacion-mtm legalizacion-mtm--full legmtm-estudiante">
      <header className="legalizacion-mtm__topbar">
        <div className="legalizacion-mtm__topbar-left">
          <button type="button" className="legalizacion-mtm__back" onClick={onVolver}>
            ← Volver
          </button>
          <h2 className="legalizacion-mtm__title">Detalle de la oportunidad — Legalización</h2>
        </div>
        {(isCreada || enAjuste) && (
          <div className="legalizacion-mtm__topbar-actions">
            <button
              type="button"
              className="legalizacion-mtm__btn legalizacion-mtm__btn--primary"
              onClick={handleRemitir}
              disabled={remitiendo || !puedeEnviarRevision}
              title={
                !puedeEnviarRevision
                  ? 'Complete EPS, banco, tipo y número de cuenta, y cargue todos los documentos obligatorios. Al enviar se guardará todo y pasará a revisión.'
                  : 'Guarda los datos bancarios y envía la legalización a revisión en un solo paso.'
              }
            >
              {remitiendo ? 'Guardando y enviando...' : enAjuste ? 'Volver a enviar a revisión' : 'Enviar a revisión'}
            </button>
          </div>
        )}
      </header>

      {!isCreada && (
        <p className={`legalizacion-mtm__estado legalizacion-mtm__estado--${legalizacion?.estado === 'aprobada' ? 'ok' : legalizacion?.estado === 'rechazada' ? 'error' : legalizacion?.estado === 'en_ajuste' ? 'error' : 'revision'}`}>
          {legalizacion?.estado === 'en_revision' && 'Estado: En revisión por la coordinación.'}
          {legalizacion?.estado === 'aprobada' && 'Estado: Legalizada.'}
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
                <dt>Celular</dt>
                <dd>{estudiante?.celular ?? '—'}</dd>
                <dt>Dirección</dt>
                <dd>{estudiante?.direccion ?? '—'}</dd>
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
                <dt>Número de horas a la semana</dt>
                <dd>{oportunidad?.dedicacionHoras?.value ?? oportunidad?.dedicacionHoras?.description ?? '—'}</dd>
                {(oportunidad?.limiteHoras != null && oportunidad.limiteHoras !== '') && (
                  <>
                    <dt>Límite de horas</dt>
                    <dd>{oportunidad.limiteHoras}</dd>
                  </>
                )}
                {(oportunidad?.centroCosto) && (
                  <>
                    <dt>Centro de costo</dt>
                    <dd>{oportunidad.centroCosto}</dd>
                  </>
                )}
                {(oportunidad?.codigoCPS) && (
                  <>
                    <dt>Código CPS</dt>
                    <dd>{oportunidad.codigoCPS}</dd>
                  </>
                )}
                <dt>Valor por hora</dt>
                <dd>{oportunidad?.valorPorHora?.value ?? oportunidad?.valorPorHora?.description ?? '—'}</dd>
                <dt>Asignaturas</dt>
                <dd>{oportunidad?.asignaturas?.length ? oportunidad.asignaturas.map((a) => a.nombreAsignatura || a.codAsignatura).filter(Boolean).join(', ') : '—'}</dd>
              </dl>
              {planAprobado ? (
                <>
                  <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="btn-secondary" onClick={handleObtenerLinkAsistencia}>
                      Obtener / Copiar link de asistencia
                    </button>
                    <button type="button" className="btn-secondary" onClick={handleExportarReporteAsistencia}>
                      Exportar reporte de asistencia
                    </button>
                  </div>
                  {asistenciaLink && (
                    <p style={{ marginTop: 10, fontSize: 12, color: '#6b7280', wordBreak: 'break-all' }}>
                      Link de asistencia: {asistenciaLink}
                    </p>
                  )}
                </>
              ) : (
                <p className="legalizacion-mtm__hint" style={{ marginTop: 14, marginBottom: 0 }}>
                  El link de asistencia y el reporte estarán disponibles cuando su <strong>plan de trabajo</strong> haya sido{' '}
                  <strong>aprobado</strong> por el profesor o responsable de la monitoría.
                </p>
              )}
            </section>

            <section className="legalizacion-mtm__section">
              <h3 className="legalizacion-mtm__section-title">Datos bancarios</h3>
              <p className="legalizacion-mtm__hint">
                EPS, tipo de cuenta, banco y número de cuenta. Estos datos se <strong>guardan automáticamente</strong> al pulsar{' '}
                <strong>Enviar a revisión</strong> (junto con el envío a coordinación).
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
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    className="legalizacion-mtm__input"
                    value={form.numeroCuenta}
                    onChange={(e) => {
                      const soloDigitos = e.target.value.replace(/\D/g, '');
                      setForm((f) => ({ ...f, numeroCuenta: soloDigitos }));
                    }}
                    disabled={!puedeEditar}
                    placeholder="Solo números"
                    maxLength={24}
                  />
                </label>
              </div>
            </section>
          </div>
        )}

        {tabActiva === 'documentos' && (
          <section className="legalizacion-mtm__section legalizacion-mtm__section--docs">
            <h3 className="legalizacion-mtm__section-title">Documentos (máx. {MAX_FILE_MB} MB)</h3>
            <p className="legalizacion-mtm__hint">
              {enAjuste
                ? 'Los documentos rechazados deben ser reemplazados. Suba de nuevo el archivo y vuelva a enviar a revisión.'
                : 'Los documentos listados son los definidos por la universidad en configuración. Debe cargar todos los marcados como obligatorios para enviar a revisión.'}
            </p>
            {definicionesDocumentos.length === 0 ? (
              <p className="legalizacion-mtm__hint" style={{ color: '#b45309' }}>
                Aún no hay documentos configurados para legalización de monitoría. Contacte a coordinación.
              </p>
            ) : (
              <div className="legalizacion-mtm__docs-list">
                {definicionesDocumentos.map((def) => {
                  const id = defIdStr(def);
                  const doc = docs[id];
                  const estadoDoc = doc?.estadoDocumento;
                  const rechazado = estadoDoc === 'rechazado';
                  const puedeSubir = docPuedeSubir(def);
                  const label = def.documentName || def.documentTypeItem?.value || 'Documento';
                  const obs = def.documentObservation?.trim();
                  const extHint = (def.extensionCodes || []).length
                    ? `Extensiones: ${def.extensionCodes.join(', ')}`
                    : 'Solo PDF';
                  return (
                    <div key={id} className="legalizacion-mtm__doc-item">
                      <span className="legalizacion-mtm__doc-name">
                        {label}
                        {def.documentMandatory ? <span style={{ color: '#c41e3a', fontWeight: 700 }}> *</span> : null}
                        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 400, marginLeft: 6 }}>({extHint})</span>
                      </span>
                      {obs ? <p style={{ fontSize: 12, color: '#4b5563', marginTop: 4 }}>{obs}</p> : null}
                      {rechazado && doc?.motivoRechazo && (
                        <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}><strong>Rechazado:</strong> {doc.motivoRechazo}</p>
                      )}
                      {estadoDoc === 'aprobado' && <span style={{ fontSize: 12, color: '#16a34a', marginLeft: 8 }}>Aprobado</span>}
                      <label className="legalizacion-mtm__doc-file-wrap">
                        <input
                          type="file"
                          accept={acceptAttrForDefMon(def)}
                          disabled={!puedeSubir || !!uploading}
                          onChange={(e) => handleFile(id, e)}
                          className="legalizacion-mtm__file-input"
                        />
                        <span className="legalizacion-mtm__file-label">{rechazado ? 'Reemplazar archivo' : 'Seleccionar archivo'}</span>
                      </label>
                      {doc?.originalName && (
                        <div className="legalizacion-mtm__doc-actions">
                          <span className="legmtm-est__doc-filename" title={doc.originalName}>
                            ✓ {doc.originalName}
                          </span>
                          {doc?.key && (
                            <button
                              type="button"
                              className="legalizacion-mtm__doc-preview"
                              onClick={() => abrirVistaPrevia(id, doc.originalName)}
                              title="Vista previa"
                            >
                              <FiEye aria-hidden />
                              Vista previa
                            </button>
                          )}
                          {puedeSubir && (
                            <button type="button" className="legalizacion-mtm__doc-delete" onClick={() => handleEliminarDoc(id)} disabled={deletingDoc === id}>
                              {deletingDoc === id ? 'Eliminando...' : 'Eliminar'}
                            </button>
                          )}
                        </div>
                      )}
                      {uploading === id && <span className="legalizacion-mtm__doc-loading">Cargando...</span>}
                    </div>
                  );
                })}
              </div>
            )}
            {puedeEditar && !puedeEnviarRevision && definicionesDocumentos.length > 0 && (
              <p className="legalizacion-mtm__remitir-hint">
                Complete los datos bancarios en <strong>Datos generales</strong> y cargue todos los documentos obligatorios (*). Luego use <strong>Enviar a revisión</strong> para guardar y enviar en un solo paso.
              </p>
            )}
          </section>
        )}
      </div>

      {previewDoc && (
        <div
          className="legmtm-est__preview-overlay"
          role="presentation"
          onClick={cerrarVistaPrevia}
        >
          <div
            className="legmtm-est__preview-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="legmtm-preview-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="legmtm-est__preview-header">
              <h3 id="legmtm-preview-title" className="legmtm-est__preview-title">
                {previewDoc.name}
              </h3>
              <button
                type="button"
                className="legmtm-est__preview-close"
                onClick={cerrarVistaPrevia}
                aria-label="Cerrar vista previa"
              >
                <FiX />
              </button>
            </div>
            <div className="legmtm-est__preview-body">
              {previewDoc.loading && (
                <p className="legmtm-est__preview-msg">Cargando vista previa…</p>
              )}
              {previewDoc.error && !previewDoc.loading && (
                <p className="legmtm-est__preview-msg legmtm-est__preview-msg--error">{previewDoc.error}</p>
              )}
              {previewDoc.url && !previewDoc.loading && !previewDoc.error && (
                /\.(jpe?g|png|gif|webp)$/i.test(previewDoc.name || '') ? (
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.name}
                    className="legmtm-est__preview-img"
                  />
                ) : (
                  <iframe
                    title={previewDoc.name}
                    src={previewDoc.url}
                    className="legmtm-est__preview-iframe"
                  />
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
