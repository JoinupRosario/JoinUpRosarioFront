import { createPortal } from 'react-dom';

/**
 * Renderiza el menú de opciones (backdrop + lista) en document.body con position: fixed
 * para que quede por encima de tablas con overflow y otros divs.
 */
export default function OptionsMenuPortal({ open, anchorRect, onClose, children }) {
  if (!open || !anchorRect) return null;
  const menuWidth = 180;
  const style = {
    position: 'fixed',
    top: anchorRect.bottom + 4,
    right: window.innerWidth - anchorRect.right,
    minWidth: menuWidth,
    zIndex: 1050,
  };
  return createPortal(
    <>
      <div className="pn-options-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="pn-options-menu pn-options-menu-portal" style={style}>
        {children}
      </div>
    </>,
    document.body
  );
}
