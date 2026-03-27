import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FiArrowLeft,
  FiPlus,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiChevronDown,
  FiUpload,
  FiExternalLink,
  FiSearch,
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import { Modal, Button, Form, Accordion } from 'react-bootstrap';
import Select from 'react-select';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import '../../styles/DocumentosLegalizacionPractica.css';

const pfLabelSort = (pf) => {
  const p = pf.nombrePrograma || pf.programId?.name || pf.program?.name || pf.code || '';
  const f = pf.nombreFacultad || pf.facultyId?.name || pf.faculty?.name || '';
  return [p, f].filter(Boolean).join(' — ') || String(pf._id);
};

const normExtCode = (v) => String(v || '').replace(/^\./, '').trim().toLowerCase();

/** Plantilla/modelo con archivo en S3+disk o solo migración (mysqlId). */
const hasPracticeDefFile = (ref) => {
  if (!ref || typeof ref !== 'object') return false;
  const aid = ref.attachmentId;
  if (aid != null && aid !== '') return true;
  if (ref.storedPath && String(ref.storedPath).trim()) return true;
  const mid = ref.attachmentMysqlId;
  if (mid != null && mid !== '' && Number(mid) !== 0) return true;
  return false;
};

const emptyForm = () => ({
  documentTypeItemId: '',
  practiceTypeItemId: '',
  documentName: '',
  documentObservation: '',
  documentOrder: 0,
  documentMandatory: false,
  functionalLetter: false,
  showFormTracing: false,
  bindingAgreement: false,
  requiresAdditionalApproval: false,
  extensionItemIds: [],
  programFacultyIds: [],
  plantilla: null,
  modelo: null,
});

export default function DocumentosLegalizacionPractica({ onVolver }) {
  const { hasPermission } = useAuth();
  const canView = hasPermission('CDDP');
  const canCreate = hasPermission('CRDD');
  const canEdit = hasPermission('ACDD');
  const canDelete = hasPermission('ELDD');

  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [listSearch, setListSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
    search: null,
  });
  const [practiceTypes, setPracticeTypes] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [programFaculties, setProgramFaculties] = useState([]);
  const [meta, setMeta] = useState({
    practiceTypeListId: 'L_PRACTICE_TYPE',
    extensionsListId: 'L_EXTENSIONS',
  });
  const [extensionItemsCatalog, setExtensionItemsCatalog] = useState([]);
  const DOCUMENT_TYPE_LIST_ID = 'L_DOCUMENT_TYPE';

  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const fetchDefinitionsPage = useCallback(async (pageNum, searchTerm, limitForRequest) => {
    const limit = Math.min(100, Math.max(1, Number(limitForRequest) || 15));
    const { data } = await api.get('/document-practice-definitions', {
      params: {
        page: pageNum,
        limit,
        ...(searchTerm?.trim() ? { search: searchTerm.trim() } : {}),
      },
    });
    setRows(data?.data || []);
    const pg = data?.pagination;
    if (pg) {
      setPagination({
        page: pg.page ?? pageNum,
        limit: pg.limit ?? limit,
        total: pg.total ?? 0,
        totalPages: pg.totalPages ?? 1,
        search: pg.search ?? (searchTerm?.trim() || null),
      });
      if (pg.page != null && pg.page !== pageNum) setPage(pg.page);
    }
  }, []);

  const loadCatalogs = useCallback(async () => {
    const metaRes = await api.get('/document-practice-definitions/meta').catch(() => ({ data: {} }));
    const ptList = metaRes.data?.practiceTypeListId || 'L_PRACTICE_TYPE';
    const extList = metaRes.data?.extensionsListId || 'L_EXTENSIONS';
    setMeta({ practiceTypeListId: ptList, extensionsListId: extList });

    const [pt, dt, pf, extItems] = await Promise.all([
      api.get(`/locations/items/${encodeURIComponent(ptList)}`, { params: { limit: 200 } }).catch(() => ({ data: [] })),
      api.get(`/locations/items/${encodeURIComponent(DOCUMENT_TYPE_LIST_ID)}`, { params: { limit: 500 } }).catch(() => ({ data: [] })),
      api.get('/program-faculties', { params: { limit: 2000, page: 1, status: 'ACTIVE' } }).catch(() => ({ data: { data: [] } })),
      api.get(`/locations/items/${encodeURIComponent(extList)}`, { params: { limit: 200 } }).catch(() => ({ data: [] })),
    ]);
    setPracticeTypes(pt.data?.data || []);
    setDocumentTypes(dt.data?.data || []);
    setExtensionItemsCatalog(extItems.data?.data || []);
    const pfl = pf.data?.data || [];
    setProgramFaculties(
      [...pfl].sort((a, b) => pfLabelSort(a).localeCompare(pfLabelSort(b), 'es'))
    );
  }, []);

  const reloadDefinitionsOnly = useCallback(async () => {
    setListLoading(true);
    try {
      await fetchDefinitionsPage(page, listSearch, pagination.limit);
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || e.message });
    } finally {
      setListLoading(false);
    }
  }, [fetchDefinitionsPage, page, listSearch, pagination.limit]);

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    setLoading(true);
    loadCatalogs()
      .catch((e) => {
        if (!cancelled) {
          Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || e.message });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canView, loadCatalogs]);

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    setListLoading(true);
    fetchDefinitionsPage(page, listSearch, pagination.limit)
      .catch((e) => {
        if (!cancelled) {
          Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || e.message });
        }
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canView, page, listSearch, pagination.limit, fetchDefinitionsPage]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setListSearch(searchInput.trim());
    setPage(1);
  };

  const clearSearch = () => {
    setSearchInput('');
    setListSearch('');
    setPage(1);
  };

  /** Registros migrados: solo extensionCodes; intentar casar con catálogo L_EXTENSIONS al abrir edición */
  useEffect(() => {
    if (modalMode !== 'edit' || !editingId || !extensionItemsCatalog.length) return;
    const row =
      (detailRow && String(detailRow._id) === String(editingId) && detailRow) ||
      rows.find((r) => String(r._id) === String(editingId));
    if (!row || (row.extensionItems || []).length > 0) return;
    const codes = new Set((row.extensionCodes || []).map(normExtCode));
    const matchedIds = extensionItemsCatalog
      .filter((it) => codes.has(normExtCode(it.value)))
      .map((it) => String(it._id));
    if (matchedIds.length === 0) return;
    setForm((f) => {
      if ((f.extensionItemIds || []).length > 0) return f;
      return { ...f, extensionItemIds: matchedIds };
    });
  }, [modalMode, editingId, rows, extensionItemsCatalog, detailRow]);

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const openOptions = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 200) });
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const fillFormFromRow = (row) => {
    setForm({
      documentTypeItemId: row.documentTypeItem?._id || '',
      practiceTypeItemId: row.practiceTypeItem?._id || '',
      documentName: row.documentName || '',
      documentObservation: row.documentObservation || '',
      documentOrder: row.documentOrder ?? 0,
      documentMandatory: !!row.documentMandatory,
      functionalLetter: !!row.functionalLetter,
      showFormTracing: !!row.showFormTracing,
      bindingAgreement: !!row.bindingAgreement,
      requiresAdditionalApproval: !!row.requiresAdditionalApproval,
      extensionItemIds: (row.extensionItems || []).map((x) => String(x._id || x)),
      programFacultyIds: (row.programFaculties || []).map((p) => String(p._id)),
      plantilla: null,
      modelo: null,
    });
  };

  const closeDocModal = () => {
    setModalMode(null);
    setEditingId(null);
    setDetailRow(null);
    setForm(emptyForm());
  };

  const loadDefinitionDetail = async (id) => {
    if (!id) return;
    try {
      const res = await api.get(`/document-practice-definitions/${id}`);
      if (res.data?.data) setDetailRow(res.data.data);
    } catch (_) {
      /* se usa fila del listado */
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setDetailRow(null);
    setForm(emptyForm());
    setModalMode('edit');
  };

  const openView = (row) => {
    const id = row?._id;
    setEditingId(id);
    setDetailRow(row);
    fillFormFromRow(row);
    setModalMode('view');
    loadDefinitionDetail(id);
  };

  const openEdit = (row) => {
    const id = row?._id;
    setEditingId(id);
    setDetailRow(row);
    fillFormFromRow(row);
    setModalMode('edit');
    loadDefinitionDetail(id);
  };

  const rowById = (id) => rows.find((r) => String(r._id) === String(id));
  const effectiveDefRow = detailRow || rowById(editingId);

  const openPracticeDefFile = async (defId, kind) => {
    if (!defId) return;
    try {
      const { data } = await api.get(`/document-practice-definitions/${defId}/file/${kind}/access`);
      if (data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
        return;
      }
      if (data.stream) {
        const res = await api.get(`/document-practice-definitions/${defId}/file/${kind}/stream`, {
          responseType: 'blob',
          timeout: 120000,
        });
        const ct = res.headers['content-type'] || 'application/octet-stream';
        const blobUrl = URL.createObjectURL(new Blob([res.data], { type: ct }));
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      Swal.fire({
        icon: 'error',
        title: 'No se puede abrir el archivo',
        text: e.response?.data?.message || e.message || 'Intente más tarde.',
      });
    }
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('documentTypeItemId', form.documentTypeItemId);
    fd.append('practiceTypeItemId', form.practiceTypeItemId);
    fd.append('documentName', form.documentName);
    fd.append('documentObservation', form.documentObservation || '');
    fd.append('documentOrder', String(form.documentOrder ?? 0));
    fd.append('documentMandatory', form.documentMandatory ? 'true' : 'false');
    fd.append('functionalLetter', form.functionalLetter ? 'true' : 'false');
    fd.append('showFormTracing', form.showFormTracing ? 'true' : 'false');
    fd.append('bindingAgreement', form.bindingAgreement ? 'true' : 'false');
    fd.append('requiresAdditionalApproval', form.requiresAdditionalApproval ? 'true' : 'false');
    fd.append('extensionItemIds', JSON.stringify(form.extensionItemIds || []));
    fd.append('programFacultyIds', JSON.stringify(form.programFacultyIds || []));
    if (form.plantilla) fd.append('plantilla', form.plantilla);
    if (form.modelo) fd.append('modelo', form.modelo);
    return fd;
  };

  const handleSave = async () => {
    if (!form.documentTypeItemId || !form.practiceTypeItemId || !form.documentName?.trim()) {
      Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Complete tipo de documento, tipo de práctica y nombre.' });
      return;
    }
    if (!form.programFacultyIds?.length) {
      Swal.fire({ icon: 'warning', title: 'Programas', text: 'Seleccione al menos un programa.' });
      return;
    }
    if (!form.extensionItemIds?.length) {
      Swal.fire({
        icon: 'warning',
        title: 'Extensiones',
        text: 'Seleccione al menos una extensión permitida (lista L_EXTENSIONS).',
      });
      return;
    }
    setSaving(true);
    try {
      const fd = buildFormData();
      if (editingId) {
        await api.put(`/document-practice-definitions/${editingId}`, fd);
      } else {
        await api.post('/document-practice-definitions', fd);
      }
      Swal.fire({ icon: 'success', title: editingId ? 'Actualizado' : 'Creado', timer: 1600, showConfirmButton: false });
      closeDocModal();
      reloadDefinitionsOnly();
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Eliminar definición?',
      text: row.documentName,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (!isConfirmed) return;
    try {
      await api.delete(`/document-practice-definitions/${row._id}`);
      Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1400, showConfirmButton: false });
      reloadDefinitionsOnly();
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || e.message });
    }
  };

  const pfLabel = (pf) => pfLabelSort(pf);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    await handleSave();
  };

  const readOnly = modalMode === 'view';
  const modalTitle =
    readOnly ? 'Ver definición de documento' : editingId ? 'Editar definición de documento' : 'Definir nuevo documento';

  const documentTypeOptions = useMemo(() => {
    const opts = documentTypes.map((it) => ({
      value: String(it._id),
      label: it.value || it.description || String(it._id),
    }));
    const curId = String(form.documentTypeItemId || '');
    if (curId && !opts.some((o) => o.value === curId) && editingId) {
      const row = detailRow || rows.find((r) => String(r._id) === String(editingId));
      const v = row?.documentTypeItem?.value;
      if (v) opts.unshift({ value: curId, label: `${v} (definición actual)` });
    }
    return opts;
  }, [documentTypes, form.documentTypeItemId, editingId, rows, detailRow]);
  const programOptions = programFaculties.map((pf) => ({
    value: String(pf._id),
    label: pfLabel(pf),
  }));
  const extensionOptions = useMemo(
    () =>
      extensionItemsCatalog.map((it) => ({
        value: String(it._id),
        label: it.value || it.description || String(it._id),
      })),
    [extensionItemsCatalog]
  );
  const rsMenuPortal = {
    menuPortal: (base) => ({ ...base, zIndex: 10650 }),
  };

  if (!canView) {
    return (
      <div className="dlp-page users-content">
        <div className="users-section">
          <p>No tiene permiso para esta sección.</p>
          <button type="button" className="btn-volver" onClick={onVolver}>
            <FiArrowLeft className="btn-icon" /> Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dlp-page users-content">
      <div className="users-section">
        <div className="users-header">
          <div className="configuracion-actions">
            <button type="button" className="btn-volver" onClick={onVolver}>
              <FiArrowLeft className="btn-icon" /> Volver
            </button>
            {canCreate && (
              <button type="button" className="btn-guardar" onClick={openCreate}>
                <FiPlus className="btn-icon" /> Definir nuevo documento
              </button>
            )}
          </div>
          <div className="section-header">
            <h3>DOCUMENTOS PARA LEGALIZAR PRÁCTICA ACADÉMICA</h3>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando…</p>
          </div>
        ) : (
          <>
            <form className="dlp-list-toolbar" onSubmit={handleSearchSubmit}>
              <div className="dlp-search-wrap">
                <FiSearch className="dlp-search-icon" aria-hidden />
                <input
                  type="search"
                  className="dlp-search-input"
                  placeholder="Buscar por nombre, tipo de documento o tipo de práctica…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Buscar documentos"
                />
              </div>
              <button type="submit" className="btn-guardar dlp-btn-buscar">
                Buscar
              </button>
              {listSearch ? (
                <button type="button" className="btn-volver dlp-btn-limpiar" onClick={clearSearch}>
                  Limpiar
                </button>
              ) : null}
            </form>
            {listSearch ? (
              <p className="dlp-search-hint text-muted small mb-2">
                La búsqueda y la paginación se aplican en el servidor (nombre, observaciones, tipo de documento,
                tipo de práctica, extensiones y códigos guardados).
              </p>
            ) : null}

            <div className={`users-table-container ${listLoading ? 'dlp-table-loading' : ''}`}>
              {listLoading && (
                <div className="dlp-table-overlay" aria-busy="true">
                  <div className="loading-spinner loading-spinner--sm" />
                </div>
              )}
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Nombre del documento</th>
                    <th>Tipo de documento</th>
                    <th>Tipo de práctica</th>
                    <th>Enlazado al seguimiento</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && !listLoading && (
                    <tr>
                      <td colSpan={5} className="dlp-empty">
                        {listSearch
                          ? 'No hay coincidencias con la búsqueda.'
                          : 'No hay documentos de legalización definidos.'}
                      </td>
                    </tr>
                  )}
                  {rows.map((row) => (
                    <tr key={row._id}>
                      <td>{row.documentName}</td>
                      <td>{row.documentTypeItem?.value || '—'}</td>
                      <td>{row.practiceTypeItem?.value || '—'}</td>
                      <td>{row.showFormTracing ? 'Sí' : 'No'}</td>
                      <td>
                        <button
                          type="button"
                          className="dlp-btn-opciones"
                          onClick={(e) => openOptions(e, row._id)}
                        >
                          Opciones <FiChevronDown />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.total > 0 && (
              <div className="dlp-pagination">
                <span className="dlp-pagination-info">
                  Mostrando {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
                  {listSearch ? ' (filtrado)' : ''}
                </span>
                <div className="dlp-pagination-btns">
                  <button
                    type="button"
                    className="btn-volver"
                    disabled={pagination.page <= 1 || listLoading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </button>
                  <span className="dlp-pagination-page">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn-volver"
                    disabled={pagination.page >= pagination.totalPages || listLoading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {openMenuId &&
        createPortal(
          <ul
            className="dlp-options-menu"
            style={{ top: menuPos.top, left: menuPos.left }}
            role="menu"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const row = rows.find((r) => String(r._id) === String(openMenuId));
              if (!row) return null;
              return (
                <>
                  <li>
                    <button type="button" onClick={() => { setOpenMenuId(null); openView(row); }}>
                      <FiEye /> Ver
                    </button>
                  </li>
                  {canEdit && (
                    <li>
                      <button type="button" onClick={() => { setOpenMenuId(null); openEdit(row); }}>
                        <FiEdit2 /> Editar
                      </button>
                    </li>
                  )}
                  {canDelete && (
                    <li>
                      <button type="button" className="dlp-danger" onClick={() => { setOpenMenuId(null); handleDelete(row); }}>
                        <FiTrash2 /> Eliminar
                      </button>
                    </li>
                  )}
                </>
              );
            })()}
          </ul>,
          document.body
        )}

      <Modal
        show={!!modalMode}
        onHide={() => !saving && closeDocModal()}
        size="xl"
        centered
        scrollable
        className="dlp-doc-modal"
        dialogClassName="dlp-modal-dialog-wide"
        container={typeof document !== 'undefined' ? document.body : null}
      >
        <Modal.Header closeButton>
          <Modal.Title>{modalTitle}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleFormSubmit} noValidate>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nombre del documento <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                placeholder="Ej: Formato de aceptación"
                value={form.documentName}
                onChange={(e) => setForm({ ...form, documentName: e.target.value })}
                disabled={readOnly}
                readOnly={readOnly}
              />
            </Form.Group>

            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Tipo de documento <span className="text-danger">*</span></Form.Label>
                  {readOnly ? (
                    <div className="form-control bg-light border rounded px-3 py-2 min-h-readonly">
                      {effectiveDefRow?.documentTypeItem?.value ||
                        documentTypeOptions.find((o) => o.value === String(form.documentTypeItemId))?.label ||
                        '—'}
                    </div>
                  ) : (
                    <Select
                      options={documentTypeOptions}
                      value={
                        documentTypeOptions.find((o) => o.value === String(form.documentTypeItemId)) || null
                      }
                      onChange={(opt) => setForm({ ...form, documentTypeItemId: opt?.value || '' })}
                      placeholder="Buscar tipo de documento…"
                      isClearable
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      menuPosition="fixed"
                      styles={rsMenuPortal}
                      classNamePrefix="dlp-rs"
                      noOptionsMessage={() => 'Sin coincidencias'}
                    />
                  )}
                 
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Tipo de práctica <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={form.practiceTypeItemId}
                    onChange={(e) => setForm({ ...form, practiceTypeItemId: e.target.value })}
                    disabled={readOnly}
                  >
                    <option value="">Seleccionar…</option>
                    {practiceTypes.map((it) => (
                      <option key={it._id} value={it._id}>
                        {it.value}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Programas <span className="text-danger">*</span></Form.Label>
              {readOnly ? (
                <ul className="dlp-doc-programs-readonly mb-0">
                  {(effectiveDefRow?.programFaculties || []).map((pf) => (
                    <li key={pf._id}>{pfLabel(pf)}</li>
                  ))}
                </ul>
              ) : (
                <>
                  <Select
                    isMulti
                    options={programOptions}
                    value={programOptions.filter((o) =>
                      (form.programFacultyIds || []).map(String).includes(o.value)
                    )}
                    onChange={(sel) =>
                      setForm({ ...form, programFacultyIds: (sel || []).map((s) => s.value) })
                    }
                    placeholder="Buscar y seleccionar programas…"
                    isClearable
                    closeMenuOnSelect={false}
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    menuPosition="fixed"
                    styles={rsMenuPortal}
                    classNamePrefix="dlp-rs"
                    noOptionsMessage={() => 'Sin coincidencias'}
                  />
                  <Form.Text className="text-muted">
                    Escriba para filtrar. Puede elegir varios programas.
                  </Form.Text>
                </>
              )}
            </Form.Group>

            <div className="row g-3 mb-3">
              <div className="col-md-8">
                <Form.Group>
                  <Form.Label>Extensiones permitidas <span className="text-danger">*</span></Form.Label>
                  {readOnly ? (
                    <div className="form-control bg-light border rounded px-3 py-2 min-h-readonly">
                      {(() => {
                        const vr = effectiveDefRow;
                        const fromItems = (vr?.extensionItems || []).map((i) => i.value).filter(Boolean);
                        if (fromItems.length) return fromItems.join(', ');
                        return (vr?.extensionCodes || []).length ? (vr.extensionCodes || []).join(', ') : '—';
                      })()}
                    </div>
                  ) : (
                    <>
                      <Select
                        isMulti
                        options={extensionOptions}
                        value={extensionOptions.filter((o) =>
                          (form.extensionItemIds || []).map(String).includes(o.value)
                        )}
                        onChange={(sel) =>
                          setForm({ ...form, extensionItemIds: (sel || []).map((s) => s.value) })
                        }
                        placeholder="Buscar extensiones…"
                        isClearable
                        closeMenuOnSelect={false}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        menuPosition="fixed"
                        styles={rsMenuPortal}
                        classNamePrefix="dlp-rs"
                        noOptionsMessage={() =>
                          extensionItemsCatalog.length ? 'Sin coincidencias' : 'Cargando lista de extensiones…'
                        }
                      />
                     
                    </>
                  )}
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Orden</Form.Label>
                  <Form.Control
                    type="number"
                    value={form.documentOrder}
                    onChange={(e) => setForm({ ...form, documentOrder: Number(e.target.value) })}
                    disabled={readOnly}
                    readOnly={readOnly}
                  />
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Observaciones</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Observaciones opcionales"
                value={form.documentObservation}
                onChange={(e) => setForm({ ...form, documentObservation: e.target.value })}
                disabled={readOnly}
                readOnly={readOnly}
              />
            </Form.Group>

            <Accordion defaultActiveKey="0" className="mb-3 dlp-files-accordion">
              <Accordion.Item eventKey="0">
                <Accordion.Header className="dlp-files-accordion-header">
                  Archivos: plantilla y modelo
                </Accordion.Header>
                <Accordion.Body className="dlp-files-accordion-body">
                  {readOnly ? (
                    <div className="row g-4">
                      <div className="col-lg-6">
                        <div className="dlp-file-zone dlp-file-zone--readonly">
                          <div className="dlp-file-zone-badge">Plantilla</div>
                          <div className="dlp-file-zone-filename">
                            {(() => {
                              const tf = effectiveDefRow?.templateFile;
                              const has = hasPracticeDefFile(tf);
                              const name =
                                (tf?.originalName && String(tf.originalName).trim()) ||
                                (has ? 'Documento adjunto' : null);
                              if (!has) {
                                return <span className="text-muted">Sin plantilla registrada</span>;
                              }
                              return (
                                <a
                                  href="#plantilla"
                                  className="dlp-file-link-newtab"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    openPracticeDefFile(editingId, 'plantilla');
                                  }}
                                >
                                  <FiExternalLink className="me-2 flex-shrink-0" aria-hidden />
                                  <span>{name}</span>
                                  <span className="dlp-file-link-suffix"> — abrir en nueva pestaña</span>
                                </a>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="col-lg-6">
                        <div className="dlp-file-zone dlp-file-zone--readonly">
                          <div className="dlp-file-zone-badge">Modelo</div>
                          <div className="dlp-file-zone-filename">
                            {(() => {
                              const mf = effectiveDefRow?.modelFile;
                              const has = hasPracticeDefFile(mf);
                              const name =
                                (mf?.originalName && String(mf.originalName).trim()) ||
                                (has ? 'Documento adjunto' : null);
                              if (!has) {
                                return <span className="text-muted">Sin modelo registrado</span>;
                              }
                              return (
                                <a
                                  href="#modelo"
                                  className="dlp-file-link-newtab"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    openPracticeDefFile(editingId, 'modelo');
                                  }}
                                >
                                  <FiExternalLink className="me-2 flex-shrink-0" aria-hidden />
                                  <span>{name}</span>
                                  <span className="dlp-file-link-suffix"> — abrir en nueva pestaña</span>
                                </a>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="row g-4">
                      <div className="col-lg-6">
                        <div className="dlp-file-zone">
                          <div className="dlp-file-zone-badge">Plantilla</div>
                          {/* <p className="dlp-file-zone-desc">
                            Documento plantilla o formato que debe usar el estudiante (Word, PDF, etc.).
                          </p> */}
                          <label className="dlp-file-zone-click">
                            <input
                              type="file"
                              className="visually-hidden"
                              onChange={(e) => {
                                setForm({ ...form, plantilla: e.target.files?.[0] || null });
                                e.target.value = '';
                              }}
                            />
                            <span className="dlp-file-zone-btn">
                              <FiUpload className="me-2" aria-hidden />
                              Elegir archivo de plantilla
                            </span>
                          </label>
                          <div
                            className={`dlp-file-zone-result ${form.plantilla ? 'dlp-file-zone-result--ok' : ''}`}
                          >
                            {form.plantilla ? (
                              <>
                                <span className="dlp-file-zone-check">✓</span>
                                <span className="dlp-file-zone-name" title={form.plantilla.name}>
                                  {form.plantilla.name}
                                </span>
                              </>
                            ) : (
                              <span className="dlp-file-zone-placeholder">
                                Ningún archivo nuevo seleccionado. Si edita sin cambiar archivo, se mantiene el
                                actual.
                              </span>
                            )}
                          </div>
                          {editingId &&
                            hasPracticeDefFile(rows.find((r) => r._id === editingId)?.templateFile) &&
                            !form.plantilla && (
                              <button
                                type="button"
                                className="btn btn-link btn-sm p-0 mt-2 dlp-link-ver-archivo"
                                onClick={() => openPracticeDefFile(editingId, 'plantilla')}
                              >
                                <FiEye className="me-1" aria-hidden /> Ver plantilla actual
                              </button>
                            )}
                        </div>
                      </div>
                      <div className="col-lg-6">
                        <div className="dlp-file-zone">
                          <div className="dlp-file-zone-badge">Modelo</div>
                          {/* <p className="dlp-file-zone-desc">
                            Archivo de ejemplo o modelo de referencia ya completado.
                          </p> */}
                          <label className="dlp-file-zone-click">
                            <input
                              type="file"
                              className="visually-hidden"
                              onChange={(e) => {
                                setForm({ ...form, modelo: e.target.files?.[0] || null });
                                e.target.value = '';
                              }}
                            />
                            <span className="dlp-file-zone-btn">
                              <FiUpload className="me-2" aria-hidden />
                              Elegir archivo de modelo
                            </span>
                          </label>
                          <div
                            className={`dlp-file-zone-result ${form.modelo ? 'dlp-file-zone-result--ok' : ''}`}
                          >
                            {form.modelo ? (
                              <>
                                <span className="dlp-file-zone-check">✓</span>
                                <span className="dlp-file-zone-name" title={form.modelo.name}>
                                  {form.modelo.name}
                                </span>
                              </>
                            ) : (
                              <span className="dlp-file-zone-placeholder">
                                Ningún archivo nuevo seleccionado. Si edita sin cambiar archivo, se mantiene el
                                actual.
                              </span>
                            )}
                          </div>
                          {editingId &&
                            hasPracticeDefFile(effectiveDefRow?.modelFile) &&
                            !form.modelo && (
                              <button
                                type="button"
                                className="btn btn-link btn-sm p-0 mt-2 dlp-link-ver-archivo"
                                onClick={() => openPracticeDefFile(editingId, 'modelo')}
                              >
                                <FiEye className="me-1" aria-hidden /> Ver modelo actual
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  )}
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>

            <div className="border rounded p-3 bg-light mb-2">
              <div className="fw-semibold text-secondary small mb-2">Opciones del documento</div>
              {[
                ['documentMandatory', 'Es obligatorio'],
                ['requiresAdditionalApproval', 'Requiere aprobación adicional'],
                ['showFormTracing', 'Mostrar en formulario de seguimiento'],
                ['bindingAgreement', 'Es acuerdo de vinculación'],
                ['functionalLetter', 'Carta de funciones'],
              ].map(([key, label]) => (
                <Form.Check
                  key={key}
                  type="checkbox"
                  id={`dlp-${key}`}
                  className="mb-2"
                  label={label}
                  checked={!!form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  disabled={readOnly}
                />
              ))}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeDocModal} disabled={saving}>
              {readOnly ? 'Cerrar' : 'Descartar'}
            </Button>
            {!readOnly && (
              <Button variant="primary" type="submit" className="btn-periodo-submit" disabled={saving}>
                {saving ? 'Guardando…' : editingId ? 'Actualizar definición' : 'Guardar'}
              </Button>
            )}
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
