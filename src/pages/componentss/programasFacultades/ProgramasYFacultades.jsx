import React, { useState, useEffect, useMemo } from 'react';
import {
  FiSearch,
  FiSave,
  FiPlus,
  FiArrowLeft,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import '../../styles/ProgramasYFacultades.css';

export default function ProgramasYFacultades({ onVolver }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('programas');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchPrograma, setSearchPrograma] = useState('');

  const [programFaculties, setProgramFaculties] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [faculties, setFaculties] = useState([]);
  const [facultiesPagination, setFacultiesPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const loadProgramFaculties = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get('/program-faculties', { params: { page, limit: 10 } });
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

  const loadFaculties = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get('/faculties', { params: { page, limit: 10 } });
      setFaculties(data.data || []);
      setFacultiesPagination({ page: data.pagination?.page ?? 1, limit: data.pagination?.limit ?? 10, total: data.pagination?.total ?? 0, pages: data.pagination?.pages ?? 1 });
    } catch (err) {
      console.error(err);
      setFaculties([]);
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudieron cargar facultades.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (tab === 'programas') loadProgramFaculties(pagination.page); }, [tab]);
  useEffect(() => { if (tab === 'facultades') loadFaculties(facultiesPagination.page); }, [tab]);

  const handleSyncProgramas = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post('/program-faculties/sync');
      if (data.success) { Swal.fire({ icon: 'success', title: 'Sincronización completada', text: data.message + (data.synced != null ? ` (${data.synced} procesados)` : '') }); loadProgramFaculties(1); }
      else { Swal.fire({ icon: 'info', title: 'Integración UXXI', text: data.message || 'Configurar UXXI_GET_PROGRAMAS_URL.' }); }
    } catch (err) { Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Error al sincronizar.' }); }
    finally { setSyncing(false); }
  };

  const handleSyncFacultades = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post('/faculties/sync');
      if (data.success) { Swal.fire({ icon: 'success', title: 'Sincronización completada', text: data.message + (data.synced != null ? ` (${data.synced} procesados)` : '') }); loadFaculties(1); }
      else { Swal.fire({ icon: 'info', title: 'Integración UXXI', text: data.message || 'Configurar UXXI_GET_FACULTIES_URL.' }); }
    } catch (err) { Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Error al sincronizar.' }); }
    finally { setSyncing(false); }
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
      setProgramFaculties((prev) => prev.map((p) => (p._id === id ? { ...p, activo: nextActivo, estado: nextStatus, status: nextStatus } : p)));
      await Swal.fire({ icon: 'success', title: 'Éxito', text: nextActivo === 'SI' ? 'Programa activado correctamente.' : 'Programa desactivado correctamente.', confirmButtonColor: '#c41e3a' });
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
      setFaculties((prev) => prev.map((fac) => (fac._id === id ? { ...fac, status: nextStatus } : fac)));
      await Swal.fire({ icon: 'success', title: 'Éxito', text: nextStatus === 'ACTIVE' ? 'Facultad activada correctamente.' : 'Facultad desactivada correctamente.', confirmButtonColor: '#c41e3a' });
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
        <button type="button" className={`pyf-tab ${tab === 'programas' ? 'active' : ''}`} onClick={() => setTab('programas')}>Programas</button>
        <button type="button" className={`pyf-tab ${tab === 'facultades' ? 'active' : ''}`} onClick={() => setTab('facultades')}>Facultades</button>
      </div>
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
                            const isActive = pf.activo === 'SI' || (pf.estado || pf.status) === 'ACTIVE';
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
          {tab === 'facultades' && facultiesPagination.pages > 1 && (
            <div className="pyf-pagination">
              <button type="button" className="pyf-page-btn" disabled={facultiesPagination.page <= 1} onClick={() => loadFaculties(1)}>&laquo;&laquo;</button>
              <button type="button" className="pyf-page-btn" disabled={facultiesPagination.page <= 1} onClick={() => loadFaculties(facultiesPagination.page - 1)}>&laquo;</button>
              {Array.from({ length: Math.min(5, facultiesPagination.pages) }, (_, i) => { const p = facultiesPagination.page <= 3 ? i + 1 : Math.max(1, facultiesPagination.page - 2 + i); if (p > facultiesPagination.pages) return null; return <button key={p} type="button" className={`pyf-page-btn ${p === facultiesPagination.page ? 'active' : ''}`} onClick={() => loadFaculties(p)}>{p}</button>; })}
              <button type="button" className="pyf-page-btn" disabled={facultiesPagination.page >= facultiesPagination.pages} onClick={() => loadFaculties(facultiesPagination.page + 1)}>&raquo;</button>
              <button type="button" className="pyf-page-btn" disabled={facultiesPagination.page >= facultiesPagination.pages} onClick={() => loadFaculties(facultiesPagination.pages)}>&raquo;&raquo;</button>
              <span className="pyf-page-info">{facultiesPagination.total} resultado(s) · Página {facultiesPagination.page} de {facultiesPagination.pages}</span>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
