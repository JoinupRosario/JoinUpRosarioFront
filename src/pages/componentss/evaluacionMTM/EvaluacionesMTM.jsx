import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import './evaluacionMTM.css';

/**
 * Listado y detalle de evaluaciones MTM (RQ04_HU011).
 * Para coordinadores GuiARTE: ver estado por legalización, tokens emitidos,
 * respuestas recibidas y poder reenviar enlaces a quien aún no responde.
 */
export default function EvaluacionesMTM({ onVolver }) {
  const { hasPermission } = useAuth();
  const puedeProcesar = hasPermission('PESM') || hasPermission('AMMO');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState('');
  const [detalleId, setDetalleId] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const params = {};
      if (estado) params.estado = estado;
      const { data } = await api.get('/evaluaciones-mtm/evaluaciones', { params });
      setItems(data?.items || []);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo cargar.', confirmButtonColor: '#c41e3a' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [estado]);

  if (detalleId) {
    return (
      <EvaluacionDetalle
        evaluacionId={detalleId}
        puedeProcesar={puedeProcesar}
        onVolver={() => { setDetalleId(null); cargar(); }}
      />
    );
  }

  return (
    <div className="evmtm-adm">
      <div className="evmtm-adm__header">
        <div>
          <h2 className="evmtm-adm__title">Evaluaciones MTM</h2>
          <p className="evmtm-adm__subtitle">
            Seguimiento de las evaluaciones disparadas por cada legalización (paso 16 del flujo GuiARTE).
          </p>
        </div>
        {onVolver && (
          <button type="button" className="evmtm-adm__btn evmtm-adm__btn--ghost" onClick={onVolver}>← Volver</button>
        )}
      </div>

      <div className="evmtm-adm__filters">
        <select className="evmtm-adm__select" style={{ maxWidth: 220 }} value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="creada">Creada</option>
          <option value="enviada">Enviada</option>
          <option value="parcial">Parcial</option>
          <option value="completa">Completa</option>
        </select>
        <button type="button" className="evmtm-adm__btn" onClick={cargar}>Refrescar</button>
      </div>

      {loading ? (
        <div className="evmtm-adm__loading">Cargando evaluaciones...</div>
      ) : items.length === 0 ? (
        <div className="evmtm-adm__empty">
          No hay evaluaciones aún. Se generan automáticamente cuando un monitor solicita la finalización de su MTM.
        </div>
      ) : (
        <table className="evmtm-adm__table">
          <thead>
            <tr>
              <th>Monitoría</th>
              <th>Monitor</th>
              <th>Periodo</th>
              <th>Estado</th>
              <th>Monitor</th>
              <th>Profesor</th>
              <th>Estudiantes</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => {
              const monitor = e.postulacionMTM?.postulant?.postulantId;
              return (
                <tr key={e._id}>
                  <td><strong>{e.oportunidadMTM?.nombreCargo || '—'}</strong></td>
                  <td>
                    <div>{monitor?.name || '—'}</div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{monitor?.email || ''}</div>
                  </td>
                  <td>{e.oportunidadMTM?.periodo?.codigo || '—'}</td>
                  <td><span className={`evmtm-adm__badge evmtm-adm__badge--${e.estado}`}>{e.estado}</span></td>
                  <td>
                    <span className={`evmtm-adm__badge evmtm-adm__badge--${e.monitorRespondidoAt ? 'ok' : 'pendiente'}`}>
                      {e.monitorRespondidoAt ? 'Respondió' : 'Pendiente'}
                    </span>
                  </td>
                  <td>
                    <span className={`evmtm-adm__badge evmtm-adm__badge--${e.profesorRespondidoAt ? 'ok' : 'pendiente'}`}>
                      {e.profesorRespondidoAt ? 'Respondió' : 'Pendiente'}
                    </span>
                  </td>
                  <td>{e.totalEstudiantesRespondidos || 0} / {e.totalEstudiantesEsperados || 0}</td>
                  <td>
                    <button type="button" className="evmtm-adm__btn" onClick={() => setDetalleId(e._id)}>Ver detalle</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ────────────── Detalle de una evaluación ──────────────
function EvaluacionDetalle({ evaluacionId, puedeProcesar, onVolver }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [respuestaSel, setRespuestaSel] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/evaluaciones-mtm/evaluaciones/${evaluacionId}`);
      setData(res);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo cargar.', confirmButtonColor: '#c41e3a' });
      onVolver?.();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [evaluacionId]);

  const handleReenviar = async (tokenId, label) => {
    const r = await Swal.fire({
      icon: 'question',
      title: '¿Reenviar correo?',
      text: `Se enviará nuevamente el enlace a ${label}.`,
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      confirmButtonText: 'Reenviar',
    });
    if (!r.isConfirmed) return;
    try {
      await api.post(`/evaluaciones-mtm/evaluaciones/tokens/${tokenId}/reenviar`);
      Swal.fire({ icon: 'success', title: 'Reenviado', timer: 1400, showConfirmButton: false });
      cargar();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo reenviar', text: err.response?.data?.message || 'Intenta nuevamente.', confirmButtonColor: '#c41e3a' });
    }
  };

  const handleVerRespuesta = async (respuestaId) => {
    try {
      const { data: res } = await api.get(`/evaluaciones-mtm/evaluaciones/respuestas/${respuestaId}`);
      setRespuestaSel(res?.respuesta || null);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo cargar.', confirmButtonColor: '#c41e3a' });
    }
  };

  if (loading || !data) {
    return <div className="evmtm-adm"><div className="evmtm-adm__loading">Cargando detalle...</div></div>;
  }

  const { evaluacion, tokens = [], respuestas = [] } = data;
  const monitor = evaluacion.postulacionMTM?.postulant?.postulantId;
  const respuestasByToken = new Map(respuestas.map((r) => [String(r.identificadorActor) + '|' + r.actor, r]));

  return (
    <div className="evmtm-adm">
      <div className="evmtm-adm__header">
        <div>
          <h2 className="evmtm-adm__title">Evaluación · {evaluacion.oportunidadMTM?.nombreCargo}</h2>
          <p className="evmtm-adm__subtitle">
            <span className={`evmtm-adm__badge evmtm-adm__badge--${evaluacion.estado}`}>{evaluacion.estado}</span>
            {' '}· Periodo: {evaluacion.oportunidadMTM?.periodo?.codigo || '—'}
            {' '}· Monitor: {monitor?.name || '—'}
          </p>
        </div>
        <button type="button" className="evmtm-adm__btn evmtm-adm__btn--ghost" onClick={onVolver}>← Volver</button>
      </div>

      <div className="evmtm-adm__detalle-grid">
        <div className="evmtm-adm__detalle-item">
          <div className="evmtm-adm__detalle-label">Monitor</div>
          <div className="evmtm-adm__detalle-valor">{evaluacion.monitorRespondidoAt ? 'Respondió' : 'Pendiente'}</div>
        </div>
        <div className="evmtm-adm__detalle-item">
          <div className="evmtm-adm__detalle-label">Profesor</div>
          <div className="evmtm-adm__detalle-valor">{evaluacion.profesorRespondidoAt ? 'Respondió' : 'Pendiente'}</div>
        </div>
        <div className="evmtm-adm__detalle-item">
          <div className="evmtm-adm__detalle-label">Estudiantes</div>
          <div className="evmtm-adm__detalle-valor">
            {evaluacion.totalEstudiantesRespondidos || 0} / {evaluacion.totalEstudiantesEsperados || 0}
          </div>
        </div>
        <div className="evmtm-adm__detalle-item">
          <div className="evmtm-adm__detalle-label">Enviada</div>
          <div className="evmtm-adm__detalle-valor">
            {evaluacion.enviadaAt ? new Date(evaluacion.enviadaAt).toLocaleString() : '—'}
          </div>
        </div>
      </div>

      <div className="evmtm-adm__card">
        <h3 style={{ marginTop: 0 }}>Enlaces emitidos</h3>
        <table className="evmtm-adm__table">
          <thead>
            <tr>
              <th>Actor</th>
              <th>Destinatario</th>
              <th>Email</th>
              <th>Estado</th>
              <th>Reenvíos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tokens.length === 0 && (
              <tr><td colSpan="6" style={{ color: '#64748b' }}>No hay tokens generados para esta evaluación.</td></tr>
            )}
            {tokens.map((t) => {
              const respuesta = respuestasByToken.get(String(t.identificadorActor) + '|' + t.actor);
              return (
                <tr key={t._id}>
                  <td style={{ textTransform: 'capitalize' }}>{t.actor}</td>
                  <td>{t.nombreActor || '—'}</td>
                  <td>{t.email || <em style={{ color: '#b91c1c' }}>sin correo</em>}</td>
                  <td>
                    <span className={`evmtm-adm__badge evmtm-adm__badge--${t.usado ? 'ok' : 'pendiente'}`}>
                      {t.usado ? 'Respondido' : 'Pendiente'}
                    </span>
                  </td>
                  <td>{t.reenvios || 0}</td>
                  <td className="evmtm-adm__tools">
                    {respuesta && (
                      <button type="button" className="evmtm-adm__token-link" onClick={() => handleVerRespuesta(respuesta._id)}>
                        Ver respuesta
                      </button>
                    )}
                    {!t.usado && t.email && puedeProcesar && (
                      <button type="button" className="evmtm-adm__btn" onClick={() => handleReenviar(t._id, t.nombreActor || t.email)}>
                        Reenviar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {respuestaSel && (
        <div className="evmtm-adm__card">
          <div className="evmtm-adm__header">
            <div>
              <h3 style={{ margin: 0 }}>Respuesta de {respuestaSel.nombreActor || respuestaSel.email}</h3>
              <p className="evmtm-adm__subtitle" style={{ marginTop: 4 }}>
                Actor: <strong style={{ textTransform: 'capitalize' }}>{respuestaSel.actor}</strong>
                {respuestaSel.puntajePonderado != null && <> · Promedio ponderado: <strong>{respuestaSel.puntajePonderado}</strong></>}
              </p>
            </div>
            <button type="button" className="evmtm-adm__btn evmtm-adm__btn--ghost" onClick={() => setRespuestaSel(null)}>Cerrar</button>
          </div>
          {(respuestaSel.respuestas || []).map((r, i) => (
            <div key={i} className="evmtm-adm__respuesta">
              <div className="evmtm-adm__respuesta-pregunta">{r.preguntaTexto}</div>
              <div className="evmtm-adm__respuesta-valor">
                <strong>Respuesta:</strong> {formatearValor(r.valor)}
                {' '}· <span style={{ color: '#64748b', fontSize: '0.8rem' }}>(peso {r.peso ?? 1})</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatearValor(valor) {
  if (valor == null || valor === '') return <em style={{ color: '#94a3b8' }}>sin respuesta</em>;
  if (Array.isArray(valor)) return valor.join(', ');
  return String(valor);
}
