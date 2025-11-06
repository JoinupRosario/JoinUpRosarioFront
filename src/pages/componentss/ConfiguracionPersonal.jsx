import { useState } from 'react';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import '../styles/ConfiguracionPersonal.css';

export default function ConfiguracionPersonal({ onVolver }) {
  const [notificaciones, setNotificaciones] = useState({
    creacionOportunidad: false,
    creacionOportunidadPractica: false,
    edicionOportunidad: false,
    edicionOportunidadPractica: false,
    creacionEmpresa: true,
    actualizacionEmpresa: true,
    activacionOportunidades: false,
    activacionOportunidadesPractica: false,
    rechazoOportunidades: false,
    aplicacionPostulantes: true,
    envioRevisionLegalizacion: true,
    envioRevisionPractica: false,
  });

  const handleToggle = (key) => {
    setNotificaciones({
      ...notificaciones,
      [key]: !notificaciones[key],
    });
  };

  const handleGuardar = () => {
    // TODO: Implementar guardado cuando el backend esté listo
    console.log('Guardando configuración:', notificaciones);
    alert('Configuración guardada (simulado)');
  };

  const opcionesNotificaciones = [
    { key: 'creacionOportunidad', label: 'Posterior a creación de Oportunidad' },
    { key: 'creacionOportunidadPractica', label: 'Posterior a la creación de Oportunidad de Práctica Académica' },
    { key: 'edicionOportunidad', label: 'Posterior a edición de Oportunidad' },
    { key: 'edicionOportunidadPractica', label: 'Posterior a la edición de Oportunidad de Práctica Académica' },
    { key: 'creacionEmpresa', label: 'Posterior a creación de Empresa' },
    { key: 'actualizacionEmpresa', label: 'Posterior a actualización de Empresa' },
    { key: 'activacionOportunidades', label: 'Posterior a la activación de Oportunidades' },
    { key: 'activacionOportunidadesPractica', label: 'Posterior a la activación de Oportunidades de Práctica Académica' },
    { key: 'rechazoOportunidades', label: 'Posterior al rechazo de Oportunidades' },
    { key: 'aplicacionPostulantes', label: 'Posterior a la aplicación de postulantes a las Oportunidades' },
    { key: 'envioRevisionLegalizacion', label: 'Posterior al envío a revisión de la legalización' },
    { key: 'envioRevisionPractica', label: 'Posterior al envío a revisión de una práctica académica' },
  ];

  return (
    <div className="notificaciones-content">
      <div className="notificaciones-section">
        <div className="notificaciones-header">
          <div className="configuracion-actions">
            <button className="btn-volver" onClick={onVolver}>
              <FiArrowLeft className="btn-icon" />
              Volver
            </button>
            <button className="btn-guardar" onClick={handleGuardar}>
              <FiSave className="btn-icon" />
              Guardar
            </button>
          </div>
          <div className="section-header">
            <h3>NOTIFICACIONES</h3>
          </div>
        </div>

        <div className="notificaciones-list">
          {opcionesNotificaciones.map((opcion) => (
            <div key={opcion.key} className="notificacion-item">
              <span className="notificacion-label">{opcion.label}</span>
              <div className="rol-switch-container">
                <label className="rol-switch">
                  <input
                    type="checkbox"
                    checked={notificaciones[opcion.key]}
                    onChange={() => handleToggle(opcion.key)}
                  />
                  <span className="rol-slider"></span>
                </label>
                <span className={`rol-status-text ${notificaciones[opcion.key] ? 'active' : 'inactive'}`}>
                  {notificaciones[opcion.key] ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

