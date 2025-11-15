import { useEffect, useMemo, useState } from 'react';
import { FiArrowLeft, FiPlus, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { Country, City } from 'country-state-city';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../styles/Sucursales.css';

export default function Sucursales({ onVolver }) {
  const [loading, setLoading] = useState(true);
  const [sucursales, setSucursales] = useState([]);
  const [search, setSearch] = useState('');
  const [vista, setVista] = useState('lista'); // lista | form
  const [editing, setEditing] = useState(null);

  const emptyForm = {
    nombre: '',
    codigo: '',
    direccion: '',
    pais: '',
    ciudad: '',
    directorioActivo: {
      tipo: '',
      urlBase: '',
      tipoRespuesta: '',
      instancia: '',
      ubicacionCache: 'localStorage',
      clienteId: '',
      urlAutenticacion: '',
      urlAcceso: ''
    },
    estado: true
  };

  const [form, setForm] = useState(emptyForm);

  // Obtener países, estados y ciudades
  const countries = Country.getAllCountries();
  
  // Obtener código de país si tenemos el nombre
  const getCountryCode = (countryName) => {
    if (!countryName) return '';
    const country = countries.find(c => c.name === countryName || c.isoCode === countryName);
    return country?.isoCode || countryName;
  };
  
  const countryCode = getCountryCode(form.pais);
  const citiesForForm = countryCode 
    ? City.getCitiesOfCountry(countryCode)
    : [];

  const loadSucursales = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/sucursales');
      setSucursales(data.data || []);
    } catch (e) {
      console.error('Error cargando sucursales', e);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las sucursales',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSucursales();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sucursales;
    return sucursales.filter(s =>
      s.nombre?.toLowerCase().includes(q) ||
      s.codigo?.toLowerCase().includes(q) ||
      s.direccion?.toLowerCase().includes(q) ||
      s.directorioActivo?.tipo?.toLowerCase().includes(q)
    );
  }, [sucursales, search]);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setVista('form');
  };

  const startEdit = (sucursal) => {
    setEditing(sucursal);
    // Buscar código de país si tenemos el nombre
    const countryName = sucursal.pais || '';
    const country = countries.find(c => c.name === countryName || c.isoCode === countryName);
    
    setForm({
      nombre: sucursal.nombre || '',
      codigo: sucursal.codigo || '',
      direccion: sucursal.direccion || '',
      pais: country?.name || countryName || '',
      ciudad: sucursal.ciudad || '',
      directorioActivo: {
        tipo: sucursal.directorioActivo?.tipo || '',
        urlBase: sucursal.directorioActivo?.urlBase || '',
        tipoRespuesta: sucursal.directorioActivo?.tipoRespuesta || '',
        instancia: sucursal.directorioActivo?.instancia || '',
        ubicacionCache: sucursal.directorioActivo?.ubicacionCache || 'localStorage',
        clienteId: sucursal.directorioActivo?.clienteId || '',
        urlAutenticacion: sucursal.directorioActivo?.urlAutenticacion || '',
        urlAcceso: sucursal.directorioActivo?.urlAcceso || ''
      },
      estado: sucursal.estado !== undefined ? sucursal.estado : true
    });
    setVista('form');
  };

  const cancelForm = () => {
    setVista('lista');
    setEditing(null);
    setForm(emptyForm);
  };

  const saveForm = async (e) => {
    e.preventDefault();

    // Validar campos requeridos
    if (!form.nombre.trim() || !form.codigo.trim() || !form.directorioActivo.tipo || !form.directorioActivo.urlBase) {
      await Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Los campos Nombres, Código Sede, Directorio activo y URL base son obligatorios',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
      return;
    }

    try {
      let response;
      if (editing) {
        response = await api.put(`/sucursales/${editing._id}`, form);
      } else {
        response = await api.post('/sucursales', form);
      }

      await Swal.fire({
        icon: 'success',
        title: 'Éxito',
        text: response.data?.message || 'Sucursal guardada correctamente',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });

      cancelForm();
      await loadSucursales();
    } catch (error) {
      console.error('Error guardando sucursal', error);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Error al guardar la sucursal. Por favor verifique los datos e intente nuevamente.';

      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    }
  };

  const handleEstadoChange = async (sucursal, newEstado) => {
    try {
      await api.patch(`/sucursales/${sucursal._id}/toggle-estado`);
      await loadSucursales();
    } catch (error) {
      console.error('Error cambiando estado', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al cambiar el estado',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#c41e3a'
      });
    }
  };

  if (vista === 'form') {
    return (
      <div className="sucursales-content">
        <div className="sucursales-header">
          <div className="configuracion-actions">
            <button className="btn-volver" onClick={cancelForm}>
              <FiArrowLeft className="btn-icon" />
              Volver
            </button>
            <button className="btn-guardar" onClick={saveForm}>
              Guardar
            </button>
          </div>
          <h3 className="section-header-title">{editing ? 'EDITAR SUCURSAL' : 'CREAR SUCURSAL'}</h3>
        </div>

        <div className="sucursales-section">
          <form className="sucursal-form" onSubmit={saveForm}>
            <h3 className="section-title">DATOS SUCURSAL</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Nombres <span className="required">*</span></label>
                <input
                  placeholder="nombres"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Dirección</label>
                <input
                  placeholder="direccion"
                  value={form.direccion}
                  onChange={e => setForm({ ...form, direccion: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Directorio activo: <span className="required">*</span></label>
                <select
                  value={form.directorioActivo.tipo}
                  onChange={e => setForm({
                    ...form,
                    directorioActivo: { ...form.directorioActivo, tipo: e.target.value }
                  })}
                  required
                >
                  <option value="">Seleccionar</option>
                  <option value="LDAP">LDAP</option>
                  <option value="DNS">DNS</option>
                  <option value="DHCP">DHCP</option>
                  <option value="OTRO">OTRO</option>
                </select>
              </div>

              <div className="form-group">
                <label>Código Sede: <span className="required">*</span></label>
                <input
                  placeholder="Código para identificar la rama"
                  value={form.codigo}
                  onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className="form-group">
                <label>País:</label>
                <select
                  value={countryCode}
                  onChange={e => {
                    const selectedCode = e.target.value;
                    const selectedCountry = countries.find(c => c.isoCode === selectedCode);
                    setForm({
                      ...form,
                      pais: selectedCountry?.name || selectedCode,
                      ciudad: '' // Reset ciudad al cambiar país
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
                <label>Ciudad:</label>
                <select
                  value={form.ciudad}
                  onChange={e => setForm({ ...form, ciudad: e.target.value })}
                  disabled={!countryCode}
                >
                  <option value="">Seleccionar</option>
                  {citiesForForm.map(city => (
                    <option key={city.name} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <h3 className="section-title">DATOS DIRECTORIO ACTIVO</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>URL base <span className="required">*</span></label>
                <input
                  placeholder="url base"
                  value={form.directorioActivo.urlBase}
                  onChange={e => setForm({
                    ...form,
                    directorioActivo: { ...form.directorioActivo, urlBase: e.target.value }
                  })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Tipo de Respuesta</label>
                <input
                  placeholder="code"
                  value={form.directorioActivo.tipoRespuesta}
                  onChange={e => setForm({
                    ...form,
                    directorioActivo: { ...form.directorioActivo, tipoRespuesta: e.target.value }
                  })}
                />
              </div>

              <div className="form-group">
                <label>Instancia</label>
                <input
                  placeholder="Instancia"
                  value={form.directorioActivo.instancia}
                  onChange={e => setForm({
                    ...form,
                    directorioActivo: { ...form.directorioActivo, instancia: e.target.value }
                  })}
                />
              </div>

              <div className="form-group">
                <label>Ubicación Cache</label>
                <input
                  placeholder="localStorage"
                  value={form.directorioActivo.ubicacionCache}
                  onChange={e => setForm({
                    ...form,
                    directorioActivo: { ...form.directorioActivo, ubicacionCache: e.target.value }
                  })}
                />
              </div>

              <div className="form-group">
                <label>Cliente id</label>
                <input
                  placeholder="Cliente id"
                  value={form.directorioActivo.clienteId}
                  onChange={e => setForm({
                    ...form,
                    directorioActivo: { ...form.directorioActivo, clienteId: e.target.value }
                  })}
                />
              </div>

              <div className="form-group">
                <label>Url Autenticación</label>
                <input
                  placeholder="Url Autenticación"
                  value={form.directorioActivo.urlAutenticacion}
                  onChange={e => setForm({
                    ...form,
                    directorioActivo: { ...form.directorioActivo, urlAutenticacion: e.target.value }
                  })}
                />
              </div>

              <div className="form-group">
                <label>Url Acceso</label>
                <input
                  placeholder="Url Acceso"
                  value={form.directorioActivo.urlAcceso}
                  onChange={e => setForm({
                    ...form,
                    directorioActivo: { ...form.directorioActivo, urlAcceso: e.target.value }
                  })}
                />
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="sucursales-content">
      <div className="sucursales-header">
        <div className="configuracion-actions">
          <button className="btn-crear" onClick={startCreate}>
            <FiPlus className="btn-icon" />
            Crear Sucursal
          </button>
          <button className="btn-refresh" onClick={loadSucursales}>
            <FiRefreshCw className="btn-icon" />
          </button>
        </div>
        <div className="companies-filters">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar Sucursal"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="sucursales-section">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando...</p>
          </div>
        ) : (
          <div className="sucursales-table-container">
            <table className="sucursales-table">
              <thead>
                <tr>
                  <th>CÓDIGO</th>
                  <th>NOMBRE</th>
                  <th>DIRECTORIO ACTIVO</th>
                  <th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                      No hay sucursales registradas
                    </td>
                  </tr>
                ) : (
                  filtered.map(sucursal => (
                    <tr 
                      key={sucursal._id}
                      onClick={() => startEdit(sucursal)}
                      style={{ cursor: 'pointer' }}
                      className="table-row-clickable"
                    >
                      <td>{sucursal.codigo}</td>
                      <td>{sucursal.nombre}</td>
                      <td>{sucursal.directorioActivo?.tipo || '-'}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="switch-container">
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={sucursal.estado}
                              onChange={() => handleEstadoChange(sucursal, !sucursal.estado)}
                            />
                            <span className="slider"></span>
                          </label>
                          <span className={`status-text ${sucursal.estado ? 'active' : 'inactive'}`}>
                            {sucursal.estado ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

