import { useState, useEffect } from 'react';
import { FiArrowLeft, FiSave, FiAlertTriangle } from 'react-icons/fi';
import api from '../../services/api';
import Swal from 'sweetalert2';
import '../styles/ConfiguracionPersonal.css';
import '../styles/ConfiguracionEstudiante.css';

const OPCIONES = [
  {
    key: 'notifActivacionOfertas',
    label: '¿Desea recibir notificaciones de activación de ofertas?',
  },
  {
    key: 'notifActivacionOfertasPractica',
    label: '¿Desea recibir notificaciones de activación de ofertas de Prácticas Académicas?',
  },
  {
    key: 'notifCierreOfertas',
    label: '¿Desea recibir notificaciones de cierre de ofertas?',
  },
];

export default function ConfiguracionEstudiante({ onVolver }) {
  const [config, setConfig] = useState({
    notifActivacionOfertas: false,
    notifActivacionOfertasPractica: false,
    notifCierreOfertas: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await api.get('/users/notification-preferences');
        if (res.data && typeof res.data === 'object') {
          setConfig((prev) => ({
            ...prev,
            ...res.data,
          }));
        }
      } catch {
        // Sin endpoint aún: se usan valores por defecto
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const setValor = (key, valor) => {
    setConfig((prev) => ({ ...prev, [key]: valor }));
  };

  const handleGuardar = async () => {
    setSaving(true);
    try {
      await api.put('/users/notification-preferences', config);
      await Swal.fire({
        icon: 'success',
        title: 'Guardado',
        text: 'Configuración de notificaciones guardada correctamente.',
        confirmButtonColor: '#c41e3a',
      });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al guardar';
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: msg,
        confirmButtonColor: '#c41e3a',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="notificaciones-content config-estudiante">
        <div className="notificaciones-section">
          <p>Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notificaciones-content config-estudiante">
      <div className="notificaciones-section">
        <div className="notificaciones-header">
          <div className="configuracion-actions">
            <button type="button" className="btn-volver" onClick={onVolver}>
              <FiArrowLeft className="btn-icon" />
              Volver
            </button>
            <button
              type="button"
              className="btn-guardar"
              onClick={handleGuardar}
              disabled={saving}
            >
              <FiSave className="btn-icon" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
          <div className="section-header section-header-config">
            <h3>CONFIGURACIÓN</h3>
          </div>
          <div className="section-header-underline" />
        </div>

        <div className="config-estudiante-list">
          {OPCIONES.map((opcion) => (
            <div key={opcion.key} className="config-estudiante-item">
              <div className="config-estudiante-pregunta">
                <FiAlertTriangle className="config-estudiante-icon" />
                <span className="config-estudiante-label">{opcion.label}</span>
              </div>
              <div className="config-estudiante-buttons">
                <button
                  type="button"
                  className={`btn-sino ${config[opcion.key] ? 'active' : ''}`}
                  onClick={() => setValor(opcion.key, true)}
                >
                  Sí
                </button>
                <button
                  type="button"
                  className={`btn-sino ${!config[opcion.key] ? 'active' : ''}`}
                  onClick={() => setValor(opcion.key, false)}
                >
                  No
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
