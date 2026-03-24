import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import apiPublic from '../services/apiPublic';
import './AsistenciaMTMPublic.css';
import './FirmaAcuerdoPracticaPublic.css';

const ROL_HINT = {
  practicante: 'Como practicante, confirme que acepta el acuerdo de vinculación.',
  escenario: 'Como representante del escenario de práctica, confirme el acuerdo.',
  universidad: 'Como Universidad del Rosario, confirme el acuerdo.',
};

export default function FirmaAcuerdoPracticaPublic() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  useEffect(() => {
    document.body.classList.add('asm-public-body');
    return () => document.body.classList.remove('asm-public-body');
  }, []);

  useEffect(() => {
    if (!token) {
      setError('Enlace inválido');
      setLoading(false);
      return;
    }
    apiPublic
      .get(`/acuerdos-vinculacion-practica/firma/${encodeURIComponent(token)}`)
      .then((r) => setInfo(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Enlace no válido o ya no está disponible.'))
      .finally(() => setLoading(false));
  }, [token]);

  const refrescar = () => {
    if (!token) return;
    apiPublic
      .get(`/acuerdos-vinculacion-practica/firma/${encodeURIComponent(token)}`)
      .then((r) => setInfo(r.data))
      .catch(() => {});
  };

  const aprobar = () => {
    if (!token) return;
    setSending(true);
    apiPublic
      .post(`/acuerdos-vinculacion-practica/firma/${encodeURIComponent(token)}/aprobar`)
      .then((r) => {
        Swal.fire({
          icon: 'success',
          title: 'Listo',
          text: r.data?.message || 'Su aprobación fue registrada.',
          confirmButtonColor: '#c41e3a',
        });
        refrescar();
      })
      .catch((e) =>
        Swal.fire({
          icon: 'error',
          title: 'No se pudo registrar',
          text: e.response?.data?.message || 'Intente de nuevo.',
          confirmButtonColor: '#c41e3a',
        })
      )
      .finally(() => setSending(false));
  };

  const rechazar = async () => {
    if (!token) return;
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: '¿Rechazar el acuerdo?',
      text: 'Esta acción marca el acuerdo como rechazado para todas las partes.',
      showCancelButton: true,
      confirmButtonText: 'Sí, rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b91c1c',
    });
    if (!isConfirmed) return;
    setSending(true);
    apiPublic
      .post(`/acuerdos-vinculacion-practica/firma/${encodeURIComponent(token)}/rechazar`, {
        motivo: motivoRechazo.trim() || undefined,
      })
      .then((r) => {
        Swal.fire({
          icon: 'info',
          title: 'Rechazo registrado',
          text: r.data?.message || '',
          confirmButtonColor: '#c41e3a',
        });
        refrescar();
      })
      .catch((e) =>
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: e.response?.data?.message || '',
          confirmButtonColor: '#c41e3a',
        })
      )
      .finally(() => setSending(false));
  };

  if (loading) {
    return (
      <div className="asm-public__loading firma-acuerdo-page">
        <div className="firma-acuerdo__spinner" aria-hidden />
        <p className="firma-acuerdo__loading-text">Cargando formulario de firma…</p>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="asm-public__error-wrap firma-acuerdo-page">
        <p className="asm-public__error firma-acuerdo__error-text">{error || 'Enlace no válido'}</p>
      </div>
    );
  }

  const ya = info.yaRespondio;
  const bloqueado = info.estadoAcuerdo !== 'pendiente_firmas';

  return (
    <div className="asm-public firma-acuerdo-page">
      <div className="asm-public__inner">
        <header className="firma-acuerdo__header">
          <div className="asm-public__brand">UR Jobs · Universidad del Rosario</div>
          <h1 className="asm-public__title">Acuerdo de vinculación</h1>
          <p className="firma-acuerdo__kicker">Firma electrónica del documento de práctica</p>
        </header>

        <section className="asm-public__card asm-public__card--info firma-acuerdo__role-card" aria-label="Rol en el acuerdo">
          <p className="firma-acuerdo__role-label">Usted firma como</p>
          <p className="firma-acuerdo__role-value">{info.rolEtiqueta}</p>
          <p className="firma-acuerdo__hint">{ROL_HINT[info.rol] || ''}</p>
        </section>

        <section className="asm-public__card firma-acuerdo__card-plain" aria-label="Datos del acuerdo">
          <h2 className="firma-acuerdo__section-title">Datos del acuerdo</h2>
          <dl className="asm-public__dl">
            <div className="asm-public__row">
              <dt className="asm-public__dt">Estudiante</dt>
              <dd className="asm-public__dd">{info.estudianteNombre}</dd>
            </div>
            <div className="asm-public__row">
              <dt className="asm-public__dt">Entidad / empresa</dt>
              <dd className="asm-public__dd">{info.empresa}</dd>
            </div>
            <div className="asm-public__row">
              <dt className="asm-public__dt">Cargo / práctica</dt>
              <dd className="asm-public__dd">{info.cargo}</dd>
            </div>
          </dl>
        </section>

        {bloqueado && (
          <div
            className={`firma-acuerdo__banner ${
              info.estadoAcuerdo === 'aprobado' ? 'firma-acuerdo__banner--success' : 'firma-acuerdo__banner--error'
            }`}
            role="status"
          >
            {info.estadoAcuerdo === 'aprobado' && 'Este acuerdo ya fue aprobado por las tres partes.'}
            {info.estadoAcuerdo === 'rechazado' && 'Este acuerdo fue rechazado o ya no admite firmas.'}
          </div>
        )}

        {ya && !bloqueado && (
          <div className="firma-acuerdo__banner firma-acuerdo__banner--success" role="status">
            {info.respuesta === 'aprobado' && 'Ya registró su aprobación. Gracias.'}
            {info.respuesta === 'rechazado' && `Ya registró un rechazo${info.motivoRechazo ? `: ${info.motivoRechazo}` : '.'}`}
          </div>
        )}

        {!ya && !bloqueado && (
          <div className="asm-public__form firma-acuerdo__form">
            <h2 className="firma-acuerdo__section-title">Confirmar decisión</h2>
            <label className="asm-public__field">
              <span className="asm-public__label">Motivo (opcional, solo si rechaza)</span>
              <textarea
                className="firma-acuerdo__textarea"
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                rows={3}
                placeholder="Escriba aquí si rechaza el acuerdo…"
              />
            </label>
            <div className="firma-acuerdo__actions">
              <button
                type="button"
                className="asm-public__submit firma-acuerdo__btn-approve"
                disabled={sending}
                onClick={aprobar}
              >
                {sending ? 'Enviando…' : 'Aprobar acuerdo'}
              </button>
              <button type="button" className="firma-acuerdo__btn-reject" disabled={sending} onClick={rechazar}>
                Rechazar
              </button>
            </div>
            <p className="firma-acuerdo__footnote">
              Si inicia sesión en UR Jobs con la misma cuenta en este navegador, el sistema podrá asociar su usuario a esta firma.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
