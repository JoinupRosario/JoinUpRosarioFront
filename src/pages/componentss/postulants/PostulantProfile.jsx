import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiArrowLeft,
  FiEdit,
  FiDownload,
  FiFile,
  FiFileText,
  FiList,
  FiTrash2,
  FiVideo,
  FiPhone,
  FiMail,
  FiLinkedin,
  FiTwitter,
  FiGlobe,
  FiInstagram,
  FiHelpCircle,
  FiUpload,
  FiX,
  FiCheck,
  FiXCircle,
  FiBook,
  FiCalendar,
  FiMoreVertical,
  FiPlus,
  FiEye,
  FiUser,
  FiGrid
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import LocationSelectCascade from '../../../components/common/LocationSelectCascade';
import ProgramAllSelect from '../../../components/common/ProgramAllSelect';
import '../../styles/PostulantProfile.css';

// Escapar HTML para insertar en modales de forma segura
const escapeHtml = (s) => {
  if (s == null) return '';
  const str = String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Utilidades de alertas
const createAlert = (icon, title, text, confirmButtonText = 'Aceptar') => {
  return Swal.fire({
    icon,
    title,
    text,
    confirmButtonText,
    confirmButtonColor: '#c41e3a',
    background: '#fff',
    color: '#333'
  });
};

/** Años de experiencia: número entero. Si el valor está en meses (12–960), se convierte a años; si está en rango 0–80 se muestra tal cual; el resto "—". */
const formatYearsExperience = (value) => {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return '—';
  const rounded = Math.round(num);
  if (rounded >= 0 && rounded <= 80) return String(rounded);
  if (rounded >= 12 && rounded <= 960) return String(Math.round(rounded / 12));
  return '—';
};

/** Calcula los meses entre start y end (inclusive: mes de inicio y mes de fin cuentan). */
const monthsBetween = (start, end) => {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  return Math.max(0, months);
};

/** Créditos por semestre estándar para calcular SSC (semestres según créditos aprobados). */
const CREDITOS_POR_SEMESTRE = 18;

/**
 * Calcula los semestres SSC según créditos aprobados a partir de programExtraInfo.
 * Usa accordingCreditSemester si existe; si no, calcula: créditos aprobados / CREDITOS_POR_SEMESTRE (redondeado hacia arriba).
 * @param {object} profileData - Respuesta de profile-data (enrolledPrograms, programExtraInfo)
 * @returns {number|null} Semestres o null si no hay datos
 */
const getSscSemestersFromCredits = (profileData) => {
  const extraList = profileData?.programExtraInfo || [];
  const enrolled = profileData?.enrolledPrograms || [];
  if (!extraList.length) return null;
  // Preferir el extraInfo del programa Rosario en curso (programFacultyId presente)
  const rosarioIds = new Set(enrolled.filter((ep) => ep.programFacultyId != null).map((ep) => ep._id?.toString?.()));
  const byEnrolledId = (ex) => rosarioIds.has(ex.enrolledProgramId?.toString?.());
  const extra = extraList.find(byEnrolledId) || extraList[0];
  if (extra.accordingCreditSemester != null && extra.accordingCreditSemester !== '') {
    const n = Number(extra.accordingCreditSemester);
    return Number.isFinite(n) ? n : null;
  }
  const approvedStr = extra.approvedCredits != null ? String(extra.approvedCredits).trim() : '';
  if (!approvedStr) return null;
  const approved = Number(approvedStr);
  if (!Number.isFinite(approved) || approved < 0) return null;
  return Math.ceil(approved / CREDITOS_POR_SEMESTRE);
};

/** Rangos de años (umbral en años): 0-2, 2-4, 4-6, 6-10, 10+. */
const EXPERIENCE_RANGES = [
  { maxYears: 2, label: '0-2 años' },
  { maxYears: 4, label: '2-4 años' },
  { maxYears: 6, label: '4-6 años' },
  { maxYears: 10, label: '6-10 años' },
  { maxYears: Infinity, label: '10+ años' },
];

/**
 * Calcula el rango de años de experiencia solo con Experiencias Laborales (JOB_EXP).
 * Primero se suman los meses de cada experiencia (fechas inicio/fin), luego total meses → años → rango.
 */
const getExperienceRangeFromWorkExperiences = (workExperiences) => {
  if (!workExperiences?.length) return null;
  const laborales = workExperiences.filter((w) => (w.experienceType || 'JOB_EXP') === 'JOB_EXP');
  if (!laborales.length) return null;
  const today = new Date();
  let totalMonths = 0;
  for (const w of laborales) {
    const start = w.startDate ? new Date(w.startDate) : null;
    const end = w.noEndDate ? today : (w.endDate ? new Date(w.endDate) : null);
    if (start) totalMonths += monthsBetween(start, end || today);
  }
  const totalYears = totalMonths / 12;
  for (const r of EXPERIENCE_RANGES) {
    if (totalYears < r.maxYears) return r.label;
  }
  return EXPERIENCE_RANGES[EXPERIENCE_RANGES.length - 1].label;
};

/** Convierte meses (totalTimeExperience) a rango de años para mostrar (ej: "0 a 2", "2 a 4"). */
const getExperienceRangeFromMonths = (totalMonths) => {
  if (totalMonths == null || totalMonths === '') return null;
  const num = Number(totalMonths);
  if (!Number.isFinite(num) || num < 0) return null;
  const totalYears = num / 12;
  for (const r of EXPERIENCE_RANGES) {
    if (totalYears < r.maxYears) return r.label;
  }
  return EXPERIENCE_RANGES[EXPERIENCE_RANGES.length - 1].label;
};

/** Valor a mostrar en "Años de experiencia": rango desde experiencias, años del perfil o meses del perfil; si no hay nada, texto por defecto. */
const getDisplayYearsExperience = (profileData) => {
  const fromWork = getExperienceRangeFromWorkExperiences(profileData?.workExperiences);
  if (fromWork) return fromWork;
  const years = profileData?.postulantProfile?.yearsExperience;
  const formattedYears = formatYearsExperience(years);
  if (formattedYears !== '—') return formattedYears.includes('año') ? formattedYears : formattedYears + ' años';
  const fromMonths = getExperienceRangeFromMonths(profileData?.postulantProfile?.totalTimeExperience);
  if (fromMonths) return fromMonths;
  return '0 a 2 años';
};

const PostulantProfile = ({ onVolver }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extraer el ID de la URL
  const extractIdFromPath = () => {
    const match = location.pathname.match(/\/dashboard\/postulantes\/([^/]+)$/);
    return match ? match[1] : null;
  };
  
  const [postulant, setPostulant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('datos-personales');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectingFile, setSelectingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [profileData, setProfileData] = useState(null);
  const fileInputRef = useRef(null);
  const fileSelectTimeoutRef = useRef(null);
  // Perfiles (hojas de vida) - hasta 5 por postulante
  const [profiles, setProfiles] = useState([]);
  const [profilesMeta, setProfilesMeta] = useState({ count: 0, maxAllowed: 5 });
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [profileFormData, setProfileFormData] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileOptionsOpenId, setProfileOptionsOpenId] = useState(null);
  const [hojaDeVidaModalOpen, setHojaDeVidaModalOpen] = useState(false);
  const [hojaDeVidaSelectedProfileId, setHojaDeVidaSelectedProfileId] = useState('');
  /** Campos editables del perfil (postulant_profile): switches y habilidades técnicas. */
  const [profileEditFields, setProfileEditFields] = useState({
    conditionDiscapacity: false,
    haveBusiness: false,
    independent: false,
    employee: false,
    totalTimeExperience: '',
    skillsTechnicalSoftware: '',
  });
  /** Id del ítem de "en curso - Registrada" cuyo menú Opciones está abierto. */
  const [academicEnCursoRegistradaOptionsId, setAcademicEnCursoRegistradaOptionsId] = useState(null);
  /** Modal creación/edición programas en curso. Si no es null, estamos editando este _id. */
  const [editingEnrolledId, setEditingEnrolledId] = useState(null);
  const [programasEnCursoModalOpen, setProgramasEnCursoModalOpen] = useState(false);
  const [programasEnCursoFormData, setProgramasEnCursoFormData] = useState({
    programa: '', institucion: '', pais: '', departamento: '', ciudad: '',
  });
  /** Modal programas finalizados. Si no es null, estamos editando este _id. */
  const [editingGraduateId, setEditingGraduateId] = useState(null);
  const [programasFinalizadosModalOpen, setProgramasFinalizadosModalOpen] = useState(false);
  const [programasFinalizadosFormData, setProgramasFinalizadosFormData] = useState({
    programa: '', tituloFormacion: '', fechaObtencion: '', institucion: '', pais: '', departamento: '', ciudad: '',
  });
  const [savingAcademic, setSavingAcademic] = useState(false);
  /** Id del programa finalizado cuyo menú Opciones está abierto (Rosario - Finalizada). */
  const [academicFinalizadaOptionsId, setAcademicFinalizadaOptionsId] = useState(null);
  /** Id del otro estudio cuyo menú Opciones está abierto. */
  const [otherStudyOptionsId, setOtherStudyOptionsId] = useState(null);
  /** Si no es null, estamos editando este otro estudio _id. */
  const [editingOtherStudyId, setEditingOtherStudyId] = useState(null);
  /** Modal otros estudios */
  const [otrosEstudiosModalOpen, setOtrosEstudiosModalOpen] = useState(false);
  const [otrosEstudiosFormData, setOtrosEstudiosFormData] = useState({
    nombreEstudio: '', institucion: '', anio: '',
  });
  /** Opciones del select Institución (items con listId L_UNIVERSITIES) */
  const [institutionOptions, setInstitutionOptions] = useState([]);
  /** Modal agregar área de interés */
  const [interestAreaModalOpen, setInterestAreaModalOpen] = useState(false);
  const [interestAreaFormData, setInterestAreaFormData] = useState({ area: '' });
  /** Opciones del select Área de interés (items L_INTEREST_AREA) */
  const [areaOptions, setAreaOptions] = useState([]);
  /** Modal Competencia / Habilidad */
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [skillFormData, setSkillFormData] = useState({ skillId: '', experienceYears: '' });
  const [skillOptions, setSkillOptions] = useState([]);
  /** Modal Idiomas */
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [languageFormData, setLanguageFormData] = useState({
    language: '', level: '', certificationExam: false, certificationExamName: '',
  });
  const [languageOptions, setLanguageOptions] = useState([]);
  const [levelOptions, setLevelOptions] = useState([]);
  /** Si el menú Opciones académico debe abrir hacia arriba (para no quedar cortado). */
  const [academicOptionsMenuAbove, setAcademicOptionsMenuAbove] = useState(false);
  /** Posición fixed del menú académico para que no lo recorte el overflow del contenedor. */
  const [academicOptionsMenuFixed, setAcademicOptionsMenuFixed] = useState(null);
  const academicOptionsAnchorRef = useRef(null);
  /** Experiencia tab: menú Opciones con posición fixed para que sobresalga del div (como en académica). */
  const [expOptionsMenuAbove, setExpOptionsMenuAbove] = useState(false);
  const [expOptionsMenuFixed, setExpOptionsMenuFixed] = useState(null);
  const expOptionsAnchorRef = useRef(null);
  /** Perfil cuyos datos se muestran en la pestaña (áreas, experiencia, etc.). */
  const [selectedProfileIdForView, setSelectedProfileIdForView] = useState(null);
  /** True mientras se cargan los datos del perfil seleccionado (al cambiar de perfil/versión). */
  const [loadingProfileData, setLoadingProfileData] = useState(false);
  /** Experiencia tab: menú Opciones abierto por sección (id del ítem o null). */
  const [expLaboralOptionsId, setExpLaboralOptionsId] = useState(null);
  const [otrasExpOptionsId, setOtrasExpOptionsId] = useState(null);
  const [logrosOptionsId, setLogrosOptionsId] = useState(null);
  const [refsOptionsId, setRefsOptionsId] = useState(null);
  /** Modal Experiencia Laboral */
  const [workExpModalOpen, setWorkExpModalOpen] = useState(false);
  const [editingWorkExpId, setEditingWorkExpId] = useState(null);
  const [workExpFormData, setWorkExpFormData] = useState({
    startDate: '', noEndDate: false, endDate: '', jobTitle: '', profession: '', companyName: '',
    companySector: '', contact: '', countryId: '', stateId: '', cityId: '', achievements: '',
  });
  /** Modal Otras Experiencias */
  const [otherExpModalOpen, setOtherExpModalOpen] = useState(false);
  const [editingOtherExpId, setEditingOtherExpId] = useState(null);
  const [otherExpFormData, setOtherExpFormData] = useState({
    experienceType: '', startDate: '', noEndDate: false, endDate: '', jobTitle: '', investigationLine: '',
    companyName: '', course: '', countryId: '', stateId: '', cityId: '', activities: '',
  });
  /** Modal Logros */
  const [awardModalOpen, setAwardModalOpen] = useState(false);
  const [editingAwardId, setEditingAwardId] = useState(null);
  const [awardFormData, setAwardFormData] = useState({ awardType: '', awardDate: '', name: '', description: '' });
  /** Modal Referencias */
  const [referenceModalOpen, setReferenceModalOpen] = useState(false);
  const [editingReferenceId, setEditingReferenceId] = useState(null);
  const [referenceFormData, setReferenceFormData] = useState({ firstname: '', lastname: '', occupation: '', phone: '' });
  const [savingExperience, setSavingExperience] = useState(false);
  /** Opciones para selects en modales de experiencia (sector, tipo experiencia, tipo logro) */
  const [sectorOptions, setSectorOptions] = useState([]);
  const [experienceTypeOptions, setExperienceTypeOptions] = useState([]);
  const [awardTypeOptions, setAwardTypeOptions] = useState([]);

  // Funciones de utilidad
  const showError = useCallback((title, text) => {
    return createAlert('error', title, text);
  }, []);

  const showFuncionalidadEnDesarrollo = useCallback((funcionalidad) => {
    return createAlert(
      'info',
      'Funcionalidad en Desarrollo',
      `La funcionalidad "${funcionalidad}" está actualmente en desarrollo y estará disponible próximamente.`
    );
  }, []);

  /** Actualizar info básica desde Universitas: el servidor compara (BD vs Universitas) y devuelve changes; confirmación y aplicar en servidor */
  const handleActualizarInfoBasicaUniversitas = useCallback(async () => {
    if (!postulant?._id) return;
    try {
      const res = await api.get(`/postulants/${postulant._id}/consulta-inf-estudiante-universitas`);
      const { changes = [] } = res.data || {};

      if (changes.length === 0) {
        await Swal.fire({
          icon: 'info',
          title: 'Sin cambios',
          text: 'La información básica coincide con Universitas. No hay nada que actualizar.',
          confirmButtonColor: '#c41e3a',
        });
        return;
      }

      const rowsHtml = changes
        .map(
          (c) =>
            `<tr><td class="u-campo">${escapeHtml(c.label)}</td><td class="u-actual">${escapeHtml(c.valorActual)}</td><td class="u-nuevo">${escapeHtml(c.valorNuevo)}</td></tr>`
        )
        .join('');

      const result = await Swal.fire({
        icon: 'warning',
        title: '¿Actualizar información básica?',
        html: `<p class="universitas-modal-desc">Se detectaron diferencias con Universitas. ¿Deseas actualizar la información del postulante?</p><table class="universitas-tablita"><thead><tr><th>Campo</th><th>Actual</th><th>Nuevo</th></tr></thead><tbody>${rowsHtml}</tbody></table>`,
        showCancelButton: true,
        confirmButtonText: 'Sí, actualizar',
        cancelButtonText: 'No',
        confirmButtonColor: '#c41e3a',
        background: '#fff',
        color: '#333',
        width: 580,
      });

      if (!result.isConfirmed) return;

      Swal.fire({ title: 'Actualizando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      await api.put(`/postulants/${postulant._id}/aplicar-info-universitas`);
      const [refreshedPostulant, refreshedProfile] = await Promise.all([
        api.get(`/postulants/${postulant._id}`),
        api.get(`/postulants/${postulant._id}/profile-data`, {
          params: profileData?.postulantProfile?._id ? { profileId: profileData.postulantProfile._id } : {},
        }).catch(() => ({ data: null })),
      ]);
      setPostulant(refreshedPostulant.data);
      if (refreshedProfile?.data) setProfileData(refreshedProfile.data);
      setEditedData((prev) => ({
        ...prev,
        phone_number: refreshedPostulant.data?.phone_number ?? refreshedPostulant.data?.phone ?? prev.phone_number,
        address: refreshedPostulant.data?.address ?? prev.address,
      }));
      Swal.close();
      await Swal.fire({
        icon: 'success',
        title: 'Información actualizada',
        text: 'Los datos básicos se han guardado en la base de datos.',
        confirmButtonColor: '#c41e3a',
      });
    } catch (err) {
      Swal.close();
      const msg = err.response?.data?.message || err.message || 'Error al consultar o actualizar Universitas';
      showError('Error', msg);
    }
  }, [postulant?._id, profileData?.postulantProfile?._id, showError]);

  /** Actualizar info académica desde Universitas: consulta, compara, modal con diferencias, aplicar y refrescar. */
  const handleActualizarInfoAcademicaUniversitas = useCallback(async () => {
    if (!postulant?._id) return;
    try {
      const res = await api.get(`/postulants/${postulant._id}/consulta-inf-academica-universitas`);
      const { changes = [] } = res.data || {};

      if (changes.length === 0) {
        await Swal.fire({
          icon: 'info',
          title: 'Sin cambios',
          text: 'La información académica coincide con Universitas. No hay nada que actualizar.',
          confirmButtonColor: '#c41e3a',
        });
        return;
      }

      const rowsHtml = changes
        .map(
          (c) =>
            `<tr><td class="u-campo">${escapeHtml(c.label)}</td><td class="u-actual">${escapeHtml(c.valorActual)}</td><td class="u-nuevo">${escapeHtml(c.valorNuevo)}</td></tr>`
        )
        .join('');

      const result = await Swal.fire({
        icon: 'warning',
        title: '¿Actualizar información académica?',
        html: `<p class="universitas-modal-desc">Se detectaron diferencias con Universitas. ¿Deseas actualizar los programas del perfil?</p><table class="universitas-tablita"><thead><tr><th>Campo</th><th>Actual</th><th>Nuevo</th></tr></thead><tbody>${rowsHtml}</tbody></table>`,
        showCancelButton: true,
        confirmButtonText: 'Sí, actualizar',
        cancelButtonText: 'No',
        confirmButtonColor: '#c41e3a',
        background: '#fff',
        color: '#333',
        width: 580,
      });

      if (!result.isConfirmed) return;

      Swal.fire({ title: 'Actualizando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      await api.put(`/postulants/${postulant._id}/aplicar-info-academica-universitas`);
      const [refreshedPostulant, refreshedProfile] = await Promise.all([
        api.get(`/postulants/${postulant._id}`),
        api.get(`/postulants/${postulant._id}/profile-data`, {
          params: profileData?.postulantProfile?._id ? { profileId: profileData.postulantProfile._id } : {},
        }).catch(() => ({ data: null })),
      ]);
      setPostulant(refreshedPostulant.data);
      if (refreshedProfile?.data) setProfileData(refreshedProfile.data);
      Swal.close();
      await Swal.fire({
        icon: 'success',
        title: 'Información académica actualizada',
        text: 'Los programas (en curso y finalizados) se han sincronizado con Universitas.',
        confirmButtonColor: '#c41e3a',
      });
    } catch (err) {
      Swal.close();
      const msg = err.response?.data?.message || err.message || 'Error al consultar o actualizar información académica';
      showError('Error', msg);
    }
  }, [postulant?._id, profileData?.postulantProfile?._id, showError]);

  /** Cargar instituciones (listId L_UNIVERSITIES) para los selects de programas académicos */
  const fetchInstitutionOptions = useCallback(async () => {
    try {
      const res = await api.get('/locations/items/L_UNIVERSITIES?limit=1000');
      setInstitutionOptions(res.data?.data || []);
    } catch (err) {
      console.error('Error cargando instituciones:', err);
      showError('Error', 'No se pudieron cargar las instituciones');
      setInstitutionOptions([]);
    }
  }, [showError]);

  /** Al abrir modal de programas (en curso o finalizados), cargar instituciones si hace falta */
  useEffect(() => {
    if (programasEnCursoModalOpen || programasFinalizadosModalOpen) {
      if (institutionOptions.length === 0) {
        fetchInstitutionOptions();
      }
    }
  }, [programasEnCursoModalOpen, programasFinalizadosModalOpen]);

  /** Cargar áreas de interés (listId L_INTEREST_AREA) para el modal, ordenadas A-Z por value */
  const fetchAreaOptions = useCallback(async () => {
    try {
      const res = await api.get('/locations/items/L_INTEREST_AREA', {
        params: { limit: 1000 },
      });
      const list = res.data?.data || [];
      const sorted = [...list].sort((a, b) => {
        const textA = (a.value || '').toLowerCase();
        const textB = (b.value || '').toLowerCase();
        return textA.localeCompare(textB);
      });
      setAreaOptions(sorted);
    } catch (err) {
      console.error('Error cargando áreas de interés:', err);
      showError('Error', 'No se pudieron cargar las áreas de interés');
      setAreaOptions([]);
    }
  }, [showError]);

  useEffect(() => {
    if (interestAreaModalOpen && areaOptions.length === 0) {
      fetchAreaOptions();
    }
  }, [interestAreaModalOpen, areaOptions.length, fetchAreaOptions]);

  /** Cargar habilidades/competencias para el modal */
  const fetchSkillOptions = useCallback(async () => {
    try {
      const res = await api.get('/skills');
      setSkillOptions(res.data?.data || []);
    } catch (err) {
      console.error('Error cargando competencias:', err);
      showError('Error', 'No se pudieron cargar las competencias');
      setSkillOptions([]);
    }
  }, [showError]);

  /** Cargar idiomas y nivel desde items: L_LANGUAGE (idioma), L_LEVEL (nivel). Si L_LEVEL viene vacío, se prueba L_LEVEL_LANGUAGE. */
  const fetchLanguageAndLevelOptions = useCallback(async () => {
    try {
      const langRes = await api.get('/locations/items/L_LANGUAGE?limit=500');
      setLanguageOptions(langRes.data?.data || []);
      let levels = [];
      try {
        const levelRes = await api.get('/locations/items/L_LEVEL?limit=200');
        levels = levelRes.data?.data || [];
      } catch (_) {
        /* L_LEVEL puede no existir o fallar */
      }
      if (levels.length === 0) {
        try {
          const altRes = await api.get('/locations/items/L_LEVEL_LANGUAGE?limit=200');
          levels = altRes.data?.data || [];
        } catch (_) {}
      }
      setLevelOptions(levels);
    } catch (err) {
      console.error('Error cargando idiomas:', err);
      showError('Error', 'No se pudieron cargar los idiomas');
      setLanguageOptions([]);
      setLevelOptions([]);
    }
  }, [showError]);

  useEffect(() => {
    if (skillModalOpen && skillOptions.length === 0) fetchSkillOptions();
  }, [skillModalOpen, skillOptions.length, fetchSkillOptions]);
  useEffect(() => {
    if (languageModalOpen && languageOptions.length === 0) fetchLanguageAndLevelOptions();
  }, [languageModalOpen, languageOptions.length, fetchLanguageAndLevelOptions]);

  /** Carga los datos completos de un perfil (hoja de vida). profileId opcional: si no se pasa, el backend devuelve el perfil más reciente. */
  const loadProfileDataForProfile = useCallback(async (postulantId, profileId = null, versionId = null) => {
    if (!postulantId) return;
    const params = {};
    if (profileId) {
      const pid = typeof profileId === 'string' ? profileId : (profileId?.toString?.() ?? profileId);
      params.profileId = pid;
      if (versionId) params.versionId = typeof versionId === 'string' ? versionId : (versionId?.toString?.() ?? versionId);
    }
    try {
      const res = await api.get(`/postulants/${postulantId}/profile-data`, { params: Object.keys(params).length ? params : undefined });
      if (res.data) {
        setProfileData(res.data);
        if (res.data.selectedProfileVersion?._id) setSelectedProfileIdForView(res.data.selectedProfileVersion._id);
      }
    } catch (err) {
      console.error('Error loading profile data', err);
      showError('Error', err.response?.data?.message || 'No se pudo cargar el perfil');
    }
  }, [showError]);

  /** Id del perfil base actual (para API enrolled/graduate/skills/languages). Debe estar antes de los useCallback que lo usan. */
  const currentBaseProfileId = (() => {
    if (profiles?.length && selectedProfileIdForView) {
      const p = profiles.find((pr) => String(pr._id) === String(selectedProfileIdForView) || (pr.profileId && String(pr.profileId) === String(selectedProfileIdForView)));
      if (p) return p.profileId?.toString?.() || p._id?.toString?.() || p.profileId || p._id;
    }
    return profileData?.postulantProfile?._id?.toString?.() || profileData?.postulantProfile?._id || selectedProfileIdForView;
  })();

  const handleAddSkill = useCallback(async () => {
    if (!postulant?._id || !currentBaseProfileId) return;
    const skillId = (skillFormData.skillId || '').trim();
    if (!skillId) {
      showError('Campo requerido', 'Seleccione competencia y/o habilidad.');
      return;
    }
    const years = skillFormData.experienceYears != null && skillFormData.experienceYears !== '' ? Number(skillFormData.experienceYears) : 0;
    try {
      setSavingAcademic(true);
      await api.post(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/skills`, {
        skillId,
        experienceYears: Number.isFinite(years) ? years : 0,
      });
      createAlert('success', 'Añadido', 'Competencia añadida.');
      setSkillModalOpen(false);
      setSkillFormData({ skillId: '', experienceYears: '' });
      loadProfileDataForProfile(postulant._id, currentBaseProfileId);
    } catch (err) {
      console.error(err);
      showError('Error', err.response?.data?.message || 'No se pudo añadir la competencia');
    } finally {
      setSavingAcademic(false);
    }
  }, [postulant?._id, currentBaseProfileId, skillFormData, showError, loadProfileDataForProfile]);

  const handleAddLanguage = useCallback(async () => {
    if (!postulant?._id || !currentBaseProfileId) return;
    const languageId = (languageFormData.language || '').trim();
    if (!languageId) {
      showError('Campo requerido', 'Seleccione idioma.');
      return;
    }
    try {
      setSavingAcademic(true);
      await api.post(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/languages`, {
        language: languageId,
        level: languageFormData.level || undefined,
        certificationExam: languageFormData.certificationExam === true,
        certificationExamName: languageFormData.certificationExam ? (languageFormData.certificationExamName || '').trim() : undefined,
      });
      createAlert('success', 'Añadido', 'Idioma añadido.');
      setLanguageModalOpen(false);
      setLanguageFormData({ language: '', level: '', certificationExam: false, certificationExamName: '' });
      loadProfileDataForProfile(postulant._id, currentBaseProfileId);
    } catch (err) {
      console.error(err);
      showError('Error', err.response?.data?.message || 'No se pudo añadir el idioma');
    } finally {
      setSavingAcademic(false);
    }
  }, [postulant?._id, currentBaseProfileId, languageFormData, showError, loadProfileDataForProfile]);

  /** Posición del menú Opciones académico: arriba/abajo según espacio y posición fixed para que sobresalga del div. */
  useEffect(() => {
    const openId = academicEnCursoRegistradaOptionsId || academicFinalizadaOptionsId || otherStudyOptionsId;
    if (!openId) {
      setAcademicOptionsMenuAbove(false);
      setAcademicOptionsMenuFixed(null);
      return;
    }
    const tick = () => {
      const el = academicOptionsAnchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const menuHeight = 90;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openAbove = spaceBelow < menuHeight;
      setAcademicOptionsMenuAbove(openAbove);
      const right = window.innerWidth - rect.right;
      setAcademicOptionsMenuFixed({
        right,
        ...(openAbove ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      });
    };
    const t = setTimeout(tick, 0);
    return () => clearTimeout(t);
  }, [academicEnCursoRegistradaOptionsId, academicFinalizadaOptionsId, otherStudyOptionsId]);

  /** Posición del menú Opciones en tab Experiencia: arriba/abajo según espacio y fixed para que sobresalga del div. */
  useEffect(() => {
    const openId = expLaboralOptionsId || otrasExpOptionsId || logrosOptionsId || refsOptionsId;
    if (!openId) {
      setExpOptionsMenuAbove(false);
      setExpOptionsMenuFixed(null);
      return;
    }
    const tick = () => {
      const el = expOptionsAnchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const menuHeight = 90;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openAbove = spaceBelow < menuHeight;
      setExpOptionsMenuAbove(openAbove);
      const right = window.innerWidth - rect.right;
      setExpOptionsMenuFixed({
        right,
        ...(openAbove ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      });
    };
    const t = setTimeout(tick, 0);
    return () => clearTimeout(t);
  }, [expLaboralOptionsId, otrasExpOptionsId, logrosOptionsId, refsOptionsId]);

  const handleSaveEnrolledProgram = useCallback(async () => {
    if (!postulant?._id || !currentBaseProfileId) return;
    if (!programasEnCursoFormData.programa) {
      showError('Campo requerido', 'Seleccione un programa');
      return;
    }
    try {
      setSavingAcademic(true);
      const body = {
        programId: programasEnCursoFormData.programa,
        university: programasEnCursoFormData.institucion || undefined,
        countryId: programasEnCursoFormData.pais || undefined,
        stateId: programasEnCursoFormData.departamento || undefined,
        cityId: programasEnCursoFormData.ciudad || undefined,
      };
      if (editingEnrolledId) {
        await api.put(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/enrolled-programs/${editingEnrolledId}`, body);
        createAlert('success', 'Actualizado', 'Formación en curso actualizada.');
      } else {
        await api.post(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/enrolled-programs`, body);
        createAlert('success', 'Guardado', 'Formación en curso registrada.');
      }
      setProgramasEnCursoModalOpen(false);
      setEditingEnrolledId(null);
      setProgramasEnCursoFormData({ programa: '', institucion: '', pais: '', departamento: '', ciudad: '' });
      loadProfileDataForProfile(postulant._id, currentBaseProfileId);
    } catch (err) {
      console.error(err);
      showError('Error', err.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSavingAcademic(false);
    }
  }, [postulant?._id, currentBaseProfileId, programasEnCursoFormData, editingEnrolledId, showError, loadProfileDataForProfile]);

  const handleDeleteEnrolledProgram = useCallback(async (enrolledId) => {
    if (!postulant?._id || !currentBaseProfileId) return;
    const result = await Swal.fire({
      title: '¿Eliminar formación en curso?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setAcademicEnCursoRegistradaOptionsId(null);
    setTimeout(async () => {
      try {
        await api.delete(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/enrolled-programs/${enrolledId}`);
        createAlert('success', 'Eliminado', 'Formación en curso eliminada.');
        loadProfileDataForProfile(postulant._id, currentBaseProfileId);
      } catch (err) {
        console.error(err);
        showError('Error', err.response?.data?.message || 'No se pudo eliminar');
      }
    }, 0);
  }, [postulant?._id, currentBaseProfileId, showError, loadProfileDataForProfile]);

  const handleSaveGraduateProgram = useCallback(async () => {
    if (!postulant?._id || !currentBaseProfileId) return;
    if (!programasFinalizadosFormData.programa) {
      showError('Campo requerido', 'Seleccione un programa');
      return;
    }
    try {
      setSavingAcademic(true);
      const body = {
        programId: programasFinalizadosFormData.programa,
        title: programasFinalizadosFormData.tituloFormacion || undefined,
        endDate: programasFinalizadosFormData.fechaObtencion || undefined,
        university: programasFinalizadosFormData.institucion || undefined,
        countryId: programasFinalizadosFormData.pais || undefined,
        stateId: programasFinalizadosFormData.departamento || undefined,
        cityId: programasFinalizadosFormData.ciudad || undefined,
      };
      if (editingGraduateId) {
        await api.put(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/graduate-programs/${editingGraduateId}`, body);
        createAlert('success', 'Actualizado', 'Programa finalizado actualizado.');
      } else {
        await api.post(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/graduate-programs`, body);
        createAlert('success', 'Guardado', 'Programa finalizado registrado.');
      }
      setProgramasFinalizadosModalOpen(false);
      setEditingGraduateId(null);
      setProgramasFinalizadosFormData({ programa: '', tituloFormacion: '', fechaObtencion: '', institucion: '', pais: '', departamento: '', ciudad: '' });
      loadProfileDataForProfile(postulant._id, currentBaseProfileId);
    } catch (err) {
      console.error(err);
      showError('Error', err.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSavingAcademic(false);
    }
  }, [postulant?._id, currentBaseProfileId, programasFinalizadosFormData, editingGraduateId, showError, loadProfileDataForProfile]);

  const handleDeleteGraduateProgram = useCallback(async (graduateId) => {
    if (!postulant?._id || !currentBaseProfileId) return;
    const result = await Swal.fire({
      title: '¿Eliminar programa finalizado?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setAcademicFinalizadaOptionsId(null);
    setTimeout(async () => {
      try {
        await api.delete(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/graduate-programs/${graduateId}`);
        createAlert('success', 'Eliminado', 'Programa finalizado eliminado.');
        loadProfileDataForProfile(postulant._id, currentBaseProfileId);
      } catch (err) {
        console.error(err);
        showError('Error', err.response?.data?.message || 'No se pudo eliminar');
      }
    }, 0);
  }, [postulant?._id, currentBaseProfileId, showError, loadProfileDataForProfile]);

  const handleSaveOtherStudy = useCallback(async () => {
    if (!postulant?._id || !currentBaseProfileId) return;
    const nombre = (otrosEstudiosFormData.nombreEstudio || '').trim();
    const institucion = (otrosEstudiosFormData.institucion || '').trim();
    if (!nombre || !institucion) {
      showError('Campos requeridos', 'Nombre del estudio e institución son obligatorios');
      return;
    }
    try {
      setSavingAcademic(true);
      const yearVal = otrosEstudiosFormData.anio != null && otrosEstudiosFormData.anio !== '' ? Number(otrosEstudiosFormData.anio) : undefined;
      const body = { studyName: nombre, studyInstitution: institucion, studyYear: Number.isFinite(yearVal) ? yearVal : undefined };
      if (editingOtherStudyId) {
        await api.put(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/other-studies/${editingOtherStudyId}`, body);
        createAlert('success', 'Actualizado', 'Otro estudio actualizado.');
      } else {
        await api.post(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/other-studies`, body);
        createAlert('success', 'Guardado', 'Otro estudio registrado.');
      }
      setOtrosEstudiosModalOpen(false);
      setEditingOtherStudyId(null);
      setOtrosEstudiosFormData({ nombreEstudio: '', institucion: '', anio: '' });
      loadProfileDataForProfile(postulant._id, currentBaseProfileId);
    } catch (err) {
      console.error(err);
      showError('Error', err.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSavingAcademic(false);
    }
  }, [postulant?._id, currentBaseProfileId, otrosEstudiosFormData, editingOtherStudyId, showError, loadProfileDataForProfile]);

  const handleDeleteOtherStudy = useCallback(async (otherStudyId) => {
    if (!postulant?._id || !currentBaseProfileId) return;
    const result = await Swal.fire({
      title: '¿Eliminar otro estudio?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setOtherStudyOptionsId(null);
    setTimeout(async () => {
      try {
        await api.delete(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/other-studies/${otherStudyId}`);
        createAlert('success', 'Eliminado', 'Otro estudio eliminado.');
        loadProfileDataForProfile(postulant._id, currentBaseProfileId);
      } catch (err) {
        console.error(err);
        showError('Error', err.response?.data?.message || 'No se pudo eliminar');
      }
    }, 0);
  }, [postulant?._id, currentBaseProfileId, showError, loadProfileDataForProfile]);

  const handleAddInterestArea = useCallback(async () => {
    if (!postulant?._id || !currentBaseProfileId) return;
    const areaId = (interestAreaFormData.area || '').trim();
    if (!areaId) {
      showError('Campo requerido', 'Seleccione un área de interés.');
      return;
    }
    try {
      setSavingAcademic(true);
      await api.post(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/interest-areas`, { area: areaId });
      createAlert('success', 'Añadido', 'Área de interés añadida.');
      setInterestAreaModalOpen(false);
      setInterestAreaFormData({ area: '' });
      loadProfileDataForProfile(postulant._id, currentBaseProfileId);
    } catch (err) {
      console.error(err);
      showError('Error', err.response?.data?.message || 'No se pudo añadir el área de interés');
    } finally {
      setSavingAcademic(false);
    }
  }, [postulant?._id, currentBaseProfileId, interestAreaFormData.area, showError, loadProfileDataForProfile]);

  const handleDeleteInterestArea = useCallback(async (interestAreaId) => {
    if (!postulant?._id || !currentBaseProfileId) return;
    const result = await Swal.fire({
      title: '¿Eliminar área de interés?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setTimeout(async () => {
      try {
        await api.delete(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/interest-areas/${interestAreaId}`);
        createAlert('success', 'Eliminado', 'Área de interés eliminada.');
        loadProfileDataForProfile(postulant._id, currentBaseProfileId);
      } catch (err) {
        console.error(err);
        showError('Error', err.response?.data?.message || 'No se pudo eliminar');
      }
    }, 0);
  }, [postulant?._id, currentBaseProfileId, showError, loadProfileDataForProfile]);

  const handleDeleteSkill = useCallback(async (profileSkillId) => {
    if (!postulant?._id || !currentBaseProfileId) return;
    const result = await Swal.fire({
      title: '¿Eliminar competencia?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setTimeout(async () => {
      try {
        await api.delete(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/skills/${profileSkillId}`);
        createAlert('success', 'Eliminado', 'Competencia eliminada.');
        loadProfileDataForProfile(postulant._id, currentBaseProfileId);
      } catch (err) {
        console.error(err);
        showError('Error', err.response?.data?.message || 'No se pudo eliminar');
      }
    }, 0);
  }, [postulant?._id, currentBaseProfileId, showError, loadProfileDataForProfile]);

  const handleDeleteLanguage = useCallback(async (profileLanguageId) => {
    if (!postulant?._id || !currentBaseProfileId) return;
    const result = await Swal.fire({
      title: '¿Eliminar idioma?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setTimeout(async () => {
      try {
        await api.delete(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/languages/${profileLanguageId}`);
        createAlert('success', 'Eliminado', 'Idioma eliminado.');
        loadProfileDataForProfile(postulant._id, currentBaseProfileId);
      } catch (err) {
        console.error(err);
        showError('Error', err.response?.data?.message || 'No se pudo eliminar');
      }
    }, 0);
  }, [postulant?._id, currentBaseProfileId, showError, loadProfileDataForProfile]);

  /** Cargar opciones para modales de experiencia (sector, tipo experiencia, tipo logro) */
  const fetchSectorOptions = useCallback(async () => {
    try {
      const res = await api.get('/locations/items/L_BUSINESS_SECTOR?limit=500').catch(() => ({ data: { data: [] } }));
      setSectorOptions(res.data?.data || []);
    } catch (e) {
      setSectorOptions([]);
    }
  }, []);
  const fetchExperienceTypeOptions = useCallback(async () => {
    try {
      const res = await api.get('/locations/items/L_EXPERIENCE_TYPE?limit=500').catch(() => ({ data: { data: [] } }));
      setExperienceTypeOptions(res.data?.data || []);
    } catch (e) {
      setExperienceTypeOptions([]);
    }
  }, []);
  const fetchAwardTypeOptions = useCallback(async () => {
    try {
      const res = await api.get('/locations/items/L_ACHIEVEMENT?limit=500').catch(() => ({ data: { data: [] } }));
      setAwardTypeOptions(res.data?.data || []);
    } catch (e) {
      setAwardTypeOptions([]);
    }
  }, []);
  useEffect(() => {
    if (workExpModalOpen && sectorOptions.length === 0) fetchSectorOptions();
  }, [workExpModalOpen, sectorOptions.length, fetchSectorOptions]);
  useEffect(() => {
    if (otherExpModalOpen && experienceTypeOptions.length === 0) fetchExperienceTypeOptions();
  }, [otherExpModalOpen, experienceTypeOptions.length, fetchExperienceTypeOptions]);
  useEffect(() => {
    const hasOtherExp = profileData?.workExperiences?.some((w) => (w.experienceType || 'JOB_EXP') !== 'JOB_EXP');
    if (hasOtherExp && experienceTypeOptions.length === 0) fetchExperienceTypeOptions();
  }, [profileData?.workExperiences, experienceTypeOptions.length, fetchExperienceTypeOptions]);
  useEffect(() => {
    if (awardModalOpen && awardTypeOptions.length === 0) fetchAwardTypeOptions();
  }, [awardModalOpen, awardTypeOptions.length, fetchAwardTypeOptions]);

  const handleSaveWorkExperience = useCallback(async () => {
    if (!postulant?._id || !currentBaseProfileId) return;
    const { startDate, noEndDate, endDate, jobTitle, profession, companyName, companySector, contact, countryId, stateId, cityId, achievements } = workExpFormData;
    if (!jobTitle?.trim()) {
      showError('Campo requerido', 'Nombre del Cargo es obligatorio.');
      return;
    }
    try {
      setSavingExperience(true);
      const payload = {
        experienceType: 'JOB_EXP',
        startDate: startDate || undefined,
        noEndDate: !!noEndDate,
        endDate: noEndDate ? undefined : (endDate || undefined),
        jobTitle: jobTitle.trim(),
        profession: profession?.trim() || undefined,
        companyName: companyName?.trim() || undefined,
        companySector: companySector || undefined,
        contact: contact?.trim() || undefined,
        countryId: countryId || undefined,
        stateId: stateId || undefined,
        cityId: cityId || undefined,
        achievements: achievements?.trim()?.slice(0, 500) || undefined,
      };
      if (editingWorkExpId) {
        await api.put(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/work-experiences/${editingWorkExpId}`, payload);
        createAlert('success', 'Guardado', 'Experiencia laboral actualizada.');
      } else {
        await api.post(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/work-experiences`, payload);
        createAlert('success', 'Guardado', 'Experiencia laboral agregada.');
      }
      setWorkExpModalOpen(false);
      setEditingWorkExpId(null);
      setWorkExpFormData({ startDate: '', noEndDate: false, endDate: '', jobTitle: '', profession: '', companyName: '', companySector: '', contact: '', countryId: '', stateId: '', cityId: '', achievements: '' });
      loadProfileDataForProfile(postulant._id, currentBaseProfileId);
    } catch (err) {
      console.error(err);
      showError('Error', err.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSavingExperience(false);
    }
  }, [postulant?._id, currentBaseProfileId, workExpFormData, editingWorkExpId, showError, loadProfileDataForProfile]);

  const handleSaveOtherExperience = useCallback(async () => {
    if (!postulant?._id || !currentBaseProfileId) return;
    const { experienceType, startDate, noEndDate, endDate, jobTitle, investigationLine, companyName, course, countryId, stateId, cityId, activities } = otherExpFormData;
    if (!experienceType) {
      showError('Campo requerido', 'Tipo de Experiencia es obligatorio.');
      return;
    }
    try {
      setSavingExperience(true);
      const payload = {
        experienceType: experienceType.trim(),
        startDate: startDate || undefined,
        noEndDate: !!noEndDate,
        endDate: noEndDate ? undefined : (endDate || undefined),
        jobTitle: jobTitle?.trim() || undefined,
        companyName: companyName?.trim() || undefined,
        investigationLine: investigationLine?.trim() || undefined,
        course: course?.trim() || undefined,
        countryId: countryId || undefined,
        stateId: stateId || undefined,
        cityId: cityId || undefined,
        activities: activities?.trim()?.slice(0, 1000) || undefined,
      };
      if (editingOtherExpId) {
        await api.put(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/work-experiences/${editingOtherExpId}`, payload);
        createAlert('success', 'Guardado', 'Otra experiencia actualizada.');
      } else {
        await api.post(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/work-experiences`, payload);
        createAlert('success', 'Guardado', 'Otra experiencia agregada.');
      }
      setOtherExpModalOpen(false);
      setEditingOtherExpId(null);
      setOtherExpFormData({ experienceType: '', startDate: '', noEndDate: false, endDate: '', jobTitle: '', investigationLine: '', companyName: '', course: '', countryId: '', stateId: '', cityId: '', activities: '' });
      loadProfileDataForProfile(postulant._id, currentBaseProfileId);
    } catch (err) {
      console.error(err);
      showError('Error', err.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSavingExperience(false);
    }
  }, [postulant?._id, currentBaseProfileId, otherExpFormData, editingOtherExpId, showError, loadProfileDataForProfile]);

  const handleSaveAward = useCallback(async () => {
    if (!postulant?._id || !currentBaseProfileId) return;
    const { awardType, awardDate, name, description } = awardFormData;
    if (!awardType || !name?.trim()) {
      showError('Campo requerido', 'Logro y Nombre son obligatorios.');
      return;
    }
    try {
      setSavingExperience(true);
      const payload = { awardType, name: name.trim(), awardDate: awardDate || undefined, description: description?.trim()?.slice(0, 500) || undefined };
      if (editingAwardId) {
        await api.put(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/awards/${editingAwardId}`, payload);
        createAlert('success', 'Guardado', 'Logro actualizado.');
      } else {
        await api.post(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/awards`, payload);
        createAlert('success', 'Guardado', 'Logro agregado.');
      }
      setAwardModalOpen(false);
      setEditingAwardId(null);
      setAwardFormData({ awardType: '', awardDate: '', name: '', description: '' });
      loadProfileDataForProfile(postulant._id, currentBaseProfileId);
    } catch (err) {
      console.error(err);
      showError('Error', err.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSavingExperience(false);
    }
  }, [postulant?._id, currentBaseProfileId, awardFormData, editingAwardId, showError, loadProfileDataForProfile]);

  const handleSaveReference = useCallback(async () => {
    if (!postulant?._id || !currentBaseProfileId) return;
    const { firstname, lastname, occupation, phone } = referenceFormData;
    if (!firstname?.trim() || !lastname?.trim() || !occupation?.trim() || !phone?.trim()) {
      showError('Campo requerido', 'Nombre, Apellido, Ocupación y Teléfono son obligatorios.');
      return;
    }
    try {
      setSavingExperience(true);
      const payload = { firstname: firstname.trim(), lastname: lastname.trim(), occupation: occupation.trim(), phone: phone.trim() };
      if (editingReferenceId) {
        await api.put(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/references/${editingReferenceId}`, payload);
        createAlert('success', 'Guardado', 'Referencia actualizada.');
      } else {
        await api.post(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/references`, payload);
        createAlert('success', 'Guardado', 'Referencia agregada.');
      }
      setReferenceModalOpen(false);
      setEditingReferenceId(null);
      setReferenceFormData({ firstname: '', lastname: '', occupation: '', phone: '' });
      loadProfileDataForProfile(postulant._id, currentBaseProfileId);
    } catch (err) {
      console.error(err);
      showError('Error', err.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSavingExperience(false);
    }
  }, [postulant?._id, currentBaseProfileId, referenceFormData, editingReferenceId, showError, loadProfileDataForProfile]);

  const handleDeleteWorkExperience = useCallback(async (workExpId) => {
    if (!postulant?._id || !currentBaseProfileId) return;
    const result = await Swal.fire({ title: '¿Eliminar experiencia?', text: 'Esta acción no se puede deshacer.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#c41e3a', cancelButtonText: 'Cancelar' });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/work-experiences/${workExpId}`);
      createAlert('success', 'Eliminado', 'Experiencia eliminada.');
      setExpLaboralOptionsId(null);
      setOtrasExpOptionsId(null);
      loadProfileDataForProfile(postulant._id, currentBaseProfileId);
    } catch (err) {
      console.error(err);
      showError('Error', err.response?.data?.message || 'No se pudo eliminar');
    }
  }, [postulant?._id, currentBaseProfileId, showError, loadProfileDataForProfile]);

  const handleDeleteAward = useCallback(async (awardId) => {
    if (!postulant?._id || !currentBaseProfileId) return;
    const result = await Swal.fire({ title: '¿Eliminar logro?', text: 'Esta acción no se puede deshacer.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#c41e3a', cancelButtonText: 'Cancelar' });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/awards/${awardId}`);
      createAlert('success', 'Eliminado', 'Logro eliminado.');
      setLogrosOptionsId(null);
      loadProfileDataForProfile(postulant._id, currentBaseProfileId);
    } catch (err) {
      console.error(err);
      showError('Error', err.response?.data?.message || 'No se pudo eliminar');
    }
  }, [postulant?._id, currentBaseProfileId, showError, loadProfileDataForProfile]);

  const handleDeleteReference = useCallback(async (refId) => {
    if (!postulant?._id || !currentBaseProfileId) return;
    const result = await Swal.fire({ title: '¿Eliminar referencia?', text: 'Esta acción no se puede deshacer.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#c41e3a', cancelButtonText: 'Cancelar' });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/postulants/${postulant._id}/profiles/${currentBaseProfileId}/references/${refId}`);
      createAlert('success', 'Eliminado', 'Referencia eliminada.');
      setRefsOptionsId(null);
      loadProfileDataForProfile(postulant._id, currentBaseProfileId);
    } catch (err) {
      console.error(err);
      showError('Error', err.response?.data?.message || 'No se pudo eliminar');
    }
  }, [postulant?._id, currentBaseProfileId, showError, loadProfileDataForProfile]);

  const loadPostulant = useCallback(async (id) => {
    if (!id) {
      setLoading(false);
      setProfileData(null);
      setSelectedProfileIdForView(null);
      return;
    }
    try {
      setLoading(true);
      setPostulant(null);
      setProfileData(null);
      setSelectedProfileIdForView(null);
      const [postulantRes, profileRes] = await Promise.all([
        api.get(`/postulants/${id}`),
        api.get(`/postulants/${id}/profile-data`).catch(() => ({ data: null })),
      ]);
      if (postulantRes.data) {
        setPostulant(postulantRes.data);
      } else {
        showError('Error', 'No se encontraron datos del postulante');
      }
      if (profileRes?.data) {
        setProfileData(profileRes.data);
        if (profileRes.data.selectedProfileVersion?._id) setSelectedProfileIdForView(profileRes.data.selectedProfileVersion._id);
      }
    } catch (error) {
      console.error('Error loading postulant', error);
      const errorMessage = error.response?.data?.message || 'No se pudo cargar la información del postulante';
      showError('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Cargar perfiles (hojas de vida) del postulante
  const loadProfiles = useCallback(async (postulantId) => {
    if (!postulantId) return;
    try {
      setLoadingProfiles(true);
      const res = await api.get(`/postulants/${postulantId}/profiles`);
      const count = res.data.count ?? 0;
      const maxAllowed = res.data.maxAllowed ?? 5;
      setProfiles(res.data.profiles || []);
      setProfilesMeta({ count, maxAllowed });
      setPostulant(prev => prev ? { ...prev, profileCount: count, maxProfilesAllowed: maxAllowed } : null);
    } catch (err) {
      console.error('Error loading profiles', err);
      setProfiles([]);
      setProfilesMeta({ count: 0, maxAllowed: 5 });
    } finally {
      setLoadingProfiles(false);
    }
  }, []);

  // Efecto para cargar cuando cambia la ruta
  useEffect(() => {
    const id = extractIdFromPath();
    if (id) {
      loadPostulant(id);
    } else {
      setLoading(false);
      setPostulant(null);
    }
  }, [location.pathname, loadPostulant]);

  // Cargar perfiles cuando hay postulante (para tener profileId y poder cargar datos de perfil en cualquier pestaña)
  useEffect(() => {
    if (postulant?._id) {
      loadProfiles(postulant._id);
    }
  }, [postulant?._id, loadProfiles]);

  // Cuando hay postulante y aún no tenemos datos de perfil, cargar: con primer perfil si hay versiones, o sin profileId (perfil reciente) si no hay versiones
  useEffect(() => {
    if (!postulant?._id || loadingProfiles) return;
    if (profileData?.postulantProfile != null) return;
    if (profiles?.length > 0) {
      const first = profiles[0];
      const baseId = first.profileId || first._id;
      const versionId = first.versionId ?? first._id;
      setSelectedProfileIdForView(first._id);
      loadProfileDataForProfile(postulant._id, baseId, versionId);
    } else {
      loadProfileDataForProfile(postulant._id);
    }
  }, [postulant?._id, loadingProfiles, profiles, profileData?.postulantProfile, loadProfileDataForProfile]);

  const handleCreateProfile = useCallback(async () => {
    if (!postulant?._id || profilesMeta.count >= profilesMeta.maxAllowed) return;
    setProfileFormData({});
    setSelectedProfile(null);
    setProfileFormOpen(true);
  }, [postulant?._id, profilesMeta]);

  const handleSaveProfileSubmit = useCallback(async () => {
    if (!postulant?._id) return;
    const nombre = (profileFormData.studentCode ?? '').trim();
    const texto = (profileFormData.profileText ?? '').trim();
    if (!selectedProfile && !nombre) {
      showError('Campo requerido', 'Nombre Perfil es obligatorio.');
      return;
    }
    if (!texto) {
      showError('Campo requerido', 'Perfil es obligatorio.');
      return;
    }
    try {
      setSavingProfile(true);
      if (selectedProfile) {
        await api.put(`/postulants/${postulant._id}/profiles/${selectedProfile._id}`, profileFormData);
        Swal.fire({ icon: 'success', title: 'Perfil actualizado', confirmButtonColor: '#c41e3a' });
      } else {
        await api.post(`/postulants/${postulant._id}/profiles`, profileFormData);
        Swal.fire({ icon: 'success', title: 'Perfil creado', confirmButtonColor: '#c41e3a' });
      }
      setProfileFormOpen(false);
      setProfileFormData({});
      setSelectedProfile(null);
      loadProfiles(postulant._id);
      setPostulant(prev => prev ? { ...prev, profileCount: (prev.profileCount ?? 0) + (selectedProfile ? 0 : 1) } : null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al guardar';
      showError('Error', msg);
    } finally {
      setSavingProfile(false);
    }
  }, [postulant, selectedProfile, profileFormData, loadProfiles, showError]);

  const handleEditProfile = useCallback((profile) => {
    setSelectedProfile(profile);
    setProfileFormData({
      studentCode: profile.studentCode ?? profile.profileName ?? '',
      profileText: profile.profileText || '',
      salaryRangeMin: profile.salaryRangeMin ?? '',
      salaryRangeMax: profile.salaryRangeMax ?? '',
      skillsTechnicalSoftware: profile.skillsTechnicalSoftware || '',
      companyName: profile.companyName || '',
      yearsExperience: profile.yearsExperience ?? '',
      acceptTerms: profile.acceptTerms ?? false,
    });
    setProfileFormOpen(true);
  }, []);

  const handleDeleteProfile = useCallback(async (profile) => {
    if (!postulant?._id) return;
    const result = await Swal.fire({
      title: 'Eliminar perfil',
      text: '¿Está seguro de eliminar este perfil (hoja de vida)?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    try {
      const { data } = await api.delete(`/postulants/${postulant._id}/profiles/${profile._id}`);
      Swal.fire({ icon: 'success', title: data?.isVersion ? 'Versión eliminada' : 'Perfil eliminado', confirmButtonColor: '#c41e3a' });
      loadProfiles(postulant._id);
      if (!data?.isVersion) {
        setPostulant(prev => prev ? { ...prev, profileCount: Math.max(0, (prev.profileCount ?? 1) - 1) } : null);
      }
      setSelectedProfile(null);
      setProfileFormOpen(false);
    } catch (err) {
      showError('Error', err.response?.data?.message || 'No se pudo eliminar');
    }
  }, [postulant, loadProfiles, showError]);

  const handleDownloadAttachment = useCallback(async (attachmentId, filename) => {
    if (!postulant?._id || !attachmentId) return;
    try {
      const res = await api.get(`/postulants/${postulant._id}/attachments/${attachmentId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'documento.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      showError('Error', err.response?.data?.message || 'No se pudo descargar el archivo');
    }
  }, [postulant?._id, showError]);

  // Cargar imagen de perfil si existe (solo si es una ruta válida, no ObjectId)
  useEffect(() => {
    const pic = postulant?.profile_picture;
    if (!pic || typeof pic !== 'string') {
      setPreviewImage(null);
      return;
    }
    const isPath = pic.includes('upload') || pic.startsWith('src/');
    const isUrl = pic.startsWith('http');
    if (!isPath && !isUrl) {
      setPreviewImage(null);
      return;
    }
    let imageUrl;
    if (isUrl) {
      imageUrl = pic;
    } else {
      const baseURL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/api\/?$/, '').replace(/\/$/, '');
      const cleanPath = pic.replace(/^src[/\\]/, '').replace(/\\/g, '/');
      imageUrl = `${baseURL}/${cleanPath}`;
    }
    setPreviewImage(imageUrl);
  }, [postulant]);

  // Manejar selección de archivo
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    
    // Limpiar el timeout de cancelación ya que se seleccionó un archivo o se canceló
    if (fileSelectTimeoutRef.current) {
      clearTimeout(fileSelectTimeoutRef.current);
      fileSelectTimeoutRef.current = null;
    }
    
    if (file) {
      // Si no estaba activo, activarlo (ya debería estar activo desde el click)
      if (!selectingFile) {
        setSelectingFile(true);
      }
      
      // Validar tipo de archivo
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setSelectingFile(false);
        showError('Error', 'Tipo de archivo no válido. Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)');
        return;
      }

      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setSelectingFile(false);
        showError('Error', 'El archivo es demasiado grande. Máximo 10MB.');
        return;
      }

      setSelectedFile(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
        setSelectingFile(false);
      };
      reader.onerror = () => {
        setSelectingFile(false);
        showError('Error', 'Error al leer el archivo');
      };
      reader.readAsDataURL(file);
    } else {
      // Si no se seleccionó archivo (usuario canceló), desactivar loading
      setSelectingFile(false);
    }
  }, [showError, selectingFile]);

  // Subir foto de perfil
  const handleUploadPicture = useCallback(async () => {
    if (!selectedFile || !postulant) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('profile_picture', selectedFile);

      const response = await api.post(
        `/postulants/${postulant._id}/profile-picture`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const imagePath = response.data.profile_picture;
      const baseURL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/api\/?$/, '').replace(/\/$/, '');
      const cleanPath = (imagePath || '').replace(/^src[/\\]/, '').replace(/\\/g, '/');
      const imageUrl = (imagePath && imagePath.startsWith('http'))
        ? imagePath
        : `${baseURL}/${cleanPath}`;

      setPostulant(prev => ({
        ...prev,
        profile_picture: imagePath || prev.profile_picture
      }));
      setPreviewImage(imageUrl);
      setSelectedFile(null);
      
      Swal.fire({
        icon: 'success',
        title: 'Foto actualizada',
        text: 'La foto de perfil se ha actualizado correctamente',
        confirmButtonColor: '#c41e3a'
      });
    } catch (error) {
      console.error('Error uploading picture', error);
      const errorMessage = error.response?.data?.message || 'No se pudo subir la foto de perfil';
      showError('Error', errorMessage);
    } finally {
      setUploading(false);
    }
  }, [selectedFile, postulant, showError, showFuncionalidadEnDesarrollo]);

  // Inicializar datos editados cuando se activa el modo edición
  useEffect(() => {
    if (isEditing && postulant) {
      // Formatear fecha para input type="date"
      const dateValue = postulant.date_nac_postulant 
        ? new Date(postulant.date_nac_postulant).toISOString().split('T')[0]
        : '';
      // Número de documento desde profile-data (postulantProfile.studentCode)
      const studentCode = profileData?.postulantProfile?.studentCode ?? postulant.identity_postulant ?? '';
      setEditedData({
        mobile_number: postulant.mobile_number || '',
        phone_number: postulant.phone_number || '',
        linkedin_url: postulant.linkedin_url || '',
        twitter_url: postulant.twitter_url || '',
        instagram_url: postulant.instagram_url || '',
        website_url: postulant.website_url || '',
        type_doc_postulant: postulant.type_doc_postulant?._id ?? postulant.type_doc_postulant ?? '',
        identity_postulant: postulant.identity_postulant || '',
        student_code: studentCode,
        date_nac_postulant: dateValue,
        nac_country: postulant.nac_country?._id || '',
        nac_department: postulant.nac_department?._id || '',
        nac_city: postulant.nac_city?._id || '',
        residence_country: postulant.residence_country?._id || '',
        residence_department: postulant.residence_department?._id || '',
        residence_city: postulant.residence_city?._id || '',
        address: postulant.address || ''
      });
    } else if (!isEditing) {
      setEditedData({});
    }
  }, [isEditing, postulant, profileData?.postulantProfile?.studentCode]);

  // Guardar cambios del perfil
  const handleSaveProfile = useCallback(async () => {
    if (!postulant) return;

    try {
      setSaving(true);
      
      // Preparar datos para enviar
      const dataToUpdate = {
        ...editedData
      };

      // Convertir fecha si existe (formato YYYY-MM-DD a Date)
      if (dataToUpdate.date_nac_postulant) {
        if (typeof dataToUpdate.date_nac_postulant === 'string' && dataToUpdate.date_nac_postulant.includes('-')) {
          dataToUpdate.date_nac_postulant = new Date(dataToUpdate.date_nac_postulant);
        }
      }

      // Campos que son ObjectId en el backend
      const objectIdFields = [
        'nac_country',
        'nac_department',
        'nac_city',
        'residence_country',
        'residence_department',
        'residence_city'
      ];

      // Eliminar campos vacíos o null, especialmente los ObjectId
      Object.keys(dataToUpdate).forEach(key => {
        const value = dataToUpdate[key];
        // Si es un campo ObjectId y está vacío, eliminarlo
        if (objectIdFields.includes(key) && (value === '' || value === null || value === undefined)) {
          delete dataToUpdate[key];
        }
        // Para otros campos, eliminar si están vacíos
        else if (value === '' || value === null || value === undefined) {
          delete dataToUpdate[key];
        }
      });

      const response = await api.put(`/postulants/update/${postulant._id}`, dataToUpdate);
      setPostulant(response.data);

      const baseId = profiles?.length && selectedProfileIdForView
        ? (() => {
            const p = profiles.find((pr) => String(pr._id) === String(selectedProfileIdForView) || (pr.profileId && String(pr.profileId) === String(selectedProfileIdForView)));
            return p ? (p.profileId?.toString?.() || p._id?.toString?.() || p.profileId || p._id) : null;
          })()
        : (profileData?.postulantProfile?._id?.toString?.() || profileData?.postulantProfile?._id);
      if (baseId) {
        const profilePayload = {
          conditionDiscapacity: profileEditFields.conditionDiscapacity,
          haveBusiness: profileEditFields.haveBusiness,
          independent: profileEditFields.independent,
          employee: profileEditFields.employee,
          totalTimeExperience: profileEditFields.totalTimeExperience === '' ? undefined : Number(profileEditFields.totalTimeExperience),
          skillsTechnicalSoftware: profileEditFields.skillsTechnicalSoftware,
        };
        if (editedData.student_code !== undefined && editedData.student_code !== null) {
          profilePayload.studentCode = String(editedData.student_code).trim() || undefined;
        }
        await api.put(`/postulants/${postulant._id}/profiles/${baseId}`, profilePayload);
        loadProfileDataForProfile(postulant._id, baseId, selectedProfileIdForView);
      }

      setIsEditing(false);
      Swal.fire({
        icon: 'success',
        title: 'Perfil actualizado',
        text: 'Los cambios se han guardado correctamente',
        confirmButtonColor: '#c41e3a'
      });
    } catch (error) {
      console.error('Error saving profile', error);
      const errorMessage = error.response?.data?.message || 'No se pudieron guardar los cambios';
      showError('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  }, [postulant, editedData, profileEditFields, profiles, selectedProfileIdForView, profileData?.postulantProfile?._id, loadProfileDataForProfile, showError]);

  // Sincronizar campos editables del perfil cuando cambian los datos cargados
  useEffect(() => {
    const p = profileData?.postulantProfile;
    if (!p) return;
    setProfileEditFields({
      conditionDiscapacity: !!p.conditionDiscapacity,
      haveBusiness: !!p.haveBusiness,
      independent: !!p.independent,
      employee: !!p.employee,
      totalTimeExperience: p.totalTimeExperience != null ? String(p.totalTimeExperience) : '',
      skillsTechnicalSoftware: p.skillsTechnicalSoftware ?? '',
    });
  }, [profileData?.postulantProfile?._id, profileData?.postulantProfile?.conditionDiscapacity, profileData?.postulantProfile?.haveBusiness, profileData?.postulantProfile?.independent, profileData?.postulantProfile?.employee, profileData?.postulantProfile?.totalTimeExperience, profileData?.postulantProfile?.skillsTechnicalSoftware]);

  const handleProfileFieldChange = useCallback((field, value) => {
    setProfileEditFields(prev => ({ ...prev, [field]: value }));
  }, []);

  // Manejar cambios en los inputs
  const handleInputChange = useCallback((field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Eliminar foto de perfil
  const handleDeletePicture = useCallback(async () => {
    if (!postulant) return;

    const result = await Swal.fire({
      title: '¿Eliminar foto de perfil?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        // Actualizar el postulante eliminando la foto
        await api.put(`/postulants/update/${postulant._id}`, {
          profile_picture: null
        });

        setPostulant(prev => ({
          ...prev,
          profile_picture: null
        }));

        setPreviewImage(null);
        setSelectedFile(null);
        
        Swal.fire({
          icon: 'success',
          title: 'Foto eliminada',
          text: 'La foto de perfil ha sido eliminada correctamente',
          confirmButtonColor: '#c41e3a'
        });
      } catch (error) {
        console.error('Error deleting picture', error);
        showError('Error', 'No se pudo eliminar la foto de perfil');
      }
    }
  }, [postulant, showError]);

  // Porcentaje de completitud: usar el del backend si viene, sino calcular local
  const calculateCompleteness = useCallback(() => {
    if (!postulant) return 0;
    if (postulant.filling_percentage != null && !Number.isNaN(Number(postulant.filling_percentage))) {
      return Math.min(100, Math.max(0, Number(postulant.filling_percentage)));
    }
    const fields = [
      postulant.identity_postulant,
      postulant.type_doc_postulant,
      postulant.gender_postulant,
      postulant.date_nac_postulant,
      postulant.nac_country,
      postulant.nac_department,
      postulant.nac_city,
      postulant.residence_country,
      postulant.residence_department,
      postulant.residence_city,
      postulant.phone_number,
      postulant.mobile_number
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }, [postulant]);

  // Formatear fecha
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="postulants-content">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Cargando perfil del postulante...</p>
        </div>
      </div>
    );
  }

  if (!postulant) {
    return (
      <div className="postulants-content">
        <div className="empty-state">
          <h3>Postulante no encontrado</h3>
          <p>El postulante solicitado no existe.</p>
        </div>
      </div>
    );
  }

  const completeness = calculateCompleteness();
  const fullName = postulant.user?.name || 'Sin nombre';
  const email = postulant.user?.email || '-';

  return (
    <div className="postulant-profile-content">
      {/* Barra superior de acciones */}
      <div className="postulant-profile-actions">
        {isEditing ? (
          <>
            <button
              className="btn-guardar"
              onClick={handleSaveProfile}
              disabled={saving}
              title="Guardar cambios"
            >
              {saving ? (
                <>
                  <div className="loading-spinner-small" />
                  Guardando...
                </>
              ) : (
                <>
                  <FiDownload className="btn-icon" />
                  Guardar
                </>
              )}
            </button>
            <button
              className="btn-action btn-outline"
              onClick={handleActualizarInfoBasicaUniversitas}
              title="Actualizar Info Básica (Universitas)"
            >
              <FiFile className="btn-icon" />
              Actualizar Info Básica (Universitas)
            </button>
            <button
              className="btn-action btn-outline"
              onClick={() => showFuncionalidadEnDesarrollo('Actualizar Info Académica (Universitas)')}
              title="Actualizar Info Académica (Universitas)"
            >
              <FiFile className="btn-icon" />
              Actualizar Info Académica (Universitas)
            </button>
            <button
              className="btn-volver"
              onClick={() => {
                setIsEditing(false);
                setEditedData({});
              }}
              disabled={saving}
              title="Cancelar edición"
            >
              <FiX className="btn-icon" />
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button
              className="btn-action btn-outline"
              onClick={() => setIsEditing(true)}
              title="Editar"
            >
              <FiEdit className="btn-icon" />
              Editar
            </button>
            <button
              className="btn-action btn-outline"
              onClick={() => showFuncionalidadEnDesarrollo('Generar Carta de Presentación')}
              title="Generar Carta de Presentación"
            >
              <FiDownload className="btn-icon" />
              Generar Carta de Presentación
            </button>
            <button
              className="btn-action btn-outline"
              onClick={() => showFuncionalidadEnDesarrollo('Historial de Aplicaciones')}
              title="Historial de Aplicaciones"
            >
              <FiList className="btn-icon" />
              Historial de Aplicaciones
            </button>
            <button
              className="btn-guardar"
              onClick={() => showFuncionalidadEnDesarrollo('Eliminar postulante')}
              title="Eliminar"
            >
              <FiTrash2 className="btn-icon" />
              Eliminar
            </button>
          </>
        )}
        <button
          className="btn-volver"
          onClick={() => navigate('/dashboard/postulants')}
          title="Volver"
        >
          <FiArrowLeft className="btn-icon" />
          Volver
        </button>
      </div>

      {/* Tabs de navegación */}
      <div className="postulant-profile-tabs">
        <button
          className={`profile-tab ${activeTab === 'datos-personales' ? 'active' : ''}`}
          onClick={() => setActiveTab('datos-personales')}
        >
          DATOS PERSONALES
        </button>
        <button
          className={`profile-tab ${activeTab === 'informacion-academica' ? 'active' : ''}`}
          onClick={() => setActiveTab('informacion-academica')}
        >
          INFORMACIÓN ACADÉMICA
        </button>
        <button
          className={`profile-tab ${activeTab === 'perfil' ? 'active' : ''}`}
          onClick={() => setActiveTab('perfil')}
        >
          PERFIL
        </button>
        <button
          className={`profile-tab ${activeTab === 'experiencia' ? 'active' : ''}`}
          onClick={() => setActiveTab('experiencia')}
        >
          EXPERIENCIA
        </button>
      
      </div>

      {/* Contenido principal */}
      <div className="postulant-profile-main">
        {/* Pestaña Datos personales: un solo bloque para evitar errores de DOM (removeChild) al cambiar de pestaña */}
        {activeTab === 'datos-personales' && (
          <div className="profile-tab-content datos-personales-tab">
        <div className="postulant-profile-summary">
          <div className="profile-summary-left">
            <div className="profile-picture-container">
              <div className="profile-picture">
                {previewImage ? (
                  <img 
                    src={previewImage} 
                    alt="Foto de perfil" 
                    className="profile-picture-img"
                    onError={(e) => {
                      console.error('Error loading image:', previewImage);
                      console.error('Error event:', e);
                      setPreviewImage(null);
                    }}
                    onLoad={() => {
                      console.log('Image loaded successfully:', previewImage);
                    }}
                  />
                ) : (
                  <FiMail className="profile-picture-icon" />
                )}
                {previewImage && (
                  <button 
                    className="profile-picture-delete" 
                    title="Eliminar foto"
                    onClick={handleDeletePicture}
                  >
                    <FiX className="delete-icon" />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                onClick={(e) => {
                  // Resetear el valor para que el onChange se dispare incluso si se selecciona el mismo archivo
                  e.target.value = '';
                }}
                onCancel={() => {
                  // Si el usuario cancela, desactivar el loading
                  setSelectingFile(false);
                }}
                style={{ display: 'none' }}
              />
              <button 
                className="profile-picture-select"
                onClick={() => {
                  setSelectingFile(true);
                  // Limpiar timeout anterior si existe
                  if (fileSelectTimeoutRef.current) {
                    clearTimeout(fileSelectTimeoutRef.current);
                  }
                  // Si el usuario cancela el diálogo, desactivar el loading después de 2 segundos
                  fileSelectTimeoutRef.current = setTimeout(() => {
                    setSelectingFile(false);
                  }, 2000);
                  fileInputRef.current?.click();
                }}
                disabled={uploading || selectingFile}
              >
                {selectingFile ? (
                  <>
                    <div className="loading-spinner-small" />
                    <span>{selectedFile ? 'Procesando...' : 'Abriendo...'}</span>
                  </>
                ) : (
                  <>
                    <FiUpload className="upload-icon" />
                    {selectedFile ? 'Cambiar' : 'Seleccionar'}
                  </>
                )}
              </button>
              {selectedFile && (
                <>
                  <div className="profile-picture-filename">{selectedFile.name}</div>
                  <button 
                    className="profile-picture-upload-btn"
                    onClick={handleUploadPicture}
                    disabled={uploading}
                  >
                    {uploading ? 'Subiendo...' : 'Subir foto'}
                  </button>
                </>
              )}
            </div>
            <div className="profile-info">
              <h2 className="profile-name">{fullName.toUpperCase()}</h2>
              <div className="profile-email">
                <FiMail className="email-icon" />
                <span>{email}</span>
              </div>
              {postulant.profileCount != null && (
                <div className="profile-summary-meta">
                  <FiFileText className="email-icon" style={{ marginRight: 6 }} />
                  <span>Perfiles: {postulant.profileCount}/{postulant.maxProfilesAllowed ?? 5}</span>
                </div>
              )}
            </div>
          </div>
          <div className="profile-summary-right">
            <div className="profile-consents">
              <div className="consent-item">
                <span>Permito el envío de hoja de vida <br/> a empresas</span>
                <label className="switch">
                  <input type="checkbox" checked={postulant.full_profile || false} readOnly />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="consent-item">
                <span>Autorizo el tratamiento de mis <br/> datos personales</span>
                <label className="switch">
                  <input type="checkbox" checked={postulant.acept_terms || false} readOnly />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
          <div>
          <div className="profile-completeness">
              <div className="completeness-circle">
                <svg className="completeness-svg" viewBox="0 0 36 36">
                  <path
                    className="completeness-bg"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="completeness-progress"
                    strokeDasharray={`${completeness}, 100`}
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="completeness-percent">{completeness}%</span>
              </div>
              <div className="completeness-info">
              
                <span>¿Qué hace falta para <br/> completar su perfil?</span>
              </div>
            </div>
          </div>
        </div>

        {/* Separador */}
        <div className="profile-separator"></div>

        {/* Sección: Contacto y redes sociales */}
        <div className="profile-section profile-section-contact">
          <h3 className="profile-section-title">Contacto y redes sociales</h3>
          <div className="profile-contact-row">
            <div className="profile-contact-info">
              <div className="contact-item">
              <div className="contact-icon-wrapper">
                <FiPhone className="contact-icon" />
              </div>
              {isEditing ? (
                <>
                  <input 
                    type="text" 
                    className="contact-input" 
                    value={editedData.mobile_number || ''} 
                    onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                    placeholder="Número móvil"
                  />
                  <FiEdit className="contact-edit-icon" />
                </>
              ) : (
                <span className="contact-text">{postulant.mobile_number || '-'}</span>
              )}
            </div>
            <div className="contact-item">
              <div className="contact-icon-wrapper">
                <FiPhone className="contact-icon" />
              </div>
              {isEditing ? (
                <>
                  <input 
                    type="text" 
                    className="contact-input" 
                    value={editedData.phone_number || ''} 
                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                    placeholder="Teléfono fijo"
                  />
                  <FiEdit className="contact-edit-icon" />
                </>
              ) : (
                <span className="contact-text">{postulant.phone_number || '-'}</span>
              )}
            </div>
            <div className="contact-item">
              <div className="contact-icon-wrapper">
                <FiMail className="contact-icon" />
              </div>
              {isEditing ? (
                <>
                  <input 
                    type="text" 
                    className="contact-input" 
                    value={email} 
                    readOnly
                    placeholder="Email"
                  />
                  <FiEdit className="contact-edit-icon" />
                </>
              ) : (
                <span className="contact-text">{email}</span>
              )}
            </div>
            </div>
            <div className="profile-contact-group profile-contact-networks">
           
              <div className="profile-contact-info">
                <div className="contact-item">
                  <div className="contact-icon-wrapper">
                    <FiLinkedin className="contact-icon" />
              </div>
              {isEditing ? (
                <>
                  <input 
                    type="text" 
                    className="contact-input" 
                    value={editedData.linkedin_url || ''} 
                    onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                    placeholder="LinkedIn"
                  />
                  <FiEdit className="contact-edit-icon" />
                </>
              ) : (
                <span className="contact-text">{postulant.linkedin_url || '-'}</span>
              )}
            </div>
            <div className="contact-item">
              <div className="contact-icon-wrapper">
                <FiTwitter className="contact-icon" />
              </div>
              {isEditing ? (
                <>
                  <input 
                    type="text" 
                    className="contact-input" 
                    value={editedData.twitter_url || ''} 
                    onChange={(e) => handleInputChange('twitter_url', e.target.value)}
                    placeholder="Twitter"
                  />
                  <FiEdit className="contact-edit-icon" />
                </>
              ) : (
                <span className="contact-text">{postulant.twitter_url || '-'}</span>
              )}
            </div>
            <div className="contact-item">
              <div className="contact-icon-wrapper">
                <FiInstagram className="contact-icon" />
              </div>
              {isEditing ? (
                <>
                  <input 
                    type="text" 
                    className="contact-input" 
                    value={editedData.instagram_url || ''} 
                    onChange={(e) => handleInputChange('instagram_url', e.target.value)}
                    placeholder="Instagram"
                  />
                  <FiEdit className="contact-edit-icon" />
                </>
              ) : (
                <span className="contact-text">{postulant.instagram_url || '-'}</span>
              )}
            </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Identificación */}
        <div className="profile-section profile-section-identification">
          <h3 className="profile-section-title">Identificación</h3>
            <div className="profile-data-grid">
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Tipo de Documento
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <select 
                      className="profile-field-input profile-field-select" 
                      value={editedData.type_doc_postulant || ''}
                      onChange={(e) => handleInputChange('type_doc_postulant', e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      <option value="CC">CC</option>
                      <option value="CE">CE</option>
                      <option value="PA">PA</option>
                    </select>
                  </div>
                ) : (
                  <div className="profile-field-value">
                    {typeof postulant.type_doc_postulant === 'object' && postulant.type_doc_postulant !== null
                      ? (postulant.type_doc_postulant.name ?? postulant.type_doc_postulant.value ?? '-')
                      : (postulant.type_doc_postulant || '-')}
                  </div>
                )}
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Número de documento
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <input 
                      type="text" 
                      className="profile-field-input" 
                      value={editedData.student_code ?? ''} 
                      onChange={(e) => handleInputChange('student_code', e.target.value)}
                      placeholder="Número de documento"
                    />
                  </div>
                ) : (
                  <div className="profile-field-value">
                    {(profileData?.postulantProfile?.studentCode ?? postulant?.identity_postulant ?? '-') || '-'}
                  </div>
                )}
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Sexo
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                <div className="profile-field-value">
                {typeof postulant.gender_postulant === 'object' && postulant.gender_postulant !== null
                  ? (postulant.gender_postulant.name ?? postulant.gender_postulant.value ?? '-')
                  : (postulant.gender_postulant || '-')}
              </div>
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Fecha de nacimiento
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <input 
                      type="date" 
                      className="profile-field-input" 
                      value={editedData.date_nac_postulant || ''}
                      onChange={(e) => handleInputChange('date_nac_postulant', e.target.value)}
                      placeholder="DD/MM/YYYY"
                    />
                  </div>
                ) : (
                  <div className="profile-field-value">{formatDate(postulant.date_nac_postulant)}</div>
                )}
              </div>
            </div>
        </div>

        {/* Sección: Ubicación y datos adicionales */}
        <div className="profile-section profile-section-ubicacion">
          <h3 className="profile-section-title">Ubicación y datos adicionales</h3>
            <div className="profile-data-grid">
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  País de nacimiento
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <select 
                      className="profile-field-input profile-field-select" 
                      value={editedData.nac_country || ''}
                      onChange={(e) => handleInputChange('nac_country', e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      {postulant.nac_country && <option value={postulant.nac_country._id}>{postulant.nac_country.name}</option>}
                    </select>
                  </div>
                ) : (
                  <div className="profile-field-value">{postulant.nac_country?.name || '-'}</div>
                )}
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Departamento de nacimiento
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <select 
                      className="profile-field-input profile-field-select" 
                      value={editedData.nac_department || ''}
                      onChange={(e) => handleInputChange('nac_department', e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      {postulant.nac_department && <option value={postulant.nac_department._id}>{postulant.nac_department.name}</option>}
                    </select>
                  </div>
                ) : (
                  <div className="profile-field-value">{postulant.nac_department?.name || '-'}</div>
                )}
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Ciudad de nacimiento
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <select 
                      className="profile-field-input profile-field-select" 
                      value={editedData.nac_city || ''}
                      onChange={(e) => handleInputChange('nac_city', e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      {postulant.nac_city && <option value={postulant.nac_city._id}>{postulant.nac_city.name}</option>}
                    </select>
                  </div>
                ) : (
                  <div className="profile-field-value">{postulant.nac_city?.name || '-'}</div>
                )}
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Dirección
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <input 
                      type="text" 
                      className="profile-field-input" 
                      value={editedData.address || ''} 
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Dirección"
                    />
                  </div>
                ) : (
                  <div className="profile-field-value">{postulant.address || '-'}</div>
                )}
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  País de residencia
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <select 
                      className="profile-field-input profile-field-select" 
                      value={editedData.residence_country || ''}
                      onChange={(e) => handleInputChange('residence_country', e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      {postulant.residence_country && <option value={postulant.residence_country._id}>{postulant.residence_country.name}</option>}
                    </select>
                  </div>
                ) : (
                  <div className="profile-field-value">{postulant.residence_country?.name || '-'}</div>
                )}
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Departamento de residencia
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <select 
                      className="profile-field-input profile-field-select" 
                      value={editedData.residence_department || ''}
                      onChange={(e) => handleInputChange('residence_department', e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      {postulant.residence_department && <option value={postulant.residence_department._id}>{postulant.residence_department.name}</option>}
                    </select>
                  </div>
                ) : (
                  <div className="profile-field-value">{postulant.residence_department?.name || '-'}</div>
                )}
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Ciudad de residencia
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <select 
                      className="profile-field-input profile-field-select" 
                      value={editedData.residence_city || ''}
                      onChange={(e) => handleInputChange('residence_city', e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      {postulant.residence_city && <option value={postulant.residence_city._id}>{postulant.residence_city.name}</option>}
                    </select>
                  </div>
                ) : (
                  <div className="profile-field-value">{postulant.residence_city?.name || '-'}</div>
                )}
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Página Web
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <input 
                      type="text" 
                      className="profile-field-input" 
                      value={editedData.website_url || ''} 
                      onChange={(e) => handleInputChange('website_url', e.target.value)}
                      placeholder="http://www.example.com"
                    />
                  </div>
                ) : (
                  <div className="profile-field-value">{postulant.website_url || '-'}</div>
                )}
              </div>
            </div>
        </div>
          </div>
        )}

        {activeTab === 'informacion-academica' && (
          <div className="profile-tab-content academic-tab">
            <div className="academic-warning-banner">
              Atención! La Universidad del Rosario no se hace responsable de la veracidad de la información ingresada en relación a los estudios o experiencia externos a la institución relacionados por el postulante.
            </div>

            {/* Resumen: correo institucional, código del estudiante, PIDM, SSC semestres según créditos */}
            <div className="profile-section profile-section-contact">
              <div className="academic-summary-row">
                <div className="profile-contact-info academic-summary-contact">
                  <div className="contact-item">
                    <div className="contact-icon-wrapper">
                      <FiMail className="contact-icon" />
                    </div>
                    <span className="contact-text" title="Correo institucional">
                      {profileData?.postulantProfile?.academicUser ?? postulant?.user?.email ?? '—'}
                    </span>
                  </div>
                  <div className="contact-item">
                    <div className="contact-icon-wrapper">
                      <FiUser className="contact-icon" />
                    </div>
                    <span className="contact-text" title="Código del estudiante">
                      {profileData?.postulantProfile?.studentCode ?? postulant?.identity_postulant ?? '—'}
                    </span>
                  </div>
                  <div className="contact-item">
                    <div className="contact-icon-wrapper">
                      <FiGrid className="contact-icon" />
                    </div>
                    <span className="contact-text" title="PIDM">
                      {profileData?.postulantProfile?.academicId != null ? String(profileData.postulantProfile.academicId) : (postulant?.identity_postulant ?? '—')}
                    </span>
                  </div>
                  <div className="contact-item">
                    <div className="contact-icon-wrapper">
                      <FiBook className="contact-icon" />
                    </div>
                    <span className="contact-text" title="SSC semestres según créditos aprobados (calculado)">
                      {(() => {
                        const ssc = getSscSemestersFromCredits(profileData);
                        if (ssc != null) return String(ssc);
                        return '—';
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rosario - En curso: programFacultyId presente (se registra automáticamente, sin botón Agregar) */}
            <section className="academic-section">
              <div className="section-title-row">
                <h3 className="academic-section-title">Formación académica Rosario - En curso</h3>
              </div>
              {(() => {
                const rosarioEnCurso = (profileData?.enrolledPrograms || []).filter((ep) => ep.programFacultyId != null);
                return rosarioEnCurso.length > 0 ? (
                  <ul className="academic-list academic-list-cards">
                    {rosarioEnCurso.map((ep) => (
                      <li key={ep._id} className="academic-list-item">
                        <span className="academic-item-icon academic-item-check"><FiCheck /></span>
                        <span>{ep.programId?.name || ep.programId?.code || 'Programa'}</span>
                        {(ep.programFacultyId?.facultyId?.name || ep.programFacultyId?.name) && <span> — {ep.programFacultyId?.facultyId?.name || ep.programFacultyId?.name}</span>}
                        {(ep.cityId?.name || ep.countryId?.name) && (
                          <span> ({[ep.cityId?.name, ep.countryId?.name].filter(Boolean).join(', ')})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="academic-empty">
                    <FiXCircle className="academic-empty-icon" />
                    <span>No tiene formación en curso en la Universidad del Rosario.</span>
                  </div>
                );
              })()}
            </section>

            {/* En curso - Registrada: programFacultyId null. Tabla con Programa, Universidad, País, Departamento, Ciudad, Acciones. */}
            <section className="academic-section">
              <div className="section-title-row">
                <h3 className="academic-section-title">Formación académica en curso - Registrada</h3>
                {isEditing && (
                  <span className="section-actions">
                    <button type="button" className="section-action-btn section-action-add-only" onClick={() => { setEditingEnrolledId(null); setProgramasEnCursoFormData({ programa: '', institucion: '', pais: '', departamento: '', ciudad: '' }); setProgramasEnCursoModalOpen(true); }} title="Agregar"><FiPlus /></button>
                  </span>
                )}
              </div>
              {(() => {
                const enCursoRegistrada = (profileData?.enrolledPrograms || []).filter((ep) => ep.programFacultyId == null);
                return enCursoRegistrada.length > 0 ? (
                  <div className="exp-table-wrap academic-table-wrap">
                    <table className="exp-table academic-table">
                      <thead>
                        <tr>
                          <th>Programa</th>
                          <th>Universidad</th>
                          <th>País</th>
                          <th>Departamento</th>
                          <th>Ciudad</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enCursoRegistrada.map((ep) => {
                          const isOptionsOpen = academicEnCursoRegistradaOptionsId === ep._id;
                          return (
                            <tr key={ep._id}>
                              <td>
                                <span className="academic-item-icon academic-item-check"><FiCheck /></span>
                                {ep.programId?.name || ep.programId?.code || '—'}
                              </td>
                              <td>{ep.university?.value || ep.university?.description || ep.anotherUniversity || '—'}</td>
                              <td>{ep.countryId?.name ?? '—'}</td>
                              <td>{ep.stateId?.name ?? '—'}</td>
                              <td>{ep.cityId?.name ?? '—'}</td>
                              <td>
                                {isEditing && (
                                  <div className="academic-row-actions" ref={academicEnCursoRegistradaOptionsId === ep._id ? academicOptionsAnchorRef : undefined}>
                                    <button
                                      type="button"
                                      className="perfil-opciones-btn"
                                      onClick={() => setAcademicEnCursoRegistradaOptionsId(isOptionsOpen ? null : ep._id)}
                                      title="Opciones"
                                    >
                                      Opciones <FiMoreVertical />
                                    </button>
                                    {isOptionsOpen && (
                                      <>
                                        <div className="perfil-opciones-backdrop" onClick={() => setAcademicEnCursoRegistradaOptionsId(null)} />
                                        <div
                                          className={`perfil-opciones-menu perfil-opciones-menu--fixed${academicOptionsMenuAbove ? ' perfil-opciones-menu--above' : ''}`}
                                          style={academicOptionsMenuFixed ? { position: 'fixed', zIndex: 11, ...academicOptionsMenuFixed } : undefined}
                                        >
                                          <button type="button" onClick={() => {
                                            setAcademicEnCursoRegistradaOptionsId(null);
                                            setEditingEnrolledId(ep._id);
                                            setProgramasEnCursoFormData({
                                              programa: ep.programId?._id || ep.programId || '',
                                              institucion: ep.university?._id || ep.university || '',
                                              pais: ep.countryId?._id || ep.countryId || '',
                                              departamento: ep.stateId?._id || ep.stateId || '',
                                              ciudad: ep.cityId?._id || ep.cityId || '',
                                            });
                                            setProgramasEnCursoModalOpen(true);
                                          }}>Editar</button>
                                          <button type="button" onClick={() => handleDeleteEnrolledProgram(ep._id)}>Eliminar</button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="academic-empty">
                    <FiXCircle className="academic-empty-icon" />
                    <span>No tiene formación en curso registrada (otras instituciones).</span>
                  </div>
                );
              })()}
            </section>

            <section className="academic-section">
              <div className="section-title-row">
                <h3 className="academic-section-title">Formación académica Rosario - Finalizada</h3>
                {isEditing && (
                  <span className="section-actions">
                    <button type="button" className="section-action-btn section-action-add-only" onClick={() => { setEditingGraduateId(null); setProgramasFinalizadosFormData({ programa: '', tituloFormacion: '', fechaObtencion: '', institucion: '', pais: '', departamento: '', ciudad: '' }); setProgramasFinalizadosModalOpen(true); }} title="Agregar"><FiPlus /></button>
                  </span>
                )}
              </div>
              {profileData?.graduatePrograms?.length > 0 ? (
                <>
                  <p className="academic-subtitle academic-subtitle--above-table">Formación académica Finalizada - Registrada</p>
                  <div className="exp-table-wrap academic-table-wrap">
                    <table className="exp-table academic-table">
                      <thead>
                        <tr>
                          <th>Programa</th>
                          <th>Título</th>
                          <th>Fecha de finalización</th>
                          <th>Universidad</th>
                          <th>País</th>
                          <th>Departamento</th>
                          <th>Ciudad</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profileData.graduatePrograms.map((gp) => {
                          const isOptionsOpen = academicFinalizadaOptionsId === gp._id;
                          return (
                            <tr key={gp._id}>
                              <td>{gp.programId?.name || gp.programId?.code || '—'}</td>
                              <td>{gp.title || '—'}</td>
                              <td>{gp.endDate ? formatDate(gp.endDate) : '—'}</td>
                              <td>{gp.university?.value || gp.university?.description || gp.anotherUniversity || '—'}</td>
                              <td>{gp.countryId?.name ?? '—'}</td>
                              <td>{gp.stateId?.name ?? '—'}</td>
                              <td>{gp.cityId?.name ?? '—'}</td>
                              <td>
                                {isEditing && (
                                  <div className="academic-row-actions" ref={isOptionsOpen ? academicOptionsAnchorRef : undefined}>
                                    <button
                                      type="button"
                                      className="perfil-opciones-btn"
                                      onClick={() => setAcademicFinalizadaOptionsId(isOptionsOpen ? null : gp._id)}
                                      title="Opciones"
                                    >
                                      Opciones <FiMoreVertical />
                                    </button>
                                    {isOptionsOpen && (
                                      <>
                                        <div className="perfil-opciones-backdrop" onClick={() => setAcademicFinalizadaOptionsId(null)} />
                                        <div
                                          className={`perfil-opciones-menu perfil-opciones-menu--fixed${academicOptionsMenuAbove ? ' perfil-opciones-menu--above' : ''}`}
                                          style={academicOptionsMenuFixed ? { position: 'fixed', zIndex: 11, ...academicOptionsMenuFixed } : undefined}
                                        >
                                          <button type="button" onClick={() => {
                                            setAcademicFinalizadaOptionsId(null);
                                            setEditingGraduateId(gp._id);
                                            setProgramasFinalizadosFormData({
                                              programa: gp.programId?._id || gp.programId || '',
                                              tituloFormacion: gp.title || '',
                                              fechaObtencion: gp.endDate ? (typeof gp.endDate === 'string' ? gp.endDate.slice(0, 10) : new Date(gp.endDate).toISOString().slice(0, 10)) : '',
                                              institucion: gp.university?._id || gp.university || '',
                                              pais: gp.countryId?._id || gp.countryId || '',
                                              departamento: gp.stateId?._id || gp.stateId || '',
                                              ciudad: gp.cityId?._id || gp.cityId || '',
                                            });
                                            setProgramasFinalizadosModalOpen(true);
                                          }}>Editar</button>
                                          <button type="button" onClick={() => handleDeleteGraduateProgram(gp._id)}>Eliminar</button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="academic-empty">
                  <FiXCircle className="academic-empty-icon" />
                  <span>No tiene formación finalizada registrada.</span>
                </div>
              )}
            </section>

            <section className="academic-section">
              <div className="section-title-row">
                <h3 className="academic-section-title">Otros Estudios</h3>
                {isEditing && (
                  <span className="section-actions">
                    <button type="button" className="section-action-btn section-action-add-only" onClick={() => { setEditingOtherStudyId(null); setOtrosEstudiosFormData({ nombreEstudio: '', institucion: '', anio: '' }); setOtrosEstudiosModalOpen(true); }} title="Agregar"><FiPlus /></button>
                  </span>
                )}
              </div>
              <p className="academic-other-note">*Por favor agregue, si los tiene, el estudio, institución y año de realización*</p>
              {profileData?.otherStudies?.length > 0 ? (
                <div className="exp-table-wrap academic-table-wrap">
                  <table className="exp-table academic-table">
                    <thead>
                      <tr>
                        <th>Estudio</th>
                        <th>Institución</th>
                        <th>Año de realización</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profileData.otherStudies.map((os) => {
                        const isOptionsOpen = otherStudyOptionsId === os._id;
                        return (
                          <tr key={os._id}>
                            <td>{os.studyName || '—'}</td>
                            <td>{os.studyInstitution || '—'}</td>
                            <td>{os.studyYear ?? '—'}</td>
                            <td>
                              {isEditing && (
                                <div className="academic-row-actions" ref={isOptionsOpen ? academicOptionsAnchorRef : undefined}>
                                  <button
                                    type="button"
                                    className="perfil-opciones-btn"
                                    onClick={() => setOtherStudyOptionsId(isOptionsOpen ? null : os._id)}
                                    title="Opciones"
                                  >
                                    Opciones <FiMoreVertical />
                                  </button>
                                  {isOptionsOpen && (
                                    <>
                                      <div className="perfil-opciones-backdrop" onClick={() => setOtherStudyOptionsId(null)} />
                                      <div
                                        className={`perfil-opciones-menu perfil-opciones-menu--fixed${academicOptionsMenuAbove ? ' perfil-opciones-menu--above' : ''}`}
                                        style={academicOptionsMenuFixed ? { position: 'fixed', zIndex: 11, ...academicOptionsMenuFixed } : undefined}
                                      >
                                        <button type="button" onClick={() => {
                                          setOtherStudyOptionsId(null);
                                          setEditingOtherStudyId(os._id);
                                          setOtrosEstudiosFormData({
                                            nombreEstudio: os.studyName || '',
                                            institucion: os.studyInstitution || '',
                                            anio: os.studyYear != null ? String(os.studyYear) : '',
                                          });
                                          setOtrosEstudiosModalOpen(true);
                                        }}>Editar</button>
                                        <button type="button" onClick={() => handleDeleteOtherStudy(os._id)}>Eliminar</button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="academic-empty">
                  <FiXCircle className="academic-empty-icon" />
                  <span>No hay otros estudios registrados.</span>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'perfil' && (
          <div className="profile-tab-content perfil-tab">
            {loadingProfileData && (
              <div className="perfil-profile-data-loading-overlay" aria-busy="true">
                <div className="perfil-profile-data-loading-box">
                  <div className="loading-spinner" />
                  <span>Cargando perfil…</span>
                </div>
              </div>
            )}
            <div className="perfil-warning-banner">
              ¡Atención! Recuerda que para generar tu hoja de vida necesitas crear y seleccionar un perfil, esto te permitirá aplicar a las oportunidades. La Universidad del Rosario no se hace responsable de la veracidad de la información ingresada en relación a los estudios o experiencia externos a la institución relacionados por el postulante.
            </div>

            {/* Perfil Profesional: texto esencial del perfil, ubicado arriba para mayor visibilidad */}
            {(() => {
              const displayText = profileData?.selectedProfileVersion?.profileText ?? profileData?.postulantProfile?.profileText;
              const displayName = profileData?.selectedProfileVersion?.profileName;
              const hasAnyText = displayText && String(displayText).trim().length > 0;
              if (!hasAnyText) return null;
              return (
                <div className="perfil-extra-block perfil-profesional-top">
                  <h4 className="perfil-block-title">Perfil Profesional{displayName ? ` — ${displayName}` : ''}</h4>
                  <div className="perfil-field-value profile-text-block">{displayText}</div>
                </div>
              );
            })()}

            <div className="perfil-two-columns">
              <div className="perfil-column perfil-column-left">
                <div className="perfil-block perfil-block-profesional">
                  <div className="section-title-row">
                    <h4 className="perfil-block-title">Perfil profesional</h4>
                    {isEditing && (
                      <span className="section-actions">
                        <button type="button" className="section-action-btn section-action-add-only" onClick={handleCreateProfile} title="Agregar"><FiPlus /></button>
                      </span>
                    )}
                  </div>
                  <p className="perfil-block-note">*Puede crear hasta 5 versiones diferentes de su perfil</p>
                  {loadingProfiles ? (
                    <div className="perfil-profile-list-loading">Cargando perfiles...</div>
                  ) : profiles.length > 0 ? (
                    <ul className="perfil-profile-list">
                      {profiles.map((profile, index) => {
                        const isVersion = profile.type === 'version';
                        const profileNameStr = (profile.profileName && String(profile.profileName).trim()) || (profile.studentCode && String(profile.studentCode).trim());
                        const fallbackText = (profile.profileText && String(profile.profileText).trim()) || profileNameStr;
                        const label = (profileNameStr || fallbackText)
                          ? (profileNameStr || fallbackText).slice(0, 50) + ((profileNameStr || fallbackText).length > 50 ? '…' : '')
                          : (profile.createdAt || profile.dateCreation ? new Date(profile.createdAt || profile.dateCreation).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : null)
                          || (isVersion ? `Versión ${index}` : `Hoja de vida ${index + 1}`);
                        const isOptionsOpen = profileOptionsOpenId === profile._id;
                        const profileIdStr = profile._id != null ? String(profile._id) : '';
                        const currentVersionId = profileData?.selectedProfileVersion?._id != null ? String(profileData.selectedProfileVersion._id) : null;
                        const isSelectedForView = profileIdStr !== '' && (currentVersionId === profileIdStr || (selectedProfileIdForView != null && String(selectedProfileIdForView) === profileIdStr));
                        const baseProfileId = profile.profileId || profile._id;
                        const versionId = profile.versionId || null;
                        const profileKey = profile._id ?? `${profile.profileId ?? 'p'}-${profile.versionId ?? index}`;
                        const handleSelectProfile = () => {
                          if (isSelectedForView) return; // ya está seleccionado
                          setSelectedProfileIdForView(profile._id);
                          setProfileData(null);
                          setLoadingProfileData(true);
                          const postulantId = postulant._id?.toString?.() ?? postulant._id;
                          loadProfileDataForProfile(postulantId, baseProfileId, versionId).finally(() => setLoadingProfileData(false));
                        };
                        return (
                          <li
                            key={profileKey}
                            role="button"
                            tabIndex={0}
                            className={`perfil-profile-item ${isSelectedForView ? 'perfil-profile-item-selected' : ''}`}
                            onClick={handleSelectProfile}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectProfile(); } }}
                            title="Seleccionar y ver este perfil"
                          >
                            <span className="perfil-profile-item-check"><FiCheck /></span>
                            <span className="perfil-profile-item-name">
                              {label}
                              {isSelectedForView && <span className="perfil-profile-item-active-badge"></span>}
                            </span>
                            <div className="perfil-profile-item-actions" onClick={(e) => e.stopPropagation()}>
                             
                              {isEditing && (
                                <>
                                  <button
                                    type="button"
                                    className="perfil-profile-item-action-icon perfil-profile-item-action-edit"
                                    onClick={() => handleEditProfile(profile)}
                                    title="Editar"
                                  >
                                    <FiEdit />
                                  </button>
                                  <button
                                    type="button"
                                    className="perfil-profile-item-action-icon perfil-profile-item-action-delete"
                                    onClick={() => handleDeleteProfile(profile)}
                                    title="Eliminar"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="perfil-profile-list-empty">No hay perfiles creados.</div>
                  )}
                </div>

                <div className="perfil-block">
                  <div className="section-title-row">
                    <h4 className="perfil-block-title">Habilidades técnicas y de software</h4>
                    {isEditing && <FiEdit className="field-edit-icon" style={{ marginLeft: '8px' }} />}
                  </div>
                  {isEditing ? (
                    <>
                      <textarea
                        className="form-control perfil-skills-textarea"
                        value={profileEditFields.skillsTechnicalSoftware}
                        onChange={e => handleProfileFieldChange('skillsTechnicalSoftware', e.target.value.slice(0, 512))}
                        placeholder="Escriba sus habilidades técnicas y de software"
                        rows={3}
                        maxLength={512}
                      />
                      <div className="perfil-field-char-count">Caracteres restantes: {512 - (profileEditFields.skillsTechnicalSoftware || '').length}</div>
                    </>
                  ) : (
                    <div className="perfil-field-value">{profileData?.postulantProfile?.skillsTechnicalSoftware || '—'}</div>
                  )}
                </div>

                <div className="perfil-block">
                  <h4 className="perfil-block-title">¿Se encuentra en condición de discapacidad?</h4>
                  {isEditing ? (
                    <div className="perfil-switch-row">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={profileEditFields.conditionDiscapacity}
                        className={`form-modal-toggle ${profileEditFields.conditionDiscapacity ? 'on' : ''}`}
                        onClick={() => handleProfileFieldChange('conditionDiscapacity', !profileEditFields.conditionDiscapacity)}
                      >
                        <span className="form-modal-toggle-thumb" />
                      </button>
                    </div>
                  ) : (
                    <span className={`perfil-sino-badge ${profileData?.postulantProfile?.conditionDiscapacity ? 'sino-si' : 'sino-no'}`}>
                      {profileData?.postulantProfile?.conditionDiscapacity ? 'Sí' : 'No'}
                    </span>
                  )}
                </div>

                <div className="perfil-block">
                  <h4 className="perfil-block-title">¿Tengo mi propia empresa?</h4>
                  {isEditing ? (
                    <div className="perfil-switch-row">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={profileEditFields.haveBusiness}
                        className={`form-modal-toggle ${profileEditFields.haveBusiness ? 'on' : ''}`}
                        onClick={() => handleProfileFieldChange('haveBusiness', !profileEditFields.haveBusiness)}
                      >
                        <span className="form-modal-toggle-thumb" />
                      </button>
                    </div>
                  ) : (
                    <span className={`perfil-sino-badge ${profileData?.postulantProfile?.haveBusiness ? 'sino-si' : 'sino-no'}`}>
                      {profileData?.postulantProfile?.haveBusiness ? 'Sí' : 'No'}
                    </span>
                  )}
                </div>

                <div className="perfil-block">
                  <h4 className="perfil-block-title">Años de experiencia</h4>
                  <div className="perfil-field-value">
                    {getDisplayYearsExperience(profileData)}
                  </div>
                </div>

                <div className="perfil-block">
                  <div className="section-title-row">
                    <h4 className="perfil-block-title">Otros documentos de soporte</h4>
                    {isEditing && (
                      <span className="section-actions">
                        <button type="button" className="section-action-btn section-action-add-only" onClick={() => showFuncionalidadEnDesarrollo('Otros documentos de soporte')} title="Agregar"><FiPlus /></button>
                      </span>
                    )}
                  </div>
                  <p className="perfil-block-desc">Puede ingresar hasta 5 archivos de Soporte, según su necesidad. El tamaño máximo de cada archivo es de 5Mb. Se permiten las siguientes extensiones: .doc, .docx, .xls, .xlsx, .pdf, .jpg, .jpeg y .png</p>
                  {profileData?.profileSupports?.length > 0 ? (
                    <ul className="perfil-doc-list">
                      {profileData.profileSupports.map((item) => {
                        const att = item.attachmentId;
                        const name = att?.name || 'Documento';
                        return (
                          <li key={item._id} className="perfil-doc-item">
                            <span className="perfil-doc-icon"><FiFile /></span>
                            <button type="button" className="perfil-doc-link" onClick={() => handleDownloadAttachment(att?._id, name)} title="Descargar">
                              {name}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="perfil-field-value perfil-field-empty">—</div>
                  )}
                </div>
              </div>

              <div className="perfil-column perfil-column-right">
                <div className="perfil-block">
                  <div className="section-title-row">
                    <h4 className="perfil-block-title">Áreas de Interés</h4>
                    {isEditing && (
                      <span className="section-actions">
                        <button type="button" className="section-action-btn section-action-add-only" onClick={() => { setInterestAreaFormData({ area: '' }); setInterestAreaModalOpen(true); }} title="Agregar"><FiPlus /></button>
                      </span>
                    )}
                  </div>
                  {profileData?.interestAreas?.length > 0 ? (
                    <ul className="perfil-tag-list">
                      {profileData.interestAreas.map((ia) => (
                        <li key={ia._id} className="perfil-tag-item">
                          <span className="perfil-check-icon"><FiCheck /></span>
                          <span className="perfil-tag-item-text">{ia.area?.name ?? ia.area?.value ?? '—'}</span>
                          {isEditing && (
                            <button type="button" className="perfil-tag-item-delete" onClick={() => handleDeleteInterestArea(ia._id)} title="Eliminar" aria-label="Eliminar"><FiX /></button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="perfil-field-value perfil-field-empty">—</div>
                  )}
                </div>

                <div className="perfil-block">
                  <div className="section-title-row">
                    <h4 className="perfil-block-title">Competencias (Habilidades e intereses)</h4>
                    {isEditing && (
                      <span className="section-actions">
                        <button type="button" className="section-action-btn section-action-add-only" onClick={() => { setSkillFormData({ skillId: '', experienceYears: '' }); setSkillModalOpen(true); }} title="Agregar"><FiPlus /></button>
                      </span>
                    )}
                  </div>
                  {profileData?.skills?.length > 0 ? (
                    <ul className="perfil-tag-list">
                      {profileData.skills.map((s) => (
                        <li key={s._id} className="perfil-tag-item">
                          <span className="perfil-check-icon"><FiCheck /></span>
                          <span className="perfil-tag-item-text">{s.skillId?.name || '—'}</span>
                          {isEditing && (
                            <button type="button" className="perfil-tag-item-delete" onClick={() => handleDeleteSkill(s._id)} title="Eliminar" aria-label="Eliminar"><FiX /></button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="perfil-field-value perfil-field-empty">—</div>
                  )}
                </div>

                <div className="perfil-block">
                  <div className="section-title-row">
                    <h4 className="perfil-block-title">Idiomas</h4>
                    {isEditing && (
                      <span className="section-actions">
                        <button type="button" className="section-action-btn section-action-add-only" onClick={() => { setLanguageFormData({ language: '', level: '', certificationExam: false, certificationExamName: '' }); setLanguageModalOpen(true); }} title="Agregar"><FiPlus /></button>
                      </span>
                    )}
                  </div>
                  {profileData?.languages?.length > 0 ? (
                    <ul className="perfil-lang-list">
                      {profileData.languages.map((l) => (
                        <li key={l._id} className="perfil-lang-item">
                          <span>{l.language?.name ?? l.language?.value ?? '—'}</span>
                          <span className="perfil-lang-level">{l.level?.name ?? l.level?.value ?? '—'}</span>
                          <span className={`perfil-cert-badge ${l.certificationExam ? 'certified' : ''}`}>
                            {l.certificationExam ? (l.certificationExamName || 'Certificado') : 'No Certificado'}
                          </span>
                          {isEditing && (
                            <button type="button" className="perfil-tag-item-delete" onClick={() => handleDeleteLanguage(l._id)} title="Eliminar" aria-label="Eliminar"><FiX /></button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="perfil-field-value perfil-field-empty">—</div>
                  )}
                </div>

                <div className="perfil-block">
                  <h4 className="perfil-block-title">Independiente</h4>
                  {isEditing ? (
                    <div className="perfil-switch-row">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={profileEditFields.independent}
                        className={`form-modal-toggle ${profileEditFields.independent ? 'on' : ''}`}
                        onClick={() => handleProfileFieldChange('independent', !profileEditFields.independent)}
                      >
                        <span className="form-modal-toggle-thumb" />
                      </button>
                    </div>
                  ) : (
                    <span className={`perfil-sino-badge ${profileData?.postulantProfile?.independent ? 'sino-si' : 'sino-no'}`}>
                      {profileData?.postulantProfile?.independent ? 'Sí' : 'No'}
                    </span>
                  )}
                </div>

                <div className="perfil-block">
                  <h4 className="perfil-block-title">Empleado</h4>
                  {isEditing ? (
                    <div className="perfil-switch-row">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={profileEditFields.employee}
                        className={`form-modal-toggle ${profileEditFields.employee ? 'on' : ''}`}
                        onClick={() => handleProfileFieldChange('employee', !profileEditFields.employee)}
                      >
                        <span className="form-modal-toggle-thumb" />
                      </button>
                    </div>
                  ) : (
                    <span className={`perfil-sino-badge ${profileData?.postulantProfile?.employee ? 'sino-si' : 'sino-no'}`}>
                      {profileData?.postulantProfile?.employee ? 'Sí' : 'No'}
                    </span>
                  )}
                </div>

                <div className="perfil-block">
                  <h4 className="perfil-block-title">Tiempo total de experiencia laboral (En meses)</h4>
                  {isEditing ? (
                    <div className="profile-field-input-wrapper">
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        className="profile-field-input"
                        value={profileEditFields.totalTimeExperience}
                        onChange={e => handleProfileFieldChange('totalTimeExperience', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  ) : (
                    <div className="perfil-field-value">{profileData?.postulantProfile?.totalTimeExperience != null ? String(profileData.postulantProfile.totalTimeExperience) : '0.0'}</div>
                  )}
                </div>

                <div className="perfil-block">
                  <div className="section-title-row">
                    <h4 className="perfil-block-title">Hojas de vida</h4>
                    {isEditing && (
                      <span className="section-actions">
                        <button type="button" className="section-action-btn section-action-add-only" onClick={() => setHojaDeVidaModalOpen(true)} title="Agregar"><FiPlus /></button>
                      </span>
                    )}
                  </div>
                  <p className="perfil-block-desc">Puede generar hasta 5 archivos de Hoja de Vida, según los diferentes perfiles que tenga. El tamaño máximo de cada archivo es de 5Mb.</p>
                  {profileData?.profileCvs?.length > 0 ? (
                    <ul className="perfil-doc-list">
                      {profileData.profileCvs.map((item) => {
                        const att = item.attachmentId;
                        const name = att?.name || 'Hoja de vida';
                        return (
                          <li key={item._id} className="perfil-doc-item">
                            <span className="perfil-doc-icon"><FiFile /></span>
                            <button type="button" className="perfil-doc-link" onClick={() => handleDownloadAttachment(att?._id, name)} title="Descargar">
                              {name}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="perfil-field-value perfil-field-empty">—</div>
                  )}
                </div>
              </div>

            </div>
            </div>
        )}

      

        {activeTab === 'experiencia' && (
          <div className="profile-tab-content experiencia-tab">
            <div className="experiencia-warning-banner">
              ¡Atención! La Universidad del Rosario no se hace responsable de la veracidad de la información ingresada en relación a los estudios o experiencia externos a la institución relacionados por el postulante.
            </div>

            <section className="exp-section">
              <div className="section-title-row">
                <h3 className="exp-section-title">Experiencias Laborales</h3>
                {isEditing && (
                  <span className="section-actions">
                    <button type="button" className="section-action-btn section-action-add-only" onClick={() => { setEditingWorkExpId(null); setWorkExpFormData({ startDate: '', noEndDate: false, endDate: '', jobTitle: '', profession: '', companyName: '', companySector: '', contact: '', countryId: '', stateId: '', cityId: '', achievements: '' }); setWorkExpModalOpen(true); }} title="Agregar"><FiPlus /></button>
                  </span>
                )}
              </div>
              <div className="exp-table-wrap">
                <table className="exp-table">
                  <thead>
                    <tr>
                      <th>Fecha de inicio</th>
                      <th>Fecha de finalización</th>
                      <th>Cargo</th>
                      <th>Empresa</th>
                      <th>Sector</th>
                      <th>Contacto</th>
                      <th>Profesión</th>
                      <th>País</th>
                      <th>Departamento</th>
                      <th>Ciudad</th>
                      {isEditing && <th>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {profileData?.workExperiences?.filter((w) => (w.experienceType || 'JOB_EXP') === 'JOB_EXP').length > 0 ? (
                      profileData.workExperiences.filter((w) => (w.experienceType || 'JOB_EXP') === 'JOB_EXP').map((w, wi) => {
                        const isOptionsOpen = expLaboralOptionsId === w._id;
                        return (
                          <tr key={w._id ?? `job-${wi}`}>
                            <td>{w.startDate ? formatDate(w.startDate) : '—'}</td>
                            <td>{w.noEndDate ? 'Actualidad' : (w.endDate ? formatDate(w.endDate) : '—')}</td>
                            <td>{w.jobTitle || '—'}</td>
                            <td>{w.companyName || '—'}</td>
                            <td>{w.companySector?.name ?? w.companySector?.value ?? '—'}</td>
                            <td>{w.contact || '—'}</td>
                            <td>{w.profession || '—'}</td>
                            <td>{w.countryId?.name ?? '—'}</td>
                            <td>{w.stateId?.name ?? '—'}</td>
                            <td>{w.cityId?.name ?? '—'}</td>
                            {isEditing && (
                              <td>
                                <div className="academic-row-actions" ref={expLaboralOptionsId === w._id ? expOptionsAnchorRef : undefined}>
                                  <button type="button" className="perfil-opciones-btn" onClick={() => setExpLaboralOptionsId(isOptionsOpen ? null : w._id)} title="Opciones">Opciones <FiMoreVertical /></button>
                                  {isOptionsOpen && (
                                    <>
                                      <div className="perfil-opciones-backdrop" onClick={() => setExpLaboralOptionsId(null)} />
                                      <div
                                        className={`perfil-opciones-menu perfil-opciones-menu--fixed${expOptionsMenuAbove ? ' perfil-opciones-menu--above' : ''}`}
                                        style={expOptionsMenuFixed ? { position: 'fixed', zIndex: 11, ...expOptionsMenuFixed } : undefined}
                                      >
                                        <button type="button" onClick={() => {
                                          setExpLaboralOptionsId(null);
                                          setEditingWorkExpId(w._id);
                                          setWorkExpFormData({
                                            startDate: w.startDate ? (typeof w.startDate === 'string' ? w.startDate.slice(0, 10) : new Date(w.startDate).toISOString().slice(0, 10)) : '',
                                            noEndDate: !!w.noEndDate,
                                            endDate: w.endDate ? (typeof w.endDate === 'string' ? w.endDate.slice(0, 10) : new Date(w.endDate).toISOString().slice(0, 10)) : '',
                                            jobTitle: w.jobTitle || '',
                                            profession: w.profession || '',
                                            companyName: w.companyName || '',
                                            companySector: w.companySector?._id || w.companySector || '',
                                            contact: w.contact || '',
                                            countryId: w.countryId?._id || w.countryId || '',
                                            stateId: w.stateId?._id || w.stateId || '',
                                            cityId: w.cityId?._id || w.cityId || '',
                                            achievements: w.achievements || '',
                                          });
                                          setWorkExpModalOpen(true);
                                        }}>Editar</button>
                                        <button type="button" onClick={() => handleDeleteWorkExperience(w._id)}>Eliminar</button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={isEditing ? 11 : 10} className="exp-table-empty">No hay experiencias laborales registradas.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="exp-section">
              <div className="section-title-row">
                <h3 className="exp-section-title">Otras Experiencias</h3>
                {isEditing && (
                  <span className="section-actions">
                    <button type="button" className="section-action-btn section-action-add-only" onClick={() => { setEditingOtherExpId(null); setOtherExpFormData({ experienceType: '', startDate: '', noEndDate: false, endDate: '', jobTitle: '', investigationLine: '', companyName: '', course: '', countryId: '', stateId: '', cityId: '', activities: '' }); setOtherExpModalOpen(true); }} title="Agregar"><FiPlus /></button>
                  </span>
                )}
              </div>
              <div className="exp-table-wrap">
                <table className="exp-table">
                  <thead>
                    <tr>
                      <th>Tipo de Experiencia</th>
                      <th>Fecha de inicio</th>
                      <th>Fecha de finalización</th>
                      <th>Nombre</th>
                      <th>Institución</th>
                      <th>Investigación</th>
                      <th>Asignatura</th>
                      <th>País</th>
                      <th>Departamento</th>
                      <th>Ciudad</th>
                      {isEditing && <th>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {profileData?.workExperiences?.filter((w) => (w.experienceType || 'JOB_EXP') !== 'JOB_EXP').length > 0 ? (
                      profileData.workExperiences.filter((w) => (w.experienceType || 'JOB_EXP') !== 'JOB_EXP').map((w, wi) => {
                        const isOptionsOpen = otrasExpOptionsId === w._id;
                        const expTypeRaw = w.experienceType;
                        const expTypeId = typeof expTypeRaw === 'object' ? expTypeRaw?._id : expTypeRaw;
                        const expTypeOption = experienceTypeOptions.find((o) => o._id === expTypeId);
                        const expTypeLabel = (typeof expTypeRaw === 'object' && (expTypeRaw?.value ?? expTypeRaw?.name ?? expTypeRaw?.description))
                          ? (expTypeRaw.value || expTypeRaw.name || expTypeRaw.description)
                          : (expTypeOption?.value || expTypeOption?.name || expTypeOption?.description || expTypeId || '—');
                        return (
                          <tr key={w._id ?? `other-${wi}`}>
                            <td>{expTypeLabel}</td>
                            <td>{w.startDate ? formatDate(w.startDate) : '—'}</td>
                            <td>{w.noEndDate ? 'Actualidad' : (w.endDate ? formatDate(w.endDate) : '—')}</td>
                            <td>{w.jobTitle || w.companyName || '—'}</td>
                            <td>{w.companyName || '—'}</td>
                            <td>{w.investigationLine || '—'}</td>
                            <td>{w.course || '—'}</td>
                            <td>{w.countryId?.name ?? '—'}</td>
                            <td>{w.stateId?.name ?? '—'}</td>
                            <td>{w.cityId?.name ?? '—'}</td>
                            {isEditing && (
                              <td>
                                <div className="academic-row-actions" ref={otrasExpOptionsId === w._id ? expOptionsAnchorRef : undefined}>
                                  <button type="button" className="perfil-opciones-btn" onClick={() => setOtrasExpOptionsId(isOptionsOpen ? null : w._id)} title="Opciones">Opciones <FiMoreVertical /></button>
                                  {isOptionsOpen && (
                                    <>
                                      <div className="perfil-opciones-backdrop" onClick={() => setOtrasExpOptionsId(null)} />
                                      <div
                                        className={`perfil-opciones-menu perfil-opciones-menu--fixed${expOptionsMenuAbove ? ' perfil-opciones-menu--above' : ''}`}
                                        style={expOptionsMenuFixed ? { position: 'fixed', zIndex: 11, ...expOptionsMenuFixed } : undefined}
                                      >
                                        <button type="button" onClick={() => {
                                          setOtrasExpOptionsId(null);
                                          setEditingOtherExpId(w._id);
                                          setOtherExpFormData({
                                            experienceType: w.experienceType || '',
                                            startDate: w.startDate ? (typeof w.startDate === 'string' ? w.startDate.slice(0, 10) : new Date(w.startDate).toISOString().slice(0, 10)) : '',
                                            noEndDate: !!w.noEndDate,
                                            endDate: w.endDate ? (typeof w.endDate === 'string' ? w.endDate.slice(0, 10) : new Date(w.endDate).toISOString().slice(0, 10)) : '',
                                            jobTitle: w.jobTitle || w.companyName || '',
                                            investigationLine: w.investigationLine || '',
                                            companyName: w.companyName || '',
                                            course: w.course || '',
                                            countryId: w.countryId?._id || w.countryId || '',
                                            stateId: w.stateId?._id || w.stateId || '',
                                            cityId: w.cityId?._id || w.cityId || '',
                                            activities: w.activities || '',
                                          });
                                          setOtherExpModalOpen(true);
                                        }}>Editar</button>
                                        <button type="button" onClick={() => handleDeleteWorkExperience(w._id)}>Eliminar</button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={isEditing ? 11 : 10} className="exp-table-empty">No hay otras experiencias registradas.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="exp-section">
              <div className="section-title-row">
                <h3 className="exp-section-title">Logros</h3>
                {isEditing && (
                  <span className="section-actions">
                    <button type="button" className="section-action-btn section-action-add-only" onClick={() => { setEditingAwardId(null); setAwardFormData({ awardType: '', awardDate: '', name: '', description: '' }); setAwardModalOpen(true); }} title="Agregar"><FiPlus /></button>
                  </span>
                )}
              </div>
              <div className="exp-table-wrap">
                <table className="exp-table">
                  <thead>
                    <tr>
                      <th>Tipo de Logro</th>
                      <th>Fecha</th>
                      <th>Nombre</th>
                      <th>Descripción</th>
                      {isEditing && <th>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {profileData?.awards?.length > 0 ? (
                      profileData.awards.map((a) => {
                        const isOptionsOpen = logrosOptionsId === a._id;
                        return (
                          <tr key={a._id}>
                            <td>{a.awardType?.name ?? a.awardType?.value ?? '—'}</td>
                            <td>{a.awardDate ? formatDate(a.awardDate) : '—'}</td>
                            <td>{a.name || '—'}</td>
                            <td>{a.description || '—'}</td>
                            {isEditing && (
                              <td>
                                <div className="academic-row-actions" ref={logrosOptionsId === a._id ? expOptionsAnchorRef : undefined}>
                                  <button type="button" className="perfil-opciones-btn" onClick={() => setLogrosOptionsId(isOptionsOpen ? null : a._id)} title="Opciones">Opciones <FiMoreVertical /></button>
                                  {isOptionsOpen && (
                                    <>
                                      <div className="perfil-opciones-backdrop" onClick={() => setLogrosOptionsId(null)} />
                                      <div
                                        className={`perfil-opciones-menu perfil-opciones-menu--fixed${expOptionsMenuAbove ? ' perfil-opciones-menu--above' : ''}`}
                                        style={expOptionsMenuFixed ? { position: 'fixed', zIndex: 11, ...expOptionsMenuFixed } : undefined}
                                      >
                                        <button type="button" onClick={() => {
                                          setLogrosOptionsId(null);
                                          setEditingAwardId(a._id);
                                          setAwardFormData({
                                            awardType: a.awardType?._id || a.awardType || '',
                                            awardDate: a.awardDate ? (typeof a.awardDate === 'string' ? a.awardDate.slice(0, 10) : new Date(a.awardDate).toISOString().slice(0, 10)) : '',
                                            name: a.name || '',
                                            description: a.description || '',
                                          });
                                          setAwardModalOpen(true);
                                        }}>Editar</button>
                                        <button type="button" onClick={() => handleDeleteAward(a._id)}>Eliminar</button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={isEditing ? 5 : 4} className="exp-table-empty">No hay logros registrados.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="exp-section">
              <div className="section-title-row">
                <h3 className="exp-section-title">Referencias</h3>
                {isEditing && (
                  <span className="section-actions">
                    <button type="button" className="section-action-btn section-action-add-only" onClick={() => { setEditingReferenceId(null); setReferenceFormData({ firstname: '', lastname: '', occupation: '', phone: '' }); setReferenceModalOpen(true); }} title="Agregar"><FiPlus /></button>
                  </span>
                )}
              </div>
              <div className="exp-table-wrap">
                <table className="exp-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Apellido</th>
                      <th>Ocupación</th>
                      <th>Teléfono</th>
                      {isEditing && <th>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {profileData?.references?.length > 0 ? (
                      profileData.references.map((r) => {
                        const isOptionsOpen = refsOptionsId === r._id;
                        return (
                          <tr key={r._id}>
                            <td>{r.firstname || '—'}</td>
                            <td>{r.lastname || '—'}</td>
                            <td>{r.occupation || '—'}</td>
                            <td>{r.phone || '—'}</td>
                            {isEditing && (
                              <td>
                                <div className="academic-row-actions" ref={refsOptionsId === r._id ? expOptionsAnchorRef : undefined}>
                                  <button type="button" className="perfil-opciones-btn" onClick={() => setRefsOptionsId(isOptionsOpen ? null : r._id)} title="Opciones">Opciones <FiMoreVertical /></button>
                                  {isOptionsOpen && (
                                    <>
                                      <div className="perfil-opciones-backdrop" onClick={() => setRefsOptionsId(null)} />
                                      <div
                                        className={`perfil-opciones-menu perfil-opciones-menu--fixed${expOptionsMenuAbove ? ' perfil-opciones-menu--above' : ''}`}
                                        style={expOptionsMenuFixed ? { position: 'fixed', zIndex: 11, ...expOptionsMenuFixed } : undefined}
                                      >
                                        <button type="button" onClick={() => {
                                          setRefsOptionsId(null);
                                          setEditingReferenceId(r._id);
                                          setReferenceFormData({ firstname: r.firstname || '', lastname: r.lastname || '', occupation: r.occupation || '', phone: r.phone || '' });
                                          setReferenceModalOpen(true);
                                        }}>Editar</button>
                                        <button type="button" onClick={() => handleDeleteReference(r._id)}>Eliminar</button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={isEditing ? 5 : 4} className="exp-table-empty">No hay referencias registradas.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Modal programas en curso (form group como Crear período) */}
      {programasEnCursoModalOpen && (
        <div className="form-modal-overlay" onClick={() => setProgramasEnCursoModalOpen(false)}>
          <div className="form-modal-content" onClick={e => e.stopPropagation()}>
            <div className="form-modal-header">
              <h3 className="form-modal-title">{editingEnrolledId ? 'Editar programa en curso' : 'Agregar programa en curso'}</h3>
              <button type="button" className="form-modal-close" onClick={() => setProgramasEnCursoModalOpen(false)} aria-label="Cerrar"><FiX /></button>
            </div>
            <div className="form-modal-body">
              <ProgramAllSelect
                id="pc-programa"
                value={programasEnCursoFormData.programa}
                onChange={(v) => setProgramasEnCursoFormData(prev => ({ ...prev, programa: v }))}
                label="Programa"
                required
                onError={showError}
              />
              <div className="form-floating mb-3">
                <select id="pc-institucion" value={programasEnCursoFormData.institucion} onChange={e => setProgramasEnCursoFormData(prev => ({ ...prev, institucion: e.target.value }))} className="form-select">
                  <option value="">Seleccione</option>
                  {institutionOptions.map((item) => (
                    <option key={item._id} value={item._id}>{item.value || item.description || item._id}</option>
                  ))}
                </select>
                <label htmlFor="pc-institucion">Institución</label>
              </div>
              <LocationSelectCascade
                idPrefix="pc"
                value={{
                  countryId: programasEnCursoFormData.pais,
                  stateId: programasEnCursoFormData.departamento,
                  cityId: programasEnCursoFormData.ciudad,
                }}
                onChange={({ countryId, stateId, cityId }) =>
                  setProgramasEnCursoFormData(prev => ({
                    ...prev,
                    pais: countryId,
                    departamento: stateId,
                    ciudad: cityId,
                  }))
                }
                onError={showError}
              />
            </div>
            <div className="form-modal-footer">
              <button type="button" className="form-modal-btn-cancel" onClick={() => { setProgramasEnCursoModalOpen(false); setEditingEnrolledId(null); }}>Descartar</button>
              <button type="button" className="form-modal-btn-save" onClick={handleSaveEnrolledProgram} disabled={savingAcademic}>{savingAcademic ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal programas finalizados */}
      {programasFinalizadosModalOpen && (
        <div className="form-modal-overlay" onClick={() => setProgramasFinalizadosModalOpen(false)}>
          <div className="form-modal-content" onClick={e => e.stopPropagation()}>
            <div className="form-modal-header">
              <h3 className="form-modal-title">{editingGraduateId ? 'Editar programa finalizado' : 'Agregar programa finalizado'}</h3>
              <button type="button" className="form-modal-close" onClick={() => setProgramasFinalizadosModalOpen(false)} aria-label="Cerrar"><FiX /></button>
            </div>
            <div className="form-modal-body">
              <ProgramAllSelect
                id="pf-programa"
                value={programasFinalizadosFormData.programa}
                onChange={(v) => setProgramasFinalizadosFormData(prev => ({ ...prev, programa: v }))}
                label="Programa"
                required
                onError={showError}
              />
              <div className="form-floating mb-3">
                <input
                  type="text"
                  id="pf-titulo"
                  value={programasFinalizadosFormData.tituloFormacion}
                  onChange={e => setProgramasFinalizadosFormData(prev => ({ ...prev, tituloFormacion: e.target.value }))}
                  className="form-control"
                  placeholder=" "
                />
                <label htmlFor="pf-titulo">Título formación académica</label>
              </div>
              <div className="form-floating mb-3">
                <input
                  type="date"
                  id="pf-fecha"
                  value={programasFinalizadosFormData.fechaObtencion || ''}
                  onChange={e => setProgramasFinalizadosFormData(prev => ({ ...prev, fechaObtencion: e.target.value }))}
                  className="form-control"
                />
                <label htmlFor="pf-fecha">Fecha de obtención de título</label>
              </div>
              <div className="form-floating mb-3">
                <select id="pf-institucion" value={programasFinalizadosFormData.institucion} onChange={e => setProgramasFinalizadosFormData(prev => ({ ...prev, institucion: e.target.value }))} className="form-select">
                  <option value="">Seleccione</option>
                  {institutionOptions.map((item) => (
                    <option key={item._id} value={item._id}>{item.value || item.description || item._id}</option>
                  ))}
                </select>
                <label htmlFor="pf-institucion">Institución</label>
              </div>
              <LocationSelectCascade
                idPrefix="pf"
                value={{
                  countryId: programasFinalizadosFormData.pais,
                  stateId: programasFinalizadosFormData.departamento,
                  cityId: programasFinalizadosFormData.ciudad,
                }}
                onChange={({ countryId, stateId, cityId }) =>
                  setProgramasFinalizadosFormData(prev => ({
                    ...prev,
                    pais: countryId,
                    departamento: stateId,
                    ciudad: cityId,
                  }))
                }
                onError={showError}
              />
            </div>
            <div className="form-modal-footer">
              <button type="button" className="form-modal-btn-cancel" onClick={() => { setProgramasFinalizadosModalOpen(false); setEditingGraduateId(null); }}>Descartar</button>
              <button type="button" className="form-modal-btn-save" onClick={handleSaveGraduateProgram} disabled={savingAcademic}>{savingAcademic ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Otros estudios */}
      {otrosEstudiosModalOpen && (
        <div className="form-modal-overlay" onClick={() => { setOtrosEstudiosModalOpen(false); setEditingOtherStudyId(null); }}>
          <div className="form-modal-content" onClick={e => e.stopPropagation()}>
            <div className="form-modal-header">
              <h3 className="form-modal-title">{editingOtherStudyId ? 'Editar otro estudio' : 'Agregar otro estudio'}</h3>
              <button type="button" className="form-modal-close" onClick={() => { setOtrosEstudiosModalOpen(false); setEditingOtherStudyId(null); }} aria-label="Cerrar"><FiX /></button>
            </div>
            <div className="form-modal-body">
              <div className="form-floating mb-3">
                <input type="text" id="oe-nombre" value={otrosEstudiosFormData.nombreEstudio} onChange={e => setOtrosEstudiosFormData(prev => ({ ...prev, nombreEstudio: e.target.value }))} className="form-control" placeholder=" " />
                <label htmlFor="oe-nombre">Nombre Estudio <span className="text-danger">*</span></label>
              </div>
              <div className="form-floating mb-3">
                <input type="text" id="oe-institucion" value={otrosEstudiosFormData.institucion} onChange={e => setOtrosEstudiosFormData(prev => ({ ...prev, institucion: e.target.value }))} className="form-control" placeholder=" " />
                <label htmlFor="oe-institucion">Institución donde realiza el Estudio <span className="text-danger">*</span></label>
              </div>
              <div className="form-floating mb-3">
                <input type="text" id="oe-anio" value={otrosEstudiosFormData.anio} onChange={e => setOtrosEstudiosFormData(prev => ({ ...prev, anio: e.target.value }))} className="form-control" placeholder=" " />
                <label htmlFor="oe-anio">Año del Estudio</label>
              </div>
            </div>
            <div className="form-modal-footer">
              <button type="button" className="form-modal-btn-cancel" onClick={() => { setOtrosEstudiosModalOpen(false); setEditingOtherStudyId(null); }}>Descartar</button>
              <button type="button" className="form-modal-btn-save" onClick={handleSaveOtherStudy} disabled={savingAcademic}>{savingAcademic ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Áreas de Interés (floating label) */}
      {interestAreaModalOpen && (
        <div className="form-modal-overlay" onClick={() => { setInterestAreaModalOpen(false); setInterestAreaFormData({ area: '' }); }}>
          <div className="form-modal-content" onClick={e => e.stopPropagation()}>
            <div className="form-modal-header">
              <h3 className="form-modal-title">Áreas de Interés</h3>
              <button type="button" className="form-modal-close" onClick={() => { setInterestAreaModalOpen(false); setInterestAreaFormData({ area: '' }); }} aria-label="Cerrar"><FiX /></button>
            </div>
            <div className="form-modal-body">
              <div className="form-floating mb-3">
                <select
                  id="ia-area"
                  value={interestAreaFormData.area}
                  onChange={e => setInterestAreaFormData(prev => ({ ...prev, area: e.target.value }))}
                  className="form-select"
                >
                  <option value="">Seleccione área de interés</option>
                  {areaOptions.map((item) => (
                    <option key={item._id} value={item._id}>{item.value || item.name || item.description || item._id}</option>
                  ))}
                </select>
                <label htmlFor="ia-area">Área de interés <span className="text-danger">*</span></label>
              </div>
            </div>
            <div className="form-modal-footer">
              <button type="button" className="form-modal-btn-cancel" onClick={() => { setInterestAreaModalOpen(false); setInterestAreaFormData({ area: '' }); }}>Cerrar</button>
              <button type="button" className="form-modal-btn-save" onClick={handleAddInterestArea} disabled={savingAcademic}>{savingAcademic ? 'Añadiendo...' : 'Añadir'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Competencia / Habilidad (floating labels) */}
      {skillModalOpen && (
        <div className="form-modal-overlay" onClick={() => { setSkillModalOpen(false); setSkillFormData({ skillId: '', experienceYears: '' }); }}>
          <div className="form-modal-content" onClick={e => e.stopPropagation()}>
            <div className="form-modal-header">
              <h3 className="form-modal-title">Competencia / Habilidad</h3>
              <button type="button" className="form-modal-close" onClick={() => { setSkillModalOpen(false); setSkillFormData({ skillId: '', experienceYears: '' }); }} aria-label="Cerrar"><FiX /></button>
            </div>
            <div className="form-modal-body">
              <div className="form-floating mb-3">
                <select
                  id="sk-skill"
                  value={skillFormData.skillId}
                  onChange={e => setSkillFormData(prev => ({ ...prev, skillId: e.target.value }))}
                  className="form-select"
                >
                  <option value="">Seleccione competencia y/o habilidad</option>
                  {skillOptions.map((s) => (
                    <option key={s._id} value={s._id}>{s.name || s._id}</option>
                  ))}
                </select>
                <label htmlFor="sk-skill">Competencia y/o habilidad <span className="text-danger">*</span></label>
              </div>
            </div>
            <div className="form-modal-footer">
              <button type="button" className="form-modal-btn-cancel" onClick={() => { setSkillModalOpen(false); setSkillFormData({ skillId: '', experienceYears: '' }); }}>Cerrar</button>
              <button type="button" className="form-modal-btn-save" onClick={handleAddSkill} disabled={savingAcademic}>{savingAcademic ? 'Añadiendo...' : 'Añadir'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Idiomas (floating labels + toggle certificación) */}
      {languageModalOpen && (
        <div className="form-modal-overlay" onClick={() => { setLanguageModalOpen(false); setLanguageFormData({ language: '', level: '', certificationExam: false, certificationExamName: '' }); }}>
          <div className="form-modal-content" onClick={e => e.stopPropagation()}>
            <div className="form-modal-header">
              <h3 className="form-modal-title">Idiomas</h3>
              <button type="button" className="form-modal-close" onClick={() => { setLanguageModalOpen(false); setLanguageFormData({ language: '', level: '', certificationExam: false, certificationExamName: '' }); }} aria-label="Cerrar"><FiX /></button>
            </div>
            <div className="form-modal-body">
              <div className="form-modal-two-cols">
                <div className="form-floating mb-3">
                  <select
                    id="lang-idioma"
                    value={languageFormData.language}
                    onChange={e => setLanguageFormData(prev => ({ ...prev, language: e.target.value }))}
                    className="form-select"
                  >
                    <option value="">Seleccione idioma</option>
                    {languageOptions.map((item) => (
                      <option key={item._id} value={item._id}>{item.value || item.name || item.description || item._id}</option>
                    ))}
                  </select>
                  <label htmlFor="lang-idioma">Seleccionar idioma <span className="text-danger">*</span></label>
                </div>
                <div className="form-floating mb-3">
                  <select
                    id="lang-nivel"
                    value={languageFormData.level}
                    onChange={e => setLanguageFormData(prev => ({ ...prev, level: e.target.value }))}
                    className="form-select"
                  >
                    <option value="">Seleccione nivel</option>
                    {levelOptions.map((item) => (
                      <option key={item._id} value={item._id}>{item.value || item.name || item.description || item._id}</option>
                    ))}
                  </select>
                  <label htmlFor="lang-nivel">Seleccionar nivel <span className="text-danger">*</span></label>
                </div>
              </div>
              <div className="form-modal-two-cols">
                <div className="form-floating mb-3">
                  <div className="form-modal-toggle-row">
                    <span className="form-modal-label-inline">¿Tiene examen de certificación?</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={languageFormData.certificationExam}
                      className={`form-modal-toggle ${languageFormData.certificationExam ? 'on' : ''}`}
                      onClick={() => setLanguageFormData(prev => ({ ...prev, certificationExam: !prev.certificationExam }))}
                    >
                      <span className="form-modal-toggle-thumb" />
                    </button>
                  </div>
                </div>
                <div className="form-floating mb-3">
                  <input
                    type="text"
                    id="lang-examen"
                    value={languageFormData.certificationExamName}
                    onChange={e => setLanguageFormData(prev => ({ ...prev, certificationExamName: e.target.value }))}
                    className="form-control"
                    placeholder=" "
                    disabled={!languageFormData.certificationExam}
                  />
                  <label htmlFor="lang-examen">Introduzca el examen</label>
                </div>
              </div>
            </div>
            <div className="form-modal-footer">
              <button type="button" className="form-modal-btn-cancel" onClick={() => { setLanguageModalOpen(false); setLanguageFormData({ language: '', level: '', certificationExam: false, certificationExamName: '' }); }}>Cerrar</button>
              <button type="button" className="form-modal-btn-save" onClick={handleAddLanguage} disabled={savingAcademic}>{savingAcademic ? 'Añadiendo...' : 'Añadir'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Perfiles (Nombre Perfil + Perfil 2000 chars) */}
      {profileFormOpen && (
        <div className="form-modal-overlay" onClick={() => setProfileFormOpen(false)}>
          <div className="form-modal-content" onClick={e => e.stopPropagation()}>
            <div className="form-modal-header">
              <h3 className="form-modal-title">Perfiles</h3>
              <button type="button" className="form-modal-close" onClick={() => setProfileFormOpen(false)} aria-label="Cerrar"><FiX /></button>
            </div>
            <div className="form-modal-body">
              <div className="form-floating mb-3">
                <input
                  type="text"
                  id="pf-nombre"
                  value={profileFormData.studentCode ?? ''}
                  onChange={e => setProfileFormData(prev => ({ ...prev, studentCode: e.target.value }))}
                  className="form-control"
                  placeholder=" "
                />
                <label htmlFor="pf-nombre">Nombre Perfil <span className="text-danger">*</span></label>
              </div>
              <div className="form-floating mb-3">
                <textarea
                  id="pf-perfil"
                  value={profileFormData.profileText ?? ''}
                  onChange={e => setProfileFormData(prev => ({ ...prev, profileText: e.target.value.slice(0, 2000) }))}
                  className="form-control"
                  placeholder=" "
                  rows={4}
                  maxLength={2000}
                />
                <label htmlFor="pf-perfil">Perfil <span className="text-danger">*</span></label>
                <div className="form-modal-char-count">Caracteres restantes: {2000 - (profileFormData.profileText ?? '').length}</div>
              </div>
            </div>
            <div className="form-modal-footer">
              <button type="button" className="form-modal-btn-cancel" onClick={() => setProfileFormOpen(false)}>Cerrar</button>
              <button type="button" className="form-modal-btn-save" onClick={handleSaveProfileSubmit} disabled={savingProfile}>
                {savingProfile ? 'Guardando...' : 'Añadir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hoja de Vida: elegir perfil para generar */}
      {hojaDeVidaModalOpen && (
        <div className="form-modal-overlay" onClick={() => { setHojaDeVidaModalOpen(false); setHojaDeVidaSelectedProfileId(''); }}>
          <div className="form-modal-content" onClick={e => e.stopPropagation()}>
            <div className="form-modal-header">
              <h3 className="form-modal-title">Hoja de Vida</h3>
              <button type="button" className="form-modal-close" onClick={() => { setHojaDeVidaModalOpen(false); setHojaDeVidaSelectedProfileId(''); }} aria-label="Cerrar"><FiX /></button>
            </div>
            <div className="form-modal-body">
              <div className="form-floating mb-3">
                <select
                  id="hoja-perfil-select"
                  value={hojaDeVidaSelectedProfileId}
                  onChange={e => setHojaDeVidaSelectedProfileId(e.target.value)}
                  className="form-control"
                >
                  <option value="">Seleccione un perfil</option>
                  {profiles.map((profile, index) => {
                    const profileNameStr = (profile.profileName && String(profile.profileName).trim()) || (profile.studentCode && String(profile.studentCode).trim());
                    const fallbackText = (profile.profileText && String(profile.profileText).trim()) || profileNameStr;
                    const label = (profileNameStr || fallbackText)
                      ? (profileNameStr || fallbackText).slice(0, 60) + ((profileNameStr || fallbackText).length > 60 ? '…' : '')
                      : (profile.createdAt || profile.dateCreation ? new Date(profile.createdAt || profile.dateCreation).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : null)
                      || `Perfil ${index + 1}`;
                    return (
                      <option key={profile._id} value={profile._id}>{label}</option>
                    );
                  })}
                </select>
                <label htmlFor="hoja-perfil-select">Elija un perfil para su hoja de vida <span className="text-danger">*</span></label>
              </div>
            </div>
            <div className="form-modal-footer">
              <button type="button" className="form-modal-btn-cancel" onClick={() => { setHojaDeVidaModalOpen(false); setHojaDeVidaSelectedProfileId(''); }}>Cerrar</button>
              <button
                type="button"
                className="form-modal-btn-save"
                onClick={() => {
                  showFuncionalidadEnDesarrollo('Generar hoja de vida');
                  setHojaDeVidaModalOpen(false);
                  setHojaDeVidaSelectedProfileId('');
                }}
              >
                Generar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal CREACIÓN/EDICIÓN DE LA EXPERIENCIA (Experiencia laboral) */}
      {workExpModalOpen && (
        <div className="form-modal-overlay" onClick={() => { setWorkExpModalOpen(false); setEditingWorkExpId(null); }}>
          <div className="form-modal-content form-modal-content--wide" onClick={e => e.stopPropagation()}>
            <div className="form-modal-header">
              <h3 className="form-modal-title">{editingWorkExpId ? 'Editar experiencia laboral' : 'Creación/Edición de la Experiencia'}</h3>
              <button type="button" className="form-modal-close" onClick={() => { setWorkExpModalOpen(false); setEditingWorkExpId(null); }} aria-label="Cerrar"><FiX /></button>
            </div>
            <div className="form-modal-body">
              <div className="form-modal-grid">
                <div className="form-floating mb-3">
                  <input type="date" id="we-startDate" value={workExpFormData.startDate} onChange={e => setWorkExpFormData(prev => ({ ...prev, startDate: e.target.value }))} className="form-control" />
                  <label htmlFor="we-startDate">Fecha de inicio</label>
                </div>
                <div className="form-floating mb-3">
                  <div className="form-modal-toggle-row">
                    <span className="form-modal-label-inline">¿Trabaja en la actualidad?</span>
                    <button type="button" role="switch" aria-checked={workExpFormData.noEndDate} className={`form-modal-toggle ${workExpFormData.noEndDate ? 'on' : ''}`} onClick={() => setWorkExpFormData(prev => ({ ...prev, noEndDate: !prev.noEndDate }))}>
                      <span className="form-modal-toggle-thumb" />
                    </button>
                  </div>
                </div>
                <div className="form-floating mb-3">
                  <input type="date" id="we-endDate" value={workExpFormData.endDate} onChange={e => setWorkExpFormData(prev => ({ ...prev, endDate: e.target.value }))} className="form-control" disabled={workExpFormData.noEndDate} />
                  <label htmlFor="we-endDate">Fecha de finalización</label>
                </div>
                <div className="form-floating mb-3">
                  <input type="text" id="we-jobTitle" value={workExpFormData.jobTitle} onChange={e => setWorkExpFormData(prev => ({ ...prev, jobTitle: e.target.value }))} className="form-control" placeholder=" " />
                  <label htmlFor="we-jobTitle">Nombre del Cargo <span className="text-danger">*</span></label>
                </div>
                <div className="form-floating mb-3">
                  <input type="text" id="we-profession" value={workExpFormData.profession} onChange={e => setWorkExpFormData(prev => ({ ...prev, profession: e.target.value }))} className="form-control" placeholder=" " />
                  <label htmlFor="we-profession">Profesión</label>
                </div>
                <div className="form-floating mb-3">
                  <input type="text" id="we-companyName" value={workExpFormData.companyName} onChange={e => setWorkExpFormData(prev => ({ ...prev, companyName: e.target.value }))} className="form-control" placeholder=" " />
                  <label htmlFor="we-companyName">Empresa</label>
                </div>
                <div className="form-floating mb-3">
                  <select id="we-companySector" value={workExpFormData.companySector} onChange={e => setWorkExpFormData(prev => ({ ...prev, companySector: e.target.value }))} className="form-select">
                    <option value="">Sector Empresa</option>
                    {sectorOptions.map((item) => (
                      <option key={item._id} value={item._id}>{item.value || item.name || item.description || item._id}</option>
                    ))}
                  </select>
                  <label htmlFor="we-companySector">Sector Empresa</label>
                </div>
                <div className="form-floating mb-3">
                  <input type="text" id="we-contact" value={workExpFormData.contact} onChange={e => setWorkExpFormData(prev => ({ ...prev, contact: e.target.value }))} className="form-control" placeholder=" " />
                  <label htmlFor="we-contact">Teléfono de contacto</label>
                </div>
              </div>
              <LocationSelectCascade
                idPrefix="we"
                value={{ countryId: workExpFormData.countryId, stateId: workExpFormData.stateId, cityId: workExpFormData.cityId }}
                onChange={({ countryId, stateId, cityId }) => setWorkExpFormData(prev => ({ ...prev, countryId, stateId, cityId }))}
                onError={showError}
              />
              <div className="form-floating mb-3">
                <textarea id="we-achievements" value={workExpFormData.achievements} onChange={e => setWorkExpFormData(prev => ({ ...prev, achievements: e.target.value.slice(0, 500) }))} className="form-control" placeholder=" " rows={3} maxLength={500} />
                <label htmlFor="we-achievements">Logros</label>
                <div className="form-modal-char-count">Caracteres restantes: {500 - (workExpFormData.achievements || '').length}</div>
              </div>
            </div>
            <div className="form-modal-footer">
              <button type="button" className="form-modal-btn-cancel" onClick={() => { setWorkExpModalOpen(false); setEditingWorkExpId(null); }}>Cancelar</button>
              <button type="button" className="form-modal-btn-save" onClick={handleSaveWorkExperience} disabled={savingExperience}>{savingExperience ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal CREACIÓN/EDICIÓN DE OTRAS EXPERIENCIAS */}
      {otherExpModalOpen && (
        <div className="form-modal-overlay" onClick={() => { setOtherExpModalOpen(false); setEditingOtherExpId(null); }}>
          <div className="form-modal-content form-modal-content--wide" onClick={e => e.stopPropagation()}>
            <div className="form-modal-header">
              <h3 className="form-modal-title">{editingOtherExpId ? 'Editar otra experiencia' : 'Creación/Edición de la Otras Experiencias'}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {editingOtherExpId && (
                  <button type="button" className="form-modal-btn-cancel" style={{ marginRight: 'auto' }} onClick={() => { handleDeleteWorkExperience(editingOtherExpId); setOtherExpModalOpen(false); setEditingOtherExpId(null); }}>Eliminar</button>
                )}
                <button type="button" className="form-modal-close" onClick={() => { setOtherExpModalOpen(false); setEditingOtherExpId(null); }} aria-label="Cerrar"><FiX /></button>
              </div>
            </div>
            <div className="form-modal-body">
              <div className="form-modal-grid">
                <div className="form-floating mb-3">
                  <select id="oe-expType" value={otherExpFormData.experienceType} onChange={e => setOtherExpFormData(prev => ({ ...prev, experienceType: e.target.value }))} className="form-select">
                    <option value="">Seleccionar</option>
                    {experienceTypeOptions.map((item) => (
                      <option key={item._id} value={item._id}>{item.value || item.name || item.description || item._id}</option>
                    ))}
                  </select>
                  <label htmlFor="oe-expType">Tipo de Experiencia <span className="text-danger">*</span></label>
                </div>
                <div className="form-floating mb-3">
                  <input type="date" id="oe-startDate" value={otherExpFormData.startDate} onChange={e => setOtherExpFormData(prev => ({ ...prev, startDate: e.target.value }))} className="form-control" />
                  <label htmlFor="oe-startDate">Fecha de inicio</label>
                </div>
                <div className="form-floating mb-3">
                  <div className="form-modal-toggle-row">
                    <span className="form-modal-label-inline">¿La desarrolla en la actualidad?</span>
                    <button type="button" role="switch" aria-checked={otherExpFormData.noEndDate} className={`form-modal-toggle ${otherExpFormData.noEndDate ? 'on' : ''}`} onClick={() => setOtherExpFormData(prev => ({ ...prev, noEndDate: !prev.noEndDate }))}>
                      <span className="form-modal-toggle-thumb" />
                    </button>
                  </div>
                </div>
                <div className="form-floating mb-3">
                  <input type="date" id="oe-endDate" value={otherExpFormData.endDate} onChange={e => setOtherExpFormData(prev => ({ ...prev, endDate: e.target.value }))} className="form-control" disabled={otherExpFormData.noEndDate} />
                  <label htmlFor="oe-endDate">Fecha de finalización</label>
                </div>
                <div className="form-floating mb-3">
                  <input type="text" id="oe-jobTitle" value={otherExpFormData.jobTitle} onChange={e => setOtherExpFormData(prev => ({ ...prev, jobTitle: e.target.value }))} className="form-control" placeholder=" " />
                  <label htmlFor="oe-jobTitle">Nombre del Proyecto / Experiencia</label>
                </div>
                <div className="form-floating mb-3">
                  <input type="text" id="oe-investigationLine" value={otherExpFormData.investigationLine} onChange={e => setOtherExpFormData(prev => ({ ...prev, investigationLine: e.target.value }))} className="form-control" placeholder=" " />
                  <label htmlFor="oe-investigationLine">Línea de Investigación</label>
                </div>
                <div className="form-floating mb-3">
                  <input type="text" id="oe-companyName" value={otherExpFormData.companyName} onChange={e => setOtherExpFormData(prev => ({ ...prev, companyName: e.target.value }))} className="form-control" placeholder=" " />
                  <label htmlFor="oe-companyName">Empresa / Institución</label>
                </div>
                <div className="form-floating mb-3">
                  <input type="text" id="oe-course" value={otherExpFormData.course} onChange={e => setOtherExpFormData(prev => ({ ...prev, course: e.target.value }))} className="form-control" placeholder=" " />
                  <label htmlFor="oe-course">Asignatura</label>
                </div>
              </div>
              <LocationSelectCascade
                idPrefix="oe"
                value={{ countryId: otherExpFormData.countryId, stateId: otherExpFormData.stateId, cityId: otherExpFormData.cityId }}
                onChange={({ countryId, stateId, cityId }) => setOtherExpFormData(prev => ({ ...prev, countryId, stateId, cityId }))}
                onError={showError}
              />
              <div className="form-floating mb-3">
                <textarea id="oe-activities" value={otherExpFormData.activities} onChange={e => setOtherExpFormData(prev => ({ ...prev, activities: e.target.value.slice(0, 1000) }))} className="form-control" placeholder=" " rows={4} maxLength={1000} />
                <label htmlFor="oe-activities">Actividades</label>
                <div className="form-modal-char-count">Caracteres restantes: {1000 - (otherExpFormData.activities || '').length}</div>
              </div>
            </div>
            <div className="form-modal-footer">
              <button type="button" className="form-modal-btn-cancel" onClick={() => { setOtherExpModalOpen(false); setEditingOtherExpId(null); }}>Cancelar</button>
              <button type="button" className="form-modal-btn-save" onClick={handleSaveOtherExperience} disabled={savingExperience}>{savingExperience ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal CREACIÓN/EDICIÓN DE LOGROS */}
      {awardModalOpen && (
        <div className="form-modal-overlay" onClick={() => { setAwardModalOpen(false); setEditingAwardId(null); }}>
          <div className="form-modal-content" onClick={e => e.stopPropagation()}>
            <div className="form-modal-header">
              <h3 className="form-modal-title">{editingAwardId ? 'Editar logro' : 'Creación/Edición de Logros'}</h3>
              <button type="button" className="form-modal-close" onClick={() => { setAwardModalOpen(false); setEditingAwardId(null); }} aria-label="Cerrar"><FiX /></button>
            </div>
            <div className="form-modal-body">
              <div className="form-floating mb-3">
                <select id="aw-type" value={awardFormData.awardType} onChange={e => setAwardFormData(prev => ({ ...prev, awardType: e.target.value }))} className="form-select">
                  <option value="">Seleccionar</option>
                  {awardTypeOptions.map((item) => (
                    <option key={item._id} value={item._id}>{item.value || item.name || item.description || item._id}</option>
                  ))}
                </select>
                <label htmlFor="aw-type">Logro <span className="text-danger">*</span></label>
              </div>
              <div className="form-floating mb-3">
                <input type="date" id="aw-date" value={awardFormData.awardDate} onChange={e => setAwardFormData(prev => ({ ...prev, awardDate: e.target.value }))} className="form-control" />
                <label htmlFor="aw-date">Fecha</label>
              </div>
              <div className="form-floating mb-3">
                <input type="text" id="aw-name" value={awardFormData.name} onChange={e => setAwardFormData(prev => ({ ...prev, name: e.target.value }))} className="form-control" placeholder=" " />
                <label htmlFor="aw-name">Nombre <span className="text-danger">*</span></label>
              </div>
              <div className="form-floating mb-3">
                <textarea id="aw-description" value={awardFormData.description} onChange={e => setAwardFormData(prev => ({ ...prev, description: e.target.value.slice(0, 500) }))} className="form-control" placeholder=" " rows={3} maxLength={500} />
                <label htmlFor="aw-description">Descripción</label>
                <div className="form-modal-char-count">Caracteres restantes: {500 - (awardFormData.description || '').length}</div>
              </div>
            </div>
            <div className="form-modal-footer">
              <button type="button" className="form-modal-btn-cancel" onClick={() => { setAwardModalOpen(false); setEditingAwardId(null); }}>Cancelar</button>
              <button type="button" className="form-modal-btn-save" onClick={handleSaveAward} disabled={savingExperience}>{savingExperience ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal CREACIÓN/EDICIÓN DE LA REFERENCIA */}
      {referenceModalOpen && (
        <div className="form-modal-overlay" onClick={() => { setReferenceModalOpen(false); setEditingReferenceId(null); }}>
          <div className="form-modal-content" onClick={e => e.stopPropagation()}>
            <div className="form-modal-header">
              <h3 className="form-modal-title">{editingReferenceId ? 'Editar referencia' : 'Creación/Edición de la Referencia'}</h3>
              <button type="button" className="form-modal-close" onClick={() => { setReferenceModalOpen(false); setEditingReferenceId(null); }} aria-label="Cerrar"><FiX /></button>
            </div>
            <div className="form-modal-body">
              <div className="form-modal-two-cols">
                <div className="form-floating mb-3">
                  <input type="text" id="ref-firstname" value={referenceFormData.firstname} onChange={e => setReferenceFormData(prev => ({ ...prev, firstname: e.target.value }))} className="form-control" placeholder=" " />
                  <label htmlFor="ref-firstname">Nombre <span className="text-danger">*</span></label>
                </div>
                <div className="form-floating mb-3">
                  <input type="text" id="ref-lastname" value={referenceFormData.lastname} onChange={e => setReferenceFormData(prev => ({ ...prev, lastname: e.target.value }))} className="form-control" placeholder=" " />
                  <label htmlFor="ref-lastname">Apellido <span className="text-danger">*</span></label>
                </div>
                <div className="form-floating mb-3">
                  <input type="text" id="ref-occupation" value={referenceFormData.occupation} onChange={e => setReferenceFormData(prev => ({ ...prev, occupation: e.target.value }))} className="form-control" placeholder=" " />
                  <label htmlFor="ref-occupation">Ocupación <span className="text-danger">*</span></label>
                </div>
                <div className="form-floating mb-3">
                  <input type="text" id="ref-phone" value={referenceFormData.phone} onChange={e => setReferenceFormData(prev => ({ ...prev, phone: e.target.value }))} className="form-control" placeholder=" " />
                  <label htmlFor="ref-phone">Teléfono <span className="text-danger">*</span></label>
                </div>
              </div>
            </div>
            <div className="form-modal-footer">
              <button type="button" className="form-modal-btn-cancel" onClick={() => { setReferenceModalOpen(false); setEditingReferenceId(null); }}>Cancelar</button>
              <button type="button" className="form-modal-btn-save" onClick={handleSaveReference} disabled={savingExperience}>{savingExperience ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostulantProfile;
