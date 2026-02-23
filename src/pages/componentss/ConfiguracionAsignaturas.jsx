import { useState, useEffect, useRef } from 'react';
import { FiArrowLeft, FiRefreshCw, FiSearch, FiUpload } from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../styles/ConfiguracionAsignaturas.css';

export default function ConfiguracionAsignaturas({ onVolver }) {
  const [asignaturas, setAsignaturas]     = useState([]);
  const [pagination, setPagination]       = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loading, setLoading]             = useState(true);
  const [syncing, setSyncing]             = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [search, setSearch]               = useState('');
  const [periodoFilter, setPeriodoFilter]  = useState('');
  const [periodos, setPeriodos]           = useState([]);
  const searchDebounce                    = useRef(null);
  const fileInputRef                      = useRef(null);

  const loadAsignaturas = async (page = 1, q = search, periodo = periodoFilter) => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (q.trim())  params.search  = q.trim();
      if (periodo)   params.periodo = periodo;
      const { data } = await api.get('/asignaturas', { params });
      setAsignaturas(data.data || []);
      setPagination(data.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPeriodos = async () => {
    try {
      const { data } = await api.get('/asignaturas/periodos');
      setPeriodos(data.data || []);
    } catch { /* silencioso */ }
  };

  useEffect(() => {
    loadAsignaturas(1);
    loadPeriodos();
  }, []);

  // Debounce búsqueda
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      loadAsignaturas(1, search, periodoFilter);
    }, 400);
    return () => clearTimeout(searchDebounce.current);
  }, [search]);

  const handlePeriodoChange = (e) => {
    setPeriodoFilter(e.target.value);
    loadAsignaturas(1, search, e.target.value);
  };

  const handleSync = async () => {
    const confirm = await Swal.fire({
      title: '¿Cargar asignaturas?',
      text: 'Se conectará al servidor SFTP, descargará el archivo y sincronizará las asignaturas con la base de datos.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cargar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c41e3a',
      cancelButtonColor: '#6c757d',
    });
    if (!confirm.isConfirmed) return;

    setSyncing(true);
    Swal.fire({
      title: 'Sincronizando...',
      text: 'Conectando al SFTP y procesando el archivo. Esto puede tardar unos segundos.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const { data } = await api.post('/asignaturas/sync-sftp', {}, { timeout: 120000 });
      Swal.close();
      const r = data.resumen || {};
      await Swal.fire({
        icon: 'success',
        title: 'Sincronización completada',
        html: `
          <div class="asig-resumen">
            <div class="asig-resumen-row"><span>Registros en archivo</span><strong>${r.totalArchivo ?? 0}</strong></div>
            <div class="asig-resumen-row new"><span>Creados / actualizados</span><strong>${r.creadas ?? 0}</strong></div>
            <div class="asig-resumen-row skip"><span>Sin cambios (omitidos)</span><strong>${r.omitidas ?? 0}</strong></div>
            <div class="asig-resumen-row deact"><span>Desactivados</span><strong>${r.desactivadas ?? 0}</strong></div>
          </div>`,
        confirmButtonColor: '#c41e3a',
        customClass: { htmlContainer: 'swal-asig-html' },
      });
      loadAsignaturas(1);
      loadPeriodos();
    } catch (err) {
      Swal.close();
      await Swal.fire({
        icon: 'error',
        title: 'Error en la sincronización',
        text: err.response?.data?.message || 'No se pudo conectar al servidor SFTP.',
        confirmButtonColor: '#c41e3a',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleUploadExcel = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const confirm = await Swal.fire({
      title: '¿Cargar este archivo?',
      html: `<b>${file.name}</b><br/>Se sincronizará igual que el archivo del SFTP.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cargar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c41e3a',
      cancelButtonColor: '#6c757d',
    });
    if (!confirm.isConfirmed) return;

    setUploadingExcel(true);
    Swal.fire({
      title: 'Procesando Excel...',
      text: 'Leyendo y sincronizando el archivo. Un momento.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/asignaturas/sync-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      Swal.close();
      const r = data.resumen || {};
      await Swal.fire({
        icon: 'success',
        title: 'Sincronización completada',
        html: `
          <div class="asig-resumen">
            <div class="asig-resumen-row"><span>Registros en archivo</span><strong>${r.totalArchivo ?? 0}</strong></div>
            <div class="asig-resumen-row new"><span>Creados / actualizados</span><strong>${r.creadas ?? 0}</strong></div>
            <div class="asig-resumen-row skip"><span>Sin cambios (omitidos)</span><strong>${r.omitidas ?? 0}</strong></div>
            <div class="asig-resumen-row deact"><span>Desactivados</span><strong>${r.desactivadas ?? 0}</strong></div>
          </div>`,
        confirmButtonColor: '#c41e3a',
        customClass: { htmlContainer: 'swal-asig-html' },
      });
      loadAsignaturas(1);
      loadPeriodos();
    } catch (err) {
      Swal.close();
      await Swal.fire({
        icon: 'error',
        title: 'Error al procesar el archivo',
        text: err.response?.data?.message || 'No se pudo procesar el Excel.',
        confirmButtonColor: '#c41e3a',
      });
    } finally {
      setUploadingExcel(false);
    }
  };

  const goToPage = (p) => loadAsignaturas(p, search, periodoFilter);

  return (
    <div className="asig-content">
      {/* Header */}
      <div className="asig-header">
        <div className="asig-header-left">
          <button className="btn-volver" onClick={onVolver}>
            <FiArrowLeft className="btn-icon" /> Volver
          </button>
          <div className="section-header">
            <h3>CONFIGURACIÓN DE ASIGNATURAS</h3>
          </div>
        </div>
        <div className="asig-header-actions">
          {/* Input oculto para seleccionar el Excel */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            style={{ display: 'none' }}
            onChange={handleUploadExcel}
          />
          <button
            className="asig-btn-excel"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingExcel || syncing}
            title="Cargar un archivo Excel manualmente con la misma estructura"
          >
            <FiUpload className={uploadingExcel ? 'spin' : ''} />
            {uploadingExcel ? 'Procesando...' : 'Cargar Excel'}
          </button>
          <button
            className="asig-btn-sync"
            onClick={handleSync}
            disabled={syncing || uploadingExcel}
          >
            <FiRefreshCw className={syncing ? 'spin' : ''} />
            {syncing ? 'Sincronizando...' : 'Cargar Asignaturas'}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="asig-toolbar">
        <div className="asig-search">
          <FiSearch className="asig-search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, código, departamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="asig-search-input"
          />
        </div>
        <select
          className="asig-select-periodo"
          value={periodoFilter}
          onChange={handlePeriodoChange}
        >
          <option value="">Todos los períodos</option>
          {periodos.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="asig-table-wrap">
        {loading ? (
          <div className="asig-loading">Cargando asignaturas...</div>
        ) : (
          <table className="asig-table">
            <thead>
              <tr>
                <th>NIVEL</th>
                <th>PERÍODO</th>
                <th>ID ASIGNATURA</th>
                <th>NOMBRE ASIGNATURA</th>
                <th>COD. DEPTO</th>
                <th>DEPARTAMENTO</th>
                <th>COD. ÁREA</th>
                <th>ÁREA</th>
                <th>CENTRO BENEFICIO</th>
                <th>COD. ASIGNATURA</th>
                <th>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {asignaturas.length === 0 ? (
                <tr>
                  <td colSpan={11} className="asig-no-data">
                    No hay asignaturas. Use &quot;Cargar Asignaturas&quot; para sincronizar desde el servidor.
                  </td>
                </tr>
              ) : (
                asignaturas.map((a) => (
                  <tr key={a._id} className={a.estado === 'INACTIVE' ? 'asig-row-inactive' : ''}>
                    <td><span className="asig-badge asig-badge-nivel">{a.nivel || '-'}</span></td>
                    <td>{a.periodo || '-'}</td>
                    <td>{a.idAsignatura || '-'}</td>
                    <td className="asig-col-nombre">{a.nombreAsignatura || '-'}</td>
                    <td>{a.codDepto || '-'}</td>
                    <td>{a.nombreDepartamento || '-'}</td>
                    <td>{a.codArea || '-'}</td>
                    <td>{a.nombreArea || '-'}</td>
                    <td>{a.centroBeneficio || '-'}</td>
                    <td>{a.codAsignatura || '-'}</td>
                    <td>
                      <span className={`asig-estado ${a.estado === 'ACTIVE' ? 'active' : 'inactive'}`}>
                        {a.estado === 'ACTIVE' ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {pagination.pages > 1 && (
        <div className="asig-pagination">
          <button className="asig-page-btn" disabled={pagination.page <= 1} onClick={() => goToPage(1)}>&laquo;&laquo;</button>
          <button className="asig-page-btn" disabled={pagination.page <= 1} onClick={() => goToPage(pagination.page - 1)}>&laquo;</button>
          {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
            const p = pagination.page <= 3 ? i + 1 : Math.max(1, pagination.page - 2 + i);
            if (p > pagination.pages) return null;
            return (
              <button
                key={p}
                className={`asig-page-btn ${p === pagination.page ? 'active' : ''}`}
                onClick={() => goToPage(p)}
              >{p}</button>
            );
          })}
          <button className="asig-page-btn" disabled={pagination.page >= pagination.pages} onClick={() => goToPage(pagination.page + 1)}>&raquo;</button>
          <button className="asig-page-btn" disabled={pagination.page >= pagination.pages} onClick={() => goToPage(pagination.pages)}>&raquo;&raquo;</button>
          <span className="asig-page-info">{pagination.total} resultado(s) · Página {pagination.page} de {pagination.pages}</span>
        </div>
      )}
    </div>
  );
}
