import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiEdit, FiPlus, FiRefreshCw, FiSearch, FiTrash2 } from 'react-icons/fi';
import { Country, State, City } from 'country-state-city';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../styles/Companies.css';

export default function Companies({ onVolver }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [vista, setVista] = useState('lista'); // lista | form
  const [editing, setEditing] = useState(null); // company object or null
  
  // Paginación y filtros
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    sector: '',
    city: '',
    country: '',
    size: ''
  });

  const emptyForm = {
    // Identificación y nombres
    name: '', // razón social (compat)
    legalName: '',
    commercialName: '',
    idType: '',
    idNumber: '',
    nit: '',

    // Clasificaciones
    sector: '',
    sectorMineSnies: '',
    economicSector: '',
    ciiuCode: '',
    size: '',
    arl: '',

    // Ubicación / contacto
    country: '',
    countryCode: '',
    state: '',
    stateCode: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    domain: '',
    linkedinUrl: '',

    // Contenido
    missionVision: '',
    description: '',

    // Reglas
    canCreateOpportunities: false,
    authorizeLogoUsage: false,
    operatesAsAgency: false,
    wantsPracticeAgreement: false,
    programsOfInterest: [],

    // Documentos (por ahora strings, luego file upload)
    chamberOfCommerceCertificate: '',
    rutDocument: '',
    agencyAccreditationDocument: '',

    // Contacto principal
    contact: { name: '', position: '', phone: '', email: '' },

    // Representante legal
    legalRepresentative: {
      firstName: '',
      lastName: '',
      email: '',
      idType: 'CC',
      idNumber: ''
    },
    // Sedes
    branches: []
  };
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState('entidad');
  const [programsModalOpen, setProgramsModalOpen] = useState(false);
  const [newProgramLevel, setNewProgramLevel] = useState('');
  const [newProgramName, setNewProgramName] = useState('');
  const [showSedeForm, setShowSedeForm] = useState(false);
  const [editingSedeIndex, setEditingSedeIndex] = useState(null);
  
  // Estados para datos dinámicos desde Item
  const [sectors, setSectors] = useState([]);
  const [sectorMineTypes, setSectorMineTypes] = useState([]);
  const [economicSectors, setEconomicSectors] = useState([]);
  const [ciiuCodes, setCiiuCodes] = useState([]);
  const [arls, setArls] = useState([]);
  const [organizationSizes, setOrganizationSizes] = useState([]);
  const [ciiuSearchTerm, setCiiuSearchTerm] = useState('');
  const [showCiiuDropdown, setShowCiiuDropdown] = useState(false);
  // Estados para contactos
  const [contacts, setContacts] = useState([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    alternateEmail: '',
    country: '',
    countryCode: '',
    city: '',
    address: '',
    phone: '',
    extension: '',
    mobile: '',
    idType: 'CC',
    identification: '',
    userEmail: '',
    dependency: '',
    isPrincipal: false,
    position: '',
    isPracticeTutor: false,
    acceptsDataProcessing: false
  });
  const [nuevaSede, setNuevaSede] = useState({
    name: '',
    address: '',
    phone: '',
    domain: '',
    country: '',
    countryCode: '',
    state: '',
    stateCode: '',
    city: ''
  });
  
  // Obtener países, estados y ciudades
  const countries = Country.getAllCountries();
  const statesForForm = form.countryCode ? State.getStatesOfCountry(form.countryCode) : [];
  const citiesForForm = form.stateCode 
    ? City.getCitiesOfState(form.countryCode, form.stateCode)
    : form.countryCode 
      ? City.getCitiesOfCountry(form.countryCode)
      : [];
  
  const statesForSede = nuevaSede.countryCode ? State.getStatesOfCountry(nuevaSede.countryCode) : [];
  const citiesForSede = nuevaSede.stateCode 
    ? City.getCitiesOfState(nuevaSede.countryCode, nuevaSede.stateCode)
    : nuevaSede.countryCode 
      ? City.getCitiesOfCountry(nuevaSede.countryCode)
      : [];

  const addProgram = () => {
    if (!newProgramLevel || !newProgramName) return;
    const updated = [...(form.programsOfInterest || []), { level: newProgramLevel, program: newProgramName }];
    setForm({ ...form, programsOfInterest: updated });
    setNewProgramLevel('');
    setNewProgramName('');
    setProgramsModalOpen(false);
  };

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPagination(prev => ({ ...prev, page: 1 })); // Reset a página 1 al buscar
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(searchDebounced && { search: searchDebounced }),
        ...(filters.status && { status: filters.status }),
        ...(filters.sector && { sector: filters.sector }),
        ...(filters.city && { city: filters.city }),
        ...(filters.country && { country: filters.country }),
        ...(filters.size && { size: filters.size })
      };
      
      const { data } = await api.get('/companies', { params });
      setCompanies(data.data || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        pages: data.pagination?.pages || 0
      }));
    } catch (e) {
      console.error('Error cargando empresas', e);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al cargar las empresas',
        confirmButtonColor: '#c41e3a'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, searchDebounced, filters.status, filters.sector, filters.city, filters.country, filters.size]);

  // Cargar datos dinámicos desde Item
  const loadItemsData = async () => {
    try {
      // Cargar Sectores (L_SECTOR)
      const { data: sectorsData } = await api.get('/locations/items/L_SECTOR', { params: { limit: 100 } });
      setSectors(sectorsData.data || []);

      // Cargar Sector MinE (L_SNIES_SECTOR)
      const { data: sectorMineData } = await api.get('/locations/items/L_SNIES_SECTOR', { params: { limit: 100 } });
      setSectorMineTypes(sectorMineData.data || []);

      // Cargar Sector Económico (L_BUSINESS_SECTOR)
      const { data: economicSectorsData } = await api.get('/locations/items/L_BUSINESS_SECTOR', { params: { limit: 100 } });
      setEconomicSectors(economicSectorsData.data || []);

      // Cargar Códigos CIIU (L_CIIU)
      const { data: ciiuData } = await api.get('/locations/items/L_CIIU', { params: { limit: 1000 } });
      setCiiuCodes(ciiuData.data || []);

      // Cargar ARLs (L_ARL)
      const { data: arlsData } = await api.get('/locations/items/L_ARL', { params: { limit: 100 } });
      setArls(arlsData.data || []);

      // Cargar Tamaños de Organización (L_COMPANY_SIZE)
      const { data: sizesData } = await api.get('/locations/items/L_COMPANY_SIZE', { params: { limit: 100 } });
      setOrganizationSizes(sizesData.data || []);
    } catch (error) {
      console.error('Error cargando datos dinámicos:', error);
    }
  };

  useEffect(() => {
    loadItemsData();
  }, []);

  // Obtener valores únicos para filtros (desde las empresas cargadas)
  const uniqueSectors = useMemo(() => {
    const sectors = new Set();
    companies.forEach(c => {
      if (c.sector) sectors.add(c.sector);
    });
    return Array.from(sectors).sort();
  }, [companies]);

  const uniqueCities = useMemo(() => {
    const cities = new Set();
    companies.forEach(c => {
      if (c.city) cities.add(c.city);
    });
    return Array.from(cities).sort();
  }, [companies]);

  const uniqueCountries = useMemo(() => {
    const countries = new Set();
    companies.forEach(c => {
      if (c.country) countries.add(c.country);
    });
    return Array.from(countries).sort();
  }, [companies]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset a página 1 al filtrar
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: parseInt(newLimit), page: 1 }));
  };

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setVista('form');
  };

  const startEdit = async (company) => {
    setEditing(company);
    // Cargar contactos de la empresa
    try {
      const { data } = await api.get(`/companies/${company._id}`);
      setContacts(data.contacts || []);
    } catch (e) {
      console.error('Error cargando contactos', e);
      setContacts([]);
    }
    
    // Buscar códigos si no existen
    let countryCode = company.countryCode || '';
    if (!countryCode && company.country) {
      const foundCountry = countries.find(c => c.name === company.country);
      countryCode = foundCountry?.isoCode || '';
    }
    
    let stateCode = company.stateCode || '';
    if (!stateCode && company.state && countryCode) {
      const states = State.getStatesOfCountry(countryCode);
      const foundState = states.find(s => s.name === company.state);
      stateCode = foundState?.isoCode || '';
    }
    
    // Procesar sedes
    const processedBranches = (company.branches || []).map(sede => {
      let sedeCountryCode = sede.countryCode || '';
      if (!sedeCountryCode && sede.country) {
        const foundCountry = countries.find(c => c.name === sede.country);
        sedeCountryCode = foundCountry?.isoCode || '';
      }
      
      let sedeStateCode = sede.stateCode || '';
      if (!sedeStateCode && sede.state && sedeCountryCode) {
        const states = State.getStatesOfCountry(sedeCountryCode);
        const foundState = states.find(s => s.name === sede.state);
        sedeStateCode = foundState?.isoCode || '';
      }
      
      return {
        ...sede,
        countryCode: sedeCountryCode,
        stateCode: sedeStateCode
      };
    });
    
    setForm({
      ...emptyForm,
      ...company,
      countryCode,
      stateCode,
      contact: {
        ...emptyForm.contact,
        ...company.contact
      },
      legalRepresentative: {
        ...emptyForm.legalRepresentative,
        ...company.legalRepresentative
      },
      branches: processedBranches
    });
    setVista('form');
  };

  const cancelForm = () => {
    setVista('lista');
    setEditing(null);
    setForm(emptyForm);
    setCiiuSearchTerm('');
    setShowCiiuDropdown(false);
    setShowSedeForm(false);
    setEditingSedeIndex(null);
    setNuevaSede({
      name: '',
      address: '',
      phone: '',
      domain: '',
      country: '',
      countryCode: '',
      state: '',
      stateCode: '',
      city: ''
    });
  };

  const openSedeForm = () => {
    setShowSedeForm(true);
    setEditingSedeIndex(null);
    setNuevaSede({
      name: '',
      address: '',
      phone: '',
      domain: '',
      country: 'Colombia',
      city: ''
    });
  };

  const cancelSedeForm = () => {
    setShowSedeForm(false);
    setEditingSedeIndex(null);
    setNuevaSede({
      name: '',
      address: '',
      phone: '',
      domain: '',
      country: '',
      countryCode: '',
      state: '',
      stateCode: '',
      city: ''
    });
  };

  const saveSede = () => {
    if (!nuevaSede.name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'El nombre de la sede es obligatorio',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
      return;
    }

    const sedes = [...(form.branches || [])];
    
    if (editingSedeIndex !== null) {
      // Editar sede existente
      sedes[editingSedeIndex] = { ...nuevaSede };
    } else {
      // Agregar nueva sede
      sedes.push({ ...nuevaSede });
    }

    setForm({ ...form, branches: sedes });
    cancelSedeForm();
  };

  const editSede = (index) => {
    const sede = form.branches[index];
    setNuevaSede({ ...sede });
    setEditingSedeIndex(index);
    setShowSedeForm(true);
  };

  const deleteSede = async (index) => {
    const result = await Swal.fire({
      icon: 'question',
      title: '¿Eliminar sede?',
      text: '¿Estás seguro de eliminar esta sede?',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c41e3a',
      cancelButtonColor: '#6b7280'
    });

    if (!result.isConfirmed) return;

    const sedes = [...(form.branches || [])];
    sedes.splice(index, 1);
    setForm({ ...form, branches: sedes });
  };

  const saveForm = async (e) => {
    e.preventDefault();
    
    // Contacto es lo mismo que representante legal - siempre mapear desde legalRepresentative
    const formToSend = { ...form };
    formToSend.contact = {
      name: `${formToSend.legalRepresentative.firstName || ''} ${formToSend.legalRepresentative.lastName || ''}`.trim(),
      email: formToSend.legalRepresentative.email || '',
      position: formToSend.contact?.position || '',
      phone: formToSend.contact?.phone || formToSend.phone || ''
    };

    try {
      let response;
      if (editing) {
        response = await api.put(`/companies/${editing._id}`, formToSend);
      } else {
        response = await api.post('/companies', formToSend);
      }
      
      // Mostrar mensaje de éxito
      await Swal.fire({
        icon: 'success',
        title: 'Éxito',
        text: response.data?.message || 'Empresa guardada correctamente',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
      
      cancelForm();
      await loadCompanies();
    } catch (error) {
      console.error('Error guardando empresa', error);
      
      // Obtener mensaje de error del backend
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Error al guardar la empresa. Por favor verifique los datos e intente nuevamente.';
      
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    }
  };

  const handleStatusChange = async (company, newStatus, e) => {
    e.stopPropagation(); // Evitar que se active el click de la fila

    // Si no hay cambio real, no hacer nada
    if (newStatus === company.status) {
      e.target.value = company.status;
      return;
    }

    // Mostrar confirmación para cualquier cambio de estado
    const statusLabels = {
      'pending_approval': 'Pendiente de Aprobación',
      'active': 'Activa',
      'inactive': 'Inactiva'
    };

    const currentLabel = statusLabels[company.status] || company.status;
    const newLabel = statusLabels[newStatus] || newStatus;

    let message = `¿Estás seguro de cambiar el estado de "${company.name}" de "${currentLabel}" a "${newLabel}"?`;
    
    if (newStatus === 'active') {
      message += ' Esto también activará el acceso del usuario asociado.';
    } else {
      message += ' Esto también desactivará el acceso del usuario asociado.';
    }

    const result = await Swal.fire({
      icon: 'question',
      title: '¿Cambiar estado?',
      text: message,
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c41e3a',
      cancelButtonColor: '#6b7280'
    });

    if (!result.isConfirmed) {
      // Revertir el select al valor anterior
      e.target.value = company.status;
      return;
    }

    try {
      await api.put(`/companies/${company._id}`, { status: newStatus });
      await Swal.fire({
        icon: 'success',
        title: 'Estado actualizado',
        text: `El estado de la empresa ha sido actualizado correctamente`,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
      await loadCompanies();
    } catch (e) {
      console.error('Error cambiando estado', e);
      // Revertir el select al valor anterior
      e.target.value = company.status;
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: e.response?.data?.message || 'No se pudo cambiar el estado de la empresa',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pending_approval': 'Pendiente de Aprobación',
      'active': 'Activa',
      'inactive': 'Inactiva'
    };
    return labels[status] || status;
  };

  // ========== FUNCIONES PARA GESTIÓN DE CONTACTOS ==========
  
  const openContactForm = (contact = null) => {
    if (contact) {
      // Editar contacto existente
      setContactForm({
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        alternateEmail: contact.alternateEmail || '',
        country: contact.country || '',
        countryCode: contact.countryCode || '',
        city: contact.city || '',
        address: contact.address || '',
        phone: contact.phone || '',
        extension: contact.extension || '',
        mobile: contact.mobile || '',
        idType: contact.idType || 'CC',
        identification: contact.identification || '',
        userEmail: contact.userEmail || '',
        dependency: contact.dependency || '',
        isPrincipal: contact.isPrincipal || false,
        position: contact.position || '',
        isPracticeTutor: contact.isPracticeTutor || false,
        acceptsDataProcessing: true
      });
      setEditingContact(contact._id);
    } else {
      // Nuevo contacto
      setContactForm({
        firstName: '',
        lastName: '',
        alternateEmail: '',
        country: '',
        countryCode: '',
        city: '',
        address: '',
        phone: '',
        extension: '',
        mobile: '',
        idType: 'CC',
        identification: '',
        userEmail: '',
        dependency: '',
        isPrincipal: false,
        position: '',
        isPracticeTutor: false,
        acceptsDataProcessing: false
      });
      setEditingContact(null);
    }
    setShowContactForm(true);
  };

  const cancelContactForm = () => {
    setShowContactForm(false);
    setEditingContact(null);
    setContactForm({
      firstName: '',
      lastName: '',
      alternateEmail: '',
      country: '',
      countryCode: '',
      city: '',
      address: '',
      phone: '',
      extension: '',
      mobile: '',
      idType: 'CC',
      identification: '',
      userEmail: '',
      dependency: '',
      isPrincipal: false,
      position: '',
      isPracticeTutor: false,
      acceptsDataProcessing: false
    });
  };

  const saveContact = async (e) => {
    e.preventDefault();
    
    if (!editing || !editing._id) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No hay empresa seleccionada',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
      return;
    }

    try {
      if (editingContact) {
        // Actualizar contacto
        await api.put(`/companies/${editing._id}/contacts/${editingContact}`, contactForm);
        await Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Contacto actualizado correctamente',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#c41e3a'
        });
      } else {
        // Crear contacto
        await api.post(`/companies/${editing._id}/contacts`, contactForm);
        await Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Contacto creado correctamente',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#c41e3a'
        });
      }
      
      // Recargar contactos
      const { data } = await api.get(`/companies/${editing._id}`);
      setContacts(data.contacts || []);
      cancelContactForm();
    } catch (error) {
      console.error('Error guardando contacto', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al guardar el contacto',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    }
  };

  const deleteContact = async (contactId) => {
    if (!editing || !editing._id) return;

    const result = await Swal.fire({
      icon: 'question',
      title: '¿Eliminar contacto?',
      text: '¿Estás seguro de eliminar este contacto?',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c41e3a',
      cancelButtonColor: '#6b7280'
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/companies/${editing._id}/contacts/${contactId}`);
      await Swal.fire({
        icon: 'success',
        title: 'Eliminado',
        text: 'Contacto eliminado correctamente',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
      
      // Recargar contactos
      const { data } = await api.get(`/companies/${editing._id}`);
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Error eliminando contacto', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al eliminar el contacto',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    }
  };

  const handleContactStatusChange = async (contact, newStatus, e) => {
    e.stopPropagation();

    if (!editing || !editing._id) return;

    const result = await Swal.fire({
      icon: 'question',
      title: '¿Cambiar estado?',
      text: `¿Cambiar el estado del contacto a "${newStatus === 'active' ? 'Activo' : 'Inactivo'}"?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c41e3a',
      cancelButtonColor: '#6b7280'
    });

    if (!result.isConfirmed) {
      e.target.value = contact.status;
      return;
    }

    try {
      await api.put(`/companies/${editing._id}/contacts/${contact._id}`, { status: newStatus });
      await Swal.fire({
        icon: 'success',
        title: 'Estado actualizado',
        text: 'El estado del contacto ha sido actualizado',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
      
      // Recargar contactos
      const { data } = await api.get(`/companies/${editing._id}`);
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Error cambiando estado', error);
      e.target.value = contact.status;
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al cambiar el estado',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    }
  };

  const resetContactPassword = async (contactId) => {
    if (!editing || !editing._id) return;

    const result = await Swal.fire({
      icon: 'question',
      title: '¿Resetear contraseña?',
      text: '¿Estás seguro de resetear la contraseña de este contacto?',
      showCancelButton: true,
      confirmButtonText: 'Sí, resetear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c41e3a',
      cancelButtonColor: '#6b7280'
    });

    if (!result.isConfirmed) return;

    try {
      const { data } = await api.post(`/companies/${editing._id}/contacts/${contactId}/reset-password`);
      await Swal.fire({
        icon: 'success',
        title: 'Contraseña reseteada',
        text: `La nueva contraseña es: ${data.password || 'No disponible'}`,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    } catch (error) {
      console.error('Error reseteando contraseña', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al resetear la contraseña',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    }
  };

  // Variables para country-state-city del formulario de contacto
  const statesForContact = contactForm.countryCode ? State.getStatesOfCountry(contactForm.countryCode) : [];
  const citiesForContact = contactForm.stateCode 
    ? City.getCitiesOfState(contactForm.countryCode, contactForm.stateCode)
    : contactForm.countryCode 
      ? City.getCitiesOfCountry(contactForm.countryCode)
      : [];

  if (vista === 'form') {
    return (
      <div className="companies-content">
        <div className="companies-header">
          <div className="configuracion-actions">
            <button className="btn-volver" onClick={cancelForm}>
              <FiArrowLeft className="btn-icon" />
              Volver
            </button>
            <button className="btn-guardar" onClick={saveForm}>Guardar</button>
          </div>
          <div className="section-header">
            <h3>{editing ? 'EDITAR ENTIDAD' : 'CREAR ENTIDAD'}</h3>
          </div>
        </div>

        <div className="companies-section">
        {/* Tabs locales */}
        <div className="companies-tabs">
          <button
            type="button"
            className={`tab ${activeTab === 'entidad' ? 'active' : ''}`}
            onClick={() => setActiveTab('entidad')}
          >
            Entidad
          </button>
          <button 
            type="button" 
            className={`tab ${activeTab === 'contactos' ? 'active' : ''}`}
            onClick={() => setActiveTab('contactos')}
          >
            Contactos
          </button>
          <button type="button" className="tab disabled" title="Disponible próximamente" disabled>
            Documentos
          </button>
        </div>
        {activeTab === 'entidad' && (
        <form className="company-form" onSubmit={saveForm}>
          <h3 className="entity-title">DATOS DE LA ENTIDAD</h3>
          <div className="form-grid">
            {/* Nombre Comercial (obligatorio) */}
            <div className="form-group">
              <label>Nombre Comercial *</label>
              <input placeholder="Nombre Comercial" value={form.commercialName} onChange={e=>setForm({ ...form, commercialName: e.target.value })} required />
            </div>
            {/* Tipo de Identificación (NIT, N/A, OTRO) */}
            <div className="form-group">
              <label>Tipo de Identificación *</label>
              <select value={form.idType} onChange={e=>setForm({ ...form, idType: e.target.value })} required>
                <option value="">Seleccionar</option>
                <option value="NIT">NIT</option>
                <option value="N/A">N/A</option>
                <option value="OTRO">OTRO</option>
              </select>
            </div>
            {/* Razón Social (obligatorio) */}
            <div className="form-group">
              <label>Razón Social *</label>
              <input placeholder="Razón Social" value={form.legalName} onChange={e=>setForm({ ...form, legalName: e.target.value, name: e.target.value })} required />
            </div>
            {/* Número de Identificación (obligatorio) */}
            <div className="form-group">
              <label>Número de Identificación *</label>
              <input placeholder="Número de Identificación" value={form.idNumber} onChange={e=>setForm({ ...form, idNumber: e.target.value, nit: e.target.value })} required />
            </div>
            {/* Sector (obligatorio) */}
            <div className="form-group">
              <label>Sector *</label>
              <select value={form.sector} onChange={e=>setForm({ ...form, sector: e.target.value })} required>
                <option value="">Seleccionar</option>
                {sectors.map(sector => (
                  <option key={sector._id} value={sector.value}>
                    {sector.value}
                  </option>
                ))}
              </select>
            </div>
            {/* Logo (opcional) */}
            <div className="form-group">
              <label>Logo</label>
              <input type="file" onChange={(e)=>{/* manejo posterior de upload */}} />
            </div>
            {/* Sector MinE (SNIES) (obligatorio) */}
            <div className="form-group">
              <label>Sector MinE (SNIES) *</label>
              <select value={form.sectorMineSnies} onChange={e=>setForm({ ...form, sectorMineSnies: e.target.value })} required>
                <option value="">Seleccionar</option>
                {sectorMineTypes.map(sector => (
                  <option key={sector._id} value={sector.value}>
                    {sector.value}
                  </option>
                ))}
              </select>
            </div>
            {/* Autoriza uso de logo (switch) */}
            <div className="form-group">
              <label className="label-plain">¿Autoriza uso de su logo en la publicación de oportunidades?</label>
              <input type="checkbox" checked={form.authorizeLogoUsage} onChange={e=>setForm({ ...form, authorizeLogoUsage: e.target.checked })} />
            </div>
            {/* Sector económico (obligatorio) - usa L_BUSINESS_SECTOR */}
            <div className="form-group">
              <label>Sector Económico *</label>
              <select value={form.economicSector} onChange={e=>setForm({ ...form, economicSector: e.target.value })} required>
                <option value="">Seleccionar</option>
                {economicSectors.map(sector => (
                  <option key={sector._id} value={sector.value}>
                    {sector.value}
                  </option>
                ))}
              </select>
            </div>
            {/* Misión y Visión */}
            <div className="form-group">
              <label>Misión y Visión</label>
              <textarea rows={3} placeholder="Misión y Visión" value={form.missionVision} onChange={e=>setForm({ ...form, missionVision: e.target.value })} />
            </div>
            {/* Código CIIU con búsqueda */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Código CIIU</label>
              <input
                type="text"
                placeholder="Escriba el código o nombre para buscar..."
                value={ciiuSearchTerm}
                onChange={(e) => {
                  const searchValue = e.target.value;
                  setCiiuSearchTerm(searchValue);
                  setShowCiiuDropdown(searchValue.length > 0);
                }}
                onFocus={() => {
                  if (!ciiuSearchTerm && form.ciiuCode) {
                    setCiiuSearchTerm(form.ciiuCode);
                  }
                  if (ciiuSearchTerm) {
                    setShowCiiuDropdown(true);
                  }
                }}
                onBlur={() => {
                  // Al perder el foco, guardar el valor actual en el form
                  setForm({ ...form, ciiuCode: ciiuSearchTerm });
                  setTimeout(() => setShowCiiuDropdown(false), 200);
                }}
              />
              {showCiiuDropdown && ciiuSearchTerm && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                  {ciiuCodes
                    .filter(ciiu => {
                      const code = ciiu.value || ciiu.valueForCalculations || '';
                      const description = ciiu.description || ciiu.valueForReports || '';
                      const searchLower = ciiuSearchTerm.toLowerCase();
                      return code.toLowerCase().includes(searchLower) ||
                             description.toLowerCase().includes(searchLower);
                    })
                    .slice(0, 10)
                    .map(ciiu => {
                      const code = ciiu.value || ciiu.valueForCalculations || '';
                      const description = ciiu.description || ciiu.valueForReports || '';
                      return (
                        <div
                          key={ciiu._id}
                          onMouseDown={(e) => {
                            e.preventDefault(); // Prevenir que onBlur se ejecute antes del click
                            setForm({ ...form, ciiuCode: code });
                            setCiiuSearchTerm(`${code}${description ? ` - ${description}` : ''}`);
                            setShowCiiuDropdown(false);
                          }}
                          style={{
                            padding: '10px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        >
                          <strong>{code}</strong> {description ? `- ${description}` : ''}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
            {/* Tamaño de la compañía */}
            <div className="form-group">
              <label>Tamaño de la compañía *</label>
              <select
                value={form.size}
                onChange={e=>setForm({ ...form, size: e.target.value })}
                required
              >
                <option value="">Seleccionar</option>
                {organizationSizes.map(size => (
                  <option key={size._id} value={size.value}>
                    {size.value}
                  </option>
                ))}
              </select>
            </div>
            {/* Opera como Agencia (switch) */}
            <div className="form-group">
              <label className="label-plain">¿Opera como Agencia, bolsa de empleo o Head Hunter?</label>
              <input type="checkbox" checked={form.operatesAsAgency} onChange={e=>setForm({ ...form, operatesAsAgency: e.target.checked })} />
            </div>
            {/* ARL */}
            <div className="form-group">
              <label>ARL</label>
              <select value={form.arl} onChange={e=>setForm({ ...form, arl: e.target.value })}>
                <option value="">Seleccionar</option>
                {arls.map(arl => (
                  <option key={arl._id} value={arl.value}>
                    {arl.value}
                  </option>
                ))}
              </select>
            </div>
            {/* Dominio */}
            <div className="form-group">
              <label>Dominio</label>
              <input placeholder="Dominio" value={form.domain} onChange={e=>setForm({ ...form, domain: e.target.value })} />
            </div>
            {/* Documentos */}
            <div className="form-group">
              <label>Doc. Acreditación Agencia</label>
              <input type="file" />
            </div>
            <div className="form-group">
              <label>Certificado Cámara de Comercio</label>
              <input type="file" />
            </div>
            <div className="form-group">
              <label>RUT</label>
              <input type="file" />
            </div>
            {/* Convenio prácticas (switch) */}
            <div className="form-group">
              <label className="label-plain">¿Desea realizar convenio de prácticas y pasantías?</label>
              <input type="checkbox" checked={form.wantsPracticeAgreement} onChange={e=>setForm({ ...form, wantsPracticeAgreement: e.target.checked })} />
            </div>
          </div>

          {/* Programas de interés */}
          <div className="programs-section">
            <div className="programs-header">
              <span className="programs-title">Programas de interés para en contar con estudiantes de práctica</span>
              <button type="button" className="programs-add" onClick={()=>setProgramsModalOpen(true)} title="Añadir programa">
                <FiPlus />
              </button>
            </div>
            {(!form.programsOfInterest || form.programsOfInterest.length === 0) ? (
              <div className="programs-empty">No hay programas configurados.</div>
            ) : (
              <ul className="programs-list">
                {form.programsOfInterest.map((p, idx) => (
                  <li key={idx}>{p.level} - {p.program}</li>
                ))}
              </ul>
            )}
          </div>

          <h3 className="section-title">DATOS DEL CONTACTO</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Nombres R. Legal *</label>
              <input placeholder="Nombres" value={form.legalRepresentative.firstName} onChange={e=>{
                const newFirstName = e.target.value;
                const newLegalRep = { ...form.legalRepresentative, firstName: newFirstName };
                const newContactName = `${newFirstName} ${form.legalRepresentative.lastName || ''}`.trim();
                setForm({ 
                  ...form, 
                  legalRepresentative: newLegalRep,
                  contact: { 
                    ...form.contact, 
                    name: newContactName
                  }
                });
              }} required />
            </div>
            <div className="form-group">
              <label>Tipo de Identificación RL</label>
              <select value={form.legalRepresentative.idType} onChange={e=>setForm({ ...form, legalRepresentative: { ...form.legalRepresentative, idType: e.target.value } })}>
                <option value="">Seleccionar</option>
                <option value="CC">CC</option>
                <option value="ID">ID</option>
                <option value="DE">DE</option>
                <option value="CE">CE</option>
                <option value="PS">PS</option>
                <option value="TI">TI</option>
                <option value="CA">CA</option>
                <option value="DNI">DNI</option>
              </select>
            </div>
            <div className="form-group">
              <label>Apellidos R. Legal *</label>
              <input placeholder="Apellidos" value={form.legalRepresentative.lastName} onChange={e=>{
                const newLastName = e.target.value;
                const newLegalRep = { ...form.legalRepresentative, lastName: newLastName };
                const newContactName = `${form.legalRepresentative.firstName || ''} ${newLastName}`.trim();
                setForm({ 
                  ...form, 
                  legalRepresentative: newLegalRep,
                  contact: { 
                    ...form.contact, 
                    name: newContactName
                  }
                });
              }} required />
            </div>
            <div className="form-group">
              <label>Nro. Identificación RL *</label>
              <input placeholder="999999999" value={form.legalRepresentative.idNumber} onChange={e=>setForm({ ...form, legalRepresentative: { ...form.legalRepresentative, idNumber: e.target.value } })} required />
            </div>
            <div className="form-group">
              <label>Correo R. Legal *</label>
              <input type="email" placeholder="email@dominio.com" value={form.legalRepresentative.email} onChange={e=>{
                const newEmail = e.target.value;
                setForm({ 
                  ...form, 
                  legalRepresentative: { ...form.legalRepresentative, email: newEmail },
                  contact: { 
                    ...form.contact, 
                    email: newEmail
                  }
                });
              }} required />
            </div>
            <div className="form-group">
              <label>Página Web</label>
              <input placeholder="www.xxxx.xx" value={form.website} onChange={e=>setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="form-group">
              <label>País</label>
              <select 
                value={form.countryCode} 
                onChange={e => {
                  const selectedCountry = countries.find(c => c.isoCode === e.target.value);
                  setForm({ 
                    ...form, 
                    countryCode: e.target.value,
                    country: selectedCountry?.name || '',
                    stateCode: '',
                    state: '',
                    city: ''
                  });
                }}
              >
                <option value="">Seleccionar</option>
                {countries.map(country => (
                  <option key={country.isoCode} value={country.isoCode}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Dirección LinkedIn</label>
              <input placeholder="Dirección LinkedIn" value={form.linkedinUrl} onChange={e=>setForm({ ...form, linkedinUrl: e.target.value })} />
            </div>
            {statesForForm.length > 0 && (
              <div className="form-group">
                <label>Estado/Provincia</label>
                <select 
                  value={form.stateCode} 
                  onChange={e => {
                    const selectedState = statesForForm.find(s => s.isoCode === e.target.value);
                    setForm({ 
                      ...form, 
                      stateCode: e.target.value,
                      state: selectedState?.name || '',
                      city: ''
                    });
                  }}
                >
                  <option value="">Seleccionar</option>
                  {statesForForm.map(state => (
                    <option key={state.isoCode} value={state.isoCode}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Ciudad</label>
              <select 
                value={form.city} 
                onChange={e => setForm({ ...form, city: e.target.value })}
                disabled={!form.countryCode}
              >
                <option value="">Seleccionar</option>
                {citiesForForm.map(city => (
                  <option key={city.name} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Dirección</label>
              <input placeholder="Dirección" value={form.address} onChange={e=>setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input placeholder="Teléfono" value={form.phone} onChange={e=>setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>

          {/* Sección SEDES */}
          <div className="sedes-section">
            <div className="sedes-header">
              <div className="sedes-tab-container">
                <div className="sedes-tab">SEDES</div>
                <div className="sedes-red-line"></div>
              </div>
              <button type="button" className="btn-agregar-sede" onClick={openSedeForm}>
                <FiPlus className="btn-icon-small" />
                Agregar sede
              </button>
            </div>

            {showSedeForm && (
              <div className="sede-form-container">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nombre Sede: *</label>
                    <input 
                      placeholder="Nombre" 
                      value={nuevaSede.name} 
                      onChange={e => setNuevaSede({ ...nuevaSede, name: e.target.value })} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Teléfono Sede:</label>
                    <input 
                      placeholder="Teléfono" 
                      value={nuevaSede.phone} 
                      onChange={e => setNuevaSede({ ...nuevaSede, phone: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Dirección Sede:</label>
                    <input 
                      placeholder="Dirección" 
                      value={nuevaSede.address} 
                      onChange={e => setNuevaSede({ ...nuevaSede, address: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Dominio Sede:</label>
                    <input 
                      placeholder="@xxxxx.xxx" 
                      value={nuevaSede.domain} 
                      onChange={e => setNuevaSede({ ...nuevaSede, domain: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label>País Sede:</label>
                    <select 
                      value={nuevaSede.countryCode} 
                      onChange={e => {
                        const selectedCountry = countries.find(c => c.isoCode === e.target.value);
                        setNuevaSede({ 
                          ...nuevaSede, 
                          countryCode: e.target.value,
                          country: selectedCountry?.name || '',
                          stateCode: '',
                          state: '',
                          city: ''
                        });
                      }}
                    >
                      <option value="">Seleccionar</option>
                      {countries.map(country => (
                        <option key={country.isoCode} value={country.isoCode}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {statesForSede.length > 0 && (
                    <div className="form-group">
                      <label>Estado/Provincia Sede:</label>
                      <select 
                        value={nuevaSede.stateCode} 
                        onChange={e => {
                          const selectedState = statesForSede.find(s => s.isoCode === e.target.value);
                          setNuevaSede({ 
                            ...nuevaSede, 
                            stateCode: e.target.value,
                            state: selectedState?.name || '',
                            city: ''
                          });
                        }}
                      >
                        <option value="">Seleccionar</option>
                        {statesForSede.map(state => (
                          <option key={state.isoCode} value={state.isoCode}>
                            {state.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <label>Ciudad Sede:</label>
                    <select 
                      value={nuevaSede.city} 
                      onChange={e => setNuevaSede({ ...nuevaSede, city: e.target.value })}
                      disabled={!nuevaSede.countryCode}
                    >
                      <option value="">Seleccionar</option>
                      {citiesForSede.map(city => (
                        <option key={city.name} value={city.name}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="sede-form-actions">
                  <button type="button" className="btn-guardar-sede" onClick={saveSede}>
                    Guardar Sede
                  </button>
                  <button type="button" className="btn-cancelar-sede" onClick={cancelSedeForm}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {(!form.branches || form.branches.length === 0) ? (
              <div className="sedes-empty">No hay sedes agregadas</div>
            ) : (
              <div className="sedes-table-container">
                <table className="sedes-table">
                  <thead>
                    <tr>
                      <th>NOMBRE</th>
                      <th>DIRECCIÓN</th>
                      <th>TELÉFONO</th>
                      <th>PAÍS</th>
                      <th>ESTADO</th>
                      <th>CIUDAD</th>
                      <th>ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.branches.map((sede, index) => (
                      <tr key={index}>
                        <td>{sede.name}</td>
                        <td>{sede.address}</td>
                        <td>{sede.phone}</td>
                        <td>{sede.country}</td>
                        <td>{sede.state || '-'}</td>
                        <td>{sede.city}</td>
                        <td>
                          <div className="sede-actions">
                            <button 
                              type="button" 
                              className="btn-action btn-outline" 
                              onClick={() => editSede(index)}
                            >
                              <FiEdit /> Editar
                            </button>
                            <button 
                              type="button" 
                              className="btn-action btn-warning" 
                              onClick={() => deleteSede(index)}
                            >
                              <FiTrash2 /> Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn-volver" onClick={cancelForm}>Cancelar</button>
            <button type="submit" className="btn-guardar">Guardar</button>
          </div>
        </form>
        )}
        
        {activeTab === 'contactos' && (
          <div className="contacts-section">
            <div className="contacts-header">
              <button className="btn-guardar" onClick={() => openContactForm()} style={{marginBottom: '20px'}}>
                <FiPlus className="btn-icon" />
                Crear contacto
              </button>
            </div>

            {!showContactForm ? (
              <div className="contacts-list">
                {contacts.length === 0 ? (
                  <div className="contacts-empty">No hay contactos agregados</div>
                ) : (
                  <table className="contacts-table">
                    <thead>
                      <tr>
                        <th>NOMBRES</th>
                        <th>APELLIDOS</th>
                        <th>USUARIO</th>
                        <th>TELÉFONO</th>
                        <th>CARGO</th>
                        <th>¿ES PRINCIPAL?</th>
                        <th>ESTADO</th>
                        <th>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((contact) => (
                        <tr key={contact._id}>
                          <td>{contact.firstName}</td>
                          <td>{contact.lastName}</td>
                          <td>{contact.userEmail}</td>
                          <td>{contact.phone || contact.mobile || '-'}</td>
                          <td>{contact.position || '-'}</td>
                          <td>{contact.isPrincipal ? 'Sí' : 'No'}</td>
                          <td>
                            <select 
                              value={contact.status || 'active'} 
                              onChange={(e) => handleContactStatusChange(contact, e.target.value, e)}
                              className="status-select"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="active">Activo</option>
                              <option value="inactive">Inactivo</option>
                            </select>
                          </td>
                          <td>
                            <div className="contact-actions">
                              <button 
                                className="btn-action btn-outline" 
                                onClick={() => openContactForm(contact)}
                              >
                                <FiEdit /> Editar
                              </button>
                              <button 
                                className="btn-action btn-secondary" 
                                onClick={() => resetContactPassword(contact._id)}
                                title="Restablecer contraseña"
                              >
                                🔑
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <form className="contact-form" onSubmit={saveContact}>
                <h3 className="section-title">DATOS PERSONALES</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nombres <span className="required">*</span></label>
                    <input 
                      placeholder="Nombres" 
                      value={contactForm.firstName} 
                      onChange={e => setContactForm({ ...contactForm, firstName: e.target.value })} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Apellidos <span className="required">*</span></label>
                    <input 
                      placeholder="Apellidos" 
                      value={contactForm.lastName} 
                      onChange={e => setContactForm({ ...contactForm, lastName: e.target.value })} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Correo Alterno</label>
                    <input 
                      type="email"
                      placeholder="email@dominio.com" 
                      value={contactForm.alternateEmail} 
                      onChange={e => setContactForm({ ...contactForm, alternateEmail: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label>País</label>
                    <select 
                      value={contactForm.countryCode} 
                      onChange={e => {
                        const selectedCountry = countries.find(c => c.isoCode === e.target.value);
                        setContactForm({ 
                          ...contactForm, 
                          countryCode: e.target.value,
                          country: selectedCountry?.name || '',
                          city: ''
                        });
                      }}
                    >
                      <option value="">Seleccionar</option>
                      {countries.map(country => (
                        <option key={country.isoCode} value={country.isoCode}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Ciudad</label>
                    <select 
                      value={contactForm.city} 
                      onChange={e => setContactForm({ ...contactForm, city: e.target.value })}
                      disabled={!contactForm.countryCode}
                    >
                      <option value="">Seleccionar</option>
                      {citiesForContact.map(city => (
                        <option key={city.name} value={city.name}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Dirección Entidad <span className="required">*</span></label>
                    <input 
                      placeholder="Dirección" 
                      value={contactForm.address} 
                      onChange={e => setContactForm({ ...contactForm, address: e.target.value })} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Teléfono Entidad <span className="required">*</span></label>
                    <input 
                      placeholder="Numero telefónico" 
                      value={contactForm.phone} 
                      onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Extensión Entidad</label>
                    <input 
                      placeholder="Número de extensión" 
                      value={contactForm.extension} 
                      onChange={e => setContactForm({ ...contactForm, extension: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Celular Entidad</label>
                    <input 
                      placeholder="Número de celular" 
                      value={contactForm.mobile} 
                      onChange={e => setContactForm({ ...contactForm, mobile: e.target.value })} 
                    />
                  </div>
                </div>

                <h3 className="section-title">IDENTIFICACIÓN</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Usuario <span className="required">*</span></label>
                    <input 
                      type="email"
                      placeholder="email@dominio.com" 
                      value={contactForm.userEmail} 
                      onChange={e => setContactForm({ ...contactForm, userEmail: e.target.value })} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Tipo Identificación</label>
                    <select 
                      value={contactForm.idType} 
                      onChange={e => setContactForm({ ...contactForm, idType: e.target.value })}
                    >
                      <option value="CC">CC</option>
                      <option value="CE">CE</option>
                      <option value="PASAPORTE">PASAPORTE</option>
                      <option value="NIT">NIT</option>
                      <option value="OTRO">OTRO</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Identificación</label>
                    <input 
                      placeholder="Número de identificación" 
                      value={contactForm.identification} 
                      onChange={e => setContactForm({ ...contactForm, identification: e.target.value })} 
                    />
                  </div>
                </div>

                <h3 className="section-title">DATOS DE ENTIDAD</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Dependencia</label>
                    <input 
                      placeholder="Dependencia dentro de la empresa" 
                      value={contactForm.dependency} 
                      onChange={e => setContactForm({ ...contactForm, dependency: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Cargo <span className="required">*</span></label>
                    <input 
                      placeholder="Cargo dentro de la empresa" 
                      value={contactForm.position} 
                      onChange={e => setContactForm({ ...contactForm, position: e.target.value })} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="label-plain">¿Es usuario principal?</label>
                    <input 
                      type="checkbox" 
                      checked={contactForm.isPrincipal} 
                      onChange={e => setContactForm({ ...contactForm, isPrincipal: e.target.checked })} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="label-plain">Es tutor de práctica académica</label>
                    <input 
                      type="checkbox" 
                      checked={contactForm.isPracticeTutor} 
                      onChange={e => setContactForm({ ...contactForm, isPracticeTutor: e.target.checked })} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="label-plain">Acepto y autorizo el tratamiento de mis datos personales <span className="required">*</span></label>
                    <input 
                      type="checkbox" 
                      checked={contactForm.acceptsDataProcessing} 
                      onChange={e => setContactForm({ ...contactForm, acceptsDataProcessing: e.target.checked })} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-volver" onClick={cancelContactForm}>Cancelar</button>
                  <button type="submit" className="btn-guardar">Registrar Contacto</button>
                </div>
              </form>
            )}
          </div>
        )}
        </div>
        {programsModalOpen && (
          <div className="modal-overlay" onClick={()=>setProgramsModalOpen(false)}>
            <div className="modal" onClick={(e)=>e.stopPropagation()}>
              <div className="modal-header">
                <h4>Programas</h4>
                <button className="modal-close" onClick={()=>setProgramsModalOpen(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="modal-field">
                  <label>Nivel <span className="required">*</span></label>
                  <select value={newProgramLevel} onChange={e=>setNewProgramLevel(e.target.value)}>
                    <option value="">- Seleccione un Nivel -</option>
                    <option value="Pregrado">Pregrado</option>
                    <option value="Posgrado">Posgrado</option>
                    <option value="Tecnológico">Tecnológico</option>
                  </select>
                </div>
                <div className="modal-field">
                  <label>Programa</label>
                  <select value={newProgramName} onChange={e=>setNewProgramName(e.target.value)}>
                    <option value="">- Seleccione un programa -</option>
                    <option value="Administración de Empresas">Administración de Empresas</option>
                    <option value="Ingeniería">Ingeniería</option>
                    <option value="Economía">Economía</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={()=>setProgramsModalOpen(false)}>Cerrar</button>
                <button className="btn-guardar" onClick={addProgram}>Añadir</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="companies-content">
      <div className="companies-header">
        <div className="configuracion-actions">
          <button className="btn-volver" onClick={() => {
            if (onVolver) {
              onVolver();
            } else {
              navigate('/dashboard/entidades');
            }
          }}>
            <FiArrowLeft className="btn-icon" />
            Volver
          </button>
          <button className="btn-guardar" onClick={startCreate}>
            <FiPlus className="btn-icon" />
            Crear Entidad
          </button>
        </div>
        <div className="section-header">
          <h3>ENTIDADES</h3>
        </div>
      </div>

      <div className="companies-section">
      <div className="companies-filters">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            className="search-input"
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
            placeholder="Buscar por nombre, NIT, sector, ciudad, email..."
          />
          <button className="btn-refresh-small" onClick={loadCompanies} title="Refrescar lista">
            <FiRefreshCw />
          </button>
        </div>
        
        <div className="filters-row" style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
          <select 
            value={filters.status} 
            onChange={(e) => handleFilterChange('status', e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">Todos los estados</option>
            <option value="pending_approval">Pendiente de Aprobación</option>
            <option value="active">Activa</option>
            <option value="inactive">Inactiva</option>
          </select>
          
          <select 
            value={filters.sector} 
            onChange={(e) => handleFilterChange('sector', e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '200px' }}
          >
            <option value="">Todos los sectores</option>
            {uniqueSectors.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          
          <select 
            value={filters.city} 
            onChange={(e) => handleFilterChange('city', e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '180px' }}
          >
            <option value="">Todas las ciudades</option>
            {uniqueCities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          
          <select 
            value={filters.country} 
            onChange={(e) => handleFilterChange('country', e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '180px' }}
          >
            <option value="">Todos los países</option>
            {uniqueCountries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          
          <select 
            value={filters.size} 
            onChange={(e) => handleFilterChange('size', e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">Todos los tamaños</option>
            <option value="micro">Micro</option>
            <option value="pequeña">Pequeña</option>
            <option value="mediana">Mediana</option>
            <option value="grande">Grande</option>
          </select>
          
          {(filters.status || filters.sector || filters.city || filters.country || filters.size) && (
            <button 
              onClick={() => setFilters({ status: '', sector: '', city: '', country: '', size: '' })}
              style={{ padding: '8px 15px', borderRadius: '4px', border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer' }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className="users-table-container">
        {loading ? (
          <div className="loading-container"><div className="loading-spinner"></div><p>Cargando...</p></div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Razón Social</th>
                <th>NIT</th>
                <th>Sector</th>
                <th>Tamaño</th>
                <th>Ciudad</th>
                <th>Teléfono</th>
                <th>Contacto</th>
                <th>País</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>
                    No se encontraron empresas
                  </td>
                </tr>
              ) : (
                companies.map(c => (
                  <tr 
                    key={c._id} 
                    onClick={() => startEdit(c)}
                    style={{ cursor: 'pointer' }}
                    className="table-row-clickable"
                  >
                    <td>{c.name || '-'}</td>
                    <td>{c.nit || '-'}</td>
                    <td>{c.sector || '-'}</td>
                    <td>{c.size || '-'}</td>
                    <td>{c.city || '-'}</td>
                    <td>{c.phone || '-'}</td>
                    <td>{c.contact?.name || '-'}</td>
                    <td>{c.country || '-'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select 
                        value={c.status || 'pending_approval'} 
                        onChange={(e) => handleStatusChange(c, e.target.value, e)}
                        className="status-select"
                      >
                        <option value="pending_approval">Pendiente de Aprobación</option>
                        <option value="active">Activa</option>
                        <option value="inactive">Inactiva</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Paginación */}
      {!loading && pagination.pages > 0 && (
        <div className="pagination-container" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: '20px',
          padding: '15px',
          background: '#f9f9f9',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Mostrar:</span>
            <select 
              value={pagination.limit} 
              onChange={(e) => handleLimitChange(e.target.value)}
              style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>por página</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>
              Mostrando {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '5px' }}>
            <button
              onClick={() => handlePageChange(1)}
              disabled={pagination.page === 1}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                background: pagination.page === 1 ? '#f5f5f5' : 'white',
                cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                opacity: pagination.page === 1 ? 0.5 : 1
              }}
            >
              ««
            </button>
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                background: pagination.page === 1 ? '#f5f5f5' : 'white',
                cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                opacity: pagination.page === 1 ? 0.5 : 1
              }}
            >
              «
            </button>
            <span style={{ padding: '8px 12px' }}>
              Página {pagination.page} de {pagination.pages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                background: pagination.page >= pagination.pages ? '#f5f5f5' : 'white',
                cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer',
                opacity: pagination.page >= pagination.pages ? 0.5 : 1
              }}
            >
              »
            </button>
            <button
              onClick={() => handlePageChange(pagination.pages)}
              disabled={pagination.page >= pagination.pages}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                background: pagination.page >= pagination.pages ? '#f5f5f5' : 'white',
                cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer',
                opacity: pagination.page >= pagination.pages ? 0.5 : 1
              }}
            >
              »»
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}


