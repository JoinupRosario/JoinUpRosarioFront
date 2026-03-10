import { useState, useEffect, useCallback } from 'react';
import { FiArrowLeft, FiPlus, FiEdit } from 'react-icons/fi';
import api from '../../../../services/api';
import ModalPlantilla from '../ModalPlantilla';
import '../../../styles/notificaciones.css';

const STORAGE_KEY = 'plantillas_notif_practica';
const TIPO = 'practica';

function getSavedPlantillas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function NotificacionPracticas({ onVolver }) {
  const [parametros, setParametros] = useState([]);
  const [parametrosLoading, setParametrosLoading] = useState(true);
  const [parametrosError, setParametrosError] = useState(null);
  const [savedPlantillas, setSavedPlantillas] = useState(getSavedPlantillas);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const listCreated = Object.entries(savedPlantillas).map(([parametroId, data]) => ({
    parametroId,
    ...data,
  }));

  const loadParametros = useCallback(async () => {
    setParametrosLoading(true);
    setParametrosError(null);
    try {
      const { data } = await api.get('/parametros-plantilla', { params: { tipo: TIPO } });
      const list = data?.data ?? data ?? [];
      setParametros(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Error cargando parámetros plantilla:', e);
      setParametrosError(e.response?.data?.message || e.message || 'No se pudieron cargar los eventos. Verifica que el backend esté en marcha y que hayas ejecutado el seeder de parámetros plantilla.');
      setParametros([]);
    } finally {
      setParametrosLoading(false);
    }
  }, []);

  useEffect(() => {
    loadParametros();
  }, [loadParametros]);

  useEffect(() => {
    setSavedPlantillas(getSavedPlantillas());
  }, [showModal]);

  const handleCrear = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEditar = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setSavedPlantillas(getSavedPlantillas());
  };

  const handleSave = (plantilla) => {
    const next = {
      ...getSavedPlantillas(),
      [plantilla.parametroId]: {
        value: plantilla.value,
        nombre: plantilla.nombre,
        asunto: plantilla.asunto,
        cuerpo: plantilla.cuerpo,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSavedPlantillas(next);
  };

  return (
    <div className="pn-content">
      <div className="pn-header">
        <div className="pn-header-left">
          <button type="button" className="pn-btn-volver" onClick={onVolver} title="Volver">
            <FiArrowLeft className="pn-btn-icon" /> Volver
          </button>
          <div className="pn-title-wrap">
            <h3>Plantillas de notificaciones de Prácticas</h3>
          </div>
          <button type="button" className="pn-btn-crear" onClick={handleCrear}>
            <FiPlus /> Crear plantilla
          </button>
        </div>
      </div>

      <div className="pn-table-wrapper">
        {parametrosLoading ? (
          <div className="pn-loading">Cargando...</div>
        ) : parametrosError ? (
          <div className="pn-empty">
            <p className="pn-error-msg">{parametrosError}</p>
            <button type="button" className="pn-btn-secondary" onClick={loadParametros} style={{ marginTop: 16 }}>
              Reintentar
            </button>
          </div>
        ) : listCreated.length === 0 ? (
          <div className="pn-empty">
            <p>No hay notificaciones creadas. Usa &quot;Crear plantilla&quot; para agregar una.</p>
            {parametros.length === 0 ? (
              <p style={{ marginTop: 8, fontSize: 12 }}>Ejecuta el seeder: <code>node src/seeders/runParametrosPlantillaSeeder.js</code> en el backend para tener eventos disponibles.</p>
            ) : null}
            <button type="button" className="pn-btn-crear" onClick={handleCrear} style={{ marginTop: 16 }}>
              <FiPlus /> Crear plantilla
            </button>
          </div>
        ) : (
          <table className="pn-table">
            <thead>
              <tr>
                <th>Evento / Notificación</th>
                <th>Asunto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {listCreated.map((item) => (
                <tr key={item.parametroId}>
                  <td className="pn-td-nombre">{item.nombre || item.value}</td>
                  <td className="pn-td-asunto">{item.asunto || '—'}</td>
                  <td className="pn-td-actions">
                    <button
                      type="button"
                      className="pn-btn-action pn-btn-edit"
                      title="Editar plantilla"
                      onClick={() => handleEditar(item)}
                    >
                      <FiEdit /> Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ModalPlantilla
        open={showModal}
        tipo={TIPO}
        parametros={parametros}
        savedPlantillas={savedPlantillas}
        editingItem={editingItem}
        onSave={handleSave}
        onClose={handleCloseModal}
      />
    </div>
  );
}
