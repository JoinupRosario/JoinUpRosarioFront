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

  // Guardar permisos del rol
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

      const permisosIds = Object.keys(permisosSeleccionados).filter(
        permisoId => permisosSeleccionados[permisoId]
      );

      const response = await api.put(`/roles/${selectedRol._id}/permisos`, {
        permisos: permisosIds
      });

      if (response.data.success) {
        await showSuccess('Éxito', 'Permisos actualizados correctamente');
        setVistaActual('buscar');
        setSelectedRol(null);
        setPermisosSeleccionados({});
        cargarRoles();
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
  const seleccionarTodosModulo = (modulo) => {
    const permisosModulo = permisosPorModulo[modulo];
    const nuevosPermisos = { ...permisosSeleccionados };

    permisosModulo.forEach(permiso => {
      nuevosPermisos[permiso._id] = true;
    });

    setPermisosSeleccionados(nuevosPermisos);
  };

  // Función para deseleccionar todos los permisos de un módulo
  const deseleccionarTodosModulo = (modulo) => {
    const permisosModulo = permisosPorModulo[modulo];
    const nuevosPermisos = { ...permisosSeleccionados };

    permisosModulo.forEach(permiso => {
      nuevosPermisos[permiso._id] = false;
    });

    setPermisosSeleccionados(nuevosPermisos);
  };

  // Función para seleccionar todos los permisos de todos los módulos
  const seleccionarTodosPermisos = () => {
    const nuevosPermisos = {};
    permisos.forEach(permiso => {
      nuevosPermisos[permiso._id] = true;
    });
    setPermisosSeleccionados(nuevosPermisos);
  };

  // Función para deseleccionar todos los permisos
  const deseleccionarTodosPermisos = () => {
    setPermisosSeleccionados({});
  };

  // Verificar si todos los permisos de un módulo están seleccionados
  const todosSeleccionadosModulo = (modulo) => {
    const permisosModulo = permisosPorModulo[modulo];
    return permisosModulo.every(permiso => permisosSeleccionados[permiso._id]);
  };

  // Verificar si algunos permisos de un módulo están seleccionados
  const algunosSeleccionadosModulo = (modulo) => {
    const permisosModulo = permisosPorModulo[modulo];
    return permisosModulo.some(permiso => permisosSeleccionados[permiso._id]);
  };

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

        {/* Lista de Roles */}
        <div className="roles-list">
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
            rolesFiltrados.map(rol => (
              <div key={rol._id} className="role-item">
                <div className="role-info">
                  <span className="role-name">{rol.nombre}</span>
                  <span className={`role-status ${rol.estado ? 'active' : 'inactive'}`}>
                    {rol.estado ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="role-actions">
                  <button
                    className="btn-action btn-permisos"
                    onClick={() => abrirGestionPermisos(rol)}
                    title="Asociar permisos"
                  >
                    <FiKey className="btn-icon" />
                    Asociar Permisos
                  </button>

                  <button
                    className="btn-action btn-outline"
                    onClick={() => showFuncionalidadEnDesarrollo('Asociar Usuarios')}
                    title="Asociar usuarios"
                  >
                    <FiUsers className="btn-icon" />
                    Asociar Usuarios
                  </button>

                  <button
                    className="btn-action btn-outline"
                    onClick={() => showFuncionalidadEnDesarrollo('Reglas para Oportunidad')}
                    title="Reglas para oportunidad"
                  >
                    <FiBook className="btn-icon" />
                    Reglas Oportunidad
                  </button>

                  <button
                    className="btn-action btn-outline"
                    onClick={() => {
                      setFormData({
                        nombre: rol.nombre,
                        estado: rol.estado
                      });
                      setSelectedRol(rol);
                      setVistaActual('crear');
                    }}
                    title="Editar rol"
                  >
                    <FiEdit className="btn-icon" />
                    Editar
                  </button>

                  <button
                    className={`btn-action ${rol.estado ? 'btn-warning' : 'btn-success'}`}
                    onClick={() => toggleEstadoRol(rol._id, !rol.estado)}
                    title={rol.estado ? 'Desactivar rol' : 'Activar rol'}
                  >
                    {rol.estado ? <FiX className="btn-icon" /> : <FiCheck className="btn-icon" />}
                    {rol.estado ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            ))
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

  // Renderizar vista de Asociar Permisos (Actualizada según el diseño)
  const renderAsociarPermisos = () => (
    <div className="roles-content">
      <div className="roles-section">
        <div className="roles-header">
          <div className="configuracion-actions">
            <button className="btn-volver" onClick={() => setVistaActual('buscar')}>
              <FiArrowLeft className="btn-icon" />
              Volver
            </button>
            <button className="btn-guardar" onClick={guardarPermisos}>
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
          {/* Botón de selección global */}
          <div className="permisos-global-actions">
            {Object.values(permisosSeleccionados).filter(Boolean).length === permisos.length ? (
              <button
                className="btn-deseleccionar-modulo"
                onClick={deseleccionarTodosPermisos}
              >
                <FiX className="btn-icon" />
                Deseleccionar Todos
              </button>
            ) : (
              <button
                className="btn-seleccionar-modulo"
                onClick={seleccionarTodosPermisos}
              >
                <FiCheck className="btn-icon" />
                Seleccionar Todos
              </button>
            )}
          </div>
          {/* Diseño similar a la imagen */}
          <div className="permisos-layout">
            {Object.entries(permisosPorModulo).map(([modulo, permisosModulo]) => (
              <div key={modulo} className="modulo-section">
                <div className="modulo-header">
                  <h3 className="modulo-title">{modulo}</h3>
                </div>
                <div className="permisos-table">
                  <div className="permisos-table-header">
                    <div className="permiso-col permiso-col-nombre">
                      <label className="header-checkbox-label">
                        <input
                          type="checkbox"
                          checked={todosSeleccionadosModulo(modulo)}
                          onChange={() => {
                            if (todosSeleccionadosModulo(modulo)) {
                              deseleccionarTodosModulo(modulo);
                            } else {
                              seleccionarTodosModulo(modulo);
                            }
                          }}
                          className="header-checkbox"
                        />
                        PERMISO
                      </label>
                    </div>
                    <div className="permiso-col permiso-col-estado">ESTADO</div>
                  </div>
                  <div className="permisos-table-body">
                    {permisosModulo.map(permiso => (
                      <div key={permiso._id} className="permiso-table-row">
                        <div className="permiso-col permiso-col-nombre">
                          <label className="permiso-checkbox-label">
                            <input
                              type="checkbox"
                              checked={!!permisosSeleccionados[permiso._id]}
                              onChange={() => setPermisosSeleccionados(prev => ({
                                ...prev,
                                [permiso._id]: !prev[permiso._id]
                              }))}
                              className="permiso-checkbox"
                            />
                            <span className="permiso-name">{permiso.nombre}</span>
                          </label>
                        </div>
                        <div className="permiso-col permiso-col-estado">
                          <span className={`permiso-status ${permisosSeleccionados[permiso._id] ? 'active' : 'inactive'}`}>
                            {permisosSeleccionados[permiso._id] ? 'Activo' : 'Inactivo'}
                          </span>
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

  return (
    <>
      {vistaActual === 'buscar' && renderBuscarRol()}
      {vistaActual === 'crear' && renderCrearRol()}
      {vistaActual === 'permisos' && renderAsociarPermisos()}
    </>
  );
};

export default Roles;