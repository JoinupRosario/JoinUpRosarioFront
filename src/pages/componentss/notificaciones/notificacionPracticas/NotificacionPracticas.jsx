import { useState, useEffect, useCallback } from 'react';
import { FiArrowLeft, FiPlus, FiMoreVertical, FiEye, FiEdit2, FiToggleLeft, FiToggleRight, FiUsers, FiSearch } from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../../../services/api';
import ModalPlantilla from '../ModalPlantilla';
import ModalPreviewPlantilla from '../ModalPreviewPlantilla';
import ModalDestinatarios from '../ModalDestinatarios';
import OptionsMenuPortal from '../OptionsMenuPortal';
import '../../../styles/notificaciones.css';

/** Vista oportunidad/práctica: eventos de práctica + generales (entidad, tutores, credenciales). */
const TIPOS_PLANTILLA = 'practica,general';
const PAGE_SIZE_OPTIONS = [10, 20, 50];

function etiquetaAmbitoEvento(tipo) {
  if (tipo === 'general') return 'General';
  if (tipo === 'practica') return 'Práctica';
  if (tipo === 'monitoria') return 'Monitoría';
  return tipo || '—';
}

const FRECUENCIAS = [
  { value: 'inmediato', label: 'Inmediato' },
  { value: 'diario', label: 'Diario' },
  { value: 'semanal', label: 'Semanal' },
];

/** Extrae keys de variables del evento (ej. "[NOMBRE_ESTUDIANTE]" → "NOMBRE_ESTUDIANTE") */
function getSelectedVariableKeysFromParam(param) {
  const vars = param?.variables;
  if (!Array.isArray(vars) || vars.length === 0) return [];
  return vars.map((v) => {
    const raw = (v.variable || '').trim();
    const match = raw.match(/^\[?([A-Z0-9_]+)\]?$/i);
    return match ? match[1].toUpperCase() : raw.replace(/^\[|\]$/g, '').toUpperCase();
  }).filter(Boolean);
}

/** Convierte plantilla del API a formato para modal/preview (parametroId/eventoId, nombre, selectedVariableKeys, etc.) */
function mapPlantillaToItem(p) {
  const param = p.parametroPlantillaId || {};
  return {
    _id: p._id,
    parametroId: param._id,
    value: param.value,
    nombre: param.nombre || param.value,
    eventoTipo: param.tipo,
    asunto: p.asunto,
    cuerpo: p.cuerpo,
    frecuencia: p.frecuencia || 'inmediato',
    destinatarios: p.destinatarios || [],
    isActive: p.isActive !== false,
    selectedVariableKeys: getSelectedVariableKeysFromParam(param),
  };
}

export default function NotificacionPracticas({ onVolver }) {
  const [parametros, setParametros] = useState([]);
  const [parametrosLoading, setParametrosLoading] = useState(true);
  const [parametrosError, setParametrosError] = useState(null);
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [destinatariosItem, setDestinatariosItem] = useState(null);

  const closeMenu = () => {
    setOpenMenuId(null);
    setMenuAnchorRect(null);
  };

  const loadParametros = useCallback(async () => {
    setParametrosLoading(true);
    setParametrosError(null);
    try {
      const { data } = await api.get('/parametros-plantilla', { params: { tipo: TIPOS_PLANTILLA } });
      const list = data?.data ?? data ?? [];
      setParametros(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Error cargando eventos:', e);
      setParametrosError(e.response?.data?.message || e.message || 'No se pudieron cargar los eventos.');
      setParametros([]);
    } finally {
      setParametrosLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = searchInput.trim();
      setDebouncedSearch((prev) => {
        if (prev === next) return prev;
        setPage(1);
        return next;
      });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadPlantillas = useCallback(async () => {
    setLoading(true);
    try {
      const params = { tipo: TIPOS_PLANTILLA, page, limit: perPage };
      if (debouncedSearch) params.search = debouncedSearch;
      const { data } = await api.get('/plantillas-notificacion', { params });
      setPlantillas(Array.isArray(data?.data) ? data.data : []);
      setPagination(data?.pagination || { total: 0, pages: 1, limit: perPage });
    } catch (e) {
      console.error('Error cargando plantillas:', e);
      setPlantillas([]);
      setPagination({ total: 0, pages: 1, limit: perPage });
    } finally {
      setLoading(false);
    }
  }, [page, perPage, debouncedSearch]);

  useEffect(() => {
    loadParametros();
  }, [loadParametros]);

  useEffect(() => {
    loadPlantillas();
  }, [loadPlantillas]);

  const handleCrear = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEditar = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    loadPlantillas();
  };

  const handleSave = async (plantilla) => {
    try {
      const payload = {
        parametroPlantillaId: plantilla.parametroId,
        asunto: plantilla.asunto,
        cuerpo: plantilla.cuerpo || '',
        frecuencia: plantilla.frecuencia || 'inmediato',
        destinatarios: plantilla.destinatarios || [],
        selectedVariableKeys: plantilla.selectedVariableKeys,
        selectedVariables: plantilla.selectedVariables,
      };
      if (plantilla._id) {
        await api.put(`/plantillas-notificacion/${plantilla._id}`, payload);
      } else {
        await api.post('/plantillas-notificacion', payload);
      }
      if (plantilla.parametroId && plantilla.selectedVariables?.length) {
        await api.put(`/parametros-plantilla/${plantilla.parametroId}/variables`, { variables: plantilla.selectedVariables }).catch(() => {});
      }
      handleCloseModal();
    } catch (e) {
      console.error('Error guardando plantilla:', e);
      throw e;
    }
  };

  const handleToggleActive = async (item) => {
    closeMenu();
    if (!item._id) return;
    const willActivate = item.isActive === false;
    const result = await Swal.fire({
      title: willActivate ? '¿Habilitar plantilla?' : '¿Deshabilitar plantilla?',
      text: willActivate
        ? 'Esta plantilla se usará para enviar notificaciones de este evento.'
        : 'Dejará de usarse para enviar notificaciones hasta que la habilites de nuevo.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#8b1538',
      cancelButtonColor: '#6c757d',
      confirmButtonText: willActivate ? 'Habilitar' : 'Deshabilitar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    try {
      await api.put(`/plantillas-notificacion/${item._id}`, { isActive: willActivate });
      loadPlantillas();
      Swal.fire({
        icon: 'success',
        title: willActivate ? 'Plantilla habilitada' : 'Plantilla deshabilitada',
        timer: 2000,
        showConfirmButton: false,
        confirmButtonColor: '#8b1538',
      });
    } catch (e) {
      console.error('Error cambiando estado:', e);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: e.response?.data?.message || 'No se pudo cambiar el estado.',
        confirmButtonColor: '#8b1538',
      });
    }
  };

  const handleSaveDestinatarios = async (parametroId, destinatarios) => {
    const item = destinatariosItem;
    if (!item?._id) return;
    try {
      await api.put(`/plantillas-notificacion/${item._id}`, { destinatarios: Array.isArray(destinatarios) ? destinatarios : [] });
      setDestinatariosItem(null);
      loadPlantillas();
    } catch (e) {
      console.error('Error guardando destinatarios:', e);
    }
  };

  const listItems = plantillas.map(mapPlantillaToItem);
  const isLoading = parametrosLoading || loading;

  return (
    <div className="pn-content">
      <div className="pn-header">
        <div className="pn-header-left">
          <button type="button" className="pn-btn-volver" onClick={onVolver} title="Volver">
            <FiArrowLeft className="pn-btn-icon" /> Volver
          </button>
          <button type="button" className="pn-btn-crear" onClick={handleCrear}>
            <FiPlus /> Crear plantilla
          </button>
        </div>
        <div className="pn-header-right">
          <div className="pn-search-input-wrap">
            <FiSearch className="pn-search-icon" aria-hidden />
            <input
              type="search"
              className="pn-search-input"
              placeholder="Buscar por evento, asunto o cuerpo…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Buscar plantillas"
            />
          </div>
        </div>
      </div>

      <div className="pn-table-wrapper">
        {parametrosError ? (
          <div className="pn-empty">
            <p className="pn-error-msg">{parametrosError}</p>
            <button type="button" className="pn-btn-secondary" onClick={loadParametros} style={{ marginTop: 16 }}>Reintentar</button>
          </div>
        ) : isLoading && plantillas.length === 0 ? (
          <div className="pn-loading">Cargando...</div>
        ) : listItems.length === 0 && !loading ? (
          <div className="pn-empty">
            <p>
              {debouncedSearch
                ? 'No hay plantillas que coincidan con tu búsqueda.'
                : 'No hay plantillas registradas.'}
            </p>
          </div>
        ) : (
          <>
            <div className="pn-table-scroll">
            <table className="pn-table">
              <thead>
                <tr>
                  <th className="pn-th-ambito">Ámbito</th>
                  <th>Plantilla</th>
                  <th>Asunto</th>
                  <th>Frecuencia</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listItems.map((item) => (
                  <tr key={item._id}>
                    <td className="pn-td-ambito">{etiquetaAmbitoEvento(item.eventoTipo)}</td>
                    <td className="pn-td-nombre">{item.nombre || item.value}</td>
                    <td className="pn-td-asunto">{item.asunto || '—'}</td>
                    <td className="pn-td-frecuencia">
                      {FRECUENCIAS.find((f) => f.value === (item.frecuencia || 'inmediato'))?.label || item.frecuencia || 'Inmediato'}
                    </td>
                    <td className="pn-td-actions">
                      <div className="pn-options-wrap">
                        <button
                          type="button"
                          className="pn-btn-options"
                          onClick={(e) => {
                            if (openMenuId === item._id) closeMenu();
                            else {
                              setOpenMenuId(item._id);
                              setMenuAnchorRect(e.currentTarget.getBoundingClientRect());
                            }
                          }}
                          title="Opciones"
                        >
                          <FiMoreVertical /> Opciones
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {pagination.pages > 0 && (
              <div className="pn-pagination">
                <div className="pn-pagination-per-page">
                  <span>Mostrar</span>
                  <select
                    value={perPage}
                    onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                    className="pn-pagination-select"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <span>por página</span>
                </div>
                <span className="pn-pagination-info">
                  {pagination.total === 0
                    ? 'Mostrando 0 de 0'
                    : `Mostrando ${(page - 1) * pagination.limit + 1}-${Math.min(page * pagination.limit, pagination.total)} de ${pagination.total}`}
                </span>
                <div className="pn-pagination-btns">
                  <button
                    type="button"
                    className="pn-pagination-btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </button>
                  <span className="pn-pagination-pages">Página {page} de {pagination.pages}</span>
                  <button
                    type="button"
                    className="pn-pagination-btn"
                    disabled={page >= pagination.pages}
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <OptionsMenuPortal
        open={!!openMenuId}
        anchorRect={menuAnchorRect}
        onClose={closeMenu}
      >
        {openMenuId && (() => {
          const item = listItems.find((i) => i._id === openMenuId);
          if (!item) return null;
          return (
            <>
              <button type="button" className="pn-options-item" onClick={() => { setPreviewItem(item); closeMenu(); }}>
                <FiEye /> Ver
              </button>
              <button type="button" className="pn-options-item" onClick={() => { handleEditar(item); closeMenu(); }}>
                <FiEdit2 /> Editar
              </button>
              <button type="button" className="pn-options-item" onClick={() => handleToggleActive(item)}>
                {item.isActive !== false ? <><FiToggleRight /> Deshabilitar</> : <><FiToggleLeft /> Habilitar</>}
              </button>
              <button type="button" className="pn-options-item" onClick={() => { setDestinatariosItem(item); closeMenu(); }}>
                <FiUsers /> Destinatarios
              </button>
            </>
          );
        })()}
      </OptionsMenuPortal>

      <ModalPlantilla
        open={showModal}
        tipo={TIPOS_PLANTILLA}
        parametros={parametros}
        savedPlantillas={{}}
        editingItem={editingItem}
        onSave={handleSave}
        onClose={handleCloseModal}
      />
      <ModalPreviewPlantilla open={!!previewItem} item={previewItem} onClose={() => setPreviewItem(null)} />
      <ModalDestinatarios
        open={!!destinatariosItem}
        item={destinatariosItem}
        onSave={(destinatarios) => destinatariosItem && handleSaveDestinatarios(destinatariosItem.parametroId, destinatarios)}
        onClose={() => setDestinatariosItem(null)}
      />
    </div>
  );
}
