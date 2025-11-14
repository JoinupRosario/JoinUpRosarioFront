import { useEffect, useMemo, useState, useRef } from 'react';
import { FiArrowLeft, FiPlus, FiRefreshCw, FiSearch, FiFilter, FiBookOpen, FiDollarSign, FiFileText, FiUsers, FiCalendar, FiMapPin, FiClock, FiBook, FiX } from 'react-icons/fi';
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
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [vista, setVista] = useState('lista'); // lista | crear
  
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
    salarioEmocional: '',
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

  const loadCompanies = async () => {
    try {
      const { data } = await api.get('/companies', { params: { limit: 100 } });
      setCompanies(data.companies || []);
    } catch (e) {
      console.error('Error cargando empresas', e);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadCompanies();
    }
    // Cargar países
    setCountries(Country.getAllCountries());
  }, [isAdmin]);

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

  // Cerrar dropdown cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.autocomplete-wrapper') && !event.target.closest('.autocomplete-dropdown')) {
        setShowSalarioEmocionalDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Recalcular posición del dropdown cuando se hace scroll o se redimensiona la ventana
  useEffect(() => {
    if (showSalarioEmocionalDropdown) {
      const handleScrollOrResize = () => {
        calculateDropdownPosition();
      };
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [showSalarioEmocionalDropdown]);

  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return companies.slice(0, 10);
    const q = companySearch.toLowerCase();
    return companies.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.commercialName?.toLowerCase().includes(q) ||
      c.nit?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [companies, companySearch]);

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
    const colors = {
      'draft': '#6b7280',
      'Creada': '#6b7280',
      'creada': '#6b7280',
      'En Revisión': '#f59e0b',
      'en_revision': '#f59e0b',
      'Revisada': '#3b82f6',
      'revisada': '#3b82f6',
      'published': '#10b981',
      'Activa': '#10b981',
      'activa': '#10b981',
      'Rechazada': '#ef4444',
      'rechazada': '#ef4444',
      'closed': '#6b7280',
      'Cerrada': '#6b7280',
      'cerrada': '#6b7280',
      'cancelled': '#ef4444',
      'Vencida': '#9ca3af',
      'vencida': '#9ca3af'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'draft': 'Creada',
      'Creada': 'Creada',
      'creada': 'Creada',
      'En Revisión': 'En Revisión',
      'en_revision': 'En Revisión',
      'Revisada': 'Revisada',
      'revisada': 'Revisada',
      'published': 'Activada',
      'Activa': 'Activada',
      'activa': 'Activada',
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

  const handleCrearOportunidad = () => {
    setVista('crear');
    // Si es admin, resetear la selección de empresa
    if (isAdmin) {
      setSelectedCompany(null);
      setCompanySearch('');
    }
  };

  const handleSelectCompany = (company) => {
    setSelectedCompany(company);
    setCompanySearch(company.name || company.commercialName);
    setShowCompanyDropdown(false);
  };

  const handleSelectTipo = (tipo) => {
    if (tipo === 'practica') {
      setShowModalInfo(true);
    } else {
      // Por ahora solo implementamos práctica
      Swal.fire({
        icon: 'info',
        title: 'En desarrollo',
        text: 'La funcionalidad de Monitorías, tutorías y mentorías estará disponible próximamente',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    }
  };

  const handleAceptarModal = () => {
    setShowModalInfo(false);
    setTipoOportunidad('practica');
    // Scroll al formulario después de un pequeño delay para que se renderice
    setTimeout(() => {
      const formContainer = document.querySelector('.formulario-practica-container');
      if (formContainer) {
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
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
    calculateDropdownPosition();
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
    setFormData(prev => ({
      ...prev,
      salarioEmocional: opcion.value
    }));
    setSalarioEmocionalSearch(opcion.label);
    setShowSalarioEmocionalDropdown(false);
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
        salarioEmocional: formData.salarioEmocional || null,
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

  if (vista === 'crear') {
    return (
      <div className="oportunidades-content">
        <div className="oportunidades-header form-header">
          <div className="configuracion-actions form-actions">
            <button className="btn-volver" onClick={handleVolver}>
              <FiArrowLeft className="btn-icon" />
              Volver
            </button>
            {tipoOportunidad === 'practica' && (
              <button className="btn-guardar-header" onClick={handleSaveForm}>
                <FiFileText className="btn-icon" />
                Guardar
              </button>
            )}
          </div>
          <div className="section-header">
            <h3>
              {tipoOportunidad === 'practica' ? (
                <>
                  <HiOutlineAcademicCap style={{ marginRight: '8px', display: 'inline-block' }} />
                  PRÁCTICA
                </>
              ) : (
                'CREAR OPORTUNIDAD'
              )}
            </h3>
          </div>
        </div>

        <div className="oportunidades-section">
          {!tipoOportunidad ? (
            <>
              {isAdmin && (
                <div className="company-selection-container">
                  <label className="company-selection-label">Seleccione la empresa:</label>
                  <div className="company-search-wrapper">
                    <input
                      type="text"
                      className="company-search-input"
                      placeholder="Buscar empresa..."
                      value={companySearch}
                      onChange={(e) => {
                        setCompanySearch(e.target.value);
                        setShowCompanyDropdown(true);
                      }}
                      onFocus={() => setShowCompanyDropdown(true)}
                    />
                    {showCompanyDropdown && filteredCompanies.length > 0 && (
                      <div className="company-dropdown">
                        {filteredCompanies.map(company => (
                          <div
                            key={company._id}
                            className="company-dropdown-item"
                            onClick={() => handleSelectCompany(company)}
                          >
                            {company.name || company.commercialName}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedCompany && (
                    <div className="selected-company">
                      Empresa seleccionada: <strong>{selectedCompany.name || selectedCompany.commercialName}</strong>
                    </div>
                  )}
                </div>
              )}
              
              <div className="tipo-oportunidad-container">
                {(!isAdmin || selectedCompany) ? (
                  <>
                    <h2 className="tipo-oportunidad-title">¿Qué tipo de oferta deseas crear?</h2>
                    <div className="tipo-oportunidad-options">
                      <div
                        className="tipo-oportunidad-card"
                        onClick={() => handleSelectTipo('practica')}
                      >
                      <div className="tipo-oportunidad-icon practica">
                        <HiOutlineAcademicCap />
                      </div>
                        <span className="tipo-oportunidad-text">Práctica</span>
                      </div>
                      <div
                        className="tipo-oportunidad-card"
                        onClick={() => handleSelectTipo('monitoria')}
                      >
                        <div className="tipo-oportunidad-icon monitoria">
                          <FiBookOpen />
                        </div>
                        <span className="tipo-oportunidad-text">Monitorías, tutorías y mentorías</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="select-company-message">
                    <p>Por favor seleccione una empresa para continuar</p>
                  </div>
                )}
              </div>
            </>
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
                  </label>
                  <select
                    name="tipoVinculacion"
                    value={formData.tipoVinculacion}
                    onChange={handleFormChange}
                    className="form-select"
                  >
                    <option value="">Seleccionar</option>
                    <option value="contrato_laboral_nomina">Contrato laboral por nómina</option>
                    <option value="contrato_aprendizaje">Contrato de aprendizaje</option>
                    <option value="convenio_docencia_servicio">Convenio docencia servicio</option>
                    <option value="acto_administrativo">Acto administrativo</option>
                    <option value="acuerdo_vinculacion">Acuerdo de vinculación</option>
                    <option value="otro_documento">Otro documento</option>
                    <option value="contrato_laboral_prestacion">Contrato laboral por prestación de servicios</option>
                    <option value="contrato_residentes">Contrato para residentes</option>
                    <option value="judicatura">Judicatura</option>
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
                  <label className="form-label">Salario emocional</label>
                  <div className="autocomplete-wrapper">
                    <input
                      ref={salarioEmocionalInputRef}
                      type="text"
                      value={salarioEmocionalSearch}
                      onChange={handleSalarioEmocionalChange}
                      onFocus={() => {
                        calculateDropdownPosition();
                        setShowSalarioEmocionalDropdown(true);
                      }}
                      className="form-input"
                      placeholder="Escriba para buscar..."
                    />
                    {showSalarioEmocionalDropdown && filteredSalarioEmocional.length > 0 && (
                      <div 
                        className={`autocomplete-dropdown ${dropdownOpenUp ? 'autocomplete-dropdown-up' : ''}`}
                        style={{
                          position: 'fixed',
                          ...(dropdownOpenUp 
                            ? { bottom: `${dropdownPosition.bottom}px`, top: 'auto' }
                            : { top: `${dropdownPosition.top}px`, bottom: 'auto' }
                          ),
                          left: `${dropdownPosition.left}px`,
                          width: `${dropdownPosition.width}px`
                        }}
                      >
                        {filteredSalarioEmocional.map((opcion) => (
                          <div
                            key={opcion.value}
                            className="autocomplete-option"
                            onClick={() => handleSelectSalarioEmocional(opcion)}
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

  return (
    <div className="oportunidades-content">
      <div className="oportunidades-header list-header">
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

      {/* Información de registros */}
      <div className="oportunidades-info">
        <p>Se encontraron {totalRecords} registros.</p>
      </div>

      {/* Filtros de Búsqueda y Ordenamiento */}
      <div className="filtros-ordenar-container">
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

        {/* Ordenar Por */}
        <div className="ordenar-section">
          <div className="ordenar-header">
            <FiFilter className="ordenar-icon" />
            <h4>Ordenar Por</h4>
          </div>
          <div className="ordenar-content">
            <div className="ordenar-item">
              <label className="ordenar-label">Dirección de ordenamiento</label>
              <select
                value={sortDirection}
                onChange={e => setSortDirection(e.target.value)}
                className="ordenar-select"
              >
                <option value="ascendente">Ascendente</option>
                <option value="descendente">Descendente</option>
              </select>
            </div>
            <div className="ordenar-item">
              <label className="ordenar-label">Campo</label>
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
            </div>
          </div>
        </div>
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
                        {oportunidad.formacionAcademica.slice(0, 3).map((formacion, idx) => (
                          <span key={idx} className="area-tag">-{formacion.program?.toUpperCase() || formacion.program}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="oportunidad-footer">
                    <div className="oportunidad-status">
                      <span className="status-text">{getStatusLabel(estado)}</span>
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

