import { useState, useEffect } from 'react';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../styles/Configuracion.css';

const CODE_OPPORTUNITY_MIN_EXPIRY_DAYS = 'OPPORTUNITY_MIN_EXPIRY_DAYS';
const CODE_PRACTICE_START_DAYS_AFTER_EXPIRY = 'PRACTICE_START_DAYS_AFTER_EXPIRY';
const CODE_PRACTICE_END_DAYS_AFTER_START = 'PRACTICE_END_DAYS_AFTER_START';
const CODE_PRACTICE_NO_STUDENTS_MESSAGE = 'PRACTICE_NO_STUDENTS_MESSAGE';
const CODE_DIAS_HABILES_ACEPTAR_SELECCION_MTM = 'DIAS_HABILES_ACEPTAR_SELECCION_MTM';
const DEFAULT_DAYS = 5;
const DEFAULT_START_AFTER_EXPIRY = 0;
const DEFAULT_END_AFTER_START = 1;
const DEFAULT_NO_STUDENTS_MSG = '(no hay estudiantes para este periodo)';
const DEFAULT_DIAS_HABILES_MTM = 8;

function saveParameter({ parameterId, code, name, description, value }) {
  if (parameterId) {
    return api.put(`/parameters/${parameterId}`, { name, value, description });
  }
  return api.post('/parameters', {
    category: 'business_rules',
    name,
    code,
    description,
    value,
    metadata: { active: true, order: 0 },
  });
}

const TABS = [
  { id: 'vencimiento', label: 'Vencimiento oportunidad' },
  { id: 'inicio', label: 'Inicio práctica' },
  { id: 'fin', label: 'Fin práctica' },
  { id: 'aviso', label: 'Aviso formación' },
  { id: 'mtm-aceptar', label: 'Aceptar selección MTM' },
];

export default function ReglasNegocio({ onVolver }) {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [parameterId, setParameterId] = useState(null);
  const [practiceStartDaysAfterExpiry, setPracticeStartDaysAfterExpiry] = useState(DEFAULT_START_AFTER_EXPIRY);
  const [practiceStartId, setPracticeStartId] = useState(null);
  const [practiceEndDaysAfterStart, setPracticeEndDaysAfterStart] = useState(DEFAULT_END_AFTER_START);
  const [practiceEndId, setPracticeEndId] = useState(null);
  const [noStudentsMessage, setNoStudentsMessage] = useState(DEFAULT_NO_STUDENTS_MSG);
  const [noStudentsMessageId, setNoStudentsMessageId] = useState(null);
  const [diasHabilesAceptarMTM, setDiasHabilesAceptarMTM] = useState(DEFAULT_DIAS_HABILES_MTM);
  const [diasHabilesMTMId, setDiasHabilesMTMId] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/parameters/code/${CODE_OPPORTUNITY_MIN_EXPIRY_DAYS}`).then(r => r.data).catch(() => null),
      api.get(`/parameters/code/${CODE_PRACTICE_START_DAYS_AFTER_EXPIRY}`).then(r => r.data).catch(() => null),
      api.get(`/parameters/code/${CODE_PRACTICE_END_DAYS_AFTER_START}`).then(r => r.data).catch(() => null),
      api.get(`/parameters/code/${CODE_PRACTICE_NO_STUDENTS_MESSAGE}`).then(r => r.data).catch(() => null),
      api.get(`/parameters/code/${CODE_DIAS_HABILES_ACEPTAR_SELECCION_MTM}`).then(r => r.data).catch(() => null),
    ]).then(([p1, p2, p3, p4, p5]) => {
      if (p1) { setDays(typeof p1.value === 'number' ? p1.value : DEFAULT_DAYS); setParameterId(p1._id); }
      if (p2) { setPracticeStartDaysAfterExpiry(typeof p2.value === 'number' ? p2.value : DEFAULT_START_AFTER_EXPIRY); setPracticeStartId(p2._id); }
      if (p3) { setPracticeEndDaysAfterStart(typeof p3.value === 'number' ? p3.value : DEFAULT_END_AFTER_START); setPracticeEndId(p3._id); }
      if (p4) { setNoStudentsMessage(typeof p4.value === 'string' ? p4.value : DEFAULT_NO_STUDENTS_MSG); setNoStudentsMessageId(p4._id); }
      if (p5) { setDiasHabilesAceptarMTM(typeof p5.value === 'number' ? p5.value : DEFAULT_DIAS_HABILES_MTM); setDiasHabilesMTMId(p5._id); }
    }).finally(() => setLoading(false));
  }, []);

  const handleSaveExpiry = async (e) => {
    e.preventDefault();
    const num = Math.max(1, Math.min(365, Number(days) || DEFAULT_DAYS));
    setSaving(true);
    try {
      const res = await saveParameter({
        parameterId,
        code: CODE_OPPORTUNITY_MIN_EXPIRY_DAYS,
        name: 'Tiempo vencimiento oportunidad',
        description: `Mínimo de días desde la fecha de apertura (hoy) para la fecha de vencimiento de una oportunidad. Ej: ${num} días.`,
        value: num,
      });
      if (res?.data?._id) setParameterId(res.data._id);
      Swal.fire({ icon: 'success', title: 'Guardado', text: 'Regla de vencimiento guardada.', confirmButtonColor: '#c41e3a' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar.', confirmButtonColor: '#c41e3a' });
    } finally { setSaving(false); }
  };

  const handleSaveStartAfterExpiry = async (e) => {
    e.preventDefault();
    const num = Math.max(0, Math.min(365, Number(practiceStartDaysAfterExpiry) ?? DEFAULT_START_AFTER_EXPIRY));
    setSaving(true);
    try {
      const res = await saveParameter({
        parameterId: practiceStartId,
        code: CODE_PRACTICE_START_DAYS_AFTER_EXPIRY,
        name: 'Fecha inicio práctica (días después de vencimiento)',
        description: `Mínimo de días posteriores a la fecha de vencimiento de la oportunidad para la fecha de inicio de la práctica. Ej: ${num} días.`,
        value: num,
      });
      if (res?.data?._id) setPracticeStartId(res.data._id);
      Swal.fire({ icon: 'success', title: 'Guardado', text: 'Regla de inicio de práctica guardada.', confirmButtonColor: '#c41e3a' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar.', confirmButtonColor: '#c41e3a' });
    } finally { setSaving(false); }
  };

  const handleSaveEndAfterStart = async (e) => {
    e.preventDefault();
    const num = Math.max(0, Math.min(365, Number(practiceEndDaysAfterStart) ?? DEFAULT_END_AFTER_START));
    setSaving(true);
    try {
      const res = await saveParameter({
        parameterId: practiceEndId,
        code: CODE_PRACTICE_END_DAYS_AFTER_START,
        name: 'Fecha fin práctica (días después de inicio)',
        description: `Mínimo de días posteriores a la fecha de inicio de la práctica para la fecha fin. Ej: ${num} días.`,
        value: num,
      });
      if (res?.data?._id) setPracticeEndId(res.data._id);
      Swal.fire({ icon: 'success', title: 'Guardado', text: 'Regla de fin de práctica guardada.', confirmButtonColor: '#c41e3a' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar.', confirmButtonColor: '#c41e3a' });
    } finally { setSaving(false); }
  };

  const handleSaveNoStudentsMessage = async (e) => {
    e.preventDefault();
    const msg = (noStudentsMessage || '').trim() || DEFAULT_NO_STUDENTS_MSG;
    setSaving(true);
    try {
      const res = await saveParameter({
        parameterId: noStudentsMessageId,
        code: CODE_PRACTICE_NO_STUDENTS_MESSAGE,
        name: 'Aviso programas sin estudiantes para el periodo',
        description: 'Texto que se muestra en formación académica para programas sin condición curricular activa en el periodo seleccionado.',
        value: msg,
      });
      if (res?.data?._id) setNoStudentsMessageId(res.data._id);
      setNoStudentsMessage(msg);
      Swal.fire({ icon: 'success', title: 'Guardado', text: 'Aviso de formación académica guardado.', confirmButtonColor: '#c41e3a' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar.', confirmButtonColor: '#c41e3a' });
    } finally { setSaving(false); }
  };

  const handleSaveDiasHabilesMTM = async (e) => {
    e.preventDefault();
    const num = Math.max(1, Math.min(60, Number(diasHabilesAceptarMTM) || DEFAULT_DIAS_HABILES_MTM));
    setSaving(true);
    try {
      const res = await saveParameter({
        parameterId: diasHabilesMTMId,
        code: CODE_DIAS_HABILES_ACEPTAR_SELECCION_MTM,
        name: 'Días hábiles para aceptar selección MTM',
        description: `Plazo en días hábiles (lun–vie) que tiene el estudiante para aceptar o rechazar una oferta de monitoría/tutoría/mentoría una vez seleccionado. Valor por defecto: ${num} días.`,
        value: num,
      });
      if (res?.data?._id) setDiasHabilesMTMId(res.data._id);
      setDiasHabilesAceptarMTM(num);
      Swal.fire({ icon: 'success', title: 'Guardado', text: 'Plazo para aceptar selección MTM guardado.', confirmButtonColor: '#c41e3a' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar.', confirmButtonColor: '#c41e3a' });
    } finally { setSaving(false); }
  };

  return (
    <div className="configuracion-content">
      <div className="configuracion-section">
        <div className="configuracion-header">
          <button type="button" className="btn-volver" onClick={onVolver}>
            <FiArrowLeft className="btn-icon" />
            Volver
          </button>
          <div className="section-header">
            <h3>CONFIGURAR REGLAS DE NEGOCIO</h3>
          </div>
        </div>

        {loading ? (
          <p className="reglas-loading">Cargando...</p>
        ) : (
          <div className="reglas-negocio reglas-negocio--tabs">
            <nav className="reglas-tabs" aria-label="Reglas de negocio">
              {TABS.map((tab, i) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`reglas-tab ${activeTab === i ? 'reglas-tab--active' : ''}`}
                  onClick={() => setActiveTab(i)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="reglas-panel">
              {activeTab === 0 && (
                <div className="reglas-card reglas-card--single">
                  <h4 className="reglas-card-title">Tiempo vencimiento oportunidad</h4>
                  <p className="reglas-card-desc">
                    Número mínimo de días desde la fecha de apertura (hoy) para la fecha de vencimiento de una oportunidad de práctica.
                  </p>
                  <form onSubmit={handleSaveExpiry} className="reglas-form-row">
                    <span className="reglas-label">Mínimo</span>
                    <input type="number" className="reglas-input-num" min={1} max={365} value={days} onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))} />
                    <span className="reglas-unit">días</span>
                    <span className="reglas-btn-wrap">
                      <button type="submit" className="btn-guardar" disabled={saving}><FiSave className="btn-icon" />{saving ? 'Guardando...' : 'Guardar'}</button>
                    </span>
                  </form>
                </div>
              )}

              {activeTab === 1 && (
                <div className="reglas-card reglas-card--single">
                  <h4 className="reglas-card-title">Fecha de inicio de la práctica</h4>
                  <p className="reglas-card-desc">
                    Mínimo de días posteriores a la <strong>fecha de vencimiento de la oportunidad</strong> para poder elegir la fecha de inicio de la práctica. Ej: 0 = el mismo día del vencimiento; 7 = una semana después.
                  </p>
                  <form onSubmit={handleSaveStartAfterExpiry} className="reglas-form-row">
                    <span className="reglas-label">Días posteriores</span>
                    <input type="number" className="reglas-input-num" min={0} max={365} value={practiceStartDaysAfterExpiry} onChange={(e) => setPracticeStartDaysAfterExpiry(Math.max(0, Math.min(365, Number(e.target.value) ?? 0)))} />
                    <span className="reglas-unit">días</span>
                    <span className="reglas-btn-wrap">
                      <button type="submit" className="btn-guardar" disabled={saving}><FiSave className="btn-icon" />{saving ? 'Guardando...' : 'Guardar'}</button>
                    </span>
                  </form>
                </div>
              )}

              {activeTab === 2 && (
                <div className="reglas-card reglas-card--single">
                  <h4 className="reglas-card-title">Fecha fin de la práctica</h4>
                  <p className="reglas-card-desc">
                    Mínimo de días posteriores a la <strong>fecha de inicio de la práctica</strong> para la fecha fin. Ej: 1 = al menos un día después del inicio; 30 = al menos un mes.
                  </p>
                  <form onSubmit={handleSaveEndAfterStart} className="reglas-form-row">
                    <span className="reglas-label">Días posteriores</span>
                    <input type="number" className="reglas-input-num" min={0} max={365} value={practiceEndDaysAfterStart} onChange={(e) => setPracticeEndDaysAfterStart(Math.max(0, Math.min(365, Number(e.target.value) ?? 0)))} />
                    <span className="reglas-unit">días</span>
                    <span className="reglas-btn-wrap">
                      <button type="submit" className="btn-guardar" disabled={saving}><FiSave className="btn-icon" />{saving ? 'Guardando...' : 'Guardar'}</button>
                    </span>
                  </form>
                </div>
              )}

              {activeTab === 3 && (
                <div className="reglas-card reglas-card--single">
                  <h4 className="reglas-card-title">Aviso en formación académica</h4>
                  <p className="reglas-card-desc">
                    Texto que se muestra junto a los programas que <strong>no tienen condición curricular de práctica activa</strong> para el periodo seleccionado en la oportunidad (ej. &quot;no hay estudiantes para este periodo&quot;).
                  </p>
                  <form onSubmit={handleSaveNoStudentsMessage} className="reglas-form-row">
                    <input type="text" className="reglas-input-text" value={noStudentsMessage} onChange={(e) => setNoStudentsMessage(e.target.value)} placeholder={DEFAULT_NO_STUDENTS_MSG} />
                    <span className="reglas-btn-wrap">
                      <button type="submit" className="btn-guardar" disabled={saving}><FiSave className="btn-icon" />{saving ? 'Guardando...' : 'Guardar'}</button>
                    </span>
                  </form>
                </div>
              )}

              {activeTab === 4 && (
                <div className="reglas-card reglas-card--single">
                  <h4 className="reglas-card-title">Plazo para aceptar selección (Monitorías, Tutorías y Mentorías)</h4>
                  <p className="reglas-card-desc">
                    Número de <strong>días hábiles</strong> (lunes a viernes) que tiene el estudiante para aceptar o rechazar una oferta de MTM una vez que fue seleccionado. Transcurrido este plazo, la opción de confirmar/rechazar se deshabilita. Valor inicial recomendado: 8 días.
                  </p>
                  <form onSubmit={handleSaveDiasHabilesMTM} className="reglas-form-row">
                    <span className="reglas-label">Días hábiles</span>
                    <input type="number" className="reglas-input-num" min={1} max={60} value={diasHabilesAceptarMTM} onChange={(e) => setDiasHabilesAceptarMTM(Math.max(1, Math.min(60, Number(e.target.value) || 1)))} />
                    <span className="reglas-unit">días</span>
                    <span className="reglas-btn-wrap">
                      <button type="submit" className="btn-guardar" disabled={saving}><FiSave className="btn-icon" />{saving ? 'Guardando...' : 'Guardar'}</button>
                    </span>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
