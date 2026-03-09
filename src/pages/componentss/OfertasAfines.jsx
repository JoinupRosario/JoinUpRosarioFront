import { useState, useEffect } from 'react';
import { HiOutlineAcademicCap } from 'react-icons/hi';
import { FiUsers, FiSend, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import api from '../../services/api';
import DetalleOportunidadModal from './DetalleOportunidadModal';
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
  const [showModalAplicar, setShowModalAplicar] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [submittingAplicar, setSubmittingAplicar] = useState(false);
  const [postulantId, setPostulantId] = useState(null);
  const [showConfirmacionAplicar, setShowConfirmacionAplicar] = useState(false);

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

  const openModalAplicar = async () => {
    if (!detalle || detalle.estado !== 'Activa') return;
    setShowModalAplicar(true);
    setSelectedVersionId('');
    setProfiles([]);
    setPostulantId(null);
    setLoadingProfiles(true);
    try {
      const { data: me } = await api.get('/postulants/me');
      const id = me?._id || me?.id;
      if (!id) {
        setProfiles([]);
        return;
      }
      setPostulantId(id);
      const { data: profilesRes } = await api.get(`/postulants/${id}/profiles`);
      const list = profilesRes?.profiles || [];
      setProfiles(list);
    } catch (e) {
      console.error('Error cargando perfiles', e);
      setProfiles([]);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const submitAplicar = async () => {
    if (!detalle) return;
    const selected = profiles.find((p) => String(p._id) === String(selectedVersionId));
    const profileIdToSend = selected?.profileId || selected?._id;
    if (!profileIdToSend) return;
    setSubmittingAplicar(true);
    try {
      await api.post(`/opportunities/${detalle._id}/aplicar`, { profileId: profileIdToSend });
      setShowModalAplicar(false);
      setShowConfirmacionAplicar(true);
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Error al enviar la postulación';
      alert(msg);
    } finally {
      setSubmittingAplicar(false);
    }
  };

  const cerrarConfirmacionAplicar = () => {
    setShowConfirmacionAplicar(false);
    setDetalle(null);
    loadOfertas(currentPage);
  };

  return (
    <div className="dashboard-content">
      <div className="dashboard-welcome ofertas-afines-welcome">
        <button
          type="button"
          className="ofertas-afines-refresh-btn ofertas-afines-refresh-btn--welcome"
          onClick={() => loadOfertas(currentPage)}
          disabled={loading}
          title="Actualizar lista de ofertas"
        >
          <FiRefreshCw size={18} className={loading ? 'ofertas-afines-refresh-btn__icon--spin' : ''} />
          <span>Refrescar</span>
        </button>
        <h2>Prácticas y Pasantías</h2>
        <p>Ofertas que coinciden con tu periodo y programa autorizados.</p>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Cargando ofertas...</p>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="empty-state ofertas-afines-empty">
          <p>No hay ofertas de prácticas que coincidan con tu perfil en este momento.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#6b7280' }}>
            Debes estar autorizado en estudiantes habilitados para el mismo periodo y programa que las ofertas.
          </p>
          <button
            type="button"
            className="ofertas-afines-refresh-btn ofertas-afines-refresh-btn--empty"
            onClick={() => loadOfertas(1)}
            disabled={loading}
          >
            <FiRefreshCw size={18} />
            <span>Refrescar</span>
          </button>
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

      <DetalleOportunidadModal
        detalle={detalle}
        loading={loadingDetalle}
        onClose={() => setDetalle(null)}
        onAplicar={openModalAplicar}
      />

      {/* Modal selección hoja de vida para aplicar */}
      {showModalAplicar && (
        <div className="modal-overlay" onClick={() => !submittingAplicar && setShowModalAplicar(false)}>
          <div className="modal-content ofertas-afines-aplicar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ofertas-afines-aplicar-modal__header">
              <h3 className="ofertas-afines-aplicar-modal__title">Aplicar con hoja de vida</h3>
              <button type="button" className="ofertas-afines-aplicar-modal__close" onClick={() => !submittingAplicar && setShowModalAplicar(false)} aria-label="Cerrar">
                <FiX size={22} />
              </button>
            </div>
            <div className="ofertas-afines-aplicar-modal__body">
              <p className="ofertas-afines-aplicar-modal__intro">
                Seleccione el perfil (hoja de vida) con el que desea postularse:
              </p>
              {loadingProfiles ? (
                <div className="ofertas-afines-aplicar-modal__loading">
                  <div className="loading-spinner" />
                  <p>Cargando perfiles...</p>
                </div>
              ) : profiles.length === 0 ? (
                <p className="ofertas-afines-aplicar-modal__empty">No tiene hojas de vida creadas. Cree una en Mi perfil y vuelva a intentar.</p>
              ) : (
                <>
                  <ul className="ofertas-afines-aplicar-modal__list">
                    {profiles.map((p) => {
                      const versionId = String(p._id ?? '');
                      const name = p.profileName || p.profileText?.slice(0, 50) || `Perfil ${versionId.slice(-6)}`;
                      const isSelected = selectedVersionId === versionId;
                      return (
                        <li key={versionId} className="ofertas-afines-aplicar-modal__item">
                          <label className={`ofertas-afines-aplicar-modal__label ${isSelected ? 'ofertas-afines-aplicar-modal__label--selected' : ''}`}>
                            <input
                              type="radio"
                              name="profileAplicar"
                              checked={isSelected}
                              onChange={() => setSelectedVersionId(versionId)}
                              className="ofertas-afines-aplicar-modal__radio"
                            />
                            <span className="ofertas-afines-aplicar-modal__name">{name}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="ofertas-afines-aplicar-modal__footer">
                    <button type="button" className="ofertas-afines-aplicar-modal__btn ofertas-afines-aplicar-modal__btn--secondary" onClick={() => setShowModalAplicar(false)} disabled={submittingAplicar}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="ofertas-afines-aplicar-modal__btn ofertas-afines-aplicar-modal__btn--primary"
                      onClick={submitAplicar}
                      disabled={!selectedVersionId || submittingAplicar}
                    >
                      {submittingAplicar ? 'Enviando...' : 'Enviar postulación'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación postulación enviada */}
      {showConfirmacionAplicar && (
        <div className="modal-overlay" onClick={cerrarConfirmacionAplicar}>
          <div className="modal-content ofertas-afines-confirmacion-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ofertas-afines-confirmacion-modal__icon">
              <FiCheckCircle size={48} />
            </div>
            <h3 className="ofertas-afines-confirmacion-modal__title">Postulación enviada</h3>
            <p className="ofertas-afines-confirmacion-modal__text">
              Tu postulación fue enviada correctamente. Puedes ver el estado en <strong>Mis aplicaciones</strong>.
            </p>
            <button type="button" className="ofertas-afines-confirmacion-modal__btn" onClick={cerrarConfirmacionAplicar}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
