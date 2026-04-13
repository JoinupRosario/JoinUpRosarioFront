import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [metaEstados, setMetaEstados] = useState([]);
  const [metaPeriodos, setMetaPeriodos] = useState([]);
  const [metaProgramas, setMetaProgramas] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroPrograma, setFiltroPrograma] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const prevBusquedaRef = useRef(busqueda);

  useEffect(() => {
    api
      .get('/oportunidades-mtm/legalizaciones-admin/meta/filtros')
      .then((r) => {
        setMetaEstados(Array.isArray(r.data?.estados) ? r.data.estados : []);
        setMetaPeriodos(Array.isArray(r.data?.periodos) ? r.data.periodos : []);
        setMetaProgramas(Array.isArray(r.data?.programas) ? r.data.programas : []);
      })
      .catch(() => {
        setMetaEstados([]);
        setMetaPeriodos([]);
        setMetaProgramas([]);
      });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setBusqueda(busquedaInput.trim()), 400);
    return () => clearTimeout(t);
  }, [busquedaInput]);

  useEffect(() => {
    if (prevBusquedaRef.current !== busqueda) {
      prevBusquedaRef.current = busqueda;
      setPage(1);
    }
  }, [busqueda]);

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
    setFiltroEstado('');
    setFiltroPeriodo('');
    setBusquedaInput('');
    setBusqueda('');
    setFiltroPrograma('');
    setPage(1);
  };

  const hayFiltrosActivos = filtroEstado || filtroPeriodo || busquedaInput || filtroPrograma;

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
        <div className="admlegmtm__filters-title">Filtros</div>
        <div className="admlegmtm__filters-grid">
          <label className="admlegmtm__field">
            <span className="admlegmtm__label">Estado legalización</span>
            <select
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                setPage(1);
              }}
              className="admlegmtm__control"
            >
              <option value="">Todos los estados</option>
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
              onChange={(e) => {
                setFiltroPeriodo(e.target.value);
                setPage(1);
              }}
              className="admlegmtm__control"
            >
              <option value="">Todos los periodos</option>
              {metaPeriodos.map((p) => (
                <option key={String(p)} value={String(p)}>{p}</option>
              ))}
            </select>
          </label>
          <label className="admlegmtm__field admlegmtm__field--programa">
            <span className="admlegmtm__label">Programa</span>
            <select
              value={filtroPrograma}
              onChange={(e) => {
                setFiltroPrograma(e.target.value);
                setPage(1);
              }}
              className="admlegmtm__control admlegmtm__control--programa"
            >
              <option value="">Todos los programas</option>
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
          <div className="admlegmtm__tableScroll">
            <table className="admlegmtm__table">
              <thead>
                <tr>
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
                {data.map((row) => (
                  <tr key={String(row._id || row.postulacionId)}>
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
                ))}
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
