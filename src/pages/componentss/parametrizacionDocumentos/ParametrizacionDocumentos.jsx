import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiFileText,
  FiSave,
  FiUpload,
  FiX,
  FiMenu,
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import '../../styles/ParametrizacionDocumentos.css';

const TABS = [
  { key: 'hoja-vida', label: 'Hoja de vida', icon: FiFileText },
];

/** Secciones de la hoja de vida según HU (formato y obligatorios). key alineado con backend CvFormat. */
const SECCIONES_HOJA_VIDA = [
  { key: 'datos_basicos', label: 'Datos básicos (nombre, documento, correo, teléfono, dirección)' },
  { key: 'cedula', label: 'Cédula de ciudadanía (archivo soporte)' },
  { key: 'perfil', label: 'Perfil profesional (nombre perfil, texto perfil, competencias, idiomas)' },
  { key: 'formacion_rosario_en_curso', label: 'Formación académica Rosario - En curso' },
  { key: 'formacion_rosario_finalizada', label: 'Formación académica Rosario - Finalizada' },
  { key: 'formacion_en_curso_otras', label: 'Formación académica en curso (otras instituciones)' },
  { key: 'formacion_finalizada_otras', label: 'Formación académica finalizada (otras instituciones)' },
  { key: 'otros_estudios', label: 'Otros estudios' },
  { key: 'experiencia_laboral', label: 'Experiencia laboral' },
  { key: 'otras_experiencias', label: 'Otras experiencias (investigación, voluntariado, proyección social)' },
  { key: 'logros', label: 'Logros' },
  { key: 'referencias', label: 'Referencias' },
];

const DEFAULT_FORMAT_SECTIONS = SECCIONES_HOJA_VIDA.map((s, i) => ({
  key: s.key,
  label: s.label,
  visible: true,
  order: i + 1,
}));

export default function ParametrizacionDocumentos({ onVolver }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('hoja-vida');

  /** Campos obligatorios: conjunto de keys que el admin marca como de diligenciamiento obligatorio (HU). */
  const [camposObligatorios, setCamposObligatorios] = useState(() =>
    ['datos_basicos', 'perfil'].reduce((acc, k) => ({ ...acc, [k]: true }), {})
  );

  /** Formato: secciones con orden y visibilidad para la generación del PDF (HU). */
  const [formatSecciones, setFormatSecciones] = useState(DEFAULT_FORMAT_SECTIONS);

  /** Logo: preview (data URL), archivo nuevo si hay, y base64 guardado en servidor (para reenviar si no se cambia). */
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoBase64Saved, setLogoBase64Saved] = useState(null);
  const logoInputRef = useRef(null);

  const [loadingParametrizacion, setLoadingParametrizacion] = useState(true);
  const [savingParametrizacion, setSavingParametrizacion] = useState(false);
  const [errorParametrizacion, setErrorParametrizacion] = useState(null);

  const MAX_LOGO_MB = 5;

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorParametrizacion('El logo debe ser una imagen (PNG, JPG o SVG).');
      return;
    }
    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      setErrorParametrizacion(`El logo no debe superar ${MAX_LOGO_MB} MB.`);
      return;
    }
    setErrorParametrizacion(null);
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleLogoRemove = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoBase64Saved(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const toggleObligatorio = (key) => {
    setCamposObligatorios((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /** Índice de la sección que se está arrastrando (null si no hay drag). */
  const [dragIndex, setDragIndex] = useState(null);

  const handleSeccionDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
  };

  const handleSeccionDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSeccionDrop = (e, dropIndex) => {
    e.preventDefault();
    if (dragIndex == null) return;
    if (dragIndex === dropIndex) {
      setDragIndex(null);
      return;
    }
    const newOrder = [...formatSecciones];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, removed);
    setFormatSecciones(newOrder.map((s, i) => ({ ...s, order: i + 1 })));
    setDragIndex(null);
  };

  const handleSeccionDragEnd = () => {
    setDragIndex(null);
  };

  const toggleVisibleSeccion = (key) => {
    setFormatSecciones((prev) =>
      prev.map((s) => (s.key === key ? { ...s, visible: !s.visible } : s))
    );
  };

  /** Cargar parametrización hoja de vida al montar. */
  useEffect(() => {
    if (activeTab !== 'hoja-vida') return;
    let cancelled = false;
    setLoadingParametrizacion(true);
    setErrorParametrizacion(null);
    api
      .get('/parametrizacion-documentos/hoja-vida')
      .then((res) => {
        if (cancelled) return;
        const data = res.data || {};
        if (data.camposObligatorios && typeof data.camposObligatorios === 'object') {
          setCamposObligatorios(data.camposObligatorios);
        }
        if (Array.isArray(data.formatSecciones) && data.formatSecciones.length > 0) {
          const withLabels = data.formatSecciones.map((s) => {
            const def = SECCIONES_HOJA_VIDA.find((d) => d.key === s.key);
            return { ...s, label: def?.label ?? s.label ?? s.key };
          });
          setFormatSecciones(withLabels);
        }
        if (data.logoBase64) {
          setLogoBase64Saved(data.logoBase64);
          setLogoPreview(data.logoBase64);
        } else {
          setLogoBase64Saved(null);
          setLogoPreview(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setErrorParametrizacion(err.response?.data?.message || 'Error al cargar la parametrización.');
      })
      .finally(() => {
        if (!cancelled) setLoadingParametrizacion(false);
      });
    return () => { cancelled = true; };
  }, [activeTab]);

  const handleGuardar = () => {
    setErrorParametrizacion(null);
    const visibleCount = formatSecciones.filter((s) => s.visible).length;
    if (visibleCount === 0) {
      setErrorParametrizacion('Debe tener al menos una sección visible en el PDF.');
      return;
    }
    setSavingParametrizacion(true);
    const resolveLogoBase64 = () => {
      if (logoFile) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(logoFile);
        });
      }
      return Promise.resolve(logoBase64Saved);
    };
    resolveLogoBase64()
      .then((logoBase64) => {
        return api.put('/parametrizacion-documentos/hoja-vida', {
          logoBase64: logoBase64 || null,
          formatSecciones,
          camposObligatorios,
        });
      })
      .then((res) => {
        const data = res.data || {};
        if (data.logoBase64) {
          setLogoBase64Saved(data.logoBase64);
          setLogoPreview(data.logoBase64);
          setLogoFile(null);
          if (logoInputRef.current) logoInputRef.current.value = '';
        }
        setErrorParametrizacion(null);
        Swal.fire({ icon: 'success', title: 'Guardado', text: 'Configuración guardada correctamente.', confirmButtonColor: '#c41e3a' });
      })
      .catch((err) => {
        setErrorParametrizacion(err.response?.data?.message || 'Error al guardar.');
      })
      .finally(() => setSavingParametrizacion(false));
  };

  return (
    <div className="param-docs-container">
      <div className="param-docs-header">
        <button className="btn-volver" onClick={onVolver}>
          <FiArrowLeft className="btn-icon" />
          Volver
        </button>
      </div>

      <div className="param-docs-intro">
          <p>
            Desde aquí puede configurar los <strong>documentos y el formato de la hoja de vida</strong> según lo definido para el sistema:
            definir qué secciones son de diligenciamiento obligatorio para el estudiante, y el orden y la visibilidad de las secciones en el PDF generado.
          </p>
        </div>

        <div className="param-docs-tabs">
          {TABS.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                className={`param-docs-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <IconComponent className="param-docs-tab-icon" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="param-docs-panel">
          {activeTab === 'hoja-vida' && (
            <div className="param-docs-tab-content param-docs-hoja-vida">
              {loadingParametrizacion && <p className="param-docs-loading">Cargando configuración…</p>}
              {errorParametrizacion && (
                <div className="param-docs-error" role="alert">
                  {errorParametrizacion}
                </div>
              )}
              {/* 0. Logo de la hoja de vida (aparece en el PDF generado) */}
              <section className="param-docs-block param-docs-block--logo">
                <h4 className="param-docs-block-title">Logo de la hoja de vida</h4>
                <p className="param-docs-block-desc">
                  Logo institucional para el PDF (encabezado). PNG o JPG, máx. 5 MB.
                </p>
                <div className="param-docs-logo-zone">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={handleLogoChange}
                    className="param-docs-logo-input"
                    id="param-docs-logo-file"
                  />
                  {logoPreview ? (
                    <div className="param-docs-logo-preview-wrap">
                      <img src={logoPreview} alt="Vista previa logo hoja de vida" className="param-docs-logo-preview" />
                      <div className="param-docs-logo-meta">
                        {logoFile?.name && <span className="param-docs-logo-filename">{logoFile.name}</span>}
                        <button type="button" className="param-docs-logo-remove" onClick={handleLogoRemove} title="Quitar logo">
                          <FiX /> Quitar logo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="param-docs-logo-file" className="param-docs-logo-upload-label">
                      <FiUpload className="param-docs-logo-upload-icon" />
                      <span>Haga clic para cargar el logo</span>
                      <span className="param-docs-logo-upload-hint">PNG, JPG o SVG. Máx. 5 MB</span>
                    </label>
                  )}
                </div>
              </section>

              {/* 1. Campos de diligenciamiento obligatorio (HU) */}
              <section className="param-docs-block">
                <h4 className="param-docs-block-title">Campos de diligenciamiento obligatorio</h4>
                <p className="param-docs-block-desc">
                  Marque las secciones que el estudiante debe completar de forma obligatoria para poder generar o enviar la hoja de vida.
                </p>
                <ul className="param-docs-checklist">
                  {SECCIONES_HOJA_VIDA.map(({ key, label }) => (
                    <li key={key} className="param-docs-checklist-item">
                      <label className="param-docs-checkbox-label">
                        <input
                          type="checkbox"
                          checked={!!camposObligatorios[key]}
                          onChange={() => toggleObligatorio(key)}
                          className="param-docs-checkbox"
                        />
                        <span>{label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>

              {/* 2. Formato de la hoja de vida: secciones y orden (HU) */}
              <section className="param-docs-block">
                <h4 className="param-docs-block-title">Formato de la hoja de vida (secciones y orden)</h4>
                <p className="param-docs-block-desc">
                  Defina el orden de las secciones en el PDF y qué secciones incluir. Arrastre cada fila para reordenar.
                </p>
                <div className="param-docs-format-list">
                  {formatSecciones.map((seccion, index) => (
                    <div
                      key={seccion.key}
                      data-index={index}
                      draggable
                      onDragStart={(e) => handleSeccionDragStart(e, index)}
                      onDragOver={handleSeccionDragOver}
                      onDrop={(e) => handleSeccionDrop(e, index)}
                      onDragEnd={handleSeccionDragEnd}
                      className={`param-docs-format-row ${!seccion.visible ? 'param-docs-format-row--hidden' : ''} ${dragIndex === index ? 'param-docs-format-row--dragging' : ''}`}
                    >
                      <span className="param-docs-format-drag-handle" title="Arrastrar para reordenar">
                        <FiMenu />
                      </span>
                      <span className="param-docs-format-order">{seccion.order}</span>
                      <span className="param-docs-format-label">{seccion.label}</span>
                      <div className="param-docs-format-actions">
                        <label className="param-docs-format-visible">
                          <input
                            type="checkbox"
                            checked={seccion.visible}
                            onChange={() => toggleVisibleSeccion(seccion.key)}
                          />
                          <span>Visible en PDF</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>


              <div className="param-docs-footer-actions">
                <button
                  type="button"
                  className="param-docs-btn-save"
                  onClick={handleGuardar}
                  disabled={loadingParametrizacion || savingParametrizacion}
                >
                  <FiSave className="btn-icon" />
                  {savingParametrizacion ? 'Guardando…' : 'Guardar configuración'}
                </button>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
