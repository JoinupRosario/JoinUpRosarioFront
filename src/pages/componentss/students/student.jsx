import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FiSearch,
  FiRefreshCw,
  FiDownload,
  FiFileText,
  FiActivity,
  FiEdit,
  FiAlertCircle,
  FiX,
  FiUploadCloud,
  FiChevronDown,
  FiCheckCircle,
  FiInfo,
  FiUsers,
  FiLoader,
  FiUserPlus,
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import '../../styles/student.css';

const normalize = (str) =>
  (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const ESTADOS_PRACTICA = ['AUTORIZADO', 'NO AUTORIZADO', 'EN REVISION'];

const createAlert = (icon, title, text, confirmButtonText = 'Aceptar') =>
  Swal.fire({ icon, title, text, confirmButtonText, confirmButtonColor: '#c41e3a', background: '#fff', color: '#333' });

const Student = ({ onVolver }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal UXXI
  const [showUxxiModal, setShowUxxiModal] = useState(false);
  const [loadingParams, setLoadingParams] = useState(false);

  // Datos para filtros
  const [sedes, setSedes] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [tiposPractica, setTiposPractica] = useState([]);
  const [loadParamsError, setLoadParamsError] = useState(null);

  // Valores seleccionados en el modal
  const [filtros, setFiltros] = useState({
    sede: '',
    nivel: '',
    programa: '',
    periodo: '',
    tipoPractica: '',
    estado: '',
  });

  // Buscador de programa dentro del modal
  const [progSearch, setProgSearch] = useState('');
  const [progDropOpen, setProgDropOpen] = useState(false);
  const progRef = useRef(null);

  // Reglas curriculares aplicables
  const [reglasAplicables, setReglasAplicables] = useState([]);
  const [loadingReglas, setLoadingReglas] = useState(false);
  const [reglasBuscadas, setReglasBuscadas] = useState(false);

  // Modal de preview / progreso
  const [showPreviewModal, setShowPreviewModal]   = useState(false);
  const [loadingPreview, setLoadingPreview]        = useState(false);
  const [previewData, setPreviewData]              = useState(null);
  const [confirmando, setConfirmando]              = useState(false);
  const [creandoUsuarios, setCreandoUsuarios]      = useState(false);

  // Helpers de alertas — deben ir ANTES de cualquier callback que los use
  const showFuncionalidadEnDesarrollo = useCallback((fn) =>
    createAlert('info', 'Funcionalidad en Desarrollo', `"${fn}" estará disponible próximamente.`), []);
  const showError = useCallback((title, text) => createAlert('error', title, text), []);

  // Cargar estudiantes habilitados desde BD
  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/estudiantes-habilitados', { params: { limit: 15 } });
      setStudents(data.data || []);
    } catch (err) {
      showError('Error', 'No se pudieron cargar los estudiantes');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  // Cargar datos para los filtros del modal
  const loadModalParams = useCallback(async () => {
    setLoadingParams(true);
    setLoadParamsError(null);
    try {
      const [sedesRes, programasRes, periodosRes, itemsRes] = await Promise.all([
        api.get('/sucursales', { params: { limit: 200 } }).catch(e => { console.error('[sedes]', e); return { data: [] }; }),
        api.get('/program-faculties', { params: { activo: 'SI', limit: 500, status: 'ACTIVE' } }).catch(e => { console.error('[programas]', e); return { data: [] }; }),
        api.get('/periodos', { params: { estado: 'Activo', limit: 100, tipo: 'practica' } }).catch(e => { console.error('[periodos]', e); return { data: [] }; }),
        api.get('/locations/items/L_PRACTICE_TYPE', { params: { limit: 100 } }).catch(e => { console.error('[tipos]', e); return { data: [] }; }),
      ]);

      // Sedes: campo "nombre"
      const sedesData = sedesRes.data?.data || sedesRes.data || [];
      setSedes(Array.isArray(sedesData) ? sedesData : []);

      // Programas activos con activo=SI
      const progRaw = programasRes.data?.data || programasRes.data || [];
      const progData = (Array.isArray(progRaw) ? progRaw : []).filter(pf => pf.activo === 'SI');
      setProgramas(progData);

      // Niveles únicos: solo nombres completos (>3 chars), normalizados para deduplicar acentos, solo de programas activos
      const nivelesRaw = progData
        .filter(pf => pf.status === 'ACTIVE')
        .map(pf => (pf.programId?.labelLevel || pf.programId?.level || '').trim())
        .filter(n => n.length > 3); // descarta siglas como DO, MA, PR, ES
      const nivelesUnicos = [...new Map(nivelesRaw.map(n => [normalize(n), n])).values()].sort();
      setNiveles(nivelesUnicos);

      // Periodos: campo "codigo"
      const perRaw = periodosRes.data?.data || periodosRes.data || [];
      setPeriodos(Array.isArray(perRaw) ? perRaw : []);

      // Tipos de práctica: campo "value"
      const itemsRaw = itemsRes.data?.data || itemsRes.data || [];
      setTiposPractica(Array.isArray(itemsRaw) ? itemsRaw : []);
    } catch (err) {
      console.error('[loadModalParams]', err);
      setLoadParamsError('Error cargando parámetros. Intenta de nuevo.');
    } finally {
      setLoadingParams(false);
    }
  }, []);

  const openUxxiModal = () => {
    setShowUxxiModal(true);
    setFiltros({ sede: '', nivel: '', programa: '', periodo: '', tipoPractica: '', estado: '' });
    setProgSearch('');
    setReglasAplicables([]);
    setReglasBuscadas(false);
    setPreviewData(null);
    loadModalParams();
  };

  // Lanzar el proceso de preview (SFTP + OSB + reglas)
  const handleBuscarYCargar = useCallback(async () => {
    const camposFaltantes = [
      !filtros.sede         && 'Sede',
      !filtros.programa     && 'Programa',
      !filtros.periodo      && 'Periodo académico',
      !filtros.tipoPractica && 'Tipo de práctica',
    ].filter(Boolean);

    if (camposFaltantes.length > 0) {
      createAlert('warning', 'Campos requeridos',
        `Por favor completa los siguientes campos antes de continuar:\n\n• ${camposFaltantes.join('\n• ')}`
      );
      return;
    }
    const programaObj  = programas.find(p => p._id === filtros.programa);
    const periodoObj   = periodos.find(p => p._id === filtros.periodo);
    const codigoPrograma = programaObj?.code || '';

    setShowPreviewModal(true);
    setLoadingPreview(true);
    setPreviewData(null);
    try {
      // Timeout extendido: SFTP + N llamadas OSB pueden tardar varios minutos
      const { data } = await api.post('/estudiantes-habilitados/preview-uxxi', {
        programaFacultadId: filtros.programa,
        codigoPrograma,
        periodoId:          filtros.periodo,
        codigoPeriodo:      periodoObj?.codigo || '',
        tipoPracticaId:     filtros.tipoPractica || null,
        sedeId:             filtros.sede || null,
      }, { timeout: 300000 }); // 5 minutos
      setPreviewData(data);
    } catch (e) {
      const msg = e.code === 'ECONNABORTED'
        ? 'El proceso tardó demasiado. El servidor sigue procesando; inténtalo con menos estudiantes o verifica la conexión con SFTP/OSB.'
        : (e.response?.data?.message || e.message);
      setPreviewData({ error: msg });
    } finally {
      setLoadingPreview(false);
    }
  }, [filtros, programas, periodos]);

  // Confirmar cargue → guarda en BD
  const handleConfirmarCargue = useCallback(async () => {
    if (!previewData?.estudiantes?.length) return;
    const programaObj = programas.find(p => p._id === filtros.programa);
    const periodoObj  = periodos.find(p => p._id === filtros.periodo);
    setConfirmando(true);
    try {
      const { data } = await api.post('/estudiantes-habilitados/confirmar-cargue', {
        estudiantes:        previewData.estudiantes,
        programaFacultadId: filtros.programa,
        codigoPrograma:     programaObj?.code || '',
        periodoId:          filtros.periodo,
        codigoPeriodo:      periodoObj?.codigo || '',
        tipoPracticaId:     filtros.tipoPractica || null,
        sedeId:             filtros.sede || null,
      });
      setShowPreviewModal(false);
      setShowUxxiModal(false);
      loadStudents();
      createAlert('success', 'Cargue exitoso', data.message);
    } catch (e) {
      createAlert('error', 'Error al confirmar', e.response?.data?.message || e.message);
    } finally {
      setConfirmando(false);
    }
  }, [previewData, filtros, programas, periodos, loadStudents]);

  // Crear User + Postulant para los estudiantes del preview que no existen en BD
  const handleCrearUsuariosBD = useCallback(async () => {
    if (!previewData?.estudiantes) return;
    const sinBD = previewData.estudiantes.filter(e => !e.existeEnBD);
    if (sinBD.length === 0) return;

    setCreandoUsuarios(true);
    try {
      const { data } = await api.post('/estudiantes-habilitados/crear-usuarios-bd', {
        estudiantes: sinBD,
        cargadoPor:  'sistema',
      });

      // Actualizar previewData: marcar los creados como existeEnBD=true
      const creadosMap = {};
      (data.creados || []).forEach(c => { creadosMap[c.identificacion] = c; });

      setPreviewData(prev => ({
        ...prev,
        estudiantes: prev.estudiantes.map(e => {
          if (creadosMap[e.identificacion]) {
            return { ...e, existeEnBD: true, userId: creadosMap[e.identificacion].userId, postulantId: creadosMap[e.identificacion].postulantId };
          }
          return e;
        }),
      }));

      const msg = [
        data.creados?.length  && `${data.creados.length} usuarios creados`,
        data.omitidos?.length && `${data.omitidos.length} omitidos`,
        data.errores?.length  && `${data.errores.length} con error`,
      ].filter(Boolean).join(', ');

      createAlert('success', 'Usuarios registrados', msg || data.message);
    } catch (e) {
      createAlert('error', 'Error al crear usuarios', e.response?.data?.message || e.message);
    } finally {
      setCreandoUsuarios(false);
    }
  }, [previewData]);

  // Auto-buscar reglas cuando cambian periodo o programa
  useEffect(() => {
    if (!showUxxiModal) return;
    if (!filtros.periodo || !filtros.programa) {
      setReglasAplicables([]);
      setReglasBuscadas(false);
      return;
    }
    let cancelled = false;
    const fetchReglas = async () => {
      setLoadingReglas(true);
      setReglasBuscadas(false);
      try {
        const { data } = await api.get('/condiciones-curriculares', {
          params: { periodo: filtros.periodo, estado: 'ACTIVE', limit: 200 },
        });
        if (cancelled) return;
        const todasReglas = data.data || [];
        const filtradas = todasReglas.filter(r => {
          const progs = r.programas || [];
          if (progs.length === 0) return true;
          return progs.some(p => (p?._id || p) === filtros.programa);
        });
        setReglasAplicables(filtradas);
      } catch (e) {
        if (!cancelled) { console.error('[buscarReglasAplicables]', e); setReglasAplicables([]); }
      } finally {
        if (!cancelled) { setLoadingReglas(false); setReglasBuscadas(true); }
      }
    };
    fetchReglas();
    return () => { cancelled = true; };
  }, [filtros.periodo, filtros.programa, showUxxiModal]);

  // Cerrar dropdown de programa al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (progRef.current && !progRef.current.contains(e.target)) setProgDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Programas filtrados por búsqueda y nivel
  const programasFiltrados = programas.filter(pf => {
    const matchNivel = !filtros.nivel || normalize(pf.programId?.labelLevel || '') === normalize(filtros.nivel);
    const q = normalize(progSearch);
    const matchSearch = !q ||
      normalize(pf.code).includes(q) ||
      normalize(pf.programId?.name).includes(q);
    return matchNivel && matchSearch;
  });

  const programaSeleccionado = programas.find(pf => pf._id === filtros.programa);


  const filteredStudents = students.filter(s => {
    const q = searchTerm.toLowerCase();
    return !q ||
      s.identificacion?.toLowerCase().includes(q) ||
      s.correo?.toLowerCase().includes(q) ||
      s.nombres?.toLowerCase().includes(q) ||
      s.apellidos?.toLowerCase().includes(q) ||
      s.codigoPrograma?.toLowerCase().includes(q) ||
      s.nombrePrograma?.toLowerCase().includes(q) ||
      s.codigoPeriodo?.toLowerCase().includes(q);
  });

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="student-container">

      {/* ── Modal Preview / Confirmación ─────────────────────────────────── */}
      {showPreviewModal && (
        <div className="uxxi-modal-overlay uxxi-modal-overlay--preview" onClick={() => { if (!loadingPreview && !confirmando) setShowPreviewModal(false); }}>
          <div className="uxxi-modal uxxi-modal--preview" onClick={e => e.stopPropagation()}>

            <div className="uxxi-modal-header">
              <div className="uxxi-modal-header-left">
                <FiUsers className="uxxi-modal-icon" />
                <div>
                  <h3 className="uxxi-modal-title">Resultado del análisis UXXI</h3>
                  <p className="uxxi-modal-subtitle">Revisa los estudiantes antes de confirmar el cargue</p>
                </div>
              </div>
              {!loadingPreview && !confirmando && (
                <button className="uxxi-modal-close" onClick={() => setShowPreviewModal(false)}><FiX /></button>
              )}
            </div>

            {/* Estado: cargando */}
            {loadingPreview && (
              <div className="uxxi-preview-loading">
                <div className="uxxi-preview-spinner" />
                <div>
                  <p className="uxxi-preview-loading-title">Procesando estudiantes...</p>
                  <p className="uxxi-preview-loading-sub">Descargando archivo SFTP, consultando OSB y evaluando reglas curriculares. Esto puede tardar unos minutos.</p>
                </div>
              </div>
            )}

            {/* Error */}
            {!loadingPreview && previewData?.error && (
              <div className="uxxi-preview-error">
                <FiAlertCircle />
                <span>{previewData.error}</span>
              </div>
            )}

            {/* Resultados */}
            {!loadingPreview && previewData && !previewData.error && (
              <>
                {/* Resumen */}
                <div className="uxxi-preview-summary">
                  <div className="uxxi-preview-stat uxxi-preview-stat--total">
                    <span className="uxxi-preview-stat-num">{previewData.total}</span>
                    <span className="uxxi-preview-stat-lbl">Total</span>
                  </div>
                  <div className="uxxi-preview-stat uxxi-preview-stat--auth">
                    <span className="uxxi-preview-stat-num">{previewData.autorizados}</span>
                    <span className="uxxi-preview-stat-lbl">Autorizados</span>
                  </div>
                  <div className="uxxi-preview-stat uxxi-preview-stat--noauth">
                    <span className="uxxi-preview-stat-num">{previewData.noAutorizados}</span>
                    <span className="uxxi-preview-stat-lbl">No autorizados</span>
                  </div>
                  <div className="uxxi-preview-stat uxxi-preview-stat--rev">
                    <span className="uxxi-preview-stat-num">{previewData.enRevision}</span>
                    <span className="uxxi-preview-stat-lbl">En revisión</span>
                  </div>
                </div>

                {previewData.mensaje && (
                  <div className="uxxi-preview-msg"><FiInfo /> {previewData.mensaje}</div>
                )}

                {/* Tabla de estudiantes */}
                {previewData.estudiantes?.length > 0 && (
                  <div className="uxxi-preview-table-wrap">
                    <table className="uxxi-preview-table">
                      <thead>
                        <tr>
                          <th>Identificación</th>
                          <th>Nombres</th>
                          <th>Apellidos</th>
                          <th>Programa</th>
                          <th>En BD</th>
                          <th>Estado curricular</th>
                          <th>Reglas evaluadas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.estudiantes.map((est, i) => (
                          <tr key={i}>
                            <td className="uxxi-prev-mono">{est.identificacion}</td>
                            <td>{est.nombres}</td>
                            <td>{est.apellidos}</td>
                            <td className="uxxi-prev-mono">{est.codigoPrograma}</td>
                            <td>
                              {est.existeEnBD
                                ? <span className="uxxi-prev-badge uxxi-prev-badge--si">Sí</span>
                                : <span className="uxxi-prev-badge uxxi-prev-badge--no">No</span>}
                            </td>
                            <td>
                              <span className={`uxxi-prev-estado uxxi-prev-estado--${est.estadoCurricular?.toLowerCase()}`}>
                                {est.estadoCurricular?.replace('_', ' ')}
                              </span>
                            </td>
                            <td>
                              {est.errorOSB
                                ? <span className="uxxi-prev-osb-error" title={est.errorOSB}>Error OSB</span>
                                : est.reglasEvaluadas?.length === 0
                                  ? <span className="uxxi-prev-sin-reglas">Sin reglas</span>
                                  : est.reglasEvaluadas.map((r, ri) => (
                                      <span key={ri} className={`uxxi-prev-regla-pill ${r.cumple ? 'cumple' : 'no-cumple'}`} title={r.reglaNombre}>
                                        {r.cumple ? '✓' : '✗'} {r.reglaNombre}
                                      </span>
                                    ))
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            <div className="uxxi-modal-footer">
              <button
                className="uxxi-btn-cancel"
                onClick={() => setShowPreviewModal(false)}
                disabled={loadingPreview || confirmando || creandoUsuarios}
              >
                Cancelar
              </button>

              {/* Botón: crear usuarios que aún no existen en BD */}
              {!loadingPreview && previewData && !previewData.error &&
               previewData.estudiantes?.some(e => !e.existeEnBD) && (
                <button
                  className="uxxi-btn-secondary"
                  onClick={handleCrearUsuariosBD}
                  disabled={creandoUsuarios || confirmando}
                  title="Crea el usuario y perfil de postulante en la BD para los estudiantes que aún no existen"
                >
                  <FiUserPlus style={{ marginRight: 6 }} />
                  {creandoUsuarios
                    ? 'Creando...'
                    : `Crear en BD (${previewData.estudiantes.filter(e => !e.existeEnBD).length} sin registro)`
                  }
                </button>
              )}

              {!loadingPreview && previewData && !previewData.error && previewData.total > 0 && (
                <button
                  className="uxxi-btn-primary"
                  onClick={handleConfirmarCargue}
                  disabled={confirmando || creandoUsuarios}
                >
                  <FiUploadCloud style={{ marginRight: 6 }} />
                  {confirmando ? 'Guardando...' : `Confirmar cargue (${previewData.total} estudiantes)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Cargar UXXI */}
      {showUxxiModal && (
        <div className="uxxi-modal-overlay" onClick={() => setShowUxxiModal(false)}>
          <div className="uxxi-modal" onClick={e => e.stopPropagation()}>
            <div className="uxxi-modal-header">
              <div className="uxxi-modal-header-left">
                <FiUploadCloud className="uxxi-modal-icon" />
                <div>
                  <h3 className="uxxi-modal-title">Cargar estudiantes UXXI</h3>
                  <p className="uxxi-modal-subtitle">Selecciona los filtros para la carga desde el archivo UXXI</p>
                </div>
              </div>
              <button className="uxxi-modal-close" onClick={() => setShowUxxiModal(false)}><FiX /></button>
            </div>

            {loadingParams ? (
              <div className="uxxi-modal-loading">
                <div className="loading-spinner" style={{ width: 32, height: 32 }} />
                <span>Cargando parámetros...</span>
              </div>
            ) : loadParamsError ? (
              <div className="uxxi-modal-loading" style={{ color: '#c41e3a' }}>
                <FiAlertCircle style={{ fontSize: 28 }} />
                <span>{loadParamsError}</span>
              </div>
            ) : (
              <div className="uxxi-modal-body">
                <div className="uxxi-filters-grid">

                  {/* Sede */}
                  <div className="uxxi-field">
                    <label className="uxxi-label">Sede</label>
                    <select className="uxxi-select" value={filtros.sede} onChange={e => setFiltros(f => ({ ...f, sede: e.target.value }))}>
                      <option value="">— Seleccione una sede —</option>
                      {sedes.map(s => (
                        <option key={s._id} value={s._id}>{s.nombre}</option>
                      ))}
                    </select>
                    {sedes.length === 0 && <span className="uxxi-field-hint">Sin sedes disponibles</span>}
                  </div>

                  {/* Nivel */}
                  <div className="uxxi-field">
                    <label className="uxxi-label">Nivel</label>
                    <select className="uxxi-select" value={filtros.nivel} onChange={e => setFiltros(f => ({ ...f, nivel: e.target.value, programa: '' }))}>
                      <option value="">— Seleccione un nivel —</option>
                      {niveles.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    {niveles.length === 0 && <span className="uxxi-field-hint">Sin niveles disponibles</span>}
                  </div>

                  {/* Programa – buscador custom */}
                  <div className="uxxi-field uxxi-field--full" ref={progRef}>
                    <label className="uxxi-label">Programa</label>
                    <div className="uxxi-prog-wrapper">
                      <input
                        className="uxxi-prog-input"
                        placeholder={programaSeleccionado
                          ? `${programaSeleccionado.code} — ${programaSeleccionado.programId?.name || ''}`
                          : 'Buscar por código o nombre...'}
                        value={progSearch}
                        onChange={e => { setProgSearch(e.target.value); setProgDropOpen(true); setFiltros(f => ({ ...f, programa: '' })); }}
                        onFocus={() => setProgDropOpen(true)}
                      />
                      <FiChevronDown className="uxxi-prog-chevron" />
                      {progDropOpen && (
                        <div className="uxxi-prog-dropdown">
                          <div
                            className="uxxi-prog-option uxxi-prog-option--empty-val"
                            onClick={() => { setFiltros(f => ({ ...f, programa: '' })); setProgSearch(''); setProgDropOpen(false); }}
                          >
                            Todos los programas
                          </div>
                          {programasFiltrados.length === 0 ? (
                            <div className="uxxi-prog-empty">Sin resultados</div>
                          ) : programasFiltrados.map(pf => (
                            <div
                              key={pf._id}
                              className={`uxxi-prog-option ${filtros.programa === pf._id ? 'uxxi-prog-option--selected' : ''}`}
                              onClick={() => {
                                setFiltros(f => ({ ...f, programa: pf._id }));
                                setProgSearch('');
                                setProgDropOpen(false);
                              }}
                            >
                              <span className="uxxi-prog-code">{pf.code}</span>
                              <span className="uxxi-prog-name">{pf.programId?.name || '—'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Periodo */}
                  <div className="uxxi-field">
                    <label className="uxxi-label">Periodo académico</label>
                    <select className="uxxi-select" value={filtros.periodo} onChange={e => setFiltros(f => ({ ...f, periodo: e.target.value }))}>
                      <option value="">— Seleccione un periodo —</option>
                      {periodos.map(p => (
                        <option key={p._id} value={p._id}>{p.codigo}</option>
                      ))}
                    </select>
                    {periodos.length === 0 && <span className="uxxi-field-hint">Sin periodos activos</span>}
                  </div>

                  {/* Tipo de práctica */}
                  <div className="uxxi-field">
                    <label className="uxxi-label">Tipo de práctica</label>
                    <select className="uxxi-select" value={filtros.tipoPractica} onChange={e => setFiltros(f => ({ ...f, tipoPractica: e.target.value }))}>
                      <option value="">— Seleccione un tipo —</option>
                      {tiposPractica.map(t => (
                        <option key={t._id} value={t._id}>{t.value}</option>
                      ))}
                    </select>
                    {tiposPractica.length === 0 && <span className="uxxi-field-hint">Sin tipos disponibles</span>}
                  </div>


                </div>

                {/* ── Reglas curriculares aplicables ── */}
                {(reglasBuscadas || loadingReglas) && (
                  <div className="uxxi-reglas-section">
                    <div className="uxxi-reglas-header">
                      <FiCheckCircle className="uxxi-reglas-icon" />
                      <span className="uxxi-reglas-title">Reglas curriculares aplicables</span>
                      {!loadingReglas && (
                        <span className="uxxi-reglas-count">
                          {reglasAplicables.length} {reglasAplicables.length === 1 ? 'regla' : 'reglas'}
                        </span>
                      )}
                    </div>

                    {loadingReglas ? (
                      <div className="uxxi-reglas-loading">
                        <div className="loading-spinner" style={{ width: 20, height: 20 }} />
                        <span>Buscando reglas...</span>
                      </div>
                    ) : reglasAplicables.length === 0 ? (
                      <div className="uxxi-reglas-empty">
                        <FiInfo className="uxxi-reglas-empty-icon" />
                        <span>No hay reglas curriculares activas para los filtros seleccionados.</span>
                      </div>
                    ) : (
                      <div className="uxxi-reglas-list">
                        {reglasAplicables.map(r => (
                          <div key={r._id} className="uxxi-regla-card">
                            <div className="uxxi-regla-top">
                              <span className="uxxi-regla-nombre">{r.nombre}</span>
                              <span className={`uxxi-regla-logica uxxi-regla-logica--${(r.logica || 'AND').toLowerCase()}`}>
                                {r.logica || 'AND'}
                              </span>
                            </div>
                            <div className="uxxi-regla-meta">
                              <span className="uxxi-regla-facultad">{r.facultad?.name || '—'}</span>
                              <span className="uxxi-regla-sep">·</span>
                              <span className="uxxi-regla-conds">
                                {(r.condiciones || []).length} condición{(r.condiciones || []).length !== 1 ? 'es' : ''}
                              </span>
                            </div>

                            {/* Programas asociados */}
                            <div className="uxxi-regla-programas">
                              {(r.programas || []).length === 0 ? (
                                <span className="uxxi-regla-todos-badge">Aplica a todos los programas</span>
                              ) : (
                                (r.programas || []).map((p, i) => {
                                  const code = p?.code || '';
                                  const name = p?.programId?.name || p?.name || '';
                                  const isSelected = (p?._id || p) === filtros.programa;
                                  return (
                                    <span
                                      key={p?._id || i}
                                      className={`uxxi-regla-prog-badge ${isSelected ? 'uxxi-regla-prog-badge--active' : ''}`}
                                      title={name}
                                    >
                                      {code || name}
                                    </span>
                                  );
                                })
                              )}
                            </div>

                            {(r.condiciones || []).length > 0 && (
                              <div className="uxxi-regla-conds-list">
                                {r.condiciones.map((c, i) => (
                                  <span key={i} className="uxxi-regla-cond-pill">
                                    {c.variable} {c.operador} {c.valor}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="uxxi-modal-footer">
              <button className="uxxi-btn-cancel" onClick={() => setShowUxxiModal(false)}>Cancelar</button>
              <button
                className="uxxi-btn-primary"
                onClick={handleBuscarYCargar}
              >
                <FiUploadCloud style={{ marginRight: 6 }} />
                Buscar y cargar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de acciones */}
      <div className="student-actions">
        <button className="uxxi-btn-primary uxxi-btn-header" onClick={openUxxiModal}>
          <FiUploadCloud className="btn-icon" />
          Cargar estudiantes UXXI
        </button>
        <button className="btn-action btn-outline" onClick={() => showFuncionalidadEnDesarrollo('Buscar estudiantes')}>
          <FiSearch className="btn-icon" /> Buscar estudiantes
        </button>
        <button className="btn-action btn-outline" onClick={() => showFuncionalidadEnDesarrollo('Cambiar estado')}>
          <FiEdit className="btn-icon" /> Cambiar estado
        </button>
        <button className="btn-action btn-outline" onClick={() => showFuncionalidadEnDesarrollo('Exportar')}>
          <FiDownload className="btn-icon" /> Exportar
        </button>
        <button className="btn-action btn-outline" onClick={() => showFuncionalidadEnDesarrollo('Historial de estados')}>
          <FiActivity className="btn-icon" /> Historial de estados
        </button>
        <button className="btn-action btn-outline" onClick={() => showFuncionalidadEnDesarrollo('Prácticas legalizadas')}>
          <FiFileText className="btn-icon" /> Prácticas legalizadas
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="search-container">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por código, correo, nombres, apellidos, programa, período..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Tabla de estudiantes */}
      <div className="student-table-container">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando estudiantes...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="empty-state">
            <FiAlertCircle className="empty-icon" />
            <p>{searchTerm ? 'No se encontraron estudiantes con los criterios de búsqueda' : 'No hay estudiantes registrados'}</p>
          </div>
        ) : (
          <table className="student-table">
            <thead>
              <tr>
                <th>CÓDIGO</th>
                <th>CORREO ELECTRÓNICO</th>
                <th>NOMBRES</th>
                <th>APELLIDOS</th>
                <th>PROGRAMA AUTORIZADO</th>
                <th>PERÍODO AUTORIZADO</th>
                <th>TIPO DE PRÁCTICA</th>
                <th>CUMPLE CONDICIONES</th>
                <th>ESTADO FINAL</th>
                <th>ACTUALIZACIÓN</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => {
                const estadoClass = (s.estadoCurricular || '').toLowerCase().replace('_', '-');
                const estadoFinalClass = (s.estadoFinal || '').toLowerCase().replace('_', '-');
                return (
                  <tr key={s._id}>
                    <td>{s.identificacion || '-'}</td>
                    <td>{s.correo || '-'}</td>
                    <td>{s.nombres || '-'}</td>
                    <td>{s.apellidos || '-'}</td>
                    <td>
                      {s.codigoPrograma
                        ? <><strong>{s.codigoPrograma}</strong>{s.nombrePrograma ? ` — ${s.nombrePrograma}` : ''}</>
                        : '-'}
                    </td>
                    <td>{s.codigoPeriodo || s.periodo?.codigo || '-'}</td>
                    <td>{s.tipoPractica?.value || '-'}</td>
                    <td>
                      <span className={`status-badge status-badge--${estadoClass}`}>
                        {(s.estadoCurricular || '-').replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-badge--${estadoFinalClass}`}>
                        {(s.estadoFinal || '-').replace('_', ' ')}
                      </span>
                    </td>
                    <td>{formatDate(s.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Student;
