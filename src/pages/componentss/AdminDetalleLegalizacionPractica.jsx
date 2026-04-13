import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiChevronRight, FiX } from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../services/api';
import PdfPreviewModal from '../../components/ui/PdfPreviewModal';
import '../styles/Oportunidades.css';
import './AdminDetalleLegalizacionMTM.css';

function defIdStr(d) {
  return d?._id != null ? String(d._id) : '';
}

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

const estadoLabel = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  en_ajuste: 'En ajuste',
};

function docEstadoUi(estadoDocumento) {
  const st = String(estadoDocumento || 'pendiente').toLowerCase();
  if (st === 'aprobado') return { label: 'Aprobado', mod: 'ok' };
  if (st === 'rechazado') return { label: 'Rechazado', mod: 'err' };
  return { label: 'Pendiente de revisión', mod: 'pendiente' };
}

/** Textos más largos que esto muestran vista previa + modal. */
const LONG_FIELD_CHARS = 320;

/**
 * Un solo bloque con pre-wrap casi no justifica en el navegador. Una línea origen = un <p>
 * para que text-align: justify reparta espacio en líneas que hacen wrap.
 */
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
        aria-labelledby="admrevmtm-text-modal-title"
      >
        <header className="admrevmtm-text-modal__header">
          <h2 id="admrevmtm-text-modal-title" className="admrevmtm-text-modal__title">
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

/** Valor de `dd` con texto justificado; si supera el umbral, vista previa + botón al modal. */
function DefinitionDd({
  label,
  value,
  onOpenDetail,
  threshold = LONG_FIELD_CHARS,
  className = '',
  expandLabel = 'Ver contenido completo',
  /** Solo botón (sin texto cortado); útil para funciones muy largas. */
  expandOnly = false,
}) {
  const raw = value == null ? '' : String(value).trim();
  if (!raw) return <dd className={`admrevmtm-dd-value ${className}`}>—</dd>;
  if (expandOnly) {
    return (
      <dd className={`admrevmtm-dd-value admrevmtm-dd-value--collapsible admrevmtm-dd-value--expand-only ${className}`}>
        <button type="button" className="admrevmtm-longtext-btn" onClick={() => onOpenDetail(label, raw)}>
          <span>{expandLabel}</span>
          <FiChevronRight className="admrevmtm-longtext-btn__icon" aria-hidden />
        </button>
      </dd>
    );
  }
  if (raw.length <= threshold) {
    return <dd className={`admrevmtm-dd-value ${className}`}>{raw}</dd>;
  }
  const preview = `${raw.slice(0, threshold).trim()}…`;
  return (
    <dd className={`admrevmtm-dd-value admrevmtm-dd-value--collapsible ${className}`}>
      <p className="admrevmtm-longtext-preview">{preview}</p>
      <button type="button" className="admrevmtm-longtext-btn" onClick={() => onOpenDetail(label, raw)}>
        <span>{expandLabel}</span>
        <FiChevronRight className="admrevmtm-longtext-btn__icon" aria-hidden />
      </button>
    </dd>
  );
}

export default function AdminDetalleLegalizacionPractica({ onVolver }) {
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
  const [historial, setHistorial] = useState([]);
  const [error, setError] = useState(null);
  const [tabActiva, setTabActiva] = useState('datos');
  const [rechazoMotivoDoc, setRechazoMotivoDoc] = useState({});
  const [savingDoc, setSavingDoc] = useState(null);
  const [aprobando, setAprobando] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [previewPdf, setPreviewPdf] = useState({ open: false, url: null, title: '' });
  const [generandoAcuerdo, setGenerandoAcuerdo] = useState(false);
  const [acuerdo, setAcuerdo] = useState(null);
  const [cargandoAcuerdo, setCargandoAcuerdo] = useState(false);
  const [certificacion, setCertificacion] = useState(null);
  const [linkCertificacionEntidad, setLinkCertificacionEntidad] = useState('');
  const [cargandoCert, setCargandoCert] = useState(false);
  const [inicializandoCert, setInicializandoCert] = useState(false);
  const certFileRef = useRef(null);
  const [textDetailModal, setTextDetailModal] = useState({ open: false, title: '', text: '' });

  const openTextDetail = (title, text) => setTextDetailModal({ open: true, title, text: String(text ?? '') });
  const closeTextDetail = () => setTextDetailModal({ open: false, title: '', text: '' });

  const load = () => {
    if (!postulacionId) return;
    setLoading(true);
    setError(null);
    api
      .get(`/legalizaciones-practica/admin/${postulacionId}`)
      .then((r) => {
        setLegalizacion(r.data?.legalizacion);
        setEstudiante(r.data?.estudiante);
        setEntidad(r.data?.entidad);
        setPractica(r.data?.practica);
        setOportunidadResumen(r.data?.oportunidadResumen);
        setDefinicionesDocumentos(Array.isArray(r.data?.definicionesDocumentos) ? r.data.definicionesDocumentos : []);
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
      setLinkCertificacionEntidad('');
      return;
    }
    setCargandoCert(true);
    api
      .get(`/certificaciones-practica/postulacion/${postulacionId}`)
      .then((r) => {
        setCertificacion(r.data?.certificacion ?? null);
        setLinkCertificacionEntidad(r.data?.linkCargaEntidad || '');
      })
      .catch(() => {
        setCertificacion(null);
        setLinkCertificacionEntidad('');
      })
      .finally(() => setCargandoCert(false));
  }, [postulacionId, legalizacion?.estado]);

  useEffect(() => {
    if (!postulacionId || !esTipoAcuerdoVinculacion(oportunidadResumen?.tipoVinculacion)) {
      setAcuerdo(null);
      return undefined;
    }
    let cancelled = false;
    setCargandoAcuerdo(true);
    api
      .get(`/legalizaciones-practica/admin/${postulacionId}/acuerdo-vinculacion/estado`)
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
  const enRevision = legalizacion?.estado === 'en_revision';

  const definicionesConArchivo = useMemo(
    () => definicionesDocumentos.filter((d) => docs[defIdStr(d)]?.key),
    [definicionesDocumentos, docs],
  );

  const puedeAprobarLegalizacionUi = useMemo(() => {
    if (!enRevision || !definicionesConArchivo.length) return false;
    return definicionesConArchivo.every((d) => {
      const st = docs[defIdStr(d)]?.estadoDocumento;
      return st === 'aprobado' || st === 'rechazado';
    }) && !definicionesConArchivo.some((d) => docs[defIdStr(d)]?.estadoDocumento === 'rechazado');
  }, [enRevision, definicionesConArchivo, docs]);

  const cerrarPreviewPdf = () => {
    setPreviewPdf((prev) => {
      if (prev.url?.startsWith('blob:')) URL.revokeObjectURL(prev.url);
      return { open: false, url: null, title: '' };
    });
  };

  const generarAcuerdoVinculacion = async () => {
    setGenerandoAcuerdo(true);
    try {
      const res = await api.get(`/legalizaciones-practica/admin/${postulacionId}/acuerdo-vinculacion/pdf`, { responseType: 'blob' });
      const blob = res.data;
      if (!blob || blob.size === 0) throw new Error('Respuesta vacía');
      const ct = String(res.headers['content-type'] || '').toLowerCase();
      if (ct.includes('application/json')) {
        const j = JSON.parse(await blob.text());
        throw new Error(j.message || 'No se pudo generar el PDF');
      }
      const pdfBlob = ct.includes('pdf') ? blob : new Blob([blob], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      setPreviewPdf({ open: true, url, title: 'Acuerdo de vinculación' });
    } catch (e) {
      let msg = e.message || 'No se pudo generar el acuerdo';
      if (e.response?.data instanceof Blob) {
        try {
          const t = await e.response.data.text();
          const j = JSON.parse(t);
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

  const copiarTexto = async (text) => {
    const t = String(text || '');
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      Swal.fire({ icon: 'success', title: 'Copiado al portapapeles', timer: 1400, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: 'warning', title: 'No se pudo copiar', text: 'Seleccione el enlace manualmente.', confirmButtonColor: '#c41e3a' });
    }
  };

  const verPdfAcuerdoEmitido = async () => {
    setGenerandoAcuerdo(true);
    try {
      const res = await api.get(`/legalizaciones-practica/admin/${postulacionId}/acuerdo-vinculacion/pdf-emitido`, { responseType: 'blob' });
      const blob = res.data;
      if (!blob || blob.size === 0) throw new Error('Respuesta vacía');
      const ct = String(res.headers['content-type'] || '').toLowerCase();
      if (ct.includes('application/json')) {
        const j = JSON.parse(await blob.text());
        throw new Error(j.message || 'No hay PDF emitido');
      }
      const pdfBlob = ct.includes('pdf') ? blob : new Blob([blob], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      setPreviewPdf({ open: true, url, title: 'Acuerdo de vinculación (PDF emitido)' });
    } catch (e) {
      let msg = e.message || 'No se pudo abrir el PDF emitido';
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

  const getDocUrl = async (definitionId, fileName) => {
    try {
      const { data } = await api.get(`/legalizaciones-practica/admin/${postulacionId}/documentos/${definitionId}/url`);
      if (data?.url) setPreviewPdf({ open: true, url: data.url, title: fileName || 'Vista previa' });
      else Swal.fire({ icon: 'warning', title: 'No disponible', text: 'No se pudo obtener el enlace del documento.', confirmButtonColor: '#c41e3a' });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo abrir la vista previa.', confirmButtonColor: '#c41e3a' });
    }
  };

  const downloadDoc = async (definitionId, name) => {
    try {
      const res = await api.get(`/legalizaciones-practica/admin/${postulacionId}/documentos/${definitionId}/descarga`, { responseType: 'blob' });
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

  const patchDoc = (definitionId, estadoDocumento, motivoRechazo) => {
    if (estadoDocumento === 'rechazado' && !String(motivoRechazo || '').trim()) {
      Swal.fire({ icon: 'warning', title: 'Motivo requerido', text: 'Indique el motivo del rechazo antes de continuar.', confirmButtonColor: '#c41e3a' });
      return;
    }
    setSavingDoc(definitionId);
    api
      .patch(`/legalizaciones-practica/admin/${postulacionId}/documentos/${definitionId}`, { estadoDocumento, motivoRechazo })
      .then((r) => {
        setLegalizacion(r.data?.legalizacion);
        if (estadoDocumento === 'aprobado') {
          Swal.fire({
            icon: 'success',
            title: 'Documento aprobado',
            html: '<p style="margin:0">El estado quedó guardado. Las acciones de aprobar/rechazar ya no están disponibles para este archivo.</p>',
            confirmButtonColor: '#c41e3a',
          });
        } else {
          Swal.fire({
            icon: 'info',
            title: 'Documento rechazado',
            text: 'El estudiante verá el motivo y podrá cargar un nuevo archivo si corresponde.',
            confirmButtonColor: '#c41e3a',
          });
        }
      })
      .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo guardar', confirmButtonColor: '#c41e3a' }))
      .finally(() => setSavingDoc(null));
  };

  const aprobarLegalizacion = () => {
    setAprobando(true);
    api
      .post(`/legalizaciones-practica/admin/${postulacionId}/aprobar`)
      .then((r) => {
        setLegalizacion(r.data?.legalizacion);
        Swal.fire({ icon: 'success', title: 'Aprobada', confirmButtonColor: '#c41e3a' });
        load();
      })
      .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || '', confirmButtonColor: '#c41e3a' }))
      .finally(() => setAprobando(false));
  };

  const rechazarLegalizacion = async () => {
    const paso = await Swal.fire({
      title: '¿Qué desea hacer?',
      text: 'Enviar a ajuste permite al estudiante cargar de nuevo documentos. Rechazar cierra la legalización.',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Enviar a ajuste',
      denyButtonText: 'Rechazar definitivo',
      confirmButtonColor: '#c41e3a',
    });
    if (paso.isDismissed) return;
    const enviarAjuste = paso.isConfirmed;
    const { value: motivo } = await Swal.fire({
      title: 'Motivo',
      input: 'textarea',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      confirmButtonColor: '#c41e3a',
    });
    if (motivo === undefined) return;
    setRechazando(true);
    api
      .post(`/legalizaciones-practica/admin/${postulacionId}/rechazar`, { motivo: motivo || '', enviarAjuste })
      .then((r) => {
        setLegalizacion(r.data?.legalizacion);
        Swal.fire({ icon: 'success', title: enviarAjuste ? 'Enviado a ajuste' : 'Rechazada', confirmButtonColor: '#c41e3a' });
        load();
      })
      .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || '', confirmButtonColor: '#c41e3a' }))
      .finally(() => setRechazando(false));
  };

  const inicializarCertificacionHu010 = () => {
    setInicializandoCert(true);
    api
      .post(`/certificaciones-practica/postulacion/${postulacionId}/inicializar`, {})
      .then(() => api.get(`/certificaciones-practica/postulacion/${postulacionId}`))
      .then((r) => {
        setCertificacion(r.data?.certificacion ?? null);
        setLinkCertificacionEntidad(r.data?.linkCargaEntidad || '');
        Swal.fire({
          icon: 'success',
          title: 'Solicitud registrada',
          text: 'Use el enlace para la entidad o cargue el documento desde coordinación.',
          confirmButtonColor: '#c41e3a',
        });
      })
      .catch((e) => Swal.fire({ icon: 'error', text: e.response?.data?.message || 'No se pudo inicializar' }))
      .finally(() => setInicializandoCert(false));
  };

  const subirCertificacionCoord = () => {
    const f = certFileRef.current?.files?.[0];
    if (!f) {
      Swal.fire({ icon: 'warning', title: 'Seleccione un archivo', confirmButtonColor: '#c41e3a' });
      return;
    }
    const fd = new FormData();
    fd.append('file', f);
    api
      .post(`/certificaciones-practica/postulacion/${postulacionId}/documento`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(() => api.get(`/certificaciones-practica/postulacion/${postulacionId}`))
      .then((r) => {
        setCertificacion(r.data?.certificacion ?? null);
        setLinkCertificacionEntidad(r.data?.linkCargaEntidad || '');
        if (certFileRef.current) certFileRef.current.value = '';
        Swal.fire({ icon: 'success', title: 'Certificación cargada', confirmButtonColor: '#c41e3a' });
      })
      .catch((e) => Swal.fire({ icon: 'error', text: e.response?.data?.message }));
  };

  const verCertificacionDoc = () => {
    api.get(`/certificaciones-practica/postulacion/${postulacionId}/documento/url`).then((r) => {
      const u = r.data?.url;
      if (u) window.open(u, '_blank', 'noopener,noreferrer');
    });
  };

  const toggleVinculacionLaboral = (v) => {
    api
      .patch(`/certificaciones-practica/postulacion/${postulacionId}/vinculacion-laboral`, { vinculacionLaboral: v })
      .then((r) => setCertificacion(r.data?.certificacion ?? null))
      .catch((e) => Swal.fire({ icon: 'error', text: e.response?.data?.message }));
  };

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-CO') : '—');

  if (loading) {
    return (
      <div className="dashboard-content admrevmtm">
        <div className="loading-container admrevmtm__state-screen">
          <div className="loading-spinner" />
          <p>Cargando revisión…</p>
        </div>
      </div>
    );
  }
  if (error || !legalizacion) {
    return (
      <div className="dashboard-content admrevmtm">
        <div className="admrevmtm__state-screen admrevmtm__state-screen--error">
          <p>{error || 'No encontrado'}</p>
          <button type="button" className="btn-secondary" onClick={onVolver}>Volver al listado</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-content legalizacion-mtm legalizacion-mtm--full admrevmtm">
      <header className="legalizacion-mtm__topbar">
        <div className="legalizacion-mtm__topbar-left">
          <button type="button" className="btn-volver" onClick={onVolver}>
            <FiArrowLeft className="btn-icon" aria-hidden />
            Volver
          </button>
          <div>
            <h2 className="legalizacion-mtm__title">Revisión de legalización</h2>
            <p className="admrevmtm__subtitle">
              Práctica profesional
              {estudiante?.nombre ? ` · ${estudiante.nombre}` : ''}
            </p>
          </div>
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
          {esTipoAcuerdoVinculacion(oportunidadResumen?.tipoVinculacion) && (
            <button
              type="button"
              className="legalizacion-mtm__btn legalizacion-mtm__btn--secondary"
              style={{ marginRight: 8 }}
              onClick={generarAcuerdoVinculacion}
              disabled={generandoAcuerdo}
            >
              {generandoAcuerdo ? 'Generando…' : 'Generar acuerdo de vinculación'}
            </button>
          )}
          {legalizacion?.estado && (
            <span className={`legalizacion-mtm__estado legalizacion-mtm__estado--${legalizacion.estado === 'aprobada' ? 'ok' : legalizacion.estado === 'rechazada' ? 'error' : 'revision'}`}>
              Estado: {estadoLabel[legalizacion.estado] ?? legalizacion.estado}
            </span>
          )}
          {enRevision && (
            <>
              <button type="button" className="btn-secondary" onClick={rechazarLegalizacion} disabled={rechazando}>Rechazar / Ajuste</button>
              <button
                type="button"
                className="btn-guardar admrevmtm__btn-aprobar"
                onClick={aprobarLegalizacion}
                disabled={aprobando || !puedeAprobarLegalizacionUi}
              >
                Aprobar legalización
              </button>
            </>
          )}
        </div>
      </header>

      {esTipoAcuerdoVinculacion(oportunidadResumen?.tipoVinculacion) && (
        <section className="legalizacion-mtm__section admrevmtm__acuerdo-panel">
          <h3 className="legalizacion-mtm__section-title">Acuerdo de vinculación (triple firma)</h3>
          <p className="admrevmtm__acuerdo-lead">
            El estudiante genera el acuerdo y solo ve su enlace como practicante. Usted ve los tres enlaces para enviarlos al escenario de práctica y a quien firme por la universidad. Puede abrir el PDF archivado. Para aprobar el documento de acuerdo en Documentos, deben estar las tres firmas.
          </p>
          {legalizacion?.acuerdoTresFirmasCompletas ? (
            <p className="admrevmtm__acuerdo-alert admrevmtm__acuerdo-alert--ok">Las tres firmas del acuerdo están registradas.</p>
          ) : (
            <p className="admrevmtm__acuerdo-alert admrevmtm__acuerdo-alert--warn">Aún faltan firmas o el acuerdo no ha sido emitido.</p>
          )}
          {cargandoAcuerdo && <p className="admrevmtm__acuerdo-muted">Cargando estado del acuerdo…</p>}
          {!cargandoAcuerdo && !acuerdo && <p className="admrevmtm__acuerdo-muted">No hay acuerdo emitido todavía.</p>}
          {!cargandoAcuerdo && acuerdo && (
            <>
              <p className="admrevmtm__acuerdo-status">
                Estado del acuerdo:{' '}
                {acuerdo.estado === 'pendiente_firmas'
                  ? 'Pendiente de firmas'
                  : acuerdo.estado === 'aprobado'
                    ? 'Aprobado (tres firmas)'
                    : 'Rechazado'}
              </p>
              {acuerdo.version != null && acuerdo.createdAt && (
                <p className="admrevmtm__acuerdo-meta">
                  Versión: {acuerdo.version} · Emitido: {new Date(acuerdo.createdAt).toLocaleString('es-CO')}
                </p>
              )}
              {acuerdo.enlaces && Object.keys(acuerdo.enlaces).length > 0 && (
                <div>
                  <strong className="admrevmtm__firma-links-title">Enlaces de firma (coordinación)</strong>
                  <ul className="admrevmtm__firma-list">
                    {ORDEN_ENLACES_ACUERDO.filter((k) => acuerdo.enlaces[k]).map((k) => (
                      <li key={k} className="admrevmtm__firma-item">
                        <div className="admrevmtm__firma-parte">{FIRMA_PARTE_LABELS[k]}</div>
                        <div className="admrevmtm__firma-row">
                          <input readOnly className="admrevmtm__firma-input" value={acuerdo.enlaces[k] || ''} />
                          <button type="button" className="admrevmtm__firma-copy" onClick={() => copiarTexto(acuerdo.enlaces[k])}>
                            Copiar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="admrevmtm__table-wrap">
                <table className="postulants-table">
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
              </div>
              <div className="admrevmtm__acuerdo-actions">
                <button type="button" className="legalizacion-mtm__btn legalizacion-mtm__btn--secondary" onClick={verPdfAcuerdoEmitido} disabled={generandoAcuerdo}>
                  {generandoAcuerdo ? 'Abriendo…' : 'Ver PDF emitido (archivado)'}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {legalizacion?.estado === 'aprobada' && (
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
            Certificación de práctica / pasantía (HU010)
          </h3>
          <p style={{ fontSize: 14, color: '#475569', marginBottom: 12 }}>
            Tras finalizar la práctica, solicite el cargue a la entidad (enlace público) o cargue el documento desde coordinación. El archivo queda asociado a esta postulación y al perfil del estudiante.
          </p>
          {cargandoCert && <p style={{ color: '#64748b' }}>Cargando estado de certificación…</p>}
          {!cargandoCert && (
            <>
              <p>
                <strong>Estado:</strong>{' '}
                {certificacion?.estado === 'cargada'
                  ? 'Cargada'
                  : certificacion?.estado === 'pendiente_carga'
                    ? 'Pendiente de cargue'
                    : certificacion?.estado === 'vencida_sin_carga'
                      ? 'Vencida sin cargue (alerta)'
                      : certificacion
                        ? certificacion.estado
                        : 'Sin iniciar'}
              </p>
              {certificacion?.fechaLimiteCarga && (
                <p style={{ fontSize: 13 }}>
                  Fecha límite cargue: {new Date(certificacion.fechaLimiteCarga).toLocaleString('es-CO')}
                </p>
              )}
              {linkCertificacionEntidad && (
                <p style={{ wordBreak: 'break-all', fontSize: 13 }}>
                  <strong>Enlace entidad:</strong>{' '}
                  <a href={linkCertificacionEntidad} target="_blank" rel="noopener noreferrer">
                    {linkCertificacionEntidad}
                  </a>
                </p>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, alignItems: 'center' }}>
                <button
                  type="button"
                  className="legalizacion-mtm__btn legalizacion-mtm__btn--secondary"
                  onClick={inicializarCertificacionHu010}
                  disabled={inicializandoCert || (certificacion?.documento?.key && certificacion?.estado === 'cargada')}
                >
                  {inicializandoCert ? 'Procesando…' : certificacion ? 'Renovar solicitud / enlace' : 'Solicitar cargue (entidad)'}
                </button>
                <input ref={certFileRef} type="file" accept=".pdf,application/pdf" style={{ maxWidth: 220 }} />
                <button type="button" className="btn-guardar" onClick={subirCertificacionCoord}>
                  Cargar certificación (coordinación)
                </button>
                {certificacion?.documento?.key && (
                  <button type="button" className="btn-secondary" onClick={verCertificacionDoc}>
                    Ver documento
                  </button>
                )}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={Boolean(certificacion?.vinculacionLaboral)}
                  onChange={(e) => toggleVinculacionLaboral(e.target.checked)}
                />
                Estudiante vinculado laboralmente a la entidad
              </label>
            </>
          )}
        </section>
      )}

      <div className="legalizacion-mtm__tabs">
        <button type="button" className={`legalizacion-mtm__tab ${tabActiva === 'datos' ? 'legalizacion-mtm__tab--active' : ''}`} onClick={() => setTabActiva('datos')}>Datos generales</button>
        <button type="button" className={`legalizacion-mtm__tab ${tabActiva === 'documentos' ? 'legalizacion-mtm__tab--active' : ''}`} onClick={() => setTabActiva('documentos')}>Documentos</button>
        <button type="button" className={`legalizacion-mtm__tab ${tabActiva === 'historial' ? 'legalizacion-mtm__tab--active' : ''}`} onClick={() => setTabActiva('historial')}>Historial</button>
      </div>

      <div className="legalizacion-mtm__body">
        {tabActiva === 'datos' && (
          <div className="legalizacion-mtm__panels">
            <section className="legalizacion-mtm__section admrevmtm-panel-card" lang="es">
              <h3 className="legalizacion-mtm__section-title admrevmtm-panel-card__title">
                <span className="admrevmtm-panel-card__kicker">Estudiante</span>
                <span className="admrevmtm-panel-card__title-main">Datos del estudiante</span>
              </h3>
              <dl className="legalizacion-mtm__grid legalizacion-mtm__grid--admrev">
                <dt>Nombre</dt><dd className="admrevmtm-dd-value">{estudiante?.nombre ?? '—'}</dd>
                <dt>Correo institucional</dt><dd className="admrevmtm-dd-value">{estudiante?.correoInstitucional ?? '—'}</dd>
                <dt>Correo alterno</dt><dd className="admrevmtm-dd-value">{estudiante?.correoAlterno ?? '—'}</dd>
                <dt>Tipo de documento</dt><dd className="admrevmtm-dd-value">{estudiante?.tipoDocumento ?? '—'}</dd>
                <dt title="Número de identificación">No. identificación</dt><dd className="admrevmtm-dd-value">{estudiante?.identificacion ?? '—'}</dd>
                <dt>Celular</dt><dd className="admrevmtm-dd-value">{estudiante?.celular ?? '—'}</dd>
                <dt>Facultad</dt><dd className="admrevmtm-dd-value">{estudiante?.facultad ?? '—'}</dd>
                <dt>Programa</dt><dd className="admrevmtm-dd-value">{estudiante?.programa ?? '—'}</dd>
                <dt title="Semestre (según créditos aprobados)">Semestre (créditos)</dt><dd className="admrevmtm-dd-value">{estudiante?.semestreCreditos ?? '—'}</dd>
                <dt title="Créditos aprobados">Créditos aprob.</dt><dd className="admrevmtm-dd-value">{estudiante?.creditosAprobados ?? '—'}</dd>
              </dl>
            </section>
            <section className="legalizacion-mtm__section admrevmtm-panel-card" lang="es">
              <h3 className="legalizacion-mtm__section-title admrevmtm-panel-card__title">
                <span className="admrevmtm-panel-card__kicker">Entidad</span>
                <span className="admrevmtm-panel-card__title-main">Datos de la entidad</span>
              </h3>
              <dl className="legalizacion-mtm__grid legalizacion-mtm__grid--admrev">
                <dt>NIT</dt><dd className="admrevmtm-dd-value">{entidad?.nit ?? '—'}</dd>
                <dt>Razón social</dt>
                <DefinitionDd
                  label="Razón social"
                  value={entidad?.razonSocial}
                  onOpenDetail={openTextDetail}
                  expandLabel="Ver razón social"
                />
                <dt title="Representante — nombres">Rep. · nombres</dt><dd className="admrevmtm-dd-value">{entidad?.representanteNombres ?? '—'}</dd>
                <dt title="Representante — apellidos">Rep. · apellidos</dt><dd className="admrevmtm-dd-value">{entidad?.representanteApellidos ?? '—'}</dd>
                <dt title="Representante — tipo de identificación">Rep. · tipo ID</dt><dd className="admrevmtm-dd-value">{entidad?.representanteTipoId ?? '—'}</dd>
                <dt title="Representante — número de identificación">Rep. · N.º ID</dt><dd className="admrevmtm-dd-value">{entidad?.representanteNumeroId ?? '—'}</dd>
                <dt title="Tutor — nombre">Tutor · nombre</dt><dd className="admrevmtm-dd-value">{entidad?.tutorNombres ?? '—'}</dd>
                <dt title="Tutor — tipo de identificación">Tutor · tipo ID</dt><dd className="admrevmtm-dd-value">{entidad?.tutorTipoId ?? '—'}</dd>
                <dt title="Tutor — número de identificación">Tutor · N.º ID</dt><dd className="admrevmtm-dd-value">{entidad?.tutorNumeroId ?? '—'}</dd>
                <dt title="Tutor — cargo">Tutor · cargo</dt><dd className="admrevmtm-dd-value">{entidad?.tutorCargo ?? '—'}</dd>
                <dt title="Tutor — teléfono">Tutor · teléfono</dt><dd className="admrevmtm-dd-value">{entidad?.tutorTelefono ?? '—'}</dd>
                <dt title="Tutor — correo electrónico">Tutor · correo</dt><dd className="admrevmtm-dd-value">{entidad?.tutorEmail ?? '—'}</dd>
              </dl>
            </section>
            <section className="legalizacion-mtm__section admrevmtm-panel-card" lang="es">
              <h3 className="legalizacion-mtm__section-title admrevmtm-panel-card__title">
                <span className="admrevmtm-panel-card__kicker">Práctica</span>
                <span className="admrevmtm-panel-card__title-main">Datos de la práctica</span>
              </h3>
              <dl className="legalizacion-mtm__grid legalizacion-mtm__grid--admrev">
                <dt title="Cargo / nombre de la práctica">Cargo / nombre</dt>
                <DefinitionDd
                  label="Cargo / nombre práctica"
                  value={oportunidadResumen?.nombreCargo}
                  onOpenDetail={openTextDetail}
                  expandLabel="Ver cargo"
                />
                <dt>Periodo académico</dt><dd className="admrevmtm-dd-value">{oportunidadResumen?.periodo ?? '—'}</dd>
                <dt>Tipo de vinculación</dt>
                <dd className="admrevmtm-dd-value">
                  {oportunidadResumen?.tipoVinculacion?.value ?? oportunidadResumen?.tipoVinculacion?.description ?? '—'}
                </dd>
                <dt>Docente / Monitor</dt><dd className="admrevmtm-dd-value">{practica?.docenteMonitor ?? '—'}</dd>
                <dt title="Correo del docente o monitor">Correo docente</dt><dd className="admrevmtm-dd-value">{practica?.correoDocenteMonitor ?? '—'}</dd>
                <dt title="Programa por el que legaliza">Programa (legalización)</dt><dd className="admrevmtm-dd-value">{practica?.programaLegaliza ?? '—'}</dd>
                <dt>Fecha inicio</dt><dd className="admrevmtm-dd-value">{fmtDate(practica?.fechaInicio)}</dd>
                <dt>Fecha fin</dt><dd className="admrevmtm-dd-value">{fmtDate(practica?.fechaFin)}</dd>
                <dt>Días estimados</dt><dd className="admrevmtm-dd-value">{practica?.numeroDias ?? '—'}</dd>
                <dt>Dedicación</dt>
                <dd className="admrevmtm-dd-value">
                  {oportunidadResumen?.dedicacion?.value ?? oportunidadResumen?.dedicacion?.description ?? practica?.duracion ?? '—'}
                </dd>
                <dt>Horario</dt>
                <DefinitionDd
                  label="Horario"
                  value={practica?.horario ?? oportunidadResumen?.horario}
                  onOpenDetail={openTextDetail}
                  threshold={200}
                  expandLabel="Ver horario"
                />
                <dt>Remunerada</dt><dd className="admrevmtm-dd-value">{practica?.remunerada ?? '—'}</dd>
                <dt>Remuneración (mes)</dt><dd className="admrevmtm-dd-value">{practica?.remuneracionMes != null ? String(practica.remuneracionMes) : '—'}</dd>
                <dt>Área organización</dt><dd className="admrevmtm-dd-value">{practica?.areaOrganizacion ?? '—'}</dd>
                <dt>ARL</dt><dd className="admrevmtm-dd-value">{practica?.arl ?? '—'}</dd>
                <dt>País</dt><dd className="admrevmtm-dd-value">{practica?.pais ?? '—'}</dd>
                <dt>Ciudad</dt><dd className="admrevmtm-dd-value">{practica?.ciudad ?? '—'}</dd>
                <dt>Funciones</dt>
                <DefinitionDd
                  label="Funciones"
                  value={oportunidadResumen?.funciones}
                  onOpenDetail={openTextDetail}
                  className="admrevmtm-dd--full-width"
                  expandLabel="Ver funciones"
                  expandOnly
                />
              </dl>
            </section>
          </div>
        )}

        {tabActiva === 'documentos' && (
          <section className="legalizacion-mtm__section admrevmtm__docs-section">
            <h3 className="legalizacion-mtm__section-title">Documentos cargados</h3>
            <p className="admrevmtm__docs-hint">Revise cada archivo, use vista previa o descarga y marque aprobado o rechazado antes de aprobar la legalización completa.</p>
            <div className="admrevmtm__docs-grid">
              {definicionesConArchivo.map((d) => {
                const id = defIdStr(d);
                const doc = docs[id];
                const label = d.documentName;
                const estadoDoc = doc?.estadoDocumento || 'pendiente';
                const docAprobado = estadoDoc === 'aprobado';
                const docRechazado = estadoDoc === 'rechazado';
                const badgeClass = docAprobado
                  ? 'admrevmtm-doc__badge--ok'
                  : docRechazado
                    ? 'admrevmtm-doc__badge--err'
                    : 'admrevmtm-doc__badge--pendiente';
                const estadoLabel = docAprobado ? 'Aprobado' : docRechazado ? 'Rechazado' : 'Pendiente de revisión';
                const estUi = docEstadoUi(doc?.estadoDocumento);
                return (
                  <article key={id} className={`admrevmtm-doc${docAprobado ? ' admrevmtm-doc--locked' : ''}`}>
                    <header className="admrevmtm-doc__head">
                      <h4 className="admrevmtm-doc__title">{label}</h4>
                      <div className="admrevmtm-doc__head-badges">
                        <span className={`admrevmtm-doc__estado admrevmtm-doc__estado--${estUi.mod}`}>{estUi.label}</span>
                        {d.bindingAgreement && <span className="admrevmtm-doc__badge admrevmtm-doc__badge--pendiente">Acuerdo</span>}
                      </div>
                    </header>
                    <div className="admrevmtm-doc__status-row">
                      <span className={`admrevmtm-doc__estado-badge ${badgeClass}`}>{estadoLabel}</span>
                      <span className="admrevmtm-doc__estado-hint">
                        {docAprobado && 'Este documento ya fue revisado y aprobado.'}
                        {docRechazado && 'Puede aprobar un nuevo archivo si el estudiante lo vuelve a cargar.'}
                        {!docAprobado && !docRechazado && 'Revise el archivo y apruebe o rechace con motivo.'}
                      </span>
                    </div>
                    <p className="admrevmtm-doc__file">{doc?.originalName}</p>
                    <div className="admrevmtm-doc__actions">
                      <button type="button" className="admrevmtm-doc__link" onClick={() => getDocUrl(id, doc?.originalName || label)}>Vista previa</button>
                      <button type="button" className="admrevmtm-doc__btn" onClick={() => downloadDoc(id, doc?.originalName)}>Descargar</button>
                      {enRevision && !docAprobado && (
                        <>
                          <button
                            type="button"
                            className="admrevmtm-doc__btn admrevmtm-doc__btn--approve"
                            disabled={savingDoc === id || (d.bindingAgreement && !legalizacion?.acuerdoTresFirmasCompletas)}
                            onClick={() => patchDoc(id, 'aprobado')}
                          >
                            {savingDoc === id ? 'Guardando…' : 'Aprobar'}
                          </button>
                          <div className="admrevmtm-doc__reject">
                            <input
                              className="admrevmtm-doc__reject-input"
                              placeholder="Motivo rechazo"
                              value={rechazoMotivoDoc[id] || ''}
                              onChange={(e) => setRechazoMotivoDoc((m) => ({ ...m, [id]: e.target.value }))}
                            />
                            <button
                              type="button"
                              className="admrevmtm-doc__reject-btn"
                              disabled={savingDoc === id}
                              onClick={() => patchDoc(id, 'rechazado', rechazoMotivoDoc[id])}
                            >
                              Rechazar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {tabActiva === 'historial' && (
          <section className="legalizacion-mtm__section">
            <h3 className="legalizacion-mtm__section-title">Historial de estados</h3>
            <div className="admrevmtm__historial-wrap">
              <table className="postulants-table">
                <thead>
                  <tr><th>Fecha</th><th>Anterior</th><th>Nuevo</th><th>Detalle</th><th>IP</th></tr>
                </thead>
                <tbody>
                  {(historial || []).length === 0 ? (
                    <tr><td colSpan={5} className="admrevmtm__historial-empty">Sin movimientos registrados.</td></tr>
                  ) : (
                    (historial || []).map((h, i) => (
                      <tr key={i}>
                        <td>{h.fecha ? new Date(h.fecha).toLocaleString('es-CO') : '—'}</td>
                        <td>{h.estadoAnterior ?? '—'}</td>
                        <td>{h.estadoNuevo ?? '—'}</td>
                        <td>{h.detalle ?? '—'}</td>
                        <td>{h.ip ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
