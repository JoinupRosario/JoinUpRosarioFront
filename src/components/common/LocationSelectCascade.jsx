import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

/**
 * Selects en cascada: País → Departamento → Ciudad.
 * Carga datos desde la API /locations (countries, states, cities).
 * Reutilizable en formularios de perfil, programas académicos, etc.
 *
 * @param {Object} value - { countryId: string, stateId: string, cityId: string }
 * @param {Function} onChange - (newValue: { countryId, stateId, cityId }) => void
 * @param {string} [idPrefix='loc'] - Prefijo para id de los selects (ej. 'pc', 'pf')
 * @param {Function} [onError] - (title: string, message: string) => void para mostrar errores
 * @param {string} [className] - Clase CSS para el contenedor de cada select (ej. 'form-floating mb-3')
 */
const LocationSelectCascade = ({
  value = {},
  onChange,
  idPrefix = 'loc',
  onError,
  className = 'form-floating mb-3',
}) => {
  const countryId = value?.countryId ?? '';
  const stateId = value?.stateId ?? '';
  const cityId = value?.cityId ?? '';

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const handleError = useCallback(
    (title, message) => {
      if (onError) onError(title, message);
      else console.error(title, message);
    },
    [onError]
  );

  const fetchCountries = useCallback(async () => {
    try {
      const res = await api.get('/locations/countries?limit=1000');
      setCountries(res.data?.data || []);
    } catch (err) {
      console.error('Error cargando países:', err);
      handleError('Error', 'No se pudieron cargar los países');
    }
  }, [handleError]);

  const fetchStates = useCallback(
    async (cId) => {
      if (!cId) {
        setStates([]);
        return;
      }
      try {
        const res = await api.get(`/locations/states?country=${cId}&limit=1000`);
        setStates(res.data?.data || []);
      } catch (err) {
        console.error('Error cargando departamentos:', err);
        handleError('Error', 'No se pudieron cargar los departamentos');
        setStates([]);
      }
    },
    [handleError]
  );

  const fetchCities = useCallback(
    async (sId) => {
      if (!sId) {
        setCities([]);
        return;
      }
      try {
        const res = await api.get(`/locations/cities?state=${sId}&limit=1000`);
        setCities(res.data?.data || []);
      } catch (err) {
        console.error('Error cargando ciudades:', err);
        handleError('Error', 'No se pudieron cargar las ciudades');
        setCities([]);
      }
    },
    [handleError]
  );

  // Cargar países al montar
  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  // Cuando hay countryId (p. ej. al editar), cargar departamentos
  useEffect(() => {
    if (countryId) {
      fetchStates(countryId);
    } else {
      setStates([]);
    }
  }, [countryId, fetchStates]);

  // Cuando hay stateId (p. ej. al editar), cargar ciudades
  useEffect(() => {
    if (stateId) {
      fetchCities(stateId);
    } else {
      setCities([]);
    }
  }, [stateId, fetchCities]);

  const handleCountryChange = (e) => {
    const newCountryId = e.target.value;
    onChange({
      countryId: newCountryId,
      stateId: '',
      cityId: '',
    });
    if (newCountryId) {
      fetchStates(newCountryId);
    }
    setCities([]);
  };

  const handleStateChange = (e) => {
    const newStateId = e.target.value;
    onChange({
      ...value,
      stateId: newStateId,
      cityId: '',
    });
    if (newStateId) {
      fetchCities(newStateId);
    }
    setCities([]);
  };

  const handleCityChange = (e) => {
    onChange({
      ...value,
      cityId: e.target.value,
    });
  };

  const paisId = `${idPrefix}-pais`;
  const deptoId = `${idPrefix}-departamento`;
  const ciudadId = `${idPrefix}-ciudad`;

  return (
    <>
      <div className={className}>
        <select
          id={paisId}
          value={countryId}
          onChange={handleCountryChange}
          className="form-select"
        >
          <option value="">Seleccionar país</option>
          {countries.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <label htmlFor={paisId}>País</label>
      </div>
      <div className={className}>
        <select
          id={deptoId}
          value={stateId}
          onChange={handleStateChange}
          className="form-select"
          disabled={!countryId}
        >
          <option value="">
            {countryId ? 'Seleccionar departamento' : 'Primero seleccione un país'}
          </option>
          {states.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
        <label htmlFor={deptoId}>Departamento</label>
      </div>
      <div className={className}>
        <select
          id={ciudadId}
          value={cityId}
          onChange={handleCityChange}
          className="form-select"
          disabled={!stateId}
        >
          <option value="">
            {stateId ? 'Seleccionar ciudad' : 'Primero seleccione un departamento'}
          </option>
          {cities.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <label htmlFor={ciudadId}>Ciudad</label>
      </div>
    </>
  );
};

export default LocationSelectCascade;
