import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';
import './AsistenciaMTMPublic.css';

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
    document.body.classList.add('asm-public-body');
    return () => document.body.classList.remove('asm-public-body');
  }, []);

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
      <div className="asm-public__loading">
        <p>Cargando...</p>
      </div>
    );
  }
  if (error || !formData) {
    return (
      <div className="asm-public__error-wrap">
        <p className="asm-public__error">{error || 'Link no válido'}</p>
      </div>
    );
  }

  const actividades = formData.actividades || [];

  return (
    <div className="asm-public">
      <div className="asm-public__inner">
        <div className="asm-public__brand">UR Jobs · Asistencia MTM</div>
        <h1 className="asm-public__title">Registro de asistencia</h1>

        <section className="asm-public__card asm-public__card--info" aria-label="Datos de la monitoría">
          <dl className="asm-public__dl">
            <div className="asm-public__row">
              <dt className="asm-public__dt">Código monitoría</dt>
              <dd className="asm-public__dd">{formData.codigoMonitoria || '—'}</dd>
            </div>
            <div className="asm-public__row">
              <dt className="asm-public__dt">Monitor</dt>
              <dd className="asm-public__dd">{formData.nombreMonitor || '—'}</dd>
            </div>
            <div className="asm-public__row">
              <dt className="asm-public__dt">Identificación monitor</dt>
              <dd className="asm-public__dd">{formData.identificacionMonitor || '—'}</dd>
            </div>
            <div className="asm-public__row">
              <dt className="asm-public__dt">Correo monitor</dt>
              <dd className="asm-public__dd">{formData.correoMonitor || '—'}</dd>
            </div>
            <div className="asm-public__row">
              <dt className="asm-public__dt">Coordinador</dt>
              <dd className="asm-public__dd">{formData.nombreCoordinador || '—'}</dd>
            </div>
            <div className="asm-public__row">
              <dt className="asm-public__dt">Periodo académico</dt>
              <dd className="asm-public__dd">{formData.periodoAcademico || '—'}</dd>
            </div>
            <div className="asm-public__row">
              <dt className="asm-public__dt">Actividad MTM</dt>
              <dd className="asm-public__dd">{formData.nombreActividadMTM || '—'}</dd>
            </div>
          </dl>
        </section>

        <form className="asm-public__form" onSubmit={handleSubmit}>
          <label className="asm-public__field">
            <span className="asm-public__label">
              Nombre de la actividad <span className="asm-public__req">*</span>
            </span>
            {actividades.length > 0 ? (
              <select
                required
                className="asm-public__select"
                value={form.nombreActividad}
                onChange={(e) => setForm((f) => ({ ...f, nombreActividad: e.target.value }))}
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
                className="asm-public__input"
                value={form.nombreActividad}
                onChange={(e) => setForm((f) => ({ ...f, nombreActividad: e.target.value }))}
                placeholder="Nombre de la actividad"
              />
            )}
          </label>
          <label className="asm-public__field">
            <span className="asm-public__label">
              Nombres del estudiante <span className="asm-public__req">*</span>
            </span>
            <input
              type="text"
              required
              className="asm-public__input"
              value={form.nombresEstudiante}
              onChange={(e) => setForm((f) => ({ ...f, nombresEstudiante: e.target.value }))}
              placeholder="Nombres"
              autoComplete="given-name"
            />
          </label>
          <label className="asm-public__field">
            <span className="asm-public__label">
              Apellidos del estudiante <span className="asm-public__req">*</span>
            </span>
            <input
              type="text"
              required
              className="asm-public__input"
              value={form.apellidosEstudiante}
              onChange={(e) => setForm((f) => ({ ...f, apellidosEstudiante: e.target.value }))}
              placeholder="Apellidos"
              autoComplete="family-name"
            />
          </label>
          <label className="asm-public__field">
            <span className="asm-public__label">
              Identificación del estudiante <span className="asm-public__req">*</span>
            </span>
            <input
              type="text"
              required
              className="asm-public__input"
              value={form.identificacionEstudiante}
              onChange={(e) => setForm((f) => ({ ...f, identificacionEstudiante: e.target.value }))}
              placeholder="Número de identificación"
              autoComplete="off"
            />
          </label>
          <label className="asm-public__field">
            <span className="asm-public__label">Programa del estudiante</span>
            <input
              type="text"
              className="asm-public__input"
              value={form.programaEstudiante}
              onChange={(e) => setForm((f) => ({ ...f, programaEstudiante: e.target.value }))}
              placeholder="Programa académico (opcional)"
            />
          </label>
          <button type="submit" className="asm-public__submit" disabled={sending}>
            {sending ? 'Registrando...' : 'Registrar asistencia'}
          </button>
        </form>
      </div>
    </div>
  );
}
