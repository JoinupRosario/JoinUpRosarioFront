import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiSearch,
  FiUser,
  FiPlus,
  FiActivity,
  FiFileText,
  FiRefreshCw,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import '../../styles/postulants.css';

// Utilidades de alertas
const createAlert = (icon, title, text, confirmButtonText = 'Aceptar') => {
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

const Postulants = ({ onVolver }) => {
  const navigate = useNavigate();
  
  // Estados principales
  const [postulants, setPostulants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const searchDebounceRef = useRef(null);
  

  // Funciones de utilidad
  const showAlert = useCallback((icon, title, text, confirmButtonText) => {
    return createAlert(icon, title, text, confirmButtonText);
  }, []);

  const showError = useCallback((title, text) => {
    return showAlert('error', title, text);
  }, [showAlert]);

  const showSuccess = useCallback((title, text) => {
    return showAlert('success', title, text);
  }, [showAlert]);

  const showFuncionalidadEnDesarrollo = useCallback((funcionalidad) => {
    showAlert(
      'info',
      'Funcionalidad en Desarrollo',
      `La funcionalidad "${funcionalidad}" está actualmente en desarrollo y estará disponible próximamente.`
    );
  }, [showAlert]);

  const showConfirmation = useCallback((title, text, confirmButtonText = 'Sí, continuar') => {
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
      color: '#333'
    });
  }, []);

  const showConfirmationWithReason = useCallback((title, text, confirmButtonText = 'Confirmar') => {
    return Swal.fire({
      title,
      text,
      input: 'textarea',
      inputLabel: 'Razón del cambio',
      inputPlaceholder: 'Ingrese la razón del cambio de estado...',
      inputAttributes: {
        'aria-label': 'Razón del cambio de estado'
      },
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      cancelButtonColor: '#6c757d',
      confirmButtonText,
      cancelButtonText: 'Cancelar',
      background: '#fff',
      color: '#333',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'Debe ingresar una razón para el cambio de estado';
        }
        if (value.trim().length < 5) {
          return 'La razón debe tener al menos 5 caracteres';
        }
      }
    });
  }, []);


  // Parámetro de búsqueda enviado al API (debounced)
  const [searchParam, setSearchParam] = useState('');

  // Carga de postulantes con paginación
  const loadPostulants = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        ...(searchParam && searchParam.trim() ? { search: searchParam.trim() } : {}),
      };
      const response = await api.get('/postulants', { params });
      setPostulants(response.data.data || []);
      setTotal(response.data.total ?? 0);
      setTotalPages(response.data.totalPages ?? 0);
    } catch (error) {
      console.error('Error loading postulants', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchParam]);

  // Debounce de búsqueda: al escribir, actualizar searchParam y volver a página 1 tras 400ms
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchParam(searchTerm);
      setPage(1);
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm]);

  // Utilidades de visualización
  const getProfilePercent = useCallback((postulant) => {
    const value = postulant.filling_percentage ?? (postulant.full_profile ? 100 : 0);
    return Math.min(100, Math.max(0, Number(value) || 0));
  }, []);

  const handleRowClick = useCallback((postulant) => {
    if (postulant.user?._id) {
      navigate(`/dashboard/postulantes/${postulant.user._id}`);
    }
  }, [navigate]);

  const handleLinkClick = useCallback((e, postulant) => {
    e.stopPropagation();
    if (postulant.user?._id) {
      navigate(`/dashboard/postulantes/${postulant.user._id}`);
    }
  }, [navigate]);

  // Cambiar estado del postulante
  const toggleEstadoPostulant = useCallback(async (postulantId, nuevoEstado) => {
    const postulant = postulants.find(p => p._id === postulantId);
    const estadoTexto = nuevoEstado === 'activo' ? 'activar' : 'desactivar';
    const nombreCompleto = postulant?.user?.name 
      ? `${postulant.user.name} ${postulant.user.lastname || ''}`.trim()
      : postulant?.identity_postulant || 'este postulante';

    const result = await showConfirmationWithReason(
      `${nuevoEstado === 'activo' ? 'Activar' : 'Desactivar'} Postulante`,
      `¿Estás seguro de que deseas ${estadoTexto} al postulante "${nombreCompleto}"?`,
      `Sí, ${estadoTexto}`
    );

    if (!result.isConfirmed) {
      return;
    }

    const reason = result.value?.trim() || '';

    try {
      const response = await api.put(`/postulants/update/${postulantId}`, {
        estate_postulant: nuevoEstado,
        reason: reason
      });

      if (response.data) {
        const mensaje = nuevoEstado === 'activo' 
          ? 'Postulante activado correctamente' 
          : 'Postulante desactivado correctamente';
        await showSuccess('Éxito', mensaje);
        loadPostulants();
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      const mensajeError = nuevoEstado === 'activo' 
        ? 'Error al activar el postulante' 
        : 'Error al desactivar el postulante';
      showError('Error', mensajeError);
    }
  }, [postulants, showConfirmationWithReason, showSuccess, showError, loadPostulants]);

  // Cargar cuando cambian página, límite o búsqueda aplicada
  useEffect(() => {
    loadPostulants();
  }, [loadPostulants]);

  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  }, [totalPages]);

  const handleLimitChange = useCallback((e) => {
    const newLimit = Number(e.target.value) || 20;
    setLimit(newLimit);
    setPage(1);
  }, []);

  const renderPostulantsTable = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Cargando postulantes...</p>
        </div>
      );
    }

    if (postulants.length === 0) {
      return (
        <div className="empty-state">
          <FiUser className="empty-icon" />
          <h3>No se encontraron postulantes</h3>
          <p>
            {total === 0 && !searchParam
              ? 'No hay postulantes registrados todavía.'
              : 'Intenta con otros términos de búsqueda o cambia de página.'}
          </p>
        </div>
      );
    }

    return (
      <table className="postulants-table">
        <thead>
          <tr>
            <th>IDENTIFICACIÓN</th>
            <th>NOMBRES Y APELLIDOS</th>
            <th>USUARIO</th>
            <th>PROGRAMAS</th>
            <th>ACTUALIZADO</th>
            <th>% COMPLETITUD</th>
            <th>ESTADO</th>
          </tr>
        </thead>
        <tbody>
          {postulants.map((p) => {
            const estadoActual = p.estate_postulant || 'activo';
            const isActivo = estadoActual === 'activo';
            const nuevoEstado = isActivo ? 'inactivo' : 'activo';
            
            return (
              <tr
                key={p._id}
                onClick={() => handleRowClick(p)}
                className="table-row-clickable"
              >
                <td>
                  {p.user?._id ? (
                    <span
                      onClick={(e) => handleLinkClick(e, p)}
                      className="postulant-link"
                      style={{ cursor: 'pointer' }}
                    >
                      {p.identity_postulant ?? '-'}
                    </span>
                  ) : (
                    p.identity_postulant ?? '-'
                  )}
                </td>
                <td>
                  {p.user?._id ? (
                    <span
                      onClick={(e) => handleLinkClick(e, p)}
                      className="postulant-link"
                      style={{ cursor: 'pointer' }}
                    >
                      {p.user?.name ?? '-'}
                    </span>
                  ) : (
                    p.user?.name ?? '-'
                  )}
                </td>
                <td>{p.user?.email ?? '-'}</td>
                <td>Ingeniería de Sistemas</td>
                <td>{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '-'}</td>
                <td>{getProfilePercent(p)}%</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="switch-container">
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={isActivo}
                        onChange={() => toggleEstadoPostulant(p._id, nuevoEstado)}
                      />
                      <span className="slider"></span>
                    </label>
                    <span className={`status-text ${isActivo ? 'active' : 'inactive'}`}>
                      {isActivo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="postulants-content">
      <div className="postulants-section">
        <div className="postulants-header">
          <div className="configuracion-actions">
            <button className="btn-volver" onClick={onVolver}>
              <FiArrowLeft className="btn-icon" />
              Volver
            </button>
            <button
              className="btn-action btn-outline"
              onClick={() => navigate('/dashboard/postulantes/historial-estados')}
              title="Log de estados"
            >
              <FiActivity className="btn-icon" />
              Log de estados
            </button>
            <button
              className="btn-action btn-outline"
              onClick={() => navigate('/dashboard/postulantes/documentlog')}
              title="Log de documentos"
            >
              <FiFileText className="btn-icon" />
              Log de documentos
            </button>
            <button
              className="btn-action btn-outline"
              onClick={loadPostulants}
              title="Recargar listado de postulantes"
            >
              <FiRefreshCw className="btn-icon" />
              Cargar postulantes
            </button>
            <button
              className="btn-action btn-outline"
              onClick={() => showFuncionalidadEnDesarrollo('Cargar lista negra')}
              title="Cargar lista negra"
            >
              <FiAlertCircle className="btn-icon" />
              Cargar lista negra
            </button>
          </div>
          <div className="section-header">
            <h3>BUSCAR POSTULANTE</h3>
          </div>
        </div>

        <div className="postulants-filters">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por identificación, nombres, apellidos o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="postulants-table-container">
          {renderPostulantsTable()}
        </div>

        {total > 0 && (
          <div className="postulants-pagination">
            <div className="pagination-info">
              Mostrando {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} de {total}
            </div>
            <div className="pagination-controls">
              <label className="pagination-limit">
                Filas por página:
                <select value={limit} onChange={handleLimitChange} className="pagination-select">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <div className="pagination-buttons">
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  title="Página anterior"
                >
                  <FiChevronLeft />
                </button>
                <span className="pagination-page">
                  Página {page} de {totalPages || 1}
                </span>
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  title="Página siguiente"
                >
                  <FiChevronRight />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Postulants;
