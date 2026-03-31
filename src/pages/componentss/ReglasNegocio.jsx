import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FiArrowLeft, FiSave, FiMoreVertical, FiX, FiEdit2, FiPlusCircle, FiBook } from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../services/api';
import OptionsMenuPortal from './notificaciones/OptionsMenuPortal';
import '../styles/Configuracion.css';
import '../styles/notificaciones.css';

const CODE_OPPORTUNITY_MIN_EXPIRY_DAYS = 'OPPORTUNITY_MIN_EXPIRY_DAYS';
const CODE_PRACTICE_START_DAYS_AFTER_EXPIRY = 'PRACTICE_START_DAYS_AFTER_EXPIRY';
const CODE_PRACTICE_END_DAYS_AFTER_START = 'PRACTICE_END_DAYS_AFTER_START';
const CODE_PRACTICE_NO_STUDENTS_MESSAGE = 'PRACTICE_NO_STUDENTS_MESSAGE';
const CODE_DIAS_HABILES_ACEPTAR_SELECCION_MTM = 'DIAS_HABILES_ACEPTAR_SELECCION_MTM';
const CODE_PRACTICE_MAX_JORNADA_ORDINARIA_SEMANAL = 'PRACTICE_MAX_JORNADA_ORDINARIA_SEMANAL';
const DEFAULT_DAYS = 5;
const DEFAULT_START_AFTER_EXPIRY = 0;
const DEFAULT_END_AFTER_START = 1;
const DEFAULT_NO_STUDENTS_MSG = '(no hay estudiantes para este periodo)';
const DEFAULT_DIAS_HABILES_MTM = 8;
const DEFAULT_MAX_JORNADA_ORDINARIA = 44;
const CODE_PRACTICE_MIN_APOYO_ECONOMICO_COP = 'PRACTICE_MIN_APOYO_ECONOMICO_COP';
const DEFAULT_MIN_APOYO_COP = 1750905;

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
  { id: 'jornada-practica', label: 'Jornada práctica' },
  { id: 'min-apoyo', label: 'Mínimo apoyo ($)' },
  { id: 'programa-tipo', label: 'Programa / tipo práctica' },
];

/** Filas por página: backend con `page`, `limit` y `search`. */
const TP_PAGE_SIZE = 10;

function normTipoPermitido(r) {
  return String(r?.tipoPermitido ?? '')
    .trim()
    .toUpperCase();
}

/**
 * Texto en columna "Tipo actual": etiquetas vienen del API (`typePracticeLabels` / `typePracticeLabel`)
 * o del catálogo cargado por listId (`catalogItems`); sin textos de negocio fijos.
 */
function displayTipoPracticaRow(r, catalogItems = []) {
  const ids =
    Array.isArray(r.typePracticeItemIds) && r.typePracticeItemIds.length > 0
      ? r.typePracticeItemIds
      : r.typePracticeItemId
        ? [r.typePracticeItemId]
        : [];

  const apiLabels = Array.isArray(r.typePracticeLabels)
    ? r.typePracticeLabels.map((x) => String(x).trim()).filter(Boolean)
    : [];
  if (apiLabels.length > 0) {
    return apiLabels.join(', ');
  }

  if (ids.length > 0 && catalogItems.length > 0) {
    const fromCatalog = ids
      .map((id) => catalogItems.find((it) => String(it._id) === String(id))?.value)
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean);
    if (fromCatalog.length === ids.length) {
      return fromCatalog.join(', ');
    }
    if (fromCatalog.length > 0 && ids.length > 1) {
      const missing = ids.length - fromCatalog.length;
      const api = r.typePracticeLabel && String(r.typePracticeLabel).trim();
      const apiLooksMulti =
        api && (api.includes(',') || api.split(',').map((s) => s.trim()).filter(Boolean).length >= ids.length);
      if (apiLooksMulti) return api;
      return `${fromCatalog.join(', ')} · +${missing} en BD (no figuran en ítems activos de este listId)`;
    }
    if (fromCatalog.length > 0) {
      return fromCatalog.join(', ');
    }
  }

  if (r.typePracticeLabel && String(r.typePracticeLabel).trim()) {
    return r.typePracticeLabel.trim();
  }

  if (normTipoPermitido(r) === 'NO_APLICA') {
    return { empty: true, text: 'Sin parametrizar' };
  }

  if (ids.length > 0) {
    return 'Tipos en BD sin etiqueta en el catálogo de esta pantalla';
  }

  return '—';
}

function renderTipoPracticaCell(r, catalogItems) {
  const v = displayTipoPracticaRow(r, catalogItems);
  if (v === null) return null;
  if (typeof v === 'object' && v.empty) {
    return <span className="reglas-tp-cell-empty" title="Aún no hay tipo de práctica asignado para este programa">{v.text}</span>;
  }
  return v;
}

/** Sin regla en BD: solo enum NO_APLICA (sin ítem de catálogo). */
function rowNeedsTpParametrizacion(r) {
  return normTipoPermitido(r) === 'NO_APLICA';
}

function tpModalTitleForRow(r) {
  return rowNeedsTpParametrizacion(r) ? 'Parametrizar' : 'Editar';
}

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
  const [maxJornadaOrdinaria, setMaxJornadaOrdinaria] = useState(DEFAULT_MAX_JORNADA_ORDINARIA);
  const [maxJornadaOrdinariaId, setMaxJornadaOrdinariaId] = useState(null);
  const [minApoyoCop, setMinApoyoCop] = useState(DEFAULT_MIN_APOYO_COP);
  /** Texto libre en el input (solo dígitos); se valida al guardar — evita el “salto” a 500.000 al borrar. */
  const [minApoyoCopInput, setMinApoyoCopInput] = useState(String(DEFAULT_MIN_APOYO_COP));
  const [minApoyoCopId, setMinApoyoCopId] = useState(null);

  /** Pestaña: programa → tipo de práctica (cargue estudiantes / UEJOBS) */
  const [tpLoading, setTpLoading] = useState(false);
  const [tpList, setTpList] = useState([]);
  const [tpPagination, setTpPagination] = useState({ page: 1, pages: 1, total: 0, limit: TP_PAGE_SIZE });
  const [tpPage, setTpPage] = useState(1);
  const [tpSearchInput, setTpSearchInput] = useState('');
  const [tpSearchActive, setTpSearchActive] = useState('');
  const [tpMenuProgramId, setTpMenuProgramId] = useState(null);
  const [tpMenuAnchorRect, setTpMenuAnchorRect] = useState(null);
  const [tpModalRow, setTpModalRow] = useState(null);
  /** Selección múltiple: ids de `items` (listId tipo práctica). */
  const [tpModalSelectedIds, setTpModalSelectedIds] = useState([]);
  /** Si true, guardar null (no aplica UEJOBS). */
  const [tpModalNoAplica, setTpModalNoAplica] = useState(false);
  const [tpModalSaving, setTpModalSaving] = useState(false);
  const [tpCatalogItems, setTpCatalogItems] = useState([]);
  const [tpCatalogListId, setTpCatalogListId] = useState('');
  const [tpCatalogLoading, setTpCatalogLoading] = useState(false);
  /** Mismo listId que usa el listado (GET type-practice-rules → practiceTypeListId). */
  const [tpRulesPracticeListId, setTpRulesPracticeListId] = useState('');

  const tpEffectivePracticeListId = useMemo(() => {
    return (
      tpCatalogListId ||
      tpRulesPracticeListId ||
      (tpList[0] && tpList[0].practiceTypeListId ? String(tpList[0].practiceTypeListId) : '')
    );
  }, [tpCatalogListId, tpRulesPracticeListId, tpList]);

  const closeTpMenu = () => {
    setTpMenuProgramId(null);
    setTpMenuAnchorRect(null);
  };

  const closeTpModal = () => {
    if (tpModalSaving) return;
    setTpModalRow(null);
    setTpModalSelectedIds([]);
    setTpModalNoAplica(false);
  };

  const openTpModalForRow = (r) => {
    setTpModalRow(r);
    setTpModalNoAplica(false);
    const ids = (Array.isArray(r.typePracticeItemIds) && r.typePracticeItemIds.length > 0
      ? r.typePracticeItemIds
      : r.typePracticeItemId
        ? [r.typePracticeItemId]
        : []
    ).map(String);
    setTpModalSelectedIds(ids);
    closeTpMenu();
  };

  const toggleTpModalItem = (itemId) => {
    const sid = String(itemId);
    setTpModalNoAplica(false);
    setTpModalSelectedIds((prev) => {
      const set = new Set(prev.map(String));
      if (set.has(sid)) set.delete(sid);
      else set.add(sid);
      return [...set];
    });
  };

  const loadTypePracticeRules = useCallback(async () => {
    setTpLoading(true);
    try {
      const { data } = await api.get('/programs/type-practice-rules', {
        params: { page: tpPage, limit: TP_PAGE_SIZE, search: tpSearchActive || undefined },
      });
      const rows = data?.data || [];
      setTpList(rows);
      setTpRulesPracticeListId(data?.practiceTypeListId ? String(data.practiceTypeListId) : '');
      setTpPagination(data?.pagination || { page: 1, pages: 1, total: 0, limit: TP_PAGE_SIZE });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'No se pudo cargar la parametrización programa / tipo práctica.',
        confirmButtonColor: '#c41e3a',
      });
      setTpList([]);
      setTpRulesPracticeListId('');
    } finally {
      setTpLoading(false);
    }
  }, [tpPage, tpSearchActive]);

  useEffect(() => {
    if (activeTab !== TABS.length - 1) return;
    loadTypePracticeRules();
  }, [activeTab, loadTypePracticeRules]);

  useEffect(() => {
    if (activeTab !== TABS.length - 1) return;
    let cancelled = false;
    (async () => {
      setTpCatalogLoading(true);
      try {
        const { data } = await api.get('/programs/type-practice-rule-items');
        if (cancelled) return;
        setTpCatalogListId(data?.listId || '');
        setTpCatalogItems(Array.isArray(data?.data) ? data.data : []);
      } catch {
        if (!cancelled) {
          setTpCatalogItems([]);
          setTpCatalogListId('');
        }
      } finally {
        if (!cancelled) setTpCatalogLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== TABS.length - 1) {
      setTpMenuProgramId(null);
      setTpMenuAnchorRect(null);
    }
  }, [activeTab]);

  const handleTpSearch = (e) => {
    e.preventDefault();
    setTpPage(1);
    setTpSearchActive(tpSearchInput.trim());
  };

  const handleTpModalSave = async () => {
    if (!tpModalRow) return;
    if (!tpModalNoAplica && tpModalSelectedIds.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Seleccione tipos o «No aplica»',
        text: 'Elija uno o más ítems del catálogo (mismo listId que el API) o marque «No aplica al cargue UEJOBS».',
        confirmButtonColor: '#c41e3a',
      });
      return;
    }
    const programId = String(tpModalRow.programId);
    setTpModalSaving(true);
    try {
      const payload = tpModalNoAplica
        ? { typePracticeItemIds: null }
        : { typePracticeItemIds: tpModalSelectedIds };
      await api.put(`/programs/${programId}/type-practice-rule`, payload);
      Swal.fire({
        icon: 'success',
        title: 'Guardado',
        text: 'Regla actualizada para todas las facultades de este programa.',
        confirmButtonColor: '#c41e3a',
      });
      setTpModalRow(null);
      setTpModalSelectedIds([]);
      setTpModalNoAplica(false);
      await loadTypePracticeRules();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'No se pudo guardar.',
        confirmButtonColor: '#c41e3a',
      });
    } finally {
      setTpModalSaving(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get(`/parameters/code/${CODE_OPPORTUNITY_MIN_EXPIRY_DAYS}`).then(r => r.data).catch(() => null),
      api.get(`/parameters/code/${CODE_PRACTICE_START_DAYS_AFTER_EXPIRY}`).then(r => r.data).catch(() => null),
      api.get(`/parameters/code/${CODE_PRACTICE_END_DAYS_AFTER_START}`).then(r => r.data).catch(() => null),
      api.get(`/parameters/code/${CODE_PRACTICE_NO_STUDENTS_MESSAGE}`).then(r => r.data).catch(() => null),
      api.get(`/parameters/code/${CODE_DIAS_HABILES_ACEPTAR_SELECCION_MTM}`).then(r => r.data).catch(() => null),
      api.get(`/parameters/code/${CODE_PRACTICE_MAX_JORNADA_ORDINARIA_SEMANAL}`).then(r => r.data).catch(() => null),
      api.get(`/parameters/code/${CODE_PRACTICE_MIN_APOYO_ECONOMICO_COP}`).then(r => r.data).catch(() => null),
    ]).then(([p1, p2, p3, p4, p5, p6, p7]) => {
      if (p1) { setDays(typeof p1.value === 'number' ? p1.value : DEFAULT_DAYS); setParameterId(p1._id); }
      if (p2) { setPracticeStartDaysAfterExpiry(typeof p2.value === 'number' ? p2.value : DEFAULT_START_AFTER_EXPIRY); setPracticeStartId(p2._id); }
      if (p3) { setPracticeEndDaysAfterStart(typeof p3.value === 'number' ? p3.value : DEFAULT_END_AFTER_START); setPracticeEndId(p3._id); }
      if (p4) { setNoStudentsMessage(typeof p4.value === 'string' ? p4.value : DEFAULT_NO_STUDENTS_MSG); setNoStudentsMessageId(p4._id); }
      if (p5) { setDiasHabilesAceptarMTM(typeof p5.value === 'number' ? p5.value : DEFAULT_DIAS_HABILES_MTM); setDiasHabilesMTMId(p5._id); }
      if (p6 && typeof p6.value === 'number' && p6.value >= 1 && p6.value <= 48) {
        setMaxJornadaOrdinaria(p6.value);
        setMaxJornadaOrdinariaId(p6._id);
      }
      if (p7) {
        const v = typeof p7.value === 'number' ? p7.value : parseInt(String(p7.value || '').replace(/\D/g, ''), 10);
        if (Number.isFinite(v) && v >= 500000 && v <= 50000000) {
          setMinApoyoCop(v);
          setMinApoyoCopInput(String(v));
          setMinApoyoCopId(p7._id);
        }
      }
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

  const handleSaveMaxJornadaOrdinaria = async (e) => {
    e.preventDefault();
    const num = Math.max(1, Math.min(48, Number(maxJornadaOrdinaria) || DEFAULT_MAX_JORNADA_ORDINARIA));
    setSaving(true);
    try {
      const res = await saveParameter({
        parameterId: maxJornadaOrdinariaId,
        code: CODE_PRACTICE_MAX_JORNADA_ORDINARIA_SEMANAL,
        name: 'Máximo jornada ordinaria semanal (prácticas)',
        description: `Horas semanales máximas permitidas al crear/editar una oportunidad de práctica (campo jornada ordinaria semanal). Valor actual: ${num} h. Recomendado: 44 h.`,
        value: num,
      });
      if (res?.data?._id) setMaxJornadaOrdinariaId(res.data._id);
      setMaxJornadaOrdinaria(num);
      Swal.fire({ icon: 'success', title: 'Guardado', text: 'Límite de jornada ordinaria semanal actualizado.', confirmButtonColor: '#c41e3a' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar.', confirmButtonColor: '#c41e3a' });
    } finally { setSaving(false); }
  };

  const handleSaveMinApoyoCop = async (e) => {
    e.preventDefault();
    const digits = String(minApoyoCopInput || '').replace(/\D/g, '');
    const num = parseInt(digits, 10);
    if (!digits || !Number.isFinite(num)) {
      Swal.fire({ icon: 'warning', title: 'Valor requerido', text: 'Ingrese un monto en pesos (solo números).', confirmButtonColor: '#c41e3a' });
      return;
    }
    if (num < 500000 || num > 50000000) {
      Swal.fire({
        icon: 'warning',
        title: 'Rango no válido',
        html: `El monto debe estar entre <strong>$500.000</strong> y <strong>$50.000.000</strong> COP.`,
        confirmButtonColor: '#c41e3a',
      });
      return;
    }
    setSaving(true);
    try {
      const res = await saveParameter({
        parameterId: minApoyoCopId,
        code: CODE_PRACTICE_MIN_APOYO_ECONOMICO_COP,
        name: 'Mínimo apoyo económico prácticas (COP)',
        description: `Si la oportunidad indica auxilio económico, el monto de apoyo no puede ser menor a $${num.toLocaleString('es-CO')} COP. Actualizar cuando cambie el SMLMV.`,
        value: num,
      });
      if (res?.data?._id) setMinApoyoCopId(res.data._id);
      setMinApoyoCop(num);
      setMinApoyoCopInput(String(num));
      Swal.fire({ icon: 'success', title: 'Guardado', text: 'Monto mínimo de apoyo actualizado.', confirmButtonColor: '#c41e3a' });
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

              {activeTab === 5 && (
                <div className="reglas-card reglas-card--single">
                  <h4 className="reglas-card-title">Jornada ordinaria semanal (oportunidades de práctica)</h4>
                  <p className="reglas-card-desc">
                    Número máximo de <strong>horas semanales</strong> que se puede indicar en el campo &quot;Jornada ordinaria semanal&quot; al crear o editar una oportunidad de práctica. El sistema no permitirá guardar un valor superior. 
                  </p>
                  <form onSubmit={handleSaveMaxJornadaOrdinaria} className="reglas-form-row">
                    <span className="reglas-label">Máximo</span>
                    <input type="number" className="reglas-input-num" min={1} max={48} value={maxJornadaOrdinaria} onChange={(e) => setMaxJornadaOrdinaria(Math.max(1, Math.min(48, Number(e.target.value) || 1)))} />
                    <span className="reglas-unit">horas / semana</span>
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

              {activeTab === 6 && (
                <div className="reglas-card reglas-card--single reglas-card--apoyo">
                  <h4 className="reglas-card-title">Mínimo apoyo económico (prácticas)</h4>
                  <p className="reglas-card-desc reglas-card-desc--lead">
                    Si la oportunidad marca <strong>auxilio económico</strong>, el apoyo no puede ser menor a este monto en pesos colombianos (ej. SMLMV: $1.750.905). Actualice aquí cuando cambie la normativa.
                  </p>
                  <form onSubmit={handleSaveMinApoyoCop} className="reglas-form-row reglas-form-row--apoyo">
                    <label className="reglas-label reglas-label--block" htmlFor="reglas-min-apoyo-cop">Monto mínimo (COP)</label>
                    <input
                      id="reglas-min-apoyo-cop"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      className="reglas-input-cop-large"
                      placeholder="Ej: 1750905"
                      value={minApoyoCopInput}
                      onChange={(e) => setMinApoyoCopInput(e.target.value.replace(/\D/g, ''))}
                    />
                    <p className="reglas-apoyo-hint">Solo números. Entre $500.000 y $50.000.000. Puede borrar y escribir el monto completo; se valida al pulsar Guardar.</p>
                    <div className="reglas-apoyo-actions">
                      <button type="submit" className="btn-guardar btn-guardar--lg" disabled={saving}><FiSave className="btn-icon" />{saving ? 'Guardando...' : 'Guardar'}</button>
                    </div>
                  </form>
                  <p className="reglas-valor-preview">
                    Vista previa:{' '}
                    <strong>
                      {minApoyoCopInput
                        ? `$${(parseInt(minApoyoCopInput.replace(/\D/g, ''), 10) || 0).toLocaleString('es-CO')}`
                        : '—'}
                    </strong>
                    {minApoyoCopInput && (parseInt(minApoyoCopInput.replace(/\D/g, ''), 10) || 0) >= 500000 && (parseInt(minApoyoCopInput.replace(/\D/g, ''), 10) || 0) <= 50000000
                      ? ' COP'
                      : minApoyoCopInput
                        ? ' (revisá el rango antes de guardar)'
                        : ''}
                  </p>
                </div>
              )}

              {activeTab === 7 && (
                <div className="reglas-tp-section reglas-tp-section--pn">
                  <form className="reglas-tp-toolbar" onSubmit={handleTpSearch}>
                    <input
                      type="search"
                      className="reglas-tp-search-input"
                      placeholder="Buscar por nombre o código de programa..."
                      value={tpSearchInput}
                      onChange={(e) => setTpSearchInput(e.target.value)}
                      aria-label="Buscar programa"
                    />
                    <button type="submit" className="reglas-tp-btn-buscar" disabled={tpLoading}>
                      Buscar
                    </button>
                  </form>

                  <div className="reglas-tp-table-container">
                    {tpLoading ? (
                      <div className="reglas-tp-loading-container">
                        <div className="reglas-tp-loading-spinner" aria-hidden />
                        <p>Cargando programas...</p>
                      </div>
                    ) : tpList.length === 0 ? (
                      <div className="reglas-tp-empty-state">
                        <FiBook className="reglas-tp-empty-icon" aria-hidden />
                        <h3>No se encontraron programas</h3>
                        <p>
                          {tpSearchActive
                            ? 'Probá con otro nombre o código de programa.'
                            : 'No hay programas que mostrar en esta página.'}
                        </p>
                      </div>
                    ) : (
                      <table className="reglas-tp-table">
                        <thead>
                          <tr>
                            <th>Programa</th>
                            <th>Facultades (planes)</th>
                            <th>Tipo actual</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tpList.map((r) => {
                            const pid = String(r.programId);
                            return (
                              <tr key={pid}>
                                <td className="reglas-tp-td-programa">
                                  <strong>{r.name}</strong>
                                  {r.code ? (
                                    <span className="reglas-tp-code-sub">Código: {r.code}</span>
                                  ) : null}
                                </td>
                                <td>{r.programFacultyCount}</td>
                                <td className="reglas-tp-td-tipo">{renderTipoPracticaCell(r, tpCatalogItems)}</td>
                                <td className="reglas-tp-td-acciones">
                                  <div className="reglas-tp-options-wrap">
                                    <button
                                      type="button"
                                      className="reglas-tp-btn-opciones"
                                      onClick={(e) => {
                                        if (tpMenuProgramId === pid) {
                                          closeTpMenu();
                                        } else {
                                          setTpMenuProgramId(pid);
                                          setTpMenuAnchorRect(e.currentTarget.getBoundingClientRect());
                                        }
                                      }}
                                      title="Opciones"
                                      aria-expanded={tpMenuProgramId === pid}
                                      aria-haspopup="menu"
                                    >
                                      <FiMoreVertical /> Opciones
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {!tpLoading && tpPagination.total > 0 && (
                    <div className="reglas-tp-pagination" role="navigation" aria-label="Paginación de programas">
                      <span className="reglas-tp-pagination-info">
                        Mostrando{' '}
                        {((tpPagination.page - 1) * (tpPagination.limit || TP_PAGE_SIZE)) + 1}–
                        {Math.min(tpPagination.page * (tpPagination.limit || TP_PAGE_SIZE), tpPagination.total)} de{' '}
                        <strong>{tpPagination.total}</strong> programas
                      </span>
                      <div className="reglas-tp-pagination-controls">
                        <button
                          type="button"
                          className="reglas-tp-page-btn"
                          onClick={() => setTpPage(1)}
                          disabled={tpPage <= 1 || tpLoading}
                          title="Primera página"
                        >
                          «
                        </button>
                        <button
                          type="button"
                          className="reglas-tp-page-btn"
                          onClick={() => setTpPage((p) => Math.max(1, p - 1))}
                          disabled={tpPage <= 1 || tpLoading}
                        >
                          ‹ Anterior
                        </button>
                        {Array.from({ length: Math.min(5, tpPagination.pages) }, (_, i) => {
                          const half = 2;
                          let start = Math.max(1, tpPage - half);
                          const end = Math.min(tpPagination.pages, start + 4);
                          start = Math.max(1, end - 4);
                          return start + i;
                        })
                          .filter((n) => n >= 1 && n <= tpPagination.pages)
                          .map((n) => (
                            <button
                              key={n}
                              type="button"
                              className={`reglas-tp-page-btn ${n === tpPage ? 'reglas-tp-page-btn--active' : ''}`}
                              onClick={() => setTpPage(n)}
                              disabled={tpLoading}
                            >
                              {n}
                            </button>
                          ))}
                        <button
                          type="button"
                          className="reglas-tp-page-btn"
                          onClick={() => setTpPage((p) => Math.min(tpPagination.pages, p + 1))}
                          disabled={tpPage >= tpPagination.pages || tpLoading}
                        >
                          Siguiente ›
                        </button>
                        <button
                          type="button"
                          className="reglas-tp-page-btn"
                          onClick={() => setTpPage(tpPagination.pages)}
                          disabled={tpPage >= tpPagination.pages || tpLoading}
                          title="Última página"
                        >
                          »
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <OptionsMenuPortal
        open={activeTab === TABS.length - 1 && !!tpMenuProgramId}
        anchorRect={tpMenuAnchorRect}
        onClose={closeTpMenu}
      >
        {tpMenuProgramId && (() => {
          const row = tpList.find((x) => String(x.programId) === tpMenuProgramId);
          if (!row) return null;
          const parametrizar = rowNeedsTpParametrizacion(row);
          return (
            <button
              type="button"
              className="pn-options-item"
              onClick={() => openTpModalForRow(row)}
            >
              {parametrizar ? <FiPlusCircle /> : <FiEdit2 />}
              {parametrizar ? 'Parametrizar' : 'Editar'}
            </button>
          );
        })()}
      </OptionsMenuPortal>

      {createPortal(
        tpModalRow ? (
          <div
            className="reglas-tp-modal-overlay"
            role="presentation"
            onClick={() => !tpModalSaving && closeTpModal()}
          >
            <div
              className="pn-modal reglas-tp-modal-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="reglas-tp-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pn-modal-header">
                <h3 id="reglas-tp-modal-title">{tpModalTitleForRow(tpModalRow)}</h3>
                <button
                  type="button"
                  className="pn-modal-close"
                  onClick={closeTpModal}
                  disabled={tpModalSaving}
                  aria-label="Cerrar"
                >
                  <FiX />
                </button>
              </div>
              <div className="pn-modal-body">
                <p className="pn-step-desc">
                  Programa: <strong>{tpModalRow.name}</strong>
                  {tpModalRow.code ? ` · ${tpModalRow.code}` : ''}
                </p>
                <div className="reglas-tp-modal-field">
                  <span className="reglas-tp-modal-field-label" id="reglas-tp-modal-multiselect-label">
                    Ítems activos del listId{' '}
                    {tpEffectivePracticeListId ? <code>{tpEffectivePracticeListId}</code> : '(API)'} — todas las
                    facultades del programa
                  </span>
                  <label className="reglas-tp-modal-no-aplica">
                    <input
                      type="checkbox"
                      checked={tpModalNoAplica}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setTpModalNoAplica(on);
                        if (on) setTpModalSelectedIds([]);
                      }}
                      disabled={tpModalSaving || tpCatalogLoading}
                    />
                    No aplica al cargue UEJOBS
                  </label>
                  <ul
                    className="reglas-tp-modal-checklist"
                    role="group"
                    aria-labelledby="reglas-tp-modal-multiselect-label"
                    aria-disabled={tpModalNoAplica || tpCatalogLoading}
                  >
                    {tpCatalogItems.map((it) => {
                      const id = String(it._id);
                      const checked = tpModalSelectedIds.map(String).includes(id);
                      return (
                        <li key={id}>
                          <label className={tpModalNoAplica ? 'is-disabled' : ''}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTpModalItem(id)}
                              disabled={tpModalSaving || tpCatalogLoading || tpModalNoAplica}
                            />
                            <span className="reglas-tp-checklist-text">
                              {it.value}
                              {it.description ? (
                                <span className="reglas-tp-checklist-desc"> — {it.description}</span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  {tpCatalogLoading ? (
                    <p className="reglas-tp-catalog-loading">Cargando catálogo…</p>
                  ) : tpCatalogItems.length === 0 ? (
                    <p className="reglas-tp-catalog-empty">No hay ítems activos para este listId.</p>
                  ) : null}
                </div>
                <div className="reglas-tp-modal-actions">
                  <button
                    type="button"
                    className="pn-pagination-btn"
                    onClick={closeTpModal}
                    disabled={tpModalSaving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="pn-btn-crear"
                    onClick={handleTpModalSave}
                    disabled={
                      (!tpModalNoAplica && tpModalSelectedIds.length === 0) || tpModalSaving || tpCatalogLoading
                    }
                  >
                    <FiSave className="btn-icon" />
                    {tpModalSaving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null,
        document.body
      )}
    </div>
  );
}
