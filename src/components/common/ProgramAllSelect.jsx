import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

/**
 * Select de programas (tabla program / colección programs). Carga opciones desde GET /programs.
 * Reutilizable en formularios de programas en curso, finalizados, etc.
 *
 * @param {string} value - Id del programa seleccionado (_id)
 * @param {Function} onChange - (programId: string) => void
 * @param {string} [id='program-all-select'] - id del select
 * @param {string} [label='Programa'] - Etiqueta (floating label)
 * @param {boolean} [required] - Si se muestra asterisco
 * @param {string} [className='form-floating mb-3'] - Clase del contenedor
 * @param {string} [placeholderOption='Seleccione'] - Texto de la opción vacía
 * @param {Function} [onError] - (title, message) => void para errores
 */
const ProgramAllSelect = ({
  value = '',
  onChange,
  id = 'program-all-select',
  label = 'Programa',
  required = false,
  className = 'form-floating mb-3',
  placeholderOption = 'Seleccione',
  onError,
}) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/programs?limit=2000');
      const raw = res.data?.data || [];
      // Quitar duplicados por nombre (mantener la primera ocurrencia)
      const seen = new Set();
      const unique = raw.filter((p) => {
        const key = (p.name || p.code || String(p._id)).trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setOptions(unique);
    } catch (err) {
      console.error('Error cargando programas:', err);
      if (onError) onError('Error', 'No se pudieron cargar los programas');
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  return (
    <div className={className}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-select"
        disabled={loading}
      >
        <option value="">{loading ? 'Cargando...' : placeholderOption}</option>
        {options.map((p) => (
          <option key={p._id} value={p._id}>
            {p.name || p.code || p._id}
          </option>
        ))}
      </select>
      <label htmlFor={id}>
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
    </div>
  );
};

export default ProgramAllSelect;
