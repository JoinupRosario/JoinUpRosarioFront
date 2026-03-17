import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiFileText,
  FiMail,
  FiSave,
  FiUpload,
  FiX,
  FiMenu,
  FiEye,
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import '../../styles/ParametrizacionDocumentos.css';

const TABS = [
  { key: 'hoja-vida', label: 'Hoja de vida', icon: FiFileText },
  { key: 'carta-presentacion', label: 'Carta de presentación', icon: FiMail },
  { key: 'acuerdo-vinculacion', label: 'Acuerdo de vinculación', icon: FiFileText },
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

/** RQ04_HU003: Secciones de la carta de presentación (parametrizable). */
const SECCIONES_CARTA_PRESENTACION = [
  { key: 'datos_remitente', label: 'Datos del remitente (nombre, documento, correo, teléfono)' },
  { key: 'datos_destinatario', label: 'Datos del destinatario (área/empresa)' },
  { key: 'cargo_area_interes', label: 'Cargo o área de interés' },
  { key: 'texto_carta', label: 'Texto de la carta (cuerpo)' },
  { key: 'cierre_firma', label: 'Cierre y firma' },
];

const DEFAULT_FORMAT_SECTIONS_CARTA = SECCIONES_CARTA_PRESENTACION.map((s, i) => ({
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

  /** Carta de presentación: firma (imagen) y textos del bloque de firma (nombre, cargo, unidad). */
  const [firmaPreview, setFirmaPreview] = useState(null);
  const [firmaFile, setFirmaFile] = useState(null);
  const [firmaBase64Saved, setFirmaBase64Saved] = useState(null);
  const [firmaDatos, setFirmaDatos] = useState({ nombre: '', cargo: '', unidad: '' });
  const firmaInputRef = useRef(null);

  /** Carta: bloques de texto (legacy, se mantiene por compatibilidad). */
  const [bloquesTexto, setBloquesTexto] = useState([]);
  const [dragIndexBloques, setDragIndexBloques] = useState(null);

  /** Carta: textos internos (usted escribe). El resto se completa con datos del postulante. */
  const [textosInternos, setTextosInternos] = useState({ encabezado: '', cuerpo: '', cierre: '' });
  /** Carta: si incluir fecha y cómo (fecha_actual / fecha_elegible / ninguna). */
  const [opcionFechaCarta, setOpcionFechaCarta] = useState('fecha_actual');

  /** Acuerdo de vinculación: logo + textos legales */
  const [acuerdoLogoPreview, setAcuerdoLogoPreview] = useState(null);
  const [acuerdoLogoFile, setAcuerdoLogoFile] = useState(null);
  const [acuerdoLogoBase64Saved, setAcuerdoLogoBase64Saved] = useState(null);
  const [textosLegalesAcuerdo, setTextosLegalesAcuerdo] = useState('');
  const acuerdoLogoInputRef = useRef(null);
  const [loadingPreviewAcuerdo, setLoadingPreviewAcuerdo] = useState(false);

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

  const handleFirmaChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorParametrizacion('La firma debe ser una imagen (PNG, JPG o SVG).');
      return;
    }
    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      setErrorParametrizacion(`La imagen de firma no debe superar ${MAX_LOGO_MB} MB.`);
      return;
    }
    setErrorParametrizacion(null);
    setFirmaFile(file);
    const reader = new FileReader();
    reader.onload = () => setFirmaPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleFirmaRemove = () => {
    setFirmaFile(null);
    setFirmaPreview(null);
    setFirmaBase64Saved(null);
    if (firmaInputRef.current) firmaInputRef.current.value = '';
  };

  const updateFirmaDatos = (field, value) => {
    setFirmaDatos((prev) => ({ ...prev, [field]: value }));
  };

  const updateTextosInternos = (field, value) => {
    setTextosInternos((prev) => ({ ...prev, [field]: value }));
  };

  const addBloqueTexto = () => {
    const key = `bloque_${Date.now()}`;
    setBloquesTexto((prev) => [
      ...prev,
      { key, titulo: '', contenido: '', order: prev.length + 1, visible: true },
    ]);
  };

  const removeBloqueTexto = (index) => {
    setBloquesTexto((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((b, i) => ({ ...b, order: i + 1 }));
    });
  };

  const updateBloqueTexto = (index, field, value) => {
    setBloquesTexto((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  };

  const handleBloqueDragStart = (e, index) => {
    setDragIndexBloques(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleBloqueDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleBloqueDrop = (e, dropIndex) => {
    e.preventDefault();
    if (dragIndexBloques == null) return;
    if (dragIndexBloques === dropIndex) {
      setDragIndexBloques(null);
      return;
    }
    setBloquesTexto((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(dragIndexBloques, 1);
      copy.splice(dropIndex, 0, removed);
      return copy.map((b, i) => ({ ...b, order: i + 1 }));
    });
    setDragIndexBloques(null);
  };

  const handleBloqueDragEnd = () => {
    setDragIndexBloques(null);
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

  const handleAcuerdoLogoChange = (e) => {
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
    setAcuerdoLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setAcuerdoLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleAcuerdoLogoRemove = () => {
    setAcuerdoLogoFile(null);
    setAcuerdoLogoPreview(null);
    setAcuerdoLogoBase64Saved(null);
    if (acuerdoLogoInputRef.current) acuerdoLogoInputRef.current.value = '';
  };

  const handleVistaPreviaAcuerdo = async () => {
    setLoadingPreviewAcuerdo(true);
    setErrorParametrizacion(null);
    try {
      let logoBase64 = acuerdoLogoBase64Saved;
      if (acuerdoLogoFile) {
        logoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(acuerdoLogoFile);
        });
      }
      const res = await api.post('/parametrizacion-documentos/acuerdo-vinculacion/preview', {
        logoBase64: logoBase64 || null,
        textosLegalesAcuerdo: textosLegalesAcuerdo.trim() || null,
      }, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setErrorParametrizacion(err.response?.data?.message || 'No se pudo generar la vista previa.');
    } finally {
      setLoadingPreviewAcuerdo(false);
    }
  };

  const toggleVisibleSeccion = (key) => {
    setFormatSecciones((prev) =>
      prev.map((s) => (s.key === key ? { ...s, visible: !s.visible } : s))
    );
  };

  /** Cargar parametrización al cambiar de tab. */
  useEffect(() => {
    let endpoint = '/parametrizacion-documentos/hoja-vida';
    if (activeTab === 'carta-presentacion') endpoint = '/parametrizacion-documentos/carta-presentacion';
    if (activeTab === 'acuerdo-vinculacion') endpoint = '/parametrizacion-documentos/acuerdo-vinculacion';
    const seccionesDef = activeTab === 'carta-presentacion' ? SECCIONES_CARTA_PRESENTACION : SECCIONES_HOJA_VIDA;
    const defaultFormat = activeTab === 'carta-presentacion' ? DEFAULT_FORMAT_SECTIONS_CARTA : DEFAULT_FORMAT_SECTIONS;
    const isAcuerdo = activeTab === 'acuerdo-vinculacion';
    let cancelled = false;
    setLoadingParametrizacion(true);
    setErrorParametrizacion(null);
    if (isAcuerdo) {
      api.get(endpoint)
        .then((res) => {
          if (cancelled) return;
          const data = res.data || {};
          setAcuerdoLogoBase64Saved(data.logoBase64 ?? null);
          setAcuerdoLogoPreview(data.logoBase64 ?? null);
          setTextosLegalesAcuerdo(typeof data.textosLegalesAcuerdo === 'string' ? data.textosLegalesAcuerdo : (data.textosLegalesAcuerdo ? JSON.stringify(data.textosLegalesAcuerdo, null, 2) : ''));
        })
        .catch((err) => { if (!cancelled) setErrorParametrizacion(err.response?.data?.message || 'Error al cargar.'); })
        .finally(() => { if (!cancelled) setLoadingParametrizacion(false); });
      return () => { cancelled = true; };
    }
    api
      .get(endpoint)
      .then((res) => {
        if (cancelled) return;
        const data = res.data || {};
        if (data.camposObligatorios && typeof data.camposObligatorios === 'object') {
          setCamposObligatorios(data.camposObligatorios);
        } else if (activeTab === 'carta-presentacion') {
          setCamposObligatorios({ datos_remitente: true, datos_destinatario: true, texto_carta: true });
        }
        if (Array.isArray(data.formatSecciones) && data.formatSecciones.length > 0) {
          const withLabels = data.formatSecciones.map((s) => {
            const def = seccionesDef.find((d) => d.key === s.key);
            return { ...s, label: def?.label ?? s.label ?? s.key };
          });
          setFormatSecciones(withLabels);
        } else {
          setFormatSecciones(defaultFormat);
        }
        if (data.logoBase64) {
          setLogoBase64Saved(data.logoBase64);
          setLogoPreview(data.logoBase64);
        } else {
          setLogoBase64Saved(null);
          setLogoPreview(null);
        }
        if (activeTab === 'carta-presentacion') {
          if (data.firmaBase64) {
            setFirmaBase64Saved(data.firmaBase64);
            setFirmaPreview(data.firmaBase64);
          } else {
            setFirmaBase64Saved(null);
            setFirmaPreview(null);
          }
          const datos = data.firmaDatos && typeof data.firmaDatos === 'object'
            ? { nombre: data.firmaDatos.nombre ?? '', cargo: data.firmaDatos.cargo ?? '', unidad: data.firmaDatos.unidad ?? '' }
            : { nombre: '', cargo: '', unidad: '' };
          setFirmaDatos(datos);
          setBloquesTexto(Array.isArray(data.bloquesTexto) ? data.bloquesTexto : []);
          const ti = data.textosInternos && typeof data.textosInternos === 'object'
            ? { encabezado: data.textosInternos.encabezado ?? '', cuerpo: data.textosInternos.cuerpo ?? '', cierre: data.textosInternos.cierre ?? '' }
            : { encabezado: '', cuerpo: '', cierre: '' };
          setTextosInternos(ti);
          setOpcionFechaCarta(data.opcionFechaCarta ?? 'fecha_actual');
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
    if (activeTab === 'hoja-vida') {
      const visibleCount = formatSecciones.filter((s) => s.visible).length;
      if (visibleCount === 0) {
        setErrorParametrizacion('Debe tener al menos una sección visible en el PDF.');
        return;
      }
    }
    if (activeTab === 'acuerdo-vinculacion') {
      setSavingParametrizacion(true);
      const resolveAcuerdoLogo = () => {
        if (acuerdoLogoFile) {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(acuerdoLogoFile);
          });
        }
        return Promise.resolve(acuerdoLogoBase64Saved);
      };
      resolveAcuerdoLogo()
        .then((logoBase64) => api.put('/parametrizacion-documentos/acuerdo-vinculacion', {
          logoBase64: logoBase64 || null,
          textosLegalesAcuerdo: textosLegalesAcuerdo.trim() || null,
        }))
        .then((res) => {
          const data = res.data || {};
          if (data.logoBase64 != null) {
            setAcuerdoLogoBase64Saved(data.logoBase64);
            setAcuerdoLogoPreview(data.logoBase64);
            setAcuerdoLogoFile(null);
            if (acuerdoLogoInputRef.current) acuerdoLogoInputRef.current.value = '';
          }
          setErrorParametrizacion(null);
          Swal.fire({ icon: 'success', title: 'Guardado', text: 'Configuración guardada correctamente.', confirmButtonColor: '#c41e3a' });
        })
        .catch((err) => setErrorParametrizacion(err.response?.data?.message || 'Error al guardar.'))
        .finally(() => setSavingParametrizacion(false));
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
    const resolveFirmaBase64 = () => {
      if (firmaFile) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(firmaFile);
        });
      }
      return Promise.resolve(firmaBase64Saved);
    };
    const saveEndpoint = activeTab === 'carta-presentacion' ? '/parametrizacion-documentos/carta-presentacion' : '/parametrizacion-documentos/hoja-vida';
    Promise.all([resolveLogoBase64(), activeTab === 'carta-presentacion' ? resolveFirmaBase64() : Promise.resolve(null)])
      .then(([logoBase64, firmaBase64]) => {
        const body = {
          logoBase64: logoBase64 || null,
          formatSecciones,
          camposObligatorios,
        };
        if (activeTab === 'carta-presentacion') {
          body.firmaBase64 = firmaBase64 || null;
          body.firmaDatos = firmaDatos;
          body.bloquesTexto = bloquesTexto;
          body.textosInternos = textosInternos;
          body.opcionFechaCarta = 'fecha_actual'; /* Siempre fecha actual al generar la carta */
        }
        return api.put(saveEndpoint, body);
      })
      .then((res) => {
        const data = res.data || {};
        if (data.logoBase64) {
          setLogoBase64Saved(data.logoBase64);
          setLogoPreview(data.logoBase64);
          setLogoFile(null);
          if (logoInputRef.current) logoInputRef.current.value = '';
        }
        if (activeTab === 'carta-presentacion') {
          if (data.firmaBase64 != null) {
            setFirmaBase64Saved(data.firmaBase64);
            setFirmaPreview(data.firmaBase64);
            setFirmaFile(null);
            if (firmaInputRef.current) firmaInputRef.current.value = '';
          }
          if (data.firmaDatos && typeof data.firmaDatos === 'object') {
            setFirmaDatos({
              nombre: data.firmaDatos.nombre ?? '',
              cargo: data.firmaDatos.cargo ?? '',
              unidad: data.firmaDatos.unidad ?? '',
            });
          }
          if (Array.isArray(data.bloquesTexto)) setBloquesTexto(data.bloquesTexto);
          if (data.textosInternos && typeof data.textosInternos === 'object') {
            setTextosInternos({
              encabezado: data.textosInternos.encabezado ?? '',
              cuerpo: data.textosInternos.cuerpo ?? '',
              cierre: data.textosInternos.cierre ?? '',
            });
          }
          if (['fecha_actual', 'fecha_elegible', 'ninguna'].includes(data.opcionFechaCarta)) {
            setOpcionFechaCarta(data.opcionFechaCarta);
          }
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
            Desde aquí puede configurar los <strong>documentos parametrizables</strong> (hoja de vida y carta de presentación): definir qué secciones son de diligenciamiento obligatorio para el estudiante, y el orden y la visibilidad de las secciones en el PDF generado.
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

          {activeTab === 'carta-presentacion' && (
            <div className="param-docs-tab-content param-docs-carta-presentacion">
              {loadingParametrizacion && <p className="param-docs-loading">Cargando configuración…</p>}
              {errorParametrizacion && (
                <div className="param-docs-error" role="alert">
                  {errorParametrizacion}
                </div>
              )}
              <section className="param-docs-block param-docs-block--logo">
                <h4 className="param-docs-block-title">Logo de la carta de presentación</h4>
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
                    id="param-docs-logo-file-carta"
                  />
                  {logoPreview ? (
                    <div className="param-docs-logo-preview-wrap">
                      <img src={logoPreview} alt="Vista previa logo carta de presentación" className="param-docs-logo-preview" />
                      <div className="param-docs-logo-meta">
                        {logoFile?.name && <span className="param-docs-logo-filename">{logoFile.name}</span>}
                        <button type="button" className="param-docs-logo-remove" onClick={handleLogoRemove} title="Quitar logo">
                          <FiX /> Quitar logo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="param-docs-logo-file-carta" className="param-docs-logo-upload-label">
                      <FiUpload className="param-docs-logo-upload-icon" />
                      <span>Haga clic para cargar el logo</span>
                      <span className="param-docs-logo-upload-hint">PNG, JPG o SVG. Máx. 5 MB</span>
                    </label>
                  )}
                </div>
              </section>

              <section className="param-docs-block param-docs-block--textos-internos">
                <h4 className="param-docs-block-title">Textos internos de la carta</h4>
                <div className="param-docs-info-postulante">
                  <p className="param-docs-block-desc">
                    <strong>Escribe los textos fijos. </strong>Al generar la carta, el sistema completará automáticamente con los datos del postulante: <strong>nombre completo, documento, correo, teléfono, programa(s), facultad</strong> y la <strong>universidad (sede)</strong> según su perfil.
                  </p>
                  <p className="param-docs-block-desc param-docs-hint-negrita">
                    Escriba el texto entre asteriscos para que aparezca en <strong>negrita</strong> en el PDF (ej.: <code>*nombre de la empresa*</code>).
                  </p>
                </div>
                <div className="param-docs-firma-inputs">
                  <div className="param-docs-campo-firma-row">
                    <label htmlFor="texto-encabezado" className="param-docs-label-firma">Encabezado / Presentación</label>
                    <textarea
                      id="texto-encabezado"
                      className="param-docs-bloque-contenido param-docs-texto-interno"
                      value={textosInternos.encabezado}
                      onChange={(e) => updateTextosInternos('encabezado', e.target.value)}
                      placeholder="Ej.: La Universidad del Rosario se permite presentar a..."
                      rows={3}
                    />
                  </div>
                  <div className="param-docs-campo-firma-row">
                    <label htmlFor="texto-cuerpo" className="param-docs-label-firma">Cuerpo o instrucciones (opcional)</label>
                    <textarea
                      id="texto-cuerpo"
                      className="param-docs-bloque-contenido param-docs-texto-interno"
                      value={textosInternos.cuerpo}
                      onChange={(e) => updateTextosInternos('cuerpo', e.target.value)}
                      placeholder="Texto central de la carta, si lo necesita. Puede dejarlo en blanco."
                      rows={4}
                    />
                  </div>
                  <div className="param-docs-campo-firma-row">
                    <label htmlFor="texto-cierre" className="param-docs-label-firma">Texto de cierre / Despedida</label>
                    <textarea
                      id="texto-cierre"
                      className="param-docs-bloque-contenido param-docs-texto-interno"
                      value={textosInternos.cierre}
                      onChange={(e) => updateTextosInternos('cierre', e.target.value)}
                      placeholder="Ej.: Cordialmente,"
                      rows={2}
                    />
                  </div>
                </div>
              </section>

              <section className="param-docs-block param-docs-block--firma">
                <h4 className="param-docs-block-title">Firma y datos del firmante</h4>
                <p className="param-docs-block-desc">
                  Imagen de firma (opcional) y campos que aparecerán en el bloque de firma de la carta (ej. Nombre, Cargo, Fecha).
                </p>
                <div className="param-docs-logo-zone param-docs-firma-zone">
                  <input
                    ref={firmaInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={handleFirmaChange}
                    className="param-docs-logo-input"
                    id="param-docs-firma-file"
                  />
                  {firmaPreview ? (
                    <div className="param-docs-logo-preview-wrap">
                      <img src={firmaPreview} alt="Vista previa firma" className="param-docs-logo-preview param-docs-firma-preview" />
                      <div className="param-docs-logo-meta">
                        {firmaFile?.name && <span className="param-docs-logo-filename">{firmaFile.name}</span>}
                        <button type="button" className="param-docs-logo-remove" onClick={handleFirmaRemove} title="Quitar firma">
                          <FiX /> Quitar firma
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="param-docs-firma-file" className="param-docs-logo-upload-label">
                      <FiUpload className="param-docs-logo-upload-icon" />
                      <span>Imagen de firma (opcional)</span>
                      <span className="param-docs-logo-upload-hint">PNG, JPG o SVG. Máx. 5 MB</span>
                    </label>
                  )}
                </div>
                <div className="param-docs-campos-firma">
                  <p className="param-docs-block-desc">Textos que aparecen bajo la firma en la carta. La universidad se toma de la sede al generar el documento.</p>
                  <div className="param-docs-firma-inputs">
                    <div className="param-docs-campo-firma-row">
                      <label htmlFor="firma-nombre" className="param-docs-label-firma">Nombre del firmante</label>
                      <input
                        type="text"
                        id="firma-nombre"
                        className="param-docs-input-inline"
                        value={firmaDatos.nombre}
                        onChange={(e) => updateFirmaDatos('nombre', e.target.value)}
                        placeholder="Ej. Luz Angela Díaz Castillo"
                      />
                    </div>
                    <div className="param-docs-campo-firma-row">
                      <label htmlFor="firma-cargo" className="param-docs-label-firma">Cargo</label>
                      <input
                        type="text"
                        id="firma-cargo"
                        className="param-docs-input-inline"
                        value={firmaDatos.cargo}
                        onChange={(e) => updateFirmaDatos('cargo', e.target.value)}
                        placeholder="Ej. Directora"
                      />
                    </div>
                    <div className="param-docs-campo-firma-row">
                      <label htmlFor="firma-unidad" className="param-docs-label-firma">Dirección / Área (debajo del cargo)</label>
                      <input
                        type="text"
                        id="firma-unidad"
                        className="param-docs-input-inline"
                        value={firmaDatos.unidad}
                        onChange={(e) => updateFirmaDatos('unidad', e.target.value)}
                        placeholder="Ej. Dirección de Evaluación, Permanencia y Éxito Estudiantil"
                      />
                    </div>
                  </div>
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

          {activeTab === 'acuerdo-vinculacion' && (
            <div className="param-docs-tab-content param-docs-acuerdo-vinculacion" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 200px)' }}>
              {loadingParametrizacion && <p className="param-docs-loading">Cargando configuración…</p>}
              {errorParametrizacion && (
                <div className="param-docs-error" role="alert">
                  {errorParametrizacion}
                </div>
              )}
              <p className="param-docs-block-desc" style={{ marginBottom: '1rem' }}>
                Cuando el estudiante acepte una oferta con tipo de vinculación &quot;Acuerdo de vinculación&quot;, la plataforma generará automáticamente el acuerdo con las tablas de estudiante, escenario de práctica y universidad, y los datos que ya están en el sistema.
              </p>
              <section className="param-docs-block param-docs-block--logo">
                <h4 className="param-docs-block-title">Logo del documento</h4>
                <p className="param-docs-block-desc">
                  Logo institucional que aparece al inicio del PDF (ej. Universidad del Rosario). PNG, JPG o SVG. Máx. 5 MB.
                </p>
                <div className="param-docs-logo-zone">
                  <input
                    ref={acuerdoLogoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={handleAcuerdoLogoChange}
                    className="param-docs-logo-input"
                    id="param-docs-logo-acuerdo"
                  />
                  {acuerdoLogoPreview ? (
                    <div className="param-docs-logo-preview-wrap">
                      <img src={acuerdoLogoPreview} alt="Vista previa logo acuerdo" className="param-docs-logo-preview" />
                      <div className="param-docs-logo-meta">
                        {acuerdoLogoFile?.name && <span className="param-docs-logo-filename">{acuerdoLogoFile.name}</span>}
                        <button type="button" className="param-docs-logo-remove" onClick={handleAcuerdoLogoRemove} title="Quitar logo">
                          <FiX /> Quitar logo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="param-docs-logo-acuerdo" className="param-docs-logo-upload-label">
                      <FiUpload className="param-docs-logo-upload-icon" />
                      <span>Haga clic para cargar el logo</span>
                      <span className="param-docs-logo-upload-hint">PNG, JPG o SVG. Máx. 5 MB</span>
                    </label>
                  )}
                </div>
              </section>
              <section className="param-docs-block" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <h4 className="param-docs-block-title">Textos legales</h4>
                <p className="param-docs-block-desc">
                  Texto que aparece después de las tablas en el documento (consideraciones preliminares, cláusulas, etc.). Opcional.
                </p>
                <textarea
                  className="param-docs-textarea"
                  value={textosLegalesAcuerdo}
                  onChange={(e) => setTextosLegalesAcuerdo(e.target.value)}
                  placeholder="Consideraciones preliminares y cláusulas..."
                  style={{ width: '100%', flex: 1, minHeight: '200px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </section>
              <div className="param-docs-footer-actions" style={{ flexWrap: 'wrap', gap: '12px' }}>
                <button
                  type="button"
                  className="param-docs-btn-save"
                  onClick={handleVistaPreviaAcuerdo}
                  disabled={loadingParametrizacion || loadingPreviewAcuerdo}
                  title="Ver cómo quedaría el PDF generado con datos de ejemplo"
                >
                  <FiEye className="btn-icon" />
                  {loadingPreviewAcuerdo ? 'Generando…' : 'Vista previa'}
                </button>
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
