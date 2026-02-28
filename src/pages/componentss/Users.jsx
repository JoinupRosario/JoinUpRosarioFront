import React, { useState, useEffect, useRef } from 'react';
import {
  FiPlus,
  FiEdit,
  FiSearch,
  FiFilter,
  FiArrowLeft,
  FiUser,
  FiUserCheck,
  FiKey,
  FiCheck,
  FiX,
  FiRefreshCw
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../styles/Users.css';

const Users = ({ onVolver }) => {
  const [vistaActual, setVistaActual] = useState('buscar');
  const [usersAdministrativos, setUsersAdministrativos] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [tiposIdentificacion, setTiposIdentificacion] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, pages: 1 });
  const PAGE_SIZE = 15;
  const searchTimeoutRef = useRef(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [rolesSeleccionados, setRolesSeleccionados] = useState({});
  const [programasSeleccionados, setProgramasSeleccionados] = useState({});
  const [programSearchTerm, setProgramSearchTerm] = useState('');
  const [programSearchQuery, setProgramSearchQuery] = useState('');
  const programSearchTimeoutRef = useRef(null);
  const [programCurrentPage, setProgramCurrentPage] = useState(1);
  const PROGRAMAS_PAGE_SIZE = 15;
  const [programs, setPrograms] = useState([]);
  const [programPagination, setProgramPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [asociarTodosActivos, setAsociarTodosActivos] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [sedeSeleccionada, setSedeSeleccionada] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    tipoIdentificacion: '',
    identificacion: '',
    nombres: '',
    apellidos: '',
    phone: '',
    email: '',
    directorioActivo: true,
    password: '',
    confirmPassword: '',
    estado: true
  });

  // Configuración de alertas
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

  const showConfirmation = (title, text, confirmButtonText = 'Sí, continuar') => {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      cancelButtonColor: '#6c757d',
      confirmButtonText,
      cancelButtonText: 'Cancelar'
    });
  };

  // Mostrar funcionalidad en desarrollo
  const showFuncionalidadEnDesarrollo = (funcionalidad) => {
    showAlert('info',
      'Funcionalidad en Desarrollo',
      `La funcionalidad "${funcionalidad}" está actualmente en desarrollo y estará disponible próximamente.`
    );
  };

  useEffect(() => {
    if (selectedUser && selectedUser.roles && selectedUser.roles.length > 0) {
      const rolesIniciales = {};
      selectedUser.roles.forEach(rolUser => {
        if (rolUser.estado && rolUser.rol) {
          rolesIniciales[rolUser.rol._id || rolUser.rol] = true;
        }
      });
      setRolesSeleccionados(rolesIniciales);
    } else {
      setRolesSeleccionados({});
    }
    
    // Cargar sede seleccionada del usuario
    if (selectedUser && selectedUser.sucursal) {
      setSedeSeleccionada(selectedUser.sucursal._id || selectedUser.sucursal);
    } else {
      setSedeSeleccionada(null);
    }
  }, [selectedUser]);

  // Debounce del buscador → actualiza searchQuery y resetea a página 1
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(searchTerm.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchTerm]);

  // Re-fetch cuando cambian página, query o filtro de estado
  useEffect(() => {
    if (vistaActual !== 'buscar') return;
    cargarUsersAdministrativos(currentPage, searchQuery, filtroEstado);
  }, [vistaActual, currentPage, searchQuery, filtroEstado]);

  // Cargar datos iniciales
  useEffect(() => {
    cargarRoles();
    cargarSucursales();
    cargarTiposIdentificacion();
  }, []);

  const cargarTiposIdentificacion = async () => {
    try {
      const { data } = await api.get('/locations/items/L_IDENTIFICATIONTYPE', { params: { limit: 100 } });
      setTiposIdentificacion(data?.data ?? []);
    } catch (err) {
      console.error('Error al cargar tipos de identificación:', err);
    }
  };

  const cargarUsersAdministrativos = async (page = 1, search = '', estado = 'todos') => {
    try {
      setLoading(true);
      const params = { page, limit: PAGE_SIZE };
      if (search)          params.search = search;
      if (estado !== 'todos') params.estado = estado;
      const response = await api.get('/users-administrativos', { params });
      if (response.data.success) {
        setUsersAdministrativos(response.data.data);
        setPagination(response.data.pagination || { total: 0, page, limit: PAGE_SIZE, pages: 1 });
      }
    } catch (error) {
      console.error('Error al cargar usuarios administrativos:', error);
      showError('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const cargarRoles = async () => {
    try {
      const response = await api.get('/roles');
      if (response.data.success) {
        setRoles(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar roles:', error);
      showError('Error', 'No se pudieron cargar los roles');
    }
  };

  const cargarSucursales = async () => {
    try {
      const response = await api.get('/sucursales');
      if (response.data.success) {
        setSucursales(response.data.data || []);
      }
    } catch (error) {
      console.error('Error al cargar sucursales:', error);
      showError('Error', 'No se pudieron cargar las sucursales');
    }
  };

  // Iniciar edición de usuario
  const startEdit = (user) => {
    setEditingUser(user);
    setFormData({
      tipoIdentificacion: user.tipoIdentificacion?._id || user.tipoIdentificacion || '',
      identificacion: user.identificacion || '',
      nombres: user.nombres || '',
      apellidos: user.apellidos || '',
      phone: user.phone || '',
      email: user.user?.email || '',
      directorioActivo: !!user.user?.directorioActivo,
      password: '',
      confirmPassword: '',
      estado: user.estado !== undefined ? user.estado : true
    });
    setVistaActual('crear');
  };

  // Manejar creación/actualización de usuario administrativo
  const handleCrearUserAdministrativo = async (e) => {
    e.preventDefault();

    if (!formData.nombres?.trim() || !formData.apellidos?.trim() ||
      !formData.identificacion?.trim() || !formData.email?.trim()) {
      showError('Error', 'Completa Tipo ID, Identificación, Nombres, Apellidos y Usuario (Directorio Activo).');
      return;
    }

    const esDirectorioActivo = !!formData.directorioActivo;
    if (!esDirectorioActivo) {
      if (!editingUser && (!formData.password?.trim() || formData.password.length < 6)) {
        showError('Error', 'Cuando Directorio Activo está desactivado, la contraseña es obligatoria y debe tener al menos 6 caracteres.');
        return;
      }
      if (formData.password && formData.password !== formData.confirmPassword) {
        showError('Error', 'Las contraseñas no coinciden.');
        return;
      }
      if (formData.password && formData.password.length < 6) {
        showError('Error', 'La contraseña debe tener al menos 6 caracteres.');
        return;
      }
    }

    try {
      const dataToSend = {
        tipoIdentificacion: formData.tipoIdentificacion || undefined,
        identificacion: formData.identificacion.trim(),
        nombres: formData.nombres.trim(),
        apellidos: formData.apellidos.trim(),
        phone: formData.phone?.trim() || undefined,
        email: formData.email.trim(),
        directorioActivo: esDirectorioActivo,
        estado: formData.estado
      };
      if (!esDirectorioActivo && formData.password?.trim()) {
        dataToSend.password = formData.password;
      }

      let response;
      if (editingUser) {
        response = await api.put(`/users-administrativos/${editingUser._id}`, dataToSend);
        if (response.data.success) {
          await showSuccess('Éxito', 'Usuario administrativo actualizado correctamente');
        }
      } else {
        response = await api.post('/users-administrativos', dataToSend);
        if (response.data.success) {
          await showSuccess('Éxito', 'Usuario administrativo creado correctamente');
        }
      }

      if (response?.data?.success) {
        cargarUsersAdministrativos(currentPage, searchQuery, filtroEstado);
        setVistaActual('buscar');
        setEditingUser(null);
        setFormData({
          tipoIdentificacion: '',
          identificacion: '',
          nombres: '',
          apellidos: '',
          phone: '',
          email: '',
          directorioActivo: true,
          password: '',
          confirmPassword: '',
          estado: true
        });
      }
    } catch (error) {
      console.error(`Error al ${editingUser ? 'actualizar' : 'crear'} usuario administrativo:`, error);
      const errorMessage = error.response?.data?.message || `Error al ${editingUser ? 'actualizar' : 'crear'} el usuario administrativo`;
      showError('Error', errorMessage);
    }
  };

  // Cambiar estado del usuario
  const toggleEstadoUsuario = async (userId, nuevoEstado) => {
    const user = usersAdministrativos.find(u => u._id === userId);
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    const result = await showConfirmation(
      `${nuevoEstado ? 'Activar' : 'Desactivar'} Usuario`,
      `¿Estás seguro de que deseas ${accion} al usuario "${user?.nombres} ${user?.apellidos}"?`,
      `Sí, ${accion}`
    );

    if (!result.isConfirmed) {
      return;
    }

    try {
      const response = await api.patch(`/users-administrativos/${userId}/estado`, {
        estado: nuevoEstado
      });

      if (response.data.success) {
        const mensaje = nuevoEstado ? 'Usuario activado correctamente' : 'Usuario desactivado correctamente';
        await showSuccess('Éxito', mensaje);
        cargarUsersAdministrativos(currentPage, searchQuery, filtroEstado);
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      const mensajeError = nuevoEstado ? 'Error al activar el usuario' : 'Error al desactivar el usuario';
      showError('Error', mensajeError);
    }
  };
  const seleccionarUsuario = (userId) => {
    setSelectedUserId(selectedUserId === userId ? null : userId);
  };
  // Abrir gestión de roles
  const abrirGestionRoles = (user) => {
    setSelectedUser(user);
    setVistaActual('roles');
  };
  const abrirGestionProgramas = (user) => {
    setSelectedUser(user);
    setVistaActual('programas');
    setProgramSearchTerm('');
    setProgramSearchQuery('');
    setProgramCurrentPage(1);
    setAsociarTodosActivos(false);
    if (user?.programas?.length) {
      const initial = {};
      user.programas.forEach(p => {
        const id = p.program?._id || p.program;
        if (id) initial[id] = true;
      });
      setProgramasSeleccionados(initial);
    } else {
      setProgramasSeleccionados({});
    }
  };

  // Búsqueda de programas con debounce (envía query al backend)
  useEffect(() => {
    if (vistaActual !== 'programas') return;
    if (programSearchTimeoutRef.current) clearTimeout(programSearchTimeoutRef.current);
    const t = setTimeout(() => {
      setProgramSearchQuery(programSearchTerm.trim());
      setProgramCurrentPage(1);
    }, 400);
    programSearchTimeoutRef.current = t;
    return () => { clearTimeout(t); };
  }, [vistaActual, programSearchTerm]);

  // Cargar página de programas desde el backend
  const fetchProgramsPage = async (page, search) => {
    if (!selectedUser) return;
    setLoadingPrograms(true);
    try {
      const { data } = await api.get('/programs', {
        params: {
          page: page || 1,
          limit: PROGRAMAS_PAGE_SIZE,
          search: (search || '').trim() || undefined,
          status: 'ACTIVE'
        }
      });
      setPrograms(data?.data ?? []);
      setProgramPagination(data?.pagination ?? { page: 1, limit: PROGRAMAS_PAGE_SIZE, total: 0, pages: 1 });
    } catch (err) {
      console.error('Error al cargar programas:', err);
      showError('Error', 'No se pudieron cargar los programas');
      setPrograms([]);
      setProgramPagination({ page: 1, limit: PROGRAMAS_PAGE_SIZE, total: 0, pages: 1 });
    } finally {
      setLoadingPrograms(false);
    }
  };

  useEffect(() => {
    if (vistaActual !== 'programas' || !selectedUser) return;
    fetchProgramsPage(programCurrentPage, programSearchQuery);
  }, [vistaActual, selectedUser?._id, programCurrentPage, programSearchQuery]);

  // Abrir gestión de sedes
  const abrirGestionSedes = (user) => {
    setSelectedUser(user);
    setVistaActual('sedes');
  };
  // Guardar sede del usuario
  const guardarSede = async () => {
    try {
      const result = await showConfirmation(
        'Guardar Sede',
        `¿Estás seguro de que deseas guardar la sede para el usuario "${selectedUser?.nombres} ${selectedUser?.apellidos}"?`
      );

      if (!result.isConfirmed) {
        return;
      }

      await api.put(`/users-administrativos/${selectedUser._id}/sede`, {
        sucursalId: sedeSeleccionada || null
      });

      await showSuccess('Éxito', 'Sede actualizada correctamente');
      setVistaActual('buscar');
      setSelectedUser(null);
      cargarUsersAdministrativos(currentPage, searchQuery, filtroEstado);

    } catch (error) {
      console.error('Error al guardar sede:', error);
      showError('Error', 'Error al guardar la sede');
    }
  };

  // Guardar programas del usuario
  const guardarProgramas = async () => {
    try {
      const msg = asociarTodosActivos
        ? `¿Asociar TODOS los programas con estado ACTIVE a "${selectedUser?.nombres} ${selectedUser?.apellidos}"?`
        : `¿Guardar los programas asignados para "${selectedUser?.nombres} ${selectedUser?.apellidos}"?`;
      const result = await showConfirmation('Guardar Programas', msg);
      if (!result.isConfirmed) return;

      const body = asociarTodosActivos
        ? { asociarTodosActivos: true }
        : { programIds: Object.keys(programasSeleccionados).filter(id => programasSeleccionados[id]) };
      await api.put(`/users-administrativos/${selectedUser._id}/programas`, body);

      await showSuccess('Éxito', 'Programas actualizados correctamente');
      setVistaActual('buscar');
      setSelectedUser(null);
      setAsociarTodosActivos(false);
      cargarUsersAdministrativos(currentPage, searchQuery, filtroEstado);
    } catch (error) {
      console.error('Error al guardar programas:', error);
      showError('Error', 'Error al guardar los programas');
    }
  };

  // Guardar roles del usuario
  const guardarRoles = async (rolesSeleccionados) => {
    try {
      // Mostrar confirmación
      const result = await showConfirmation(
        'Guardar Roles',
        `¿Estás seguro de que deseas guardar los roles para el usuario "${selectedUser?.nombres} ${selectedUser?.apellidos}"?`
      );

      if (!result.isConfirmed) {
        return;
      }

      // Primero, limpiar todos los roles existentes
      if (selectedUser.roles && selectedUser.roles.length > 0) {
        for (const rolUser of selectedUser.roles) {
          await api.delete(`/users-administrativos/${selectedUser._id}/roles`, {
            data: { rolId: rolUser.rol._id || rolUser.rol }
          });
        }
      }

      // Luego, agregar los roles seleccionados
      for (const rolId of Object.keys(rolesSeleccionados)) {
        if (rolesSeleccionados[rolId]) {
          await api.post(`/users-administrativos/${selectedUser._id}/roles`, {
            rolId: rolId
          });
        }
      }

      await showSuccess('Éxito', 'Roles actualizados correctamente');
      setVistaActual('buscar');
      setSelectedUser(null);
      cargarUsersAdministrativos(currentPage, searchQuery, filtroEstado);

    } catch (error) {
      console.error('Error al guardar roles:', error);
      showError('Error', 'Error al guardar los roles');
    }
  };

  // Renderizar vista de Búsqueda
  const renderBuscarUsuario = () => (
    <div className="users-content">
      <div className="users-section">
        <div className="users-header">
          <div className="configuracion-actions">
            <button className="btn-volver" onClick={onVolver}>
              <FiArrowLeft className="btn-icon" />
              Volver
            </button>
            <button
              className="btn-volver"
              onClick={() => cargarUsersAdministrativos(currentPage, searchQuery, filtroEstado)}
              title="Actualizar lista"
              disabled={loading}
            >
              <FiRefreshCw className="btn-icon" />
              Refrescar
            </button>
            <button
              className="btn-guardar"
              onClick={() => {
        setFormData({
          tipoIdentificacion: '',
          identificacion: '',
          nombres: '',
          apellidos: '',
          phone: '',
          email: '',
          directorioActivo: true,
          password: '',
          confirmPassword: '',
          estado: true
        });
        setSelectedUser(null);
        setEditingUser(null);
        setVistaActual('crear');
              }}
            >
              <FiPlus className="btn-icon" />
              Registrar Usuario
            </button>
          </div>
          <div className="section-header">
            <h3>BUSCAR USUARIO</h3>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="users-filters">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por nombres, apellidos, identificación o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <select
            className="users-filter-select"
            value={filtroEstado}
            onChange={(e) => { setFiltroEstado(e.target.value); setCurrentPage(1); }}
          >
            <option value="todos">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>

        {/* Barra de opciones de asociación - Solo visible cuando hay un usuario seleccionado */}
        {selectedUserId && (
          <div className="association-bar">
            <div className="association-info">
              <span className="selected-user-info">
                Usuario seleccionado: <strong>{usersAdministrativos.find(u => u._id === selectedUserId)?.nombres} {usersAdministrativos.find(u => u._id === selectedUserId)?.apellidos}</strong>
              </span>
            </div>
            <div className="association-actions">
              <button
                className="btn-association btn-roles"
                onClick={() => abrirGestionRoles(usersAdministrativos.find(u => u._id === selectedUserId))}
                title="Asociar roles"
              >
                <FiKey className="btn-icon" />
                Asociar Roles
              </button>
              <button
                className="btn-association btn-programs"
                onClick={() => abrirGestionProgramas(usersAdministrativos.find(u => u._id === selectedUserId))}
                title="Asociar Programas / Opciones Académicas"
              >
                <FiKey className="btn-icon" />
                Asociar Programas
              </button>
              <button
                className="btn-association btn-campus"
                onClick={() => abrirGestionSedes(usersAdministrativos.find(u => u._id === selectedUserId))}
                title="Asociar Sede"
              >
                <FiKey className="btn-icon" />
                Asociar Sedes
              </button>
            </div>
          </div>
        )}

        {/* Tabla de Usuarios */}
        <div className="users-table-container">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Cargando usuarios...</p>
            </div>
          ) : usersAdministrativos.length === 0 ? (
            <div className="empty-state">
              <FiUser className="empty-icon" />
              <h3>No se encontraron usuarios</h3>
              <p>{searchQuery || filtroEstado !== 'todos' ? 'Intenta con otros términos de búsqueda.' : 'No hay usuarios creados todavía.'}</p>
            </div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>NOMBRES</th>
                  <th>APELLIDOS</th>
                  <th>IDENTIFICACIÓN</th>
                  <th>USUARIO</th>
                  <th>ROLES</th>
                  <th>SEDE</th>
                  <th>CELULAR</th>
                  <th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {usersAdministrativos.map((user, idx) => (
                  <tr
                    key={user._id}
                    onClick={() => startEdit(user)}
                    style={{ cursor: 'pointer' }}
                    className="table-row-clickable"
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="user-selection">
                        <input
                          type="checkbox"
                          checked={selectedUserId === user._id}
                          onChange={() => seleccionarUsuario(user._id)}
                          className="user-checkbox"
                        />
                      </div>
                    </td>
                    <td>{user.nombres}</td>
                    <td>{user.apellidos}</td>
                    <td>{user.identificacion}</td>
                    <td>{user.user?.email}</td>
                    <td>
                      <div className="roles-list">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((rolObj, index) => (
                            rolObj.estado && (
                              <span key={index} className="rol-tag">• {rolObj.rol?.nombre}</span>
                            )
                          ))
                        ) : (
                          <span className="no-roles">Sin Rol</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {user.sucursales?.length > 0
                        ? user.sucursales.map((s) => s.nombre).filter(Boolean).join(', ')
                        : (user.sucursal?.nombre || '-')}
                    </td>
                    <td>{user.phone || '-'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="switch-container">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={user.estado}
                            onChange={() => toggleEstadoUsuario(user._id, !user.estado)}
                          />
                          <span className="slider"></span>
                        </label>
                        <span className={`status-text ${user.estado ? 'active' : 'inactive'}`}>
                          {user.estado ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {!loading && pagination.total > 0 && (
          <div className="users-pagination">
            <span className="users-pagination-info">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} de <strong>{pagination.total}</strong> usuarios
            </span>
            <div className="users-pagination-controls">
              <button
                className="users-page-btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1 || loading}
                title="Primera página"
              >«</button>
              <button
                className="users-page-btn"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
              >‹ Anterior</button>

              {/* Números de página */}
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const half = 2;
                let start = Math.max(1, currentPage - half);
                const end = Math.min(pagination.pages, start + 4);
                start = Math.max(1, end - 4);
                return start + i;
              }).filter(n => n >= 1 && n <= pagination.pages).map(n => (
                <button
                  key={n}
                  className={`users-page-btn ${n === currentPage ? 'users-page-btn--active' : ''}`}
                  onClick={() => setCurrentPage(n)}
                  disabled={loading}
                >{n}</button>
              ))}

              <button
                className="users-page-btn"
                onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                disabled={currentPage >= pagination.pages || loading}
              >Siguiente ›</button>
              <button
                className="users-page-btn"
                onClick={() => setCurrentPage(pagination.pages)}
                disabled={currentPage >= pagination.pages || loading}
                title="Última página"
              >»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Renderizar vista de Crear Usuario
  const renderCrearUsuario = () => (
    <div className="users-content">
      <div className="users-section">
        <div className="users-header">
          <div className="configuracion-actions">
            <button className="btn-volver" onClick={() => {
              setVistaActual('buscar');
              setEditingUser(null);
              setFormData({
                tipoIdentificacion: '',
                identificacion: '',
                nombres: '',
                apellidos: '',
                phone: '',
                email: '',
                directorioActivo: true,
                password: '',
                confirmPassword: '',
                estado: true
              });
            }}>
              <FiArrowLeft className="btn-icon" />
              Volver
            </button>
            <button className="btn-guardar" onClick={handleCrearUserAdministrativo}>
              <FiUserCheck className="btn-icon" />
              {editingUser ? 'Actualizar Usuario' : 'Registrar Usuario'}
            </button>
          </div>
          <div className="section-header">
            <h3>{editingUser ? 'EDITAR USUARIO' : 'REGISTRAR USUARIO'}</h3>
          </div>
        </div>

        <div className="user-form-container">
          <div className="form-section">
            <h4 className="form-section-title">Datos del usuario</h4>

            <div className="form-grid-datos">
              <div className="form-group">
                <label className="form-label">Tipo ID</label>
                <select
                  value={formData.tipoIdentificacion}
                  onChange={(e) => setFormData({ ...formData, tipoIdentificacion: e.target.value })}
                  className="form-input"
                >
                  <option value="">Seleccione tipo</option>
                  {tiposIdentificacion.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.description || item.value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Identificación *</label>
                <input
                  type="text"
                  value={formData.identificacion}
                  onChange={(e) => setFormData({ ...formData, identificacion: e.target.value })}
                  className="form-input"
                  required
                  placeholder="Número de identificación"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nombres *</label>
                <input
                  type="text"
                  value={formData.nombres}
                  onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                  className="form-input"
                  required
                  placeholder="Ingrese los nombres"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Apellidos *</label>
                <input
                  type="text"
                  value={formData.apellidos}
                  onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                  className="form-input"
                  required
                  placeholder="Ingrese los apellidos"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Celular</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="form-input"
                  placeholder="Número de celular"
                />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Usuario (Directorio Activo) *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="form-input"
                  required
                  placeholder="correo@ejemplo.com"
                  disabled={!!editingUser}
                />
                {editingUser && <small className="form-hint">El usuario no se puede modificar</small>}
              </div>
              <div className="form-group full-width">
                <label className="form-label">Directorio Activo (Office 365)</label>
                <div className="switch-container" style={{ justifyContent: 'flex-start' }}>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={formData.directorioActivo}
                      onChange={(e) => setFormData({ ...formData, directorioActivo: e.target.checked, password: '', confirmPassword: '' })}
                    />
                    <span className="slider"></span>
                  </label>
                  <span className="status-text" style={{ marginLeft: 8 }}>
                    {formData.directorioActivo ? 'Sí (ingreso con Office 365)' : 'No (ingreso con contraseña)'}
                  </span>
                </div>
              </div>
              {!formData.directorioActivo && (
                <>
                  <div className="form-group">
                    <label className="form-label">
                      Contraseña {!editingUser && '*'}
                      {editingUser && <span className="optional-label">(dejar vacío para no cambiar)</span>}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="form-input"
                      required={!editingUser}
                      placeholder={editingUser ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Confirmar contraseña {!editingUser && '*'}
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="form-input"
                      required={!editingUser}
                      placeholder="Repetir contraseña"
                    />
                  </div>
                </>
              )}
              {editingUser && (
                <div className="form-group full-width">
                  <label className="form-label">Estado</label>
                  <div className="switch-container" style={{ justifyContent: 'flex-start' }}>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.checked })}
                      />
                      <span className="slider"></span>
                    </label>
                    <span className={`status-text ${formData.estado ? 'active' : 'inactive'}`} style={{ marginLeft: 8 }}>
                      {formData.estado ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Renderizar vista de Gestión de Sedes
  const renderGestionSedes = () => {
    const handleGuardarSede = async () => {
      await guardarSede();
    };

    if (!selectedUser) {
      return (
        <div className="users-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando información del usuario...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="users-content">
        <div className="users-section">
          <div className="users-header">
            <div className="configuracion-actions">
              <button className="btn-volver" onClick={() => setVistaActual('buscar')}>
                <FiArrowLeft className="btn-icon" />
                Volver
              </button>
              <button className="btn-guardar" onClick={handleGuardarSede}>
                <FiKey className="btn-icon" />
                Guardar Sede
              </button>
            </div>
            <div className="section-header">
              <h3>ASOCIAR SEDE</h3>
            </div>
          </div>

          <div className="roles-container">
            <div className="roles-header-info">
              <h2 className="user-title">{selectedUser?.nombres} {selectedUser?.apellidos}</h2>
              <div className="roles-stats">
                <span>
                  {sedeSeleccionada ? '1 sede asignada' : 'Sin sede asignada'}
                </span>
              </div>
            </div>

            <div className="roles-layout">
              <div className="roles-table">
                <div className="roles-table-header">
                  <div className="rol-col rol-col-nombre">SUCURSAL</div>
                  <div className="rol-col rol-col-estado">ESTADO</div>
                </div>
                <div className="roles-table-body">
                  {sucursales && sucursales.length > 0 ? (
                    sucursales.map(sucursal => (
                      <div key={sucursal._id} className="rol-table-row">
                        <div className="rol-col rol-col-nombre">
                          <span className="rol-name">{sucursal.nombre} ({sucursal.codigo})</span>
                        </div>
                        <div className="rol-col rol-col-estado">
                          <div className="rol-switch-container">
                            <label className="rol-switch">
                              <input
                                type="checkbox"
                                checked={sedeSeleccionada === sucursal._id}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // Si se activa, desactivar todas las demás y activar esta
                                    setSedeSeleccionada(sucursal._id);
                                  } else {
                                    // Si se desactiva, dejar sin sede
                                    setSedeSeleccionada(null);
                                  }
                                }}
                              />
                              <span className="rol-slider"></span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <p>No hay sucursales disponibles</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar vista de Gestión de Roles
  const renderGestionRoles = () => {


    const handleGuardarRoles = async () => {

      await guardarRoles(rolesSeleccionados);

    };

    if (!selectedUser) {
      return (
        <div className="users-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando información del usuario...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="users-content">
        <div className="users-section">
          <div className="users-header">
            <div className="configuracion-actions">
              <button className="btn-volver" onClick={() => setVistaActual('buscar')}>
                <FiArrowLeft className="btn-icon" />
                Volver
              </button>
              <button className="btn-guardar" onClick={handleGuardarRoles}>
                <FiKey className="btn-icon" />
                Guardar Roles
              </button>
            </div>
            <div className="section-header">
              <h3>ASOCIAR ROLES</h3>
            </div>
          </div>

          <div className="roles-container">
            <div className="roles-header-info">
              <h2 className="user-title">{selectedUser?.nombres} {selectedUser?.apellidos}</h2>
              <div className="roles-stats">
                <span>
                  {Object.values(rolesSeleccionados).filter(Boolean).length} roles asignados
                </span>
              </div>
            </div>

            <div className="roles-layout">
              <div className="roles-table">
                <div className="roles-table-header">
                  <div className="rol-col rol-col-nombre">ROL</div>
                  <div className="rol-col rol-col-estado">ESTADO</div>
                </div>
                <div className="roles-table-body">
                  {roles && roles.length > 0 ? (
                    roles.map(rol => (
                      <div key={rol._id} className="rol-table-row">
                        <div className="rol-col rol-col-nombre">
                          <span className="rol-name">{rol.nombre}</span>

                        </div>
                        <div className="rol-col rol-col-estado">
                          <div className="rol-switch-container">
                            <label className="rol-switch">
                              <input
                                type="checkbox"
                                checked={!!rolesSeleccionados[rol._id]}
                                onChange={() => setRolesSeleccionados(prev => ({
                                  ...prev,
                                  [rol._id]: !prev[rol._id]
                                }))}
                              />
                              <span className="rol-slider"></span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <p>No hay roles disponibles</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar vista de Gestión de Programas
  const renderGestionProgramas = () => {
    const totalProgramas = programPagination.total || 0;
    const totalPages = Math.max(1, programPagination.pages || 1);
    const page = Math.min(Math.max(1, programCurrentPage), totalPages);
    const start = totalProgramas ? (page - 1) * PROGRAMAS_PAGE_SIZE + 1 : 0;
    const end = Math.min(page * PROGRAMAS_PAGE_SIZE, totalProgramas);

    if (!selectedUser) {
      return (
        <div className="users-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando información del usuario...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="users-content">
        <div className="users-section">
          <div className="users-header">
            <div className="configuracion-actions">
              <button className="btn-volver" onClick={() => setVistaActual('buscar')}>
                <FiArrowLeft className="btn-icon" />
                Volver
              </button>
              <button className="btn-guardar" onClick={guardarProgramas}>
                <FiKey className="btn-icon" />
                Guardar Programas
              </button>
            </div>
            <div className="section-header">
              <h3>ASOCIAR PROGRAMAS</h3>
            </div>
          </div>

          <div className="roles-container">
            <div className="roles-header-info">
              <h2 className="user-title">{selectedUser?.nombres} {selectedUser?.apellidos}</h2>
              <div className="roles-stats">
                <span>
                  {asociarTodosActivos
                    ? 'Al guardar: se asociarán todos los programas ACTIVE'
                    : `${Object.values(programasSeleccionados).filter(Boolean).length} programas asignados`}
                </span>
              </div>
            </div>

            <div className="users-filters" style={{ marginBottom: 16 }}>
              <div className="search-box">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, código o nivel..."
                  value={programSearchTerm}
                  onChange={(e) => setProgramSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-volver"
                  onClick={() => {
                    setAsociarTodosActivos(true);
                  }}
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  Seleccionar todos (ACTIVE)
                </button>
                <button
                  type="button"
                  className="btn-volver"
                  onClick={() => {
                    setAsociarTodosActivos(false);
                    setProgramasSeleccionados({});
                  }}
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  Deseleccionar todos
                </button>
              </div>
            </div>

            <div className="roles-layout">
              <div className="roles-table">
                <div className="roles-table-header">
                  <div className="rol-col rol-col-nombre">PROGRAMA</div>
                  <div className="rol-col rol-col-estado">ASIGNAR</div>
                </div>
                <div className="roles-table-body">
                  {loadingPrograms ? (
                    <div className="loading-container" style={{ padding: 24 }}>
                      <div className="loading-spinner"></div>
                      <p>Cargando programas...</p>
                    </div>
                  ) : programs.length === 0 ? (
                    <div className="empty-state" style={{ padding: 24 }}>
                      <p>{programSearchQuery ? 'No hay programas que coincidan con la búsqueda.' : 'No hay programas con estado ACTIVE.'}</p>
                    </div>
                  ) : (
                    programs.map(program => (
                      <div key={program._id} className="rol-table-row">
                        <div className="rol-col rol-col-nombre">
                          <span className="rol-name">
                            {program.name}
                            {program.code && <span style={{ color: '#6b7280', marginLeft: 6 }}>({program.code})</span>}
                            {program.level && <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 4 }}> · {program.level}</span>}
                          </span>
                        </div>
                        <div className="rol-col rol-col-estado">
                          <div className="rol-switch-container">
                            <label className="rol-switch">
                              <input
                                type="checkbox"
                                checked={asociarTodosActivos || !!programasSeleccionados[program._id]}
                                disabled={asociarTodosActivos}
                                onChange={() => setProgramasSeleccionados(prev => ({
                                  ...prev,
                                  [program._id]: !prev[program._id]
                                }))}
                              />
                              <span className="rol-slider"></span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {!loadingPrograms && totalProgramas > 0 && (
              <div className="users-filters" style={{ marginTop: 16, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>
                  Mostrando {start}-{end} de {totalProgramas} programas
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-volver"
                    disabled={page <= 1 || loadingPrograms}
                    onClick={() => setProgramCurrentPage(p => Math.max(1, p - 1))}
                    style={{ padding: '6px 12px', fontSize: 12 }}
                  >
                    Anterior
                  </button>
                  <span style={{ fontSize: 13 }}>
                    Página {page} de {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn-volver"
                    disabled={page >= totalPages || loadingPrograms}
                    onClick={() => setProgramCurrentPage(p => Math.min(totalPages, p + 1))}
                    style={{ padding: '6px 12px', fontSize: 12 }}
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
  };

  return (
    <>
      {vistaActual === 'buscar' && renderBuscarUsuario()}
      {vistaActual === 'crear' && renderCrearUsuario()}
      {vistaActual === 'roles' && renderGestionRoles()}
      {vistaActual === 'programas' && renderGestionProgramas()}
      {vistaActual === 'sedes' && renderGestionSedes()}
    </>
  );
};

export default Users;