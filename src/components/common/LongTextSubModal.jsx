import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import './LongTextSubModal.css';

function Prose({ text }) {
  const raw = text == null || String(text).trim() === '' ? '—' : String(text);
  const lines = raw.split(/\r?\n/);
  return (
    <div className="long-text-submodal__prose">
      {lines.map((line, i) => {
        const row = line.replace(/\s+$/, '');
        if (row === '') {
          return <p key={i} className="long-text-submodal__para long-text-submodal__para--blank" aria-hidden="true" />;
        }
        return (
          <p key={i} className="long-text-submodal__para">
            {row}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Modal secundario para textos largos (funciones, requisitos). Portal a document.body.
 */
export default function LongTextSubModal({ open, title, text, onClose }) {
  if (!open) return null;
  return createPortal(
    <div className="long-text-submodal-overlay" onClick={onClose} role="presentation">
      <div
        className="long-text-submodal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="long-text-submodal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="long-text-submodal__header">
          <h2 id="long-text-submodal-title" className="long-text-submodal__title">
            {title || 'Detalle'}
          </h2>
          <button type="button" className="long-text-submodal__close" onClick={onClose} aria-label="Cerrar">
            <FiX size={22} />
          </button>
        </header>
        <div className="long-text-submodal__body" lang="es">
          <Prose text={text} />
        </div>
      </div>
    </div>,
    document.body
  );
}
