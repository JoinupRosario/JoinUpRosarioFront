import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';
import '../App.css';

export default function AsistenciaMTMPublic() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(null);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    nombreActividad: '',
    nombresEstudiante: '',
    apellidosEstudiante: '',
    identificacionEstudiante: '',
    programaEstudiante: '',
  });

  useEffect(() => {
    if (!token) {
      setError('Link inválido');
      setLoading(false);
      return;
    }
    api.get(`/oportunidades-mtm/asistencia-publica/${token}/form`)
      .then((r) => setFormData(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Link no válido o expirado'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const { nombreActividad, nombresEstudiante, apellidosEstudiante, identificacionEstudiante, programaEstudiante } = form;
    if (!nombreActividad?.trim() || !nombresEstudiante?.trim() || !apellidosEstudiante?.trim() || !identificacionEstudiante?.trim()) {
      Swal.fire({ icon: 'warning', title: 'Datos requeridos', text: 'Complete nombre de actividad, nombres, apellidos e identificación.', confirmButtonColor: '#c41e3a' });
      return;
    }
    setSending(true);
    api.post(`/oportunidades-mtm/asistencia-publica/${token}/registrar`, {
      nombreActividad: nombreActividad.trim(),
      nombresEstudiante: nombresEstudiante.trim(),
      apellidosEstudiante: apellidosEstudiante.trim(),
      identificacionEstudiante: identificacionEstudiante.trim(),
      programaEstudiante: (programaEstudiante || '').trim() || undefined,
    })
      .then(() => {
        setForm({ nombreActividad: '', nombresEstudiante: '', apellidosEstudiante: '', identificacionEstudiante: '', programaEstudiante: '' });
        Swal.fire({ icon: 'success', title: 'Asistencia registrada', text: 'Su asistencia fue registrada correctamente.', confirmButtonColor: '#c41e3a' });
      })
      .catch((e) => Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo registrar.', confirmButtonColor: '#c41e3a' }))
      .finally(() => setSending(false));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <p>Cargando...</p>
      </div>
    );
  }
  if (error || !formData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#b91c1c', marginBottom: 16 }}>{error || 'Link no válido'}</p>
        </div>
      </div>
    );
  }

  const actividades = formData.actividades || [];

  return (
    <div style={{ minHeight: '100vh', padding: 24, maxWidth: 560, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Registro de asistencia</h1>
        <div style={{ color: '#6b7280', fontSize: '0.92rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <p style={{ margin: 0 }}><strong>Código monitoría:</strong> {formData.codigoMonitoria || '—'}</p>
          <p style={{ margin: '4px 0 0 0' }}><strong>Monitor:</strong> {formData.nombreMonitor || '—'}</p>
          <p style={{ margin: '4px 0 0 0' }}><strong>Identificación monitor:</strong> {formData.identificacionMonitor || '—'}</p>
          <p style={{ margin: '4px 0 0 0' }}><strong>Correo monitor:</strong> {formData.correoMonitor || '—'}</p>
          <p style={{ margin: '4px 0 0 0' }}><strong>Coordinador:</strong> {formData.nombreCoordinador || '—'}</p>
          <p style={{ margin: '4px 0 0 0' }}><strong>Periodo académico:</strong> {formData.periodoAcademico || '—'}</p>
          <p style={{ margin: '4px 0 0 0' }}><strong>Actividad MTM:</strong> {formData.nombreActividadMTM || '—'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ background: '#f9fafb', padding: 24, borderRadius: 12 }}>
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Nombre de la actividad *</span>
          {actividades.length > 0 ? (
            <select
              required
              value={form.nombreActividad}
              onChange={(e) => setForm((f) => ({ ...f, nombreActividad: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
            >
              <option value="">Seleccione la actividad</option>
              {actividades.map((tema) => (
                <option key={tema} value={tema}>{tema}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              required
              value={form.nombreActividad}
              onChange={(e) => setForm((f) => ({ ...f, nombreActividad: e.target.value }))}
              placeholder="Nombre de la actividad"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
            />
          )}
        </label>
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Nombres del estudiante *</span>
          <input
            type="text"
            required
            value={form.nombresEstudiante}
            onChange={(e) => setForm((f) => ({ ...f, nombresEstudiante: e.target.value }))}
            placeholder="Nombres"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Apellidos del estudiante *</span>
          <input
            type="text"
            required
            value={form.apellidosEstudiante}
            onChange={(e) => setForm((f) => ({ ...f, apellidosEstudiante: e.target.value }))}
            placeholder="Apellidos"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Identificación del estudiante *</span>
          <input
            type="text"
            required
            value={form.identificacionEstudiante}
            onChange={(e) => setForm((f) => ({ ...f, identificacionEstudiante: e.target.value }))}
            placeholder="Número de identificación"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 20 }}>
          <span style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Programa del estudiante</span>
          <input
            type="text"
            value={form.programaEstudiante}
            onChange={(e) => setForm((f) => ({ ...f, programaEstudiante: e.target.value }))}
            placeholder="Programa académico"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
          />
        </label>
        <button type="submit" disabled={sending} style={{ padding: '10px 24px', background: '#c41e3a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer' }}>
          {sending ? 'Registrando...' : 'Registrar asistencia'}
        </button>
      </form>
    </div>
  );
}
