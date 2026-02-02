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
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import '../styles/Ubicaciones.css';
import api from '../../services/api';

// Mapeo de vistas a listId
const VIEW_TO_LIST_ID = {
  'documentTypes': 'L_DOCUMENT_TYPE',
  'studyLevels': 'L_LEVEL_PROGRAM',
  'dedicationTypes': 'L_DEDICATION_JOB_OFFER',
  'arls': 'L_ARL',
  'practiceScenarioTypes': 'L_IDENTIFICATIONTYPE_COMPANY',
  'sectors': 'L_SECTOR',
  'sectorMineTypes': 'L_SNIES_SECTOR',
  'economicSectors': 'L_BUSINESS_SECTOR',
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
  'activities': 'L_MONITORING_ACTIVITY'
};

// Mapeo de campos de formulario a campos de Item
const VIEW_TO_FIELD = {
  'documentTypes': 'tipo',
  'studyLevels': 'nivelEstudio',
  'dedicationTypes': 'dedicacion',
  'arls': 'arl',
  'practiceScenarioTypes': 'tipoIdentificacionEscenario',
  'sectors': 'tipoSector',
  'sectorMineTypes': 'tipoSectorMine',
  'economicSectors': 'tipoSectorEconomico',
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
  'activities': 'actividad'
};

const Ubicaciones = ({ onVolver }) => {
  const navigate = useNavigate();
  const [vistaActual, setVistaActual] = useState('documentTypes');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
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
    valueForCalculations: ''
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
    
    // Parámetros básicos
    if (vistaActual === 'documentTypes') {
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
  }, [vistaActual]);

  // Búsqueda con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const page = 1;
      setPagination(prev => ({ ...prev, page: 1 }));
      
      if (vistaActual === 'documentTypes') {
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
          'documentTypes': setDocumentTypes,
          'studyLevels': setStudyLevels,
          'dedicationTypes': setDedicationTypes,
          'arls': setArls,
          'practiceScenarioTypes': setPracticeScenarioTypes,
          'sectors': setSectors,
          'sectorMineTypes': setSectorMineTypes,
          'economicSectors': setEconomicSectors,
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
          'activities': setActivities
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

  const handleCreate = () => {
    setEditingItem(null);
    resetForm();
    setShowForm(true);
  };

  const handleEdit = async (item) => {
    setEditingItem(item);
    
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
    setShowForm(true);
  };

  const handleDelete = async (item) => {
    const itemName = item.value || 'este elemento';
    const result = await showConfirmation(
      '¿Eliminar?',
      `¿Estás seguro de eliminar ${itemName}?`
    );

    if (result.isConfirmed) {
      try {
        await api.delete(`/locations/items/${item._id}`);
        showSuccess('Eliminado', 'El elemento ha sido eliminado exitosamente');
        
        // Recargar datos usando la función genérica
        await loadItems(vistaActual, pagination.page, searchTerm);
      } catch (error) {
        console.error('Error al eliminar:', error);
        showError('Error', error.response?.data?.message || 'No se pudo eliminar el elemento');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
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
    // Parámetros básicos
    if (vistaActual === 'documentTypes') {
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
    return data;
  };

  return (
    <div className="ubicaciones-container">
      <div className="ubicaciones-header">
        <button className="btn-volver" onClick={() => navigate('/dashboard/configuracion')}>
          <FiArrowLeft className="btn-icon" />
          Volver
        </button>
        <h2>Gestión de Parámetros</h2>
      </div>

      {/* Tabs */}
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
          if (vistaActual === 'documentTypes') loadDocumentTypes(pagination.page, searchTerm);
          else if (vistaActual === 'studyLevels') loadStudyLevels(pagination.page, searchTerm);
          else if (vistaActual === 'dedicationTypes') loadDedicationTypes(pagination.page, searchTerm);
          else if (vistaActual === 'arls') loadARLs(pagination.page, searchTerm);
          // Escenario de Práctica
          else if (vistaActual === 'practiceScenarioTypes') loadPracticeScenarioTypes(pagination.page, searchTerm);
          else if (vistaActual === 'sectors') loadSectors(pagination.page, searchTerm);
          else if (vistaActual === 'sectorMineTypes') loadSectorMineTypes(pagination.page, searchTerm);
          else if (vistaActual === 'economicSectors') loadEconomicSectors(pagination.page, searchTerm);
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
                    <th>Código CIIU</th>
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
      {pagination.pages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => {
              const newPage = pagination.page - 1;
              if (newPage >= 1) {
                if (vistaActual === 'documentTypes') loadDocumentTypes(newPage, searchTerm);
                else if (vistaActual === 'studyLevels') loadStudyLevels(newPage, searchTerm);
                else if (vistaActual === 'dedicationTypes') loadDedicationTypes(newPage, searchTerm);
                else if (vistaActual === 'arls') loadARLs(newPage, searchTerm);
                // Escenario de Práctica
                else if (vistaActual === 'practiceScenarioTypes') loadPracticeScenarioTypes(newPage, searchTerm);
                else if (vistaActual === 'sectors') loadSectors(newPage, searchTerm);
                else if (vistaActual === 'sectorMineTypes') loadSectorMineTypes(newPage, searchTerm);
                else if (vistaActual === 'economicSectors') loadEconomicSectors(newPage, searchTerm);
                else if (vistaActual === 'organizationSizes') loadOrganizationSizes(newPage, searchTerm);
                // Oportunidades
                else if (vistaActual === 'linkageTypes') loadLinkageTypes(newPage, searchTerm);
                else if (vistaActual === 'performanceAreas') loadPerformanceAreas(newPage, searchTerm);
                // Estudiantes-Postulantes
                else if (vistaActual === 'interestAreas') loadInterestAreas(newPage, searchTerm);
                else if (vistaActual === 'competencies') loadCompetencies(newPage, searchTerm);
                else if (vistaActual === 'languages') loadLanguages(newPage, searchTerm);
                else if (vistaActual === 'experienceTypes') loadExperienceTypes(newPage, searchTerm);
                else if (vistaActual === 'achievementTypes') loadAchievementTypes(newPage, searchTerm);
                else if (vistaActual === 'practiceTypes') loadPracticeTypes(newPage, searchTerm);
                // Legalización
                else if (vistaActual === 'geographicScopes') loadGeographicScopes(newPage, searchTerm);
                else if (vistaActual === 'modalities') loadModalities(newPage, searchTerm);
                else if (vistaActual === 'activities') loadActivities(newPage, searchTerm);
              }
            }}
            disabled={pagination.page === 1}
          >
            Anterior
          </button>
          <span className="pagination-info">
            Página {pagination.page} de {pagination.pages} ({pagination.total} total)
          </span>
          <button
            className="pagination-btn"
            onClick={() => {
              const newPage = pagination.page + 1;
              if (newPage <= pagination.pages) {
                if (vistaActual === 'documentTypes') loadDocumentTypes(newPage, searchTerm);
                else if (vistaActual === 'studyLevels') loadStudyLevels(newPage, searchTerm);
                else if (vistaActual === 'dedicationTypes') loadDedicationTypes(newPage, searchTerm);
                else if (vistaActual === 'arls') loadARLs(newPage, searchTerm);
                // Escenario de Práctica
                else if (vistaActual === 'practiceScenarioTypes') loadPracticeScenarioTypes(newPage, searchTerm);
                else if (vistaActual === 'sectors') loadSectors(newPage, searchTerm);
                else if (vistaActual === 'sectorMineTypes') loadSectorMineTypes(newPage, searchTerm);
                else if (vistaActual === 'economicSectors') loadEconomicSectors(newPage, searchTerm);
                else if (vistaActual === 'organizationSizes') loadOrganizationSizes(newPage, searchTerm);
                // Oportunidades
                else if (vistaActual === 'linkageTypes') loadLinkageTypes(newPage, searchTerm);
                else if (vistaActual === 'performanceAreas') loadPerformanceAreas(newPage, searchTerm);
                // Estudiantes-Postulantes
                else if (vistaActual === 'interestAreas') loadInterestAreas(newPage, searchTerm);
                else if (vistaActual === 'competencies') loadCompetencies(newPage, searchTerm);
                else if (vistaActual === 'languages') loadLanguages(newPage, searchTerm);
                else if (vistaActual === 'experienceTypes') loadExperienceTypes(newPage, searchTerm);
                else if (vistaActual === 'achievementTypes') loadAchievementTypes(newPage, searchTerm);
                else if (vistaActual === 'practiceTypes') loadPracticeTypes(newPage, searchTerm);
                // Legalización
                else if (vistaActual === 'geographicScopes') loadGeographicScopes(newPage, searchTerm);
                else if (vistaActual === 'modalities') loadModalities(newPage, searchTerm);
                else if (vistaActual === 'activities') loadActivities(newPage, searchTerm);
              }
            }}
            disabled={pagination.page === pagination.pages}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modal de formulario */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingItem ? 'Editar' : 'Crear'} {vistaActual.slice(0, -1)}</h3>
              <button className="btn-close" onClick={() => setShowForm(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="ubicaciones-form">
              <div className="form-row">
                {/* Formulario genérico usando campos del modelo Item */}
                
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
                
                {/* Campo Descripción */}
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    rows="3"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción opcional..."
                  />
                </div>
                
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
                
                {/* Switch para isActive (si aplica) */}
                {vistaActual !== 'documentTypes' && vistaActual !== 'linkageTypes' && 
                 vistaActual !== 'geographicScopes' && vistaActual !== 'modalities' && vistaActual !== 'activities' && (
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
