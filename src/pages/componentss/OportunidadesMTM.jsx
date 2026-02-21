import { useEffect, useRef, useState, useCallback } from 'react';
import {
  FiArrowLeft, FiPlus, FiRefreshCw, FiSearch, FiEdit, FiCopy,
  FiTrash2, FiEye, FiX, FiCheck, FiBookOpen, FiUsers, FiCalendar, FiClock
} from 'react-icons/fi';
import { HiOutlineAcademicCap } from 'react-icons/hi';
import { useAuth } from '../../contexts/AuthContext';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../styles/OportunidadesMTM.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const badgeClass = (estado) =>
  estado === 'Activa' ? 'mtm-badge mtm-badge-activa' :
  estado === 'Inactiva' ? 'mtm-badge mtm-badge-inactiva' :
  'mtm-badge mtm-badge-borrador';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-CO') : '—';

const EMPTY_FORM = {
  nombreCargo: '',
  dedicacionHoras: '',
  valorPorHora: '',
  tipoVinculacion: '',
  categoria: '',
  periodo: '',
  vacantes: '',
  fechaVencimiento: '',
  promedioMinimo: '',
  nombreProfesor: '',
  unidadAcademica: '',
  horario: '',
  grupo: '',
  funciones: '',
  requisitos: '',
  asignaturas: [],    // [{_id, codAsignatura, nombreAsignatura}]
  programas: []       // [{_id, name, code, level}]
};

// ─── Paginación ────────────────────────────────────────────────────────────────
function Pagination({ total, page, totalPages, limit, onPage }) {
  if (totalPages <= 1) return null;
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }
  return (
    <div className="mtm-pagination">
      <span className="mtm-pag-info">
        {total} registros · página {page} de {totalPages}
      </span>
      <div className="mtm-pag-controls">
        <button className="mtm-pag-btn" onClick={() => onPage(page - 1)} disabled={page === 1}>‹</button>
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`d${i}`} className="mtm-pag-dots">…</span>
            : <button key={p} className={`mtm-pag-btn${p === page ? ' active-page' : ''}`} onClick={() => onPage(p)}>{p}</button>
        )}
        <button className="mtm-pag-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages}>›</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function OportunidadesMTM({ onVolver }) {
  const { user } = useAuth();
  const isAdmin = user?.modulo === 'administrativo';

  // ── Vista principal: lista | crear | editar | detalle
  const [vista, setVista] = useState('lista');
  const [selected, setSelected] = useState(null);

  // ── Lista
  const [oportunidades, setOportunidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterPeriodo, setFilterPeriodo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });

  // ── Form
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ── Datos paramétricos
  const [periodos, setPeriodos] = useState([]);
  const [dedicacionItems, setDedicacionItems] = useState([]);
  const [valorItems, setValorItems] = useState([]);
  const [vinculacionItems, setVinculacionItems] = useState([]);
  const [categoriaItems, setCategoriaItems] = useState([]);

  // ── Asignaturas autocomplete
  const [asigSearch, setAsigSearch] = useState('');
  const [asigResults, setAsigResults] = useState([]);
  const [asigLoading, setAsigLoading] = useState(false);
  const [showAsigDrop, setShowAsigDrop] = useState(false);
  const asigTimer = useRef(null);
  const asigWrapRef = useRef(null);

  // ── Programas multi-select
  const [programaSearch, setProgramaSearch] = useState('');
  const [programaResults, setProgramaResults] = useState([]);
  const [showProgramaDrop, setShowProgramaDrop] = useState(false);
  const programaTimer = useRef(null);
  const programaWrapRef = useRef(null);

  // ── Search debounce
  const searchTimer = useRef(null);

  // ══════════════════════════════════════════════════════════════════════════
  // Carga datos paramétricos al montar
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    loadParams();
  }, []);

  const loadParams = async () => {
    try {
      const [ded, val, vinc, cat, per] = await Promise.all([
        api.get('/locations/items/L_DEDICATON_HOURS?limit=100'),
        api.get('/locations/items/L_REMUNERATION_HOURS_PER_WEEK?limit=100'),
        api.get('/locations/items/L_CONTRACT_TYPE_STUDY_WORKING?limit=100'),
        api.get('/locations/items/L_MONITORING_TYPE?limit=100'),
        api.get('/periodos?tipo=monitoria&estado=Activo&limit=100')
      ]);
      setDedicacionItems(ded.data?.data || ded.data || []);
      setValorItems(val.data?.data || val.data || []);
      setVinculacionItems(vinc.data?.data || vinc.data || []);
      setCategoriaItems(cat.data?.data || cat.data || []);
      setPeriodos(per.data?.data || per.data || []);
    } catch (e) {
      console.error('[MTM] loadParams:', e);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // Carga lista de oportunidades
  // ══════════════════════════════════════════════════════════════════════════
  const loadOportunidades = useCallback(async (pageNum = 1, searchOverride) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum,
        limit: pagination.limit,
        search: searchOverride !== undefined ? searchOverride : search,
        ...(filterEstado && { estado: filterEstado }),
        ...(filterPeriodo && { periodo: filterPeriodo }),
        ...(filterCategoria && { categoria: filterCategoria })
      });
      const res = await api.get(`/oportunidades-mtm?${params}`);
      setOportunidades(res.data.data || []);
      setPagination(res.data.pagination || { total: 0, page: 1, totalPages: 1, limit: 10 });
    } catch (e) {
      console.error('[MTM] loadOportunidades:', e);
    } finally {
      setLoading(false);
    }
  }, [search, filterEstado, filterPeriodo, filterCategoria, pagination.limit]);

  useEffect(() => {
    loadOportunidades(1);
  }, [filterEstado, filterPeriodo, filterCategoria]);

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadOportunidades(1, search), 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  // ══════════════════════════════════════════════════════════════════════════
  // Asignaturas autocomplete
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (asigSearch.length < 3) { setAsigResults([]); setShowAsigDrop(false); return; }
    clearTimeout(asigTimer.current);
    asigTimer.current = setTimeout(async () => {
      setAsigLoading(true);
      try {
        const res = await api.get(`/asignaturas?search=${encodeURIComponent(asigSearch)}&limit=15`);
        setAsigResults(res.data.data || []);
        setShowAsigDrop(true);
      } catch { setAsigResults([]); }
      finally { setAsigLoading(false); }
    }, 350);
    return () => clearTimeout(asigTimer.current);
  }, [asigSearch]);

  useEffect(() => {
    const handler = (e) => {
      if (asigWrapRef.current && !asigWrapRef.current.contains(e.target)) setShowAsigDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addAsignatura = (a) => {
    if (form.asignaturas.length >= 3) {
      Swal.fire({ icon: 'warning', title: 'Máximo 3 asignaturas', text: 'Solo puedes seleccionar hasta 3 asignaturas.', confirmButtonColor: '#3b82f6' });
      return;
    }
    if (form.asignaturas.find(x => x._id === a._id)) return;
    setForm(f => ({ ...f, asignaturas: [...f.asignaturas, a] }));
    setAsigSearch('');
    setShowAsigDrop(false);
  };

  const removeAsignatura = (id) => setForm(f => ({ ...f, asignaturas: f.asignaturas.filter(a => a._id !== id) }));

  // ══════════════════════════════════════════════════════════════════════════
  // Programas multi-select
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (programaSearch.length < 2) { setProgramaResults([]); setShowProgramaDrop(false); return; }
    clearTimeout(programaTimer.current);
    programaTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/programs?search=${encodeURIComponent(programaSearch)}&status=ACTIVE&limit=20`);
        setProgramaResults(res.data.data || []);
        setShowProgramaDrop(true);
      } catch { setProgramaResults([]); }
    }, 350);
    return () => clearTimeout(programaTimer.current);
  }, [programaSearch]);

  useEffect(() => {
    const handler = (e) => {
      if (programaWrapRef.current && !programaWrapRef.current.contains(e.target)) setShowProgramaDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const togglePrograma = (p) => {
    const exists = form.programas.find(x => x._id === p._id);
    if (exists) {
      setForm(f => ({ ...f, programas: f.programas.filter(x => x._id !== p._id) }));
    } else {
      setForm(f => ({ ...f, programas: [...f.programas, p] }));
    }
  };
  const removePrograma = (id) => setForm(f => ({ ...f, programas: f.programas.filter(p => p._id !== id) }));

  // ══════════════════════════════════════════════════════════════════════════
  // CRUD Actions
  // ══════════════════════════════════════════════════════════════════════════
  const handleCreate = () => {
    setForm(EMPTY_FORM);
    setAsigSearch('');
    setProgramaSearch('');
    setSelected(null);
    setVista('crear');
  };

  const handleEdit = (op) => {
    setForm({
      nombreCargo: op.nombreCargo || '',
      dedicacionHoras: op.dedicacionHoras?._id || op.dedicacionHoras || '',
      valorPorHora: op.valorPorHora?._id || op.valorPorHora || '',
      tipoVinculacion: op.tipoVinculacion?._id || op.tipoVinculacion || '',
      categoria: op.categoria?._id || op.categoria || '',
      periodo: op.periodo?._id || op.periodo || '',
      vacantes: op.vacantes ?? '',
      fechaVencimiento: op.fechaVencimiento ? op.fechaVencimiento.slice(0, 10) : '',
      promedioMinimo: op.promedioMinimo ?? '',
      nombreProfesor: op.nombreProfesor || '',
      unidadAcademica: op.unidadAcademica || '',
      horario: op.horario || '',
      grupo: op.grupo || '',
      funciones: op.funciones || '',
      requisitos: op.requisitos || '',
      asignaturas: op.asignaturas || [],
      programas: op.programas || []
    });
    setSelected(op);
    setVista('editar');
  };

  const handleView = async (op) => {
    try {
      const res = await api.get(`/oportunidades-mtm/${op._id}`);
      setSelected(res.data);
      setVista('detalle');
    } catch {
      setSelected(op);
      setVista('detalle');
    }
  };

  const handleSave = async () => {
    if (!form.nombreCargo.trim()) {
      Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'El nombre del cargo es obligatorio.', confirmButtonColor: '#3b82f6' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        asignaturas: form.asignaturas.map(a => a._id),
        programas: form.programas.map(p => p._id),
        vacantes: form.vacantes !== '' ? Number(form.vacantes) : null,
        promedioMinimo: form.promedioMinimo !== '' ? Number(form.promedioMinimo) : null,
        dedicacionHoras: form.dedicacionHoras || null,
        valorPorHora: form.valorPorHora || null,
        tipoVinculacion: form.tipoVinculacion || null,
        categoria: form.categoria || null,
        periodo: form.periodo || null,
        fechaVencimiento: form.fechaVencimiento || null
      };

      if (vista === 'crear') {
        await api.post('/oportunidades-mtm', payload);
        Swal.fire({ icon: 'success', title: '¡Creada!', text: 'Oportunidad MTM creada correctamente.', confirmButtonColor: '#3b82f6', timer: 2500, timerProgressBar: true });
      } else {
        await api.put(`/oportunidades-mtm/${selected._id}`, payload);
        Swal.fire({ icon: 'success', title: '¡Actualizada!', text: 'Oportunidad MTM actualizada correctamente.', confirmButtonColor: '#3b82f6', timer: 2500, timerProgressBar: true });
      }
      setVista('lista');
      loadOportunidades(1);
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo guardar la oportunidad.', confirmButtonColor: '#3b82f6' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatus = async (op, nuevoEstado) => {
    const motivo = nuevoEstado === 'Inactiva' ? await Swal.fire({
      title: 'Motivo de inactivación',
      input: 'textarea',
      inputPlaceholder: 'Escribe el motivo...',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3b82f6'
    }).then(r => r.isConfirmed ? r.value : null) : undefined;

    if (nuevoEstado === 'Inactiva' && motivo === null) return;

    try {
      await api.patch(`/oportunidades-mtm/${op._id}/status`, { estado: nuevoEstado, motivo: motivo || undefined });
      Swal.fire({ icon: 'success', title: 'Estado actualizado', confirmButtonColor: '#3b82f6', timer: 2000, timerProgressBar: true });
      if (vista === 'detalle') {
        const res = await api.get(`/oportunidades-mtm/${op._id}`);
        setSelected(res.data);
      }
      loadOportunidades(pagination.page);
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo cambiar el estado.', confirmButtonColor: '#3b82f6' });
    }
  };

  const handleDuplicate = async (op) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Duplicar oportunidad?',
      text: `Se creará una copia de "${op.nombreCargo}" en estado Borrador.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, duplicar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3b82f6'
    });
    if (!isConfirmed) return;
    try {
      await api.post(`/oportunidades-mtm/${op._id}/duplicate`);
      Swal.fire({ icon: 'success', title: '¡Duplicada!', confirmButtonColor: '#3b82f6', timer: 2000, timerProgressBar: true });
      loadOportunidades(1);
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo duplicar.', confirmButtonColor: '#3b82f6' });
    }
  };

  const handleDelete = async (op) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Eliminar oportunidad?',
      text: `Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });
    if (!isConfirmed) return;
    try {
      await api.delete(`/oportunidades-mtm/${op._id}`);
      Swal.fire({ icon: 'success', title: 'Eliminada', confirmButtonColor: '#3b82f6', timer: 2000, timerProgressBar: true });
      if (vista === 'detalle') setVista('lista');
      loadOportunidades(1);
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar.', confirmButtonColor: '#3b82f6' });
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDERS
  // ══════════════════════════════════════════════════════════════════════════

  // ── Vista Lista ────────────────────────────────────────────────────────────
  const renderLista = () => (
    <>
      {/* Header */}
      <div className="mtm-header">
        <div className="mtm-header-left">
          {onVolver && (
            <button className="mtm-back-btn" onClick={onVolver}>
              <FiArrowLeft /> Volver
            </button>
          )}
          <div className="mtm-title">
            <span className="mtm-title-icon"><HiOutlineAcademicCap size={18} /></span>
            Monitorías, Tutorías y Mentorías
          </div>
        </div>
        <div className="mtm-header-actions">
          <button className="mtm-btn-secondary" onClick={() => loadOportunidades(1)}>
            <FiRefreshCw size={14} /> Actualizar
          </button>
          {isAdmin && (
            <button className="mtm-btn-primary" onClick={handleCreate}>
              <FiPlus size={14} /> Nueva MTM
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="mtm-toolbar">
        <div className="mtm-search-wrap">
          <FiSearch className="mtm-search-icon" />
          <input
            className="mtm-search-input"
            placeholder="Buscar por nombre del cargo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="mtm-filter-select" value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="Borrador">Borrador</option>
          <option value="Activa">Activa</option>
          <option value="Inactiva">Inactiva</option>
        </select>
        <select className="mtm-filter-select" value={filterPeriodo} onChange={e => setFilterPeriodo(e.target.value)}>
          <option value="">Todos los periodos</option>
          {periodos.map(p => (
            <option key={p._id} value={p._id}>{p.codigo}</option>
          ))}
        </select>
        <select className="mtm-filter-select" value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categoriaItems.map(c => (
            <option key={c._id} value={c._id}>{c.value}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="mtm-loading"><div className="mtm-spinner" /> Cargando...</div>
      ) : oportunidades.length === 0 ? (
        <div className="mtm-empty">
          <div className="mtm-empty-icon">🎓</div>
          <p>No hay oportunidades MTM registradas.</p>
          {isAdmin && <button className="mtm-btn-primary" style={{ margin: '12px auto 0', display: 'flex' }} onClick={handleCreate}><FiPlus size={14} /> Crear primera MTM</button>}
        </div>
      ) : (
        <>
          <div className="mtm-table-wrap">
            <table className="mtm-table">
              <thead>
                <tr>
                  <th>NOMBRE DEL CARGO</th>
                  <th>CATEGORÍA</th>
                  <th>PERIODO</th>
                  <th>VACANTES</th>
                  <th>VENCIMIENTO</th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {oportunidades.map(op => (
                  <tr key={op._id}>
                    <td style={{ fontWeight: 600, maxWidth: 240 }}>{op.nombreCargo}</td>
                    <td>{op.categoria?.value || '—'}</td>
                    <td>{op.periodo?.codigo || '—'}</td>
                    <td>{op.vacantes ?? '—'}</td>
                    <td>{fmtDate(op.fechaVencimiento)}</td>
                    <td><span className={badgeClass(op.estado)}>{op.estado}</span></td>
                    <td>
                      <div className="mtm-table-actions">
                        <button className="mtm-action-btn" title="Ver detalle" onClick={() => handleView(op)}><FiEye /></button>
                        {isAdmin && (
                          <>
                            <button className="mtm-action-btn" title="Editar" onClick={() => handleEdit(op)}><FiEdit /></button>
                            <button className="mtm-action-btn" title="Duplicar" onClick={() => handleDuplicate(op)}><FiCopy /></button>
                            <button className="mtm-action-btn danger" title="Eliminar" onClick={() => handleDelete(op)}><FiTrash2 /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination} onPage={(p) => loadOportunidades(p)} />
        </>
      )}
    </>
  );

  // ── Vista Formulario (Crear / Editar) ──────────────────────────────────────
  const renderForm = () => {
    const isEdit = vista === 'editar';
    return (
      <>
        <div className="mtm-header">
          <div className="mtm-header-left">
            <button className="mtm-back-btn" onClick={() => setVista('lista')}>
              <FiArrowLeft /> Volver
            </button>
            <div className="mtm-title">
              <span className="mtm-title-icon"><HiOutlineAcademicCap size={18} /></span>
              {isEdit ? 'Editar MTM' : 'Nueva Oportunidad MTM'}
            </div>
          </div>
        </div>

        <div className="mtm-form-container">
          <div className="mtm-form-header">
            <h3>{isEdit ? `Editando: ${selected?.nombreCargo}` : 'Crear oportunidad de Monitoría, Tutoría o Mentoría'}</h3>
            <p>Completa los campos para {isEdit ? 'actualizar' : 'registrar'} la oferta académica.</p>
          </div>

          <div className="mtm-form-body">

            {/* ── BLOQUE: Información básica */}
            <div className="mtm-form-section-title">Información básica</div>

            <div className="mtm-form-full mtm-form-group">
              <label className="mtm-form-label">Nombre del cargo <span>*</span></label>
              <input className="mtm-form-input" maxLength={250} placeholder="Ej: Monitor de Cálculo Diferencial"
                value={form.nombreCargo} onChange={e => setForm(f => ({ ...f, nombreCargo: e.target.value }))} />
            </div>

            <div className="mtm-form-group">
              <label className="mtm-form-label">Categoría</label>
              <select className="mtm-form-select" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                <option value="">Selecciona...</option>
                {categoriaItems.map(c => <option key={c._id} value={c._id}>{c.value}</option>)}
              </select>
            </div>

            <div className="mtm-form-group">
              <label className="mtm-form-label">Periodo académico</label>
              <select className="mtm-form-select" value={form.periodo} onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))}>
                <option value="">Selecciona...</option>
                {periodos.map(p => <option key={p._id} value={p._id}>{p.codigo}</option>)}
              </select>
            </div>

            {/* ── BLOQUE: Parámetros económicos */}
            <div className="mtm-form-section-title">Parámetros económicos</div>

            <div className="mtm-form-group">
              <label className="mtm-form-label">Dedicación horas por semana</label>
              <select className="mtm-form-select" value={form.dedicacionHoras} onChange={e => setForm(f => ({ ...f, dedicacionHoras: e.target.value }))}>
                <option value="">Selecciona...</option>
                {dedicacionItems.map(d => <option key={d._id} value={d._id}>{d.value}{d.description ? ` — ${d.description}` : ''}</option>)}
              </select>
            </div>

            <div className="mtm-form-group">
              <label className="mtm-form-label">Valor por hora</label>
              <select className="mtm-form-select" value={form.valorPorHora} onChange={e => setForm(f => ({ ...f, valorPorHora: e.target.value }))}>
                <option value="">Selecciona...</option>
                {valorItems.map(v => <option key={v._id} value={v._id}>{v.value}{v.description ? ` — ${v.description}` : ''}</option>)}
              </select>
            </div>

            <div className="mtm-form-group">
              <label className="mtm-form-label">Tipo de vinculación</label>
              <select className="mtm-form-select" value={form.tipoVinculacion} onChange={e => setForm(f => ({ ...f, tipoVinculacion: e.target.value }))}>
                <option value="">Selecciona...</option>
                {vinculacionItems.map(v => <option key={v._id} value={v._id}>{v.value}{v.description ? ` — ${v.description}` : ''}</option>)}
              </select>
            </div>

            <div className="mtm-form-group">
              <label className="mtm-form-label">Vacantes</label>
              <input className="mtm-form-input" type="number" min={1} placeholder="N° de vacantes"
                value={form.vacantes} onChange={e => setForm(f => ({ ...f, vacantes: e.target.value }))} />
            </div>

            {/* ── BLOQUE: Fechas y condiciones */}
            <div className="mtm-form-section-title">Fechas y condiciones</div>

            <div className="mtm-form-group">
              <label className="mtm-form-label">Fecha de vencimiento</label>
              <input className="mtm-form-input" type="date"
                value={form.fechaVencimiento} onChange={e => setForm(f => ({ ...f, fechaVencimiento: e.target.value }))} />
            </div>

            <div className="mtm-form-group">
              <label className="mtm-form-label">Promedio mínimo requerido</label>
              <input className="mtm-form-input" type="number" min={0} max={5} step={0.1} placeholder="Ej: 3.5"
                value={form.promedioMinimo} onChange={e => setForm(f => ({ ...f, promedioMinimo: e.target.value }))} />
            </div>

            {/* ── BLOQUE: Responsable */}
            <div className="mtm-form-section-title">Responsable y ofertante</div>

            <div className="mtm-form-group">
              <label className="mtm-form-label">Nombre del profesor / responsable</label>
              <input className="mtm-form-input" placeholder="Nombre completo"
                value={form.nombreProfesor} onChange={e => setForm(f => ({ ...f, nombreProfesor: e.target.value }))} />
            </div>

            <div className="mtm-form-group">
              <label className="mtm-form-label">Unidad académica o transversal</label>
              <input className="mtm-form-input" placeholder="Ej: Facultad de Economía"
                value={form.unidadAcademica} onChange={e => setForm(f => ({ ...f, unidadAcademica: e.target.value }))} />
            </div>

            <div className="mtm-form-group">
              <label className="mtm-form-label">Horario de la MTM</label>
              <input className="mtm-form-input" placeholder="Ej: Lunes y Miércoles 10:00–12:00"
                value={form.horario} onChange={e => setForm(f => ({ ...f, horario: e.target.value }))} />
            </div>

            <div className="mtm-form-group">
              <label className="mtm-form-label">Grupo</label>
              <input className="mtm-form-input" placeholder="Código o nombre del grupo"
                value={form.grupo} onChange={e => setForm(f => ({ ...f, grupo: e.target.value }))} />
            </div>

            {/* ── BLOQUE: Asignaturas */}
            <div className="mtm-form-section-title">Asignaturas asociadas (máx. 3)</div>

            <div className="mtm-form-full mtm-form-group">
              <label className="mtm-form-label">Buscar asignatura (código o nombre)</label>
              <div className="mtm-asig-wrap" ref={asigWrapRef}>
                <input
                  className="mtm-form-input"
                  placeholder="Escribe al menos 3 caracteres..."
                  value={asigSearch}
                  onChange={e => setAsigSearch(e.target.value)}
                  disabled={form.asignaturas.length >= 3}
                />
                {(showAsigDrop || asigLoading) && (
                  <div className="mtm-asig-dropdown">
                    {asigLoading
                      ? <div className="mtm-asig-item-loading">Buscando...</div>
                      : asigResults.length === 0
                        ? <div className="mtm-asig-item-loading">Sin resultados</div>
                        : asigResults.map(a => (
                          <div key={a._id} className="mtm-asig-item" onClick={() => addAsignatura(a)}>
                            <div className="mtm-asig-item-code">{a.codAsignatura}</div>
                            <div className="mtm-asig-item-name">{a.nombreAsignatura} · {a.nombreDepartamento}</div>
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>
              {form.asignaturas.length > 0 && (
                <div className="mtm-asig-tags">
                  {form.asignaturas.map(a => (
                    <span key={a._id} className="mtm-asig-tag">
                      <FiBookOpen size={11} />
                      {a.codAsignatura} — {a.nombreAsignatura}
                      <span className="mtm-asig-tag-remove" onClick={() => removeAsignatura(a._id)}><FiX size={11} /></span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── BLOQUE: Programas */}
            <div className="mtm-form-section-title">Programas académicos candidatos</div>

            <div className="mtm-form-full mtm-form-group">
              <label className="mtm-form-label">Buscar y seleccionar programas</label>
              <div className="mtm-programas-wrap" ref={programaWrapRef}>
                <input
                  className="mtm-form-input"
                  placeholder="Escribe el nombre del programa..."
                  value={programaSearch}
                  onChange={e => setProgramaSearch(e.target.value)}
                />
                {showProgramaDrop && programaResults.length > 0 && (
                  <div className="mtm-programas-dropdown">
                    {programaResults.map(p => {
                      const checked = !!form.programas.find(x => x._id === p._id);
                      return (
                        <div key={p._id} className="mtm-programa-item" onClick={() => togglePrograma(p)}>
                          <input type="checkbox" readOnly checked={checked} />
                          <div>
                            <div style={{ fontWeight: checked ? 600 : 400 }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>{p.labelLevel} · {p.code}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {form.programas.length > 0 && (
                <div className="mtm-programas-tags">
                  {form.programas.map(p => (
                    <span key={p._id} className="mtm-programa-tag">
                      <FiBookOpen size={11} />
                      {p.name}
                      <span className="mtm-programa-tag-remove" onClick={() => removePrograma(p._id)}><FiX size={11} /></span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── BLOQUE: Descripción */}
            <div className="mtm-form-section-title">Descripción de la oferta</div>

            <div className="mtm-form-full mtm-form-group">
              <label className="mtm-form-label">Funciones</label>
              <textarea className="mtm-form-textarea" maxLength={250} rows={3}
                placeholder="Describe las actividades y responsabilidades (máx. 250 caracteres)"
                value={form.funciones} onChange={e => setForm(f => ({ ...f, funciones: e.target.value }))} />
              <span style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right' }}>{form.funciones.length}/250</span>
            </div>

            <div className="mtm-form-full mtm-form-group">
              <label className="mtm-form-label">Requisitos</label>
              <textarea className="mtm-form-textarea" maxLength={250} rows={3}
                placeholder="Describe los requisitos del candidato (máx. 250 caracteres)"
                value={form.requisitos} onChange={e => setForm(f => ({ ...f, requisitos: e.target.value }))} />
              <span style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right' }}>{form.requisitos.length}/250</span>
            </div>

          </div>

          <div className="mtm-form-footer">
            <button className="mtm-btn-secondary" onClick={() => setVista('lista')} disabled={saving}>Cancelar</button>
            <button className="mtm-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><div className="mtm-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Guardando...</> : <><FiCheck size={14} /> {isEdit ? 'Guardar cambios' : 'Crear oportunidad'}</>}
            </button>
          </div>
        </div>
      </>
    );
  };

  // ── Vista Detalle ──────────────────────────────────────────────────────────
  const renderDetalle = () => {
    const op = selected;
    if (!op) return null;
    return (
      <>
        <div className="mtm-header">
          <div className="mtm-header-left">
            <button className="mtm-back-btn" onClick={() => setVista('lista')}>
              <FiArrowLeft /> Volver a lista
            </button>
            <div className="mtm-title">
              <span className="mtm-title-icon"><HiOutlineAcademicCap size={18} /></span>
              Detalle de oferta MTM
            </div>
          </div>
          {isAdmin && (
            <div className="mtm-header-actions">
              <button className="mtm-btn-secondary" onClick={() => handleEdit(op)}><FiEdit size={14} /> Editar</button>
              <button className="mtm-btn-secondary" onClick={() => handleDuplicate(op)}><FiCopy size={14} /> Duplicar</button>
            </div>
          )}
        </div>

        <div className="mtm-detail-card">
          <div className="mtm-detail-hero">
            <h2>{op.nombreCargo}</h2>
            <div className="mtm-detail-hero-meta">
              <span className={badgeClass(op.estado)}>{op.estado}</span>
              {op.periodo?.codigo && <span><FiCalendar size={13} style={{ marginRight: 4 }} />{op.periodo.codigo}</span>}
              {op.categoria?.value && <span><FiBookOpen size={13} style={{ marginRight: 4 }} />{op.categoria.value}</span>}
              {op.vacantes && <span><FiUsers size={13} style={{ marginRight: 4 }} />{op.vacantes} vacante{op.vacantes !== 1 ? 's' : ''}</span>}
            </div>
          </div>

          <div className="mtm-detail-body">
            <div className="mtm-detail-group">
              <div className="mtm-detail-label">Dedicación horas / semana</div>
              <div className="mtm-detail-value">{op.dedicacionHoras?.value || '—'}</div>
            </div>
            <div className="mtm-detail-group">
              <div className="mtm-detail-label">Valor por hora</div>
              <div className="mtm-detail-value">{op.valorPorHora?.value || '—'}</div>
            </div>
            <div className="mtm-detail-group">
              <div className="mtm-detail-label">Tipo de vinculación</div>
              <div className="mtm-detail-value">{op.tipoVinculacion?.value || '—'}</div>
            </div>
            <div className="mtm-detail-group">
              <div className="mtm-detail-label">Promedio mínimo requerido</div>
              <div className="mtm-detail-value">{op.promedioMinimo ?? '—'}</div>
            </div>
            <div className="mtm-detail-group">
              <div className="mtm-detail-label">Fecha de vencimiento</div>
              <div className="mtm-detail-value">{fmtDate(op.fechaVencimiento)}</div>
            </div>
            <div className="mtm-detail-group">
              <div className="mtm-detail-label">Grupo</div>
              <div className="mtm-detail-value">{op.grupo || '—'}</div>
            </div>
            <div className="mtm-detail-group">
              <div className="mtm-detail-label">Profesor / Responsable</div>
              <div className="mtm-detail-value">{op.nombreProfesor || '—'}</div>
            </div>
            <div className="mtm-detail-group">
              <div className="mtm-detail-label">Unidad académica</div>
              <div className="mtm-detail-value">{op.unidadAcademica || '—'}</div>
            </div>
            <div className="mtm-detail-group mtm-detail-full">
              <div className="mtm-detail-label">Horario</div>
              <div className="mtm-detail-value">{op.horario || '—'}</div>
            </div>

            <hr className="mtm-detail-section-divider" />

            {/* Asignaturas */}
            <div className="mtm-detail-group mtm-detail-full">
              <div className="mtm-detail-label">Asignaturas asociadas</div>
              {op.asignaturas?.length > 0 ? (
                <div className="mtm-asig-tags" style={{ marginTop: 8 }}>
                  {op.asignaturas.map(a => (
                    <span key={a._id} className="mtm-asig-tag">
                      <FiBookOpen size={11} />
                      {a.codAsignatura} — {a.nombreAsignatura}
                    </span>
                  ))}
                </div>
              ) : <div className="mtm-detail-value">—</div>}
            </div>

            {/* Programas */}
            <div className="mtm-detail-group mtm-detail-full">
              <div className="mtm-detail-label">Programas del candidato</div>
              {op.programas?.length > 0 ? (
                <div className="mtm-programas-tags" style={{ marginTop: 8 }}>
                  {op.programas.map(p => (
                    <span key={p._id} className="mtm-programa-tag">
                      {p.name} <span style={{ opacity: .7, fontSize: 10 }}>({p.labelLevel})</span>
                    </span>
                  ))}
                </div>
              ) : <div className="mtm-detail-value">—</div>}
            </div>

            <hr className="mtm-detail-section-divider" />

            {/* Funciones y requisitos */}
            {op.funciones && (
              <div className="mtm-detail-group mtm-detail-full">
                <div className="mtm-detail-label">Funciones</div>
                <div className="mtm-detail-value" style={{ whiteSpace: 'pre-wrap' }}>{op.funciones}</div>
              </div>
            )}
            {op.requisitos && (
              <div className="mtm-detail-group mtm-detail-full">
                <div className="mtm-detail-label">Requisitos</div>
                <div className="mtm-detail-value" style={{ whiteSpace: 'pre-wrap' }}>{op.requisitos}</div>
              </div>
            )}

            {/* Historial */}
            {op.historialEstados?.length > 0 && (
              <div className="mtm-detail-group mtm-detail-full">
                <div className="mtm-detail-label" style={{ marginBottom: 8 }}>Historial de estados</div>
                <div className="mtm-historial-list">
                  {[...op.historialEstados].reverse().map((h, i) => (
                    <div key={i} className="mtm-historial-item">
                      <div className="mtm-historial-dot" />
                      <div className="mtm-historial-info">
                        <div className="mtm-historial-states">
                          {h.estadoAnterior ? `${h.estadoAnterior} → ${h.estadoNuevo}` : h.estadoNuevo}
                        </div>
                        <div className="mtm-historial-date">{fmtDate(h.fechaCambio)}</div>
                        {h.motivo && <div className="mtm-historial-motivo">{h.motivo}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Acciones de estado */}
          {isAdmin && (
            <div className="mtm-detail-actions">
              {op.estado === 'Borrador' && (
                <button className="mtm-btn-success" onClick={() => handleChangeStatus(op, 'Activa')}>
                  <FiCheck size={14} /> Activar
                </button>
              )}
              {op.estado === 'Activa' && (
                <button className="mtm-btn-warning" onClick={() => handleChangeStatus(op, 'Inactiva')}>
                  <FiX size={14} /> Inactivar
                </button>
              )}
              {op.estado === 'Inactiva' && (
                <button className="mtm-btn-success" onClick={() => handleChangeStatus(op, 'Activa')}>
                  <FiCheck size={14} /> Reactivar
                </button>
              )}
              <button className="mtm-btn-danger" onClick={() => handleDelete(op)}>
                <FiTrash2 size={14} /> Eliminar
              </button>
            </div>
          )}
        </div>
      </>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="mtm-section">
      {vista === 'lista'              && renderLista()}
      {(vista === 'crear' || vista === 'editar') && renderForm()}
      {vista === 'detalle'            && renderDetalle()}
    </div>
  );
}
