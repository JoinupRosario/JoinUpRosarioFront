import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiDownload } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import api from '../../services/api';
import LegalizacionProgramasBadge from '../../components/legalizacion/LegalizacionProgramasBadge';
import './AdminLegalizacionMonitorias.css';

/** Claves = `estadoMTM` del listado (derivado de `LegalizacionMTM.estado` en backend). */
const ESTADO_LABEL = {
  creada: 'Creada',
  en_revision: 'En revisión',
  aprobada: 'Legalizada',
  solicitada_finalizacion: 'Solicitud finalización',
  finalizada: 'Finalizada',
  rechazada: 'Anulada',
  en_ajuste: 'En ajuste',
  legalizada: 'Legalizada',
  anulada: 'Anulada',
  aceptada: 'Creada',
};

/** Etiquetas para valores reales de BD en filtro (`LegalizacionMTM.estado`). */
const ESTADO_BD_FILTRO_LABEL = {
  creada: 'Creada',
  borrador: 'Borrador',
  en_revision: 'En revisión',
  aprobada: 'Legalizada',
  finalizada: 'Finalizada',
  rechazada: 'Anulada',
  en_ajuste: 'En ajuste',
};

function labelEstadoLegalizacionBdFiltro(codigo) {
  if (codigo == null || codigo === '') return '';
  const k = String(codigo);
  return ESTADO_BD_FILTRO_LABEL[k] ?? k.replace(/_/g, ' ');
}

function buildListParams({ filtroEstado, filtroPeriodo, filtroPrograma, busqueda, page, limit }) {
  const params = { page, limit };
  if (filtroEstado) params.estado = filtroEstado;
  if (filtroPeriodo) params.periodo = filtroPeriodo.trim();
  if (filtroPrograma) params.programa = filtroPrograma;
  const q = (busqueda || '').trim();
  if (q) params.search = q;
  return params;
}

export default function AdminLegalizacionMonitorias() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Estado sincronizado con URL para que persista al volver desde el detalle
  const filtroEstado   = searchParams.get('estado') ?? '';
  const filtroPeriodo  = searchParams.get('periodo') ?? '';
  const filtroPrograma = searchParams.get('programa') ?? '';
  const busqueda       = searchParams.get('q') ?? '';
  const page           = Number(searchParams.get('page') ?? '1');
  const limit          = Number(searchParams.get('limit') ?? '20');

  const [busquedaInput, setBusquedaInput] = useState(busqueda);

  const setFiltroEstado   = (v) => setSearchParams((p) => { const n = new URLSearchParams(p); v ? n.set('estado', v)   : n.delete('estado');   n.set('page','1'); return n; }, { replace: true });
  const setFiltroPeriodo  = (v) => setSearchParams((p) => { const n = new URLSearchParams(p); v ? n.set('periodo', v)  : n.delete('periodo');  n.set('page','1'); return n; }, { replace: true });
  const setFiltroPrograma = (v) => setSearchParams((p) => { const n = new URLSearchParams(p); v ? n.set('programa', v) : n.delete('programa'); n.set('page','1'); return n; }, { replace: true });
  const setBusqueda       = (v) => setSearchParams((p) => { const n = new URLSearchParams(p); v ? n.set('q', v)        : n.delete('q');        n.set('page','1'); return n; }, { replace: true });
  const setPage           = (fn) => setSearchParams((p) => { const n = new URLSearchParams(p); const next = typeof fn === 'function' ? fn(Number(p.get('page') ?? '1')) : fn; n.set('page', String(next)); return n; }, { replace: true });
  const setLimit          = (v)  => setSearchParams((p) => { const n = new URLSearchParams(p); n.set('limit', String(v)); n.set('page','1'); return n; }, { replace: true });

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [aprobandoMasivo, setAprobandoMasivo] = useState(false);
  const [finalizandoMasivo, setFinalizandoMasivo] = useState(false);
  const [metaEstados, setMetaEstados] = useState([]);
  const [metaPeriodos, setMetaPeriodos] = useState([]);
  const [metaProgramas, setMetaProgramas] = useState([]);
  const [metaError, setMetaError] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);
  const cargarMeta = useCallback(() => {
    setMetaLoading(true);
    setMetaError(false);
    api
      .get('/oportunidades-mtm/legalizaciones-admin/meta/filtros')
      .then((r) => {
        setMetaEstados(Array.isArray(r.data?.estados) ? r.data.estados : []);
        setMetaPeriodos(Array.isArray(r.data?.periodos) ? r.data.periodos : []);
        setMetaProgramas(Array.isArray(r.data?.programas) ? r.data.programas : []);
        setMetaError(false);
      })
      .catch(() => {
        setMetaError(true);
      })
      .finally(() => setMetaLoading(false));
  }, []);

  useEffect(() => { cargarMeta(); }, [cargarMeta]);

  // Debounce de búsqueda — actualiza el param `q` en la URL con retraso
  useEffect(() => {
    const trimmed = busquedaInput.trim();
    const t = setTimeout(() => setBusqueda(trimmed), 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busquedaInput]);

  const fetchList = useCallback(() => {
    setLoading(true);
    const params = buildListParams({
      filtroEstado,
      filtroPeriodo,
      filtroPrograma,
      busqueda,
      page,
      limit,
    });
    api
      .get('/oportunidades-mtm/legalizaciones-admin', { params })
      .then((r) => {
        setData(r.data?.data ?? []);
        setTotal(r.data?.total ?? 0);
        setTotalPages(Math.max(1, r.data?.totalPages ?? 1));
      })
      .catch(() => {
        setData([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, [filtroEstado, filtroPeriodo, filtroPrograma, busqueda, page, limit]);

  useEffect(() => {
    setSeleccionados(new Set());
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const verRevision = (row) => {
    const id = row.postulacionId ?? row._id;
    if (!id) return;
    navigate(`/dashboard/monitorias/revision/${id}`);
  };

  const limpiarFiltros = () => {
    setBusquedaInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const hayFiltrosActivos = filtroEstado || filtroPeriodo || busqueda || filtroPrograma;

  const exportarExcel = () => {
    const params = buildListParams({
      filtroEstado,
      filtroPeriodo,
      filtroPrograma,
      busqueda,
      page: 1,
      limit: 5000,
    });
    api
      .get('/oportunidades-mtm/legalizaciones-admin', { params })
      .then((r) => {
        const list = r.data?.data ?? [];
        if (!list.length) {
          Swal.fire({ icon: 'warning', title: 'Sin datos', text: 'No hay registros para exportar.', confirmButtonColor: '#c41e3a' });
          return;
        }
        const headers = ['Nº identidad', 'Nombre', 'Apellido', 'Programa', 'Código MTM', 'Nombre MTM', 'Periodo', 'Coordinador', 'Estado MTM'];
        const rows = list.map((row) => [
          row.numeroIdentidad ?? '',
          row.nombre ?? '',
          row.apellido ?? '',
          row.programa ?? '',
          row.codigoMTM ?? '',
          row.nombreMTM ?? '',
          row.periodo ?? '',
          row.coordinador ?? '',
          ESTADO_LABEL[row.estadoMTM] ?? row.estadoMTM ?? '',
        ]);
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        XLSX.utils.book_append_sheet(wb, ws, 'Legalizaciones');
        XLSX.writeFile(wb, `legalizaciones_mtm_${new Date().toISOString().slice(0, 10)}.xlsx`);
        Swal.fire({ icon: 'success', title: 'Exportado', text: `Se exportaron ${list.length} registro(s) a Excel.`, confirmButtonColor: '#c41e3a', timer: 2000, timerProgressBar: true });
      })
      .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo exportar.', confirmButtonColor: '#c41e3a' }));
  };

  // IDs seleccionables por estado
  const idsEnRevision      = data.filter((r) => r.estadoMTM === 'en_revision').map((r) => String(r.postulacionId ?? r._id));
  const idsEnFinalizacion  = data.filter((r) => r.estadoMTM === 'solicitada_finalizacion').map((r) => String(r.postulacionId ?? r._id));
  const idsSeleccionables  = [...idsEnRevision, ...idsEnFinalizacion];
  const todasSeleccionadas = idsSeleccionables.length > 0 && idsSeleccionables.every((id) => seleccionados.has(id));

  // Subset de seleccionados por tipo (para los botones)
  const selRevision     = Array.from(seleccionados).filter((id) => idsEnRevision.includes(id));
  const selFinalizacion = Array.from(seleccionados).filter((id) => idsEnFinalizacion.includes(id));

  const ocupado = aprobandoMasivo || finalizandoMasivo;

  const toggleSeleccion = (id) => setSeleccionados((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleTodas = () => {
    if (todasSeleccionadas) setSeleccionados(new Set());
    else setSeleccionados(new Set(idsSeleccionables));
  };

  const aprobarMasivo = async () => {
    if (selRevision.length === 0) return;
    const confirm = await Swal.fire({
      icon: 'question',
      title: 'Aprobar legalización de monitorías',
      html: `¿Está seguro de aprobar las <strong>${selRevision.length}</strong> monitoría(s) seleccionada(s)?<br/><br/>Con esta acción también quedarán aprobados los documentos pendientes de aprobación si los hay.`,
      showCancelButton: true,
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c41e3a',
    });
    if (!confirm.isConfirmed) return;
    setAprobandoMasivo(true);
    try {
      const { data: res } = await api.post('/oportunidades-mtm/legalizaciones-admin/aprobar-masivo', { postulacionIds: selRevision });
      Swal.fire({ icon: 'success', title: '¡Listo!', text: res.message, confirmButtonColor: '#c41e3a', timer: 3500, timerProgressBar: true });
      setSeleccionados(new Set());
      fetchList();
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo completar la aprobación masiva.', confirmButtonColor: '#c41e3a' });
    } finally {
      setAprobandoMasivo(false);
    }
  };

  const finalizarMasivo = async () => {
    if (selFinalizacion.length === 0) return;
    const confirm = await Swal.fire({
      icon: 'question',
      title: 'Aprobar finalización de monitorías',
      html: `¿Está seguro de confirmar la finalización de las <strong>${selFinalizacion.length}</strong> monitoría(s) seleccionada(s)?`,
      showCancelButton: true,
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c41e3a',
    });
    if (!confirm.isConfirmed) return;
    setFinalizandoMasivo(true);
    try {
      const { data: res } = await api.post('/oportunidades-mtm/legalizaciones-admin/finalizar-masivo', { postulacionIds: selFinalizacion });
      Swal.fire({ icon: 'success', title: '¡Listo!', text: res.message, confirmButtonColor: '#c41e3a', timer: 3500, timerProgressBar: true });
      setSeleccionados(new Set());
      fetchList();
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo completar la finalización masiva.', confirmButtonColor: '#c41e3a' });
    } finally {
      setFinalizandoMasivo(false);
    }
  };

  const inicio = total === 0 ? 0 : (page - 1) * limit + 1;
  const fin = Math.min(page * limit, total);

  return (
    <div className="dashboard-content admlegmtm">
      <header className="admlegmtm__hero">
        <div>
          <h2>Legalización de monitorías</h2>
          <p>
            Listado de MTM en proceso de legalización. Seleccione una fila para revisar datos, documentos y aprobar o rechazar.
          </p>
        </div>
        <div className="admlegmtm__hero-actions">
          <button type="button" className="admlegmtm__btn admlegmtm__btn--primary" onClick={exportarExcel} disabled={loading || total === 0}>
            <FiDownload aria-hidden /> Exportar a Excel
          </button>
        </div>
      </header>

      <section className="admlegmtm__filters" aria-label="Filtros del listado">
        <div className="admlegmtm__filters-title">
          Filtros
          {metaError && (
            <span className="admlegmtm__meta-error">
              {' '}— No se pudieron cargar las opciones.{' '}
              <button type="button" className="admlegmtm__btn-retry" onClick={cargarMeta}>
                Reintentar
              </button>
            </span>
          )}
        </div>
        <div className="admlegmtm__filters-grid">
          <label className="admlegmtm__field">
            <span className="admlegmtm__label">Estado legalización</span>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="admlegmtm__control"
              disabled={metaLoading}
            >
              <option value="">{metaLoading ? 'Cargando…' : 'Todos los estados'}</option>
              {metaEstados.map((codigo) => (
                <option key={String(codigo)} value={String(codigo)}>
                  {labelEstadoLegalizacionBdFiltro(codigo)}
                </option>
              ))}
            </select>
          </label>
          <label className="admlegmtm__field">
            <span className="admlegmtm__label">Periodo</span>
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="admlegmtm__control"
              disabled={metaLoading}
            >
              <option value="">{metaLoading ? 'Cargando…' : 'Todos los periodos'}</option>
              {metaPeriodos.map((p) => (
                <option key={String(p)} value={String(p)}>{p}</option>
              ))}
            </select>
          </label>
          <label className="admlegmtm__field admlegmtm__field--programa">
            <span className="admlegmtm__label">Programa</span>
            <select
              value={filtroPrograma}
              onChange={(e) => setFiltroPrograma(e.target.value)}
              className="admlegmtm__control admlegmtm__control--programa"
              disabled={metaLoading}
            >
              <option value="">{metaLoading ? 'Cargando…' : 'Todos los programas'}</option>
              {metaProgramas.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="admlegmtm__field">
            <span className="admlegmtm__label">Buscar</span>
            <input
              type="text"
              value={busquedaInput}
              onChange={(e) => setBusquedaInput(e.target.value)}
              placeholder="Nombre, apellido, identidad, MTM..."
              className="admlegmtm__control"
            />
          </label>
          {hayFiltrosActivos && (
            <button type="button" className="admlegmtm__btn admlegmtm__btn--ghost" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          )}
        </div>
      </section>

      {loading ? (
        <div className="admlegmtm__loading">
          <div className="admlegmtm__spinner" aria-hidden />
          <p>Cargando...</p>
        </div>
      ) : total === 0 ? (
        <div className="admlegmtm__empty">
          <p>No hay legalizaciones que coincidan con los filtros.</p>
        </div>
      ) : (
        <div className="admlegmtm__list">
          {/* Barra de acciones masivas */}
          {seleccionados.size > 0 && (
            <div className="admlegmtm__masivo-bar">
              <span className="admlegmtm__masivo-count">
                {seleccionados.size} monitoría(s) seleccionada(s)
                {selRevision.length > 0 && selFinalizacion.length > 0
                  ? ` (${selRevision.length} en revisión · ${selFinalizacion.length} en solicitud finalización)`
                  : selRevision.length > 0
                    ? ` — en revisión`
                    : ` — en solicitud de finalización`}
              </span>
              {selRevision.length > 0 && (
                <button
                  type="button"
                  className="admlegmtm__btn admlegmtm__btn--aprobar-masivo"
                  onClick={aprobarMasivo}
                  disabled={ocupado}
                >
                  {aprobandoMasivo ? 'Aprobando...' : `✓ Aprobar legalización (${selRevision.length})`}
                </button>
              )}
              {selFinalizacion.length > 0 && (
                <button
                  type="button"
                  className="admlegmtm__btn admlegmtm__btn--finalizar-masivo"
                  onClick={finalizarMasivo}
                  disabled={ocupado}
                >
                  {finalizandoMasivo ? 'Finalizando...' : `✓ Aprobar finalización (${selFinalizacion.length})`}
                </button>
              )}
              <button
                type="button"
                className="admlegmtm__btn admlegmtm__btn--ghost"
                onClick={() => setSeleccionados(new Set())}
                disabled={ocupado}
              >
                Cancelar
              </button>
            </div>
          )}

          <div className="admlegmtm__tableScroll">
            <table className="admlegmtm__table">
              <thead>
                <tr>
                  <th scope="col" className="admlegmtm__th-check">
                    {idsSeleccionables.length > 0 && (
                      <input
                        type="checkbox"
                        checked={todasSeleccionadas}
                        onChange={toggleTodas}
                        title="Seleccionar todas las que están en revisión o en solicitud de finalización"
                        className="admlegmtm__checkbox"
                      />
                    )}
                  </th>
                  <th scope="col">Nº identidad</th>
                  <th scope="col">Nombre</th>
                  <th scope="col">Apellido</th>
                  <th scope="col">Código MTM</th>
                  <th scope="col">Nombre MTM</th>
                  <th scope="col">Periodo</th>
                  <th scope="col">Coordinador</th>
                  <th scope="col">Estado MTM</th>
                  <th scope="col">Programas</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => {
                  const rowId = String(row.postulacionId ?? row._id);
                  const esSeleccionable = row.estadoMTM === 'en_revision' || row.estadoMTM === 'solicitada_finalizacion';
                  const seleccionado = seleccionados.has(rowId);
                  return (
                    <tr key={rowId} className={seleccionado ? 'admlegmtm__tr--selected' : ''}>
                      <td className="admlegmtm__td-check">
                        {esSeleccionable && (
                          <input
                            type="checkbox"
                            checked={seleccionado}
                            onChange={() => toggleSeleccion(rowId)}
                            className="admlegmtm__checkbox"
                          />
                        )}
                      </td>
                      <td>{row.numeroIdentidad ?? '—'}</td>
                      <td>{row.nombre ?? '—'}</td>
                      <td>{row.apellido ?? '—'}</td>
                      <td>{row.codigoMTM ?? '—'}</td>
                      <td>{row.nombreMTM ?? '—'}</td>
                      <td>{row.periodo ?? '—'}</td>
                      <td>{row.coordinador ?? '—'}</td>
                      <td>{ESTADO_LABEL[row.estadoMTM] ?? row.estadoMTM ?? '—'}</td>
                      <td>
                        <LegalizacionProgramasBadge row={row} variant="admin" />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admlegmtm__btn admlegmtm__btn--row"
                          onClick={() => verRevision(row)}
                          title="Revisar datos y documentos"
                        >
                          Revisar legalización
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="admlegmtm__pager" role="navigation" aria-label="Paginación del listado">
            <p className="admlegmtm__pager-summary">
              Mostrando {inicio}–{fin} de {total} legalización(es)
            </p>
            <div className="admlegmtm__pager-row">
              <label className="admlegmtm__pager-size">
                <span>Por página</span>
                <select
                  className="admlegmtm__pager-select"
                  value={String(limit)}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  aria-label="Registros por página"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </label>
              <button
                type="button"
                className="admlegmtm__btn admlegmtm__btn--pager"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <span className="admlegmtm__pager-meta">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                className="admlegmtm__btn admlegmtm__btn--pager"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
