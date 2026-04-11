import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDownload } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../styles/Oportunidades.css';

function badgeClassPorCodigoLegalizacion(codigo) {
  if (codigo == null || codigo === '') return 'legaliz-mtm-badge legaliz-mtm-badge--pendiente';
  const map = {
    creada: 'legaliz-mtm-badge legaliz-mtm-badge--borrador',
    borrador: 'legaliz-mtm-badge legaliz-mtm-badge--borrador',
    en_revision: 'legaliz-mtm-badge legaliz-mtm-badge--revision',
    aprobada: 'legaliz-mtm-badge legaliz-mtm-badge--aprobada',
    finalizada: 'legaliz-mtm-badge legaliz-mtm-badge--aprobada',
    rechazada: 'legaliz-mtm-badge legaliz-mtm-badge--rechazada',
    en_ajuste: 'legaliz-mtm-badge legaliz-mtm-badge--ajuste',
  };
  return map[codigo] || 'legaliz-mtm-badge legaliz-mtm-badge--pendiente';
}

/** Texto corto en la celda; si no hay código (sin registro legalización), usa la etiqueta del API o «Pendiente de iniciar». */
function etiquetaCortaLegalizacion(codigo, etiquetaLarga) {
  if (codigo == null || codigo === '') {
    const t = etiquetaLarga && String(etiquetaLarga).trim();
    return t || 'Pendiente de iniciar';
  }
  const cortas = {
    creada: 'Creada',
    borrador: 'Creada',
    en_revision: 'En revisión',
    aprobada: 'Legalizada',
    finalizada: 'Finalizada',
    rechazada: 'Rechazada',
    en_ajuste: 'En ajuste',
  };
  return cortas[codigo] || etiquetaLarga || '—';
}

export default function LegalizacionesMonitorias() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get('/oportunidades-mtm/mis-aceptadas')
      .then((r) => setData(r.data?.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const verDetalle = (row) => {
    if (!row?._id) return;
    navigate(`/dashboard/monitorias/detalle/${row._id}`);
  };

  const verPlanTrabajo = (row) => {
    if (!row?._id) return;
    navigate(`/dashboard/monitorias/plan/${row._id}`);
  };

  const legalizacionAprobada = (row) =>
    row?.estadoLegalizacionCodigo === 'aprobada' ||
    row?.estadoLegalizacionCodigo === 'finalizada' ||
    row?.estadoLegalizacion === 'Legalizada' ||
    row?.estadoLegalizacion === 'Finalizada' ||
    row?.estadoLegalizacion === 'Aprobada';
  const planAprobado = (row) => row?.planAprobado === true;

  const ejecutarAccion = (row, accion) => {
    if (!accion || !row?._id) return;
    if (accion === 'detalle') {
      verDetalle(row);
      return;
    }
    if (accion === 'plan') {
      if (!legalizacionAprobada(row)) {
        Swal.fire({
          icon: 'info',
          title: 'Plan de trabajo',
          text: 'Disponible cuando la legalización esté aprobada por coordinación.',
          confirmButtonColor: '#c41e3a',
        });
        return;
      }
      verPlanTrabajo(row);
      return;
    }
    if (accion === 'seguimientos') {
      if (!planAprobado(row)) {
        Swal.fire({
          icon: 'info',
          title: 'Seguimientos',
          text: 'Disponible cuando el plan de trabajo esté aprobado por el profesor o responsable.',
          confirmButtonColor: '#c41e3a',
        });
        return;
      }
      navigate(`/dashboard/monitorias/seguimientos/${row._id}`);
    }
  };

  const exportarExcel = () => {
    if (!data.length) {
      Swal.fire({ icon: 'warning', title: 'Sin datos', text: 'No hay legalizaciones para exportar.', confirmButtonColor: '#c41e3a' });
      return;
    }
    const headers = [
      'Nº identidad', 'Nombre', 'Apellido', 'Programa', 'Código monitoría', 'Nombre monitoría', 'Periodo', 'Coordinador',
      'Estado legalización', 'Postulación', 'Finalizado por monitor',
    ];
    const rows = data.map((row) => [
      row.numeroIdentidad ?? '',
      row.nombre ?? '',
      row.apellido ?? '',
      row.programa ?? '',
      row.codigoMonitoria ?? '',
      row.nombreMonitoria ?? '',
      row.periodo ?? '',
      row.coordinador ?? '',
      row.estadoLegalizacion ?? '',
      row.estadoPostulacion ?? row.estado ?? '',
      row.finalizadoPorMonitor ?? '',
    ]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Mis legalizaciones');
    XLSX.writeFile(wb, `mis_legalizaciones_mtm_${new Date().toISOString().slice(0, 10)}.xlsx`);
    Swal.fire({ icon: 'success', title: 'Exportado', text: `Se exportaron ${data.length} registro(s) a Excel.`, confirmButtonColor: '#c41e3a', timer: 2000, timerProgressBar: true });
  };

  return (
    <div className="dashboard-content legalizaciones-monitorias-content">
      <div className="dashboard-welcome" style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2>Legalizaciones de Monitorías</h2>
          <p style={{ marginBottom: 0 }}>
            Oportunidades de monitoría, tutoría y mentoría que aceptó. Aquí puede gestionar el detalle de la oportunidad,
            plan de trabajo y seguimientos.
          </p>
        </div>
        {data.length > 0 && (
          <button type="button" className="btn-guardar" onClick={exportarExcel} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <FiDownload /> Exportar a Excel
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Cargando...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="empty-state">
          <p>No tiene monitorías/tutorías/mentorías aceptadas.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#6b7280' }}>
            Cuando acepte una oferta en <strong>Mis aplicaciones</strong>, aparecerá aquí para iniciar la legalización.
          </p>
        </div>
      ) : (
        <div className="oportunidades-section legaliz-mtm-table-wrap">
          <table className="legaliz-mtm-table">
            <thead>
              <tr>
                <th>Nº identidad</th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Programa</th>
                <th>Código monitoría</th>
                <th>Nombre monitoría</th>
                <th>Periodo</th>
                <th>Coordinador</th>
                <th>Estado legalización</th>
                <th>Finalizado por monitor</th>
                <th className="legaliz-mtm-th-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row._id}>
                  <td className="legaliz-mtm-mono">{row.numeroIdentidad ?? '—'}</td>
                  <td>{row.nombre ?? '—'}</td>
                  <td>{row.apellido ?? '—'}</td>
                  <td>{row.programa ?? '—'}</td>
                  <td className="legaliz-mtm-mono legaliz-mtm-codigo">{row.codigoMonitoria ?? '—'}</td>
                  <td className="legaliz-mtm-nombre-cargo">{row.nombreMonitoria ?? '—'}</td>
                  <td>{row.periodo ?? '—'}</td>
                  <td>{row.coordinador ?? '—'}</td>
                  <td>
                    <span
                      className={badgeClassPorCodigoLegalizacion(row.estadoLegalizacionCodigo)}
                      title={row.estadoLegalizacion ?? etiquetaCortaLegalizacion(row.estadoLegalizacionCodigo)}
                    >
                      {etiquetaCortaLegalizacion(row.estadoLegalizacionCodigo, row.estadoLegalizacion)}
                    </span>
                  </td>
                  <td>{row.finalizadoPorMonitor ?? '—'}</td>
                  <td>
                    <div className="legaliz-mtm-actions">
                      <select
                        className="legaliz-mtm-actions-select"
                        aria-label="Elegir acción"
                        defaultValue=""
                        onChange={(e) => {
                          const v = e.target.value;
                          const el = e.target;
                          ejecutarAccion(row, v);
                          requestAnimationFrame(() => {
                            el.value = '';
                          });
                        }}
                      >
                        <option value="">Acciones…</option>
                        <option value="detalle">Detalle de la oportunidad</option>
                        <option value="plan" disabled={!legalizacionAprobada(row)}>
                          Plan de trabajo
                        </option>
                        <option value="seguimientos" disabled={!planAprobado(row)}>
                          Seguimientos
                        </option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
