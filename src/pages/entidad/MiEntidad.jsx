import { useEffect, useMemo, useState } from 'react';
import {
  FiHome,
  FiUser,
  FiFileText,
  FiUsers,
  FiMapPin,
  FiBookOpen,
  FiGlobe,
  FiDownload,
  FiCheckCircle,
  FiXCircle,
} from 'react-icons/fi';
import api from '../../services/api';

/**
 * Vista "Mi entidad" del portal de entidad.
 * Replica visualmente las pestañas que ve un administrador en Companies.jsx,
 * pero TODA la información es de SOLO LECTURA (la entidad no edita aquí).
 *
 * Backend: GET /companies/me  → entidad del usuario autenticado
 *          GET /companies/me/document/:field → URL firmada de documentos
 */
const TABS = [
  { id: 'entidad', label: 'Entidad', Icon: FiHome },
  { id: 'contactos', label: 'Contactos', Icon: FiUsers },
  { id: 'documentos', label: 'Documentos', Icon: FiFileText },
];

export default function MiEntidad() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('entidad');

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const { data } = await api.get('/companies/me');
        if (!abort) setCompany(data || null);
      } catch (err) {
        if (!abort) {
          console.error('[MiEntidad] error', err);
          setError(err?.response?.data?.message || 'No se pudo cargar la información de tu entidad.');
        }
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="dent-page">
        <div className="dent-empty">Cargando información de tu entidad…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dent-page">
        <div className="dent-alert dent-alert-error">{error}</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="dent-page">
        <div className="dent-empty">No se encontró información de la entidad.</div>
      </div>
    );
  }

  return (
    <div className="dent-page">
      <div className="dent-page-header">
        <div className="dent-entity-head">
          {company.logo && /^https?:\/\//i.test(company.logo) && (
            <img src={company.logo} alt="logo" className="dent-entity-logo" />
          )}
          <div>
            <h2 className="dent-page-title">
              {company.commercialName || company.legalName || company.name || 'Mi entidad'}
            </h2>
            <p className="dent-page-subtitle">
              {company.legalName || company.name || ''}
              {company.nit ? ` · NIT ${company.nit}` : ''}
            </p>
            <div className="dent-entity-status">
              <EstadoEntidadBadge value={company.status} />
            </div>
          </div>
        </div>
      </div>

      <div className="dent-hint dent-hint-info">
        Esta vista es de solo consulta. Si necesitas actualizar algún dato de la
        entidad, comunícate con la coordinación de Prácticas.
      </div>

      <div className="dent-tabs">
        {TABS.map((t) => {
          const Icon = t.Icon;
          return (
            <button
              key={t.id}
              type="button"
              className={`dent-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'entidad' && <TabEntidad company={company} />}
      {tab === 'contactos' && <TabContactos company={company} />}
      {tab === 'documentos' && <TabDocumentos company={company} />}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB: ENTIDAD                                                               */
/* ────────────────────────────────────────────────────────────────────────── */
function TabEntidad({ company }) {
  const lr = company.legalRepresentative || {};
  const branches = Array.isArray(company.branches) ? company.branches : [];
  const programs = Array.isArray(company.programsOfInterest) ? company.programsOfInterest : [];
  const ciius = Array.isArray(company.ciiuCodes) ? company.ciiuCodes.filter(Boolean) : [];
  const domains = Array.isArray(company.domains) ? company.domains.filter(Boolean) : [];

  return (
    <>
      <Section title="Datos de la entidad" Icon={FiHome}>
        <div className="dent-grid">
          <Field label="Nombre comercial" value={company.commercialName} />
          <Field label="Razón social" value={company.legalName || company.name} />
          <Field label="Tipo de identificación" value={company.idType} />
          <Field label="Número de identificación" value={company.idNumber || company.nit} />
          <Field label="Sector" value={company.sector} />
          <Field label="Sector MinEducación / SNIES" value={company.sectorMineSnies} />
          <Field label="Tamaño" value={company.size} />
          <Field label="ARL" value={company.arl} />
          <Field label="¿Opera como agencia?" value={boolLabel(company.operatesAsAgency)} />
          <Field label="¿Quiere convenio de prácticas?" value={boolLabel(company.wantsPracticeAgreement)} />
          <Field label="¿Autoriza uso del logo?" value={boolLabel(company.authorizeLogoUsage)} />
        </div>

        {ciius.length > 0 && (
          <div className="dent-subblock">
            <span className="dent-subblock-title">Códigos CIIU</span>
            <div className="dent-chips">
              {ciius.map((c) => (
                <span className="dent-chip" key={c}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {domains.length > 0 && (
          <div className="dent-subblock">
            <span className="dent-subblock-title">Dominios autorizados</span>
            <div className="dent-chips">
              {domains.map((d) => (
                <span className="dent-chip" key={d}>
                  @{d.replace(/^@/, '')}
                </span>
              ))}
            </div>
          </div>
        )}

        {company.missionVision && (
          <div className="dent-subblock">
            <span className="dent-subblock-title">Misión / Visión</span>
            <p className="dent-paragraph">{company.missionVision}</p>
          </div>
        )}
        {company.description && (
          <div className="dent-subblock">
            <span className="dent-subblock-title">Descripción</span>
            <p className="dent-paragraph">{company.description}</p>
          </div>
        )}
      </Section>

      <Section title="Representante legal" Icon={FiUser}>
        <div className="dent-grid">
          <Field label="Nombres" value={lr.firstName} />
          <Field label="Apellidos" value={lr.lastName} />
          <Field label="Tipo de identificación" value={lr.idType} />
          <Field label="Número de identificación" value={lr.idNumber} />
          <Field label="Correo" value={lr.email} />
        </div>
      </Section>

      <Section title="Ubicación y contacto principal" Icon={FiMapPin}>
        <div className="dent-grid">
          <Field label="País" value={company.country} />
          <Field label="Departamento / Estado" value={company.state} />
          <Field label="Ciudad" value={company.city} />
          <Field label="Dirección" value={company.address} />
          <Field label="Teléfono" value={company.phone} />
          <Field label="Correo institucional" value={company.email} />
          <Field
            label="Sitio web"
            value={
              company.website ? (
                <a href={ensureUrl(company.website)} target="_blank" rel="noreferrer">
                  {company.website}
                </a>
              ) : null
            }
          />
        </div>
      </Section>

      <Section title="Programas de interés" Icon={FiBookOpen}>
        {programs.length === 0 ? (
          <div className="dent-empty">Sin programas registrados.</div>
        ) : (
          <div className="dent-table-wrap">
            <table className="dent-table">
              <thead>
                <tr>
                  <th>Nivel</th>
                  <th>Programa</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p, i) => (
                  <tr key={i}>
                    <td>{p.level || '—'}</td>
                    <td>{p.program || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={`Sedes (${branches.length})`} Icon={FiGlobe}>
        {branches.length === 0 ? (
          <div className="dent-empty">No hay sedes adicionales registradas.</div>
        ) : (
          <div className="dent-table-wrap">
            <table className="dent-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Dirección</th>
                  <th>Teléfono</th>
                  <th>País</th>
                  <th>Departamento</th>
                  <th>Ciudad</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b, i) => (
                  <tr key={i}>
                    <td>{b.name || '—'}</td>
                    <td>{b.address || '—'}</td>
                    <td>{b.phone || '—'}</td>
                    <td>{b.country || '—'}</td>
                    <td>{b.state || '—'}</td>
                    <td>{b.city || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB: CONTACTOS                                                             */
/* ────────────────────────────────────────────────────────────────────────── */
function TabContactos({ company }) {
  const contacts = Array.isArray(company.contacts) ? company.contacts : [];
  if (contacts.length === 0) {
    return (
      <Section title="Contactos de la entidad" Icon={FiUsers}>
        <div className="dent-empty">No hay contactos registrados.</div>
      </Section>
    );
  }
  return (
    <Section title={`Contactos de la entidad (${contacts.length})`} Icon={FiUsers}>
      <div className="dent-table-wrap">
        <table className="dent-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Cargo</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Principal</th>
              <th>Tutor de práctica</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c, i) => {
              const nombre = [c.firstName, c.lastName].filter(Boolean).join(' ') || '—';
              const tel = c.phone || c.mobile || '—';
              const email = c.userEmail || c.alternateEmail || '—';
              return (
                <tr key={c._id || i}>
                  <td>
                    <strong>{nombre}</strong>
                    {c.identification && (
                      <div className="dent-cell-sub">
                        {c.idType ? `${c.idType} ` : ''}
                        {c.identification}
                      </div>
                    )}
                  </td>
                  <td>{c.position || '—'}</td>
                  <td>{email}</td>
                  <td>{tel}</td>
                  <td>{c.isPrincipal ? <FiCheckCircle color="#16a34a" /> : <FiXCircle color="#94a3b8" />}</td>
                  <td>{c.isPracticeTutor ? <FiCheckCircle color="#16a34a" /> : <FiXCircle color="#94a3b8" />}</td>
                  <td><EstadoContactoBadge value={c.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB: DOCUMENTOS                                                            */
/* ────────────────────────────────────────────────────────────────────────── */
function TabDocumentos({ company }) {
  const docs = useMemo(
    () => [
      { field: 'logo', label: 'Logo de la entidad', value: company.logo },
      { field: 'chamberOfCommerceCertificate', label: 'Certificado de Cámara de Comercio', value: company.chamberOfCommerceCertificate },
      { field: 'rutDocument', label: 'RUT', value: company.rutDocument },
      { field: 'agencyAccreditationDocument', label: 'Acreditación como agencia', value: company.agencyAccreditationDocument },
    ],
    [company]
  );
  const names = company.documentAttachmentNames || {};
  return (
    <Section title="Documentos de la entidad" Icon={FiFileText}>
      <div className="dent-doc-grid">
        {docs.map((doc) => (
          <DocCard key={doc.field} doc={doc} name={names[doc.field]} />
        ))}
      </div>
    </Section>
  );
}

function DocCard({ doc, name }) {
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const present = !!String(doc.value || '').trim();

  const onOpen = async () => {
    if (!present) return;
    try {
      setLoading(true);
      setErrMsg('');
      const { data } = await api.get(`/companies/me/document/${doc.field}`);
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener');
      } else {
        setErrMsg('No se pudo generar el enlace.');
      }
    } catch (err) {
      console.error('[DocCard] error', err);
      setErrMsg(err?.response?.data?.message || 'No se pudo abrir el documento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`dent-doc-card ${present ? '' : 'is-empty'}`}>
      <div className="dent-doc-card-head">
        <FiFileText className="dent-doc-icon" />
        <div>
          <div className="dent-doc-label">{doc.label}</div>
          <div className="dent-doc-status">
            {present ? (name || 'Documento cargado') : 'No cargado'}
          </div>
        </div>
      </div>
      {present && (
        <button
          type="button"
          className="dent-btn dent-btn-secondary dent-doc-btn"
          onClick={onOpen}
          disabled={loading}
        >
          <FiDownload /> {loading ? 'Abriendo…' : 'Ver / descargar'}
        </button>
      )}
      {errMsg && <div className="dent-alert dent-alert-error" style={{ marginTop: 8 }}>{errMsg}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers UI                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */
function Section({ title, Icon, children }) {
  return (
    <section className="dent-card">
      <h3 className="dent-card-title">
        {Icon ? <Icon /> : null} {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, value }) {
  const isEmpty =
    value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
  return (
    <div className="dent-field">
      <span className="dent-field-label">{label}</span>
      <span className="dent-field-value">{isEmpty ? '—' : value}</span>
    </div>
  );
}

function boolLabel(v) {
  if (v === true) return 'Sí';
  if (v === false) return 'No';
  return '—';
}

function ensureUrl(u) {
  const s = String(u || '').trim();
  if (!s) return '#';
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

function EstadoEntidadBadge({ value }) {
  const v = String(value || '').toLowerCase();
  let cls = 'dent-badge dent-badge-default';
  let label = value || 'Sin estado';
  if (v === 'active' || v === 'activa') {
    cls = 'dent-badge dent-badge-success';
    label = 'Activa';
  } else if (v === 'pending_approval' || v === 'pendiente') {
    cls = 'dent-badge dent-badge-warning';
    label = 'Pendiente de aprobación';
  } else if (v === 'inactive' || v === 'inactiva') {
    cls = 'dent-badge dent-badge-neutral';
    label = 'Inactiva';
  } else if (v === 'rejected' || v === 'rechazada') {
    cls = 'dent-badge dent-badge-danger';
    label = 'Rechazada';
  }
  return <span className={cls}>{label}</span>;
}

function EstadoContactoBadge({ value }) {
  const v = String(value || 'active').toLowerCase();
  if (v === 'active' || v === 'activo') {
    return <span className="dent-badge dent-badge-success">Activo</span>;
  }
  return <span className="dent-badge dent-badge-neutral">Inactivo</span>;
}
