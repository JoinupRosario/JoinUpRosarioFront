import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiEdit, FiPlus, FiRefreshCw, FiSearch, FiTrash2 } from 'react-icons/fi';
import { Country, State, City } from 'country-state-city';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
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
    ciiuCodes: [], // Hasta 3 códigos CIIU (5 dígitos DANE)
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
    domains: [], // Múltiples dominios para correos de contactos
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
      idType: '',
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
  const [programSearchTerm, setProgramSearchTerm] = useState('');
  const [programsList, setProgramsList] = useState([]); // programas de la colección programs
  const [showSedeForm, setShowSedeForm] = useState(false);
  const [editingSedeIndex, setEditingSedeIndex] = useState(null);
  
  // Estados para datos dinámicos desde Item
  const [sectors, setSectors] = useState([]);
  const [sectorMineTypes, setSectorMineTypes] = useState([]);
  const [economicSectors, setEconomicSectors] = useState([]);
  const [ciiuCodes, setCiiuCodes] = useState([]); // Lista ítems L_CIIU para búsqueda
  const [arls, setArls] = useState([]);
  const [organizationSizes, setOrganizationSizes] = useState([]);
  const [ciiuSearchTerm, setCiiuSearchTerm] = useState('');
  const [showCiiuDropdown, setShowCiiuDropdown] = useState(false);
  const [idTypesEscenario, setIdTypesEscenario] = useState([]); // L_IDENTIFICATIONTYPE_COMPANY
  const [idTypesRepresentante, setIdTypesRepresentante] = useState([]); // L_IDENTIFICATIONTYPE
  const [nitError, setNitError] = useState('');
  const [newDomainInput, setNewDomainInput] = useState('');
  const [emailDomainError, setEmailDomainError] = useState('');
  const [contactEmailDomainError, setContactEmailDomainError] = useState('');
  // Estados para contactos
  const [contacts, setContacts] = useState([]);
  const [pendingContacts, setPendingContacts] = useState([]); // Contactos a crear al guardar (solo en creación)
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null); // _id al editar en BD, o índice (number) al editar pendiente
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
    idType: '',
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
    setProgramSearchTerm('');
    setProgramsModalOpen(false);
  };

  const closeProgramsModal = () => {
    setProgramsModalOpen(false);
    setNewProgramLevel('');
    setNewProgramName('');
    setProgramSearchTerm('');
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

      // Tipo identificación escenario de práctica (L_IDENTIFICATIONTYPE_COMPANY)
      const { data: idEscenarioData } = await api.get('/locations/items/L_IDENTIFICATIONTYPE_COMPANY', { params: { limit: 100 } });
      setIdTypesEscenario(idEscenarioData.data || []);

      // Tipo identificación representante legal (L_IDENTIFICATIONTYPE)
      const { data: idRepData } = await api.get('/locations/items/L_IDENTIFICATIONTYPE', { params: { limit: 100 } });
      setIdTypesRepresentante(idRepData.data || []);

      // Programas académicos (colección programs) para el modal de programas de interés
      const { data: programsRes } = await api.get('/programs', { params: { limit: 500 } });
      setProgramsList(programsRes?.data || []);
    } catch (error) {
      console.error('Error cargando datos dinámicos:', error);
    }
  };

  useEffect(() => {
    loadItemsData();
  }, []);

  // Revalidar correo R. Legal cuando cambien dominios o email (p. ej. al cargar en edición o al agregar/quitar dominio)
  useEffect(() => {
    if (vista !== 'form') return;
    if ((form.domains || []).length === 0) {
      setEmailDomainError('');
      return;
    }
    if (form.legalRepresentative?.email) validateEmailDomain(form.legalRepresentative.email);
  }, [vista, form.domains, form.legalRepresentative?.email]);

  // Revalidar correo del contacto cuando esté abierto el formulario y cambien dominios (Entidad) o userEmail
  useEffect(() => {
    if (!showContactForm) return;
    const raw = form.domains?.length ? form.domains : editing?.domains || [];
    const domains = raw.map(d => String(d).trim()).filter(Boolean);
    if (domains.length === 0) {
      setContactEmailDomainError('');
      return;
    }
    if (contactForm.userEmail) validateContactEmailDomain(contactForm.userEmail);
  }, [showContactForm, form.domains, editing?.domains, contactForm.userEmail]);

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

  // Niveles únicos desde el campo `level` de la colección programs (ej. "ES", "PR")
  const programLevelOptions = useMemo(() => {
    const levels = [...new Set(programsList.map(p => String(p.level || '').trim()).filter(Boolean))].sort();
    return levels;
  }, [programsList]);

  // Programas filtrados por nivel elegido; luego por búsqueda (nombre o código)
  const programsFilteredByLevel = useMemo(() => {
    if (!newProgramLevel) return [];
    return programsList.filter(p => String(p.level || '').trim() === newProgramLevel);
  }, [programsList, newProgramLevel]);

  const programsForSelect = useMemo(() => {
    const term = (programSearchTerm || '').toLowerCase().trim();
    if (!term) return programsFilteredByLevel;
    return programsFilteredByLevel.filter(p => {
      const name = (p.name || '').toLowerCase();
      const code = (p.code || '').toLowerCase();
      return name.includes(term) || code.includes(term);
    });
  }, [programsFilteredByLevel, programSearchTerm]);

  /** Validar NIT Colombia: 10 dígitos (9 base + 1 verificación), algoritmo módulo 11 DIAN */
  const validarNitColombia = (nit) => {
    const str = String(nit || '').replace(/\D/g, '');
    if (str.length !== 10) return false;
    const weights = [41, 37, 29, 23, 19, 17, 13, 7, 3];
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(str[i], 10) * weights[i];
    let digito = sum % 11;
    if (digito > 1) digito = 11 - digito;
    return parseInt(str[9], 10) === digito;
  };

  /** Validar que el correo del R. Legal pertenezca a uno de los dominios permitidos (si hay dominios configurados) */
  const validateEmailDomain = (email, domainsOverride) => {
    const domains = (domainsOverride !== undefined ? domainsOverride : (form.domains || [])).map(d => String(d).replace(/^@/, '').toLowerCase().trim()).filter(Boolean);
    if (domains.length === 0) {
      setEmailDomainError('');
      return true;
    }
    const domain = (email || '').split('@')[1]?.toLowerCase();
    if (!email || !domain) {
      setEmailDomainError('');
      return true; // no validar vacío aquí, lo hace required
    }
    if (domains.includes(domain)) {
      setEmailDomainError('');
      return true;
    }
    setEmailDomainError(`El correo debe ser de uno de los dominios permitidos: ${domains.join(', ')}`);
    return false;
  };

  /** Validar que el correo del contacto (userEmail) pertenezca a uno de los dominios de la empresa (pestaña Entidad) */
  const validateContactEmailDomain = (email, domainsOverride) => {
    const raw = domainsOverride !== undefined ? domainsOverride : (form.domains?.length ? form.domains : editing?.domains || []);
    const domains = raw.map(d => String(d).replace(/^@/, '').toLowerCase().trim()).filter(Boolean);
    if (domains.length === 0) {
      setContactEmailDomainError('');
      return true;
    }
    const domain = (email || '').split('@')[1]?.toLowerCase();
    if (!email || !domain) {
      setContactEmailDomainError('');
      return true;
    }
    if (domains.includes(domain)) {
      setContactEmailDomainError('');
      return true;
    }
    setContactEmailDomainError(`El correo debe ser de uno de los dominios permitidos: ${domains.join(', ')}`);
    return false;
  };

  const handleNitBlur = () => {
    const tipo = String(form.idType || '').toUpperCase();
    const val = (form.idNumber || form.nit || '').replace(/\D/g, '');
    if (tipo !== 'NIT' || !val) {
      setNitError('');
      return;
    }
    if (val.length !== 10) {
      setNitError('El NIT debe tener exactamente 10 dígitos (9 base + 1 dígito de verificación).');
      return;
    }
    if (!validarNitColombia(val)) {
      setNitError('El dígito de verificación del NIT no es válido (algoritmo DIAN Colombia).');
      return;
    }
    setNitError('');
  };

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
    setPendingContacts([]);
    setContacts([]);
    setShowContactForm(false);
    setEditingContact(null);
    setNitError('');
    setEmailDomainError('');
    setVista('form');
  };

  const startEdit = async (company) => {
    // Cargar empresa completa (incluye dominios y contactos) para validaciones
    try {
      const { data } = await api.get(`/companies/${company._id}`);
      setEditing(data);
      setContacts(data.contacts || []);
      company = data;
    } catch (e) {
      console.error('Error cargando empresa/contactos', e);
      setEditing(company);
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
    
    const ciiuCodesArr = (company.ciiuCodes && company.ciiuCodes.length) ? company.ciiuCodes : (company.ciiuCode ? [company.ciiuCode] : []);
    const domainsArr = (company.domains && company.domains.length) ? company.domains : (company.domain ? [company.domain] : []);
    setForm({
      ...emptyForm,
      ...company,
      countryCode,
      stateCode,
      ciiuCodes: ciiuCodesArr,
      domains: domainsArr,
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
    setNitError('');
    setEmailDomainError('');
    setShowContactForm(false);
    setEditingContact(null);
    setVista('form');
  };

  const cancelForm = () => {
    setVista('lista');
    setEditing(null);
    setForm(emptyForm);
    setCiiuSearchTerm('');
    setShowCiiuDropdown(false);
    setNitError('');
    setEmailDomainError('');
    setShowContactForm(false);
    setEditingContact(null);
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

    // Validar al menos un código CIIU
    if (!form.ciiuCodes || form.ciiuCodes.length === 0) {
      await Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Seleccione al menos un código CIIU (Sector Económico).', confirmButtonColor: '#c41e3a' });
      return;
    }

    // Validar que el correo del R. Legal sea de un dominio permitido (si hay dominios)
    const allowedDomains = (form.domains || []).map(d => String(d).replace(/^@/, '').toLowerCase().trim()).filter(Boolean);
    if (allowedDomains.length > 0 && form.legalRepresentative?.email) {
      const emailDom = form.legalRepresentative.email.split('@')[1]?.toLowerCase();
      if (!emailDom || !allowedDomains.includes(emailDom)) {
        setEmailDomainError(`El correo del representante legal debe ser de uno de los dominios: ${allowedDomains.join(', ')}`);
        await Swal.fire({
          icon: 'warning',
          title: 'Correo no permitido',
          text: `El correo debe pertenecer a uno de los dominios configurados: ${allowedDomains.join(', ')}`,
          confirmButtonColor: '#c41e3a'
        });
        return;
      }
    }

    // Validar NIT Colombia cuando el tipo es NIT
    if (String(form.idType || '').toUpperCase() === 'NIT' && (form.idNumber || form.nit)) {
      const nitStr = String(form.idNumber || form.nit).replace(/\D/g, '');
      if (nitStr.length !== 10) {
        setNitError('El NIT debe tener exactamente 10 dígitos (9 base + 1 dígito de verificación).');
        return;
      }
      if (!validarNitColombia(nitStr)) {
        setNitError('El dígito de verificación del NIT no es válido (algoritmo DIAN Colombia).');
        return;
      }
    }

    // Contacto es lo mismo que representante legal - mínimo 1 contacto obligatorio
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
        const newCompanyId = response.data?.data?._id || response.data?._id;
        if (newCompanyId && pendingContacts.length > 0) {
          for (const payload of pendingContacts) {
            await api.post(`/companies/${newCompanyId}/contacts`, payload);
          }
        }
      }
      
      cancelForm();
      await loadCompanies();
      await Swal.fire({
        icon: 'success',
        title: 'Éxito',
        text: response.data?.message || (editing ? 'Empresa actualizada correctamente' : 'Empresa y contactos creados correctamente'),
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
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

  const exportToExcel = async () => {
    Swal.fire({
      title: 'Exportando...',
      text: 'Preparando el archivo. Puede tardar un momento.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => { Swal.showLoading(); }
    });
    try {
      const baseParams = {
        limit: 500,
        ...(searchDebounced && { search: searchDebounced }),
        ...(filters.status && { status: filters.status }),
        ...(filters.sector && { sector: filters.sector }),
        ...(filters.city && { city: filters.city }),
        ...(filters.country && { country: filters.country }),
        ...(filters.size && { size: filters.size })
      };
      const { data: firstPage } = await api.get('/companies', { params: { ...baseParams, page: 1 } });
      const total = firstPage.pagination?.total ?? (firstPage.data?.length ?? 0);
      let list = [...(firstPage.data || [])];
      const totalPages = firstPage.pagination?.pages ?? 1;
      for (let page = 2; page <= totalPages; page++) {
        const { data: nextPage } = await api.get('/companies', { params: { ...baseParams, page } });
        list = list.concat(nextPage.data || []);
      }
      const contactCols = ['Contacto 1', 'Contacto 2', 'Contacto 3', 'Contacto 4', 'Contacto 5', 'Contacto 6', 'Contacto 7', 'Contacto 8'];
      const headers = ['Razón Social', 'NIT', 'Sector', 'CIIU', 'Tamaño', 'Ciudad', 'Teléfono', ...contactCols, 'País', 'Estado'];
      const safe = (v) => (v != null && v !== undefined ? String(v) : '');
      const rowForCompany = (c) => {
        const mainContact = c.contact?.name || [c.legalRepresentative?.firstName, c.legalRepresentative?.lastName].filter(Boolean).join(' ') || '';
        const mainContactStr = mainContact && (c.contact?.email || c.legalRepresentative?.email)
          ? `${mainContact} (${c.contact?.email || c.legalRepresentative?.email})`
          : mainContact;
        const additional = (c.contacts || []).slice(0, 7).map(ct => {
          const nom = [ct.firstName, ct.lastName].filter(Boolean).join(' ').trim();
          return nom && ct.userEmail ? `${nom} (${ct.userEmail})` : (nom || ct.userEmail || '');
        });
        const contactCells = [mainContactStr, ...additional];
        while (contactCells.length < 8) contactCells.push('');
        return [
          safe(c.name),
          safe(c.nit),
          safe(c.sector),
          (c.ciiuCodes && c.ciiuCodes.length) ? c.ciiuCodes.join('; ') : safe(c.ciiuCode),
          safe(c.size),
          safe(c.city),
          safe(c.phone),
          ...contactCells,
          safe(c.country),
          getStatusLabel(c.status)
        ];
      };
      const rows = list.map(rowForCompany);
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const colWidths = [
        { wch: 35 }, { wch: 14 }, { wch: 18 }, { wch: 24 }, { wch: 10 }, { wch: 18 }, { wch: 14 },
        ...Array(8).fill({ wch: 32 }),
        { wch: 14 }, { wch: 22 }
      ];
      ws['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, ws, 'Entidades');
      XLSX.writeFile(wb, `entidades_${new Date().toISOString().slice(0, 10)}.xlsx`);
      Swal.close();
      await Swal.fire({
        icon: 'success',
        title: 'Exportado',
        text: `Se exportaron ${list.length} entidad(es) a Excel.`,
        confirmButtonColor: '#c41e3a'
      });
    } catch (e) {
      console.error('Error exportando', e);
      Swal.close();
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: e.response?.data?.message || e.message || 'No se pudo exportar. Intente de nuevo.',
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
  
  const openContactForm = (contact = null, pendingIndex = undefined) => {
    if (contact) {
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
        acceptsDataProcessing: contact.acceptsDataProcessing !== false
      });
      setEditingContact(editing ? contact._id : pendingIndex);
      setContactEmailDomainError('');
    } else {
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
        idType: '',
        identification: '',
        userEmail: '',
        dependency: '',
        isPrincipal: false,
        position: '',
        isPracticeTutor: false,
        acceptsDataProcessing: false
      });
      setEditingContact(null);
      setContactEmailDomainError('');
    }
    setShowContactForm(true);
  };

  const cancelContactForm = () => {
    setShowContactForm(false);
    setEditingContact(null);
    setContactEmailDomainError('');
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
      idType: '',
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

    const contactDomains = (form.domains || []).map(d => String(d).replace(/^@/, '').toLowerCase().trim()).filter(Boolean);
    if (contactDomains.length > 0 && contactForm.userEmail) {
      const domain = (contactForm.userEmail || '').split('@')[1]?.toLowerCase();
      if (!domain || !contactDomains.includes(domain)) {
        setContactEmailDomainError(`El correo debe ser de uno de los dominios permitidos: ${contactDomains.join(', ')}`);
        await Swal.fire({
          icon: 'warning',
          title: 'Correo no permitido',
          text: `El correo del contacto debe pertenecer a uno de los dominios de la empresa: ${contactDomains.join(', ')}`,
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#c41e3a'
        });
        return;
      }
    }

    // Modo creación: añadir o actualizar en pendingContacts (sin API)
    if (!editing) {
      const payload = { ...contactForm };
      if (typeof editingContact === 'number') {
        setPendingContacts(prev => prev.map((c, i) => i === editingContact ? payload : c));
      } else {
        setPendingContacts(prev => (prev.length >= 7 ? prev : [...prev, payload]));
      }
      cancelContactForm();
      return;
    }

    // Modo edición: guardar en API
    try {
      if (editingContact) {
        await api.put(`/companies/${editing._id}/contacts/${editingContact}`, contactForm);
        await Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Contacto actualizado correctamente',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#c41e3a'
        });
      } else {
        await api.post(`/companies/${editing._id}/contacts`, contactForm);
        await Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Contacto creado correctamente',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#c41e3a'
        });
      }
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
        <div className="entity-form-container">
        <form className="company-form" onSubmit={saveForm}>
          <div className="form-section">
            <h4 className="form-section-title">Datos de la entidad</h4>
            <div className="form-grid-datos">
            {/* Nombre Comercial (obligatorio) */}
            <div className="form-group">
              <label className="form-label">Nombre Comercial *</label>
              <input className="form-input" placeholder="Nombre Comercial" value={form.commercialName} onChange={e=>setForm({ ...form, commercialName: e.target.value })} required />
            </div>
            {/* Tipo de Identificación escenario (parametrizado L_IDENTIFICATIONTYPE_COMPANY) */}
            <div className="form-group">
              <label className="form-label">Tipo de Identificación escenario de práctica *</label>
              <select className="form-input" value={form.idType} onChange={e=>{ setForm({ ...form, idType: e.target.value }); setNitError(''); }} required>
                <option value="">Seleccionar</option>
                {idTypesEscenario.map(item => (
                  <option key={item._id} value={item.value || item.description || item._id}>
                    {item.description || item.value || item._id}
                  </option>
                ))}
              </select>
            </div>
            {/* Razón Social (obligatorio) */}
            <div className="form-group">
              <label className="form-label">Razón Social *</label>
              <input className="form-input" placeholder="Razón Social" value={form.legalName} onChange={e=>setForm({ ...form, legalName: e.target.value, name: e.target.value })} required />
            </div>
            {/* Número de Identificación / NIT (10 dígitos + verificación cuando tipo es NIT) */}
            <div className="form-group">
              <label className="form-label">Número de Identificación (NIT) *</label>
              <input
                className="form-input"
                placeholder={String(form.idType || '').toUpperCase() === 'NIT' ? '10 dígitos (9 base + 1 verificación)' : 'Número de Identificación'}
                value={form.idNumber}
                onChange={e=>{ const v = e.target.value.replace(/\D/g, '').slice(0, 10); setForm({ ...form, idNumber: v, nit: v }); setNitError(''); }}
                onBlur={handleNitBlur}
                required
                maxLength={10}
                style={nitError ? { borderColor: '#dc2626' } : {}}
              />
              {nitError && <span className="form-hint" style={{ color: '#dc2626', fontSize: 12 }}>{nitError}</span>}
            </div>
            {/* Sector (obligatorio) */}
            <div className="form-group">
              <label className="form-label">Sector *</label>
              <select className="form-input" value={form.sector} onChange={e=>setForm({ ...form, sector: e.target.value })} required>
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
              <label className="form-label">Logo</label>
              <input className="form-input" type="file" onChange={(e)=>{/* manejo posterior de upload */}} />
            </div>
            {/* Sector MinE (SNIES) (obligatorio) */}
            <div className="form-group">
              <label className="form-label">Sector MinE (SNIES) *</label>
              <select className="form-input" value={form.sectorMineSnies} onChange={e=>setForm({ ...form, sectorMineSnies: e.target.value })} required>
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
              <label className="form-label label-plain">¿Autoriza uso de su logo en la publicación de oportunidades?</label>
              <input type="checkbox" checked={form.authorizeLogoUsage} onChange={e=>setForm({ ...form, authorizeLogoUsage: e.target.checked })} />
            </div>
            <div className="form-separator-line" />
            {/* Sector Económico / Códigos CIIU: hasta 3 (selección múltiple, 5 dígitos DANE) */}
            <div className="form-group full-width" style={{ position: 'relative' }}>
              <label className="form-label">Códigos CIIU (Sector Económico) * — hasta 3</label>
              {(form.ciiuCodes && form.ciiuCodes.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {form.ciiuCodes.map((code, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        background: '#e5e7eb',
                        borderRadius: 6,
                        fontSize: 13
                      }}
                    >
                      {code}
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, ciiuCodes: form.ciiuCodes.filter((_, i) => i !== idx) })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6b7280', fontSize: 16 }}
                        aria-label="Quitar"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {(!form.ciiuCodes || form.ciiuCodes.length < 3) && (
                <>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Escriba los 3 primeros dígitos o nombre para buscar y agregar (máx. 3)"
                    value={ciiuSearchTerm}
                    onChange={(e) => {
                      setCiiuSearchTerm(e.target.value);
                      setShowCiiuDropdown(e.target.value.length > 0);
                    }}
                    onFocus={() => ciiuSearchTerm && setShowCiiuDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCiiuDropdown(false), 200)}
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
                          const description = (ciiu.description || ciiu.valueForReports || '').toLowerCase();
                          const searchLower = ciiuSearchTerm.toLowerCase();
                          return code.toLowerCase().includes(searchLower) || description.includes(searchLower);
                        })
                        .slice(0, 10)
                        .map(ciiu => {
                          const code = ciiu.value || ciiu.valueForCalculations || '';
                          const description = ciiu.description || ciiu.valueForReports || '';
                          const alreadyAdded = (form.ciiuCodes || []).includes(code);
                          return (
                            <div
                              key={ciiu._id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                if (alreadyAdded) return;
                                const arr = form.ciiuCodes || [];
                                if (arr.length >= 3) return;
                                setForm({ ...form, ciiuCodes: [...arr, code], economicSector: arr[0] || code, ciiuCode: arr[0] || code });
                                setCiiuSearchTerm('');
                                setShowCiiuDropdown(false);
                              }}
                              style={{
                                padding: '10px',
                                cursor: alreadyAdded ? 'not-allowed' : 'pointer',
                                borderBottom: '1px solid #f0f0f0',
                                opacity: alreadyAdded ? 0.6 : 1
                              }}
                            >
                              <strong>{code}</strong> {description ? `- ${description}` : ''}
                              {alreadyAdded && ' (ya agregado)'}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </>
              )}
              {(!form.ciiuCodes || form.ciiuCodes.length === 0) && (
                <span className="form-hint" style={{ fontSize: 12, color: '#6b7280' }}>Seleccione al menos un código CIIU (máximo 3).</span>
              )}
            </div>
            <div className="form-separator-line" />
            {/* Misión y Visión */}
            <div className="form-group full-width">
              <label className="form-label">Misión y Visión</label>
              <textarea className="form-input" rows={3} placeholder="Misión y Visión" value={form.missionVision} onChange={e=>setForm({ ...form, missionVision: e.target.value })} />
            </div>
            <div className="form-separator-line" />

            {/* Tamaño de la compañía */}
            <div className="form-group">
              <label className="form-label">Tamaño de la compañía *</label>
              <select
                className="form-input"
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
              <label className="form-label label-plain">¿Opera como Agencia, bolsa de empleo o Head Hunter?</label>
              <input type="checkbox" checked={form.operatesAsAgency} onChange={e=>setForm({ ...form, operatesAsAgency: e.target.checked })} />
            </div>
            {/* ARL */}
            <div className="form-group">
              <label className="form-label">ARL</label>
              <select className="form-input" value={form.arl} onChange={e=>setForm({ ...form, arl: e.target.value })}>
                <option value="">Seleccionar</option>
                {arls.map(arl => (
                  <option key={arl._id} value={arl.value}>
                    {arl.value}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-separator-line" />

            {/* Dominios permitidos para correos de contactos */}
            <div className="form-group full-width">
              <label className="form-label">Dominios permitidos para correos de contactos</label>
              <p className="form-hint" style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                Los correos de los contactos (representante legal y adicionales) deberán pertenecer a uno de estos dominios.
              </p>
              {(form.domains && form.domains.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {form.domains.map((d, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        background: '#e5e7eb',
                        borderRadius: 6,
                        fontSize: 13
                      }}
                    >
                      {d}
                      <button
                        type="button"
                        onClick={() => {
                          const newDomains = form.domains.filter((_, i) => i !== idx);
                          setForm({ ...form, domains: newDomains, domain: form.domains[0] === d ? (form.domains[1] || '') : form.domain });
                          validateEmailDomain(form.legalRepresentative?.email, newDomains);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6b7280', fontSize: 16 }}
                        aria-label="Quitar dominio"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className="form-input"
                  placeholder="Ej: empresa.com (sin @)"
                  value={newDomainInput}
                  onChange={e => setNewDomainInput(e.target.value.replace(/@/g, '').trim())}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = newDomainInput.trim();
                      if (val && !(form.domains || []).includes(val)) {
                        const arr = [...(form.domains || []), val];
                        setForm({ ...form, domains: arr, domain: form.domain || val });
                        setNewDomainInput('');
                      }
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn-volver"
                  onClick={() => {
                    const val = newDomainInput.trim();
                    if (val && !(form.domains || []).includes(val)) {
                      const arr = [...(form.domains || []), val];
                      setForm({ ...form, domains: arr, domain: form.domain || val });
                      setNewDomainInput('');
                      validateEmailDomain(form.legalRepresentative?.email, arr);
                    }
                  }}
                  style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}
                >
                  Agregar dominio
                </button>
              </div>
            </div>
            <div className="form-separator-line" />

            {/* Documentos */}
            <div className="form-group">
              <label className="form-label">Doc. Acreditación Agencia</label>
              <input className="form-input" type="file" />
            </div>
            <div className="form-group">
              <label className="form-label">Certificado Cámara de Comercio</label>
              <input className="form-input" type="file" />
            </div>
            <div className="form-group">
              <label className="form-label">RUT</label>
              <input className="form-input" type="file" />
            </div>
            {/* Convenio prácticas (switch) */}
            <div className="form-group">
              <label className="form-label label-plain">¿Desea realizar convenio de prácticas y pasantías?</label>
              <input type="checkbox" checked={form.wantsPracticeAgreement} onChange={e=>setForm({ ...form, wantsPracticeAgreement: e.target.checked })} />
            </div>
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

          <div className="form-section">
            <h4 className="form-section-title">Datos del contacto y ubicación</h4>
            <div className="form-grid-datos">
            <div className="form-group">
              <label className="form-label">Nombres R. Legal *</label>
              <input className="form-input" placeholder="Nombres" value={form.legalRepresentative.firstName} onChange={e=>{
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
              <label className="form-label">Tipo de Identificación R. Legal *</label>
              <select className="form-input" value={form.legalRepresentative.idType} onChange={e=>setForm({ ...form, legalRepresentative: { ...form.legalRepresentative, idType: e.target.value } })} required>
                <option value="">Seleccionar</option>
                {idTypesRepresentante.map(item => (
                  <option key={item._id} value={item.value || item.description || item._id}>
                    {item.description || item.value || item._id}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Apellidos R. Legal *</label>
              <input className="form-input" placeholder="Apellidos" value={form.legalRepresentative.lastName} onChange={e=>{
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
              <label className="form-label">Nro. Identificación RL *</label>
              <input className="form-input" placeholder="999999999" value={form.legalRepresentative.idNumber} onChange={e=>setForm({ ...form, legalRepresentative: { ...form.legalRepresentative, idNumber: e.target.value } })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Correo R. Legal *</label>
              <input
                className="form-input"
                type="email"
                placeholder={(form.domains && form.domains.length) ? `Ej: contacto@${form.domains[0]}` : 'email@dominio.com'}
                value={form.legalRepresentative.email}
                onChange={e => {
                  const newEmail = e.target.value;
                  setForm({
                    ...form,
                    legalRepresentative: { ...form.legalRepresentative, email: newEmail },
                    contact: { ...form.contact, email: newEmail }
                  });
                  if (emailDomainError) validateEmailDomain(newEmail);
                }}
                onBlur={() => validateEmailDomain(form.legalRepresentative.email)}
                required
                style={emailDomainError ? { borderColor: '#dc2626' } : {}}
              />
              {emailDomainError && (
                <span className="form-hint" style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{emailDomainError}</span>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Página Web</label>
              <input className="form-input" placeholder="www.xxxx.xx" value={form.website} onChange={e=>setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">País</label>
              <select
                className="form-input"
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
              <label className="form-label">Dirección LinkedIn</label>
              <input className="form-input" placeholder="Dirección LinkedIn" value={form.linkedinUrl} onChange={e=>setForm({ ...form, linkedinUrl: e.target.value })} />
            </div>
            {statesForForm.length > 0 && (
              <div className="form-group">
                <label className="form-label">Estado/Provincia</label>
                <select
                  className="form-input"
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
              <label className="form-label">Ciudad</label>
              <select
                className="form-input"
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
              <label className="form-label">Dirección</label>
              <input className="form-input" placeholder="Dirección" value={form.address} onChange={e=>setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="form-input" placeholder="Teléfono" value={form.phone} onChange={e=>setForm({ ...form, phone: e.target.value })} />
            </div>
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
        </div>
        )}
        
        {activeTab === 'contactos' && (
          <div className="contacts-section">
            <div className="contacts-header">
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                Máximo 8 contactos por escenario (incluye representante legal). Actual: <strong>{1 + (editing ? contacts.length : pendingContacts.length)}</strong>
              </p>
              <button
                type="button"
                className="btn-guardar"
                onClick={() => openContactForm()}
                style={{ marginBottom: '20px' }}
                disabled={(editing ? contacts.length : pendingContacts.length) >= 7}
                title={(editing ? contacts.length : pendingContacts.length) >= 7 ? 'Máximo 8 contactos (representante legal + 7 adicionales)' : ''}
              >
                <FiPlus className="btn-icon" />
                {editing ? 'Crear contacto' : 'Añadir contacto'}
              </button>
            </div>

            {!showContactForm ? (
              <div className="contacts-list">
                {editing ? (
                  contacts.length === 0 ? (
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
                  )
                ) : (
                  (() => {
                    const list = pendingContacts;
                    if (list.length === 0) {
                      return <div className="contacts-empty">Añade contactos adicionales (el representante legal ya está en Datos del contacto). Al guardar la entidad se crearán todos.</div>;
                    }
                    return (
                      <table className="contacts-table">
                        <thead>
                          <tr>
                            <th>NOMBRES</th>
                            <th>APELLIDOS</th>
                            <th>USUARIO</th>
                            <th>TELÉFONO</th>
                            <th>CARGO</th>
                            <th>ACCIONES</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((contact, idx) => (
                            <tr key={idx}>
                              <td>{contact.firstName}</td>
                              <td>{contact.lastName}</td>
                              <td>{contact.userEmail}</td>
                              <td>{contact.phone || contact.mobile || '-'}</td>
                              <td>{contact.position || '-'}</td>
                              <td>
                                <div className="contact-actions">
                                  <button type="button" className="btn-action btn-outline" onClick={() => openContactForm(contact, idx)}>
                                    <FiEdit /> Editar
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-action btn-secondary"
                                    onClick={() => setPendingContacts(prev => prev.filter((_, i) => i !== idx))}
                                  >
                                    <FiTrash2 /> Quitar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()
                )}
              </div>
            ) : (
              <form className="contact-form entity-form-container" onSubmit={saveContact}>
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
                      placeholder={((form.domains?.length ? form.domains : editing?.domains) || [])[0] ? `Ej: contacto@${(form.domains?.length ? form.domains : editing?.domains)[0]}` : 'email@dominio.com'}
                      value={contactForm.userEmail}
                      onChange={e => {
                        const newEmail = e.target.value;
                        setContactForm({ ...contactForm, userEmail: newEmail });
                        if (contactEmailDomainError) validateContactEmailDomain(newEmail);
                      }}
                      onBlur={() => validateContactEmailDomain(contactForm.userEmail)}
                      required
                      style={contactEmailDomainError ? { borderColor: '#dc2626' } : {}}
                    />
                    {contactEmailDomainError && (
                      <span className="form-hint" style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{contactEmailDomainError}</span>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Tipo Identificación</label>
                    <select
                      value={contactForm.idType}
                      onChange={e => setContactForm({ ...contactForm, idType: e.target.value })}
                    >
                      <option value="">Seleccionar</option>
                      {idTypesRepresentante.map(item => (
                        <option key={item._id} value={item.value || item.description || item._id}>
                          {item.description || item.value || item._id}
                        </option>
                      ))}
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
                  <button type="submit" className="btn-guardar">
                    {editing ? (editingContact ? 'Guardar cambios' : 'Registrar contacto') : 'Añadir'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
        </div>
        {programsModalOpen && createPortal(
          <div className="modal-overlay modal-overlay-programas" onClick={closeProgramsModal}>
            <div className="modal modal-programas" onClick={(e)=>e.stopPropagation()}>
              <div className="modal-header">
                <h4>Programas de interés</h4>
                <button className="modal-close" onClick={closeProgramsModal} aria-label="Cerrar">×</button>
              </div>
              <div className="modal-body">
                <div className="modal-field">
                  <label>Nivel <span className="required">*</span></label>
                  <select
                    value={newProgramLevel}
                    onChange={e => {
                      setNewProgramLevel(e.target.value);
                      setNewProgramName('');
                      setProgramSearchTerm('');
                    }}
                  >
                    <option value="">Seleccione un nivel</option>
                    {programLevelOptions.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
                <div className="modal-field">
                  <label>Programa <span className="required">*</span></label>
                  <input
                    type="text"
                    className="modal-program-search"
                    placeholder="Buscar por nombre o código..."
                    value={programSearchTerm}
                    onChange={e => setProgramSearchTerm(e.target.value)}
                  />
                  <select
                    value={newProgramName}
                    onChange={e=>setNewProgramName(e.target.value)}
                    disabled={!newProgramLevel}
                  >
                    <option value="">Seleccione un programa</option>
                    {programsForSelect.map(prog => (
                      <option key={prog._id} value={prog.name}>
                        {prog.code ? `${prog.code} - ` : ''}{prog.name}
                      </option>
                    ))}
                  </select>
                  {newProgramLevel && programsForSelect.length === 0 && (
                    <span className="form-hint" style={{ fontSize: 12, color: '#6b7280' }}>
                      {programSearchTerm ? 'Sin resultados. Pruebe otro término.' : 'No hay programas para este nivel.'}
                    </span>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeProgramsModal}>Cerrar</button>
                <button type="button" className="btn-guardar" onClick={addProgram}>Añadir</button>
              </div>
            </div>
          </div>,
          document.body
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
          <button type="button" className="btn-volver" onClick={loadCompanies} title="Refrescar lista">
            <FiRefreshCw className="btn-icon" />
            Refrescar
          </button>
          <button type="button" className="btn-volver" onClick={exportToExcel} title="Exportar todas las entidades (según filtros actuales)">
            Exportar Excel
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
        </div>
        
        <div className="filters-row">
          <select 
            value={filters.status} 
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="pending_approval">Pendiente de Aprobación</option>
            <option value="active">Activa</option>
            <option value="inactive">Inactiva</option>
          </select>
          
          <select 
            value={filters.sector} 
            onChange={(e) => handleFilterChange('sector', e.target.value)}
          >
            <option value="">Todos los sectores</option>
            {uniqueSectors.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          
          <select 
            value={filters.city} 
            onChange={(e) => handleFilterChange('city', e.target.value)}
          >
            <option value="">Todas las ciudades</option>
            {uniqueCities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          
          <select 
            value={filters.country} 
            onChange={(e) => handleFilterChange('country', e.target.value)}
          >
            <option value="">Todos los países</option>
            {uniqueCountries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          
          <select 
            value={filters.size} 
            onChange={(e) => handleFilterChange('size', e.target.value)}
          >
            <option value="">Todos los tamaños</option>
            <option value="micro">Micro</option>
            <option value="pequeña">Pequeña</option>
            <option value="mediana">Mediana</option>
            <option value="grande">Grande</option>
          </select>
          
          {(filters.status || filters.sector || filters.city || filters.country || filters.size) && (
            <button 
              className="btn-clear-filters"
              onClick={() => setFilters({ status: '', sector: '', city: '', country: '', size: '' })}
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
                <th>CIIU</th>
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
                  <td colSpan="10" style={{ textAlign: 'center', padding: '20px' }}>
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
                    <td>{(c.ciiuCodes && c.ciiuCodes.length) ? c.ciiuCodes.join(', ') : (c.ciiuCode || '-')}</td>
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


