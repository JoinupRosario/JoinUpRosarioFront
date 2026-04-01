import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import apiPublic from '../services/apiPublic';
import './AsistenciaMTMPublic.css';

export default function CertificacionPracticaPublic() {
  const { token } = useParams();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

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
      .get(`/certificacion-practica-public/${encodeURIComponent(token)}`)
      .then((r) => setInfo(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Enlace no disponible.'))
      .finally(() => setLoading(false));
  }, [token]);

  const subir = () => {
    const f = fileRef.current?.files?.[0];
    if (!f || !token) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', f);
    apiPublic.post(`/certificacion-practica-public/${encodeURIComponent(token)}/documento`, fd)
      .then(() => {
        Swal.fire({ icon: 'success', title: 'Enviado', text: 'Certificación recibida.', confirmButtonColor: '#c41e3a' });
        if (fileRef.current) fileRef.current.value = '';
        return apiPublic.get(`/certificacion-practica-public/${encodeURIComponent(token)}`);
      })
      .then((r) => r && setInfo(r.data))
      .catch((e) => Swal.fire({ icon: 'error', text: e.response?.data?.message || 'No se pudo subir.' }))
      .finally(() => setUploading(false));
  };

  if (loading) {
    return (
      <div className="asm-public-wrap">
        <p>Cargando…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="asm-public-wrap">
        <p style={{ color: '#b91c1c' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="asm-public-wrap" style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: '1.25rem', marginBottom: 12 }}>Cargue de certificación de práctica</h1>
      <p style={{ color: '#444', marginBottom: 16 }}>
        <strong>Entidad:</strong> {info?.empresa} — <strong>Cargo:</strong> {info?.cargo}
      </p>
      {info?.fechaLimiteCarga && (
        <p style={{ fontSize: 14, marginBottom: 12 }}>
          Fecha límite sugerida: {new Date(info.fechaLimiteCarga).toLocaleString('es-CO')}
        </p>
      )}
      {info?.yaCargado ? (
        <p style={{ background: '#ecfdf5', padding: 12, borderRadius: 8 }}>Ya registramos un documento para esta práctica. Gracias.</p>
      ) : (
        <>
          <p className="legalizacion-mtm__hint" style={{ marginBottom: 12 }}>
            Adjunte el PDF u otro documento de certificación emitido por la entidad.
          </p>
          <input ref={fileRef} type="file" accept=".pdf,application/pdf" />
          <div style={{ marginTop: 12 }}>
            <button type="button" className="asm-public-btn-primary" disabled={uploading} onClick={subir}>
              {uploading ? 'Enviando…' : 'Enviar certificación'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
