import { useEffect, useState } from 'react';
import { FiArrowLeft, FiChevronLeft, FiChevronRight, FiDownload, FiX } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { downloadReportExcel } from './reportExportExcel';

/**
 * Vista de resultado: encabezado dinámico + tabla + exportación Excel.
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {boolean} props.loading
 * @param {string|null} props.error
 * @param {object|null} props.payload — respuesta de POST /reporting-filters/reports/:id/generate
 * @param {string} props.fallbackTitle — título de la tarjeta si el API no envía `title`
 * @param {(() => Promise<object>) | undefined} props.onExportExcel — devuelve payload completo (exportAll) para armar el Excel
 * @param {((page: number) => void) | undefined} props.onPageChange
 * @param {((pageSize: number) => void) | undefined} props.onPageSizeChange
 * @param {(() => void) | undefined} props.onVolverFiltros — reabre el modal de filtros (mismo reporte)
 */
export default function ReporteResultadoModal({
  open,
  onClose,
  loading,
  error,
  payload,
  fallbackTitle,
  onExportExcel,
  onPageChange,
  onPageSizeChange,
  onVolverFiltros,
}) {
  const [exportingExcel, setExportingExcel] = useState(false);

  useEffect(() => {
    if (!open) setExportingExcel(false);
  }, [open]);

  if (!open) return null;

  const title = payload?.title || fallbackTitle || 'Reporte';
  const filterLines = payload?.filterLines ?? [];
  const columns = payload?.columns ?? [];
  const rows = payload?.rows ?? [];
  const generatedAt = payload?.generatedAt;
  const pagination = payload?.pagination;
  const total = typeof payload?.total === 'number' ? payload.total : rows.length;
  const busy = loading || exportingExcel;

  const handleExcel = async () => {
    if (typeof onExportExcel === 'function') {
      setExportingExcel(true);
      try {
        const full = await onExportExcel();
        await downloadReportExcel({
          title: full.title || fallbackTitle,
          generatedAt: full.generatedAt,
          filterLines: full.filterLines,
          columns: full.columns,
          rows: full.rows,
          filenameBase: full.reportId || 'reporte',
        });
        onClose();
      } catch (e) {
        void Swal.fire({
          icon: 'error',
          title: 'Error al exportar',
          text: e?.message || 'No se pudo generar el archivo Excel.',
          confirmButtonColor: '#c41e3a',
        });
      } finally {
        setExportingExcel(false);
      }
      return;
    }
    if (!payload) return;
    setExportingExcel(true);
    try {
      await downloadReportExcel({
        title: payload.title || fallbackTitle,
        generatedAt: payload.generatedAt,
        filterLines: payload.filterLines,
        columns: payload.columns,
        rows: payload.rows,
        filenameBase: payload.reportId || 'reporte',
      });
      onClose();
    } catch (e) {
      void Swal.fire({
        icon: 'error',
        title: 'Error al exportar',
        text: e?.message || 'No se pudo generar el archivo Excel.',
        confirmButtonColor: '#c41e3a',
      });
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="reportes-modal-overlay" onClick={busy ? undefined : onClose}>
      <div
        className="reportes-modal reportes-modal--resultado"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reporte-resultado-titulo"
      >
        <div className="reportes-modal-header">
          <h3 id="reporte-resultado-titulo">{loading ? fallbackTitle || 'Reporte' : title}</h3>
          <button type="button" className="reportes-modal-close" onClick={busy ? undefined : onClose} aria-label="Cerrar">
            <FiX size={22} />
          </button>
        </div>
        <div className="reportes-modal-body reportes-resultado-body">
          {loading && (
            <div className="reportes-modal-loading">
              <div className="loading-spinner" /> Generando reporte…
            </div>
          )}
          {!loading && error && <p className="reportes-param-inline-err">{error}</p>}
          {!loading && !error && payload && (
            <>
              {filterLines.length > 0 && (
                <div className="reportes-resultado-meta">
                  <p>
                    <strong>Fecha de generación:</strong>{' '}
                    {generatedAt ? new Date(generatedAt).toLocaleString('es-CO') : '—'}
                  </p>
                  <div className="reportes-resultado-filtros">
                    <strong>Filtros:</strong>
                    <ul>
                      {filterLines.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {exportingExcel && (
                <div className="reportes-resultado-export-overlay" role="status" aria-live="polite">
                  <div className="loading-spinner" />
                  <span>Generando Excel…</span>
                </div>
              )}
              {columns.length === 0 ? (
                <p className="reportes-modal-empty">No hay columnas de datos para mostrar con los filtros actuales.</p>
              ) : (
                <>
                  {pagination && columns.length > 0 && typeof onPageChange === 'function' && (
                    <div className="reportes-resultado-paginacion">
                      <div className="reportes-resultado-paginacion-row">
                        <label className="reportes-resultado-paginacion-label">
                          Filas por página
                          <select
                            className="reportes-resultado-paginacion-select"
                            value={pagination.pageSize}
                            disabled={busy}
                            onChange={(e) => {
                              const n = parseInt(e.target.value, 10);
                              if (typeof onPageSizeChange === 'function' && Number.isFinite(n)) onPageSizeChange(n);
                            }}
                          >
                            {[25, 50, 100].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </label>
                        <span className="reportes-resultado-paginacion-info">
                          {pagination.total} registro{pagination.total !== 1 ? 's' : ''} · Página {pagination.page} de{' '}
                          {pagination.totalPages}
                        </span>
                      </div>
                      <div className="reportes-resultado-paginacion-nav">
                        <button
                          type="button"
                          className="btn-volver reportes-resultado-pag-btn"
                          disabled={busy || pagination.page <= 1}
                          onClick={() => onPageChange(pagination.page - 1)}
                        >
                          <FiChevronLeft aria-hidden /> Anterior
                        </button>
                        <button
                          type="button"
                          className="btn-volver reportes-resultado-pag-btn"
                          disabled={busy || pagination.page >= pagination.totalPages}
                          onClick={() => onPageChange(pagination.page + 1)}
                        >
                          Siguiente <FiChevronRight aria-hidden />
                        </button>
                      </div>
                    </div>
                  )}
                  {!pagination && total > 0 && (
                    <p className="reportes-resultado-total-sin-pag">{total} fila{total !== 1 ? 's' : ''} en esta vista.</p>
                  )}
                  <div className={`reportes-mtm-tabla-wrap reportes-resultado-tabla-wrap${exportingExcel ? ' is-dimmed' : ''}`}>
                    <table className="reportes-mtm-tabla reportes-resultado-tabla">
                      <thead>
                        <tr>
                          {columns.map((c) => (
                            <th key={c.key}>{c.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={columns.length} className="reportes-resultado-sin-filas">
                              Sin filas para los criterios seleccionados.
                            </td>
                          </tr>
                        ) : (
                          rows.map((r, idx) => (
                            <tr key={idx}>
                              {columns.map((c) => (
                                <td key={c.key}>{formatCell(r?.[c.key])}</td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <div className="reportes-modal-footer reportes-resultado-footer">
          {typeof onVolverFiltros === 'function' && !loading && (
            <button type="button" className="btn-volver reportes-resultado-btn-volver" disabled={busy} onClick={onVolverFiltros}>
              <FiArrowLeft className="btn-icon" aria-hidden />
              Volver a filtros
            </button>
          )}
          <span className="reportes-resultado-footer-spacer" aria-hidden="true" />
          <button
            type="button"
            className="btn-guardar reportes-resultado-btn-excel"
            disabled={loading || !!error || !payload || busy}
            onClick={() => void handleExcel()}
          >
            {exportingExcel ? (
              <>
                <span className="reportes-resultado-btn-spinner" aria-hidden />
                Generando…
              </>
            ) : (
              <>
                <FiDownload className="btn-icon" /> Descargar Excel
              </>
            )}
          </button>
          <button type="button" className="btn-volver reportes-resultado-btn-cerrar" disabled={busy} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function formatCell(v) {
  if (v == null) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
