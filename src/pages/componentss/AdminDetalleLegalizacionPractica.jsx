import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
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

export default function AdminDetalleLegalizacionPractica({ onVolver }) {
  const location = useLocation();
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
    setSavingDoc(definitionId);
    api
      .patch(`/legalizaciones-practica/admin/${postulacionId}/documentos/${definitionId}`, { estadoDocumento, motivoRechazo })
      .then((r) => setLegalizacion(r.data?.legalizacion))
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

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-CO') : '—');

  if (loading) {
    return (
      <div className="dashboard-content"><div className="loading-container"><div className="loading-spinner" /><p>Cargando...</p></div></div>
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
    <div className="dashboard-content legalizacion-mtm legalizacion-mtm--full admrevmtm">
      <header className="legalizacion-mtm__topbar">
        <div className="legalizacion-mtm__topbar-left">
          <button type="button" className="legalizacion-mtm__back" onClick={onVolver}>← Volver</button>
          <h2 className="legalizacion-mtm__title">Revisión — Legalización práctica</h2>
        </div>
        <div className="legalizacion-mtm__topbar-actions">
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
          <p style={{ fontSize: 14, color: '#475569', marginBottom: 12 }}>
            El estudiante genera el acuerdo y solo ve su enlace como practicante. Usted ve los tres enlaces para enviarlos al escenario de práctica y a quien firme por la universidad. Puede abrir el PDF archivado. Para aprobar el documento de acuerdo en Documentos, deben estar las tres firmas.
          </p>
          {legalizacion?.acuerdoTresFirmasCompletas ? (
            <p style={{ color: '#047857', fontWeight: 600, marginBottom: 8 }}>Las tres firmas del acuerdo están registradas.</p>
          ) : (
            <p style={{ color: '#b45309', marginBottom: 8 }}>Aún faltan firmas o el acuerdo no ha sido emitido.</p>
          )}
          {cargandoAcuerdo && <p style={{ color: '#64748b' }}>Cargando estado del acuerdo…</p>}
          {!cargandoAcuerdo && !acuerdo && <p style={{ color: '#64748b' }}>No hay acuerdo emitido todavía.</p>}
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
              {acuerdo.version != null && acuerdo.createdAt && (
                <p style={{ fontSize: 13 }}>
                  Versión: {acuerdo.version} · Emitido: {new Date(acuerdo.createdAt).toLocaleString('es-CO')}
                </p>
              )}
              {acuerdo.enlaces && Object.keys(acuerdo.enlaces).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <strong>Enlaces de firma (coordinación — las tres partes)</strong>
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
              <div style={{ marginTop: 12 }}>
                <button type="button" className="legalizacion-mtm__btn legalizacion-mtm__btn--secondary" onClick={verPdfAcuerdoEmitido} disabled={generandoAcuerdo}>
                  {generandoAcuerdo ? 'Abriendo…' : 'Ver PDF emitido (archivado)'}
                </button>
              </div>
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
            <section className="legalizacion-mtm__section">
              <h3 className="legalizacion-mtm__section-title">Datos del estudiante</h3>
              <dl className="legalizacion-mtm__grid">
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
            <section className="legalizacion-mtm__section">
              <h3 className="legalizacion-mtm__section-title">Datos de la entidad</h3>
              <dl className="legalizacion-mtm__grid">
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
            <section className="legalizacion-mtm__section">
              <h3 className="legalizacion-mtm__section-title">Datos de la práctica</h3>
              <dl className="legalizacion-mtm__grid">
                <dt>Cargo / nombre práctica</dt><dd>{oportunidadResumen?.nombreCargo ?? '—'}</dd>
                <dt>Periodo académico</dt><dd>{oportunidadResumen?.periodo ?? '—'}</dd>
                <dt>Tipo de vinculación</dt><dd>{oportunidadResumen?.tipoVinculacion?.value ?? oportunidadResumen?.tipoVinculacion?.description ?? '—'}</dd>
                <dt>Docente / Monitor</dt><dd>{practica?.docenteMonitor ?? '—'}</dd>
                <dt>Correo docente/monitor</dt><dd>{practica?.correoDocenteMonitor ?? '—'}</dd>
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
                <dt>Funciones</dt><dd style={{ gridColumn: '2 / -1' }}>{oportunidadResumen?.funciones ?? '—'}</dd>
              </dl>
            </section>
          </div>
        )}

        {tabActiva === 'documentos' && (
          <section className="legalizacion-mtm__section admrevmtm__docs-section">
            <h3 className="legalizacion-mtm__section-title">Documentos cargados</h3>
            <div className="admrevmtm__docs-grid">
              {definicionesConArchivo.map((d) => {
                const id = defIdStr(d);
                const doc = docs[id];
                const label = d.documentName;
                return (
                  <article key={id} className="admrevmtm-doc">
                    <header className="admrevmtm-doc__head">
                      <h4 className="admrevmtm-doc__title">{label}</h4>
                      {d.bindingAgreement && <span className="admrevmtm-doc__badge admrevmtm-doc__badge--pendiente">Acuerdo / vinculación</span>}
                    </header>
                    <p className="admrevmtm-doc__file">{doc?.originalName}</p>
                    <p className="admrevmtm-doc__file">Estado doc.: {doc?.estadoDocumento || 'pendiente'}</p>
                    <div className="admrevmtm-doc__actions">
                      <button type="button" className="admrevmtm-doc__link" onClick={() => getDocUrl(id, doc?.originalName || label)}>Vista previa</button>
                      <button type="button" className="admrevmtm-doc__btn" onClick={() => downloadDoc(id, doc?.originalName)}>Descargar</button>
                      {enRevision && (
                        <>
                          <button
                            type="button"
                            className="admrevmtm-doc__btn admrevmtm-doc__btn--approve"
                            disabled={savingDoc === id || (d.bindingAgreement && !legalizacion?.acuerdoTresFirmasCompletas)}
                            onClick={() => patchDoc(id, 'aprobado')}
                          >
                            Aprobar
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
            <h3 className="legalizacion-mtm__section-title">Historial</h3>
            <table className="postulants-table">
              <thead>
                <tr><th>Fecha</th><th>Anterior</th><th>Nuevo</th><th>Detalle</th><th>IP</th></tr>
              </thead>
              <tbody>
                {(historial || []).map((h, i) => (
                  <tr key={i}>
                    <td>{h.fecha ? new Date(h.fecha).toLocaleString('es-CO') : '—'}</td>
                    <td>{h.estadoAnterior ?? '—'}</td>
                    <td>{h.estadoNuevo ?? '—'}</td>
                    <td>{h.detalle ?? '—'}</td>
                    <td>{h.ip ?? '—'}</td>
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
    </div>
  );
}
