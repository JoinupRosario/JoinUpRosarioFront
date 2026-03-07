import { useState, useEffect } from 'react';
import { HiOutlineAcademicCap } from 'react-icons/hi';
import { FiUsers, FiX } from 'react-icons/fi';
import api from '../../services/api';
import '../styles/Oportunidades.css';

function getStatusLabel(estado) {
  const map = { Activa: 'Activa', Creada: 'Creada', 'En Revisión': 'En Revisión', Revisada: 'Revisada', Cerrada: 'Cerrada', Rechazada: 'Rechazada', Vencida: 'Vencida' };
  return map[estado] || estado;
}

function getStatusColor(estado) {
  if (estado === 'Activa') return '#d1fae5';
  if (estado === 'Cerrada' || estado === 'Vencida') return '#f3f4f6';
  if (estado === 'Rechazada') return '#fee2e2';
  return '#fef3c7';
}

function getStatusTextColor(estado) {
  if (estado === 'Activa') return '#065f46';
  if (estado === 'Cerrada' || estado === 'Vencida') return '#6b7280';
  if (estado === 'Rechazada') return '#991b1b';
  return '#92400e';
}

export default function OfertasAfines() {
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const loadOfertas = async (page = 1) => {
    try {
      setLoading(true);
      const { data } = await api.get('/opportunities/para-estudiante-practicas', {
        params: { page, limit: 10 },
      });
      setOpportunities(data.opportunities || []);
      setTotalPages(data.totalPages || 0);
      setCurrentPage(data.currentPage || 1);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Error cargando ofertas afines', e);
      setOpportunities([]);
      setTotalPages(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfertas(currentPage);
  }, []);

  const openDetalle = async (oportunidad) => {
    setLoadingDetalle(true);
    setDetalle(null);
    try {
      const { data } = await api.get(`/opportunities/${oportunidad._id}`);
      setDetalle(data);
    } catch (e) {
      console.error('Error cargando detalle', e);
    } finally {
      setLoadingDetalle(false);
    }
  };

  return (
    <div className="dashboard-content">
      <div className="dashboard-welcome" style={{ marginBottom: '1rem' }}>
        <h2>Prácticas y Pasantías</h2>
        <p>Ofertas que coinciden con tu periodo y programa autorizados.</p>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Cargando ofertas...</p>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="empty-state">
          <p>No hay ofertas de prácticas que coincidan con tu perfil en este momento.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#6b7280' }}>
            Debes estar autorizado en estudiantes habilitados para el mismo periodo y programa que las ofertas.
          </p>
        </div>
      ) : (
        <>
          <div className="oportunidades-section">
            <div className="oportunidades-grid">
              {opportunities.map((oportunidad) => {
                const estado = oportunidad.estado || 'Creada';
                const isActiva = estado === 'Activa';
                const numPostulantes = oportunidad.postulaciones?.length || 0;
                const salario = oportunidad.apoyoEconomico
                  ? `$${Number(oportunidad.apoyoEconomico).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : null;

                return (
                  <div
                    key={oportunidad._id}
                    className={`oportunidad-card ${isActiva ? 'oportunidad-activa' : ''}`}
                    onClick={() => openDetalle(oportunidad)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="oportunidad-header">
                      <div className="oportunidad-title-section">
                        <h4 className="oportunidad-title">{oportunidad.nombreCargo || 'Sin título'}</h4>
                        <span className="oportunidad-number">Oportunidad No. {oportunidad._id?.slice(-6)}</span>
                      </div>
                      <div className="oportunidad-pin">
                        <HiOutlineAcademicCap />
                      </div>
                    </div>
                    <div className="oportunidad-body">
                      <div className="oportunidad-company">
                        {oportunidad.company?.name || oportunidad.company?.commercialName || 'Empresa no especificada'}
                      </div>
                      {salario && (
                        <div className="oportunidad-remuneration">{salario}</div>
                      )}
                      {oportunidad.formacionAcademica?.length > 0 && (
                        <div className="oportunidad-areas">
                          {oportunidad.formacionAcademica.map((f, idx) => (
                            <span key={idx} className="area-tag">
                              {f.program?.toUpperCase() || f.program}
                              {idx < oportunidad.formacionAcademica.length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div
                      className="oportunidad-footer"
                      style={{
                        background: getStatusColor(estado),
                        borderTop: `1px solid ${getStatusTextColor(estado)}20`,
                      }}
                    >
                      <div className="oportunidad-status">
                        <span className="status-text" style={{ color: getStatusTextColor(estado), fontWeight: 600 }}>
                          {getStatusLabel(estado)}
                        </span>
                      </div>
                      <div className="oportunidad-icons">
                        <span className="oportunidad-type-icon">
                          <HiOutlineAcademicCap />
                          <span>Práctica</span>
                        </span>
                        <span className="oportunidad-applicants-icon">
                          <FiUsers />
                          <span className="applicants-badge">{numPostulantes}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-volver"
                disabled={currentPage <= 1}
                onClick={() => loadOfertas(currentPage - 1)}
              >
                Anterior
              </button>
              <span style={{ alignSelf: 'center' }}>
                Página {currentPage} de {totalPages} ({total} ofertas)
              </span>
              <button
                type="button"
                className="btn-volver"
                disabled={currentPage >= totalPages}
                onClick={() => loadOfertas(currentPage + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal detalle */}
      {(detalle !== null || loadingDetalle) && (
        <div className="modal-overlay" onClick={() => !loadingDetalle && setDetalle(null)}>
          <div className="modal-content oportunidad-detalle-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            {loadingDetalle ? (
              <div className="loading-container">
                <div className="loading-spinner" />
                <p>Cargando detalle...</p>
              </div>
            ) : detalle ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0 }}>{detalle.nombreCargo}</h3>
                  <button type="button" onClick={() => setDetalle(null)} className="btn-icon" aria-label="Cerrar">
                    <FiX size={24} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <p><strong>Empresa:</strong> {detalle.company?.name || detalle.company?.commercialName || '—'}</p>
                  {detalle.periodo && <p><strong>Periodo:</strong> {detalle.periodo}</p>}
                  {detalle.ciudad && <p><strong>Ciudad:</strong> {detalle.ciudad}</p>}
                  {detalle.formacionAcademica?.length > 0 && (
                    <p><strong>Programas:</strong> {detalle.formacionAcademica.map((f) => f.program).join(', ')}</p>
                  )}
                  {detalle.requisitos && <p><strong>Requisitos:</strong><br /><span style={{ whiteSpace: 'pre-wrap' }}>{detalle.requisitos}</span></p>}
                  {detalle.funciones && <p><strong>Funciones:</strong><br /><span style={{ whiteSpace: 'pre-wrap' }}>{detalle.funciones}</span></p>}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
