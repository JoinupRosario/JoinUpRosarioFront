import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBriefcase, FiSearch, FiRefreshCw, FiChevronLeft, FiChevronRight, FiPlus } from 'react-icons/fi';
import api from '../../services/api';

/**
 * Vista "Mis oportunidades" del portal de entidad.
 * Lista oportunidades de PRÁCTICA de la entidad del usuario autenticado.
 *
 * Backend: GET /opportunities/mi-entidad?page=&limit=&search=&estado=
 *   (controller resuelve la company a partir del usuario autenticado).
 */
export default function MisOportunidadesEntidad() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [estado, setEstado] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const limit = 10;

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit };
      if (estado) params.estado = estado;
      if (search) params.search = search;
      const { data } = await api.get('/opportunities/mi-entidad', { params });
      setItems(Array.isArray(data?.opportunities) ? data.opportunities : []);
      setTotalPages(Number(data?.totalPages || 1));
      setTotal(Number(data?.total || 0));
    } catch (err) {
      console.error('[MisOportunidadesEntidad] error', err);
      setError(err?.response?.data?.message || 'No se pudieron cargar las oportunidades.');
      setItems([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, estado, search]);

  const onBuscar = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const onLimpiar = () => {
    setSearchInput('');
    setSearch('');
    setEstado('');
    setPage(1);
  };

  const estadosDisponibles = useMemo(
    () => [
      { value: '', label: 'Todos los estados' },
      { value: 'Activa', label: 'Activa' },
      { value: 'En Revisión', label: 'En revisión' },
      { value: 'Aprobada', label: 'Aprobada' },
      { value: 'Rechazada', label: 'Rechazada' },
      { value: 'Cerrada', label: 'Cerrada' },
      { value: 'Vencida', label: 'Vencida' },
    ],
    []
  );

  return (
    <div className="dent-page">
      <div className="dent-page-header">
        <div>
          <h2 className="dent-page-title">Mis oportunidades</h2>
          <p className="dent-page-subtitle">
            Aquí puedes consultar y gestionar las oportunidades de práctica publicadas por tu
            entidad.
          </p>
        </div>
        <div className="dent-page-actions">
          <button
            type="button"
            className="dent-btn"
            onClick={() => navigate('/entidad/oportunidades/crear')}
          >
            <FiPlus />
            Crear oportunidad
          </button>
          <button
            type="button"
            className="dent-btn dent-btn-secondary"
            onClick={cargar}
            disabled={loading}
            title="Actualizar"
          >
            <FiRefreshCw />
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      <form className="dent-filters" onSubmit={onBuscar}>
        <div className="dent-search">
          <FiSearch className="dent-search-icon" />
          <input
            className="dent-input"
            placeholder="Buscar por nombre del cargo, funciones, requisitos…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <select
          className="dent-select"
          value={estado}
          onChange={(e) => {
            setPage(1);
            setEstado(e.target.value);
          }}
        >
          {estadosDisponibles.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button type="submit" className="dent-btn">
          Buscar
        </button>
        {(search || estado) && (
          <button
            type="button"
            className="dent-btn dent-btn-secondary"
            onClick={onLimpiar}
          >
            Limpiar
          </button>
        )}
      </form>

      {error && <div className="dent-alert dent-alert-error">{error}</div>}

      <div className="dent-table-wrap">
        <table className="dent-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Cargo</th>
              <th>Postulaciones</th>
              <th>Estado</th>
              <th>Publicada</th>
              <th>Vencimiento</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">
                  <div className="dent-empty">Cargando oportunidades…</div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="6">
                  <div className="dent-empty">
                    <FiBriefcase
                      style={{
                        fontSize: '2rem',
                        display: 'block',
                        margin: '0 auto 8px',
                        color: '#94a3b8',
                      }}
                    />
                    {search || estado
                      ? 'No hay oportunidades que coincidan con los filtros.'
                      : 'Aún no hay oportunidades publicadas para tu entidad.'}
                  </div>
                </td>
              </tr>
            ) : (
              items.map((opp) => (
                <tr key={opp._id}>
                  <td className="dent-mono">
                    {String(opp._id).slice(-6).toUpperCase()}
                  </td>
                  <td>
                    <strong>{opp.nombreCargo || 'Sin nombre'}</strong>
                    {opp.tipoVinculacion?.value && (
                      <div className="dent-cell-sub">{opp.tipoVinculacion.value}</div>
                    )}
                  </td>
                  <td>{opp.aplicacionesCount ?? 0}</td>
                  <td>
                    <EstadoBadge value={opp.estado} />
                  </td>
                  <td>{formatFecha(opp.createdAt || opp.fechaCreacion)}</td>
                  <td>{formatFecha(opp.fechaVencimiento)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="dent-pagination">
          <button
            type="button"
            className="dent-pag-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            <FiChevronLeft /> Anterior
          </button>
          <span className="dent-pag-info">
            Página <strong>{page}</strong> de <strong>{totalPages}</strong>
            {total ? ` · ${total} resultados` : ''}
          </span>
          <button
            type="button"
            className="dent-pag-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            Siguiente <FiChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}

function EstadoBadge({ value }) {
  const v = String(value || '').toLowerCase();
  let cls = 'dent-badge dent-badge-default';
  if (/activ/.test(v)) cls = 'dent-badge dent-badge-success';
  else if (/cerrad/.test(v)) cls = 'dent-badge dent-badge-neutral';
  else if (/rechaz/.test(v)) cls = 'dent-badge dent-badge-danger';
  else if (/revis/.test(v)) cls = 'dent-badge dent-badge-warning';
  else if (/venci/.test(v)) cls = 'dent-badge dent-badge-neutral';
  else if (/aprob/.test(v)) cls = 'dent-badge dent-badge-success';
  return <span className={cls}>{value || '—'}</span>;
}

function formatFecha(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}
