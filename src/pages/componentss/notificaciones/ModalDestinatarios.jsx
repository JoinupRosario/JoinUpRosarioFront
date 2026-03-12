import { useState, useEffect } from 'react';
import Select from 'react-select';
import { FiX } from 'react-icons/fi';
import api from '../../../services/api';
import '../../styles/notificaciones.css';

/**
 * Modal para ver y editar los destinatarios de una plantilla.
 */
export default function ModalDestinatarios({ open, item, onSave, onClose }) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);

  useEffect(() => {
    if (!open) return;
    setSelectedKeys(item?.destinatarios || []);
    setLoading(true);
    api.get('/destinatarios-notificacion').then((res) => {
      const list = res.data?.data ?? res.data ?? [];
      setCatalog(Array.isArray(list) ? list : []);
    }).catch(() => setCatalog([])).finally(() => setLoading(false));
  }, [open, item]);

  const handleGuardar = () => {
    onSave(selectedKeys);
    onClose();
  };

  if (!open) return null;
  const nombre = item?.nombre ?? item?.value ?? 'Plantilla';

  return (
    <div className="pn-modal-overlay" onClick={onClose}>
      <div className="pn-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pn-modal-header">
          <h3>Destinatarios: {nombre}</h3>
          <button type="button" className="pn-modal-close" onClick={onClose}><FiX /></button>
        </div>
        <div className="pn-modal-body">
          <p className="pn-step-desc">Seleccione a quiénes va dirigida esta notificación.</p>
          <div className="pn-form-group">
            <Select
              isMulti
              placeholder={loading ? 'Cargando...' : 'Seleccione destinatarios...'}
              options={catalog.map((d) => ({
                value: (d.key || '').toLowerCase(),
                label: d.label || d.key || '',
              }))}
              value={selectedKeys.map((key) => {
                const d = catalog.find((c) => (c.key || '').toLowerCase() === key);
                return { value: key, label: d?.label || key };
              })}
              onChange={(selected) => setSelectedKeys((selected || []).map((s) => s.value))}
              isDisabled={loading}
              className="pn-select-variables"
              classNamePrefix="pn-select"
              menuPortalTarget={document.body}
              menuPosition="fixed"
              styles={{ menuPortal: (base) => ({ ...base, zIndex: 1100 }) }}
            />
          </div>
        </div>
        <div className="pn-modal-footer">
          <button type="button" className="pn-btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="pn-btn-primary" onClick={handleGuardar}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
