import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { parseProgramasFromRow } from './legalizacionProgramasParse';
import './LegalizacionProgramasBadge.css';

/**
 * Botón tipo badge que abre un modal con los programas de la fila.
 * @param {{ programa?: string, programas?: unknown[] }} row
 * @param {'admin' | 'student'} variant
 */
export default function LegalizacionProgramasBadge({ row, variant = 'student' }) {
  const [open, setOpen] = useState(false);
  const list = parseProgramasFromRow(row);
  const n = list.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const label =
    n === 0 ? 'Sin programa' : n === 1 ? '1 programa' : `${n} programas`;

  const modal =
    open &&
    createPortal(
      <div
        className="legiz-prog-modal-overlay"
        role="presentation"
        onClick={() => setOpen(false)}
      >
        <div
          className="legiz-prog-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="legiz-prog-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="legiz-prog-modal__head">
            <h2 id="legiz-prog-modal-title" className="legiz-prog-modal__title">
              Programas
            </h2>
            <button
              type="button"
              className="legiz-prog-modal__close"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
            >
              <FiX size={22} />
            </button>
          </div>
          <div className="legiz-prog-modal__body">
            {n === 0 ? (
              <p className="legiz-prog-modal__empty">No hay programas asociados a este registro.</p>
            ) : (
              <ul className="legiz-prog-modal__list">
                {list.map((text, i) => (
                  <li key={`${i}-${text}`}>{text}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <button
        type="button"
        className={`legiz-prog-badge-btn ${variant === 'admin' ? 'legiz-prog-badge-btn--admin' : ''}`}
        onClick={() => setOpen(true)}
        title="Ver programas"
      >
        {label}
      </button>
      {modal}
    </>
  );
}
