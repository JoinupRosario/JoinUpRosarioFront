import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDownload } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../styles/Oportunidades.css';

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

  const legalizacionAprobada = (row) => row?.estadoLegalizacion === 'Aprobada';
  const planAprobado = (row) => row?.planAprobado === true;

  const exportarExcel = () => {
    if (!data.length) {
      Swal.fire({ icon: 'warning', title: 'Sin datos', text: 'No hay legalizaciones para exportar.', confirmButtonColor: '#c41e3a' });
      return;
    }
    const headers = ['Nº identidad', 'Nombre', 'Apellido', 'Programa', 'Código monitoría', 'Nombre monitoría', 'Periodo', 'Coordinador', 'Estado', 'Finalizado por monitor'];
    const rows = data.map((row) => [
      row.numeroIdentidad ?? '',
      row.nombre ?? '',
      row.apellido ?? '',
      row.programa ?? '',
      row.codigoMonitoria ?? '',
      row.nombreMonitoria ?? '',
      row.periodo ?? '',
      row.coordinador ?? '',
      row.estado ?? '',
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
        <div className="oportunidades-section" style={{ overflowX: 'auto' }}>
          <table className="postulants-table" style={{ minWidth: '900px' }}>
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
                <th>Estado</th>
                <th>Finalizado por monitor</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row._id}>
                  <td>{row.numeroIdentidad ?? '—'}</td>
                  <td>{row.nombre ?? '—'}</td>
                  <td>{row.apellido ?? '—'}</td>
                  <td>{row.programa ?? '—'}</td>
                  <td>{row.codigoMonitoria ?? '—'}</td>
                  <td>{row.nombreMonitoria ?? '—'}</td>
                  <td>{row.periodo ?? '—'}</td>
                  <td>{row.coordinador ?? '—'}</td>
                  <td>{row.estado ?? '—'}</td>
                  <td>{row.finalizadoPorMonitor ?? '—'}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        onClick={() => verDetalle(row)}
                        title="Abrir detalle y cargar documentos"
                      >
                        Detalle de la oportunidad
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        onClick={() => verPlanTrabajo(row)}
                        disabled={!legalizacionAprobada(row)}
                        title={legalizacionAprobada(row) ? 'Crear o editar plan de trabajo' : 'Disponible cuando la legalización esté aprobada'}
                      >
                        Plan de trabajo
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        onClick={() => navigate(`/dashboard/monitorias/seguimientos/${row._id}`)}
                        disabled={!planAprobado(row)}
                        title={planAprobado(row) ? 'Ver y gestionar seguimientos' : 'Disponible cuando el plan de trabajo esté aprobado por el profesor'}
                      >
                        Seguimientos
                      </button>
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
