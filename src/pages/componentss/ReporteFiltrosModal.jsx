import {
  createRef,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FiX } from 'react-icons/fi';
import api from '../../services/api';

function useDebounced(value, ms) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function pickRemoteRows(resData) {
  if (!resData) return [];
  if (Array.isArray(resData.data)) return resData.data;
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.results)) return resData.results;
  return [];
}

function optionLabel(row, labelField) {
  if (row == null) return '';
  if (row.label != null) return String(row.label);
  const lf = labelField || 'name';
  if (row.nombreAsignatura && (row.codAsignatura || row.idAsignatura)) {
    const c = row.codAsignatura || row.idAsignatura;
    return `${c} — ${row.nombreAsignatura}`;
  }
  if (row.name && row.nit) {
    return `${row.name} — NIT ${row.nit}`;
  }
  const v = row[lf];
  return v != null ? String(v) : '';
}

function optionValue(row, valueField) {
  const vf = valueField || '_id';
  const v = row[vf];
  return v != null ? String(v) : '';
}

/** Miles con punto, decimal con coma (es-CO). Salida canónica con punto para el backend. */
function parseEsCONumberToCanonical(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const cleaned = s.replace(/\s/g, '');
  const noThousands = cleaned.replace(/\./g, '');
  const withDotDecimal = noThousands.includes(',')
    ? noThousands.replace(',', '.')
    : noThousands;
  const n = Number(withDotDecimal);
  if (!Number.isFinite(n)) return '';
  return String(n);
}

function formatEsCONumber(canonical, localeTag = 'es-CO', fractionDigits = 2) {
  if (canonical === '' || canonical == null) return '';
  const n = Number(canonical);
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat(localeTag, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(n);
}

const DecimalRangeRowField = forwardRef(function DecimalRangeRowField(
  { field, values, setVal, reportId },
  ref
) {
  const loc = field.localeTag || 'es-CO';
  const fd = field.fractionDigits ?? 2;
  const [draftMin, setDraftMin] = useState('');
  const [draftMax, setDraftMax] = useState('');
  const [focusMin, setFocusMin] = useState(false);
  const [focusMax, setFocusMax] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      flush: () => {
        const cMin = parseEsCONumberToCanonical(draftMin);
        const cMax = parseEsCONumberToCanonical(draftMax);
        setVal(field.minKey, cMin);
        setVal(field.maxKey, cMax);
        setFocusMin(false);
        setFocusMax(false);
        setDraftMin(cMin ? formatEsCONumber(cMin, loc, fd) : '');
        setDraftMax(cMax ? formatEsCONumber(cMax, loc, fd) : '');
        return { minKey: field.minKey, maxKey: field.maxKey, cMin, cMax };
      },
    }),
    [draftMin, draftMax, field.minKey, field.maxKey, loc, fd, setVal]
  );

  useEffect(() => {
    if (focusMin) return;
    setDraftMin(values[field.minKey] ? formatEsCONumber(values[field.minKey], loc, fd) : '');
  }, [values[field.minKey], field.minKey, loc, fd, focusMin]);

  useEffect(() => {
    if (focusMax) return;
    setDraftMax(values[field.maxKey] ? formatEsCONumber(values[field.maxKey], loc, fd) : '');
  }, [values[field.maxKey], field.maxKey, loc, fd, focusMax]);

  const previewMin = parseEsCONumberToCanonical(draftMin);
  const previewMax = parseEsCONumberToCanonical(draftMax);

  return (
    <div className="reportes-param-row" key={`${field.minKey}-${field.maxKey}-${reportId}`}>
      <span className="reportes-param-label">{field.label}</span>
      <div className="reportes-param-salario-row">
        <label className="reportes-param-sublabel">
          Desde
          <input
            type="text"
            inputMode="decimal"
            className="reportes-param-input"
            autoComplete="off"
            placeholder="Ej. 1800000 o 1.800.000"
            value={draftMin}
            onFocus={() => {
              setFocusMin(true);
              setDraftMin(values[field.minKey] ? String(values[field.minKey]).replace('.', ',') : '');
            }}
            onChange={(ev) => {
              setFocusMin(true);
              setDraftMin(ev.target.value);
            }}
            onBlur={() => {
              const c = parseEsCONumberToCanonical(draftMin);
              setVal(field.minKey, c);
              setFocusMin(false);
              setDraftMin(c ? formatEsCONumber(c, loc, fd) : '');
            }}
          />
        </label>
        <label className="reportes-param-sublabel">
          Hasta
          <input
            type="text"
            inputMode="decimal"
            className="reportes-param-input"
            autoComplete="off"
            placeholder="Ej. 5000000"
            value={draftMax}
            onFocus={() => {
              setFocusMax(true);
              setDraftMax(values[field.maxKey] ? String(values[field.maxKey]).replace('.', ',') : '');
            }}
            onChange={(ev) => {
              setFocusMax(true);
              setDraftMax(ev.target.value);
            }}
            onBlur={() => {
              const c = parseEsCONumberToCanonical(draftMax);
              setVal(field.maxKey, c);
              setFocusMax(false);
              setDraftMax(c ? formatEsCONumber(c, loc, fd) : '');
            }}
          />
        </label>
      </div>
      {(focusMin || focusMax || draftMin || draftMax) && (previewMin || previewMax) && (
        <span className="reportes-param-inline-hint">
          {previewMin ? `Desde ≈ ${formatEsCONumber(previewMin, loc, fd)}` : ''}
          {previewMin && previewMax ? ' · ' : ''}
          {previewMax ? `Hasta ≈ ${formatEsCONumber(previewMax, loc, fd)}` : ''}
        </span>
      )}
    </div>
  );
});

function SearchableProgramField({ field, idx, values, setVal, postulantId, modalOpen }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 350);
  const [opts, setOpts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openList, setOpenList] = useState(false);
  const wrapRef = useRef(null);

  const mentionsStudent = Array.isArray(field.dependsOn) && field.dependsOn.includes('postulantId');
  const pid = postulantId ? String(postulantId).trim() : '';
  const blocked = mentionsStudent && !pid;

  useEffect(() => {
    if (!openList) {
      const v = values[field.key];
      if (!v) {
        setQ('');
        return;
      }
      const o = opts.find((x) => x.value === String(v));
      if (o) setQ(o.label);
    }
  }, [values[field.key], opts, field.key, openList]);

  useEffect(() => {
    if (!modalOpen || blocked) {
      setOpts([]);
      return undefined;
    }
    if (!openList) return undefined;
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams();
    if (pid) qs.set('postulantId', pid);
    if (dq.trim()) qs.set('search', dq.trim());
    const path = `/reporting-filters/programs${qs.toString() ? `?${qs}` : ''}`;
    (async () => {
      try {
        const { data } = await api.get(path);
        if (cancelled) return;
        const rows = data?.data || [];
        setOpts(
          rows.map((r) => ({
            value: String(r.value ?? ''),
            label: String(r.label || r.name || r.code || r.value || ''),
          }))
        );
      } catch {
        if (!cancelled) setOpts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modalOpen, blocked, pid, dq, openList]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const onDoc = (ev) => {
      if (wrapRef.current && !wrapRef.current.contains(ev.target)) setOpenList(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [modalOpen]);

  const selected = opts.find((o) => o.value === String(values[field.key] || ''));
  const displayInput = openList ? q : selected?.label || q;

  return (
    <div className="reportes-param-row reportes-param-row--autocomplete" key={`${field.key}-${idx}`} ref={wrapRef}>
      <label htmlFor={`rf-prog-${field.key}`}>{field.label}</label>
      <div className="reportes-autocomplete">
        <div className="reportes-autocomplete-inputwrap">
          <input
            id={`rf-prog-${field.key}`}
            type="text"
            className="reportes-param-input reportes-param-input--combo"
            autoComplete="off"
            disabled={blocked}
            placeholder={blocked ? '— Seleccione primero estudiante —' : 'Buscar por nombre o código de programa…'}
            value={displayInput}
            onChange={(ev) => {
              const t = ev.target.value;
              setQ(t);
              setOpenList(true);
              setVal(field.key, '');
            }}
            onFocus={() => setOpenList(true)}
            role="combobox"
            aria-expanded={openList}
            aria-haspopup="listbox"
          />
        </div>
        {openList && (
          <ul className="reportes-autocomplete-list" role="listbox">
            {loading && <li className="reportes-autocomplete-item muted">Buscando…</li>}
            {!loading && !blocked && !dq.trim() && opts.length > 0 && (
              <li className="reportes-autocomplete-item muted reportes-autocomplete-hint" aria-hidden="true">
                Escriba para acotar la búsqueda
              </li>
            )}
            {!loading &&
              opts.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    className="reportes-autocomplete-item"
                    onClick={() => {
                      setVal(field.key, o.value);
                      setQ(o.label);
                      setOpenList(false);
                    }}
                  >
                    {o.label}
                  </button>
                </li>
              ))}
            {!loading && opts.length === 0 && (
              <li className="reportes-autocomplete-item muted">{blocked ? 'Sin programas' : 'Sin resultados'}</li>
            )}
          </ul>
        )}
      </div>
      {field.hint && <p className="reportes-param-field-hint">{field.hint}</p>}
      {mentionsStudent && !pid && (
        <span className="reportes-param-inline-hint">Si elige estudiante, la lista se acota a programas cursados o en curso.</span>
      )}
    </div>
  );
}

/** Select remoto con búsqueda (`search` en query): empresas, periodos, etc. */
function SearchableRemoteListField({ field, idx, values, setVal, modalOpen }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 350);
  const [opts, setOpts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openList, setOpenList] = useState(false);
  const wrapRef = useRef(null);
  const basePath = field.optionsPath || '';
  const isPeriodos = basePath.includes('/periodos');
  const placeholder =
    field.searchPlaceholder ||
    (isPeriodos ? 'Buscar periodo por código…' : 'Buscar entidad por nombre o NIT…');

  useEffect(() => {
    if (!openList) {
      const v = values[field.key];
      if (!v) {
        setQ('');
        return;
      }
      const o = opts.find((x) => x.value === String(v));
      if (o) setQ(o.label);
    }
  }, [values[field.key], opts, field.key, openList]);

  useEffect(() => {
    if (!modalOpen) {
      setOpts([]);
      return undefined;
    }
    if (!openList) return undefined;
    let cancelled = false;
    setLoading(true);
    const base = basePath || '/companies';
    const join = base.includes('?') ? '&' : '?';
    const path = `${base}${join}search=${encodeURIComponent(dq.trim())}`;
    (async () => {
      try {
        const { data } = await api.get(path);
        if (cancelled) return;
        const rows = pickRemoteRows(data);
        const vf = field.valueField || '_id';
        const lf = field.labelField || 'name';
        setOpts(
          rows
            .map((row) => ({
              value: optionValue(row, vf),
              label: optionLabel(row, lf),
            }))
            .filter((o) => o.value)
        );
      } catch {
        if (!cancelled) setOpts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modalOpen, openList, dq, basePath, field.valueField, field.labelField]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const onDoc = (ev) => {
      if (wrapRef.current && !wrapRef.current.contains(ev.target)) setOpenList(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [modalOpen]);

  const selected = opts.find((o) => o.value === String(values[field.key] || ''));
  const displayInput = openList ? q : selected?.label || q;

  return (
    <div className="reportes-param-row reportes-param-row--autocomplete" key={`${field.key}-${idx}`} ref={wrapRef}>
      <label htmlFor={`rf-remote-${field.key}`}>{field.label}</label>
      <div className="reportes-autocomplete">
        <div className="reportes-autocomplete-inputwrap">
          <input
            id={`rf-remote-${field.key}`}
            type="text"
            className="reportes-param-input reportes-param-input--combo"
            autoComplete="off"
            placeholder={placeholder}
            value={displayInput}
            onChange={(ev) => {
              setQ(ev.target.value);
              setOpenList(true);
              setVal(field.key, '');
            }}
            onFocus={() => setOpenList(true)}
            role="combobox"
            aria-expanded={openList}
            aria-haspopup="listbox"
          />
        </div>
        {openList && (
          <ul className="reportes-autocomplete-list" role="listbox">
            {loading && <li className="reportes-autocomplete-item muted">Buscando…</li>}
            {!loading && !dq.trim() && opts.length > 0 && (
              <li className="reportes-autocomplete-item muted reportes-autocomplete-hint" aria-hidden="true">
                Escriba para acotar la búsqueda
              </li>
            )}
            {!loading &&
              opts.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    className="reportes-autocomplete-item"
                    onClick={() => {
                      setVal(field.key, o.value);
                      setQ(o.label);
                      setOpenList(false);
                    }}
                  >
                    {o.label}
                  </button>
                </li>
              ))}
            {!loading && opts.length === 0 && (
              <li className="reportes-autocomplete-item muted">Sin resultados</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Combobox estilo «select con buscador» sobre opciones ya cargadas (enum, catálogo, listas remotas masivas).
 */
function SearchableLocalOptionsField({
  label,
  htmlId,
  fieldKey,
  value,
  setVal,
  options,
  loading,
  errorMessage,
  disabled,
  modalOpen,
  hint,
  inlineHint,
  allowClear = true,
  emptyLabel = '— Todos / sin filtrar —',
  searchPlaceholder = 'Buscar en la lista…',
  embedded = false,
}) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 200);
  const [openList, setOpenList] = useState(false);
  const wrapRef = useRef(null);

  const strVal = value != null && value !== false ? String(value) : '';

  const filtered = useMemo(() => {
    const list = Array.isArray(options) ? options : [];
    const t = dq.trim().toLowerCase();
    if (!t) return list;
    return list.filter(
      (o) =>
        String(o.label || '')
          .toLowerCase()
          .includes(t) || String(o.value || '').toLowerCase().includes(t)
    );
  }, [options, dq]);

  const selected = (options || []).find((o) => String(o.value) === strVal);

  useEffect(() => {
    if (!openList) {
      if (!strVal) {
        setQ('');
        return;
      }
      if (selected) setQ(selected.label);
    }
  }, [strVal, selected, openList]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const onDoc = (ev) => {
      if (wrapRef.current && !wrapRef.current.contains(ev.target)) setOpenList(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [modalOpen]);

  const displayInput = openList ? q : selected?.label || (strVal ? strVal : '');

  const body = (
    <>
      {!embedded && label ? <label htmlFor={htmlId}>{label}</label> : null}
      <div className={`reportes-autocomplete${embedded ? ' reportes-autocomplete--embedded' : ''}`} ref={wrapRef}>
        <div className="reportes-autocomplete-inputwrap">
          <input
            id={htmlId}
            type="text"
            className="reportes-param-input reportes-param-input--combo"
            autoComplete="off"
            placeholder={searchPlaceholder}
            disabled={disabled}
            value={displayInput}
            onChange={(ev) => {
              if (disabled) return;
              setQ(ev.target.value);
              setOpenList(true);
              if (allowClear) setVal(fieldKey, '');
            }}
            onFocus={() => {
              if (!disabled) setOpenList(true);
            }}
            role="combobox"
            aria-expanded={openList}
            aria-haspopup="listbox"
          />
        </div>
        {openList && !disabled && (
          <ul className="reportes-autocomplete-list" role="listbox">
            {loading && <li className="reportes-autocomplete-item muted">Cargando…</li>}
            {!loading && allowClear && (
              <li key="__empty">
                <button
                  type="button"
                  className="reportes-autocomplete-item"
                  onClick={() => {
                    setVal(fieldKey, '');
                    setQ('');
                    setOpenList(false);
                  }}
                >
                  {emptyLabel}
                </button>
              </li>
            )}
            {!loading && !dq.trim() && filtered.length > 0 && (
              <li className="reportes-autocomplete-item muted reportes-autocomplete-hint" aria-hidden="true">
                Escriba para acotar la búsqueda
              </li>
            )}
            {!loading &&
              filtered.map((o) => (
                <li key={String(o.value)}>
                  <button
                    type="button"
                    className="reportes-autocomplete-item"
                    onClick={() => {
                      setVal(fieldKey, o.value);
                      setQ(o.label);
                      setOpenList(false);
                    }}
                  >
                    {o.label}
                  </button>
                </li>
              ))}
            {!loading && filtered.length === 0 && (!allowClear || dq.trim()) && (
              <li className="reportes-autocomplete-item muted">Sin resultados</li>
            )}
          </ul>
        )}
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="reportes-param-embed-combo">
        {body}
        {errorMessage ? <span className="reportes-param-inline-err">{errorMessage}</span> : null}
      </div>
    );
  }

  return (
    <div className="reportes-param-row reportes-param-row--autocomplete">
      {body}
      {loading && <span className="reportes-param-inline-hint">Cargando opciones…</span>}
      {hint && <p className="reportes-param-field-hint">{hint}</p>}
      {inlineHint && <span className="reportes-param-inline-hint">{inlineHint}</span>}
      {!loading && errorMessage && <span className="reportes-param-inline-err">{errorMessage}</span>}
    </div>
  );
}

function SearchablePostulantField({ field, idx, values, setValues, dependentProgramKeys, modalOpen }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 160);
  const [opts, setOpts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openList, setOpenList] = useState(false);
  const wrapRef = useRef(null);
  const searchPath = field.searchPath || '/reporting-filters/postulants/search';

  useEffect(() => {
    if (!openList) {
      const v = values[field.key];
      if (!v) {
        setQ('');
        return;
      }
      const o = opts.find((x) => x.value === String(v));
      if (o) setQ(o.label);
    }
  }, [values[field.key], opts, field.key, openList]);

  useEffect(() => {
    if (!modalOpen) {
      setOpts([]);
      return undefined;
    }
    if (!openList) return undefined;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data } = await api.get(searchPath, {
          params: { q: dq.trim(), limit: 20 },
        });
        if (!cancelled) setOpts(Array.isArray(data?.data) ? data.data : []);
      } catch {
        if (!cancelled) setOpts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modalOpen, openList, dq, searchPath]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const onDoc = (ev) => {
      if (wrapRef.current && !wrapRef.current.contains(ev.target)) setOpenList(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [modalOpen]);

  const selected = opts.find((o) => o.value === String(values[field.key] || ''));
  const displayInput = openList ? q : selected?.label || q;

  const pick = (hit) => {
    setValues((prev) => {
      const next = { ...prev, [field.key]: hit.value };
      (dependentProgramKeys || []).forEach((k) => {
        delete next[k];
      });
      return next;
    });
    setQ(hit.label);
    setOpenList(false);
    setOpts([]);
  };

  return (
    <div className="reportes-param-row reportes-param-row--autocomplete" key={`${field.key}-${idx}`} ref={wrapRef}>
      <label htmlFor={`rf-post-${field.key}`}>{field.label}</label>
      <div className="reportes-autocomplete">
        <div className="reportes-autocomplete-inputwrap">
          <input
            id={`rf-post-${field.key}`}
            type="text"
            className="reportes-param-input reportes-param-input--combo"
            autoComplete="off"
            placeholder="Buscar por código, identificación o nombre…"
            value={displayInput}
            onChange={(ev) => {
              const t = ev.target.value;
              setQ(t);
              setOpenList(true);
              setValues((prev) => {
                const next = { ...prev, [field.key]: '' };
                (dependentProgramKeys || []).forEach((k) => {
                  delete next[k];
                });
                return next;
              });
            }}
            onFocus={() => setOpenList(true)}
            role="combobox"
            aria-expanded={openList}
            aria-haspopup="listbox"
          />
        </div>
        {openList && (
          <ul className="reportes-autocomplete-list" role="listbox">
            {loading && <li className="reportes-autocomplete-item muted">Buscando…</li>}
            {!loading && !dq.trim() && opts.length > 0 && (
              <li className="reportes-autocomplete-item muted reportes-autocomplete-hint" aria-hidden="true">
                Escriba para acotar la búsqueda
              </li>
            )}
            {!loading &&
              opts.map((h) => (
                <li key={h.value}>
                  <button type="button" className="reportes-autocomplete-item" onClick={() => pick(h)}>
                    {h.label}
                  </button>
                </li>
              ))}
            {!loading && opts.length === 0 && (
              <li className="reportes-autocomplete-item muted">
                {dq.trim() ? 'Sin resultados' : 'Sin estudiantes recientes. Escriba para buscar.'}
              </li>
            )}
          </ul>
        )}
      </div>
      {field.hint ? <p className="reportes-param-field-hint">{field.hint}</p> : null}
    </div>
  );
}

/**
 * Modal de filtros por reporte: config desde `/reporting-filters/reports/:id/config`.
 */
export default function ReporteFiltrosModal({ open, reporte, onClose, onSubmit }) {
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [configError, setConfigError] = useState(null);
  const [meta, setMeta] = useState({ functionalDefinitionPending: false, pendingReason: null, reportHint: null });
  const [fields, setFields] = useState([]);

  const [values, setValues] = useState({});
  const [selectOptions, setSelectOptions] = useState({});
  const [selectLoading, setSelectLoading] = useState({});
  const [selectErrors, setSelectErrors] = useState({});
  const staticOptionsLoadedRef = useRef(new Set());

  const programFieldsRef = useRef([]);

  const reportId = reporte?.id;

  const programFields = useMemo(() => fields.filter((f) => f.kind === 'select_program'), [fields]);
  programFieldsRef.current = programFields;

  const decimalRangeFieldRefs = useMemo(() => {
    const o = {};
    for (const f of fields) {
      if (f.kind === 'decimal_range_row') {
        o[`${f.minKey}|${f.maxKey}`] = createRef();
      }
    }
    return o;
  }, [fields]);

  const buildInitialValues = useCallback((fieldList) => {
    const next = {};
    for (const f of fieldList || []) {
      if (f.kind === 'date_range') {
        next[f.startKey] = '';
        next[f.endKey] = '';
      } else if (f.kind === 'numeric_range_with_unit') {
        next[f.unitKey] = 'anios';
        next[f.minKey] = '';
        next[f.maxKey] = '';
      } else if (f.kind === 'decimal_range_row') {
        next[f.minKey] = '';
        next[f.maxKey] = '';
      } else if (f.kind === 'switch') {
        next[f.key] = false;
      } else if (f.key) {
        next[f.key] = '';
      }
    }
    return next;
  }, []);

  const resetForm = useCallback(() => {
    setValues({});
    setSelectOptions({});
    setSelectLoading({});
    setSelectErrors({});
    staticOptionsLoadedRef.current = new Set();
  }, []);

  useEffect(() => {
    if (!open || !reportId) return undefined;

    let cancelled = false;
    (async () => {
      setLoadingConfig(true);
      setConfigError(null);
      resetForm();
      try {
        const { data } = await api.get(`/reporting-filters/reports/${encodeURIComponent(reportId)}/config`);
        if (cancelled) return;
        setMeta({
          functionalDefinitionPending: !!data.functionalDefinitionPending,
          pendingReason: data.pendingReason || null,
          reportHint: data.reportHint || null,
        });
        const list = Array.isArray(data.fields) ? data.fields : [];
        setFields(list);
        setValues(buildInitialValues(list));
      } catch (e) {
        if (!cancelled) {
          setConfigError(e.response?.data?.message || e.message || 'No se pudo cargar la configuración');
          setFields([]);
        }
      } finally {
        if (!cancelled) setLoadingConfig(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, reportId, resetForm, buildInitialValues]);

  const loadSelectOptions = useCallback(async (field, extraQuery = {}) => {
    const cacheKey = `${field.kind}:${field.loadStrategy}:${field.optionsPath || ''}:${JSON.stringify(extraQuery)}`;
    if (staticOptionsLoadedRef.current.has(cacheKey)) return;

    setSelectLoading((s) => ({ ...s, [cacheKey]: true }));
    setSelectErrors((s) => ({ ...s, [cacheKey]: null }));
    try {
      let path = field.optionsPath;
      const params = new URLSearchParams();
      Object.entries(extraQuery).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== '') params.set(k, String(v));
      });
      if (params.toString()) {
        path = `${path}${path.includes('?') ? '&' : '?'}${params.toString()}`;
      }
      const { data } = await api.get(path);
      const rows =
        field.loadStrategy === 'catalog' || field.loadStrategy === 'enum'
          ? Array.isArray(data?.data)
            ? data.data
            : []
          : pickRemoteRows(data).map((row) => ({
              value: optionValue(row, field.valueField),
              label: optionLabel(row, field.labelField),
              raw: row,
            }));
      const normalized =
        field.loadStrategy === 'catalog' || field.loadStrategy === 'enum'
          ? rows.map((r) => ({
              value: String(r.value),
              label: String(r.label || r.value),
            }))
          : rows.filter((r) => r.value);
      staticOptionsLoadedRef.current.add(cacheKey);
      setSelectOptions((prev) => ({
        ...prev,
        [cacheKey]: { loaded: true, options: normalized },
      }));
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Error al cargar opciones';
      setSelectErrors((prev) => ({ ...prev, [cacheKey]: msg }));
      setSelectOptions((prev) => ({
        ...prev,
        [cacheKey]: { loaded: true, options: [] },
      }));
    } finally {
      setSelectLoading((s) => ({ ...s, [cacheKey]: false }));
    }
  }, []);

  useEffect(() => {
    if (!open || !fields.length) return;
    fields.forEach((f) => {
      if (f.kind === 'select' && (f.loadStrategy === 'remote' || f.loadStrategy === 'enum' || f.loadStrategy === 'catalog')) {
        if (f.loadStrategy === 'remote' && f.searchable) return;
        void loadSelectOptions(f);
      }
    });
  }, [open, fields, loadSelectOptions]);

  useEffect(() => {
    if (!open) return;
    const anyClassicProgram = programFields.some((f) => !f.searchable);
    if (!anyClassicProgram) return;
    const progField = programFields.find((f) => !f.searchable);
    if (!progField) return;
    const extra = {};
    if (values.postulantId) extra.postulantId = String(values.postulantId).trim();
    const cacheKey = `${progField.kind}:${progField.optionsPath}:${JSON.stringify(extra)}`;
    let cancelled = false;
    void (async () => {
      setSelectLoading((s) => ({ ...s, [cacheKey]: true }));
      setSelectErrors((s) => ({ ...s, [cacheKey]: null }));
      try {
        const qs = new URLSearchParams();
        if (extra.postulantId) qs.set('postulantId', extra.postulantId);
        const path = `${progField.optionsPath}${qs.toString() ? `?${qs.toString()}` : ''}`;
        const { data } = await api.get(path);
        if (cancelled) return;
        const opts = (data?.data || []).map((r) => ({
          value: String(r.value),
          label: String(r.label || r.name || r.code || r.value),
        }));
        setSelectOptions((prev) => ({
          ...prev,
          [cacheKey]: { loaded: true, options: opts },
        }));
      } catch (e) {
        if (cancelled) return;
        const msg = e.response?.data?.message || e.message || 'Error al cargar programas';
        setSelectErrors((prev) => ({ ...prev, [cacheKey]: msg }));
        setSelectOptions((prev) => ({
          ...prev,
          [cacheKey]: { loaded: true, options: [] },
        }));
      } finally {
        if (!cancelled) setSelectLoading((s) => ({ ...s, [cacheKey]: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, programFields, values.postulantId]);

  const setVal = (key, v) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reporte) return;
    let payload = { ...values };
    for (const f of fields) {
      if (f.kind !== 'decimal_range_row') continue;
      const rk = `${f.minKey}|${f.maxKey}`;
      const out = decimalRangeFieldRefs[rk]?.current?.flush?.();
      if (out) {
        payload = { ...payload, [out.minKey]: out.cMin, [out.maxKey]: out.cMax };
      }
    }
    onSubmit(reporte, payload);
  };

  if (!open || !reporte) return null;

  const renderField = (field, idx) => {
    if (field.kind === 'date_range') {
      return (
        <div className="reportes-param-row reportes-param-row--range" key={`${field.startKey}-${idx}`}>
          <span className="reportes-param-label">{field.label}</span>
          {field.hint && <p className="reportes-param-field-hint">{field.hint}</p>}
          {field.functionalDefinitionPending && field.pendingReason && (
            <span className="reportes-param-field-note">{field.pendingReason}</span>
          )}
          <div className="reportes-param-range-inputs">
            <label className="reportes-param-sublabel">
              Desde
              <input
                type="date"
                className="reportes-param-input"
                value={values[field.startKey] || ''}
                onChange={(ev) => setVal(field.startKey, ev.target.value)}
              />
            </label>
            <label className="reportes-param-sublabel">
              Hasta
              <input
                type="date"
                className="reportes-param-input"
                value={values[field.endKey] || ''}
                onChange={(ev) => setVal(field.endKey, ev.target.value)}
              />
            </label>
          </div>
        </div>
      );
    }

    if (field.kind === 'numeric_range_with_unit') {
      const unitChoices =
        Array.isArray(field.unitChoices) && field.unitChoices.length > 0
          ? field.unitChoices
          : [
              { value: 'anios', label: 'Años' },
              { value: 'meses', label: 'Meses' },
            ];
      const u = values[field.unitKey] || 'anios';
      const minVal = values[field.minKey] ?? '';
      const maxVal = values[field.maxKey] ?? '';
      const unitShort = unitChoices.find((c) => c.value === u)?.label || (u === 'meses' ? 'Meses' : 'Años');
      const minNum = minVal === '' ? '' : Number(minVal);
      const maxInputMin =
        minVal !== '' && !Number.isNaN(minNum) && Number.isFinite(minNum) ? Math.max(0, Math.floor(minNum)) : 0;
      return (
        <div className="reportes-param-row reportes-param-row--exp-range" key={`${field.minKey}-${field.maxKey}-${idx}`}>
          <span className="reportes-param-label">{field.label}</span>
          <div className="reportes-param-exp-range-grid">
            <label className="reportes-param-sublabel reportes-param-sublabel--unit">
              Unidad
              <SearchableLocalOptionsField
                embedded
                label=""
                htmlId={`rf-unit-${field.unitKey}-${idx}`}
                fieldKey={field.unitKey}
                value={u}
                setVal={setVal}
                options={unitChoices.map((c) => ({ value: c.value, label: c.label }))}
                loading={false}
                disabled={false}
                modalOpen={open}
                allowClear={false}
                emptyLabel=""
                searchPlaceholder="Buscar unidad…"
              />
            </label>
            <label className="reportes-param-sublabel">
              Mínimo ({unitShort})
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                className="reportes-param-input"
                placeholder="Ej. 0"
                value={minVal}
                onChange={(ev) => setVal(field.minKey, ev.target.value)}
              />
            </label>
            <label className="reportes-param-sublabel">
              Máximo ({unitShort})
              <input
                type="number"
                inputMode="numeric"
                min={maxInputMin}
                step={1}
                className="reportes-param-input"
                placeholder="Sin tope"
                value={maxVal}
                onChange={(ev) => setVal(field.maxKey, ev.target.value)}
              />
            </label>
          </div>
        </div>
      );
    }

    if (field.kind === 'decimal_range_row') {
      const decRef = decimalRangeFieldRefs[`${field.minKey}|${field.maxKey}`];
      return (
        <DecimalRangeRowField
          ref={decRef}
          key={`dec-${field.minKey}-${field.maxKey}-${idx}`}
          field={field}
          values={values}
          setVal={setVal}
          reportId={reportId}
        />
      );
    }

    if (field.kind === 'switch') {
      return (
        <div className="reportes-param-row reportes-param-row--switch" key={`${field.key}-${idx}`}>
          <label className="reportes-param-switch">
            <input
              type="checkbox"
              checked={!!values[field.key]}
              onChange={(ev) => setVal(field.key, ev.target.checked)}
            />
            <span>{field.label}</span>
          </label>
        </div>
      );
    }

    if (field.kind === 'text') {
      return (
        <div className="reportes-param-row" key={`${field.key}-${idx}`}>
          <label htmlFor={`rf-${field.key}`}>{field.label}</label>
          <input
            id={`rf-${field.key}`}
            type="text"
            className="reportes-param-input"
            value={values[field.key] || ''}
            onChange={(ev) => setVal(field.key, ev.target.value)}
            disabled={!!field.functionalDefinitionPending}
            placeholder={field.hint || ''}
          />
          {field.functionalDefinitionPending && field.pendingReason && (
            <span className="reportes-param-field-note">{field.pendingReason}</span>
          )}
        </div>
      );
    }

    if (field.kind === 'select') {
      if (field.loadStrategy === 'remote' && field.searchable && field.optionsPath) {
        return (
          <SearchableRemoteListField
            key={`sremote-${field.key}-${reportId}`}
            field={field}
            idx={idx}
            values={values}
            setVal={setVal}
            modalOpen={open}
          />
        );
      }
      const cacheKey = `${field.kind}:${field.loadStrategy}:${field.optionsPath || ''}:{}`;
      const loading = !!selectLoading[cacheKey];
      const err = selectErrors[cacheKey];
      const opts = selectOptions[cacheKey]?.options || [];
      return (
        <SearchableLocalOptionsField
          key={`selloc-${field.key}-${reportId}-${idx}`}
          label={field.label}
          htmlId={`rf-${field.key}`}
          fieldKey={field.key}
          value={values[field.key] || ''}
          setVal={setVal}
          options={opts}
          loading={loading}
          errorMessage={err}
          disabled={!!field.functionalDefinitionPending}
          modalOpen={open}
          searchPlaceholder="Buscar opción…"
        />
      );
    }

    if (field.kind === 'select_program') {
      if (field.searchable) {
        return (
          <SearchableProgramField
            key={`sprog-${field.key}-${reportId}`}
            field={field}
            idx={idx}
            values={values}
            setVal={setVal}
            postulantId={values.postulantId}
            modalOpen={open}
          />
        );
      }
      const pid = values.postulantId ? String(values.postulantId).trim() : '';
      const cacheKey = `${field.kind}:${field.optionsPath}:${JSON.stringify(pid ? { postulantId: pid } : {})}`;
      const loading = !!selectLoading[cacheKey];
      const err = selectErrors[cacheKey];
      const opts = selectOptions[cacheKey]?.options || [];
      const mentionsStudent = Array.isArray(field.dependsOn) && field.dependsOn.includes('postulantId');
      const blockedByStudent = mentionsStudent && !pid;
      const disabled = loading || blockedByStudent;
      return (
        <SearchableLocalOptionsField
          key={`proglloc-${field.key}-${reportId}-${idx}`}
          label={field.label}
          htmlId={`rf-${field.key}`}
          fieldKey={field.key}
          value={values[field.key] || ''}
          setVal={setVal}
          options={opts}
          loading={loading}
          errorMessage={err}
          disabled={disabled}
          modalOpen={open}
          hint={field.hint}
          inlineHint={
            mentionsStudent && !pid
              ? 'Si elige estudiante, la lista se acota a programas cursados o en curso.'
              : undefined
          }
          searchPlaceholder="Buscar programa…"
        />
      );
    }

    if (field.kind === 'autocomplete_postulant') {
      const depKeys = fields
        .filter(
          (f) => f.kind === 'select_program' && Array.isArray(f.dependsOn) && f.dependsOn.includes(field.key)
        )
        .map((f) => f.key);
      return (
        <SearchablePostulantField
          key={`spost-${field.key}-${reportId}`}
          field={field}
          idx={idx}
          values={values}
          setValues={setValues}
          dependentProgramKeys={depKeys}
          modalOpen={open}
        />
      );
    }

    return null;
  };

  return (
    <div className="reportes-modal-overlay" onClick={onClose}>
      <div className="reportes-modal reportes-modal--parametros reportes-modal--filtros-dinamicos" onClick={(e) => e.stopPropagation()}>
        <div className="reportes-modal-header">
          <h3>{reporte.titulo}</h3>
          <button type="button" className="reportes-modal-close" onClick={onClose} aria-label="Cerrar">
            <FiX size={22} />
          </button>
        </div>
        <form className="reportes-param-form" onSubmit={handleSubmit}>
          <div className="reportes-modal-body">
            {loadingConfig && <div className="reportes-modal-loading">Cargando filtros…</div>}
            {configError && <p className="reportes-param-inline-err">{configError}</p>}
            {!loadingConfig && !configError && meta.functionalDefinitionPending && (
              <p className="reportes-param-hint reportes-param-hint--warn">
                Definición funcional pendiente
                {meta.pendingReason ? `: ${meta.pendingReason}` : '.'}
              </p>
            )}
            {!loadingConfig && !configError && fields.length === 0 && (
              <p className="reportes-param-hint">
                {meta.reportHint || 'Este reporte no tiene filtros configurados aún.'}
              </p>
            )}
            {!loadingConfig && !configError && fields.length > 0 && (
              <>
               
                {fields.map((f, i) => renderField(f, i))}
              </>
            )}
          </div>
          <div className="reportes-modal-footer reportes-param-footer">
            <button type="button" className="btn-volver" onClick={onClose}>
              Cerrar
            </button>
            <button type="submit" className="btn-guardar" disabled={loadingConfig || !!configError}>
              Generar reporte
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
