import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import api from '../../services/api';
import PdfPreviewModal from '../../components/ui/PdfPreviewModal';
import SeguimientosMTM from './SeguimientosMTM';
import '../styles/Oportunidades.css';
import './AdminDetalleLegalizacionMTM.css';

const POSTULACION_OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
function postulacionIdFromRevisionPath(pathname) {
  const m = String(pathname || '').match(/\/dashboard\/monitorias\/revision\/([^/]+)/);
  const id = m?.[1];
  return id && POSTULACION_OBJECT_ID_REGEX.test(id) ? id : '';
}

function defIdStr(d) {
  return d?._id != null ? String(d._id) : '';
}

/**
 * Plan migrado desde legado con muchos saltos de línea sueltos: compacta sin perder párrafos
 * (bloques separados por 2+ saltos se conservan; dentro de cada bloque, \n → espacio).
 */
function normalizarTextoPlanTrabajoMostrar(raw) {
  if (raw == null) return '';
  let s = String(raw).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!s) return '';
  return s
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n+/g, ' ').replace(/[ \t\f\v]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

export default function AdminDetalleLegalizacionMTM({ onVolver }) {
  const location = useLocation();
  const postulacionId = useMemo(() => postulacionIdFromRevisionPath(location.pathname), [location.pathname]);

  const [loading, setLoading] = useState(true);
  const [legalizacion, setLegalizacion] = useState(null);
  const [oportunidad, setOportunidad] = useState(null);
  const [estudiante, setEstudiante] = useState(null);
  const [error, setError] = useState(null);
  const [previewPdf, setPreviewPdf] = useState({ open: false, url: null, title: '' });
  const [rechazoMotivoDoc, setRechazoMotivoDoc] = useState({});
  const [savingDoc, setSavingDoc] = useState(null);
  const [aprobando, setAprobando] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [tabActiva, setTabActiva] = useState('datos');
  const [planTrabajo, setPlanTrabajo] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [aprobandoPlan, setAprobandoPlan] = useState(false);
  const [rechazandoPlan, setRechazandoPlan] = useState(false);
  const [planPreview, setPlanPreview] = useState({ open: false, url: null, title: '' });
  const [definicionesDocumentos, setDefinicionesDocumentos] = useState([]);
  const [exportandoReporteAsistencia, setExportandoReporteAsistencia] = useState(false);

  useEffect(() => {
    if (!postulacionId) {
      setLoading(false);
      setError('URL inválida. Abra la revisión desde el listado de legalizaciones de monitorías.');
      return;
    }
    setLoading(true);
    setError(null);
    api.get(`/oportunidades-mtm/legalizaciones-admin/${postulacionId}`)
      .then((r) => {
        setLegalizacion(r.data?.legalizacion);
        setOportunidad(r.data?.oportunidad);
        setEstudiante(r.data?.estudiante);
        setDefinicionesDocumentos(Array.isArray(r.data?.definicionesDocumentos) ? r.data.definicionesDocumentos : []);
      })
      .catch((err) => setError(err.response?.data?.message || 'Error al cargar'))
      .finally(() => setLoading(false));
  }, [postulacionId]);

  useEffect(() => {
    if (!postulacionId || legalizacion?.estado !== 'aprobada') {
      setPlanTrabajo(null);
      return;
    }
    setLoadingPlan(true);
    api.get(`/oportunidades-mtm/plan-trabajo/${postulacionId}`)
      .then((r) => setPlanTrabajo(r.data?.plan ?? null))
      .catch(() => setPlanTrabajo(null))
      .finally(() => setLoadingPlan(false));
  }, [postulacionId, legalizacion?.estado]);

  /** Link de asistencia y pestaña Seguimientos: solo si el plan de trabajo ya está aprobado. */
  const planTrabajoAprobadoParaSeguimientos = planTrabajo?.estado === 'aprobado';

  useEffect(() => {
    if (tabActiva === 'seguimientos' && !planTrabajoAprobadoParaSeguimientos) setTabActiva('datos');
  }, [tabActiva, planTrabajoAprobadoParaSeguimientos]);

  const exportarReporteAsistenciaEstaMonitoria = () => {
    if (!postulacionId) return;
    setExportandoReporteAsistencia(true);
    api
      .get(`/oportunidades-mtm/legalizaciones-admin/${postulacionId}/reporte-asistencia`)
      .then((r) => {
        const list = r.data?.data ?? [];
        if (!list.length) {
          Swal.fire({
            icon: 'warning',
            title: 'Sin datos',
            text: 'No hay registros de asistencia para esta monitoría.',
            confirmButtonColor: '#c41e3a',
          });
          return;
        }
        const headers = [
          'Código monitoría',
          'Nombre y apellido monitor',
          'Identificación monitor',
          'Correo monitor',
          'Nombre y apellido coordinador',
          'Periodo académico',
          'Nombre actividad',
          'Nombres estudiante',
          'Apellidos estudiante',
          'Identificación estudiante',
          'Programa estudiante',
          'Fecha diligenciamiento',
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
        const slug = String(oportunidad?.nombreCargo || 'mtm')
          .replace(/[\\/:*?"<>|]/g, '_')
          .slice(0, 48);
        const fecha = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `reporte_asistencia_${slug}_${fecha}.xlsx`);
        Swal.fire({
          icon: 'success',
          title: 'Exportado',
          text: `Se exportaron ${list.length} registro(s) de asistencia de esta monitoría.`,
          confirmButtonColor: '#c41e3a',
          timer: 2200,
          timerProgressBar: true,
        });
      })
      .catch((e) =>
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: e.response?.data?.message || 'No se pudo generar el reporte.',
          confirmButtonColor: '#c41e3a',
        }),
      )
      .finally(() => setExportandoReporteAsistencia(false));
  };

  const descargarCedulaPerfil = (postulantId, cedulaAttachment) => {
    if (!postulantId || !cedulaAttachment?._id) return;
    api.get(`/postulants/${postulantId}/attachments/${cedulaAttachment._id}/download`, { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        const safe = (cedulaAttachment.name || 'cedula').replace(/[^a-zA-Z0-9._-]/g, '_');
        const hasExt = /\.[a-zA-Z0-9]{2,8}$/.test(safe);
        a.download = hasExt ? safe : `${safe}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      })
      .catch(() => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo descargar.', confirmButtonColor: '#c41e3a' }));
  };

  const getDocUrl = async (definitionId, fileName) => {
    try {
      const { data } = await api.get(`/oportunidades-mtm/legalizaciones-admin/${postulacionId}/documentos/${definitionId}/url`);
      if (data?.url) setPreviewPdf({ open: true, url: data.url, title: fileName || 'Documento' });
      else Swal.fire({ icon: 'warning', title: 'No disponible', text: 'No se pudo cargar el documento.', confirmButtonColor: '#c41e3a' });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo abrir.', confirmButtonColor: '#c41e3a' });
    }
  };

  const downloadDoc = async (definitionId, fileName) => {
    try {
      const res = await api.get(`/oportunidades-mtm/legalizaciones-admin/${postulacionId}/documentos/${definitionId}/descarga`, { responseType: 'blob' });
      const blob = res.data;
      if (!blob || blob.size === 0) throw new Error('Archivo vacío');
      const blobUrl = URL.createObjectURL(blob);
      const name = (fileName || 'documento.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      let msg = e.message || 'No se pudo descargar';
      if (e.response?.data instanceof Blob) {
        try { const j = JSON.parse(await e.response.data.text()); msg = j.message || msg; } catch { }
      } else if (e.response?.data?.message) msg = e.response.data.message;
      Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#c41e3a' });
    }
  };

  const setEstadoDoc = (definitionId, estadoDocumento, motivoRechazo = '') => {
    setSavingDoc(definitionId);
    api.patch(`/oportunidades-mtm/legalizaciones-admin/${postulacionId}/documentos/${definitionId}`, {
      estadoDocumento,
      motivoRechazo: estadoDocumento === 'rechazado' ? motivoRechazo : undefined,
    })
      .then((r) => setLegalizacion(r.data?.legalizacion))
      .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo actualizar.', confirmButtonColor: '#c41e3a' }))
      .finally(() => setSavingDoc(null));
  };

  const handleRechazarDoc = (definitionId, docLabel) => {
    const motivo = rechazoMotivoDoc[definitionId]?.trim();
    if (!motivo) {
      Swal.fire({ icon: 'warning', title: 'Motivo requerido', text: 'Indique el motivo de rechazo del documento.', confirmButtonColor: '#c41e3a' });
      return;
    }
    setEstadoDoc(definitionId, 'rechazado', motivo);
    setRechazoMotivoDoc((prev) => ({ ...prev, [definitionId]: '' }));
  };

  const aprobarLegalizacion = () => {
    const docsLocal = legalizacion?.documentos || {};
    const faltaObligatorioSinArchivo = definicionesDocumentos.some((d) => {
      if (!d.documentMandatory) return false;
      const doc = docsLocal[defIdStr(d)];
      return !doc?.key;
    });
    if (faltaObligatorioSinArchivo) {
      Swal.fire({
        icon: 'warning',
        title: 'Documentos incompletos',
        text: 'Aún faltan documentos obligatorios por cargar. El estudiante debe adjuntarlos antes de aprobar.',
        confirmButtonColor: '#c41e3a',
      });
      return;
    }
    const algunRechazado = definicionesDocumentos.some((d) => docsLocal[defIdStr(d)]?.estadoDocumento === 'rechazado');
    const algunPendiente = definicionesDocumentos.some((d) => {
      const doc = docsLocal[defIdStr(d)];
      if (!doc?.key) return false;
      return !doc.estadoDocumento || doc.estadoDocumento === 'pendiente';
    });
    if (algunRechazado || algunPendiente) {
      Swal.fire({
        icon: 'warning',
        title: 'Revisión incompleta',
        text: algunRechazado ? 'Hay documentos rechazados. Solicite ajustes al estudiante.' : 'Debe aprobar o rechazar todos los documentos cargados antes de aprobar la legalización.',
        confirmButtonColor: '#c41e3a',
      });
      return;
    }
    setAprobando(true);
    api.post(`/oportunidades-mtm/legalizaciones-admin/${postulacionId}/aprobar`)
      .then((r) => {
        setLegalizacion(r.data?.legalizacion);
        Swal.fire({ icon: 'success', title: 'Aprobada', text: 'La legalización fue aprobada correctamente.', confirmButtonColor: '#c41e3a' });
      })
      .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo aprobar.', confirmButtonColor: '#c41e3a' }))
      .finally(() => setAprobando(false));
  };

  const rechazarLegalizacion = async () => {
    const { value: form } = await Swal.fire({
      title: 'Rechazar legalización',
      html: `
        <label style="display:block; text-align:left; margin-bottom:8px;">Motivo <span style="color:#c41e3a">*</span></label>
        <textarea id="swal-motivo" class="swal2-textarea" rows="3" placeholder="Indique el motivo del rechazo..."></textarea>
        <label style="display:flex; align-items:center; gap:8px; margin-top:12px;">
          <input type="checkbox" id="swal-enviar-ajuste" />
          <span>Enviar a ajuste (el estudiante podrá corregir documentos y volver a enviar)</span>
        </label>
      `,
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      confirmButtonColor: '#c41e3a',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const motivo = document.getElementById('swal-motivo')?.value?.trim();
        const enviarAjuste = document.getElementById('swal-enviar-ajuste')?.checked ?? false;
        if (!motivo) {
          Swal.showValidationMessage('El motivo es obligatorio');
          return false;
        }
        return { motivo, enviarAjuste };
      },
    });
    if (!form) return;
    setRechazando(true);
    api.post(`/oportunidades-mtm/legalizaciones-admin/${postulacionId}/rechazar`, form)
      .then((r) => {
        setLegalizacion(r.data?.legalizacion);
        Swal.fire({
          icon: 'success',
          title: form.enviarAjuste ? 'Enviada a ajuste' : 'Rechazada',
          text: r.data?.message || (form.enviarAjuste ? 'El estudiante podrá corregir y reenviar.' : 'Legalización rechazada.'),
          confirmButtonColor: '#c41e3a',
        });
      })
      .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo rechazar.', confirmButtonColor: '#c41e3a' }))
      .finally(() => setRechazando(false));
  };

  const PLAN_ESTADO_LABEL = { borrador: 'En edición', enviado_revision: 'Enviado a revisión', aprobado: 'Aprobado', rechazado: 'Rechazado' };

  const descargarPDFPlan = (pt) => {
    if (!pt) return;
    const esc = (s) => (s || '').toString().replace(/</g, '&lt;');
    const act = (pt.actividades || []).map((a) => ({
      fecha: a.fecha ? new Date(a.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—',
      tema: esc(a.tema),
      estrategiasMetodologias: esc(a.estrategiasMetodologias).replace(/\n/g, '<br>'),
    }));
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Plan de trabajo MTM</title>
<style>body{font-family:Arial,sans-serif;font-size:12px;padding:24px;color:#111;max-width:800px;margin:0 auto}h1{font-size:18px;color:#c41e3a;border-bottom:2px solid #c41e3a;padding-bottom:8px}h2{font-size:14px;margin-top:20px;color:#374151}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}th{background:#f3f4f6;font-weight:600}.grid{display:grid;grid-template-columns:180px 1fr;gap:6px 16px;margin-top:8px}.grid dt{margin:0;color:#6b7280}.grid dd{margin:0}.bloque{margin-top:12px}</style></head><body>
<h1>Plan de trabajo — Monitoría académica</h1>
<h2>Datos básicos de la MTM</h2>
<dl class="grid">
<dt>Facultad</dt><dd>${esc(pt.facultad)}</dd>
<dt>Programa</dt><dd>${esc(pt.programa)}</dd>
<dt>Asignatura / Área</dt><dd>${esc(pt.asignaturaArea)}</dd>
<dt>Periodo</dt><dd>${esc(pt.periodo)}</dd>
<dt>Profesor / Responsable</dt><dd>${esc(pt.profesorResponsable)}</dd>
<dt>Código del monitor</dt><dd>${esc(pt.codigoMonitor)}</dd>
<dt>Nombre del monitor</dt><dd>${esc(pt.nombreMonitor)}</dd>
<dt>Teléfono</dt><dd>${esc(pt.telefono)}</dd>
<dt>Correo institucional</dt><dd>${esc(pt.correoInstitucional)}</dd>
</dl>
<h2>Justificación</h2><div class="bloque">${(pt.justificacion || '—').replace(/\n/g, '<br>').replace(/</g, '&lt;')}</div>
<h2>Objetivo general</h2><div class="bloque">${(pt.objetivoGeneral || '—').replace(/\n/g, '<br>').replace(/</g, '&lt;')}</div>
<h2>Objetivos específicos</h2><div class="bloque">${(pt.objetivosEspecificos || '—').replace(/\n/g, '<br>').replace(/</g, '&lt;')}</div>
<h2>Actividades</h2>
<table><thead><tr><th>Fecha</th><th>Tema</th><th>Estrategias y actividades</th></tr></thead><tbody>
${act.length ? act.map((a) => `<tr><td>${a.fecha}</td><td>${a.tema}</td><td>${a.estrategiasMetodologias}</td></tr>`).join('') : '<tr><td colspan="3">—</td></tr>'}
</tbody></table>
<p style="margin-top:24px;font-size:11px;color:#6b7280">Documento generado el ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.</p>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    setPlanPreview({ open: true, url, title: 'Plan de trabajo MTM' });
  };

  const closePlanPreview = () => {
    if (planPreview.url) URL.revokeObjectURL(planPreview.url);
    setPlanPreview({ open: false, url: null, title: '' });
  };

  const aprobarPlanTrabajo = () => {
    setAprobandoPlan(true);
    api.post(`/oportunidades-mtm/plan-trabajo/${postulacionId}/aprobar`)
      .then((r) => {
        setPlanTrabajo(r.data?.plan);
        Swal.fire({ icon: 'success', title: 'Aprobado', text: 'Plan de trabajo aprobado.', confirmButtonColor: '#c41e3a' });
      })
      .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo aprobar.', confirmButtonColor: '#c41e3a' }))
      .finally(() => setAprobandoPlan(false));
  };

  const rechazarPlanTrabajo = async () => {
    const { value: motivo } = await Swal.fire({
      title: 'Rechazar plan de trabajo',
      input: 'textarea',
      inputLabel: 'Motivo del rechazo',
      inputPlaceholder: 'Indique el motivo...',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      confirmButtonColor: '#c41e3a',
    });
    if (motivo === undefined) return;
    setRechazandoPlan(true);
    api.post(`/oportunidades-mtm/plan-trabajo/${postulacionId}/rechazar`, { motivo: motivo?.trim() || null })
      .then((r) => {
        setPlanTrabajo(r.data?.plan);
        Swal.fire({ icon: 'success', title: 'Rechazado', text: 'El estudiante podrá modificar y volver a enviar.', confirmButtonColor: '#c41e3a' });
      })
      .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo rechazar.', confirmButtonColor: '#c41e3a' }))
      .finally(() => setRechazandoPlan(false));
  };

  const estadoLabel = {
    creada: 'Creada',
    borrador: 'Creada',
    en_revision: 'En revisión',
    aprobada: 'Legalizada',
    rechazada: 'Anulada',
    en_ajuste: 'En ajuste',
  };
  const enRevision = legalizacion?.estado === 'en_revision';
  const legalizacionAprobada = legalizacion?.estado === 'aprobada';
  const planEnRevision = planTrabajo?.estado === 'enviado_revision';
  const docs = legalizacion?.documentos || {};
  const rawDocumentosMap = legalizacion?.documentos;
  const definicionesConArchivo = useMemo(() => {
    const dmap = rawDocumentosMap || {};
    return definicionesDocumentos.filter((d) => Boolean(dmap[defIdStr(d)]?.key));
  }, [definicionesDocumentos, rawDocumentosMap]);
  /** Cada archivo cargado debe tener decisión explícita: aprobado o rechazado (no pendiente ni sin estado). */
  const documentosCargadosTodosRevisados =
    definicionesConArchivo.length > 0 &&
    definicionesConArchivo.every((d) => {
      const id = defIdStr(d);
      const e = docs[id]?.estadoDocumento;
      return e === 'aprobado' || e === 'rechazado';
    });
  /** Solo se legaliza si todos los documentos subidos quedaron aprobados. */
  const todosAprobados =
    definicionesConArchivo.length > 0 &&
    definicionesConArchivo.every((d) => {
      const id = defIdStr(d);
      const doc = docs[id];
      return doc?.key && doc.estadoDocumento === 'aprobado';
    });
  const ningunoRechazado = !definicionesConArchivo.some((d) => {
    const id = defIdStr(d);
    return docs[id]?.estadoDocumento === 'rechazado';
  });
  const puedeAprobarLegalizacionUi =
    documentosCargadosTodosRevisados && todosAprobados && ningunoRechazado;

  if (error || (!loading && !legalizacion)) {
    return (
      <div className="dashboard-content admrevmtm">
        <div className="admrevmtm__state-screen admrevmtm__state-screen--error">
          <p>{error || 'No se encontró la legalización'}</p>
          <button type="button" className="btn-secondary" onClick={onVolver}>Volver al listado</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-content legalizacion-mtm legalizacion-mtm--full admrevmtm">
      <header className="legalizacion-mtm__topbar">
        <div className="legalizacion-mtm__topbar-left">
          <button type="button" className="legalizacion-mtm__back" onClick={onVolver}>← Volver</button>
          <div>
            <h2 className="legalizacion-mtm__title">Revisión de legalización</h2>
            <p className="admrevmtm__subtitle">
              Monitoría
              {oportunidad?.nombreCargo ? ` · ${oportunidad.nombreCargo}` : ''}
              {estudiante?.nombre ? ` · ${estudiante.nombre}` : ''}
            </p>
          </div>
        </div>
        <div className="legalizacion-mtm__topbar-actions">
          {legalizacion?.estado && (
            <span className={`legalizacion-mtm__estado legalizacion-mtm__estado--${legalizacion.estado === 'aprobada' ? 'ok' : legalizacion.estado === 'rechazada' ? 'error' : 'revision'}`}>
              Estado: {estadoLabel[legalizacion.estado] ?? legalizacion.estado}
            </span>
          )}
          {enRevision && (
            <>
              <button className="btn-secondary" onClick={rechazarLegalizacion} disabled={rechazando}>Rechazar</button>
              <button
                type="button"
                className="btn-guardar admrevmtm__btn-aprobar"
                onClick={aprobarLegalizacion}
                disabled={aprobando || !puedeAprobarLegalizacionUi}
                aria-disabled={aprobando || !puedeAprobarLegalizacionUi}
                title={
                  !documentosCargadosTodosRevisados && definicionesConArchivo.length > 0
                    ? 'Apruebe o rechace cada documento cargado antes de legalizar'
                    : definicionesConArchivo.length === 0
                      ? 'No hay documentos cargados para revisar'
                      : !todosAprobados || !ningunoRechazado
                        ? 'Solo puede aprobar si todos los documentos quedaron aprobados'
                        : undefined
                }
              >
                {aprobando ? 'Aprobando...' : 'Aprobar legalización'}
              </button>
            </>
          )}
        </div>
      </header>

      {loading ? (
        <div className="loading-container"><div className="loading-spinner" /><p>Cargando...</p></div>
      ) : (
        <>
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
              Documentos
            </button>
            {legalizacionAprobada && (
              <button
                type="button"
                className={`legalizacion-mtm__tab ${tabActiva === 'plan' ? 'legalizacion-mtm__tab--active' : ''}`}
                onClick={() => setTabActiva('plan')}
              >
                Plan de trabajo
              </button>
            )}
            {planTrabajoAprobadoParaSeguimientos && (
              <button
                type="button"
                className={`legalizacion-mtm__tab ${tabActiva === 'seguimientos' ? 'legalizacion-mtm__tab--active' : ''}`}
                onClick={() => setTabActiva('seguimientos')}
              >
                Seguimientos
              </button>
            )}
          </div>

          <div className="legalizacion-mtm__body">
            {tabActiva === 'datos' && (
              <div className="legalizacion-mtm__panels">
                <section className="legalizacion-mtm__section">
                  <h3 className="legalizacion-mtm__section-title">Datos del estudiante</h3>
                  <dl className="legalizacion-mtm__grid">
                    <dt>Nombre</dt><dd>{estudiante?.nombre ?? '—'}</dd>
                    <dt>Correo institucional</dt><dd>{estudiante?.correoInstitucional ?? '—'}</dd>
                    <dt>Correo alterno</dt><dd>{estudiante?.correoAlterno ?? '—'}</dd>
                    <dt>Identificación</dt><dd>{estudiante?.identificacion ?? '—'}</dd>
                    <dt>Celular</dt><dd>{estudiante?.celular ?? '—'}</dd>
                    <dt>Dirección</dt><dd>{estudiante?.direccion ?? '—'}</dd>
                    <dt>Localidad / Barrio</dt><dd>{estudiante?.localidadBarrio ?? '—'}</dd>
                    <dt>Facultad</dt><dd>{estudiante?.facultad ?? '—'}</dd>
                    <dt>Programa</dt><dd>{estudiante?.programa ?? '—'}</dd>
                    <dt>EPS</dt><dd>{legalizacion?.eps?.value ?? legalizacion?.eps?.description ?? '—'}</dd>
                    <dt>Tipo de cuenta</dt><dd>{legalizacion?.tipoCuentaValor ?? legalizacion?.tipoCuenta?.value ?? '—'}</dd>
                    <dt>Banco</dt><dd>{legalizacion?.banco?.value ?? legalizacion?.banco?.description ?? '—'}</dd>
                    <dt>Número de cuenta</dt><dd>{legalizacion?.numeroCuenta ?? '—'}</dd>
                  </dl>
                </section>
                <section className="legalizacion-mtm__section">
                  <h3 className="legalizacion-mtm__section-title">Datos de la monitoría</h3>
                  <dl className="legalizacion-mtm__grid">
                    <dt>Nombre MTM</dt><dd>{oportunidad?.nombreCargo ?? '—'}</dd>
                    <dt>Periodo</dt><dd>{oportunidad?.periodo?.codigo ?? '—'}</dd>
                    <dt>Coordinador</dt>
                    <dd>
                      {oportunidad?.profesorResponsable
                        ? [oportunidad.profesorResponsable.nombres, oportunidad.profesorResponsable.apellidos].filter(Boolean).join(' ')
                        : (oportunidad?.nombreProfesor && String(oportunidad.nombreProfesor).trim()) || '—'}
                    </dd>
                    <dt>Correo coordinador</dt><dd>{oportunidad?.profesorResponsable?.user?.email ?? '—'}</dd>
                    <dt>Categoría</dt><dd>{oportunidad?.categoria?.value ?? oportunidad?.categoria?.description ?? '—'}</dd>
                    <dt>Número de horas a la semana</dt><dd>{oportunidad?.dedicacionHoras?.value ?? oportunidad?.dedicacionHoras?.description ?? '—'}</dd>
                    {oportunidad?.limiteHoras != null && <><dt>Límite de horas</dt><dd>{oportunidad.limiteHoras}</dd></>}
                    {oportunidad?.centroCosto && <><dt>Centro de costo</dt><dd>{oportunidad.centroCosto}</dd></>}
                    {oportunidad?.codigoCPS && <><dt>Código CPS</dt><dd>{oportunidad.codigoCPS}</dd></>}
                    <dt>Valor por hora</dt><dd>{oportunidad?.valorPorHora?.value ?? oportunidad?.valorPorHora?.description ?? '—'}</dd>
                    <dt>Asignaturas</dt><dd>{oportunidad?.asignaturas?.length ? oportunidad.asignaturas.map((a) => a.nombreAsignatura || a.codAsignatura).filter(Boolean).join(', ') : '—'}</dd>
                  </dl>
                </section>
                {planTrabajoAprobadoParaSeguimientos && (
                  <section className="legalizacion-mtm__section">
                    <h3 className="legalizacion-mtm__section-title">Link de asistencia</h3>
                    <p className="legalizacion-mtm__hint">Un único link por MTM para todo el semestre. Compártalo con los estudiantes para que registren su asistencia a los espacios.</p>
                    <button
                      type="button"
                      className="btn-guardar"
                      onClick={() => {
                        api.get(`/oportunidades-mtm/legalizaciones-admin/${postulacionId}/link-asistencia`)
                          .then((r) => {
                            const urlToCopy = r.data?.link;
                            if (!urlToCopy) return;
                            navigator.clipboard.writeText(urlToCopy).then(() => {
                              Swal.fire({ icon: 'success', title: 'Link copiado', text: 'El link de asistencia se copió al portapapeles.', confirmButtonColor: '#c41e3a' });
                            }).catch(() => Swal.fire({ icon: 'info', title: 'Link de asistencia', text: urlToCopy, confirmButtonColor: '#c41e3a' }));
                          })
                          .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo obtener el link.', confirmButtonColor: '#c41e3a' }));
                      }}
                    >
                      Obtener / Copiar link de asistencia
                    </button>
                    <button
                      type="button"
                      className="admrevmtm__btn-reporte-asistencia"
                      onClick={exportarReporteAsistenciaEstaMonitoria}
                      disabled={exportandoReporteAsistencia}
                    >
                      {exportandoReporteAsistencia ? 'Generando…' : 'Exportar reporte de asistencia (Excel)'}
                    </button>
                  </section>
                )}
              </div>
            )}

            {tabActiva === 'documentos' && (
              <section className="legalizacion-mtm__section legalizacion-mtm__section--docs admrevmtm__docs-section">
                <h3 className="legalizacion-mtm__section-title">Documentos cargados</h3>
                <p className="admrevmtm__docs-hint">
                  Solo aparecen los documentos que el estudiante adjuntó. Revíselos, apruebe o rechace con motivo. Los obligatorios deben estar aprobados para legalizar.
                </p>
                <div className="admrevmtm__docs-toolbar">
                  <button
                    type="button"
                    className="admrevmtm__btn-dl-all"
                    onClick={async () => {
                      let count = 0;
                      if (estudiante?.cedulaAttachment?.name) {
                        descargarCedulaPerfil(estudiante.postulantId, estudiante.cedulaAttachment);
                        count++;
                        await new Promise((r) => setTimeout(r, 350));
                      }
                      for (let i = 0; i < definicionesConArchivo.length; i++) {
                        const d = definicionesConArchivo[i];
                        const id = defIdStr(d);
                        const doc = docs[id];
                        await downloadDoc(id, doc?.originalName || `${id}.pdf`);
                        count++;
                        if (i < definicionesConArchivo.length - 1) await new Promise((r) => setTimeout(r, 350));
                      }
                      if (count > 0) Swal.fire({ icon: 'success', title: 'Descargas iniciadas', text: `${count} archivo(s) se están guardando en Descargas.`, confirmButtonColor: '#c41e3a', timer: 2500, timerProgressBar: true });
                    }}
                  >
                    Descargar todos los documentos
                  </button>
                </div>
                <div className="admrevmtm__docs-grid">
                  {definicionesDocumentos.length === 0 ? (
                    <p style={{ color: '#64748b' }}>No hay definiciones de documentos en configuración.</p>
                  ) : definicionesConArchivo.length === 0 ? (
                    <p style={{ color: '#64748b' }}>Aún no hay archivos adjuntos en esta legalización.</p>
                  ) : (
                    definicionesConArchivo.map((d) => {
                      const id = defIdStr(d);
                      const doc = docs[id];
                      const estadoDoc = doc?.estadoDocumento || 'pendiente';
                      const motivo = doc?.motivoRechazo;
                      const label = d.documentName || d.documentTypeItem?.value || 'Documento';
                      const badgeClass =
                        estadoDoc === 'aprobado'
                          ? 'admrevmtm-doc__badge admrevmtm-doc__badge--ok'
                          : estadoDoc === 'rechazado'
                            ? 'admrevmtm-doc__badge admrevmtm-doc__badge--err'
                            : 'admrevmtm-doc__badge admrevmtm-doc__badge--pendiente';
                      const badgeText = estadoDoc === 'aprobado' ? 'Aprobado' : estadoDoc === 'rechazado' ? 'Rechazado' : 'Pendiente';
                      return (
                        <article key={id} className="admrevmtm-doc">
                          <header className="admrevmtm-doc__head">
                            <h4 className="admrevmtm-doc__title">
                              {label}
                              {d.documentMandatory ? <span style={{ color: '#c41e3a' }}> *</span> : null}
                            </h4>
                            <span className={badgeClass}>{badgeText}</span>
                          </header>
                          {d.documentObservation?.trim() ? (
                            <p className="admrevmtm-doc__obs">{d.documentObservation}</p>
                          ) : null}
                          {doc?.originalName ? (
                            <p className="admrevmtm-doc__file">Archivo: {doc.originalName}</p>
                          ) : null}
                          <div className="admrevmtm-doc__actions">
                            <button type="button" className="admrevmtm-doc__link" onClick={() => getDocUrl(id, doc?.originalName || label)}>
                              Ver
                            </button>
                            <button type="button" className="admrevmtm-doc__btn" onClick={() => downloadDoc(id, doc?.originalName || `${id}.pdf`)}>
                              Descargar
                            </button>
                            {enRevision && estadoDoc !== 'aprobado' && (
                              <button
                                type="button"
                                className="admrevmtm-doc__btn admrevmtm-doc__btn--approve"
                                disabled={savingDoc === id}
                                onClick={() => setEstadoDoc(id, 'aprobado')}
                              >
                                {savingDoc === id ? '…' : 'Aprobar'}
                              </button>
                            )}
                          </div>
                          {enRevision && estadoDoc !== 'aprobado' && (
                            <div className="admrevmtm-doc__reject">
                              <span className="admrevmtm-doc__reject-label">Rechazar documento</span>
                              <textarea
                                className="admrevmtm-doc__reject-input"
                                placeholder="Escriba el motivo del rechazo (obligatorio)…"
                                rows={3}
                                value={rechazoMotivoDoc[id] ?? ''}
                                onChange={(e) => setRechazoMotivoDoc((p) => ({ ...p, [id]: e.target.value }))}
                                aria-label={`Motivo de rechazo: ${label}`}
                              />
                              <button
                                type="button"
                                className="admrevmtm-doc__reject-btn"
                                disabled={savingDoc === id}
                                onClick={() => handleRechazarDoc(id, label)}
                              >
                                Rechazar documento
                              </button>
                            </div>
                          )}
                          {estadoDoc === 'rechazado' && motivo ? (
                            <p className="admrevmtm-doc__motivo"><strong>Motivo registrado:</strong> {motivo}</p>
                          ) : null}
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            )}

            {tabActiva === 'seguimientos' && planTrabajoAprobadoParaSeguimientos && (
              <section className="legalizacion-mtm__section">
                <SeguimientosMTM compact isAdmin postulacionId={postulacionId} />
              </section>
            )}

            {tabActiva === 'plan' && legalizacionAprobada && (
              <section className="legalizacion-mtm__section">
                <h3 className="legalizacion-mtm__section-title">Plan de trabajo</h3>
                {loadingPlan ? (
                  <p style={{ color: '#6b7280' }}>Cargando plan...</p>
                ) : !planTrabajo ? (
                  <p style={{ color: '#6b7280' }}>El estudiante aún no ha creado el plan de trabajo.</p>
                ) : planTrabajo.estado === 'borrador' ? (
                  <p style={{ color: '#6b7280', margin: 0, lineHeight: 1.55 }}>
                    El estudiante aún no ha enviado su plan de trabajo a revisión. Cuando lo envíe, podrá revisarlo y aprobarlo desde esta pestaña.
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <span className={`legalizacion-mtm__estado legalizacion-mtm__estado--${planTrabajo.estado === 'aprobado' ? 'ok' : planTrabajo.estado === 'rechazado' ? 'error' : 'revision'}`}>
                        Estado: {PLAN_ESTADO_LABEL[planTrabajo.estado] ?? planTrabajo.estado}
                      </span>
                      <button type="button" className="btn-secondary" onClick={() => descargarPDFPlan(planTrabajo)} title="Abre una ventana para imprimir o guardar como PDF">
                        Descargar / Imprimir PDF
                      </button>
                      {planEnRevision && (
                        <>
                          <button type="button" className="btn-secondary" onClick={rechazarPlanTrabajo} disabled={rechazandoPlan}>Rechazar plan</button>
                          <button type="button" className="btn-guardar" onClick={aprobarPlanTrabajo} disabled={aprobandoPlan}>{aprobandoPlan ? 'Aprobando...' : 'Aprobar plan'}</button>
                        </>
                      )}
                    </div>
                    {planTrabajo.estado === 'rechazado' && planTrabajo.rechazoMotivo && (
                      <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}><strong>Motivo rechazo:</strong> {planTrabajo.rechazoMotivo}</p>
                    )}
                    <dl className="legalizacion-mtm__grid admrevmtm-plan-dl" style={{ marginBottom: 12 }}>
                      <dt>Justificación</dt>
                      <dd className="admrevmtm-plan-text">{normalizarTextoPlanTrabajoMostrar(planTrabajo.justificacion) || '—'}</dd>
                      <dt>Objetivo general</dt>
                      <dd className="admrevmtm-plan-text">{normalizarTextoPlanTrabajoMostrar(planTrabajo.objetivoGeneral) || '—'}</dd>
                      <dt>Objetivos específicos</dt>
                      <dd className="admrevmtm-plan-text">{normalizarTextoPlanTrabajoMostrar(planTrabajo.objetivosEspecificos) || '—'}</dd>
                    </dl>
                    {planTrabajo.actividades?.length > 0 && (
                      <div>
                        <strong style={{ display: 'block', marginBottom: 8 }}>Actividades</strong>
                        <div className="admrevmtm__table-wrap admrevmtm-plan-table-wrap">
                          <table className="postulants-table admrevmtm-plan-table">
                            <thead>
                              <tr>
                                <th>Fecha</th>
                                <th>Tema</th>
                                <th>Estrategias y actividades</th>
                              </tr>
                            </thead>
                            <tbody>
                              {planTrabajo.actividades.map((a, i) => (
                                <tr key={i}>
                                  <td className="admrevmtm-plan-cell admrevmtm-plan-cell--fecha">
                                    {a.fecha ? new Date(a.fecha).toLocaleDateString('es-CO') : '—'}
                                  </td>
                                  <td className="admrevmtm-plan-cell">{normalizarTextoPlanTrabajoMostrar(a.tema) || '—'}</td>
                                  <td className="admrevmtm-plan-cell admrevmtm-plan-cell--estrategias">
                                    {normalizarTextoPlanTrabajoMostrar(a.estrategiasMetodologias) || '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}
          </div>
        </>
      )}

      <PdfPreviewModal open={previewPdf.open} onClose={() => setPreviewPdf({ open: false, url: null, title: '' })} title={previewPdf.title} url={previewPdf.url} />
      <PdfPreviewModal open={planPreview.open} onClose={closePlanPreview} title={planPreview.title} url={planPreview.url} showPrintButton />
    </div>
  );
}
