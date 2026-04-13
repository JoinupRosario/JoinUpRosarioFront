import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDownload } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import api from '../../services/api';
import LegalizacionProgramasBadge from '../../components/legalizacion/LegalizacionProgramasBadge';
import '../styles/Oportunidades.css';

function badgeClass(codigo) {
  if (codigo == null) return 'legaliz-mtm-badge legaliz-mtm-badge--pendiente';
  const map = {
    borrador: 'legaliz-mtm-badge legaliz-mtm-badge--borrador',
    en_revision: 'legaliz-mtm-badge legaliz-mtm-badge--revision',
    aprobada: 'legaliz-mtm-badge legaliz-mtm-badge--aprobada',
    rechazada: 'legaliz-mtm-badge legaliz-mtm-badge--rechazada',
    en_ajuste: 'legaliz-mtm-badge legaliz-mtm-badge--ajuste',
  };
  return map[codigo] || 'legaliz-mtm-badge legaliz-mtm-badge--pendiente';
}

function etiquetaCorta(codigo, larga) {
  if (codigo == null) return 'Pendiente de iniciar';
  const cortas = {
    borrador: 'Borrador',
    en_revision: 'En revisión',
    aprobada: 'Aprobada',
    rechazada: 'Rechazada',
    en_ajuste: 'En ajuste',
  };
  return cortas[codigo] || larga || '—';
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-CO') : '—');

export default function LegalizacionesPracticas() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    api
      .get('/legalizaciones-practica/mis-aceptadas')
      .then((r) => setData(r.data?.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const exportarExcel = () => {
    if (!data.length) {
      Swal.fire({ icon: 'warning', title: 'Sin datos', text: 'No hay prácticas aceptadas para exportar.', confirmButtonColor: '#c41e3a' });
      return;
    }
    const headers = [
      'Nº identidad', 'Nombre', 'Apellido', 'Programa', 'Cargo / práctica', 'Periodo', 'Empresa',
      'Docente-Monitor', 'Inicio', 'Fin', 'Autogestionada', 'Estado legalización',
    ];
    const rows = data.map((row) => [
      row.numeroIdentidad ?? '',
      row.nombre ?? '',
      row.apellido ?? '',
      row.programa ?? '',
      row.nombrePractica ?? '',
      row.periodo ?? '',
      row.empresa ?? '',
      row.docenteMonitor ?? '',
      fmtDate(row.fechaInicio),
      fmtDate(row.fechaFin),
      row.practicaAutogestionada ? 'Sí' : 'No',
      row.estadoLegalizacion ?? '',
    ]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Legalizaciones práctica');
    XLSX.writeFile(wb, `legalizaciones_practica_${new Date().toISOString().slice(0, 10)}.xlsx`);
    Swal.fire({ icon: 'success', title: 'Exportado', text: `Se exportaron ${data.length} registro(s).`, confirmButtonColor: '#c41e3a', timer: 2000, timerProgressBar: true });
  };

  const ejecutarAccion = (row, accion) => {
    if (accion === 'detalle') navigate(`/dashboard/legalizaciones/detalle/${row._id}`);
    if (accion === 'plan') {
      navigate(`/dashboard/legalizaciones/plan/${row._id}`);
    }
    if (accion === 'seguimientos') {
      navigate(`/dashboard/legalizaciones/seguimientos/${row._id}`);
    }
    if (accion === 'evaluaciones') {
      Swal.fire({
        icon: 'info',
        title: 'Evaluaciones',
        text: 'El ambiente de evaluaciones estará disponible en una próxima versión.',
        confirmButtonColor: '#c41e3a',
      });
    }
  };

  const legalOk = (row) => row?.estadoLegalizacionCodigo === 'aprobada';

  return (
    <div className="dashboard-content legalizaciones-monitorias-content">
      <div className="dashboard-welcome" style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2>Legalizaciones de prácticas</h2>
          <p style={{ marginBottom: 0 }}>
            Prácticas o pasantías que aceptó. Puede consultar el detalle, cargar documentos y remitir a revisión. Si cursa doble programa, verá una fila por cada práctica aceptada.
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
          <p>No tiene prácticas aceptadas aún.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#6b7280' }}>
            Cuando confirme una oferta en <strong>Mis aplicaciones</strong>, podrá legalizarla aquí.
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
                <th>Práctica (cargo)</th>
                <th>Periodo</th>
                <th>Empresa</th>
                <th>Autogest.</th>
                <th>Docente-Monitor</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Estado legalización</th>
                <th>Programas</th>
                <th className="legaliz-mtm-th-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row._id}>
                  <td className="legaliz-mtm-mono">{row.numeroIdentidad ?? '—'}</td>
                  <td>{row.nombre ?? '—'}</td>
                  <td>{row.apellido ?? '—'}</td>
                  <td className="legaliz-mtm-nombre-cargo">{row.nombrePractica ?? '—'}</td>
                  <td>{row.periodo ?? '—'}</td>
                  <td className="legaliz-mtm-nombre-cargo">{row.empresa ?? '—'}</td>
                  <td>{row.practicaAutogestionada ? 'Sí' : 'No'}</td>
                  <td>{row.docenteMonitor ?? '—'}</td>
                  <td>{fmtDate(row.fechaInicio)}</td>
                  <td>{fmtDate(row.fechaFin)}</td>
                  <td>
                    <span className={badgeClass(row.estadoLegalizacionCodigo)} title={row.estadoLegalizacion}>
                      {etiquetaCorta(row.estadoLegalizacionCodigo, row.estadoLegalizacion)}
                    </span>
                  </td>
                  <td>
                    <LegalizacionProgramasBadge row={row} variant="student" />
                  </td>
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
                        <option value="detalle">Detalle / Documentos</option>
                        <option value="plan" disabled={!legalOk(row)}>Plan de práctica</option>
                        <option value="seguimientos" disabled={!legalOk(row)}>Seguimientos</option>
                        <option value="evaluaciones">Evaluaciones</option>
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
