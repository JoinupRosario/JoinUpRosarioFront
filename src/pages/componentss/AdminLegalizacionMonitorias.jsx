import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../styles/Oportunidades.css';

const ESTADO_LABEL = {
  borrador: 'Pendiente',
  en_revision: 'En revisión',
  aprobada: 'Legalizada',
  rechazada: 'Anulada',
  en_ajuste: 'En ajuste',
};

export default function AdminLegalizacionMonitorias() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroPrograma, setFiltroPrograma] = useState('');

  useEffect(() => {
    const params = {};
    if (filtroEstado) params.estado = filtroEstado;
    if (filtroPeriodo) params.periodo = filtroPeriodo;
    api.get('/oportunidades-mtm/legalizaciones-admin', { params })
      .then((r) => {
        setData(r.data?.data ?? []);
        setTotal(r.data?.total ?? 0);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [filtroEstado, filtroPeriodo]);

  const programasUnicos = useMemo(() => {
    const set = new Set();
    data.forEach((row) => { if (row.programa) set.add(row.programa); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [data]);

  const datosFiltrados = useMemo(() => {
    let list = data;
    const q = (busqueda || '').trim().toLowerCase();
    if (q) {
      list = list.filter(
        (row) =>
          (row.nombre ?? '').toLowerCase().includes(q) ||
          (row.apellido ?? '').toLowerCase().includes(q) ||
          (row.numeroIdentidad ?? '').toLowerCase().includes(q) ||
          (row.programa ?? '').toLowerCase().includes(q) ||
          (row.nombreMTM ?? '').toLowerCase().includes(q) ||
          (row.coordinador ?? '').toLowerCase().includes(q)
      );
    }
    if (filtroPrograma) {
      list = list.filter((row) => row.programa === filtroPrograma);
    }
    return list;
  }, [data, busqueda, filtroPrograma]);

  const verRevision = (row) => {
    const id = row.postulacionId ?? row._id;
    if (!id) return;
    navigate(`/dashboard/monitorias/revision/${id}`);
  };

  const limpiarFiltros = () => {
    setFiltroEstado('');
    setFiltroPeriodo('');
    setBusqueda('');
    setFiltroPrograma('');
  };

  const hayFiltrosActivos = filtroEstado || filtroPeriodo || busqueda || filtroPrograma;

  return (
    <div className="dashboard-content">
      <div className="dashboard-welcome" style={{ marginBottom: '1.25rem' }}>
        <h2>Legalización de monitorías</h2>
        <p>
          Listado de MTM en proceso de legalización. Seleccione una fila para revisar datos, documentos y aprobar o rechazar.
        </p>
      </div>

      <div className="legalizaciones-filtros" style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Filtros
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Estado</span>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="form-input"
              style={{ width: '100%', minHeight: 38 }}
            >
              <option value="">Todos los estados</option>
              {Object.entries(ESTADO_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Periodo</span>
            <input
              type="text"
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              placeholder="Ej. 2025-1"
              className="form-input"
              style={{ width: '100%', minHeight: 38 }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Programa</span>
            <select
              value={filtroPrograma}
              onChange={(e) => setFiltroPrograma(e.target.value)}
              className="form-input"
              style={{ width: '100%', minHeight: 38 }}
            >
              <option value="">Todos los programas</option>
              {programasUnicos.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Buscar</span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, apellido, identidad, MTM..."
              className="form-input"
              style={{ width: '100%', minHeight: 38 }}
            />
          </label>
          {hayFiltrosActivos && (
            <button type="button" className="btn-secondary" style={{ minHeight: 38, alignSelf: 'end' }} onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Cargando...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="empty-state">
          <p>No hay legalizaciones que coincidan con los filtros.</p>
        </div>
      ) : datosFiltrados.length === 0 ? (
        <div className="empty-state">
          <p>No hay resultados con los filtros aplicados. Pruebe cambiar búsqueda o programa.</p>
        </div>
      ) : (
        <div className="oportunidades-section" style={{ overflowX: 'auto' }}>
          <table className="postulants-table" style={{ minWidth: '1000px' }}>
            <thead>
              <tr>
                <th>Nº identidad</th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Programa</th>
                <th>Código MTM</th>
                <th>Nombre MTM</th>
                <th>Periodo</th>
                <th>Coordinador</th>
                <th>Estado alumno</th>
                <th>Estado MTM</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {datosFiltrados.map((row) => (
                <tr key={row._id || row.postulacionId}>
                  <td>{row.numeroIdentidad ?? '—'}</td>
                  <td>{row.nombre ?? '—'}</td>
                  <td>{row.apellido ?? '—'}</td>
                  <td>{row.programa ?? '—'}</td>
                  <td>{row.codigoMTM ?? '—'}</td>
                  <td>{row.nombreMTM ?? '—'}</td>
                  <td>{row.periodo ?? '—'}</td>
                  <td>{row.coordinador ?? '—'}</td>
                  <td>{row.estadoAlumnoMTM ?? '—'}</td>
                  <td>{ESTADO_LABEL[row.estadoMTM] ?? row.estadoMTM ?? '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '12px', padding: '4px 8px' }}
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
          {(total > 0 || datosFiltrados.length > 0) && (
            <p style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
              {datosFiltrados.length === total
                ? `Total: ${total} legalización(es)`
                : `Mostrando ${datosFiltrados.length} de ${total} legalización(es)`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
