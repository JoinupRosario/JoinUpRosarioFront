import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FiArrowLeft, FiPlus, FiEdit, FiTrash2, FiSearch,
  FiToggleLeft, FiToggleRight, FiChevronLeft, FiChevronRight, FiChevronDown,
  FiX, FiSave, FiFilter, FiAlertCircle, FiBook, FiCheckCircle,
} from 'react-icons/fi';
import { HiOutlineAcademicCap } from 'react-icons/hi';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../styles/CondicionesCurriculares.css';

const normalize = (str) =>
  (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// ── Constantes ────────────────────────────────────────────────────────────────
const EMPTY_CONDICION  = { variable: '', operador: '>=', valor: '' };
const EMPTY_FORM = {
  nombre:               '',
  periodo:              '',
  facultad:             '',
  programas:            [],       // array de IDs
  _programasItems:      [],       // array de {_id, name, code} para mostrar tags
  logica:               'AND',
  condiciones:          [{ ...EMPTY_CONDICION }],
  asignaturasRequeridas:[],
};

// ── Componente principal ──────────────────────────────────────────────────────
export default function CondicionesCurriculares({ onVolver }) {
  // ── Datos tabla ────────────────────────────────────────────────────────────
  const [reglas, setReglas]         = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loading, setLoading]       = useState(true);

  // ── Filtros tabla ──────────────────────────────────────────────────────────
  const [search, setSearch]                 = useState('');
  const [filterFacultad, setFilterFacultad] = useState('');
  const [filterPeriodo, setFilterPeriodo]   = useState('');
  const [filterEstado, setFilterEstado]     = useState('');
  const searchTimer                         = useRef(null);

  // ── Modal ──────────────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);

  // ── Params ─────────────────────────────────────────────────────────────────
  const [periodos, setPeriodos]     = useState([]);
  const [facultades, setFacultades] = useState([]);
  const [variables, setVariables]   = useState([]);
  const [operadores, setOperadores] = useState([]);

  // ── Buscador de programas en el modal ──────────────────────────────────────
  const [progSearch, setProgSearch]           = useState('');
  const [progSuggestions, setProgSuggestions] = useState([]);
  const [progLoading, setProgLoading]         = useState(false);
  const [progDropOpen, setProgDropOpen]       = useState(false);
  const progTimer                             = useRef(null);
  const progWrapRef                           = useRef(null);

  // ── Buscador de asignaturas en el modal ────────────────────────────────────
  const [asigSuggestions, setAsigSuggestions] = useState([]);
  const [activeAsigIdx, setActiveAsigIdx]     = useState(null); // qué fila está buscando
  const [asigInputs, setAsigInputs]           = useState([]);  // texto del input por fila
  const asigTimer                             = useRef(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get('/condiciones-curriculares/variables'),
      api.get('/periodos', { params: { estado: 'Activo', limit: 100 } }),
      api.get('/faculties'),
    ]).then(([vRes, pRes, fRes]) => {
      setVariables(vRes.data.variables || []);
      setOperadores(vRes.data.operadores || []);
      setPeriodos(pRes.data.data || pRes.data || []);
      setFacultades(fRes.data.data || fRes.data || []);
    }).catch(e => console.error('Error cargando parámetros:', e));
  }, []);


  // Cerrar dropdown de programas al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (progWrapRef.current && !progWrapRef.current.contains(e.target)) {
        setProgDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cache de program-faculties por facultad
  const pfCacheRef = useRef({});
  // facultad activa en el modal (ref para evitar stale closure en callbacks)
  const currentFacultadRef = useRef('');

  // ── Carga todos los PF de una facultad (con caché) y filtra por texto ──────
  const fetchAndFilterProgramas = useCallback(async (facultadId, q, programasYaSeleccionados) => {
    if (!facultadId) { setProgSuggestions([]); setProgLoading(false); return; }
    setProgLoading(true);
    try {
      if (!pfCacheRef.current[facultadId]) {
        let page = 1;
        let allResults = [];
        while (true) {
          const resp = await api.get('/program-faculties', {
            params: { facultyId: facultadId, limit: 200, page },
          });
          // Normalizar estructura de respuesta (puede ser array directo o { data: [...] })
          const respData = resp.data;
          let raw = [];
          if (Array.isArray(respData)) {
            raw = respData;
          } else if (Array.isArray(respData?.data)) {
            raw = respData.data;
          } else if (Array.isArray(respData?.results)) {
            raw = respData.results;
          }
          console.log(`[PF] página ${page}: ${raw.length} registros`);
          allResults = allResults.concat(raw);
          const pagination = respData?.pagination;
          if (!pagination || page >= pagination.pages || raw.length === 0) break;
          page++;
        }
        console.log(`[PF] total raw: ${allResults.length}, activo SI: ${allResults.filter(p => p.activo === 'SI').length}`);
        pfCacheRef.current[facultadId] = allResults
          .filter(pf => pf.activo === 'SI')
          .map(pf => ({
            _id:  pf._id,
            code: pf.code || pf.codigoPrograma || '',
            name: pf.programId?.name || pf.program?.name || pf.nombrePrograma || '—',
            labelLevel: pf.programId?.labelLevel || pf.program?.labelLevel || '',
          }));
        console.log(`[PF] cacheados para facultad ${facultadId}: ${pfCacheRef.current[facultadId].length}`);
      }
      if (currentFacultadRef.current !== facultadId) return;
      const all = pfCacheRef.current[facultadId] || [];
      const qNorm = normalize(q || '');
      const results = all
        .filter(pf => !(programasYaSeleccionados || []).includes(pf._id))
        .filter(pf => !qNorm || normalize(pf.code).includes(qNorm) || normalize(pf.name).includes(qNorm));
      setProgSuggestions(results.slice(0, 40));
    } catch (e) {
      console.error('[fetchAndFilterProgramas]', e);
      setProgSuggestions([]);
    } finally {
      setProgLoading(false);
    }
  }, []);

  // ── Buscar programas mientras el usuario escribe ───────────────────────────
  const searchProgramas = (q) => {
    setProgSearch(q);
    clearTimeout(progTimer.current);
    progTimer.current = setTimeout(() => {
      fetchAndFilterProgramas(currentFacultadRef.current, q, form.programas);
    }, 200);
  };

  const addPrograma = (prog) => {
    setForm(f => ({
      ...f,
      programas: [...f.programas, prog._id],
      _programasItems: [...f._programasItems, { _id: prog._id, name: prog.name, code: prog.code }],
    }));
    setProgSearch('');
    // recalcula sugerencias excluyendo el recién agregado
    const newSeleccionados = [...(form.programas), prog._id];
    const all = pfCacheRef.current[currentFacultadRef.current] || [];
    setProgSuggestions(all.filter(pf => !newSeleccionados.includes(pf._id)).slice(0, 40));
  };

  const removePrograma = (id) => {
    setForm(f => ({
      ...f,
      programas: f.programas.filter(p => p !== id),
      _programasItems: f._programasItems.filter(p => p._id !== id),
    }));
  };

  // ── Buscar asignaturas ─────────────────────────────────────────────────────
  const searchAsignaturas = (q, rowIdx) => {
    setActiveAsigIdx(rowIdx);
    clearTimeout(asigTimer.current);
    if (!q.trim()) { setAsigSuggestions([]); return; }
    asigTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/asignaturas', { params: { search: q, limit: 20 } });
        setAsigSuggestions(data.data || []);
      } catch { setAsigSuggestions([]); }
    }, 280);
  };

  const selectAsignatura = (rowIdx, opt) => {
    const label = `${opt.codAsignatura} — ${opt.nombreAsignatura}`;
    setForm(f => {
      const arr = [...f.asignaturasRequeridas];
      arr[rowIdx] = { ...arr[rowIdx], asignatura: opt._id, _label: label };
      return { ...f, asignaturasRequeridas: arr };
    });
    const inputs = [...asigInputs];
    inputs[rowIdx] = label;
    setAsigInputs(inputs);
    setAsigSuggestions([]);
    setActiveAsigIdx(null);
  };

  // ── Cargar lista de reglas ─────────────────────────────────────────────────
  const loadReglas = useCallback(async (page = 1, q = search) => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (q.trim())       params.search   = q.trim();
      if (filterFacultad) params.facultad  = filterFacultad;
      if (filterPeriodo)  params.periodo   = filterPeriodo;
      if (filterEstado)   params.estado    = filterEstado;
      const { data } = await api.get('/condiciones-curriculares', { params });
      setReglas(data.data || []);
      setPagination(data.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, filterFacultad, filterPeriodo, filterEstado]);

  useEffect(() => { loadReglas(1); }, [filterFacultad, filterPeriodo, filterEstado]);

  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadReglas(1, val), 350);
  };

  // ── Abrir modal nuevo ──────────────────────────────────────────────────────
  const handleNuevo = () => {
    currentFacultadRef.current = '';
    pfCacheRef.current = {}; // limpiar caché para siempre traer datos frescos
    setProgDropOpen(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
    setProgSearch(''); setProgSuggestions([]);
    setAsigSuggestions([]); setAsigInputs([]);
    setShowModal(true);
  };

  // ── Abrir modal editar ─────────────────────────────────────────────────────
  const handleEditar = async (id) => {
    try {
      const { data } = await api.get(`/condiciones-curriculares/${id}`);
      const newForm = {
        nombre:    data.nombre || '',
        periodo:   data.periodo?._id || data.periodo || '',
        facultad:  data.facultad?._id || data.facultad || '',
        programas: (data.programas || []).map(p => p._id || p),
        _programasItems: (data.programas || []).map(p => ({
          _id:  p._id || p,
          code: p.code || '',
          name: p.programId?.name || p.name || '',
        })),
        logica:    data.logica || 'AND',
        condiciones: (data.condiciones || []).map(c => ({
          variable: c.variable, operador: c.operador, valor: c.valor,
        })),
        asignaturasRequeridas: (data.asignaturasRequeridas || []).map(a => ({
          asignatura: a.asignatura?._id || a.asignatura || '',
          tipo: a.tipo,
          _label: a.asignatura ? `${a.asignatura.codAsignatura} — ${a.asignatura.nombreAsignatura}` : '',
        })),
      };
      const facultadId = newForm.facultad;
      currentFacultadRef.current = facultadId;
      pfCacheRef.current = {}; // limpiar caché al editar para datos frescos
      setProgDropOpen(false);
      setForm(newForm);
      setEditingId(id);
      setAsigInputs(newForm.asignaturasRequeridas.map(a => a._label || ''));
      setProgSearch(''); setProgSuggestions([]);
      setAsigSuggestions([]);
      setShowModal(true);
      if (facultadId) fetchAndFilterProgramas(facultadId, '', newForm.programas);
    } catch {
      Swal.fire('Error', 'No se pudo cargar la regla', 'error');
    }
  };

  // ── Cerrar modal ───────────────────────────────────────────────────────────
  const handleCloseModal = () => {
    setShowModal(false);
    setProgSearch(''); setProgSuggestions([]);
  };

  // ── Guardar ────────────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!form.nombre.trim()) return Swal.fire('Atención', 'El nombre es obligatorio', 'warning');
    if (!form.periodo)       return Swal.fire('Atención', 'Selecciona un periodo', 'warning');
    if (!form.facultad)      return Swal.fire('Atención', 'Selecciona una facultad', 'warning');
    if (!form.condiciones.length) return Swal.fire('Atención', 'Agrega al menos una condición', 'warning');

    for (const c of form.condiciones) {
      if (!c.variable || !c.operador || c.valor === '') {
        return Swal.fire('Atención', 'Completa todos los campos de cada condición', 'warning');
      }
    }

    setSaving(true);
    try {
      const { _programasItems, ...rest } = form;
      const payload = {
        ...rest,
        asignaturasRequeridas: form.asignaturasRequeridas
          .filter(a => a.asignatura)
          .map(({ _label, ...r }) => r),
      };

      if (editingId) {
        await api.put(`/condiciones-curriculares/${editingId}`, payload);
        Swal.fire({ icon: 'success', title: 'Actualizado', timer: 1500, showConfirmButton: false });
      } else {
        await api.post('/condiciones-curriculares', payload);
        Swal.fire({ icon: 'success', title: 'Creado', timer: 1500, showConfirmButton: false });
      }
      setShowModal(false);
      loadReglas(pagination.page);
    } catch (e) {
      Swal.fire('Error', e.response?.data?.message || 'No se pudo guardar', 'error');
    } finally { setSaving(false); }
  };

  // ── Toggle / Eliminar ──────────────────────────────────────────────────────
  const handleToggle = async (id, estadoActual) => {
    const accion = estadoActual === 'ACTIVE' ? 'inactivar' : 'activar';
    const { isConfirmed } = await Swal.fire({
      title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} esta regla?`,
      icon: 'question', showCancelButton: true,
      confirmButtonText: 'Sí', cancelButtonText: 'No', confirmButtonColor: '#c41e3a',
    });
    if (!isConfirmed) return;
    try {
      await api.patch(`/condiciones-curriculares/${id}/toggle-estado`);
      loadReglas(pagination.page);
    } catch (e) { Swal.fire('Error', e.response?.data?.message || 'Error', 'error'); }
  };

  const handleEliminar = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Eliminar esta regla?', text: 'Esta acción no se puede deshacer.',
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#c41e3a',
    });
    if (!isConfirmed) return;
    try {
      await api.delete(`/condiciones-curriculares/${id}`);
      Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1400, showConfirmButton: false });
      loadReglas(pagination.page);
    } catch (e) { Swal.fire('Error', e.response?.data?.message || 'Error', 'error'); }
  };

  // ── Helpers condiciones ────────────────────────────────────────────────────
  const addCondicion = () =>
    setForm(f => ({ ...f, condiciones: [...f.condiciones, { ...EMPTY_CONDICION }] }));
  const removeCondicion = (i) =>
    setForm(f => ({ ...f, condiciones: f.condiciones.filter((_, idx) => idx !== i) }));
  const updateCondicion = (i, field, value) =>
    setForm(f => {
      const conds = [...f.condiciones];
      conds[i] = { ...conds[i], [field]: value };
      return { ...f, condiciones: conds };
    });

  // ── Helpers asignaturas requeridas ─────────────────────────────────────────
  const addAsignatura = () => {
    setForm(f => ({ ...f, asignaturasRequeridas: [...f.asignaturasRequeridas, { asignatura: '', tipo: 'aprobada', _label: '' }] }));
    setAsigInputs(prev => [...prev, '']);
  };
  const removeAsignatura = (i) => {
    setForm(f => ({ ...f, asignaturasRequeridas: f.asignaturasRequeridas.filter((_, idx) => idx !== i) }));
    setAsigInputs(prev => prev.filter((_, idx) => idx !== i));
    if (activeAsigIdx === i) { setAsigSuggestions([]); setActiveAsigIdx(null); }
  };
  const updateAsigTipo = (i, tipo) =>
    setForm(f => {
      const arr = [...f.asignaturasRequeridas];
      arr[i] = { ...arr[i], tipo };
      return { ...f, asignaturasRequeridas: arr };
    });

  // ── Paginación ─────────────────────────────────────────────────────────────
  const goToPage = (p) => { if (p >= 1 && p <= pagination.pages) loadReglas(p); };

  const renderPagination = () => {
    const { page, pages, total } = pagination;
    if (pages <= 1) return null;
    const nums = [];
    let s = Math.max(1, page - 2), e = Math.min(pages, page + 2);
    if (e - s < 4) { s = Math.max(1, e - 4); e = Math.min(pages, s + 4); }
    for (let i = s; i <= e; i++) nums.push(i);
    return (
      <div className="cc-pagination">
        <span className="cc-pagination-info">{total} regla{total !== 1 ? 's' : ''}</span>
        <div className="cc-pagination-controls">
          <button className="cc-page-btn" onClick={() => goToPage(page - 1)} disabled={page === 1}><FiChevronLeft /></button>
          {s > 1 && <><button className="cc-page-btn" onClick={() => goToPage(1)}>1</button>{s > 2 && <span className="cc-page-ellipsis">…</span>}</>}
          {nums.map(n => <button key={n} className={`cc-page-btn${n === page ? ' active' : ''}`} onClick={() => goToPage(n)}>{n}</button>)}
          {e < pages && <><span className="cc-page-ellipsis">…</span><button className="cc-page-btn" onClick={() => goToPage(pages)}>{pages}</button></>}
          <button className="cc-page-btn" onClick={() => goToPage(page + 1)} disabled={page === pages}><FiChevronRight /></button>
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="cc-content">
      {/* Header */}
      <div className="cc-header">
        <div className="cc-header-left">
          <button className="btn-volver-icon" onClick={onVolver} title="Volver"><FiArrowLeft className="btn-icon" /></button>
          <div className="cc-section-title-wrap">
            <h3><HiOutlineAcademicCap style={{ marginRight: 8, display: 'inline-block' }} />CONDICIONES CURRICULARES PARA PRÁCTICA</h3>
          </div>
        </div>
        <button className="cc-btn-nuevo" onClick={handleNuevo}><FiPlus /> Nueva Regla</button>
      </div>

      {/* Filtros */}
      <div className="cc-filters">
        <div className="cc-search-box">
          <FiSearch className="cc-search-icon" />
          <input className="cc-search-input" placeholder="Buscar por nombre..." value={search} onChange={e => handleSearchChange(e.target.value)} />
        </div>
        <select className="cc-filter-select" value={filterPeriodo} onChange={e => setFilterPeriodo(e.target.value)}>
          <option value="">Todos los periodos</option>
          {periodos.map(p => <option key={p._id} value={p._id}>{p.codigo}</option>)}
        </select>
        <select className="cc-filter-select" value={filterFacultad} onChange={e => setFilterFacultad(e.target.value)}>
          <option value="">Todas las facultades</option>
          {facultades.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
        </select>
        <select className="cc-filter-select" value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activas</option>
          <option value="INACTIVE">Inactivas</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="cc-table-wrapper">
        {loading ? (
          <div className="cc-loading">Cargando reglas...</div>
        ) : reglas.length === 0 ? (
          <div className="cc-empty">
            <FiAlertCircle size={36} />
            <p>No hay condiciones curriculares registradas.</p>
            <button className="cc-btn-nuevo" onClick={handleNuevo}><FiPlus /> Nueva Regla</button>
          </div>
        ) : (
          <table className="cc-table">
            <thead><tr>
              <th>Nombre</th><th>Periodo</th><th>Facultad</th><th>Programas</th>
              <th>Condiciones</th><th>Lógica</th><th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {reglas.map(r => (
                <tr key={r._id}>
                  <td className="cc-td-nombre">{r.nombre}</td>
                  <td>{r.periodo?.codigo || '—'}</td>
                  <td>{r.facultad?.name || '—'}</td>
                  <td>
                    {!(r.programas || []).length
                      ? <span className="cc-badge cc-badge-all">Todos</span>
                      : (r.programas || []).slice(0, 2).map((p, idx) => {
                          const id   = p?._id || p;
                          // ProgramFaculty: code propio + nombre viene de programId
                          const code = p?.code || '';
                          const name = p?.programId?.name || p?.name || '';
                          return (
                            <span key={id || idx} className="cc-badge" title={name}>
                              {code || name || '—'}
                            </span>
                          );
                        })}
                    {(r.programas || []).length > 2 && (
                      <span className="cc-badge cc-badge-more">+{r.programas.length - 2}</span>
                    )}
                  </td>
                  <td><span className="cc-conds-count">{(r.condiciones || []).length} condición{(r.condiciones || []).length !== 1 ? 'es' : ''}</span></td>
                  <td><span className={`cc-logica-badge cc-logica-${r.logica}`}>{r.logica}</span></td>
                  <td><span className={`cc-estado ${r.estado === 'ACTIVE' ? 'cc-estado-activo' : 'cc-estado-inactivo'}`}>{r.estado === 'ACTIVE' ? 'Activa' : 'Inactiva'}</span></td>
                  <td className="cc-td-actions">
                    <button className="cc-btn-action cc-btn-edit" title="Editar" onClick={() => handleEditar(r._id)}><FiEdit /></button>
                    <button className={`cc-btn-action ${r.estado === 'ACTIVE' ? 'cc-btn-toggle-off' : 'cc-btn-toggle-on'}`} title={r.estado === 'ACTIVE' ? 'Inactivar' : 'Activar'} onClick={() => handleToggle(r._id, r.estado)}>
                      {r.estado === 'ACTIVE' ? <FiToggleRight /> : <FiToggleLeft />}
                    </button>
                    <button className="cc-btn-action cc-btn-delete" title="Eliminar" onClick={() => handleEliminar(r._id)}><FiTrash2 /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {renderPagination()}

      {/* ── MODAL ── sin cierre al hacer click afuera ─────────────────────── */}
      {showModal && (
        <div className="cc-modal-overlay">
          <div className="cc-modal">
            {/* Header */}
            <div className="cc-modal-header">
              <h3>
                <HiOutlineAcademicCap style={{ marginRight: 8 }} />
                {editingId ? 'Editar Regla' : 'Nueva Regla Curricular'}
              </h3>
              <button className="cc-modal-close" onClick={handleCloseModal}><FiX /></button>
            </div>

            <div className="cc-modal-body">
              {/* ── Datos generales ────────────────────────────────────────── */}
              <div className="cc-section-label"><FiFilter /> Datos generales</div>

              <div className="cc-form-row">
                <div className="cc-form-group cc-form-full">
                  <label>Nombre de la regla *</label>
                  <input className="cc-input" placeholder="Ej: Regla Administración 2025-1" value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                </div>
              </div>

              <div className="cc-form-row">
                <div className="cc-form-group">
                  <label>Periodo *</label>
                  <select className="cc-select" value={form.periodo} onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))}>
                    <option value="">Seleccione...</option>
                    {periodos.map(p => <option key={p._id} value={p._id}>{p.codigo}</option>)}
                  </select>
                </div>
                <div className="cc-form-group">
                  <label>Facultad *</label>
                  <select className="cc-select" value={form.facultad}
                    onChange={e => {
                      const newFacultad = e.target.value;
                      currentFacultadRef.current = newFacultad;
                      setProgSearch('');
                      setProgSuggestions([]);
                      setProgDropOpen(!!newFacultad);
                      setForm(f => ({ ...f, facultad: newFacultad, programas: [], _programasItems: [] }));
                      if (newFacultad) fetchAndFilterProgramas(newFacultad, '', []);
                    }}>
                    <option value="">Seleccione...</option>
                    {facultades.map(fac => <option key={fac._id} value={fac._id}>{fac.name}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Programas — búsqueda tipo autocomplete ──────────────── */}
              <div className="cc-form-group cc-form-full">
                <label>
                  Programas asociados <span className="cc-hint">(si no seleccionas, aplica a todos)</span>
                </label>

                {/* Tags de programas ya seleccionados */}
                {form._programasItems.length > 0 && (
                  <div className="cc-selected-tags">
                    {form._programasItems.map(p => (
                      <span key={p._id} className="cc-tag">
                        <span className="cc-tag-text">{p.code ? `${p.code} — ` : ''}{p.name}</span>
                        <button className="cc-tag-remove" onClick={() => removePrograma(p._id)} title="Quitar">
                          <FiX size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Dropdown estilo UXXI */}
                <div className="cc-prog-wrapper" ref={progWrapRef}>
                  <input
                    className="cc-prog-input"
                    placeholder={form.facultad ? 'Buscar por código o nombre...' : 'Selecciona una facultad primero'}
                    value={progSearch}
                    disabled={!form.facultad}
                    onChange={e => {
                      setProgDropOpen(true);
                      searchProgramas(e.target.value);
                    }}
                    onFocus={() => {
                      if (currentFacultadRef.current) {
                        setProgDropOpen(true);
                        fetchAndFilterProgramas(currentFacultadRef.current, progSearch, form.programas);
                      }
                    }}
                  />
                  <FiChevronDown className="cc-prog-chevron" />
                  {progLoading && <span className="cc-prog-loading">…</span>}
                  {progDropOpen && (
                    <div className="cc-prog-dropdown">
                      {progSuggestions.length === 0 && !progLoading && (
                        <div className="cc-prog-empty">
                          {form.facultad ? 'Sin programas activos en esta facultad' : 'Selecciona una facultad primero'}
                        </div>
                      )}
                      {progSuggestions.map(p => (
                        <div
                          key={p._id}
                          className="cc-prog-option"
                          onMouseDown={e => { e.preventDefault(); addPrograma(p); }}
                        >
                          <span className="cc-prog-code">{p.code}</span>
                          <span className="cc-prog-name">{p.name}</span>
                          {p.labelLevel && <span className="cc-prog-level">{p.labelLevel}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Condiciones académicas ──────────────────────────────── */}
              <div className="cc-section-label">
                <FiCheckCircle /> Condiciones académicas
                <div className="cc-logica-toggle">
                  <span>Lógica:</span>
                  <button className={`cc-logica-btn ${form.logica === 'AND' ? 'active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, logica: 'AND' }))}>
                    AND — todas deben cumplirse
                  </button>
                  <button className={`cc-logica-btn ${form.logica === 'OR' ? 'active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, logica: 'OR' }))}>
                    OR — al menos una
                  </button>
                </div>
              </div>

              <div className="cc-condiciones-list">
                {form.condiciones.map((c, i) => (
                  <div key={i} className="cc-condicion-row">
                    <span className="cc-cond-index">{i + 1}</span>
                    <select className="cc-select cc-cond-variable" value={c.variable}
                      onChange={e => updateCondicion(i, 'variable', e.target.value)}>
                      <option value="">Variable...</option>
                      {variables.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
                    </select>
                    <select className="cc-select cc-cond-op" value={c.operador}
                      onChange={e => updateCondicion(i, 'operador', e.target.value)}>
                      {operadores.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                    <input className="cc-input cc-cond-valor" type="number" placeholder="Valor"
                      value={c.valor} onChange={e => updateCondicion(i, 'valor', e.target.value)} step="0.01" />
                    <button className="cc-cond-remove" onClick={() => removeCondicion(i)}
                      disabled={form.condiciones.length === 1} title="Eliminar condición"><FiX /></button>
                    {i < form.condiciones.length - 1 && (
                      <span className={`cc-logica-sep cc-logica-sep-${form.logica}`}>{form.logica}</span>
                    )}
                  </div>
                ))}
                <button className="cc-btn-add-cond" onClick={addCondicion}><FiPlus /> Agregar condición</button>
              </div>

              {/* ── Asignaturas requeridas ──────────────────────────────── */}
              <div className="cc-section-label"><FiBook /> Asignaturas requeridas <span className="cc-hint">(opcional)</span></div>

              {form.asignaturasRequeridas.map((a, i) => (
                <div key={i} className="cc-asig-row">
                  <div className="cc-asig-search-wrap" style={{ flex: 2 }}>
                    <FiSearch className="cc-asig-search-icon" />
                    <input
                      className="cc-input cc-input-with-icon"
                      placeholder="Buscar asignatura por código o nombre..."
                      value={asigInputs[i] || ''}
                      onChange={e => {
                        const inputs = [...asigInputs];
                        inputs[i] = e.target.value;
                        setAsigInputs(inputs);
                        // limpia la selección previa al escribir de nuevo
                        setForm(f => {
                          const arr = [...f.asignaturasRequeridas];
                          arr[i] = { ...arr[i], asignatura: '', _label: '' };
                          return { ...f, asignaturasRequeridas: arr };
                        });
                        searchAsignaturas(e.target.value, i);
                      }}
                    />
                    {activeAsigIdx === i && asigSuggestions.length > 0 && (
                      <div className="cc-asig-dropdown">
                        {asigSuggestions.map(opt => (
                          <div key={opt._id} className="cc-asig-option" onClick={() => selectAsignatura(i, opt)}>
                            <strong>{opt.codAsignatura}</strong> — {opt.nombreAsignatura}
                            {opt.periodo && <span className="cc-asig-sub">Periodo {opt.periodo}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <select className="cc-select cc-asig-tipo" value={a.tipo} onChange={e => updateAsigTipo(i, e.target.value)}>
                    <option value="aprobada">Aprobada</option>
                    <option value="matriculada">Matriculada</option>
                  </select>
                  <button className="cc-cond-remove" onClick={() => removeAsignatura(i)} title="Eliminar"><FiX /></button>
                </div>
              ))}
              <button className="cc-btn-add-cond" onClick={addAsignatura}><FiPlus /> Agregar asignatura requerida</button>
            </div>

            {/* Footer */}
            <div className="cc-modal-footer">
              <button className="cc-btn-cancel" onClick={handleCloseModal} disabled={saving}>Cancelar</button>
              <button className="cc-btn-save" onClick={handleGuardar} disabled={saving}>
                <FiSave /> {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear Regla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
