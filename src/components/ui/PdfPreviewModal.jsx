import { useEffect, useRef } from 'react';
import './PdfPreviewModal.css';

/**
 * Modal reutilizable para previsualizar PDFs o HTML (por URL).
 * Uso: <PdfPreviewModal open={show} onClose={() => setShow(false)} title="Título" url={signedUrl} />
 * Con botón imprimir (ej. plan de trabajo): showPrintButton
 */
export default function PdfPreviewModal({ open, onClose, title = 'Vista previa PDF', url, showPrintButton = false }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const handlePrint = () => {
    try {
      if (iframeRef.current?.contentWindow) iframeRef.current.contentWindow.print();
    } catch (e) {
      console.warn('Print:', e);
    }
  };

  if (!open) return null;

  return (
    <div className="pdf-preview-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()}>
        <header className="pdf-preview-modal__header">
          <h3 className="pdf-preview-modal__title">{title}</h3>
          <div className="pdf-preview-modal__header-actions">
            {showPrintButton && url && (
              <button type="button" className="pdf-preview-modal__print" onClick={handlePrint}>
                Imprimir / Guardar PDF
              </button>
            )}
            <button type="button" className="pdf-preview-modal__close" onClick={onClose} aria-label="Cerrar">
              ×
            </button>
          </div>
        </header>
        <div className="pdf-preview-modal__body">
          {url ? (
            <iframe
              ref={iframeRef}
              title={title}
              src={url}
              className="pdf-preview-modal__iframe"
            />
          ) : (
            <p className="pdf-preview-modal__empty">No hay documento disponible para previsualizar.</p>
          )}
        </div>
      </div>
    </div>
  );
}
