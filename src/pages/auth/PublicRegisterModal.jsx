import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// ── Helpers ────────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

async function fetchItems(listId) {
  try {
    const { data } = await axios.get(`${API}/locations/items/${listId}?limit=200`);
    return Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
  } catch { return []; }
}

async function fetchCountries() {
  try {
    const { data } = await axios.get(`${API}/locations/countries?limit=300`);
    return Array.isArray(data.data) ? data.data : [];
  } catch { return []; }
}

async function searchCities(q) {
  if (!q || q.length < 2) return [];
  try {
    const { data } = await axios.get(`${API}/locations/cities?search=${encodeURIComponent(q)}&limit=15`);
    return Array.isArray(data.data) ? data.data : [];
  } catch { return []; }
}

async function searchCiiu(q) {
  if (!q || q.length < 3) return [];
  try {
    const { data } = await axios.get(`${API}/locations/items/L_CIIU?search=${encodeURIComponent(q)}&limit=15`);
    return Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
  } catch { return []; }
}

async function postPublicRegister(payload, files) {
  const fd = new FormData();
  // Campos escalares
  const { extraContacts, ciiuCodes, domains, legalRepresentative, ...rest } = payload;
  Object.entries(rest).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, String(v)); });
  fd.append('extraContacts', JSON.stringify(extraContacts || []));
  fd.append('ciiuCodes', JSON.stringify(ciiuCodes || []));
  fd.append('domains', JSON.stringify(domains || []));
  fd.append('legalRepresentative', JSON.stringify(legalRepresentative || {}));
  // Archivos
  if (files?.chamberOfCommerce) fd.append('chamberOfCommerce', files.chamberOfCommerce);
  if (files?.rut) fd.append('rut', files.rut);
  const { data } = await axios.post(`${API}/companies/public-register`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

function emptyContact() {
  return { firstName: '', lastName: '', email: '', phone: '', position: '', isPracticeTutor: false };
}

const STEPS = ['Empresa', 'Representante Legal', 'Contactos Adicionales', 'Confirmación'];

const LS_KEY = 'public_register_draft';

const COMPANY_EMPTY = {
  legalName: '', commercialName: '', idType: 'NIT', nit: '',
  sector: '', sectorMineSnies: '', size: '', arl: '',
  country: 'Colombia', city: '', address: '', phone: '',
  website: '', domains: [], description: '',
  ciiuCodes: [], // hasta 3 códigos CIIU
};
const REP_EMPTY = {
  firstName: '', lastName: '', idType: 'CC', idNumber: '',
  email: '', phone: '', country: 'Colombia', city: '', address: '',
};

// ── Algoritmo DIAN (Módulo 11) ─────────────────────────────────────────────
function validarNitDian(nit) {
  const str = String(nit || '').replace(/\D/g, '');
  if (str.length !== 10) return false;
  const weights = [41, 37, 29, 23, 19, 17, 13, 7, 3];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(str[i], 10) * weights[i];
  let digito = sum % 11;
  if (digito > 1) digito = 11 - digito;
  return parseInt(str[9], 10) === digito;
}

function emailMatchesDomains(email, domains) {
  if (!domains || domains.length === 0) return true;
  const emailDomain = email.split('@')[1]?.toLowerCase();
  return !!emailDomain && domains.map(d => d.toLowerCase()).includes(emailDomain);
}

// ── localStorage draft ─────────────────────────────────────────────────────
function hasDraft() { try { return !!localStorage.getItem(LS_KEY); } catch { return false; } }
function loadDraft() { try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; } }
function saveDraft(d) { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {} }
function clearDraft() { try { localStorage.removeItem(LS_KEY); } catch {} }

// ── Componente principal ───────────────────────────────────────────────────

export default function PublicRegisterModal({ open, onClose }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Listas paramétricas
  const [sectors, setSectors] = useState([]);
  const [sectorMineList, setSectorMineList] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [arls, setArls] = useState([]);
  const [idTypes, setIdTypes] = useState([]);
  const [idTypesPersona, setIdTypesPersona] = useState([]);
  const [countries, setCountries] = useState([]);

  // CIIU autocomplete
  const [ciiuInput, setCiiuInput] = useState('');
  const [ciiuSuggestions, setCiiuSuggestions] = useState([]);
  const [ciiuLoading, setCiiuLoading] = useState(false);
  const [showCiiuDrop, setShowCiiuDrop] = useState(false);
  const ciiuTimer = useRef(null);

  // Archivos adjuntos
  const [fileChamber, setFileChamber] = useState(null);
  const [fileRut, setFileRut] = useState(null);

  // Autocomplete ciudades empresa
  const [companyCitySuggestions, setCompanyCitySuggestions] = useState([]);
  const [companyCityLoading, setCompanyCityLoading] = useState(false);
  const [showCompanyCityDrop, setShowCompanyCityDrop] = useState(false);
  const companyCityTimer = useRef(null);

  // Autocomplete ciudades representante
  const [repCitySuggestions, setRepCitySuggestions] = useState([]);
  const [repCityLoading, setRepCityLoading] = useState(false);
  const [showRepCityDrop, setShowRepCityDrop] = useState(false);
  const repCityTimer = useRef(null);

  // Datos del formulario
  const [company, setCompany] = useState(COMPANY_EMPTY);
  const [domainInput, setDomainInput] = useState('');
  const [rep, setRep] = useState(REP_EMPTY);
  const [extraContacts, setExtraContacts] = useState([]);
  const [hp, setHp] = useState('');

  // ── Cargar parámetros ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetchItems('L_SECTOR'),
      fetchItems('L_SNIES_SECTOR'),
      fetchItems('L_COMPANY_SIZE'),
      fetchItems('L_ARL'),
      fetchItems('L_IDENTIFICATIONTYPE_COMPANY'),
      fetchItems('L_IDENTIFICATIONTYPE'),
      fetchCountries(),
    ]).then(([sec, sectorMine, siz, arl, idC, idP, ctrs]) => {
      setSectors(sec);
      setSectorMineList(sectorMine);
      setSizes(siz);
      setArls(arl);
      setIdTypes(idC.length ? idC : [{ value: 'NIT', label: 'NIT' }, { value: 'CC', label: 'Cédula de Ciudadanía' }]);
      setIdTypesPersona(idP.length ? idP : [{ value: 'CC', label: 'CC' }, { value: 'CE', label: 'CE' }, { value: 'PA', label: 'Pasaporte' }]);
      setCountries(ctrs);
    }).finally(() => setLoading(false));
  }, [open]);

  // ── Restaurar borrador ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const draft = loadDraft();
    if (draft) {
      if (draft.company) setCompany(draft.company);
      if (draft.rep) setRep(draft.rep);
      if (draft.extraContacts) setExtraContacts(draft.extraContacts);
      if (typeof draft.step === 'number') setStep(draft.step);
    }
  }, [open]);

  // ── Guardar borrador ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || success) return;
    saveDraft({ company, rep, extraContacts, step });
  }, [company, rep, extraContacts, step, open, success]);

  // ── Cerrar con confirmación ───────────────────────────────────────────────
  const handleClose = () => {
    if (success) { clearDraft(); onClose(); return; }
    const hasData = company.legalName.trim() || company.nit.trim() || rep.firstName.trim() || rep.email.trim();
    if (hasData) {
      if (!window.confirm('¿Cerrar el formulario? Tu progreso se guardó y podrás continuar la próxima vez que abras este modal.')) return;
    }
    onClose();
  };

  // ── Setters ───────────────────────────────────────────────────────────────
  const setC = (field, val) => setCompany(p => ({ ...p, [field]: val }));
  const setR = (field, val) => setRep(p => ({ ...p, [field]: val }));

  // ── Autocomplete ciudad empresa ───────────────────────────────────────────
  const handleCompanyCityInput = (val) => {
    setC('city', val);
    setShowCompanyCityDrop(true);
    clearTimeout(companyCityTimer.current);
    if (val.length >= 2) {
      setCompanyCityLoading(true);
      companyCityTimer.current = setTimeout(async () => {
        const results = await searchCities(val);
        setCompanyCitySuggestions(results);
        setCompanyCityLoading(false);
      }, 350);
    } else {
      setCompanyCitySuggestions([]);
    }
  };

  // ── Autocomplete ciudad representante ─────────────────────────────────────
  const handleRepCityInput = (val) => {
    setR('city', val);
    setShowRepCityDrop(true);
    clearTimeout(repCityTimer.current);
    if (val.length >= 2) {
      setRepCityLoading(true);
      repCityTimer.current = setTimeout(async () => {
        const results = await searchCities(val);
        setRepCitySuggestions(results);
        setRepCityLoading(false);
      }, 350);
    } else {
      setRepCitySuggestions([]);
    }
  };

  // ── CIIU autocomplete ─────────────────────────────────────────────────────
  const handleCiiuInput = (val) => {
    setCiiuInput(val);
    setShowCiiuDrop(true);
    clearTimeout(ciiuTimer.current);
    if (val.length >= 3) {
      setCiiuLoading(true);
      ciiuTimer.current = setTimeout(async () => {
        const results = await searchCiiu(val);
        setCiiuSuggestions(results);
        setCiiuLoading(false);
      }, 350);
    } else {
      setCiiuSuggestions([]);
    }
  };

  const addCiiu = (item) => {
    const code = item.value || item._id;
    if (company.ciiuCodes.length < 3 && !company.ciiuCodes.includes(code)) {
      setC('ciiuCodes', [...company.ciiuCodes, code]);
    }
    setCiiuInput('');
    setCiiuSuggestions([]);
    setShowCiiuDrop(false);
  };

  const removeCiiu = (code) => setC('ciiuCodes', company.ciiuCodes.filter(c => c !== code));

  // ── Dominios ──────────────────────────────────────────────────────────────
  const addDomain = () => {
    const d = domainInput.replace(/^@/, '').trim().toLowerCase();
    if (d && !company.domains.includes(d)) setC('domains', [...company.domains, d]);
    setDomainInput('');
  };
  const removeDomain = (d) => setC('domains', company.domains.filter(x => x !== d));

  // ── Contactos adicionales ─────────────────────────────────────────────────
  const addContact = () => { if (extraContacts.length < 7) setExtraContacts(p => [...p, emptyContact()]); };
  const removeContact = (i) => setExtraContacts(p => p.filter((_, idx) => idx !== i));
  const updateContact = (i, field, val) => setExtraContacts(p => p.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

  // ── Validación estricta por paso ──────────────────────────────────────────
  const validate = () => {
    setErrorMsg('');

    if (step === 0) {
      if (!company.legalName.trim())
        return setErrorMsg('La razón social es requerida.'), false;
      if (!company.nit.trim())
        return setErrorMsg('El NIT / número de identificación es requerido.'), false;
      if (company.idType === 'NIT') {
        const nitClean = company.nit.replace(/\D/g, '');
        if (nitClean.length !== 10)
          return setErrorMsg('El NIT debe tener exactamente 10 dígitos (9 base + 1 dígito de verificación DIAN).'), false;
        if (!validarNitDian(nitClean))
          return setErrorMsg(`El dígito de verificación del NIT no es válido según el algoritmo de la DIAN. Verifica que el NIT esté completo incluyendo el dígito de verificación.`), false;
      }
      if (!company.sector)
        return setErrorMsg('El sector es requerido.'), false;
      if (!company.size)
        return setErrorMsg('El tamaño de la organización es requerido.'), false;
      if (!company.city.trim())
        return setErrorMsg('La ciudad es requerida.'), false;
    }

    if (step === 1) {
      if (!rep.firstName.trim())
        return setErrorMsg('El nombre del representante legal es requerido.'), false;
      if (!rep.lastName.trim())
        return setErrorMsg('El apellido del representante legal es requerido.'), false;
      if (!rep.idNumber.trim())
        return setErrorMsg('El número de identificación del representante es requerido.'), false;
      if (!rep.email.trim())
        return setErrorMsg('El correo del representante legal es requerido.'), false;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rep.email))
        return setErrorMsg('El correo del representante legal no tiene un formato válido.'), false;
      if (!rep.phone.trim())
        return setErrorMsg('El teléfono del representante legal es requerido.'), false;
      if (!rep.city.trim())
        return setErrorMsg('La ciudad del representante legal es requerida.'), false;
      if (company.domains.length > 0 && !emailMatchesDomains(rep.email, company.domains))
        return setErrorMsg(`El correo debe pertenecer a uno de los dominios corporativos: ${company.domains.map(d => '@' + d).join(', ')}`), false;
    }

    if (step === 2) {
      for (let i = 0; i < extraContacts.length; i++) {
        const ec = extraContacts[i];
        if (!ec.firstName.trim() || !ec.lastName.trim())
          return setErrorMsg(`El contacto ${i + 2} requiere nombre y apellido.`), false;
        if (!ec.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ec.email))
          return setErrorMsg(`El correo del contacto ${i + 2} no tiene un formato válido.`), false;
        if (company.domains.length > 0 && !emailMatchesDomains(ec.email, company.domains))
          return setErrorMsg(`El correo del contacto ${i + 2} (${ec.email}) debe pertenecer a uno de los dominios: ${company.domains.map(d => '@' + d).join(', ')}`), false;
      }
    }

    return true;
  };

  const next = () => { if (validate()) { setErrorMsg(''); setStep(s => s + 1); } };
  const back = () => { setErrorMsg(''); setStep(s => s - 1); };

  // ── Envío ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        ...company,
        legalRepresentative: {
          firstName: rep.firstName,
          lastName: rep.lastName,
          idType: rep.idType,
          idNumber: rep.idNumber,
          email: rep.email,
          phone: rep.phone,
        },
        country: rep.country || company.country,
        city: rep.city || company.city,
        address: rep.address || company.address,
        phone: rep.phone || company.phone,
        extraContacts: extraContacts.filter(c => c.firstName && c.lastName && c.email),
        _hp: hp,
      };
      const data = await postPublicRegister(payload, { chamberOfCommerce: fileChamber, rut: fileRut });
      if (data.success) { clearDraft(); setSuccess(true); }
      else setErrorMsg(data.message || 'Error al enviar el registro.');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error al enviar el registro. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={styles.modal}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Registro de Escenario de Práctica</h2>
            <p style={styles.subtitle}>
              Completa la información para registrar tu entidad
              {hasDraft() && !success && (
                <span style={{ marginLeft: 10, background: 'rgba(255,255,255,0.25)', borderRadius: 10, padding: '1px 8px', fontSize: 11 }}>
                  💾 Borrador guardado
                </span>
              )}
            </p>
          </div>
          <button style={styles.closeBtn} onClick={handleClose} aria-label="Cerrar">✕</button>
        </div>

        {/* Barra de progreso */}
        {!success && (
          <div style={styles.progressBar}>
            {STEPS.map((label, i) => (
              <div key={i} style={styles.progressStep}>
                <div style={{ ...styles.progressDot, background: i <= step ? '#c41e3a' : '#ddd', color: i <= step ? '#fff' : '#999' }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{ ...styles.progressLabel, color: i <= step ? '#c41e3a' : '#999', fontWeight: i === step ? '700' : '400' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div style={styles.body}>
          {loading && <div style={styles.loadingText}>Cargando parámetros...</div>}

          {!loading && !success && (
            <>
              {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}

              {/* ── PASO 0: Datos de la empresa ─────────────────────────── */}
              {step === 0 && (
                <div>
                  <SectionTitle text="Datos de la Empresa" />
                  <Row>
                    <Field label="Razón Social *">
                      <input style={styles.input} value={company.legalName} onChange={e => setC('legalName', e.target.value)} placeholder="Nombre jurídico completo" />
                    </Field>
                    <Field label="Nombre Comercial">
                      <input style={styles.input} value={company.commercialName} onChange={e => setC('commercialName', e.target.value)} placeholder="Nombre comercial o de marca" />
                    </Field>
                  </Row>
                  <Row>
                    <Field label="Tipo de Identificación *">
                      <select style={styles.input} value={company.idType} onChange={e => setC('idType', e.target.value)}>
                        {idTypes.map(i => <option key={i.value || i._id} value={i.value || i._id}>{i.label || i.value}</option>)}
                      </select>
                    </Field>
                    <Field label="NIT / Número de Identificación *">
                      <input style={styles.input} value={company.nit} onChange={e => setC('nit', e.target.value)} placeholder="Ej: 8600077593" />
                      {company.idType === 'NIT' && <span style={styles.hint}>10 dígitos: 9 base + 1 dígito de verificación DIAN</span>}
                    </Field>
                  </Row>
                  <Row>
                    <Field label="Sector *">
                      <select style={styles.input} value={company.sector} onChange={e => setC('sector', e.target.value)}>
                        <option value="">Selecciona...</option>
                        {sectors.map(s => <option key={s._id || s.value} value={s.value || s._id}>{s.label || s.value}</option>)}
                      </select>
                    </Field>
                    <Field label="Tamaño de la Organización *">
                      <select style={styles.input} value={company.size} onChange={e => setC('size', e.target.value)}>
                        <option value="">Selecciona...</option>
                        {sizes.map(s => <option key={s._id || s.value} value={s.value || s._id}>{s.label || s.value}</option>)}
                      </select>
                    </Field>
                  </Row>
                  <Row>
                    <Field label="Sector MinE (SNIES)">
                      <select style={styles.input} value={company.sectorMineSnies} onChange={e => setC('sectorMineSnies', e.target.value)}>
                        <option value="">Selecciona...</option>
                        {sectorMineList.map(s => <option key={s._id || s.value} value={s.value || s._id}>{s.label || s.value}</option>)}
                      </select>
                    </Field>
                    <Field label="ARL">
                      <select style={styles.input} value={company.arl} onChange={e => setC('arl', e.target.value)}>
                        <option value="">Selecciona...</option>
                        {arls.map(a => <option key={a._id || a.value} value={a.value || a._id}>{a.label || a.value}</option>)}
                      </select>
                    </Field>
                  </Row>
                  <Field label={`Sector Económico — Código CIIU (máx. 3)${company.ciiuCodes.length > 0 ? ` — ${company.ciiuCodes.length} seleccionado(s)` : ''}`}>
                    <div style={{ position: 'relative' }}>
                      <input
                        style={{ ...styles.input, ...(company.ciiuCodes.length >= 3 ? { background: '#f9f9f9', color: '#aaa' } : {}) }}
                        value={ciiuInput}
                        onChange={e => handleCiiuInput(e.target.value)}
                        onFocus={() => ciiuInput.length >= 3 && setShowCiiuDrop(true)}
                        onBlur={() => setTimeout(() => setShowCiiuDrop(false), 200)}
                        placeholder={company.ciiuCodes.length >= 3 ? 'Máximo 3 códigos CIIU' : 'Ingresa mínimo 3 dígitos para buscar...'}
                        disabled={company.ciiuCodes.length >= 3}
                        autoComplete="off"
                      />
                      {showCiiuDrop && (ciiuLoading || ciiuSuggestions.length > 0) && (
                        <div style={styles.cityDrop}>
                          {ciiuLoading && <div style={styles.cityDropItem}>Buscando...</div>}
                          {ciiuSuggestions.map(item => (
                            <div key={item._id || item.value} style={styles.cityDropItem}
                              onMouseDown={() => addCiiu(item)}>
                              <strong>{item.value}</strong>{item.label && item.label !== item.value ? ` — ${item.label}` : ''}
                            </div>
                          ))}
                          {!ciiuLoading && ciiuSuggestions.length === 0 && ciiuInput.length >= 3 && (
                            <div style={{ ...styles.cityDropItem, color: '#999' }}>Sin resultados</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {company.ciiuCodes.map(c => (
                        <span key={c} style={styles.tag}>{c}<button type="button" style={styles.tagRemove} onClick={() => removeCiiu(c)}>✕</button></span>
                      ))}
                    </div>
                  </Field>
                  <Row>
                    <Field label="Sitio Web">
                      <input style={styles.input} value={company.website} onChange={e => setC('website', e.target.value)} placeholder="https://www.empresa.com" />
                    </Field>
                    <div />
                  </Row>
                  <Row>
                    <Field label="País">
                      <select style={styles.input} value={company.country} onChange={e => setC('country', e.target.value)}>
                        <option value="">Selecciona...</option>
                        {countries.length
                          ? countries.map(c => <option key={c._id} value={c.name}>{c.name}</option>)
                          : <option value="Colombia">Colombia</option>}
                      </select>
                    </Field>
                    <Field label="Ciudad *">
                      <div style={{ position: 'relative' }}>
                        <input
                          style={styles.input}
                          value={company.city}
                          onChange={e => handleCompanyCityInput(e.target.value)}
                          onFocus={() => company.city.length >= 2 && setShowCompanyCityDrop(true)}
                          onBlur={() => setTimeout(() => setShowCompanyCityDrop(false), 200)}
                          placeholder="Busca tu ciudad..."
                          autoComplete="off"
                        />
                        {showCompanyCityDrop && (companyCityLoading || companyCitySuggestions.length > 0) && (
                          <div style={styles.cityDrop}>
                            {companyCityLoading && <div style={styles.cityDropItem}>Buscando...</div>}
                            {companyCitySuggestions.map(c => (
                              <div key={c._id} style={styles.cityDropItem} onMouseDown={() => { setC('city', c.name); setShowCompanyCityDrop(false); }}>
                                {c.name}{c.state?.name ? ` — ${c.state.name}` : ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Field>
                  </Row>
                  <Field label="Dirección">
                    <input style={styles.input} value={company.address} onChange={e => setC('address', e.target.value)} placeholder="Calle 123 # 45-67" />
                  </Field>
                  <Field label="Descripción breve">
                    <textarea style={{ ...styles.input, height: 64, resize: 'vertical' }} value={company.description} onChange={e => setC('description', e.target.value)} placeholder="Breve descripción de la entidad" />
                  </Field>
                  <Field label="Dominios de correo corporativo (opcional)">
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input style={{ ...styles.input, flex: 1 }} value={domainInput} onChange={e => setDomainInput(e.target.value)} placeholder="empresa.com" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDomain())} />
                      <button type="button" style={styles.addBtn} onClick={addDomain}>+ Agregar</button>
                    </div>
                    {company.domains.length > 0 && (
                      <span style={styles.hint}>⚠️ El correo del representante y contactos adicionales debe pertenecer a uno de estos dominios.</span>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {company.domains.map(d => (
                        <span key={d} style={styles.tag}>@{d}<button type="button" style={styles.tagRemove} onClick={() => removeDomain(d)}>✕</button></span>
                      ))}
                    </div>
                  </Field>
                  <SectionTitle text="Documentos" />
                  <Row>
                    <Field label="Certificado de Cámara de Comercio (PDF/imagen, máx. 5MB)">
                      <label style={styles.fileLabel}>
                        <input type="file" accept=".pdf,image/*" style={{ display: 'none' }}
                          onChange={e => setFileChamber(e.target.files[0] || null)} />
                        <span style={{ ...styles.fileBtn, ...(fileChamber ? styles.fileBtnOk : {}) }}>
                          {fileChamber ? `✓ ${fileChamber.name}` : '📎 Adjuntar archivo'}
                        </span>
                      </label>
                      {fileChamber && <button type="button" style={styles.tagRemove} onClick={() => setFileChamber(null)}>Eliminar</button>}
                    </Field>
                    <Field label="RUT (PDF/imagen, máx. 5MB)">
                      <label style={styles.fileLabel}>
                        <input type="file" accept=".pdf,image/*" style={{ display: 'none' }}
                          onChange={e => setFileRut(e.target.files[0] || null)} />
                        <span style={{ ...styles.fileBtn, ...(fileRut ? styles.fileBtnOk : {}) }}>
                          {fileRut ? `✓ ${fileRut.name}` : '📎 Adjuntar archivo'}
                        </span>
                      </label>
                      {fileRut && <button type="button" style={styles.tagRemove} onClick={() => setFileRut(null)}>Eliminar</button>}
                    </Field>
                  </Row>

                  {/* Honeypot */}
                  <input type="text" name="_hp" value={hp} onChange={e => setHp(e.target.value)} style={{ opacity: 0, position: 'absolute', height: 0, width: 0, pointerEvents: 'none' }} tabIndex={-1} autoComplete="off" />
                </div>
              )}

              {/* ── PASO 1: Representante Legal ─────────────────────────── */}
              {step === 1 && (
                <div>
                  <SectionTitle text="Contacto Principal / Representante Legal" />
                  <Row>
                    <Field label="Nombres *">
                      <input style={styles.input} value={rep.firstName} onChange={e => setR('firstName', e.target.value)} placeholder="Nombres" />
                    </Field>
                    <Field label="Apellidos *">
                      <input style={styles.input} value={rep.lastName} onChange={e => setR('lastName', e.target.value)} placeholder="Apellidos" />
                    </Field>
                  </Row>
                  <Row>
                    <Field label="Tipo de Identificación *">
                      <select style={styles.input} value={rep.idType} onChange={e => setR('idType', e.target.value)}>
                        {idTypesPersona.map(i => <option key={i.value || i._id} value={i.value || i._id}>{i.label || i.value}</option>)}
                      </select>
                    </Field>
                    <Field label="Número de Identificación *">
                      <input style={styles.input} value={rep.idNumber} onChange={e => setR('idNumber', e.target.value)} placeholder="Número de identificación" />
                    </Field>
                  </Row>
                  <Row>
                    <Field label="Correo Electrónico *">
                      <input style={styles.input} type="email" value={rep.email} onChange={e => setR('email', e.target.value)} placeholder="contacto@empresa.com" />
                      {company.domains.length > 0 && (
                        <span style={styles.hint}>Debe pertenecer a: {company.domains.map(d => '@' + d).join(', ')}</span>
                      )}
                      <span style={{ ...styles.hint, color: '#888' }}>Este correo será el usuario de acceso a la plataforma</span>
                    </Field>
                    <Field label="Teléfono *">
                      <input style={styles.input} value={rep.phone} onChange={e => setR('phone', e.target.value)} placeholder="+57 300 000 0000" />
                    </Field>
                  </Row>
                  <Row>
                    <Field label="País">
                      <select style={styles.input} value={rep.country} onChange={e => setR('country', e.target.value)}>
                        <option value="">Selecciona...</option>
                        {countries.length
                          ? countries.map(c => <option key={c._id} value={c.name}>{c.name}</option>)
                          : <option value="Colombia">Colombia</option>}
                      </select>
                    </Field>
                    <Field label="Ciudad *">
                      <div style={{ position: 'relative' }}>
                        <input
                          style={styles.input}
                          value={rep.city}
                          onChange={e => handleRepCityInput(e.target.value)}
                          onFocus={() => rep.city.length >= 2 && setShowRepCityDrop(true)}
                          onBlur={() => setTimeout(() => setShowRepCityDrop(false), 200)}
                          placeholder="Busca tu ciudad..."
                          autoComplete="off"
                        />
                        {showRepCityDrop && (repCityLoading || repCitySuggestions.length > 0) && (
                          <div style={styles.cityDrop}>
                            {repCityLoading && <div style={styles.cityDropItem}>Buscando...</div>}
                            {repCitySuggestions.map(c => (
                              <div key={c._id} style={styles.cityDropItem} onMouseDown={() => { setR('city', c.name); setShowRepCityDrop(false); }}>
                                {c.name}{c.state?.name ? ` — ${c.state.name}` : ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Field>
                  </Row>
                  <Field label="Dirección">
                    <input style={styles.input} value={rep.address} onChange={e => setR('address', e.target.value)} placeholder="Calle 123 # 45-67" />
                  </Field>
                  <div style={styles.infoBox}>
                    <strong>ℹ️ Contraseña inicial:</strong> Tu contraseña de acceso será el NIT de la entidad (<strong>{company.nit || '—'}</strong>). Podrás cambiarla después de que tu registro sea aprobado.
                  </div>
                </div>
              )}

              {/* ── PASO 2: Contactos adicionales ──────────────────────── */}
              {step === 2 && (
                <div>
                  <SectionTitle text="Contactos Adicionales (opcional)" />
                  <p style={styles.infoText}>Puedes agregar hasta 7 contactos adicionales. El representante legal ya fue registrado en el paso anterior.</p>
                  {extraContacts.map((ec, i) => (
                    <div key={i} style={styles.extraContactCard}>
                      <div style={styles.extraContactHeader}>
                        <strong style={{ color: '#c41e3a' }}>Contacto {i + 2}</strong>
                        <button type="button" style={styles.removeBtn} onClick={() => removeContact(i)}>✕ Eliminar</button>
                      </div>
                      <Row>
                        <Field label="Nombres *"><input style={styles.input} value={ec.firstName} onChange={e => updateContact(i, 'firstName', e.target.value)} placeholder="Nombres" /></Field>
                        <Field label="Apellidos *"><input style={styles.input} value={ec.lastName} onChange={e => updateContact(i, 'lastName', e.target.value)} placeholder="Apellidos" /></Field>
                      </Row>
                      <Row>
                        <Field label="Correo *">
                          <input style={styles.input} type="email" value={ec.email} onChange={e => updateContact(i, 'email', e.target.value)} placeholder="correo@empresa.com" />
                          {company.domains.length > 0 && <span style={styles.hint}>Debe pertenecer a: {company.domains.map(d => '@' + d).join(', ')}</span>}
                        </Field>
                        <Field label="Teléfono"><input style={styles.input} value={ec.phone} onChange={e => updateContact(i, 'phone', e.target.value)} placeholder="+57 300 000 0000" /></Field>
                      </Row>
                      <Row>
                        <Field label="Cargo"><input style={styles.input} value={ec.position} onChange={e => updateContact(i, 'position', e.target.value)} placeholder="Cargo en la empresa" /></Field>
                        <Field label="">
                          <label style={styles.checkLabel}>
                            <input type="checkbox" checked={ec.isPracticeTutor} onChange={e => updateContact(i, 'isPracticeTutor', e.target.checked)} style={{ marginRight: 6 }} />
                            Es tutor de práctica académica
                          </label>
                        </Field>
                      </Row>
                    </div>
                  ))}
                  {extraContacts.length < 7 && (
                    <button type="button" style={styles.addContactBtn} onClick={addContact}>+ Agregar contacto</button>
                  )}
                </div>
              )}

              {/* ── PASO 3: Confirmación ────────────────────────────────── */}
              {step === 3 && (
                <div>
                  <SectionTitle text="Confirmar Registro" />
                  <div style={styles.summaryBox}>
                    <p style={{ fontWeight: 700, color: '#c41e3a', marginBottom: 8, marginTop: 0 }}>Empresa</p>
                    <SummaryRow label="Razón Social" value={company.legalName} />
                    <SummaryRow label="Nombre Comercial" value={company.commercialName || company.legalName} />
                    <SummaryRow label="Tipo ID" value={company.idType} />
                    <SummaryRow label="NIT / Identificación" value={company.nit} />
                    <SummaryRow label="Sector" value={company.sector} />
                    <SummaryRow label="Sector MinE (SNIES)" value={company.sectorMineSnies} />
                    <SummaryRow label="Tamaño" value={company.size} />
                    <SummaryRow label="ARL" value={company.arl} />
                    {company.ciiuCodes.length > 0 && <SummaryRow label="Códigos CIIU" value={company.ciiuCodes.join(', ')} />}
                    {fileChamber && <SummaryRow label="Cámara de Comercio" value={fileChamber.name} />}
                    {fileRut && <SummaryRow label="RUT" value={fileRut.name} />}
                    <SummaryRow label="País" value={company.country} />
                    <SummaryRow label="Ciudad" value={company.city} />
                  </div>
                  <div style={{ ...styles.summaryBox, marginTop: 12 }}>
                    <p style={{ fontWeight: 700, color: '#c41e3a', marginBottom: 8, marginTop: 0 }}>Representante Legal</p>
                    <SummaryRow label="Nombre" value={`${rep.firstName} ${rep.lastName}`} />
                    <SummaryRow label="Correo" value={rep.email} />
                    <SummaryRow label="Teléfono" value={rep.phone} />
                    <SummaryRow label="País" value={rep.country} />
                    <SummaryRow label="Ciudad" value={rep.city} />
                  </div>
                  {extraContacts.filter(c => c.firstName && c.email).length > 0 && (
                    <div style={{ ...styles.summaryBox, marginTop: 12 }}>
                      <p style={{ fontWeight: 700, color: '#c41e3a', marginBottom: 8, marginTop: 0 }}>Contactos Adicionales ({extraContacts.filter(c => c.firstName && c.email).length})</p>
                      {extraContacts.filter(c => c.firstName && c.email).map((c, i) => (
                        <SummaryRow key={i} label={`Contacto ${i + 2}`} value={`${c.firstName} ${c.lastName} — ${c.email}`} />
                      ))}
                    </div>
                  )}
                  <div style={styles.infoBox}>
                    <strong>⚠️ Importante:</strong> Al enviar, tu entidad quedará en estado <em>Pendiente de aprobación</em>. La Coordinación de Empleabilidad e Inserción Laboral revisará tu información y te notificará al correo <strong>{rep.email}</strong>.
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── ÉXITO ──────────────────────────────────────────────────────── */}
          {success && (
            <div style={styles.successBox}>
              <div style={styles.successIcon}>✓</div>
              <h3 style={styles.successTitle}>¡Registro enviado exitosamente!</h3>
              <p style={styles.successText}>Tu entidad <strong>{company.legalName}</strong> ha sido registrada con estado <em>Pendiente de aprobación</em>.</p>
              <p style={styles.successText}>La Coordinación de Empleabilidad e Inserción Laboral revisará tu información y te notificará al correo <strong>{rep.email}</strong>.</p>
              <p style={styles.successText}>Tu contraseña inicial es el <strong>NIT</strong>: <strong>{company.nit}</strong>. Podrás cambiarla una vez seas aprobado.</p>
              <button style={styles.primaryBtn} onClick={handleClose}>Cerrar</button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !success && (
          <div style={styles.footer}>
            {step > 0 && <button type="button" style={styles.secondaryBtn} onClick={back} disabled={submitting}>← Anterior</button>}
            <div style={{ flex: 1 }} />
            {step < STEPS.length - 1 && <button type="button" style={styles.primaryBtn} onClick={next}>Siguiente →</button>}
            {step === STEPS.length - 1 && (
              <button type="button" style={styles.submitBtn} onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Enviando...' : '✓ Enviar Registro'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function SectionTitle({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg,#c41e3a,transparent)' }} />
      <span style={{ color: '#c41e3a', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{text}</span>
      <div style={{ flex: 1, height: 2, background: 'linear-gradient(270deg,#c41e3a,transparent)' }} />
    </div>
  );
}

function Row({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>{children}</div>;
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={styles.label}>{label}</label>}
      {children}
    </div>
  );
}

function SummaryRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
      <span style={{ color: '#666', minWidth: 140 }}>{label}</span>
      <span style={{ color: '#222', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 16 },
  modal: { background: '#fff', borderRadius: 12, width: '100%', maxWidth: 760, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 28px 16px', background: 'linear-gradient(135deg,#c41e3a 0%,#9c0020 100%)', color: '#fff' },
  title: { margin: 0, fontSize: 20, fontWeight: 700 },
  subtitle: { margin: '4px 0 0', fontSize: 13, opacity: 0.85 },
  closeBtn: { background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  progressBar: { display: 'flex', alignItems: 'center', padding: '14px 28px', background: '#fafafa', borderBottom: '1px solid #eee', gap: 4 },
  progressStep: { display: 'flex', alignItems: 'center', gap: 8, flex: 1 },
  progressDot: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, transition: 'background 0.2s' },
  progressLabel: { fontSize: 12, transition: 'color 0.2s' },
  body: { flex: 1, overflowY: 'auto', padding: '20px 28px' },
  footer: { display: 'flex', alignItems: 'center', padding: '14px 28px', background: '#fafafa', borderTop: '1px solid #eee', gap: 10 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  hint: { display: 'block', fontSize: 11, color: '#c41e3a', marginTop: 3 },
  infoText: { fontSize: 13, color: '#555', marginBottom: 16, lineHeight: 1.5 },
  infoBox: { background: '#fff8e1', border: '1px solid #f0c040', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#5a4500', marginTop: 16, lineHeight: 1.6 },
  errorBox: { background: '#fff0f0', border: '1px solid #f5c6c6', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#c41e3a', marginBottom: 16 },
  addBtn: { padding: '8px 14px', background: '#c41e3a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' },
  tag: { background: '#ffeef0', border: '1px solid #f5c6c6', borderRadius: 20, padding: '2px 10px', fontSize: 12, color: '#c41e3a', display: 'flex', alignItems: 'center', gap: 6 },
  tagRemove: { background: 'none', border: 'none', cursor: 'pointer', color: '#c41e3a', padding: 0, fontSize: 11 },
  extraContactCard: { border: '1px solid #f0d0d5', borderRadius: 8, padding: '16px', marginBottom: 16, background: '#fffafa' },
  extraContactHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  removeBtn: { background: 'none', border: '1px solid #f5c6c6', borderRadius: 6, color: '#c41e3a', cursor: 'pointer', fontSize: 12, padding: '4px 10px' },
  addContactBtn: { width: '100%', padding: '10px', border: '2px dashed #f5c6c6', borderRadius: 8, background: '#fffafa', color: '#c41e3a', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  checkLabel: { display: 'flex', alignItems: 'center', fontSize: 13, color: '#444', cursor: 'pointer', marginTop: 6 },
  summaryBox: { background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: '14px 16px' },
  loadingText: { textAlign: 'center', color: '#999', padding: 40, fontSize: 14 },
  primaryBtn: { padding: '9px 22px', background: '#c41e3a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  secondaryBtn: { padding: '9px 22px', background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  submitBtn: { padding: '9px 28px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700 },
  successBox: { textAlign: 'center', padding: '32px 20px' },
  successIcon: { width: 64, height: 64, background: '#2e7d32', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 20px', fontWeight: 700 },
  successTitle: { color: '#2e7d32', fontSize: 22, marginBottom: 12 },
  successText: { fontSize: 14, color: '#444', marginBottom: 8, lineHeight: 1.6 },
  cityDrop: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: 180, overflowY: 'auto' },
  cityDropItem: { padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f5f5f5', color: '#333' },
  fileLabel: { display: 'block', cursor: 'pointer' },
  fileBtn: { display: 'inline-block', padding: '8px 14px', border: '2px dashed #ddd', borderRadius: 6, fontSize: 13, color: '#666', background: '#fafafa', cursor: 'pointer', width: '100%', boxSizing: 'border-box' },
  fileBtnOk: { borderColor: '#2e7d32', color: '#2e7d32', background: '#f1f8f1', borderStyle: 'solid' },
};
