import { useState, useEffect, useRef } from 'react';
import { HiOutlineAcademicCap } from 'react-icons/hi';
import { FiX, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import api from '../../services/api';
import '../styles/Oportunidades.css';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function OfertasMonitoria() {
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
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [submittingAplicar, setSubmittingAplicar] = useState(false);
  const [showConfirmacionAplicar, setShowConfirmacionAplicar] = useState(false);
  const applyingToIdRef = useRef(null);

  const loadOfertas = async (page = 1) => {
    try {
      setLoading(true);
      const { data } = await api.get('/oportunidades-mtm/para-estudiante', {
        params: { page, limit: 10 },
      });
      setOpportunities(data.opportunities || []);
      setTotalPages(data.totalPages || 0);
      setCurrentPage(data.currentPage || 1);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Error cargando oportunidades de monitoría', e);
      setOpportunities([]);
      setTotalPages(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfertas(1);
  }, []);

  const openDetalle = async (op) => {
    setLoadingDetalle(true);
    setDetalle(null);
    try {
      const { data } = await api.get(`/oportunidades-mtm/${op._id}`);
      setDetalle(data);
    } catch (e) {
      console.error('Error cargando detalle MTM', e);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const openModalAplicar = async () => {
    if (!detalle || detalle.estado !== 'Activa') return;
    setShowModalAplicar(true);
    setSelectedProfileId('');
    setProfiles([]);
    setLoadingProfiles(true);
    try {
      const { data: me } = await api.get('/postulants/me');
      const id = me?._id || me?.id;
      if (!id) {
        setProfiles([]);
        return;
      }
      const { data: profilesRes } = await api.get(`/postulants/${id}/profiles`);
      const versions = (profilesRes?.profiles || []).filter((p) => p.hasCv === true);
      const baseProfiles = (profilesRes?.baseProfiles || []).filter((b) => b.hasCv === true);
      const list = versions.length > 0
        ? versions
        : baseProfiles.map((b) => ({
            _id: b._id,
            profileId: b._id,
            profileName: (b.studentCode || b.profileName || 'Perfil').toString().trim() || 'Perfil',
            type: 'base',
          }));
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
    const id = detalle._id;
    if (!id || applyingToIdRef.current !== null) return;
    const selected = profiles.find((p) => String(p._id) === String(selectedProfileId) || String(p.profileId) === String(selectedProfileId));
    const profileIdToSend = selected?.profileId || selected?._id;
    if (!profileIdToSend) return;
    applyingToIdRef.current = id;
    setSubmittingAplicar(true);
    try {
      await api.post(`/oportunidades-mtm/${id}/aplicar`, {
        postulantProfileId: profileIdToSend,
        profileVersionId: selected?.type !== 'base' && selected?._id ? selected._id : undefined,
      });
      setShowModalAplicar(false);
      setShowConfirmacionAplicar(true);
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Error al enviar la postulación';
      alert(msg);
    } finally {
      setSubmittingAplicar(false);
      applyingToIdRef.current = null;
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
          title="Actualizar lista"
        >
          <FiRefreshCw size={18} className={loading ? 'ofertas-afines-refresh-btn__icon--spin' : ''} />
          <span>Refrescar</span>
        </button>
        <h2>Oportunidades de monitorías, tutorías y mentorías</h2>
        <p>Ofertas que coinciden con tu programa, promedio y asignaturas cursadas (según información académica).</p>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Cargando oportunidades...</p>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="empty-state ofertas-afines-empty">
          <p>No hay oportunidades de monitoría que coincidan con tu perfil en este momento.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#6b7280' }}>
            Debes tener un perfil con código estudiantil y que tu programa, promedio y asignaturas cumplan los requisitos de cada oferta.
          </p>
          <button type="button" className="ofertas-afines-refresh-btn ofertas-afines-refresh-btn--empty" onClick={() => loadOfertas(1)} disabled={loading}>
            <FiRefreshCw size={18} />
            <span>Refrescar</span>
          </button>
        </div>
      ) : (
        <>
          <div className="oportunidades-section">
            <div className="oportunidades-grid">
              {opportunities.map((op) => (
                <div
                  key={op._id}
                  className="oportunidad-card oportunidad-activa"
                  onClick={() => openDetalle(op)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="oportunidad-header">
                    <div className="oportunidad-title-section">
                      <h4 className="oportunidad-title">{op.nombreCargo || 'Sin título'}</h4>
                      <span className="oportunidad-number">No. {op._id?.slice(-6)}</span>
                    </div>
                    <div className="oportunidad-pin">
                      <HiOutlineAcademicCap />
                    </div>
                  </div>
                  <div className="oportunidad-body">
                    <div className="oportunidad-company">{op.company?.name || 'Universidad del Rosario'}</div>
                    {op.valorPorHora?.value && <div className="oportunidad-remuneration">{op.valorPorHora.value}</div>}
                    <div className="oportunidad-areas">
                      {op.categoria?.value && <span className="area-tag">{op.categoria.value}</span>}
                      {op.periodo?.codigo && <span className="area-tag">{op.periodo.codigo}</span>}
                    </div>
                  </div>
                  <div className="oportunidad-footer" style={{ background: '#d1fae5', borderTop: '1px solid rgba(6,95,70,0.12)' }}>
                    <span className="status-text" style={{ color: '#065f46', fontWeight: 600 }}>Activa</span>
                    <span className="oportunidad-type-icon"><HiOutlineAcademicCap /><span>Monitoría / Tutoría / Mentoría</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn-volver" disabled={currentPage <= 1} onClick={() => loadOfertas(currentPage - 1)}>Anterior</button>
              <span style={{ alignSelf: 'center' }}>Página {currentPage} de {totalPages} ({total} ofertas)</span>
              <button type="button" className="btn-volver" disabled={currentPage >= totalPages} onClick={() => loadOfertas(currentPage + 1)}>Siguiente</button>
            </div>
          )}
        </>
      )}

      {/* Modal detalle MTM — mismas clases CSS que prácticas para consistencia */}
      {detalle && (
        <div className="modal-overlay" onClick={() => !loadingDetalle && setDetalle(null)}>
          <div className="modal-content ofertas-afines-detalle-modal" onClick={(e) => e.stopPropagation()}>
            {loadingDetalle ? (
              <div className="loading-container"><div className="loading-spinner" /><p>Cargando...</p></div>
            ) : (
              <>
                <div className="ofertas-afines-detalle-modal__header">
                  <h3 className="ofertas-afines-detalle-modal__title"><HiOutlineAcademicCap style={{ marginRight: 8, verticalAlign: 'middle' }} />{detalle.nombreCargo}</h3>
                  <button type="button" onClick={() => setDetalle(null)} className="ofertas-afines-detalle-modal__close" aria-label="Cerrar"><FiX size={22} /></button>
                </div>
                <div className="ofertas-afines-detalle-modal__body">
                  <dl className="ofertas-afines-detalle-modal__grid">
                    <dt>Dedicación</dt>
                    <dd>{detalle.dedicacionHoras?.value ?? '—'}</dd>
                    <dt>Valor por hora</dt>
                    <dd>{detalle.valorPorHora?.value ?? '—'}</dd>
                    <dt>Tipo vinculación</dt>
                    <dd>{detalle.tipoVinculacion?.value ?? '—'}</dd>
                    <dt>Periodo</dt>
                    <dd>{detalle.periodo?.codigo ?? '—'}</dd>
                    <dt>Categoría</dt>
                    <dd>{detalle.categoria?.value ?? '—'}</dd>
                    <dt>Vacantes</dt>
                    <dd>{detalle.vacantes ?? '—'}</dd>
                    <dt>Vencimiento</dt>
                    <dd>{fmtDate(detalle.fechaVencimiento)}</dd>
                    <dt>Asignaturas</dt>
                    <dd>{detalle.asignaturas?.length > 0 ? detalle.asignaturas.map((a) => a.nombreAsignatura || a.codAsignatura).filter(Boolean).join(', ') : '—'}</dd>
                    <dt>Promedio mínimo</dt>
                    <dd>{detalle.promedioMinimo ?? '—'}</dd>
                    <dt>Profesor / responsable</dt>
                    <dd>{detalle.nombreProfesor ?? '—'}</dd>
                    <dt>Unidad académica</dt>
                    <dd>{detalle.unidadAcademica ?? '—'}</dd>
                    <dt>Horario</dt>
                    <dd>{detalle.horario ?? '—'}</dd>
                    <dt>Grupo</dt>
                    <dd>{detalle.grupo ?? '—'}</dd>
                    <dt>Programas</dt>
                    <dd>{detalle.programas?.length > 0 ? detalle.programas.map((p) => p.name || p.code).filter(Boolean).join(', ') : '—'}</dd>
                  </dl>
                  {detalle.funciones && (
                    <section className="ofertas-afines-detalle-modal__block">
                      <h4 className="ofertas-afines-detalle-modal__label">Funciones</h4>
                      <p className="ofertas-afines-detalle-modal__text">{detalle.funciones}</p>
                    </section>
                  )}
                  {detalle.requisitos && (
                    <section className="ofertas-afines-detalle-modal__block">
                      <h4 className="ofertas-afines-detalle-modal__label">Requisitos</h4>
                      <p className="ofertas-afines-detalle-modal__text">{detalle.requisitos}</p>
                    </section>
                  )}
                  {detalle.estado === 'Activa' && (
                    <div className="ofertas-afines-detalle-modal__footer">
                      <button type="button" className="ofertas-afines-detalle-modal__btn-apply" onClick={openModalAplicar}>
                        Aplicar con hoja de vida
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal selección HV para aplicar */}
      {showModalAplicar && (
        <div className="modal-overlay" onClick={() => !submittingAplicar && setShowModalAplicar(false)}>
          <div className="modal-content ofertas-afines-aplicar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ofertas-afines-aplicar-modal__header">
              <h3 className="ofertas-afines-aplicar-modal__title">Aplicar con hoja de vida</h3>
              <button type="button" className="ofertas-afines-aplicar-modal__close" onClick={() => !submittingAplicar && setShowModalAplicar(false)} aria-label="Cerrar"><FiX size={22} /></button>
            </div>
            <div className="ofertas-afines-aplicar-modal__body">
              <p className="ofertas-afines-aplicar-modal__intro">Seleccione el perfil (hoja de vida) con el que desea postularse:</p>
              {loadingProfiles ? (
                <div className="ofertas-afines-aplicar-modal__loading"><div className="loading-spinner" /><p>Cargando perfiles...</p></div>
              ) : profiles.length === 0 ? (
                <p className="ofertas-afines-aplicar-modal__empty">No tiene perfiles con hoja de vida generada. Genere al menos una hoja de vida en Mi perfil y vuelva a intentar.</p>
              ) : (
                <>
                  <ul className="ofertas-afines-aplicar-modal__list">
                    {profiles.map((p) => {
                      const pid = String(p.profileId || p._id);
                      const name = p.profileName || p.profileText?.slice(0, 50) || `Perfil ${pid.slice(-6)}`;
                      const isSelected = selectedProfileId === pid;
                      return (
                        <li key={pid} className="ofertas-afines-aplicar-modal__item">
                          <label className={`ofertas-afines-aplicar-modal__label ${isSelected ? 'ofertas-afines-aplicar-modal__label--selected' : ''}`}>
                            <input type="radio" name="profileMtm" checked={isSelected} onChange={() => setSelectedProfileId(pid)} className="ofertas-afines-aplicar-modal__radio" />
                            <span className="ofertas-afines-aplicar-modal__name">{name}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="ofertas-afines-aplicar-modal__footer">
                    <button type="button" className="ofertas-afines-aplicar-modal__btn ofertas-afines-aplicar-modal__btn--secondary" onClick={() => setShowModalAplicar(false)} disabled={submittingAplicar}>Cancelar</button>
                    <button type="button" className="ofertas-afines-aplicar-modal__btn ofertas-afines-aplicar-modal__btn--primary" onClick={submitAplicar} disabled={!selectedProfileId || submittingAplicar}>
                      {submittingAplicar ? 'Enviando...' : 'Enviar postulación'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showConfirmacionAplicar && (
        <div className="modal-overlay" onClick={cerrarConfirmacionAplicar}>
          <div className="modal-content ofertas-afines-confirmacion-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ofertas-afines-confirmacion-modal__icon"><FiCheckCircle size={48} /></div>
            <h3 className="ofertas-afines-confirmacion-modal__title">Postulación enviada</h3>
            <p className="ofertas-afines-confirmacion-modal__text">Tu postulación fue enviada correctamente. Puedes ver el estado en <strong>Mis aplicaciones</strong>.</p>
            <button type="button" className="ofertas-afines-confirmacion-modal__btn" onClick={cerrarConfirmacionAplicar}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
