import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../services/api';
import PdfPreviewModal from '../../components/ui/PdfPreviewModal';
import SeguimientosMTM from './SeguimientosMTM';
import '../styles/Oportunidades.css';

const DOC_FIELDS = [
  { key: 'certificadoEps', label: 'Certificado afiliación EPS', tipo: 'certificado_eps' },
  { key: 'certificacionBancaria', label: 'Certificación bancaria', tipo: 'certificacion_bancaria' },
  { key: 'rut', label: 'RUT', tipo: 'rut' },
];

export default function AdminDetalleLegalizacionMTM({ onVolver }) {
  const location = useLocation();
  const postulacionId = location.pathname.split('/').filter(Boolean).pop();

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

  useEffect(() => {
    if (!postulacionId) return;
    setLoading(true);
    setError(null);
    api.get(`/oportunidades-mtm/legalizaciones-admin/${postulacionId}`)
      .then((r) => {
        setLegalizacion(r.data?.legalizacion);
        setOportunidad(r.data?.oportunidad);
        setEstudiante(r.data?.estudiante);
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

  const descargarCedulaPerfil = (postulantId, cedulaAttachment) => {
    if (!postulantId || !cedulaAttachment?._id) return;
    api.get(`/postulants/${postulantId}/attachments/${cedulaAttachment._id}/download`, { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = (cedulaAttachment.name || 'cedula').replace(/[^a-zA-Z0-9._-]/g, '_') + '.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      })
      .catch(() => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo descargar.', confirmButtonColor: '#c41e3a' }));
  };

  const getDocUrl = async (tipo, fileName) => {
    try {
      const { data } = await api.get(`/oportunidades-mtm/legalizaciones-admin/${postulacionId}/documentos/${tipo}/url`);
      if (data?.url) setPreviewPdf({ open: true, url: data.url, title: fileName || 'Documento' });
      else Swal.fire({ icon: 'warning', title: 'No disponible', text: 'No se pudo cargar el documento.', confirmButtonColor: '#c41e3a' });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo abrir.', confirmButtonColor: '#c41e3a' });
    }
  };

  const downloadDoc = async (tipo, fileName) => {
    try {
      const res = await api.get(`/oportunidades-mtm/legalizaciones-admin/${postulacionId}/documentos/${tipo}/descarga`, { responseType: 'blob' });
      const blob = res.data;
      if (!blob || blob.size === 0) throw new Error('Archivo vacío');
      const blobUrl = URL.createObjectURL(blob);
      const name = (fileName || `${tipo}.pdf`).replace(/[^a-zA-Z0-9._-]/g, '_');
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

  const setEstadoDoc = (tipo, estadoDocumento, motivoRechazo = '') => {
    setSavingDoc(tipo);
    api.patch(`/oportunidades-mtm/legalizaciones-admin/${postulacionId}/documentos/${tipo}`, {
      estadoDocumento,
      motivoRechazo: estadoDocumento === 'rechazado' ? motivoRechazo : undefined,
    })
      .then((r) => setLegalizacion(r.data?.legalizacion))
      .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo actualizar.', confirmButtonColor: '#c41e3a' }))
      .finally(() => setSavingDoc(null));
  };

  const handleRechazarDoc = (tipo, docLabel) => {
    const motivo = rechazoMotivoDoc[tipo]?.trim();
    if (!motivo) {
      Swal.fire({ icon: 'warning', title: 'Motivo requerido', text: 'Indique el motivo de rechazo del documento.', confirmButtonColor: '#c41e3a' });
      return;
    }
    setEstadoDoc(tipo, 'rechazado', motivo);
    setRechazoMotivoDoc((prev) => ({ ...prev, [tipo]: '' }));
  };

  const aprobarLegalizacion = () => {
    const docs = legalizacion?.documentos || {};
    const algunRechazado = DOC_FIELDS.some((f) => docs[f.key]?.estadoDocumento === 'rechazado');
    const algunPendiente = DOC_FIELDS.some((f) => docs[f.key]?.key && (!docs[f.key].estadoDocumento || docs[f.key].estadoDocumento === 'pendiente'));
    if (algunRechazado || algunPendiente) {
      Swal.fire({
        icon: 'warning',
        title: 'Revisión incompleta',
        text: algunRechazado ? 'Hay documentos rechazados. Solicite ajustes al estudiante.' : 'Debe aprobar o rechazar todos los documentos antes de aprobar la legalización.',
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

  const PLAN_ESTADO_LABEL = { borrador: 'Borrador', enviado_revision: 'Enviado a revisión', aprobado: 'Aprobado', rechazado: 'Rechazado' };

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
    borrador: 'Pendiente',
    en_revision: 'En revisión',
    aprobada: 'Legalizada',
    rechazada: 'Anulada',
    en_ajuste: 'En ajuste',
  };
  const enRevision = legalizacion?.estado === 'en_revision';
  const legalizacionAprobada = legalizacion?.estado === 'aprobada';
  const planEnRevision = planTrabajo?.estado === 'enviado_revision';
  const docs = legalizacion?.documentos || {};
  const todosAprobados = DOC_FIELDS.every((f) => docs[f.key]?.key && docs[f.key]?.estadoDocumento === 'aprobado');
  const ningunoRechazado = !DOC_FIELDS.some((f) => docs[f.key]?.estadoDocumento === 'rechazado');

  if (error || (!loading && !legalizacion)) {
    return (
      <div className="dashboard-content">
        <div className="dashboard-welcome">
          <p style={{ color: '#c41e3a' }}>{error || 'No se encontró la legalización'}</p>
          <button type="button" className="btn-secondary" onClick={onVolver}>Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-content legalizacion-mtm legalizacion-mtm--full">
      <header className="legalizacion-mtm__topbar">
        <div className="legalizacion-mtm__topbar-left">
          <button type="button" className="legalizacion-mtm__back" onClick={onVolver}>← Volver</button>
          <h2 className="legalizacion-mtm__title">Revisión de legalización MTM</h2>
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
              <button className="btn-guardar" onClick={aprobarLegalizacion} disabled={aprobando || !todosAprobados || !ningunoRechazado}>
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
            <button
              type="button"
              className={`legalizacion-mtm__tab ${tabActiva === 'seguimientos' ? 'legalizacion-mtm__tab--active' : ''}`}
              onClick={() => setTabActiva('seguimientos')}
            >
              Seguimientos
            </button>
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
                    <dt>Cédula de ciudadanía</dt>
                    <dd>
                      {estudiante?.cedulaAttachment ? (
                        <button type="button" className="legalizacion-mtm__doc-preview-btn" onClick={() => descargarCedulaPerfil(estudiante.postulantId, estudiante.cedulaAttachment)}>
                          Ver / Descargar
                        </button>
                      ) : '—'}
                    </dd>
                    <dt>Celular</dt><dd>{estudiante?.celular ?? '—'}</dd>
                    <dt>Dirección</dt><dd>{estudiante?.direccion ?? '—'}</dd>
                    <dt>Zona de residencia</dt><dd>{estudiante?.zonaResidencia ?? '—'}</dd>
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
                    <dt>Coordinador</dt><dd>{oportunidad?.profesorResponsable ? [oportunidad.profesorResponsable.nombres, oportunidad.profesorResponsable.apellidos].filter(Boolean).join(' ') : '—'}</dd>
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
                </section>
              </div>
            )}

            {tabActiva === 'documentos' && (
              <section className="legalizacion-mtm__section legalizacion-mtm__section--docs">
                <h3 className="legalizacion-mtm__section-title">Documentos cargados</h3>
                <p className="legalizacion-mtm__hint">Descargue, revise y apruebe o rechace cada documento. Todos deben estar aprobados para poder aprobar la legalización.</p>
                <div style={{ marginBottom: 12 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={async () => {
                      let count = 0;
                      if (estudiante?.cedulaAttachment?.name) {
                        descargarCedulaPerfil(estudiante.postulantId, estudiante.cedulaAttachment);
                        count++;
                        await new Promise((r) => setTimeout(r, 350));
                      }
                      const tipos = DOC_FIELDS.filter((f) => docs[f.key]?.key);
                      for (let i = 0; i < tipos.length; i++) {
                        const { tipo, key } = tipos[i];
                        const doc = docs[key];
                        await downloadDoc(tipo, doc?.originalName || `${key}.pdf`);
                        count++;
                        if (i < tipos.length - 1) await new Promise((r) => setTimeout(r, 350));
                      }
                      if (count > 0) Swal.fire({ icon: 'success', title: 'Descargas iniciadas', text: `${count} archivo(s) se están guardando en Descargas.`, confirmButtonColor: '#c41e3a', timer: 2500, timerProgressBar: true });
                    }}
                  >
                    Descargar todos los documentos
                  </button>
                </div>
                <div className="legalizacion-mtm__docs-list">
                  {DOC_FIELDS.map(({ key, label, tipo }) => {
                    const doc = docs[key];
                    const estadoDoc = doc?.estadoDocumento || 'pendiente';
                    const motivo = doc?.motivoRechazo;
                    return (
                      <div key={key} className="legalizacion-mtm__doc-item" style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                          <span className="legalizacion-mtm__doc-name"><strong>{label}</strong></span>
                          <span style={{ fontSize: 12, color: estadoDoc === 'aprobado' ? '#16a34a' : estadoDoc === 'rechazado' ? '#dc2626' : '#6b7280' }}>
                            {estadoDoc === 'aprobado' ? 'Aprobado' : estadoDoc === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                          </span>
                        </div>
                        {doc?.originalName && (
                          <>
                            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                              <button type="button" className="legalizacion-mtm__doc-preview-btn" onClick={() => getDocUrl(tipo, doc.originalName)}>Ver</button>
                              <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => downloadDoc(tipo, doc.originalName)}>Descargar</button>
                              {enRevision && estadoDoc !== 'aprobado' && (
                                <>
                                  <button type="button" className="btn-guardar" style={{ fontSize: 12 }} disabled={savingDoc === tipo} onClick={() => setEstadoDoc(tipo, 'aprobado')}>
                                    {savingDoc === tipo ? '...' : 'Aprobar'}
                                  </button>
                                  <span style={{ marginLeft: 8 }}>
                                    <input
                                      type="text"
                                      placeholder="Motivo rechazo"
                                      value={rechazoMotivoDoc[tipo] ?? ''}
                                      onChange={(e) => setRechazoMotivoDoc((p) => ({ ...p, [tipo]: e.target.value }))}
                                      className="form-input"
                                      style={{ width: 200, fontSize: 12 }}
                                    />
                                    <button type="button" className="btn-secondary" style={{ marginLeft: 4, fontSize: 12 }} disabled={savingDoc === tipo} onClick={() => handleRechazarDoc(tipo, label)}>
                                      Rechazar
                                    </button>
                                  </span>
                                </>
                              )}
                            </div>
                            {estadoDoc === 'rechazado' && motivo && (
                              <p style={{ marginTop: 8, fontSize: 12, color: '#dc2626' }}><strong>Motivo rechazo:</strong> {motivo}</p>
                            )}
                          </>
                        )}
                        {!doc?.key && <p style={{ marginTop: 4, fontSize: 12, color: '#9ca3af' }}>Sin documento cargado</p>}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {tabActiva === 'seguimientos' && (
              <section className="legalizacion-mtm__section">
                <SeguimientosMTM compact isAdmin />
              </section>
            )}

            {tabActiva === 'plan' && (
              <section className="legalizacion-mtm__section">
                <h3 className="legalizacion-mtm__section-title">Plan de trabajo</h3>
                {loadingPlan ? (
                  <p style={{ color: '#6b7280' }}>Cargando plan...</p>
                ) : !planTrabajo ? (
                  <p style={{ color: '#6b7280' }}>El estudiante aún no ha creado el plan de trabajo.</p>
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
                    <dl className="legalizacion-mtm__grid" style={{ marginBottom: 12 }}>
                      <dt>Justificación</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{planTrabajo.justificacion || '—'}</dd>
                      <dt>Objetivo general</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{planTrabajo.objetivoGeneral || '—'}</dd>
                      <dt>Objetivos específicos</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{planTrabajo.objetivosEspecificos || '—'}</dd>
                    </dl>
                    {planTrabajo.actividades?.length > 0 && (
                      <div>
                        <strong style={{ display: 'block', marginBottom: 8 }}>Actividades</strong>
                        <table className="postulants-table" style={{ minWidth: 400 }}>
                          <thead><tr><th>Fecha</th><th>Tema</th><th>Estrategias y actividades</th></tr></thead>
                          <tbody>
                            {planTrabajo.actividades.map((a, i) => (
                              <tr key={i}>
                                <td>{a.fecha ? new Date(a.fecha).toLocaleDateString('es-CO') : '—'}</td>
                                <td>{a.tema || '—'}</td>
                                <td style={{ whiteSpace: 'pre-wrap' }}>{a.estrategiasMetodologias || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
