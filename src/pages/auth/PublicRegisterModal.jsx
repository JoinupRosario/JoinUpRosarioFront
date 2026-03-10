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

async function fetchStatesByCountry(countryId) {
  if (!countryId) return [];
  try {
    const { data } = await axios.get(`${API}/locations/states?country=${countryId}&limit=1000`);
    return Array.isArray(data.data) ? data.data : [];
  } catch { return []; }
}

async function fetchCitiesByState(stateId) {
  if (!stateId) return [];
  try {
    const { data } = await axios.get(`${API}/locations/cities?state=${stateId}&limit=1000`);
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

async function postPublicRegister(payload) {
  const { data } = await axios.post(`${API}/companies/public-register`, payload);
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
  country: 'Colombia', state: '', city: '', address: '', phone: '',
  website: '', domains: [], description: '',
  ciiuCodes: [], // hasta 3 códigos CIIU
  ciiuCodesLabels: [], // descripción de cada código (mismo orden que ciiuCodes) para mostrar
};
const REP_EMPTY = {
  firstName: '', lastName: '', idType: 'CC', idNumber: '',
  email: '', phone: '', country: 'Colombia', state: '', city: '', address: '',
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

  // Cascada País → Departamento → Ciudad (empresa)
  const [companyStates, setCompanyStates] = useState([]);
  const [companyCities, setCompanyCities] = useState([]);

  // Cascada País → Departamento → Ciudad (representante legal)
  const [repStates, setRepStates] = useState([]);
  const [repCities, setRepCities] = useState([]);

  // Datos del formulario
  const [company, setCompany] = useState(COMPANY_EMPTY);
  const [domainInput, setDomainInput] = useState('');
  const [rep, setRep] = useState(REP_EMPTY);
  const [extraContacts, setExtraContacts] = useState([]);
  const [mainContactIndex, setMainContactIndex] = useState(0); // 0 = representante legal, 1 = primer adicional, etc.
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
      if (typeof draft.mainContactIndex === 'number') setMainContactIndex(draft.mainContactIndex);
      if (typeof draft.step === 'number') setStep(draft.step);
    }
  }, [open]);

  // ── Guardar borrador ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || success) return;
    saveDraft({ company, rep, extraContacts, mainContactIndex, step });
  }, [company, rep, extraContacts, mainContactIndex, step, open, success]);

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

  // ── Cascada Empresa: cargar departamentos al cambiar país ──────────────────
  useEffect(() => {
    const countryId = countries.find(c => c.name === company.country)?._id;
    if (countryId) {
      fetchStatesByCountry(countryId).then(setCompanyStates);
    } else {
      setCompanyStates([]);
    }
    setCompanyCities([]);
  }, [company.country, countries]);

  // ── Cascada Empresa: cargar ciudades al cambiar departamento ───────────────
  useEffect(() => {
    const stateId = companyStates.find(s => s.name === company.state)?._id;
    if (stateId) {
      fetchCitiesByState(stateId).then(setCompanyCities);
    } else {
      setCompanyCities([]);
    }
  }, [company.state, companyStates]);

  // ── Cascada Representante: cargar departamentos al cambiar país ────────────
  useEffect(() => {
    const countryId = countries.find(c => c.name === rep.country)?._id;
    if (countryId) {
      fetchStatesByCountry(countryId).then(setRepStates);
    } else {
      setRepStates([]);
    }
    setRepCities([]);
  }, [rep.country, countries]);

  // ── Cascada Representante: cargar ciudades al cambiar departamento ─────────
  useEffect(() => {
    const stateId = repStates.find(s => s.name === rep.state)?._id;
    if (stateId) {
      fetchCitiesByState(stateId).then(setRepCities);
    } else {
      setRepCities([]);
    }
  }, [rep.state, repStates]);

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
    const label = item.label || item.description || item.valueForReports || item.value || code;
    if (company.ciiuCodes.length < 3 && !company.ciiuCodes.includes(code)) {
      setC('ciiuCodes', [...company.ciiuCodes, code]);
      setC('ciiuCodesLabels', [...(company.ciiuCodesLabels || []), label]);
    }
    setCiiuInput('');
    setCiiuSuggestions([]);
    setShowCiiuDrop(false);
  };

  const removeCiiu = (code) => {
    const idx = company.ciiuCodes.indexOf(code);
    setC('ciiuCodes', company.ciiuCodes.filter(c => c !== code));
    setC('ciiuCodesLabels', (company.ciiuCodesLabels || []).filter((_, i) => i !== idx));
  };

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
      if (extraContacts.length < 1)
        return setErrorMsg('Debe agregar al menos un contacto adicional (además del representante legal). Por ejemplo, la persona de RRHH que gestiona prácticas.'), false;
      for (let i = 0; i < extraContacts.length; i++) {
        const ec = extraContacts[i];
        if (!ec.firstName.trim() || !ec.lastName.trim())
          return setErrorMsg(`El contacto adicional ${i + 1} requiere nombre y apellido.`), false;
        if (!ec.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ec.email))
          return setErrorMsg(`El correo del contacto adicional ${i + 1} no tiene un formato válido.`), false;
        if (company.domains.length > 0 && !emailMatchesDomains(ec.email, company.domains))
          return setErrorMsg(`El correo del contacto adicional ${i + 1} (${ec.email}) debe pertenecer a uno de los dominios: ${company.domains.map(d => '@' + d).join(', ')}`), false;
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
      const { ciiuCodesLabels, ...companyRest } = company;
      const payload = {
        ...companyRest,
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
        mainContactIndex: mainContactIndex, // 0 = representante legal, 1 = primer adicional, etc.
        _hp: hp,
      };
      const data = await postPublicRegister(payload);
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
                          {ciiuSuggestions.map(item => {
                            const desc = item.label || item.description || item.valueForReports || '';
                            return (
                              <div key={item._id || item.value} style={styles.cityDropItem}
                                onMouseDown={() => addCiiu(item)}>
                                <strong>{item.value}</strong>{desc ? ` — ${desc}` : ''}
                              </div>
                            );
                          })}
                          {!ciiuLoading && ciiuSuggestions.length === 0 && ciiuInput.length >= 3 && (
                            <div style={{ ...styles.cityDropItem, color: '#999' }}>Sin resultados</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {company.ciiuCodes.map((c, idx) => {
                        const label = (company.ciiuCodesLabels && company.ciiuCodesLabels[idx]) ? company.ciiuCodesLabels[idx] : '';
                        const text = label ? `${c} — ${label}` : c;
                        return (
                          <span key={c} style={styles.tag} title={text}>{text}<button type="button" style={styles.tagRemove} onClick={() => removeCiiu(c)}>✕</button></span>
                        );
                      })}
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
                      <select
                        style={styles.input}
                        value={company.country}
                        onChange={e => {
                          setC('country', e.target.value);
                          setC('state', '');
                          setC('city', '');
                        }}
                      >
                        <option value="">Selecciona...</option>
                        {countries.length
                          ? countries.map(c => <option key={c._id} value={c.name}>{c.name}</option>)
                          : <option value="Colombia">Colombia</option>}
                      </select>
                    </Field>
                    <Field label="Departamento / Estado">
                      <select
                        style={styles.input}
                        value={company.state}
                        onChange={e => { setC('state', e.target.value); setC('city', ''); }}
                        disabled={!company.country}
                      >
                        <option value="">{company.country ? 'Selecciona departamento...' : 'Primero selecciona un país'}</option>
                        {companyStates.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                      </select>
                    </Field>
                  </Row>
                  <Row>
                    <Field label="Ciudad *">
                      <select
                        style={styles.input}
                        value={company.city}
                        onChange={e => setC('city', e.target.value)}
                        disabled={!company.state}
                      >
                        <option value="">{company.state ? 'Selecciona ciudad...' : 'Primero selecciona un departamento'}</option>
                        {companyCities.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                      </select>
                    </Field>
                    <div />
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
                      <select
                        style={styles.input}
                        value={rep.country}
                        onChange={e => {
                          setR('country', e.target.value);
                          setR('state', '');
                          setR('city', '');
                        }}
                      >
                        <option value="">Selecciona...</option>
                        {countries.length
                          ? countries.map(c => <option key={c._id} value={c.name}>{c.name}</option>)
                          : <option value="Colombia">Colombia</option>}
                      </select>
                    </Field>
                    <Field label="Departamento / Estado">
                      <select
                        style={styles.input}
                        value={rep.state}
                        onChange={e => { setR('state', e.target.value); setR('city', ''); }}
                        disabled={!rep.country}
                      >
                        <option value="">{rep.country ? 'Selecciona departamento...' : 'Primero selecciona un país'}</option>
                        {repStates.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                      </select>
                    </Field>
                  </Row>
                  <Row>
                    <Field label="Ciudad *">
                      <select
                        style={styles.input}
                        value={rep.city}
                        onChange={e => setR('city', e.target.value)}
                        disabled={!rep.state}
                      >
                        <option value="">{rep.state ? 'Selecciona ciudad...' : 'Primero selecciona un departamento'}</option>
                        {repCities.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                      </select>
                    </Field>
                    <div />
                  </Row>
                  <Field label="Dirección">
                    <input style={styles.input} value={rep.address} onChange={e => setR('address', e.target.value)} placeholder="Calle 123 # 45-67" />
                  </Field>
                  <div style={styles.infoBox}>
                    <strong>ℹ️ Contraseña inicial:</strong> Tu contraseña de acceso será el NIT de la entidad (<strong>{company.nit || '—'}</strong>). Podrás cambiarla después de que tu registro sea aprobado.
                  </div>
                </div>
              )}

              {/* ── PASO 2: Contactos (representante legal + al menos 1 adicional, elegir principal) ──────────────────────── */}
              {step === 2 && (
                <div>
                  <SectionTitle text="Contactos" />
                  <p style={styles.infoText}>
                    El contacto principal será quien gestione el acceso a la plataforma. Debe haber al menos dos contactos: el representante legal (paso anterior) y <strong>mínimo un contacto adicional</strong> (por ejemplo, la persona de RRHH que gestiona prácticas).
                  </p>

                  {/* Contacto 1: Representante legal (solo lectura, datos del paso anterior) */}
                  <div style={{ ...styles.extraContactCard, background: '#f8f9fa', borderLeft: '4px solid #c41e3a' }}>
                    <div style={styles.extraContactHeader}>
                      <strong style={{ color: '#c41e3a' }}>Contacto 1 — Representante legal</strong>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>Datos del paso anterior</span>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: 13, color: '#374151' }}>
                      {rep.firstName} {rep.lastName} — {rep.email}
                      {rep.phone ? ` — ${rep.phone}` : ''}
                    </p>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer' }}>
                      <input type="radio" name="mainContact" checked={mainContactIndex === 0} onChange={() => setMainContactIndex(0)} />
                      <span>Marcar como contacto principal</span>
                    </label>
                  </div>

                  {/* Contactos adicionales (obligatorio al menos 1) */}
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
                        <Field label="Cargo"><input style={styles.input} value={ec.position} onChange={e => updateContact(i, 'position', e.target.value)} placeholder="Ej: Gestión de prácticas / RRHH" /></Field>
                        <Field label="">
                          <label style={styles.checkLabel}>
                            <input type="checkbox" checked={ec.isPracticeTutor} onChange={e => updateContact(i, 'isPracticeTutor', e.target.checked)} style={{ marginRight: 6 }} />
                            Es tutor de práctica académica
                          </label>
                        </Field>
                      </Row>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, cursor: 'pointer' }}>
                        <input type="radio" name="mainContact" checked={mainContactIndex === i + 1} onChange={() => setMainContactIndex(i + 1)} />
                        <span>Marcar como contacto principal</span>
                      </label>
                    </div>
                  ))}
                  {extraContacts.length < 7 && (
                    <button type="button" style={styles.addContactBtn} onClick={addContact}>+ Agregar otro contacto</button>
                  )}
                  {extraContacts.length === 0 && (
                    <p style={{ marginTop: 12, color: '#c41e3a', fontSize: 13 }}>Debe agregar al menos un contacto adicional (además del representante legal).</p>
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
                    {company.ciiuCodes.length > 0 && (
                      <SummaryRow
                        label="Códigos CIIU"
                        value={company.ciiuCodes.map((c, idx) => {
                          const label = (company.ciiuCodesLabels && company.ciiuCodesLabels[idx]) ? company.ciiuCodesLabels[idx] : '';
                          return label ? `${c} — ${label}` : c;
                        }).join('; ')}
                      />
                    )}
                    <SummaryRow label="País" value={company.country} />
                    {company.state && <SummaryRow label="Departamento" value={company.state} />}
                    <SummaryRow label="Ciudad" value={company.city} />
                  </div>
                  <div style={{ ...styles.summaryBox, marginTop: 12 }}>
                    <p style={{ fontWeight: 700, color: '#c41e3a', marginBottom: 8, marginTop: 0 }}>Representante Legal</p>
                    <SummaryRow label="Nombre" value={`${rep.firstName} ${rep.lastName}`} />
                    <SummaryRow label="Correo" value={rep.email} />
                    <SummaryRow label="Teléfono" value={rep.phone} />
                    <SummaryRow label="País" value={rep.country} />
                    {rep.state && <SummaryRow label="Departamento" value={rep.state} />}
                    <SummaryRow label="Ciudad" value={rep.city} />
                  </div>
                  <div style={{ ...styles.summaryBox, marginTop: 12 }}>
                    <p style={{ fontWeight: 700, color: '#c41e3a', marginBottom: 8, marginTop: 0 }}>Contactos</p>
                    <SummaryRow label="Contacto 1 (Representante legal)" value={`${rep.firstName} ${rep.lastName} — ${rep.email}`} />
                    {extraContacts.filter(c => c.firstName && c.email).map((c, i) => (
                      <SummaryRow key={i} label={`Contacto ${i + 2}`} value={`${c.firstName} ${c.lastName} — ${c.email}`} />
                    ))}
                    <SummaryRow
                      label="Contacto principal"
                      value={mainContactIndex === 0
                        ? `${rep.firstName} ${rep.lastName} (${rep.email})`
                        : extraContacts[mainContactIndex - 1]
                          ? `${extraContacts[mainContactIndex - 1].firstName} ${extraContacts[mainContactIndex - 1].lastName} (${extraContacts[mainContactIndex - 1].email})`
                          : '—'}
                    />
                  </div>
                  <div style={styles.infoBox}>
                    <strong>⚠️ Importante:</strong> Al enviar, tu entidad quedará en estado <em>Pendiente de aprobación</em>. La Coordinación de Empleabilidad e Inserción Laboral revisará tu información y te notificará al correo del contacto principal.
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
              <p style={styles.successText}>La Coordinación de Empleabilidad e Inserción Laboral revisará tu información y te notificará al correo del contacto principal.</p>
              <p style={styles.successText}>La contraseña inicial de acceso será el <strong>NIT</strong> de la entidad: <strong>{company.nit}</strong>. Podrás cambiarla una vez seas aprobado.</p>
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
