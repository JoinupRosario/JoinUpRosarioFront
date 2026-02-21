import React, { useState, useEffect, useRef } from 'react';
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

// Helper: grid de estadísticas para la pestaña Resumen de los modales de sync
const buildSyncResumenHtml = ({ dbProgramsCount, apiProgramsCount, dbRelationsCount, apiRelationsCount, dbFacultiesCount, apiFacultiesCount }) => {
  const stats = [
    dbProgramsCount   != null && { label: 'BD Programas',   value: dbProgramsCount },
    apiProgramsCount  != null && { label: 'UXXI Programas', value: apiProgramsCount },
    dbRelationsCount  != null && { label: 'BD Relaciones',  value: dbRelationsCount },
    apiRelationsCount != null && { label: 'UXXI Relaciones',value: apiRelationsCount },
    dbFacultiesCount  != null && { label: 'BD Facultades',  value: dbFacultiesCount },
    apiFacultiesCount != null && { label: 'UXXI Facultades',value: apiFacultiesCount },
  ].filter(Boolean);
  const cols = stats.length <= 2 ? stats.length : stats.length <= 4 ? 2 : 3;
  const items = stats.map(s =>
    `<div class="pyf-sync-stat-item"><span class="pyf-sync-stat-label">${s.label}</span><span class="pyf-sync-stat-value">${s.value}</span></div>`
  ).join('');
  return `<div class="pyf-sync-stats" style="grid-template-columns:repeat(${cols},1fr);margin-bottom:14px">${items}</div>`;
};

// Helper: construye y controla pestañas en un modal Swal ya abierto
const wireSyncTabs = (popup) => {
  popup.querySelectorAll('.pyf-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      popup.querySelectorAll('.pyf-tab-btn').forEach(b => b.classList.remove('pyf-tab-active'));
      popup.querySelectorAll('.pyf-tab-pane').forEach(p => p.classList.remove('pyf-tab-pane-active'));
      btn.classList.add('pyf-tab-active');
      popup.querySelector(`[data-pane="${btn.dataset.tab}"]`).classList.add('pyf-tab-pane-active');
    });
  });
};

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
  const searchDebounceRef = useRef(null);

  const [programs, setPrograms] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [faculties, setFaculties] = useState([]);
  const [facultiesPagination, setFacultiesPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const facultiesLoadIdRef = useRef(0);

  // Carga programas únicos desde la colección `programs`
  const loadPrograms = async (page = 1, statusFilter = null, searchOverride = undefined) => {
    setLoading(true);
    const status = statusFilter ?? (subTabProgramas === 'inactivos' ? 'INACTIVE' : 'ACTIVE');
    const search = searchOverride !== undefined ? searchOverride : searchPrograma.trim();
    try {
      const params = { page, limit: 10, status };
      if (search) params.search = search;
      const { data } = await api.get('/programs', { params });
      setPrograms(data.data || []);
      setPagination({ page: data.pagination?.page ?? 1, limit: data.pagination?.limit ?? 10, total: data.pagination?.total ?? 0, pages: data.pagination?.pages ?? 1 });
    } catch (err) {
      console.error(err);
      setPrograms([]);
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudieron cargar programas.' });
    } finally {
      setLoading(false);
    }
  };

  // Mantener alias para compatibilidad con callbacks de sync
  const loadProgramFaculties = (page = 1) => loadPrograms(page);

  const loadFaculties = async (page, limit, statusFilter = null, searchOverride = undefined) => {
    const effectivePage = Math.max(1, parseInt(page, 10) || 1);
    const effectiveLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || facultiesPagination.limit || 10));
    const status = statusFilter ?? (subTabFacultades === 'inactivos' ? 'inactive' : 'ACTIVE');
    const search = searchOverride !== undefined ? searchOverride : searchPrograma.trim();
    const loadId = ++facultiesLoadIdRef.current;
    setLoading(true);
    try {
      const params = { page: effectivePage, limit: effectiveLimit, status };
      if (search) params.search = search;
      const { data } = await api.get('/faculties', { params });
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
      loadPrograms(1);
    }
  }, [tab, subTabProgramas]);

  useEffect(() => {
    if (tab === 'facultades') {
      setFacultiesPagination((prev) => ({ ...prev, page: 1 }));
      loadFaculties(1, facultiesPagination.limit);
    }
  }, [tab, subTabFacultades]);

  // Debounce: buscar en backend 400ms después de que el usuario deje de escribir
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const q = searchPrograma.trim();
      if (tab === 'programas') {
        setPagination((prev) => ({ ...prev, page: 1 }));
        loadPrograms(1, null, q);
      } else if (tab === 'facultades') {
        setFacultiesPagination((prev) => ({ ...prev, page: 1 }));
        loadFaculties(1, facultiesPagination.limit, null, q);
      }
    }, 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchPrograma]);

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
        dbProgramsCount, apiProgramsCount,
        newProgramsCount, newPrograms = [],
        dbRelationsCount, apiRelationsCount,
        newRelationsCount, newRelations = [],
        toDeactivateRelations = [],
        toDeactivatePrograms = [],
        duplicatePrograms = [],
      } = data;

      const hayCambios = newProgramsCount > 0 || newRelationsCount > 0 ||
        toDeactivateRelations.length > 0 || toDeactivatePrograms.length > 0 || duplicatePrograms.length > 0;

      if (!hayCambios) {
        Swal.fire({
          icon: 'success',
          title: 'Todo sincronizado',
          html: buildSyncResumenHtml({ dbProgramsCount, apiProgramsCount, dbRelationsCount, apiRelationsCount }),
          confirmButtonColor: '#c41e3a',
          width: '560px',
        });
        return;
      }

      // ── Construir pestañas ────────────────────────────────────────────────
      const tabs = [{ id: 'resumen', label: 'Resumen', type: 'info' }];
      const panes = [];

      // Pestaña Resumen
      const resumenChanges = [
        newProgramsCount > 0    && `<div class="pyf-sync-change green">➕ ${newProgramsCount} programa(s) por crear</div>`,
        newRelationsCount > 0   && `<div class="pyf-sync-change green">➕ ${newRelationsCount} relación(es) por crear</div>`,
        toDeactivatePrograms.length > 0 && `<div class="pyf-sync-change red">🔴 ${toDeactivatePrograms.length} programa(s) no en Universitas → inactivar</div>`,
        duplicatePrograms.length > 0    && `<div class="pyf-sync-change red">🔴 ${duplicatePrograms.length} programa(s) duplicado(s) → inactivar</div>`,
        toDeactivateRelations.length > 0 && `<div class="pyf-sync-change orange">⚠️ ${toDeactivateRelations.length} relación(es) → inactivar</div>`,
      ].filter(Boolean).join('');
      panes.push({ id: 'resumen', html: `${buildSyncResumenHtml({ dbProgramsCount, apiProgramsCount, dbRelationsCount, apiRelationsCount })}<div class="pyf-sync-changes">${resumenChanges}</div>` });

      // Pestaña nuevos
      if (newProgramsCount > 0 || newRelationsCount > 0) {
        const total = newProgramsCount + newRelationsCount;
        tabs.push({ id: 'nuevos', label: `➕ Nuevos (${total})`, type: 'green' });
        let html = '';
        if (newProgramsCount > 0) {
          html += `<p class="pyf-sync-section-title">Programas nuevos (${newProgramsCount})</p><ul class="pyf-compare-list">`;
          html += newPrograms.map(p => `<li>${p.nombre_programa || '-'} <em style="color:#6c757d">(${p.tipo_estudio || '-'})</em></li>`).join('');
          html += '</ul>';
        }
        if (newRelationsCount > 0)
          html += `<p class="pyf-sync-section-title" style="margin-top:10px">Relaciones nuevas: ${newRelationsCount} (ver detalle al aplicar)</p>`;
        panes.push({ id: 'nuevos', html });
      }

      // Pestaña inactivar programas
      const totalInac = toDeactivatePrograms.length + duplicatePrograms.length;
      if (totalInac > 0) {
        tabs.push({ id: 'inactivar', label: `🔴 Programas (${totalInac})`, type: 'red' });
        let html = '';
        if (toDeactivatePrograms.length > 0) {
          html += `<p class="pyf-sync-section-title">No están en Universitas (${toDeactivatePrograms.length})</p><ul class="pyf-compare-list">`;
          html += toDeactivatePrograms.map(p => `<li>${p.name || '-'}</li>`).join('');
          html += '</ul>';
        }
        if (duplicatePrograms.length > 0) {
          html += `<p class="pyf-sync-section-title" style="margin-top:10px">Duplicados — se conserva el más antiguo (${duplicatePrograms.length})</p><ul class="pyf-compare-list">`;
          html += duplicatePrograms.map(p => `<li>${p.name || '-'}</li>`).join('');
          html += '</ul>';
        }
        panes.push({ id: 'inactivar', html });
      }

      // Pestaña inactivar relaciones
      if (toDeactivateRelations.length > 0) {
        tabs.push({ id: 'relaciones', label: `⚠️ Relaciones (${toDeactivateRelations.length})`, type: 'orange' });
        const html = `<p class="pyf-sync-section-title">Relaciones ya no en Universitas (${toDeactivateRelations.length})</p><ul class="pyf-compare-list">` +
          toDeactivateRelations.map(r => `<li><strong>${r.code}</strong> – ${r.programName || '-'}</li>`).join('') + '</ul>';
        panes.push({ id: 'relaciones', html });
      }

      const tabBtnsHtml = tabs.map((t, i) =>
        `<button class="pyf-tab-btn pyf-tab-${t.type}${i === 0 ? ' pyf-tab-active' : ''}" data-tab="${t.id}">${t.label}</button>`
      ).join('');
      const panesHtml = panes.map((p, i) =>
        `<div class="pyf-tab-pane${i === 0 ? ' pyf-tab-pane-active' : ''}" data-pane="${p.id}">${p.html}</div>`
      ).join('');

      const result = await Swal.fire({
        icon: 'question',
        title: 'Actualizar programas y relaciones',
        html: `<div class="pyf-sync-modal"><div class="pyf-tab-bar">${tabBtnsHtml}</div><div class="pyf-tab-body">${panesHtml}</div></div>`,
        showCancelButton: true,
        confirmButtonText: 'Sí, aplicar cambios',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#c41e3a',
        cancelButtonColor: '#6c757d',
        width: '640px',
        didOpen: wireSyncTabs,
      });

      if (!result.isConfirmed) return;

      Swal.fire({
        title: 'Aplicando cambios',
        text: 'Creando programas, relaciones e inactivando...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
      });

      const createRes = await api.post(
        '/program-faculties/create-from-universitas',
        { newPrograms, newRelations, toDeactivateRelations, toDeactivatePrograms, duplicatePrograms },
        { timeout: 180000 }
      );
      Swal.close();

      const resData    = createRes.data || {};
      const errList    = resData.errors ?? [];
      const createdP   = resData.createdPrograms?.length ?? 0;
      const createdR   = resData.createdRelations?.length ?? 0;
      const deactivatedR = resData.deactivatedRelationsCount ?? 0;
      const deactivatedP = resData.deactivatedProgramsCount ?? 0;

      const resultChanges = [
        createdP > 0      && `<div class="pyf-sync-change green">✅ Programas creados: <strong>${createdP}</strong></div>`,
        createdR > 0      && `<div class="pyf-sync-change green">✅ Relaciones creadas: <strong>${createdR}</strong></div>`,
        deactivatedP > 0  && `<div class="pyf-sync-change red">🔴 Programas inactivados: <strong>${deactivatedP}</strong></div>`,
        deactivatedR > 0  && `<div class="pyf-sync-change orange">⚠️ Relaciones inactivadas: <strong>${deactivatedR}</strong></div>`,
      ].filter(Boolean).join('');

      let summaryHtml = `<div class="pyf-sync-modal"><div class="pyf-sync-changes">${resultChanges}</div>`;
      if (errList.length > 0) {
        const errHtml = errList.map(e => `<li><strong>${e.item || e.context || '—'}</strong>: ${e.message || ''}</li>`).join('');
        summaryHtml += `<p class="pyf-sync-section-title" style="margin-top:12px">Errores (${errList.length})</p><ul class="pyf-compare-list">${errHtml}</ul>`;
      }
      summaryHtml += '</div>';

      Swal.fire({
        icon: errList.length > 0 ? 'warning' : 'success',
        title: errList.length > 0 ? 'Completado con observaciones' : 'Programas actualizados',
        html: summaryHtml,
        confirmButtonColor: '#c41e3a',
        width: '540px',
      });

      loadProgramFaculties(1);
    } catch (err) {
      Swal.close();
      const isTimeout = err.code === 'ECONNABORTED' || (err.message && String(err.message).toLowerCase().includes('timeout'));
      const msg = isTimeout
        ? 'La solicitud tardó demasiado. Revise la lista de programas o intente de nuevo.'
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

      const { dbCount, universitasCount, newFaculties = [], toDeactivate = [] } = data;
      const hayCambiosFac = newFaculties.length > 0 || toDeactivate.length > 0;

      if (!hayCambiosFac) {
        Swal.fire({
          icon: 'success',
          title: 'Todo sincronizado',
          html: `<div class="pyf-sync-modal">${buildSyncResumenHtml({ dbFacultiesCount: dbCount, apiFacultiesCount: universitasCount })}<div class="pyf-sync-changes"><div class="pyf-sync-change gray">✅ La base de datos está al día con Universitas.</div></div></div>`,
          confirmButtonColor: '#c41e3a',
          width: '480px',
        });
        return;
      }

      // ── Pestañas facultades ───────────────────────────────────────────────
      const facTabs = [{ id: 'resumen', label: 'Resumen', type: 'info' }];
      const facPanes = [];

      const facChanges = [
        newFaculties.length > 0  && `<div class="pyf-sync-change green">➕ ${newFaculties.length} facultad(es) por crear</div>`,
        toDeactivate.length > 0  && `<div class="pyf-sync-change red">🔴 ${toDeactivate.length} facultad(es) a inactivar</div>`,
      ].filter(Boolean).join('');
      facPanes.push({ id: 'resumen', html: `${buildSyncResumenHtml({ dbFacultiesCount: dbCount, apiFacultiesCount: universitasCount })}<div class="pyf-sync-changes">${facChanges}</div>` });

      if (newFaculties.length > 0) {
        facTabs.push({ id: 'nuevas', label: `➕ Nuevas (${newFaculties.length})`, type: 'green' });
        const html = `<p class="pyf-sync-section-title">Facultades nuevas en Universitas (${newFaculties.length})</p><ul class="pyf-compare-list">` +
          newFaculties.map(f => `<li><strong>${f.cod_facultad}</strong> – ${f.nombre_facultad || '-'}</li>`).join('') + '</ul>';
        facPanes.push({ id: 'nuevas', html });
      }
      if (toDeactivate.length > 0) {
        facTabs.push({ id: 'inactivar', label: `🔴 A inactivar (${toDeactivate.length})`, type: 'red' });
        const html = `<p class="pyf-sync-section-title">En BD pero no en Universitas (${toDeactivate.length})</p><ul class="pyf-compare-list">` +
          toDeactivate.map(f => `<li><strong>${f.code}</strong> – ${f.name || '-'}</li>`).join('') + '</ul>';
        facPanes.push({ id: 'inactivar', html });
      }

      const facTabBtns = facTabs.map((t, i) =>
        `<button class="pyf-tab-btn pyf-tab-${t.type}${i === 0 ? ' pyf-tab-active' : ''}" data-tab="${t.id}">${t.label}</button>`
      ).join('');
      const facPanesHtml = facPanes.map((p, i) =>
        `<div class="pyf-tab-pane${i === 0 ? ' pyf-tab-pane-active' : ''}" data-pane="${p.id}">${p.html}</div>`
      ).join('');

      const resultFac = await Swal.fire({
        icon: 'question',
        title: 'Actualizar facultades',
        html: `<div class="pyf-sync-modal"><div class="pyf-tab-bar">${facTabBtns}</div><div class="pyf-tab-body">${facPanesHtml}</div></div>`,
        showCancelButton: true,
        confirmButtonText: 'Sí, aplicar cambios',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#c41e3a',
        cancelButtonColor: '#6c757d',
        width: '580px',
        didOpen: wireSyncTabs,
      });

      if (!resultFac.isConfirmed) return;

      Swal.fire({ title: 'Aplicando cambios', text: 'Procesando facultades...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

      const [createRes, deactivateRes] = await Promise.allSettled([
        newFaculties.length > 0
          ? api.post('/faculties/create-from-universitas', { faculties: newFaculties }, { timeout: 120000 })
          : Promise.resolve({ data: { created: [], errors: [] } }),
        toDeactivate.length > 0
          ? api.post('/faculties/deactivate-from-universitas', { codes: toDeactivate.map(f => f.code) }, { timeout: 60000 })
          : Promise.resolve({ data: { deactivated: 0 } }),
      ]);
      Swal.close();

      const createdCount    = createRes.status === 'fulfilled' ? (createRes.value.data?.created?.length ?? 0) : 0;
      const deactivatedCount = deactivateRes.status === 'fulfilled' ? (deactivateRes.value.data?.deactivated ?? 0) : 0;
      const createErrors    = createRes.status === 'fulfilled' ? (createRes.value.data?.errors ?? []) : [{ message: createRes.reason?.message || 'Error al crear' }];
      const hasErrors       = createErrors.length > 0 || createRes.status === 'rejected' || deactivateRes.status === 'rejected';

      const facResultChanges = [
        createdCount > 0    && `<div class="pyf-sync-change green">✅ Facultades creadas: <strong>${createdCount}</strong></div>`,
        deactivatedCount > 0 && `<div class="pyf-sync-change red">🔴 Facultades inactivadas: <strong>${deactivatedCount}</strong></div>`,
      ].filter(Boolean).join('');
      let facSummaryHtml = `<div class="pyf-sync-modal"><div class="pyf-sync-changes">${facResultChanges}</div>`;
      if (createErrors.length > 0) {
        const errHtml = createErrors.map(e => `<li><strong>${e.item || '—'}</strong>: ${e.message || ''}</li>`).join('');
        facSummaryHtml += `<p class="pyf-sync-section-title" style="margin-top:12px">Errores (${createErrors.length})</p><ul class="pyf-compare-list">${errHtml}</ul>`;
      }
      facSummaryHtml += '</div>';

      Swal.fire({ icon: hasErrors ? 'warning' : 'success', title: hasErrors ? 'Completado con observaciones' : 'Facultades actualizadas', html: facSummaryHtml, confirmButtonColor: '#c41e3a', width: '480px' });

      loadFaculties(1, facultiesPagination.limit);
    } catch (err) {
      Swal.close();
      const isTimeout = err.code === 'ECONNABORTED' || (err.message && String(err.message).toLowerCase().includes('timeout'));
      const msg = isTimeout
        ? 'La solicitud tardó demasiado. Revise la lista de facultades o intente de nuevo.'
        : (err.response?.data?.message || 'Error al comparar con Universitas. Revisar URL_OSB, USS_URJOB y PASS_URJOB en el backend.');
      Swal.fire({ icon: 'error', title: 'Error', text: msg });
      if (isTimeout) loadFaculties(1, facultiesPagination.limit);
    } finally {
      setSyncing(false);
    }
  };

  const showConfirmation = (title, text, confirmButtonText = 'Sí, continuar') =>
    Swal.fire({ title, text, icon: 'warning', showCancelButton: true, confirmButtonColor: '#c41e3a', cancelButtonColor: '#6c757d', confirmButtonText, cancelButtonText: 'Cancelar' });

  const handleToggleProgram = async (prog, currentActive) => {
    const id = prog._id;
    if (!id || updatingId) return;
    const result = await showConfirmation(
      currentActive ? 'Desactivar programa' : 'Activar programa',
      `¿Está seguro de que desea ${currentActive ? 'desactivar' : 'activar'} "${prog.name ?? 'este programa'}"?`,
      `Sí, ${currentActive ? 'desactivar' : 'activar'}`
    );
    if (!result.isConfirmed) return;
    const nextStatus = currentActive ? 'INACTIVE' : 'ACTIVE';
    setUpdatingId(id);
    try {
      await api.put(`/programs/${id}`, { status: nextStatus });
      await Swal.fire({ icon: 'success', title: 'Éxito', text: nextStatus === 'ACTIVE' ? 'Programa activado.' : 'Programa desactivado.', confirmButtonColor: '#c41e3a' });
      loadPrograms(pagination.page);
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
          <input type="text" placeholder={tab === 'facultades' ? 'Buscar facultad...' : 'Buscar programa...'} value={searchPrograma} onChange={(e) => setSearchPrograma(e.target.value)} className="pyf-search-input" />
        </div>
      </div>
      <div className="pyf-tabs">
        <button type="button" className={`pyf-tab ${tab === 'programas' ? 'active' : ''}`} onClick={() => { setTab('programas'); setSearchPrograma(''); updateUrl('programas', subTabProgramas); }}>Programas</button>
        <button type="button" className={`pyf-tab ${tab === 'facultades' ? 'active' : ''}`} onClick={() => { setTab('facultades'); setSearchPrograma(''); updateUrl('facultades', subTabFacultades); }}>Facultades</button>
      </div>
      {tab === 'programas' && (
        <div className="pyf-subtabs">
          <button type="button" className={`pyf-subtab ${subTabProgramas === 'activos' ? 'active' : ''}`} onClick={() => { setSubTabProgramas('activos'); setPagination((p) => ({ ...p, page: 1 })); updateUrl('programas', 'activos'); loadPrograms(1, 'ACTIVE'); }}>Activos</button>
          <button type="button" className={`pyf-subtab ${subTabProgramas === 'inactivos' ? 'active' : ''}`} onClick={() => { setSubTabProgramas('inactivos'); setPagination((p) => ({ ...p, page: 1 })); updateUrl('programas', 'inactivos'); loadPrograms(1, 'INACTIVE'); }}>Inactivos</button>
        </div>
      )}
      {tab === 'facultades' && (
        <div className="pyf-subtabs">
          <button type="button" className={`pyf-subtab ${subTabFacultades === 'activos' ? 'active' : ''}`} onClick={() => { setSubTabFacultades('activos'); setFacultiesPagination((p) => ({ ...p, page: 1 })); updateUrl('facultades', 'activos'); loadFaculties(1, facultiesPagination.limit, 'ACTIVE'); }}>Activos</button>
          <button type="button" className={`pyf-subtab ${subTabFacultades === 'inactivos' ? 'active' : ''}`} onClick={() => { setSubTabFacultades('inactivos'); setFacultiesPagination((p) => ({ ...p, page: 1 })); updateUrl('facultades', 'inactivos'); loadFaculties(1, facultiesPagination.limit, 'inactive'); }}>Inactivos</button>
        </div>
      )}
      {tab === 'programas' && (
        <div className="pyf-table-wrap">
          {loading ? <div className="pyf-loading">Cargando programas...</div> : (
            <table className="pyf-table">
              <thead><tr><th>CÓDIGO</th><th>PROGRAMA</th><th>NIVEL</th><th>ESTADO</th></tr></thead>
              <tbody>
                {programs.length === 0 ? (
                  <tr><td colSpan={4} className="pyf-no-data">No hay programas. Use &quot;Actualizar Info Programas (Universitas)&quot; o registre manualmente.</td></tr>
                ) : (
                  programs.map((prog) => {
                    const isActive = (prog.status ?? '').toUpperCase() === 'ACTIVE';
                    return (
                      <tr key={prog._id}>
                        <td>{prog.code ?? '-'}</td>
                        <td>
                          <button type="button" className="pyf-link" onClick={() => navigate(`/dashboard/programas-facultades/programa/${prog._id}`)}>
                            {prog.name ?? '-'}
                          </button>
                        </td>
                        <td>{prog.labelLevel ?? prog.level ?? '-'}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {(() => {
                            return (
                              <div className="switch-container">
                                <label className="switch">
                                  <input type="checkbox" checked={isActive} onChange={() => handleToggleProgram(prog, isActive)} disabled={updatingId === prog._id} />
                                  <span className="slider" />
                                </label>
                                <span className={`status-text ${isActive ? 'active' : 'inactive'}`}>{isActive ? 'Activo' : 'Inactivo'}</span>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })
                )
                }
              </tbody>
            </table>
          )}
          {pagination.pages > 1 && (
            <div className="pyf-pagination">
              <button type="button" className="pyf-page-btn" disabled={pagination.page <= 1} onClick={() => loadPrograms(1)}>&laquo;&laquo;</button>
              <button type="button" className="pyf-page-btn" disabled={pagination.page <= 1} onClick={() => loadPrograms(pagination.page - 1)}>&laquo;</button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => { const p = pagination.page <= 3 ? i + 1 : Math.max(1, pagination.page - 2 + i); if (p > pagination.pages) return null; return <button key={p} type="button" className={`pyf-page-btn ${p === pagination.page ? 'active' : ''}`} onClick={() => loadPrograms(p)}>{p}</button>; })}
              <button type="button" className="pyf-page-btn" disabled={pagination.page >= pagination.pages} onClick={() => loadPrograms(pagination.page + 1)}>&raquo;</button>
              <button type="button" className="pyf-page-btn" disabled={pagination.page >= pagination.pages} onClick={() => loadPrograms(pagination.pages)}>&raquo;&raquo;</button>
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
