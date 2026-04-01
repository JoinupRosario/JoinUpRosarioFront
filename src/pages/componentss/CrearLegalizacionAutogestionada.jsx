import { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import Swal from 'sweetalert2';
import api from '../../services/api';
import './CrearLegalizacionAutogestionada.css';

/** Fecha local YYYY-MM-DD (misma idea que reglas de negocio en Oportunidades.jsx). */
function todayLocalYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysToDate(isoDateStr, daysToAdd) {
  if (!isoDateStr) return '';
  const d = new Date(`${String(isoDateStr).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + (daysToAdd || 0));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const emptyTutor = () => ({
  nombreTutor: '',
  apellidoTutor: '',
  emailTutor: '',
  cargoTutor: '',
  tipoIdentTutor: '',
  identificacionTutor: '',
  arlEmpresa: '',
});

const TUTOR_LABELS = {
  nombreTutor: 'Nombres del tutor',
  apellidoTutor: 'Apellidos del tutor',
  emailTutor: 'Correo tutor',
  cargoTutor: 'Cargo',
  tipoIdentTutor: 'Tipo identificación',
  identificacionTutor: 'Número identificación',
};

export default function CrearLegalizacionAutogestionada({ onVolver }) {
  const [loading, setLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [studentCode, setStudentCode] = useState('');
  const [postulantProfileId, setPostulantProfileId] = useState('');
  const [estudianteInfo, setEstudianteInfo] = useState(null);
  /** Programas inscritos del perfil (puede haber más de uno) */
  const [programasInscritos, setProgramasInscritos] = useState([]);
  const [enrolledProgramId, setEnrolledProgramId] = useState('');

  const [companies, setCompanies] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [linkageTypes, setLinkageTypes] = useState([]);
  const [dedicationTypes, setDedicationTypes] = useState([]);
  const [performanceAreas, setPerformanceAreas] = useState([]);
  const [maxJornada, setMaxJornada] = useState(44);
  const [minApoyo, setMinApoyo] = useState(1750905);
  /** Regla PRACTICE_END_DAYS_AFTER_START (igual que creación de oportunidades de práctica). */
  const [practiceEndDaysAfterStart, setPracticeEndDaysAfterStart] = useState(1);

  const [form, setForm] = useState({
    company: '',
    nombreCargo: '',
    requisitos: '',
    funciones: '',
    periodo: '',
    tipoVinculacion: '',
    formacionLevel: 'PREGRADO',
    formacionProgram: '',
    dedicacion: '',
    pais: '',
    ciudad: '',
    areaDesempeno: '',
    fechaInicioPractica: '',
    fechaFinPractica: '',
    horario: '',
    jornadaOrdinariaSemanal: '',
    auxilioEconomico: false,
    apoyoEconomico: '',
    promedioMinimoRequerido: '',
    tutor: emptyTutor(),
  });

  useEffect(() => {
    api.get('/opportunities/autogestionada/empresas').then((r) => setCompanies(r.data?.data || [])).catch(() => setCompanies([]));
    api.get('/periodos', { params: { tipo: 'practica', estado: 'Activo', limit: 100 } }).then((r) => setPeriodos(r.data?.data || r.data || [])).catch(() => setPeriodos([]));
    api.get('/locations/countries', { params: { limit: 1000 } }).then((r) => setCountries(r.data?.data || [])).catch(() => setCountries([]));
    Promise.all([
      api.get('/locations/items/L_CONTRACT_TYPE_ACADEMIC_PRACTICE', { params: { limit: 100 } }),
      api.get('/locations/items/L_DEDICATION_JOB_OFFER', { params: { limit: 100 } }),
      api.get('/locations/items/L_INTEREST_AREA', { params: { limit: 100 } }),
    ])
      .then(([a, b, c]) => {
        setLinkageTypes(a.data?.data || []);
        setDedicationTypes(b.data?.data || []);
        setPerformanceAreas(c.data?.data || []);
      })
      .catch(() => {});
    api
      .get('/parameters/code/PRACTICE_MAX_JORNADA_ORDINARIA_SEMANAL')
      .then((r) => {
        const v = r.data?.value;
        const n = typeof v === 'number' ? v : parseInt(String(v || ''), 10);
        if (Number.isFinite(n) && n >= 1 && n <= 48) setMaxJornada(n);
      })
      .catch(() => {});
    api
      .get('/parameters/code/PRACTICE_MIN_APOYO_ECONOMICO_COP')
      .then((r) => {
        const v = r.data?.value;
        const n = typeof v === 'number' ? v : parseInt(String(v ?? '').replace(/\D/g, ''), 10);
        if (Number.isFinite(n) && n >= 500000) setMinApoyo(n);
      })
      .catch(() => {});
    api
      .get('/parameters/code/PRACTICE_END_DAYS_AFTER_START')
      .then((r) => {
        const v = r.data?.value;
        const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
        if (Number.isFinite(n) && n >= 0 && n <= 365) setPracticeEndDaysAfterStart(n);
      })
      .catch(() => {});
  }, []);

  const companySelectOptions = useMemo(
    () =>
      companies.map((c) => {
        const name = (c.commercialName || c.name || c.legalName || '').trim();
        const nit = String(c.nit || '').trim();
        const label = nit ? `${name} — NIT ${nit}` : name || '—';
        return { value: String(c._id), label, nitDigits: nit.replace(/\D/g, '') };
      }),
    [companies]
  );

  const companySelectValue = useMemo(
    () => companySelectOptions.find((o) => o.value === String(form.company)) || null,
    [companySelectOptions, form.company]
  );

  const selectedLinkageType = useMemo(
    () => linkageTypes.find((l) => String(l._id) === String(form.tipoVinculacion)),
    [linkageTypes, form.tipoVinculacion]
  );

  useEffect(() => {
    if (!form.pais) {
      setCities([]);
      return;
    }
    api
      .get('/locations/cities', { params: { country: form.pais, limit: 1000 } })
      .then((r) => setCities(r.data?.data || []))
      .catch(() => setCities([]));
  }, [form.pais]);

  const aplicarProgramaSeleccionado = (prog) => {
    if (!prog) return;
    setForm((f) => ({
      ...f,
      formacionLevel: prog.level || f.formacionLevel,
      formacionProgram: prog.program || f.formacionProgram,
    }));
  };

  const onCambiarProgramaInscrito = (id) => {
    setEnrolledProgramId(id);
    const p = programasInscritos.find((x) => String(x.enrolledProgramId) === String(id));
    aplicarProgramaSeleccionado(p);
  };

  const buscarEstudiante = () => {
    const sc = studentCode.trim();
    if (!sc) {
      Swal.fire({ icon: 'warning', title: 'Identificación', text: 'Ingrese el número de documento del estudiante.', confirmButtonColor: '#c41e3a' });
      return;
    }
    setBuscando(true);
    api
      .get('/opportunities/autogestionada/buscar-perfil', { params: { studentCode: sc } })
      .then((r) => {
        const d = r.data;
        setPostulantProfileId(d.postulantProfileId);
        setEstudianteInfo({
          nombre: d.nombre,
          email: d.email,
          programa: d.programa,
          facultad: d.facultad,
        });
        const lista = Array.isArray(d.programas) && d.programas.length ? d.programas : [];
        setProgramasInscritos(lista);
        if (lista.length === 1) {
          const only = lista[0];
          setEnrolledProgramId(String(only.enrolledProgramId));
          aplicarProgramaSeleccionado(only);
        } else {
          setEnrolledProgramId('');
          setForm((f) => ({
            ...f,
            formacionLevel: 'PREGRADO',
            formacionProgram: '',
          }));
        }
      })
      .catch((err) => {
        setPostulantProfileId('');
        setEstudianteInfo(null);
        setProgramasInscritos([]);
        setEnrolledProgramId('');
        Swal.fire({ icon: 'error', title: 'No encontrado', text: err.response?.data?.message || 'Perfil no encontrado', confirmButtonColor: '#c41e3a' });
      })
      .finally(() => setBuscando(false));
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setPais = (v) => setForm((f) => ({ ...f, pais: v, ciudad: '' }));
  const setFechaInicioPractica = (v) => {
    setForm((f) => {
      let fin = f.fechaFinPractica;
      if (v && fin) {
        const minFin = addDaysToDate(v, practiceEndDaysAfterStart);
        if (minFin && fin < minFin) fin = minFin;
      }
      return { ...f, fechaInicioPractica: v, fechaFinPractica: fin };
    });
  };
  const setTutor = (k, v) => setForm((f) => ({ ...f, tutor: { ...f.tutor, [k]: v } }));

  const enviar = (e) => {
    e.preventDefault();
    if (!postulantProfileId) {
      Swal.fire({ icon: 'warning', title: 'Estudiante', text: 'Busque y valide al estudiante por número de identificación.', confirmButtonColor: '#c41e3a' });
      return;
    }
    if (!form.company || !form.nombreCargo.trim() || !form.requisitos.trim() || String(form.funciones).trim().length < 60) {
      Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: 'Empresa, cargo, requisitos y funciones (mín. 60 caracteres) son obligatorios.', confirmButtonColor: '#c41e3a' });
      return;
    }
    if (form.auxilioEconomico) {
      const ap = parseInt(String(form.apoyoEconomico || '').replace(/\D/g, ''), 10);
      if (!Number.isFinite(ap) || ap < minApoyo) {
        Swal.fire({ icon: 'warning', title: 'Apoyo económico', text: `Con auxilio activo el apoyo debe ser al menos $${minApoyo.toLocaleString('es-CO')} COP.`, confirmButtonColor: '#c41e3a' });
        return;
      }
    }
    const jo = parseInt(String(form.jornadaOrdinariaSemanal), 10);
    if (Number.isFinite(jo) && jo > maxJornada) {
      Swal.fire({ icon: 'warning', title: 'Dedicación por semana', text: `No puede superar ${maxJornada} horas semanales (regla de negocio).`, confirmButtonColor: '#c41e3a' });
      return;
    }
    const ini = String(form.fechaInicioPractica || '').slice(0, 10);
    const fin = String(form.fechaFinPractica || '').slice(0, 10);
    const minFinReq = addDaysToDate(ini, practiceEndDaysAfterStart);
    if (ini && fin && minFinReq && fin < minFinReq) {
      Swal.fire({
        icon: 'warning',
        title: 'Fechas de la práctica',
        text: `La fecha de fin debe ser al menos ${practiceEndDaysAfterStart} día(s) después de la fecha de inicio (mínimo ${minFinReq}).`,
        confirmButtonColor: '#c41e3a',
      });
      return;
    }
    if (ini && ini < todayLocalYMD()) {
      Swal.fire({ icon: 'warning', title: 'Fecha de inicio', text: 'La fecha de inicio no puede ser anterior a hoy.', confirmButtonColor: '#c41e3a' });
      return;
    }
    if (programasInscritos.length > 1 && !enrolledProgramId) {
      Swal.fire({
        icon: 'warning',
        title: 'Programa académico',
        text: 'El estudiante tiene más de un programa inscrito. Elija para cuál aplica esta práctica.',
        confirmButtonColor: '#c41e3a',
      });
      return;
    }
    if (
      !enrolledProgramId &&
      (!form.formacionLevel.trim() || !form.formacionProgram.trim())
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Programa académico',
        text: 'Complete nivel y programa académico en la sección de la práctica, o seleccione un programa inscrito arriba.',
        confirmButtonColor: '#c41e3a',
      });
      return;
    }

    const payload = {
      postulantProfileId,
      company: form.company,
      nombreCargo: form.nombreCargo.trim(),
      requisitos: form.requisitos.trim(),
      funciones: String(form.funciones).trim(),
      periodo: form.periodo,
      tipoVinculacion: form.tipoVinculacion,
      ...(enrolledProgramId
        ? { enrolledProgramId }
        : { formacionAcademica: [{ level: form.formacionLevel.trim(), program: form.formacionProgram.trim() }] }),
      dedicacion: form.dedicacion,
      pais: form.pais,
      ciudad: form.ciudad,
      areaDesempeno: form.areaDesempeno,
      fechaInicioPractica: form.fechaInicioPractica,
      fechaFinPractica: form.fechaFinPractica,
      horario: form.horario.trim(),
      jornadaOrdinariaSemanal: form.jornadaOrdinariaSemanal,
      jornadaSemanalPractica: form.jornadaOrdinariaSemanal,
      auxilioEconomico: form.auxilioEconomico,
      apoyoEconomico: form.auxilioEconomico ? String(form.apoyoEconomico).replace(/\D/g, '') : null,
      promedioMinimoRequerido: form.promedioMinimoRequerido || null,
      tutor: form.tutor,
    };

    setLoading(true);
    api
      .post('/opportunities/practica-autogestionada', payload)
      .then((res) => {
        Swal.fire({
          icon: 'success',
          title: 'Registrado',
          text: res.data?.message || 'La práctica autogestionada quedó lista para que el estudiante cargue documentos.',
          confirmButtonColor: '#c41e3a',
        });
        if (onVolver) onVolver();
      })
      .catch((err) => {
        Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || err.message, confirmButtonColor: '#c41e3a' });
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="dashboard-content legalizaciones-monitorias-content autog-fullbleed">
      <div className="autog-page">
        <header className="autog-hero">
          <h1 className="autog-hero__title">Registrar práctica autogestionada</h1>
          <p className="autog-hero__lead">
            Complete los datos de la práctica y del escenario. El estudiante quedará habilitado para cargar la documentación de legalización. Los campos con * son obligatorios; el apoyo económico y el promedio mínimo solo aplican si los indica.
          </p>
          <div className="autog-hero__actions">
            <button type="button" className="autog-btn-back" onClick={onVolver}>
              ← Volver al listado
            </button>
          </div>
        </header>

        <form onSubmit={enviar} className="autog-form" noValidate>
          <div className="autog-layout-two">
            <section className="autog-card" aria-labelledby="autog-s1">
              <h2 className="autog-card__title" id="autog-s1">
                <span className="autog-card__title-num" aria-hidden>
                  1
                </span>
                Estudiante
              </h2>
              <div className="autog-row">
                <label className="autog-field autog-field--grow">
                  <span>Número de identificación</span>
                  <input type="text" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} placeholder="Documento del estudiante" autoComplete="off" />
                </label>
                <button type="button" className="autog-btn-search" disabled={buscando} onClick={buscarEstudiante}>
                  {buscando ? 'Buscando…' : 'Buscar'}
                </button>
              </div>
              {estudianteInfo && (
                <>
                  <ul className="autog-summary autog-summary--grid">
                    <li>
                      <strong>Nombre</strong>
                      <span>{estudianteInfo.nombre || '—'}</span>
                    </li>
                    <li>
                      <strong>Correo institucional</strong>
                      <span>{estudianteInfo.email || '—'}</span>
                    </li>
                    {programasInscritos.length <= 1 && (
                      <>
                        <li>
                          <strong>Programa</strong>
                          <span>{estudianteInfo.programa || '—'}</span>
                        </li>
                        <li>
                          <strong>Facultad</strong>
                          <span>{estudianteInfo.facultad || '—'}</span>
                        </li>
                      </>
                    )}
                  </ul>
                  {programasInscritos.length > 1 && (
                    <label className="autog-field autog-field--block">
                      <span>¿Para qué programa inscrito es esta práctica? *</span>
                      <select value={enrolledProgramId} onChange={(e) => onCambiarProgramaInscrito(e.target.value)} required>
                        <option value="">Seleccione el programa…</option>
                        {programasInscritos.map((p) => (
                          <option key={String(p.enrolledProgramId)} value={String(p.enrolledProgramId)}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {programasInscritos.length === 1 && (
                    <p className="autog-hint">Se registrará para: <strong>{programasInscritos[0].label}</strong></p>
                  )}
                  {programasInscritos.length === 0 && (
                    <p className="autog-hint autog-hint--warn">No hay programas inscritos en el perfil. Complete nivel y programa académico en la sección «Oportunidad y práctica».</p>
                  )}
                </>
              )}
            </section>

            <section className="autog-card" aria-labelledby="autog-s2">
              <h2 className="autog-card__title" id="autog-s2">
                <span className="autog-card__title-num" aria-hidden>
                  2
                </span>
                Entidad
              </h2>
              <label className="autog-field autog-field--block">
                <span>Empresa *</span>
                <span className="autog-field__hint">Busque por nombre comercial, razón social o NIT (entidad registrada en la plataforma).</span>
                <Select
                  className="autog-company-select"
                  classNamePrefix="autog-rs"
                  inputId="autog-company"
                  placeholder="Escriba para buscar por nombre o NIT…"
                  isClearable
                  options={companySelectOptions}
                  value={companySelectValue}
                  onChange={(opt) => setField('company', opt?.value || '')}
                  noOptionsMessage={({ inputValue }) => (inputValue ? 'Sin coincidencias' : 'Escriba para buscar')}
                  filterOption={(candidate, rawInput) => {
                    const q = (rawInput || '').trim().toLowerCase();
                    if (!q) return true;
                    const row = candidate.data || candidate;
                    const lab = String(row?.label || candidate.label || '').toLowerCase();
                    const nit = String(row?.nitDigits || '');
                    const qDigits = q.replace(/\D/g, '');
                    return lab.includes(q) || (qDigits.length >= 1 && nit.includes(qDigits));
                  }}
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: 42,
                      borderRadius: 8,
                      borderColor: '#d1d5db',
                      boxShadow: 'none',
                    }),
                    menu: (base) => ({ ...base, zIndex: 20 }),
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  menuPosition="fixed"
                />
              </label>
            </section>
          </div>

          <section className="autog-card" aria-labelledby="autog-s3">
            <h2 className="autog-card__title" id="autog-s3">
              <span className="autog-card__title-num" aria-hidden>
                3
              </span>
              Oportunidad y práctica
            </h2>
            <label className="autog-field">
              <span>Nombre del cargo o práctica *</span>
              <input type="text" value={form.nombreCargo} onChange={(e) => setField('nombreCargo', e.target.value)} required />
            </label>
            <label className="autog-field autog-field--block">
              <span>Requisitos *</span>
              <textarea value={form.requisitos} onChange={(e) => setField('requisitos', e.target.value)} required rows={3} />
            </label>
            <label className="autog-field autog-field--block">
              <span>Funciones (mínimo 60 caracteres) *</span>
              <textarea value={form.funciones} onChange={(e) => setField('funciones', e.target.value)} required rows={4} />
            </label>
            <div className="autog-grid">
              <label className="autog-field">
                <span>Período académico *</span>
                <select value={form.periodo} onChange={(e) => setField('periodo', e.target.value)} required>
                  <option value="">Seleccione…</option>
                  {periodos.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.codigo}
                    </option>
                  ))}
                </select>
              </label>
              <label className="autog-field">
                <span>Tipo de vinculación *</span>
                <select value={form.tipoVinculacion} onChange={(e) => setField('tipoVinculacion', e.target.value)} required>
                  <option value="">Seleccione…</option>
                  {linkageTypes.map((it) => (
                    <option key={it._id} value={it._id} title={it.description || ''}>
                      {it.value || it.description}
                    </option>
                  ))}
                </select>
                {selectedLinkageType?.description && (
                  <span className="autog-field__hint">{selectedLinkageType.description}</span>
                )}
              </label>
              <label className="autog-field">
                <span>Dedicación *</span>
                <select value={form.dedicacion} onChange={(e) => setField('dedicacion', e.target.value)} required>
                  <option value="">Seleccione…</option>
                  {dedicationTypes.map((it) => (
                    <option key={it._id} value={it._id}>
                      {it.description || it.value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="autog-field">
                <span>Área de desempeño *</span>
                <select value={form.areaDesempeno} onChange={(e) => setField('areaDesempeno', e.target.value)} required>
                  <option value="">Seleccione…</option>
                  {performanceAreas.map((it) => (
                    <option key={it._id} value={it._id}>
                      {it.description || it.value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="autog-grid">
              <label className="autog-field">
                <span>Nivel de formación *</span>
                <input type="text" value={form.formacionLevel} onChange={(e) => setField('formacionLevel', e.target.value)} required />
              </label>
              <label className="autog-field">
                <span>Programa académico *</span>
                <input type="text" value={form.formacionProgram} onChange={(e) => setField('formacionProgram', e.target.value)} required placeholder="Mismo programa del estudiante" />
              </label>
            </div>
            <div className="autog-grid">
              <label className="autog-field">
                <span>País *</span>
                <select value={form.pais} onChange={(e) => setPais(e.target.value)} required>
                  <option value="">Seleccione…</option>
                  {countries.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="autog-field">
                <span>Ciudad *</span>
                <select value={form.ciudad} onChange={(e) => setField('ciudad', e.target.value)} required disabled={!form.pais}>
                  <option value="">{form.pais ? 'Seleccione…' : 'Primero el país'}</option>
                  {cities.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="autog-field">
                <span>Fecha de inicio *</span>
                <input
                  type="date"
                  value={form.fechaInicioPractica}
                  onChange={(e) => setFechaInicioPractica(e.target.value)}
                  min={todayLocalYMD()}
                  required
                />
              </label>
              <label className="autog-field">
                <span>Fecha de fin *</span>
                <input
                  type="date"
                  value={form.fechaFinPractica}
                  onChange={(e) => setField('fechaFinPractica', e.target.value)}
                  min={form.fechaInicioPractica ? addDaysToDate(form.fechaInicioPractica, practiceEndDaysAfterStart) : todayLocalYMD()}
                  required
                />
              </label>
            </div>
            <label className="autog-field autog-field--block">
              <span>Horario *</span>
              <input type="text" value={form.horario} onChange={(e) => setField('horario', e.target.value)} required placeholder="Ej. Lunes a viernes 8:00 – 17:00" />
            </label>
            <div className="autog-grid autog-grid--tight">
              <label className="autog-field">
                <span>Dedicación por semana (horas) *</span>
                <span className="autog-field__hint">Horas semanales de práctica; máximo {maxJornada} h (regla de negocio, mismo criterio que Oportunidades de práctica).</span>
                <input
                  type="number"
                  min={0}
                  max={maxJornada}
                  value={form.jornadaOrdinariaSemanal}
                  onChange={(e) => setField('jornadaOrdinariaSemanal', e.target.value)}
                  required
                />
              </label>
              <label className="autog-field autog-field--checkbox">
                <input type="checkbox" checked={form.auxilioEconomico} onChange={(e) => setField('auxilioEconomico', e.target.checked)} />
                <span>Práctica remunerada / con auxilio</span>
              </label>
              {form.auxilioEconomico && (
                <label className="autog-field">
                  <span>Apoyo mensual (COP) *</span>
                  <input type="text" value={form.apoyoEconomico} onChange={(e) => setField('apoyoEconomico', e.target.value)} />
                </label>
              )}
              <label className="autog-field">
                <span>Promedio mínimo requerido</span>
                <input type="text" value={form.promedioMinimoRequerido} onChange={(e) => setField('promedioMinimoRequerido', e.target.value)} placeholder="Opcional" />
              </label>
            </div>
          </section>

          <section className="autog-card" aria-labelledby="autog-s4">
            <h2 className="autog-card__title" id="autog-s4">
              <span className="autog-card__title-num" aria-hidden>
                4
              </span>
              Docente o tutor en el escenario
            </h2>
            <div className="autog-grid">
              {['nombreTutor', 'apellidoTutor', 'emailTutor', 'cargoTutor', 'tipoIdentTutor', 'identificacionTutor'].map((k) => (
                <label key={k} className="autog-field">
                  <span>
                    {TUTOR_LABELS[k]} *
                  </span>
                  <input type="text" value={form.tutor[k]} onChange={(e) => setTutor(k, e.target.value)} required />
                </label>
              ))}
              <label className="autog-field">
                <span>ARL en la empresa</span>
                <input type="text" value={form.tutor.arlEmpresa} onChange={(e) => setTutor('arlEmpresa', e.target.value)} placeholder="Opcional" />
              </label>
            </div>
          </section>

          <div className="autog-submit-wrap">
            <button type="submit" className="autog-btn-submit" disabled={loading}>
              {loading ? 'Guardando…' : 'Registrar práctica autogestionada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
