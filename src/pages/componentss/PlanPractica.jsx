import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import PdfPreviewModal from '../../components/ui/PdfPreviewModal';
import '../styles/Oportunidades.css';
import './PlanDeTrabajoEstudiante.css';

const ESTADO_LABEL = {
  borrador: 'Borrador',
  pendiente_firmas: 'Pendiente de firmas',
  pendiente_revision: 'En revisión (coordinación)',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  en_ajuste: 'En ajuste',
};

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
function isValidPostulacionId(id) {
  return typeof id === 'string' && OBJECT_ID_REGEX.test(id);
}

function puedeEditar(plan) {
  const e = plan?.estado;
  return e === 'borrador' || e === 'rechazado' || e === 'en_ajuste';
}

export default function PlanPractica({ onVolver }) {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const postulacionId = pathSegments[pathSegments.length - 1];
  const { user, hasPermission } = useAuth();

  const moduloRaw = user?.modulo != null ? String(user.modulo).trim().toLowerCase() : '';
  const isEstudiante = moduloRaw === 'estudiante' || moduloRaw === '';
  const isLeader = String(user?.role || '').toLowerCase() === 'leader' || moduloRaw === 'leader';
  const canCoordinacion =
    !isEstudiante &&
    (hasPermission('CLPA') || isLeader || ['admin', 'superadmin'].includes(String(user?.role || '').toLowerCase()));

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [datosPrecargados, setDatosPrecargados] = useState(null);
  const [yaExiste, setYaExiste] = useState(false);
  const [error, setError] = useState(null);
  const [creando, setCreando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [firmando, setFirmando] = useState(null);
  const [previewPlan, setPreviewPlan] = useState({ open: false, url: null, title: '' });
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    modoPlan: 'formato_ur',
    justificacion: '',
    objetivoGeneral: '',
    objetivosEspecificos: '',
    objetivoFormativoTexto: '',
    actividades: [{ fecha: '', tema: '', estrategiasMetodologias: '' }],
    seguimientosPlan: [{ fecha: '', tema: '', descripcion: '' }],
    ponderacion: [{ concepto: '', porcentaje: '' }],
  });

  const base = `/legalizaciones-practica/plan-practica`;

  const syncFormFromPlan = (p) => {
    if (!p) return;
    setForm({
      modoPlan: p.modoPlan === 'documento_externo' ? 'documento_externo' : 'formato_ur',
      justificacion: p.justificacion ?? '',
      objetivoGeneral: p.objetivoGeneral ?? '',
      objetivosEspecificos: p.objetivosEspecificos ?? '',
      objetivoFormativoTexto: p.objetivoFormativoTexto ?? '',
      actividades:
        Array.isArray(p.actividades) && p.actividades.length > 0
          ? p.actividades.map((a) => ({
              fecha: a.fecha ? new Date(a.fecha).toISOString().slice(0, 10) : '',
              tema: a.tema ?? '',
              estrategiasMetodologias: a.estrategiasMetodologias ?? '',
            }))
          : [{ fecha: '', tema: '', estrategiasMetodologias: '' }],
      seguimientosPlan:
        Array.isArray(p.seguimientosPlan) && p.seguimientosPlan.length > 0
          ? p.seguimientosPlan.map((s) => ({
              fecha: s.fecha ? new Date(s.fecha).toISOString().slice(0, 10) : '',
              tema: s.tema ?? '',
              descripcion: s.descripcion ?? '',
            }))
          : [{ fecha: '', tema: '', descripcion: '' }],
      ponderacion:
        Array.isArray(p.ponderacion) && p.ponderacion.length > 0
          ? p.ponderacion.map((x) => ({ concepto: x.concepto ?? '', porcentaje: x.porcentaje != null ? String(x.porcentaje) : '' }))
          : [{ concepto: '', porcentaje: '' }],
    });
  };

  const load = () => {
    if (!postulacionId || !isValidPostulacionId(postulacionId)) {
      setLoading(false);
      setError('URL inválida. Use el acceso desde legalizaciones de prácticas.');
      return;
    }
    setLoading(true);
    setError(null);
    const req = isEstudiante
      ? api.get(`${base}/datos-crear/${postulacionId}`)
      : api.get(`${base}/${postulacionId}`);

    req
      .then((r) => {
        setDatosPrecargados(r.data?.datosPrecargados || null);
        if (r.data?.plan) {
          setPlan(r.data.plan);
          setYaExiste(true);
          syncFormFromPlan(r.data.plan);
        } else {
          setYaExiste(!!r.data?.yaExiste);
          setPlan(null);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Error al cargar');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postulacionId, isEstudiante]);

  const sumPonderacion = useMemo(() => {
    return form.ponderacion.reduce((acc, p) => acc + (parseFloat(String(p.porcentaje), 10) || 0), 0);
  }, [form.ponderacion]);

  const handleCrear = () => {
    setCreando(true);
    api
      .post(`${base}/${postulacionId}`)
      .then((r) => {
        setPlan(r.data?.plan);
        setYaExiste(true);
        syncFormFromPlan(r.data.plan);
        Swal.fire({
          icon: 'success',
          title: 'Creado',
          text: 'Plan de práctica creado. Complete los campos y envíelo a firmas.',
          confirmButtonColor: '#c41e3a',
        });
      })
      .catch((e) =>
        Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo crear.', confirmButtonColor: '#c41e3a' })
      )
      .finally(() => setCreando(false));
  };

  const handleGuardar = () => {
    setSaving(true);
    const actividades = form.actividades
      .filter((a) => a.fecha || a.tema || a.estrategiasMetodologias)
      .map((a) => ({
        fecha: a.fecha ? new Date(a.fecha) : new Date(),
        tema: a.tema || '',
        estrategiasMetodologias: a.estrategiasMetodologias || '',
      }));
    if (actividades.length === 0) actividades.push({ fecha: new Date(), tema: '', estrategiasMetodologias: '' });

    const seguimientosPlan = form.seguimientosPlan
      .filter((s) => s.fecha || s.tema || s.descripcion)
      .map((s) => ({
        fecha: s.fecha ? new Date(s.fecha) : new Date(),
        tema: s.tema || '',
        descripcion: s.descripcion || '',
      }));

    const ponderacion = form.ponderacion
      .filter((p) => p.concepto || p.porcentaje !== '')
      .map((p) => ({
        concepto: p.concepto || '',
        porcentaje: Math.min(100, Math.max(0, parseFloat(p.porcentaje, 10) || 0)),
      }));

    api
      .put(`${base}/${postulacionId}`, {
        modoPlan: form.modoPlan,
        justificacion: form.justificacion,
        objetivoGeneral: form.objetivoGeneral,
        objetivosEspecificos: form.objetivosEspecificos,
        objetivoFormativoTexto: form.objetivoFormativoTexto,
        actividades,
        seguimientosPlan,
        ponderacion,
      })
      .then((r) => {
        setPlan(r.data?.plan);
        Swal.fire({ icon: 'success', title: 'Guardado', text: 'Plan actualizado.', confirmButtonColor: '#c41e3a' });
      })
      .catch((e) =>
        Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo guardar.', confirmButtonColor: '#c41e3a' })
      )
      .finally(() => setSaving(false));
  };

  const handleEnviarFirmas = () => {
    if (form.modoPlan === 'formato_ur') {
      const vacios = !form.justificacion?.trim() || !form.objetivoGeneral?.trim() || !form.objetivosEspecificos?.trim();
      if (vacios) {
        Swal.fire({
          icon: 'warning',
          title: 'Complete los campos',
          text: 'Justificación, objetivo general y objetivos específicos son obligatorios.',
          confirmButtonColor: '#c41e3a',
        });
        return;
      }
    }
    if (sumPonderacion > 100) {
      Swal.fire({ icon: 'warning', title: 'Ponderación', text: 'La suma no puede superar 100%.', confirmButtonColor: '#c41e3a' });
      return;
    }
    setEnviando(true);
    api
      .post(`${base}/${postulacionId}/enviar-firmas`)
      .then((r) => {
        setPlan(r.data?.plan);
        const adv = r.data?.plan?.advertenciaPonderacion;
        Swal.fire({
          icon: 'success',
          title: 'Enviado a firmas',
          text: adv ? `${adv} Deben firmar estudiante, monitor (líder de práctica) y tutor en escenario.` : 'Deben firmar estudiante, monitor y tutor.',
          confirmButtonColor: '#c41e3a',
        });
      })
      .catch((e) =>
        Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo enviar.', confirmButtonColor: '#c41e3a' })
      )
      .finally(() => setEnviando(false));
  };

  const handleFirma = (rol) => {
    setFirmando(rol);
    api
      .post(`${base}/${postulacionId}/firmar`, { rol })
      .then((r) => {
        setPlan(r.data?.plan);
        Swal.fire({ icon: 'success', title: 'Firma registrada', confirmButtonColor: '#c41e3a' });
      })
      .catch((e) =>
        Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo registrar.', confirmButtonColor: '#c41e3a' })
      )
      .finally(() => setFirmando(null));
  };

  const handleAprobar = () => {
    api
      .post(`${base}/${postulacionId}/aprobar`)
      .then((r) => {
        setPlan(r.data?.plan);
        Swal.fire({ icon: 'success', title: 'Plan aprobado', confirmButtonColor: '#c41e3a' });
      })
      .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message }));
  };

  const handleRechazar = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Rechazar plan',
      html:
        '<textarea id="sw-motivo" class="swal2-textarea" placeholder="Motivo" rows="3" style="width:100%"></textarea><br/><label><input type="checkbox" id="sw-ajuste" /> Enviar a ajuste (el estudiante podrá corregir)</label>',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      confirmButtonColor: '#c41e3a',
      preConfirm: () => ({
        motivo: document.getElementById('sw-motivo')?.value || '',
        enviarAjuste: document.getElementById('sw-ajuste')?.checked,
      }),
    });
    if (!formValues) return;
    api
      .post(`${base}/${postulacionId}/rechazar`, { motivo: formValues.motivo, enviarAjuste: formValues.enviarAjuste })
      .then((r) => {
        setPlan(r.data?.plan);
        Swal.fire({ icon: 'success', title: 'Listo', text: r.data?.message, confirmButtonColor: '#c41e3a' });
      })
      .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message }));
  };

  const handleUploadExterno = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      Swal.fire({ icon: 'warning', title: 'PDF', text: 'Solo PDF.', confirmButtonColor: '#c41e3a' });
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    api
      .post(`${base}/${postulacionId}/documento-externo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => {
        setPlan(r.data?.plan);
        Swal.fire({ icon: 'success', title: 'Cargado', confirmButtonColor: '#c41e3a' });
      })
      .catch((err) => Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message }))
      .finally(() => setUploading(false));
    e.target.value = '';
  };

  const verExterno = () => {
    api.get(`${base}/${postulacionId}/documento-externo/url`).then((r) => {
      const url = r.data?.url;
      if (url) setPreviewPlan({ open: true, url, title: 'Documento plan de práctica' });
    });
  };

  const addActividad = () => {
    setForm((f) => ({ ...f, actividades: [...f.actividades, { fecha: '', tema: '', estrategiasMetodologias: '' }] }));
  };
  const removeActividad = (index) => {
    setForm((f) => ({ ...f, actividades: f.actividades.filter((_, i) => i !== index) }));
  };
  const updateActividad = (index, field, value) => {
    setForm((f) => ({
      ...f,
      actividades: f.actividades.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
    }));
  };

  const addSeg = () => {
    setForm((f) => ({ ...f, seguimientosPlan: [...f.seguimientosPlan, { fecha: '', tema: '', descripcion: '' }] }));
  };
  const removeSeg = (index) => {
    setForm((f) => ({ ...f, seguimientosPlan: f.seguimientosPlan.filter((_, i) => i !== index) }));
  };
  const updateSeg = (index, field, value) => {
    setForm((f) => ({
      ...f,
      seguimientosPlan: f.seguimientosPlan.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
    }));
  };

  const addPond = () => {
    setForm((f) => ({ ...f, ponderacion: [...f.ponderacion, { concepto: '', porcentaje: '' }] }));
  };
  const removePond = (index) => {
    setForm((f) => ({ ...f, ponderacion: f.ponderacion.filter((_, i) => i !== index) }));
  };
  const updatePond = (index, field, value) => {
    setForm((f) => ({
      ...f,
      ponderacion: f.ponderacion.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
    }));
  };

  const getPlanHtml = () => {
    if (!plan) return '';
    const datos = datosPrecargados || plan;
    const act = (plan.actividades || []).map((a) => ({
      fecha: a.fecha ? new Date(a.fecha).toLocaleDateString('es-CO') : '—',
      tema: (a.tema || '—').replace(/</g, '&lt;'),
      estrategiasMetodologias: (a.estrategiasMetodologias || '—').replace(/</g, '&lt;').replace(/\n/g, '<br>'),
    }));
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Plan de práctica</title>
<style>body{font-family:Arial,sans-serif;font-size:12px;padding:24px;color:#111;max-width:800px;margin:0 auto}h1{font-size:18px;color:#c41e3a;border-bottom:2px solid #c41e3a;padding-bottom:8px}h2{font-size:14px;margin-top:20px;color:#374151}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}th{background:#f3f4f6;font-weight:600}.grid{display:grid;grid-template-columns:180px 1fr;gap:6px 16px;margin-top:8px}.grid dt{margin:0;color:#6b7280}.grid dd{margin:0}</style></head><body>
<h1>Plan de práctica</h1>
<dl class="grid">
<dt>Facultad</dt><dd>${(datos.facultad || '—').replace(/</g, '&lt;')}</dd>
<dt>Programa</dt><dd>${(datos.programa || '—').replace(/</g, '&lt;')}</dd>
<dt>Empresa</dt><dd>${(datos.empresaNombre || '—').replace(/</g, '&lt;')}</dd>
<dt>Periodo</dt><dd>${(datos.periodo || '—').replace(/</g, '&lt;')}</dd>
<dt>Práctica</dt><dd>${(datos.nombreCargo || '—').replace(/</g, '&lt;')}</dd>
</dl>
<h2>Justificación</h2><div>${(plan.justificacion || '—').replace(/\n/g, '<br>').replace(/</g, '&lt;')}</div>
<h2>Objetivo general</h2><div>${(plan.objetivoGeneral || '—').replace(/\n/g, '<br>').replace(/</g, '&lt;')}</div>
<h2>Objetivos específicos</h2><div>${(plan.objetivosEspecificos || '—').replace(/\n/g, '<br>').replace(/</g, '&lt;')}</div>
<h2>Actividades</h2>
<table><thead><tr><th>Fecha</th><th>Tema</th><th>Estrategias y actividades</th></tr></thead><tbody>
${act.length ? act.map((a) => `<tr><td>${a.fecha}</td><td>${a.tema}</td><td>${a.estrategiasMetodologias}</td></tr>`).join('') : '<tr><td colspan="3">—</td></tr>'}
</tbody></table>
</body></html>`;
  };

  const descargarPDF = () => {
    const html = getPlanHtml();
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    setPreviewPlan({ open: true, url, title: 'Plan de práctica' });
  };

  const closePreviewPlan = () => {
    if (previewPlan.url) URL.revokeObjectURL(previewPlan.url);
    setPreviewPlan({ open: false, url: null, title: '' });
  };

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
        <div className="dashboard-welcome">
          <p style={{ color: '#c41e3a' }}>{error}</p>
          <button type="button" className="btn-secondary" onClick={onVolver}>
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!isEstudiante && !canCoordinacion) {
    return (
      <div className="dashboard-content">
        <div className="dashboard-welcome">
          <p>No tiene permiso para esta vista.</p>
          <button type="button" className="btn-secondary" onClick={onVolver}>
            Volver
          </button>
        </div>
      </div>
    );
  }

  const puedeEditarPlan = plan && puedeEditar(plan) && isEstudiante;
  const modoVista = plan
    ? puedeEditarPlan
      ? form.modoPlan
      : plan.modoPlan === 'documento_externo'
        ? 'documento_externo'
        : 'formato_ur'
    : form.modoPlan;
  const datos = plan || datosPrecargados;

  return (
    <div className="dashboard-content legalizacion-mtm legalizacion-mtm--full plan-trabajo-mtm-vista planmtm-estudiante plan-practica-vista">
      <header className="legalizacion-mtm__topbar">
        <div className="legalizacion-mtm__topbar-left">
          <button type="button" className="legalizacion-mtm__back" onClick={onVolver}>
            ← Volver
          </button>
          <h2 className="legalizacion-mtm__title">Plan de práctica</h2>
        </div>
        <div className="legalizacion-mtm__topbar-actions">
          {plan?.estado && (
            <span
              className={`legalizacion-mtm__estado legalizacion-mtm__estado--${
                plan.estado === 'aprobado' ? 'ok' : plan.estado === 'rechazado' ? 'error' : 'revision'
              }`}
            >
              Estado: {ESTADO_LABEL[plan.estado] ?? plan.estado}
            </span>
          )}
          {!yaExiste && datosPrecargados && isEstudiante && (
            <button type="button" className="btn-guardar" onClick={handleCrear} disabled={creando}>
              {creando ? 'Creando...' : 'Crear plan de práctica'}
            </button>
          )}
          {puedeEditarPlan && (
            <>
              <button type="button" className="legalizacion-mtm__btn legalizacion-mtm__btn--secondary" onClick={handleGuardar} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" className="legalizacion-mtm__btn legalizacion-mtm__btn--primary" onClick={handleEnviarFirmas} disabled={enviando}>
                {enviando ? 'Enviando...' : 'Enviar a firmas'}
              </button>
            </>
          )}
          {plan && modoVista === 'formato_ur' && datos && (
            <button type="button" className="btn-secondary" onClick={descargarPDF}>
              Vista previa / imprimir
            </button>
          )}
        </div>
      </header>

      {plan?.advertenciaPonderacion && (
        <p className="legalizacion-mtm__estado legalizacion-mtm__estado--revision" style={{ marginBottom: 8 }}>
          {plan.advertenciaPonderacion}
        </p>
      )}

      {plan?.estado === 'rechazado' && plan.rechazoMotivo && (
        <p className="legalizacion-mtm__estado legalizacion-mtm__estado--error" style={{ marginBottom: 12 }}>
          Motivo: {plan.rechazoMotivo}
        </p>
      )}

      {!yaExiste && datosPrecargados && isEstudiante && (
        <div className="planmtm-est__banner" role="status">
          <p>La legalización está aprobada y los documentos obligatorios fueron aceptados. Cree el plan de práctica para continuar.</p>
        </div>
      )}

      {plan?.estado === 'pendiente_firmas' && (
        <section className="legalizacion-mtm__section" style={{ marginTop: 12 }}>
          <h3 className="legalizacion-mtm__section-title">Firmas</h3>
          <p className="legalizacion-mtm__hint">
            Estudiante: {plan.emailsFirma?.estudiante || '—'} — Monitor: {plan.emailsFirma?.monitor || '—'} — Tutor: {plan.emailsFirma?.tutor || '—'}
          </p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {['estudiante', 'monitor', 'tutor'].map((rol) => (
              <li key={rol} style={{ marginBottom: 8 }}>
                <strong>{rol}</strong>: {plan.firmas?.[rol]?.estado === 'aprobado' ? 'Firmado' : 'Pendiente'}
                {plan.firmas?.[rol]?.estado !== 'aprobado' && (isEstudiante && rol === 'estudiante' ? (
                  <button type="button" className="btn-secondary" style={{ marginLeft: 8 }} disabled={firmando} onClick={() => handleFirma(rol)}>
                    {firmando === rol ? '…' : 'Registrar mi firma'}
                  </button>
                ) : null)}
                {plan.firmas?.[rol]?.estado !== 'aprobado' && canCoordinacion && rol !== 'estudiante' ? (
                  <button type="button" className="btn-secondary" style={{ marginLeft: 8 }} disabled={!!firmando} onClick={() => handleFirma(rol)}>
                    {firmando === rol ? '…' : `Registrar firma (${rol})`}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan?.estado === 'pendiente_revision' && canCoordinacion && (
        <section className="legalizacion-mtm__section" style={{ marginTop: 12 }}>
          <h3 className="legalizacion-mtm__section-title">Revisión coordinación</h3>
          <button type="button" className="btn-guardar" style={{ marginRight: 8 }} onClick={handleAprobar}>
            Aprobar plan
          </button>
          <button type="button" className="btn-secondary" onClick={handleRechazar}>
            Rechazar / ajuste
          </button>
        </section>
      )}

      {datos && (
        <div className="legalizacion-mtm__body plan-practica__body">
          <section className="legalizacion-mtm__section plan-practica__panel plan-practica__panel--datos">
            <h3 className="legalizacion-mtm__section-title">Datos de la práctica</h3>
            <dl className="legalizacion-mtm__grid">
              <dt>Facultad</dt>
              <dd>{datos.facultad || '—'}</dd>
              <dt>Programa</dt>
              <dd>{datos.programa || '—'}</dd>
              <dt>Empresa</dt>
              <dd>{datos.empresaNombre || '—'}</dd>
              <dt>Periodo</dt>
              <dd>{datos.periodo || '—'}</dd>
              <dt>Práctica (cargo)</dt>
              <dd>{datos.nombreCargo || '—'}</dd>
              <dt>Estudiante</dt>
              <dd>{datos.estudianteNombre || '—'}</dd>
              <dt>Monitor (líder práctica)</dt>
              <dd>{datos.monitorNombre || '—'}</dd>
              <dt>Tutor en escenario</dt>
              <dd>{datos.tutorNombres || '—'}</dd>
            </dl>
          </section>

          {plan && puedeEditarPlan && isEstudiante && (
            <section className="legalizacion-mtm__section">
              <h3 className="legalizacion-mtm__section-title">Modalidad del plan</h3>
              <label className="legalizacion-mtm__hint" style={{ display: 'block', marginBottom: 8 }}>
                <input
                  type="radio"
                  name="modo"
                  checked={form.modoPlan === 'formato_ur'}
                  onChange={() => setForm((f) => ({ ...f, modoPlan: 'formato_ur' }))}
                  disabled={!puedeEditarPlan}
                />{' '}
                Formato UR (diligenciar en el sistema)
              </label>
              <label className="legalizacion-mtm__hint" style={{ display: 'block' }}>
                <input
                  type="radio"
                  name="modo"
                  checked={form.modoPlan === 'documento_externo'}
                  onChange={() => setForm((f) => ({ ...f, modoPlan: 'documento_externo' }))}
                  disabled={!puedeEditarPlan}
                />{' '}
                Documento externo (PDF)
              </label>
            </section>
          )}

          {plan && modoVista === 'documento_externo' && puedeEditarPlan && (
            <section className="legalizacion-mtm__section">
              <h3 className="legalizacion-mtm__section-title">Cargue el PDF</h3>
              <input type="file" accept="application/pdf" onChange={handleUploadExterno} disabled={uploading} />
              {uploading && <span> Subiendo…</span>}
              {plan?.documentoExterno?.key && (
                <button type="button" className="btn-secondary" style={{ marginLeft: 8 }} onClick={verExterno}>
                  Ver documento
                </button>
              )}
            </section>
          )}

          {plan && modoVista === 'documento_externo' && !puedeEditarPlan && plan?.documentoExterno?.key && (
            <section className="legalizacion-mtm__section">
              <h3 className="legalizacion-mtm__section-title">Documento del plan</h3>
              <button type="button" className="btn-secondary" onClick={verExterno}>
                Ver PDF
              </button>
            </section>
          )}

          {plan && modoVista === 'formato_ur' && (
            <div className="plan-practica__formato">
              <div className="plan-practica__grid-2">
                <section className="legalizacion-mtm__section plan-practica__panel">
                  <h3 className="legalizacion-mtm__section-title">Objetivo formativo (texto libre)</h3>
                  <textarea
                    className="form-textarea plan-practica__textarea-tall"
                    rows={5}
                    value={form.objetivoFormativoTexto}
                    onChange={(e) => setForm((f) => ({ ...f, objetivoFormativoTexto: e.target.value }))}
                    disabled={!puedeEditarPlan}
                    placeholder="Opcional: objetivo formativo"
                  />
                </section>
                <section className="legalizacion-mtm__section plan-practica__panel">
                  <h3 className="legalizacion-mtm__section-title">Justificación</h3>
                  <textarea
                    className="form-textarea plan-practica__textarea-tall"
                    rows={5}
                    value={form.justificacion}
                    onChange={(e) => setForm((f) => ({ ...f, justificacion: e.target.value }))}
                    disabled={!puedeEditarPlan}
                    placeholder="Describa la justificación del plan"
                  />
                </section>
              </div>
              <div className="plan-practica__grid-2">
                <section className="legalizacion-mtm__section plan-practica__panel">
                  <h3 className="legalizacion-mtm__section-title">Objetivo general</h3>
                  <textarea
                    className="form-textarea plan-practica__textarea-tall"
                    rows={5}
                    value={form.objetivoGeneral}
                    onChange={(e) => setForm((f) => ({ ...f, objetivoGeneral: e.target.value }))}
                    disabled={!puedeEditarPlan}
                    placeholder="Objetivo general de la práctica"
                  />
                </section>
                <section className="legalizacion-mtm__section plan-practica__panel">
                  <h3 className="legalizacion-mtm__section-title">Objetivos específicos</h3>
                  <textarea
                    className="form-textarea plan-practica__textarea-tall"
                    rows={5}
                    value={form.objetivosEspecificos}
                    onChange={(e) => setForm((f) => ({ ...f, objetivosEspecificos: e.target.value }))}
                    disabled={!puedeEditarPlan}
                    placeholder="Liste los objetivos específicos"
                  />
                </section>
              </div>

              <section className="legalizacion-mtm__section plan-practica__panel plan-practica__panel--wide">
                <h3 className="legalizacion-mtm__section-title">Ponderación de evaluación</h3>
                <p className={`plan-practica__ponderacion-hint ${sumPonderacion > 100 || (puedeEditarPlan && sumPonderacion > 0 && sumPonderacion < 99.5) ? 'plan-practica__ponderacion-hint--warn' : ''}`}>
                  La suma debe ser <strong>100%</strong>. Actual: <strong>{sumPonderacion.toFixed(1)}%</strong>
                </p>
                <div className="plan-practica__table-shell">
                <table className="postulants-table plan-practica__table">
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>%</th>
                      {puedeEditarPlan && <th />}
                    </tr>
                  </thead>
                  <tbody>
                    {form.ponderacion.map((p, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            className="form-input"
                            value={p.concepto}
                            onChange={(e) => updatePond(idx, 'concepto', e.target.value)}
                            disabled={!puedeEditarPlan}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            min={0}
                            max={100}
                            value={p.porcentaje}
                            onChange={(e) => updatePond(idx, 'porcentaje', e.target.value)}
                            disabled={!puedeEditarPlan}
                            style={{ width: 80 }}
                          />
                        </td>
                        {puedeEditarPlan && (
                          <td>
                            <button type="button" className="btn-secondary" onClick={() => removePond(idx)}>
                              Quitar
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {puedeEditarPlan && (
                  <button type="button" className="btn-secondary plan-practica__btn-add" onClick={addPond}>
                    + Fila
                  </button>
                )}
                </div>
              </section>

              <section className="legalizacion-mtm__section plan-practica__panel plan-practica__panel--wide">
                <h3 className="legalizacion-mtm__section-title">Actividades</h3>
                <div className="planmtm-est__actividades-table-wrap">
                  <table className="postulants-table planmtm-est__actividades-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tema</th>
                        <th>Estrategias y actividades</th>
                        {puedeEditarPlan && <th />}
                      </tr>
                    </thead>
                    <tbody>
                      {form.actividades.map((a, idx) => (
                        <tr key={idx}>
                          <td>
                            <input
                              type="date"
                              className="form-input"
                              value={a.fecha}
                              onChange={(e) => updateActividad(idx, 'fecha', e.target.value)}
                              disabled={!puedeEditarPlan}
                            />
                          </td>
                          <td>
                            <input
                              className="form-input"
                              value={a.tema}
                              onChange={(e) => updateActividad(idx, 'tema', e.target.value)}
                              disabled={!puedeEditarPlan}
                            />
                          </td>
                          <td>
                            <input
                              className="form-input"
                              value={a.estrategiasMetodologias}
                              onChange={(e) => updateActividad(idx, 'estrategiasMetodologias', e.target.value)}
                              disabled={!puedeEditarPlan}
                            />
                          </td>
                          {puedeEditarPlan && (
                            <td>
                              <button type="button" className="btn-secondary" onClick={() => removeActividad(idx)} disabled={form.actividades.length <= 1}>
                                Quitar
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {puedeEditarPlan && (
                  <button type="button" className="btn-secondary plan-practica__btn-add" onClick={addActividad}>
                    + Actividad
                  </button>
                )}
              </section>

              <section className="legalizacion-mtm__section plan-practica__panel plan-practica__panel--wide">
                <h3 className="legalizacion-mtm__section-title">Seguimientos previstos</h3>
                <div className="plan-practica__table-shell">
                <table className="postulants-table plan-practica__table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tema / hito</th>
                      <th>Descripción</th>
                      {puedeEditarPlan && <th />}
                    </tr>
                  </thead>
                  <tbody>
                    {form.seguimientosPlan.map((s, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="date"
                            className="form-input"
                            value={s.fecha}
                            onChange={(e) => updateSeg(idx, 'fecha', e.target.value)}
                            disabled={!puedeEditarPlan}
                          />
                        </td>
                        <td>
                          <input className="form-input" value={s.tema} onChange={(e) => updateSeg(idx, 'tema', e.target.value)} disabled={!puedeEditarPlan} />
                        </td>
                        <td>
                          <input
                            className="form-input"
                            value={s.descripcion}
                            onChange={(e) => updateSeg(idx, 'descripcion', e.target.value)}
                            disabled={!puedeEditarPlan}
                          />
                        </td>
                        {puedeEditarPlan && (
                          <td>
                            <button type="button" className="btn-secondary" onClick={() => removeSeg(idx)}>
                              Quitar
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {puedeEditarPlan && (
                  <button type="button" className="btn-secondary plan-practica__btn-add" onClick={addSeg}>
                    + Seguimiento
                  </button>
                )}
                </div>
              </section>
            </div>
          )}
        </div>
      )}

      {plan?.estado === 'aprobado' && (
        <div className="legalizacion-mtm__estado legalizacion-mtm__estado--ok planmtm-est__footer-msg">Plan de práctica aprobado por coordinación.</div>
      )}

      <PdfPreviewModal open={previewPlan.open} onClose={closePreviewPlan} title={previewPlan.title} url={previewPlan.url} showPrintButton />
    </div>
  );
}
