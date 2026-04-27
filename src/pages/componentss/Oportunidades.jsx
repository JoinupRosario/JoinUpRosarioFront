import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiRefreshCw, FiFilter, FiBookOpen, FiDollarSign, FiFileText, FiUsers, FiCalendar, FiMapPin, FiClock, FiBook, FiX, FiEdit, FiXCircle, FiCopy, FiList, FiArrowUp, FiArrowDown, FiAlertCircle, FiEye, FiTrash2, FiUpload } from 'react-icons/fi';
import { HiOutlineAcademicCap } from 'react-icons/hi';
import { useAuth } from '../../contexts/AuthContext';
import Swal from 'sweetalert2';
import api from '../../services/api';
import Select from 'react-select';
import '../styles/Oportunidades.css';

/** Estados solo de práctica (flujo revisión): MTM no aplica — no consultar monitorías. */
function shouldOmitMtmListado(estado) {
  const e = (estado && String(estado).trim()) || '';
  if (!e) return false;
  return ['En Revisión', 'Revisada', 'Rechazada'].includes(e);
}

/** Mapea filtro de estado del listado al enum MTM (Creada / Activa / Inactiva). */
function mapEstadoToMtm(estado) {
  const e = (estado && String(estado).trim()) || '';
  if (!e) return undefined;
  const m = { Creada: 'Creada', Activa: 'Activa', Cerrada: 'Inactiva', Vencida: 'Inactiva' };
  return m[e];
}

/** Valor enviado al API MTM: si ya es un estado real en BD, se usa tal cual; si no, compatibilidad con etiquetas antiguas. */
function resolveMtmEstadoFilter(estado) {
  const e = (estado && String(estado).trim()) || '';
  if (!e) return undefined;
  if (e === 'Borrador') return 'Creada';
  if (['Creada', 'Activa', 'Inactiva'].includes(e)) return e;
  return mapEstadoToMtm(e);
}

function createEmptyOportunidadesFilters() {
  return {
    numeroOportunidad: '',
    nombreCargo: '',
    empresa: '',
    empresaConfidenciales: false,
    fechaCierreDesde: '',
    fechaCierreHasta: '',
    formacionAcademica: '',
    requisitos: '',
    estado: '',
    conPostulaciones: false
  };
}

/**
 * Prácticas: evita volver a ofrecer "Seleccionar" y el modal de tutor si el cierre con contratación
 * o la selección con tutor ya dejaron registro en la oportunidad (cierre*), aunque el GET de detalle
 * devolviera un estado desfasado.
 */
function postulacionPracticaYaGestionada(opp, aplicacionDetail) {
  if (!opp || !aplicacionDetail || aplicacionDetail._source !== 'postulacion_oportunidad') return false;
  const st = aplicacionDetail.estado;
  if (st === 'seleccionado_empresa' || st === 'aceptado_estudiante') return true;
  const pid = String(aplicacionDetail._id);
  const cierreList = opp.cierrePostulantesSeleccionados || [];
  for (const x of cierreList) {
    const id = x && typeof x === 'object' && x != null && x._id != null ? x._id : x;
    if (String(id) === pid) return true;
  }
  const tut = opp.cierreDatosTutor || [];
  for (const row of tut) {
    if (!row) continue;
    const tPid = row.postulacionId && typeof row.postulacionId === 'object' && row.postulacionId._id
      ? row.postulacionId._id
      : row.postulacionId;
    if (tPid != null && String(tPid) === pid) return true;
  }
  return false;
}

/** Mapa tutor + ids a preseleccionar al abrir «Cerrar oportunidad» (práctica con contratación). Incluye quienes ya tienen fila en cierreDatosTutor o estado seleccionado, no solo cierrePostulantesSeleccionados (ese arreglo solo se llena al cerrar). */
function buildCerrarPracticaPrefill(opp, list) {
  const datosMap = {};
  const tutores = opp?.cierreDatosTutor || [];
  for (const t of tutores) {
    const pid = t.postulacionId && typeof t.postulacionId === 'object' && t.postulacionId._id
      ? t.postulacionId._id
      : t.postulacionId;
    const pidStr = pid ? pid.toString() : '';
    if (!pidStr) continue;
    datosMap[pidStr] = {
      nombreTutor: t.nombreTutor || '',
      apellidoTutor: t.apellidoTutor || '',
      emailTutor: t.emailTutor || '',
      telefonoTutor: t.telefonoTutor || '',
      cargoTutor: t.cargoTutor || '',
      tipoIdentTutor: t.tipoIdentTutor || '',
      identificacionTutor: t.identificacionTutor || '',
      arlEmpresa: (t.arlEmpresa && typeof t.arlEmpresa === 'object' && t.arlEmpresa._id)
        ? t.arlEmpresa._id
        : (t.arlEmpresa || ''),
      fechaInicioPractica: t.fechaInicioPractica
        ? (typeof t.fechaInicioPractica === 'string'
          ? t.fechaInicioPractica.slice(0, 10)
          : new Date(t.fechaInicioPractica).toISOString().slice(0, 10))
        : '',
    };
  }
  const inList = (idStr) => (list || []).some((p) => (p._id?.toString?.() || p._id) === idStr);
  const rawSel = opp?.cierrePostulantesSeleccionados || [];
  const fromCierreSel = rawSel
    .map((x) => (x && typeof x === 'object' && x._id ? x._id : x))
    .map((id) => id?.toString?.() || String(id))
    .filter((id) => inList(id));
  const fromTutorKeys = Object.keys(datosMap).filter((id) => inList(id));
  const fromEstado = (list || [])
    .filter((p) => p.estado === 'seleccionado_empresa')
    .map((p) => p._id?.toString?.() || String(p._id));
  const vacantes = Math.max(1, Number(opp?.vacantes) || 1);
  const merged = [...new Set([...fromCierreSel, ...fromTutorKeys, ...fromEstado])].filter(Boolean);
  const withDataFirst = [...merged].sort((a, b) => {
    const score = (id) => {
      const d = datosMap[id];
      if (!d) return 0;
      const vals = [d.nombreTutor, d.apellidoTutor, d.emailTutor, d.telefonoTutor, d.cargoTutor, d.fechaInicioPractica].filter((v) => v != null && String(v).trim() !== '');
      return vals.length;
    };
    return score(b) - score(a);
  });
  const validIds = withDataFirst.slice(0, vacantes);
  return { validIds, datosMap };
}

/** Construye editFormData desde una oportunidad (poblada o no) para que los selects coincidan. */
export function buildEditFormDataFromOpp(opp) {
  if (!opp) return null;
  return {
    nombreCargo: opp.nombreCargo || '',
    auxilioEconomico: opp.auxilioEconomico || false,
    requiereConfidencialidad: opp.requiereConfidencialidad || false,
    apoyoEconomico: opp.apoyoEconomico ? opp.apoyoEconomico.toString() : '',
    tipoVinculacion: (opp.tipoVinculacion && typeof opp.tipoVinculacion === 'object' && opp.tipoVinculacion._id) ? opp.tipoVinculacion._id : (opp.tipoVinculacion || ''),
    periodo: (opp.periodo && typeof opp.periodo === 'object' && opp.periodo._id) ? opp.periodo._id : (opp.periodo || ''),
    vacantes: opp.vacantes ? opp.vacantes.toString() : '',
    fechaVencimiento: opp.fechaVencimiento ? new Date(opp.fechaVencimiento).toISOString().split('T')[0] : '',
    pais: (opp.pais && typeof opp.pais === 'object' && opp.pais._id) ? opp.pais._id : (opp.pais || ''),
    ciudad: (opp.ciudad && typeof opp.ciudad === 'object' && opp.ciudad._id) ? opp.ciudad._id : (opp.ciudad || ''),
    jornadaOrdinariaSemanal: opp.jornadaOrdinariaSemanal ? opp.jornadaOrdinariaSemanal.toString() : '',
    dedicacion: (opp.dedicacion && typeof opp.dedicacion === 'object' && opp.dedicacion._id) ? opp.dedicacion._id : (opp.dedicacion || ''),
    fechaInicioPractica: opp.fechaInicioPractica ? new Date(opp.fechaInicioPractica).toISOString().split('T')[0] : '',
    fechaFinPractica: opp.fechaFinPractica ? new Date(opp.fechaFinPractica).toISOString().split('T')[0] : '',
    horario: opp.horario || '',
    areaDesempeno: (opp.areaDesempeno && typeof opp.areaDesempeno === 'object' && opp.areaDesempeno._id) ? opp.areaDesempeno._id : (opp.areaDesempeno || ''),
    enlacesFormatoEspecificos: opp.enlacesFormatoEspecificos || '',
    salarioEmocional: (() => {
      const arr = Array.isArray(opp.salarioEmocional) ? opp.salarioEmocional : (opp.salarioEmocional ? [opp.salarioEmocional] : []);
      return arr.map(x => (x && typeof x === 'object' && x._id) ? x._id : x);
    })(),
    promedioMinimoRequerido: opp.promedioMinimoRequerido || '',
    formacionAcademica: opp.formacionAcademica || [],
    idiomas: opp.idiomas || [],
    funciones: opp.funciones || '',
    requisitos: opp.requisitos || '',
    documentos: Array.isArray(opp.documentos) ? opp.documentos : [],
  };
}

export default function Oportunidades({ onVolver, entityPortalMode = false, entityViewOpportunityId = null }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  /** Portal entidad: detalle de una práctica (solo lectura de ficha; gestión de postulantes como admin). */
  const esEntidadSoloLectura = useMemo(
    () => Boolean(entityPortalMode && entityViewOpportunityId),
    [entityPortalMode, entityViewOpportunityId]
  );
  const [loading, setLoading] = useState(true);
  const [companySearchResults, setCompanySearchResults] = useState([]);
  const [companySearchLoading, setCompanySearchLoading] = useState(false);
  const [vista, setVista] = useState('lista'); // lista | crear | detalle | editar
  const [listaTab, setListaTab] = useState('practicas'); // practicas | monitorias
  const [oportunidadSeleccionada, setOportunidadSeleccionada] = useState(null);
  const [showModalAprobacion, setShowModalAprobacion] = useState(false);
  const [showModalRechazo, setShowModalRechazo] = useState(false);
  const [showModalCerrarOportunidad, setShowModalCerrarOportunidad] = useState(false);
  const [cerrarContrato, setCerrarContrato] = useState('');
  const [cerrarMotivoNo, setCerrarMotivoNo] = useState('');
  const [cerrarMotivoNoOtro, setCerrarMotivoNoOtro] = useState('');
  const [postulantesParaCerrar, setPostulantesParaCerrar] = useState([]);
  const [selectedPostulantesCerrar, setSelectedPostulantesCerrar] = useState([]);
  const [datosTutorCerrar, setDatosTutorCerrar] = useState({});
  const [loadingPostulantesCerrar, setLoadingPostulantesCerrar] = useState(false);
  const [showModalHistorial, setShowModalHistorial] = useState(false);
  const [showModalAplicaciones, setShowModalAplicaciones] = useState(false);
  const [aplicacionesList, setAplicacionesList] = useState([]);
  const [loadingAplicaciones, setLoadingAplicaciones] = useState(false);
  const [aplicacionDetail, setAplicacionDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedPostulacionId, setSelectedPostulacionId] = useState(null);
  /** Práctica: modal datos tutor al seleccionar desde aplicaciones (mismo criterio que cerrar con contratación). */
  const [showModalSeleccionarPractica, setShowModalSeleccionarPractica] = useState(false);
  const [postulacionIdSeleccionPractica, setPostulacionIdSeleccionPractica] = useState(null);
  const [datosTutorSeleccionPractica, setDatosTutorSeleccionPractica] = useState({
    nombreTutor: '',
    apellidoTutor: '',
    emailTutor: '',
    telefonoTutor: '',
    cargoTutor: '',
    tipoIdentTutor: '',
    identificacionTutor: '',
    arlEmpresa: '',
    fechaInicioPractica: '',
  });
  const [historialEstados, setHistorialEstados] = useState([]);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [motivoRechazoOtro, setMotivoRechazoOtro] = useState('');
  const [editFormData, setEditFormData] = useState(null);
  const [editSelectedCompany, setEditSelectedCompany] = useState(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false); // Controla si está editando en vista detalle
  // Estados para edición
  const [editNewProgramLevel, setEditNewProgramLevel] = useState('');
  const [editNewProgramName, setEditNewProgramName] = useState('');
  const [editNewLanguage, setEditNewLanguage] = useState('');
  const [editNewLanguageLevel, setEditNewLanguageLevel] = useState('');
  const [editShowProgramsModal, setEditShowProgramsModal] = useState(false);
  const [editShowLanguagesModal, setEditShowLanguagesModal] = useState(false);
  const [editSalarioEmocionalSearch, setEditSalarioEmocionalSearch] = useState('');
  const [editShowSalarioEmocionalDropdown, setEditShowSalarioEmocionalDropdown] = useState(false);
  const [editCities, setEditCities] = useState([]);
  
  // Estados para datos dinámicos desde Item
  const [linkageTypes, setLinkageTypes] = useState([]);
  const [dedicationTypes, setDedicationTypes] = useState([]);
  const [performanceAreas, setPerformanceAreas] = useState([]);
  const [emotionalSalaryItems, setEmotionalSalaryItems] = useState([]);
  const [arlItems, setArlItems] = useState([]);
  const [selectedLinkageDescription, setSelectedLinkageDescription] = useState('');
  
  // Filtros independientes por pestaña (prácticas vs monitorías)
  const [filtersPracticas, setFiltersPracticas] = useState(createEmptyOportunidadesFilters);
  const [filtersMonitorias, setFiltersMonitorias] = useState(createEmptyOportunidadesFilters);
  const filters = listaTab === 'practicas' ? filtersPracticas : filtersMonitorias;
  const setFilters = (next) => {
    if (listaTab === 'practicas') setFiltersPracticas(next);
    else setFiltersMonitorias(next);
  };
  /** Paginación independiente por pestaña (prácticas vs MTM). */
  const [pagePracticas, setPagePracticas] = useState(1);
  const [pageMtm, setPageMtm] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPagesPracticas, setTotalPagesPracticas] = useState(1);
  const [totalPagesMtm, setTotalPagesMtm] = useState(1);
  const [totalPracticas, setTotalPracticas] = useState(0);
  const [totalMtm, setTotalMtm] = useState(0);
  const [practicasList, setPracticasList] = useState([]);
  const [mtmList, setMtmList] = useState([]);
  /** Estados distintos en BD para el filtro (por pestaña). */
  const [estadosPracticaOpts, setEstadosPracticaOpts] = useState([]);
  const [estadosMtmOpts, setEstadosMtmOpts] = useState([]);
  /** Lista y paginación según pestaña activa (totales vienen del backend). */
  const oportunidades = listaTab === 'practicas' ? practicasList : mtmList;
  const currentPage = listaTab === 'practicas' ? pagePracticas : pageMtm;
  const totalPages = listaTab === 'practicas' ? totalPagesPracticas : totalPagesMtm;
  const [sortField, setSortField] = useState('fechaCreacion');
  const [sortDirection, setSortDirection] = useState('descendente');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companySearch, setCompanySearch] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [tipoOportunidad, setTipoOportunidad] = useState(null); // 'practica' | 'monitoria'
  const [showModalInfo, setShowModalInfo] = useState(false);
  const [pendingTipoOportunidad, setPendingTipoOportunidad] = useState(null); // Estado intermedio para cambiar tipo después de cerrar modal
  const [loadingUniversidad, setLoadingUniversidad] = useState(false);
  const [showSalarioEmocionalDropdown, setShowSalarioEmocionalDropdown] = useState(false);
  const [salarioEmocionalSearch, setSalarioEmocionalSearch] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, bottom: null });
  const [dropdownOpenUp, setDropdownOpenUp] = useState(false);
  const salarioEmocionalInputRef = useRef(null);
  
  // Estados para modales de formación académica e idiomas
  const [showProgramsModal, setShowProgramsModal] = useState(false);
  const [newProgramLevel, setNewProgramLevel] = useState('');
  const [newProgramName, setNewProgramName] = useState('');
  // Modal de programas MTM
  const [showMtmProgramsModal, setShowMtmProgramsModal] = useState(false);
  const [mtmProgramsModalForEdit, setMtmProgramsModalForEdit] = useState(false);
  const [newMtmProgramLevel, setNewMtmProgramLevel] = useState('');
  const [newMtmProgramName, setNewMtmProgramName] = useState('');
  // Programas dinámicos desde el modelo Program (compartido por ambos modales)
  const [allPrograms, setAllPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  // Programas con condición curricular activa para el periodo de la oportunidad (solo práctica)
  const [programIdsHabilitadosPeriodo, setProgramIdsHabilitadosPeriodo] = useState([]);
  const [noStudentsMessageFormacion, setNoStudentsMessageFormacion] = useState('(no hay estudiantes para este periodo)');
  const [showLanguagesModal, setShowLanguagesModal] = useState(false);
  const [newLanguage, setNewLanguage] = useState('');
  const [newLanguageLevel, setNewLanguageLevel] = useState('');
  
  // Estados para el formulario
  const [formData, setFormData] = useState({
    nombreCargo: '',
    auxilioEconomico: false,
    requiereConfidencialidad: false,
    apoyoEconomico: '',
    tipoVinculacion: '',
    periodo: '',
    vacantes: '',
    fechaVencimiento: '',
    pais: '',
    ciudad: '',
    jornadaOrdinariaSemanal: '',
    dedicacion: '',
    fechaInicioPractica: '',
    fechaFinPractica: '',
    horario: '',
    areaDesempeno: '',
    enlacesFormatoEspecificos: '',
    primerDocumento: null,
    primerDocumentoNombre: '',
    primerDocumentoRequerido: false,
    segundoDocumento: null,
    segundoDocumentoNombre: '',
    tercerDocumento: null,
    tercerDocumentoNombre: '',
    salarioEmocional: [],
    promedioMinimoRequerido: '',
    formacionAcademica: [],
    idiomas: [],
    funciones: '',
    requisitos: ''
  });
  
  // ── Estados para países y ciudades (desde backend: Country, City)
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);

  // ── Estados exclusivos para formulario MTM ─────────────────────────────────
  const [mtmDedicacionHoras, setMtmDedicacionHoras] = useState('');
  const [mtmValorPorHora, setMtmValorPorHora] = useState('');
  const [mtmCategoria, setMtmCategoria] = useState('');
  const [mtmNombreProfesor, setMtmNombreProfesor] = useState('');
  const [mtmUnidadAcademica, setMtmUnidadAcademica] = useState('');
  const [mtmGrupo, setMtmGrupo] = useState('');
  const [mtmAsignaturas, setMtmAsignaturas] = useState([]);
  const [mtmProgramas, setMtmProgramas] = useState([]);
  const [mtmAsigSearch, setMtmAsigSearch] = useState('');
  const [mtmAsigResults, setMtmAsigResults] = useState([]);
  const [mtmAsigLoading, setMtmAsigLoading] = useState(false);
  const [showMtmAsigDrop, setShowMtmAsigDrop] = useState(false);
  const [mtmProgramaSearch, setMtmProgramaSearch] = useState('');
  const [mtmProgramaResults, setMtmProgramaResults] = useState([]);
  const [showMtmProgramaDrop, setShowMtmProgramaDrop] = useState(false);
  const mtmAsigTimer = useRef(null);
  const mtmProgramaTimer = useRef(null);
  // Profesor responsable (usuarios administrativos) — crear/editar MTM
  const [mtmProfesorResponsable, setMtmProfesorResponsable] = useState('');
  const [mtmProfesorDisplay, setMtmProfesorDisplay] = useState('');
  const [mtmProfesorSearch, setMtmProfesorSearch] = useState('');
  const [mtmProfesorResults, setMtmProfesorResults] = useState([]);
  const [mtmProfesorLoading, setMtmProfesorLoading] = useState(false);
  const [mtmProfesorError, setMtmProfesorError] = useState(false);
  const [showMtmProfesorDrop, setShowMtmProfesorDrop] = useState(false);
  const mtmProfesorWrapRef = useRef(null);
  // Datos paramétricos MTM
  const [mtmDedicacionItems, setMtmDedicacionItems] = useState([]);
  const [mtmValorItems, setMtmValorItems] = useState([]);
  const [mtmVinculacionItems, setMtmVinculacionItems] = useState([]);
  const [mtmCategoriaItems, setMtmCategoriaItems] = useState([]);
  const [mtmPeriodos, setMtmPeriodos] = useState([]);
  const [practicaPeriodos, setPracticaPeriodos] = useState([]);
  const [opportunityMinExpiryDays, setOpportunityMinExpiryDays] = useState(5); // mínimo días para fecha vencimiento (regla de negocio)
  const [practiceStartDaysAfterExpiry, setPracticeStartDaysAfterExpiry] = useState(0); // fecha inicio práctica: mínimo X días después de vencimiento
  const [practiceEndDaysAfterStart, setPracticeEndDaysAfterStart] = useState(1); // fecha fin práctica: mínimo X días después de inicio
  const [maxJornadaOrdinariaSemanal, setMaxJornadaOrdinariaSemanal] = useState(44);
  const [minApoyoEconomicoCOP, setMinApoyoEconomicoCOP] = useState(1750905);
  // ── Edición en detalle MTM ─────────────────────────────────────────────────
  const [isMtmEditing, setIsMtmEditing] = useState(false);
  const [mtmEditData, setMtmEditData] = useState(null);

  // Opciones de salario emocional desde Item (L_EMOTIONAL_SALARY)
  const opcionesSalarioEmocional = useMemo(() => 
    emotionalSalaryItems.map(item => ({ 
      value: item._id, 
      label: item.description || item.value 
    })), 
    [emotionalSalaryItems]
  );

  // Filtrar opciones de salario emocional
  const filteredSalarioEmocional = useMemo(() => {
    if (!salarioEmocionalSearch.trim()) return opcionesSalarioEmocional;
    const q = salarioEmocionalSearch.toLowerCase();
    return opcionesSalarioEmocional.filter(opcion =>
      opcion.label.toLowerCase().includes(q)
    );
  }, [salarioEmocionalSearch, opcionesSalarioEmocional]);

  // Filtrar opciones que ya están seleccionadas para no mostrarlas en el dropdown (vista crear)
  const filteredSalarioEmocionalDisponibles = useMemo(() => {
    if (!formData.salarioEmocional || formData.salarioEmocional.length === 0) return filteredSalarioEmocional;
    return filteredSalarioEmocional.filter(opcion => 
      !formData.salarioEmocional.includes(opcion.value)
    );
  }, [filteredSalarioEmocional, formData.salarioEmocional]);

  const countrySelectOptionsCrear = useMemo(
    () => countries.map((c) => ({ value: c._id, label: c.name })),
    [countries]
  );
  const countrySelectValueCrear = useMemo(
    () => countrySelectOptionsCrear.find((o) => o.value === formData.pais) || null,
    [countrySelectOptionsCrear, formData.pais]
  );
  const citySelectOptionsCrear = useMemo(
    () => cities.map((c) => ({ value: c._id, label: c.name })),
    [cities]
  );
  const citySelectValueCrear = useMemo(
    () => citySelectOptionsCrear.find((o) => o.value === formData.ciudad) || null,
    [citySelectOptionsCrear, formData.ciudad]
  );
  const oportunidadLocationSelectStyles = useMemo(
    () => ({
      control: (base, state) => ({
        ...base,
        minHeight: 42,
        borderRadius: 6,
        borderColor: state.isFocused ? '#c41e3a' : '#d1d5db',
        boxShadow: state.isFocused ? '0 0 0 3px rgba(196, 30, 58, 0.1)' : 'none',
        '&:hover': { borderColor: state.isFocused ? '#c41e3a' : '#d1d5db' },
      }),
      menu: (base) => ({ ...base, zIndex: 50 }),
      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    }),
    []
  );

  // Verificar si el usuario es administrativo
  // Todos los usuarios con modulo 'administrativo' deben seleccionar empresa
  // Leer desde localStorage si no está en el contexto
  const modulo = user?.modulo || localStorage.getItem('modulo');
  const isAdmin = modulo === 'administrativo';

  const mapMtmRowForList = (op) => ({
    ...op,
    tipo: 'monitoria',
    _isMTM: true,
    estado: op.estado === 'Activa' ? 'Activa' : op.estado === 'Inactiva' ? 'Cerrada' : 'Creada',
    postulaciones: op.postulaciones || [],
    apoyoEconomico: null,
    formacionAcademica: [],
    company: op.company || null
  });

  const loadOportunidades = async (override) => {
    if (entityPortalMode && entityViewOpportunityId) {
      return;
    }
    try {
      setLoading(true);
      const fp = override?.fp ?? filtersPracticas;
      const fm = override?.fm ?? filtersMonitorias;

      const params = {
        page: pagePracticas,
        limit: pageSize,
        ...fp,
        sortField: sortField,
        sortDirection: sortDirection === 'descendente' ? 'desc' : 'asc'
      };
      if (params.conPostulaciones) {
        params.conPostulaciones = 'true';
      } else {
        delete params.conPostulaciones;
      }

      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      // Pestañas separan prácticas vs monitorías; siempre se cargan ambos listados salvo omisiones de negocio.
      const fetchPractica = true;
      const omitMtm = shouldOmitMtmListado(fp.estado);
      const omitMtmFormacion = !!(fm.formacionAcademica && String(fm.formacionAcademica).trim());
      const fetchMtm = !omitMtm && !omitMtmFormacion;

      const mtmEstado = resolveMtmEstadoFilter(fm.estado);
      const mtmParams = {
        page: pageMtm,
        limit: pageSize,
        nombreCargo: (fm.nombreCargo || '').trim() || undefined,
        empresa: (fm.empresa || '').trim() || undefined,
        estado: mtmEstado,
        numeroOportunidad: (fm.numeroOportunidad || '').trim() || undefined,
        fechaCierreDesde: fm.fechaCierreDesde || undefined,
        fechaCierreHasta: fm.fechaCierreHasta || undefined,
        requisitos: (fm.requisitos || '').trim() || undefined,
        ...(fm.conPostulaciones ? { conPostulaciones: 'true' } : {}),
      };
      Object.keys(mtmParams).forEach((key) => {
        if (mtmParams[key] === undefined || mtmParams[key] === '') delete mtmParams[key];
      });

      let practRes = { data: { opportunities: [], totalPages: 1, total: 0, currentPage: 1 } };
      let mtmRes = { data: { data: [], pagination: { total: 0, totalPages: 1 } } };

      if (fetchPractica && fetchMtm) {
        [practRes, mtmRes] = await Promise.all([
          api.get('/opportunities', { params }),
          api.get('/oportunidades-mtm', { params: mtmParams }).catch(() => ({ data: { data: [], pagination: { total: 0, totalPages: 1 } } }))
        ]);
      } else if (fetchPractica) {
        practRes = await api.get('/opportunities', { params });
        mtmRes = { data: { data: [], pagination: { total: 0, totalPages: 1 } } };
      } else if (fetchMtm) {
        practRes = { data: { opportunities: [], totalPages: 1, total: 0, currentPage: 1 } };
        mtmRes = await api.get('/oportunidades-mtm', { params: mtmParams }).catch(() => ({ data: { data: [], pagination: { total: 0, totalPages: 1 } } }));
      } else {
        practRes = { data: { opportunities: [], totalPages: 1, total: 0, currentPage: 1 } };
        mtmRes = { data: { data: [], pagination: { total: 0, totalPages: 1 } } };
      }

      const regular = practRes.data.opportunities || practRes.data.data || [];
      const mtm = (mtmRes.data?.data || []).map(mapMtmRowForList);

      setPracticasList(regular);
      setTotalPracticas(practRes.data.total ?? 0);
      setTotalPagesPracticas(practRes.data.totalPages || 1);

      setMtmList(mtm);
      const pagM = mtmRes.data?.pagination || {};
      setTotalMtm(Number(pagM.total ?? 0));
      setTotalPagesMtm(Number(pagM.totalPages || 1));
    } catch (e) {
      console.error('Error cargando oportunidades', e);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las oportunidades',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    } finally {
      setLoading(false);
    }
  };

  // Búsqueda de empresas solo al escribir (query al backend con coincidencias)
  const companySearchDebounceRef = useRef(null);
  useEffect(() => {
    if (!isAdmin) {
      return () => {};
    }
    const q = companySearch.trim();
    if (q.length === 0) {
      setCompanySearchResults([]);
      return () => {
        if (companySearchDebounceRef.current) clearTimeout(companySearchDebounceRef.current);
      };
    }
    if (companySearchDebounceRef.current) clearTimeout(companySearchDebounceRef.current);
    companySearchDebounceRef.current = setTimeout(async () => {
      try {
        setCompanySearchLoading(true);
        const { data } = await api.get('/companies', { params: { search: q, limit: 20, page: 1 } });
        setCompanySearchResults(data?.data || data?.companies || []);
      } catch (e) {
        console.error('Error buscando empresas', e);
        setCompanySearchResults([]);
      } finally {
        setCompanySearchLoading(false);
      }
    }, 300);
    return () => {
      if (companySearchDebounceRef.current) clearTimeout(companySearchDebounceRef.current);
    };
  }, [isAdmin, companySearch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r1, r2] = await Promise.all([
          api.get('/opportunities/meta/distinct-estados').catch(() => ({ data: { estados: [] } })),
          api.get('/oportunidades-mtm/meta/distinct-estados').catch(() => ({ data: { estados: [] } })),
        ]);
        if (!cancelled) {
          setEstadosPracticaOpts(Array.isArray(r1.data?.estados) ? r1.data.estados : []);
          setEstadosMtmOpts(Array.isArray(r2.data?.estados) ? r2.data.estados : []);
        }
      } catch {
        if (!cancelled) {
          setEstadosPracticaOpts([]);
          setEstadosMtmOpts([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // Cargar países desde backend (Country)
    api.get('/locations/countries', { params: { limit: 1000 } })
      .then(res => setCountries(res.data?.data || []))
      .catch(e => console.error('[Oportunidades] Error cargando países:', e));
    loadItemsData();
  }, [isAdmin]);

  // Períodos activos de práctica para formularios de creación/edición de prácticas
  useEffect(() => {
    api.get('/periodos', { params: { tipo: 'practica', estado: 'Activo', limit: 100 } })
      .then(res => setPracticaPeriodos(res.data?.data || res.data || []))
      .catch(e => console.error('[Oportunidades] Error cargando períodos de práctica:', e));
  }, []);

  // Reglas de negocio: días para vencimiento, inicio práctica (después de vencimiento), fin práctica (después de inicio)
  useEffect(() => {
    Promise.all([
      api.get('/parameters/code/OPPORTUNITY_MIN_EXPIRY_DAYS').then(r => r.data?.value).catch(() => null),
      api.get('/parameters/code/PRACTICE_START_DAYS_AFTER_EXPIRY').then(r => r.data?.value).catch(() => null),
      api.get('/parameters/code/PRACTICE_END_DAYS_AFTER_START').then(r => r.data?.value).catch(() => null),
      api.get('/parameters/code/PRACTICE_NO_STUDENTS_MESSAGE').then(r => r.data?.value).catch(() => null),
      api.get('/parameters/code/PRACTICE_MAX_JORNADA_ORDINARIA_SEMANAL').then(r => r.data?.value).catch(() => null),
      api.get('/parameters/code/PRACTICE_MIN_APOYO_ECONOMICO_COP').then(r => r.data?.value).catch(() => null),
    ]).then(([v1, v2, v3, v4, v5, v6]) => {
      if (typeof v1 === 'number' && v1 >= 1) setOpportunityMinExpiryDays(v1);
      if (typeof v2 === 'number' && v2 >= 0) setPracticeStartDaysAfterExpiry(v2);
      if (typeof v3 === 'number' && v3 >= 0) setPracticeEndDaysAfterStart(v3);
      if (typeof v4 === 'string' && v4.trim()) setNoStudentsMessageFormacion(v4.trim());
      if (typeof v5 === 'number' && v5 >= 1 && v5 <= 48) setMaxJornadaOrdinariaSemanal(v5);
      const apMin = typeof v6 === 'number' ? v6 : parseInt(String(v6 ?? '').replace(/\D/g, ''), 10);
      if (Number.isFinite(apMin) && apMin >= 500000 && apMin <= 50000000) setMinApoyoEconomicoCOP(apMin);
    });
  }, []);

  const minDateVencimiento = (() => {
    const d = new Date();
    d.setDate(d.getDate() + opportunityMinExpiryDays);
    return d.toISOString().slice(0, 10);
  })();

  const addDaysToDate = (isoDateStr, daysToAdd) => {
    if (!isoDateStr) return '';
    const d = new Date(isoDateStr);
    d.setDate(d.getDate() + (daysToAdd || 0));
    return d.toISOString().slice(0, 10);
  };

  /** Valor numérico mayor al máximo configurado en reglas de negocio (feedback inmediato en el campo). */
  const jornadaExcedeMaximo = (valorRaw) => {
    if (valorRaw === '' || valorRaw == null) return false;
    const n = Number(String(valorRaw).trim());
    if (!Number.isFinite(n) || Number.isNaN(n)) return false;
    return n > maxJornadaOrdinariaSemanal;
  };

  const estiloInputJornadaInvalida = {
    borderColor: '#dc2626',
    backgroundColor: '#fff8f8',
    boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.2)',
  };

  /** Con auxilio activo: vacío o monto &lt; mínimo legal/configurado (mismo feedback visual que jornada). */
  const apoyoMenorAlMinimoLegal = (auxilioActivo, apoyoRaw) => {
    if (!auxilioActivo) return false;
    const digits = String(apoyoRaw ?? '').replace(/\D/g, '');
    if (!digits) return true;
    const n = parseInt(digits, 10);
    return !Number.isFinite(n) || n < minApoyoEconomicoCOP;
  };

  // Función para cargar datos dinámicos desde Item
  const loadItemsData = async () => {
    try {
      // Cargar Tipos de Vinculación (L_CONTRACT_TYPE_ACADEMIC_PRACTICE)
      const { data: linkageData } = await api.get('/locations/items/L_CONTRACT_TYPE_ACADEMIC_PRACTICE', { params: { limit: 100, isActive: true } });
      setLinkageTypes(linkageData.data || []);

      // Cargar Dedicación (L_DEDICATION_JOB_OFFER)
      const { data: dedicationData } = await api.get('/locations/items/L_DEDICATION_JOB_OFFER', { params: { limit: 100 } });
      setDedicationTypes(dedicationData.data || []);

      // Cargar Áreas de Desempeño (L_INTEREST_AREA)
      const { data: performanceData } = await api.get('/locations/items/L_INTEREST_AREA', { params: { limit: 100 } });
      setPerformanceAreas(performanceData.data || []);

      // Cargar Salario Emocional (L_EMOTIONAL_SALARY)
      const { data: emotionalData } = await api.get('/locations/items/L_EMOTIONAL_SALARY', { params: { limit: 100 } });
      setEmotionalSalaryItems(emotionalData.data || []);

      // Cargar ARL Empresa (Items con listId para ARL)
      const { data: arlData } = await api.get('/locations/items/L_ARL', { params: { limit: 100 } }).catch(() => ({ data: { data: [] } }));
      setArlItems(arlData?.data || []);
    } catch (error) {
      console.error('Error cargando datos dinámicos:', error);
    }
  };

  // Actualizar descripción del tipo de vinculación cuando cambia el valor seleccionado (valor = _id del ítem)
  useEffect(() => {
    if (formData.tipoVinculacion && linkageTypes.length > 0) {
      const selectedLinkage = linkageTypes.find(linkage => String(linkage._id) === String(formData.tipoVinculacion));
      setSelectedLinkageDescription(selectedLinkage?.description || '');
    } else {
      setSelectedLinkageDescription('');
    }
  }, [formData.tipoVinculacion, linkageTypes]);

  // Actualizar descripción del tipo de vinculación en modo edición
  useEffect(() => {
    if (editFormData?.tipoVinculacion && linkageTypes.length > 0) {
      const selectedLinkage = linkageTypes.find(linkage => String(linkage._id) === String(editFormData.tipoVinculacion));
      setSelectedLinkageDescription(selectedLinkage?.description || '');
    } else if (!editFormData?.tipoVinculacion) {
      setSelectedLinkageDescription('');
    }
  }, [editFormData?.tipoVinculacion, linkageTypes]);

  useEffect(() => {
    if (entityPortalMode) return;
    loadOportunidades();
  }, [pagePracticas, pageMtm, pageSize, sortField, sortDirection, entityPortalMode]);

  // Portal entidad — crear: mismo formulario de práctica, empresa fija desde /companies/me.
  useEffect(() => {
    if (!entityPortalMode) return undefined;
    if (entityViewOpportunityId) {
      return undefined;
    }
    setVista('crear');
    setTipoOportunidad('practica');
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/companies/me');
        if (cancelled) return;
        if (!data?._id) {
          await Swal.fire({
            icon: 'error',
            title: 'No disponible',
            text: 'No se encontró la información de tu entidad.',
            confirmButtonColor: '#c41e3a',
          });
          navigate('/entidad/oportunidades', { replace: true });
          return;
        }
        setSelectedCompany({
          _id: data._id,
          name: data.name || data.legalName || data.commercialName || '',
          commercialName: data.commercialName || data.name || data.legalName || '',
          legalName: data.legalName,
        });
      } catch (e) {
        console.error('[Oportunidades] entityPortalMode init', e);
        if (!cancelled) {
          await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: e?.response?.data?.message || 'No se pudo cargar tu entidad.',
            confirmButtonColor: '#c41e3a',
          });
          navigate('/entidad/oportunidades', { replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entityPortalMode, entityViewOpportunityId, navigate]);

  // Portal entidad — ver detalle: práctica de la propia entidad, ficha en solo lectura.
  useEffect(() => {
    if (!entityPortalMode || !entityViewOpportunityId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data: opp } = await api.get(`/opportunities/${entityViewOpportunityId}`);
        if (cancelled) return;
        const t = opp?.tipo && String(opp.tipo).toLowerCase();
        if (t && t !== 'practica') {
          await Swal.fire({
            icon: 'info',
            title: 'No disponible',
            text: 'En el portal de entidad solo se gestionan oportunidades de práctica.',
            confirmButtonColor: '#c41e3a',
          });
          navigate('/entidad/oportunidades', { replace: true });
          return;
        }
        setOportunidadSeleccionada(opp);
        setEditFormData(buildEditFormDataFromOpp(opp));
        setEditSelectedCompany(opp.company || null);
        setVista('detalle');
        setIsEditingDetail(false);
        setTipoOportunidad('practica');
      } catch (e) {
        if (!cancelled) {
          await Swal.fire({
            icon: 'error',
            title: 'No se pudo abrir',
            text: e?.response?.data?.message || 'No se pudo cargar la oportunidad o no tienes permiso para verla.',
            confirmButtonColor: '#c41e3a',
          });
          navigate('/entidad/oportunidades', { replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entityPortalMode, entityViewOpportunityId, navigate]);

  // Función para limpiar filtros (solo la pestaña activa)
  const handleClearFilters = () => {
    const cleared = createEmptyOportunidadesFilters();
    if (listaTab === 'practicas') {
      setFiltersPracticas(cleared);
      setPagePracticas(1);
      setPageMtm(1);
      loadOportunidades({ fp: cleared });
    } else {
      setFiltersMonitorias(cleared);
      setPagePracticas(1);
      setPageMtm(1);
      loadOportunidades({ fm: cleared });
    }
  };

  // Función para aplicar filtros
  const handleApplyFilters = () => {
    setPagePracticas(1);
    setPageMtm(1);
    loadOportunidades();
  };
  
  // Cargar ciudades desde backend cuando se selecciona un país (City por country)
  useEffect(() => {
    if (formData.pais) {
      api.get('/locations/cities', { params: { country: formData.pais, limit: 1000 } })
        .then(res => setCities(res.data?.data || []))
        .catch(() => setCities([]));
    } else {
      setCities([]);
    }
  }, [formData.pais]);

  // Inicializar salario emocional search cuando hay un valor seleccionado
  useEffect(() => {
    if (formData.salarioEmocional && opcionesSalarioEmocional.length > 0) {
      const opcion = opcionesSalarioEmocional.find(
        op => op.value === formData.salarioEmocional
      );
      if (opcion) {
        setSalarioEmocionalSearch(opcion.label);
      }
    } else if (!formData.salarioEmocional) {
      setSalarioEmocionalSearch('');
    }
  }, [formData.salarioEmocional]);

  // Cerrar dropdown cuando se hace click fuera (solo en vista crear)
  useEffect(() => {
    // Solo activar este efecto cuando estamos en la vista crear y el dropdown puede existir
    if (vista !== 'crear') return;
    
    const handleClickOutside = (event) => {
      if (!event.target.closest('.autocomplete-wrapper') && !event.target.closest('.autocomplete-dropdown')) {
        setShowSalarioEmocionalDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [vista]);

  // Recalcular posición del dropdown cuando se hace scroll o se redimensiona la ventana (solo en vista crear)
  useEffect(() => {
    // Solo activar este efecto cuando estamos en la vista crear y el dropdown está visible
    if (vista !== 'crear' || !showSalarioEmocionalDropdown) return;
    
    const handleScrollOrResize = () => {
      // Verificar que el ref existe antes de calcular posición
      if (salarioEmocionalInputRef.current) {
        calculateDropdownPosition();
      }
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [showSalarioEmocionalDropdown, vista]);

  // Manejar el cambio de tipo de oportunidad después de cerrar el modal
  useEffect(() => {
    // Solo cambiar el tipo si el modal está cerrado y hay un tipo pendiente
    if (!showModalInfo && pendingTipoOportunidad) {
      // Usar setTimeout para asegurar que React complete el desmontaje del modal
      const timer = setTimeout(() => {
        setTipoOportunidad(pendingTipoOportunidad);
        setPendingTipoOportunidad(null);
        // Scroll al formulario después de que se renderice
        setTimeout(() => {
          const formContainer = document.querySelector('.formulario-practica-container');
          if (formContainer) {
            formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showModalInfo, pendingTipoOportunidad]);

  // ── Cargar programas del modelo Program cuando abre cualquier modal de programas ──────────────
  useEffect(() => {
    if (!showProgramsModal && !showMtmProgramsModal && !editShowProgramsModal) return;
    if (allPrograms.length > 0) return; // ya cargados
    setLoadingPrograms(true);
    api.get('/programs?status=ACTIVE&limit=500')
      .then(res => setAllPrograms(res.data.data || []))
      .catch(e => console.error('[Programs modal] load error:', e))
      .finally(() => setLoadingPrograms(false));
  }, [showProgramsModal, showMtmProgramsModal, editShowProgramsModal]);

  // Cargar programas habilitados para el periodo cuando se abre el modal de formación (creación o edición) y hay periodo seleccionado
  useEffect(() => {
    const periodo = showProgramsModal ? formData?.periodo : (editShowProgramsModal ? editFormData?.periodo : null);
    if (!periodo) {
      setProgramIdsHabilitadosPeriodo([]);
      return;
    }
    api.get('/condiciones-curriculares/programas-habilitados', { params: { periodo } })
      .then(res => setProgramIdsHabilitadosPeriodo((res.data?.programIds || []).map(id => String(id))))
      .catch((err) => {
        console.warn('[Oportunidades] programas-habilitados:', err?.response?.status, err?.response?.data?.message || err.message);
        setProgramIdsHabilitadosPeriodo([]);
      });
  }, [showProgramsModal, editShowProgramsModal, formData?.periodo, editFormData?.periodo]);

  // Limpiar selección al cambiar nivel (práctica)
  useEffect(() => { setNewProgramName(''); }, [newProgramLevel]);
  // Limpiar selección al cambiar nivel (edición)
  useEffect(() => { setEditNewProgramName(''); }, [editNewProgramLevel]);
  // Limpiar selección al cambiar nivel (MTM)
  useEffect(() => { setNewMtmProgramName(''); }, [newMtmProgramLevel]);

  // ── Cargar parámetros MTM cuando se selecciona "monitoria" ────────────────
  const loadMtmParams = async () => {
    try {
      const itemParams = { limit: 100, isActive: true };
      const [ded, val, vinc, cat, per] = await Promise.all([
        api.get('/locations/items/L_DEDICATON_HOURS', { params: itemParams }),
        api.get('/locations/items/L_REMUNERATION_HOURS_PER_WEEK', { params: itemParams }),
        api.get('/locations/items/L_CONTRACT_TYPE_STUDY_WORKING', { params: itemParams }),
        api.get('/locations/items/L_MONITORING_TYPE', { params: itemParams }),
        api.get('/periodos?tipo=monitoria&estado=Activo&limit=100')
      ]);
      setMtmDedicacionItems(ded.data?.data || ded.data || []);
      setMtmValorItems(val.data?.data || val.data || []);
      setMtmVinculacionItems(vinc.data?.data || vinc.data || []);
      setMtmCategoriaItems(cat.data?.data || cat.data || []);
      setMtmPeriodos(per.data?.data || per.data || []);
    } catch (e) {
      console.error('[MTM] loadMtmParams:', e);
    }
  };

  // Autocomplete de asignaturas MTM
  useEffect(() => {
    if (mtmAsigSearch.length < 3) { setMtmAsigResults([]); setShowMtmAsigDrop(false); return; }
    clearTimeout(mtmAsigTimer.current);
    mtmAsigTimer.current = setTimeout(async () => {
      setMtmAsigLoading(true);
      try {
        const res = await api.get(`/asignaturas?search=${encodeURIComponent(mtmAsigSearch)}&limit=15`);
        setMtmAsigResults(res.data.data || []);
        setShowMtmAsigDrop(true);
      } catch { setMtmAsigResults([]); }
      finally { setMtmAsigLoading(false); }
    }, 350);
    return () => clearTimeout(mtmAsigTimer.current);
  }, [mtmAsigSearch]);

  // Autocomplete de programas MTM
  useEffect(() => {
    if (mtmProgramaSearch.length < 2) { setMtmProgramaResults([]); setShowMtmProgramaDrop(false); return; }
    clearTimeout(mtmProgramaTimer.current);
    mtmProgramaTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/programs?search=${encodeURIComponent(mtmProgramaSearch)}&status=ACTIVE&limit=20`);
        setMtmProgramaResults(res.data.data || []);
        setShowMtmProgramaDrop(true);
      } catch { setMtmProgramaResults([]); }
    }, 350);
    return () => clearTimeout(mtmProgramaTimer.current);
  }, [mtmProgramaSearch]);

  // Búsqueda profesor responsable (usuarios administrativos) — MTM
  const mtmProfesorTimer = useRef(null);
  useEffect(() => {
    if (mtmProfesorSearch.trim().length < 2) { setMtmProfesorResults([]); setShowMtmProfesorDrop(false); setMtmProfesorError(false); return; }
    clearTimeout(mtmProfesorTimer.current);
    mtmProfesorTimer.current = setTimeout(async () => {
      setMtmProfesorLoading(true);
      setMtmProfesorError(false);
      try {
        const res = await api.get(`/users-administrativos?search=${encodeURIComponent(mtmProfesorSearch.trim())}&limit=20&estado=true`);
        setMtmProfesorResults(res.data?.data || []);
        setShowMtmProfesorDrop(true);
      } catch {
        setMtmProfesorResults([]);
        setShowMtmProfesorDrop(true);
        setMtmProfesorError(true);
      }
      finally { setMtmProfesorLoading(false); }
    }, 350);
    return () => clearTimeout(mtmProfesorTimer.current);
  }, [mtmProfesorSearch]);
  useEffect(() => {
    const handler = (e) => {
      if (mtmProfesorWrapRef.current && !mtmProfesorWrapRef.current.contains(e.target)) setShowMtmProfesorDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getStatusColor = (status) => {
    // Colores de fondo para el footer según el estado
    const colors = {
      'draft': '#fee2e2', // Rojo muy claro para Creada
      'Creada': '#fee2e2',
      'creada': '#fee2e2',
      'En Revisión': '#fecaca', // Rojo claro para En Revisión
      'en_revision': '#fecaca',
      'Revisada': '#dbeafe', // Azul claro para Revisada
      'revisada': '#dbeafe',
      'published': '#d1fae5', // Verde claro para Activa
      'Activa': '#d1fae5',
      'activa': '#d1fae5',
      'Rechazada': '#fee2e2', // Rojo muy claro para Rechazada
      'rechazada': '#fee2e2',
      'closed': '#e5e7eb', // Gris claro para Cerrada
      'Cerrada': '#e5e7eb',
      'cerrada': '#e5e7eb',
      'cancelled': '#fee2e2',
      'Vencida': '#d1d5db', // Gris medio para Vencida
      'vencida': '#d1d5db'
    };
    return colors[status] || '#f3f4f6';
  };

  const getStatusTextColor = (status) => {
    // Colores de texto para el estado según el estado
    const colors = {
      'draft': '#991b1b', // Rojo oscuro para Creada
      'Creada': '#991b1b',
      'creada': '#991b1b',
      'En Revisión': '#b91c1c', // Rojo medio para En Revisión
      'en_revision': '#b91c1c',
      'Revisada': '#1e40af', // Azul oscuro para Revisada
      'revisada': '#1e40af',
      'published': '#065f46', // Verde oscuro para Activa
      'Activa': '#065f46',
      'activa': '#065f46',
      'Rechazada': '#991b1b', // Rojo oscuro para Rechazada
      'rechazada': '#991b1b',
      'closed': '#374151', // Gris oscuro para Cerrada
      'Cerrada': '#374151',
      'cerrada': '#374151',
      'cancelled': '#991b1b',
      'Vencida': '#4b5563', // Gris medio oscuro para Vencida
      'vencida': '#4b5563'
    };
    return colors[status] || '#374151';
  };

  const getStatusLabel = (status, oportunidad = null) => {
    const labels = {
      'draft': 'Creada',
      'Creada': 'Creada',
      'creada': 'Creada',
      'En Revisión': 'En Revisión',
      'en_revision': 'En Revisión',
      'Revisada': 'Revisada',
      'revisada': 'Revisada',
      'published': 'Activa',
      'Activa': 'Activa',
      'activa': 'Activa',
      'Rechazada': 'Rechazada',
      'rechazada': 'Rechazada',
      'closed': 'Cerrada',
      'Cerrada': 'Cerrada',
      'cerrada': 'Cerrada',
      'cancelled': 'Rechazada',
      'Vencida': 'Vencida',
      'vencida': 'Vencida'
    };
    return labels[status] || status;
  };

  // Función para obtener programas pendientes
  const getProgramasPendientes = (oportunidad) => {
    if (!oportunidad || !oportunidad.aprobacionesPorPrograma) return [];
    return oportunidad.aprobacionesPorPrograma.filter(ap => ap.estado === 'pendiente');
  };

  const handleCrearOportunidad = () => {
    // Cerrar dropdowns y resetear estados antes de cambiar de vista
    setShowSalarioEmocionalDropdown(false);
    setVista('crear');
    if (isAdmin) {
      setSelectedCompany(null);
      setCompanySearch('');
      setShowCompanyDropdown(false);
      setCompanySearchResults([]);
    }
  };

  const handleSelectCompany = (company) => {
    setSelectedCompany(company);
    setCompanySearch(company.name || company.commercialName);
    setShowCompanyDropdown(false);
  };

  const handleSelectTipo = async (tipo) => {
    if (tipo === 'practica') {
      setShowModalInfo(true);
    } else if (tipo === 'monitoria') {
      // Auto-seleccionar UNIVERSIDAD DEL ROSARIO e ir directo al formulario
      setLoadingUniversidad(true);
      try {
        const { data } = await api.get('/companies', { params: { search: 'UNIVERSIDAD DEL ROSARIO', limit: 10, page: 1 } });
        const results = data?.data || data?.companies || [];
        const universidad = results.find(
          (c) =>
            (c.nit || '').replace(/\D/g, '') === '8600077593' ||
            (c.name || '').toUpperCase().includes('ROSARIO') ||
            (c.legalName || '').toUpperCase().includes('ROSARIO')
        );
        if (!universidad) {
          await Swal.fire({
            icon: 'warning',
            title: 'Empresa no encontrada',
            text: 'No se encontró la empresa Universidad del Rosario (NIT 8600077593). Contacte al administrador.',
            confirmButtonColor: '#c41e3a',
          });
          return;
        }
        setSelectedCompany(universidad);
        setTipoOportunidad('monitoria');
        setMtmProfesorResponsable(''); setMtmProfesorDisplay(''); setMtmProfesorSearch('');
        loadMtmParams();
      } catch (e) {
        console.error('Error buscando empresa universidad', e);
        await Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la empresa de la universidad.', confirmButtonColor: '#c41e3a' });
      } finally {
        setLoadingUniversidad(false);
      }
    }
  };

  const handleAceptarModal = () => {
    // Establecer el tipo pendiente y cerrar el modal
    // El useEffect se encargará de cambiar el tipo después de que el modal se cierre completamente
    setPendingTipoOportunidad('practica');
    setShowModalInfo(false);
  };
  
  // Función para formatear número con separador de miles y signo de pesos
  const formatCurrency = (value) => {
    // Remover todo excepto números
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    
    // Formatear con separador de miles (puntos)
    const formatted = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$${formatted}`;
  };

  // Función para obtener el valor numérico sin formato
  const getNumericValue = (formattedValue) => {
    return formattedValue.replace(/\D/g, '');
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Manejo especial para tipo de vinculación - actualizar descripción (value = _id del ítem)
    if (name === 'tipoVinculacion') {
      const selectedLinkage = linkageTypes.find(linkage => String(linkage._id) === String(value));
      setSelectedLinkageDescription(selectedLinkage?.description || '');
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      return;
    }
    
    // Manejo especial para apoyo económico
    if (name === 'apoyoEconomico') {
      const numericValue = getNumericValue(value);
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleFileChange = (e, documentoNumero) => {
    const file = e.target.files[0];
    if (file) {
      const campoArchivo = documentoNumero === 'primer' ? 'primerDocumento' : 
                          documentoNumero === 'segundo' ? 'segundoDocumento' : 
                          'tercerDocumento';
      const campoNombre = `${documentoNumero}DocumentoNombre`;
      
      setFormData(prev => ({
        ...prev,
        [campoArchivo]: file,
        [campoNombre]: file.name
      }));
    }
  };

  /** Previsualiza un archivo local (creación) abriendo un blob URL en nueva pestaña. */
  const handlePreviewLocalFile = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
  };

  /** Obtiene URL firmada de S3 y abre el documento en nueva pestaña (edición / existentes). */
  const handlePreviewOpportunityDocument = async (opportunityId, docId) => {
    try {
      const { data } = await api.get(`/opportunities/${opportunityId}/documentos/${docId}/preview`);
      window.open(data.url, '_blank');
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'No se pudo obtener la previsualización del documento',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    }
  };

  /** Elimina un documento de una oportunidad (S3 + BD) y actualiza el estado local. */
  const handleDeleteOpportunityDocument = async (opportunityId, docId) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar documento?',
      text: 'Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c41e3a',
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/opportunities/${opportunityId}/documentos/${docId}`);
      setEditFormData(prev => ({
        ...prev,
        documentos: (prev.documentos || []).filter(d => String(d._id) !== String(docId)),
      }));
      setOportunidadSeleccionada(prev => ({
        ...prev,
        documentos: (prev.documentos || []).filter(d => String(d._id) !== String(docId)),
      }));
      await Swal.fire({
        icon: 'success',
        title: 'Documento eliminado',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'No se pudo eliminar el documento',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    }
  };

  /** Sube un nuevo documento a una oportunidad existente (modo edición). */
  const handleEditAddDocument = async (e, opportunityId) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    try {
      Swal.fire({
        title: 'Subiendo documento...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const fd = new FormData();
      fd.append('documento', file);
      fd.append('nombre', file.name);
      fd.append('orden', ((editFormData?.documentos || []).length + 1).toString());

      const { data } = await api.post(`/opportunities/${opportunityId}/documentos`, fd);

      setEditFormData(prev => ({
        ...prev,
        documentos: [...(prev.documentos || []), data.documento],
      }));
      setOportunidadSeleccionada(prev => ({
        ...prev,
        documentos: [...(prev.documentos || []), data.documento],
      }));

      Swal.close();
      await Swal.fire({
        icon: 'success',
        title: 'Documento agregado',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.close();
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'No se pudo subir el documento',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    }
  };

  const calculateDropdownPosition = () => {
    if (salarioEmocionalInputRef.current) {
      const rect = salarioEmocionalInputRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownMaxHeight = 300; // max-height del dropdown
      
      // Si hay menos espacio debajo que arriba, abrir hacia arriba
      if (spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow) {
        setDropdownOpenUp(true);
        setDropdownPosition({
          top: null,
          bottom: viewportHeight - rect.top + 4,
          left: rect.left,
          width: rect.width
        });
      } else {
        setDropdownOpenUp(false);
        setDropdownPosition({
          top: rect.bottom + 4,
          bottom: null,
          left: rect.left,
          width: rect.width
        });
      }
    }
  };

  const handleSalarioEmocionalChange = (e) => {
    const value = e.target.value;
    setSalarioEmocionalSearch(value);
    // Solo calcular posición si el ref existe
    if (salarioEmocionalInputRef.current) {
      calculateDropdownPosition();
    }
    setShowSalarioEmocionalDropdown(true);
    
    // Si el valor coincide exactamente con una opción, establecerlo
    const opcionEncontrada = opcionesSalarioEmocional.find(
      op => op.label.toLowerCase() === value.toLowerCase()
    );
    if (opcionEncontrada) {
      setFormData(prev => ({
        ...prev,
        salarioEmocional: opcionEncontrada.value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        salarioEmocional: ''
      }));
    }
  };

  const handleSelectSalarioEmocional = (opcion) => {
    setFormData(prev => {
      // Verificar si ya existe en el array
      if (prev.salarioEmocional && prev.salarioEmocional.includes(opcion.value)) {
        return prev;
      }
      return {
        ...prev,
        salarioEmocional: [...(prev.salarioEmocional || []), opcion.value]
      };
    });
    setSalarioEmocionalSearch('');
    setShowSalarioEmocionalDropdown(false);
  };

  const handleRemoveSalarioEmocional = (index) => {
    setFormData(prev => ({
      ...prev,
      salarioEmocional: prev.salarioEmocional.filter((_, i) => i !== index)
    }));
  };

  // Función para agregar programa de formación académica
  const handleAddProgram = () => {
    if (!formData.periodo) {
      Swal.fire({
        icon: 'info',
        title: 'Periodo requerido',
        text: 'Seleccione primero el periodo de la práctica para agregar formación académica.',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
      return;
    }
    if (!newProgramLevel || !newProgramName) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Por favor seleccione el nivel y el programa',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
      return;
    }
    const newProgram = { level: newProgramLevel, program: newProgramName };
    setFormData(prev => ({
      ...prev,
      formacionAcademica: [...(prev.formacionAcademica || []), newProgram]
    }));
    setNewProgramLevel('');
    setNewProgramName('');
    setShowProgramsModal(false);
  };

  // Función para eliminar programa (práctica)
  const handleRemoveProgram = (index) => {
    setFormData(prev => ({
      ...prev,
      formacionAcademica: prev.formacionAcademica.filter((_, i) => i !== index)
    }));
  };

  // Agregar programa MTM desde modal (crear o editar)
  const handleAddMtmProgram = () => {
    if (!newMtmProgramLevel || !newMtmProgramName) {
      Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Selecciona el nivel y el programa.', confirmButtonText: 'Aceptar', confirmButtonColor: '#c41e3a' });
      return;
    }
    const prog = allPrograms.find(p => p.name === newMtmProgramName);
    if (!prog) return;
    if (mtmProgramsModalForEdit) {
      const currentProgramas = mtmEditData?.programas || [];
      if (currentProgramas.some(x => (x._id || x) === prog._id)) {
        setNewMtmProgramLevel(''); setNewMtmProgramName(''); setShowMtmProgramsModal(false); setMtmProgramsModalForEdit(false);
        return;
      }
      setMtmEditData(prev => ({ ...prev, programas: [...(prev?.programas || []), prog] }));
      setNewMtmProgramLevel(''); setNewMtmProgramName(''); setShowMtmProgramsModal(false); setMtmProgramsModalForEdit(false);
      return;
    }
    if (mtmProgramas.find(x => x._id === prog._id)) {
      setNewMtmProgramLevel(''); setNewMtmProgramName(''); setShowMtmProgramsModal(false);
      return;
    }
    setMtmProgramas(prev => [...prev, prog]);
    setNewMtmProgramLevel('');
    setNewMtmProgramName('');
    setShowMtmProgramsModal(false);
  };

  // Función para agregar idioma
  const handleAddLanguage = () => {
    if (!newLanguage || !newLanguageLevel) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Por favor seleccione el idioma y el nivel',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
      return;
    }
    const newLang = { language: newLanguage, level: newLanguageLevel };
    setFormData(prev => ({
      ...prev,
      idiomas: [...(prev.idiomas || []), newLang]
    }));
    setNewLanguage('');
    setNewLanguageLevel('');
    setShowLanguagesModal(false);
  };

  // Función para eliminar idioma
  const handleRemoveLanguage = (index) => {
    setFormData(prev => ({
      ...prev,
      idiomas: prev.idiomas.filter((_, i) => i !== index)
    }));
  };
  
  // Función para actualizar oportunidad
  const handleUpdateForm = async () => {
    if (!oportunidadSeleccionada || !editFormData) return;

    try {
      // Validaciones básicas
      if (!editFormData.nombreCargo) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'El nombre del cargo es requerido',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#c41e3a'
        });
        return;
      }

      if (!editFormData.requisitos) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'Los requisitos son requeridos',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#c41e3a'
        });
        return;
      }

      if (editFormData.funciones && editFormData.funciones.length < 60) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'Las funciones deben tener al menos 60 caracteres',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#c41e3a'
        });
        return;
      }

      if (oportunidadSeleccionada?.tipo === 'practica' && editFormData.jornadaOrdinariaSemanal !== '' && editFormData.jornadaOrdinariaSemanal != null) {
        const jo = parseInt(editFormData.jornadaOrdinariaSemanal, 10);
        if (!Number.isNaN(jo) && jo > maxJornadaOrdinariaSemanal) {
          await Swal.fire({
            icon: 'error',
            title: 'Jornada ordinaria semanal',
            text: `No puede superar ${maxJornadaOrdinariaSemanal} horas semanales (regla de negocio).`,
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#c41e3a'
          });
          return;
        }
      }

      if (oportunidadSeleccionada?.tipo === 'practica' && editFormData.auxilioEconomico) {
        const ap = parseInt(String(editFormData.apoyoEconomico || '').replace(/\D/g, ''), 10);
        if (!Number.isFinite(ap) || ap < minApoyoEconomicoCOP) {
          await Swal.fire({
            icon: 'error',
            title: 'Apoyo económico',
            text: `Con auxilio económico activo, el monto debe ser al menos $${minApoyoEconomicoCOP.toLocaleString('es-CO')} COP (regla de negocio).`,
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#c41e3a'
          });
          return;
        }
      }

      // Preparar datos para enviar
      const opportunityData = {
        nombreCargo: editFormData.nombreCargo,
        auxilioEconomico: editFormData.auxilioEconomico,
        requiereConfidencialidad: editFormData.requiereConfidencialidad,
        apoyoEconomico: editFormData.apoyoEconomico ? parseInt(String(editFormData.apoyoEconomico).replace(/\D/g, ''), 10) : null,
        tipoVinculacion: editFormData.tipoVinculacion || null,
        periodo: editFormData.periodo || null,
        vacantes: editFormData.vacantes ? parseInt(editFormData.vacantes) : null,
        fechaVencimiento: editFormData.fechaVencimiento || null,
        pais: editFormData.pais || null,
        ciudad: editFormData.ciudad || null,
        jornadaOrdinariaSemanal: editFormData.jornadaOrdinariaSemanal ? parseInt(editFormData.jornadaOrdinariaSemanal) : null,
        dedicacion: editFormData.dedicacion || null,
        fechaInicioPractica: editFormData.fechaInicioPractica || null,
        fechaFinPractica: editFormData.fechaFinPractica || null,
        horario: editFormData.horario || null,
        areaDesempeno: editFormData.areaDesempeno || null,
        enlacesFormatoEspecificos: editFormData.enlacesFormatoEspecificos || null,
        salarioEmocional: editFormData.salarioEmocional || [],
        promedioMinimoRequerido: editFormData.promedioMinimoRequerido || null,
        formacionAcademica: editFormData.formacionAcademica || [],
        idiomas: editFormData.idiomas || [],
        funciones: editFormData.funciones || null,
        requisitos: editFormData.requisitos
      };

      Swal.fire({
        title: 'Actualizando...',
        text: 'Por favor espere',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Enviar al backend
      const { data } = await api.put(`/opportunities/${oportunidadSeleccionada._id}`, opportunityData);

      // Detectar programas nuevos que no tienen aprobación y crearlas
      if (editFormData.formacionAcademica && editFormData.formacionAcademica.length > 0) {
        // Obtener la oportunidad actualizada para ver qué aprobaciones tiene
        const { data: currentOpp } = await api.get(`/opportunities/${oportunidadSeleccionada._id}`);
        
        // Identificar programas nuevos que no tienen aprobación
        const programasExistentes = currentOpp.aprobacionesPorPrograma?.map(
          ap => `${ap.programa.level}|${ap.programa.program}`
        ) || [];
        
        const programasNuevos = editFormData.formacionAcademica.filter(formacion => {
          const programaKey = `${formacion.level}|${formacion.program}`;
          return !programasExistentes.includes(programaKey);
        });

        // Crear aprobaciones para los programas nuevos
        if (programasNuevos.length > 0) {
          // Actualizar la oportunidad agregando las nuevas aprobaciones
          const nuevasAprobaciones = programasNuevos.map(formacion => ({
            programa: {
              level: formacion.level,
              program: formacion.program
            },
            estado: 'pendiente'
          }));

          // Obtener las aprobaciones existentes y agregar las nuevas
          const todasLasAprobaciones = [
            ...(currentOpp.aprobacionesPorPrograma || []),
            ...nuevasAprobaciones
          ];

          // Actualizar con las nuevas aprobaciones
          await api.put(`/opportunities/${oportunidadSeleccionada._id}`, {
            aprobacionesPorPrograma: todasLasAprobaciones
          });
        }
      }

      Swal.close();
      await Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: 'La oportunidad se ha actualizado correctamente',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });

      // Recargar la oportunidad y volver a detalle
      const { data: updatedOpp } = await api.get(`/opportunities/${oportunidadSeleccionada._id}`);
      setOportunidadSeleccionada(updatedOpp);
      setVista('detalle');
      setIsEditingDetail(false); // Volver a modo solo lectura
      // Recargar datos en editFormData con refs bien mapeados
      const formDataEdit = buildEditFormDataFromOpp(updatedOpp);
      if (formDataEdit) setEditFormData(formDataEdit);
      setEditSelectedCompany(updatedOpp.company);
      await loadOportunidades();
    } catch (error) {
      Swal.close();
      const errorMessage = error.response?.data?.message || error.message || 'Error al actualizar la oportunidad';
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    }
  };

  const handleSaveForm = async () => {
    try {
      // Validaciones básicas
      if (!formData.nombreCargo) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'El nombre del cargo es requerido',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#c41e3a'
        });
        return;
      }

      if (!selectedCompany) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'Debe seleccionar una empresa',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#c41e3a'
        });
        return;
      }

      // ── FLUJO MTM ────────────────────────────────────────────────────────────
      if (tipoOportunidad === 'monitoria') {
        Swal.fire({ title: 'Guardando...', text: 'Por favor espere', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const mtmPayload = {
          company: selectedCompany._id,
          nombreCargo: formData.nombreCargo,
          dedicacionHoras: mtmDedicacionHoras || null,
          valorPorHora: mtmValorPorHora || null,
          tipoVinculacion: formData.tipoVinculacion || null,
          categoria: mtmCategoria || null,
          periodo: formData.periodo || null,
          vacantes: formData.vacantes ? parseInt(formData.vacantes) : null,
          fechaVencimiento: formData.fechaVencimiento || null,
          asignaturas: mtmAsignaturas.map(a => a._id),
          promedioMinimo: formData.promedioMinimoRequerido ? parseFloat(formData.promedioMinimoRequerido) : null,
          profesorResponsable: mtmProfesorResponsable || null,
          nombreProfesor: mtmNombreProfesor || null,
          unidadAcademica: mtmUnidadAcademica || null,
          horario: formData.horario || null,
          grupo: mtmGrupo || null,
          programas: mtmProgramas.map(p => p._id),
          funciones: formData.funciones || null,
          requisitos: formData.requisitos || null
        };

        await api.post('/oportunidades-mtm', mtmPayload);
        Swal.close();
        await Swal.fire({ icon: 'success', title: '¡Éxito!', text: 'La oportunidad de monitoría se ha creado correctamente', confirmButtonText: 'Aceptar', confirmButtonColor: '#c41e3a' });

        // Resetear estados MTM
        setMtmDedicacionHoras(''); setMtmValorPorHora(''); setMtmCategoria('');
        setMtmNombreProfesor(''); setMtmUnidadAcademica(''); setMtmGrupo('');
        setMtmAsignaturas([]); setMtmProgramas([]);
        setMtmAsigSearch(''); setMtmProgramaSearch('');
        setMtmProfesorResponsable(''); setMtmProfesorDisplay(''); setMtmProfesorSearch('');
        setFormData({ nombreCargo: '', auxilioEconomico: false, requiereConfidencialidad: false, apoyoEconomico: '', tipoVinculacion: '', periodo: '', vacantes: '', fechaVencimiento: '', pais: '', ciudad: '', jornadaOrdinariaSemanal: '', dedicacion: '', fechaInicioPractica: '', fechaFinPractica: '', horario: '', areaDesempeno: '', enlacesFormatoEspecificos: '', primerDocumento: null, primerDocumentoNombre: '', primerDocumentoRequerido: false, segundoDocumento: null, segundoDocumentoNombre: '', tercerDocumento: null, tercerDocumentoNombre: '', salarioEmocional: [], promedioMinimoRequerido: '', formacionAcademica: [], idiomas: [], funciones: '', requisitos: '' });
        setTipoOportunidad(null);
        setSelectedCompany(null);
        await loadOportunidades();
        setVista('lista');
        return;
      }

      // ── FLUJO PRÁCTICA ───────────────────────────────────────────────────────
      if (!formData.requisitos) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'Los requisitos son requeridos',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#c41e3a'
        });
        return;
      }

      if (formData.funciones && formData.funciones.length < 60) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'Las funciones deben tener al menos 60 caracteres',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#c41e3a'
        });
        return;
      }

      const joCreate = parseInt(formData.jornadaOrdinariaSemanal, 10);
      if (formData.jornadaOrdinariaSemanal !== '' && formData.jornadaOrdinariaSemanal != null && !Number.isNaN(joCreate) && joCreate > maxJornadaOrdinariaSemanal) {
        await Swal.fire({
          icon: 'error',
          title: 'Jornada ordinaria semanal',
          text: `No puede superar ${maxJornadaOrdinariaSemanal} horas semanales (regla de negocio).`,
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#c41e3a'
        });
        return;
      }

      if (tipoOportunidad === 'practica' && formData.auxilioEconomico) {
        const ap = parseInt(String(formData.apoyoEconomico || '').replace(/\D/g, ''), 10);
        if (!Number.isFinite(ap) || ap < minApoyoEconomicoCOP) {
          await Swal.fire({
            icon: 'error',
            title: 'Apoyo económico',
            text: `Con auxilio económico activo, el monto debe ser al menos $${minApoyoEconomicoCOP.toLocaleString('es-CO')} COP (regla de negocio).`,
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#c41e3a'
          });
          return;
        }
      }

      // Preparar datos para enviar
      const opportunityData = {
        tipo: tipoOportunidad,
        company: selectedCompany._id,
        nombreCargo: formData.nombreCargo,
        auxilioEconomico: formData.auxilioEconomico,
        requiereConfidencialidad: formData.requiereConfidencialidad,
        apoyoEconomico: formData.apoyoEconomico ? parseInt(String(formData.apoyoEconomico).replace(/\D/g, ''), 10) : null,
        tipoVinculacion: formData.tipoVinculacion || null,
        periodo: formData.periodo || null,
        vacantes: formData.vacantes ? parseInt(formData.vacantes) : null,
        fechaVencimiento: formData.fechaVencimiento || null,
        pais: formData.pais || null,
        ciudad: formData.ciudad || null,
        jornadaOrdinariaSemanal: formData.jornadaOrdinariaSemanal ? parseInt(formData.jornadaOrdinariaSemanal) : null,
        dedicacion: formData.dedicacion || null,
        fechaInicioPractica: formData.fechaInicioPractica || null,
        fechaFinPractica: formData.fechaFinPractica || null,
        horario: formData.horario || null,
        areaDesempeno: formData.areaDesempeno || null,
        enlacesFormatoEspecificos: formData.enlacesFormatoEspecificos || null,
        salarioEmocional: formData.salarioEmocional || [],
        promedioMinimoRequerido: formData.promedioMinimoRequerido || null,
        formacionAcademica: formData.formacionAcademica || [],
        idiomas: formData.idiomas || [],
        funciones: formData.funciones || null,
        requisitos: formData.requisitos
      };

      // Preparar documentos
      const documentos = [];
      let orden = 1;

      if (formData.primerDocumento) {
        documentos.push({
          nombre: formData.primerDocumentoNombre,
          archivo: formData.primerDocumento,
          requerido: formData.primerDocumentoRequerido,
          orden: orden++
        });
      }

      if (formData.segundoDocumento) {
        documentos.push({
          nombre: formData.segundoDocumentoNombre,
          archivo: formData.segundoDocumento,
          requerido: false,
          orden: orden++
        });
      }

      if (formData.tercerDocumento) {
        documentos.push({
          nombre: formData.tercerDocumentoNombre,
          archivo: formData.tercerDocumento,
          requerido: false,
          orden: orden++
        });
      }

      // Crear FormData para enviar archivos
      const formDataToSend = new FormData();

      // Agregar datos JSON como string
      formDataToSend.append('data', JSON.stringify(opportunityData));

      // Agregar archivos
      documentos.forEach((doc, index) => {
        formDataToSend.append(`documento${index + 1}`, doc.archivo);
        formDataToSend.append(`documento${index + 1}_nombre`, doc.nombre);
        formDataToSend.append(`documento${index + 1}_requerido`, doc.requerido);
        formDataToSend.append(`documento${index + 1}_orden`, doc.orden);
      });

      // Mostrar loading
      Swal.fire({
        title: 'Guardando...',
        text: 'Por favor espere',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Enviar al backend
      const response = await api.post('/opportunities', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Cerrar loading
      Swal.close();

      // Mostrar éxito
      await Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: entityPortalMode
          ? 'La oportunidad de práctica fue enviada y queda en estado «En revisión» hasta validación por la coordinación.'
          : 'La oportunidad se ha creado correctamente',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });

      // Resetear formulario
      setFormData({
        nombreCargo: '',
        auxilioEconomico: false,
        requiereConfidencialidad: false,
        apoyoEconomico: '',
        tipoVinculacion: '',
        periodo: '',
        vacantes: '',
        fechaVencimiento: '',
        pais: '',
        ciudad: '',
        jornadaOrdinariaSemanal: '',
        dedicacion: '',
        fechaInicioPractica: '',
        fechaFinPractica: '',
        horario: '',
        areaDesempeno: '',
        enlacesFormatoEspecificos: '',
        primerDocumento: null,
        primerDocumentoNombre: '',
        primerDocumentoRequerido: false,
        segundoDocumento: null,
        segundoDocumentoNombre: '',
        tercerDocumento: null,
        tercerDocumentoNombre: '',
        salarioEmocional: '',
        promedioMinimoRequerido: '',
        formacionAcademica: [],
        idiomas: [],
        funciones: '',
        requisitos: ''
      });
      setNewProgramLevel('');
      setNewProgramName('');
      setNewLanguage('');
      setNewLanguageLevel('');
      setSalarioEmocionalSearch('');
      setShowSalarioEmocionalDropdown(false);
      setTipoOportunidad(null);
      setSelectedLinkageDescription('');

      if (entityPortalMode) {
        navigate('/entidad/oportunidades', { replace: true });
        return;
      }

      // Recargar lista y volver a la vista de lista
      await loadOportunidades();
      setVista('lista');
      setSelectedCompany(null);
      setCompanySearch('');
    } catch (error) {
      Swal.close();
      const errorMessage = error.response?.data?.message || error.message || 'Error al guardar la oportunidad';
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    }
  };

  const handleVolver = async () => {
    // Verificar si hay datos en el formulario
    const hasData = formData.nombreCargo || 
                    formData.auxilioEconomico || 
                    formData.requiereConfidencialidad ||
                    formData.apoyoEconomico ||
                    formData.tipoVinculacion ||
                    formData.periodo ||
                    formData.vacantes ||
                    formData.fechaVencimiento ||
                    formData.pais ||
                    formData.ciudad ||
                    formData.jornadaOrdinariaSemanal ||
                    formData.dedicacion ||
                    formData.fechaInicioPractica ||
                    formData.fechaFinPractica ||
                    formData.horario ||
                    formData.areaDesempeno ||
                    formData.enlacesFormatoEspecificos ||
                    formData.primerDocumento ||
                    formData.segundoDocumento ||
                    formData.tercerDocumento ||
                    formData.salarioEmocional ||
                    formData.promedioMinimoRequerido ||
                    (formData.formacionAcademica && formData.formacionAcademica.length > 0) ||
                    (formData.idiomas && formData.idiomas.length > 0) ||
                    formData.funciones ||
                    formData.requisitos;

    if (hasData) {
      const result = await Swal.fire({
        icon: 'warning',
        title: '¿Estás seguro?',
        text: 'Hay datos sin guardar en el formulario. ¿Deseas salir sin guardar?',
        showCancelButton: true,
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#c41e3a',
        cancelButtonColor: '#6c757d'
      });

      if (!result.isConfirmed) {
        return; // No hacer nada si cancela
      }
    }

    if (entityPortalMode) {
      navigate('/entidad/oportunidades');
      return;
    }

    setVista('lista');
    setSelectedCompany(null);
    setCompanySearch('');
    setSelectedLinkageDescription('');
    setTipoOportunidad(null);
    setSalarioEmocionalSearch('');
    setShowSalarioEmocionalDropdown(false);
    setFormData({
      nombreCargo: '',
      auxilioEconomico: false,
      requiereConfidencialidad: false,
      apoyoEconomico: '',
      tipoVinculacion: '',
      periodo: '',
      vacantes: '',
      fechaVencimiento: '',
      pais: '',
      ciudad: '',
      jornadaOrdinariaSemanal: '',
      dedicacion: '',
      fechaInicioPractica: '',
      fechaFinPractica: '',
      horario: '',
      areaDesempeno: '',
      enlacesFormatoEspecificos: '',
      primerDocumento: null,
      primerDocumentoNombre: '',
      primerDocumentoRequerido: false,
      segundoDocumento: null,
      segundoDocumentoNombre: '',
      tercerDocumento: null,
      tercerDocumentoNombre: '',
      salarioEmocional: '',
      promedioMinimoRequerido: '',
      formacionAcademica: [],
      idiomas: [],
      funciones: '',
      requisitos: ''
    });
    setNewProgramLevel('');
    setNewProgramName('');
    setNewLanguage('');
    setNewLanguageLevel('');
  };

  // Función para enviar a revisión
  const handleEnviarRevision = async () => {
    if (!oportunidadSeleccionada) return;
    
    try {
      Swal.fire({
        title: 'Enviando a revisión...',
        text: 'Por favor espere',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      await api.patch(`/opportunities/${oportunidadSeleccionada._id}/status`, {
        estado: 'En Revisión'
      });

      Swal.close();
      await Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: 'La oportunidad ha sido enviada a revisión',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });

      // Recargar la oportunidad
      const { data } = await api.get(`/opportunities/${oportunidadSeleccionada._id}`);
      setOportunidadSeleccionada(data);
      await loadOportunidades();
    } catch (error) {
      Swal.close();
      const errorMessage = error.response?.data?.message || error.message || 'Error al enviar a revisión';
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    }
  };

  // Función para aprobar programa
  const handleAprobarPrograma = async (programa, comentarios) => {
    if (!oportunidadSeleccionada) return;
    
    try {
      setShowModalAprobacion(false); // Cerrar primero el modal para que el Swal quede por delante
      Swal.fire({
        title: 'Aprobando programa...',
        text: 'Por favor espere',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
        customClass: { container: 'swal-over-modal' }
      });

      await api.post(`/opportunities/${oportunidadSeleccionada._id}/approve-program`, {
        programa,
        comentarios
      });

      Swal.close();
      await Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: `El programa ${programa.program} ha sido aprobado`,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a',
        customClass: { container: 'swal-over-modal' }
      });

      // Recargar la oportunidad
      const { data } = await api.get(`/opportunities/${oportunidadSeleccionada._id}`);
      
      // Si la oportunidad estaba en "En Revisión" y ahora tiene al menos un programa aprobado,
      // cambiar el estado a "Activa"
      if (data.estado === 'En Revisión' && data.aprobacionesPorPrograma) {
        const tieneProgramasAprobados = data.aprobacionesPorPrograma.some(
          ap => ap.estado === 'aprobado'
        );
        
        if (tieneProgramasAprobados) {
          // Cambiar el estado a Activa usando el endpoint correcto
          await api.patch(`/opportunities/${oportunidadSeleccionada._id}/status`, {
            estado: 'Activa'
          });
          
          // Recargar nuevamente para obtener el estado actualizado
          const { data: updatedData } = await api.get(`/opportunities/${oportunidadSeleccionada._id}`);
          setOportunidadSeleccionada(updatedData);
        } else {
          setOportunidadSeleccionada(data);
        }
      } else {
        setOportunidadSeleccionada(data);
      }
      
      await loadOportunidades();
    } catch (error) {
      Swal.close();
      const errorMessage = error.response?.data?.message || error.message || 'Error al aprobar programa';
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a',
        customClass: { container: 'swal-over-modal' }
      });
    }
  };

  // Función para rechazar programa
  const handleRechazarPrograma = async (programa, comentarios) => {
    if (!oportunidadSeleccionada) return;
    
    try {
      setShowModalAprobacion(false); // Cerrar primero el modal para que el Swal quede por delante
      Swal.fire({
        title: 'Rechazando programa...',
        text: 'Por favor espere',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
        customClass: { container: 'swal-over-modal' }
      });

      await api.post(`/opportunities/${oportunidadSeleccionada._id}/reject-program`, {
        programa,
        comentarios
      });

      Swal.close();
      await Swal.fire({
        icon: 'success',
        title: 'Programa rechazado',
        text: `El programa ${programa.program} ha sido rechazado`,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a',
        customClass: { container: 'swal-over-modal' }
      });

      // Recargar la oportunidad
      const { data } = await api.get(`/opportunities/${oportunidadSeleccionada._id}`);
      setOportunidadSeleccionada(data);
      await loadOportunidades();
    } catch (error) {
      Swal.close();
      const errorMessage = error.response?.data?.message || error.message || 'Error al rechazar programa';
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a',
        customClass: { container: 'swal-over-modal' }
      });
    }
  };

  // Función para obtener programas pendientes del usuario actual
  const getProgramasPendientesUsuario = () => {
    if (!oportunidadSeleccionada || !oportunidadSeleccionada.aprobacionesPorPrograma) return [];
    
    // Por ahora, retornamos todos los programas pendientes
    // En el futuro, aquí se filtraría por los programas del coordinador
    return oportunidadSeleccionada.aprobacionesPorPrograma.filter(
      ap => ap.estado === 'pendiente'
    );
  };

  // Función para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  };

  // Función para obtener el texto del tipo de vinculación (objeto Item poblado, _id o valor legacy)
  const getTipoVinculacionText = (tipo) => {
    if (!tipo) return '';
    if (typeof tipo === 'object' && tipo.value) return tipo.value;
    const id = typeof tipo === 'object' && tipo._id ? tipo._id : tipo;
    if (linkageTypes.length && id) {
      const item = linkageTypes.find(l => String(l._id) === String(id));
      if (item) return item.value;
    }
    const tipos = {
      'contrato_laboral_nomina': 'Contrato laboral por nómina',
      'contrato_aprendizaje': 'Contrato de aprendizaje',
      'convenio_docencia_servicio': 'Convenio docencia servicio',
      'acto_administrativo': 'Acto administrativo',
      'acuerdo_vinculacion': 'Acuerdo de vinculación',
      'otro_documento': 'Otro documento'
    };
    return tipos[id] || id || '';
  };

  // Función para obtener el texto de dedicación
  const getDedicacionText = (dedicacion) => {
    const dedicaciones = {
      'tiempo_completo': 'Tiempo Completo (100%)',
      'medio_tiempo': 'Medio Tiempo (50%)',
      'por_horas': 'Por Horas'
    };
    return dedicaciones[dedicacion] || dedicacion;
  };

  // Función para obtener el texto del salario emocional
  const getSalarioEmocionalText = (value) => {
    const opcion = opcionesSalarioEmocional.find(op => op.value === value);
    return opcion ? opcion.label : value;
  };

  // Función para cargar historial de estados
  const loadHistorialEstados = async () => {
    if (!oportunidadSeleccionada) return;
    const base = oportunidadSeleccionada._isMTM ? '/oportunidades-mtm' : '/opportunities';
    try {
      const { data } = await api.get(`${base}/${oportunidadSeleccionada._id}/history`);
      setHistorialEstados(data.historial || []);
      setShowModalHistorial(true);
    } catch (error) {
      console.error('Error cargando historial:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cargar el historial de estados',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    }
  };

  // Función para rechazar oportunidad
  const handleRechazarOportunidad = async () => {
    if (!motivoRechazo) {
      await Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'Debe seleccionar un motivo de rechazo',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
      return;
    }

    if (motivoRechazo === 'Otro' && !motivoRechazoOtro.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'Debe ingresar el motivo de rechazo',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
      return;
    }

    try {
      Swal.fire({
        title: 'Rechazando oportunidad...',
        text: 'Por favor espere',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      await api.post(`/opportunities/${oportunidadSeleccionada._id}/reject`, {
        motivoRechazo,
        motivoRechazoOtro: motivoRechazo === 'Otro' ? motivoRechazoOtro : null
      });

      Swal.close();
      await Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: 'La oportunidad ha sido rechazada',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });

      // Recargar la oportunidad
      const { data } = await api.get(`/opportunities/${oportunidadSeleccionada._id}`);
      setOportunidadSeleccionada(data);
      setShowModalRechazo(false);
      setMotivoRechazo('');
      setMotivoRechazoOtro('');
      await loadOportunidades();
    } catch (error) {
      Swal.close();
      const errorMessage = error.response?.data?.message || error.message || 'Error al rechazar oportunidad';
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    }
  };

  const MOTIVOS_NO_CONTRATO = [
    'Contratación otra universidad',
    'Promoción interna',
    'Las hojas de vida no cumplieron con el perfil publicado',
    'El candidato seleccionado no aceptó la propuesta',
    'Otro'
  ];

  /** Cierre MTM cuando no se contrata — alineado a reglas de negocio de monitoría/tutoría/mentoría. */
  const MOTIVOS_NO_CONTRATO_MTM = [
    'El postulante no aceptó la propuesta',
    'Cierre de grupo por motivos institucionales',
    'Anulación del espacio de acompañamiento',
    'Otro'
  ];

  const handleCerrarOportunidad = async () => {
    if (!cerrarContrato) {
      Swal.fire({ icon: 'warning', title: 'Seleccione si contrató o no', confirmButtonColor: '#c41e3a' });
      return;
    }
    if (cerrarContrato === 'no') {
      if (!cerrarMotivoNo) {
        Swal.fire({ icon: 'warning', title: 'Seleccione el motivo', confirmButtonColor: '#c41e3a' });
        return;
      }
      if (cerrarMotivoNo === 'Otro' && !cerrarMotivoNoOtro.trim()) {
        Swal.fire({ icon: 'warning', title: 'Ingrese el motivo', text: 'Debe escribir el motivo al seleccionar Otro', confirmButtonColor: '#c41e3a' });
        return;
      }
    }
    const vacantes = oportunidadSeleccionada?.vacantes || 1;
    if (cerrarContrato === 'si') {
      if (selectedPostulantesCerrar.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Seleccione al menos un postulante', confirmButtonColor: '#c41e3a' });
        return;
      }
      if (selectedPostulantesCerrar.length > vacantes) {
        Swal.fire({ icon: 'warning', title: `Solo puede seleccionar hasta ${vacantes} postulante(s) (vacantes)`, confirmButtonColor: '#c41e3a' });
        return;
      }
      // Validar Fecha Inicio Práctica solo para prácticas (MTM no lleva datos tutor)
      if (!oportunidadSeleccionada._isMTM) {
        const vencimientoYMD = oportunidadSeleccionada?.fechaVencimiento ? (typeof oportunidadSeleccionada.fechaVencimiento === 'string' ? oportunidadSeleccionada.fechaVencimiento.slice(0, 10) : new Date(oportunidadSeleccionada.fechaVencimiento).toISOString().slice(0, 10)) : '';
        const minInicioPractica = addDaysToDate(vencimientoYMD, practiceStartDaysAfterExpiry);
        if (minInicioPractica) {
          const conFechaInvalida = selectedPostulantesCerrar.some(pid => {
            const d = datosTutorCerrar[pid] || {};
            const f = d.fechaInicioPractica;
            if (!f) return false;
            const fYMD = typeof f === 'string' ? f.slice(0, 10) : new Date(f).toISOString().slice(0, 10);
            return fYMD < minInicioPractica;
          });
          if (conFechaInvalida) {
            Swal.fire({ icon: 'warning', title: 'Fecha inicio práctica inválida', text: `La fecha de inicio de la práctica debe ser al menos ${practiceStartDaysAfterExpiry} día(s) después de la fecha de vencimiento de la oportunidad (mín. ${minInicioPractica}).`, confirmButtonColor: '#c41e3a' });
            return;
          }
        }
        const reqTutorCerrar = ['nombreTutor', 'apellidoTutor', 'emailTutor', 'telefonoTutor', 'cargoTutor', 'tipoIdentTutor', 'identificacionTutor', 'arlEmpresa', 'fechaInicioPractica'];
        const incompletoCerrar = selectedPostulantesCerrar.some((pid) => {
          const d = datosTutorCerrar[pid] || {};
          return reqTutorCerrar.some((f) => d[f] == null || String(d[f]).trim() === '');
        });
        if (incompletoCerrar) {
          Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: 'Complete todos los campos del tutor (incluido teléfono) y la fecha de inicio de la práctica para cada postulante seleccionado.', confirmButtonColor: '#c41e3a' });
          return;
        }
      }
    }
    try {
      Swal.fire({ title: 'Cerrando oportunidad...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      const isMTM = oportunidadSeleccionada._isMTM;
      if (isMTM) {
        const motivoNoContrato =
          cerrarContrato === 'no'
            ? (cerrarMotivoNo === 'Otro' ? cerrarMotivoNoOtro.trim() : cerrarMotivoNo)
            : undefined;
        const payload = {
          contrató: cerrarContrato === 'si',
          motivoNoContrato,
          postulantesSeleccionados: cerrarContrato === 'si' ? selectedPostulantesCerrar : []
        };
        await api.post(`/oportunidades-mtm/${oportunidadSeleccionada._id}/cerrar`, payload);
      } else {
        const payload = {
          contrató: cerrarContrato === 'si',
          motivoNoContrato: cerrarContrato === 'no' ? (cerrarMotivoNo === 'Otro' ? cerrarMotivoNoOtro : cerrarMotivoNo) : undefined,
          postulantesSeleccionados: cerrarContrato === 'si' ? selectedPostulantesCerrar : [],
          datosTutor: cerrarContrato === 'si' ? selectedPostulantesCerrar.map(pid => {
            const d = datosTutorCerrar[pid] || {};
            return {
              postulacionId: pid,
              nombreTutor: d.nombreTutor || '',
              apellidoTutor: d.apellidoTutor || '',
              emailTutor: d.emailTutor || '',
              telefonoTutor: d.telefonoTutor || '',
              cargoTutor: d.cargoTutor || '',
              tipoIdentTutor: d.tipoIdentTutor || '',
              arlEmpresa: d.arlEmpresa || '',
              identificacionTutor: d.identificacionTutor || '',
              fechaInicioPractica: d.fechaInicioPractica ? new Date(d.fechaInicioPractica).toISOString() : null
            };
          }) : []
        };
        await api.post(`/opportunities/${oportunidadSeleccionada._id}/close`, payload);
      }
      Swal.close();
      setShowModalCerrarOportunidad(false);
      setCerrarContrato('');
      setCerrarMotivoNo('');
      setCerrarMotivoNoOtro('');
      setSelectedPostulantesCerrar([]);
      setDatosTutorCerrar({});
      await Swal.fire({
        icon: 'success',
        title: 'Oportunidad cerrada correctamente',
        confirmButtonColor: '#c41e3a',
        customClass: { container: 'swal-over-modal-cierre' },
      });
      const base = isMTM ? '/oportunidades-mtm' : '/opportunities';
      const { data } = await api.get(`${base}/${oportunidadSeleccionada._id}`);
      setOportunidadSeleccionada(isMTM ? { ...data, _isMTM: true } : data);
      await loadOportunidades();
    } catch (err) {
      Swal.close();
      setShowModalCerrarOportunidad(false);
      setCerrarContrato('');
      setCerrarMotivoNo('');
      setCerrarMotivoNoOtro('');
      setSelectedPostulantesCerrar([]);
      setDatosTutorCerrar({});
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'No se pudo cerrar la oportunidad',
        confirmButtonColor: '#c41e3a',
        customClass: { container: 'swal-over-modal-cierre' },
      });
    }
  };

  /** Duplicar: abre el formulario de creación con datos precargados (no crea registro hasta pulsar Crear). */
  const handleDuplicarOportunidad = async () => {
    if (!oportunidadSeleccionada?._id) return;
    try {
      Swal.fire({ title: 'Cargando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const isMTM = oportunidadSeleccionada._isMTM;

      if (isMTM) {
        await loadMtmParams();
        const { data } = await api.get(`/oportunidades-mtm/${oportunidadSeleccionada._id}`);
        const prof = data.profesorResponsable;
        const profDisplay = prof ? [prof.nombres, prof.apellidos].filter(Boolean).join(' ') : (data.nombreProfesor || '');
        setShowSalarioEmocionalDropdown(false);
        setFormData({
          nombreCargo: data.nombreCargo || '',
          auxilioEconomico: false,
          requiereConfidencialidad: false,
          apoyoEconomico: '',
          tipoVinculacion: data.tipoVinculacion?._id || data.tipoVinculacion || '',
          periodo: data.periodo?._id || data.periodo || '',
          vacantes: data.vacantes != null ? String(data.vacantes) : '',
          fechaVencimiento: data.fechaVencimiento ? data.fechaVencimiento.slice(0, 10) : '',
          pais: '',
          ciudad: '',
          jornadaOrdinariaSemanal: '',
          dedicacion: '',
          fechaInicioPractica: '',
          fechaFinPractica: '',
          horario: data.horario || '',
          areaDesempeno: '',
          enlacesFormatoEspecificos: '',
          primerDocumento: null,
          primerDocumentoNombre: '',
          primerDocumentoRequerido: false,
          segundoDocumento: null,
          segundoDocumentoNombre: '',
          tercerDocumento: null,
          tercerDocumentoNombre: '',
          salarioEmocional: [],
          promedioMinimoRequerido: data.promedioMinimo != null ? String(data.promedioMinimo) : '',
          formacionAcademica: [],
          idiomas: [],
          funciones: data.funciones || '',
          requisitos: data.requisitos || ''
        });
        setMtmDedicacionHoras(data.dedicacionHoras?._id || data.dedicacionHoras || '');
        setMtmValorPorHora(data.valorPorHora?._id || data.valorPorHora || '');
        setMtmCategoria(data.categoria?._id || data.categoria || '');
        setMtmNombreProfesor(data.nombreProfesor || '');
        setMtmUnidadAcademica(data.unidadAcademica || '');
        setMtmGrupo(data.grupo || '');
        setMtmAsignaturas(Array.isArray(data.asignaturas) ? data.asignaturas : []);
        setMtmProgramas(Array.isArray(data.programas) ? data.programas : []);
        setMtmProfesorResponsable(prof?._id || '');
        setMtmProfesorDisplay(profDisplay);
        setMtmProfesorSearch('');
        setMtmAsigSearch('');
        setMtmProgramaSearch('');
        setShowMtmAsigDrop(false);
        setShowMtmProgramaDrop(false);
        setShowMtmProfesorDrop(false);
        setSelectedCompany(data.company || null);
        if (isAdmin) {
          setCompanySearch(data.company?.name || data.company?.commercialName || '');
          setShowCompanyDropdown(false);
          setCompanySearchResults([]);
        }
        setTipoOportunidad('monitoria');
        setOportunidadSeleccionada(null);
        setVista('crear');
        Swal.close();
        await Swal.fire({
          icon: 'info',
          title: 'Nueva oportunidad desde copia',
          text: 'Revise y ajuste los datos; luego pulse Crear para registrar.',
          confirmButtonColor: '#c41e3a'
        });
        return;
      }

      const { data: opp } = await api.get(`/opportunities/${oportunidadSeleccionada._id}`);
      const fd = buildEditFormDataFromOpp(opp);
      setShowSalarioEmocionalDropdown(false);
      if (fd) {
        setFormData((prev) => ({
          ...prev,
          ...fd,
          primerDocumento: null,
          primerDocumentoNombre: '',
          primerDocumentoRequerido: false,
          segundoDocumento: null,
          segundoDocumentoNombre: '',
          tercerDocumento: null,
          tercerDocumentoNombre: ''
        }));
      }
      setSelectedCompany(opp.company || null);
      if (isAdmin) {
        setCompanySearch(opp.company?.name || opp.company?.commercialName || '');
        setShowCompanyDropdown(false);
        setCompanySearchResults([]);
      }
      setTipoOportunidad('practica');
      setOportunidadSeleccionada(null);
      setVista('crear');
      Swal.close();
      await Swal.fire({
        icon: 'info',
        title: 'Nueva oportunidad desde copia',
        text: 'Revise y ajuste los datos; luego pulse Crear para registrar.',
        confirmButtonColor: '#c41e3a'
      });
    } catch (error) {
      Swal.close();
      const errorMessage = error.response?.data?.message || error.message || 'No se pudo preparar la copia';
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    }
  };

  // Motivos de rechazo
  const motivosRechazo = [
    'Aún no contamos con estudiantes del programa académico requerido',
    'El perfil es diferente al de los estudiantes de la Universidad',
    'El tiempo de la oferta supera la duración de la práctica exigida en el curriculum',
    'El tipo de vinculación propuesto en la oferta no corresponde a las formas de vinculación permitidas',
    'Es necesario la publicación de una sola oportunidad',
    'Funciones insuficientes',
    'Funciones no alineadas con programa académico',
    'Horario no permitidos para la realización de la práctica',
    'La empresa no cumple disposión legal vigente',
    'La forma de vinculación de la oportunidad no corresponde a la naturaleza jurídica de la entidad',
    'La información del salario no es clara',
    'La oferta de práctica ya se encuentra registrada',
    'La oferta no incluye auxilio económico',
    'La oferta no tiene funciones',
    'La oferta no tiene requisitos',
    'La oportunidad no cumple con los requisitos académicos exigidos en el currículum',
    'No cumple condiciones de prácticas obligatorias',
    'Patrocinio inferior a salario mínimo',
    'Por solicitud de la entidad',
    'Tiempo fuera de período académico',
    'Vacante cancelada',
    'Vacante ya cubierta',
    'Otro'
  ];

  // Cargar ciudades desde backend cuando hay país en edición/detalle
  useEffect(() => {
    if ((vista === 'editar' || vista === 'detalle') && editFormData && editFormData.pais) {
      api.get('/locations/cities', { params: { country: editFormData.pais, limit: 1000 } })
        .then(res => setEditCities(res.data?.data || []))
        .catch(() => setEditCities([]));
    } else {
      setEditCities([]);
    }
  }, [editFormData?.pais, vista]);

  // Inicializar salario emocional search en edición/detalle (ya no se usa para mostrar, solo para búsqueda)
  useEffect(() => {
    if ((vista === 'editar' || vista === 'detalle') && editFormData && (!editFormData.salarioEmocional || editFormData.salarioEmocional.length === 0)) {
      setEditSalarioEmocionalSearch('');
    }
  }, [editFormData?.salarioEmocional, vista]);

  // Cargar oportunidad por ID al abrir detalle/editar para tener refs poblados (periodo, pais, ciudad, dedicacion, etc.)
  // Solo para prácticas: las MTM ya se cargan con su propio GET al hacer clic en la tarjeta; no llamar a /opportunities con ID de MTM (da 404).
  useEffect(() => {
    if ((vista === 'detalle' || vista === 'editar') && oportunidadSeleccionada?._id && !oportunidadSeleccionada?._isMTM) {
      let cancelled = false;
      api.get(`/opportunities/${oportunidadSeleccionada._id}`)
        .then((res) => {
          if (cancelled) return;
          const opp = res.data;
          const formDataEdit = buildEditFormDataFromOpp(opp);
          if (formDataEdit) {
            setEditFormData(formDataEdit);
            setEditSelectedCompany(opp.company);
          }
          if (vista === 'detalle') setIsEditingDetail(false);
        })
        .catch((err) => {
          if (!cancelled) console.error('[Oportunidades] Error cargando oportunidad por ID:', err);
        });
      return () => { cancelled = true; };
    }
    if ((vista === 'detalle' || vista === 'editar') && oportunidadSeleccionada?._isMTM) {
      setIsEditingDetail(false);
    }
  }, [vista, oportunidadSeleccionada?._id, oportunidadSeleccionada?._isMTM]);

  // Filtrar opciones de salario emocional para edición
  const filteredEditSalarioEmocional = useMemo(() => {
    if (!editSalarioEmocionalSearch.trim()) return opcionesSalarioEmocional;
    const q = editSalarioEmocionalSearch.toLowerCase();
    return opcionesSalarioEmocional.filter(opcion =>
      opcion.label.toLowerCase().includes(q)
    );
  }, [editSalarioEmocionalSearch, opcionesSalarioEmocional]);

  // Filtrar opciones que ya están seleccionadas para no mostrarlas en el dropdown
  const filteredEditSalarioEmocionalDisponibles = useMemo(() => {
    if (!editFormData || !editFormData.salarioEmocional) return filteredEditSalarioEmocional;
    return filteredEditSalarioEmocional.filter(opcion => 
      !editFormData.salarioEmocional.includes(opcion.value)
    );
  }, [filteredEditSalarioEmocional, editFormData?.salarioEmocional]);

  if (
    entityPortalMode &&
    entityViewOpportunityId &&
    loading &&
    !oportunidadSeleccionada &&
    vista !== 'crear' &&
    vista !== 'editar'
  ) {
    return (
      <div className="oportunidades-content">
        <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Cargando oportunidad…</div>
      </div>
    );
  }

  if (vista === 'crear') {
    return (
      <div className="oportunidades-content">
        <div className="oportunidades-header form-header">
          <div className="form-header-left">
            <button className="btn-volver" onClick={handleVolver}>
              <FiArrowLeft className="btn-icon" />
              Volver
            </button>
            <div className="section-header">
              <h3>
                {tipoOportunidad === 'practica' ? (
                  <>
                    <HiOutlineAcademicCap style={{ marginRight: '8px', display: 'inline-block' }} />
                    PRÁCTICA
                  </>
                ) : tipoOportunidad === 'monitoria' ? (
                  <>
                    <FiBookOpen style={{ marginRight: '8px', display: 'inline-block' }} />
                    MONITORÍA / TUTORÍA / MENTORÍA
                  </>
                ) : (
                  'CREAR OPORTUNIDAD'
                )}
              </h3>
            </div>
          </div>
          {(tipoOportunidad === 'practica' || tipoOportunidad === 'monitoria') && (
            <div className="form-header-right">
              <button className="btn-guardar-header" onClick={handleSaveForm}>
                <FiFileText className="btn-icon" />
                Guardar
              </button>
            </div>
          )}
        </div>

        <div className="oportunidades-section">
          {!tipoOportunidad ? (
            /* ── PASO 1: Selección de tipo ─────────────────────────────── */
            <div className="tipo-oportunidad-container">
              <h2 className="tipo-oportunidad-title">¿Qué tipo de oferta deseas crear?</h2>
              {loadingUniversidad ? (
                <div className="select-company-message"><p>Cargando empresa de la universidad...</p></div>
              ) : (
                <div className="tipo-oportunidad-options">
                  <div className="tipo-oportunidad-card" onClick={() => handleSelectTipo('practica')}>
                    <div className="tipo-oportunidad-icon practica">
                      <HiOutlineAcademicCap />
                    </div>
                    <span className="tipo-oportunidad-text">Práctica</span>
                  </div>
                  <div className="tipo-oportunidad-card" onClick={() => handleSelectTipo('monitoria')}>
                    <div className="tipo-oportunidad-icon monitoria">
                      <FiBookOpen />
                    </div>
                    <span className="tipo-oportunidad-text">Monitorías, tutorías y mentorías</span>
                  </div>
                </div>
              )}
            </div>
          ) : tipoOportunidad === 'practica' && isAdmin && !selectedCompany ? (
            /* ── PASO 2 (solo Práctica + Admin): Selección de empresa ──── */
            <div className="company-selection-step">
            <div className="company-selection-container">
              <div className="company-selection-back">
                <button
                  type="button"
                  className="btn-volver-tipo"
                  onClick={() => { setTipoOportunidad(null); setSelectedCompany(null); setCompanySearch(''); }}
                >
                  ← Cambiar tipo de oferta
                </button>
              </div>
              <label className="company-selection-label">Seleccione la empresa para la práctica:</label>
              <div className="company-search-wrapper">
                <input
                  type="text"
                  className="company-search-input"
                  placeholder="Escriba nombre o NIT de la empresa para buscar..."
                  value={companySearch}
                  onChange={(e) => { setCompanySearch(e.target.value); setShowCompanyDropdown(true); }}
                  onFocus={() => { if (companySearch.trim()) setShowCompanyDropdown(true); }}
                />
                {showCompanyDropdown && companySearch.trim() !== '' && (
                  <div className="company-dropdown">
                    {companySearchLoading ? (
                      <div className="company-dropdown-item company-dropdown-empty">Buscando...</div>
                    ) : companySearchResults.length > 0 ? (
                      companySearchResults.map(company => (
                        <div
                          key={company._id}
                          className="company-dropdown-item"
                          onClick={() => handleSelectCompany(company)}
                        >
                          {company.name || company.commercialName}
                          {company.nit ? <span className="company-dropdown-nit"> · NIT {company.nit}</span> : null}
                        </div>
                      ))
                    ) : (
                      <div className="company-dropdown-item company-dropdown-empty">Sin coincidencias</div>
                    )}
                  </div>
                )}
              </div>
              {selectedCompany && (
                <div className="selected-company">
                  Empresa seleccionada: <strong>{selectedCompany.name || selectedCompany.commercialName}</strong>
                </div>
              )}
            </div>
            </div>
          ) : tipoOportunidad === 'practica' ? (
            <div className="formulario-practica-container">
              <form className="practica-form">
                {/* Nombre del cargo */}
                <div className="form-field-group form-field-half-width">
                  <label className="form-label">Nombre del cargo</label>
                  <input
                    type="text"
                    name="nombreCargo"
                    value={formData.nombreCargo}
                    onChange={handleFormChange}
                    className="form-input"
                    placeholder="Ingrese el nombre del cargo"
                  />
                </div>

                {/* Nombre de la empresa */}
                {selectedCompany && (
                  <div className="form-field-group form-field-half-width">
                    <label className="form-label">Empresa</label>
                    <div className="company-display">
                      {selectedCompany.name || selectedCompany.commercialName}
                    </div>
                  </div>
                )}

                {/* Switches de auxilio económico */}
                <div className="form-field-group form-field-full-width">
                  <div className="rol-switch-container">
                    <label className="rol-switch">
                      <input
                        type="checkbox"
                        name="auxilioEconomico"
                        checked={formData.auxilioEconomico}
                        onChange={handleFormChange}
                      />
                      <span className="rol-slider"></span>
                    </label>
                    <span className="rol-status-text">
                      ¿La práctica cuenta con auxilio económico?
                    </span>
                  </div>
                </div>

                <div className="form-field-group form-field-full-width">
                  <div className="rol-switch-container">
                    <label className="rol-switch">
                      <input
                        type="checkbox"
                        name="requiereConfidencialidad"
                        checked={formData.requiereConfidencialidad}
                        onChange={handleFormChange}
                        disabled={!formData.auxilioEconomico}
                      />
                      <span className="rol-slider"></span>
                    </label>
                    <span className="rol-status-text">
                      ¿Requiere confidencialidad para el auxilio económico?
                    </span>
                  </div>
                </div>

                {/* Apoyo económico */}
                {formData.auxilioEconomico && (
                  <div className="form-field-group">
                    <label className="form-label-with-icon">
                      <FiDollarSign className="label-icon" />
                      Apoyo económico
                      <div className="info-tooltip-wrapper">
                        <span className="info-icon">i</span>
                        <div className="tooltip-content">
                          <strong>Información</strong>
                          <p>Mínimo configurado en reglas de negocio: <strong>${minApoyoEconomicoCOP.toLocaleString('es-CO')}</strong> COP. El formato usa separador de miles.</p>
                        </div>
                      </div>
                    </label>
                    <div className="currency-input-wrapper">
                      <input
                        type="text"
                        name="apoyoEconomico"
                        value={formData.apoyoEconomico ? formatCurrency(formData.apoyoEconomico) : ''}
                        onChange={handleFormChange}
                        className="form-input currency-input"
                        placeholder="Ingrese el monto"
                        style={apoyoMenorAlMinimoLegal(formData.auxilioEconomico, formData.apoyoEconomico) ? estiloInputJornadaInvalida : undefined}
                        aria-invalid={apoyoMenorAlMinimoLegal(formData.auxilioEconomico, formData.apoyoEconomico)}
                      />
                    </div>
                    {apoyoMenorAlMinimoLegal(formData.auxilioEconomico, formData.apoyoEconomico) && (
                      <p className="form-error-text" style={{ color: '#dc2626', fontSize: 13, marginTop: 6 }}>
                        {`Debe ser al menos $${minApoyoEconomicoCOP.toLocaleString('es-CO')} COP (regla de negocio).`}
                      </p>
                    )}
                  </div>
                )}

                {/* Tipo de vinculación */}
                <div className="form-field-group">
                  <label className="form-label-with-icon">
                    <FiFileText className="label-icon" />
                    Tipo de vinculación
                    {selectedLinkageDescription && (
                      <div className="info-tooltip-wrapper">
                        <span className="info-icon">i</span>
                        <div className="tooltip-content">
                          <strong>Información</strong>
                          <p>{selectedLinkageDescription}</p>
                        </div>
                      </div>
                    )}
                  </label>
                  <select
                    name="tipoVinculacion"
                    value={formData.tipoVinculacion}
                    onChange={handleFormChange}
                    className="form-select"
                  >
                    <option value="">Seleccionar</option>
                    {linkageTypes.map(linkage => (
                      <option key={linkage._id} value={linkage._id}>
                        {linkage.value}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Periodo */}
                <div className="form-field-group">
                  <label className="form-label-with-icon">
                    <FiBook className="label-icon" />
                    Periodo
                  </label>
                  <select
                    name="periodo"
                    value={formData.periodo}
                    onChange={handleFormChange}
                    className="form-select"
                  >
                    <option value="">Seleccionar una opción</option>
                    {practicaPeriodos.map(p => <option key={p._id} value={p._id}>{p.codigo}</option>)}
                  </select>
                </div>

                {/* Vacantes */}
                <div className="form-field-group">
                  <label className="form-label-with-icon">
                    <FiUsers className="label-icon" />
                    Vacantes
                  </label>
                  <input
                    type="number"
                    name="vacantes"
                    value={formData.vacantes}
                    onChange={handleFormChange}
                    className="form-input"
                    min="1"
                    placeholder="Número de vacantes"
                  />
                </div>

                {/* Fecha de vencimiento */}
                <div className="form-field-group">
                  <label className="form-label-with-icon">
                    <FiCalendar className="label-icon" />
                    Fecha de vencimiento
                  </label>
                  <input
                    type="date"
                    name="fechaVencimiento"
                    value={formData.fechaVencimiento}
                    onChange={handleFormChange}
                    className="form-input"
                    min={minDateVencimiento}
                  />
                </div>

                {/* País y ciudad (select con buscador) */}
                <div className="form-field-group form-field-half-width">
                  <div className="country-city-group">
                    <div className="form-field-group">
                      <label className="form-label-with-icon" htmlFor="crear-oportunidad-pais">
                        <FiMapPin className="label-icon" />
                        País
                      </label>
                      <Select
                        inputId="crear-oportunidad-pais"
                        classNamePrefix="oportunidades-loc-pais"
                        placeholder="Buscar o seleccionar país"
                        isClearable
                        options={countrySelectOptionsCrear}
                        value={countrySelectValueCrear}
                        onChange={(opt) =>
                          setFormData((prev) => ({
                            ...prev,
                            pais: opt?.value || '',
                            ciudad: '',
                          }))
                        }
                        noOptionsMessage={({ inputValue }) =>
                          inputValue ? 'Sin coincidencias' : 'Sin países disponibles'
                        }
                        styles={oportunidadLocationSelectStyles}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        menuPosition="fixed"
                      />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label-with-icon" htmlFor="crear-oportunidad-ciudad">
                        <FiMapPin className="label-icon" />
                        Ciudad
                      </label>
                      <Select
                        inputId="crear-oportunidad-ciudad"
                        classNamePrefix="oportunidades-loc-ciudad"
                        placeholder={
                          formData.pais
                            ? 'Buscar o seleccionar ciudad'
                            : 'Primero seleccione un país'
                        }
                        isClearable
                        isDisabled={!formData.pais}
                        options={citySelectOptionsCrear}
                        value={citySelectValueCrear}
                        onChange={(opt) =>
                          setFormData((prev) => ({
                            ...prev,
                            ciudad: opt?.value || '',
                          }))
                        }
                        noOptionsMessage={({ inputValue }) =>
                          !formData.pais
                            ? 'Seleccione un país primero'
                            : inputValue
                              ? 'Sin coincidencias'
                              : 'Sin ciudades para este país'
                        }
                        styles={oportunidadLocationSelectStyles}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        menuPosition="fixed"
                      />
                    </div>
                  </div>
                </div>

                {/* Jornada Ordinaria Semanal */}
                <div className="form-field-group">
                  <label className="form-label-with-icon">
                    <FiClock className="label-icon" />
                    Jornada ordinaria semanal
                    <div className="info-tooltip-wrapper">
                      <span className="info-icon">i</span>
                      <div className="tooltip-content">
                        <strong>Información</strong>
                        <p>Es el total de horas semanales que según los reglamentos de la empresa/entidad deben cumplir los empleados.</p>
                        <p>Máximo permitido: {maxJornadaOrdinariaSemanal} h/semana (regla de negocio).</p>
                      </div>
                    </div>
                  </label>
                  <input
                    type="number"
                    name="jornadaOrdinariaSemanal"
                    value={formData.jornadaOrdinariaSemanal}
                    onChange={handleFormChange}
                    className="form-input"
                    min="0"
                    max={maxJornadaOrdinariaSemanal}
                    placeholder={`Máx. ${maxJornadaOrdinariaSemanal} h`}
                    style={jornadaExcedeMaximo(formData.jornadaOrdinariaSemanal) ? estiloInputJornadaInvalida : undefined}
                    aria-invalid={jornadaExcedeMaximo(formData.jornadaOrdinariaSemanal)}
                  />
                  {jornadaExcedeMaximo(formData.jornadaOrdinariaSemanal) && (
                    <span style={{ color: '#b91c1c', fontSize: 12, marginTop: 6, display: 'block', fontWeight: 600 }}>
                      Supera el máximo de {maxJornadaOrdinariaSemanal} horas semanales.
                    </span>
                  )}
                </div>

                {/* Dedicación */}
                <div className="form-field-group">
                  <label className="form-label">Dedicación</label>
                  <select
                    name="dedicacion"
                    value={formData.dedicacion}
                    onChange={handleFormChange}
                    className="form-select"
                  >
                    <option value="">Seleccionar</option>
                    {dedicationTypes.map(dedication => (
                      <option key={dedication._id} value={dedication._id}>
                        {dedication.description || dedication.value}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fecha inicio práctica */}
                <div className="form-field-group">
                  <label className="form-label">Fecha inicio de la práctica</label>
                  <input
                    type="date"
                    name="fechaInicioPractica"
                    value={formData.fechaInicioPractica}
                    onChange={handleFormChange}
                    className="form-input"
                    min={addDaysToDate(formData.fechaVencimiento, practiceStartDaysAfterExpiry) || undefined}
                  />
                </div>

                {/* Fecha fin práctica */}
                <div className="form-field-group">
                  <label className="form-label">Fecha fin de la práctica</label>
                  <input
                    type="date"
                    name="fechaFinPractica"
                    value={formData.fechaFinPractica}
                    onChange={handleFormChange}
                    className="form-input"
                    min={addDaysToDate(formData.fechaInicioPractica, practiceEndDaysAfterStart) || undefined}
                  />
                </div>

                {/* Horario */}
                <div className="form-field-group form-field-half-width">
                  <label className="form-label">
                    Horario
                    <div className="info-tooltip-wrapper">
                      <span className="info-icon">i</span>
                      <div className="tooltip-content">
                        <strong>Información</strong>
                        <p>Apreciada entidad, de acuerdo con los horarios de trabajo establecidos en el código sustantivo del trabajo el horario es de lunes a viernes 08:00 a.m. a las 05:00 p.m. Si usted como entidad maneja un horario diferente para el desarrollo de la práctica, ingrese el horario establecido y las variaciones que la compañía maneja.</p>
                      </div>
                    </div>
                  </label>
                  <textarea
                    name="horario"
                    value={formData.horario}
                    onChange={handleFormChange}
                    className="form-textarea form-textarea-small"
                    placeholder="Describa el horario de la práctica..."
                    rows="3"
                  />
                </div>

                {/* Área de Desempeño y Enlaces o formato específicos */}
                <div className="form-field-group form-field-half-width">
                  <label className="form-label">Área de desempeño</label>
                  <select
                    name="areaDesempeno"
                    value={formData.areaDesempeno}
                    onChange={handleFormChange}
                    className="form-select"
                  >
                    <option value="">Seleccionar</option>
                    {performanceAreas.map(area => (
                      <option key={area._id} value={area._id}>
                        {area.description || area.value}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Enlaces o formato específicos */}
                <div className="form-field-group form-field-full-width">
                  <label className="form-label">
                    Enlaces o formato específicos de aplicación
                    <div className="info-tooltip-wrapper">
                      <span className="info-icon">i</span>
                      <div className="tooltip-content">
                        <strong>Información</strong>
                        <p>Aquí puede ingresar enlaces que hagan referencia a otros formatos o información relevante que el postulante debe tener en cuenta o diligienciar (Máx 500 caracteres)</p>
                      </div>
                    </div>
                  </label>
                  <input
                    type="text"
                    name="enlacesFormatoEspecificos"
                    value={formData.enlacesFormatoEspecificos}
                    onChange={handleFormChange}
                    className="form-input"
                    placeholder="Ingrese enlaces o formato específico..."
                    maxLength={500}
                  />
                  {formData.enlacesFormatoEspecificos && (
                    <div className="character-count">
                      {formData.enlacesFormatoEspecificos.length}/500 caracteres
                    </div>
                  )}
                </div>

                {/* Primer Documento de Apoyo */}
                <div className="form-field-group form-field-half-width">
                  <label className="form-label">Primer documento de apoyo o requerido</label>
                  <div className="file-upload-container">
                    <input
                      type="file"
                      id="primerDocumento"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, 'primer')}
                      className="file-input-hidden"
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <label htmlFor="primerDocumento" className="file-select-button">
                        <FiFileText className="file-icon" />
                        Seleccionar archivo
                      </label>
                      {formData.primerDocumento && (
                        <>
                          <button type="button" className="opp-doc-btn opp-doc-btn--preview" title="Previsualizar" onClick={() => handlePreviewLocalFile(formData.primerDocumento)}>
                            <FiEye />
                          </button>
                          <button type="button" className="opp-doc-btn opp-doc-btn--delete" title="Quitar archivo" onClick={() => setFormData(prev => ({ ...prev, primerDocumento: null, primerDocumentoNombre: '' }))}>
                            <FiTrash2 />
                          </button>
                        </>
                      )}
                    </div>
                    <input
                      type="text"
                      value={formData.primerDocumentoNombre}
                      readOnly
                      className="file-name-input"
                      placeholder="Ningún archivo seleccionado"
                    />
                  </div>
                  <div className="document-required-toggle">
                    <span className="toggle-label">¿Este documento es requerido para la aplicación?</span>
                    <label className="rol-switch">
                      <input
                        type="checkbox"
                        name="primerDocumentoRequerido"
                        checked={formData.primerDocumentoRequerido}
                        onChange={handleFormChange}
                      />
                      <span className="rol-slider"></span>
                    </label>
                  </div>
                </div>

                {/* Segundo Documento de Apoyo */}
                <div className="form-field-group form-field-half-width">
                  <label className="form-label">Segundo documento de apoyo</label>
                  <div className="file-upload-container">
                    <input
                      type="file"
                      id="segundoDocumento"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, 'segundo')}
                      className="file-input-hidden"
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <label htmlFor="segundoDocumento" className="file-select-button">
                        <FiFileText className="file-icon" />
                        Seleccionar archivo
                      </label>
                      {formData.segundoDocumento && (
                        <>
                          <button type="button" className="opp-doc-btn opp-doc-btn--preview" title="Previsualizar" onClick={() => handlePreviewLocalFile(formData.segundoDocumento)}>
                            <FiEye />
                          </button>
                          <button type="button" className="opp-doc-btn opp-doc-btn--delete" title="Quitar archivo" onClick={() => setFormData(prev => ({ ...prev, segundoDocumento: null, segundoDocumentoNombre: '' }))}>
                            <FiTrash2 />
                          </button>
                        </>
                      )}
                    </div>
                    <input
                      type="text"
                      value={formData.segundoDocumentoNombre}
                      readOnly
                      className="file-name-input"
                      placeholder="Ningún archivo seleccionado"
                    />
                  </div>
                </div>

                {/* Tercer Documento de Apoyo */}
                <div className="form-field-group form-field-full-width">
                  <label className="form-label">Tercer documento de apoyo</label>
                  <div className="file-upload-container">
                    <input
                      type="file"
                      id="tercerDocumento"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, 'tercer')}
                      className="file-input-hidden"
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <label htmlFor="tercerDocumento" className="file-select-button">
                        <FiFileText className="file-icon" />
                        Seleccionar archivo
                      </label>
                      {formData.tercerDocumento && (
                        <>
                          <button type="button" className="opp-doc-btn opp-doc-btn--preview" title="Previsualizar" onClick={() => handlePreviewLocalFile(formData.tercerDocumento)}>
                            <FiEye />
                          </button>
                          <button type="button" className="opp-doc-btn opp-doc-btn--delete" title="Quitar archivo" onClick={() => setFormData(prev => ({ ...prev, tercerDocumento: null, tercerDocumentoNombre: '' }))}>
                            <FiTrash2 />
                          </button>
                        </>
                      )}
                    </div>
                    <input
                      type="text"
                      value={formData.tercerDocumentoNombre}
                      readOnly
                      className="file-name-input"
                      placeholder="Ningún archivo seleccionado"
                    />
                  </div>
                </div>

                {/* Salario Emocional */}
                <div className="form-field-group form-field-half-width">
                  <div className="programs-section">
                    <div className="programs-header">
                      <span className="programs-title">Salario emocional</span>
                    </div>
                    <div className="autocomplete-wrapper">
                      <select
                        className="form-select"
                        style={{ width: '100%', fontSize: '13px' }}
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            const opcion = opcionesSalarioEmocional.find(op => op.value === e.target.value);
                            if (opcion) {
                              handleSelectSalarioEmocional(opcion);
                              e.target.value = ''; // Resetear el select
                            }
                          }
                        }}
                      >
                        <option value="">-- Seleccione una opción --</option>
                        {filteredSalarioEmocionalDisponibles.map((opcion) => (
                          <option key={opcion.value} value={opcion.value}>
                            {opcion.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {(!formData.salarioEmocional || formData.salarioEmocional.length === 0) ? (
                      <div className="programs-empty">
                        <FiX style={{ marginRight: '4px', display: 'inline-block' }} />
                        No hay salarios emocionales configurados.
                      </div>
                    ) : (
                      <ul className="programs-list">
                        {formData.salarioEmocional.map((salario, idx) => {
                          const opcion = opcionesSalarioEmocional.find(op => op.value === salario);
                          return (
                            <li key={idx}>
                              {opcion ? opcion.label : salario}
                              <button
                                type="button"
                                className="program-remove"
                                onClick={() => handleRemoveSalarioEmocional(idx)}
                                title="Eliminar"
                              >
                                <FiX />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Promedio Mínimo Requerido */}
                <div className="form-field-group form-field-half-width">
                  <label className="form-label">
                    Promedio mínimo requerido
                    <div className="info-tooltip-wrapper">
                      <span className="info-icon">i</span>
                      <div className="tooltip-content">
                        <strong>Información</strong>
                        <p>Ingrese aquí el promedio mínimo requerido por el estudiante en caso de ser requisito para la vacante</p>
                      </div>
                    </div>
                  </label>
                  <input
                    type="text"
                    name="promedioMinimoRequerido"
                    value={formData.promedioMinimoRequerido}
                    onChange={handleFormChange}
                    className="form-input"
                    placeholder="Ej: 4.0"
                  />
                </div>

                {/* Formación Académica */}
                <div className="form-field-group form-field-half-width">
                  <div className="programs-section">
                    <div className="programs-header">
                      <span className="programs-title">Formación académica</span>
                      <button 
                        type="button" 
                        className="programs-add" 
                        onClick={() => {
                          if (!formData.periodo) {
                            Swal.fire({
                              icon: 'info',
                              title: 'Seleccione un periodo',
                              text: 'Primero elija el periodo de la práctica; así solo podrá agregar programas con condición curricular activa para ese periodo.',
                              confirmButtonText: 'Entendido',
                              confirmButtonColor: '#c41e3a'
                            });
                            return;
                          }
                          setShowProgramsModal(true);
                        }} 
                        title={formData.periodo ? 'Añadir programa' : 'Seleccione periodo primero'}
                        style={!formData.periodo ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                      >
                        <FiPlus />
                      </button>
                    </div>
                    {!formData.periodo && (
                      <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#92400e', background: '#fffbeb', padding: '8px 10px', borderRadius: 6, border: '1px solid #fde68a' }}>
                        Seleccione el <strong>periodo</strong> arriba para poder agregar programas.
                      </p>
                    )}
                    {(!formData.formacionAcademica || formData.formacionAcademica.length === 0) ? (
                      <div className="programs-empty">
                        <FiX style={{ marginRight: '4px', display: 'inline-block' }} />
                        {formData.periodo ? 'No hay programas configurados.' : 'Elija periodo para agregar programas.'}
                      </div>
                    ) : (
                      <ul className="programs-list">
                        {formData.formacionAcademica.map((p, idx) => (
                          <li key={idx}>
                            {p.level} - {p.program}
                            <button
                              type="button"
                              className="program-remove"
                              onClick={() => handleRemoveProgram(idx)}
                              title="Eliminar"
                            >
                              <FiX />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Idiomas */}
                <div className="form-field-group form-field-half-width">
                  <div className="programs-section">
                    <div className="programs-header">
                      <span className="programs-title">Idiomas</span>
                      <button 
                        type="button" 
                        className="programs-add" 
                        onClick={() => setShowLanguagesModal(true)} 
                        title="Añadir idioma"
                      >
                        <FiPlus />
                      </button>
                    </div>
                    {(!formData.idiomas || formData.idiomas.length === 0) ? (
                      <div className="programs-empty">
                        <FiX style={{ marginRight: '4px', display: 'inline-block' }} />
                        No tiene requisitos de idioma.
                      </div>
                    ) : (
                      <ul className="programs-list">
                        {formData.idiomas.map((lang, idx) => (
                          <li key={idx}>
                            {lang.language} - {lang.level}
                            <button
                              type="button"
                              className="program-remove"
                              onClick={() => handleRemoveLanguage(idx)}
                              title="Eliminar"
                            >
                              <FiX />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Funciones */}
                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon">
                    Funciones
                    <div className="info-tooltip-wrapper">
                      <span className="info-icon">i</span>
                      <div className="tooltip-content">
                        <strong>¡Información!</strong>
                        <p>Por favor, ingrese las funciones detalladas del cargo a desempeñar por el estudiante, éstas son indispensables para la adecuada aprobación de la oferta</p>
                      </div>
                    </div>
                  </label>
                  <textarea
                    name="funciones"
                    value={formData.funciones}
                    onChange={handleFormChange}
                    className="form-textarea"
                    placeholder="Describa las funciones del cargo..."
                    rows="5"
                  />
                  {formData.funciones && formData.funciones.length < 60 && (
                    <div className="validation-message">
                      Debe agregar las funciones con un tamaño mínimo de 60 caracteres.
                    </div>
                  )}
                </div>

                {/* Requisitos */}
                <div className="form-field-group form-field-half-width">
                  <label className="form-label">Requisitos</label>
                  <textarea
                    name="requisitos"
                    value={formData.requisitos}
                    onChange={handleFormChange}
                    className="form-textarea"
                    placeholder="Describa los requisitos..."
                    rows="5"
                  />
                  {!formData.requisitos && (
                    <div className="validation-message">
                      Debe agregar los requisitos.
                    </div>
                  )}
                </div>
              </form>
            </div>

          ) : tipoOportunidad === 'monitoria' ? (
            /* ── FORMULARIO MTM (compacto: 4 columnas, menos espacio) ─── */
            <div className="formulario-practica-container">
              <form className="practica-form mtm-form-compact">

                {/* Intro banner */}
                <div className="mtm-form-intro">
                  <HiOutlineAcademicCap className="mtm-form-intro-icon" />
                  <div className="mtm-form-intro-text">
                    <strong>Monitoría / Tutoría / Mentoría</strong>
                    <span>Completa los campos para registrar la oferta académica. Los campos con <span className="required">*</span> son obligatorios.</span>
                  </div>
                </div>

                {/* Fila superior: Nombre del cargo y Empresa */}
                <div className="form-field-group form-field-half-width mtm-top-row">
                  <label className="form-label-with-icon">
                    <FiFileText className="label-icon" />
                    Nombre del cargo <span className="required">*</span>
                  </label>
                  <input type="text" name="nombreCargo" value={formData.nombreCargo}
                    onChange={handleFormChange} className="form-input"
                    placeholder="Ej: Monitor de Cálculo Diferencial" maxLength={250} />
                </div>

                {selectedCompany && (
                  <div className="form-field-group form-field-half-width mtm-top-row">
                    <label className="form-label-with-icon">
                      <FiUsers className="label-icon" /> Empresa
                    </label>
                    <div className="company-display">{selectedCompany.name || selectedCompany.commercialName}</div>
                  </div>
                )}

                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon">
                    <FiList className="label-icon" /> Categoría
                  </label>
                  <select value={mtmCategoria} onChange={e => setMtmCategoria(e.target.value)} className="form-select">
                    <option value="">— Selecciona —</option>
                    {mtmCategoriaItems.map(c => <option key={c._id} value={c._id}>{c.value}</option>)}
                  </select>
                </div>

                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon">
                    <FiCalendar className="label-icon" /> Periodo académico
                  </label>
                  <select name="periodo" value={formData.periodo} onChange={handleFormChange} className="form-select">
                    <option value="">— Selecciona —</option>
                    {mtmPeriodos.map(p => <option key={p._id} value={p._id}>{p.codigo}</option>)}
                  </select>
                </div>

                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon">
                    <FiClock className="label-icon" /> Dedicación horas / semana
                  </label>
                  <select value={mtmDedicacionHoras} onChange={e => setMtmDedicacionHoras(e.target.value)} className="form-select">
                    <option value="">— Selecciona —</option>
                    {mtmDedicacionItems.map(d => <option key={d._id} value={d._id}>{d.value}{d.description ? ` — ${d.description}` : ''}</option>)}
                  </select>
                </div>

                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon">
                    <FiDollarSign className="label-icon" /> Valor por hora
                  </label>
                  <select value={mtmValorPorHora} onChange={e => setMtmValorPorHora(e.target.value)} className="form-select">
                    <option value="">— Selecciona —</option>
                    {mtmValorItems.map(v => <option key={v._id} value={v._id}>{v.value}{v.description ? ` — ${v.description}` : ''}</option>)}
                  </select>
                </div>

                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon">
                    <FiFileText className="label-icon" /> Tipo de vinculación
                  </label>
                  <select name="tipoVinculacion" value={formData.tipoVinculacion} onChange={handleFormChange} className="form-select">
                    <option value="">— Selecciona —</option>
                    {mtmVinculacionItems.map(v => <option key={v._id} value={v._id}>{v.value}{v.description ? ` — ${v.description}` : ''}</option>)}
                  </select>
                </div>

                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon">
                    <FiUsers className="label-icon" /> Vacantes
                  </label>
                  <input type="number" name="vacantes" min={1} value={formData.vacantes}
                    onChange={handleFormChange} className="form-input" placeholder="N° de vacantes" />
                </div>

                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon">
                    <FiCalendar className="label-icon" /> Fecha de vencimiento
                  </label>
                  <input type="date" name="fechaVencimiento" value={formData.fechaVencimiento}
                    onChange={handleFormChange} className="form-input" min={minDateVencimiento} />
                </div>

                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon">
                    <FiBookOpen className="label-icon" /> Promedio mínimo requerido
                  </label>
                  <input type="number" name="promedioMinimoRequerido" min={0} max={5} step={0.1}
                    value={formData.promedioMinimoRequerido} onChange={handleFormChange}
                    className="form-input" placeholder="Ej: 3.5" />
                </div>

                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon">
                    <FiEdit className="label-icon" /> Profesor responsable / coordinador
                  </label>
                  <div style={{ position: 'relative' }} ref={mtmProfesorWrapRef}>
                    {mtmProfesorDisplay ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 14, color: '#166534' }}>
                        <span>{mtmProfesorDisplay}</span>
                        <button type="button" onClick={() => { setMtmProfesorResponsable(''); setMtmNombreProfesor(''); setMtmProfesorDisplay(''); setMtmProfesorSearch(''); }} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: '#6b7280' }} aria-label="Quitar"><FiX size={16} /></button>
                      </div>
                    ) : (
                      <>
                        <input type="text" className="form-input" placeholder="Buscar por nombre o identificación (mín. 2 caracteres)..."
                          value={mtmProfesorSearch} onChange={e => setMtmProfesorSearch(e.target.value)} />
                        {(showMtmProfesorDrop || mtmProfesorLoading) && (
                          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.1)', zIndex: 200, maxHeight: 220, overflowY: 'auto' }}>
                            {mtmProfesorLoading ? <div style={{ padding: '12px 14px', color: '#9ca3af', fontSize: 13 }}>Buscando...</div>
                              : mtmProfesorError ? <div style={{ padding: '12px 14px', color: '#b91c1c', fontSize: 13, background: '#fef2f2' }}>No se pudo cargar. Verifique permisos o conexión.</div>
                              : mtmProfesorResults.length === 0 ? <div style={{ padding: '12px 14px', color: '#9ca3af', fontSize: 13 }}>Sin resultados. Escribe al menos 2 caracteres.</div>
                              : mtmProfesorResults.map(u => (
                                <div key={u._id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f9fafb', fontSize: 13 }} onMouseEnter={e => { e.currentTarget.style.background = '#f0f7ff'; }} onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                                  onClick={() => { const display = [u.nombres, u.apellidos].filter(Boolean).join(' '); setMtmProfesorResponsable(u._id); setMtmNombreProfesor(display); setMtmProfesorDisplay(display); setMtmProfesorSearch(''); setShowMtmProfesorDrop(false); }}>
                                  <div style={{ fontWeight: 600, color: '#374151' }}>{[u.nombres, u.apellidos].filter(Boolean).join(' ')}</div>
                                  {u.user?.email && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{u.user.email}</div>}
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon">
                    <FiMapPin className="label-icon" /> Unidad académica o transversal
                  </label>
                  <input type="text" value={mtmUnidadAcademica} onChange={e => setMtmUnidadAcademica(e.target.value)}
                    className="form-input" placeholder="Ej: Facultad de Economía" />
                </div>

                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon">
                    <FiClock className="label-icon" /> Horario de la MTM
                  </label>
                  <input type="text" name="horario" value={formData.horario} onChange={handleFormChange}
                    className="form-input" placeholder="Ej: Lunes y Miércoles 10:00–12:00" />
                </div>

                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon">
                    <FiBook className="label-icon" /> Grupo
                  </label>
                  <input type="text" value={mtmGrupo} onChange={e => setMtmGrupo(e.target.value)}
                    className="form-input" placeholder="Código o nombre del grupo" />
                </div>

                {/* Asignaturas y Programas en 2 columnas (mitad cada uno) */}
                <div className="form-field-group form-field-span-2">
                  <label className="form-label-with-icon">
                    <FiBook className="label-icon" />
                    Asignaturas asociadas
                    <span style={{ fontSize: 11, fontWeight: 400, color: '#6b7280', marginLeft: 4 }}>(máx. 3)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={mtmAsignaturas.length >= 3 ? 'Máximo 3 asignaturas seleccionadas' : 'Escribe al menos 3 caracteres...'}
                      value={mtmAsigSearch}
                      disabled={mtmAsignaturas.length >= 3}
                      onChange={e => setMtmAsigSearch(e.target.value)}
                    />
                    {(showMtmAsigDrop || mtmAsigLoading) && (
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,.1)', zIndex: 200, maxHeight: 200, overflowY: 'auto'
                      }}>
                        {mtmAsigLoading
                          ? <div style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 13 }}>Buscando...</div>
                          : mtmAsigResults.length === 0
                            ? <div style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 13 }}>Sin resultados</div>
                            : mtmAsigResults.map(a => (
                              <div key={a._id}
                                style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f9fafb', fontSize: 13 }}
                                onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
                                onMouseLeave={e => e.currentTarget.style.background = ''}
                                onClick={() => {
                                  if (mtmAsignaturas.find(x => x._id === a._id)) return;
                                  setMtmAsignaturas(prev => [...prev, a]);
                                  setMtmAsigSearch(''); setShowMtmAsigDrop(false);
                                }}>
                                <strong style={{ color: '#c41e3a' }}>{a.codAsignatura}</strong> — {a.nombreAsignatura}
                              </div>
                            ))
                        }
                      </div>
                    )}
                  </div>
                  {mtmAsignaturas.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {mtmAsignaturas.map(a => (
                        <span key={a._id} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: '#fff5f5', border: '1px solid #fca5a5',
                          borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#991b1b', fontWeight: 500
                        }}>
                          <FiBook size={11} />
                          {a.codAsignatura} — {a.nombreAsignatura}
                          <span style={{ cursor: 'pointer', opacity: .7, lineHeight: 1 }}
                            onClick={() => setMtmAsignaturas(prev => prev.filter(x => x._id !== a._id))}>×</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-field-group form-field-span-2">
                  <label className="form-label-with-icon" style={{ marginBottom: 2 }}>
                    <HiOutlineAcademicCap className="label-icon" /> Programas candidatos
                  </label>
                  <div className="programs-section">
                    <div className="programs-header">
                      <span className="programs-title">Programas candidatos</span>
                      <button type="button" className="programs-add" onClick={() => setShowMtmProgramsModal(true)} title="Añadir programa">
                        <FiPlus />
                      </button>
                    </div>
                    {mtmProgramas.length === 0 ? (
                      <div className="programs-empty">
                        <FiX style={{ marginRight: '4px', display: 'inline-block' }} />
                        No hay programas seleccionados.
                      </div>
                    ) : (
                      <ul className="programs-list">
                        {mtmProgramas.map((p, idx) => (
                          <li key={p._id}>
                            {p.labelLevel} — {p.name}
                            <button type="button" className="program-remove"
                              onClick={() => setMtmProgramas(prev => prev.filter((_, i) => i !== idx))} title="Eliminar">
                              <FiX />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="form-field-group form-field-span-2">
                  <label className="form-label-with-icon">
                    <FiList className="label-icon" /> Funciones
                  </label>
                  <textarea name="funciones" value={formData.funciones} onChange={handleFormChange}
                    className="form-textarea" rows={2} maxLength={250}
                    placeholder="Actividades y responsabilidades..." />
                  <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right' }}>{(formData.funciones || '').length}/250</div>
                </div>

                <div className="form-field-group form-field-span-2">
                  <label className="form-label-with-icon">
                    <FiAlertCircle className="label-icon" /> Requisitos
                  </label>
                  <textarea name="requisitos" value={formData.requisitos} onChange={handleFormChange}
                    className="form-textarea" rows={2} maxLength={250}
                    placeholder="Requisitos del candidato..." />
                  <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right' }}>{(formData.requisitos || '').length}/250</div>
                </div>

              </form>
            </div>

          ) : null}
        </div>

        {/* Modal de Programas (Formación Académica) */}
        {showProgramsModal && (() => {
          // Normaliza quitando tildes para comparar, pero muestra la versión original
          const normStr = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
          // Solo Pregrado y Maestría (31 pregrados + Maestría de Paz)
          const NIVELES_PERMITIDOS = new Set(['PREGRADO', 'MAESTRIA']);
          const uniqueLevels = [];
          const seen = new Set();
          allPrograms.forEach(p => {
            if (!p.labelLevel) return;
            const n = normStr(p.labelLevel);
            if (!NIVELES_PERMITIDOS.has(n) || seen.has(n)) return;
            seen.add(n);
            uniqueLevels.push(p.labelLevel);
          });
          uniqueLevels.sort((a, b) => a.localeCompare(b, 'es'));
          // Programas del nivel: Pregrado = todos; Maestría = solo los que contengan "paz" (Maestría de Paz)
          const programasDelNivel = newProgramLevel
            ? allPrograms
                .filter(p => {
                  if (normStr(p.labelLevel) !== normStr(newProgramLevel)) return false;
                  if (normStr(newProgramLevel) === 'MAESTRIA') return (p.name || '').toLowerCase().includes('paz');
                  return true;
                })
                .sort((a, b) => a.name.localeCompare(b.name, 'es'))
            : [];
          const setHabilitados = new Set(programIdsHabilitadosPeriodo);
          const periodoSeleccionado = !!formData.periodo;

          return (
            <div
              onClick={() => setShowProgramsModal(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: 520, maxWidth: 'calc(100vw - 40px)', maxHeight: '90vh',
                  background: '#fff', borderRadius: 12,
                  boxShadow: '0 20px 60px rgba(0,0,0,.25)',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden'
                }}
              >
                <div className="modal-header">
                  <h4>Agregar programa académico</h4>
                  <button className="modal-close" onClick={() => setShowProgramsModal(false)}>×</button>
                </div>
                <div className="modal-body">
                  {loadingPrograms ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: 13 }}>
                      Cargando niveles y programas...
                    </div>
                  ) : (
                    <>
                      <div className="modal-field">
                        <label>Nivel <span className="required">*</span></label>
                        <select value={newProgramLevel} onChange={e => setNewProgramLevel(e.target.value)}>
                          <option value="">— Seleccione un nivel —</option>
                          {uniqueLevels.map(lv => <option key={lv} value={lv}>{lv}</option>)}
                        </select>
                      </div>
                      <div className="modal-field">
                        <label>Programa <span className="required">*</span></label>
                        <select
                          value={newProgramName}
                          onChange={e => setNewProgramName(e.target.value)}
                          disabled={!newProgramLevel}
                        >
                          <option value="">
                            {newProgramLevel ? '— Seleccione un programa —' : '— Primero seleccione un nivel —'}
                          </option>
                          {programasDelNivel.map(p => {
                            const idStr = (p._id && typeof p._id === 'object' && p._id.toString ? p._id.toString() : String(p._id));
                            const habilitado = !periodoSeleccionado || setHabilitados.has(idStr);
                            return habilitado ? (
                              <option key={p._id} value={p.name}>{p.name}</option>
                            ) : (
                              <option key={p._id} disabled value="">{p.name} {noStudentsMessageFormacion}</option>
                            );
                          })}
                        </select>
                        {periodoSeleccionado && newProgramLevel && programasDelNivel.some(p => !setHabilitados.has(String(p._id))) && (
                          <p style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
                            Los programas sin condición curricular activa para este periodo muestran el aviso y no pueden seleccionarse.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn-secondary" onClick={() => setShowProgramsModal(false)}>Cerrar</button>
                  <button className="btn-guardar" onClick={handleAddProgram} disabled={loadingPrograms}>Añadir</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Modal de Idiomas */}
        {showLanguagesModal && (
          <div
            onClick={() => setShowLanguagesModal(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 2000,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: 480, maxWidth: 'calc(100vw - 40px)', maxHeight: '90vh',
                background: '#fff', borderRadius: 12,
                boxShadow: '0 20px 60px rgba(0,0,0,.25)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
              }}
            >
              <div className="modal-header">
                <h4>Agregar idioma</h4>
                <button className="modal-close" onClick={() => setShowLanguagesModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="modal-field">
                  <label>Idioma <span className="required">*</span></label>
                  <select value={newLanguage} onChange={e => setNewLanguage(e.target.value)}>
                    <option value="">— Seleccione un idioma —</option>
                    <option value="Alemán">Alemán</option>
                    <option value="Chino Mandarín">Chino Mandarín</option>
                    <option value="Coreano">Coreano</option>
                    <option value="Español">Español</option>
                    <option value="Francés">Francés</option>
                    <option value="Griego">Griego</option>
                    <option value="Inglés">Inglés</option>
                    <option value="Italiano">Italiano</option>
                    <option value="Japonés">Japonés</option>
                    <option value="Latín">Latín</option>
                    <option value="Portugués">Portugués</option>
                  </select>
                </div>
                <div className="modal-field">
                  <label>Nivel <span className="required">*</span></label>
                  <select value={newLanguageLevel} onChange={e => setNewLanguageLevel(e.target.value)}>
                    <option value="">— Seleccione un nivel —</option>
                    <option value="A1">A1 — Principiante</option>
                    <option value="A2">A2 — Básico</option>
                    <option value="B1">B1 — Intermedio</option>
                    <option value="B2">B2 — Intermedio alto</option>
                    <option value="C1">C1 — Avanzado</option>
                    <option value="C2">C2 — Dominio pleno</option>
                    <option value="Nativo">Nativo</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowLanguagesModal(false)}>Cerrar</button>
                <button className="btn-guardar" onClick={handleAddLanguage}>Añadir</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Información */}
        {showModalInfo && (
          <div className="modal-overlay" onClick={() => {
            setShowModalInfo(false);
            // Si se cierra el modal sin aceptar, no redirigir al formulario
          }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Información</h3>
                <button className="modal-close" onClick={() => {
                  setShowModalInfo(false);
                  // Si se cierra con X, no redirigir al formulario
                }}>×</button>
              </div>
              <div className="modal-body">
                <div className="info-alert">
                  <strong>¡Importante!</strong>
                </div>
                <p>Con la entrada en vigencia de la Resolución 3546 de 2018, las prácticas tendrán cambios importantes a partir del 2019:</p>
                <ul className="info-list">
                  <li>Se hace de obligatorio cumplimiento para las empresas registrar y publicar las plazas de práctica en el Sistema de Información del Servicio Público de Empleo.</li>
                  <li>Se habilita la Vinculación Formativa como un tipo de vinculación válido para empresas privadas, y debe contener: 1) NIT y Representante Legal Empresa, 2) Datos Identificación Estudiante, 3) Duración, Fechas, Remuneración y ARL, 4) Actividades a Desarrollar, 5) Derechos y obligaciones, y 6) Firmas.</li>
                  <li>Se regula la jornada laboral máxima de los practicantes.</li>
                  <li>Se hace obligatorio que las empresas garanticen un Tutor (Supervisor) que revise, apruebe y de seguimiento mensual al plan de práctica.</li>
                </ul>
                <p className="info-link">
                  Consulte la Resolución en el enlace{' '}
                  <a href="https://goo.gl/zgzEok" target="_blank" rel="noopener noreferrer">
                    https://goo.gl/zgzEok
                  </a>
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn-aceptar" onClick={handleAceptarModal}>
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Programas MTM */}
        {showMtmProgramsModal && (() => {
          const normStr = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
          const uniqueLevels = [];
          const seen = new Set();
          allPrograms.forEach(p => {
            if (!p.labelLevel) return;
            const n = normStr(p.labelLevel);
            if (!seen.has(n)) { seen.add(n); uniqueLevels.push(p.labelLevel); }
          });
          uniqueLevels.sort((a, b) => a.localeCompare(b, 'es'));
          const programasDelNivel = newMtmProgramLevel
            ? allPrograms
                .filter(p => normStr(p.labelLevel) === normStr(newMtmProgramLevel))
                .sort((a, b) => a.name.localeCompare(b.name, 'es'))
            : [];
          return (
            <div
              onClick={() => { setShowMtmProgramsModal(false); setMtmProgramsModalForEdit(false); }}
              style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: 520, maxWidth: 'calc(100vw - 40px)', maxHeight: '90vh',
                  background: '#fff', borderRadius: 12,
                  boxShadow: '0 20px 60px rgba(0,0,0,.25)',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden'
                }}
              >
                <div className="modal-header">
                  <h4>Agregar programa candidato</h4>
                  <button className="modal-close" onClick={() => { setShowMtmProgramsModal(false); setMtmProgramsModalForEdit(false); }}>×</button>
                </div>
                <div className="modal-body">
                  {loadingPrograms ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: 13 }}>
                      Cargando niveles y programas...
                    </div>
                  ) : (
                    <>
                      <div className="modal-field">
                        <label>Nivel <span className="required">*</span></label>
                        <select value={newMtmProgramLevel} onChange={e => setNewMtmProgramLevel(e.target.value)}>
                          <option value="">— Seleccione un nivel —</option>
                          {uniqueLevels.map(lv => <option key={lv} value={lv}>{lv}</option>)}
                        </select>
                      </div>
                      <div className="modal-field">
                        <label>Programa <span className="required">*</span></label>
                        <select
                          value={newMtmProgramName}
                          onChange={e => setNewMtmProgramName(e.target.value)}
                          disabled={!newMtmProgramLevel}
                        >
                          <option value="">
                            {newMtmProgramLevel ? '— Seleccione un programa —' : '— Primero seleccione un nivel —'}
                          </option>
                          {programasDelNivel.map(p => (
                            <option key={p._id} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn-secondary" onClick={() => { setShowMtmProgramsModal(false); setMtmProgramsModalForEdit(false); }}>Cerrar</button>
                  <button className="btn-guardar" onClick={handleAddMtmProgram} disabled={loadingPrograms}>Añadir</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // Vista de edición - reutiliza el formulario de creación
  if (vista === 'editar' && oportunidadSeleccionada && editFormData) {

    return (
      <div className="oportunidades-content">
        <div className="oportunidades-header form-header">
          <div className="configuracion-actions form-actions">
            <button className="btn-volver" onClick={() => {
              setVista('detalle');
              setEditFormData(null);
              setSelectedLinkageDescription('');
            }}>
              <FiArrowLeft className="btn-icon" />
              Volver
            </button>
            <button className="btn-guardar-header" onClick={handleUpdateForm}>
              <FiFileText className="btn-icon" />
              Guardar Cambios
            </button>
          </div>
          <div className="section-header">
            <h3>
              <HiOutlineAcademicCap style={{ marginRight: '8px', display: 'inline-block' }} />
              EDITAR OPORTUNIDAD
            </h3>
          </div>
        </div>

        <div className="oportunidades-section">
          <div className="formulario-practica-container">
            <form className="practica-form">
              {/* Nombre del cargo */}
              <div className="form-field-group form-field-half-width">
                <label className="form-label">Nombre del cargo</label>
                <input
                  type="text"
                  name="nombreCargo"
                  value={editFormData.nombreCargo}
                  onChange={handleEditFormChange}
                  className="form-input"
                  placeholder="Ingrese el nombre del cargo"
                />
              </div>

              {/* Nombre de la empresa */}
              {editSelectedCompany && (
                <div className="form-field-group form-field-half-width">
                  <label className="form-label">Empresa</label>
                  <div className="company-display">
                    {editSelectedCompany.name || editSelectedCompany.commercialName}
                  </div>
                </div>
              )}

              {/* Switches de auxilio económico */}
              <div className="form-field-group form-field-full-width">
                <div className="rol-switch-container">
                  <label className="rol-switch">
                    <input
                      type="checkbox"
                      name="auxilioEconomico"
                      checked={editFormData.auxilioEconomico}
                      onChange={handleEditFormChange}
                    />
                    <span className="rol-slider"></span>
                  </label>
                  <span className="rol-status-text">
                    ¿La práctica cuenta con auxilio económico?
                  </span>
                </div>
              </div>

              <div className="form-field-group form-field-full-width">
                <div className="rol-switch-container">
                  <label className="rol-switch">
                    <input
                      type="checkbox"
                      name="requiereConfidencialidad"
                      checked={editFormData.requiereConfidencialidad}
                      onChange={handleEditFormChange}
                      disabled={!editFormData.auxilioEconomico}
                    />
                    <span className="rol-slider"></span>
                  </label>
                  <span className="rol-status-text">
                    ¿Requiere confidencialidad para el auxilio económico?
                  </span>
                </div>
              </div>

              {/* Apoyo económico */}
              {editFormData.auxilioEconomico && (
                <div className="form-field-group">
                  <label className="form-label-with-icon">
                    <FiDollarSign className="label-icon" />
                    Apoyo económico
                  </label>
                  <div className="currency-input-wrapper">
                    <input
                      type="text"
                      name="apoyoEconomico"
                      value={editFormData.apoyoEconomico ? formatCurrency(editFormData.apoyoEconomico) : ''}
                      onChange={handleEditFormChange}
                      className="form-input currency-input"
                      placeholder="Ingrese el monto"
                      style={apoyoMenorAlMinimoLegal(editFormData.auxilioEconomico, editFormData.apoyoEconomico) ? estiloInputJornadaInvalida : undefined}
                      aria-invalid={apoyoMenorAlMinimoLegal(editFormData.auxilioEconomico, editFormData.apoyoEconomico)}
                    />
                  </div>
                  {apoyoMenorAlMinimoLegal(editFormData.auxilioEconomico, editFormData.apoyoEconomico) && (
                    <p className="form-error-text" style={{ color: '#dc2626', fontSize: 13, marginTop: 6 }}>
                      {`Debe ser al menos $${minApoyoEconomicoCOP.toLocaleString('es-CO')} COP (regla de negocio).`}
                    </p>
                  )}
                </div>
              )}

              {/* Resto del formulario - reutilizar campos del formulario de creación */}
              {/* Tipo de vinculación */}
              <div className="form-field-group">
                <label className="form-label-with-icon">
                  <FiFileText className="label-icon" />
                  Tipo de vinculación
                  {selectedLinkageDescription && (
                    <div className="info-tooltip-wrapper">
                      <span className="info-icon">i</span>
                      <div className="tooltip-content">
                        <strong>Información</strong>
                        <p>{selectedLinkageDescription}</p>
                      </div>
                    </div>
                  )}
                </label>
                <select
                  name="tipoVinculacion"
                  value={editFormData.tipoVinculacion}
                  onChange={handleEditFormChange}
                  className="form-select"
                >
                  <option value="">Seleccionar</option>
                  {linkageTypes.map(linkage => (
                    <option key={linkage._id} value={linkage._id}>
                      {linkage.value}
                    </option>
                  ))}
                </select>
              </div>

              {/* Periodo */}
              <div className="form-field-group">
                <label className="form-label-with-icon">
                  <FiBook className="label-icon" />
                  Periodo
                </label>
                <select
                  name="periodo"
                  value={editFormData.periodo}
                  onChange={handleEditFormChange}
                  className="form-select"
                >
                  <option value="">Seleccionar una opción</option>
                  {practicaPeriodos.map(p => <option key={p._id} value={p._id}>{p.codigo}</option>)}
                </select>
              </div>

              {/* Vacantes */}
              <div className="form-field-group">
                <label className="form-label-with-icon">
                  <FiUsers className="label-icon" />
                  Vacantes
                </label>
                <input
                  type="number"
                  name="vacantes"
                  value={editFormData.vacantes}
                  onChange={handleEditFormChange}
                  className="form-input"
                  min="1"
                  placeholder="Número de vacantes"
                />
              </div>

              {/* Fecha de vencimiento */}
              <div className="form-field-group">
                <label className="form-label-with-icon">
                  <FiCalendar className="label-icon" />
                  Fecha de vencimiento
                </label>
                <input
                  type="date"
                  name="fechaVencimiento"
                  value={editFormData.fechaVencimiento}
                  onChange={handleEditFormChange}
                  className="form-input"
                  min={minDateVencimiento}
                />
              </div>

              {/* País / Ciudad (backend Country, City) */}
              <div className="form-field-group form-field-half-width">
                <label className="form-label-with-icon">
                  <FiMapPin className="label-icon" />
                  País / Ciudad
                </label>
                <div className="country-city-group">
                  <select
                    name="pais"
                    value={editFormData.pais}
                    onChange={(e) => {
                      const { name, value } = e.target;
                      setEditFormData(prev => ({ ...prev, [name]: value, ciudad: '' }));
                    }}
                    className="form-select"
                  >
                    <option value="">Seleccionar</option>
                    {countries.map(country => (
                      <option key={country._id} value={country._id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <select
                    name="ciudad"
                    value={editFormData.ciudad}
                    onChange={handleEditFormChange}
                    className="form-select"
                    disabled={!editFormData.pais}
                  >
                    <option value="">Seleccionar</option>
                    {editCities.map(city => (
                      <option key={city._id} value={city._id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Jornada Ordinaria Semanal */}
              <div className="form-field-group">
                <label className="form-label-with-icon">
                  <FiClock className="label-icon" />
                  Jornada ordinaria semanal
                  <span className="form-hint-inline" style={{ fontWeight: 400, marginLeft: 6 }}>(máx. {maxJornadaOrdinariaSemanal} h)</span>
                </label>
                <input
                  type="number"
                  name="jornadaOrdinariaSemanal"
                  value={editFormData.jornadaOrdinariaSemanal}
                  onChange={handleEditFormChange}
                  className="form-input"
                  min="0"
                  max={maxJornadaOrdinariaSemanal}
                  placeholder={`Máx. ${maxJornadaOrdinariaSemanal} h`}
                  style={jornadaExcedeMaximo(editFormData.jornadaOrdinariaSemanal) ? estiloInputJornadaInvalida : undefined}
                  aria-invalid={jornadaExcedeMaximo(editFormData.jornadaOrdinariaSemanal)}
                />
                {jornadaExcedeMaximo(editFormData.jornadaOrdinariaSemanal) && (
                  <span style={{ color: '#b91c1c', fontSize: 12, marginTop: 6, display: 'block', fontWeight: 600 }}>
                    Supera el máximo de {maxJornadaOrdinariaSemanal} horas semanales.
                  </span>
                )}
              </div>

              {/* Dedicación */}
              <div className="form-field-group">
                <label className="form-label">Dedicación</label>
                <select
                  name="dedicacion"
                  value={editFormData.dedicacion}
                  onChange={handleEditFormChange}
                  className="form-select"
                >
                  <option value="">Seleccionar</option>
                  {dedicationTypes.map(dedication => (
                    <option key={dedication._id} value={dedication._id}>
                      {dedication.description || dedication.value}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha inicio práctica */}
              <div className="form-field-group">
                <label className="form-label">Fecha inicio de la práctica</label>
                <input
                  type="date"
                  name="fechaInicioPractica"
                  value={editFormData.fechaInicioPractica}
                  onChange={handleEditFormChange}
                  className="form-input"
                  min={addDaysToDate(editFormData.fechaVencimiento, practiceStartDaysAfterExpiry) || undefined}
                />
              </div>

              {/* Fecha fin práctica */}
              <div className="form-field-group">
                <label className="form-label">Fecha fin de la práctica</label>
                <input
                  type="date"
                  name="fechaFinPractica"
                  value={editFormData.fechaFinPractica}
                  onChange={handleEditFormChange}
                  className="form-input"
                  min={addDaysToDate(editFormData.fechaInicioPractica, practiceEndDaysAfterStart) || undefined}
                />
              </div>

              {/* Horario */}
              <div className="form-field-group form-field-half-width">
                <label className="form-label">Horario</label>
                <textarea
                  name="horario"
                  value={editFormData.horario}
                  onChange={handleEditFormChange}
                  className="form-textarea form-textarea-small"
                  placeholder="Describa el horario de la práctica..."
                  rows="3"
                />
              </div>

              {/* Área de Desempeño */}
              <div className="form-field-group form-field-half-width">
                <label className="form-label">Área de desempeño</label>
                <select
                  name="areaDesempeno"
                  value={editFormData.areaDesempeno}
                  onChange={handleEditFormChange}
                  className="form-select"
                >
                  <option value="">Seleccionar</option>
                  {performanceAreas.map(area => (
                    <option key={area._id} value={area._id}>
                      {area.description || area.value}
                    </option>
                  ))}
                </select>
              </div>

              {/* Enlaces o formato específicos */}
              <div className="form-field-group form-field-full-width">
                <label className="form-label">
                  Enlaces o formato específicos de aplicación
                </label>
                <input
                  type="text"
                  name="enlacesFormatoEspecificos"
                  value={editFormData.enlacesFormatoEspecificos}
                  onChange={handleEditFormChange}
                  className="form-input"
                  placeholder="Ingrese enlaces o formato específico..."
                  maxLength={500}
                />
                {editFormData.enlacesFormatoEspecificos && (
                  <div className="character-count">
                    {editFormData.enlacesFormatoEspecificos.length}/500 caracteres
                  </div>
                )}
              </div>

              {/* Documentos de apoyo */}
              <div className="form-field-group form-field-full-width">
                <div className="programs-section">
                  <div className="programs-header">
                    <span className="programs-title">Documentos de apoyo</span>
                    <label className="opp-doc-add-btn" title="Agregar documento (máx. 10 MB)">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="file-input-hidden"
                        onChange={(e) => handleEditAddDocument(e, oportunidadSeleccionada._id)}
                        disabled={(editFormData?.documentos || []).length >= 3}
                      />
                      <FiUpload style={{ marginRight: 4 }} />
                      Agregar documento
                    </label>
                  </div>
                  {(editFormData?.documentos || []).length === 0 ? (
                    <div className="programs-empty">
                      <FiX style={{ marginRight: '4px', display: 'inline-block' }} />
                      No hay documentos adjuntos.
                    </div>
                  ) : (
                    <ul className="programs-list">
                      {(editFormData?.documentos || []).map((doc) => (
                        <li key={doc._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.nombre}>
                            <FiFileText style={{ marginRight: 4, flexShrink: 0 }} />
                            {doc.nombre}
                            {doc.requerido && <span style={{ marginLeft: 6, fontSize: 11, color: '#c41e3a', fontWeight: 600 }}>Requerido</span>}
                          </span>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button
                              type="button"
                              className="opp-doc-btn opp-doc-btn--preview"
                              title="Previsualizar"
                              onClick={() => handlePreviewOpportunityDocument(oportunidadSeleccionada._id, doc._id)}
                            >
                              <FiEye />
                            </button>
                            <button
                              type="button"
                              className="opp-doc-btn opp-doc-btn--delete"
                              title="Eliminar documento"
                              onClick={() => handleDeleteOpportunityDocument(oportunidadSeleccionada._id, doc._id)}
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {(editFormData?.documentos || []).length >= 3 && (
                    <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#6b7280' }}>Máximo 3 documentos por oportunidad.</p>
                  )}
                </div>
              </div>

              {/* Salario Emocional */}
              <div className="form-field-group form-field-half-width">
                <label className="form-label">Salario emocional</label>
                <div className="autocomplete-wrapper">
                  <input
                    type="text"
                    value={editSalarioEmocionalSearch}
                    onChange={handleEditSalarioEmocionalChange}
                    onFocus={() => setEditShowSalarioEmocionalDropdown(true)}
                    className="form-input"
                    placeholder="Escriba para buscar..."
                  />
                  {editShowSalarioEmocionalDropdown && filteredEditSalarioEmocional.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {filteredEditSalarioEmocional.map((opcion) => (
                        <div
                          key={opcion.value}
                          className="autocomplete-option"
                          onClick={() => handleEditSelectSalarioEmocional(opcion)}
                        >
                          {opcion.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Promedio Mínimo Requerido */}
              <div className="form-field-group form-field-half-width">
                <label className="form-label">
                  Promedio mínimo requerido
                </label>
                <input
                  type="text"
                  name="promedioMinimoRequerido"
                  value={editFormData.promedioMinimoRequerido}
                  onChange={handleEditFormChange}
                  className="form-input"
                  placeholder="Ej: 4.0"
                />
              </div>

              {/* Formación Académica */}
              <div className="form-field-group form-field-half-width">
                <div className="programs-section">
                  <div className="programs-header">
                    <span className="programs-title">Formación académica</span>
                    <button 
                      type="button" 
                      className="programs-add" 
                      onClick={() => {
                        if (!editFormData.periodo) {
                          Swal.fire({
                            icon: 'info',
                            title: 'Seleccione un periodo',
                            text: 'Primero elija el periodo de la práctica para agregar programas según la condición curricular.',
                            confirmButtonText: 'Entendido',
                            confirmButtonColor: '#c41e3a'
                          });
                          return;
                        }
                        setEditShowProgramsModal(true);
                      }} 
                      title={editFormData.periodo ? 'Añadir programa' : 'Seleccione periodo primero'}
                      style={!editFormData.periodo ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                    >
                      <FiPlus />
                    </button>
                  </div>
                  {!editFormData.periodo && (
                    <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#92400e', background: '#fffbeb', padding: '8px 10px', borderRadius: 6, border: '1px solid #fde68a' }}>
                      Seleccione el <strong>periodo</strong> para poder agregar programas.
                    </p>
                  )}
                  {(!editFormData.formacionAcademica || editFormData.formacionAcademica.length === 0) ? (
                    <div className="programs-empty">
                      <FiX style={{ marginRight: '4px', display: 'inline-block' }} />
                      {editFormData.periodo ? 'No hay programas configurados.' : 'Elija periodo para agregar programas.'}
                    </div>
                  ) : (
                    <ul className="programs-list">
                      {editFormData.formacionAcademica.map((p, idx) => (
                        <li key={idx}>
                          {p.level} - {p.program}
                          <button
                            type="button"
                            className="program-remove"
                            onClick={() => handleEditRemoveProgram(idx)}
                            title="Eliminar"
                          >
                            <FiX />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Idiomas */}
              <div className="form-field-group form-field-half-width">
                <div className="programs-section">
                  <div className="programs-header">
                    <span className="programs-title">Idiomas</span>
                    <button 
                      type="button" 
                      className="programs-add" 
                      onClick={() => setEditShowLanguagesModal(true)} 
                      title="Añadir idioma"
                    >
                      <FiPlus />
                    </button>
                  </div>
                  {(!editFormData.idiomas || editFormData.idiomas.length === 0) ? (
                    <div className="programs-empty">
                      <FiX style={{ marginRight: '4px', display: 'inline-block' }} />
                      No tiene requisitos de idioma.
                    </div>
                  ) : (
                    <ul className="programs-list">
                      {editFormData.idiomas.map((lang, idx) => (
                        <li key={idx}>
                          {lang.language} - {lang.level}
                          <button
                            type="button"
                            className="program-remove"
                            onClick={() => handleEditRemoveLanguage(idx)}
                            title="Eliminar"
                          >
                            <FiX />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Funciones */}
              <div className="form-field-group form-field-half-width">
                <label className="form-label-with-icon">
                  Funciones
                </label>
                <textarea
                  name="funciones"
                  value={editFormData.funciones}
                  onChange={handleEditFormChange}
                  className="form-textarea"
                  placeholder="Describa las funciones del cargo..."
                  rows="5"
                />
                {editFormData.funciones && editFormData.funciones.length < 60 && (
                  <div className="validation-message">
                    Debe agregar las funciones con un tamaño mínimo de 60 caracteres.
                  </div>
                )}
              </div>

              {/* Requisitos */}
              <div className="form-field-group form-field-half-width">
                <label className="form-label">Requisitos</label>
                <textarea
                  name="requisitos"
                  value={editFormData.requisitos}
                  onChange={handleEditFormChange}
                  className="form-textarea"
                  placeholder="Describa los requisitos..."
                  rows="5"
                />
                {!editFormData.requisitos && (
                  <div className="validation-message">
                    Debe agregar los requisitos.
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Modales para edición - Agregar programa académico (misma lógica que creación: Pregrado/Maestría Paz, condición curricular) */}
          {editShowProgramsModal && (() => {
            const normStr = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
            const NIVELES_PERMITIDOS = new Set(['PREGRADO', 'MAESTRIA']);
            const uniqueLevels = [];
            const seen = new Set();
            allPrograms.forEach(p => {
              if (!p.labelLevel) return;
              const n = normStr(p.labelLevel);
              if (!NIVELES_PERMITIDOS.has(n) || seen.has(n)) return;
              seen.add(n); uniqueLevels.push(p.labelLevel);
            });
            uniqueLevels.sort((a, b) => a.localeCompare(b, 'es'));
            const programasDelNivel = editNewProgramLevel ? allPrograms.filter(p => {
              if (normStr(p.labelLevel) !== normStr(editNewProgramLevel)) return false;
              if (normStr(editNewProgramLevel) === 'MAESTRIA') return (p.name || '').toLowerCase().includes('paz');
              return true;
            }).sort((a, b) => a.name.localeCompare(b.name, 'es')) : [];
            const setHabilitados = new Set(programIdsHabilitadosPeriodo);
            const periodoSeleccionado = !!(editFormData && editFormData.periodo);
            return (
              <div className="opo-ficha-modal-overlay" onClick={() => setEditShowProgramsModal(false)}>
                <div className="opo-ficha-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h4>Agregar programa académico</h4>
                    <button className="modal-close" onClick={() => setEditShowProgramsModal(false)}>×</button>
                  </div>
                  <div className="opo-ficha-modal__body">
                    {loadingPrograms ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: 13 }}>Cargando niveles y programas...</div>
                    ) : (
                      <>
                        <div className="modal-field">
                          <label>Nivel <span className="required">*</span></label>
                          <select value={editNewProgramLevel} onChange={e => setEditNewProgramLevel(e.target.value)}>
                            <option value="">— Seleccione un nivel —</option>
                            {uniqueLevels.map(lv => <option key={lv} value={lv}>{lv}</option>)}
                          </select>
                        </div>
                        <div className="modal-field">
                          <label>Programa <span className="required">*</span></label>
                          <select value={editNewProgramName} onChange={e => setEditNewProgramName(e.target.value)} disabled={!editNewProgramLevel}>
                            <option value="">{editNewProgramLevel ? '— Seleccione un programa —' : '— Primero seleccione un nivel —'}</option>
                            {programasDelNivel.map(p => {
                              const idStr = (p._id && typeof p._id === 'object' && p._id.toString ? p._id.toString() : String(p._id));
                              const habilitado = !periodoSeleccionado || setHabilitados.has(idStr);
                              return habilitado ? <option key={p._id} value={p.name}>{p.name}</option> : <option key={p._id} disabled value="">{p.name} {noStudentsMessageFormacion}</option>;
                            })}
                          </select>
                          {periodoSeleccionado && editNewProgramLevel && programasDelNivel.some(p => !setHabilitados.has(String(p._id))) && (
                            <p style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>Los programas sin condición curricular activa para este periodo muestran el aviso y no pueden seleccionarse.</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button className="btn-secondary" onClick={() => setEditShowProgramsModal(false)}>Cerrar</button>
                    <button className="btn-guardar" onClick={handleEditAddProgram} disabled={loadingPrograms}>Añadir</button>
                  </div>
                </div>
              </div>
            );
          })()}

          {editShowLanguagesModal && (
            <div className="opo-ficha-modal-overlay" onClick={() => setEditShowLanguagesModal(false)}>
              <div className="opo-ficha-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h4>Idiomas</h4>
                  <button className="modal-close" onClick={() => setEditShowLanguagesModal(false)}>×</button>
                </div>
                <div className="opo-ficha-modal__body">
                  <div className="modal-field">
                    <label>Seleccionar idioma <span className="required">*</span></label>
                    <select value={editNewLanguage} onChange={e => setEditNewLanguage(e.target.value)}>
                      <option value="">Seleccionar idioma</option>
                      <option value="Alemán">Alemán</option>
                      <option value="Chino Mandarín">Chino Mandarín</option>
                      <option value="Español">Español</option>
                      <option value="Francés">Francés</option>
                      <option value="Griego">Griego</option>
                      <option value="Inglés">Inglés</option>
                      <option value="Italiano">Italiano</option>
                      <option value="Japonés">Japonés</option>
                      <option value="Latín">Latín</option>
                      <option value="Portugués">Portugués</option>
                      <option value="Coreano">Coreano</option>
                    </select>
                  </div>
                  <div className="modal-field">
                    <label>Seleccionar nivel <span className="required">*</span></label>
                    <select value={editNewLanguageLevel} onChange={e => setEditNewLanguageLevel(e.target.value)}>
                      <option value="">Seleccionar nivel</option>
                      <option value="A1">A1 - Principiante</option>
                      <option value="A2">A2 - Básico</option>
                      <option value="B1">B1 - Intermedio</option>
                      <option value="B2">B2 - Intermedio alto</option>
                      <option value="C1">C1 - Avanzado</option>
                      <option value="C2">C2 - Maestría</option>
                      <option value="Nativo">Nativo</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn-secondary" onClick={() => setEditShowLanguagesModal(false)}>Cerrar</button>
                  <button className="btn-guardar" onClick={handleEditAddLanguage}>Añadir</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Funciones para manejar cambios en edición/detalle (definidas fuera de condicionales)
  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Manejo especial para tipo de vinculación - actualizar descripción (value = _id del ítem)
    if (name === 'tipoVinculacion') {
      const selectedLinkage = linkageTypes.find(linkage => String(linkage._id) === String(value));
      setSelectedLinkageDescription(selectedLinkage?.description || '');
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }));
      return;
    }
    
    if (name === 'apoyoEconomico') {
      const numericValue = getNumericValue(value);
      setEditFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleEditAddProgram = () => {
    if (!editFormData.periodo) {
      Swal.fire({
        icon: 'info',
        title: 'Periodo requerido',
        text: 'Seleccione primero el periodo de la práctica para agregar formación académica.',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
      return;
    }
    if (!editNewProgramLevel || !editNewProgramName) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Por favor seleccione el nivel y el programa',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
      return;
    }
    const newProgram = { level: editNewProgramLevel, program: editNewProgramName };
    setEditFormData(prev => ({
      ...prev,
      formacionAcademica: [...(prev.formacionAcademica || []), newProgram]
    }));
    setEditNewProgramLevel('');
    setEditNewProgramName('');
    setEditShowProgramsModal(false);
  };

  const handleEditRemoveProgram = (index) => {
    setEditFormData(prev => ({
      ...prev,
      formacionAcademica: prev.formacionAcademica.filter((_, i) => i !== index)
    }));
  };

  const handleEditAddLanguage = () => {
    if (!editNewLanguage || !editNewLanguageLevel) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Por favor seleccione el idioma y el nivel',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
      return;
    }
    const newLang = { language: editNewLanguage, level: editNewLanguageLevel };
    setEditFormData(prev => ({
      ...prev,
      idiomas: [...(prev.idiomas || []), newLang]
    }));
    setEditNewLanguage('');
    setEditNewLanguageLevel('');
    setEditShowLanguagesModal(false);
  };

  const handleEditRemoveLanguage = (index) => {
    setEditFormData(prev => ({
      ...prev,
      idiomas: prev.idiomas.filter((_, i) => i !== index)
    }));
  };

  const handleEditSalarioEmocionalChange = (e) => {
    const value = e.target.value;
    setEditSalarioEmocionalSearch(value);
    setEditShowSalarioEmocionalDropdown(true);
  };

  const handleEditSelectSalarioEmocional = (opcion) => {
    setEditFormData(prev => {
      // Verificar si ya existe en el array
      if (prev.salarioEmocional && prev.salarioEmocional.includes(opcion.value)) {
        return prev;
      }
      return {
        ...prev,
        salarioEmocional: [...(prev.salarioEmocional || []), opcion.value]
      };
    });
    setEditSalarioEmocionalSearch('');
    setEditShowSalarioEmocionalDropdown(false);
  };

  const handleEditRemoveSalarioEmocional = (index) => {
    setEditFormData(prev => ({
      ...prev,
      salarioEmocional: prev.salarioEmocional.filter((_, i) => i !== index)
    }));
  };

  // Vista de detalle - muestra el formulario en modo solo lectura o editable
  if (vista === 'detalle' && oportunidadSeleccionada) {
    const opp = oportunidadSeleccionada;
    const estado = opp.estado || 'Creada';
    const programasPendientes = getProgramasPendientesUsuario();
    const tieneProgramasPendientes = programasPendientes.length > 0;
    // Puede aprobar si está en "En Revisión" o si está "Activa" pero tiene programas pendientes
    const puedeAprobar = tieneProgramasPendientes && (estado === 'En Revisión' || estado === 'Activa' || estado === 'activa' || estado === 'published');

    // Para prácticas se usa editFormData (se carga en el useEffect); para MTM no, tenemos todo en oportunidadSeleccionada
    if (!editFormData && !opp._isMTM) {
      return (
        <div className="oportunidades-content">
          <div style={{ padding: '20px', textAlign: 'center' }}>Cargando...</div>
        </div>
      );
    }

    // ── DETALLE MTM (lectura / edición) ──────────────────────────────────────
    if (opp._isMTM) {
      const fmtFecha = (d) => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
      const estadoDisplay =
        opp.estado === 'Inactiva'
          ? 'Cerrada'
          : opp.estado === 'Creada' || opp.estado === 'Borrador'
            ? 'Creada'
            : (opp.estado || 'Creada');
      const estadoColors = { Creada: '#6b7280', Borrador: '#6b7280', Activa: '#16a34a', Inactiva: '#dc2626', Cerrada: '#374151' };
      const estadoCol = estadoColors[estadoDisplay] || '#6b7280';

      const handleActivarMtmEdicion = () => {
        if (!mtmDedicacionItems.length || !mtmCategoriaItems.length) loadMtmParams();
        const profDisplay = opp.profesorResponsable ? [opp.profesorResponsable.nombres, opp.profesorResponsable.apellidos].filter(Boolean).join(' ') : (opp.nombreProfesor || '');
        setMtmProfesorResponsable(opp.profesorResponsable?._id || '');
        setMtmProfesorDisplay(profDisplay);
        setMtmProfesorSearch('');
        setMtmEditData({
          nombreCargo:      opp.nombreCargo || '',
          categoria:        opp.categoria?._id || opp.categoria || '',
          periodo:          opp.periodo?._id   || opp.periodo   || '',
          dedicacionHoras:  opp.dedicacionHoras?._id  || opp.dedicacionHoras  || '',
          valorPorHora:     opp.valorPorHora?._id     || opp.valorPorHora     || '',
          tipoVinculacion:  opp.tipoVinculacion?._id  || opp.tipoVinculacion  || '',
          vacantes:         opp.vacantes != null ? String(opp.vacantes) : '',
          fechaVencimiento: opp.fechaVencimiento ? new Date(opp.fechaVencimiento).toISOString().split('T')[0] : '',
          promedioMinimo:   opp.promedioMinimo  != null ? String(opp.promedioMinimo) : '',
          profesorResponsable: opp.profesorResponsable?._id || '',
          nombreProfesor:   opp.nombreProfesor  || '',
          unidadAcademica:  opp.unidadAcademica || '',
          horario:          opp.horario         || '',
          grupo:            opp.grupo           || '',
          funciones:        opp.funciones       || '',
          requisitos:       opp.requisitos      || '',
          asignaturas:      Array.isArray(opp.asignaturas) ? opp.asignaturas : [],
          programas:        Array.isArray(opp.programas) ? opp.programas : [],
        });
        setIsMtmEditing(true);
      };

      const handleCancelarMtmEdicion = () => {
        setIsMtmEditing(false);
        setMtmEditData(null);
      };

      const handleGuardarMtmCambios = async () => {
        try {
          const payload = {
            ...mtmEditData,
            vacantes:       mtmEditData.vacantes       !== '' ? Number(mtmEditData.vacantes)       : undefined,
            promedioMinimo: mtmEditData.promedioMinimo !== '' ? Number(mtmEditData.promedioMinimo) : undefined,
            asignaturas:    (mtmEditData.asignaturas || []).map(a => a._id || a),
            programas:      (mtmEditData.programas || []).map(p => p._id || p),
          };
          await api.put(`/oportunidades-mtm/${opp._id}`, payload);
          const { data: refreshed } = await api.get(`/oportunidades-mtm/${opp._id}`);
          const updated = mapMtmRowForList(refreshed);
          setOportunidadSeleccionada(updated);
          setMtmList(prev => prev.map(o => o._id === opp._id ? updated : o));
          setIsMtmEditing(false);
          setMtmEditData(null);
          Swal.fire({ icon: 'success', title: 'Guardado', text: 'La oportunidad fue actualizada.', timer: 1800, showConfirmButton: false });
        } catch (e) {
          Swal.fire('Error', e.response?.data?.message || 'No se pudo guardar los cambios', 'error');
        }
      };

      const ed = mtmEditData || {};
      const vacantesMtm = Math.max(1, Number(opp?.vacantes) || 1);
      const seleccionadosMtmCount = aplicacionesList.filter((r) => r.estado === 'seleccionado_empresa').length;
      const cupoSeleccionMtm = seleccionadosMtmCount < vacantesMtm;

      return (
        <>
        <div className="oportunidades-content">
          <div className="oportunidades-header form-header detail-header">
            <div className="form-header-left">
              <button className="btn-volver-icon" onClick={() => {
                setVista('lista'); setOportunidadSeleccionada(null); setEditFormData(null);
                setIsEditingDetail(false); setIsMtmEditing(false); setMtmEditData(null);
                setShowModalAplicaciones(false); setShowModalHistorial(false); setShowModalCerrarOportunidad(false);
                setAplicacionDetail(null); setSelectedPostulacionId(null);
              }} title="Volver">
                <FiArrowLeft className="btn-icon" />
              </button>
              <div className="section-header">
                <h3><HiOutlineAcademicCap style={{ marginRight: 8, display: 'inline-block' }} />DETALLE MONITORÍA / TUTORÍA / MENTORÍA</h3>
              </div>
            </div>
            <div className="detail-header-actions">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: estadoCol + '18', color: estadoCol, border: `1px solid ${estadoCol}44`, borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600 }}>
                {estadoDisplay}
              </span>
              {!isMtmEditing ? (
                <>
                  <button className="btn-editar-header" onClick={handleActivarMtmEdicion}>
                    <FiEdit className="btn-icon" /> Editar
                  </button>
                  {(opp.estado === 'Creada' || opp.estado === 'Borrador') && (
                    <button className="btn-guardar-header" onClick={async () => {
                      try {
                        await api.patch(`/oportunidades-mtm/${opp._id}/status`, { estado: 'Activa' });
                        setOportunidadSeleccionada(prev => ({ ...prev, estado: 'Activa' }));
                        setMtmList(prev => prev.map(o => o._id === opp._id ? { ...o, estado: 'Activa' } : o));
                      } catch (e) { Swal.fire('Error', e.response?.data?.message || 'No se pudo cambiar el estado', 'error'); }
                    }}>
                      Activar
                    </button>
                  )}
                  {opp.estado === 'Activa' && (
                    <button className="btn-cerrar-oportunidad-header" onClick={async () => {
                      setShowModalCerrarOportunidad(true);
                      setCerrarContrato('');
                      setCerrarMotivoNo('');
                      setSelectedPostulantesCerrar([]);
                      setDatosTutorCerrar({});
                      setLoadingPostulantesCerrar(true);
                      try {
                        const { data } = await api.get(`/oportunidades-mtm/${oportunidadSeleccionada._id}/applications`);
                        const list = (data.postulaciones || []).filter(p => p.estado !== 'rechazado');
                        setPostulantesParaCerrar(list);
                      } catch (_) {
                        setPostulantesParaCerrar([]);
                      } finally {
                        setLoadingPostulantesCerrar(false);
                      }
                    }}>
                      <FiXCircle className="btn-icon" /> Cerrar oportunidad
                    </button>
                  )}
                  <button className="btn-historial-header" onClick={loadHistorialEstados}>
                    <FiList className="btn-icon" /> Historial
                  </button>
                  <button className="btn-duplicar-header" onClick={handleDuplicarOportunidad}>
                    <FiCopy className="btn-icon" /> Duplicar
                  </button>
                  <button className="btn-aplicaciones-header" onClick={async () => {
                    if (!oportunidadSeleccionada?._id) return;
                    setLoadingAplicaciones(true);
                    setShowModalAplicaciones(true);
                    try {
                      const { data } = await api.get(`/oportunidades-mtm/${oportunidadSeleccionada._id}/applications`);
                      setAplicacionesList(data.postulaciones || []);
                    } catch (err) {
                      console.error(err);
                      setAplicacionesList([]);
                      Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: err.response?.data?.message || 'No se pudieron cargar las aplicaciones',
                        confirmButtonColor: '#c41e3a'
                      });
                    } finally {
                      setLoadingAplicaciones(false);
                    }
                  }}>
                    <FiUsers className="btn-icon" /> Aplicaciones
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-guardar-header" onClick={handleGuardarMtmCambios}>
                    <FiFileText className="btn-icon" /> Guardar
                  </button>
                  <button className="btn-volver-icon" onClick={handleCancelarMtmEdicion} title="Cancelar">
                    <FiX className="btn-icon" />
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="oportunidades-section">
            <div className="formulario-practica-container">
              <div className="practica-form mtm-form-compact">
                <div className="mtm-form-intro">
                  <HiOutlineAcademicCap className="mtm-form-intro-icon" />
                  <div className="mtm-form-intro-text">
                    <strong>{isMtmEditing ? (ed.nombreCargo || opp.nombreCargo) : opp.nombreCargo}</strong>
                    <span>Oportunidad MTM · No. {opp._id?.slice(-6)}</span>
                  </div>
                </div>

                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon"><FiFileText className="label-icon" /> Nombre del cargo</label>
                  {isMtmEditing
                    ? <input type="text" value={ed.nombreCargo} onChange={e => setMtmEditData(p => ({ ...p, nombreCargo: e.target.value }))} className="form-input" maxLength={250} />
                    : <div className="form-input" style={{ background: '#f9fafb' }}>{opp.nombreCargo || '—'}</div>}
                </div>
                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon"><FiUsers className="label-icon" /> Empresa</label>
                  <div className="form-input" style={{ background: '#f9fafb' }}>{opp.company?.name || opp.company?.legalName || '—'}</div>
                </div>
                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon"><FiList className="label-icon" /> Categoría</label>
                  {isMtmEditing
                    ? <select value={ed.categoria} onChange={e => setMtmEditData(p => ({ ...p, categoria: e.target.value }))} className="form-select">
                        <option value="">Seleccione...</option>
                        {mtmCategoriaItems.map(c => <option key={c._id} value={c._id}>{c.value}</option>)}
                      </select>
                    : <div className="form-input" style={{ background: '#f9fafb' }}>{opp.categoria?.value || '—'}</div>}
                </div>
                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon"><FiCalendar className="label-icon" /> Periodo académico</label>
                  {isMtmEditing
                    ? <select value={ed.periodo} onChange={e => setMtmEditData(p => ({ ...p, periodo: e.target.value }))} className="form-select">
                        <option value="">Seleccione...</option>
                        {mtmPeriodos.map(p => <option key={p._id} value={p._id}>{p.codigo}</option>)}
                      </select>
                    : <div className="form-input" style={{ background: '#f9fafb' }}>{opp.periodo?.codigo || '—'}</div>}
                </div>

                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon"><FiClock className="label-icon" /> Dedicación horas / semana</label>
                  {isMtmEditing
                    ? <select value={ed.dedicacionHoras} onChange={e => setMtmEditData(p => ({ ...p, dedicacionHoras: e.target.value }))} className="form-select">
                        <option value="">Seleccione...</option>
                        {mtmDedicacionItems.map(d => <option key={d._id} value={d._id}>{d.value}{d.description ? ` — ${d.description}` : ''}</option>)}
                      </select>
                    : <div className="form-input" style={{ background: '#f9fafb' }}>{opp.dedicacionHoras?.value || '—'}</div>}
                </div>
                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon"><FiDollarSign className="label-icon" /> Valor por hora</label>
                  {isMtmEditing
                    ? <select value={ed.valorPorHora} onChange={e => setMtmEditData(p => ({ ...p, valorPorHora: e.target.value }))} className="form-select">
                        <option value="">Seleccione...</option>
                        {mtmValorItems.map(v => <option key={v._id} value={v._id}>{v.value}{v.description ? ` — ${v.description}` : ''}</option>)}
                      </select>
                    : <div className="form-input" style={{ background: '#f9fafb' }}>{opp.valorPorHora?.value || '—'}</div>}
                </div>
                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon"><FiFileText className="label-icon" /> Tipo de vinculación</label>
                  {isMtmEditing
                    ? <select value={ed.tipoVinculacion} onChange={e => setMtmEditData(p => ({ ...p, tipoVinculacion: e.target.value }))} className="form-select">
                        <option value="">Seleccione...</option>
                        {mtmVinculacionItems.map(v => <option key={v._id} value={v._id}>{v.value}{v.description ? ` — ${v.description}` : ''}</option>)}
                      </select>
                    : <div className="form-input" style={{ background: '#f9fafb' }}>{opp.tipoVinculacion?.value || '—'}</div>}
                </div>
                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon"><FiUsers className="label-icon" /> Vacantes</label>
                  {isMtmEditing
                    ? <input type="number" value={ed.vacantes} onChange={e => setMtmEditData(p => ({ ...p, vacantes: e.target.value }))} className="form-input" min="0" />
                    : <div className="form-input" style={{ background: '#f9fafb' }}>{opp.vacantes ?? '—'}</div>}
                </div>

                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon"><FiCalendar className="label-icon" /> Fecha de vencimiento</label>
                  {isMtmEditing
                    ? <input type="date" value={ed.fechaVencimiento} onChange={e => setMtmEditData(p => ({ ...p, fechaVencimiento: e.target.value }))} className="form-input" min={minDateVencimiento} />
                    : <div className="form-input" style={{ background: '#f9fafb' }}>{fmtFecha(opp.fechaVencimiento)}</div>}
                </div>
                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon"><FiBookOpen className="label-icon" /> Promedio mínimo requerido</label>
                  {isMtmEditing
                    ? <input type="number" value={ed.promedioMinimo} onChange={e => setMtmEditData(p => ({ ...p, promedioMinimo: e.target.value }))} className="form-input" min="0" max="5" step="0.1" />
                    : <div className="form-input" style={{ background: '#f9fafb' }}>{opp.promedioMinimo != null ? opp.promedioMinimo : '—'}</div>}
                </div>

                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon"><FiEdit className="label-icon" /> Profesor / Coordinador</label>
                  {!isMtmEditing
                    ? <div className="form-input" style={{ background: '#f9fafb' }}>{opp.profesorResponsable ? [opp.profesorResponsable.nombres, opp.profesorResponsable.apellidos].filter(Boolean).join(' ') : (opp.nombreProfesor || '—')}</div>
                    : (
                      <div style={{ position: 'relative' }} ref={mtmProfesorWrapRef}>
                        {mtmProfesorDisplay ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 14, color: '#166534' }}>
                            <span>{mtmProfesorDisplay}</span>
                            <button type="button" onClick={() => { setMtmEditData(p => ({ ...p, profesorResponsable: '', nombreProfesor: '' })); setMtmProfesorResponsable(''); setMtmProfesorDisplay(''); setMtmProfesorSearch(''); }} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: '#6b7280' }} aria-label="Quitar"><FiX size={16} /></button>
                          </div>
                        ) : (
                          <>
                            <input type="text" className="form-input" placeholder="Buscar por nombre o identificación (mín. 2 caracteres)..."
                              value={mtmProfesorSearch} onChange={e => setMtmProfesorSearch(e.target.value)} />
                            {(showMtmProfesorDrop || mtmProfesorLoading) && (
                              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.1)', zIndex: 200, maxHeight: 220, overflowY: 'auto' }}>
                                {mtmProfesorLoading ? <div style={{ padding: '12px 14px', color: '#9ca3af', fontSize: 13 }}>Buscando...</div>
                                  : mtmProfesorError ? <div style={{ padding: '12px 14px', color: '#b91c1c', fontSize: 13, background: '#fef2f2' }}>No se pudo cargar. Verifique permisos o conexión.</div>
                                  : mtmProfesorResults.length === 0 ? <div style={{ padding: '12px 14px', color: '#9ca3af', fontSize: 13 }}>Sin resultados.</div>
                                  : mtmProfesorResults.map(u => (
                                    <div key={u._id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f9fafb', fontSize: 13 }} onMouseEnter={e => { e.currentTarget.style.background = '#f0f7ff'; }} onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                                      onClick={() => { const display = [u.nombres, u.apellidos].filter(Boolean).join(' '); setMtmEditData(p => ({ ...p, profesorResponsable: u._id, nombreProfesor: display })); setMtmProfesorResponsable(u._id); setMtmProfesorDisplay(display); setMtmProfesorSearch(''); setShowMtmProfesorDrop(false); }}>
                                      <div style={{ fontWeight: 600, color: '#374151' }}>{[u.nombres, u.apellidos].filter(Boolean).join(' ')}</div>
                                      {u.user?.email && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{u.user.email}</div>}
                                    </div>
                                  ))
                                }
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                </div>
                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon"><FiMapPin className="label-icon" /> Unidad académica</label>
                  {isMtmEditing
                    ? <input type="text" value={ed.unidadAcademica} onChange={e => setMtmEditData(p => ({ ...p, unidadAcademica: e.target.value }))} className="form-input" />
                    : <div className="form-input" style={{ background: '#f9fafb' }}>{opp.unidadAcademica || '—'}</div>}
                </div>
                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon"><FiClock className="label-icon" /> Horario</label>
                  {isMtmEditing
                    ? <input type="text" value={ed.horario} onChange={e => setMtmEditData(p => ({ ...p, horario: e.target.value }))} className="form-input" />
                    : <div className="form-input" style={{ background: '#f9fafb' }}>{opp.horario || '—'}</div>}
                </div>
                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon"><FiBook className="label-icon" /> Grupo</label>
                  {isMtmEditing
                    ? <input type="text" value={ed.grupo} onChange={e => setMtmEditData(p => ({ ...p, grupo: e.target.value }))} className="form-input" />
                    : <div className="form-input" style={{ background: '#f9fafb' }}>{opp.grupo || '—'}</div>}
                </div>

                <div className="form-field-group form-field-span-2">
                  <label className="form-label-with-icon"><FiBook className="label-icon" /> Asignaturas asociadas {isMtmEditing && <span style={{ fontSize: 11, fontWeight: 400, color: '#6b7280', marginLeft: 4 }}>(máx. 3)</span>}</label>
                  {isMtmEditing ? (
                    <>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder={(ed.asignaturas || []).length >= 3 ? 'Máximo 3 asignaturas seleccionadas' : 'Escribe al menos 3 caracteres...'}
                          value={mtmAsigSearch}
                          disabled={(ed.asignaturas || []).length >= 3}
                          onChange={e => setMtmAsigSearch(e.target.value)}
                        />
                        {(showMtmAsigDrop || mtmAsigLoading) && (
                          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,.1)', zIndex: 200, maxHeight: 200, overflowY: 'auto' }}>
                            {mtmAsigLoading ? <div style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 13 }}>Buscando...</div>
                              : mtmAsigResults.length === 0 ? <div style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 13 }}>Sin resultados</div>
                              : mtmAsigResults.map(a => (
                                <div key={a._id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f9fafb', fontSize: 13 }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
                                  onMouseLeave={e => e.currentTarget.style.background = ''}
                                  onClick={() => {
                                    const list = ed.asignaturas || [];
                                    if (list.some(x => (x._id || x) === a._id)) return;
                                    if (list.length >= 3) return;
                                    setMtmEditData(prev => ({ ...prev, asignaturas: [...(prev.asignaturas || []), a] }));
                                    setMtmAsigSearch(''); setShowMtmAsigDrop(false);
                                  }}>
                                  <strong style={{ color: '#c41e3a' }}>{a.codAsignatura}</strong> — {a.nombreAsignatura}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                      {(ed.asignaturas || []).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          {(ed.asignaturas || []).map(a => (
                            <span key={a._id || a} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#991b1b', fontWeight: 500 }}>
                              <FiBook size={11} />{a.codAsignatura} — {a.nombreAsignatura}
                              <span style={{ cursor: 'pointer', opacity: .7, lineHeight: 1 }} onClick={() => setMtmEditData(prev => ({ ...prev, asignaturas: (prev.asignaturas || []).filter(x => (x._id || x) !== (a._id || a)) }))}>×</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (!opp.asignaturas || opp.asignaturas.length === 0) ? (
                    <div style={{ fontSize: 13, color: '#9ca3af', padding: '8px 0' }}>Sin asignaturas seleccionadas.</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                      {opp.asignaturas.map(a => (
                        <span key={a._id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#991b1b', fontWeight: 500 }}>
                          <FiBook size={11} />{a.codAsignatura} — {a.nombreAsignatura}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-field-group form-field-span-2">
                  <label className="form-label-with-icon"><HiOutlineAcademicCap className="label-icon" /> Programas candidatos</label>
                  {isMtmEditing ? (
                    <div className="programs-section">
                      <div className="programs-header">
                        <span className="programs-title">Programas candidatos</span>
                        <button type="button" className="programs-add" onClick={() => { setMtmProgramsModalForEdit(true); setShowMtmProgramsModal(true); }} title="Añadir programa">
                          <FiPlus />
                        </button>
                      </div>
                      {(!ed.programas || ed.programas.length === 0) ? (
                        <div className="programs-empty">
                          <FiX style={{ marginRight: '4px', display: 'inline-block' }} />
                          No hay programas seleccionados.
                        </div>
                      ) : (
                        <ul className="programs-list" style={{ marginTop: 4 }}>
                          {(ed.programas || []).map((p, idx) => (
                            <li key={p._id || idx}>
                              {p.labelLevel} — {p.name}
                              <button type="button" className="program-remove" onClick={() => setMtmEditData(prev => ({ ...prev, programas: (prev.programas || []).filter((_, i) => i !== idx) }))} title="Eliminar">
                                <FiX />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (!opp.programas || opp.programas.length === 0) ? (
                    <div style={{ fontSize: 13, color: '#9ca3af', padding: '8px 0' }}>Sin programas seleccionados.</div>
                  ) : (
                    <ul className="programs-list" style={{ marginTop: 4 }}>
                      {opp.programas.map(p => (<li key={p._id}>{p.labelLevel} — {p.name}</li>))}
                    </ul>
                  )}
                </div>

                <div className="form-field-group form-field-span-2">
                  <label className="form-label-with-icon"><FiList className="label-icon" /> Funciones</label>
                  {isMtmEditing
                    ? <textarea value={ed.funciones} onChange={e => setMtmEditData(p => ({ ...p, funciones: e.target.value }))} className="form-textarea" maxLength={250} rows={2} />
                    : <div className="form-textarea" style={{ background: '#f9fafb', minHeight: 56, whiteSpace: 'pre-wrap' }}>{opp.funciones || '—'}</div>}
                </div>
                <div className="form-field-group form-field-span-2">
                  <label className="form-label-with-icon"><FiAlertCircle className="label-icon" /> Requisitos</label>
                  {isMtmEditing
                    ? <textarea value={ed.requisitos} onChange={e => setMtmEditData(p => ({ ...p, requisitos: e.target.value }))} className="form-textarea" maxLength={250} rows={2} />
                    : <div className="form-textarea" style={{ background: '#f9fafb', minHeight: 56, whiteSpace: 'pre-wrap' }}>{opp.requisitos || '—'}</div>}
                </div>

                {/* Información de cierre (trazabilidad) — cuando la oportunidad MTM está cerrada */}
                {opp.estado === 'Inactiva' && (opp.fechaCierre || (Array.isArray(opp.cierrePostulantesSeleccionados) && opp.cierrePostulantesSeleccionados.length > 0) || opp.motivoCierreNoContrato) && (
                  <div className="form-field-group form-field-span-2 info-cierre-oportunidad">
                    <div className="info-cierre-oportunidad-header">
                      <FiFileText className="label-icon" />
                      <strong>Información de cierre (trazabilidad)</strong>
                    </div>
                    <div className="info-cierre-oportunidad-body">
                      {opp.fechaCierre && (
                        <p><strong>Fecha de cierre:</strong> {new Date(opp.fechaCierre).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                      )}
                      {opp.cerradoPor && (
                        <p><strong>Cerrado por:</strong> {opp.cerradoPor?.name ?? '—'}</p>
                      )}
                      {opp.motivoCierreNoContrato && (
                        <p><strong>No se contrató MTM.</strong> Motivo: {opp.motivoCierreNoContrato}</p>
                      )}
                      {Array.isArray(opp.cierrePostulantesSeleccionados) && opp.cierrePostulantesSeleccionados.length > 0 && (
                        <>
                          <p><strong>Postulante(s) seleccionado(s):</strong></p>
                          <ul className="info-cierre-lista-postulantes">
                            {opp.cierrePostulantesSeleccionados.map((po) => {
                              const name = po?.postulant?.postulantId?.name ?? po?.postulant?.name ?? '—';
                              const id = (po?._id ?? po)?.toString?.() ?? po;
                              return (
                                <li key={id} className="info-cierre-item">
                                  <span className="info-cierre-nombre">{name}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modales solo para detalle MTM — misma UI que prácticas pero montados aquí para que estén en el árbol */}
        {/* Modal de Programas MTM (edición en detalle) */}
        {showMtmProgramsModal && (() => {
          const normStr = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
          const uniqueLevels = [];
          const seen = new Set();
          allPrograms.forEach(p => {
            if (!p.labelLevel) return;
            const n = normStr(p.labelLevel);
            if (!seen.has(n)) { seen.add(n); uniqueLevels.push(p.labelLevel); }
          });
          uniqueLevels.sort((a, b) => a.localeCompare(b, 'es'));
          const programasDelNivel = newMtmProgramLevel
            ? allPrograms
                .filter(p => normStr(p.labelLevel) === normStr(newMtmProgramLevel))
                .sort((a, b) => a.name.localeCompare(b.name, 'es'))
            : [];
          return (
            <div
              onClick={() => { setShowMtmProgramsModal(false); setMtmProgramsModalForEdit(false); }}
              style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: 520, maxWidth: 'calc(100vw - 40px)', maxHeight: '90vh',
                  background: '#fff', borderRadius: 12,
                  boxShadow: '0 20px 60px rgba(0,0,0,.25)',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden'
                }}
              >
                <div className="modal-header">
                  <h4>Agregar programa candidato</h4>
                  <button className="modal-close" onClick={() => { setShowMtmProgramsModal(false); setMtmProgramsModalForEdit(false); }}>×</button>
                </div>
                <div className="modal-body">
                  {loadingPrograms ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: 13 }}>
                      Cargando niveles y programas...
                    </div>
                  ) : (
                    <>
                      <div className="modal-field">
                        <label>Nivel <span className="required">*</span></label>
                        <select value={newMtmProgramLevel} onChange={e => setNewMtmProgramLevel(e.target.value)}>
                          <option value="">— Seleccione un nivel —</option>
                          {uniqueLevels.map(lv => <option key={lv} value={lv}>{lv}</option>)}
                        </select>
                      </div>
                      <div className="modal-field">
                        <label>Programa <span className="required">*</span></label>
                        <select
                          value={newMtmProgramName}
                          onChange={e => setNewMtmProgramName(e.target.value)}
                          disabled={!newMtmProgramLevel}
                        >
                          <option value="">
                            {newMtmProgramLevel ? '— Seleccione un programa —' : '— Primero seleccione un nivel —'}
                          </option>
                          {programasDelNivel.map(p => (
                            <option key={p._id} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn-secondary" onClick={() => { setShowMtmProgramsModal(false); setMtmProgramsModalForEdit(false); }}>Cerrar</button>
                  <button className="btn-guardar" onClick={handleAddMtmProgram} disabled={loadingPrograms}>Añadir</button>
                </div>
              </div>
            </div>
          );
        })()}
        {showModalCerrarOportunidad && createPortal(
          <div className="oportunidades-modal-rechazo-overlay oportunidades-modal-cerrar-overlay" style={{ zIndex: 100002 }} onClick={() => { setShowModalCerrarOportunidad(false); setCerrarContrato(''); setCerrarMotivoNo(''); setCerrarMotivoNoOtro(''); setSelectedPostulantesCerrar([]); setDatosTutorCerrar({}); }}>
            <div className="oportunidades-modal-rechazo oportunidades-modal-cerrar" onClick={(e) => e.stopPropagation()}>
              <div className="oportunidades-modal-rechazo-header">
                <h4>Confirmación</h4>
                <button type="button" className="oportunidades-modal-rechazo-close" onClick={() => { setShowModalCerrarOportunidad(false); setCerrarContrato(''); setCerrarMotivoNo(''); setCerrarMotivoNoOtro(''); setSelectedPostulantesCerrar([]); setDatosTutorCerrar({}); }} aria-label="Cerrar">×</button>
              </div>
              <div className="oportunidades-modal-rechazo-body">
                <div className="oportunidades-modal-rechazo-field">
                  <label>¿Contrató?</label>
                  <select
                    value={cerrarContrato}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCerrarContrato(v);
                      setCerrarMotivoNo('');
                      if (v === 'no' || v === '') {
                        setSelectedPostulantesCerrar([]);
                        setDatosTutorCerrar({});
                      }
                    }}
                    className="oportunidades-modal-rechazo-select"
                  >
                    <option value="">- Seleccione -</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                </div>
                {cerrarContrato === 'no' && (
                  <div className="oportunidades-modal-rechazo-field">
                    <label>¿Por qué?</label>
                    <select value={cerrarMotivoNo} onChange={(e) => { setCerrarMotivoNo(e.target.value); setCerrarMotivoNoOtro(''); }} className="oportunidades-modal-rechazo-select">
                      <option value="">- Seleccione -</option>
                      {(oportunidadSeleccionada?._isMTM ? MOTIVOS_NO_CONTRATO_MTM : MOTIVOS_NO_CONTRATO).map((m, i) => <option key={i} value={m}>{m}</option>)}
                    </select>
                  </div>
                )}
                {cerrarContrato === 'no' && cerrarMotivoNo === 'Otro' && (
                  <div className="oportunidades-modal-rechazo-field">
                    <label>Especifique el motivo <span className="oportunidades-modal-rechazo-required">*</span></label>
                    <textarea value={cerrarMotivoNoOtro} onChange={(e) => setCerrarMotivoNoOtro(e.target.value)} className="oportunidades-modal-rechazo-textarea" placeholder="Ingrese el motivo..." rows={3} />
                  </div>
                )}
                {cerrarContrato === 'si' && (
                  <>
                    <div className="oportunidades-modal-rechazo-field">
                      <label>Seleccione uno o más postulantes (máx. {oportunidadSeleccionada?.vacantes || 1} vacante(s))</label>
                      {loadingPostulantesCerrar ? <p style={{ margin: 8, color: '#6b7280' }}>Cargando postulantes...</p> : postulantesParaCerrar.length === 0 ? <p style={{ margin: 8, color: '#6b7280' }}>No hay postulantes aplicados.</p> : (
                        <div className="cerrar-oportunidad-lista-postulantes">
                          {postulantesParaCerrar.map((p) => {
                            const id = p._id?.toString?.() || p._id;
                            const checked = selectedPostulantesCerrar.includes(id);
                            const vacantes = oportunidadSeleccionada?.vacantes || 1;
                            const toggle = () => {
                              if (checked) { setSelectedPostulantesCerrar(prev => prev.filter(x => x !== id)); }
                              else if (selectedPostulantesCerrar.length < vacantes) setSelectedPostulantesCerrar(prev => [...prev, id]);
                            };
                            return (
                              <label key={id} className="cerrar-oportunidad-postulante-item">
                                <input type="checkbox" checked={checked} onChange={toggle} disabled={!checked && selectedPostulantesCerrar.length >= vacantes} />
                                <span>{(p.nombres || '') + ' ' + (p.apellidos || '')}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="oportunidades-modal-rechazo-footer">
                <button type="button" className="oportunidades-modal-rechazo-btn-cancelar" onClick={() => { setShowModalCerrarOportunidad(false); setCerrarContrato(''); setCerrarMotivoNo(''); setCerrarMotivoNoOtro(''); setSelectedPostulantesCerrar([]); setDatosTutorCerrar({}); }}>Cerrar</button>
                <button type="button" className="oportunidades-modal-rechazo-btn-rechazar" onClick={handleCerrarOportunidad}>Cerrar Oportunidad</button>
              </div>
            </div>
          </div>,
          document.body
        )}
        {showModalHistorial && (
          <div className="oportunidades-modal-historial-overlay" onClick={() => setShowModalHistorial(false)}>
            <div className="oportunidades-modal-historial" onClick={(e) => e.stopPropagation()}>
              <div className="oportunidades-modal-historial-header">
                <h4>Historial de Estados</h4>
                <button type="button" className="oportunidades-modal-historial-close" onClick={() => setShowModalHistorial(false)} aria-label="Cerrar">×</button>
              </div>
              <div className="oportunidades-modal-historial-body">
                {historialEstados.length === 0 ? (
                  <p className="oportunidades-modal-historial-empty">No hay historial de cambios de estado registrado.</p>
                ) : (
                  <div className="oportunidades-modal-historial-list">
                    {historialEstados.map((item, idx) => (
                      <div key={idx} className="oportunidades-modal-historial-item">
                        <div className="oportunidades-modal-historial-item-header">
                          <span className="oportunidades-modal-historial-estado">
                            {item.estadoAnterior === item.estadoNuevo ? 'Edición' : `${item.estadoAnterior || 'N/A'} → ${item.estadoNuevo}`}
                          </span>
                          <span className="oportunidades-modal-historial-fecha">{formatDate(item.fechaCambio)}</span>
                        </div>
                        <div className="oportunidades-modal-historial-item-details">
                          <p><strong>Cambiado por:</strong> {item.cambiadoPor?.name || 'N/A'}</p>
                          {item.motivo && <p><strong>Motivo:</strong> {item.motivo}</p>}
                          {item.comentarios && <p><strong>Comentarios:</strong> {item.comentarios}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="oportunidades-modal-historial-footer">
                <button type="button" className="oportunidades-modal-historial-btn-cerrar" onClick={() => setShowModalHistorial(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        )}
        {showModalAplicaciones && (
          <div className="oportunidades-vista-aplicaciones-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowModalAplicaciones(false); setAplicacionDetail(null); setSelectedPostulacionId(null); } }}>
            <div className="oportunidades-vista-aplicaciones" onClick={(e) => e.stopPropagation()}>
              <div className="oportunidades-vista-aplicaciones-header">
                <h4>Aplicaciones / Postulantes</h4>
                <button type="button" className="oportunidades-modal-historial-close" onClick={() => { setShowModalAplicaciones(false); setAplicacionDetail(null); setSelectedPostulacionId(null); }} aria-label="Cerrar">×</button>
              </div>
              {opp.estado === 'Activa' && (
                <p className="oportunidades-mtm-cupo-hint" style={{ margin: '0 20px 12px', fontSize: 13, color: '#475569' }}>
                  Vacantes: <strong>{seleccionadosMtmCount}</strong> de <strong>{vacantesMtm}</strong> seleccionado(s). Puede seleccionar sin cerrar la oportunidad; el estudiante recibirá la misma notificación que al cierre con contratación.
                </p>
              )}
              <div className="oportunidades-vista-aplicaciones-body">
                <div className="oportunidades-vista-aplicaciones-tabla">
                  {loadingAplicaciones ? (
                    <p className="oportunidades-modal-historial-empty">Cargando aplicaciones...</p>
                  ) : aplicacionesList.length === 0 ? (
                    <p className="oportunidades-modal-historial-empty">No hay postulantes para esta oportunidad.</p>
                  ) : (
                    <div className="tabla-aplicaciones-wrap">
                      <table className="tabla-aplicaciones">
                        <thead>
                          <tr>
                            <th>Nombres</th>
                            <th>Apellidos</th>
                            <th>Programa en curso</th>
                            <th>Programa finalizado</th>
                            <th>Años de experiencia</th>
                            <th>Fecha aplicación</th>
                            <th>Estado</th>
                            <th>Revisada</th>
                            <th>Descargada</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aplicacionesList.map((row, idx) => (
                            <tr
                              key={row._id || idx}
                              className={selectedPostulacionId === (row._id?.toString?.() || row._id) ? 'selected' : ''}
                              onClick={async () => {
                                if (!oportunidadSeleccionada?._id || !row._id) return;
                                setSelectedPostulacionId(row._id?.toString?.() || row._id);
                                setLoadingDetail(true);
                                setAplicacionDetail(null);
                                try {
                                  const { data } = await api.get(`/oportunidades-mtm/${oportunidadSeleccionada._id}/applications/detail/${row._id}`);
                                  setAplicacionDetail(data);
                                } catch (err) {
                                  console.error(err);
                                  Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo cargar el perfil', confirmButtonColor: '#c41e3a' });
                                } finally {
                                  setLoadingDetail(false);
                                }
                              }}
                            >
                              <td>{row.nombres ?? '—'}</td>
                              <td>{row.apellidos ?? '—'}</td>
                              <td>{Array.isArray(row.programasEnCurso) && row.programasEnCurso.length > 0 ? row.programasEnCurso.map((p, i) => <div key={i}>{p}</div>) : 'Sin programas'}</td>
                              <td>{Array.isArray(row.programasFinalizados) && row.programasFinalizados.length > 0 ? row.programasFinalizados.map((p, i) => <div key={i}>{p}</div>) : 'Sin programas'}</td>
                              <td>{row.añosExperiencia ?? '—'}</td>
                              <td>{row.fechaPostulacion ? new Date(row.fechaPostulacion).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</td>
                              <td>{row.estadoLabel ?? row.estado ?? '—'}</td>
                              <td>{row.revisada ? '✓' : '—'}</td>
                              <td>{row.descargada ? '✓' : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="oportunidades-vista-aplicaciones-detalle">
                  {loadingDetail ? (
                    <p className="oportunidades-modal-historial-empty">Cargando perfil...</p>
                  ) : aplicacionDetail ? (
                    <div className="detalle-postulante">
                      <h5 className="detalle-postulante-nombre">{(aplicacionDetail.nombres || '') + ' ' + (aplicacionDetail.apellidos || '')}</h5>
                      <div className="detalle-postulante-campo"><strong>Email:</strong> {aplicacionDetail.email ?? '—'}</div>
                      <div className="detalle-postulante-campo"><strong>Teléfono:</strong> {aplicacionDetail.telefono ?? '—'}</div>
                      {aplicacionDetail.linkedin && <div className="detalle-postulante-campo"><strong>LinkedIn:</strong> <a href={aplicacionDetail.linkedin} target="_blank" rel="noopener noreferrer">{aplicacionDetail.linkedin}</a></div>}
                      <div className="detalle-postulante-campo"><strong>Fecha de aplicación:</strong> {aplicacionDetail.fechaAplicacion ? new Date(aplicacionDetail.fechaAplicacion).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</div>
                      <div className="detalle-postulante-campo"><strong>Estado:</strong> {aplicacionDetail.estadoLabel ?? aplicacionDetail.estado ?? '—'}</div>
                      {aplicacionDetail._source === 'postulacion_oportunidad' && (
                        <div className="detalle-postulante-acciones detalle-postulante-acciones--mtm">
                          {aplicacionDetail.estado === 'rechazado' ? (
                            <button type="button" className="btn-deshacer-rechazo" onClick={async () => {
                              if (!oportunidadSeleccionada?._id || !aplicacionDetail._id) return;
                              try {
                                await api.patch(`/oportunidades-mtm/${oportunidadSeleccionada._id}/applications/${aplicacionDetail._id}/state`, { estado: 'empresa_consulto_perfil' });
                                const { data } = await api.get(`/oportunidades-mtm/${oportunidadSeleccionada._id}/applications/detail/${aplicacionDetail._id}`);
                                setAplicacionDetail(data);
                                setAplicacionesList(prev => prev.map(r => (r._id?.toString?.() === aplicacionDetail._id?.toString?.() ? { ...r, estado: data.estado, estadoLabel: data.estadoLabel } : r)));
                                Swal.fire({ icon: 'success', title: 'Rechazo revertido', confirmButtonColor: '#c41e3a', customClass: { container: 'swal-over-vista-aplicaciones' } });
                              } catch (err) {
                                Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo revertir el rechazo', confirmButtonColor: '#c41e3a', customClass: { container: 'swal-over-vista-aplicaciones' } });
                              }
                            }}>Deshacer rechazo</button>
                          ) : (aplicacionDetail.estado === 'seleccionado_empresa' || aplicacionDetail.estado === 'aceptado_estudiante') ? (
                            <span className="detalle-postulante-ya-seleccionado">Seleccionado</span>
                          ) : (
                            <>
                              {opp.estado === 'Activa' && (
                                <button
                                  type="button"
                                  className="btn-seleccionar-estudiante"
                                  disabled={!cupoSeleccionMtm}
                                  title={!cupoSeleccionMtm ? `Ya hay ${vacantesMtm} postulante(s) seleccionado(s) (límite de vacantes).` : 'Seleccionar a este postulante'}
                                  onClick={async () => {
                                    if (!oportunidadSeleccionada?._id || !aplicacionDetail._id) return;
                                    const confirm = await Swal.fire({
                                      icon: 'question',
                                      title: '¿Seleccionar postulante?',
                                      text: 'El estudiante quedará como seleccionado y recibirá la misma notificación que al cerrar la oportunidad con contratación. La oportunidad seguirá activa.',
                                      showCancelButton: true,
                                      confirmButtonText: 'Sí, seleccionar',
                                      cancelButtonText: 'Cancelar',
                                      confirmButtonColor: '#15803d',
                                      customClass: { container: 'swal-over-vista-aplicaciones' }
                                    });
                                    if (!confirm.isConfirmed) return;
                                    try {
                                      await api.post(`/oportunidades-mtm/${oportunidadSeleccionada._id}/applications/${aplicacionDetail._id}/seleccionar`);
                                      const { data } = await api.get(`/oportunidades-mtm/${oportunidadSeleccionada._id}/applications/detail/${aplicacionDetail._id}`);
                                      setAplicacionDetail(data);
                                      const { data: listData } = await api.get(`/oportunidades-mtm/${oportunidadSeleccionada._id}/applications`);
                                      setAplicacionesList(listData.postulaciones || []);
                                      Swal.fire({ icon: 'success', title: 'Postulante seleccionado', confirmButtonColor: '#15803d', customClass: { container: 'swal-over-vista-aplicaciones' } });
                                    } catch (err) {
                                      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo seleccionar', confirmButtonColor: '#c41e3a', customClass: { container: 'swal-over-vista-aplicaciones' } });
                                    }
                                  }}
                                >
                                  Seleccionar
                                </button>
                              )}
                              <button type="button" className="btn-rechazar-estudiante" onClick={async () => {
                                const result = await Swal.fire({ icon: 'warning', title: 'Rechazar postulante', text: '¿Está seguro de rechazar a este postulante?', showCancelButton: true, confirmButtonText: 'Sí, rechazar', cancelButtonText: 'Cancelar', confirmButtonColor: '#c41e3a', customClass: { container: 'swal-over-vista-aplicaciones' } });
                                if (!result.isConfirmed || !oportunidadSeleccionada?._id || !aplicacionDetail._id) return;
                                try {
                                  await api.patch(`/oportunidades-mtm/${oportunidadSeleccionada._id}/applications/${aplicacionDetail._id}/state`, { estado: 'rechazado' });
                                  const { data } = await api.get(`/oportunidades-mtm/${oportunidadSeleccionada._id}/applications/detail/${aplicacionDetail._id}`);
                                  setAplicacionDetail(data);
                                  setAplicacionesList(prev => prev.map(r => (r._id?.toString?.() === aplicacionDetail._id?.toString?.() ? { ...r, estado: data.estado, estadoLabel: data.estadoLabel } : r)));
                                  Swal.fire({ icon: 'success', title: 'Postulante rechazado', confirmButtonColor: '#c41e3a', customClass: { container: 'swal-over-vista-aplicaciones' } });
                                } catch (err) {
                                  Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo rechazar al postulante', confirmButtonColor: '#c41e3a', customClass: { container: 'swal-over-vista-aplicaciones' } });
                                }
                              }}>Rechazar estudiante</button>
                            </>
                          )}
                        </div>
                      )}
                      <div className="detalle-postulante-campo"><strong>Años de experiencia:</strong> {aplicacionDetail.añosExperiencia ?? '—'}</div>
                      {Array.isArray(aplicacionDetail.programasEnCurso) && aplicacionDetail.programasEnCurso.length > 0 && (
                        <div className="detalle-postulante-campo"><strong>Programas en curso:</strong><ul>{aplicacionDetail.programasEnCurso.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
                      )}
                      {Array.isArray(aplicacionDetail.programasFinalizados) && aplicacionDetail.programasFinalizados.length > 0 && (
                        <div className="detalle-postulante-campo"><strong>Programas finalizados:</strong><ul>{aplicacionDetail.programasFinalizados.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
                      )}
                      {Array.isArray(aplicacionDetail.hojasDeVida) && aplicacionDetail.hojasDeVida.length > 0 && (
                        <div className="detalle-postulante-campo">
                          <strong>Hoja de vida:</strong>
                          <ul>
                            {aplicacionDetail.hojasDeVida.map((hv, i) => (
                              <li key={i}>
                                <a href="#" onClick={async (e) => {
                                  e.preventDefault();
                                  if (!hv.postulantDocId || !hv.attachmentId) return;
                                  try {
                                    const res = await api.get(`/postulants/${hv.postulantDocId}/attachments/${hv.attachmentId}/download`, { responseType: 'blob' });
                                    const url = window.URL.createObjectURL(res.data);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = hv.name || 'hoja-de-vida.pdf';
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    if (oportunidadSeleccionada?._id && aplicacionDetail?._id) {
                                      try {
                                        await api.patch(`/oportunidades-mtm/${oportunidadSeleccionada._id}/applications/${aplicacionDetail._id}/descargo-hv`);
                                        const { data } = await api.get(`/oportunidades-mtm/${oportunidadSeleccionada._id}/applications/detail/${aplicacionDetail._id}`);
                                        setAplicacionDetail(data);
                                        setAplicacionesList(prev => prev.map(r => (r._id?.toString?.() === aplicacionDetail._id?.toString?.() ? { ...r, descargada: true } : r)));
                                      } catch (_) {}
                                    }
                                    Swal.fire({ icon: 'success', title: 'Descarga iniciada', timer: 2000, showConfirmButton: false, customClass: { container: 'swal-over-modal-cierre' } });
                                  } catch (err) {
                                    Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo descargar', confirmButtonColor: '#c41e3a', customClass: { container: 'swal-over-modal-cierre' } });
                                  }
                                }}>
                                  {hv.name || 'Descargar hoja de vida'}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {/* Documentos de soporte adjuntos a la postulación */}
                      {Array.isArray(aplicacionDetail.documentosSoporte) && aplicacionDetail.documentosSoporte.length > 0 && (
                        <div className="detalle-postulante-campo detalle-postulante-campo--docs-soporte">
                          <strong>Documentos de soporte:</strong>
                          <ul className="detalle-docs-soporte__list">
                            {aplicacionDetail.documentosSoporte.map((doc, i) => (
                              <li key={i} className="detalle-docs-soporte__item">
                                <a href="#" className="detalle-docs-soporte__link" onClick={async (e) => {
                                  e.preventDefault();
                                  if (!doc.postulantDocId || !doc.attachmentId) return;
                                  try {
                                    const res = await api.get(`/postulants/${doc.postulantDocId}/attachments/${doc.attachmentId}/download`, { responseType: 'blob' });
                                    const url = window.URL.createObjectURL(res.data);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = doc.originalName || doc.documentLabel || `documento-soporte-${i + 1}`;
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    Swal.fire({ icon: 'success', title: 'Descarga iniciada', timer: 1800, showConfirmButton: false, customClass: { container: 'swal-over-modal-cierre' } });
                                  } catch (err) {
                                    Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo descargar', confirmButtonColor: '#c41e3a', customClass: { container: 'swal-over-modal-cierre' } });
                                  }
                                }}>
                                  📎 {doc.documentLabel || doc.originalName || `Documento ${i + 1}`}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="oportunidades-modal-historial-empty">Seleccione un postulante de la lista.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        </>
      );
    }
    // ── FIN DETALLE MTM ──────────────────────────────────────────────────────

    // Función para activar modo edición
    const handleActivarEdicion = () => {
      setIsEditingDetail(true);
    };

    // Función para cancelar edición
    const handleCancelarEdicion = () => {
      setIsEditingDetail(false);
      // Recargar datos originales
      const formDataEdit = {
        nombreCargo: opp.nombreCargo || '',
        auxilioEconomico: opp.auxilioEconomico || false,
        requiereConfidencialidad: opp.requiereConfidencialidad || false,
        apoyoEconomico: opp.apoyoEconomico ? opp.apoyoEconomico.toString() : '',
        tipoVinculacion: opp.tipoVinculacion || '',
        periodo: opp.periodo || '',
        vacantes: opp.vacantes ? opp.vacantes.toString() : '',
        fechaVencimiento: opp.fechaVencimiento ? new Date(opp.fechaVencimiento).toISOString().split('T')[0] : '',
        pais: opp.pais || '',
        ciudad: opp.ciudad || '',
        jornadaOrdinariaSemanal: opp.jornadaOrdinariaSemanal ? opp.jornadaOrdinariaSemanal.toString() : '',
        dedicacion: opp.dedicacion || '',
        fechaInicioPractica: opp.fechaInicioPractica ? new Date(opp.fechaInicioPractica).toISOString().split('T')[0] : '',
        fechaFinPractica: opp.fechaFinPractica ? new Date(opp.fechaFinPractica).toISOString().split('T')[0] : '',
        horario: opp.horario || '',
        areaDesempeno: (opp.areaDesempeno && typeof opp.areaDesempeno === 'object' && opp.areaDesempeno._id) 
          ? opp.areaDesempeno._id 
          : (opp.areaDesempeno || ''),
        enlacesFormatoEspecificos: opp.enlacesFormatoEspecificos || '',
        salarioEmocional: (() => {
          const arr = Array.isArray(opp.salarioEmocional) 
            ? opp.salarioEmocional 
            : (opp.salarioEmocional ? [opp.salarioEmocional] : []);
          return arr.map(x => (x && typeof x === 'object' && x._id) ? x._id : x);
        })(),
        promedioMinimoRequerido: opp.promedioMinimoRequerido || '',
        formacionAcademica: opp.formacionAcademica || [],
        idiomas: opp.idiomas || [],
        funciones: opp.funciones || '',
        requisitos: opp.requisitos || ''
      };
      setEditFormData(formDataEdit);
    };

    // Función para guardar cambios
    const handleGuardarCambios = async () => {
      await handleUpdateForm();
      setIsEditingDetail(false);
    };

    const vacantesPractica = Math.max(1, Number(opp?.vacantes) || 1);
    const seleccionadosPracticaCount = aplicacionesList.filter((r) => r.estado === 'seleccionado_empresa').length;
    const cupoSeleccionPractica = seleccionadosPracticaCount < vacantesPractica;
    const puedeSeleccionarPracticaAplicaciones =
      opp.tipo === 'practica' && (estado === 'Activa' || estado === 'activa' || estado === 'published');

    return (
      <div className="oportunidades-content">
        <div className="oportunidades-header form-header detail-header">
          <div className="form-header-left">
            <button className="btn-volver-icon" onClick={() => {
              if (esEntidadSoloLectura) {
                navigate('/entidad/oportunidades');
              }
              setVista('lista');
              setOportunidadSeleccionada(null);
              setEditFormData(null);
              setSelectedLinkageDescription('');
              setIsEditingDetail(false);
              setShowModalAplicaciones(false);
              setShowModalHistorial(false);
              setShowModalCerrarOportunidad(false);
              setShowModalSeleccionarPractica(false);
              setPostulacionIdSeleccionPractica(null);
              setAplicacionDetail(null);
              setSelectedPostulacionId(null);
            }} title="Volver">
              <FiArrowLeft className="btn-icon" />
            </button>
            <div className="section-header">
              <h3>
                <HiOutlineAcademicCap style={{ marginRight: '8px', display: 'inline-block' }} />
                {esEntidadSoloLectura ? 'VER OPORTUNIDAD (SOLO LECTURA)' : 'DETALLE DE OPORTUNIDAD'}
              </h3>
            </div>
          </div>
          <div className="detail-header-actions">
            {!isEditingDetail ? (
              <>
                {!esEntidadSoloLectura && (estado !== 'Cerrada' && opp.status !== 'Cerrada') && (
                  <button className="btn-editar-header" onClick={handleActivarEdicion}>
                    <FiEdit className="btn-icon" />
                    Editar
                  </button>
                )}
                {estado !== 'Rechazada' && estado !== 'Cerrada' && (
                  (estado === 'Activa' || estado === 'activa' || estado === 'published') ? (
                    <button className="btn-cerrar-oportunidad-header" onClick={async () => {
                      setShowModalCerrarOportunidad(true);
                      setCerrarContrato('');
                      setCerrarMotivoNo('');
                      setLoadingPostulantesCerrar(true);
                      try {
                        const base = oportunidadSeleccionada._isMTM ? '/oportunidades-mtm' : '/opportunities';
                        let oppForCierre = oportunidadSeleccionada;
                        if (!oportunidadSeleccionada._isMTM) {
                          const { data: freshOpp } = await api.get(`${base}/${oportunidadSeleccionada._id}`);
                          oppForCierre = freshOpp;
                          setOportunidadSeleccionada(freshOpp);
                        }
                        const { data } = await api.get(`${base}/${oportunidadSeleccionada._id}/applications`);
                        const list = oportunidadSeleccionada._isMTM
                          ? (data.postulaciones || []).filter(p => p.estado !== 'rechazado')
                          : (data.postulaciones || []).filter(p => p._source === 'postulacion_oportunidad' && p.estado !== 'rechazado');
                        setPostulantesParaCerrar(list);
                        if (!oportunidadSeleccionada._isMTM && oportunidadSeleccionada.tipo === 'practica') {
                          const { validIds, datosMap } = buildCerrarPracticaPrefill(oppForCierre, list);
                          setSelectedPostulantesCerrar(validIds);
                          setDatosTutorCerrar(datosMap);
                        } else {
                          setSelectedPostulantesCerrar([]);
                          setDatosTutorCerrar({});
                        }
                      } catch (_) {
                        setPostulantesParaCerrar([]);
                        setSelectedPostulantesCerrar([]);
                        setDatosTutorCerrar({});
                      } finally {
                        setLoadingPostulantesCerrar(false);
                      }
                    }}>
                      <FiXCircle className="btn-icon" />
                      Cerrar oportunidad
                    </button>
                  ) : (
                    !esEntidadSoloLectura && (
                    <button className="btn-rechazar-header" onClick={() => setShowModalRechazo(true)}>
                      <FiXCircle className="btn-icon" />
                      Rechazar
                    </button>
                    )
                  )
                )}
                <button className="btn-historial-header" onClick={loadHistorialEstados}>
                  <FiList className="btn-icon" />
                  Historial
                </button>
                <button className="btn-duplicar-header" onClick={handleDuplicarOportunidad}>
                  <FiCopy className="btn-icon" />
                  Duplicar
                </button>
                <button className="btn-aplicaciones-header" onClick={async () => {
                  if (!oportunidadSeleccionada?._id) return;
                  setLoadingAplicaciones(true);
                  setShowModalAplicaciones(true);
                  try {
                    const base = oportunidadSeleccionada._isMTM ? '/oportunidades-mtm' : '/opportunities';
                    if (!oportunidadSeleccionada._isMTM) {
                      const { data: oppFresh } = await api.get(`${base}/${oportunidadSeleccionada._id}`);
                      setOportunidadSeleccionada(oppFresh);
                    }
                    const { data } = await api.get(`${base}/${oportunidadSeleccionada._id}/applications`);
                    setAplicacionesList(data.postulaciones || []);
                  } catch (err) {
                    console.error(err);
                    setAplicacionesList([]);
                    Swal.fire({
                      icon: 'error',
                      title: 'Error',
                      text: err.response?.data?.message || 'No se pudieron cargar las aplicaciones',
                      confirmButtonColor: '#c41e3a'
                    });
                  } finally {
                    setLoadingAplicaciones(false);
                  }
                }}>
                  <FiUsers className="btn-icon" />
                  Aplicaciones
                </button>
                {!esEntidadSoloLectura && estado === 'Creada' && (
                  <button className="btn-guardar-header" onClick={handleEnviarRevision}>
                    <FiFileText className="btn-icon" />
                    Enviar a Revisión
                  </button>
                )}
                {!esEntidadSoloLectura && puedeAprobar && (
                  <button className="btn-guardar-header" onClick={() => setShowModalAprobacion(true)}>
                    <HiOutlineAcademicCap className="btn-icon" />
                    Aprobar
                  </button>
                )}
              </>
            ) : (
              <>
                <button className="btn-guardar-header" onClick={handleGuardarCambios}>
                  <FiFileText className="btn-icon" />
                  Guardar
                </button>
                <button className="btn-volver-icon" onClick={handleCancelarEdicion} title="Cancelar">
                  <FiX className="btn-icon" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="oportunidades-section">
          <div className="formulario-practica-container">
            <form className="practica-form">
              {/* Nombre del cargo */}
              <div className="form-field-group form-field-half-width">
                <label className="form-label">Nombre del cargo</label>
                <input
                  type="text"
                  name="nombreCargo"
                  value={editFormData.nombreCargo}
                  onChange={handleEditFormChange}
                  className="form-input"
                  placeholder="Ingrese el nombre del cargo"
                  disabled={!isEditingDetail}
                  readOnly={!isEditingDetail}
                />
              </div>

              {/* Nombre de la empresa */}
              {editSelectedCompany && (
                <div className="form-field-group form-field-half-width">
                  <label className="form-label">Empresa</label>
                  <div className="company-display">
                    {editSelectedCompany.name || editSelectedCompany.commercialName}
                  </div>
                </div>
              )}

              {/* Información de cierre (trazabilidad) — solo cuando la oportunidad está Cerrada */}
              {(oportunidadSeleccionada?.estado === 'Cerrada' || oportunidadSeleccionada?.status === 'Cerrada') && (
                <div className="form-field-group form-field-full-width info-cierre-oportunidad">
                  <div className="info-cierre-oportunidad-header">
                    <FiFileText className="label-icon" />
                    <strong>Información de cierre (trazabilidad)</strong>
                  </div>
                  <div className="info-cierre-oportunidad-body">
                    {oportunidadSeleccionada?.fechaCierre && (
                      <p><strong>Fecha de cierre:</strong> {new Date(oportunidadSeleccionada.fechaCierre).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                    )}
                    {oportunidadSeleccionada?.motivoCierreNoContrato ? (
                      <p><strong>No se contrató.</strong> Motivo: {oportunidadSeleccionada.motivoCierreNoContrato}</p>
                    ) : null}
                    {Array.isArray(oportunidadSeleccionada?.cierrePostulantesSeleccionados) && oportunidadSeleccionada.cierrePostulantesSeleccionados.length > 0 && (
                      <>
                        <p><strong>Postulante(s) seleccionado(s):</strong></p>
                        <ul className="info-cierre-lista-postulantes">
                          {oportunidadSeleccionada.cierrePostulantesSeleccionados.map((po) => {
                            const name = po?.postulant?.postulantId?.name ?? po?.postulant?.name ?? '—';
                            const id = (po?._id ?? po)?.toString?.() ?? po;
                            const datosTutor = (oportunidadSeleccionada.cierreDatosTutor || []).find(d => (d.postulacionId?.toString?.() || d.postulacionId) === id);
                            return (
                              <li key={id} className="info-cierre-item">
                                <span className="info-cierre-nombre">{name}</span>
                                {datosTutor && (
                                  <div className="info-cierre-datos-tutor">
                                    <strong>Datos tutor:</strong> {[datosTutor.nombreTutor, datosTutor.apellidoTutor].filter(Boolean).join(' ') || '—'} · {datosTutor.emailTutor || '—'} · Tel.: {datosTutor.telefonoTutor || '—'} · Cargo: {datosTutor.cargoTutor || '—'}
                                    {datosTutor.arlEmpresa && <> · ARL: {arlItems.find(i => i._id === datosTutor.arlEmpresa)?.description || arlItems.find(i => i._id === datosTutor.arlEmpresa)?.value || datosTutor.arlEmpresa}</>}
                                    {datosTutor.fechaInicioPractica && <> · Inicio práctica: {new Date(datosTutor.fechaInicioPractica).toLocaleDateString('es-CO')}</>}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Switches de auxilio económico */}
              <div className="form-field-group form-field-full-width">
                <div className="rol-switch-container">
                  <label className="rol-switch">
                    <input
                      type="checkbox"
                      name="auxilioEconomico"
                      checked={editFormData.auxilioEconomico}
                      onChange={handleEditFormChange}
                      disabled={!isEditingDetail}
                    />
                    <span className="rol-slider"></span>
                  </label>
                  <span className="rol-status-text">
                    ¿La práctica cuenta con auxilio económico?
                  </span>
                </div>
              </div>

              <div className="form-field-group form-field-full-width">
                <div className="rol-switch-container">
                  <label className="rol-switch">
                    <input
                      type="checkbox"
                      name="requiereConfidencialidad"
                      checked={editFormData.requiereConfidencialidad}
                      onChange={handleEditFormChange}
                      disabled={!editFormData.auxilioEconomico || !isEditingDetail}
                    />
                    <span className="rol-slider"></span>
                  </label>
                  <span className="rol-status-text">
                    ¿Requiere confidencialidad para el auxilio económico?
                  </span>
                </div>
              </div>

              {/* Apoyo económico */}
              {editFormData.auxilioEconomico && (
                <div className="form-field-group">
                  <label className="form-label-with-icon">
                    <FiDollarSign className="label-icon" />
                    Apoyo económico
                    <div className="info-tooltip-wrapper">
                      <span className="info-icon">i</span>
                      <div className="tooltip-content">
                        <strong>Información</strong>
                        <p>Mínimo en reglas de negocio: <strong>${minApoyoEconomicoCOP.toLocaleString('es-CO')}</strong> COP.</p>
                      </div>
                    </div>
                  </label>
                  <div className="currency-input-wrapper">
                    <input
                      type="text"
                      name="apoyoEconomico"
                      value={editFormData.apoyoEconomico ? formatCurrency(editFormData.apoyoEconomico) : ''}
                      onChange={handleEditFormChange}
                      className="form-input currency-input"
                      placeholder="Ingrese el monto"
                      disabled={!isEditingDetail}
                      readOnly={!isEditingDetail}
                      style={isEditingDetail && apoyoMenorAlMinimoLegal(editFormData.auxilioEconomico, editFormData.apoyoEconomico) ? estiloInputJornadaInvalida : undefined}
                      aria-invalid={isEditingDetail && apoyoMenorAlMinimoLegal(editFormData.auxilioEconomico, editFormData.apoyoEconomico)}
                    />
                  </div>
                  {isEditingDetail && apoyoMenorAlMinimoLegal(editFormData.auxilioEconomico, editFormData.apoyoEconomico) && (
                    <p className="form-error-text" style={{ color: '#dc2626', fontSize: 13, marginTop: 6 }}>
                      {`Debe ser al menos $${minApoyoEconomicoCOP.toLocaleString('es-CO')} COP (regla de negocio).`}
                    </p>
                  )}
                </div>
              )}

              {/* Tipo de vinculación */}
              <div className="form-field-group">
                <label className="form-label-with-icon">
                  <FiFileText className="label-icon" />
                  Tipo de vinculación
                  {selectedLinkageDescription && (
                    <div className="info-tooltip-wrapper">
                      <span className="info-icon">i</span>
                      <div className="tooltip-content">
                        <strong>Información</strong>
                        <p>{selectedLinkageDescription}</p>
                      </div>
                    </div>
                  )}
                </label>
                <select
                  name="tipoVinculacion"
                  value={editFormData.tipoVinculacion}
                  onChange={handleEditFormChange}
                  className="form-select"
                  disabled={!isEditingDetail}
                >
                  <option value="">Seleccionar</option>
                  {linkageTypes.map(linkage => (
                    <option key={linkage._id} value={linkage._id}>
                      {linkage.value}
                    </option>
                  ))}
                </select>
              </div>

              {/* Periodo */}
              <div className="form-field-group">
                <label className="form-label-with-icon">
                  <FiBook className="label-icon" />
                  Periodo
                </label>
                <select
                  name="periodo"
                  value={editFormData.periodo}
                  onChange={handleEditFormChange}
                  className="form-select"
                  disabled={!isEditingDetail}
                >
                  <option value="">Seleccionar una opción</option>
                  {practicaPeriodos.map(p => <option key={p._id} value={p._id}>{p.codigo}</option>)}
                </select>
              </div>

              {/* Vacantes */}
              <div className="form-field-group">
                <label className="form-label-with-icon">
                  <FiUsers className="label-icon" />
                  Vacantes
                </label>
                <input
                  type="number"
                  name="vacantes"
                  value={editFormData.vacantes}
                  onChange={handleEditFormChange}
                  className="form-input"
                  min="1"
                  placeholder="Número de vacantes"
                  disabled={!isEditingDetail}
                  readOnly={!isEditingDetail}
                />
              </div>

              {/* Fecha de vencimiento */}
              <div className="form-field-group">
                <label className="form-label-with-icon">
                  <FiCalendar className="label-icon" />
                  Fecha de vencimiento
                </label>
                <input
                  type="date"
                  name="fechaVencimiento"
                  value={editFormData.fechaVencimiento}
                  onChange={handleEditFormChange}
                  className="form-input"
                  disabled={!isEditingDetail}
                  readOnly={!isEditingDetail}
                  min={minDateVencimiento}
                />
              </div>

              {/* País / Ciudad (backend Country, City) */}
              <div className="form-field-group form-field-half-width">
                <label className="form-label-with-icon">
                  <FiMapPin className="label-icon" />
                  País / Ciudad
                </label>
                <div className="country-city-group">
                  <select
                    name="pais"
                    value={editFormData.pais}
                    onChange={(e) => {
                      if (!isEditingDetail) return;
                      const { name, value } = e.target;
                      setEditFormData(prev => ({ ...prev, [name]: value, ciudad: '' }));
                    }}
                    className="form-select"
                    disabled={!isEditingDetail}
                  >
                    <option value="">Seleccionar</option>
                    {countries.map(country => (
                      <option key={country._id} value={country._id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <select
                    name="ciudad"
                    value={editFormData.ciudad}
                    onChange={handleEditFormChange}
                    className="form-select"
                    disabled={!editFormData.pais || !isEditingDetail}
                  >
                    <option value="">Seleccionar</option>
                    {editCities.map(city => (
                      <option key={city._id} value={city._id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Jornada Ordinaria Semanal */}
              <div className="form-field-group">
                <label className="form-label-with-icon">
                  <FiClock className="label-icon" />
                  Jornada ordinaria semanal
                  <div className="info-tooltip-wrapper">
                    <span className="info-icon">i</span>
                    <div className="tooltip-content">
                      <strong>Información</strong>
                      <p>Es el total de horas semanales que según los reglamentos de la empresa/entidad deben cumplir los empleados.</p>
                      <p>Máximo permitido: {maxJornadaOrdinariaSemanal} h/semana (regla de negocio).</p>
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  name="jornadaOrdinariaSemanal"
                  value={editFormData.jornadaOrdinariaSemanal}
                  onChange={handleEditFormChange}
                  className="form-input"
                  min="0"
                  max={maxJornadaOrdinariaSemanal}
                  placeholder={`Máx. ${maxJornadaOrdinariaSemanal} h`}
                  disabled={!isEditingDetail}
                  readOnly={!isEditingDetail}
                  style={jornadaExcedeMaximo(editFormData.jornadaOrdinariaSemanal) ? estiloInputJornadaInvalida : undefined}
                  aria-invalid={jornadaExcedeMaximo(editFormData.jornadaOrdinariaSemanal)}
                />
                {jornadaExcedeMaximo(editFormData.jornadaOrdinariaSemanal) && (
                  <span style={{ color: '#b91c1c', fontSize: 12, marginTop: 6, display: 'block', fontWeight: 600 }}>
                    Supera el máximo de {maxJornadaOrdinariaSemanal} horas semanales.
                  </span>
                )}
              </div>

              {/* Dedicación */}
              <div className="form-field-group">
                <label className="form-label">Dedicación</label>
                <select
                  name="dedicacion"
                  value={editFormData.dedicacion}
                  onChange={handleEditFormChange}
                  className="form-select"
                  disabled={!isEditingDetail}
                >
                  <option value="">Seleccionar</option>
                  {dedicationTypes.map(dedication => (
                    <option key={dedication._id} value={dedication._id}>
                      {dedication.description || dedication.value}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha inicio práctica */}
              <div className="form-field-group">
                <label className="form-label">Fecha inicio de la práctica</label>
                <input
                  type="date"
                  name="fechaInicioPractica"
                  value={editFormData.fechaInicioPractica}
                  onChange={handleEditFormChange}
                  className="form-input"
                  disabled={!isEditingDetail}
                  readOnly={!isEditingDetail}
                  min={addDaysToDate(editFormData.fechaVencimiento, practiceStartDaysAfterExpiry) || undefined}
                />
              </div>

              {/* Fecha fin práctica */}
              <div className="form-field-group">
                <label className="form-label">Fecha fin de la práctica</label>
                <input
                  type="date"
                  name="fechaFinPractica"
                  value={editFormData.fechaFinPractica}
                  onChange={handleEditFormChange}
                  className="form-input"
                  disabled={!isEditingDetail}
                  readOnly={!isEditingDetail}
                  min={addDaysToDate(editFormData.fechaInicioPractica, practiceEndDaysAfterStart) || undefined}
                />
              </div>

              {/* Horario */}
              <div className="form-field-group form-field-half-width">
                <label className="form-label">
                  Horario
                  <div className="info-tooltip-wrapper">
                    <span className="info-icon">i</span>
                    <div className="tooltip-content">
                      <strong>Información</strong>
                      <p>Apreciada entidad, de acuerdo con los horarios de trabajo establecidos en el código sustantivo del trabajo el horario es de lunes a viernes 08:00 a.m. a las 05:00 p.m. Si usted como entidad maneja un horario diferente para el desarrollo de la práctica, ingrese el horario establecido y las variaciones que la compañía maneja.</p>
                    </div>
                  </div>
                </label>
                <textarea
                  name="horario"
                  value={editFormData.horario}
                  onChange={handleEditFormChange}
                  className="form-textarea form-textarea-small"
                  placeholder="Describa el horario de la práctica..."
                  rows="3"
                  disabled={!isEditingDetail}
                  readOnly={!isEditingDetail}
                />
              </div>

              {/* Área de Desempeño */}
              <div className="form-field-group form-field-half-width">
                <label className="form-label">Área de desempeño</label>
                <select
                  name="areaDesempeno"
                  value={editFormData.areaDesempeno}
                  onChange={handleEditFormChange}
                  className="form-select"
                  disabled={!isEditingDetail}
                >
                  <option value="">Seleccionar</option>
                  {performanceAreas.map(area => (
                    <option key={area._id} value={area._id}>
                      {area.description || area.value}
                    </option>
                  ))}
                </select>
              </div>

              {/* Enlaces o formato específicos */}
              <div className="form-field-group form-field-full-width">
                <label className="form-label">
                  Enlaces o formato específicos de aplicación
                  <div className="info-tooltip-wrapper">
                    <span className="info-icon">i</span>
                    <div className="tooltip-content">
                      <strong>Información</strong>
                      <p>Aquí puede ingresar enlaces que hagan referencia a otros formatos o información relevante que el postulante debe tener en cuenta o diligienciar (Máx 500 caracteres)</p>
                    </div>
                  </div>
                </label>
                <input
                  type="text"
                  name="enlacesFormatoEspecificos"
                  value={editFormData.enlacesFormatoEspecificos}
                  onChange={handleEditFormChange}
                  className="form-input"
                  placeholder="Ingrese enlaces o formato específico..."
                  maxLength={500}
                  disabled={!isEditingDetail}
                  readOnly={!isEditingDetail}
                />
                {editFormData.enlacesFormatoEspecificos && (
                  <div className="character-count">
                    {editFormData.enlacesFormatoEspecificos.length}/500 caracteres
                  </div>
                )}
              </div>

              {/* Salario Emocional */}
              <div className="form-field-group form-field-half-width">
                <div className="programs-section">
                  <div className="programs-header">
                    <span className="programs-title">Salario emocional</span>
                  </div>
                  <div className="autocomplete-wrapper">
                    <select
                      className="form-select"
                      style={{ width: '100%', fontSize: '13px' }}
                      disabled={!isEditingDetail}
                      value=""
                      onChange={(e) => {
                        if (e.target.value && isEditingDetail) {
                          const opcion = opcionesSalarioEmocional.find(op => op.value === e.target.value);
                          if (opcion) {
                            handleEditSelectSalarioEmocional(opcion);
                            e.target.value = ''; // Resetear el select
                          }
                        }
                      }}
                    >
                      <option value="">-- Seleccione una opción --</option>
                      {(isEditingDetail ? filteredEditSalarioEmocionalDisponibles : opcionesSalarioEmocional).map((opcion) => (
                        <option key={opcion.value} value={opcion.value}>
                          {opcion.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(!editFormData.salarioEmocional || editFormData.salarioEmocional.length === 0) ? (
                    <div className="programs-empty">
                      <FiX style={{ marginRight: '4px', display: 'inline-block' }} />
                      No hay salarios emocionales configurados.
                    </div>
                  ) : (
                    <ul className="programs-list">
                      {editFormData.salarioEmocional.map((salario, idx) => {
                        const opcion = opcionesSalarioEmocional.find(op => op.value === salario);
                        return (
                          <li key={idx}>
                            {opcion ? opcion.label : salario}
                            {isEditingDetail && (
                              <button
                                type="button"
                                className="program-remove"
                                onClick={() => handleEditRemoveSalarioEmocional(idx)}
                                title="Eliminar"
                              >
                                <FiX />
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Promedio Mínimo Requerido */}
              <div className="form-field-group form-field-half-width">
                <label className="form-label">
                  Promedio mínimo requerido
                  <div className="info-tooltip-wrapper">
                    <span className="info-icon">i</span>
                    <div className="tooltip-content">
                      <strong>Información</strong>
                      <p>Ingrese aquí el promedio mínimo requerido por el estudiante en caso de ser requisito para la vacante</p>
                    </div>
                  </div>
                </label>
                <input
                  type="text"
                  name="promedioMinimoRequerido"
                  value={editFormData.promedioMinimoRequerido}
                  onChange={handleEditFormChange}
                  className="form-input"
                  placeholder="Ej: 4.0"
                  disabled={!isEditingDetail}
                  readOnly={!isEditingDetail}
                />
              </div>

              {/* Formación Académica */}
              <div className="form-field-group form-field-half-width">
                <div className="programs-section">
                  <div className="programs-header">
                    <span className="programs-title">Formación académica</span>
                    {isEditingDetail && (
                      <button 
                        type="button" 
                        className="programs-add" 
                        onClick={() => {
                          if (!editFormData.periodo) {
                            Swal.fire({
                              icon: 'info',
                              title: 'Seleccione un periodo',
                              text: 'Primero elija el periodo de la práctica para agregar programas según la condición curricular.',
                              confirmButtonText: 'Entendido',
                              confirmButtonColor: '#c41e3a'
                            });
                            return;
                          }
                          setEditShowProgramsModal(true);
                        }} 
                        title={editFormData.periodo ? 'Añadir programa' : 'Seleccione periodo primero'}
                        style={!editFormData.periodo ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                      >
                        <FiPlus />
                      </button>
                    )}
                  </div>
                  {isEditingDetail && !editFormData.periodo && (
                    <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#92400e', background: '#fffbeb', padding: '8px 10px', borderRadius: 6, border: '1px solid #fde68a' }}>
                      Seleccione el <strong>periodo</strong> para poder agregar programas.
                    </p>
                  )}
                  {(!editFormData.formacionAcademica || editFormData.formacionAcademica.length === 0) ? (
                    <div className="programs-empty">
                      <FiX style={{ marginRight: '4px', display: 'inline-block' }} />
                      {editFormData.periodo || !isEditingDetail ? 'No hay programas configurados.' : 'Elija periodo para agregar programas.'}
                    </div>
                  ) : (
                    <ul className="programs-list">
                      {editFormData.formacionAcademica.map((p, idx) => {
                        const aprobacion = opp.aprobacionesPorPrograma?.find(
                          ap => ap.programa.level === p.level && ap.programa.program === p.program
                        );
                        const estadoPrograma = aprobacion?.estado || 'pendiente';
                        return (
                          <li key={idx}>
                            {p.level} - {p.program}
                            {estado === 'En Revisión' && (
                              <span className={`estado-programa estado-${estadoPrograma}`} style={{ marginLeft: '8px' }}>
                                {estadoPrograma === 'aprobado' ? 'Aprobado' : 
                                 estadoPrograma === 'rechazado' ? 'Rechazado' : 
                                 'Pendiente'}
                              </span>
                            )}
                            {isEditingDetail && (
                              <button
                                type="button"
                                className="program-remove"
                                onClick={() => handleEditRemoveProgram(idx)}
                                title="Eliminar"
                              >
                                <FiX />
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Idiomas */}
              <div className="form-field-group form-field-half-width">
                <div className="programs-section">
                  <div className="programs-header">
                    <span className="programs-title">Idiomas</span>
                    {isEditingDetail && (
                      <button 
                        type="button" 
                        className="programs-add" 
                        onClick={() => setEditShowLanguagesModal(true)} 
                        title="Añadir idioma"
                      >
                        <FiPlus />
                      </button>
                    )}
                  </div>
                  {(!editFormData.idiomas || editFormData.idiomas.length === 0) ? (
                    <div className="programs-empty">
                      <FiX style={{ marginRight: '4px', display: 'inline-block' }} />
                      No tiene requisitos de idioma.
                    </div>
                  ) : (
                    <ul className="programs-list">
                      {editFormData.idiomas.map((lang, idx) => (
                        <li key={idx}>
                          {lang.language} - {lang.level}
                          {isEditingDetail && (
                            <button
                              type="button"
                              className="program-remove"
                              onClick={() => handleEditRemoveLanguage(idx)}
                              title="Eliminar"
                            >
                              <FiX />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Funciones */}
              <div className="form-field-group form-field-half-width">
                <label className="form-label-with-icon">
                  Funciones
                  <div className="info-tooltip-wrapper">
                    <span className="info-icon">i</span>
                    <div className="tooltip-content">
                      <strong>¡Información!</strong>
                      <p>Por favor, ingrese las funciones detalladas del cargo a desempeñar por el estudiante, éstas son indispensables para la adecuada aprobación de la oferta</p>
                    </div>
                  </div>
                </label>
                <textarea
                  name="funciones"
                  value={editFormData.funciones}
                  onChange={handleEditFormChange}
                  className="form-textarea"
                  placeholder="Describa las funciones del cargo..."
                  rows="5"
                  disabled={!isEditingDetail}
                  readOnly={!isEditingDetail}
                />
                {editFormData.funciones && editFormData.funciones.length < 60 && (
                  <div className="validation-message">
                    Debe agregar las funciones con un tamaño mínimo de 60 caracteres.
                  </div>
                )}
              </div>

              {/* Requisitos */}
              <div className="form-field-group form-field-half-width">
                <label className="form-label">Requisitos</label>
                <textarea
                  name="requisitos"
                  value={editFormData.requisitos}
                  onChange={handleEditFormChange}
                  className="form-textarea"
                  placeholder="Describa los requisitos..."
                  rows="5"
                  disabled={!isEditingDetail}
                  readOnly={!isEditingDetail}
                />
                {!editFormData.requisitos && (
                  <div className="validation-message">
                    Debe agregar los requisitos.
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Modales para detalle - Agregar programa académico (misma lógica que creación) */}
          {editShowProgramsModal && (() => {
            const normStr = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
            const NIVELES_PERMITIDOS = new Set(['PREGRADO', 'MAESTRIA']);
            const uniqueLevels = [];
            const seen = new Set();
            allPrograms.forEach(p => {
              if (!p.labelLevel) return;
              const n = normStr(p.labelLevel);
              if (!NIVELES_PERMITIDOS.has(n) || seen.has(n)) return;
              seen.add(n); uniqueLevels.push(p.labelLevel);
            });
            uniqueLevels.sort((a, b) => a.localeCompare(b, 'es'));
            const programasDelNivel = editNewProgramLevel ? allPrograms.filter(p => {
              if (normStr(p.labelLevel) !== normStr(editNewProgramLevel)) return false;
              if (normStr(editNewProgramLevel) === 'MAESTRIA') return (p.name || '').toLowerCase().includes('paz');
              return true;
            }).sort((a, b) => a.name.localeCompare(b.name, 'es')) : [];
            const setHabilitados = new Set(programIdsHabilitadosPeriodo);
            const periodoSeleccionado = !!(editFormData && editFormData.periodo);
            return (
              <div className="opo-ficha-modal-overlay" onClick={() => setEditShowProgramsModal(false)}>
                <div className="opo-ficha-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h4>Agregar programa académico</h4>
                    <button className="modal-close" onClick={() => setEditShowProgramsModal(false)}>×</button>
                  </div>
                  <div className="opo-ficha-modal__body">
                    {loadingPrograms ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: 13 }}>Cargando niveles y programas...</div>
                    ) : (
                      <>
                        <div className="modal-field">
                          <label>Nivel <span className="required">*</span></label>
                          <select value={editNewProgramLevel} onChange={e => setEditNewProgramLevel(e.target.value)}>
                            <option value="">— Seleccione un nivel —</option>
                            {uniqueLevels.map(lv => <option key={lv} value={lv}>{lv}</option>)}
                          </select>
                        </div>
                        <div className="modal-field">
                          <label>Programa <span className="required">*</span></label>
                          <select value={editNewProgramName} onChange={e => setEditNewProgramName(e.target.value)} disabled={!editNewProgramLevel}>
                            <option value="">{editNewProgramLevel ? '— Seleccione un programa —' : '— Primero seleccione un nivel —'}</option>
                            {programasDelNivel.map(p => {
                              const idStr = (p._id && typeof p._id === 'object' && p._id.toString ? p._id.toString() : String(p._id));
                              const habilitado = !periodoSeleccionado || setHabilitados.has(idStr);
                              return habilitado ? <option key={p._id} value={p.name}>{p.name}</option> : <option key={p._id} disabled value="">{p.name} {noStudentsMessageFormacion}</option>;
                            })}
                          </select>
                          {periodoSeleccionado && editNewProgramLevel && programasDelNivel.some(p => !setHabilitados.has(String(p._id))) && (
                            <p style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>Los programas sin condición curricular activa para este periodo muestran el aviso y no pueden seleccionarse.</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button className="btn-secondary" onClick={() => setEditShowProgramsModal(false)}>Cerrar</button>
                    <button className="btn-guardar" onClick={handleEditAddProgram} disabled={loadingPrograms}>Añadir</button>
                  </div>
                </div>
              </div>
            );
          })()}

          {editShowLanguagesModal && (
            <div className="opo-ficha-modal-overlay" onClick={() => setEditShowLanguagesModal(false)}>
              <div className="opo-ficha-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h4>Idiomas</h4>
                  <button className="modal-close" onClick={() => setEditShowLanguagesModal(false)}>×</button>
                </div>
                <div className="opo-ficha-modal__body">
                  <div className="modal-field">
                    <label>Seleccionar idioma <span className="required">*</span></label>
                    <select value={editNewLanguage} onChange={e => setEditNewLanguage(e.target.value)}>
                      <option value="">Seleccionar idioma</option>
                      <option value="Alemán">Alemán</option>
                      <option value="Chino Mandarín">Chino Mandarín</option>
                      <option value="Español">Español</option>
                      <option value="Francés">Francés</option>
                      <option value="Griego">Griego</option>
                      <option value="Inglés">Inglés</option>
                      <option value="Italiano">Italiano</option>
                      <option value="Japonés">Japonés</option>
                      <option value="Latín">Latín</option>
                      <option value="Portugués">Portugués</option>
                      <option value="Coreano">Coreano</option>
                    </select>
                  </div>
                  <div className="modal-field">
                    <label>Seleccionar nivel <span className="required">*</span></label>
                    <select value={editNewLanguageLevel} onChange={e => setEditNewLanguageLevel(e.target.value)}>
                      <option value="">Seleccionar nivel</option>
                      <option value="A1">A1 - Principiante</option>
                      <option value="A2">A2 - Básico</option>
                      <option value="B1">B1 - Intermedio</option>
                      <option value="B2">B2 - Intermedio alto</option>
                      <option value="C1">C1 - Avanzado</option>
                      <option value="C2">C2 - Maestría</option>
                      <option value="Nativo">Nativo</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn-secondary" onClick={() => setEditShowLanguagesModal(false)}>Cerrar</button>
                  <button className="btn-guardar" onClick={handleEditAddLanguage}>Añadir</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal de Aprobación por Programa — renderizado en document.body para centrado correcto */}
        {!esEntidadSoloLectura && showModalAprobacion && createPortal(
          <div className="oportunidades-modal-aprobacion-overlay" onClick={() => setShowModalAprobacion(false)}>
            <div className="oportunidades-modal-aprobacion" onClick={(e) => e.stopPropagation()}>
              <div className="modal-aprobacion-programa__header">
                <h4>Aprobar Oportunidad por Programa</h4>
                <button type="button" className="modal-close" onClick={() => setShowModalAprobacion(false)} aria-label="Cerrar">×</button>
              </div>
              <div className="modal-aprobacion-programa__body">
                <p className="modal-aprobacion-programa__instruccion">Seleccione el programa que desea aprobar:</p>
                <div className="programas-aprobacion-list">
                  {programasPendientes.map((aprobacion, idx) => (
                    <div key={idx} className="programa-aprobacion-item">
                      <div className="programa-aprobacion-info">
                        <strong>{aprobacion.programa.level} – {aprobacion.programa.program}</strong>
                      </div>
                      <div className="programa-aprobacion-actions">
                        <button
                          type="button"
                          className="btn-aprobar-programa"
                          onClick={() => handleAprobarPrograma(aprobacion.programa, '')}
                        >
                          Aprobar
                        </button>
                        <button
                          type="button"
                          className="btn-rechazar-programa"
                          onClick={() => {
                            Swal.fire({
                              title: 'Rechazar Programa',
                              input: 'textarea',
                              inputLabel: 'Comentarios (opcional)',
                              inputPlaceholder: 'Ingrese los comentarios del rechazo...',
                              showCancelButton: true,
                              confirmButtonText: 'Rechazar',
                              cancelButtonText: 'Cancelar',
                              confirmButtonColor: '#c41e3a',
                              cancelButtonColor: '#6c757d'
                            }).then((result) => {
                              if (result.isConfirmed) {
                                handleRechazarPrograma(aprobacion.programa, result.value || '');
                              }
                            });
                          }}
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-aprobacion-programa__footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModalAprobacion(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Modal de Rechazo — renderizado en document.body para que quede siempre encima */}
        {!esEntidadSoloLectura && showModalRechazo && createPortal(
          <div
            className="oportunidades-modal-rechazo-overlay"
            onClick={() => {
              setShowModalRechazo(false);
              setMotivoRechazo('');
              setMotivoRechazoOtro('');
            }}
          >
            <div className="oportunidades-modal-rechazo" onClick={(e) => e.stopPropagation()}>
              <div className="oportunidades-modal-rechazo-header">
                <h4>Rechazar Oportunidad</h4>
                <button
                  type="button"
                  className="oportunidades-modal-rechazo-close"
                  onClick={() => {
                    setShowModalRechazo(false);
                    setMotivoRechazo('');
                    setMotivoRechazoOtro('');
                  }}
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>
              <div className="oportunidades-modal-rechazo-body">
                <div className="oportunidades-modal-rechazo-field">
                  <label>Seleccione el motivo de rechazo <span className="oportunidades-modal-rechazo-required">*</span></label>
                  <select
                    value={motivoRechazo}
                    onChange={(e) => {
                      setMotivoRechazo(e.target.value);
                      if (e.target.value !== 'Otro') {
                        setMotivoRechazoOtro('');
                      }
                    }}
                    className="oportunidades-modal-rechazo-select"
                  >
                    <option value="">- Seleccione un motivo -</option>
                    {motivosRechazo.map((motivo, idx) => (
                      <option key={idx} value={motivo}>{motivo}</option>
                    ))}
                  </select>
                </div>
                {motivoRechazo === 'Otro' && (
                  <div className="oportunidades-modal-rechazo-field">
                    <label>Especifique el motivo <span className="oportunidades-modal-rechazo-required">*</span></label>
                    <textarea
                      value={motivoRechazoOtro}
                      onChange={(e) => setMotivoRechazoOtro(e.target.value)}
                      className="oportunidades-modal-rechazo-textarea"
                      placeholder="Ingrese el motivo de rechazo..."
                      rows="4"
                    />
                  </div>
                )}
              </div>
              <div className="oportunidades-modal-rechazo-footer">
                <button
                  type="button"
                  className="oportunidades-modal-rechazo-btn-cancelar"
                  onClick={() => {
                    setShowModalRechazo(false);
                    setMotivoRechazo('');
                    setMotivoRechazoOtro('');
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="oportunidades-modal-rechazo-btn-rechazar"
                  onClick={handleRechazarOportunidad}
                >
                  Rechazar Oportunidad
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Modal Cerrar Oportunidad — solo cuando está Activa */}
        {showModalCerrarOportunidad && createPortal(
          <div
            className="oportunidades-modal-rechazo-overlay oportunidades-modal-cerrar-overlay"
            style={{ zIndex: 100002 }}
          >
            <div className="oportunidades-modal-rechazo oportunidades-modal-cerrar" onClick={(e) => e.stopPropagation()}>
              <div className="oportunidades-modal-rechazo-header">
                <h4>Confirmación</h4>
                <button type="button" className="oportunidades-modal-rechazo-close" onClick={() => { setShowModalCerrarOportunidad(false); setCerrarContrato(''); setCerrarMotivoNo(''); setCerrarMotivoNoOtro(''); setSelectedPostulantesCerrar([]); setDatosTutorCerrar({}); }} aria-label="Cerrar">×</button>
              </div>
              <div className="oportunidades-modal-rechazo-body">
                <div className="oportunidades-modal-rechazo-field">
                  <label>¿Contrató?</label>
                  <select
                    value={cerrarContrato}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCerrarContrato(v);
                      setCerrarMotivoNo('');
                      if (v === 'no' || v === '') {
                        setSelectedPostulantesCerrar([]);
                        setDatosTutorCerrar({});
                      }
                    }}
                    className="oportunidades-modal-rechazo-select"
                  >
                    <option value="">- Seleccione -</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                </div>
                {cerrarContrato === 'no' && (
                  <div className="oportunidades-modal-rechazo-field">
                    <label>¿Por qué?</label>
                    <select value={cerrarMotivoNo} onChange={(e) => { setCerrarMotivoNo(e.target.value); setCerrarMotivoNoOtro(''); }} className="oportunidades-modal-rechazo-select">
                      <option value="">- Seleccione -</option>
                      {(oportunidadSeleccionada?._isMTM ? MOTIVOS_NO_CONTRATO_MTM : MOTIVOS_NO_CONTRATO).map((m, i) => <option key={i} value={m}>{m}</option>)}
                    </select>
                  </div>
                )}
                {cerrarContrato === 'no' && cerrarMotivoNo === 'Otro' && (
                  <div className="oportunidades-modal-rechazo-field">
                    <label>Especifique el motivo <span className="oportunidades-modal-rechazo-required">*</span></label>
                    <textarea
                      value={cerrarMotivoNoOtro}
                      onChange={(e) => setCerrarMotivoNoOtro(e.target.value)}
                      className="oportunidades-modal-rechazo-textarea"
                      placeholder="Ingrese el motivo..."
                      rows="3"
                    />
                  </div>
                )}
                {cerrarContrato === 'si' && (
                  <>
                    <div className="oportunidades-modal-rechazo-field">
                      <label>Seleccione uno o más postulantes (máx. {oportunidadSeleccionada?.vacantes || 1} vacante(s))</label>
                      {loadingPostulantesCerrar ? <p style={{ margin: 8, color: '#6b7280' }}>Cargando postulantes...</p> : postulantesParaCerrar.length === 0 ? <p style={{ margin: 8, color: '#6b7280' }}>No hay postulantes aplicados.</p> : (
                        <div className="cerrar-oportunidad-lista-postulantes">
                          {postulantesParaCerrar.map((p) => {
                            const id = p._id?.toString?.() || p._id;
                            const checked = selectedPostulantesCerrar.includes(id);
                            const vacantes = oportunidadSeleccionada?.vacantes || 1;
                            const toggle = () => {
                              if (checked) { setSelectedPostulantesCerrar(prev => prev.filter(x => x !== id)); }
                              else if (selectedPostulantesCerrar.length < vacantes) setSelectedPostulantesCerrar(prev => [...prev, id]);
                            };
                            return (
                              <label key={id} className="cerrar-oportunidad-postulante-item">
                                <input type="checkbox" checked={checked} onChange={toggle} disabled={!checked && selectedPostulantesCerrar.length >= vacantes} />
                                <span>{(p.nombres || '') + ' ' + (p.apellidos || '')}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {!oportunidadSeleccionada?._isMTM && selectedPostulantesCerrar.length > 0 && selectedPostulantesCerrar.map((pid) => {
                      const p = postulantesParaCerrar.find(x => (x._id?.toString?.() || x._id) === pid);
                      const nombre = p ? (p.nombres || '') + ' ' + (p.apellidos || '') : pid;
                      const d = datosTutorCerrar[pid] || {};
                      const setCampo = (campo, value) => setDatosTutorCerrar(prev => ({ ...prev, [pid]: { ...(prev[pid] || {}), [campo]: value } }));
                      return (
                        <div key={pid} className="cerrar-oportunidad-datos-tutor">
                          <strong>Datos para el estudiante: {nombre}</strong>
                          <div className="cerrar-oportunidad-tutor-campos">
                            <div><label>Nombre Tutor</label><input value={d.nombreTutor || ''} onChange={(e) => setCampo('nombreTutor', e.target.value)} placeholder="Nombre" /></div>
                            <div><label>Apellido Tutor</label><input value={d.apellidoTutor || ''} onChange={(e) => setCampo('apellidoTutor', e.target.value)} placeholder="Apellido" /></div>
                            <div><label>Email Tutor</label><input type="email" value={d.emailTutor || ''} onChange={(e) => setCampo('emailTutor', e.target.value)} placeholder="mail@dominio.com" /></div>
                            <div><label>Teléfono Tutor</label><input type="tel" value={d.telefonoTutor || ''} onChange={(e) => setCampo('telefonoTutor', e.target.value)} placeholder="Ej. 601 234 5678" autoComplete="tel" /></div>
                            <div><label>Cargo Tutor</label><input value={d.cargoTutor || ''} onChange={(e) => setCampo('cargoTutor', e.target.value)} placeholder="Cargo" /></div>
                            <div><label>Tipo Ident. Tutor</label><select value={d.tipoIdentTutor || ''} onChange={(e) => setCampo('tipoIdentTutor', e.target.value)}><option value="">Seleccionar</option><option value="CC">CC</option><option value="CE">CE</option><option value="NIT">NIT</option></select></div>
                            <div><label>ARL Empresa</label><select value={d.arlEmpresa || ''} onChange={(e) => setCampo('arlEmpresa', e.target.value)}><option value="">Seleccionar</option>{arlItems.map((item) => <option key={item._id} value={item._id}>{item.description || item.value || item._id}</option>)}</select></div>
                            <div><label>Identificación Tutor</label><input value={d.identificacionTutor || ''} onChange={(e) => setCampo('identificacionTutor', e.target.value)} placeholder="Número" /></div>
                            <div><label>Fecha Inicio Práctica</label><input type="date" value={d.fechaInicioPractica || ''} onChange={(e) => setCampo('fechaInicioPractica', e.target.value)} min={addDaysToDate(oportunidadSeleccionada?.fechaVencimiento ? (typeof oportunidadSeleccionada.fechaVencimiento === 'string' ? oportunidadSeleccionada.fechaVencimiento.slice(0, 10) : new Date(oportunidadSeleccionada.fechaVencimiento).toISOString().slice(0, 10)) : '', practiceStartDaysAfterExpiry) || undefined} /></div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
              <div className="oportunidades-modal-rechazo-footer">
                <button type="button" className="oportunidades-modal-rechazo-btn-cancelar" onClick={() => { setShowModalCerrarOportunidad(false); setCerrarContrato(''); setCerrarMotivoNo(''); setCerrarMotivoNoOtro(''); setSelectedPostulantesCerrar([]); setDatosTutorCerrar({}); }}>Cerrar</button>
                <button type="button" className="oportunidades-modal-rechazo-btn-rechazar" onClick={handleCerrarOportunidad}>Cerrar Oportunidad</button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Modal de Historial de Estados - clases propias para forzar estilos y centrado */}
        {showModalHistorial && (
          <div className="oportunidades-modal-historial-overlay" onClick={() => setShowModalHistorial(false)}>
            <div className="oportunidades-modal-historial" onClick={(e) => e.stopPropagation()}>
              <div className="oportunidades-modal-historial-header">
                <h4>Historial de Estados</h4>
                <button type="button" className="oportunidades-modal-historial-close" onClick={() => setShowModalHistorial(false)} aria-label="Cerrar">×</button>
              </div>
              <div className="oportunidades-modal-historial-body">
                {historialEstados.length === 0 ? (
                  <p className="oportunidades-modal-historial-empty">No hay historial de cambios de estado registrado.</p>
                ) : (
                  <div className="oportunidades-modal-historial-list">
                    {historialEstados.map((item, idx) => (
                      <div key={idx} className="oportunidades-modal-historial-item">
                        <div className="oportunidades-modal-historial-item-header">
                          <span className="oportunidades-modal-historial-estado">
                            {item.estadoAnterior === item.estadoNuevo
                              ? 'Edición'
                              : `${item.estadoAnterior || 'N/A'} → ${item.estadoNuevo}`}
                          </span>
                          <span className="oportunidades-modal-historial-fecha">
                            {formatDate(item.fechaCambio)}
                          </span>
                        </div>
                        <div className="oportunidades-modal-historial-item-details">
                          <p><strong>Cambiado por:</strong> {item.cambiadoPor?.name || 'N/A'}</p>
                          {item.motivo && (
                            <p><strong>Motivo:</strong> {item.motivo}</p>
                          )}
                          {item.comentarios && (
                            <p><strong>Comentarios:</strong> {item.comentarios}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="oportunidades-modal-historial-footer">
                <button type="button" className="oportunidades-modal-historial-btn-cerrar" onClick={() => setShowModalHistorial(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Vista Aplicaciones / Postulantes — pantalla completa */}
        {showModalAplicaciones && (
          <div
            className="oportunidades-vista-aplicaciones-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowModalAplicaciones(false); setAplicacionDetail(null); setSelectedPostulacionId(null); setShowModalSeleccionarPractica(false); setPostulacionIdSeleccionPractica(null); } }}
          >
            <div className="oportunidades-vista-aplicaciones" onClick={(e) => e.stopPropagation()}>
              <div className="oportunidades-vista-aplicaciones-header">
                <h4>Aplicaciones / Postulantes</h4>
                <button
                  type="button"
                  className="oportunidades-modal-historial-close"
                  onClick={() => { setShowModalAplicaciones(false); setAplicacionDetail(null); setSelectedPostulacionId(null); setShowModalSeleccionarPractica(false); setPostulacionIdSeleccionPractica(null); }}
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>
              {puedeSeleccionarPracticaAplicaciones && opp.tipo === 'practica' && !oportunidadSeleccionada?._isMTM && (
                <p className="oportunidades-mtm-cupo-hint" style={{ margin: '0 20px 12px', fontSize: 13, color: '#475569' }}>
                  Vacantes: <strong>{seleccionadosPracticaCount}</strong> de <strong>{vacantesPractica}</strong> seleccionado(s).{' '}
                  {cupoSeleccionPractica
                    ? 'Puede seleccionar sin cerrar la oportunidad; el estudiante recibirá la misma notificación que al cierre con contratación. Al seleccionar deberá completar los datos del tutor.'
                    : 'Todos los cupos de esta oportunidad están cubiertos. Puede seguir consultando perfiles; no hace falta volver a ingresar datos del tutor.'}
                </p>
              )}
              <div className="oportunidades-vista-aplicaciones-body">
                <div className="oportunidades-vista-aplicaciones-tabla">
                  {loadingAplicaciones ? (
                    <p className="oportunidades-modal-historial-empty">Cargando aplicaciones...</p>
                  ) : aplicacionesList.length === 0 ? (
                    <p className="oportunidades-modal-historial-empty">No hay postulantes para esta oportunidad.</p>
                  ) : (
                    <div className="tabla-aplicaciones-wrap">
                      <table className="tabla-aplicaciones">
                        <thead>
                          <tr>
                            <th>Nombres</th>
                            <th>Apellidos</th>
                            <th>Programa en curso</th>
                            <th>Programa finalizado</th>
                            <th>Años de experiencia</th>
                            <th>Fecha aplicación</th>
                            <th>Estado</th>
                            <th>Revisada</th>
                            <th>Descargada</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aplicacionesList.map((row, idx) => (
                            <tr
                              key={row._id || idx}
                              className={selectedPostulacionId === (row._id?.toString?.() || row._id) ? 'selected' : ''}
                              onClick={async () => {
                                if (!oportunidadSeleccionada?._id || !row._id) return;
                                setSelectedPostulacionId(row._id?.toString?.() || row._id);
                                setLoadingDetail(true);
                                setAplicacionDetail(null);
                                try {
                                  const base = oportunidadSeleccionada._isMTM ? '/oportunidades-mtm' : '/opportunities';
                                  const { data } = await api.get(`${base}/${oportunidadSeleccionada._id}/applications/detail/${row._id}`);
                                  setAplicacionDetail(data);
                                } catch (err) {
                                  console.error(err);
                                  Swal.fire({
                                    icon: 'error',
                                    title: 'Error',
                                    text: err.response?.data?.message || 'No se pudo cargar el perfil',
                                    confirmButtonColor: '#c41e3a'
                                  });
                                } finally {
                                  setLoadingDetail(false);
                                }
                              }}
                            >
                              <td>{row.nombres ?? '—'}</td>
                              <td>{row.apellidos ?? '—'}</td>
                              <td>
                                {Array.isArray(row.programasEnCurso) && row.programasEnCurso.length > 0
                                  ? row.programasEnCurso.map((p, i) => <div key={i}>{p}</div>)
                                  : 'Sin programas'}
                              </td>
                              <td>
                                {Array.isArray(row.programasFinalizados) && row.programasFinalizados.length > 0
                                  ? row.programasFinalizados.map((p, i) => <div key={i}>{p}</div>)
                                  : 'Sin programas'}
                              </td>
                              <td>{row.añosExperiencia ?? '—'}</td>
                              <td>{row.fechaPostulacion ? new Date(row.fechaPostulacion).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</td>
                              <td>{row.estadoLabel ?? row.estado ?? '—'}</td>
                              <td>{row.revisada ? '✓' : '—'}</td>
                              <td>{row.descargada ? '✓' : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="oportunidades-vista-aplicaciones-detalle">
                  {loadingDetail ? (
                    <p className="oportunidades-modal-historial-empty">Cargando perfil...</p>
                  ) : aplicacionDetail ? (
                    <div className="detalle-postulante">
                          <h5 className="detalle-postulante-nombre">{(aplicacionDetail.nombres || '') + ' ' + (aplicacionDetail.apellidos || '')}</h5>
                          <div className="detalle-postulante-campo">
                            <strong>Email:</strong> {aplicacionDetail.email ?? '—'}
                          </div>
                          <div className="detalle-postulante-campo">
                            <strong>Teléfono:</strong> {aplicacionDetail.telefono ?? '—'}
                          </div>
                          {aplicacionDetail.linkedin && (
                            <div className="detalle-postulante-campo">
                              <strong>LinkedIn:</strong>{' '}
                              <a href={aplicacionDetail.linkedin} target="_blank" rel="noopener noreferrer">{aplicacionDetail.linkedin}</a>
                            </div>
                          )}
                          <div className="detalle-postulante-campo">
                            <strong>Fecha de aplicación:</strong>{' '}
                            {aplicacionDetail.fechaAplicacion ? new Date(aplicacionDetail.fechaAplicacion).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                          </div>
                          <div className="detalle-postulante-campo">
                            <strong>Estado:</strong> {aplicacionDetail.estadoLabel ?? aplicacionDetail.estado ?? '—'}
                          </div>
                          {aplicacionDetail._source === 'postulacion_oportunidad' && (
                            <div className="detalle-postulante-acciones">
                              {aplicacionDetail.estado === 'rechazado' ? (
                                <button
                                  type="button"
                                  className="btn-deshacer-rechazo"
                                  onClick={async () => {
                                    if (!oportunidadSeleccionada?._id || !aplicacionDetail._id) return;
                                    try {
                                      const base = oportunidadSeleccionada._isMTM ? '/oportunidades-mtm' : '/opportunities';
                                      await api.patch(`${base}/${oportunidadSeleccionada._id}/applications/${aplicacionDetail._id}/state`, { estado: 'empresa_consulto_perfil' });
                                      const { data } = await api.get(`${base}/${oportunidadSeleccionada._id}/applications/detail/${aplicacionDetail._id}`);
                                      setAplicacionDetail(data);
                                      setAplicacionesList(prev => prev.map(r => (r._id?.toString?.() === aplicacionDetail._id?.toString?.() ? { ...r, estado: data.estado, estadoLabel: data.estadoLabel } : r)));
                                      Swal.fire({ icon: 'success', title: 'Rechazo revertido', text: 'El estado del postulante se actualizó correctamente.', confirmButtonColor: '#c41e3a', customClass: { container: 'swal-over-vista-aplicaciones' } });
                                    } catch (err) {
                                      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo revertir el rechazo', confirmButtonColor: '#c41e3a', customClass: { container: 'swal-over-vista-aplicaciones' } });
                                    }
                                  }}
                                >
                                  Deshacer rechazo
                                </button>
                              ) : postulacionPracticaYaGestionada(oportunidadSeleccionada, aplicacionDetail) ? (
                                <span className="detalle-postulante-ya-seleccionado">Seleccionado</span>
                              ) : (
                                <>
                                  {!oportunidadSeleccionada._isMTM && opp.tipo === 'practica' && puedeSeleccionarPracticaAplicaciones && (
                                    <button
                                      type="button"
                                      className="btn-seleccionar-estudiante"
                                      disabled={!cupoSeleccionPractica}
                                      title={!cupoSeleccionPractica ? `Ya hay ${vacantesPractica} postulante(s) seleccionado(s) (límite de vacantes).` : 'Seleccionar: deberá completar los datos del tutor'}
                                      onClick={() => {
                                        const pid = aplicacionDetail._id?.toString?.() || aplicacionDetail._id;
                                        setPostulacionIdSeleccionPractica(pid);
                                        const tutores = oportunidadSeleccionada.cierreDatosTutor || [];
                                        const t = tutores.find((row) => {
                                          const pidRow = row.postulacionId && typeof row.postulacionId === 'object' && row.postulacionId._id
                                            ? row.postulacionId._id
                                            : row.postulacionId;
                                          return (pidRow?.toString?.() || pidRow) === pid;
                                        });
                                        setDatosTutorSeleccionPractica({
                                          nombreTutor: t?.nombreTutor || '',
                                          apellidoTutor: t?.apellidoTutor || '',
                                          emailTutor: t?.emailTutor || '',
                                          telefonoTutor: t?.telefonoTutor || '',
                                          cargoTutor: t?.cargoTutor || '',
                                          tipoIdentTutor: t?.tipoIdentTutor || '',
                                          identificacionTutor: t?.identificacionTutor || '',
                                          arlEmpresa: (t?.arlEmpresa && typeof t.arlEmpresa === 'object' && t.arlEmpresa._id)
                                            ? t.arlEmpresa._id
                                            : (t?.arlEmpresa || ''),
                                          fechaInicioPractica: t?.fechaInicioPractica
                                            ? (typeof t.fechaInicioPractica === 'string'
                                              ? t.fechaInicioPractica.slice(0, 10)
                                              : new Date(t.fechaInicioPractica).toISOString().slice(0, 10))
                                            : '',
                                        });
                                        setShowModalSeleccionarPractica(true);
                                      }}
                                    >
                                      Seleccionar
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="btn-rechazar-estudiante"
                                    onClick={async () => {
                                      const base = oportunidadSeleccionada._isMTM ? '/oportunidades-mtm' : '/opportunities';
                                      let motivoNoAprobacion;
                                      if (oportunidadSeleccionada._isMTM) {
                                        const result = await Swal.fire({
                                          icon: 'warning',
                                          title: 'Rechazar postulante',
                                          text: '¿Está seguro de rechazar a este postulante? Podrá deshacer esta acción después.',
                                          showCancelButton: true,
                                          confirmButtonText: 'Sí, rechazar',
                                          cancelButtonText: 'Cancelar',
                                          confirmButtonColor: '#c41e3a',
                                          customClass: { container: 'swal-over-vista-aplicaciones' }
                                        });
                                        if (!result.isConfirmed) return;
                                      } else {
                                        const result = await Swal.fire({
                                          icon: 'warning',
                                          title: 'Rechazar postulante',
                                          text: 'Indique el motivo; se notificará al estudiante. Podrá deshacer el rechazo después.',
                                          input: 'textarea',
                                          inputLabel: 'Motivo del rechazo',
                                          inputPlaceholder: 'Escriba el motivo...',
                                          inputAttributes: { 'aria-label': 'Motivo del rechazo', rows: '4' },
                                          showCancelButton: true,
                                          confirmButtonText: 'Rechazar',
                                          cancelButtonText: 'Cancelar',
                                          confirmButtonColor: '#c41e3a',
                                          customClass: { container: 'swal-over-vista-aplicaciones' },
                                          inputValidator: (value) => {
                                            if (!value || !String(value).trim()) {
                                              return 'Debe indicar el motivo del rechazo';
                                            }
                                          }
                                        });
                                        if (!result.isConfirmed || !oportunidadSeleccionada?._id || !aplicacionDetail._id) return;
                                        motivoNoAprobacion = String(result.value || '').trim();
                                      }
                                      if (!oportunidadSeleccionada?._id || !aplicacionDetail._id) return;
                                      try {
                                        const body = oportunidadSeleccionada._isMTM
                                          ? { estado: 'rechazado' }
                                          : { estado: 'rechazado', motivoNoAprobacion };
                                        await api.patch(`${base}/${oportunidadSeleccionada._id}/applications/${aplicacionDetail._id}/state`, body);
                                        const { data } = await api.get(`${base}/${oportunidadSeleccionada._id}/applications/detail/${aplicacionDetail._id}`);
                                        setAplicacionDetail(data);
                                        setAplicacionesList(prev => prev.map(r => (r._id?.toString?.() === aplicacionDetail._id?.toString?.() ? { ...r, estado: data.estado, estadoLabel: data.estadoLabel } : r)));
                                        Swal.fire({ icon: 'success', title: 'Postulante rechazado', confirmButtonColor: '#c41e3a', customClass: { container: 'swal-over-vista-aplicaciones' } });
                                      } catch (err) {
                                        Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo rechazar al postulante', confirmButtonColor: '#c41e3a', customClass: { container: 'swal-over-vista-aplicaciones' } });
                                      }
                                    }}
                                  >
                                    Rechazar estudiante
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                          <div className="detalle-postulante-campo">
                            <strong>Años de experiencia:</strong> {aplicacionDetail.añosExperiencia ?? '—'}
                          </div>
                          {Array.isArray(aplicacionDetail.programasEnCurso) && aplicacionDetail.programasEnCurso.length > 0 && (
                            <div className="detalle-postulante-campo">
                              <strong>Programas en curso:</strong>
                              <ul>{aplicacionDetail.programasEnCurso.map((p, i) => <li key={i}>{p}</li>)}</ul>
                            </div>
                          )}
                          {Array.isArray(aplicacionDetail.programasFinalizados) && aplicacionDetail.programasFinalizados.length > 0 && (
                            <div className="detalle-postulante-campo">
                              <strong>Programas finalizados:</strong>
                              <ul>{aplicacionDetail.programasFinalizados.map((p, i) => <li key={i}>{p}</li>)}</ul>
                            </div>
                          )}
                          {Array.isArray(aplicacionDetail.competencias) && aplicacionDetail.competencias.length > 0 && (
                            <div className="detalle-postulante-campo">
                              <strong>Competencias:</strong>
                              <ul className="detalle-postulante-competencias">{aplicacionDetail.competencias.map((c, i) => <li key={i}>{c}</li>)}</ul>
                            </div>
                          )}
                          {Array.isArray(aplicacionDetail.hojasDeVida) && aplicacionDetail.hojasDeVida.length > 0 && (
                            <div className="detalle-postulante-campo">
                              <strong>Hojas de vida:</strong>
                              <ul className="detalle-postulante-cvs">
                                {aplicacionDetail.hojasDeVida.map((hv, i) => (
                                  <li key={i}>
                                    <a
                                      href="#"
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        if (!hv.postulantDocId || !hv.attachmentId) return;
                                        try {
                                          const res = await api.get(`/postulants/${hv.postulantDocId}/attachments/${hv.attachmentId}/download`, { responseType: 'blob' });
                                          const url = window.URL.createObjectURL(res.data);
                                          const a = document.createElement('a');
                                          a.href = url;
                                          a.download = hv.name || 'hoja-de-vida.pdf';
                                          a.click();
                                          window.URL.revokeObjectURL(url);
                                          if (oportunidadSeleccionada?._id && aplicacionDetail?._id) {
                                            try {
                                              const base = oportunidadSeleccionada._isMTM ? '/oportunidades-mtm' : '/opportunities';
                                              await api.patch(`${base}/${oportunidadSeleccionada._id}/applications/${aplicacionDetail._id}/descargo-hv`);
                                            } catch (_) {}
                                          }
                                          Swal.fire({
                                            icon: 'success',
                                            title: 'Descarga iniciada',
                                            text: 'El archivo se está descargando.',
                                            timer: 2000,
                                            showConfirmButton: false,
                                            customClass: { container: 'swal-over-vista-aplicaciones' }
                                          });
                                        } catch (err) {
                                          Swal.fire({
                                            icon: 'error',
                                            title: 'Error',
                                            text: 'No se pudo descargar el archivo',
                                            confirmButtonColor: '#c41e3a',
                                            customClass: { container: 'swal-over-vista-aplicaciones' }
                                          });
                                        }
                                      }}
                                    >
                                      {hv.name || 'Descargar hoja de vida'}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {Array.isArray(aplicacionDetail.documentosSoporte) && aplicacionDetail.documentosSoporte.length > 0 && (
                            <div className="detalle-postulante-campo detalle-postulante-campo--docs-soporte">
                              <strong>Documentos de soporte:</strong>
                              <ul className="detalle-docs-soporte__list">
                                {aplicacionDetail.documentosSoporte.map((doc, i) => (
                                  <li key={i} className="detalle-docs-soporte__item">
                                    <a
                                      href="#"
                                      className="detalle-docs-soporte__link"
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        if (!doc.postulantDocId || !doc.attachmentId) return;
                                        try {
                                          const res = await api.get(`/postulants/${doc.postulantDocId}/attachments/${doc.attachmentId}/download`, { responseType: 'blob' });
                                          const url = window.URL.createObjectURL(res.data);
                                          const a = document.createElement('a');
                                          a.href = url;
                                          a.download = doc.originalName || doc.documentLabel || `documento-soporte-${i + 1}`;
                                          a.click();
                                          window.URL.revokeObjectURL(url);
                                          Swal.fire({ icon: 'success', title: 'Descarga iniciada', timer: 1800, showConfirmButton: false, customClass: { container: 'swal-over-vista-aplicaciones' } });
                                        } catch (err) {
                                          Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo descargar', confirmButtonColor: '#c41e3a', customClass: { container: 'swal-over-vista-aplicaciones' } });
                                        }
                                      }}
                                    >
                                      📎 {doc.documentLabel || doc.originalName || `Documento ${i + 1}`}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                  ) : (
                    <p className="oportunidades-modal-historial-empty">Seleccione un postulante de la lista para ver su perfil.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {showModalSeleccionarPractica && createPortal(
          <div
            className="oportunidades-modal-rechazo-overlay oportunidades-modal-cerrar-overlay"
            style={{ zIndex: 100003 }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowModalSeleccionarPractica(false); setPostulacionIdSeleccionPractica(null); } }}
          >
            <div className="oportunidades-modal-rechazo oportunidades-modal-cerrar" onClick={(e) => e.stopPropagation()}>
              <div className="oportunidades-modal-rechazo-header">
                <h4>Seleccionar postulante — datos del tutor</h4>
                <button type="button" className="oportunidades-modal-rechazo-close" onClick={() => { setShowModalSeleccionarPractica(false); setPostulacionIdSeleccionPractica(null); }} aria-label="Cerrar">×</button>
              </div>
              <div className="oportunidades-modal-rechazo-body">
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#475569' }}>
                  Los mismos datos que al cerrar la oportunidad con contratación. El estudiante recibirá la notificación correspondiente y la oportunidad seguirá activa.
                </p>
                {aplicacionDetail && postulacionIdSeleccionPractica && (aplicacionDetail._id?.toString?.() || aplicacionDetail._id) === postulacionIdSeleccionPractica && (
                  <p style={{ margin: '0 0 16px', fontWeight: 600, color: '#0f172a' }}>
                    {(aplicacionDetail.nombres || '') + ' ' + (aplicacionDetail.apellidos || '')}
                  </p>
                )}
                <div className="cerrar-oportunidad-datos-tutor">
                  <div className="cerrar-oportunidad-tutor-campos">
                    <div><label>Nombre Tutor</label><input value={datosTutorSeleccionPractica.nombreTutor || ''} onChange={(e) => setDatosTutorSeleccionPractica(prev => ({ ...prev, nombreTutor: e.target.value }))} placeholder="Nombre" /></div>
                    <div><label>Apellido Tutor</label><input value={datosTutorSeleccionPractica.apellidoTutor || ''} onChange={(e) => setDatosTutorSeleccionPractica(prev => ({ ...prev, apellidoTutor: e.target.value }))} placeholder="Apellido" /></div>
                    <div><label>Email Tutor</label><input type="email" value={datosTutorSeleccionPractica.emailTutor || ''} onChange={(e) => setDatosTutorSeleccionPractica(prev => ({ ...prev, emailTutor: e.target.value }))} placeholder="mail@dominio.com" /></div>
                    <div><label>Teléfono Tutor</label><input type="tel" value={datosTutorSeleccionPractica.telefonoTutor || ''} onChange={(e) => setDatosTutorSeleccionPractica(prev => ({ ...prev, telefonoTutor: e.target.value }))} placeholder="Ej. 601 234 5678" autoComplete="tel" /></div>
                    <div><label>Cargo Tutor</label><input value={datosTutorSeleccionPractica.cargoTutor || ''} onChange={(e) => setDatosTutorSeleccionPractica(prev => ({ ...prev, cargoTutor: e.target.value }))} placeholder="Cargo" /></div>
                    <div><label>Tipo Ident. Tutor</label><select value={datosTutorSeleccionPractica.tipoIdentTutor || ''} onChange={(e) => setDatosTutorSeleccionPractica(prev => ({ ...prev, tipoIdentTutor: e.target.value }))}><option value="">Seleccionar</option><option value="CC">CC</option><option value="CE">CE</option><option value="NIT">NIT</option></select></div>
                    <div><label>ARL Empresa</label><select value={datosTutorSeleccionPractica.arlEmpresa || ''} onChange={(e) => setDatosTutorSeleccionPractica(prev => ({ ...prev, arlEmpresa: e.target.value }))}><option value="">Seleccionar</option>{arlItems.map((item) => <option key={item._id} value={item._id}>{item.description || item.value || item._id}</option>)}</select></div>
                    <div><label>Identificación Tutor</label><input value={datosTutorSeleccionPractica.identificacionTutor || ''} onChange={(e) => setDatosTutorSeleccionPractica(prev => ({ ...prev, identificacionTutor: e.target.value }))} placeholder="Número" /></div>
                    <div><label>Fecha Inicio Práctica</label><input type="date" value={datosTutorSeleccionPractica.fechaInicioPractica || ''} onChange={(e) => setDatosTutorSeleccionPractica(prev => ({ ...prev, fechaInicioPractica: e.target.value }))} min={addDaysToDate(oportunidadSeleccionada?.fechaVencimiento ? (typeof oportunidadSeleccionada.fechaVencimiento === 'string' ? oportunidadSeleccionada.fechaVencimiento.slice(0, 10) : new Date(oportunidadSeleccionada.fechaVencimiento).toISOString().slice(0, 10)) : '', practiceStartDaysAfterExpiry) || undefined} /></div>
                  </div>
                </div>
              </div>
              <div className="oportunidades-modal-rechazo-footer">
                <button type="button" className="oportunidades-modal-rechazo-btn-cancelar" onClick={() => { setShowModalSeleccionarPractica(false); setPostulacionIdSeleccionPractica(null); }}>Cancelar</button>
                <button
                  type="button"
                  className="oportunidades-modal-rechazo-btn-rechazar"
                  style={{ background: '#15803d' }}
                  onClick={async () => {
                    const d = datosTutorSeleccionPractica;
                    const req = ['nombreTutor', 'apellidoTutor', 'emailTutor', 'telefonoTutor', 'cargoTutor', 'tipoIdentTutor', 'identificacionTutor', 'arlEmpresa', 'fechaInicioPractica'];
                    const bad = req.find((k) => !d[k] || String(d[k]).trim() === '');
                    if (bad) {
                      Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: 'Complete todos los campos del tutor y la fecha de inicio de la práctica.', confirmButtonColor: '#c41e3a', customClass: { container: 'swal-over-vista-aplicaciones' } });
                      return;
                    }
                    if (!oportunidadSeleccionada?._id || !postulacionIdSeleccionPractica) return;
                    try {
                      await api.post(`/opportunities/${oportunidadSeleccionada._id}/applications/${postulacionIdSeleccionPractica}/seleccionar`, {
                        nombreTutor: String(d.nombreTutor).trim(),
                        apellidoTutor: String(d.apellidoTutor).trim(),
                        emailTutor: String(d.emailTutor).trim(),
                        telefonoTutor: String(d.telefonoTutor).trim(),
                        cargoTutor: String(d.cargoTutor).trim(),
                        tipoIdentTutor: String(d.tipoIdentTutor).trim(),
                        identificacionTutor: String(d.identificacionTutor).trim(),
                        arlEmpresa: d.arlEmpresa,
                        fechaInicioPractica: new Date(d.fechaInicioPractica).toISOString(),
                      });
                      const { data: det } = await api.get(`/opportunities/${oportunidadSeleccionada._id}/applications/detail/${postulacionIdSeleccionPractica}`);
                      setAplicacionDetail(det);
                      const { data: listData } = await api.get(`/opportunities/${oportunidadSeleccionada._id}/applications`);
                      setAplicacionesList(listData.postulaciones || []);
                      const { data: oppFresh } = await api.get(`/opportunities/${oportunidadSeleccionada._id}`);
                      setOportunidadSeleccionada(oppFresh);
                      setShowModalSeleccionarPractica(false);
                      setPostulacionIdSeleccionPractica(null);
                      Swal.fire({ icon: 'success', title: 'Postulante seleccionado', confirmButtonColor: '#15803d', customClass: { container: 'swal-over-vista-aplicaciones' } });
                    } catch (err) {
                      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo seleccionar al postulante', confirmButtonColor: '#c41e3a', customClass: { container: 'swal-over-vista-aplicaciones' } });
                    }
                  }}
                >
                  Confirmar selección
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  const volverDesdeListado = () => {
    if (typeof onVolver === 'function') {
      onVolver();
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="oportunidades-content">
      <div className="oportunidades-header list-header">
        <div className="list-header-content">
          <button type="button" className="btn-volver" onClick={volverDesdeListado}>
            <FiArrowLeft className="btn-icon" />
            Volver
          </button>
          <div className="configuracion-actions list-actions">
            <button className="btn-refresh" onClick={loadOportunidades} title="Refrescar">
              <FiRefreshCw className="btn-icon" />
            </button>
            <button className="btn-crear" onClick={handleCrearOportunidad}>
              <FiPlus className="btn-icon" />
              Crear Oportunidad
            </button>
          </div>
        </div>
      </div>

      {/* Pestañas Prácticas / Monitorías */}
      <div className="oportunidades-tabs-bar">
        <button
          className={`oportunidades-tab-btn${listaTab === 'practicas' ? ' active' : ''}`}
          onClick={() => setListaTab('practicas')}
        >
          <HiOutlineAcademicCap style={{ marginRight: 6 }} />
          Prácticas
          <span className="oportunidades-tab-count">
            {totalPracticas}
          </span>
        </button>
        <button
          className={`oportunidades-tab-btn${listaTab === 'monitorias' ? ' active' : ''}`}
          onClick={() => setListaTab('monitorias')}
        >
          <FiBookOpen style={{ marginRight: 6 }} />
          Monitorías / Tutorías / Mentorías
          <span className="oportunidades-tab-count">
            {totalMtm}
          </span>
        </button>
      </div>

      {/* Información de registros */}
      <div className="oportunidades-info oportunidades-info--row">
        <p>Se encontraron {listaTab === 'practicas' ? totalPracticas : totalMtm} registros.</p>
        <label className="oportunidades-page-size-label">
          Registros por página
          <select
            className="oportunidades-page-size-select"
            value={pageSize}
            onChange={(e) => {
              const v = Number(e.target.value);
              setPageSize(v);
              setPagePracticas(1);
              setPageMtm(1);
            }}
            aria-label="Registros por página"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
      </div>

      {/* Filtros fijos compactos */}
      <div className="filtros-busqueda-section filtros-busqueda-section--compact">
        <div className="filtros-toolbar">
          <div className="filtros-toolbar-left">
            <div className="filtros-header">
              <FiFilter className="filtros-icon" />
              <h4>Filtros</h4>
            </div>
            <div className="filtros-orden-compact" title="Orden de la lista">
              <span className="filtros-orden-label">Orden</span>
              <select
                value={sortField}
                onChange={e => setSortField(e.target.value)}
                className="ordenar-select ordenar-select--compact"
                aria-label="Campo para ordenar"
              >
                <option value="fechaCreacion">Fecha creación</option>
                <option value="nombreCargo">Nombre cargo</option>
                <option value="fechaVencimiento">Fecha vencimiento</option>
                <option value="estado">Estado</option>
              </select>
              <button
                type="button"
                className="ordenar-direction-btn ordenar-direction-btn--compact"
                onClick={() => setSortDirection(sortDirection === 'ascendente' ? 'descendente' : 'ascendente')}
                title={sortDirection === 'ascendente' ? 'Ascendente' : 'Descendente'}
                aria-label={sortDirection === 'ascendente' ? 'Orden ascendente' : 'Orden descendente'}
              >
                {sortDirection === 'ascendente' ? <FiArrowUp /> : <FiArrowDown />}
              </button>
            </div>
          </div>
          <div className="filtros-actions">
            <button type="button" className="btn-buscar btn-buscar--compact" onClick={handleApplyFilters}>
              Buscar
            </button>
            <button type="button" className="btn-limpiar btn-limpiar--compact" onClick={handleClearFilters}>
              Limpiar
            </button>
          </div>
        </div>

        <div className="filtros-content filtros-grid-compacto">
          <div className="filtro-item">
            <label>Número de oportunidad</label>
            <input
              type="text"
              value={filters.numeroOportunidad}
              onChange={e => setFilters({ ...filters, numeroOportunidad: e.target.value })}
              placeholder="Número"
            />
          </div>
          <div className="filtro-item">
            <label>Nombre del cargo</label>
            <input
              type="text"
              value={filters.nombreCargo}
              onChange={e => setFilters({ ...filters, nombreCargo: e.target.value })}
              placeholder="Cargo"
            />
          </div>
          <div className="filtro-item">
            <label>Empresa</label>
            <input
              type="text"
              value={filters.empresa}
              onChange={e => setFilters({ ...filters, empresa: e.target.value })}
              placeholder="Empresa"
            />
          </div>
          <div className="filtro-item">
            <label>Cierre desde</label>
            <input
              type="date"
              value={filters.fechaCierreDesde}
              onChange={e => setFilters({ ...filters, fechaCierreDesde: e.target.value })}
            />
          </div>
          <div className="filtro-item">
            <label>Cierre hasta</label>
            <input
              type="date"
              value={filters.fechaCierreHasta}
              onChange={e => setFilters({ ...filters, fechaCierreHasta: e.target.value })}
            />
          </div>
          <div className="filtro-item">
            <label>Formación académica</label>
            <input
              type="text"
              value={filters.formacionAcademica}
              onChange={e => setFilters({ ...filters, formacionAcademica: e.target.value })}
              placeholder="Formación"
            />
          </div>
          <div className="filtro-item">
            <label>Requisitos</label>
            <input
              type="text"
              value={filters.requisitos}
              onChange={e => setFilters({ ...filters, requisitos: e.target.value })}
              placeholder="Texto en requisitos"
            />
          </div>
          <div className="filtro-item">
            <label>Estado</label>
            <select
              value={filters.estado}
              onChange={e => setFilters({ ...filters, estado: e.target.value })}
            >
              <option value="">Todos</option>
              {(listaTab === 'practicas' ? estadosPracticaOpts : estadosMtmOpts).map((est) => (
                <option key={est} value={est}>{est}</option>
              ))}
            </select>
          </div>
          <div className="filtro-item filtro-item--checkbox">
            <label className="filtro-checkbox-label">
              <input
                type="checkbox"
                checked={filters.empresaConfidenciales}
                onChange={e => setFilters({ ...filters, empresaConfidenciales: e.target.checked })}
              />
              Empresas confidenciales
            </label>
          </div>
          <div className="filtro-item filtro-item--checkbox">
            <label className="filtro-checkbox-label">
              <input
                type="checkbox"
                checked={filters.conPostulaciones}
                onChange={e => setFilters({ ...filters, conPostulaciones: e.target.checked })}
              />
              Con postulaciones
            </label>
          </div>
        </div>
      </div>

      {/* Lista de Oportunidades */}
      <div className="oportunidades-section">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando oportunidades...</p>
          </div>
        ) : (listaTab === 'practicas' ? totalPracticas : totalMtm) === 0 ? (
          <div className="empty-state">
            <p>No hay oportunidades de {listaTab === 'practicas' ? 'prácticas' : 'monitorías'} registradas</p>
          </div>
        ) : (
          <div className="oportunidades-grid">
            {oportunidades.map(oportunidad => {
              const estado = oportunidad.estado || oportunidad.status || 'Creada';
              const isActiva = estado === 'Activa' || estado === 'activa' || estado === 'published';
              const numPostulantes = oportunidad.aplicacionesCount ?? oportunidad.postulaciones?.length ?? 0;
              const salario = oportunidad.apoyoEconomico 
                ? `$${oportunidad.apoyoEconomico.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : null;
              
              return (
                <div 
                  key={oportunidad._id} 
                  className={`oportunidad-card ${isActiva ? 'oportunidad-activa' : ''}`}
                  onClick={async () => {
                    try {
                      setLoading(true);
                      setShowModalAplicaciones(false);
                      setShowModalSeleccionarPractica(false);
                      setPostulacionIdSeleccionPractica(null);
                      setShowModalHistorial(false);
                      setShowModalCerrarOportunidad(false);
                      setAplicacionDetail(null);
                      setSelectedPostulacionId(null);
                      if (oportunidad._isMTM) {
                        const { data } = await api.get(`/oportunidades-mtm/${oportunidad._id}`);
                        setOportunidadSeleccionada({ ...data, _isMTM: true });
                      } else {
                        const { data } = await api.get(`/opportunities/${oportunidad._id}`);
                        setOportunidadSeleccionada(data);
                      }
                      setVista('detalle');
                    } catch (error) {
                      console.error('Error cargando oportunidad:', error);
                      await Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No se pudo cargar la oportunidad',
                        confirmButtonText: 'Aceptar',
                        confirmButtonColor: '#c41e3a'
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="oportunidad-header">
                    <div className="oportunidad-title-section">
                      <h4 className="oportunidad-title">{oportunidad.nombreCargo || oportunidad.title || 'Sin título'}</h4>
                      <span className="oportunidad-number">Oportunidad No. {oportunidad._id.slice(-6)}</span>
                    </div>
                    <div className="oportunidad-pin">
                      <HiOutlineAcademicCap />
                    </div>
                  </div>
                  <div className="oportunidad-body">
                    <div className="oportunidad-company">
                      {oportunidad.company?.name || oportunidad.company?.commercialName || 'Empresa no especificada'}
                    </div>
                    {salario && (
                      <div className="oportunidad-remuneration">
                        {salario}
                      </div>
                    )}
                    {oportunidad.formacionAcademica && oportunidad.formacionAcademica.length > 0 && (
                      <div className="oportunidad-areas">
                        {oportunidad.formacionAcademica.map((formacion, idx) => (
                          <span key={idx} className="area-tag">
                            {formacion.program?.toUpperCase() || formacion.program}
                            {idx < oportunidad.formacionAcademica.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div 
                    className="oportunidad-footer"
                    style={{
                      background: getStatusColor(estado),
                      borderTop: `1px solid ${getStatusTextColor(estado)}20`
                    }}
                  >
                    <div className="oportunidad-status">
                      <span 
                        className="status-text"
                        style={{ 
                          color: getStatusTextColor(estado), 
                          fontWeight: 600 
                        }}
                      >
                        {getStatusLabel(estado, oportunidad)}
                      </span>
                      {(() => {
                        const programasPendientes = getProgramasPendientes(oportunidad);
                        const isActiva = estado === 'Activa' || estado === 'activa' || estado === 'published';
                        if (isActiva && programasPendientes.length > 0) {
                          return (
                            <span 
                              className="programas-pendientes-badge"
                              onClick={(e) => {
                                e.stopPropagation();
                                Swal.fire({
                                  title: '<div style="display: flex; align-items: center; gap: 10px;"><span style="color: #f59e0b; font-size: 24px;">⚠️</span><span>Programas Pendientes</span></div>',
                                  html: `
                                    <div style="text-align: left; margin: 20px; padding: 0 10px;">
                                      <p style="margin-bottom: 15px; color: #374151; font-size: 14px; line-height: 1.6;">
                                        La oportunidad está <strong style="color: #065f46;">activa</strong>, pero los siguientes programas aún requieren aprobación:
                                      </p>
                                      <div style="display: flex; flex-direction: column; gap: 10px;">
                                        ${programasPendientes.map((ap, idx) => `
                                          <div style="
                                            display: flex;
                                            align-items: center;
                                            padding: 12px 14px;
                                            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                                            border-radius: 8px;
                                            border-left: 4px solid #f59e0b;
                                            box-shadow: 0 1px 3px rgba(245, 158, 11, 0.2);
                                            transition: transform 0.2s;
                                          ">
                                            <span style="
                                              display: inline-flex;
                                              align-items: center;
                                              justify-content: center;
                                              width: 24px;
                                              height: 24px;
                                              background: #f59e0b;
                                              color: white;
                                              border-radius: 50%;
                                              font-weight: 600;
                                              font-size: 12px;
                                              margin-right: 12px;
                                              flex-shrink: 0;
                                            ">${idx + 1}</span>
                                            <div style="flex: 1;">
                                              <div style="font-weight: 600; color: #92400e; font-size: 14px; margin-bottom: 2px;">
                                                ${ap.programa.level}
                                              </div>
                                              <div style="color: #78350f; font-size: 13px;">
                                                ${ap.programa.program}
                                              </div>
                                            </div>
                                          </div>
                                        `).join('')}
                                      </div>
                                    </div>
                                  `,
                                  icon: false,
                                  confirmButtonText: 'Entendido',
                                  confirmButtonColor: '#c41e3a',
                                  width: '550px',
                                  customClass: {
                                    popup: 'swal-programas-pendientes',
                                    title: 'swal-title-custom',
                                    htmlContainer: 'swal-html-custom'
                                  }
                                });
                              }}
                              title={`${programasPendientes.length} programa(s) pendiente(s) de aprobación`}
                            >
                              <FiAlertCircle style={{ marginLeft: '6px', fontSize: '14px' }} />
                              <span style={{ marginLeft: '4px', fontSize: '11px' }}>{programasPendientes.length}</span>
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="oportunidad-icons">
                      <span className="oportunidad-type-icon">
                        {oportunidad._isMTM || oportunidad.tipo === 'monitoria'
                          ? <><FiBookOpen /><span>Monitoría</span></>
                          : <><HiOutlineAcademicCap /><span>Práctica</span></>
                        }
                      </span>
                      <span className="oportunidad-applicants-icon">
                        <FiUsers />
                        <span className="applicants-badge">{numPostulantes}</span>
                      </span>
                      <span className="oportunidad-notification-icon">
                        <FiCalendar />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Paginación */}
        {!loading && (listaTab === 'practicas' ? totalPracticas : totalMtm) > 0 && (
          <div className="pagination-container">
            <div className="pagination-info">
              <span>Página {currentPage} de {Math.max(1, totalPages)}</span>
            </div>
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => {
                  if (listaTab === 'practicas') setPagePracticas((p) => Math.max(1, p - 1));
                  else setPageMtm((p) => Math.max(1, p - 1));
                }}
                disabled={currentPage === 1}
              >
                Anterior
              </button>
              <div className="pagination-numbers">
                {Array.from({ length: Math.min(5, Math.max(1, totalPages)) }, (_, i) => {
                  const tp = Math.max(1, totalPages);
                  let pageNum;
                  if (tp <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= tp - 2) {
                    pageNum = tp - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                      onClick={() => {
                        if (listaTab === 'practicas') setPagePracticas(pageNum);
                        else setPageMtm(pageNum);
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                className="pagination-btn"
                onClick={() => {
                  if (listaTab === 'practicas') setPagePracticas((p) => Math.min(totalPagesPracticas, p + 1));
                  else setPageMtm((p) => Math.min(totalPagesMtm, p + 1));
                }}
                disabled={currentPage === totalPages || totalPages < 1}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

