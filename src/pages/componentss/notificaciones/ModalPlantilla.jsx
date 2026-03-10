import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  FiChevronRight,
  FiChevronLeft,
  FiCheck,
  FiX,
} from 'react-icons/fi';
import '../../styles/notificaciones.css';

const STEPS = ['Parámetro / plantilla a crear', 'Asunto y contenido', 'Revisar y guardar'];

// Barra de herramientas del editor tipo Word: negrita, cursiva, tachado, alineación, listas, enlace
const QUILL_MODULES = {
  toolbar: [
    ['bold', 'italic', 'strike'],
    [{ align: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};

const QUILL_FORMATS = [
  'bold', 'italic', 'strike', 'align',
  'list', 'bullet',
  'link',
];

const FRECUENCIAS = [
  { value: 'inmediato', label: 'Inmediato' },
  { value: 'diario', label: 'Diario' },
  { value: 'semanal', label: 'Semanal' },
];

export default function ModalPlantilla({
  open,
  tipo,
  parametros,
  savedPlantillas,
  editingItem,
  onSave,
  onClose,
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [selectedParametro, setSelectedParametro] = useState(null);
  const [frecuencia, setFrecuencia] = useState('inmediato');
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');

  const isEditing = !!editingItem;

  // Parámetros de parametrosPlantilla: sin plantilla creada, o el que se está editando
  const parametrosDisponibles = (parametros || []).filter(
    (p) => !savedPlantillas[p._id] || (editingItem && String(p._id) === String(editingItem.parametroId))
  );

  useEffect(() => {
    if (!open) return;
    if (editingItem) {
      const fullParam = (parametros || []).find((p) => String(p._id) === String(editingItem.parametroId));
      setSelectedParametro(fullParam || { _id: editingItem.parametroId, value: editingItem.value, nombre: editingItem.nombre });
      setAsunto(editingItem.asunto || '');
      setCuerpo(editingItem.cuerpo || '');
      setStep(isEditing ? 1 : 0);
    } else {
      setSelectedParametro(null);
      setAsunto('');
      setCuerpo('');
      setStep(0);
    }
  }, [open, editingItem, isEditing, parametros]);

  const handleClose = () => {
    setStep(0);
    setSelectedParametro(null);
    setFrecuencia('inmediato');
    setAsunto('');
    setCuerpo('');
    onClose();
  };

  const canNextStep = () => {
    if (step === 0) return !!selectedParametro;
    if (step === 1) return asunto.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1 && canNextStep()) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleGuardar = () => {
    if (!selectedParametro || !asunto.trim()) return;
    setSaving(true);
    try {
      onSave({
        parametroId: selectedParametro._id,
        value: selectedParametro.value,
        nombre: selectedParametro.nombre,
        frecuencia: frecuencia,
        asunto: asunto.trim(),
        cuerpo: cuerpo.trim(),
      });
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="pn-modal-overlay" onClick={handleClose}>
      <div className="pn-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pn-modal-header">
          <h3>{isEditing ? 'Editar plantilla de notificación' : 'Crear plantilla de notificación'}</h3>
          <button type="button" className="pn-modal-close" onClick={handleClose}><FiX /></button>
        </div>

        <div className="pn-stepper">
          {STEPS.map((label, i) => (
            <div key={i} className={`pn-stepper-item ${i < step ? 'pn-stepper-done' : i === step ? 'pn-stepper-active' : ''}`}>
              <div className="pn-stepper-dot">
                {i < step ? <FiCheck /> : i + 1}
              </div>
              <span className="pn-stepper-label">{label}</span>
              {i < STEPS.length - 1 && <div className="pn-stepper-line" />}
            </div>
          ))}
        </div>

        <div className="pn-modal-body">
          {step === 0 && (
            <div className="pn-step-content">
              <p className="pn-step-desc">Seleccione el parámetro (parametrosPlantilla). El nombre se usará como nombre de la plantilla.</p>
              <div className="pn-form-group">
                <label>Parámetro / plantilla que desea crear *</label>
                <select
                  className="pn-select"
                  value={selectedParametro ? String(selectedParametro._id) : ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) {
                      setSelectedParametro(null);
                      return;
                    }
                    const p = parametrosDisponibles.find((x) => String(x._id) === id);
                    setSelectedParametro(p || null);
                  }}
                >
                  <option value="">Seleccione un parámetro...</option>
                  {parametrosDisponibles.map((p) => (
                    <option key={p._id} value={String(p._id)}>
                      {p.nombre || p.value}
                    </option>
                  ))}
                </select>
                {parametrosDisponibles.length === 0 && (
                  <p className="pn-step-desc" style={{ marginTop: 8 }}>
                    No hay parámetros.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 1 && selectedParametro && (
            <div className="pn-step-content">
              <p className="pn-step-desc">Parámetro / plantilla: <strong>{selectedParametro.nombre || selectedParametro.value}</strong></p>

              <div className="pn-form-group">
                <label>Frecuencia *</label>
                <select
                  className="pn-select"
                  value={frecuencia}
                  onChange={(e) => setFrecuencia(e.target.value)}
                >
                  {FRECUENCIAS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <p className="pn-step-desc" style={{ marginTop: 6, marginBottom: 0 }}>
                  Define cuándo se enviará el correo: al instante, resumen diario o resumen semanal.
                </p>
              </div>

              {selectedParametro.variables && selectedParametro.variables.length > 0 && (
                <div className="pn-variables-box">
                  <p className="pn-variables-title">Variables disponibles para esta plantilla</p>
                  <p className="pn-variables-explicacion">
                    Al ejecutarse la acción, el sistema enviará el correo y reemplazará cada variable por el dato real. Escriba el nombre tal cual en asunto o cuerpo (entre corchetes).
                  </p>
                  <div className="pn-variables-grid">
                    {selectedParametro.variables.map((v) => (
                      <div key={v.variable} className="pn-variable-item">
                        <code className="pn-variable-codigo">{v.variable}</code>
                        <span className="pn-variable-desc">{v.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pn-form-group">
                <label>Asunto del correo *</label>
                <input
                  type="text"
                  className="pn-input"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                />
              </div>
              <div className="pn-form-group">
                <label>Cuerpo del correo</label>
                <div className="pn-editor-wrap">
                  <ReactQuill
                    theme="snow"
                    value={cuerpo}
                    onChange={setCuerpo}
                    modules={QUILL_MODULES}
                    formats={QUILL_FORMATS}
                    placeholder="Escriba el contenido. Use negrita, cursiva, listas y enlaces según necesite. Incluya variables como [NOMBRE_ESTUDIANTE], [PROGRAMA], [LINK], etc."
                    className="pn-quill-editor"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && selectedParametro && (
            <div className="pn-step-content">
              <p className="pn-step-desc">Revisa los datos antes de guardar.</p>
              <div className="pn-review-box">
                <div className="pn-review-row">
                  <span className="pn-review-label">Parámetro / plantilla</span>
                  <span className="pn-review-value">{selectedParametro.nombre || selectedParametro.value}</span>
                </div>
                <div className="pn-review-row">
                  <span className="pn-review-label">Frecuencia</span>
                  <span className="pn-review-value">{FRECUENCIAS.find((f) => f.value === frecuencia)?.label || frecuencia}</span>
                </div>
                <div className="pn-review-row">
                  <span className="pn-review-label">Asunto</span>
                  <span className="pn-review-value">{asunto || '—'}</span>
                </div>
                <div className="pn-review-row pn-review-body">
                  <span className="pn-review-label">Cuerpo</span>
                  <div className="pn-review-value pn-review-cuerpo" dangerouslySetInnerHTML={{ __html: cuerpo || '—' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pn-modal-footer">
          <button type="button" className="pn-btn-secondary" onClick={step === 0 ? handleClose : handleBack}>
            {step === 0 ? 'Cancelar' : <><FiChevronLeft /> Anterior</>}
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="pn-btn-primary" onClick={handleNext} disabled={!canNextStep()}>
              Siguiente <FiChevronRight />
            </button>
          ) : (
            <button type="button" className="pn-btn-primary" onClick={handleGuardar} disabled={saving || !asunto.trim()}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
