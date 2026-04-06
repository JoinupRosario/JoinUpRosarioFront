import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import './ForcePasswordChangeModal.css';

/**
 * Modal bloqueante cuando el usuario debe cambiar la contraseña (primer acceso o reset administrativo).
 */
export default function ForcePasswordChangeModal() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!user?.debeCambiarPassword) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.put('/users/change-password', {
        currentPassword,
        newPassword,
      });
      const nextUser = data.user;
      if (nextUser) {
        updateUser(nextUser);
      } else {
        updateUser({ debeCambiarPassword: false });
      }

      const mod = String(nextUser?.modulo ?? user?.modulo ?? '')
        .trim()
        .toLowerCase();

      if (mod === 'entidades') {
        await Swal.fire({
          icon: 'success',
          title: 'Contraseña actualizada',
          html: 'Tu contraseña se actualizó correctamente.<br/>La sesión se cerrará; puedes volver a iniciar sesión cuando el acceso al portal esté disponible.',
          confirmButtonColor: '#c41e3a',
          confirmButtonText: 'Entendido',
        });
        logout();
        navigate('/login', { replace: true });
      } else {
        await Swal.fire({
          icon: 'success',
          title: 'Contraseña actualizada',
          text: 'Ya puedes continuar usando la plataforma.',
          confirmButtonColor: '#c41e3a',
          confirmButtonText: 'Aceptar',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'No se pudo actualizar la contraseña.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="force-password-overlay" role="dialog" aria-modal="true" aria-labelledby="force-password-title">
      <div className="force-password-card">
        <h2 id="force-password-title" className="force-password-title">
          Cambiar contraseña obligatorio
        </h2>
        <p className="force-password-desc">
          Por seguridad debes definir una nueva contraseña antes de continuar. Usa la contraseña actual
          (temporal o anterior) y elige una nueva.
        </p>
        <form onSubmit={handleSubmit} className="force-password-form">
          {error ? <div className="force-password-error">{error}</div> : null}
          <label className="force-password-label">
            Contraseña actual
            <input
              type="password"
              autoComplete="current-password"
              className="force-password-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={submitting}
            />
          </label>
          <label className="force-password-label">
            Nueva contraseña
            <input
              type="password"
              autoComplete="new-password"
              className="force-password-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              disabled={submitting}
            />
          </label>
          <label className="force-password-label">
            Confirmar nueva contraseña
            <input
              type="password"
              autoComplete="new-password"
              className="force-password-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              disabled={submitting}
            />
          </label>
          <button type="submit" className="force-password-submit" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Guardar nueva contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
