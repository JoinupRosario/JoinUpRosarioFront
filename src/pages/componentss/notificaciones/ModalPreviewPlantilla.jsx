import { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { reemplazarVariablesPorEjemplos } from './variableEjemplos';
import '../../styles/notificaciones.css';

// Imágenes en public/images/notificaciones/ (si falla .png se prueba .jpg)
const IMG_ENCABEZADO_PNG = '/images/notificaciones/encabezado.png';
const IMG_ENCABEZADO_JPG = '/images/notificaciones/encabezado.jpg';
const IMG_PIE_PNG = '/images/notificaciones/pie.png';
const IMG_PIE_JPG = '/images/notificaciones/pie.jpg';

function DefaultEncabezado() {
  const [src, setSrc] = useState(IMG_ENCABEZADO_PNG);
  const [failed, setFailed] = useState(false);
  const onError = () => {
    if (src === IMG_ENCABEZADO_PNG) setSrc(IMG_ENCABEZADO_JPG);
    else setFailed(true);
  };
  if (failed) return <div className="pn-email-header pn-email-header-image" />;
  return (
    <div className="pn-email-header pn-email-header-image">
      <img src={src} alt="Encabezado" className="pn-email-header-img" onError={onError} />
    </div>
  );
}

function DefaultPie() {
  const [src, setSrc] = useState(IMG_PIE_PNG);
  const [failed, setFailed] = useState(false);
  const onError = () => {
    if (src === IMG_PIE_PNG) setSrc(IMG_PIE_JPG);
    else setFailed(true);
  };
  if (failed) return <div className="pn-email-footer pn-email-footer-image" />;
  return (
    <div className="pn-email-footer pn-email-footer-image">
      <img src={src} alt="Pie de página" className="pn-email-footer-img" onError={onError} />
    </div>
  );
}

/**
 * Modal que muestra cómo se vería el correo al enviarse:
 * encabezado + asunto + cuerpo (con variables reemplazadas por ejemplos) + pie de página.
 */
export default function ModalPreviewPlantilla({ open, item, onClose }) {
  if (!open) return null;
  const asunto = item?.asunto ?? '';
  const cuerpo = item?.cuerpo ?? '';
  const nombre = item?.nombre ?? item?.value ?? 'Plantilla';
  const encabezado = item?.encabezado !== undefined && item?.encabezado !== '' ? item.encabezado : null;
  const pie = item?.pie !== undefined && item?.pie !== '' ? item.pie : null;

  const asuntoConEjemplos = reemplazarVariablesPorEjemplos(asunto);
  const cuerpoConEjemplos = reemplazarVariablesPorEjemplos(cuerpo);

  return (
    <div className="pn-modal-overlay" onClick={onClose}>
      <div className="pn-modal pn-modal-preview" onClick={(e) => e.stopPropagation()}>
        <div className="pn-modal-header">
          <h3>Vista previa: {nombre}</h3>
          <button type="button" className="pn-modal-close" onClick={onClose}><FiX /></button>
        </div>
        <div className="pn-modal-body pn-modal-body-preview">
          <div className="pn-email-preview">
            {encabezado ? (
              <div className="pn-email-header pn-email-header-html" dangerouslySetInnerHTML={{ __html: encabezado }} />
            ) : (
              <DefaultEncabezado />
            )}
            <div className="pn-email-body">
              {asuntoConEjemplos ? (
                <div className="pn-preview-asunto-line">{asuntoConEjemplos}</div>
              ) : null}
              <div
                className="pn-preview-cuerpo"
                dangerouslySetInnerHTML={{ __html: cuerpoConEjemplos || '—' }}
              />
            </div>
            {pie ? (
              <div className="pn-email-footer pn-email-footer-html" dangerouslySetInnerHTML={{ __html: pie }} />
            ) : (
              <DefaultPie />
            )}
          </div>
        </div>
        <div className="pn-modal-footer">
          <button type="button" className="pn-btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
