import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../styles/Oportunidades.css';

const ESTADO_LABEL = {
  borrador: 'Borrador',
  enviado_revision: 'Enviado a revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
function isValidPostulacionId(id) {
  return typeof id === 'string' && OBJECT_ID_REGEX.test(id);
}

export default function PlanDeTrabajoMTM({ onVolver }) {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const postulacionId = pathSegments[pathSegments.length - 1];

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [datosPrecargados, setDatosPrecargados] = useState(null);
  const [yaExiste, setYaExiste] = useState(false);
  const [error, setError] = useState(null);
  const [creando, setCreando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [form, setForm] = useState({
    justificacion: '',
    objetivoGeneral: '',
    objetivosEspecificos: '',
    actividades: [{ fecha: '', tema: '', estrategiasMetodologias: '' }],
  });

  useEffect(() => {
    if (!postulacionId) {
      setLoading(false);
      setError('No se especificó la postulación.');
      return;
    }
    if (!isValidPostulacionId(postulacionId)) {
      setLoading(false);
      setError('URL inválida. Use el botón "Plan de trabajo" desde el listado de legalizaciones.');
      return;
    }
    setLoading(true);
    setError(null);
    api.get(`/oportunidades-mtm/plan-trabajo/datos-crear/${postulacionId}`)
      .then((r) => {
        setDatosPrecargados(r.data?.datosPrecargados || null);
        setYaExiste(!!r.data?.yaExiste);
        if (r.data?.plan) {
          setPlan(r.data.plan);
          setForm({
            justificacion: r.data.plan.justificacion ?? '',
            objetivoGeneral: r.data.plan.objetivoGeneral ?? '',
            objetivosEspecificos: r.data.plan.objetivosEspecificos ?? '',
            actividades: Array.isArray(r.data.plan.actividades) && r.data.plan.actividades.length > 0
              ? r.data.plan.actividades.map((a) => ({
                  fecha: a.fecha ? new Date(a.fecha).toISOString().slice(0, 10) : '',
                  tema: a.tema ?? '',
                  estrategiasMetodologias: a.estrategiasMetodologias ?? '',
                }))
              : [{ fecha: '', tema: '', estrategiasMetodologias: '' }],
          });
        }
      })
      .catch((err) => {
        if (err.response?.status === 404 && err.response?.data?.message?.includes('Plan de trabajo no encontrado')) {
          setPlan(null);
          setYaExiste(false);
          setError(null);
          api.get(`/oportunidades-mtm/plan-trabajo/datos-crear/${postulacionId}`)
            .then((r2) => {
              setDatosPrecargados(r2.data?.datosPrecargados || null);
              setYaExiste(!!r2.data?.yaExiste);
              if (r2.data?.plan) setPlan(r2.data.plan);
            })
            .catch(() => setError('No se pudo cargar. Verifique que la legalización esté aprobada.'));
          return;
        }
        setError(err.response?.data?.message || 'Error al cargar');
      })
      .finally(() => setLoading(false));
  }, [postulacionId]);

  const handleCrear = () => {
    setCreando(true);
    api.post(`/oportunidades-mtm/plan-trabajo/${postulacionId}`)
      .then((r) => {
        setPlan(r.data?.plan);
        setYaExiste(true);
        setForm({
          justificacion: r.data.plan.justificacion ?? '',
          objetivoGeneral: r.data.plan.objetivoGeneral ?? '',
          objetivosEspecificos: r.data.plan.objetivosEspecificos ?? '',
          actividades: Array.isArray(r.data.plan.actividades) && r.data.plan.actividades.length > 0
            ? r.data.plan.actividades.map((a) => ({
                fecha: a.fecha ? new Date(a.fecha).toISOString().slice(0, 10) : '',
                tema: a.tema ?? '',
                estrategiasMetodologias: a.estrategiasMetodologias ?? '',
              }))
            : [{ fecha: '', tema: '', estrategiasMetodologias: '' }],
        });
        Swal.fire({ icon: 'success', title: 'Creado', text: 'Plan de trabajo creado. Complete los campos y envíelo a revisión.', confirmButtonColor: '#c41e3a' });
      })
      .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo crear.', confirmButtonColor: '#c41e3a' }))
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
    api.put(`/oportunidades-mtm/plan-trabajo/${postulacionId}`, {
      justificacion: form.justificacion,
      objetivoGeneral: form.objetivoGeneral,
      objetivosEspecificos: form.objetivosEspecificos,
      actividades,
    })
      .then((r) => {
        setPlan(r.data?.plan);
        Swal.fire({ icon: 'success', title: 'Guardado', text: 'Plan actualizado.', confirmButtonColor: '#c41e3a' });
      })
      .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo guardar.', confirmButtonColor: '#c41e3a' }))
      .finally(() => setSaving(false));
  };

  const handleEnviarRevision = () => {
    const vacios = !form.justificacion?.trim() || !form.objetivoGeneral?.trim() || !form.objetivosEspecificos?.trim();
    if (vacios) {
      Swal.fire({ icon: 'warning', title: 'Complete los campos', text: 'Justificación, objetivo general y objetivos específicos son obligatorios.', confirmButtonColor: '#c41e3a' });
      return;
    }
    setEnviando(true);
    api.post(`/oportunidades-mtm/plan-trabajo/${postulacionId}/enviar-revision`)
      .then((r) => {
        setPlan(r.data?.plan);
        Swal.fire({ icon: 'success', title: 'Enviado', text: 'El plan fue enviado a revisión del profesor.', confirmButtonColor: '#c41e3a' });
      })
      .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo enviar.', confirmButtonColor: '#c41e3a' }))
      .finally(() => setEnviando(false));
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

  const puedeEditar = plan && (plan.estado === 'borrador' || plan.estado === 'rechazado');

  const descargarPDF = () => {
    if (!plan || !datos) return;
    const act = (plan.actividades || []).map((a) => ({
      fecha: a.fecha ? new Date(a.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—',
      tema: a.tema || '—',
      estrategiasMetodologias: a.estrategiasMetodologias || '—',
    }));
    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Plan de trabajo MTM</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; padding: 24px; color: #111; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 18px; color: #c41e3a; border-bottom: 2px solid #c41e3a; padding-bottom: 8px; }
  h2 { font-size: 14px; margin-top: 20px; color: #374151; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  .grid { display: grid; grid-template-columns: 180px 1fr; gap: 6px 16px; margin-top: 8px; }
  .grid dt { margin: 0; color: #6b7280; }
  .grid dd { margin: 0; }
  .bloque { margin-top: 12px; }
  @media print { body { padding: 12px; } }
</style></head><body>
  <h1>Plan de trabajo — Monitoría académica</h1>
  <h2>Datos básicos de la MTM</h2>
  <dl class="grid">
    <dt>Facultad</dt><dd>${(datos.facultad || '—').replace(/</g, '&lt;')}</dd>
    <dt>Programa</dt><dd>${(datos.programa || '—').replace(/</g, '&lt;')}</dd>
    <dt>Asignatura / Área</dt><dd>${(datos.asignaturaArea || '—').replace(/</g, '&lt;')}</dd>
    <dt>Periodo</dt><dd>${(datos.periodo || '—').replace(/</g, '&lt;')}</dd>
    <dt>Profesor / Responsable</dt><dd>${(datos.profesorResponsable || '—').replace(/</g, '&lt;')}</dd>
    <dt>Código del monitor</dt><dd>${(datos.codigoMonitor || '—').replace(/</g, '&lt;')}</dd>
    <dt>Nombre del monitor</dt><dd>${(datos.nombreMonitor || '—').replace(/</g, '&lt;')}</dd>
    <dt>Teléfono</dt><dd>${(datos.telefono || '—').replace(/</g, '&lt;')}</dd>
    <dt>Correo institucional</dt><dd>${(datos.correoInstitucional || '—').replace(/</g, '&lt;')}</dd>
  </dl>
  <h2>Justificación de la monitoría académica</h2>
  <div class="bloque">${(plan.justificacion || '—').replace(/\n/g, '<br>').replace(/</g, '&lt;')}</div>
  <h2>Objetivo general</h2>
  <div class="bloque">${(plan.objetivoGeneral || '—').replace(/\n/g, '<br>').replace(/</g, '&lt;')}</div>
  <h2>Objetivos específicos</h2>
  <div class="bloque">${(plan.objetivosEspecificos || '—').replace(/\n/g, '<br>').replace(/</g, '&lt;')}</div>
  <h2>Actividades</h2>
  <table>
    <thead><tr><th>Fecha</th><th>Tema</th><th>Estrategias, metodologías y actividades</th></tr></thead>
    <tbody>
      ${act.length ? act.map((a) => `<tr><td>${a.fecha}</td><td>${(a.tema || '').replace(/</g, '&lt;')}</td><td>${(a.estrategiasMetodologias || '').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</td></tr>`).join('') : '<tr><td colspan="3">—</td></tr>'}
    </tbody>
  </table>
  <p style="margin-top: 24px; font-size: 11px; color: #6b7280;">Documento generado el ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.</p>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => { w.print(); }, 300);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="loading-container"><div className="loading-spinner" /><p>Cargando...</p></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="dashboard-content">
        <div className="dashboard-welcome">
          <p style={{ color: '#c41e3a' }}>{error}</p>
          <button type="button" className="btn-secondary" onClick={onVolver}>Volver</button>
        </div>
      </div>
    );
  }

  const datos = plan ? plan : datosPrecargados;

  return (
    <div className="dashboard-content legalizacion-mtm legalizacion-mtm--full plan-trabajo-mtm-vista" style={{ paddingBottom: 200 }}>
      <header className="legalizacion-mtm__topbar">
        <div className="legalizacion-mtm__topbar-left">
          <button type="button" className="legalizacion-mtm__back" onClick={onVolver}>← Volver</button>
          <h2 className="legalizacion-mtm__title">Plan de trabajo MTM</h2>
        </div>
        <div className="legalizacion-mtm__topbar-actions">
          {plan?.estado && (
            <span className={`legalizacion-mtm__estado legalizacion-mtm__estado--${plan.estado === 'aprobado' ? 'ok' : plan.estado === 'rechazado' ? 'error' : 'revision'}`}>
              Estado: {ESTADO_LABEL[plan.estado] ?? plan.estado}
            </span>
          )}
          {!yaExiste && datosPrecargados && (
            <button type="button" className="btn-guardar" onClick={handleCrear} disabled={creando}>
              {creando ? 'Creando...' : 'Crear plan de trabajo'}
            </button>
          )}
          {puedeEditar && (
            <>
              <button type="button" className="legalizacion-mtm__btn legalizacion-mtm__btn--secondary" onClick={handleGuardar} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" className="legalizacion-mtm__btn legalizacion-mtm__btn--primary" onClick={handleEnviarRevision} disabled={enviando}>
                {enviando ? 'Enviando...' : 'Enviar a revisión'}
              </button>
            </>
          )}
        </div>
      </header>

      {plan?.estado === 'rechazado' && plan.rechazoMotivo && (
        <p className="legalizacion-mtm__estado legalizacion-mtm__estado--error" style={{ marginBottom: 12 }}>
          Motivo de rechazo: {plan.rechazoMotivo}
        </p>
      )}

      {!yaExiste && datosPrecargados && (
        <div className="dashboard-welcome" style={{ marginBottom: 16 }}>
          <p>La legalización está aprobada. Cree el plan de trabajo para diligenciar justificación, objetivos y actividades.</p>
        </div>
      )}

      {datos && (
        <div className="legalizacion-mtm__body">
          <section className="legalizacion-mtm__section">
            <h3 className="legalizacion-mtm__section-title">Datos básicos de la MTM</h3>
            <dl className="legalizacion-mtm__grid">
              <dt>Facultad</dt><dd>{datos.facultad || '—'}</dd>
              <dt>Programa</dt><dd>{datos.programa || '—'}</dd>
              <dt>Asignatura / Área</dt><dd>{datos.asignaturaArea || '—'}</dd>
              <dt>Periodo</dt><dd>{datos.periodo || '—'}</dd>
              <dt>Profesor / Responsable</dt><dd>{datos.profesorResponsable || '—'}</dd>
              <dt>Código del monitor</dt><dd>{datos.codigoMonitor || '—'}</dd>
              <dt>Nombre del monitor</dt><dd>{datos.nombreMonitor || '—'}</dd>
              <dt>Teléfono</dt><dd>{datos.telefono || '—'}</dd>
              <dt>Correo institucional</dt><dd>{datos.correoInstitucional || '—'}</dd>
            </dl>
          </section>

          {yaExiste && (
            <>
              <section className="legalizacion-mtm__section">
                <h3 className="legalizacion-mtm__section-title">Justificación de la monitoría académica</h3>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={form.justificacion}
                  onChange={(e) => setForm((f) => ({ ...f, justificacion: e.target.value }))}
                  disabled={!puedeEditar}
                  placeholder="Justificación..."
                />
              </section>
              <section className="legalizacion-mtm__section">
                <h3 className="legalizacion-mtm__section-title">Objetivo general</h3>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={form.objetivoGeneral}
                  onChange={(e) => setForm((f) => ({ ...f, objetivoGeneral: e.target.value }))}
                  disabled={!puedeEditar}
                  placeholder="Objetivo general..."
                />
              </section>
              <section className="legalizacion-mtm__section">
                <h3 className="legalizacion-mtm__section-title">Objetivos específicos</h3>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={form.objetivosEspecificos}
                  onChange={(e) => setForm((f) => ({ ...f, objetivosEspecificos: e.target.value }))}
                  disabled={!puedeEditar}
                  placeholder="Objetivos específicos..."
                />
              </section>
              <section className="legalizacion-mtm__section">
                <h3 className="legalizacion-mtm__section-title">Actividades</h3>
                <p className="legalizacion-mtm__hint">Fecha, tema y estrategias/metodologías por actividad.</p>
                <div style={{ overflowX: 'auto' }}>
                  <table className="postulants-table" style={{ minWidth: 600 }}>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tema</th>
                        <th>Estrategias, metodologías y actividades</th>
                        {puedeEditar && <th></th>}
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
                              disabled={!puedeEditar}
                              style={{ width: '100%', minWidth: 130 }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-input"
                              value={a.tema}
                              onChange={(e) => updateActividad(idx, 'tema', e.target.value)}
                              disabled={!puedeEditar}
                              placeholder="Tema"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-input"
                              value={a.estrategiasMetodologias}
                              onChange={(e) => updateActividad(idx, 'estrategiasMetodologias', e.target.value)}
                              disabled={!puedeEditar}
                              placeholder="Estrategias y actividades"
                            />
                          </td>
                          {puedeEditar && (
                            <td>
                              <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => removeActividad(idx)} disabled={form.actividades.length <= 1}>
                                Quitar
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {puedeEditar && (
                  <button type="button" className="btn-secondary" style={{ marginTop: 8 }} onClick={addActividad}>
                    + Agregar actividad
                  </button>
                )}
                {/* Espaciador para que el footer no tape el botón Agregar actividad */}
                <div className="plan-trabajo-espacio-footer" style={{ minHeight: 180, display: 'block' }} aria-hidden="true" />
              </section>
            </>
          )}
        </div>
      )}

      {plan?.estado === 'aprobado' && (
        <div className="legalizacion-mtm__estado legalizacion-mtm__estado--ok" style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <span>Plan aprobado. Puede descargar el documento y acceder a seguimientos cuando estén habilitados.</span>
          <button type="button" className="btn-guardar" style={{ fontSize: 13 }} onClick={descargarPDF}>
            Descargar PDF
          </button>
        </div>
      )}
    </div>
  );
}
