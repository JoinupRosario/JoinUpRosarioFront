import React, { useState, useEffect, useCallback } from 'react';
import {
  FiPlus,
  FiEdit,
  FiKey,
  FiCheck,
  FiX,
  FiSearch,
  FiArrowLeft,
  FiUsers,
  FiBook
} from 'react-icons/fi';
import { HiOutlineKey } from 'react-icons/hi';
import Swal from 'sweetalert2';
import '../styles/Roles.css';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const Roles = ({ onVolver }) => {
  const { refreshPermissions, hasPermission } = useAuth();
  const canCrearRol = hasPermission('AMRO') || hasPermission('CRO');
  const canEditarRol = hasPermission('AMRO') || hasPermission('EDRO');
  const canCambiarEstadoRol = hasPermission('AMRO') || hasPermission('CEDRO');
  const [vistaActual, setVistaActual] = useState('buscar');
  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRol, setSelectedRol] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [filterEstado, setFilterEstado] = useState('activos');
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 0 });

  const [formData, setFormData] = useState({
    nombre: '',
    estado: true
  });

  const [permisosSeleccionados, setPermisosSeleccionados] = useState({});
  /** Modal crear/editar rol (solo nombre y estado) */
  const [rolModalOpen, setRolModalOpen] = useState(false);

  const closeModalRol = useCallback(() => {
    setRolModalOpen(false);
    setSelectedRol(null);
    setFormData({ nombre: '', estado: true });
  }, []);

  const openModalCrearRol = () => {
    setSelectedRol(null);
    setFormData({ nombre: '', estado: true });
    setRolModalOpen(true);
  };

  const openModalEditarRol = (rol) => {
    setSelectedRol(rol);
    setFormData({ nombre: rol.nombre, estado: rol.estado });
    setRolModalOpen(true);
  };

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

  // Debounce búsqueda (backend)
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Cargar roles con búsqueda y paginación por backend
  const cargarRoles = async (opts = {}) => {
    try {
      setLoading(true);
      const page = opts.page ?? pagination.page;
      const limit = opts.limit ?? pagination.limit;
      const params = {
        page,
        limit,
        search: (opts.search ?? searchDebounced) || undefined,
        estado: filterEstado === 'todos' ? undefined : filterEstado === 'activos' ? 'activos' : 'inactivos'
      };
      const response = await api.get('/roles', { params });
      if (response.data.success) {
        setRoles(response.data.data);
        setPagination({
          page: response.data.page ?? page,
          limit: response.data.limit ?? limit,
          total: response.data.total ?? 0,
          pages: response.data.pages ?? 1
        });
      }
    } catch (error) {
      console.error('Error al cargar roles:', error);
      showError('Error', 'No se pudieron cargar los roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPermisos();
  }, []);

  useEffect(() => {
    cargarRoles({ page: 1 });
  }, [searchDebounced, filterEstado]);

  useEffect(() => {
    if (!rolModalOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeModalRol();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rolModalOpen, closeModalRol]);

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

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    cargarRoles({ page: newPage });
  };

  const handleLimitChange = (newLimit) => {
    cargarRoles({ page: 1, limit: Number(newLimit) });
  };

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
          closeModalRol();
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
          closeModalRol();
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
        // Refrescar permisos del usuario en la app para que menú y rutas reflejen los cambios de inmediato
        await refreshPermissions();
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
        await showSuccess('Éxito', nuevoEstado ? 'Rol activado correctamente.' : 'Rol desactivado correctamente.');
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
      <div className="roles-page-shell">
        <div className="roles-panel">
          <div className="roles-page-header">
            <div className="roles-page-header-top">
              <div className="roles-page-header-actions">
                <button type="button" className="btn-volver" onClick={onVolver}>
                  <FiArrowLeft className="btn-icon" />
                  Volver
                </button>
                {canCrearRol && (
                  <button type="button" className="btn-guardar" onClick={openModalCrearRol}>
                    <FiPlus className="btn-icon" />
                    Crear Rol
                  </button>
                )}
              </div>
              <div className="roles-page-heading">
                <h2 className="roles-page-title">Gestión de Roles</h2>
                <p className="roles-page-subtitle">Busque, filtre y administre roles del sistema</p>
              </div>
            </div>
            <div className="roles-filters" role="search">
              <div
                className="roles-estado-tabs"
                role="tablist"
                aria-label="Filtrar roles por estado"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterEstado === 'activos'}
                  className={`roles-estado-tab${filterEstado === 'activos' ? ' roles-estado-tab--active' : ''}`}
                  onClick={() => setFilterEstado('activos')}
                >
                  Activos
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterEstado === 'inactivos'}
                  className={`roles-estado-tab${filterEstado === 'inactivos' ? ' roles-estado-tab--active' : ''}`}
                  onClick={() => setFilterEstado('inactivos')}
                >
                  Inactivos
                </button>
              </div>
              <div className="search-box">
                <FiSearch className="search-icon" aria-hidden />
                <input
                  type="search"
                  placeholder="Buscar por nombre de rol…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                  autoComplete="off"
                  aria-label="Buscar por nombre de rol"
                />
              </div>
            </div>
          </div>

        <div className="roles-list">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Cargando roles...</p>
            </div>
          ) : roles.length === 0 ? (
            <div className="empty-state">
              <HiOutlineKey className="empty-icon" />
              <h3>No se encontraron roles</h3>
              <p>{pagination.total === 0 ? 'No hay roles creados todavía.' : 'Intenta con otros términos de búsqueda o filtros.'}</p>
            </div>
          ) : (
            <div className="roles-table-wrap">
              <table className="roles-table">
                <thead>
                  <tr>
                    <th scope="col" className="roles-table__th roles-table__th--name">
                      Rol
                    </th>
                    <th scope="col" className="roles-table__th roles-table__th--estado">
                      Estado
                    </th>
                    <th scope="col" className="roles-table__th roles-table__th--acciones">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((rol) => (
                    <tr key={rol._id} className="roles-table__row">
                      <td className="roles-table__td roles-table__td--name">
                        <span className="roles-table__name" title={rol.nombre}>
                          {rol.nombre}
                        </span>
                      </td>
                      <td className="roles-table__td roles-table__td--estado">
                        <span className={`role-status role-status--table ${rol.estado ? 'active' : 'inactive'}`}>
                          {rol.estado ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="roles-table__td roles-table__td--acciones">
                        <div className="roles-table__actions">
                          {canEditarRol && (
                            <button
                              type="button"
                              className="roles-table__btn roles-table__btn--primary"
                              onClick={() => abrirGestionPermisos(rol)}
                              title="Asociar permisos"
                            >
                              <FiKey className="roles-table__btn-icon" aria-hidden />
                              Permisos
                            </button>
                          )}
                          <button
                            type="button"
                            className="roles-table__btn roles-table__btn--ghost"
                            onClick={() => showFuncionalidadEnDesarrollo('Asociar Usuarios')}
                            title="Asociar usuarios"
                          >
                            <FiUsers className="roles-table__btn-icon" aria-hidden />
                            Usuarios
                          </button>
                          <button
                            type="button"
                            className="roles-table__btn roles-table__btn--ghost"
                            onClick={() => showFuncionalidadEnDesarrollo('Reglas para Oportunidad')}
                            title="Reglas para oportunidad"
                          >
                            <FiBook className="roles-table__btn-icon" aria-hidden />
                            Reglas
                          </button>
                          {canEditarRol && (
                            <button
                              type="button"
                              className="roles-table__btn roles-table__btn--ghost"
                              onClick={() => openModalEditarRol(rol)}
                              title="Editar nombre y estado del rol"
                            >
                              <FiEdit className="roles-table__btn-icon" aria-hidden />
                              Editar
                            </button>
                          )}
                          {canCambiarEstadoRol && (
                            <div
                              className="roles-table__switch-cell"
                              title={rol.estado ? 'Rol activo — pulse para desactivar' : 'Rol inactivo — pulse para activar'}
                            >
                              <span className="roles-table__switch-label">{rol.estado ? 'Activo' : 'Inactivo'}</span>
                              <button
                                type="button"
                                className={`toggle-switch toggle-switch--table ${rol.estado ? 'toggle-switch--on' : ''}`}
                                onClick={() => toggleEstadoRol(rol._id, !rol.estado)}
                                aria-pressed={rol.estado}
                                aria-label={rol.estado ? 'Desactivar rol' : 'Activar rol'}
                              >
                                <span className="toggle-thumb" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && pagination.pages > 0 && (
          <div className="roles-pagination">
            <div className="roles-pagination-left">
              <span>Mostrar:</span>
              <select
                value={pagination.limit}
                onChange={(e) => handleLimitChange(e.target.value)}
                className="roles-pagination-select"
              >
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
              <span className="roles-pagination-info">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
              </span>
            </div>
            <div className="roles-pagination-right">
              <button
                type="button"
                className="roles-pagination-btn"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                Anterior
              </button>
              <span className="roles-pagination-pages">
                Página {pagination.page} de {pagination.pages}
              </span>
              <button
                type="button"
                className="roles-pagination-btn"
                disabled={pagination.page >= pagination.pages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );

  const renderModalRol = () => (
    <div
      className="roles-modal-backdrop"
      role="presentation"
      onClick={closeModalRol}
    >
      <div
        className="roles-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="roles-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="roles-modal__header">
          <h3 id="roles-modal-title" className="roles-modal__title">
            {selectedRol ? 'Editar rol' : 'Nuevo rol'}
          </h3>
          <button type="button" className="roles-modal__close" onClick={closeModalRol} aria-label="Cerrar">
            <FiX size={22} />
          </button>
        </div>
        <p className="roles-modal__hint">
          {selectedRol ? 'Modifique el nombre y el estado del rol.' : 'Defina el nombre y el estado del nuevo rol.'}
        </p>
        <form className="roles-modal__form" onSubmit={handleCrearRol}>
          <div className="form-group">
            <label className="form-label" htmlFor="roles-modal-nombre">
              Nombre del rol
            </label>
            <input
              id="roles-modal-nombre"
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="form-input"
              required
              placeholder="Ej: Coordinador de prácticas"
              autoComplete="off"
              autoFocus
            />
          </div>
          <div className="form-group">
            <span className="form-label">Estado</span>
            <div className="toggle-row">
              <span className={`toggle-label ${!formData.estado ? 'toggle-label--off' : ''}`}>
                {formData.estado ? 'Activo' : 'Inactivo'}
              </span>
              <button
                type="button"
                className={`toggle-switch ${formData.estado ? 'toggle-switch--on' : ''}`}
                onClick={() => setFormData({ ...formData, estado: !formData.estado })}
                aria-label="Cambiar estado del rol"
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          </div>
          <div className="roles-modal__footer">
            <button type="button" className="roles-modal__btn roles-modal__btn--ghost" onClick={closeModalRol}>
              Cancelar
            </button>
            {(selectedRol ? canEditarRol : canCrearRol) && (
              <button type="submit" className="roles-modal__btn roles-modal__btn--primary">
                <FiCheck className="btn-icon" aria-hidden />
                {selectedRol ? 'Guardar' : 'Crear rol'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  const [moduloActivo, setModuloActivo] = useState(null);

  // Renderizar vista de Asociar Permisos (Actualizada según el diseño)
  const renderAsociarPermisos = () => {
    const modulos = Object.keys(permisosPorModulo).sort((a, b) => {
      if (a === 'DASHBOARD') return -1;
      if (b === 'DASHBOARD') return 1;
      return (a || '').localeCompare(b || '');
    });
    const tabActivo = moduloActivo || modulos[0];
    const permisosDelTab = permisosPorModulo[tabActivo] || [];
    const totalSeleccionados = Object.values(permisosSeleccionados).filter(Boolean).length;

    return (
      <div className="roles-content">
        <div className="roles-section">
          {/* Header */}
          <div className="roles-page-header-top" style={{ marginBottom: 16 }}>
            <div className="roles-page-header-actions">
              <button className="btn-volver" onClick={() => setVistaActual('buscar')}>
                <FiArrowLeft className="btn-icon" /> Volver
              </button>
              {canEditarRol && (
                <button className="btn-guardar" onClick={guardarPermisos}>
                  <FiCheck className="btn-icon" /> Guardar Permisos
                </button>
              )}
            </div>
            <h2 className="roles-page-title">{selectedRol?.nombre}</h2>
          </div>

          {/* Stats + acción global */}
          <div className="permisos-topbar">
            <span className="permisos-stats-label">
              {totalSeleccionados} permisos seleccionados
            </span>
            {totalSeleccionados === permisos.length ? (
              <button className="btn-deseleccionar-modulo" onClick={deseleccionarTodosPermisos}>
                <FiX className="btn-icon" /> Deseleccionar todos
              </button>
            ) : (
              <button className="btn-seleccionar-modulo" onClick={seleccionarTodosPermisos}>
                <FiCheck className="btn-icon" /> Seleccionar todos
              </button>
            )}
          </div>

          {/* Pestañas de módulos */}
          <div className="permisos-tabs-wrapper">
            <div className="permisos-tabs">
              {modulos.map(mod => {
                const seleccionadosEnMod = (permisosPorModulo[mod] || []).filter(p => permisosSeleccionados[p._id]).length;
                const totalMod = (permisosPorModulo[mod] || []).length;
                return (
                  <button
                    key={mod}
                    className={`permisos-tab ${tabActivo === mod ? 'permisos-tab--active' : ''}`}
                    onClick={() => setModuloActivo(mod)}
                  >
                    {mod}
                    <span className={`permisos-tab-badge ${seleccionadosEnMod === totalMod ? 'badge--full' : seleccionadosEnMod > 0 ? 'badge--partial' : ''}`}>
                      {seleccionadosEnMod}/{totalMod}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Contenido del tab activo */}
            <div className="permisos-tab-content">
              <div className="permisos-tab-content-header">
                <label className="header-checkbox-label">
                  <input
                    type="checkbox"
                    className="header-checkbox"
                    checked={todosSeleccionadosModulo(tabActivo)}
                    onChange={() => todosSeleccionadosModulo(tabActivo)
                      ? deseleccionarTodosModulo(tabActivo)
                      : seleccionarTodosModulo(tabActivo)
                    }
                  />
                  Seleccionar todos en este módulo
                </label>
              </div>
              <div className="permisos-tab-list">
                {permisosDelTab.map(permiso => (
                  <label key={permiso._id} className="permiso-tab-row">
                    <input
                      type="checkbox"
                      className="permiso-checkbox"
                      checked={!!permisosSeleccionados[permiso._id]}
                      onChange={() => setPermisosSeleccionados(prev => ({
                        ...prev,
                        [permiso._id]: !prev[permiso._id]
                      }))}
                    />
                    <span className="permiso-name">{permiso.nombre}</span>
                    <span className={`permiso-status ${permisosSeleccionados[permiso._id] ? 'active' : 'inactive'}`}>
                      {permisosSeleccionados[permiso._id] ? 'Activo' : 'Inactivo'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {vistaActual === 'buscar' && renderBuscarRol()}
      {vistaActual === 'permisos' && renderAsociarPermisos()}
      {rolModalOpen && renderModalRol()}
    </>
  );
};

export default Roles;