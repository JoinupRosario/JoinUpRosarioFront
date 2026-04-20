import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import './evaluacionMTM.css';

/**
 * Editor de una SurveyMTM. Trabaja con tres sub-formularios independientes
 * (monitor, estudiante, profesor), cada uno con preguntas tipadas y peso.
 * RQ04_HU011 — Coordinador general MTM.
 */

const TIPOS = [
  { value: 'texto', label: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'opcion_unica', label: 'Opción única' },
  { value: 'opcion_multiple', label: 'Opción múltiple' },
  { value: 'escala', label: 'Escala numérica' },
  { value: 'numero', label: 'Número' },
  { value: 'fecha', label: 'Fecha' },
];

const FORM_KEYS = [
  { key: 'monitor_form', label: 'Monitor (autoevaluación)' },
  { key: 'student_form', label: 'Estudiantes asistentes' },
  { key: 'teacher_form', label: 'Profesor responsable' },
];

function nuevaPregunta(orden) {
  return {
    _id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    _local: true,
    texto: 'Nueva pregunta',
    descripcion: '',
    tipo: 'escala',
    opciones: [],
    escalaMin: 1,
    escalaMax: 5,
    escalaLabelMin: 'Bajo',
    escalaLabelMax: 'Alto',
    peso: 1,
    requerida: true,
    orden,
  };
}

function limpiarPreguntas(preguntas) {
  return (preguntas || []).map((p) => {
    const out = { ...p };
    if (p._local) delete out._id;
    delete out._local;
    return out;
  });
}

export default function SurveyMTMEditor({ surveyId, onVolver }) {
  const { hasPermission } = useAuth();
  const puedeEditar = hasPermission('CESM') || hasPermission('AMMO');
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tabActiva, setTabActiva] = useState('monitor_form');

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/evaluaciones-mtm/surveys/${surveyId}`);
      setSurvey(data?.survey || null);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo cargar.', confirmButtonColor: '#c41e3a' });
      onVolver?.();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [surveyId]);

  const readonly = useMemo(
    () => !puedeEditar || survey?.estado === 'archivada',
    [puedeEditar, survey?.estado]
  );

  const setForm = (key, nuevoForm) => {
    setSurvey((s) => ({ ...s, [key]: nuevoForm }));
  };

  const formActual = survey?.[tabActiva] || { titulo: '', descripcion: '', preguntas: [] };

  const handleAddPregunta = () => {
    const orden = (formActual.preguntas || []).length;
    setForm(tabActiva, {
      ...formActual,
      preguntas: [...(formActual.preguntas || []), nuevaPregunta(orden)],
    });
  };

  const handleUpdatePregunta = (idx, patch) => {
    const next = (formActual.preguntas || []).map((p, i) => (i === idx ? { ...p, ...patch } : p));
    setForm(tabActiva, { ...formActual, preguntas: next });
  };

  const handleDeletePregunta = (idx) => {
    const next = (formActual.preguntas || []).filter((_, i) => i !== idx).map((p, i) => ({ ...p, orden: i }));
    setForm(tabActiva, { ...formActual, preguntas: next });
  };

  const handleMovePregunta = (idx, dir) => {
    const arr = [...(formActual.preguntas || [])];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    arr.forEach((p, i) => { p.orden = i; });
    setForm(tabActiva, { ...formActual, preguntas: arr });
  };

  const handleGuardar = async () => {
    if (!survey) return;
    setSaving(true);
    try {
      const payload = {
        nombre: survey.nombre,
        descripcion: survey.descripcion || '',
        monitor_form: {
          titulo: survey.monitor_form?.titulo || '',
          descripcion: survey.monitor_form?.descripcion || '',
          preguntas: limpiarPreguntas(survey.monitor_form?.preguntas),
        },
        student_form: {
          titulo: survey.student_form?.titulo || '',
          descripcion: survey.student_form?.descripcion || '',
          preguntas: limpiarPreguntas(survey.student_form?.preguntas),
        },
        teacher_form: {
          titulo: survey.teacher_form?.titulo || '',
          descripcion: survey.teacher_form?.descripcion || '',
          preguntas: limpiarPreguntas(survey.teacher_form?.preguntas),
        },
      };
      const { data } = await api.put(`/evaluaciones-mtm/surveys/${surveyId}`, payload);
      setSurvey(data?.survey || survey);
      Swal.fire({ icon: 'success', title: 'Guardado', timer: 1400, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar.', confirmButtonColor: '#c41e3a' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !survey) {
    return <div className="evmtm-adm"><div className="evmtm-adm__loading">Cargando plantilla...</div></div>;
  }

  return (
    <div className="evmtm-adm">
      <div className="evmtm-adm__header">
        <div>
          <h2 className="evmtm-adm__title">{survey.nombre}</h2>
          <p className="evmtm-adm__subtitle">
            <span className={`evmtm-adm__badge evmtm-adm__badge--${survey.estado}`}>{survey.estado}</span>
            {' '}· Diseña los formularios. El peso se usa para el promedio ponderado en reportes.
          </p>
        </div>
        <div className="evmtm-adm__actions">
          <button type="button" className="evmtm-adm__btn evmtm-adm__btn--ghost" onClick={onVolver}>← Volver</button>
          {!readonly && (
            <button type="button" className="evmtm-adm__btn evmtm-adm__btn--primary" onClick={handleGuardar} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          )}
        </div>
      </div>

      <div className="evmtm-adm__card">
        <div className="evmtm-adm__row">
          <div className="evmtm-adm__field">
            <label className="evmtm-adm__label">Nombre interno</label>
            <input
              type="text"
              className="evmtm-adm__input"
              value={survey.nombre || ''}
              onChange={(e) => setSurvey((s) => ({ ...s, nombre: e.target.value }))}
              disabled={readonly}
            />
          </div>
          <div className="evmtm-adm__field" style={{ gridColumn: 'span 2' }}>
            <label className="evmtm-adm__label">Descripción interna</label>
            <input
              type="text"
              className="evmtm-adm__input"
              value={survey.descripcion || ''}
              onChange={(e) => setSurvey((s) => ({ ...s, descripcion: e.target.value }))}
              disabled={readonly}
              placeholder="Notas internas (no se muestran al evaluador)"
            />
          </div>
        </div>
      </div>

      <div className="evmtm-adm__tabs">
        {FORM_KEYS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`evmtm-adm__tab ${tabActiva === t.key ? 'evmtm-adm__tab--active' : ''}`}
            onClick={() => setTabActiva(t.key)}
          >
            {t.label} ({(survey[t.key]?.preguntas || []).length})
          </button>
        ))}
      </div>

      <div className="evmtm-adm__card">
        <div className="evmtm-adm__row">
          <div className="evmtm-adm__field">
            <label className="evmtm-adm__label">Título (visible al evaluador)</label>
            <input
              type="text"
              className="evmtm-adm__input"
              value={formActual.titulo || ''}
              onChange={(e) => setForm(tabActiva, { ...formActual, titulo: e.target.value })}
              disabled={readonly}
            />
          </div>
          <div className="evmtm-adm__field" style={{ gridColumn: 'span 2' }}>
            <label className="evmtm-adm__label">Descripción / introducción</label>
            <input
              type="text"
              className="evmtm-adm__input"
              value={formActual.descripcion || ''}
              onChange={(e) => setForm(tabActiva, { ...formActual, descripcion: e.target.value })}
              disabled={readonly}
            />
          </div>
        </div>
      </div>

      {(formActual.preguntas || []).length === 0 && (
        <div className="evmtm-adm__empty">Aún no hay preguntas. Agrega una para empezar.</div>
      )}

      {(formActual.preguntas || []).map((p, idx) => (
        <PreguntaEditor
          key={p._id || idx}
          pregunta={p}
          idx={idx}
          total={formActual.preguntas.length}
          readonly={readonly}
          onUpdate={(patch) => handleUpdatePregunta(idx, patch)}
          onDelete={() => handleDeletePregunta(idx)}
          onMove={(dir) => handleMovePregunta(idx, dir)}
        />
      ))}

      {!readonly && (
        <button type="button" className="evmtm-adm__btn evmtm-adm__btn--secondary" onClick={handleAddPregunta}>
          + Agregar pregunta
        </button>
      )}
    </div>
  );
}

function PreguntaEditor({ pregunta, idx, total, readonly, onUpdate, onDelete, onMove }) {
  const tipoActual = pregunta.tipo;

  return (
    <div className="evmtm-adm__pregunta">
      <div className="evmtm-adm__pregunta-header">
        <p className="evmtm-adm__pregunta-titulo">Pregunta {idx + 1}</p>
        {!readonly && (
          <div className="evmtm-adm__pregunta-actions">
            <button type="button" className="evmtm-adm__btn" disabled={idx === 0} onClick={() => onMove(-1)}>↑</button>
            <button type="button" className="evmtm-adm__btn" disabled={idx === total - 1} onClick={() => onMove(1)}>↓</button>
            <button type="button" className="evmtm-adm__btn evmtm-adm__btn--danger" onClick={onDelete}>Eliminar</button>
          </div>
        )}
      </div>

      <div className="evmtm-adm__row">
        <div className="evmtm-adm__field" style={{ gridColumn: 'span 2' }}>
          <label className="evmtm-adm__label">Texto de la pregunta</label>
          <input
            type="text"
            className="evmtm-adm__input"
            value={pregunta.texto || ''}
            onChange={(e) => onUpdate({ texto: e.target.value })}
            disabled={readonly}
          />
        </div>
        <div className="evmtm-adm__field">
          <label className="evmtm-adm__label">Tipo</label>
          <select
            className="evmtm-adm__select"
            value={tipoActual}
            onChange={(e) => onUpdate({ tipo: e.target.value })}
            disabled={readonly}
          >
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="evmtm-adm__field">
        <label className="evmtm-adm__label">Descripción / ayuda (opcional)</label>
        <input
          type="text"
          className="evmtm-adm__input"
          value={pregunta.descripcion || ''}
          onChange={(e) => onUpdate({ descripcion: e.target.value })}
          disabled={readonly}
        />
      </div>

      <div className="evmtm-adm__row">
        <div className="evmtm-adm__field">
          <label className="evmtm-adm__label">Peso (para promedio ponderado)</label>
          <input
            type="number"
            min="0"
            step="0.5"
            className="evmtm-adm__input"
            value={pregunta.peso ?? 1}
            onChange={(e) => onUpdate({ peso: e.target.value === '' ? 1 : Number(e.target.value) })}
            disabled={readonly}
          />
        </div>
        <div className="evmtm-adm__field">
          <label className="evmtm-adm__label">Requerida</label>
          <select
            className="evmtm-adm__select"
            value={pregunta.requerida ? '1' : '0'}
            onChange={(e) => onUpdate({ requerida: e.target.value === '1' })}
            disabled={readonly}
          >
            <option value="1">Sí</option>
            <option value="0">No</option>
          </select>
        </div>
      </div>

      {(tipoActual === 'opcion_unica' || tipoActual === 'opcion_multiple') && (
        <OpcionesEditor
          opciones={pregunta.opciones || []}
          readonly={readonly}
          onChange={(opciones) => onUpdate({ opciones })}
        />
      )}

      {tipoActual === 'escala' && (
        <div className="evmtm-adm__row">
          <div className="evmtm-adm__field">
            <label className="evmtm-adm__label">Mínimo</label>
            <input
              type="number"
              className="evmtm-adm__input"
              value={pregunta.escalaMin ?? 1}
              onChange={(e) => onUpdate({ escalaMin: e.target.value === '' ? null : Number(e.target.value) })}
              disabled={readonly}
            />
          </div>
          <div className="evmtm-adm__field">
            <label className="evmtm-adm__label">Máximo</label>
            <input
              type="number"
              className="evmtm-adm__input"
              value={pregunta.escalaMax ?? 5}
              onChange={(e) => onUpdate({ escalaMax: e.target.value === '' ? null : Number(e.target.value) })}
              disabled={readonly}
            />
          </div>
          <div className="evmtm-adm__field">
            <label className="evmtm-adm__label">Etiqueta mínimo</label>
            <input
              type="text"
              className="evmtm-adm__input"
              value={pregunta.escalaLabelMin || ''}
              onChange={(e) => onUpdate({ escalaLabelMin: e.target.value })}
              disabled={readonly}
            />
          </div>
          <div className="evmtm-adm__field">
            <label className="evmtm-adm__label">Etiqueta máximo</label>
            <input
              type="text"
              className="evmtm-adm__input"
              value={pregunta.escalaLabelMax || ''}
              onChange={(e) => onUpdate({ escalaLabelMax: e.target.value })}
              disabled={readonly}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function OpcionesEditor({ opciones, readonly, onChange }) {
  const handleAdd = () => {
    onChange([...(opciones || []), { texto: 'Nueva opción', valor: null }]);
  };
  const handleUpdate = (idx, patch) => {
    onChange(opciones.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  };
  const handleRemove = (idx) => {
    onChange(opciones.filter((_, i) => i !== idx));
  };
  return (
    <div style={{ marginTop: '0.7rem' }}>
      <label className="evmtm-adm__label" style={{ display: 'block', marginBottom: '0.4rem' }}>
        Opciones (texto y valor numérico opcional para promedio ponderado)
      </label>
      {(opciones || []).map((op, i) => (
        <div key={op._id || i} className="evmtm-adm__opcion-row">
          <input
            type="text"
            className="evmtm-adm__input"
            value={op.texto || ''}
            onChange={(e) => handleUpdate(i, { texto: e.target.value })}
            placeholder={`Opción ${i + 1}`}
            disabled={readonly}
          />
          <input
            type="number"
            className="evmtm-adm__input evmtm-adm__opcion-valor"
            value={op.valor ?? ''}
            onChange={(e) => handleUpdate(i, { valor: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="Valor"
            disabled={readonly}
          />
          {!readonly && (
            <button type="button" className="evmtm-adm__btn evmtm-adm__btn--danger" onClick={() => handleRemove(i)}>
              ✕
            </button>
          )}
        </div>
      ))}
      {!readonly && (
        <button type="button" className="evmtm-adm__btn" onClick={handleAdd}>+ Agregar opción</button>
      )}
    </div>
  );
}
