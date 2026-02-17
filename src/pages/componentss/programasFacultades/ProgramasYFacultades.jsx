import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FiSearch,
  FiSave,
  FiPlus,
  FiArrowLeft,
} from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import '../../styles/ProgramasYFacultades.css';

const FACULTIES_LIMIT_OPTIONS = [10, 25, 50, 100];

export default function ProgramasYFacultades({ onVolver }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') === 'facultades' ? 'facultades' : 'programas';
  const estadoFromUrl = searchParams.get('estado');
  const [tab, setTab] = useState(tabFromUrl);
  const [subTabProgramas, setSubTabProgramas] = useState(estadoFromUrl === 'inactivos' ? 'inactivos' : 'activos');
  const [subTabFacultades, setSubTabFacultades] = useState(estadoFromUrl === 'inactivos' ? 'inactivos' : 'activos');

  const updateUrl = (newTab, estado) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', newTab);
    if (estado && estado !== 'activos') params.set('estado', estado);
    else params.delete('estado');
    setSearchParams(params, { replace: true });
  };
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchPrograma, setSearchPrograma] = useState('');

  const [programFaculties, setProgramFaculties] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [faculties, setFaculties] = useState([]);
  const [facultiesPagination, setFacultiesPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const facultiesLoadIdRef = useRef(0);

  const loadProgramFaculties = async (page = 1, statusFilter = null) => {
    setLoading(true);
    const status = statusFilter ?? (subTabProgramas === 'inactivos' ? 'INACTIVE' : 'ACTIVE');
    try {
      const { data } = await api.get('/program-faculties', { params: { page, limit: 10, status } });
      setProgramFaculties(data.data || []);
      setPagination({ page: data.pagination?.page ?? 1, limit: data.pagination?.limit ?? 10, total: data.pagination?.total ?? 0, pages: data.pagination?.pages ?? 1 });
    } catch (err) {
      console.error(err);
      setProgramFaculties([]);
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudieron cargar programas.' });
    } finally {
      setLoading(false);
    }
  };

  const loadFaculties = async (page, limit, statusFilter = null) => {
    const effectivePage = Math.max(1, parseInt(page, 10) || 1);
    const effectiveLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || facultiesPagination.limit || 10));
    const status = statusFilter ?? (subTabFacultades === 'inactivos' ? 'inactive' : 'ACTIVE');
    const loadId = ++facultiesLoadIdRef.current;
    setLoading(true);
    try {
      const { data } = await api.get('/faculties', { params: { page: effectivePage, limit: effectiveLimit, status } });
      if (loadId !== facultiesLoadIdRef.current) return;
      setFaculties(data.data || []);
      setFacultiesPagination({
        page: data.pagination?.page ?? effectivePage,
        limit: data.pagination?.limit ?? effectiveLimit,
        total: data.pagination?.total ?? 0,
        pages: Math.max(1, data.pagination?.pages ?? 1),
      });
    } catch (err) {
      if (loadId !== facultiesLoadIdRef.current) return;
      console.error(err);
      setFaculties([]);
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudieron cargar facultades.' });
    } finally {
      if (loadId === facultiesLoadIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'programas') {
      setPagination((prev) => ({ ...prev, page: 1 }));
      loadProgramFaculties(1);
    }
  }, [tab, subTabProgramas]);
  useEffect(() => {
    if (tab === 'facultades') {
      setFacultiesPagination((prev) => ({ ...prev, page: 1 }));
      loadFaculties(1, facultiesPagination.limit);
    }
  }, [tab, subTabFacultades]);

  const handleSyncProgramas = async () => {
    setSyncing(true);
    try {
      Swal.fire({
        title: 'Comparando con Universitas',
        text: 'Obteniendo programas y relaciones...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
      });
      const { data } = await api.get('/program-faculties/compare-universitas', { timeout: 60000 });
      Swal.close();
      if (!data.success) {
        Swal.fire({ icon: 'info', title: 'Comparación con Universitas', text: data.message || 'No se pudo comparar.' });
        return;
      }
      const {
        dbProgramsCount,
        apiProgramsCount,
        newProgramsCount,
        newPrograms,
        dbRelationsCount,
        apiRelationsCount,
        newRelationsCount,
        newRelations,
      } = data;

      const programsLabel = `Programas: BD ${dbProgramsCount} · Universitas ${apiProgramsCount}`;
      const relationsLabel = `Relaciones programa-facultad: BD ${dbRelationsCount} · Universitas ${apiRelationsCount}`;

      if (newProgramsCount === 0 && newRelationsCount === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Comparación con Universitas',
          html: `<div class="pyf-compare-modal"><p><strong>${programsLabel}</strong></p><p><strong>${relationsLabel}</strong></p><p>No hay programas ni relaciones nuevas para agregar.</p></div>`,
          confirmButtonColor: '#c41e3a',
        });
        return;
      }

      const parts = [];
      if (newProgramsCount > 0) parts.push(`${newProgramsCount} programa(s) nuevo(s)`);
      if (newRelationsCount > 0) parts.push(`${newRelationsCount} relación(es) programa-facultad nueva(s)`);
      const summary = parts.join(' y ');

      const result = await Swal.fire({
        icon: 'question',
        title: 'Programas y relaciones nuevas en Universitas',
        html: `<div class="pyf-compare-modal"><p><strong>${programsLabel}</strong></p><p><strong>${relationsLabel}</strong></p><p>Faltan por crear: ${summary}.</p><p>¿Desea crearlos en la base de datos?</p></div>`,
        showCancelButton: true,
        confirmButtonText: 'Sí, crearlos',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#c41e3a',
        cancelButtonColor: '#6c757d',
      });

      if (result.isConfirmed) {
        Swal.fire({
          title: 'Creando en la base de datos',
          text: 'Creando programas y relaciones...',
          allowOutsideClick: false,
          didOpen: () => { Swal.showLoading(); },
        });
        const createRes = await api.post(
          '/program-faculties/create-from-universitas',
          { newPrograms: newPrograms || [], newRelations: newRelations || [] },
          { timeout: 120000 }
        );
        Swal.close();
        const resData = createRes.data || {};
        const errList = resData.errors;
        if (errList && errList.length > 0) {
          const createdSummary = `${resData.createdPrograms?.length ?? 0} programa(s), ${(resData.createdRelations?.length ?? 0)} relación(es)`;
          const errorsHtml = `<ul class="pyf-compare-list">${errList.map((e) => `<li><strong>${e.item || '—'}</strong>: ${e.message || ''}</li>`).join('')}</ul>`;
          Swal.fire({
            icon: 'warning',
            title: 'Proceso completado con observaciones',
            html: `<div class="pyf-compare-modal"><p>${resData.message || 'Completado.'}</p><p><strong>Creados:</strong> ${createdSummary}</p><p><strong>Errores (${errList.length}):</strong></p>${errorsHtml}</div>`,
            confirmButtonColor: '#c41e3a',
            width: '560px',
          });
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Listo',
            text: resData.message || 'Proceso completado.',
            confirmButtonColor: '#c41e3a',
          });
        }
        loadProgramFaculties(1);
      }
    } catch (err) {
      Swal.close();
      const isTimeout = err.code === 'ECONNABORTED' || (err.message && String(err.message).toLowerCase().includes('timeout'));
      const msg = isTimeout
        ? 'La solicitud tardó demasiado. Si el servidor siguió procesando, los datos pueden haberse creado. Revise la lista de programas o intente de nuevo.'
        : (err.response?.data?.message || 'Error al comparar con Universitas. Revisar URL_OSB, USS_URJOB y PASS_URJOB en el backend.');
      Swal.fire({ icon: 'error', title: 'Error', text: msg });
      if (isTimeout) loadProgramFaculties(1);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncFacultades = async () => {
    setSyncing(true);
    try {
      Swal.fire({
        title: 'Comparando con Universitas',
        text: 'Obteniendo facultades...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
      });
      const { data } = await api.get('/faculties/compare-universitas', { timeout: 60000 });
      Swal.close();
      if (!data.success) {
        Swal.fire({ icon: 'info', title: 'Comparación con Universitas', text: data.message || 'No se pudo comparar.' });
        return;
      }
      const { dbCount, universitasCount, newFaculties } = data;
      const dbLabel = `Base de datos: ${dbCount} facultad${dbCount !== 1 ? 'es' : ''}`;
      const uniLabel = `Universitas: ${universitasCount} facultad${universitasCount !== 1 ? 'es' : ''}`;

      if (newFaculties.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Comparación con Universitas',
          html: `<div class="pyf-compare-modal"><p><strong>${dbLabel}</strong></p><p><strong>${uniLabel}</strong></p><p>No hay facultades nuevas para agregar.</p></div>`,
          confirmButtonColor: '#c41e3a',
        });
        return;
      }

      const listHtml = newFaculties.map((f) => `<li><strong>${f.cod_facultad}</strong> – ${f.nombre_facultad || '-'}</li>`).join('');
      const result = await Swal.fire({
        icon: 'question',
        title: 'Facultades nuevas en Universitas',
        html: `<div class="pyf-compare-modal"><p>${dbLabel}</p><p>${uniLabel}</p><p>Las ${newFaculties.length} facultad(es) adicional(es) son:</p><ul class="pyf-compare-list">${listHtml}</ul><p>¿Desea crearlas en la base de datos?</p></div>`,
        showCancelButton: true,
        confirmButtonText: 'Sí, crearlas',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#c41e3a',
        cancelButtonColor: '#6c757d',
      });

      if (result.isConfirmed) {
        Swal.fire({
          title: 'Creando en la base de datos',
          text: 'Creando facultades...',
          allowOutsideClick: false,
          didOpen: () => { Swal.showLoading(); },
        });
        const createRes = await api.post('/faculties/create-from-universitas', { faculties: newFaculties }, { timeout: 120000 });
        Swal.close();
        const resData = createRes.data || {};
        const errList = resData.errors;
        if (errList && errList.length > 0) {
          const createdCount = resData.created?.length ?? 0;
          const errorsHtml = `<ul class="pyf-compare-list">${errList.map((e) => `<li><strong>${e.item || '—'}</strong>: ${e.message || ''}</li>`).join('')}</ul>`;
          Swal.fire({
            icon: 'warning',
            title: 'Proceso completado con observaciones',
            html: `<div class="pyf-compare-modal"><p>${resData.message || 'Completado.'}</p><p><strong>Creadas:</strong> ${createdCount} facultad(es)</p><p><strong>Errores (${errList.length}):</strong></p>${errorsHtml}</div>`,
            confirmButtonColor: '#c41e3a',
            width: '560px',
          });
        } else {
          const created = resData.created?.length ?? 0;
          Swal.fire({ icon: 'success', title: 'Listo', text: resData.message || `Se crearon ${created} facultad(es).`, confirmButtonColor: '#c41e3a' });
        }
        loadFaculties(1, facultiesPagination.limit);
      }
    } catch (err) {
      Swal.close();
      const isTimeout = err.code === 'ECONNABORTED' || (err.message && String(err.message).toLowerCase().includes('timeout'));
      const msg = isTimeout
        ? 'La solicitud tardó demasiado. Si el servidor siguió procesando, los datos pueden haberse creado. Revise la lista de facultades o intente de nuevo.'
        : (err.response?.data?.message || 'Error al comparar con Universitas. Revisar URL_OSB, USS_URJOB y PASS_URJOB en el backend.');
      Swal.fire({ icon: 'error', title: 'Error', text: msg });
      if (isTimeout) loadFaculties(1, facultiesPagination.limit);
    } finally {
      setSyncing(false);
    }
  };

  const showConfirmation = (title, text, confirmButtonText = 'Sí, continuar') =>
    Swal.fire({ title, text, icon: 'warning', showCancelButton: true, confirmButtonColor: '#c41e3a', cancelButtonColor: '#6c757d', confirmButtonText, cancelButtonText: 'Cancelar' });

  const handleToggleProgramFaculty = async (pf, currentActive) => {
    const id = pf._id;
    if (!id || updatingId) return;
    const result = await showConfirmation(currentActive ? 'Desactivar programa' : 'Activar programa', `¿Está seguro de que desea ${currentActive ? 'desactivar' : 'activar'} "${pf.nombrePrograma ?? pf.program?.name ?? 'este programa'}"?`, `Sí, ${currentActive ? 'desactivar' : 'activar'}`);
    if (!result.isConfirmed) return;
    const nextActivo = currentActive ? 'NO' : 'SI';
    const nextStatus = currentActive ? 'INACTIVE' : 'ACTIVE';
    setUpdatingId(id);
    try {
      await api.put(`/program-faculties/${id}`, { activo: nextActivo, status: nextStatus });
      await Swal.fire({ icon: 'success', title: 'Éxito', text: nextActivo === 'SI' ? 'Programa activado correctamente.' : 'Programa desactivado correctamente.', confirmButtonColor: '#c41e3a' });
      loadProgramFaculties(pagination.page);
    } catch (err) { Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo actualizar.', confirmButtonColor: '#c41e3a' }); }
    finally { setUpdatingId(null); }
  };

  const handleToggleFaculty = async (f, currentActive) => {
    const id = f._id;
    if (!id || updatingId) return;
    const result = await showConfirmation(currentActive ? 'Desactivar facultad' : 'Activar facultad', `¿Está seguro de que desea ${currentActive ? 'desactivar' : 'activar'} "${f.name ?? 'esta facultad'}"?`, `Sí, ${currentActive ? 'desactivar' : 'activar'}`);
    if (!result.isConfirmed) return;
    const nextStatus = currentActive ? 'inactive' : 'ACTIVE';
    setUpdatingId(id);
    try {
      await api.put(`/faculties/${id}`, { status: nextStatus });
      await Swal.fire({ icon: 'success', title: 'Éxito', text: nextStatus === 'ACTIVE' ? 'Facultad activada correctamente.' : 'Facultad desactivada correctamente.', confirmButtonColor: '#c41e3a' });
      loadFaculties(facultiesPagination.page, facultiesPagination.limit);
    } catch (err) { Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo actualizar.', confirmButtonColor: '#c41e3a' }); }
    finally { setUpdatingId(null); }
  };

  const groupedByFaculty = useMemo(() => {
    const filtered = searchPrograma.trim() ? programFaculties.filter((pf) => (pf.nombrePrograma || '').toLowerCase().includes(searchPrograma.toLowerCase()) || (pf.codigoPrograma || '').toLowerCase().includes(searchPrograma.toLowerCase())) : programFaculties;
    const map = new Map();
    filtered.forEach((pf) => {
      const key = pf.faculty?._id || pf.codigoFacultad || 'sin-facultad';
      const label = pf.nombreFacultad || pf.faculty?.name || 'Sin facultad';
      const code = pf.codigoFacultad || pf.faculty?.code || '';
      if (!map.has(key)) map.set(key, { label, code, rows: [] });
      map.get(key).rows.push(pf);
    });
    return Array.from(map.entries()).map(([key, { label, code, rows }]) => ({ key, label, code, rows }));
  }, [programFaculties, searchPrograma]);

  return (
    <div className="programas-facultades-content">
      <div className="pyf-section">
        <div className="users-header">
          <div className="configuracion-actions">
            <button type="button" className="btn-volver" onClick={onVolver}><FiArrowLeft className="btn-icon" /> Volver</button>
            {tab === 'programas' && (
            <button type="button" className="pyf-btn pyf-btn-sync" onClick={handleSyncProgramas} disabled={syncing}><FiSave className="pyf-btn-icon" /> Actualizar Info Programas (Universitas)</button>
            )}
            {tab === 'facultades' && <button type="button" className="pyf-btn pyf-btn-sync" onClick={handleSyncFacultades} disabled={syncing}><FiSave className="pyf-btn-icon" /> Actualizar Info Facultades (Universitas)</button>}
            
          </div>
        </div>
        <div className="pyf-toolbar">
        <div className="pyf-search">
          <FiSearch className="pyf-search-icon" />
          <input type="text" placeholder="Buscar programa" value={searchPrograma} onChange={(e) => setSearchPrograma(e.target.value)} className="pyf-search-input" />
        </div>
      </div>
      <div className="pyf-tabs">
        <button type="button" className={`pyf-tab ${tab === 'programas' ? 'active' : ''}`} onClick={() => { setTab('programas'); updateUrl('programas', subTabProgramas); }}>Programas</button>
        <button type="button" className={`pyf-tab ${tab === 'facultades' ? 'active' : ''}`} onClick={() => { setTab('facultades'); updateUrl('facultades', subTabFacultades); }}>Facultades</button>
      </div>
      {tab === 'programas' && (
        <div className="pyf-subtabs">
          <button type="button" className={`pyf-subtab ${subTabProgramas === 'activos' ? 'active' : ''}`} onClick={() => { setSubTabProgramas('activos'); setPagination((p) => ({ ...p, page: 1 })); updateUrl('programas', 'activos'); loadProgramFaculties(1); }}>Activos</button>
          <button type="button" className={`pyf-subtab ${subTabProgramas === 'inactivos' ? 'active' : ''}`} onClick={() => { setSubTabProgramas('inactivos'); setPagination((p) => ({ ...p, page: 1 })); updateUrl('programas', 'inactivos'); loadProgramFaculties(1); }}>Inactivos</button>
        </div>
      )}
      {tab === 'facultades' && (
        <div className="pyf-subtabs">
          <button type="button" className={`pyf-subtab ${subTabFacultades === 'activos' ? 'active' : ''}`} onClick={() => { setSubTabFacultades('activos'); setFacultiesPagination((p) => ({ ...p, page: 1 })); updateUrl('facultades', 'activos'); loadFaculties(1, facultiesPagination.limit); }}>Activos</button>
          <button type="button" className={`pyf-subtab ${subTabFacultades === 'inactivos' ? 'active' : ''}`} onClick={() => { setSubTabFacultades('inactivos'); setFacultiesPagination((p) => ({ ...p, page: 1 })); updateUrl('facultades', 'inactivos'); loadFaculties(1, facultiesPagination.limit); }}>Inactivos</button>
        </div>
      )}
      {tab === 'programas' && (
        <div className="pyf-table-wrap">
          {loading ? <div className="pyf-loading">Cargando programas...</div> : (
            <table className="pyf-table">
              <thead><tr><th>FACULTAD(ES)</th><th>CÓD. PROGRAMA</th><th>PROGRAMA</th><th>NIVEL</th><th>ESTADO</th></tr></thead>
              <tbody>
                {groupedByFaculty.length === 0 ? (
                  <tr><td colSpan={5} className="pyf-no-data">No hay programas. Use &quot;Actualizar Info Programas (Universitas)&quot; o registre manualmente.</td></tr>
                ) : (
                  groupedByFaculty.map(({ key, label, code, rows }) =>
                    rows.map((pf, idx) => (
                      <tr key={pf._id || `${key}-${idx}`}>
                        <td>
                          <span className="pyf-facultad-cell">
                            <span className="pyf-facultad-bullet">•</span>
                            {code ? `${code}-` : ''}{label}
                          </span>
                        </td>
                        <td>{pf.codigoPrograma ?? pf.program?.code ?? pf.code ?? '-'}</td>
                        <td>
                          {pf.program?._id ? (
                            <button type="button" className="pyf-link" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/programas-facultades/programa/${pf.program._id}`); }}>
                              {pf.nombrePrograma ?? pf.program?.name ?? '-'}
                            </button>
                          ) : (
                            pf.nombrePrograma ?? pf.program?.name ?? '-'
                          )}
                        </td>
                        <td>{pf.program?.level ?? pf.program?.label_level ?? '-'}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {(() => {
                            const estadoRelacion = (pf.estado ?? pf.status ?? '').toString().toUpperCase();
                            const isActive = estadoRelacion === 'ACTIVE';
                            return (
                              <div className="switch-container">
                                <label className="switch">
                                  <input type="checkbox" checked={isActive} onChange={() => handleToggleProgramFaculty(pf, isActive)} disabled={updatingId === pf._id} />
                                  <span className="slider" />
                                </label>
                                <span className={`status-text ${isActive ? 'active' : 'inactive'}`}>{isActive ? 'Activo' : 'Inactivo'}</span>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          )}
          {tab === 'programas' && pagination.pages > 1 && (
            <div className="pyf-pagination">
              <button type="button" className="pyf-page-btn" disabled={pagination.page <= 1} onClick={() => loadProgramFaculties(1)}>&laquo;&laquo;</button>
              <button type="button" className="pyf-page-btn" disabled={pagination.page <= 1} onClick={() => loadProgramFaculties(pagination.page - 1)}>&laquo;</button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => { const p = pagination.page <= 3 ? i + 1 : Math.max(1, pagination.page - 2 + i); if (p > pagination.pages) return null; return <button key={p} type="button" className={`pyf-page-btn ${p === pagination.page ? 'active' : ''}`} onClick={() => loadProgramFaculties(p)}>{p}</button>; })}
              <button type="button" className="pyf-page-btn" disabled={pagination.page >= pagination.pages} onClick={() => loadProgramFaculties(pagination.page + 1)}>&raquo;</button>
              <button type="button" className="pyf-page-btn" disabled={pagination.page >= pagination.pages} onClick={() => loadProgramFaculties(pagination.pages)}>&raquo;&raquo;</button>
              <span className="pyf-page-info">{pagination.total} resultado(s) · Página {pagination.page} de {pagination.pages}</span>
            </div>
          )}
        </div>
      )}
      {tab === 'facultades' && (
        <div className="pyf-table-wrap">
          <div className="pyf-facultades-toolbar">
            <label className="pyf-limit-label">
              Mostrar
              <select
                className="pyf-limit-select"
                value={facultiesPagination.limit}
                onChange={(e) => {
                  const newLimit = Number(e.target.value);
                  setFacultiesPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
                  loadFaculties(1, newLimit);
                }}
                disabled={loading}
              >
                {FACULTIES_LIMIT_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              por página
            </label>
          </div>
          {loading ? <div className="pyf-loading">Cargando facultades...</div> : (
            <table className="pyf-table">
              <thead><tr><th>CÓDIGO FACULTAD</th><th>NOMBRE FACULTAD</th><th>ESTADO</th></tr></thead>
              <tbody>
                {faculties.length === 0 ? (
                  <tr><td colSpan={3} className="pyf-no-data">No hay facultades. Use &quot;Actualizar Info Facultades (Universitas)&quot; o registre manualmente.</td></tr>
                ) : (
                  faculties.map((f) => {
                    const isActive = (f.status || '').toLowerCase() === 'active' || f.status === 'ACTIVE';
                    return (
                      <tr key={f._id}>
                        <td>{f.code ?? '-'}</td>
                        <td>
                          {f._id ? (
                            <button type="button" className="pyf-link" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/programas-facultades/facultad/${f._id}`); }}>
                              {f.name ?? '-'}
                            </button>
                          ) : (
                            f.name ?? '-'
                          )}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="switch-container">
                            <label className="switch">
                              <input type="checkbox" checked={isActive} onChange={() => handleToggleFaculty(f, isActive)} disabled={updatingId === f._id} />
                              <span className="slider" />
                            </label>
                            <span className={`status-text ${isActive ? 'active' : 'inactive'}`}>{isActive ? 'Activo' : 'Inactivo'}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
          {tab === 'facultades' && (facultiesPagination.pages > 1 || facultiesPagination.total > facultiesPagination.limit) && (
            <div className="pyf-pagination">
              <button type="button" className="pyf-page-btn" disabled={loading || facultiesPagination.page <= 1} onClick={() => loadFaculties(1, facultiesPagination.limit)}>&laquo;&laquo;</button>
              <button type="button" className="pyf-page-btn" disabled={loading || facultiesPagination.page <= 1} onClick={() => loadFaculties(facultiesPagination.page - 1, facultiesPagination.limit)}>&laquo;</button>
              {Array.from({ length: Math.min(5, facultiesPagination.pages) }, (_, i) => { const p = facultiesPagination.page <= 3 ? i + 1 : Math.max(1, facultiesPagination.page - 2 + i); if (p > facultiesPagination.pages) return null; return <button key={p} type="button" className={`pyf-page-btn ${p === facultiesPagination.page ? 'active' : ''}`} disabled={loading} onClick={() => loadFaculties(p, facultiesPagination.limit)}>{p}</button>; })}
              <button type="button" className="pyf-page-btn" disabled={loading || facultiesPagination.page >= facultiesPagination.pages} onClick={() => loadFaculties(facultiesPagination.page + 1, facultiesPagination.limit)}>&raquo;</button>
              <button type="button" className="pyf-page-btn" disabled={loading || facultiesPagination.page >= facultiesPagination.pages} onClick={() => loadFaculties(facultiesPagination.pages, facultiesPagination.limit)}>&raquo;&raquo;</button>
              <span className="pyf-page-info">{facultiesPagination.total} resultado(s) · Página {facultiesPagination.page} de {facultiesPagination.pages}</span>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
