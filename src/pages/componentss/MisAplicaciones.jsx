import { useState, useEffect } from 'react';
import api from '../../services/api';
import DetalleOportunidadModal from './DetalleOportunidadModal';
import '../styles/Oportunidades.css';

const ESTADO_LABELS = {
  aplicado: 'Aplicado',
  empresa_consulto_perfil: 'Empresa consultó perfil',
  empresa_descargo_hv: 'Empresa descargó HV',
  seleccionado_empresa: 'Seleccionado por empresa',
  aceptado_estudiante: 'Aceptado por estudiante',
  rechazado: 'Rechazado',
};

export default function MisAplicaciones() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [detalleOferta, setDetalleOferta] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  useEffect(() => {
    api
      .get('/opportunities/mis-postulaciones')
      .then((res) => setData(res.data?.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const verOferta = (opportunityId) => {
    if (!opportunityId) return;
    setLoadingDetalle(true);
    setDetalleOferta(null);
    api
      .get(`/opportunities/${opportunityId}`)
      .then((res) => setDetalleOferta(res.data))
      .catch(() => setDetalleOferta(null))
      .finally(() => setLoadingDetalle(false));
  };

  return (
    <div className="dashboard-content">
      <div className="dashboard-welcome" style={{ marginBottom: '1rem' }}>
        <h2>Mis aplicaciones</h2>
        <p>Estado de sus postulaciones a ofertas de práctica.</p>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Cargando...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="empty-state">
          <p>Aún no ha aplicado a ninguna oportunidad.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#6b7280' }}>
            Vaya a Prácticas y Pasantías desde Inicio para ver ofertas y postularse.
          </p>
        </div>
      ) : (
        <div className="oportunidades-section" style={{ overflowX: 'auto' }}>
          <table className="postulants-table" style={{ minWidth: '800px' }}>
            <thead>
              <tr>
                <th>Cargo</th>
                <th>Empresa</th>
                <th>Fecha de aplicación</th>
                <th>Estado oportunidad</th>
                <th>Estado postulación</th>
                <th>Empresa consultó perfil</th>
                <th>Empresa descargó HV</th>
                <th>Seleccionado por empresa</th>
                <th>Aceptado por estudiante</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row._id}>
                  <td>{row.cargo || '—'}</td>
                  <td>{row.empresa || '—'}</td>
                  <td>
                    {row.fechaAplicacion
                      ? new Date(row.fechaAplicacion).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td>{row.estadoOportunidad || '—'}</td>
                  <td>{ESTADO_LABELS[row.estado] || row.estado || '—'}</td>
                  <td>{row.empresaConsultoPerfil ? 'Sí' : 'No'}</td>
                  <td>{row.empresaDescargoHv ? 'Sí' : 'No'}</td>
                  <td>{row.seleccionadoPorEmpresa ? 'Sí' : 'No'}</td>
                  <td>{row.aceptadoPorEstudiante ? 'Sí' : 'No'}</td>
                  <td>
                    {row.opportunityId ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        onClick={() => verOferta(row.opportunityId)}
                      >
                        Ver oferta
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetalleOportunidadModal
        detalle={detalleOferta}
        loading={loadingDetalle}
        onClose={() => { setDetalleOferta(null); }}
        onAplicar={null}
      />
    </div>
  );
}
