import { useEffect, useState } from 'react';
import { FiX, FiSend, FiChevronRight } from 'react-icons/fi';
import LongTextSubModal from '../../components/common/LongTextSubModal';
import '../styles/Oportunidades.css';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—';
}

const SALARIO_EMOCIONAL_LABELS = {
  acompanamiento_directivo: 'Acompañamiento de un directivo de la organización',
  actividades_voluntariado: 'Actividades de Voluntariado notables',
  capacitacion_complementaria: 'Capacitación complementaria para el proceso formativo',
  comida_casino: 'Comida o casino para almuerzo',
  desarrollo_carrera: 'Desarrollo de carrera profesional',
  dia_cumpleanos_libre: 'Dia de cumpleaños libre',
  espacios_distraccion: 'Espacios de distracción - zona de entretenimiento',
  gimnasio_yoga_masajes: 'Gimnasio, yoga, masajes, sitios de descanso',
  horario_flexible: 'Horario Flexible',
  jornadas_reducidas: 'Jornadas reducidas',
  pago_arl: 'Pago de ARL',
  pago_eps: 'Pago de EPS',
  ruta_transporte: 'Ruta o servicio de transporte al trabajo',
  dia_medio_dia: 'Un dia a la semana saliendo a medio dia',
};

function getSalarioEmocionalLabel(item) {
  if (item == null) return '—';
  if (typeof item === 'object' && (item.value != null || item.description != null)) {
    return item.description || item.value || '—';
  }
  return SALARIO_EMOCIONAL_LABELS[item] || item || '—';
}

/** Convierte ref Item (objeto con value/description) o string a texto para mostrar. Prioriza value (etiqueta corta). */
function getItemRefLabel(item) {
  if (item == null) return '—';
  if (typeof item === 'object' && (item.value != null || item.description != null)) {
    return item.value || item.description || '—';
  }
  return String(item);
}

function getAreaDesempenoLabel(area) {
  return getItemRefLabel(area);
}

function getPeriodoLabel(periodo) {
  if (periodo == null) return '—';
  if (typeof periodo === 'object' && periodo.codigo != null) return periodo.codigo;
  return String(periodo);
}

function getPaisLabel(pais) {
  if (pais == null) return '—';
  if (typeof pais === 'object' && (pais.name != null || pais.sortname != null)) return pais.name || pais.sortname || '—';
  return String(pais);
}

function getCiudadLabel(ciudad) {
  if (ciudad == null) return '—';
  if (typeof ciudad === 'object' && ciudad.name != null) return ciudad.name;
  return String(ciudad);
}

/**
 * Modal de detalle de una oportunidad. Reutilizable en Ofertas afines y Mis aplicaciones.
 * @param {Object|null} detalle - Datos de la oportunidad (o null si loading)
 * @param {boolean} loading - Muestra spinner
 * @param {() => void} onClose - Al cerrar
 * @param {() => void} [onAplicar] - Si se pasa y la oferta está Activa, se muestra botón "Aplicar"
 */
export default function DetalleOportunidadModal({ detalle, loading, onClose, onAplicar }) {
  const [longModal, setLongModal] = useState(null);

  useEffect(() => {
    setLongModal(null);
  }, [detalle?._id, loading]);

  const show = detalle !== null || loading;
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={() => !loading && onClose()}>
      <div className="modal-content ofertas-afines-detalle-modal" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Cargando detalle...</p>
          </div>
        ) : detalle ? (
          <>
            <div className="ofertas-afines-detalle-modal__header">
              <h3 className="ofertas-afines-detalle-modal__title">{detalle.nombreCargo}</h3>
              <button type="button" onClick={onClose} className="ofertas-afines-detalle-modal__close" aria-label="Cerrar">
                <FiX size={22} />
              </button>
            </div>
            <div className="ofertas-afines-detalle-modal__body">
              <section className="ofertas-afines-detalle-modal__data-card" aria-label="Datos de la oportunidad">
                <div className="ofertas-afines-detalle-modal__data-card-head">
                  <span className="ofertas-afines-detalle-modal__data-card-kicker">Práctica</span>
                  <span className="ofertas-afines-detalle-modal__data-card-title">Datos de la oportunidad</span>
                </div>
                <dl className="ofertas-afines-detalle-modal__grid">
                <dt>Id</dt>
                <dd>{detalle._id ? String(detalle._id).slice(-6) : '—'}</dd>
                <dt>Nombre de oportunidad</dt>
                <dd>{detalle.nombreCargo ?? '—'}</dd>
                <dt>Entidad</dt>
                <dd>{detalle.company?.name || detalle.company?.commercialName || '—'}</dd>
                <dt>¿La práctica cuenta con auxilio económico?</dt>
                <dd>{detalle.auxilioEconomico === true ? 'Sí' : detalle.auxilioEconomico === false ? 'No' : '—'}</dd>
                <dt>Salario</dt>
                <dd>{formatCurrency(detalle.apoyoEconomico)}</dd>
                <dt>Tipo de vinculación</dt>
                <dd>{getItemRefLabel(detalle.tipoVinculacion)}</dd>
                <dt>Periodo</dt>
                <dd>{getPeriodoLabel(detalle.periodo)}</dd>
                <dt>Vacantes</dt>
                <dd>{detalle.vacantes != null ? detalle.vacantes : '—'}</dd>
                <dt>Fecha de cierre</dt>
                <dd>{formatDate(detalle.fechaVencimiento)}</dd>
                <dt>País</dt>
                <dd>{getPaisLabel(detalle.pais)}</dd>
                <dt>Ciudad</dt>
                <dd>{getCiudadLabel(detalle.ciudad)}</dd>
                <dt>Jornada Ordinaria Semanal</dt>
                <dd>{detalle.jornadaOrdinariaSemanal != null ? `${detalle.jornadaOrdinariaSemanal} h` : '—'}</dd>
                <dt>Dedicación</dt>
                <dd>{getItemRefLabel(detalle.dedicacion)}</dd>
                <dt>Fecha de inicio de la práctica</dt>
                <dd>{formatDate(detalle.fechaInicioPractica)}</dd>
                <dt>Fecha fin de la práctica</dt>
                <dd>{formatDate(detalle.fechaFinPractica)}</dd>
                <dt>Horario</dt>
                <dd>{detalle.horario ?? '—'}</dd>
                <dt>Área de desempeño</dt>
                <dd>{getAreaDesempenoLabel(detalle.areaDesempeno)}</dd>
                <dt>Promedio mínimo requerido</dt>
                <dd>{detalle.promedioMinimoRequerido ?? '—'}</dd>
                </dl>
              </section>
              {detalle.enlacesFormatoEspecificos && (
                <section className="ofertas-afines-detalle-modal__block">
                  <h4 className="ofertas-afines-detalle-modal__label">Enlaces o formato específicos de aplicación</h4>
                  <p className="ofertas-afines-detalle-modal__text">{detalle.enlacesFormatoEspecificos}</p>
                </section>
              )}
              {(detalle.documentos?.length > 0) && (
                <section className="ofertas-afines-detalle-modal__block">
                  <h4 className="ofertas-afines-detalle-modal__label">Documentos de apoyo</h4>
                  <ul className="ofertas-afines-detalle-modal__list">
                    {detalle.documentos.map((doc, i) => (
                      <li key={i}>
                        {i === 0 ? 'Primer documento' : i === 1 ? 'Segundo documento' : `Documento ${i + 1}`}: {doc.nombre ?? '—'} {doc.requerido ? '(requerido)' : '(opcional)'}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {Array.isArray(detalle.salarioEmocional) && detalle.salarioEmocional.length > 0 && (
                <section className="ofertas-afines-detalle-modal__block">
                  <h4 className="ofertas-afines-detalle-modal__label">Salario Emocional</h4>
                  <ul className="ofertas-afines-detalle-modal__list">
                    {detalle.salarioEmocional.map((item, i) => (
                      <li key={i}>{getSalarioEmocionalLabel(item)}</li>
                    ))}
                  </ul>
                </section>
              )}
              {detalle.formacionAcademica?.length > 0 && (
                <section className="ofertas-afines-detalle-modal__block">
                  <h4 className="ofertas-afines-detalle-modal__label">Formación académica: Programas</h4>
                  <ul className="ofertas-afines-detalle-modal__list">
                    {detalle.formacionAcademica.map((f, i) => (
                      <li key={i}>{f.program}{f.level ? ` — ${f.level}` : ''}</li>
                    ))}
                  </ul>
                </section>
              )}
              {detalle.idiomas?.length > 0 && (
                <section className="ofertas-afines-detalle-modal__block">
                  <h4 className="ofertas-afines-detalle-modal__label">Idiomas</h4>
                  <ul className="ofertas-afines-detalle-modal__list">
                    {detalle.idiomas.map((idioma, i) => (
                      <li key={i}>{idioma.language} — Nivel: {idioma.level ?? '—'}</li>
                    ))}
                  </ul>
                </section>
              )}
              {detalle.funciones && (
                <section className="ofertas-afines-detalle-modal__data-card" aria-label="Funciones">
                  <div className="ofertas-afines-detalle-modal__data-card-head">
                    <span className="ofertas-afines-detalle-modal__data-card-kicker">Detalle</span>
                    <span className="ofertas-afines-detalle-modal__data-card-title">Funciones</span>
                  </div>
                  <div className="ofertas-afines-detalle-modal__long-block">
                    <button
                      type="button"
                      className="ofertas-afines-detalle-modal__long-btn"
                      onClick={() => setLongModal({ title: 'Funciones', text: detalle.funciones })}
                    >
                      Ver funciones <FiChevronRight size={16} aria-hidden />
                    </button>
                  </div>
                </section>
              )}
              {detalle.requisitos && (
                <section className="ofertas-afines-detalle-modal__data-card" aria-label="Requisitos">
                  <div className="ofertas-afines-detalle-modal__data-card-head">
                    <span className="ofertas-afines-detalle-modal__data-card-kicker">Detalle</span>
                    <span className="ofertas-afines-detalle-modal__data-card-title">Requisitos</span>
                  </div>
                  <div className="ofertas-afines-detalle-modal__long-block">
                    <button
                      type="button"
                      className="ofertas-afines-detalle-modal__long-btn"
                      onClick={() => setLongModal({ title: 'Requisitos', text: detalle.requisitos })}
                    >
                      Ver requisitos <FiChevronRight size={16} aria-hidden />
                    </button>
                  </div>
                </section>
              )}
            </div>
            {detalle.estado === 'Activa' && onAplicar && (
              <div className="ofertas-afines-detalle-modal__footer">
                <button type="button" className="ofertas-afines-detalle-modal__btn-apply" onClick={(e) => { e.stopPropagation(); onAplicar(); }}>
                  <FiSend /> Aplicar a esta oportunidad
                </button>
              </div>
            )}
          </>
        ) : null}
        <LongTextSubModal
          open={longModal != null}
          title={longModal?.title}
          text={longModal?.text}
          onClose={() => setLongModal(null)}
        />
      </div>
    </div>
  );
}
