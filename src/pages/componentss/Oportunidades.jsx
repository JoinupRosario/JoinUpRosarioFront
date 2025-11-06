import { useEffect, useMemo, useState } from 'react';
import { FiArrowLeft, FiPlus, FiRefreshCw, FiSearch, FiFilter, FiBookOpen, FiDollarSign, FiFileText, FiUsers, FiCalendar, FiMapPin, FiClock, FiBook } from 'react-icons/fi';
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
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companySearch, setCompanySearch] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [tipoOportunidad, setTipoOportunidad] = useState(null); // 'practica' | 'monitoria'
  const [showModalInfo, setShowModalInfo] = useState(false);
  
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
    horario: ''
  });
  
  // Estados para países y ciudades
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);

  // Verificar si el usuario es administrativo
  // Todos los usuarios con modulo 'administrativo' deben seleccionar empresa
  // Leer desde localStorage si no está en el contexto
  const modulo = user?.modulo || localStorage.getItem('modulo');
  const isAdmin = modulo === 'administrativo';

  const loadOportunidades = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/opportunities');
      // El backend devuelve { opportunities, total, ... }
      setOportunidades(data.opportunities || data.data || []);
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
    loadOportunidades();
    if (isAdmin) {
      loadCompanies();
    }
    // Cargar países
    setCountries(Country.getAllCountries());
  }, [isAdmin]);
  
  // Cargar ciudades cuando se selecciona un país
  useEffect(() => {
    if (formData.pais) {
      const countryCities = City.getCitiesOfCountry(formData.pais);
      setCities(countryCities || []);
    } else {
      setCities([]);
    }
  }, [formData.pais]);

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
      'creada': '#6b7280',
      'en_revision': '#f59e0b',
      'revisada': '#3b82f6',
      'published': '#10b981',
      'activa': '#10b981',
      'rechazada': '#ef4444',
      'closed': '#6b7280',
      'cerrada': '#6b7280',
      'cancelled': '#ef4444',
      'vencida': '#9ca3af'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'draft': 'Creada',
      'creada': 'Creada',
      'en_revision': 'En Revisión',
      'revisada': 'Revisada',
      'published': 'Activada',
      'activa': 'Activada',
      'rechazada': 'Rechazado',
      'closed': 'Cerrada',
      'cerrada': 'Cerrada',
      'cancelled': 'Rechazado',
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
  
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleSaveForm = () => {
    // Por ahora solo validación básica, sin enviar al backend
    console.log('Datos del formulario:', formData);
    Swal.fire({
      icon: 'info',
      title: 'Formulario',
      text: 'El backend se implementará cuando el formulario esté completo',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#c41e3a'
    });
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
                    formData.horario;

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
      horario: ''
    });
  };

  if (vista === 'crear') {
    return (
      <div className="oportunidades-content">
        <div className="oportunidades-header">
          <div className="configuracion-actions">
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
                {/* Nombre del cargo - Ocupa todo el ancho */}
                <div className="form-field-group form-field-full-width">
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
                  <div className="form-field-group">
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
                          <strong>¡Información!</strong>
                          <p>El apoyo económico debe ser superior o igual al salario mínimo vigente. No debe contener ni puntos ni comas</p>
                        </div>
                      </div>
                    </label>
                    <input
                      type="text"
                      name="apoyoEconomico"
                      value={formData.apoyoEconomico}
                      onChange={handleFormChange}
                      className="form-input"
                      placeholder="Ingrese el monto"
                    />
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
                    Jornada Ordinaria Semanal
                    <div className="info-tooltip-wrapper">
                      <span className="info-icon">i</span>
                      <div className="tooltip-content">
                        <strong>¡Información!</strong>
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
                {formData.jornadaOrdinariaSemanal === 'por_horas' && (
                  <div className="form-field-group">
                    <label className="form-label">
                      Jornada Semanal de la Práctica
                      <div className="info-tooltip-wrapper">
                        <span className="info-icon">i</span>
                        <div className="tooltip-content">
                          <strong>¡Información!</strong>
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
                )}

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
                  <label className="form-label">Horario</label>
                  <textarea
                    name="horario"
                    value={formData.horario}
                    onChange={handleFormChange}
                    className="form-textarea form-textarea-small"
                    placeholder="Describa el horario de la práctica..."
                    rows="3"
                  />
                </div>
              </form>
            </div>
          ) : null}
        </div>

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
      <div className="oportunidades-header">
        <div className="configuracion-actions">
          <button className="btn-crear" onClick={handleCrearOportunidad}>
            <FiPlus className="btn-icon" />
            Crear Oportunidad
          </button>
          <button className="btn-refresh" onClick={loadOportunidades}>
            <FiRefreshCw className="btn-icon" />
          </button>
        </div>
        <h3 className="section-header-title">LISTADO DE OPORTUNIDADES</h3>
      </div>

      {/* Filtros */}
      <div className="oportunidades-filters">
        <div className="filter-group">
          <FiFilter className="filter-icon" />
          <input
            type="text"
            className="filter-input"
            placeholder="Buscar por título, empresa o número..."
            value={search}
            onChange={e => setSearch(e.target.value)}
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
        ) : filteredOportunidades.length === 0 ? (
          <div className="empty-state">
            <p>No hay oportunidades registradas</p>
          </div>
        ) : (
          <div className="oportunidades-grid">
            {filteredOportunidades.map(oportunidad => (
              <div key={oportunidad._id} className="oportunidad-card">
                <div className="oportunidad-header">
                  <div className="oportunidad-title-section">
                    <h4 className="oportunidad-title">{oportunidad.title || 'Sin título'}</h4>
                    <span className="oportunidad-number">Oportunidad No. {oportunidad.opportunityNumber || oportunidad._id.slice(-6)}</span>
                  </div>
                  <div className="oportunidad-pin">
                    <HiOutlineAcademicCap />
                  </div>
                </div>
                <div className="oportunidad-body">
                  <div className="oportunidad-company">
                    {oportunidad.company?.name || oportunidad.company?.commercialName || 'Empresa no especificada'}
                  </div>
                  <div className="oportunidad-remuneration">
                    ${oportunidad.details?.salary?.toLocaleString('es-CO') || oportunidad.remuneration?.toLocaleString('es-CO') || 'No especificada'}
                  </div>
                  {oportunidad.requirements?.programs && oportunidad.requirements.programs.length > 0 && (
                    <div className="oportunidad-areas">
                      {oportunidad.requirements.programs.slice(0, 2).map((program, idx) => (
                        <span key={idx} className="area-tag">-{program}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="oportunidad-footer">
                  <div className="oportunidad-status">
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(oportunidad.status) }}
                    >
                      {getStatusLabel(oportunidad.status)}
                    </span>
                  </div>
                  <div className="oportunidad-icons">
                    <span className="oportunidad-type-icon">
                      <HiOutlineAcademicCap />
                      <span>Práctica</span>
                    </span>
                    <span className="oportunidad-notification-icon">
                      <span className="notification-badge">0</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

