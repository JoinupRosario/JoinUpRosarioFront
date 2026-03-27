import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import Select, { createFilter } from 'react-select';
import 'react-quill/dist/quill.snow.css';
import {
  FiChevronRight,
  FiChevronLeft,
  FiCheck,
  FiX,
} from 'react-icons/fi';
import api from '../../../services/api';
import '../../styles/notificaciones.css';

const STEPS = ['El evento', 'Asunto y contenido', 'Revisar y guardar'];

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

const selectSearchFilter = createFilter({
  ignoreCase: true,
  ignoreAccents: true,
  matchFrom: 'any',
});

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
  const [catalogVariables, setCatalogVariables] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedVariableKeys, setSelectedVariableKeys] = useState([]);
  const [rolesCatalog, setRolesCatalog] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [selectedDestinatarios, setSelectedDestinatarios] = useState([]);

  const isEditing = !!editingItem;

  // Eventos disponibles: sin plantilla creada, o el que se está editando
  const parametrosDisponibles = (parametros || []).filter(
    (p) => !savedPlantillas[p._id] || (editingItem && String(p._id) === String(editingItem.parametroId))
  );

  useEffect(() => {
    if (!open) return;
    if (editingItem) {
      const fullParam = (parametros || []).find((p) => String(p._id) === String(editingItem.parametroId));
      setSelectedParametro(fullParam || { _id: editingItem.parametroId, value: editingItem.value, nombre: editingItem.nombre });
      setFrecuencia(editingItem.frecuencia || 'inmediato');
      setAsunto(editingItem.asunto || '');
      setCuerpo(editingItem.cuerpo || '');
      setStep(isEditing ? 1 : 0);
      setSelectedVariableKeys(editingItem.selectedVariableKeys || []);
      setSelectedDestinatarios(editingItem.destinatarios || []);
    } else {
      setSelectedParametro(null);
      setAsunto('');
      setCuerpo('');
      setStep(0);
      setSelectedVariableKeys([]);
      setSelectedDestinatarios([]);
    }
  }, [open, editingItem, isEditing, parametros]);

  // Cargar catálogo de variables al abrir el modal (orden alfabético por etiqueta)
  useEffect(() => {
    if (!open) return;
    setCatalogLoading(true);
    api.get('/notification-variables').then((res) => {
      const list = res.data?.data ?? res.data ?? [];
      const arr = Array.isArray(list) ? list : [];
      arr.sort((a, b) => (a.label || a.key || '').localeCompare(b.label || b.key || '', 'es'));
      setCatalogVariables(arr);
    }).catch(() => setCatalogVariables([])).finally(() => setCatalogLoading(false));
  }, [open]);

  // Roles del sistema (destinatarios = usuarios con ese rol asignado en administrativos)
  useEffect(() => {
    if (!open) return;
    setRolesLoading(true);
    api
      .get('/roles?estado=activos&limit=100')
      .then((res) => {
        const list = res.data?.data ?? res.data ?? [];
        setRolesCatalog(Array.isArray(list) ? list : []);
      })
      .catch(() => setRolesCatalog([]))
      .finally(() => setRolesLoading(false));
  }, [open]);

  const labelDestinatario = (idOrKey) =>
    rolesCatalog.find((r) => String(r._id) === String(idOrKey))?.nombre || idOrKey;

  const handleClose = () => {
    setStep(0);
    setSelectedParametro(null);
    setFrecuencia('inmediato');
    setAsunto('');
    setCuerpo('');
    setSelectedVariableKeys([]);
    setSelectedDestinatarios([]);
    onClose();
  };

  const canNextStep = () => {
    if (step === 0) return !!selectedParametro && selectedDestinatarios.length > 0;
    if (step === 1) return asunto.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1 && canNextStep()) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleGuardar = async () => {
    if (!selectedParametro || !asunto.trim()) return;
    setSaving(true);
    try {
      const selectedVariables = selectedVariableKeys.map((k) => {
        const v = catalogVariables.find((c) => (c.key || '').toUpperCase() === k);
        return { variable: `[${k}]`, desc: v?.label || k };
      });
      const payload = {
        parametroId: selectedParametro._id,
        value: selectedParametro.value,
        nombre: selectedParametro.nombre,
        frecuencia: frecuencia,
        asunto: asunto.trim(),
        cuerpo: cuerpo.trim(),
        selectedVariableKeys: selectedVariableKeys,
        selectedVariables,
        destinatarios: selectedDestinatarios,
      };
      if (editingItem?._id) payload._id = editingItem._id;
      await Promise.resolve(onSave(payload));
      // El padre cierra el modal en onSave (handleCloseModal)
    } catch (err) {
      console.error('Error al guardar plantilla:', err);
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
              <p className="pn-step-desc">Seleccione el evento y a quiénes irá dirigida la notificación.</p>
              <div className="pn-form-group">
                <label>El evento *</label>
                <Select
                  isSearchable
                  isClearable
                  filterOption={selectSearchFilter}
                  placeholder="Buscar o seleccionar evento..."
                  options={parametrosDisponibles.map((p) => ({
                    value: String(p._id),
                    label: p.nombre || p.value || String(p._id),
                  }))}
                  value={
                    selectedParametro
                      ? {
                          value: String(selectedParametro._id),
                          label: selectedParametro.nombre || selectedParametro.value || String(selectedParametro._id),
                        }
                      : null
                  }
                  onChange={(opt) => {
                    if (!opt) {
                      setSelectedParametro(null);
                      return;
                    }
                    const p = parametrosDisponibles.find((x) => String(x._id) === String(opt.value));
                    setSelectedParametro(p || null);
                  }}
                  isDisabled={parametrosDisponibles.length === 0}
                  className="pn-select-variables"
                  classNamePrefix="pn-select"
                  noOptionsMessage={() => 'No hay eventos disponibles.'}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 1100 }) }}
                />
                {parametrosDisponibles.length === 0 && (
                  <p className="pn-step-desc" style={{ marginTop: 8 }}>
                    No hay eventos.
                  </p>
                )}
              </div>

              {selectedParametro && (
                <div className="pn-form-group">
                  <label>Destinatarios de la notificación *</label>
                  <Select
                    isMulti
                    isSearchable
                    filterOption={selectSearchFilter}
                    closeMenuOnSelect={false}
                    placeholder={rolesLoading ? 'Cargando roles...' : 'Buscar o seleccionar roles...'}
                    options={rolesCatalog.map((r) => ({
                      value: String(r._id),
                      label: r.nombre || String(r._id),
                    }))}
                    value={selectedDestinatarios.map((key) => ({
                      value: key,
                      label: labelDestinatario(key),
                    }))}
                    onChange={(selected) => setSelectedDestinatarios((selected || []).map((s) => s.value))}
                    isDisabled={rolesLoading}
                    className="pn-select-variables"
                    classNamePrefix="pn-select"
                    noOptionsMessage={() =>
                      'No hay roles activos o no tienes permiso para listarlos (AMRO / LRO).'
                    }
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 1100 }) }}
                  />
                  <p className="pn-step-desc" style={{ marginTop: 6, marginBottom: 0 }}>
                    Se enviará a todos los usuarios administrativos activos que tengan el rol seleccionado.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 1 && selectedParametro && (
            <div className="pn-step-content">
              <p className="pn-step-desc">Evento: <strong>{selectedParametro.nombre || selectedParametro.value}</strong></p>

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

              <div className="pn-form-group">
                <label>Variables para esta plantilla</label>
                <Select
                  isMulti
                  isSearchable
                  filterOption={selectSearchFilter}
                  closeMenuOnSelect={false}
                  placeholder={catalogLoading ? 'Cargando variables...' : 'Buscar o seleccionar variables...'}
                  options={catalogVariables.map((v) => ({
                    value: (v.key || '').toUpperCase(),
                    label: `[${(v.key || '').toUpperCase()}] ${v.label || v.key || ''}`,
                  }))}
                  value={selectedVariableKeys.map((k) => {
                    const v = catalogVariables.find((c) => (c.key || '').toUpperCase() === k);
                    return { value: k, label: `[${k}] ${v?.label || k}` };
                  })}
                  onChange={(selected) => setSelectedVariableKeys((selected || []).map((s) => s.value))}
                  isDisabled={catalogLoading}
                  className="pn-select-variables"
                  classNamePrefix="pn-select"
                  noOptionsMessage={() => 'No hay variables en el catálogo. Ejecuta el seeder de notification-variables en el backend.'}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 1100 }) }}
                />
              </div>

              <div className="pn-variables-box">
                <p className="pn-variables-title">Variables disponibles para esta plantilla</p>
                <p className="pn-variables-explicacion">
                  Al ejecutarse la acción, el sistema enviará el correo y reemplazará cada variable por el dato real. Escriba el nombre tal cual en asunto o cuerpo (entre corchetes).
                </p>
                {selectedVariableKeys.length > 0 ? (
                  <div className="pn-variables-grid">
                    {selectedVariableKeys.map((key) => {
                      const v = catalogVariables.find((c) => (c.key || '').toUpperCase() === key);
                      const label = v?.label || key;
                      return (
                        <div key={key} className="pn-variable-item">
                          <code className="pn-variable-codigo">[{key}]</code>
                          <span className="pn-variable-desc">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="pn-variables-empty">Seleccione variables arriba para ver aquí cómo escribirlas en asunto y cuerpo.</p>
                )}
              </div>

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
                  <span className="pn-review-label">Evento</span>
                  <span className="pn-review-value">{selectedParametro.nombre || selectedParametro.value}</span>
                </div>
                <div className="pn-review-row">
                  <span className="pn-review-label">Destinatarios</span>
                  <span className="pn-review-value">
                    {selectedDestinatarios.length > 0
                      ? selectedDestinatarios.map((key) => labelDestinatario(key)).join(', ')
                      : '—'}
                  </span>
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
