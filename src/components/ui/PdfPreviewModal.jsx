import { useEffect } from 'react';
import './PdfPreviewModal.css';

/**
 * Modal reutilizable para previsualizar PDFs (por URL).
 * Uso: <PdfPreviewModal open={show} onClose={() => setShow(false)} title="Título" url={signedUrl} />
 */
export default function PdfPreviewModal({ open, onClose, title = 'Vista previa PDF', url }) {
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

  if (!open) return null;

  return (
    <div className="pdf-preview-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()}>
        <header className="pdf-preview-modal__header">
          <h3 className="pdf-preview-modal__title">{title}</h3>
          <button type="button" className="pdf-preview-modal__close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>
        <div className="pdf-preview-modal__body">
          {url ? (
            <iframe
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
