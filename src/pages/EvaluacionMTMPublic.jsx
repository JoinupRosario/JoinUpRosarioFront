import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';
import logoUniversidad from '../assets/icons/logo.svg';
import './EvaluacionMTMPublic.css';

/**
 * Página pública (sin auth) para que monitor/profesor/estudiante respondan su
 * evaluación MTM a través del link enviado por correo. RQ04_HU011 paso 16.
 */
export default function EvaluacionMTMPublic() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [respuestas, setRespuestas] = useState({});

  useEffect(() => {
    document.body.classList.add('evmtm-public-body');
    return () => document.body.classList.remove('evmtm-public-body');
  }, []);

  useEffect(() => {
    if (!token) {
      setError('Link inválido');
      setLoading(false);
      return;
    }
    api.get(`/evaluaciones-mtm/publico/${token}`)
      .then((r) => {
        setData(r.data);
        const ini = {};
        (r.data?.formulario?.preguntas || []).forEach((p) => {
          ini[p._id] = p.tipo === 'opcion_multiple' ? [] : '';
        });
        setRespuestas(ini);
      })
      .catch((e) => setError(e.response?.data?.message || 'Link no válido o expirado'))
      .finally(() => setLoading(false));
  }, [token]);

  const preguntas = useMemo(
    () => (data?.formulario?.preguntas || []).slice().sort((a, b) => (a.orden || 0) - (b.orden || 0)),
    [data]
  );

  const setValor = (preguntaId, valor) => {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: valor }));
  };

  const toggleOpcionMultiple = (preguntaId, optValor) => {
    setRespuestas((prev) => {
      const arr = Array.isArray(prev[preguntaId]) ? prev[preguntaId] : [];
      const nuevo = arr.includes(optValor) ? arr.filter((x) => x !== optValor) : [...arr, optValor];
      return { ...prev, [preguntaId]: nuevo };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const faltantes = preguntas.filter((p) => {
      if (!p.requerida) return false;
      const v = respuestas[p._id];
      if (v == null) return true;
      if (typeof v === 'string' && v.trim() === '') return true;
      if (Array.isArray(v) && v.length === 0) return true;
      return false;
    });
    if (faltantes.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Preguntas pendientes',
        text: `Falta responder: ${faltantes.map((p) => `"${p.texto}"`).join(', ')}`,
        confirmButtonColor: '#c41e3a',
      });
      return;
    }
    setSending(true);
    try {
      const payload = {
        respuestas: preguntas.map((p) => ({
          preguntaId: p._id,
          valor: respuestas[p._id],
        })),
      };
      await api.post(`/evaluaciones-mtm/publico/${token}/responder`, payload);
      setDone(true);
      Swal.fire({
        icon: 'success',
        title: '¡Gracias!',
        text: 'Tu evaluación fue registrada correctamente.',
        confirmButtonColor: '#c41e3a',
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo enviar',
        text: err.response?.data?.message || 'Intenta nuevamente más tarde.',
        confirmButtonColor: '#c41e3a',
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="evmtm-public__loading"><p>Cargando evaluación...</p></div>;
  }
  if (error || !data) {
    return (
      <div className="evmtm-public__error-wrap">
        <p className="evmtm-public__error">{error || 'No se pudo cargar la evaluación.'}</p>
      </div>
    );
  }

  const actorLabel = {
    monitor: 'Autoevaluación del monitor',
    profesor: 'Evaluación del docente',
    estudiante: 'Evaluación del estudiante asistente',
  }[data.actor] || 'Evaluación MTM';

  return (
    <div className="evmtm-public">
      <div className="evmtm-public__inner">
        <div className="evmtm-public__logo-wrap">
          <img
            src={logoUniversidad}
            alt="Universidad del Rosario"
            className="evmtm-public__logo"
          />
        </div>
        <div className="evmtm-public__brand">UR Jobs · Evaluación MTM</div>
        <h1 className="evmtm-public__title">{actorLabel}</h1>
        <p className="evmtm-public__subtitle">
          {data.formulario?.titulo ||
            'Tu opinión nos ayuda a fortalecer el programa GuiARTE de monitorías, tutorías y mentorías.'}
        </p>

        <section className="evmtm-public__card">
          <div className="evmtm-public__info">
            <div className="evmtm-public__info-row">
              <span className="evmtm-public__info-label">Destinatario</span>
              <span>{data.destinatario?.nombre || '—'}</span>
            </div>
            <div className="evmtm-public__info-row">
              <span className="evmtm-public__info-label">Correo</span>
              <span>{data.destinatario?.email || '—'}</span>
            </div>
            <div className="evmtm-public__info-row">
              <span className="evmtm-public__info-label">MTM</span>
              <span>{data.contexto?.nombreMonitoria || '—'}</span>
            </div>
            <div className="evmtm-public__info-row">
              <span className="evmtm-public__info-label">Periodo</span>
              <span>{data.contexto?.periodo || '—'}</span>
            </div>
          </div>
        </section>

        {done ? (
          <div className="evmtm-public__success">
            ¡Evaluación enviada! Ya puedes cerrar esta ventana.
          </div>
        ) : (
          <form className="evmtm-public__form" onSubmit={handleSubmit}>
            {preguntas.length === 0 && (
              <div className="evmtm-public__card">
                <p>No hay preguntas configuradas para este formulario.</p>
              </div>
            )}
            {preguntas.map((p) => (
              <PreguntaInput
                key={p._id}
                pregunta={p}
                valor={respuestas[p._id]}
                onChange={(v) => setValor(p._id, v)}
                onToggleMultiple={(opt) => toggleOpcionMultiple(p._id, opt)}
              />
            ))}
            {preguntas.length > 0 && (
              <button type="submit" className="evmtm-public__submit" disabled={sending}>
                {sending ? 'Enviando...' : 'Enviar evaluación'}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function PreguntaInput({ pregunta, valor, onChange, onToggleMultiple }) {
  const id = `q-${pregunta._id}`;

  if (pregunta.tipo === 'texto') {
    return (
      <div className="evmtm-public__pregunta">
        <p className="evmtm-public__pregunta-titulo">
          {pregunta.texto}
          {pregunta.requerida && <span className="evmtm-public__req">*</span>}
        </p>
        {pregunta.descripcion && <p className="evmtm-public__pregunta-desc">{pregunta.descripcion}</p>}
        <input
          id={id}
          type="text"
          className="evmtm-public__input"
          value={valor || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  if (pregunta.tipo === 'textarea') {
    return (
      <div className="evmtm-public__pregunta">
        <p className="evmtm-public__pregunta-titulo">
          {pregunta.texto}
          {pregunta.requerida && <span className="evmtm-public__req">*</span>}
        </p>
        {pregunta.descripcion && <p className="evmtm-public__pregunta-desc">{pregunta.descripcion}</p>}
        <textarea
          id={id}
          className="evmtm-public__textarea"
          value={valor || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  if (pregunta.tipo === 'opcion_unica') {
    return (
      <div className="evmtm-public__pregunta">
        <p className="evmtm-public__pregunta-titulo">
          {pregunta.texto}
          {pregunta.requerida && <span className="evmtm-public__req">*</span>}
        </p>
        {pregunta.descripcion && <p className="evmtm-public__pregunta-desc">{pregunta.descripcion}</p>}
        <div className="evmtm-public__opciones">
          {(pregunta.opciones || []).map((op) => {
            const v = op.valor != null ? String(op.valor) : op.texto;
            return (
              <label key={String(op._id || v)} className="evmtm-public__opcion">
                <input
                  type="radio"
                  name={id}
                  checked={String(valor || '') === String(v)}
                  onChange={() => onChange(v)}
                />
                {op.texto}
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (pregunta.tipo === 'opcion_multiple') {
    const arr = Array.isArray(valor) ? valor : [];
    return (
      <div className="evmtm-public__pregunta">
        <p className="evmtm-public__pregunta-titulo">
          {pregunta.texto}
          {pregunta.requerida && <span className="evmtm-public__req">*</span>}
        </p>
        {pregunta.descripcion && <p className="evmtm-public__pregunta-desc">{pregunta.descripcion}</p>}
        <div className="evmtm-public__opciones">
          {(pregunta.opciones || []).map((op) => {
            const v = op.valor != null ? String(op.valor) : op.texto;
            return (
              <label key={String(op._id || v)} className="evmtm-public__opcion">
                <input
                  type="checkbox"
                  checked={arr.map(String).includes(String(v))}
                  onChange={() => onToggleMultiple(v)}
                />
                {op.texto}
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (pregunta.tipo === 'escala') {
    const min = Number.isFinite(pregunta.escalaMin) ? pregunta.escalaMin : 1;
    const max = Number.isFinite(pregunta.escalaMax) ? pregunta.escalaMax : 5;
    const items = [];
    for (let i = min; i <= max; i += 1) items.push(i);
    return (
      <div className="evmtm-public__pregunta">
        <p className="evmtm-public__pregunta-titulo">
          {pregunta.texto}
          {pregunta.requerida && <span className="evmtm-public__req">*</span>}
        </p>
        {pregunta.descripcion && <p className="evmtm-public__pregunta-desc">{pregunta.descripcion}</p>}
        <div className="evmtm-public__escala">
          {pregunta.escalaLabelMin && <span className="evmtm-public__escala-label">{pregunta.escalaLabelMin}</span>}
          {items.map((n) => {
            const active = Number(valor) === n;
            return (
              <button
                key={n}
                type="button"
                className={`evmtm-public__escala-btn ${active ? 'evmtm-public__escala-btn--active' : ''}`}
                onClick={() => onChange(n)}
              >
                {n}
              </button>
            );
          })}
          {pregunta.escalaLabelMax && <span className="evmtm-public__escala-label">{pregunta.escalaLabelMax}</span>}
        </div>
      </div>
    );
  }

  if (pregunta.tipo === 'numero') {
    return (
      <div className="evmtm-public__pregunta">
        <p className="evmtm-public__pregunta-titulo">
          {pregunta.texto}
          {pregunta.requerida && <span className="evmtm-public__req">*</span>}
        </p>
        {pregunta.descripcion && <p className="evmtm-public__pregunta-desc">{pregunta.descripcion}</p>}
        <input
          id={id}
          type="number"
          className="evmtm-public__input"
          value={valor ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      </div>
    );
  }

  if (pregunta.tipo === 'fecha') {
    return (
      <div className="evmtm-public__pregunta">
        <p className="evmtm-public__pregunta-titulo">
          {pregunta.texto}
          {pregunta.requerida && <span className="evmtm-public__req">*</span>}
        </p>
        {pregunta.descripcion && <p className="evmtm-public__pregunta-desc">{pregunta.descripcion}</p>}
        <input
          id={id}
          type="date"
          className="evmtm-public__input"
          value={valor || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  return null;
}
