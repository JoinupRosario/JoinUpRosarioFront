import { useEffect, useMemo, useState, useRef } from 'react';
import { FiArrowLeft, FiPlus, FiRefreshCw, FiSearch, FiFilter, FiBookOpen, FiDollarSign, FiFileText, FiUsers, FiCalendar, FiMapPin, FiClock, FiBook, FiX, FiEdit, FiXCircle, FiCopy, FiList, FiArrowUp, FiArrowDown, FiAlertCircle } from 'react-icons/fi';
import { HiOutlineAcademicCap } from 'react-icons/hi';
import { useAuth } from '../../contexts/AuthContext';
import Swal from 'sweetalert2';
import api from '../../services/api';
import { Country, City } from 'country-state-city';
import '../styles/Oportunidades.css';

export default function Oportunidades({ onVolver }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [oportunidades, setOportunidades] = useState([]);
  const [companySearchResults, setCompanySearchResults] = useState([]);
  const [companySearchLoading, setCompanySearchLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [vista, setVista] = useState('lista'); // lista | crear | detalle | editar
  const [oportunidadSeleccionada, setOportunidadSeleccionada] = useState(null);
  const [showModalAprobacion, setShowModalAprobacion] = useState(false);
  const [showModalRechazo, setShowModalRechazo] = useState(false);
  const [showModalHistorial, setShowModalHistorial] = useState(false);
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
  const [selectedLinkageDescription, setSelectedLinkageDescription] = useState('');
  
  // Estados para filtros, paginación y ordenamiento
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    numeroOportunidad: '',
    tipoOportunidad: '',
    nombreCargo: '',
    empresa: '',
    empresaConfidenciales: false,
    fechaCierreDesde: '',
    fechaCierreHasta: '',
    formacionAcademica: '',
    estadosRevision: '',
    requisitos: '',
    estado: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
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
    jornadaSemanalPractica: '',
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
  
  // Estados para países y ciudades
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);

  // Opciones de salario emocional
  const opcionesSalarioEmocional = [
    { value: 'acompanamiento_directivo', label: 'Acompañamiento de un directivo de la organización' },
    { value: 'actividades_voluntariado', label: 'Actividades de Voluntariado notables' },
    { value: 'capacitacion_complementaria', label: 'Capacitación complementaria para el proceso formativo' },
    { value: 'comida_casino', label: 'Comida o casino para almuerzo' },
    { value: 'desarrollo_carrera', label: 'Desarrollo de carrera profesional' },
    { value: 'dia_cumpleanos_libre', label: 'Dia de cumpleaños libre' },
    { value: 'espacios_distraccion', label: 'Espacios de distracción - zona de entretenimiento' },
    { value: 'gimnasio_yoga_masajes', label: 'Gimnasio, yoga, masajes, sitios de descanso' },
    { value: 'horario_flexible', label: 'Horario Flexible' },
    { value: 'jornadas_reducidas', label: 'Jornadas reducidas' },
    { value: 'pago_arl', label: 'Pago de ARL' },
    { value: 'pago_eps', label: 'Pago de EPS' },
    { value: 'ruta_transporte', label: 'Ruta o servicio de transporte al trabajo' },
    { value: 'dia_medio_dia', label: 'Un dia a la semana saliendo a medio dia' }
  ];

  // Filtrar opciones de salario emocional
  const filteredSalarioEmocional = useMemo(() => {
    if (!salarioEmocionalSearch.trim()) return opcionesSalarioEmocional;
    const q = salarioEmocionalSearch.toLowerCase();
    return opcionesSalarioEmocional.filter(opcion =>
      opcion.label.toLowerCase().includes(q)
    );
  }, [salarioEmocionalSearch]);

  // Filtrar opciones que ya están seleccionadas para no mostrarlas en el dropdown (vista crear)
  const filteredSalarioEmocionalDisponibles = useMemo(() => {
    if (!formData.salarioEmocional || formData.salarioEmocional.length === 0) return filteredSalarioEmocional;
    return filteredSalarioEmocional.filter(opcion => 
      !formData.salarioEmocional.includes(opcion.value)
    );
  }, [filteredSalarioEmocional, formData.salarioEmocional]);

  // Verificar si el usuario es administrativo
  // Todos los usuarios con modulo 'administrativo' deben seleccionar empresa
  // Leer desde localStorage si no está en el contexto
  const modulo = user?.modulo || localStorage.getItem('modulo');
  const isAdmin = modulo === 'administrativo';

  const loadOportunidades = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        search: search || undefined,
        ...filters,
        sortField: sortField,
        sortDirection: sortDirection === 'descendente' ? 'desc' : 'asc'
      };
      
      // Limpiar parámetros undefined
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
      
      const { data } = await api.get('/opportunities', { params });
      // El backend devuelve { opportunities, total, totalPages, currentPage }
      setOportunidades(data.opportunities || data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotalRecords(data.total || 0);
      setCurrentPage(data.currentPage || 1);
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
    // Cargar países
    setCountries(Country.getAllCountries());
    // Cargar datos dinámicos desde Item
    loadItemsData();
  }, [isAdmin]);

  // Función para cargar datos dinámicos desde Item
  const loadItemsData = async () => {
    try {
      // Cargar Tipos de Vinculación (L_CONTRACT_TYPE_ACADEMIC_PRACTICE)
      const { data: linkageData } = await api.get('/locations/items/L_CONTRACT_TYPE_ACADEMIC_PRACTICE', { params: { limit: 100 } });
      setLinkageTypes(linkageData.data || []);

      // Cargar Dedicación (L_DEDICATION_JOB_OFFER)
      const { data: dedicationData } = await api.get('/locations/items/L_DEDICATION_JOB_OFFER', { params: { limit: 100 } });
      setDedicationTypes(dedicationData.data || []);

      // Cargar Áreas de Desempeño (L_INTEREST_AREA)
      const { data: performanceData } = await api.get('/locations/items/L_INTEREST_AREA', { params: { limit: 100 } });
      setPerformanceAreas(performanceData.data || []);
    } catch (error) {
      console.error('Error cargando datos dinámicos:', error);
    }
  };

  // Actualizar descripción del tipo de vinculación cuando cambia el valor seleccionado
  useEffect(() => {
    if (formData.tipoVinculacion && linkageTypes.length > 0) {
      const selectedLinkage = linkageTypes.find(linkage => linkage.value === formData.tipoVinculacion);
      setSelectedLinkageDescription(selectedLinkage?.description || '');
    } else {
      setSelectedLinkageDescription('');
    }
  }, [formData.tipoVinculacion, linkageTypes]);

  // Actualizar descripción del tipo de vinculación en modo edición
  useEffect(() => {
    if (editFormData?.tipoVinculacion && linkageTypes.length > 0) {
      const selectedLinkage = linkageTypes.find(linkage => linkage.value === editFormData.tipoVinculacion);
      setSelectedLinkageDescription(selectedLinkage?.description || '');
    } else if (!editFormData?.tipoVinculacion) {
      setSelectedLinkageDescription('');
    }
  }, [editFormData?.tipoVinculacion, linkageTypes]);

  useEffect(() => {
    loadOportunidades();
  }, [currentPage, sortField, sortDirection]);

  // Función para limpiar filtros
  const handleClearFilters = () => {
    setFilters({
      numeroOportunidad: '',
      tipoOportunidad: '',
      nombreCargo: '',
      empresa: '',
      empresaConfidenciales: false,
      fechaCierreDesde: '',
      fechaCierreHasta: '',
      formacionAcademica: '',
      estadosRevision: '',
      requisitos: '',
      estado: ''
    });
    setSearch('');
    setCurrentPage(1);
    loadOportunidades();
  };

  // Función para aplicar filtros
  const handleApplyFilters = () => {
    setCurrentPage(1);
    loadOportunidades();
  };
  
  // Cargar ciudades cuando se selecciona un país
  useEffect(() => {
    if (formData.pais) {
      const countryCities = City.getCitiesOfCountry(formData.pais);
      setCities(countryCities || []);
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

  const filteredOportunidades = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return oportunidades;
    return oportunidades.filter(o =>
      o.title?.toLowerCase().includes(q) ||
      o.company?.name?.toLowerCase().includes(q) ||
      o.opportunityNumber?.toString().includes(q)
    );
  }, [oportunidades, search]);

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
      // Mostrar modal informativo antes de ir al formulario
      setShowModalInfo(true);
    } else if (tipo === 'monitoria') {
      // Auto-seleccionar UNIVERSIDAD DEL ROSARIO por NIT
      setLoadingUniversidad(true);
      try {
        const { data } = await api.get('/companies', { params: { search: '8600077593', limit: 10, page: 1 } });
        const results = data?.data || data?.companies || [];
        const universidad = results.find(
          (c) =>
            (c.nit || '').replace(/\D/g, '') === '8600077593' ||
            (c.name || '').toUpperCase().includes('ROSARIO') ||
            (c.commercialName || '').toUpperCase().includes('ROSARIO')
        );
        if (!universidad) {
          await Swal.fire({
            icon: 'warning',
            title: 'Empresa no encontrada',
            text: 'No se encontró la empresa Universidad del Rosario (NIT 8600077593). Contacte al administrador del sistema.',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#c41e3a',
          });
          return;
        }
        setSelectedCompany(universidad);
        setTipoOportunidad('monitoria');
      } catch (e) {
        console.error('Error buscando empresa universidad', e);
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar la empresa de la universidad.',
          confirmButtonColor: '#c41e3a',
        });
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
    
    // Manejo especial para tipo de vinculación - actualizar descripción
    if (name === 'tipoVinculacion') {
      const selectedLinkage = linkageTypes.find(linkage => linkage.value === value);
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

  // Función para eliminar programa
  const handleRemoveProgram = (index) => {
    setFormData(prev => ({
      ...prev,
      formacionAcademica: prev.formacionAcademica.filter((_, i) => i !== index)
    }));
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

      // Preparar datos para enviar
      const opportunityData = {
        nombreCargo: editFormData.nombreCargo,
        auxilioEconomico: editFormData.auxilioEconomico,
        requiereConfidencialidad: editFormData.requiereConfidencialidad,
        apoyoEconomico: editFormData.apoyoEconomico ? parseInt(editFormData.apoyoEconomico) : null,
        tipoVinculacion: editFormData.tipoVinculacion || null,
        periodo: editFormData.periodo || null,
        vacantes: editFormData.vacantes ? parseInt(editFormData.vacantes) : null,
        fechaVencimiento: editFormData.fechaVencimiento || null,
        pais: editFormData.pais || null,
        ciudad: editFormData.ciudad || null,
        jornadaOrdinariaSemanal: editFormData.jornadaOrdinariaSemanal ? parseInt(editFormData.jornadaOrdinariaSemanal) : null,
        dedicacion: editFormData.dedicacion || null,
        jornadaSemanalPractica: editFormData.jornadaSemanalPractica ? parseInt(editFormData.jornadaSemanalPractica) : null,
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
      // Recargar datos en editFormData
      const formDataEdit = {
        nombreCargo: updatedOpp.nombreCargo || '',
        auxilioEconomico: updatedOpp.auxilioEconomico || false,
        requiereConfidencialidad: updatedOpp.requiereConfidencialidad || false,
        apoyoEconomico: updatedOpp.apoyoEconomico ? updatedOpp.apoyoEconomico.toString() : '',
        tipoVinculacion: updatedOpp.tipoVinculacion || '',
        periodo: updatedOpp.periodo || '',
        vacantes: updatedOpp.vacantes ? updatedOpp.vacantes.toString() : '',
        fechaVencimiento: updatedOpp.fechaVencimiento ? new Date(updatedOpp.fechaVencimiento).toISOString().split('T')[0] : '',
        pais: updatedOpp.pais || '',
        ciudad: updatedOpp.ciudad || '',
        jornadaOrdinariaSemanal: updatedOpp.jornadaOrdinariaSemanal ? updatedOpp.jornadaOrdinariaSemanal.toString() : '',
        dedicacion: updatedOpp.dedicacion || '',
        jornadaSemanalPractica: updatedOpp.jornadaSemanalPractica ? updatedOpp.jornadaSemanalPractica.toString() : '',
        fechaInicioPractica: updatedOpp.fechaInicioPractica ? new Date(updatedOpp.fechaInicioPractica).toISOString().split('T')[0] : '',
        fechaFinPractica: updatedOpp.fechaFinPractica ? new Date(updatedOpp.fechaFinPractica).toISOString().split('T')[0] : '',
        horario: updatedOpp.horario || '',
        areaDesempeno: updatedOpp.areaDesempeno || '',
        enlacesFormatoEspecificos: updatedOpp.enlacesFormatoEspecificos || '',
        salarioEmocional: (() => {
          // Convertir salarioEmocional a array si es string (compatibilidad con datos antiguos)
          return Array.isArray(updatedOpp.salarioEmocional) 
            ? updatedOpp.salarioEmocional 
            : (updatedOpp.salarioEmocional ? [updatedOpp.salarioEmocional] : []);
        })(),
        promedioMinimoRequerido: updatedOpp.promedioMinimoRequerido || '',
        formacionAcademica: updatedOpp.formacionAcademica || [],
        idiomas: updatedOpp.idiomas || [],
        funciones: updatedOpp.funciones || '',
        requisitos: updatedOpp.requisitos || ''
      };
      setEditFormData(formDataEdit);
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

      // Preparar datos para enviar
      const opportunityData = {
        tipo: tipoOportunidad,
        company: selectedCompany._id,
        nombreCargo: formData.nombreCargo,
        auxilioEconomico: formData.auxilioEconomico,
        requiereConfidencialidad: formData.requiereConfidencialidad,
        apoyoEconomico: formData.apoyoEconomico ? parseInt(formData.apoyoEconomico) : null,
        tipoVinculacion: formData.tipoVinculacion || null,
        periodo: formData.periodo || null,
        vacantes: formData.vacantes ? parseInt(formData.vacantes) : null,
        fechaVencimiento: formData.fechaVencimiento || null,
        pais: formData.pais || null,
        ciudad: formData.ciudad || null,
        jornadaOrdinariaSemanal: formData.jornadaOrdinariaSemanal ? parseInt(formData.jornadaOrdinariaSemanal) : null,
        dedicacion: formData.dedicacion || null,
        jornadaSemanalPractica: formData.jornadaSemanalPractica ? parseInt(formData.jornadaSemanalPractica) : null,
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
        text: 'La oportunidad se ha creado correctamente',
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
        jornadaSemanalPractica: '',
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
                    formData.jornadaSemanalPractica ||
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
      jornadaSemanalPractica: '',
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
      Swal.fire({
        title: 'Aprobando programa...',
        text: 'Por favor espere',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
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
        confirmButtonColor: '#c41e3a'
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
      
      setShowModalAprobacion(false);
      await loadOportunidades();
    } catch (error) {
      Swal.close();
      const errorMessage = error.response?.data?.message || error.message || 'Error al aprobar programa';
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    }
  };

  // Función para rechazar programa
  const handleRechazarPrograma = async (programa, comentarios) => {
    if (!oportunidadSeleccionada) return;
    
    try {
      Swal.fire({
        title: 'Rechazando programa...',
        text: 'Por favor espere',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
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
        confirmButtonColor: '#c41e3a'
      });

      // Recargar la oportunidad
      const { data } = await api.get(`/opportunities/${oportunidadSeleccionada._id}`);
      setOportunidadSeleccionada(data);
      setShowModalAprobacion(false);
      await loadOportunidades();
    } catch (error) {
      Swal.close();
      const errorMessage = error.response?.data?.message || error.message || 'Error al rechazar programa';
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
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

  // Función para obtener el texto del tipo de vinculación
  const getTipoVinculacionText = (tipo) => {
    const tipos = {
      'contrato_laboral_nomina': 'Contrato laboral por nómina',
      'contrato_aprendizaje': 'Contrato de aprendizaje',
      'convenio_docencia_servicio': 'Convenio docencia servicio',
      'acto_administrativo': 'Acto administrativo',
      'acuerdo_vinculacion': 'Acuerdo de vinculación',
      'otro_documento': 'Otro documento'
    };
    return tipos[tipo] || tipo;
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
    
    try {
      const { data } = await api.get(`/opportunities/${oportunidadSeleccionada._id}/history`);
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

  // Función para duplicar oportunidad
  const handleDuplicarOportunidad = async () => {
    try {
      const result = await Swal.fire({
        icon: 'question',
        title: '¿Duplicar oportunidad?',
        text: 'Se creará una nueva oportunidad con los mismos datos',
        showCancelButton: true,
        confirmButtonText: 'Sí, duplicar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#c41e3a',
        cancelButtonColor: '#6c757d'
      });

      if (!result.isConfirmed) return;

      Swal.fire({
        title: 'Duplicando oportunidad...',
        text: 'Por favor espere',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const { data } = await api.post(`/opportunities/${oportunidadSeleccionada._id}/duplicate`);

      Swal.close();
      await Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: 'La oportunidad ha sido duplicada correctamente',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });

      // Recargar lista y volver a ella
      await loadOportunidades();
      setVista('lista');
      setOportunidadSeleccionada(null);
    } catch (error) {
      Swal.close();
      const errorMessage = error.response?.data?.message || error.message || 'Error al duplicar oportunidad';
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

  // Cargar ciudades cuando se selecciona un país en edición/detalle
  useEffect(() => {
    if ((vista === 'editar' || vista === 'detalle') && editFormData && editFormData.pais) {
      const countryCities = City.getCitiesOfCountry(editFormData.pais);
      setEditCities(countryCities || []);
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

  // Inicializar editFormData cuando se carga una oportunidad en detalle
  useEffect(() => {
    if (vista === 'detalle' && oportunidadSeleccionada && !editFormData) {
      const opp = oportunidadSeleccionada;
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
        jornadaSemanalPractica: opp.jornadaSemanalPractica ? opp.jornadaSemanalPractica.toString() : '',
        fechaInicioPractica: opp.fechaInicioPractica ? new Date(opp.fechaInicioPractica).toISOString().split('T')[0] : '',
        fechaFinPractica: opp.fechaFinPractica ? new Date(opp.fechaFinPractica).toISOString().split('T')[0] : '',
        horario: opp.horario || '',
        areaDesempeno: opp.areaDesempeno || '',
        enlacesFormatoEspecificos: opp.enlacesFormatoEspecificos || '',
        salarioEmocional: (() => {
          // Convertir salarioEmocional a array si es string (compatibilidad con datos antiguos)
          return Array.isArray(opp.salarioEmocional) 
            ? opp.salarioEmocional 
            : (opp.salarioEmocional ? [opp.salarioEmocional] : []);
        })(),
        promedioMinimoRequerido: opp.promedioMinimoRequerido || '',
        formacionAcademica: opp.formacionAcademica || [],
        idiomas: opp.idiomas || [],
        funciones: opp.funciones || '',
        requisitos: opp.requisitos || ''
      };
      setEditFormData(formDataEdit);
      setEditSelectedCompany(opp.company);
      setIsEditingDetail(false); // Inicializar en modo solo lectura
    }
  }, [vista, oportunidadSeleccionada]); // Removido editFormData de las dependencias para evitar resetear cuando se agregan programas/idiomas

  // Filtrar opciones de salario emocional para edición
  const filteredEditSalarioEmocional = useMemo(() => {
    if (!editSalarioEmocionalSearch.trim()) return opcionesSalarioEmocional;
    const q = editSalarioEmocionalSearch.toLowerCase();
    return opcionesSalarioEmocional.filter(opcion =>
      opcion.label.toLowerCase().includes(q)
    );
  }, [editSalarioEmocionalSearch]);

  // Filtrar opciones que ya están seleccionadas para no mostrarlas en el dropdown
  const filteredEditSalarioEmocionalDisponibles = useMemo(() => {
    if (!editFormData || !editFormData.salarioEmocional) return filteredEditSalarioEmocional;
    return filteredEditSalarioEmocional.filter(opcion => 
      !editFormData.salarioEmocional.includes(opcion.value)
    );
  }, [filteredEditSalarioEmocional, editFormData?.salarioEmocional]);

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
          ) : (tipoOportunidad === 'practica' || tipoOportunidad === 'monitoria') ? (
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
                          <p>El apoyo económico debe ser superior o igual al salario mínimo vigente. El formato se aplicará automáticamente con separador de miles</p>
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
                      />
                    </div>
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
                      <option key={linkage._id} value={linkage.value}>
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
                    <option value="20261">20261</option>
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
                  />
                </div>

                {/* País / Ciudad */}
                <div className="form-field-group form-field-half-width">
                  <label className="form-label-with-icon">
                    <FiMapPin className="label-icon" />
                    País / Ciudad
                  </label>
                  <div className="country-city-group">
                    <select
                      name="pais"
                      value={formData.pais}
                      onChange={handleFormChange}
                      className="form-select"
                    >
                      <option value="">Seleccionar</option>
                      {countries.map(country => (
                        <option key={country.isoCode} value={country.isoCode}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                    <select
                      name="ciudad"
                      value={formData.ciudad}
                      onChange={handleFormChange}
                      className="form-select"
                      disabled={!formData.pais}
                    >
                      <option value="">Seleccionar</option>
                      {cities.map(city => (
                        <option key={city.name} value={city.name}>
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
                        <p>En Colombia, no puede exceder 48 horas semanales ni 8 diarias.</p>
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
                    max="48"
                    placeholder="Horas semanales"
                  />
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
                      <option key={dedication._id} value={dedication.value}>
                        {dedication.value}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Jornada Semanal de la Práctica */}
                <div className="form-field-group">
                  <label className="form-label">
                    Jornada semanal de la práctica
                    <div className="info-tooltip-wrapper">
                      <span className="info-icon">i</span>
                      <div className="tooltip-content">
                        <strong>Información</strong>
                        <p>Este campo debe seguir los parámetros de la Resolución 3546 de 2018 y representará la jornada semanal que cumplirá el practicante o practicantes seleccionados. Cuando la dedicación es por horas indique la dedicación promedio semanal en horas</p>
                      </div>
                    </div>
                  </label>
                  <input
                    type="number"
                    name="jornadaSemanalPractica"
                    value={formData.jornadaSemanalPractica}
                    onChange={handleFormChange}
                    className="form-input"
                    min="0"
                    placeholder="Horas semanales"
                  />
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
                      <option key={area._id} value={area.value}>
                        {area.value}
                      </option>
                    ))}
                    <option value="planificacion_urbana_regional">Planificación urbana y regional</option>
                    <option value="instrumentos_planificacion_gestion_suelo">Instrumentos de planificación y gestión de suelo</option>
                    <option value="espacio_publico">Espacio público</option>
                    <option value="movilidad_transporte">Movilidad y transporte</option>
                    <option value="gestion_ambiental">Gestión ambiental</option>
                    <option value="gestion_inmobiliaria">Gestión inmobiliaria</option>
                    <option value="habitat_vivienda">Hábitat y vivienda</option>
                    <option value="finanzas_publicas">Finanzas públicas</option>
                    <option value="gestion_centros_historicos_patrimonio">Gestión de centros históricos y patrimonio</option>
                    <option value="planeacion">Planeación</option>
                    <option value="ingenieria_clinica_hospitalaria">Ingeniería clínica hospitalaria</option>
                    <option value="ingenieria_rehabilitacion">Ingeniería de la rehabilitación</option>
                    <option value="informatica_medica">Informática médica</option>
                    <option value="procesamiento_imagenes_diagnosticas">Procesamiento de imágenes diagnósticas</option>
                    <option value="nanotecnologia">Nanotecnología</option>
                    <option value="inteligencia_artificial">Inteligencia artificial</option>
                    <option value="medicina">Medicina</option>
                    <option value="ingenieria_biomedica">Ingeniería Biomédica</option>
                    <option value="geopolitica">Geopolítica</option>
                    <option value="politica_internacional">Política internacional</option>
                    <option value="seguridad">Seguridad</option>
                    <option value="diplomacia">Diplomacia</option>
                    <option value="inversiones">Inversiones</option>
                    <option value="ciencia_politica">Ciencia Política</option>
                    <option value="gestion_urbana">Gestión Urbana</option>
                    <option value="urbanismo">Urbanismo</option>
                    <option value="docencia">Docencia</option>
                    <option value="acompanamiento_estudiantil">Acompañamiento estudiantil</option>
                    <option value="mentoria">Mentoría</option>
                    <option value="relaciones_internacionales">Relaciones internacionales</option>
                    <option value="economia_politica">Economía Política</option>
                    <option value="coyuntura_politica">Coyuntura Política</option>
                    <option value="fronteras">Fronteras</option>
                    <option value="sistemas_politicos">Sistemas Políticos</option>
                    <option value="sistemas_urbanos">Sistemas Urbanos</option>
                    <option value="gobierno_gerencia_publica">Gobierno y gerencia pública</option>
                    <option value="politica_internacional_diplomacia">Política internacional y diplomacia</option>
                    <option value="seguridad_paz_conflicto">Seguridad, paz y conflicto</option>
                    <option value="desarrollo_participacion">Desarrollo y participación</option>
                    <option value="ciudades_territorios_sostenibles">Ciudades y Territorios Sostenibles</option>
                    <option value="migraciones_internacionales">Migraciones Internacionales</option>
                    <option value="derechos_humanos">Derechos Humanos</option>
                    <option value="justicia_transicional">Justicia Transicional</option>
                    <option value="construccion_paz">Construcción de paz</option>
                    <option value="artes_visuales">Artes visuales</option>
                    <option value="artes_escenicas">Artes escénicas</option>
                    <option value="artes_literarias">Artes literarias</option>
                    <option value="audiovisuales">Audiovisuales</option>
                    <option value="artes_electronicas">Artes electrónicas</option>
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
                    <label htmlFor="primerDocumento" className="file-select-button">
                      <FiFileText className="file-icon" />
                      Seleccionar archivo
                    </label>
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
                    <label htmlFor="segundoDocumento" className="file-select-button">
                      <FiFileText className="file-icon" />
                      Seleccionar archivo
                    </label>
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
                    <label htmlFor="tercerDocumento" className="file-select-button">
                      <FiFileText className="file-icon" />
                      Seleccionar archivo
                    </label>
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
                        onClick={() => setShowProgramsModal(true)} 
                        title="Añadir programa"
                      >
                        <FiPlus />
                      </button>
                    </div>
                    {(!formData.formacionAcademica || formData.formacionAcademica.length === 0) ? (
                      <div className="programs-empty">
                        <FiX style={{ marginRight: '4px', display: 'inline-block' }} />
                        No hay programas configurados.
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
          ) : null}
        </div>

        {/* Modal de Programas (Formación Académica) */}
        {showProgramsModal && (
          <div className="modal-overlay" onClick={() => setShowProgramsModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h4>Programas</h4>
                <button className="modal-close" onClick={() => setShowProgramsModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="modal-field">
                  <label>Nivel <span className="required">*</span></label>
                  <select value={newProgramLevel} onChange={e => setNewProgramLevel(e.target.value)}>
                    <option value="">- Seleccione un Nivel -</option>
                    <option value="Pregrado">Pregrado</option>
                    <option value="Posgrado">Posgrado</option>
                    <option value="Tecnológico">Tecnológico</option>
                  </select>
                </div>
                <div className="modal-field">
                  <label>Programa <span className="required">*</span></label>
                  <select value={newProgramName} onChange={e => setNewProgramName(e.target.value)}>
                    <option value="">- Seleccione un programa -</option>
                    <option value="Administración de Empresas">Administración de Empresas</option>
                    <option value="Ingeniería">Ingeniería</option>
                    <option value="Economía">Economía</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowProgramsModal(false)}>Cerrar</button>
                <button className="btn-guardar" onClick={handleAddProgram}>Añadir</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Idiomas */}
        {showLanguagesModal && (
          <div className="modal-overlay" onClick={() => setShowLanguagesModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h4>Idiomas</h4>
                <button className="modal-close" onClick={() => setShowLanguagesModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="modal-field">
                  <label>Seleccionar idioma <span className="required">*</span></label>
                  <select value={newLanguage} onChange={e => setNewLanguage(e.target.value)}>
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
                  <select value={newLanguageLevel} onChange={e => setNewLanguageLevel(e.target.value)}>
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
                    />
                  </div>
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
                    <option key={linkage._id} value={linkage.value}>
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
                  <option value="20261">20261</option>
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
                />
              </div>

              {/* País / Ciudad */}
              <div className="form-field-group form-field-half-width">
                <label className="form-label-with-icon">
                  <FiMapPin className="label-icon" />
                  País / Ciudad
                </label>
                <div className="country-city-group">
                  <select
                    name="pais"
                    value={editFormData.pais}
                    onChange={handleEditFormChange}
                    className="form-select"
                  >
                    <option value="">Seleccionar</option>
                    {countries.map(country => (
                      <option key={country.isoCode} value={country.isoCode}>
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
                      <option key={city.name} value={city.name}>
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
                </label>
                <input
                  type="number"
                  name="jornadaOrdinariaSemanal"
                  value={editFormData.jornadaOrdinariaSemanal}
                  onChange={handleEditFormChange}
                  className="form-input"
                  min="0"
                  max="48"
                  placeholder="Horas semanales"
                />
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
                    <option key={dedication._id} value={dedication.value}>
                      {dedication.value}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jornada Semanal de la Práctica */}
              <div className="form-field-group">
                <label className="form-label">
                  Jornada semanal de la práctica
                </label>
                <input
                  type="number"
                  name="jornadaSemanalPractica"
                  value={editFormData.jornadaSemanalPractica}
                  onChange={handleEditFormChange}
                  className="form-input"
                  min="0"
                  placeholder="Horas semanales"
                />
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
                  <option value="administrativa">Administrativa (Proyectos, Gerencia, Dirección Administrativa, Tesorería)</option>
                  <option value="archivo">Archivo</option>
                  <option value="area_contable">Area Contable</option>
                  <option value="area_financiera">Área financiera</option>
                  <option value="auditoria">Auditoría</option>
                  <option value="bienestar">Bienestar</option>
                  <option value="calidad">Calidad</option>
                  <option value="capacitacion">Capacitación</option>
                  <option value="compras_importaciones">Compras e importaciones</option>
                  <option value="comunicaciones">Comunicaciones</option>
                  <option value="contabilidad">Contabilidad</option>
                  <option value="gerencia">Gerencia</option>
                  <option value="investigacion">Investigación</option>
                  <option value="juridica">Jurídica</option>
                  <option value="logistica_cadena_suministro">Logística y cadena de suministro</option>
                  <option value="mercadeo">Mercadeo</option>
                  <option value="politica_publica">Política pública</option>
                  <option value="presidencia">Presidencia</option>
                  <option value="produccion">Producción</option>
                  <option value="proyectos">Proyectos</option>
                  <option value="recursos_humanos">Recursos humanos</option>
                  <option value="responsabilidad_social">Responsabilidad social</option>
                  <option value="riesgos">Riesgos</option>
                  <option value="servicio_cliente">Servicio al cliente</option>
                  <option value="sostenibilidad">Sostenibilidad</option>
                  <option value="tecnologia">Tecnología</option>
                  <option value="area_ambiental">Área ambiental</option>
                  <option value="comercial_ventas_exportaciones">Comercial (Ventas - Exportaciones - Servicio al Cliente) y Mercadeo</option>
                  <option value="finanzas">Finanzas</option>
                  <option value="emprendimiento">Emprendimiento</option>
                  <option value="planificacion_urbana_regional">Planificación urbana y regional</option>
                  <option value="instrumentos_planificacion_gestion_suelo">Instrumentos de planificación y gestión de suelo</option>
                  <option value="espacio_publico">Espacio público</option>
                  <option value="movilidad_transporte">Movilidad y transporte</option>
                  <option value="gestion_ambiental">Gestión ambiental</option>
                  <option value="gestion_inmobiliaria">Gestión inmobiliaria</option>
                  <option value="habitat_vivienda">Hábitat y vivienda</option>
                  <option value="finanzas_publicas">Finanzas públicas</option>
                  <option value="gestion_centros_historicos_patrimonio">Gestión de centros históricos y patrimonio</option>
                  <option value="planeacion">Planeación</option>
                  <option value="ingenieria_clinica_hospitalaria">Ingeniería clínica hospitalaria</option>
                  <option value="ingenieria_rehabilitacion">Ingeniería de la rehabilitación</option>
                  <option value="informatica_medica">Informática médica</option>
                  <option value="procesamiento_imagenes_diagnosticas">Procesamiento de imágenes diagnósticas</option>
                  <option value="nanotecnologia">Nanotecnología</option>
                  <option value="inteligencia_artificial">Inteligencia artificial</option>
                  <option value="medicina">Medicina</option>
                  <option value="ingenieria_biomedica">Ingeniería Biomédica</option>
                  <option value="geopolitica">Geopolítica</option>
                  <option value="politica_internacional">Política internacional</option>
                  <option value="seguridad">Seguridad</option>
                  <option value="diplomacia">Diplomacia</option>
                  <option value="inversiones">Inversiones</option>
                  <option value="ciencia_politica">Ciencia Política</option>
                  <option value="gestion_urbana">Gestión Urbana</option>
                  <option value="urbanismo">Urbanismo</option>
                  <option value="docencia">Docencia</option>
                  <option value="acompanamiento_estudiantil">Acompañamiento estudiantil</option>
                  <option value="mentoria">Mentoría</option>
                  <option value="relaciones_internacionales">Relaciones internacionales</option>
                  <option value="economia_politica">Economía Política</option>
                  <option value="coyuntura_politica">Coyuntura Política</option>
                  <option value="fronteras">Fronteras</option>
                  <option value="sistemas_politicos">Sistemas Políticos</option>
                  <option value="sistemas_urbanos">Sistemas Urbanos</option>
                  <option value="gobierno_gerencia_publica">Gobierno y gerencia pública</option>
                  <option value="politica_internacional_diplomacia">Política internacional y diplomacia</option>
                  <option value="seguridad_paz_conflicto">Seguridad, paz y conflicto</option>
                  <option value="desarrollo_participacion">Desarrollo y participación</option>
                  <option value="ciudades_territorios_sostenibles">Ciudades y Territorios Sostenibles</option>
                  <option value="migraciones_internacionales">Migraciones Internacionales</option>
                  <option value="derechos_humanos">Derechos Humanos</option>
                  <option value="justicia_transicional">Justicia Transicional</option>
                  <option value="construccion_paz">Construcción de paz</option>
                  <option value="artes_visuales">Artes visuales</option>
                  <option value="artes_escenicas">Artes escénicas</option>
                  <option value="artes_literarias">Artes literarias</option>
                  <option value="audiovisuales">Audiovisuales</option>
                  <option value="artes_electronicas">Artes electrónicas</option>
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
                      onClick={() => setEditShowProgramsModal(true)} 
                      title="Añadir programa"
                    >
                      <FiPlus />
                    </button>
                  </div>
                  {(!editFormData.formacionAcademica || editFormData.formacionAcademica.length === 0) ? (
                    <div className="programs-empty">
                      <FiX style={{ marginRight: '4px', display: 'inline-block' }} />
                      No hay programas configurados.
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

          {/* Modales para edición */}
          {editShowProgramsModal && (
            <div className="modal-overlay" onClick={() => setEditShowProgramsModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h4>Programas</h4>
                  <button className="modal-close" onClick={() => setEditShowProgramsModal(false)}>×</button>
                </div>
                <div className="modal-body">
                  <div className="modal-field">
                    <label>Nivel <span className="required">*</span></label>
                    <select value={editNewProgramLevel} onChange={e => setEditNewProgramLevel(e.target.value)}>
                      <option value="">- Seleccione un Nivel -</option>
                      <option value="Pregrado">Pregrado</option>
                      <option value="Posgrado">Posgrado</option>
                    </select>
                  </div>
                  <div className="modal-field">
                    <label>Programa <span className="required">*</span></label>
                    <select value={editNewProgramName} onChange={e => setEditNewProgramName(e.target.value)}>
                      <option value="">- Seleccione un programa -</option>
                      <option value="Administración de Empresas">Administración de Empresas</option>
                      <option value="Ingeniería">Ingeniería</option>
                      <option value="Economía">Economía</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn-secondary" onClick={() => setEditShowProgramsModal(false)}>Cerrar</button>
                  <button className="btn-guardar" onClick={handleEditAddProgram}>Añadir</button>
                </div>
              </div>
            </div>
          )}

          {editShowLanguagesModal && (
            <div className="modal-overlay" onClick={() => setEditShowLanguagesModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h4>Idiomas</h4>
                  <button className="modal-close" onClick={() => setEditShowLanguagesModal(false)}>×</button>
                </div>
                <div className="modal-body">
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
    
    // Manejo especial para tipo de vinculación - actualizar descripción
    if (name === 'tipoVinculacion') {
      const selectedLinkage = linkageTypes.find(linkage => linkage.value === value);
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

    // Si no hay editFormData, mostrar loading
    if (!editFormData) {
      return (
        <div className="oportunidades-content">
          <div style={{ padding: '20px', textAlign: 'center' }}>Cargando...</div>
        </div>
      );
    }

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
        jornadaSemanalPractica: opp.jornadaSemanalPractica ? opp.jornadaSemanalPractica.toString() : '',
        fechaInicioPractica: opp.fechaInicioPractica ? new Date(opp.fechaInicioPractica).toISOString().split('T')[0] : '',
        fechaFinPractica: opp.fechaFinPractica ? new Date(opp.fechaFinPractica).toISOString().split('T')[0] : '',
        horario: opp.horario || '',
        areaDesempeno: opp.areaDesempeno || '',
        enlacesFormatoEspecificos: opp.enlacesFormatoEspecificos || '',
        salarioEmocional: (() => {
          // Convertir salarioEmocional a array si es string (compatibilidad con datos antiguos)
          return Array.isArray(opp.salarioEmocional) 
            ? opp.salarioEmocional 
            : (opp.salarioEmocional ? [opp.salarioEmocional] : []);
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

    return (
      <div className="oportunidades-content">
        <div className="oportunidades-header form-header detail-header">
          <div className="form-header-left">
            <button className="btn-volver-icon" onClick={() => {
              setVista('lista');
              setOportunidadSeleccionada(null);
              setEditFormData(null);
              setSelectedLinkageDescription('');
              setIsEditingDetail(false);
            }} title="Volver">
              <FiArrowLeft className="btn-icon" />
            </button>
            <div className="section-header">
              <h3>
                <HiOutlineAcademicCap style={{ marginRight: '8px', display: 'inline-block' }} />
                DETALLE DE OPORTUNIDAD
              </h3>
            </div>
          </div>
          <div className="detail-header-actions">
            {!isEditingDetail ? (
              <>
                <button className="btn-editar-header" onClick={handleActivarEdicion}>
                  <FiEdit className="btn-icon" />
                  Editar
                </button>
                {estado !== 'Rechazada' && estado !== 'Cerrada' && (
                  <button className="btn-rechazar-header" onClick={() => setShowModalRechazo(true)}>
                    <FiXCircle className="btn-icon" />
                    Rechazar
                  </button>
                )}
                <button className="btn-historial-header" onClick={loadHistorialEstados}>
                  <FiList className="btn-icon" />
                  Historial
                </button>
                <button className="btn-duplicar-header" onClick={handleDuplicarOportunidad}>
                  <FiCopy className="btn-icon" />
                  Duplicar
                </button>
                <button className="btn-aplicaciones-header" onClick={() => {
                  Swal.fire({
                    icon: 'info',
                    title: 'En desarrollo',
                    text: 'La funcionalidad de ver aplicaciones estará disponible próximamente',
                    confirmButtonText: 'Aceptar',
                    confirmButtonColor: '#c41e3a'
                  });
                }}>
                  <FiUsers className="btn-icon" />
                  Aplicaciones
                </button>
                {estado === 'Creada' && (
                  <button className="btn-guardar-header" onClick={handleEnviarRevision}>
                    <FiFileText className="btn-icon" />
                    Enviar a Revisión
                  </button>
                )}
                {puedeAprobar && (
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
                        <p>El apoyo económico debe ser superior o igual al salario mínimo vigente. El formato se aplicará automáticamente con separador de miles</p>
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
                    />
                  </div>
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
                    <option key={linkage._id} value={linkage.value}>
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
                  <option value="20261">20261</option>
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
                />
              </div>

              {/* País / Ciudad */}
              <div className="form-field-group form-field-half-width">
                <label className="form-label-with-icon">
                  <FiMapPin className="label-icon" />
                  País / Ciudad
                </label>
                <div className="country-city-group">
                  <select
                    name="pais"
                    value={editFormData.pais}
                    onChange={handleEditFormChange}
                    className="form-select"
                    disabled={!isEditingDetail}
                  >
                    <option value="">Seleccionar</option>
                    {countries.map(country => (
                      <option key={country.isoCode} value={country.isoCode}>
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
                      <option key={city.name} value={city.name}>
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
                      <p>En Colombia, no puede exceder 48 horas semanales ni 8 diarias.</p>
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
                  max="48"
                  placeholder="Horas semanales"
                  disabled={!isEditingDetail}
                  readOnly={!isEditingDetail}
                />
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
                  <option value="tiempo_completo">Tiempo completo</option>
                  <option value="medio_tiempo">Medio tiempo</option>
                  <option value="por_horas">Por horas</option>
                </select>
              </div>

              {/* Jornada Semanal de la Práctica */}
              <div className="form-field-group">
                <label className="form-label">
                  Jornada semanal de la práctica
                  <div className="info-tooltip-wrapper">
                    <span className="info-icon">i</span>
                    <div className="tooltip-content">
                      <strong>Información</strong>
                      <p>Este campo debe seguir los parámetros de la Resolución 3546 de 2018 y representará la jornada semanal que cumplirá el practicante o practicantes seleccionados. Cuando la dedicación es por horas indique la dedicación promedio semanal en horas</p>
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  name="jornadaSemanalPractica"
                  value={editFormData.jornadaSemanalPractica}
                  onChange={handleEditFormChange}
                  className="form-input"
                  min="0"
                  placeholder="Horas semanales"
                  disabled={!isEditingDetail}
                  readOnly={!isEditingDetail}
                />
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
                    <option key={area._id} value={area.value}>
                      {area.value}
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
                        onClick={() => setEditShowProgramsModal(true)} 
                        title="Añadir programa"
                      >
                        <FiPlus />
                      </button>
                    )}
                  </div>
                  {(!editFormData.formacionAcademica || editFormData.formacionAcademica.length === 0) ? (
                    <div className="programs-empty">
                      <FiX style={{ marginRight: '4px', display: 'inline-block' }} />
                      No hay programas configurados.
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

          {/* Modales para detalle */}
          {editShowProgramsModal && (
            <div className="modal-overlay" onClick={() => setEditShowProgramsModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h4>Programas</h4>
                  <button className="modal-close" onClick={() => setEditShowProgramsModal(false)}>×</button>
                </div>
                <div className="modal-body">
                  <div className="modal-field">
                    <label>Nivel <span className="required">*</span></label>
                    <select value={editNewProgramLevel} onChange={e => setEditNewProgramLevel(e.target.value)}>
                      <option value="">- Seleccione un Nivel -</option>
                      <option value="Pregrado">Pregrado</option>
                      <option value="Posgrado">Posgrado</option>
                    </select>
                  </div>
                  <div className="modal-field">
                    <label>Programa <span className="required">*</span></label>
                    <select value={editNewProgramName} onChange={e => setEditNewProgramName(e.target.value)}>
                      <option value="">- Seleccione un programa -</option>
                      <option value="Administración de Empresas">Administración de Empresas</option>
                      <option value="Ingeniería">Ingeniería</option>
                      <option value="Economía">Economía</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn-secondary" onClick={() => setEditShowProgramsModal(false)}>Cerrar</button>
                  <button className="btn-guardar" onClick={handleEditAddProgram}>Añadir</button>
                </div>
              </div>
            </div>
          )}

          {editShowLanguagesModal && (
            <div className="modal-overlay" onClick={() => setEditShowLanguagesModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h4>Idiomas</h4>
                  <button className="modal-close" onClick={() => setEditShowLanguagesModal(false)}>×</button>
                </div>
                <div className="modal-body">
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

        {/* Modal de Aprobación por Programa */}
        {showModalAprobacion && (
          <div className="modal-overlay" onClick={() => setShowModalAprobacion(false)}>
            <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h4>Aprobar Oportunidad por Programa</h4>
                <button className="modal-close" onClick={() => setShowModalAprobacion(false)}>×</button>
              </div>
              <div className="modal-body">
                <p>Seleccione el programa que desea aprobar:</p>
                <div className="programas-aprobacion-list">
                  {programasPendientes.map((aprobacion, idx) => (
                    <div key={idx} className="programa-aprobacion-item">
                      <div className="programa-aprobacion-info">
                        <strong>{aprobacion.programa.level} - {aprobacion.programa.program}</strong>
                      </div>
                      <div className="programa-aprobacion-actions">
                        <button
                          className="btn-aprobar-programa"
                          onClick={() => handleAprobarPrograma(aprobacion.programa, '')}
                        >
                          Aprobar
                        </button>
                        <button
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
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowModalAprobacion(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Rechazo */}
        {showModalRechazo && (
          <div className="modal-overlay" onClick={() => {
            setShowModalRechazo(false);
            setMotivoRechazo('');
            setMotivoRechazoOtro('');
          }}>
            <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h4>Rechazar Oportunidad</h4>
                <button className="modal-close" onClick={() => {
                  setShowModalRechazo(false);
                  setMotivoRechazo('');
                  setMotivoRechazoOtro('');
                }}>×</button>
              </div>
              <div className="modal-body">
                <div className="modal-field">
                  <label>Seleccione el motivo de rechazo <span className="required">*</span></label>
                  <select
                    value={motivoRechazo}
                    onChange={(e) => {
                      setMotivoRechazo(e.target.value);
                      if (e.target.value !== 'Otro') {
                        setMotivoRechazoOtro('');
                      }
                    }}
                    className="form-select"
                  >
                    <option value="">- Seleccione un motivo -</option>
                    {motivosRechazo.map((motivo, idx) => (
                      <option key={idx} value={motivo}>{motivo}</option>
                    ))}
                  </select>
                </div>
                {motivoRechazo === 'Otro' && (
                  <div className="modal-field">
                    <label>Especifique el motivo <span className="required">*</span></label>
                    <textarea
                      value={motivoRechazoOtro}
                      onChange={(e) => setMotivoRechazoOtro(e.target.value)}
                      className="form-textarea"
                      placeholder="Ingrese el motivo de rechazo..."
                      rows="4"
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => {
                  setShowModalRechazo(false);
                  setMotivoRechazo('');
                  setMotivoRechazoOtro('');
                }}>
                  Cancelar
                </button>
                <button className="btn-rechazar-programa" onClick={handleRechazarOportunidad}>
                  Rechazar Oportunidad
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Historial de Estados */}
        {showModalHistorial && (
          <div className="modal-overlay" onClick={() => setShowModalHistorial(false)}>
            <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h4>Historial de Estados</h4>
                <button className="modal-close" onClick={() => setShowModalHistorial(false)}>×</button>
              </div>
              <div className="modal-body">
                {historialEstados.length === 0 ? (
                  <p>No hay historial de cambios de estado registrado.</p>
                ) : (
                  <div className="historial-list">
                    {historialEstados.map((item, idx) => (
                      <div key={idx} className="historial-item">
                        <div className="historial-header">
                          <span className="historial-estado">
                            {item.estadoAnterior || 'N/A'} → {item.estadoNuevo}
                          </span>
                          <span className="historial-fecha">
                            {formatDate(item.fechaCambio)}
                          </span>
                        </div>
                        <div className="historial-details">
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
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowModalHistorial(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="oportunidades-content">
      <div className="oportunidades-header list-header">
        <div className="list-header-content">
          <h3 className="section-header-title">LISTADO DE OPORTUNIDADES</h3>
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

      {/* Información de registros */}
      <div className="oportunidades-info">
        <p>Se encontraron {totalRecords} registros.</p>
      </div>

      {/* Filtros de Búsqueda */}
      <div className="filtros-busqueda-section">
        <div className="filtros-header">
          <FiFilter className="filtros-icon" />
          <h4>Filtros de Búsqueda</h4>
        </div>
        <div className="filtros-buttons">
          <button className="btn-mas-filtros" onClick={() => setShowFilters(!showFilters)}>
            Más filtros
          </button>
          <button className="btn-buscar" onClick={handleApplyFilters}>
            Buscar
          </button>
          <button className="btn-limpiar" onClick={handleClearFilters}>
            Limpiar
          </button>
        </div>
        {showFilters && (
          <div className="filtros-content">
              <div className="filtro-item">
                <label>Número de oportunidad</label>
                <input
                  type="text"
                  value={filters.numeroOportunidad}
                  onChange={e => setFilters({...filters, numeroOportunidad: e.target.value})}
                  placeholder="Ingrese número"
                />
              </div>
              <div className="filtro-item">
                <label>Tipo de Oportunidad</label>
                <select
                  value={filters.tipoOportunidad}
                  onChange={e => setFilters({...filters, tipoOportunidad: e.target.value})}
                >
                  <option value="">Seleccione</option>
                  <option value="practica">Práctica</option>
                  <option value="monitoria">Monitoría</option>
                </select>
              </div>
              <div className="filtro-item">
                <label>Nombre del cargo</label>
                <input
                  type="text"
                  value={filters.nombreCargo}
                  onChange={e => setFilters({...filters, nombreCargo: e.target.value})}
                  placeholder="Ingrese nombre"
                />
              </div>
              <div className="filtro-item">
                <label>Empresa</label>
                <input
                  type="text"
                  value={filters.empresa}
                  onChange={e => setFilters({...filters, empresa: e.target.value})}
                  placeholder="Ingrese empresa"
                />
              </div>
              <div className="filtro-item">
                <label>
                  <input
                    type="checkbox"
                    checked={filters.empresaConfidenciales}
                    onChange={e => setFilters({...filters, empresaConfidenciales: e.target.checked})}
                  />
                  Empresa confidenciales
                </label>
              </div>
              <div className="filtro-item">
                <label>Fechas de cierre</label>
                <div className="filtro-dates">
                  <input
                    type="date"
                    value={filters.fechaCierreDesde}
                    onChange={e => setFilters({...filters, fechaCierreDesde: e.target.value})}
                    placeholder="Desde"
                  />
                  <input
                    type="date"
                    value={filters.fechaCierreHasta}
                    onChange={e => setFilters({...filters, fechaCierreHasta: e.target.value})}
                    placeholder="Hasta"
                  />
                </div>
              </div>
              <div className="filtro-item">
                <label>Formación Académica</label>
                <input
                  type="text"
                  value={filters.formacionAcademica}
                  onChange={e => setFilters({...filters, formacionAcademica: e.target.value})}
                  placeholder="Ingrese formación"
                />
              </div>
              <div className="filtro-item">
                <label>Estados de revisión</label>
                <select
                  value={filters.estadosRevision}
                  onChange={e => setFilters({...filters, estadosRevision: e.target.value})}
                >
                  <option value="">Seleccione</option>
                  <option value="Creada">Creada</option>
                  <option value="En Revisión">En Revisión</option>
                  <option value="Revisada">Revisada</option>
                </select>
              </div>
              <div className="filtro-item">
                <label>Requisitos</label>
                <input
                  type="text"
                  value={filters.requisitos}
                  onChange={e => setFilters({...filters, requisitos: e.target.value})}
                  placeholder="Ingrese requisitos"
                />
              </div>
              <div className="filtro-item">
                <label>Estado</label>
                <select
                  value={filters.estado}
                  onChange={e => setFilters({...filters, estado: e.target.value})}
                >
                  <option value="">Seleccione</option>
                  <option value="Creada">Creada</option>
                  <option value="En Revisión">En Revisión</option>
                  <option value="Revisada">Revisada</option>
                  <option value="Activa">Activa</option>
                  <option value="Rechazada">Rechazada</option>
                  <option value="Cerrada">Cerrada</option>
                  <option value="Vencida">Vencida</option>
                </select>
              </div>
            </div>
          )}
      </div>

      {/* Barra de búsqueda simple */}
      <div className="oportunidades-filters">
        <div className="filter-group">
          <FiFilter className="filter-icon" />
          <input
            type="text"
            className="filter-input"
            placeholder="Buscar por título, empresa o número..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleApplyFilters()}
          />
          <div className="ordenar-content">
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value)}
              className="ordenar-select"
            >
              <option value="fechaCreacion">Fecha de Creación</option>
              <option value="nombreCargo">Nombre del Cargo</option>
              <option value="fechaVencimiento">Fecha de Vencimiento</option>
              <option value="estado">Estado</option>
            </select>
            <button
              className="ordenar-direction-btn"
              onClick={() => setSortDirection(sortDirection === 'ascendente' ? 'descendente' : 'ascendente')}
              title={sortDirection === 'ascendente' ? 'Ascendente' : 'Descendente'}
            >
              {sortDirection === 'ascendente' ? <FiArrowUp /> : <FiArrowDown />}
            </button>
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
        ) : oportunidades.length === 0 ? (
          <div className="empty-state">
            <p>No hay oportunidades registradas</p>
          </div>
        ) : (
          <div className="oportunidades-grid">
            {oportunidades.map(oportunidad => {
              const estado = oportunidad.estado || oportunidad.status || 'Creada';
              const isActiva = estado === 'Activa' || estado === 'activa' || estado === 'published';
              const numPostulantes = oportunidad.postulaciones?.length || 0;
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
                      const { data } = await api.get(`/opportunities/${oportunidad._id}`);
                      setOportunidadSeleccionada(data);
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
                        <HiOutlineAcademicCap />
                        <span>Práctica</span>
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
        {!loading && oportunidades.length > 0 && (
          <div className="pagination-container">
            <div className="pagination-info">
              <span>Página {currentPage} de {totalPages}</span>
            </div>
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </button>
              <div className="pagination-numbers">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
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

