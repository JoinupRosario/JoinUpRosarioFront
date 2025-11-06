import React, { useState, useEffect } from 'react';
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
  FiX
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../styles/Users.css';

const Users = ({ onVolver }) => {
  const [vistaActual, setVistaActual] = useState('buscar');
  const [usersAdministrativos, setUsersAdministrativos] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [rolesSeleccionados, setRolesSeleccionados] = useState({});
  const [sedeSeleccionada, setSedeSeleccionada] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    cargo: '',
    identificacion: '',
    telefono: '',
    extension: '',
    movil: '',
    email: '',
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

  // Cargar datos iniciales
  useEffect(() => {
    cargarUsersAdministrativos();
    cargarRoles();
    cargarSucursales();
  }, []);

  const cargarUsersAdministrativos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users-administrativos');
      if (response.data.success) {
        setUsersAdministrativos(response.data.data);
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

  // Filtrar usuarios
  const usersFiltrados = usersAdministrativos.filter(user => {
    const coincideNombre =
      user.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.identificacion.includes(searchTerm) ||
      user.user?.email.toLowerCase().includes(searchTerm.toLowerCase());

    return coincideNombre;
  });

  // Iniciar edición de usuario
  const startEdit = (user) => {
    setEditingUser(user);
    setFormData({
      nombres: user.nombres || '',
      apellidos: user.apellidos || '',
      cargo: user.cargo || '',
      identificacion: user.identificacion || '',
      telefono: user.telefono || '',
      extension: user.extension || '',
      movil: user.movil || '',
      email: user.user?.email || '',
      password: '',
      confirmPassword: '',
      estado: user.estado !== undefined ? user.estado : true
    });
    setVistaActual('crear');
  };

  // Manejar creación de usuario administrativo
  const handleCrearUserAdministrativo = async (e) => {
    e.preventDefault();

    // Validaciones básicas
    if (!formData.nombres.trim() || !formData.apellidos.trim() ||
      !formData.identificacion.trim() || !formData.email.trim()) {
      showError('Error', 'Todos los campos obligatorios deben ser llenados');
      return;
    }

    // Solo validar contraseña si es creación nueva o si se está cambiando
    if (!editingUser && !formData.password.trim()) {
      showError('Error', 'La contraseña es obligatoria para nuevos usuarios');
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      showError('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      showError('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const { confirmPassword, ...dataToSend } = formData;
      
      // Si no hay contraseña en edición, no la enviamos
      if (editingUser && !dataToSend.password) {
        delete dataToSend.password;
      }

      let response;
      if (editingUser) {
        // Actualizar usuario existente
        response = await api.put(`/users-administrativos/${editingUser._id}`, dataToSend);
        if (response.data.success) {
          await showSuccess('Éxito', 'Usuario administrativo actualizado correctamente');
        }
      } else {
        // Crear nuevo usuario
        response = await api.post('/users-administrativos', dataToSend);
        if (response.data.success) {
          await showSuccess('Éxito', 'Usuario administrativo creado correctamente');
        }
      }

      if (response.data.success) {
        cargarUsersAdministrativos();
        setVistaActual('buscar');
        setEditingUser(null);
        setFormData({
          nombres: '',
          apellidos: '',
          cargo: '',
          identificacion: '',
          telefono: '',
          extension: '',
          movil: '',
          email: '',
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
        cargarUsersAdministrativos();
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
    showFuncionalidadEnDesarrollo('Asociar Programas / Opciones Académicas');
  };

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
      cargarUsersAdministrativos();

    } catch (error) {
      console.error('Error al guardar sede:', error);
      showError('Error', 'Error al guardar la sede');
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
      cargarUsersAdministrativos();

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
              className="btn-guardar"
              onClick={() => {
                setFormData({
                  nombres: '',
                  apellidos: '',
                  cargo: '',
                  identificacion: '',
                  telefono: '',
                  extension: '',
                  movil: '',
                  email: '',
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
          ) : usersFiltrados.length === 0 ? (
            <div className="empty-state">
              <FiUser className="empty-icon" />
              <h3>No se encontraron usuarios</h3>
              <p>{usersAdministrativos.length === 0 ? 'No hay usuarios creados todavía.' : 'Intenta con otros términos de búsqueda.'}</p>
            </div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>NOMBRES</th>
                  <th>APELLIDOS</th>
                  <th>CARGO</th>
                  <th>IDENTIFICACIÓN</th>
                  <th>USUARIO</th>
                  <th>ROLES</th>
                  <th>TELÉFONO</th>
                  <th>EXTENSIÓN</th>
                  <th>MÓVIL</th>
                  <th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {usersFiltrados.map(user => (
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
                    <td>{user.cargo || '-'}</td>
                    <td>{user.identificacion}</td>
                    <td>{user.user?.email}</td>
                    <td>
                      <div className="roles-list">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((rolObj, index) => (
                            rolObj.estado && (
                              <span key={index} className="rol-tag">
                                • {rolObj.rol?.nombre}
                              </span>
                            )
                          ))
                        ) : (
                          <span className="no-roles">Sin Rol</span>
                        )}
                      </div>
                    </td>
                    <td>{user.telefono || '-'}</td>
                    <td>{user.extension || '-'}</td>
                    <td>{user.movil || '-'}</td>
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
                nombres: '',
                apellidos: '',
                cargo: '',
                identificacion: '',
                telefono: '',
                extension: '',
                movil: '',
                email: '',
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
            <h4 className="form-section-title">DATOS PERSONALES</h4>

            <div className="form-layout">
              {/* Columna izquierda - Datos Personales */}
              <div className="form-column">
                <div className="form-group">
                  <label className="form-label">NOMBRES *</label>
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
                  <label className="form-label">APELLIDOS *</label>
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
                  <label className="form-label">CARGO</label>
                  <input
                    type="text"
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    className="form-input"
                    placeholder="Ingrese el cargo"
                  />
                </div>
              </div>

              {/* Columna derecha - Identificación */}
              <div className="form-column">
                <div className="form-group">
                  <label className="form-label">IDENTIFICACIÓN *</label>
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
                  <label className="form-label">TELÉFONO</label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="form-input"
                    placeholder="Número de teléfono"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">EXTENSIÓN</label>
                  <input
                    type="text"
                    value={formData.extension}
                    onChange={(e) => setFormData({ ...formData, extension: e.target.value })}
                    className="form-input"
                    placeholder="Extensión telefónica"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">MÓVIL</label>
                  <input
                    type="text"
                    value={formData.movil}
                    onChange={(e) => setFormData({ ...formData, movil: e.target.value })}
                    className="form-input"
                    placeholder="Número de móvil"
                  />
                </div>
              </div>
            </div>

            {/* Sección de Credenciales */}
            <div className="credentials-section">
              <h4 className="form-section-title">CREDENCIALES</h4>
              <div className="form-layout">
                <div className="form-column">
                  <div className="form-group">
                    <label className="form-label">
                      CONTRASEÑA {!editingUser && '*'}
                      {editingUser && <span className="optional-label">(Dejar vacío para no cambiar)</span>}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="form-input"
                      required={!editingUser}
                      placeholder={editingUser ? "Dejar vacío para no cambiar" : "Ingrese la contraseña"}
                    />
                  </div>
                </div>
                <div className="form-column">
                  <div className="form-group">
                    <label className="form-label">
                      CONFIRMACIÓN {!editingUser && '*'}
                      {editingUser && <span className="optional-label">(Solo si cambia contraseña)</span>}
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="form-input"
                      required={!editingUser}
                      placeholder={editingUser ? "Solo si cambia contraseña" : "Confirme la contraseña"}
                    />
                  </div>
                </div>
              </div>
              <div className="form-group full-width">
                <label className="form-label">USUARIO (EMAIL) *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="form-input"
                  required
                  placeholder="correo@ejemplo.com"
                  disabled={editingUser ? true : false}
                />
                {editingUser && <small className="form-hint">El email no se puede modificar</small>}
              </div>
              {/* Estado solo en edición */}
              {editingUser && (
                <div className="form-group full-width">
                  <label className="form-label">ESTADO</label>
                  <div className="switch-container">
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.checked })}
                      />
                      <span className="slider"></span>
                    </label>
                    <span className={`status-text ${formData.estado ? 'active' : 'inactive'}`}>
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

  return (
    <>
      {vistaActual === 'buscar' && renderBuscarUsuario()}
      {vistaActual === 'crear' && renderCrearUsuario()}
      {vistaActual === 'roles' && renderGestionRoles()}
      {vistaActual === 'sedes' && renderGestionSedes()}
    </>
  );
};

export default Users;