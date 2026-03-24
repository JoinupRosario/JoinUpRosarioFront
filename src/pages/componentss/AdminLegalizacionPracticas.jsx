import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDownload } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import api from '../../services/api';
import './AdminLegalizacionMonitorias.css';

const ESTADO_LABEL = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  en_ajuste: 'En ajuste',
};

export default function AdminLegalizacionPracticas() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchList = useCallback(() => {
    setLoading(true);
    const params = { page, limit };
    if (filtroEstado) params.estado = filtroEstado;
    if (filtroPeriodo.trim()) params.periodo = filtroPeriodo.trim();
    if (busqueda.trim()) params.search = busqueda.trim();
    api
      .get('/legalizaciones-practica/admin/list', { params })
      .then((r) => {
        setData(r.data?.data ?? []);
        setTotal(r.data?.total ?? 0);
      })
      .catch(() => {
        setData([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [filtroEstado, filtroPeriodo, busqueda, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    api.get('/legalizaciones-practica/admin/estadisticas').then((r) => setStats(r.data)).catch(() => setStats(null));
  }, []);

  const verRevision = (row) => {
    if (!row.postulacionId) return;
    navigate(`/dashboard/legalizaciones/revision/${row.postulacionId}`);
  };

  const exportarExcel = () => {
    if (!data.length) {
      Swal.fire({ icon: 'warning', title: 'Sin datos', text: 'Exporte tras cargar el listado o amplíe filtros.', confirmButtonColor: '#c41e3a' });
      return;
    }
    const headers = ['Nº identidad', 'Nombre', 'Apellido', 'Programa', 'Cargo práctica', 'Periodo', 'Empresa', 'Estado legalización'];
    const rows = data.map((row) => [
      row.numeroIdentidad ?? '',
      row.nombre ?? '',
      row.apellido ?? '',
      row.programa ?? '',
      row.nombreCargo ?? '',
      row.periodo ?? '',
      row.empresa ?? '',
      ESTADO_LABEL[row.estadoLegalizacion] ?? row.estadoLegalizacion ?? '',
    ]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Legalizaciones práctica');
    XLSX.writeFile(wb, `legalizaciones_practica_admin_${new Date().toISOString().slice(0, 10)}.xlsx`);
    Swal.fire({ icon: 'success', title: 'Exportado', text: `${data.length} fila(s) en esta página.`, confirmButtonColor: '#c41e3a', timer: 2000, timerProgressBar: true });
  };

  return (
    <div className="dashboard-content admlegmtm">
      <header className="admlegmtm__hero">
        <div>
          <h2>Legalizaciones de prácticas</h2>
          <p>Tablero de gestión: revise documentación, apruebe o solicite ajustes. Exporte y consulte estadísticas por estado.</p>
          {stats?.porEstado && (
            <p style={{ marginTop: 8, fontSize: 14, color: '#475569' }}>
              Totales:{' '}
              {Object.entries(stats.porEstado).map(([k, v]) => (
                <span key={k} style={{ marginRight: 12 }}>
                  <strong>{ESTADO_LABEL[k] || k}:</strong> {v}
                </span>
              ))}
              | <strong>Total registros:</strong> {stats.total ?? 0}
            </p>
          )}
        </div>
        <div className="admlegmtm__hero-actions">
          <button type="button" className="admlegmtm__btn admlegmtm__btn--primary" onClick={exportarExcel} disabled={loading || !data.length}>
            <FiDownload aria-hidden /> Exportar página (Excel)
          </button>
        </div>
      </header>

      <section className="admlegmtm__filters" aria-label="Filtros">
        <div className="admlegmtm__filters-title">Filtros</div>
        <div className="admlegmtm__filters-grid">
          <label className="admlegmtm__field">
            <span className="admlegmtm__label">Estado legalización</span>
            <select value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }} className="admlegmtm__control">
              <option value="">Todos</option>
              {Object.entries(ESTADO_LABEL).map(([k, lab]) => (
                <option key={k} value={k}>{lab}</option>
              ))}
            </select>
          </label>
          <label className="admlegmtm__field">
            <span className="admlegmtm__label">Periodo</span>
            <input className="admlegmtm__control" placeholder="Ej. 2025-1" value={filtroPeriodo} onChange={(e) => { setFiltroPeriodo(e.target.value); setPage(1); }} />
          </label>
          <label className="admlegmtm__field" style={{ gridColumn: 'span 2' }}>
            <span className="admlegmtm__label">Buscar</span>
            <input className="admlegmtm__control" placeholder="Nombre, identidad, cargo" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPage(1); }} />
          </label>
        </div>
      </section>

      {loading ? (
        <div className="loading-container"><div className="loading-spinner" /><p>Cargando...</p></div>
      ) : !data.length ? (
        <p className="empty-state">No hay legalizaciones con los filtros actuales.</p>
      ) : (
        <div className="oportunidades-section">
          <table className="postulants-table" style={{ minWidth: 960 }}>
            <thead>
              <tr>
                <th>Nº identidad</th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Programa</th>
                <th>Cargo práctica</th>
                <th>Periodo</th>
                <th>Empresa</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={String(row.postulacionId)}>
                  <td>{row.numeroIdentidad ?? '—'}</td>
                  <td>{row.nombre ?? '—'}</td>
                  <td>{row.apellido ?? '—'}</td>
                  <td>{row.programa ?? '—'}</td>
                  <td>{row.nombreCargo ?? '—'}</td>
                  <td>{row.periodo ?? '—'}</td>
                  <td>{row.empresa ?? '—'}</td>
                  <td>{ESTADO_LABEL[row.estadoLegalizacion] ?? row.estadoLegalizacion ?? '—'}</td>
                  <td>
                    <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => verRevision(row)}>
                      Revisar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
            <span>Página {page} — {total} registro(s)</span>
            <button type="button" className="btn-secondary" disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}
