import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDownload } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './AdminLegalizacionMonitorias.css';

const ESTADO_LABEL = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  en_ajuste: 'En ajuste',
};

function labelEstadoLegalizacion(k) {
  if (k == null || k === '') return '';
  const key = String(k);
  return ESTADO_LABEL[key] ?? key.replace(/_/g, ' ');
}

export default function AdminLegalizacionPracticas() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const moduloRaw = user?.modulo != null ? String(user.modulo).trim().toLowerCase() : '';
  const isLeader = String(user?.role || '').toLowerCase() === 'leader' || moduloRaw === 'leader';
  const hasCLPA = hasPermission('CLPA') || hasPermission('VTLP');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [metaPeriodos, setMetaPeriodos] = useState([]);
  const [metaEstados, setMetaEstados] = useState([]);
  const limit = 20;

  useEffect(() => {
    api
      .get('/legalizaciones-practica/admin/meta/filtros')
      .then((r) => {
        setMetaPeriodos(Array.isArray(r.data?.periodos) ? r.data.periodos : []);
        setMetaEstados(Array.isArray(r.data?.estados) ? r.data.estados : []);
      })
      .catch(() => {
        setMetaPeriodos([]);
        setMetaEstados([]);
      });
  }, []);

  const fetchList = useCallback(() => {
    setLoading(true);
    const params = { page, limit };
    if (filtroEstado) params.estado = filtroEstado;
    if (filtroPeriodo) params.periodo = filtroPeriodo;
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

  const verRevision = (row) => {
    if (!row.postulacionId) return;
    navigate(`/dashboard/legalizaciones/revision/${row.postulacionId}`);
  };

  const exportarExcel = () => {
    if (!data.length) {
      Swal.fire({ icon: 'warning', title: 'Sin datos', text: 'Exporte tras cargar el listado o amplíe filtros.', confirmButtonColor: '#c41e3a' });
      return;
    }
    const headers = [
      'Nº identidad', 'Nombre', 'Apellido', 'Programa', 'Cargo práctica', 'Periodo', 'Empresa',
      'Autogestionada', 'Estado legalización',
    ];
    const rows = data.map((row) => [
      row.numeroIdentidad ?? '',
      row.nombre ?? '',
      row.apellido ?? '',
      row.programa ?? '',
      row.nombreCargo ?? '',
      row.periodo ?? '',
      row.empresa ?? '',
      row.practicaAutogestionada ? 'Sí' : 'No',
      labelEstadoLegalizacion(row.estadoLegalizacion),
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
        </div>
        <div className="admlegmtm__hero-actions">
          {(hasCLPA || isLeader) && (
            <button
              type="button"
              className="admlegmtm__btn admlegmtm__btn--outline"
              onClick={() => navigate('/dashboard/legalizaciones/crear-autogestionada')}
            >
              Registrar práctica autogestionada
            </button>
          )}
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
              {metaEstados.map((k) => (
                <option key={String(k)} value={String(k)}>{labelEstadoLegalizacion(k)}</option>
              ))}
            </select>
          </label>
          <label className="admlegmtm__field">
            <span className="admlegmtm__label">Periodo</span>
            <select value={filtroPeriodo} onChange={(e) => { setFiltroPeriodo(e.target.value); setPage(1); }} className="admlegmtm__control">
              <option value="">Todos</option>
              {metaPeriodos.map((p) => (
                <option key={String(p)} value={String(p)}>{p}</option>
              ))}
            </select>
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
        <div className="admlegmtm__list">
          <div className="admlegmtm__tableScroll">
            <table className="admlegmtm__table">
            <thead>
              <tr>
                <th>Nº identidad</th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Programa</th>
                <th>Cargo práctica</th>
                <th>Periodo</th>
                <th>Empresa</th>
                <th>Autogest.</th>
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
                  <td>{row.practicaAutogestionada ? 'Sí' : 'No'}</td>
                  <td>{labelEstadoLegalizacion(row.estadoLegalizacion) || '—'}</td>
                  <td>
                    <button type="button" className="admlegmtm__btn admlegmtm__btn--row" onClick={() => verRevision(row)}>
                      Revisar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="admlegmtm__pager">
            <p className="admlegmtm__pager-summary">
              Página {page} de {Math.max(1, Math.ceil(total / limit))} — {total} registro(s)
            </p>
            <div className="admlegmtm__pager-row">
              <button type="button" className="admlegmtm__btn admlegmtm__btn--pager" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Anterior
              </button>
              <button type="button" className="admlegmtm__btn admlegmtm__btn--pager" disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
