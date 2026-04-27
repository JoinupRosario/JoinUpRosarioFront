import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiChevronRight, FiX } from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../services/api';
import PdfPreviewModal from '../../components/ui/PdfPreviewModal';
import '../styles/Oportunidades.css';
import './DetalleLegalizacionEstudiante.css';
import './AdminDetalleLegalizacionMTM.css';

const MAX_FILE_MB = 5;

function defIdStr(d) {
  return d?._id != null ? String(d._id) : '';
}

function TextDetailModalProse({ text }) {
  const raw = text == null || String(text).trim() === '' ? '—' : String(text);
  const lines = raw.split(/\r?\n/);
  return (
    <div className="admrevmtm-text-modal__prose">
      {lines.map((line, i) => {
        const row = line.replace(/\s+$/, '');
        if (row === '') {
          return <p key={i} className="admrevmtm-text-modal__para admrevmtm-text-modal__para--blank" aria-hidden="true" />;
        }
        return (
          <p key={i} className="admrevmtm-text-modal__para">
            {row}
          </p>
        );
      })}
    </div>
  );
}

function TextDetailModal({ title, text, onClose }) {
  return (
    <div className="admrevmtm-text-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="admrevmtm-text-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="legprac-text-modal-title"
      >
        <header className="admrevmtm-text-modal__header">
          <h2 id="legprac-text-modal-title" className="admrevmtm-text-modal__title">
            {title || 'Detalle'}
          </h2>
          <button type="button" className="admrevmtm-text-modal__close" onClick={onClose} aria-label="Cerrar">
            <FiX size={22} />
          </button>
        </header>
        <div className="admrevmtm-text-modal__body" lang="es">
          <TextDetailModalProse text={text} />
        </div>
      </div>
    </div>
  );
}

/** Coincide con backend esAcuerdoDeVinculacion (normaliza tildes). */
function esTipoAcuerdoVinculacion(tv) {
  if (!tv) return false;
  const raw = tv.value || tv.description || '';
  const n = (s) =>
    String(s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  return n(raw) === n('Acuerdo de vinculación');
}

const FIRMA_PARTE_LABELS = {
  practicante: 'Practicante',
  escenario: 'Escenario (entidad)',
  universidad: 'Universidad del Rosario',
};

const ORDEN_ENLACES_ACUERDO = ['practicante', 'escenario', 'universidad'];

export default function DetalleLegalizacionPractica({ onVolver }) {
  const location = useLocation();
  const navigate = useNavigate();
  const postulacionId = location.pathname.split('/').filter(Boolean).pop();

  const [loading, setLoading] = useState(true);
  const [legalizacion, setLegalizacion] = useState(null);
  const [estudiante, setEstudiante] = useState(null);
  const [entidad, setEntidad] = useState(null);
  const [practica, setPractica] = useState(null);
  const [oportunidadResumen, setOportunidadResumen] = useState(null);
  const [definicionesDocumentos, setDefinicionesDocumentos] = useState([]);
  const [alertaLegalizacion, setAlertaLegalizacion] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [error, setError] = useState(null);
  const [tabActiva, setTabActiva] = useState('datos');
  const [uploading, setUploading] = useState(null);
  const [remitiendo, setRemitiendo] = useState(false);
  const [previewPdf, setPreviewPdf] = useState({ open: false, url: null, title: '' });
  const [generandoAcuerdo, setGenerandoAcuerdo] = useState(false);
  const [acuerdo, setAcuerdo] = useState(null);
  const [cargandoAcuerdo, setCargandoAcuerdo] = useState(false);
  const [generandoAcuerdoVinculacion, setGenerandoAcuerdoVinculacion] = useState(false);
  const [certificacion, setCertificacion] = useState(null);
  const [cargandoCert, setCargandoCert] = useState(false);
  const [textDetailModal, setTextDetailModal] = useState({ open: false, title: '', text: '' });

  const openTextDetail = (title, text) => setTextDetailModal({ open: true, title, text: String(text ?? '') });
  const closeTextDetail = () => setTextDetailModal({ open: false, title: '', text: '' });

  const load = () => {
    if (!postulacionId) return;
    setLoading(true);
    setError(null);
    api
      .get(`/legalizaciones-practica/${postulacionId}`)
      .then((r) => {
        setLegalizacion(r.data?.legalizacion);
        setEstudiante(r.data?.estudiante);
        setEntidad(r.data?.entidad);
        setPractica(r.data?.practica);
        setOportunidadResumen(r.data?.oportunidadResumen);
        setDefinicionesDocumentos(Array.isArray(r.data?.definicionesDocumentos) ? r.data.definicionesDocumentos : []);
        setAlertaLegalizacion(r.data?.alertaLegalizacion ?? null);
        setHistorial(Array.isArray(r.data?.historial) ? r.data.historial : []);
      })
      .catch((err) => setError(err.response?.data?.message || 'Error al cargar'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [postulacionId]);

  useEffect(() => {
    if (!postulacionId || legalizacion?.estado !== 'aprobada') {
      setCertificacion(null);
      return;
    }
    setCargandoCert(true);
    api
      .get(`/certificaciones-practica/postulacion/${postulacionId}`)
      .then((r) => setCertificacion(r.data?.certificacion ?? null))
      .catch(() => setCertificacion(null))
      .finally(() => setCargandoCert(false));
  }, [postulacionId, legalizacion?.estado]);

  const verCertificacionEstudiante = () => {
    api.get(`/certificaciones-practica/postulacion/${postulacionId}/documento/url`).then((r) => {
      const u = r.data?.url;
      if (u) window.open(u, '_blank', 'noopener,noreferrer');
    });
  };

  useEffect(() => {
    if (!postulacionId || !esTipoAcuerdoVinculacion(oportunidadResumen?.tipoVinculacion)) {
      setAcuerdo(null);
      return undefined;
    }
    let cancelled = false;
    setCargandoAcuerdo(true);
    api
      .get(`/legalizaciones-practica/${postulacionId}/acuerdo-vinculacion/estado`)
      .then((r) => {
        if (!cancelled) setAcuerdo(r.data?.acuerdo ?? null);
      })
      .catch(() => {
        if (!cancelled) setAcuerdo(null);
      })
      .finally(() => {
        if (!cancelled) setCargandoAcuerdo(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postulacionId, oportunidadResumen?.tipoVinculacion]);

  const docs = legalizacion?.documentos || {};
  const isBorrador = legalizacion?.estado === 'borrador';
  const enAjuste = legalizacion?.estado === 'en_ajuste';
  const puedeEditarDocs = isBorrador || enAjuste;

  const obligatoriasCargadas = useMemo(() => {
    const oblig = definicionesDocumentos.filter((d) => d.documentMandatory);
    return oblig.every((d) => docs[defIdStr(d)]?.key);
  }, [definicionesDocumentos, docs]);

  const puedeEnviarRevision = puedeEditarDocs && definicionesDocumentos.length > 0 && obligatoriasCargadas;

  const handleFile = (definitionId, e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      Swal.fire({ icon: 'warning', title: 'Archivo grande', text: `Máximo ${MAX_FILE_MB} MB`, confirmButtonColor: '#c41e3a' });
      return;
    }
    setUploading(definitionId);
    const fd = new FormData();
    fd.append('definitionId', definitionId);
    fd.append('file', file);
    api
      .post(`/legalizaciones-practica/${postulacionId}/documentos`, fd)
      .then((r) => setLegalizacion(r.data?.legalizacion))
      .catch((err) => Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo subir', confirmButtonColor: '#c41e3a' }))
      .finally(() => {
        setUploading(null);
        if (e?.target) e.target.value = '';
      });
  };

  const eliminarDoc = (definitionId) => {
    api
      .delete(`/legalizaciones-practica/${postulacionId}/documentos/${definitionId}`)
      .then((r) => setLegalizacion(r.data?.legalizacion))
      .catch((err) => Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo eliminar', confirmButtonColor: '#c41e3a' }));
  };

  const cerrarPreviewPdf = () => {
    setPreviewPdf((prev) => {
      if (prev.url?.startsWith('blob:')) URL.revokeObjectURL(prev.url);
      return { open: false, url: null, title: '' };
    });
  };

  const copiarTexto = async (text) => {
    const t = String(text || '');
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      Swal.fire({ icon: 'success', title: 'Copiado al portapapeles', timer: 1400, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: 'warning', title: 'No se pudo copiar', text: 'Seleccione el enlace y cópielo manualmente.', confirmButtonColor: '#c41e3a' });
    }
  };

  const generarAcuerdoVinculacion = async () => {
    setGenerandoAcuerdoVinculacion(true);
    try {
      await api.post(`/legalizaciones-practica/${postulacionId}/acuerdo-vinculacion/emitir`);
      const { data } = await api.get(`/legalizaciones-practica/${postulacionId}/acuerdo-vinculacion/estado`);
      setAcuerdo(data?.acuerdo ?? null);
      Swal.fire({
        icon: 'success',
        title: 'Acuerdo generado',
        text: 'Se guardó el PDF. Aquí solo verá su enlace como practicante; coordinación envía los demás enlaces.',
        confirmButtonColor: '#c41e3a',
      });
    } catch (e) {
      if (e.response?.status === 409) {
        try {
          const { data } = await api.get(`/legalizaciones-practica/${postulacionId}/acuerdo-vinculacion/estado`);
          if (data?.acuerdo) setAcuerdo(data.acuerdo);
        } catch {
          /* ignore */
        }
        Swal.fire({ icon: 'info', title: 'Acuerdo', text: e.response?.data?.message || '', confirmButtonColor: '#c41e3a' });
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo generar el acuerdo.', confirmButtonColor: '#c41e3a' });
      }
    } finally {
      setGenerandoAcuerdoVinculacion(false);
    }
  };

  const verPdfAcuerdoEmitido = async () => {
    setGenerandoAcuerdo(true);
    try {
      const res = await api.get(`/legalizaciones-practica/${postulacionId}/acuerdo-vinculacion/pdf-emitido`, { responseType: 'blob' });
      const blob = res.data;
      if (!blob || blob.size === 0) throw new Error('Respuesta vacía');
      const ct = String(res.headers['content-type'] || '').toLowerCase();
      if (ct.includes('application/json')) {
        const j = JSON.parse(await blob.text());
        throw new Error(j.message || 'No hay PDF generado aún');
      }
      const pdfBlob = ct.includes('pdf') ? blob : new Blob([blob], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      setPreviewPdf({ open: true, url, title: 'Acuerdo de vinculación (PDF generado)' });
    } catch (e) {
      let msg = e.message || 'No se pudo abrir el PDF';
      if (e.response?.data instanceof Blob) {
        try {
          const j = JSON.parse(await e.response.data.text());
          msg = j.message || msg;
        } catch {
          /* ignore */
        }
      }
      Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#c41e3a' });
    } finally {
      setGenerandoAcuerdo(false);
    }
  };

  const abrirVistaPrevia = async (definitionId, fileName) => {
    try {
      const { data } = await api.get(`/legalizaciones-practica/${postulacionId}/documentos/${definitionId}/url`);
      if (data?.url) setPreviewPdf({ open: true, url: data.url, title: fileName || 'Vista previa' });
      else Swal.fire({ icon: 'warning', title: 'No disponible', text: 'No se pudo obtener el enlace del documento.', confirmButtonColor: '#c41e3a' });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo abrir la vista previa.', confirmButtonColor: '#c41e3a' });
    }
  };

  const descargarDoc = async (definitionId, name) => {
    try {
      const res = await api.get(`/legalizaciones-practica/${postulacionId}/documentos/${definitionId}/descarga`, { responseType: 'blob' });
      const blob = res.data;
      if (!blob || blob.size === 0) throw new Error('Archivo vacío');
      const blobUrl = URL.createObjectURL(blob);
      const safeName = (name || 'documento.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      let msg = e.message || 'No se pudo descargar';
      if (e.response?.data instanceof Blob) {
        try {
          const j = JSON.parse(await e.response.data.text());
          msg = j.message || msg;
        } catch {
          /* ignore */
        }
      }
      Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#c41e3a' });
    }
  };

  const handleRemitir = async () => {
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: 'Enviar a revisión',
      text: 'La coordinación revisará sus documentos. Podrá corregirlos si se solicita ajuste.',
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c41e3a',
    });
    if (!isConfirmed) return;
    setRemitiendo(true);
    try {
      const remRes = await api.post(`/legalizaciones-practica/${postulacionId}/remitir-revision`);
      setLegalizacion(remRes.data?.legalizacion);
      load();
      Swal.fire({ icon: 'success', title: 'Enviado', text: 'La legalización fue remitida a revisión.', confirmButtonColor: '#c41e3a' });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo enviar', confirmButtonColor: '#c41e3a' });
    } finally {
      setRemitiendo(false);
    }
  };

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-CO') : '—');

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
        <p style={{ color: '#c41e3a' }}>{error || 'No encontrado'}</p>
        <button type="button" className="btn-secondary" onClick={onVolver}>Volver</button>
      </div>
    );
  }

  return (
    <div className="dashboard-content legalizacion-mtm legalizacion-mtm--full legmtm-estudiante">
      <header className="legalizacion-mtm__topbar">
        <div className="legalizacion-mtm__topbar-left">
          <button type="button" className="btn-volver" onClick={onVolver}>
            <FiArrowLeft className="btn-icon" aria-hidden />
            Volver
          </button>
          <h2 className="legalizacion-mtm__title">Legalización de práctica — Detalle</h2>
        </div>
        <div className="legalizacion-mtm__topbar-actions">
          {legalizacion?.estado === 'aprobada' && postulacionId && (
            <>
              <button
                type="button"
                className="legalizacion-mtm__btn legalizacion-mtm__btn--secondary"
                style={{ marginRight: 8 }}
                onClick={() => navigate(`/dashboard/legalizaciones/plan/${postulacionId}`)}
              >
                Plan de práctica
              </button>
              <button
                type="button"
                className="legalizacion-mtm__btn legalizacion-mtm__btn--secondary"
                style={{ marginRight: 8 }}
                onClick={() => navigate(`/dashboard/legalizaciones/seguimientos/${postulacionId}`)}
              >
                Seguimientos
              </button>
              <button
                type="button"
                className="legalizacion-mtm__btn legalizacion-mtm__btn--secondary"
                style={{ marginRight: 8 }}
                onClick={() => navigate(`/dashboard/legalizaciones/supervision/${postulacionId}`)}
              >
                Supervisión
              </button>
            </>
          )}
          {(isBorrador || enAjuste) && (
            <button
              type="button"
              className="legalizacion-mtm__btn legalizacion-mtm__btn--primary"
              onClick={handleRemitir}
              disabled={remitiendo || !puedeEnviarRevision}
              title={!puedeEnviarRevision ? 'Cargue todos los documentos obligatorios según su tipo de práctica (estudiante habilitado).' : ''}
            >
              {remitiendo ? 'Enviando…' : enAjuste ? 'Volver a enviar a revisión' : 'Enviar a revisión'}
            </button>
          )}
        </div>
      </header>

      {alertaLegalizacion?.mensaje && (
        <p
          className="legalizacion-mtm__estado"
          style={{
            background: alertaLegalizacion.nivel === 'error' ? '#fee2e2' : alertaLegalizacion.nivel === 'warning' ? '#fef3c7' : '#e0f2fe',
            color: '#111',
            borderRadius: 8,
            padding: '10px 12px',
          }}
        >
          {alertaLegalizacion.mensaje}
        </p>
      )}

      {!isBorrador && (
        <p className={`legalizacion-mtm__estado legalizacion-mtm__estado--${legalizacion?.estado === 'aprobada' ? 'ok' : legalizacion?.estado === 'rechazada' ? 'error' : legalizacion?.estado === 'en_ajuste' ? 'error' : 'revision'}`}>
          {legalizacion?.estado === 'en_revision' && 'Estado: En revisión por la coordinación.'}
          {legalizacion?.estado === 'aprobada' && 'Estado: Legalización aprobada.'}
          {legalizacion?.estado === 'rechazada' && `Estado: Rechazada. ${legalizacion.rechazoMotivo || ''}`}
          {legalizacion?.estado === 'en_ajuste' && (
            <>Estado: En ajuste. Corrija los documentos rechazados y vuelva a enviar. {legalizacion.rechazoMotivo && `Motivo: ${legalizacion.rechazoMotivo}`}</>
          )}
        </p>
      )}

      {legalizacion?.estado === 'aprobada' && (
        <section
          className="legalizacion-mtm__section"
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            background: '#fafafa',
          }}
        >
          <h3 className="legalizacion-mtm__section-title" style={{ marginTop: 0 }}>
            Certificación de práctica
          </h3>
          {cargandoCert && <p style={{ color: '#64748b' }}>Cargando estado…</p>}
          {!cargandoCert && (
            <>
              <p style={{ fontSize: 14 }}>
                Estado:{' '}
                <strong>
                  {certificacion?.estado === 'cargada'
                    ? 'Certificación recibida'
                    : certificacion?.estado === 'pendiente_carga'
                      ? 'Pendiente de cargue por la entidad o coordinación'
                      : certificacion?.estado === 'vencida_sin_carga'
                        ? 'Plazo vencido sin cargue — contacte a coordinación'
                        : certificacion
                          ? certificacion.estado
                          : 'Coordinación aún no ha solicitado el cargue'}
                </strong>
              </p>
              {certificacion?.documento?.key && (
                <button type="button" className="legalizacion-mtm__btn legalizacion-mtm__btn--secondary" style={{ marginTop: 8 }} onClick={verCertificacionEstudiante}>
                  Ver certificación
                </button>
              )}
            </>
          )}
        </section>
      )}

      {esTipoAcuerdoVinculacion(oportunidadResumen?.tipoVinculacion) && (
        <section
          className="legalizacion-mtm__section"
          style={{
            marginBottom: 16,
            background: '#f8fafc',
            borderRadius: 8,
            padding: '14px 16px',
            border: '1px solid #e2e8f0',
          }}
        >
          <h3 className="legalizacion-mtm__section-title" style={{ marginTop: 0 }}>
            Acuerdo de vinculación (triple firma)
          </h3>
          {cargandoAcuerdo && <p style={{ color: '#64748b' }}>Cargando estado del acuerdo…</p>}
          {!cargandoAcuerdo && !acuerdo && (
            <button
              type="button"
              className="legalizacion-mtm__btn legalizacion-mtm__btn--primary"
              onClick={generarAcuerdoVinculacion}
              disabled={generandoAcuerdoVinculacion}
            >
              {generandoAcuerdoVinculacion ? 'Generando…' : 'Generar acuerdo de vinculación'}
            </button>
          )}
          {!cargandoAcuerdo && acuerdo && (
            <>
              <p>
                <strong>Estado del acuerdo:</strong>{' '}
                {acuerdo.estado === 'pendiente_firmas'
                  ? 'Pendiente de firmas'
                  : acuerdo.estado === 'aprobado'
                    ? 'Aprobado (tres firmas)'
                    : 'Rechazado'}
              </p>
              {(acuerdo.version != null || acuerdo.createdAt) && (
                <p style={{ fontSize: 13 }}>
                  {acuerdo.version != null && <>Versión: {acuerdo.version}</>}
                  {acuerdo.createdAt && (
                    <>
                      {acuerdo.version != null ? ' · ' : null}
                      Generado: {new Date(acuerdo.createdAt).toLocaleString('es-CO')}
                    </>
                  )}
                </p>
              )}
              {acuerdo.enlaces && Object.keys(acuerdo.enlaces).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <strong>
                    {Object.keys(acuerdo.enlaces).length === 1 ? 'Su enlace de firma (practicante)' : 'Enlaces de firma'}
                  </strong>
                  {Object.keys(acuerdo.enlaces).length === 1 && (
                    <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 10px' }}>
                      Los enlaces del escenario de práctica y de la universidad solo los ve coordinación y los comparte con cada parte.
                    </p>
                  )}
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {ORDEN_ENLACES_ACUERDO.filter((k) => acuerdo.enlaces[k]).map((k) => (
                      <li key={k} style={{ marginBottom: 10, fontSize: 13 }}>
                        <div style={{ fontWeight: 600 }}>{FIRMA_PARTE_LABELS[k]}</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
                          <input readOnly value={acuerdo.enlaces[k] || ''} style={{ flex: '1 1 260px', minWidth: 0, padding: 6, fontSize: 12 }} />
                          <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => copiarTexto(acuerdo.enlaces[k])}>
                            Copiar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <table className="postulants-table" style={{ maxWidth: 900, marginTop: 12, fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Parte</th>
                    <th>Estado firma</th>
                    <th>Fecha</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {['practicante', 'escenario', 'universidad'].map((k) => {
                    const f = acuerdo.firmas?.[k];
                    return (
                      <tr key={k}>
                        <td>{FIRMA_PARTE_LABELS[k]}</td>
                        <td>{f?.estado || '—'}</td>
                        <td>{f?.fecha ? new Date(f.fecha).toLocaleString('es-CO') : '—'}</td>
                        <td style={{ wordBreak: 'break-all' }}>{f?.ip || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" className="legalizacion-mtm__btn legalizacion-mtm__btn--secondary" onClick={verPdfAcuerdoEmitido} disabled={generandoAcuerdo}>
                  {generandoAcuerdo ? 'Abriendo…' : 'Ver PDF generado (archivado)'}
                </button>
                {acuerdo.estado === 'rechazado' && (
                  <button
                    type="button"
                    className="legalizacion-mtm__btn legalizacion-mtm__btn--primary"
                    onClick={generarAcuerdoVinculacion}
                    disabled={generandoAcuerdoVinculacion}
                  >
                    {generandoAcuerdoVinculacion ? 'Generando…' : 'Volver a generar acuerdo (nueva versión)'}
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      )}

      <div className="legalizacion-mtm__tabs">
        <button type="button" className={`legalizacion-mtm__tab ${tabActiva === 'datos' ? 'legalizacion-mtm__tab--active' : ''}`} onClick={() => setTabActiva('datos')}>Datos generales</button>
        <button type="button" className={`legalizacion-mtm__tab ${tabActiva === 'documentos' ? 'legalizacion-mtm__tab--active' : ''}`} onClick={() => setTabActiva('documentos')}>Documentos</button>
        {historial.length > 0 && (
          <button type="button" className={`legalizacion-mtm__tab ${tabActiva === 'historial' ? 'legalizacion-mtm__tab--active' : ''}`} onClick={() => setTabActiva('historial')}>Historial de estados</button>
        )}
      </div>

      <div className="legalizacion-mtm__body">
        {tabActiva === 'datos' && (
          <div className="legalizacion-mtm__panels">
            <section className="legalizacion-mtm__section legmtm-est__panel-card" lang="es">
              <h3 className="legalizacion-mtm__section-title legmtm-est__panel-card__title">
                <span className="legmtm-est__panel-card__kicker">Estudiante</span>
                <span className="legmtm-est__panel-card__title-main">Datos del estudiante</span>
              </h3>
              <dl className="legalizacion-mtm__grid legmtm-est__grid-admrev">
                <dt>Nombre</dt><dd>{estudiante?.nombre ?? '—'}</dd>
                <dt>Correo institucional</dt><dd>{estudiante?.correoInstitucional ?? '—'}</dd>
                <dt>Correo alterno</dt><dd>{estudiante?.correoAlterno ?? '—'}</dd>
                <dt>Tipo de documento</dt><dd>{estudiante?.tipoDocumento ?? '—'}</dd>
                <dt>Número de identificación</dt><dd>{estudiante?.identificacion ?? '—'}</dd>
                <dt>Celular</dt><dd>{estudiante?.celular ?? '—'}</dd>
                <dt>Facultad</dt><dd>{estudiante?.facultad ?? '—'}</dd>
                <dt>Programa</dt><dd>{estudiante?.programa ?? '—'}</dd>
                <dt>Semestre (según créditos)</dt><dd>{estudiante?.semestreCreditos ?? '—'}</dd>
                <dt>Créditos aprobados</dt><dd>{estudiante?.creditosAprobados ?? '—'}</dd>
              </dl>
            </section>
            <section className="legalizacion-mtm__section legmtm-est__panel-card" lang="es">
              <h3 className="legalizacion-mtm__section-title legmtm-est__panel-card__title">
                <span className="legmtm-est__panel-card__kicker">Entidad</span>
                <span className="legmtm-est__panel-card__title-main">Datos de la entidad</span>
              </h3>
              <dl className="legalizacion-mtm__grid legmtm-est__grid-admrev">
                <dt>NIT</dt><dd>{entidad?.nit ?? '—'}</dd>
                <dt>Razón social</dt><dd>{entidad?.razonSocial ?? '—'}</dd>
                <dt>Representante — nombres</dt><dd>{entidad?.representanteNombres ?? '—'}</dd>
                <dt>Representante — apellidos</dt><dd>{entidad?.representanteApellidos ?? '—'}</dd>
                <dt>Representante — tipo ID</dt><dd>{entidad?.representanteTipoId ?? '—'}</dd>
                <dt>Representante — número ID</dt><dd>{entidad?.representanteNumeroId ?? '—'}</dd>
                <dt>Tutor — nombre</dt><dd>{entidad?.tutorNombres ?? '—'}</dd>
                <dt>Tutor — tipo ID</dt><dd>{entidad?.tutorTipoId ?? '—'}</dd>
                <dt>Tutor — número ID</dt><dd>{entidad?.tutorNumeroId ?? '—'}</dd>
                <dt>Tutor — cargo</dt><dd>{entidad?.tutorCargo ?? '—'}</dd>
                <dt>Tutor — teléfono</dt><dd>{entidad?.tutorTelefono ?? '—'}</dd>
                <dt>Tutor — correo</dt><dd>{entidad?.tutorEmail ?? '—'}</dd>
              </dl>
            </section>
            <section className="legalizacion-mtm__section legmtm-est__panel-card" lang="es">
              <h3 className="legalizacion-mtm__section-title legmtm-est__panel-card__title">
                <span className="legmtm-est__panel-card__kicker">Práctica</span>
                <span className="legmtm-est__panel-card__title-main">Datos de la práctica</span>
              </h3>
              <dl className="legalizacion-mtm__grid legmtm-est__grid-admrev">
                <dt>Cargo / nombre práctica</dt><dd>{oportunidadResumen?.nombreCargo ?? '—'}</dd>
                <dt>Periodo académico</dt><dd>{oportunidadResumen?.periodo ?? '—'}</dd>
                <dt>Tipo de vinculación</dt><dd>{oportunidadResumen?.tipoVinculacion?.value ?? oportunidadResumen?.tipoVinculacion?.description ?? '—'}</dd>
                <dt>Coordinador de prácticas (UR)</dt>
                <dd>
                  {practica?.coordinadorPracticas
                    ? [practica.coordinadorPracticas.nombre, practica.coordinadorPracticas.email].filter((x) => x && String(x).trim()).join(' · ') || '—'
                    : '—'}
                </dd>
                <dt>Evaluación parcial (fecha)</dt>
                <dd>{practica?.primeraEvaluacion ?? '—'}</dd>
                <dt>Evaluación final (fecha)</dt>
                <dd>{practica?.segundaEvaluacion ?? '—'}</dd>
                <dt>Tipo de práctica (asignado)</dt><dd>{practica?.tipoPracticaNacionalInternacional ?? '—'}</dd>
                <dt>Programa por el que legaliza</dt><dd>{practica?.programaLegaliza ?? '—'}</dd>
                <dt>Fecha inicio</dt><dd>{fmtDate(practica?.fechaInicio)}</dd>
                <dt>Fecha fin</dt><dd>{fmtDate(practica?.fechaFin)}</dd>
                <dt>Días estimados</dt><dd>{practica?.numeroDias ?? '—'}</dd>
                <dt>Dedicación</dt><dd>{oportunidadResumen?.dedicacion?.value ?? oportunidadResumen?.dedicacion?.description ?? practica?.duracion ?? '—'}</dd>
                <dt>Horario</dt><dd>{practica?.horario ?? oportunidadResumen?.horario ?? '—'}</dd>
                <dt>Remunerada</dt><dd>{practica?.remunerada ?? '—'}</dd>
                <dt>Remuneración (mes)</dt><dd>{practica?.remuneracionMes != null ? String(practica.remuneracionMes) : '—'}</dd>
                <dt>Área organización</dt><dd>{practica?.areaOrganizacion ?? '—'}</dd>
                <dt>ARL</dt><dd>{practica?.arl ?? '—'}</dd>
                <dt>País</dt><dd>{practica?.pais ?? '—'}</dd>
                <dt>Ciudad</dt><dd>{practica?.ciudad ?? '—'}</dd>
                <dt>Funciones</dt>
                <dd className="legmtm-est__funciones-dd" style={{ gridColumn: '2 / -1' }}>
                  {oportunidadResumen?.funciones && String(oportunidadResumen.funciones).trim() ? (
                    <button
                      type="button"
                      className="admrevmtm-longtext-btn"
                      onClick={() => openTextDetail('Funciones', oportunidadResumen.funciones)}
                    >
                      <span>Ver funciones</span>
                      <FiChevronRight className="admrevmtm-longtext-btn__icon" aria-hidden />
                    </button>
                  ) : (
                    '—'
                  )}
                </dd>
              </dl>
            </section>
          </div>
        )}

        {tabActiva === 'documentos' && (
          <section className="legalizacion-mtm__section">
            <h3 className="legalizacion-mtm__section-title">Documentos requeridos</h3>
            <p className="legalizacion-mtm__hint">
              Los documentos dependen del <strong>tipo de práctica</strong> registrado en <strong>estudiantes habilitados</strong> para este periodo y programa. El catálogo se configura en administración (Documentos legalización práctica).
            </p>
            {!definicionesDocumentos.length ? (
              <p style={{ color: '#b45309' }}>No hay documentos configurados para su tipo de práctica o no se encontró el registro en estudiantes habilitados. Contacte a coordinación.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {definicionesDocumentos.map((d) => {
                  const id = defIdStr(d);
                  const doc = docs[id];
                  const ext = (d.extensionCodes || []).join(', ') || 'pdf';
                  return (
                    <li key={id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                      <strong>{d.documentName}</strong>
                      {d.documentMandatory ? <span style={{ color: '#c41e3a', marginLeft: 8 }}>* obligatorio</span> : null}
                      {d.documentObservation ? <p style={{ margin: '6px 0', fontSize: 13, color: '#64748b' }}>{d.documentObservation}</p> : null}
                      <p style={{ fontSize: 12, color: '#6b7280' }}>Extensiones: {ext}</p>
                      {doc?.key ? (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 13 }}>{doc.originalName || 'Archivo'}</span>
                          <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => abrirVistaPrevia(id, doc.originalName || d.documentName)}>
                            Vista previa
                          </button>
                          <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => descargarDoc(id, doc.originalName)}>
                            Descargar
                          </button>
                          {puedeEditarDocs && (
                            <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => eliminarDoc(id)}>Eliminar</button>
                          )}
                          {doc.estadoDocumento === 'rechazado' && (
                            <span style={{ color: '#b91c1c', fontSize: 13 }}>Rechazado: {doc.motivoRechazo || '—'}</span>
                          )}
                        </div>
                      ) : (
                        <div style={{ marginTop: 8 }}>
                          <input
                            type="file"
                            disabled={!puedeEditarDocs || uploading === id}
                            onChange={(e) => handleFile(id, e)}
                          />
                          {uploading === id && <span style={{ marginLeft: 8 }}>Subiendo…</span>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {tabActiva === 'historial' && (
          <section className="legalizacion-mtm__section">
            <h3 className="legalizacion-mtm__section-title">Registro de cambios de estado</h3>
            <table className="postulants-table" style={{ maxWidth: 900 }}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Estado anterior</th>
                  <th>Estado nuevo</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h, i) => (
                  <tr key={i}>
                    <td>{h.fecha ? new Date(h.fecha).toLocaleString('es-CO') : '—'}</td>
                    <td>{h.estadoAnterior ?? '—'}</td>
                    <td>{h.estadoNuevo ?? '—'}</td>
                    <td>{h.detalle ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>

      <PdfPreviewModal
        open={previewPdf.open}
        onClose={cerrarPreviewPdf}
        title={previewPdf.title}
        url={previewPdf.url}
        showPrintButton
      />
      {textDetailModal.open && (
        <TextDetailModal title={textDetailModal.title} text={textDetailModal.text} onClose={closeTextDetail} />
      )}
    </div>
  );
}
