import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch,
  FiRefreshCw,
  FiDownload,
  FiActivity,
  FiAlertCircle,
  FiX,
  FiUploadCloud,
  FiCheckCircle,
  FiInfo,
  FiUsers,
  FiLoader,
  FiUserPlus,
  FiBook,
  FiUser,
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import '../../styles/student.css';

const normalize = (str) =>
  (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const ESTADOS_PRACTICA = ['AUTORIZADO', 'NO AUTORIZADO', 'EN REVISION'];

// Pestañas por estado (valores del backend: enum en modelo)
const ESTADOS_TABS = [
  { id: '', label: 'Todos' },
  { id: 'EN_REVISION', label: 'En revisión' },
  { id: 'NO_AUTORIZADO', label: 'No autorizado' },
  { id: 'AUTORIZADO', label: 'Autorizado' },
];

const PAGE_SIZE = 15;

/** Oculta visualmente el campo Sede al traer de UXXI; filtros y API se mantienen. */
const HIDE_SUCURSALES_UI = true;

const createAlert = (icon, title, text, confirmButtonText = 'Aceptar') =>
  Swal.fire({ icon, title, text, confirmButtonText, confirmButtonColor: '#c41e3a', background: '#fff', color: '#333' });

const Student = ({ onVolver }) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabEstado, setTabEstado] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: PAGE_SIZE });
  const [searchDebounced, setSearchDebounced] = useState('');

  // Modal UXXI
  const [showUxxiModal, setShowUxxiModal] = useState(false);
  const [loadingParams, setLoadingParams] = useState(false);

  // Datos para filtros
  const [sedes, setSedes] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  /** programaFacultadId → id ítem tipo de práctica (reglas programa–tipo) */
  const [tipoPracticaPorPrograma, setTipoPracticaPorPrograma] = useState({});
  const [loadParamsError, setLoadParamsError] = useState(null);
  const [loadingProgramasPeriodo, setLoadingProgramasPeriodo] = useState(false);

  // Valores seleccionados en el modal
  const [filtros, setFiltros] = useState({
    sede: '',
    nivel: '',
    programasSeleccionados: [],
    periodo: '',
    estado: '',
  });

  // Buscador de programa dentro del modal
  const [progSearch, setProgSearch] = useState('');

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
  const [savingEstadoFinalId, setSavingEstadoFinalId] = useState(null);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [historialData, setHistorialData] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [historialFiltroDoc, setHistorialFiltroDoc] = useState('');
  const [historialFilterInput, setHistorialFilterInput] = useState('');
  // Helpers de alertas — deben ir ANTES de cualquier callback que los use
  const showFuncionalidadEnDesarrollo = useCallback((fn) =>
    createAlert('info', 'Funcionalidad en Desarrollo', `"${fn}" estará disponible próximamente.`), []);
  const showError = useCallback((title, text) => createAlert('error', title, text), []);

  const handleEstadoFinalChange = useCallback(
    async (studentId, nuevoEstado) => {
      setSavingEstadoFinalId(studentId);
      try {
        await api.patch(`/estudiantes-habilitados/${studentId}/estado-final`, {
          estadoFinal: nuevoEstado,
        });
        setStudents((prev) =>
          prev.map((s) => (s._id === studentId ? { ...s, estadoFinal: nuevoEstado } : s))
        );
      } catch (e) {
        showError('Error', e.response?.data?.message || 'No se pudo actualizar el estado final');
      } finally {
        setSavingEstadoFinalId(null);
      }
    },
    [showError]
  );

  // Cargar estudiantes habilitados desde BD (paginado y filtrado por estado/búsqueda)
  const loadStudents = useCallback(async (pageNum = 1, estadoFilter = '', search = '') => {
    try {
      setLoading(true);
      const params = {
        page: pageNum,
        limit: PAGE_SIZE,
        ...(estadoFilter && { estadoFinal: estadoFilter }),
        ...(search && search.trim() && { search: search.trim() }),
      };
      const { data } = await api.get('/estudiantes-habilitados', { params });
      setStudents(data.data || []);
      setPagination(data.pagination || { total: 0, pages: 1, limit: PAGE_SIZE });
    } catch (err) {
      showError('Error', 'No se pudieron cargar los estudiantes');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Debounce del término de búsqueda (resetear página al cambiar)
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Cargar lista al cambiar página, pestaña o búsqueda
  useEffect(() => {
    loadStudents(page, tabEstado, searchDebounced);
  }, [page, tabEstado, searchDebounced, loadStudents]);

  const loadHistorial = useCallback(async () => {
    setLoadingHistorial(true);
    try {
      const params = { limit: 300 };
      if (historialFiltroDoc && historialFiltroDoc.trim()) params.identificacion = historialFiltroDoc.trim();
      const { data } = await api.get('/estudiantes-habilitados/historial-estados', { params });
      setHistorialData(data.data || []);
    } catch (e) {
      showError('Error', e.response?.data?.message || 'No se pudo cargar el historial');
      setHistorialData([]);
    } finally {
      setLoadingHistorial(false);
    }
  }, [historialFiltroDoc, showError]);

  useEffect(() => {
    if (showHistorialModal) loadHistorial();
  }, [showHistorialModal, loadHistorial]);

  // Cargar datos para los filtros del modal (periodos = solo los que tienen al menos una regla ACTIVE)
  const loadModalParams = useCallback(async () => {
    setLoadingParams(true);
    setLoadParamsError(null);
    try {
      const [sedesRes, periodosRes] = await Promise.all([
        api.get('/sucursales', { params: { limit: 200 } }).catch(e => { console.error('[sedes]', e); return { data: [] }; }),
        api.get('/estudiantes-habilitados/periodos-con-reglas-activas').catch(e => {
          console.error('[periodos-reglas]', e);
          return { data: { periodos: [] } };
        }),
      ]);

      const sedesData = sedesRes.data?.data || sedesRes.data || [];
      setSedes(Array.isArray(sedesData) ? sedesData : []);

      const perList = periodosRes.data?.periodos || [];
      setPeriodos(Array.isArray(perList) ? perList : []);

      setProgramas([]);
      setNiveles([]);
    } catch (err) {
      console.error('[loadModalParams]', err);
      setLoadParamsError('Error cargando parámetros. Intenta de nuevo.');
    } finally {
      setLoadingParams(false);
    }
  }, []);

  /** Tras elegir periodo: programas y niveles solo de condiciones curriculares ACTIVE de ese periodo */
  const loadProgramasPorPeriodo = useCallback(async (periodoId) => {
    if (!periodoId) {
      setProgramas([]);
      setNiveles([]);
      setTipoPracticaPorPrograma({});
      return;
    }
    setTipoPracticaPorPrograma({});
    setLoadingProgramasPeriodo(true);
    try {
      const { data } = await api.get('/estudiantes-habilitados/programas-uxxi-por-periodo', {
        params: { periodoId },
      });
      const progData = data.programas || [];
      setProgramas(progData);
      const nivelesRaw = progData
        .map((pf) => (pf.programId?.labelLevel || pf.programId?.level || '').trim())
        .filter((n) => n.length > 3);
      const nivelesUnicos = [...new Map(nivelesRaw.map((n) => [normalize(n), n])).values()].sort();
      setNiveles(nivelesUnicos);
    } catch (e) {
      console.error('[loadProgramasPorPeriodo]', e);
      setProgramas([]);
      setNiveles([]);
      showError('Error', e.response?.data?.message || 'No se pudieron cargar los programas del periodo');
    } finally {
      setLoadingProgramasPeriodo(false);
    }
  }, [showError]);

  const openUxxiModal = () => {
    setShowUxxiModal(true);
    setFiltros({ sede: '', nivel: '', programasSeleccionados: [], periodo: '', estado: '' });
    setTipoPracticaPorPrograma({});
    setProgSearch('');
    setReglasAplicables([]);
    setReglasBuscadas(false);
    setPreviewData(null);
    setLoadingProgramasPeriodo(false);
    loadModalParams();
  };

  const periodoSeleccionado = Boolean(filtros.periodo);
  const nivelSeleccionado = Boolean(filtros.nivel);

  // Lanzar el proceso de preview (SFTP + OSB + reglas)
  const handleBuscarYCargar = useCallback(async () => {
    const camposFaltantes = [
      !HIDE_SUCURSALES_UI && !filtros.sede && 'Sede',
      !filtros.periodo && 'Periodo académico',
      !filtros.nivel && 'Nivel',
      (!filtros.programasSeleccionados || filtros.programasSeleccionados.length === 0) && 'Al menos un programa',
    ].filter(Boolean);

    const faltantesTipo = [];
    for (const pid of filtros.programasSeleccionados || []) {
      const pf = programas.find((p) => String(p._id) === String(pid));
      const tipos = pf?.tiposPractica || [];
      const elegido = tipoPracticaPorPrograma[String(pid)];
      if (tipos.length === 0) {
        faltantesTipo.push(`${pf?.code || pid}: sin tipo de práctica en reglas de negocio (programa–facultad)`);
      } else if (tipos.length > 1 && (!elegido || !tipos.some((t) => String(t._id) === String(elegido)))) {
        faltantesTipo.push(`${pf?.code || pid}: elija el tipo de práctica para el cargue`);
      }
    }

    if (camposFaltantes.length > 0) {
      createAlert('warning', 'Campos requeridos',
        `Por favor completa los siguientes campos antes de continuar:\n\n• ${camposFaltantes.join('\n• ')}`
      );
      return;
    }
    if (faltantesTipo.length > 0) {
      createAlert('warning', 'Tipo de práctica por programa',
        faltantesTipo.join('\n• '),
      );
      return;
    }
    const periodoObj = periodos.find(p => p._id === filtros.periodo);
    const programasPayload = (filtros.programasSeleccionados || [])
      .map((id) => {
        const pf = programas.find((p) => String(p._id) === String(id));
        return pf ? { programaFacultadId: pf._id, codigoPrograma: (pf.code || '').trim() } : null;
      })
      .filter((p) => p && p.codigoPrograma);

    if (programasPayload.length === 0) {
      createAlert('warning', 'Programas', 'Los programas seleccionados deben tener código UXXI válido.');
      return;
    }

    setShowPreviewModal(true);
    setLoadingPreview(true);
    setPreviewData(null);
    try {
      const { data } = await api.post('/estudiantes-habilitados/preview-uxxi', {
        programasSeleccionados: programasPayload,
        periodoId: filtros.periodo,
        codigoPeriodo: periodoObj?.codigo || '',
        sedeId: filtros.sede || null,
      }, { timeout: 600000 });
      setPreviewData(data);
    } catch (e) {
      const msg = e.code === 'ECONNABORTED'
        ? 'El proceso tardó demasiado. El servidor sigue procesando; inténtalo con menos estudiantes o verifica la conexión con SFTP/OSB.'
        : (e.response?.data?.message || e.message);
      setPreviewData({ error: msg });
    } finally {
      setLoadingPreview(false);
    }
  }, [filtros, programas, periodos, tipoPracticaPorPrograma]);

  // Confirmar cargue → guarda en BD
  const handleConfirmarCargue = useCallback(async () => {
    if (!previewData?.estudiantes?.length) return;
    const periodoObj = periodos.find((p) => p._id === filtros.periodo);
    setConfirmando(true);
    try {
      const tipoMap = {};
      for (const pid of filtros.programasSeleccionados || []) {
        const pf = programas.find((p) => String(p._id) === String(pid));
        const tipos = pf?.tiposPractica || [];
        const k = String(pid);
        if (tipos.length === 1) tipoMap[k] = String(tipos[0]._id);
        else if (tipoPracticaPorPrograma[k]) tipoMap[k] = tipoPracticaPorPrograma[k];
      }
      const { data } = await api.post('/estudiantes-habilitados/confirmar-cargue', {
        estudiantes: previewData.estudiantes,
        periodoId: filtros.periodo,
        codigoPeriodo: periodoObj?.codigo || '',
        tipoPracticaPorPrograma: tipoMap,
        sedeId: filtros.sede || null,
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
  }, [previewData, filtros, programas, periodos, loadStudents, tipoPracticaPorPrograma]);

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
    const progSel = filtros.programasSeleccionados || [];
    if (!filtros.periodo) {
      setReglasAplicables([]);
      setReglasBuscadas(false);
      return;
    }
    if (progSel.length === 0) {
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
        const setSel = new Set(progSel.map(String));
        const filtradas = todasReglas.filter((r) => {
          const progs = r.programas || [];
          if (progs.length === 0) return true;
          return progs.some((p) => setSel.has(String(p?._id || p)));
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
  }, [filtros.periodo, filtros.programasSeleccionados, showUxxiModal]);

  // Programas: solo tras elegir nivel; únicamente los de ese nivel (misma fuente que el select de niveles)
  const programasFiltrados = programas.filter((pf) => {
    if (!periodoSeleccionado || !filtros.nivel) return false;
    const nivelProg = (pf.programId?.labelLevel || pf.programId?.level || '').trim();
    const matchNivel = normalize(nivelProg) === normalize(filtros.nivel);
    const q = normalize(progSearch);
    const matchSearch = !q ||
      normalize(pf.code).includes(q) ||
      normalize(pf.programId?.name).includes(q);
    return matchNivel && matchSearch;
  });

  const idsSeleccionados = new Set((filtros.programasSeleccionados || []).map(String));

  const toggleProgramaUxxi = (pf, checked) => {
    const id = String(pf._id);
    const tipos = pf.tiposPractica || [];
    setFiltros((f) => {
      const cur = f.programasSeleccionados || [];
      if (checked) return { ...f, programasSeleccionados: [...new Set([...cur, id])] };
      return { ...f, programasSeleccionados: cur.filter((x) => String(x) !== id) };
    });
    setTipoPracticaPorPrograma((prev) => {
      const next = { ...prev };
      if (!checked) {
        delete next[id];
        return next;
      }
      if (tipos.length === 1) next[id] = String(tipos[0]._id);
      else if (tipos.length > 1 && next[id] == null) next[id] = '';
      return next;
    });
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const uxxiBuscarDeshabilitado = useMemo(() => {
    if (!filtros.periodo || !filtros.nivel || loadingProgramasPeriodo || !(filtros.programasSeleccionados?.length)) {
      return true;
    }
    for (const pid of filtros.programasSeleccionados || []) {
      const pf = programas.find((p) => String(p._id) === String(pid));
      const tipos = pf?.tiposPractica || [];
      if (tipos.length === 0) return true;
      if (tipos.length > 1) {
        const el = tipoPracticaPorPrograma[String(pid)];
        if (!el || !tipos.some((t) => String(t._id) === String(el))) return true;
      }
    }
    return false;
  }, [filtros.periodo, filtros.nivel, filtros.programasSeleccionados, loadingProgramasPeriodo, programas, tipoPracticaPorPrograma]);

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
                  <p className="uxxi-preview-loading-sub">Una sola descarga del archivo UXXI (SFTP); luego se consulta OSB y reglas por cada estudiante. Con muchos registros puede tardar varios minutos.</p>
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
                    <span className="uxxi-preview-stat-num">{previewData.cumplenCondiciones ?? previewData.autorizados}</span>
                    <span className="uxxi-preview-stat-lbl">Cumplen condiciones (en revisión)</span>
                  </div>
                  <div className="uxxi-preview-stat uxxi-preview-stat--noauth">
                    <span className="uxxi-preview-stat-num">{previewData.noAutorizados}</span>
                    <span className="uxxi-preview-stat-lbl">No cumplen condiciones</span>
                  </div>
                  <div className="uxxi-preview-stat uxxi-preview-stat--rev">
                    <span className="uxxi-preview-stat-num">{previewData.enRevisionOtros ?? 0}</span>
                    <span className="uxxi-preview-stat-lbl">En revisión (sin reglas / otros)</span>
                  </div>
                </div>

                {previewData.mensaje && (
                  <div className="uxxi-preview-msg"><FiInfo /> {previewData.mensaje}</div>
                )}
                {Array.isArray(previewData.resumenPorPrograma) && previewData.resumenPorPrograma.length > 1 && (
                  <div className="uxxi-preview-msg" style={{ marginTop: 8 }}>
                    <strong>Por programa:</strong>{' '}
                    {previewData.resumenPorPrograma.map((r) => `${r.codigoPrograma}: ${r.total}`).join(' · ')}
                  </div>
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
                                  : est.reglasEvaluadas.map((r, ri) => {
                                      const tipAsig = (r.detalleAsignaturas || [])
                                        .map((d) => `${d.etiqueta}: ${d.motivo}`)
                                        .join('\n');
                                      const tip = [r.reglaNombre, (r.detalle || []).join('; '), tipAsig]
                                        .filter(Boolean)
                                        .join('\n');
                                      return (
                                        <span key={ri} className={`uxxi-prev-regla-pill ${r.cumple ? 'cumple' : 'no-cumple'}`} title={tip || r.reglaNombre}>
                                          {r.cumple ? '✓' : '✗'} {r.reglaNombre}
                                        </span>
                                      );
                                    })
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

      {/* Modal Historial de estados */}
      {showHistorialModal && (
        <div className="uxxi-modal-overlay uxxi-modal-overlay--preview" onClick={() => setShowHistorialModal(false)}>
          <div className="uxxi-modal uxxi-modal--preview" onClick={e => e.stopPropagation()} style={{ maxWidth: 920 }}>
            <div className="uxxi-modal-header">
              <div className="uxxi-modal-header-left">
                <FiActivity className="uxxi-modal-icon" />
                <div>
                  <h3 className="uxxi-modal-title">Historial de estados</h3>
                  <p className="uxxi-modal-subtitle">Trazabilidad de cambios de estado final (cargue y cambios manuales)</p>
                </div>
              </div>
              <button className="uxxi-modal-close" onClick={() => setShowHistorialModal(false)}><FiX /></button>
            </div>
            <div className="uxxi-modal-body">
              <div className="historial-filtro-row">
                <input
                  type="text"
                  placeholder="Filtrar por documento..."
                  value={historialFilterInput}
                  onChange={e => setHistorialFilterInput(e.target.value)}
                  className="historial-filtro-input"
                />
                <button type="button" className="uxxi-btn-secondary" onClick={() => setHistorialFiltroDoc(historialFilterInput)}>
                  Filtrar
                </button>
              </div>
              {loadingHistorial ? (
                <div className="uxxi-preview-loading">
                  <FiLoader className="uxxi-preview-spinner" style={{ animation: 'spin 0.8s linear infinite' }} />
                  <span>Cargando historial...</span>
                </div>
              ) : (
                <div className="historial-table-wrap">
                  <table className="student-table uxxi-prev-table">
                    <thead>
                      <tr>
                        <th>FECHA</th>
                        <th>CÓDIGO</th>
                        <th>ESTUDIANTE</th>
                        <th>PROGRAMA / PERÍODO</th>
                        <th>ESTADO ANTERIOR</th>
                        <th>ESTADO NUEVO</th>
                        <th>TIPO</th>
                        <th>QUIÉN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialData.length === 0 ? (
                        <tr><td colSpan={8} className="historial-empty">No hay registros de historial</td></tr>
                      ) : (
                        historialData.map((h, i) => {
                          const eh = h.estudianteHabilitado || {};
                          return (
                            <tr key={h._id || i}>
                              <td className="uxxi-prev-mono">{new Date(h.createdAt).toLocaleString('es-CO')}</td>
                              <td className="uxxi-prev-mono">{eh.identificacion || '—'}</td>
                              <td>{[eh.nombres, eh.apellidos].filter(Boolean).join(' ') || '—'}</td>
                              <td className="uxxi-prev-mono">{eh.codigoPrograma || '—'} {eh.codigoPeriodo ? ` · ${eh.codigoPeriodo}` : ''}</td>
                              <td><span className={h.estadoAnterior ? `status-badge status-badge--${(h.estadoAnterior || '').toLowerCase().replace('_', '-')}` : ''}>{(h.estadoAnterior || '—').replace('_', ' ')}</span></td>
                              <td><span className={`status-badge status-badge--${(h.estadoNuevo || '').toLowerCase().replace('_', '-')}`}>{(h.estadoNuevo || '').replace('_', ' ')}</span></td>
                              <td>{h.tipo === 'cargue' ? 'Cargue UXXI' : 'Cambio manual'}</td>
                              <td>{h.cambiadoPor || '—'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="uxxi-modal-footer">
              <button type="button" className="uxxi-btn-cancel" onClick={() => setShowHistorialModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cargar UXXI */}
      {showUxxiModal && (
        <div className="uxxi-modal-overlay" onClick={() => setShowUxxiModal(false)}>
          <div className="uxxi-modal uxxi-modal--large" onClick={e => e.stopPropagation()}>
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

                  {/* Fila 1: Periodo + Nivel (dos columnas) */}
                  <div className="uxxi-filters-row uxxi-filters-row--periodo-nivel">
                    <div className="uxxi-field">
                      <label className="uxxi-label">Periodo académico <span className="uxxi-label-req">*</span></label>
                      <select
                        className="uxxi-select"
                        value={filtros.periodo}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFiltros((f) => ({ ...f, periodo: v, nivel: '', programasSeleccionados: [] }));
                          setTipoPracticaPorPrograma({});
                          setProgSearch('');
                          loadProgramasPorPeriodo(v);
                        }}
                      >
                        <option value="">— Seleccione primero el periodo —</option>
                        {periodos.map((p) => (
                          <option key={p._id} value={p._id}>{p.codigo}</option>
                        ))}
                      </select>
                      {periodos.length === 0 && (
                        <span className="uxxi-field-hint">No hay periodos con condición curricular activa. Configúrelas en Condiciones curriculares.</span>
                      )}
                    </div>
                    <div className={`uxxi-field ${!periodoSeleccionado ? 'uxxi-field--blocked' : ''}`}>
                      <label className="uxxi-label">Nivel</label>
                      <select
                        className="uxxi-select"
                        value={filtros.nivel}
                        disabled={!periodoSeleccionado || loadingProgramasPeriodo}
                        onChange={(e) => {
                          setFiltros((f) => ({ ...f, nivel: e.target.value, programasSeleccionados: [] }));
                          setTipoPracticaPorPrograma({});
                        }}
                      >
                        <option value="">{!periodoSeleccionado ? '— Primero elija periodo —' : '— Seleccione un nivel —'}</option>
                        {niveles.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      {periodoSeleccionado && !loadingProgramasPeriodo && niveles.length === 0 && (
                        <span className="uxxi-field-hint">No hay programas en reglas activas para este periodo.</span>
                      )}
                    </div>
                  </div>

                  <div className="uxxi-filters-hint-banner">
                    <p className="uxxi-field-hint uxxi-field-hint--top uxxi-field-hint--banner">
                      Solo se listan periodos de práctica con al menos una regla curricular activa. Elija nivel y programas; el tipo de práctica por programa viene de las reglas de negocio (si hay varios, elija uno para el cargue).
                    </p>
                  </div>

                  {/* Sede: oculto visualmente; filtros.sede y API se mantienen */}
                  {!HIDE_SUCURSALES_UI && (
                  <div className={`uxxi-field ${!periodoSeleccionado ? 'uxxi-field--blocked' : ''}`}>
                    <label className="uxxi-label">Sede</label>
                    <select
                      className="uxxi-select"
                      value={filtros.sede}
                      disabled={!periodoSeleccionado}
                      onChange={(e) => setFiltros((f) => ({ ...f, sede: e.target.value }))}
                    >
                      <option value="">— Seleccione una sede —</option>
                      {sedes.map((s) => (
                        <option key={s._id} value={s._id}>{s.nombre}</option>
                      ))}
                    </select>
                    {sedes.length === 0 && <span className="uxxi-field-hint">Sin sedes disponibles</span>}
                  </div>
                  )}

                  {/* 3) Programas (uno o más): solo tras elegir nivel; lista acotada a ese nivel */}
                  <div
                    className={`uxxi-field uxxi-field--full ${
                      !periodoSeleccionado || loadingProgramasPeriodo || (periodoSeleccionado && !nivelSeleccionado)
                        ? 'uxxi-field--blocked'
                        : ''
                    }`}
                  >
                    <label className="uxxi-label">Programas <span style={{ fontWeight: 400, color: '#9ca3af' }}>(marca uno o más)</span></label>
                    <input
                      className="uxxi-prog-input"
                      placeholder="Filtrar por código o nombre..."
                      value={progSearch}
                      disabled={!periodoSeleccionado || loadingProgramasPeriodo || !nivelSeleccionado}
                      onChange={(e) => setProgSearch(e.target.value)}
                    />
                    <div className="uxxi-prog-multi-toolbar">
                      <span className="uxxi-prog-multi-count">
                        <strong>{filtros.programasSeleccionados?.length || 0}</strong> programa(s) seleccionado(s)
                      </span>
                      <button
                        type="button"
                        className="uxxi-prog-multi-btn"
                        disabled={!periodoSeleccionado || loadingProgramasPeriodo || !nivelSeleccionado}
                        onClick={() => {
                          setFiltros((f) => ({
                            ...f,
                            programasSeleccionados: [
                              ...new Set([...(f.programasSeleccionados || []), ...programasFiltrados.map((p) => String(p._id))]),
                            ],
                          }));
                          setTipoPracticaPorPrograma((prev) => {
                            const next = { ...prev };
                            for (const p of programasFiltrados) {
                              const tid = String(p._id);
                              const tipos = p.tiposPractica || [];
                              if (tipos.length === 1) next[tid] = String(tipos[0]._id);
                              else if (tipos.length > 1 && next[tid] == null) next[tid] = '';
                            }
                            return next;
                          });
                        }}
                      >
                        Marcar listados
                      </button>
                      <button
                        type="button"
                        className="uxxi-prog-multi-btn"
                        disabled={!periodoSeleccionado || loadingProgramasPeriodo || !nivelSeleccionado}
                        onClick={() => {
                          setFiltros((f) => ({ ...f, programasSeleccionados: [] }));
                          setTipoPracticaPorPrograma({});
                        }}
                      >
                        Quitar todos
                      </button>
                    </div>
                    {loadingProgramasPeriodo ? (
                      <div className="uxxi-prog-empty" style={{ padding: 20, textAlign: 'center' }}>
                        <div className="loading-spinner" style={{ width: 28, height: 28, margin: '0 auto 8px' }} />
                        Cargando programas del periodo…
                      </div>
                    ) : (
                      <div className="uxxi-prog-multi-list">
                        {!periodoSeleccionado ? (
                          <div className="uxxi-prog-empty" style={{ padding: 16 }}>Seleccione un periodo académico.</div>
                        ) : !nivelSeleccionado ? (
                          <div className="uxxi-prog-empty" style={{ padding: 16 }}>
                            Seleccione un <strong>nivel</strong> para ver y marcar los programas de ese nivel en el periodo elegido.
                          </div>
                        ) : programasFiltrados.length === 0 ? (
                          <div className="uxxi-prog-empty" style={{ padding: 16 }}>
                            No hay programas para este nivel con el filtro de búsqueda. Pruebe otro término o verifique las reglas del periodo.
                          </div>
                        ) : (
                          programasFiltrados.map((pf) => {
                            const tipos = pf.tiposPractica || [];
                            const pid = String(pf._id);
                            const elegido = tipoPracticaPorPrograma[pid];
                            return (
                              <div key={pf._id} className="uxxi-prog-multi-row">
                                <label className="uxxi-prog-multi-row-main">
                                  <input
                                    type="checkbox"
                                    checked={idsSeleccionados.has(pid)}
                                    onChange={(e) => toggleProgramaUxxi(pf, e.target.checked)}
                                  />
                                  <span className="uxxi-prog-code">{pf.code}</span>
                                  <span className="uxxi-prog-name">{pf.programId?.name || '—'}</span>
                                </label>
                                <div className="uxxi-prog-tipo-cell" onClick={(e) => e.stopPropagation()}>
                                  {tipos.length === 0 && (
                                    <span className="uxxi-prog-tipo-warn" title="Configure en Reglas programa / tipo de práctica">
                                      Sin tipos configurados
                                    </span>
                                  )}
                                  {tipos.length === 1 && (
                                    <span className="uxxi-prog-tipo-fixed">{tipos[0].value}</span>
                                  )}
                                  {tipos.length > 1 && (
                                    <select
                                      className="uxxi-select uxxi-select--inline"
                                      aria-label={`Tipo de práctica para ${pf.code}`}
                                      value={elegido || ''}
                                      onChange={(e) =>
                                        setTipoPracticaPorPrograma((prev) => ({
                                          ...prev,
                                          [pid]: e.target.value,
                                        }))
                                      }
                                    >
                                      <option value="">— Elija tipo —</option>
                                      {tipos.map((t) => (
                                        <option key={t._id} value={t._id}>{t.value}</option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                </div>

                {/* ── Reglas curriculares aplicables ── */}
                {periodoSeleccionado && (reglasBuscadas || loadingReglas) && (
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
                                  const isSelected = idsSeleccionados.has(String(p?._id || p));
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

                            {(r.asignaturasRequeridas || []).length > 0 ? (
                              <div className="uxxi-regla-asignaturas">
                                <div className="uxxi-regla-asignaturas-head">
                                  <FiBook className="uxxi-regla-asignaturas-icon" />
                                  <span>
                                    <strong>Sí incluye regla de asignatura</strong> —{' '}
                                    {(r.asignaturasRequeridas || []).length} requisito
                                    {(r.asignaturasRequeridas || []).length !== 1 ? 's' : ''}:
                                  </span>
                                </div>
                                <div className="uxxi-regla-asignaturas-list">
                                  {(r.asignaturasRequeridas || []).map((ar, ai) => {
                                    const asig = ar?.asignatura;
                                    const cod = typeof asig === 'object' && asig
                                      ? String(asig.codAsignatura || asig.codigo || asig.idAsignatura || '').trim()
                                      : '';
                                    const nom = typeof asig === 'object' && asig
                                      ? String(asig.nombreAsignatura || asig.nombre || '').trim()
                                      : '';
                                    const tipo = ar?.tipo === 'aprobada' ? 'Aprobada' : 'Matriculada';
                                    return (
                                      <div key={ai} className="uxxi-regla-asig-item">
                                        <div className="uxxi-regla-asig-row">
                                          <span className="uxxi-regla-asig-label">Código</span>
                                          <span className="uxxi-regla-asig-val uxxi-regla-asig-val--cod">{cod || '—'}</span>
                                        </div>
                                        <div className="uxxi-regla-asig-row">
                                          <span className="uxxi-regla-asig-label">Nombre</span>
                                          <span className="uxxi-regla-asig-val">{nom || '— (sin nombre en catálogo)'}</span>
                                        </div>
                                        <div className="uxxi-regla-asig-tipo">
                                          Debe estar: <strong>{tipo}</strong>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="uxxi-regla-no-asignaturas">
                                No incluye regla de asignatura (solo condiciones académicas como créditos, promedio, etc.)
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
                disabled={uxxiBuscarDeshabilitado}
                title={!filtros.periodo ? 'Seleccione periodo académico' : !filtros.nivel ? 'Seleccione nivel' : ''}
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
        <button className="btn-action btn-outline" onClick={() => showFuncionalidadEnDesarrollo('Exportar')}>
          <FiDownload className="btn-icon" /> Exportar
        </button>
        <button className="btn-action btn-outline" onClick={() => { setShowHistorialModal(true); setHistorialFiltroDoc(''); setHistorialFilterInput(''); }}>
          <FiActivity className="btn-icon" /> Historial de estados
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

      {/* Pestañas por estado */}
      <nav className="student-tabs" aria-label="Filtrar por estado">
        {ESTADOS_TABS.map((tab) => (
          <button
            key={tab.id || 'todos'}
            type="button"
            className={`student-tab ${tabEstado === tab.id ? 'student-tab--active' : ''}`}
            onClick={() => {
              setTabEstado(tab.id);
              setPage(1);
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tabla de estudiantes */}
      <div className="student-table-container">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando estudiantes...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <FiAlertCircle className="empty-icon" />
            <p>{searchTerm || tabEstado ? 'No se encontraron estudiantes con los criterios seleccionados' : 'No hay estudiantes registrados'}</p>
          </div>
        ) : (
          <>
            <div className="student-table-wrap">
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
                <th>ACTUALIZACIÓN</th>
                <th>ESTADO FINAL</th>
                <th>PERFIL</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const estadoClass = (s.estadoCurricular || '').toLowerCase().replace('_', '-');
                const perfilId = s.perfilPostulanteId || s.postulant?._id;
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
                    <td>{formatDate(s.updatedAt)}</td>
                    <td className="student-td-estado-final" onClick={(e) => e.stopPropagation()}>
                      {s.estadoFinal === 'EXCLUIDO' ? (
                        <span className="status-badge status-badge--excluido">Excluido</span>
                      ) : (
                        <div className="student-opciones-portal__select-row">
                          <select
                            className="student-select-estado-final"
                            aria-label={`Estado final ${s.identificacion}`}
                            value={s.estadoFinal || 'EN_REVISION'}
                            disabled={savingEstadoFinalId === s._id}
                            onChange={(e) => handleEstadoFinalChange(s._id, e.target.value)}
                          >
                            <option value="EN_REVISION">En revisión</option>
                            <option value="AUTORIZADO">Autorizado</option>
                            <option value="NO_AUTORIZADO">No autorizado</option>
                          </select>
                          {savingEstadoFinalId === s._id && (
                            <FiLoader className="student-select-estado-final-spinner" aria-hidden />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="student-td-perfil" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="student-opciones-portal__btn-perfil"
                        disabled={!perfilId}
                        title={perfilId ? 'Ver perfil del postulante' : 'Aún no tiene ficha de postulante en el sistema'}
                        onClick={() => {
                          if (!perfilId) return;
                          navigate(`/dashboard/postulantes/${perfilId}`, { state: { from: '/dashboard/estudiantes' } });
                        }}
                      >
                        <FiUser aria-hidden />
                        Ver perfil
                      </button>
                    </td>
                  </tr>
                );
              })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Paginación siempre en barra propia debajo de la tabla */}
        {!loading && students.length > 0 && (
          <div className="student-pagination">
            <span className="student-pagination-info">
              Mostrando {(page - 1) * pagination.limit + 1}-{Math.min(page * pagination.limit, pagination.total)} de {pagination.total}
            </span>
            <div className="student-pagination-btns">
              <button
                type="button"
                className="student-pagination-btn"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <span className="student-pagination-pages">
                Página {page} de {pagination.pages}
              </span>
              <button
                type="button"
                className="student-pagination-btn"
                disabled={page >= pagination.pages}
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Student;
