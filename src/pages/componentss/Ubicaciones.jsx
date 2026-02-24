import React, { useState, useEffect } from 'react';
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiSearch,
  FiArrowLeft,
  FiRefreshCw,
  FiFileText,
  FiBook,
  FiClock,
  FiShield,
  FiBriefcase,
  FiTarget,
  FiUsers,
  FiAward,
  FiGlobe as FiWorld,
  FiMapPin,
  FiLayers,
  FiTrendingUp,
  FiActivity
} from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import '../styles/Ubicaciones.css';
import api from '../../services/api';

// ── Parámetros exclusivos de Monitoría / Tutoría / Mentoría ──────────────────
const MTM_VIEWS = ['dedicacionHorasMTM', 'valorPorHoraMTM', 'tipoVinculacionMTM', 'categoriaMTM'];

// Mapeo de vistas a listId (tipos de documento = misma lista que tipo de identificación en facultad)
const VIEW_TO_LIST_ID = {
  // Monitoría
  'dedicacionHorasMTM':  'L_DEDICATON_HOURS',
  'valorPorHoraMTM':     'L_REMUNERATION_HOURS_PER_WEEK',
  'tipoVinculacionMTM':  'L_CONTRACT_TYPE_STUDY_WORKING',
  'categoriaMTM':        'L_MONITORING_TYPE',
  // Prácticas / General
  'documentTypes': 'L_IDENTIFICATIONTYPE',
  'studyLevels': 'L_LEVEL_PROGRAM',
  'dedicationTypes': 'L_DEDICATION_JOB_OFFER',
  'arls': 'L_ARL',
  'practiceScenarioTypes': 'L_IDENTIFICATIONTYPE_COMPANY',
  'sectors': 'L_SECTOR',
  'sectorMineTypes': 'L_SNIES_SECTOR',
  'economicSectors': 'L_BUSINESS_SECTOR',
  'codigosCiiu': 'L_CIIU',
  'organizationSizes': 'L_COMPANY_SIZE',
  'linkageTypes': 'L_CONTRACT_TYPE_ACADEMIC_PRACTICE',
  'performanceAreas': 'L_INTEREST_AREA',
  'interestAreas': 'L_INTEREST_AREA',
  'competencies': 'L_SOFTWARE_SKILLS', // Verificar si es correcto
  'languages': 'L_LANGUAGE',
  'experienceTypes': 'L_EXPERIENCE_TYPE',
  'achievementTypes': 'L_ACHIEVEMENT',
  'practiceTypes': 'L_PRACTICE_TYPE',
  'geographicScopes': 'L_STATE_COUNTRY', // Verificar si es correcto
  'modalities': 'L_FUNCTIONS',
  'activities': 'L_MONITORING_ACTIVITY',
  'eps': 'L_EPS',
  'banks': 'L_BANCO'
};

// Mapeo de campos de formulario a campos de Item
const VIEW_TO_FIELD = {
  'dedicacionHorasMTM': 'dedicacionHoras',
  'valorPorHoraMTM':    'valorPorHora',
  'tipoVinculacionMTM': 'tipoVinculacionMTM',
  'categoriaMTM':       'categoriaMTM',
  'documentTypes': 'tipo',
  'studyLevels': 'nivelEstudio',
  'dedicationTypes': 'dedicacion',
  'arls': 'arl',
  'practiceScenarioTypes': 'tipoIdentificacionEscenario',
  'sectors': 'tipoSector',
  'sectorMineTypes': 'tipoSectorMine',
  'economicSectors': 'tipoSectorEconomico',
  'codigosCiiu': 'codigoCiiu',
  'organizationSizes': 'tipoTamanioOrganizacion',
  'linkageTypes': 'tipoVinculacion',
  'performanceAreas': 'areaDesempeno',
  'interestAreas': 'areaInteres',
  'competencies': 'competencia',
  'languages': 'idioma',
  'experienceTypes': 'tipoExperiencia',
  'achievementTypes': 'tipoLogro',
  'practiceTypes': 'tipoPractica',
  'geographicScopes': 'ambitoGeograficoPractica',
  'modalities': 'modalidad',
  'activities': 'actividad',
  'eps': 'eps',
  'banks': 'banco'
};

const Ubicaciones = ({ onVolver }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromParametrizacionDocumentos = location.state?.from === 'configuracion-documentos';
  // 'practica' | 'monitoria' — controla qué grupo de sub-tabs se muestra
  const [tabGroup, setTabGroup] = useState('practica');
  const [vistaActual, setVistaActual] = useState('documentTypes');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Parámetros Monitoría ──
  const [dedicacionHorasMTM, setDedicacionHorasMTM] = useState([]);
  const [valorPorHoraMTM, setValorPorHoraMTM] = useState([]);
  const [tipoVinculacionMTM, setTipoVinculacionMTM] = useState([]);
  const [categoriaMTM, setCategoriaMTM] = useState([]);
  
  // Datos existentes
  const [documentTypes, setDocumentTypes] = useState([]);
  const [studyLevels, setStudyLevels] = useState([]);
  const [dedicationTypes, setDedicationTypes] = useState([]);
  const [arls, setArls] = useState([]);
  
  // Nuevos datos - Escenario de Práctica
  const [practiceScenarioTypes, setPracticeScenarioTypes] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [sectorMineTypes, setSectorMineTypes] = useState([]);
  const [economicSectors, setEconomicSectors] = useState([]);
  const [codigosCiiu, setCodigosCiiu] = useState([]);
  const [organizationSizes, setOrganizationSizes] = useState([]);
  
  // Nuevos datos - Oportunidades
  const [linkageTypes, setLinkageTypes] = useState([]);
  const [performanceAreas, setPerformanceAreas] = useState([]);
  
  // Nuevos datos - Estudiantes-Postulantes
  const [interestAreas, setInterestAreas] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [experienceTypes, setExperienceTypes] = useState([]);
  const [achievementTypes, setAchievementTypes] = useState([]);
  const [practiceTypes, setPracticeTypes] = useState([]);
  
  // Nuevos datos - Legalización
  const [geographicScopes, setGeographicScopes] = useState([]);
  const [modalities, setModalities] = useState([]);
  const [activities, setActivities] = useState([]);
  
  // Datos de ubicaciones
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [allCountries, setAllCountries] = useState([]); // Para selectores
  const [allStates, setAllStates] = useState([]); // Para selectores
  
  // EPS y Bancos
  const [eps, setEps] = useState([]);
  const [banks, setBanks] = useState([]);
  
  // Paginación
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  
  // Formularios
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    value: '',
    description: '',
    status: 'active',
    estado: 'Activo',
    isActive: true,
    valueForCalculations: '',
    // Campos específicos para ubicaciones
    name: '',
    sortname: '',
    isoAlpha2: '',
    isoNumeric: '',
    dianCode: '',
    codDian: '',
    country: '',
    state: ''
  });

  // Configuración de SweetAlert2
  const showAlert = (icon, title, text, confirmButtonText = 'Aceptar') => {
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

  const showSuccess = (title, text) => showAlert('success', title, text);
  const showError = (title, text) => showAlert('error', title, text);

  const showConfirmation = (title, text) => {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
  };

  // Cargar datos iniciales
  useEffect(() => {
    loadDocumentTypes(1, '');
  }, []);

  // Cargar datos cuando cambia la vista o filtros
  useEffect(() => {
    const page = 1;
    const search = '';

    // Monitoría
    if      (vistaActual === 'dedicacionHorasMTM')  loadDedicacionHorasMTM(page, search);
    else if (vistaActual === 'valorPorHoraMTM')     loadValorPorHoraMTM(page, search);
    else if (vistaActual === 'tipoVinculacionMTM')  loadTipoVinculacionMTM(page, search);
    else if (vistaActual === 'categoriaMTM')        loadCategoriaMTM(page, search);
    // Parámetros básicos
    else if (vistaActual === 'documentTypes') {
      loadDocumentTypes(page, search);
    } else if (vistaActual === 'studyLevels') {
      loadStudyLevels(page, search);
    } else if (vistaActual === 'dedicationTypes') {
      loadDedicationTypes(page, search);
    } else if (vistaActual === 'arls') {
      loadARLs(page, search);
    }
    // Escenario de Práctica
    else if (vistaActual === 'practiceScenarioTypes') {
      loadPracticeScenarioTypes(page, search);
    } else if (vistaActual === 'sectors') {
      loadSectors(page, search);
    } else if (vistaActual === 'sectorMineTypes') {
      loadSectorMineTypes(page, search);
    } else if (vistaActual === 'economicSectors') {
      loadEconomicSectors(page, search);
    } else if (vistaActual === 'codigosCiiu') {
      loadCodigosCiiu(page, search);
    } else if (vistaActual === 'organizationSizes') {
      loadOrganizationSizes(page, search);
    }
    // Oportunidades
    else if (vistaActual === 'linkageTypes') {
      loadLinkageTypes(page, search);
    } else if (vistaActual === 'performanceAreas') {
      loadPerformanceAreas(page, search);
    }
    // Estudiantes-Postulantes
    else if (vistaActual === 'interestAreas') {
      loadInterestAreas(page, search);
    } else if (vistaActual === 'competencies') {
      loadCompetencies(page, search);
    } else if (vistaActual === 'languages') {
      loadLanguages(page, search);
    } else if (vistaActual === 'experienceTypes') {
      loadExperienceTypes(page, search);
    } else if (vistaActual === 'achievementTypes') {
      loadAchievementTypes(page, search);
    } else if (vistaActual === 'practiceTypes') {
      loadPracticeTypes(page, search);
    }
    // Legalización
    else if (vistaActual === 'geographicScopes') {
      loadGeographicScopes(page, search);
    } else if (vistaActual === 'modalities') {
      loadModalities(page, search);
    } else if (vistaActual === 'activities') {
      loadActivities(page, search);
    }
    // Ubicaciones
    else if (vistaActual === 'countries') {
      loadCountries(page, search);
      loadAllCountries();
    } else if (vistaActual === 'states') {
      loadStates(page, search);
      loadAllCountries();
      loadAllStates();
    } else if (vistaActual === 'cities') {
      loadCities(page, search);
      loadAllCountries();
      loadAllStates();
    }
    // EPS y Bancos
    else if (vistaActual === 'eps') {
      loadEPS(page, search);
    } else if (vistaActual === 'banks') {
      loadBanks(page, search);
    }
  }, [vistaActual]);

  // Búsqueda con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const page = 1;
      setPagination(prev => ({ ...prev, page: 1 }));

      if      (vistaActual === 'dedicacionHorasMTM') loadDedicacionHorasMTM(page, searchTerm);
      else if (vistaActual === 'valorPorHoraMTM')    loadValorPorHoraMTM(page, searchTerm);
      else if (vistaActual === 'tipoVinculacionMTM') loadTipoVinculacionMTM(page, searchTerm);
      else if (vistaActual === 'categoriaMTM')       loadCategoriaMTM(page, searchTerm);
      else if (vistaActual === 'documentTypes') {
        loadDocumentTypes(page, searchTerm);
      } else if (vistaActual === 'studyLevels') {
        loadStudyLevels(page, searchTerm);
      } else if (vistaActual === 'dedicationTypes') {
        loadDedicationTypes(page, searchTerm);
      } else if (vistaActual === 'arls') {
        loadARLs(page, searchTerm);
      }
      // Escenario de Práctica
      else if (vistaActual === 'practiceScenarioTypes') {
        loadPracticeScenarioTypes(page, searchTerm);
      } else if (vistaActual === 'sectors') {
        loadSectors(page, searchTerm);
      } else if (vistaActual === 'sectorMineTypes') {
        loadSectorMineTypes(page, searchTerm);
      } else if (vistaActual === 'economicSectors') {
        loadEconomicSectors(page, searchTerm);
      } else if (vistaActual === 'codigosCiiu') {
        loadCodigosCiiu(page, searchTerm);
      } else if (vistaActual === 'organizationSizes') {
        loadOrganizationSizes(page, searchTerm);
      }
      // Oportunidades
      else if (vistaActual === 'linkageTypes') {
        loadLinkageTypes(page, searchTerm);
      } else if (vistaActual === 'performanceAreas') {
        loadPerformanceAreas(page, searchTerm);
      }
      // Estudiantes-Postulantes
      else if (vistaActual === 'interestAreas') {
        loadInterestAreas(page, searchTerm);
      } else if (vistaActual === 'competencies') {
        loadCompetencies(page, searchTerm);
      } else if (vistaActual === 'languages') {
        loadLanguages(page, searchTerm);
      } else if (vistaActual === 'experienceTypes') {
        loadExperienceTypes(page, searchTerm);
      } else if (vistaActual === 'achievementTypes') {
        loadAchievementTypes(page, searchTerm);
      } else if (vistaActual === 'practiceTypes') {
        loadPracticeTypes(page, searchTerm);
      }
      // Legalización
      else if (vistaActual === 'geographicScopes') {
        loadGeographicScopes(page, searchTerm);
      } else if (vistaActual === 'modalities') {
        loadModalities(page, searchTerm);
      } else if (vistaActual === 'activities') {
        loadActivities(page, searchTerm);
      }
      // Ubicaciones
      else if (vistaActual === 'countries') {
        loadCountries(page, searchTerm);
      } else if (vistaActual === 'states') {
        loadStates(page, searchTerm);
      } else if (vistaActual === 'cities') {
        loadCities(page, searchTerm);
      }
      // EPS y Bancos
      else if (vistaActual === 'eps') {
        loadEPS(page, searchTerm);
      } else if (vistaActual === 'banks') {
        loadBanks(page, searchTerm);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);


  // Función genérica para cargar items por listId
  const loadItems = async (view, page = 1, search = '') => {
    try {
      setLoading(true);
      const listId = VIEW_TO_LIST_ID[view];
      if (!listId) {
        console.error(`No hay listId mapeado para la vista: ${view}`);
        return;
      }
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      if (search) {
        params.append('search', search);
      }
      
      const response = await api.get(`/locations/items/${listId}?${params.toString()}`);
      if (response.data.data) {
        // Mapear los items a los estados correspondientes
        const setterMap = {
          'dedicacionHorasMTM': setDedicacionHorasMTM,
          'valorPorHoraMTM':    setValorPorHoraMTM,
          'tipoVinculacionMTM': setTipoVinculacionMTM,
          'categoriaMTM':       setCategoriaMTM,
          'documentTypes': setDocumentTypes,
          'studyLevels': setStudyLevels,
          'dedicationTypes': setDedicationTypes,
          'arls': setArls,
          'practiceScenarioTypes': setPracticeScenarioTypes,
          'sectors': setSectors,
          'sectorMineTypes': setSectorMineTypes,
          'economicSectors': setEconomicSectors,
          'codigosCiiu': setCodigosCiiu,
          'organizationSizes': setOrganizationSizes,
          'linkageTypes': setLinkageTypes,
          'performanceAreas': setPerformanceAreas,
          'interestAreas': setInterestAreas,
          'competencies': setCompetencies,
          'languages': setLanguages,
          'experienceTypes': setExperienceTypes,
          'achievementTypes': setAchievementTypes,
          'practiceTypes': setPracticeTypes,
          'geographicScopes': setGeographicScopes,
          'modalities': setModalities,
          'activities': setActivities,
          'eps': setEps,
          'banks': setBanks
        };
        
        const setter = setterMap[view];
        if (setter) {
          setter(response.data.data || []);
        }
        setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
      }
    } catch (error) {
      console.error(`Error al cargar ${view}:`, error);
      showError('Error', `No se pudieron cargar los datos`);
    } finally {
      setLoading(false);
    }
  };

  // ── Parámetros Monitoría ──────────────────────────────────────────────────────
  const loadDedicacionHorasMTM  = async (p = 1, s = '') => loadItems('dedicacionHorasMTM',  p, s);
  const loadValorPorHoraMTM     = async (p = 1, s = '') => loadItems('valorPorHoraMTM',     p, s);
  const loadTipoVinculacionMTM  = async (p = 1, s = '') => loadItems('tipoVinculacionMTM',  p, s);
  const loadCategoriaMTM        = async (p = 1, s = '') => loadItems('categoriaMTM',        p, s);

  const loadDocumentTypes = async (page = 1, search = '') => {
    await loadItems('documentTypes', page, search);
  };

  const loadStudyLevels = async (page = 1, search = '') => {
    await loadItems('studyLevels', page, search);
  };

  const loadDedicationTypes = async (page = 1, search = '') => {
    await loadItems('dedicationTypes', page, search);
  };

  const loadARLs = async (page = 1, search = '') => {
    await loadItems('arls', page, search);
  };

  // ==================== FUNCIONES DE CARGA - ESCENARIO DE PRÁCTICA ====================
  const loadPracticeScenarioTypes = async (page = 1, search = '') => {
    await loadItems('practiceScenarioTypes', page, search);
  };

  const loadSectors = async (page = 1, search = '') => {
    await loadItems('sectors', page, search);
  };

  const loadSectorMineTypes = async (page = 1, search = '') => {
    await loadItems('sectorMineTypes', page, search);
  };

  const loadEconomicSectors = async (page = 1, search = '') => {
    await loadItems('economicSectors', page, search);
  };

  const loadCodigosCiiu = async (page = 1, search = '') => {
    await loadItems('codigosCiiu', page, search);
  };

  const loadOrganizationSizes = async (page = 1, search = '') => {
    await loadItems('organizationSizes', page, search);
  };

  // ==================== FUNCIONES DE CARGA - OPORTUNIDADES ====================
  const loadLinkageTypes = async (page = 1, search = '') => {
    await loadItems('linkageTypes', page, search);
  };

  const loadPerformanceAreas = async (page = 1, search = '') => {
    await loadItems('performanceAreas', page, search);
  };

  // ==================== FUNCIONES DE CARGA - ESTUDIANTES-POSTULANTES ====================
  const loadInterestAreas = async (page = 1, search = '') => {
    await loadItems('interestAreas', page, search);
  };

  const loadCompetencies = async (page = 1, search = '') => {
    await loadItems('competencies', page, search);
  };

  const loadLanguages = async (page = 1, search = '') => {
    await loadItems('languages', page, search);
  };

  const loadExperienceTypes = async (page = 1, search = '') => {
    await loadItems('experienceTypes', page, search);
  };

  const loadAchievementTypes = async (page = 1, search = '') => {
    await loadItems('achievementTypes', page, search);
  };

  const loadPracticeTypes = async (page = 1, search = '') => {
    await loadItems('practiceTypes', page, search);
  };

  // ==================== FUNCIONES DE CARGA - LEGALIZACIÓN ====================
  const loadGeographicScopes = async (page = 1, search = '') => {
    await loadItems('geographicScopes', page, search);
  };

  const loadModalities = async (page = 1, search = '') => {
    await loadItems('modalities', page, search);
  };

  const loadActivities = async (page = 1, search = '') => {
    await loadItems('activities', page, search);
  };

  // ==================== FUNCIONES DE CARGA - EPS Y BANCOS ====================
  const loadEPS = async (page = 1, search = '') => {
    await loadItems('eps', page, search);
  };

  const loadBanks = async (page = 1, search = '') => {
    await loadItems('banks', page, search);
  };

  // ==================== FUNCIONES DE CARGA - UBICACIONES ====================
  const loadCountries = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      if (search) {
        params.append('search', search);
      }
      
      const response = await api.get(`/locations/countries?${params.toString()}`);
      setCountries(response.data.data || []);
      setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
    } catch (error) {
      console.error('Error cargando países:', error);
      showError('Error', 'No se pudieron cargar los países');
    } finally {
      setLoading(false);
    }
  };

  const loadStates = async (page = 1, search = '', countryId = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      if (search) {
        params.append('search', search);
      }
      if (countryId) {
        params.append('country', countryId);
      }
      
      const response = await api.get(`/locations/states?${params.toString()}`);
      setStates(response.data.data || []);
      setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
    } catch (error) {
      console.error('Error cargando estados:', error);
      showError('Error', 'No se pudieron cargar los estados');
    } finally {
      setLoading(false);
    }
  };

  const loadCities = async (page = 1, search = '', stateId = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      if (search) {
        params.append('search', search);
      }
      if (stateId) {
        params.append('state', stateId);
      }
      
      const response = await api.get(`/locations/cities?${params.toString()}`);
      setCities(response.data.data || []);
      setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
    } catch (error) {
      console.error('Error cargando ciudades:', error);
      showError('Error', 'No se pudieron cargar las ciudades');
    } finally {
      setLoading(false);
    }
  };

  // Cargar todos los países para selectores
  const loadAllCountries = async () => {
    try {
      const response = await api.get('/locations/countries?limit=1000');
      setAllCountries(response.data.data || []);
    } catch (error) {
      console.error('Error cargando todos los países:', error);
    }
  };

  // Cargar todos los estados para selectores
  const loadAllStates = async (countryId = '') => {
    try {
      const params = new URLSearchParams({ limit: '1000' });
      if (countryId) {
        params.append('country', countryId);
      }
      const response = await api.get(`/locations/states?${params.toString()}`);
      setAllStates(response.data.data || []);
    } catch (error) {
      console.error('Error cargando todos los estados:', error);
    }
  };

  const handleCreate = async () => {
    setEditingItem(null);
    resetForm();
    setShowForm(true);
    
    // Cargar datos necesarios para selectores
    if (vistaActual === 'states' || vistaActual === 'cities') {
      await loadAllCountries();
    }
    if (vistaActual === 'cities') {
      await loadAllStates();
    }
  };

  const handleEdit = async (item) => {
    setEditingItem(item);
    
    // Cargar datos necesarios para selectores
    if (vistaActual === 'states' || vistaActual === 'cities') {
      await loadAllCountries();
    }
    
    // Mapear según el tipo de vista
    if (vistaActual === 'countries') {
      setFormData({
        name: item.name || '',
        sortname: item.sortname || '',
        isoAlpha2: item.isoAlpha2 || '',
        isoNumeric: item.isoNumeric || ''
      });
    } else if (vistaActual === 'states') {
      const countryId = item.country?._id || item.country || '';
      setFormData({
        name: item.name || '',
        dianCode: item.dianCode || '',
        country: countryId
      });
      if (countryId) {
        await loadAllStates(countryId);
      }
    } else if (vistaActual === 'cities') {
      const stateId = item.state?._id || item.state || '';
      const countryId = item.state?.country?._id || item.state?.country || '';
      setFormData({
        name: item.name || '',
        codDian: item.codDian || '',
        state: stateId,
        country: countryId
      });
      if (countryId) {
        await loadAllStates(countryId);
      }
    } else {
      // Mapear Item directamente a formulario usando los campos del modelo
      const formDataObj = {
        value: item.value || '',
        description: item.description || '',
        status: item.status || 'active',
        isActive: item.isActive !== undefined ? item.isActive : true,
        valueForCalculations: item.valueForCalculations || ''
      };
      
      // Para vistas con estado, mapear status a estado
      if (vistaActual === 'documentTypes' || vistaActual === 'linkageTypes' || 
          vistaActual === 'geographicScopes' || vistaActual === 'modalities' || vistaActual === 'activities') {
        formDataObj.estado = item.status === 'active' || item.status === 'ACTIVE' ? 'Activo' : 'Inactivo';
      }
      
      setFormData(formDataObj);
    }
    
    setShowForm(true);
  };

  const handleDelete = async (item) => {
    const itemName = item.name || item.value || 'este elemento';
    const result = await showConfirmation(
      '¿Eliminar?',
      `¿Estás seguro de eliminar ${itemName}?`
    );

    if (result.isConfirmed) {
      try {
        let endpoint = '';
        if (vistaActual === 'countries') {
          endpoint = `/locations/countries/${item._id}`;
        } else if (vistaActual === 'states') {
          endpoint = `/locations/states/${item._id}`;
        } else if (vistaActual === 'cities') {
          endpoint = `/locations/cities/${item._id}`;
        } else {
          endpoint = `/locations/items/${item._id}`;
        }
        
        await api.delete(endpoint);
        showSuccess('Eliminado', 'El elemento ha sido eliminado exitosamente');
        
        // Recargar datos
        if (vistaActual === 'countries') {
          await loadCountries(pagination.page, searchTerm);
        } else if (vistaActual === 'states') {
          await loadStates(pagination.page, searchTerm);
        } else if (vistaActual === 'cities') {
          await loadCities(pagination.page, searchTerm);
        } else {
          await loadItems(vistaActual, pagination.page, searchTerm);
        }
      } catch (error) {
        console.error('Error al eliminar:', error);
        showError('Error', error.response?.data?.message || 'No se pudo eliminar el elemento');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Manejar ubicaciones (países, estados, ciudades)
      if (vistaActual === 'countries') {
        if (!formData.name || !formData.sortname) {
          showError('Error', 'El nombre y el código de país son requeridos');
          return;
        }
        
        const payload = {
          name: formData.name,
          sortname: formData.sortname,
          isoAlpha2: formData.isoAlpha2 || null,
          isoNumeric: formData.isoNumeric || null
        };
        
        if (editingItem) {
          await api.put(`/locations/countries/${editingItem._id}`, payload);
          showSuccess('Actualizado', 'País actualizado exitosamente');
        } else {
          await api.post('/locations/countries', payload);
          showSuccess('Creado', 'País creado exitosamente');
        }
        
        await loadCountries(pagination.page, searchTerm);
        setShowForm(false);
        return;
      } else if (vistaActual === 'states') {
        if (!formData.name || !formData.country) {
          showError('Error', 'El nombre y el país son requeridos');
          return;
        }
        
        const payload = {
          name: formData.name,
          dianCode: formData.dianCode || null,
          country: formData.country
        };
        
        if (editingItem) {
          await api.put(`/locations/states/${editingItem._id}`, payload);
          showSuccess('Actualizado', 'Estado actualizado exitosamente');
        } else {
          await api.post('/locations/states', payload);
          showSuccess('Creado', 'Estado creado exitosamente');
        }
        
        await loadStates(pagination.page, searchTerm);
        setShowForm(false);
        return;
      } else if (vistaActual === 'cities') {
        if (!formData.name || !formData.state) {
          showError('Error', 'El nombre y el estado son requeridos');
          return;
        }
        
        const payload = {
          name: formData.name,
          codDian: formData.codDian || null,
          state: formData.state
        };
        
        if (editingItem) {
          await api.put(`/locations/cities/${editingItem._id}`, payload);
          showSuccess('Actualizado', 'Ciudad actualizada exitosamente');
        } else {
          await api.post('/locations/cities', payload);
          showSuccess('Creado', 'Ciudad creada exitosamente');
        }
        
        await loadCities(pagination.page, searchTerm);
        setShowForm(false);
        return;
      }
      
      // Manejar items genéricos
      const listId = VIEW_TO_LIST_ID[vistaActual];
      if (!listId) {
        showError('Error', 'No se pudo determinar el listId');
        return;
      }
      
      const fieldName = VIEW_TO_FIELD[vistaActual];
      if (!fieldName) {
        showError('Error', 'No se pudo determinar el campo');
        return;
      }
      
      // Obtener el valor del campo value
      const value = formData.value || '';
      
      if (!value) {
        showError('Error', 'El campo Valor es requerido');
        return;
      }
      
      // Construir el objeto Item
      const itemData = {
        listId: listId,
        value: value,
        description: formData.description || null,
        status: formData.estado === 'Activo' ? 'active' : (formData.status || 'active'),
        isActive: formData.isActive !== undefined ? formData.isActive : true
      };
      
      // Campos específicos para ARL
      if (vistaActual === 'arls' && formData.valueForCalculations) {
        itemData.valueForCalculations = formData.valueForCalculations;
      }
      
      let endpoint = '/locations/items';
      let method = 'post';
      
      if (editingItem) {
        endpoint = `/locations/items/${editingItem._id}`;
        method = 'put';
      }

      if (method === 'post') {
        await api.post(endpoint, itemData);
        showSuccess('Creado', 'El elemento ha sido creado exitosamente');
      } else {
        await api.put(endpoint, itemData);
        showSuccess('Actualizado', 'El elemento ha sido actualizado exitosamente');
      }

      setShowForm(false);
      resetForm();

      // Recargar datos usando la función genérica
      await loadItems(vistaActual, pagination.page, searchTerm);
    } catch (error) {
      console.error('Error al guardar:', error);
      showError('Error', error.response?.data?.message || 'No se pudo guardar el elemento');
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      isoCode: '',
      flag: '',
      phonecode: '',
      currency: '',
      latitude: '',
      longitude: '',
      isActive: true,
      tipo: '',
      estado: 'Activo',
      nivelEstudio: '',
      dedicacion: '',
      arl: '',
      idArl: ''
    });
  };

  const getCurrentData = () => {
    let data = [];
    // Parámetros Monitoría
    if (vistaActual === 'dedicacionHorasMTM') data = dedicacionHorasMTM;
    else if (vistaActual === 'valorPorHoraMTM')    data = valorPorHoraMTM;
    else if (vistaActual === 'tipoVinculacionMTM') data = tipoVinculacionMTM;
    else if (vistaActual === 'categoriaMTM')       data = categoriaMTM;
    // Parámetros básicos
    else if (vistaActual === 'documentTypes') {
      data = documentTypes;
    } else if (vistaActual === 'studyLevels') {
      data = studyLevels;
    } else if (vistaActual === 'dedicationTypes') {
      data = dedicationTypes;
    } else if (vistaActual === 'arls') {
      data = arls;
    }
    // Escenario de Práctica
    else if (vistaActual === 'practiceScenarioTypes') {
      data = practiceScenarioTypes;
    } else if (vistaActual === 'sectors') {
      data = sectors;
    } else if (vistaActual === 'sectorMineTypes') {
      data = sectorMineTypes;
    } else if (vistaActual === 'economicSectors') {
      data = economicSectors;
    } else if (vistaActual === 'codigosCiiu') {
      data = codigosCiiu;
    } else if (vistaActual === 'organizationSizes') {
      data = organizationSizes;
    }
    // Oportunidades
    else if (vistaActual === 'linkageTypes') {
      data = linkageTypes;
    } else if (vistaActual === 'performanceAreas') {
      data = performanceAreas;
    }
    // Estudiantes-Postulantes
    else if (vistaActual === 'interestAreas') {
      data = interestAreas;
    } else if (vistaActual === 'competencies') {
      data = competencies;
    } else if (vistaActual === 'languages') {
      data = languages;
    } else if (vistaActual === 'experienceTypes') {
      data = experienceTypes;
    } else if (vistaActual === 'achievementTypes') {
      data = achievementTypes;
    } else if (vistaActual === 'practiceTypes') {
      data = practiceTypes;
    }
    // Legalización
    else if (vistaActual === 'geographicScopes') {
      data = geographicScopes;
    } else if (vistaActual === 'modalities') {
      data = modalities;
    } else if (vistaActual === 'activities') {
      data = activities;
    }
    // Ubicaciones
    else if (vistaActual === 'countries') {
      data = countries;
    } else if (vistaActual === 'states') {
      data = states;
    } else if (vistaActual === 'cities') {
      data = cities;
    }
    // EPS y Bancos
    else if (vistaActual === 'eps') {
      data = eps;
    } else if (vistaActual === 'banks') {
      data = banks;
    }
    return data;
  };

  return (
    <div className="ubicaciones-container">
      <div className="ubicaciones-header">
        <button
          className="btn-volver"
          onClick={() => navigate(fromParametrizacionDocumentos ? '/dashboard/configuracion-documentos' : '/dashboard/configuracion')}
        >
          <FiArrowLeft className="btn-icon" />
          Volver
        </button>
        <h2>Gestión de Parámetros</h2>
      </div>

      {/* ── Macro-tabs: Prácticas / Monitoría ── */}
      <div className="ubicaciones-macro-tabs">
        <button
          className={`macro-tab ${tabGroup === 'practica' ? 'active' : ''}`}
          onClick={() => {
            setTabGroup('practica');
            setVistaActual('documentTypes');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiBriefcase /> Parámetros Prácticas
        </button>
        <button
          className={`macro-tab monitoria ${tabGroup === 'monitoria' ? 'active' : ''}`}
          onClick={() => {
            setTabGroup('monitoria');
            setVistaActual('dedicacionHorasMTM');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiBook /> Parámetros Monitorías / Tutorías / Mentorías
        </button>
      </div>

      {/* ── Sub-tabs Monitoría ── */}
      {tabGroup === 'monitoria' && (
        <div className="ubicaciones-tabs">
          {[
            { key: 'dedicacionHorasMTM',  label: 'Dedicación Horas/Semana', icon: <FiClock /> },
            { key: 'valorPorHoraMTM',     label: 'Valor por Hora',          icon: <FiTrendingUp /> },
            { key: 'tipoVinculacionMTM',  label: 'Tipo de Vinculación',     icon: <FiShield /> },
            { key: 'categoriaMTM',        label: 'Categoría (Tipo MTM)',     icon: <FiLayers /> },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              className={`tab ${vistaActual === key ? 'active' : ''}`}
              onClick={() => { setVistaActual(key); setShowForm(false); setPagination({ page: 1, limit: 10, total: 0, pages: 0 }); setSearchTerm(''); }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Sub-tabs Prácticas (los originales, solo visibles cuando tabGroup=practica) ── */}
      {tabGroup === 'practica' && (
      <div className="ubicaciones-tabs">
        <button
          className={`tab ${vistaActual === 'documentTypes' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('documentTypes');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiFileText /> Tipos de Documento
        </button>
        <button
          className={`tab ${vistaActual === 'studyLevels' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('studyLevels');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiBook /> Niveles de Estudio
        </button>
        <button
          className={`tab ${vistaActual === 'dedicationTypes' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('dedicationTypes');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiClock /> Dedicación
        </button>
        <button
          className={`tab ${vistaActual === 'arls' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('arls');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiShield /> ARLs
        </button>
        <button
          className={`tab ${vistaActual === 'eps' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('eps');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiActivity /> EPS
        </button>
        <button
          className={`tab ${vistaActual === 'banks' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('banks');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiBriefcase /> Bancos
        </button>
        
        {/* Separador visual */}
        <div className="tab-separator"></div>
        
        {/* ESCENARIO DE PRÁCTICA */}
        <button
          className={`tab ${vistaActual === 'practiceScenarioTypes' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('practiceScenarioTypes');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiFileText /> Tipo ID Escenario
        </button>
        <button
          className={`tab ${vistaActual === 'sectors' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('sectors');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiBriefcase /> Sector
        </button>
        <button
          className={`tab ${vistaActual === 'sectorMineTypes' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('sectorMineTypes');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiTarget /> Sector MinE
        </button>
        <button
          className={`tab ${vistaActual === 'economicSectors' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('economicSectors');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiTrendingUp /> Sector Económico
        </button>
        <button
          className={`tab ${vistaActual === 'codigosCiiu' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('codigosCiiu');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiFileText /> Código CIIU
        </button>
        <button
          className={`tab ${vistaActual === 'organizationSizes' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('organizationSizes');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiLayers /> Tamaño Organización
        </button>
        
        {/* Separador visual */}
        <div className="tab-separator"></div>
        
        {/* OPORTUNIDADES */}
        <button
          className={`tab ${vistaActual === 'linkageTypes' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('linkageTypes');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiShield /> Tipo Vinculación
        </button>
        <button
          className={`tab ${vistaActual === 'performanceAreas' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('performanceAreas');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiTarget /> Área Desempeño
        </button>
        
        {/* Separador visual */}
        <div className="tab-separator"></div>
        
        {/* UBICACIONES */}
        <button
          className={`tab ${vistaActual === 'countries' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('countries');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiWorld /> Países
        </button>
        <button
          className={`tab ${vistaActual === 'states' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('states');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiMapPin /> Estados/Departamentos
        </button>
        <button
          className={`tab ${vistaActual === 'cities' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('cities');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiMapPin /> Ciudades
        </button>
        
        {/* Separador visual */}
        <div className="tab-separator"></div>
        
        {/* ESTUDIANTES-POSTULANTES */}
        <button
          className={`tab ${vistaActual === 'interestAreas' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('interestAreas');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiTarget /> Áreas Interés
        </button>
        <button
          className={`tab ${vistaActual === 'competencies' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('competencies');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiAward /> Competencias
        </button>
        <button
          className={`tab ${vistaActual === 'languages' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('languages');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiWorld /> Idiomas
        </button>
        <button
          className={`tab ${vistaActual === 'experienceTypes' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('experienceTypes');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiBook /> Tipo Experiencia
        </button>
        <button
          className={`tab ${vistaActual === 'achievementTypes' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('achievementTypes');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiAward /> Tipo Logro
        </button>
        <button
          className={`tab ${vistaActual === 'practiceTypes' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('practiceTypes');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiBriefcase /> Tipo Práctica
        </button>
        
        {/* Separador visual */}
        <div className="tab-separator"></div>
        
        {/* LEGALIZACIÓN */}
        <button
          className={`tab ${vistaActual === 'geographicScopes' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('geographicScopes');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiMapPin /> Ámbito Geográfico
        </button>
        <button
          className={`tab ${vistaActual === 'modalities' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('modalities');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiActivity /> Modalidad
        </button>
        <button
          className={`tab ${vistaActual === 'activities' ? 'active' : ''}`}
          onClick={() => {
            setVistaActual('activities');
            setShowForm(false);
            setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
            setSearchTerm('');
          }}
        >
          <FiActivity /> Actividad
        </button>
      </div>
      )}{/* fin tabGroup === 'practica' */}

      {/* Filtros */}
      {/* Barra de búsqueda y acciones */}
      <div className="ubicaciones-actions">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder={`Buscar ${vistaActual}...`}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
          />
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          <FiPlus /> Crear Nuevo
        </button>
        <button className="btn-secondary" onClick={() => {
          if      (vistaActual === 'dedicacionHorasMTM') loadDedicacionHorasMTM(pagination.page, searchTerm);
          else if (vistaActual === 'valorPorHoraMTM')    loadValorPorHoraMTM(pagination.page, searchTerm);
          else if (vistaActual === 'tipoVinculacionMTM') loadTipoVinculacionMTM(pagination.page, searchTerm);
          else if (vistaActual === 'categoriaMTM')       loadCategoriaMTM(pagination.page, searchTerm);
          else if (vistaActual === 'documentTypes') loadDocumentTypes(pagination.page, searchTerm);
          else if (vistaActual === 'studyLevels') loadStudyLevels(pagination.page, searchTerm);
          else if (vistaActual === 'dedicationTypes') loadDedicationTypes(pagination.page, searchTerm);
          else if (vistaActual === 'arls') loadARLs(pagination.page, searchTerm);
          // Escenario de Práctica
          else if (vistaActual === 'practiceScenarioTypes') loadPracticeScenarioTypes(pagination.page, searchTerm);
          else if (vistaActual === 'sectors') loadSectors(pagination.page, searchTerm);
          else if (vistaActual === 'sectorMineTypes') loadSectorMineTypes(pagination.page, searchTerm);
          else if (vistaActual === 'economicSectors') loadEconomicSectors(pagination.page, searchTerm);
          else if (vistaActual === 'codigosCiiu') loadCodigosCiiu(pagination.page, searchTerm);
          else if (vistaActual === 'organizationSizes') loadOrganizationSizes(pagination.page, searchTerm);
          // Oportunidades
          else if (vistaActual === 'linkageTypes') loadLinkageTypes(pagination.page, searchTerm);
          else if (vistaActual === 'performanceAreas') loadPerformanceAreas(pagination.page, searchTerm);
          // Estudiantes-Postulantes
          else if (vistaActual === 'interestAreas') loadInterestAreas(pagination.page, searchTerm);
          else if (vistaActual === 'competencies') loadCompetencies(pagination.page, searchTerm);
          else if (vistaActual === 'languages') loadLanguages(pagination.page, searchTerm);
          else if (vistaActual === 'experienceTypes') loadExperienceTypes(pagination.page, searchTerm);
          else if (vistaActual === 'achievementTypes') loadAchievementTypes(pagination.page, searchTerm);
          else if (vistaActual === 'practiceTypes') loadPracticeTypes(pagination.page, searchTerm);
          // Legalización
          else if (vistaActual === 'geographicScopes') loadGeographicScopes(pagination.page, searchTerm);
          else if (vistaActual === 'modalities') loadModalities(pagination.page, searchTerm);
          else if (vistaActual === 'activities') loadActivities(pagination.page, searchTerm);
          // Ubicaciones
          else if (vistaActual === 'countries') loadCountries(pagination.page, searchTerm);
          else if (vistaActual === 'states') loadStates(pagination.page, searchTerm);
          else if (vistaActual === 'cities') loadCities(pagination.page, searchTerm);
        }}>
          <FiRefreshCw /> Actualizar
        </button>
      </div>

      {/* Tabla de datos */}
      {loading ? (
        <div className="loading">Cargando...</div>
      ) : (
        <div className="ubicaciones-table-container">
          <table className="ubicaciones-table">
            <thead>
              <tr>
                {MTM_VIEWS.includes(vistaActual) && (
                  <>
                    <th>Valor</th>
                    <th>Descripción</th>
                    <th>Estado</th>
                  </>
                )}
                {vistaActual === 'documentTypes' && (
                  <>
                    <th>Valor</th>
                    <th>Estado</th>
                    <th>Descripción</th>
                  </>
                )}
                {vistaActual === 'studyLevels' && (
                  <>
                    <th>Valor</th>
                    <th>Descripción</th>
                  </>
                )}
                {vistaActual === 'dedicationTypes' && (
                  <>
                    <th>Valor</th>
                    <th>Descripción</th>
                  </>
                )}
                {vistaActual === 'arls' && (
                  <>
                    <th>ID ARL</th>
                    <th>Valor</th>
                    <th>Descripción</th>
                  </>
                )}
                {vistaActual === 'eps' && (
                  <>
                    <th>Valor</th>
                    <th>Descripción</th>
                  </>
                )}
                {vistaActual === 'banks' && (
                  <>
                    <th>Valor</th>
                    <th>Descripción</th>
                  </>
                )}
                {/* Escenario de Práctica */}
                {vistaActual === 'practiceScenarioTypes' && (
                  <>
                    <th>Valor</th>
                    <th>Descripción</th>
                  </>
                )}
                {vistaActual === 'sectors' && (
                  <>
                    <th>Valor</th>
                    <th>Descripción</th>
                  </>
                )}
                {vistaActual === 'sectorMineTypes' && (
                  <>
                    <th>Valor</th>
                    <th>Descripción</th>
                  </>
                )}
                {vistaActual === 'economicSectors' && (
                  <>
                    <th>Sector económico</th>
                    <th>Descripción</th>
                  </>
                )}
                {vistaActual === 'codigosCiiu' && (
                  <>
                    <th>Código</th>
                    <th>Descripción</th>
                  </>
                )}
                {vistaActual === 'organizationSizes' && (
                  <>
                    <th>Valor</th>
                    <th>Descripción</th>
                  </>
                )}
                {/* Oportunidades */}
                {vistaActual === 'linkageTypes' && (
                  <>
                    <th>Valor</th>
                    <th>Estado</th>
                    <th>Descripción</th>
                  </>
                )}
                {vistaActual === 'performanceAreas' && (
                  <>
                    <th>Valor</th>
                    <th>Descripción</th>
                  </>
                )}
                {/* Estudiantes-Postulantes */}
                {vistaActual === 'interestAreas' && (
                  <>
                    <th>Valor</th>
                    <th>Descripción</th>
                  </>
                )}
                {vistaActual === 'competencies' && (
                  <>
                    <th>Valor</th>
                    <th>Descripción</th>
                  </>
                )}
                {vistaActual === 'languages' && (
                  <>
                    <th>Valor</th>
                    <th>Descripción</th>
                  </>
                )}
                {vistaActual === 'experienceTypes' && (
                  <>
                    <th>Valor</th>
                    <th>Descripción</th>
                  </>
                )}
                {vistaActual === 'achievementTypes' && (
                  <>
                    <th>Valor</th>
                    <th>Descripción</th>
                  </>
                )}
                {vistaActual === 'practiceTypes' && (
                  <>
                    <th>Valor</th>
                    <th>Descripción</th>
                  </>
                )}
                {/* Legalización */}
                {vistaActual === 'geographicScopes' && (
                  <>
                    <th>Valor</th>
                    <th>Estado</th>
                    <th>Descripción</th>
                  </>
                )}
                {vistaActual === 'modalities' && (
                  <>
                    <th>Valor</th>
                    <th>Estado</th>
                    <th>Descripción</th>
                  </>
                )}
                {vistaActual === 'activities' && (
                  <>
                    <th>Valor</th>
                    <th>Estado</th>
                    <th>Descripción</th>
                  </>
                )}
                {/* Ubicaciones */}
                {vistaActual === 'countries' && (
                  <>
                    <th>Nombre</th>
                    <th>Código</th>
                    <th>ISO Alpha 2</th>
                    <th>ISO Numérico</th>
                  </>
                )}
                {vistaActual === 'states' && (
                  <>
                    <th>Nombre</th>
                    <th>Código DIAN</th>
                    <th>País</th>
                  </>
                )}
                {vistaActual === 'cities' && (
                  <>
                    <th>Nombre</th>
                    <th>Código DIAN</th>
                    <th>Estado</th>
                    <th>País</th>
                  </>
                )}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {getCurrentData().length === 0 ? (
                <tr>
                  <td colSpan="10" className="no-data">
                    No hay datos disponibles
                  </td>
                </tr>
              ) : (
                getCurrentData().map((item) => (
                  <tr key={item._id}>
                    {MTM_VIEWS.includes(vistaActual) && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>{item.description || '-'}</td>
                        <td>
                          <span className={`badge ${item.isActive ? 'active' : 'inactive'}`}>
                            {item.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                      </>
                    )}
                    {vistaActual === 'documentTypes' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>
                          <span className={`badge ${item.status === 'active' || item.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                            {item.status === 'active' || item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'studyLevels' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'dedicationTypes' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'arls' && (
                      <>
                        <td>{item.valueForCalculations || '-'}</td>
                        <td>{item.value || '-'}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'eps' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'banks' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {/* Escenario de Práctica */}
                    {vistaActual === 'practiceScenarioTypes' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'sectors' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'sectorMineTypes' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'economicSectors' && (
                      <>
                        <td>{item.value || item.valueForCalculations || '-'}</td>
                        <td>{item.description || item.valueForReports || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'codigosCiiu' && (
                      <>
                        <td>{item.value || item.valueForCalculations || '-'}</td>
                        <td>{item.description || item.valueForReports || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'organizationSizes' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {/* Oportunidades */}
                    {vistaActual === 'linkageTypes' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>
                          <span className={`badge ${item.status === 'active' || item.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                            {item.status === 'active' || item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'performanceAreas' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {/* Estudiantes-Postulantes */}
                    {vistaActual === 'interestAreas' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'competencies' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'languages' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'experienceTypes' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'achievementTypes' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'practiceTypes' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {/* Legalización */}
                    {vistaActual === 'geographicScopes' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>
                          <span className={`badge ${item.status === 'active' || item.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                            {item.status === 'active' || item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'modalities' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>
                          <span className={`badge ${item.status === 'active' || item.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                            {item.status === 'active' || item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'activities' && (
                      <>
                        <td>{item.value || '-'}</td>
                        <td>
                          <span className={`badge ${item.status === 'active' || item.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                            {item.status === 'active' || item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>{item.description || '-'}</td>
                      </>
                    )}
                    {/* Ubicaciones */}
                    {vistaActual === 'countries' && (
                      <>
                        <td>{item.name || '-'}</td>
                        <td>{item.sortname || '-'}</td>
                        <td>{item.isoAlpha2 || '-'}</td>
                        <td>{item.isoNumeric || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'states' && (
                      <>
                        <td>{item.name || '-'}</td>
                        <td>{item.dianCode || '-'}</td>
                        <td>{item.country?.name || '-'}</td>
                      </>
                    )}
                    {vistaActual === 'cities' && (
                      <>
                        <td>{item.name || '-'}</td>
                        <td>{item.codDian || '-'}</td>
                        <td>{item.state?.name || '-'}</td>
                        <td>{item.state?.country?.name || '-'}</td>
                      </>
                    )}
                    <td>
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(item)}
                      >
                        <FiEdit />
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(item)}
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {pagination.pages > 1 && (() => {
        const goTo = (p) => {
          if (p < 1 || p > pagination.pages) return;
          if      (MTM_VIEWS.includes(vistaActual))          loadItems(vistaActual, p, searchTerm);
          else if (vistaActual === 'documentTypes')          loadDocumentTypes(p, searchTerm);
          else if (vistaActual === 'studyLevels')            loadStudyLevels(p, searchTerm);
          else if (vistaActual === 'dedicationTypes')        loadDedicationTypes(p, searchTerm);
          else if (vistaActual === 'arls')                   loadARLs(p, searchTerm);
          else if (vistaActual === 'eps')                    loadEPS(p, searchTerm);
          else if (vistaActual === 'banks')                  loadBanks(p, searchTerm);
          else if (vistaActual === 'practiceScenarioTypes')  loadPracticeScenarioTypes(p, searchTerm);
          else if (vistaActual === 'sectors')                loadSectors(p, searchTerm);
          else if (vistaActual === 'sectorMineTypes')        loadSectorMineTypes(p, searchTerm);
          else if (vistaActual === 'economicSectors')        loadEconomicSectors(p, searchTerm);
          else if (vistaActual === 'codigosCiiu')            loadCodigosCiiu(p, searchTerm);
          else if (vistaActual === 'organizationSizes')      loadOrganizationSizes(p, searchTerm);
          else if (vistaActual === 'linkageTypes')           loadLinkageTypes(p, searchTerm);
          else if (vistaActual === 'performanceAreas')       loadPerformanceAreas(p, searchTerm);
          else if (vistaActual === 'interestAreas')          loadInterestAreas(p, searchTerm);
          else if (vistaActual === 'competencies')           loadCompetencies(p, searchTerm);
          else if (vistaActual === 'languages')              loadLanguages(p, searchTerm);
          else if (vistaActual === 'experienceTypes')        loadExperienceTypes(p, searchTerm);
          else if (vistaActual === 'achievementTypes')       loadAchievementTypes(p, searchTerm);
          else if (vistaActual === 'practiceTypes')          loadPracticeTypes(p, searchTerm);
          else if (vistaActual === 'geographicScopes')       loadGeographicScopes(p, searchTerm);
          else if (vistaActual === 'modalities')             loadModalities(p, searchTerm);
          else if (vistaActual === 'activities')             loadActivities(p, searchTerm);
          else if (vistaActual === 'countries')              loadCountries(p, searchTerm);
          else if (vistaActual === 'states')                 loadStates(p, searchTerm);
          else if (vistaActual === 'cities')                 loadCities(p, searchTerm);
        };

        // Genera los números de página visibles con ellipsis
        const cur   = pagination.page;
        const total = pagination.pages;
        const pages = [];
        if (total <= 7) {
          for (let i = 1; i <= total; i++) pages.push(i);
        } else {
          pages.push(1);
          if (cur > 3) pages.push('...');
          for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
          if (cur < total - 2) pages.push('...');
          pages.push(total);
        }

        return (
          <div className="pagination">
            <span className="pagination-info">{pagination.total} registros · página {cur} de {total}</span>
            <div className="pagination-controls">
              <button className="pagination-btn" onClick={() => goTo(cur - 1)} disabled={cur === 1}>‹</button>
              {pages.map((p, i) =>
                p === '...'
                  ? <span key={`dots-${i}`} className="pagination-dots">…</span>
                  : <button
                      key={p}
                      className={`pagination-btn${p === cur ? ' active-page' : ''}`}
                      onClick={() => goTo(p)}
                    >{p}</button>
              )}
              <button className="pagination-btn" onClick={() => goTo(cur + 1)} disabled={cur === total}>›</button>
            </div>
          </div>
        );
      })()}

      {/* Modal de formulario */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingItem ? 'Editar' : 'Crear'}{' '}
                {vistaActual === 'countries' ? 'País' :
                 vistaActual === 'states' ? 'Estado/Departamento' :
                 vistaActual === 'cities' ? 'Ciudad' :
                 vistaActual === 'codigosCiiu' ? 'Código CIIU' :
                 vistaActual.slice(0, -1)}
              </h3>
              <button className="btn-close" onClick={() => setShowForm(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="ubicaciones-form">
              <div className="form-row">
                {/* Formularios específicos para ubicaciones */}
                {vistaActual === 'countries' && (
                  <>
                    <div className="form-group">
                      <label>Nombre del País *</label>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ej: Colombia"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Código (Sortname) *</label>
                      <input
                        type="text"
                        value={formData.sortname || ''}
                        onChange={(e) => setFormData({ ...formData, sortname: e.target.value.toUpperCase() })}
                        placeholder="Ej: COL"
                        maxLength="3"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>ISO Alpha 2</label>
                      <input
                        type="text"
                        value={formData.isoAlpha2 || ''}
                        onChange={(e) => setFormData({ ...formData, isoAlpha2: e.target.value.toUpperCase() })}
                        placeholder="Ej: CO"
                        maxLength="2"
                      />
                    </div>
                    <div className="form-group">
                      <label>ISO Numérico</label>
                      <input
                        type="number"
                        value={formData.isoNumeric || ''}
                        onChange={(e) => setFormData({ ...formData, isoNumeric: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="Ej: 170"
                      />
                    </div>
                  </>
                )}
                
                {vistaActual === 'states' && (
                  <>
                    <div className="form-group">
                      <label>Nombre del Estado/Departamento *</label>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ej: Antioquia"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Código DIAN</label>
                      <input
                        type="text"
                        value={formData.dianCode || ''}
                        onChange={(e) => setFormData({ ...formData, dianCode: e.target.value })}
                        placeholder="Ej: 05"
                        maxLength="3"
                      />
                    </div>
                    <div className="form-group">
                      <label>País *</label>
                      <select
                        value={formData.country || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, country: e.target.value });
                        }}
                        required
                      >
                        <option value="">Seleccione un país</option>
                        {allCountries.map((country) => (
                          <option key={country._id} value={country._id}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                
                {vistaActual === 'cities' && (
                  <>
                    <div className="form-group">
                      <label>Nombre de la Ciudad *</label>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ej: Medellín"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Código DIAN</label>
                      <input
                        type="text"
                        value={formData.codDian || ''}
                        onChange={(e) => setFormData({ ...formData, codDian: e.target.value })}
                        placeholder="Ej: 05001"
                        maxLength="30"
                      />
                    </div>
                    <div className="form-group">
                      <label>País *</label>
                      <select
                        value={formData.country || ''}
                        onChange={async (e) => {
                          const countryId = e.target.value;
                          setFormData({ ...formData, country: countryId, state: '' });
                          if (countryId) {
                            await loadAllStates(countryId);
                          }
                        }}
                        required
                      >
                        <option value="">Seleccione un país</option>
                        {allCountries.map((country) => (
                          <option key={country._id} value={country._id}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Estado/Departamento *</label>
                      <select
                        value={formData.state || ''}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        disabled={!formData.country}
                        required
                      >
                        <option value="">{formData.country ? 'Seleccione un estado' : 'Primero seleccione un país'}</option>
                        {allStates
                          .filter(state => !formData.country || state.country?._id === formData.country || state.country === formData.country)
                          .map((state) => (
                            <option key={state._id} value={state._id}>
                              {state.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </>
                )}
                
                {/* Formulario genérico usando campos del modelo Item - Solo si no es ubicación */}
                {vistaActual !== 'countries' && vistaActual !== 'states' && vistaActual !== 'cities' && (
                  <>
                    {/* Campo Valor (value) - Principal */}
                    <div className="form-group">
                      <label>Valor *</label>
                      <input
                        type="text"
                        value={formData.value || ''}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        placeholder="Ingrese el valor..."
                        required
                      />
                    </div>
                  </>
                )}
                
                {/* Campo Estado (status) - Solo para vistas que lo requieren */}
                {(vistaActual === 'documentTypes' || vistaActual === 'linkageTypes' || 
                  vistaActual === 'geographicScopes' || vistaActual === 'modalities' || vistaActual === 'activities') && (
                  <div className="form-group form-group-switch">
                    <label>Estado</label>
                    <div className="switch-container">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={formData.status === 'active' || formData.estado === 'Activo'}
                          onChange={(e) => {
                            const isActive = e.target.checked;
                            const status = isActive ? 'active' : 'inactive';
                            setFormData({ ...formData, estado: isActive ? 'Activo' : 'Inactivo', status: status });
                          }}
                        />
                        <span className="slider"></span>
                      </label>
                      <span className="switch-label">
                        {formData.status === 'active' || formData.estado === 'Activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Campo Descripción - Solo para items genéricos */}
                {vistaActual !== 'countries' && vistaActual !== 'states' && vistaActual !== 'cities' && (
                  <div className="form-group">
                    <label>Descripción</label>
                    <textarea
                      rows="3"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descripción opcional..."
                    />
                  </div>
                )}
                
                {/* Campo ID ARL (solo para ARLs) */}
                {vistaActual === 'arls' && (
                  <div className="form-group">
                    <label>ID ARL</label>
                    <input
                      type="text"
                      value={formData.valueForCalculations || ''}
                      onChange={(e) => setFormData({ ...formData, valueForCalculations: e.target.value })}
                      placeholder="Opcional - se generará automáticamente si se deja vacío"
                    />
                  </div>
                )}
                
                {/* Switch para isActive (si aplica) - Solo para items genéricos */}
                {vistaActual !== 'documentTypes' && vistaActual !== 'linkageTypes' && 
                 vistaActual !== 'geographicScopes' && vistaActual !== 'modalities' && vistaActual !== 'activities' &&
                 vistaActual !== 'countries' && vistaActual !== 'states' && vistaActual !== 'cities' && (
                  <div className="form-group form-group-switch">
                    <label>Estado</label>
                    <div className="switch-container">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={formData.isActive !== undefined ? formData.isActive : true}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        />
                        <span className="slider"></span>
                      </label>
                      <span className="switch-label">
                        {formData.isActive !== undefined ? (formData.isActive ? 'Activo' : 'Inactivo') : 'Activo'}
                      </span>
                    </div>
                  </div>
                )}

              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save">
                  {editingItem ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ubicaciones;
