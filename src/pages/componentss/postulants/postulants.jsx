import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiSearch,
  FiUser,
  FiActivity,
  FiFileText,
  FiRefreshCw,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiMoreVertical,
  FiBook,
  FiUploadCloud,
  FiCheckCircle,
  FiUserMinus,
  FiUserPlus,
  FiX,
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
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
  const { hasPermission } = useAuth();
  const canCEPO = hasPermission('CEPO');   // Cambiar estado de postulante
  const canCPOS = hasPermission('CPOS');   // Cargar postulantes (UXXI)
  const canVPPO = hasPermission('VPPO');  // Ver perfil / programas

  // Estados principales
  const [postulants, setPostulants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [actionsOpenForId, setActionsOpenForId] = useState(null);
  const [cursosModal, setCursosModal] = useState({ open: false, postulant: null, loading: false, enrolled: [], graduate: [] });

  // Pestaña activos / inactivos
  const [tabActivo, setTabActivo] = useState('activos');

  // Estados para sincronización UXXI
  const [sincronizando, setSincronizando] = useState(false);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [sincrModal, setSincrModal] = useState({ open: false, data: null });
  // 'loading' | 'preview' | 'procesando' | 'resultado'
  const [sincrStep, setSincrStep] = useState('preview');
  const [previewData, setPreviewData] = useState(null);
  const [progresoFase, setProgresoFase] = useState(0);   // 0–100 para la barra
  const [progresoMsg, setProgresoMsg]   = useState('');
  const progresoIntervalRef = useRef(null);

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

  // Búsqueda que se envía al backend (con debounce)
  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounceRef = useRef(null);

  // Carga de postulantes con paginación y búsqueda en backend
  const loadPostulants = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit, userEstado: tabActivo === 'activos' ? 'true' : 'false' };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const response = await api.get('/postulants', { params });
      const raw = response.data;
      const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
      setPostulants(list);
      setTotal(raw?.total ?? 0);
      setTotalPages(raw?.totalPages ?? 0);
    } catch (error) {
      console.error('Error loading postulants', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, tabActivo]);

  const handleAbrirPreviewUxxi = useCallback(() => {
    // Primero actualizar estado (render del spinner), luego lanzar la petición
    setCargandoPreview(true);
    setSincrStep('loading');
    setSincrModal({ open: true, data: null });

    // setTimeout(0) cede el hilo para que React renderice el modal antes de bloquear con fetch
    setTimeout(async () => {
      try {
        const res = await api.post('/postulants/preview-sincronizar-uxxi', {}, { timeout: 300000 });
        setPreviewData(res.data);
        setSincrStep('preview');
      } catch (err) {
        setSincrModal({ open: false, data: null });
        showError('Error al obtener preview', err?.response?.data?.message || err.message);
      } finally {
        setCargandoPreview(false);
      }
    }, 0);
  }, [showError]);

  const handleConfirmarSincronizar = useCallback(() => {
    const porInactivar  = previewData?.cantidadPorInactivar  ?? 0;
    const porCrear      = previewData?.cantidadPorCrear      ?? 0;
    const porCompletar  = previewData?.cantidadPorCompletar  ?? 0;
    const totalCrear    = porCrear + porCompletar;

    // Pasos con tiempos estimados proporcionales a los volúmenes
    const pasos = [
      { pct: 5,  msg: 'Preparando sincronización…' },
      { pct: 20, msg: `Inactivando ${porInactivar.toLocaleString()} registros…` },
      { pct: 45, msg: 'Inactivación completada. Iniciando creación de registros…' },
      { pct: 65, msg: `Creando/completando ${totalCrear.toLocaleString()} registros de estudiantes…` },
      { pct: 80, msg: 'Guardando perfiles y programas…' },
      { pct: 92, msg: 'Finalizando y verificando consistencia…' },
    ];

    setSincronizando(true);
    setSincrStep('procesando');
    setProgresoFase(0);
    setProgresoMsg(pasos[0].msg);

    // Avanzar pasos simulados mientras la request real corre
    let pasoIdx = 0;
    const avanzar = () => {
      pasoIdx++;
      if (pasoIdx < pasos.length) {
        setProgresoFase(pasos[pasoIdx].pct);
        setProgresoMsg(pasos[pasoIdx].msg);
        // Intervalo proporcional al volumen total
        const delay = pasoIdx === 1
          ? Math.min(4000, porInactivar * 0.1)   // inactivación rápida (bulk)
          : Math.min(6000, totalCrear * 2);          // creación más lenta (lotes)
        progresoIntervalRef.current = setTimeout(avanzar, Math.max(1500, delay));
      }
    };
    progresoIntervalRef.current = setTimeout(avanzar, 800);

    // Lanzar request real
    setTimeout(async () => {
      try {
        const res = await api.post('/postulants/sincronizar-uxxi', {}, { timeout: 600000 });
        clearTimeout(progresoIntervalRef.current);
        setProgresoFase(100);
        setProgresoMsg('Sincronización completada.');
        await new Promise(r => setTimeout(r, 600)); // breve pausa para mostrar 100%
        setPreviewData(null);
        setSincrStep('resultado');
        setSincrModal({ open: true, data: res.data });
        await loadPostulants();
      } catch (err) {
        clearTimeout(progresoIntervalRef.current);
        setSincrModal({ open: false, data: null });
        showError('Error en sincronización', err?.response?.data?.message || err.message);
      } finally {
        setSincronizando(false);
      }
    }, 0);
  }, [previewData, loadPostulants, showError]);

  // Debounce: al escribir en la barra, actualizar searchQuery tras 400ms y volver a página 1
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(searchTerm);
      setPage(1);
      searchDebounceRef.current = null;
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
    if (!canVPPO) return; // Solo quien tiene VPPO puede abrir el perfil del postulante
    if (postulant._id) {
      navigate(`/dashboard/postulantes/${postulant._id}`);
    }
  }, [navigate, canVPPO]);

  const handleLinkClick = useCallback((e, postulant) => {
    e.stopPropagation();
    if (!canVPPO) return;
    if (postulant._id) {
      navigate(`/dashboard/postulantes/${postulant._id}`);
    }
  }, [navigate, canVPPO]);

  // Activar / inactivar usuario del postulante (toggle de la tabla)
  const toggleEstadoPostulant = useCallback(async (postulantId, nuevoEstadoBoolean) => {
    const postulant = postulants.find(p => p._id === postulantId);
    const accion = nuevoEstadoBoolean ? 'activar' : 'desactivar';
    const nombre = postulant?.user?.name || postulant?.identity_postulant || 'este postulante';

    const result = await showConfirmation(
      `${nuevoEstadoBoolean ? 'Activar' : 'Desactivar'} postulante`,
      `¿Estás seguro de que deseas ${accion} a "${nombre}"?`,
      `Sí, ${accion}`
    );
    if (!result.isConfirmed) return;

    try {
      await api.put(`/postulants/update/${postulantId}`, { user_estado: nuevoEstadoBoolean });
      await showSuccess('Éxito', `Postulante ${nuevoEstadoBoolean ? 'activado' : 'desactivado'} correctamente`);
      loadPostulants();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      showError('Error', `No se pudo ${accion} el postulante`);
    }
  }, [postulants, showConfirmation, showSuccess, showError, loadPostulants]);

  // Al cambiar de pestaña, volver a página 1
  useEffect(() => {
    setPage(1);
  }, [tabActivo]);

  // Cargar cuando cambian página, límite, búsqueda o pestaña
  useEffect(() => {
    loadPostulants();
  }, [loadPostulants]);

  useEffect(() => {
    if (!actionsOpenForId) return;
    const close = () => setActionsOpenForId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [actionsOpenForId]);

  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  }, [totalPages]);

  const handleLimitChange = useCallback((e) => {
    const newLimit = Number(e.target.value) || 20;
    setLimit(newLimit);
    setPage(1);
  }, []);

  const toggleActions = useCallback((e, postulantId) => {
    e.stopPropagation();
    setActionsOpenForId((prev) => (prev === postulantId ? null : postulantId));
  }, []);

  const openCursosModal = useCallback(async (e, postulant) => {
    e.stopPropagation();
    setActionsOpenForId(null);
    setCursosModal({ open: true, postulant, loading: true, enrolled: [], graduate: [] });
    try {
      const res = await api.get(`/postulants/${postulant._id}/profile-data`);
      const data = res.data || {};
      setCursosModal((m) => ({
        ...m,
        loading: false,
        enrolled: data.enrolledPrograms || [],
        graduate: data.graduatePrograms || [],
      }));
    } catch (err) {
      console.error('Error cargando cursos:', err);
      setCursosModal((m) => ({ ...m, loading: false }));
      showError('Error', 'No se pudieron cargar los cursos del postulante.');
    }
  }, [showError]);

  const closeCursosModal = useCallback(() => {
    setCursosModal({ open: false, postulant: null, loading: false, enrolled: [], graduate: [] });
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
            {searchQuery
              ? 'No hay resultados para tu búsqueda. Prueba con otros términos.'
              : 'No hay postulantes registrados todavía.'}
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
            <th>ACTUALIZADO</th>
            <th>% COMPLETITUD</th>
            {canCEPO && <th>ESTADO</th>}
            <th>ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {postulants.map((p) => {
            const isActivo = p.user_estado !== false;
            
            return (
              <tr
                key={p._id}
                onClick={() => handleRowClick(p)}
                className={canVPPO ? 'table-row-clickable' : ''}
                style={canVPPO ? undefined : { cursor: 'default' }}
              >
                <td>
                  {p._id ? (
                    <span
                      onClick={(e) => handleLinkClick(e, p)}
                      className={canVPPO ? 'postulant-link' : ''}
                      style={{ cursor: canVPPO ? 'pointer' : 'default' }}
                    >
                      {(p.student_code ?? p.identity_postulant ?? p.code ?? p.user?.code ?? '').trim() || '-'}
                    </span>
                  ) : (
                    (p.student_code ?? p.identity_postulant ?? p.code ?? p.user?.code ?? '').trim() || '-'
                  )}
                </td>
                <td>
                  {p._id ? (
                    <span
                      onClick={(e) => handleLinkClick(e, p)}
                      className={canVPPO ? 'postulant-link' : ''}
                      style={{ cursor: canVPPO ? 'pointer' : 'default' }}
                    >
                      {[p.name ?? p.user?.name ?? '', p.user?.lastname ?? ''].map(s => String(s).trim()).filter(Boolean).join(' ') || '-'}
                    </span>
                  ) : (
                    [p.name ?? p.user?.name ?? '', p.user?.lastname ?? ''].map(s => String(s).trim()).filter(Boolean).join(' ') || '-'
                  )}
                </td>
                <td>{(p.email ?? p.user?.email ?? '').trim() || '-'}</td>
                <td>{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '-'}</td>
                <td>{getProfilePercent(p)}%</td>
                {canCEPO && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="switch-container">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={isActivo}
                          onChange={() => toggleEstadoPostulant(p._id, !isActivo)}
                        />
                        <span className="slider"></span>
                      </label>
                      <span className={`status-text ${isActivo ? 'active' : 'inactive'}`}>
                        {isActivo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </td>
                )}
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="postulant-actions-cell">
                    {canVPPO && (
                      <>
                        <button
                          type="button"
                          className="btn-actions-trigger"
                          onClick={(e) => toggleActions(e, p._id)}
                          title="Opciones"
                          aria-expanded={actionsOpenForId === p._id}
                        >
                          <FiMoreVertical />
                          <span>Opciones</span>
                        </button>
                        {actionsOpenForId === p._id && (
                          <div className="postulant-actions-dropdown" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="postulant-actions-option"
                              onClick={(e) => openCursosModal(e, p)}
                            >
                              <FiBook className="btn-icon" />
                              Ver programas
                            </button>
                          </div>
                        )}
                      </>
                    )}
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
              Actualizar
            </button>
            {canCPOS && (
              <button
                className="btn-action btn-primary"
                onClick={handleAbrirPreviewUxxi}
                disabled={cargandoPreview || sincronizando}
                title="Sincronizar postulantes desde el archivo UXXI (SFTP)"
              >
                <FiUploadCloud className="btn-icon" />
                {cargandoPreview ? 'Leyendo archivo...' : 'Cargar postulantes UXXI'}
              </button>
            )}
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

        {/* Pestañas Activos / Inactivos */}
        <div className="postulants-tabs">
          <button
            className={`postulants-tab${tabActivo === 'activos' ? ' postulants-tab--active' : ''}`}
            onClick={() => setTabActivo('activos')}
          >
            Activos
          </button>
          <button
            className={`postulants-tab${tabActivo === 'inactivos' ? ' postulants-tab--active' : ''}`}
            onClick={() => setTabActivo('inactivos')}
          >
            Inactivos
          </button>
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

      {cursosModal.open && (
        <div className="cursos-modal-overlay" onClick={closeCursosModal}>
          <div className="cursos-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cursos-modal-header">
              <h3>
                Programas — {cursosModal.postulant ? [cursosModal.postulant.name ?? cursosModal.postulant.user?.name, cursosModal.postulant.user?.lastname].filter(Boolean).join(' ') || cursosModal.postulant.identity_postulant || 'Postulante' : 'Postulante'}
              </h3>
              <button type="button" className="cursos-modal-close" onClick={closeCursosModal} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className="cursos-modal-body">
              {cursosModal.loading ? (
                <div className="cursos-modal-loading">Cargando programas...</div>
              ) : (
                <>
                  <section className="cursos-modal-section">
                    <h4>Programa en curso</h4>
                    {cursosModal.enrolled.length === 0 ? (
                      <p className="cursos-empty">Sin programas en curso.</p>
                    ) : (
                      <ul className="cursos-list">
                        {cursosModal.enrolled.map((e) => (
                          <li key={e._id}>
                            {(e.programId?.name || e.programId?.code || 'Programa').trim()}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section className="cursos-modal-section">
                    <h4>Programas finalizados</h4>
                    {cursosModal.graduate.length === 0 ? (
                      <p className="cursos-empty">Sin programas finalizados.</p>
                    ) : (
                      <ul className="cursos-list">
                        {cursosModal.graduate.map((g) => (
                          <li key={g._id}>
                            {(g.programId?.name || g.programId?.code || 'Programa').trim()}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              )}
            </div>
            <div className="cursos-modal-footer">
              <button type="button" className="btn-action btn-outline" onClick={closeCursosModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal UXXI: loading / preview / resultado */}
      {sincrModal.open && (
        <div className="sincr-modal-overlay" onClick={() => !sincronizando && !cargandoPreview && setSincrModal({ open: false, data: null })}>
          <div className="sincr-modal-box" onClick={e => e.stopPropagation()}>

            {/* PASO 0 — CARGANDO (preview) */}
            {sincrStep === 'loading' && (
              <>
                <div className="sincr-modal-header sincr-modal-header--red">
                  <h3>Cargar postulantes UXXI</h3>
                </div>
                <div className="sincr-modal-body sincr-loading-body">
                  <div className="sincr-spinner" />
                  <p className="sincr-loading-msg">Leyendo archivo UXXI y comparando con la base de datos…</p>
                  <p className="sincr-loading-sub">Esto puede tardar unos segundos.</p>
                </div>
              </>
            )}

            {/* PASO 0b — PROCESANDO (sincronización en curso) */}
            {sincrStep === 'procesando' && (
              <>
                <div className="sincr-modal-header sincr-modal-header--red">
                  <h3>Sincronizando postulantes UXXI…</h3>
                </div>
                <div className="sincr-modal-body sincr-procesando-body">
                  {/* Indicador de pasos */}
                  <div className="sincr-steps">
                    {[
                      { label: 'Preparar',   threshold: 5  },
                      { label: 'Inactivar',  threshold: 20 },
                      { label: 'Crear',      threshold: 65 },
                      { label: 'Finalizar',  threshold: 92 },
                    ].map((s, i) => {
                      const done    = progresoFase >= s.threshold + 15;
                      const active  = progresoFase >= s.threshold && !done;
                      return (
                        <div key={i} className={`sincr-step ${done ? 'sincr-step--done' : active ? 'sincr-step--active' : ''}`}>
                          <div className="sincr-step-dot">
                            {done ? <FiCheckCircle /> : active ? <div className="sincr-step-spinner" /> : <span>{i + 1}</span>}
                          </div>
                          <span className="sincr-step-label">{s.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Barra de progreso */}
                  <div className="sincr-progress-track">
                    <div className="sincr-progress-bar" style={{ width: `${progresoFase}%` }} />
                  </div>
                  <p className="sincr-progress-pct">{progresoFase}%</p>
                  <p className="sincr-progress-msg">{progresoMsg}</p>
                  <p className="sincr-loading-sub">Por favor no cierres esta ventana.</p>
                </div>
              </>
            )}

            {/* PASO 1 — PREVIEW */}
            {sincrStep === 'preview' && previewData && (
              <>
                <div className="sincr-modal-header sincr-modal-header--red">
                  <h3>Resumen — Cargar postulantes UXXI</h3>
                  <button className="sincr-modal-close" onClick={() => setSincrModal({ open: false, data: null })}>
                    <FiX />
                  </button>
                </div>
                <div className="sincr-modal-body">
                  <p className="sincr-modal-subtitle">Revisa los cambios que se van a aplicar antes de proceder.</p>
                  <div className="sincr-stats">
                    <div className="sincr-stat sincr-stat--blue">
                      <FiCheckCircle className="sincr-stat-icon" />
                      <span className="sincr-stat-num">{previewData.totalArchivo}</span>
                      <span className="sincr-stat-lbl">En archivo</span>
                    </div>
                    <div className="sincr-stat sincr-stat--gray">
                      <FiUser className="sincr-stat-icon" />
                      <span className="sincr-stat-num">{previewData.totalBD}</span>
                      <span className="sincr-stat-lbl">En BD</span>
                    </div>
                    <div className="sincr-stat sincr-stat--green">
                      <FiUserPlus className="sincr-stat-icon" />
                      <span className="sincr-stat-num">{previewData.cantidadPorCrear}</span>
                      <span className="sincr-stat-lbl">Se crearán</span>
                    </div>
                    {(previewData.cantidadPorCompletar ?? 0) > 0 && (
                      <div className="sincr-stat sincr-stat--teal">
                        <FiCheckCircle className="sincr-stat-icon" />
                        <span className="sincr-stat-num">{previewData.cantidadPorCompletar}</span>
                        <span className="sincr-stat-lbl">Se completarán</span>
                      </div>
                    )}
                    <div className="sincr-stat sincr-stat--orange">
                      <FiUserMinus className="sincr-stat-icon" />
                      <span className="sincr-stat-num">{previewData.cantidadPorInactivar}</span>
                      <span className="sincr-stat-lbl">Se inactivarán</span>
                    </div>
                  </div>

                  {previewData.porCrear?.length > 0 && (
                    <div className="sincr-detail-section">
                      <h4 className="sincr-detail-title sincr-detail-title--green">
                        <FiUserPlus /> Nuevos a crear ({previewData.porCrear.length})
                      </h4>
                      <ul className="sincr-detail-list">
                        {previewData.porCrear.slice(0, 20).map((e, i) => (
                          <li key={i}><b>{e.identificacion}</b> — {e.nombre}{e.programa ? ` | ${e.programa}` : ''}</li>
                        ))}
                        {previewData.porCrear.length > 20 && (
                          <li className="sincr-detail-more">… y {previewData.porCrear.length - 20} más</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {previewData.porCompletar?.length > 0 && (
                    <div className="sincr-detail-section">
                      <h4 className="sincr-detail-title sincr-detail-title--teal">
                        <FiCheckCircle /> Perfil a completar — usuario ya existe ({previewData.porCompletar.length})
                      </h4>
                      <ul className="sincr-detail-list">
                        {previewData.porCompletar.slice(0, 20).map((e, i) => (
                          <li key={i}><b>{e.identificacion}</b> — {e.nombre}{e.programa ? ` | ${e.programa}` : ''}</li>
                        ))}
                        {previewData.porCompletar.length > 20 && (
                          <li className="sincr-detail-more">… y {previewData.porCompletar.length - 20} más</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {previewData.porInactivar?.length > 0 && (
                    <div className="sincr-detail-section">
                      <h4 className="sincr-detail-title sincr-detail-title--orange">
                        <FiUserMinus /> A inactivar ({previewData.porInactivar.length})
                      </h4>
                      <ul className="sincr-detail-list">
                        {previewData.porInactivar.slice(0, 20).map((e, i) => (
                          <li key={i}><b>{e.identificacion}</b> — {e.nombre}</li>
                        ))}
                        {previewData.porInactivar.length > 20 && (
                          <li className="sincr-detail-more">… y {previewData.porInactivar.length - 20} más</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {previewData.cantidadPorCrear === 0 && (previewData.cantidadPorCompletar ?? 0) === 0 && previewData.cantidadPorInactivar === 0 && (
                    <p className="sincr-nochanges">No hay cambios pendientes. La base de datos ya está sincronizada con el archivo.</p>
                  )}
                </div>
                <div className="sincr-modal-footer">
                  <button className="btn-action btn-outline" onClick={() => setSincrModal({ open: false, data: null })}>
                    Cancelar
                  </button>
                  {(previewData.cantidadPorCrear > 0 || (previewData.cantidadPorCompletar ?? 0) > 0 || previewData.cantidadPorInactivar > 0) && (
                    <button
                      className="btn-action btn-primary"
                      onClick={handleConfirmarSincronizar}
                      disabled={sincronizando}
                    >
                      {sincronizando ? 'Aplicando cambios...' : 'Proceder'}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* PASO 2 — RESULTADO */}
            {sincrStep === 'resultado' && sincrModal.data && (
              <>
                <div className="sincr-modal-header sincr-modal-header--red">
                  <h3>Sincronización completada</h3>
                  <button className="sincr-modal-close" onClick={() => setSincrModal({ open: false, data: null })}>
                    <FiX />
                  </button>
                </div>
                <div className="sincr-modal-body">
                  <p className="sincr-modal-msg">{sincrModal.data.message}</p>
                  <div className="sincr-stats">
                    <div className="sincr-stat sincr-stat--green">
                      <FiUserPlus className="sincr-stat-icon" />
                      <span className="sincr-stat-num">{sincrModal.data.creados}</span>
                      <span className="sincr-stat-lbl">Creados</span>
                    </div>
                    {(sincrModal.data.completados ?? 0) > 0 && (
                      <div className="sincr-stat sincr-stat--teal">
                        <FiCheckCircle className="sincr-stat-icon" />
                        <span className="sincr-stat-num">{sincrModal.data.completados}</span>
                        <span className="sincr-stat-lbl">Completados</span>
                      </div>
                    )}
                    <div className="sincr-stat sincr-stat--orange">
                      <FiUserMinus className="sincr-stat-icon" />
                      <span className="sincr-stat-num">{sincrModal.data.inactivados}</span>
                      <span className="sincr-stat-lbl">Inactivados</span>
                    </div>
                    <div className="sincr-stat sincr-stat--blue">
                      <FiCheckCircle className="sincr-stat-icon" />
                      <span className="sincr-stat-num">{sincrModal.data.totalArchivo}</span>
                      <span className="sincr-stat-lbl">En archivo</span>
                    </div>
                  </div>
                  {sincrModal.data.errores?.length > 0 && (
                    <div className="sincr-errors">
                      <h4>Errores ({sincrModal.data.errores.length})</h4>
                      <ul>
                        {sincrModal.data.errores.map((e, i) => (
                          <li key={i}><b>{e.identificacion}</b>: {e.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="sincr-modal-footer">
                  <button className="btn-action btn-primary" onClick={() => setSincrModal({ open: false, data: null })}>
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Postulants;
