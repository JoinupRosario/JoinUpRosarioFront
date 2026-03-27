import { useState, useEffect } from 'react';
import Select, { createFilter } from 'react-select';
import { FiX } from 'react-icons/fi';
import api from '../../../services/api';
import '../../styles/notificaciones.css';

const selectSearchFilter = createFilter({
  ignoreCase: true,
  ignoreAccents: true,
  matchFrom: 'any',
});

/**
 * Modal para ver y editar los destinatarios de una plantilla.
 */
export default function ModalDestinatarios({ open, item, onSave, onClose }) {
  const [rolesCatalog, setRolesCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);

  useEffect(() => {
    if (!open) return;
    setSelectedKeys(item?.destinatarios || []);
    setLoading(true);
    api
      .get('/roles?estado=activos&limit=100')
      .then((res) => {
        const list = res.data?.data ?? res.data ?? [];
        setRolesCatalog(Array.isArray(list) ? list : []);
      })
      .catch(() => setRolesCatalog([]))
      .finally(() => setLoading(false));
  }, [open, item]);

  const labelRol = (idOrKey) =>
    rolesCatalog.find((r) => String(r._id) === String(idOrKey))?.nombre || idOrKey;

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
          <p className="pn-step-desc">
            Seleccione los roles del sistema; el correo llegará a los administrativos activos con ese rol.
          </p>
          <div className="pn-form-group">
            <Select
              isMulti
              isSearchable
              filterOption={selectSearchFilter}
              closeMenuOnSelect={false}
              placeholder={loading ? 'Cargando roles...' : 'Buscar o seleccionar roles...'}
              options={rolesCatalog.map((r) => ({
                value: String(r._id),
                label: r.nombre || String(r._id),
              }))}
              value={selectedKeys.map((key) => ({
                value: key,
                label: labelRol(key),
              }))}
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
