import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import SurveyMTMEditor from './SurveyMTMEditor';
import './evaluacionMTM.css';

/**
 * Listado de plantillas (SurveyMTM) para el Coordinador general MTM (RQ04_HU011).
 * Permite crear, editar, activar y archivar plantillas. Solo una puede estar activa a la vez.
 */
export default function SurveysMTM({ onVolver }) {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // null | id | 'new'
  const puedeConfigurar = hasPermission('CESM') || hasPermission('AMMO');

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/evaluaciones-mtm/surveys');
      setItems(data?.items || []);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo cargar.', confirmButtonColor: '#c41e3a' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const handleCrear = async () => {
    const { value: nombre } = await Swal.fire({
      title: 'Nueva plantilla de evaluación',
      input: 'text',
      inputLabel: 'Nombre interno',
      inputPlaceholder: 'Ej. Evaluación MTM 2026-1',
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
    });
    if (!nombre) return;
    try {
      const { data } = await api.post('/evaluaciones-mtm/surveys', { nombre });
      setEditingId(data?.survey?._id);
      cargar();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo crear.', confirmButtonColor: '#c41e3a' });
    }
  };

  const handleActivar = async (id, nombre) => {
    const r = await Swal.fire({
      icon: 'question',
      title: '¿Activar esta plantilla?',
      html: `Se desactivará cualquier otra plantilla activa.<br/><strong>${nombre}</strong>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, activar',
      confirmButtonColor: '#c41e3a',
    });
    if (!r.isConfirmed) return;
    try {
      await api.post(`/evaluaciones-mtm/surveys/${id}/activar`);
      cargar();
      Swal.fire({ icon: 'success', title: 'Activada', confirmButtonColor: '#c41e3a' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo activar.', confirmButtonColor: '#c41e3a' });
    }
  };

  const handleArchivar = async (id, nombre) => {
    const r = await Swal.fire({
      icon: 'warning',
      title: '¿Archivar plantilla?',
      html: `Una plantilla archivada no se puede editar ni reactivar.<br/><strong>${nombre}</strong>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, archivar',
      confirmButtonColor: '#c41e3a',
    });
    if (!r.isConfirmed) return;
    try {
      await api.post(`/evaluaciones-mtm/surveys/${id}/archivar`);
      cargar();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo archivar.', confirmButtonColor: '#c41e3a' });
    }
  };

  if (editingId) {
    return (
      <SurveyMTMEditor
        surveyId={editingId}
        onVolver={() => { setEditingId(null); cargar(); }}
      />
    );
  }

  return (
    <div className="evmtm-adm">
      <div className="evmtm-adm__header">
        <div>
          <h2 className="evmtm-adm__title">Plantillas de evaluación MTM</h2>
          <p className="evmtm-adm__subtitle">
            Diseña los formularios para monitor, estudiantes asistentes y profesor responsable.
            Solo una plantilla puede estar activa a la vez.
          </p>
        </div>
        <div className="evmtm-adm__actions">
          {onVolver && (
            <button type="button" className="evmtm-adm__btn evmtm-adm__btn--ghost" onClick={onVolver}>
              ← Volver
            </button>
          )}
          {puedeConfigurar && (
            <button type="button" className="evmtm-adm__btn evmtm-adm__btn--primary" onClick={handleCrear}>
              + Nueva plantilla
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="evmtm-adm__loading">Cargando plantillas...</div>
      ) : items.length === 0 ? (
        <div className="evmtm-adm__empty">
          Aún no hay plantillas creadas.
          {puedeConfigurar && <> Empieza creando una con el botón <strong>+ Nueva plantilla</strong>.</>}
        </div>
      ) : (
        <table className="evmtm-adm__table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Activada</th>
              <th>Última actualización</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s._id}>
                <td>
                  <strong>{s.nombre}</strong>
                  {s.descripcion && <div style={{ color: '#475569', fontSize: '0.8rem' }}>{s.descripcion}</div>}
                </td>
                <td>
                  <span className={`evmtm-adm__badge evmtm-adm__badge--${s.estado}`}>{s.estado}</span>
                </td>
                <td>{s.activadaAt ? new Date(s.activadaAt).toLocaleDateString() : '—'}</td>
                <td>{s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '—'}</td>
                <td className="evmtm-adm__tools">
                  <button
                    type="button"
                    className="evmtm-adm__btn"
                    onClick={() => setEditingId(s._id)}
                  >
                    {s.estado === 'archivada' ? 'Ver' : 'Editar'}
                  </button>
                  {puedeConfigurar && s.estado !== 'activa' && s.estado !== 'archivada' && (
                    <button
                      type="button"
                      className="evmtm-adm__btn evmtm-adm__btn--primary"
                      onClick={() => handleActivar(s._id, s.nombre)}
                    >
                      Activar
                    </button>
                  )}
                  {puedeConfigurar && s.estado !== 'archivada' && (
                    <button
                      type="button"
                      className="evmtm-adm__btn evmtm-adm__btn--danger"
                      onClick={() => handleArchivar(s._id, s.nombre)}
                    >
                      Archivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
