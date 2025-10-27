import React, { useState, useEffect } from 'react';
import { 
  FiPlus, 
  FiEdit, 
  FiKey, 
  FiCheck, 
  FiX,
  FiSearch,
  FiFilter,
  FiArrowLeft,
  FiUsers,
  FiBook
} from 'react-icons/fi';
import { HiOutlineKey } from 'react-icons/hi';
import Swal from 'sweetalert2';
import '../styles/Roles.css'; 
import api from '../../services/api';

const Roles = ({ onVolver }) => {
  const [vistaActual, setVistaActual] = useState('buscar');
  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRol, setSelectedRol] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [selectedRolId, setSelectedRolId] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    estado: true
  });

  const [permisosSeleccionados, setPermisosSeleccionados] = useState({});

  // Configuración personalizada de SweetAlert2
  const showAlert = (icon, title, text, confirmButtonText = 'Aceptar') => {
    return Swal.fire({
      icon,
      title,
      text,
      confirmButtonText,
      confirmButtonColor: '#c41e3a',
      background: '#fff',
      color: '#333',
      customClass: {
        popup: 'custom-swal-popup',
        title: 'custom-swal-title',
        confirmButton: 'custom-swal-confirm-button'
      }
    });
  };

  const showSuccess = (title, text) => showAlert('success', title, text);
  const showError = (title, text) => showAlert('error', title, text);
  const showWarning = (title, text) => showAlert('warning', title, text);
  const showInfo = (title, text) => showAlert('info', title, text);

  const showConfirmation = (title, text, confirmButtonText = 'Sí, continuar') => {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      cancelButtonColor: '#6c757d',
      confirmButtonText,
      cancelButtonText: 'Cancelar',
      background: '#fff',
      color: '#333',
      customClass: {
        popup: 'custom-swal-popup',
        title: 'custom-swal-title',
        confirmButton: 'custom-swal-confirm-button',
        cancelButton: 'custom-swal-cancel-button'
      }
    });
  };

  // Cargar datos iniciales
  useEffect(() => {
    cargarRoles();
    cargarPermisos();
  }, []);

  const cargarRoles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/roles');
      if (response.data.success) {
        setRoles(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar roles:', error);
      showError('Error', 'No se pudieron cargar los roles');
    } finally {
      setLoading(false);
    }
  };

  const cargarPermisos = async () => {
    try {
      const response = await api.get('/roles/permisos/todos');
      if (response.data.success) {
        setPermisos(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar permisos:', error);
      showError('Error', 'No se pudieron cargar los permisos');
    }
  };

  // Filtrar roles
  const rolesFiltrados = roles.filter(rol => {
    const coincideNombre = rol.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const coincideEstado = filterEstado === 'todos' || 
      (filterEstado === 'activos' && rol.estado) || 
      (filterEstado === 'inactivos' && !rol.estado);
    
    return coincideNombre && coincideEstado;
  });

  // Manejar creación/edición de rol
  const handleCrearRol = async (e) => {
    e.preventDefault();
    
    // Validación del nombre
    if (!formData.nombre.trim()) {
      showError('Error', 'El nombre del rol es obligatorio');
      return;
    }

    try {
      if (selectedRol) {
        // Editar rol existente
        const response = await api.put(`/roles/${selectedRol._id}`, {
          nombre: formData.nombre,
          estado: formData.estado
        });
        if (response.data.success) {
          await showSuccess('Éxito', 'Rol actualizado correctamente');
          cargarRoles();
          setVistaActual('buscar');
          setSelectedRol(null);
          setFormData({ nombre: '', estado: true });
        }
      } else {
        // Crear nuevo rol
        const response = await api.post('/roles', {
          nombre: formData.nombre,
          estado: formData.estado,
          permisos: []
        });
        if (response.data.success) {
          await showSuccess('Éxito', 'Rol creado correctamente');
          cargarRoles();
          setVistaActual('buscar');
          setFormData({ nombre: '', estado: true });
        }
      }
    } catch (error) {
      console.error('Error al crear/editar rol:', error);
      showError('Error', 'Error al guardar el rol');
    }
  };

  // Seleccionar rol
  const seleccionarRol = (rolId) => {
    setSelectedRolId(selectedRolId === rolId ? null : rolId);
  };

  // Abrir gestión de permisos
  const abrirGestionPermisos = (rol) => {
    setSelectedRol(rol);
    
    // Inicializar permisos seleccionados basado en los permisos actuales del rol
    const permisosIniciales = {};
    if (rol.permisos && rol.permisos.length > 0) {
      rol.permisos.forEach(permisoRol => {
        if (permisoRol.estado && permisoRol.permiso) {
          permisosIniciales[permisoRol.permiso._id || permisoRol.permiso] = true;
        }
      });
    }
    
    setPermisosSeleccionados(permisosIniciales);
    setVistaActual('permisos');
  };

  // Abrir edición de rol al hacer clic en el nombre
  const abrirEdicionRol = (rol) => {
    setFormData({
      nombre: rol.nombre,
      estado: rol.estado
    });
    setSelectedRol(rol);
    setVistaActual('crear');
  };

  // Guardar permisos del rol - VERSIÓN CORREGIDA (Escalable)
  const guardarPermisos = async () => {
    try {
      // Mostrar confirmación
      const result = await showConfirmation(
        'Guardar Permisos',
        `¿Estás seguro de que deseas guardar los permisos para el rol "${selectedRol?.nombre}"?`
      );

      if (!result.isConfirmed) {
        return;
      }

      // Preparar array de IDs de permisos seleccionados
      const permisosIds = Object.keys(permisosSeleccionados).filter(
        permisoId => permisosSeleccionados[permisoId]
      );

      // SOLUCIÓN ESCALABLE: Una sola llamada API con todos los permisos
      const response = await api.put(`/roles/${selectedRol._id}/permisos`, {
        permisos: permisosIds
      });

      if (response.data.success) {
        await showSuccess('Éxito', 'Permisos actualizados correctamente');
        setVistaActual('buscar');
        setSelectedRol(null);
        setSelectedRolId(null);
        setPermisosSeleccionados({});
        cargarRoles();
      } else {
        throw new Error(response.data.message || 'Error al guardar permisos');
      }
      
    } catch (error) {
      console.error('Error al guardar permisos:', error);
      showError('Error', 'Error al guardar los permisos');
    }
  };

  // Cambiar estado del rol
  const toggleEstadoRol = async (rolId, nuevoEstado) => {
    const rol = roles.find(r => r._id === rolId);
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    const result = await showConfirmation(
      `${nuevoEstado ? 'Activar' : 'Desactivar'} Rol`,
      `¿Estás seguro de que deseas ${accion} el rol "${rol?.nombre}"?`,
      `Sí, ${accion}`
    );

    if (!result.isConfirmed) {
      return;
    }

    try {
      const response = await api.patch(`/roles/${rolId}/estado`, {
        estado: nuevoEstado
      });
      
      if (response.data.success) {
        await showSuccess('Éxito', `Rol ${accion}do correctamente`);
        cargarRoles();
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      showError('Error', `Error al ${accion} el rol`);
    }
  };

  // Mostrar alertas de funcionalidades en desarrollo
  const showFuncionalidadEnDesarrollo = (funcionalidad) => {
    showInfo(
      'Funcionalidad en Desarrollo',
      `La funcionalidad "${funcionalidad}" está actualmente en desarrollo y estará disponible próximamente.`
    );
  };

  // Agrupar permisos por módulo
  const permisosPorModulo = permisos.reduce((acc, permiso) => {
    if (!acc[permiso.modulo]) {
      acc[permiso.modulo] = [];
    }
    acc[permiso.modulo].push(permiso);
    return acc;
  }, {});

  // Renderizar vista de Búsqueda (Lista de roles)
  const renderBuscarRol = () => (
    <div className="roles-content">
      <div className="roles-section">
        <div className="roles-header">
          <div className="configuracion-actions">
            <button className="btn-volver" onClick={onVolver}>
              <FiArrowLeft className="btn-icon" />
              Volver
            </button>
            <button 
              className="btn-guardar" 
              onClick={() => {
                setFormData({ nombre: '', estado: true });
                setSelectedRol(null);
                setSelectedRolId(null);
                setVistaActual('crear');
              }}
            >
              <FiPlus className="btn-icon" />
              Crear Rol
            </button>
          </div>
          <div className="section-header">
            <h3>BUSCAR ROL</h3>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="roles-filters">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-group">
            <FiFilter className="filter-icon" />
            <select 
              value={filterEstado} 
              onChange={(e) => setFilterEstado(e.target.value)}
              className="filter-select"
            >
              <option value="todos">Todos los estados</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </div>
        </div>

        {/* Barra de opciones de asociación - Solo visible cuando hay un rol seleccionado */}
        {selectedRolId && (
          <div className="association-bar">
            <div className="association-info">
              <span className="selected-rol-info">
                Rol seleccionado: <strong>{roles.find(r => r._id === selectedRolId)?.nombre}</strong>
              </span>
            </div>
            <div className="association-actions">
              <button
                className="btn-association btn-permisos"
                onClick={() => abrirGestionPermisos(roles.find(r => r._id === selectedRolId))}
                title="Asociar permisos"
              >
                <FiKey className="btn-icon" />
                Asociar Permisos
              </button>
              <button
                className="btn-association btn-users"
                onClick={() => showFuncionalidadEnDesarrollo('Asociar Usuarios')}
                title="Asociar usuarios"
              >
                <FiUsers className="btn-icon" />
                Asociar Usuarios
              </button>
              <button
                className="btn-association btn-rules"
                onClick={() => showFuncionalidadEnDesarrollo('Reglas para Oportunidad')}
                title="Reglas para oportunidad"
              >
                <FiBook className="btn-icon" />
                Reglas Oportunidad
              </button>
            </div>
          </div>
        )}

        {/* Tabla de Roles */}
        <div className="roles-table-container">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Cargando roles...</p>
            </div>
          ) : rolesFiltrados.length === 0 ? (
            <div className="empty-state">
              <HiOutlineKey className="empty-icon" />
              <h3>No se encontraron roles</h3>
              <p>{roles.length === 0 ? 'No hay roles creados todavía.' : 'Intenta con otros términos de búsqueda.'}</p>
            </div>
          ) : (
            <table className="roles-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>NOMBRE</th>
                  <th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {rolesFiltrados.map(rol => (
                  <tr key={rol._id}>
                    <td>
                      <div className="rol-selection">
                        <input
                          type="checkbox"
                          checked={selectedRolId === rol._id}
                          onChange={() => seleccionarRol(rol._id)}
                          className="rol-checkbox"
                        />
                      </div>
                    </td>
                  <td>
  <span 
    className="rol-name-clickable"
    onClick={() => abrirEdicionRol(rol)}
    title="Haz clic para editar este rol"
  >
    {rol.nombre}
  </span>
</td>
                    <td>
                      <div className="switch-container">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={rol.estado}
                            onChange={() => toggleEstadoRol(rol._id, !rol.estado)}
                          />
                          <span className="slider"></span>
                        </label>
                        <span className={`status-text ${rol.estado ? 'active' : 'inactive'}`}>
                          {rol.estado ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  // Renderizar vista de Crear/Editar Rol
  const renderCrearRol = () => (
    <div className="roles-content">
      <div className="roles-section">
        <div className="roles-header">
          <div className="configuracion-actions">
            <button className="btn-volver" onClick={() => setVistaActual('buscar')}>
              <FiArrowLeft className="btn-icon" />
              Volver
            </button>
            <button className="btn-guardar" onClick={handleCrearRol}>
              <FiCheck className="btn-icon" />
              {selectedRol ? 'Actualizar Rol' : 'Crear Rol'}
            </button>
          </div>
          <div className="section-header">
            <h3>{selectedRol ? 'EDITAR ROL' : 'CREAR ROL'}</h3>
          </div>
        </div>

        <div className="role-form-container">
          <div className="form-section">
            <div className="form-group">
              <label className="form-label">NOMBRE</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="form-input"
                required
                placeholder="Ingrese el nombre del rol"
              />
            </div>

            <div className="form-group">
              <label className="form-label">ESTADO</label>
              <div className="status-options">
                <label className="status-option">
                  <input 
                    type="radio" 
                    name="estado" 
                    value="activo" 
                    checked={formData.estado === true}
                    onChange={() => setFormData({ ...formData, estado: true })}
                    className="status-radio"
                  />
                  <span className="status-indicator active"></span>
                  Activo
                </label>
                <label className="status-option">
                  <input 
                    type="radio" 
                    name="estado" 
                    value="inactivo" 
                    checked={formData.estado === false}
                    onChange={() => setFormData({ ...formData, estado: false })}
                    className="status-radio"
                  />
                  <span className="status-indicator inactive"></span>
                  Inactivo
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Renderizar vista de Asociar Permisos
  const renderAsociarPermisos = () => {
    const handleGuardarPermisos = async () => {
      await guardarPermisos();
    };

    if (!selectedRol) {
      return (
        <div className="roles-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando información del rol...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="roles-content">
        <div className="roles-section">
          <div className="roles-header">
            <div className="configuracion-actions">
              <button className="btn-volver" onClick={() => setVistaActual('buscar')}>
                <FiArrowLeft className="btn-icon" />
                Volver
              </button>
              <button className="btn-guardar-permisos" onClick={handleGuardarPermisos}>
                <FiCheck className="btn-icon" />
                Guardar Permisos
              </button>
            </div>
            <div className="section-header">
              <h3>ASOCIAR PERMISOS</h3>
            </div>
          </div>

          <div className="permisos-container">
            <div className="permisos-header-info">
              <h2 className="rol-title">{selectedRol?.nombre}</h2>
              <div className="permisos-stats">
                <span>
                  {Object.values(permisosSeleccionados).filter(Boolean).length} permisos seleccionados
                </span>
              </div>
            </div>
            
            <div className="permisos-layout">
              {Object.entries(permisosPorModulo).map(([modulo, permisosModulo]) => (
                <div key={modulo} className="modulo-section">
                  <h3 className="modulo-title">{modulo}</h3>
                  <div className="permisos-table">
                    <div className="permisos-table-header">
                      <div className="permiso-col permiso-col-nombre">PERMISO</div>
                      <div className="permiso-col permiso-col-estado">ESTADO</div>
                    </div>
                    <div className="permisos-table-body">
                      {permisosModulo.map(permiso => (
                        <div key={permiso._id} className="permiso-table-row">
                          <div className="permiso-col permiso-col-nombre">
                            <span className="permiso-name">{permiso.nombre}</span>
                          </div>
                          <div className="permiso-col permiso-col-estado">
                            <div className="permiso-switch-container">
                              <label className="permiso-switch">
                                <input
                                  type="checkbox"
                                  checked={!!permisosSeleccionados[permiso._id]}
                                  onChange={() => setPermisosSeleccionados(prev => ({
                                    ...prev,
                                    [permiso._id]: !prev[permiso._id]
                                  }))}
                                />
                                <span className="permiso-slider"></span>
                              </label>
                              <span className={`permiso-status-text ${permisosSeleccionados[permiso._id] ? 'active' : 'inactive'}`}>
                                {permisosSeleccionados[permiso._id] ? 'Asignado' : 'No asignado'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {vistaActual === 'buscar' && renderBuscarRol()}
      {vistaActual === 'crear' && renderCrearRol()}
      {vistaActual === 'permisos' && renderAsociarPermisos()}
    </>
  );
};

export default Roles;

