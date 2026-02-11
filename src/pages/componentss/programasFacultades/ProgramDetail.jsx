import React, { useState, useEffect } from 'react';
import { FiArrowLeft, FiEdit, FiCheck, FiX, FiPlus } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import '../../styles/ProgramasYFacultades.css';

const INITIAL_EDITED = { code: '', name: '', level: '', status: '' };

export default function ProgramDetail({ onVolver }) {
  const navigate = useNavigate();
  const location = useLocation();
  const programId = (() => {
    const m = location.pathname.match(/\/programa\/([^/]+)$/);
    return m ? m[1] : null;
  })();
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState(null);
  const [programFaculties, setProgramFaculties] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(INITIAL_EDITED);
  const [saving, setSaving] = useState(false);
  const [facultiesList, setFacultiesList] = useState([]);
  const [selectedFacultyToAdd, setSelectedFacultyToAdd] = useState('');
  const [addingFaculty, setAddingFaculty] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!programId) return;
      setLoading(true);
      try {
        const [progRes, pfRes] = await Promise.all([
          api.get(`/programs/${programId}`),
          api.get('/program-faculties', { params: { programId, limit: 200 } }),
        ]);
        setProgram(progRes.data);
        setProgramFaculties(pfRes.data.data || []);
      } catch (err) {
        console.error(err);
        setProgram(null);
        setProgramFaculties([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [programId]);

  useEffect(() => {
    if (isEditing && program) {
      setEditedData({
        code: program.code ?? '',
        name: program.name ?? '',
        level: program.level ?? program.label_level ?? '',
        status: program.status ?? '',
      });
    } else if (!isEditing) {
      setEditedData(INITIAL_EDITED);
      setSelectedFacultyToAdd('');
    }
  }, [isEditing, program]);

  useEffect(() => {
    const load = async () => {
      if (!isEditing) return;
      try {
        const { data } = await api.get('/faculties', { params: { limit: 500 } });
        setFacultiesList(data.data || []);
      } catch (err) {
        console.error(err);
        setFacultiesList([]);
      }
    };
    load();
  }, [isEditing]);

  const handleActualizar = async () => {
    if (!programId || saving) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/programs/${programId}`, editedData);
      setProgram(data);
      setIsEditing(false);
      await Swal.fire({
        icon: 'success',
        title: 'Programa actualizado',
        text: 'Los cambios se han guardado correctamente.',
        confirmButtonColor: '#c41e3a',
      });
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'No se pudieron guardar los cambios.',
        confirmButtonColor: '#c41e3a',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelar = () => {
    setIsEditing(false);
    setEditedData(INITIAL_EDITED);
  };

  const handleGoToFaculty = (facultyId) => {
    if (facultyId) navigate(`/dashboard/programas-facultades/facultad/${facultyId}`);
  };

  const handleAgregarFacultad = async () => {
    if (!programId || !selectedFacultyToAdd || addingFaculty) return;
    setAddingFaculty(true);
    try {
      await api.post('/program-faculties', {
        program: programId,
        faculty: selectedFacultyToAdd,
        status: 'ACTIVE',
        activo: 'SI',
      });
      const { data } = await api.get('/program-faculties', { params: { programId, limit: 200 } });
      setProgramFaculties(data.data || []);
      setSelectedFacultyToAdd('');
      await Swal.fire({
        icon: 'success',
        title: 'Facultad agregada',
        text: 'La facultad se asoció correctamente al programa.',
        confirmButtonColor: '#c41e3a',
      });
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'No se pudo agregar la facultad.',
        confirmButtonColor: '#c41e3a',
      });
    } finally {
      setAddingFaculty(false);
    }
  };

  const alreadyLinkedFacultyIds = programFaculties.map((pf) => pf.faculty?._id || pf.faculty).filter(Boolean);
  const facultiesToSelect = facultiesList.filter((f) => f._id && !alreadyLinkedFacultyIds.includes(f._id));

  if (loading) {
    return (
      <div className="configuracion-content">
        <div className="pyf-section">
          <div className="pyf-detail-header">
            <div className="configuracion-actions">
              <button type="button" className="btn-volver" onClick={onVolver}>
                <FiArrowLeft className="btn-icon" />
                Volver
              </button>
            </div>
          </div>
          <div className="pyf-loading">Cargando programa...</div>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="configuracion-content">
        <div className="pyf-section">
          <div className="pyf-detail-header">
            <div className="configuracion-actions">
              <button type="button" className="btn-volver" onClick={onVolver}>
                <FiArrowLeft className="btn-icon" />
                Volver
              </button>
            </div>
          </div>
          <div className="pyf-no-data">Programa no encontrado.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="configuracion-content">
      <div className="pyf-section">
        <div className="pyf-detail-header">
          <div className="configuracion-actions">
            {isEditing ? (
              <>
                <button
                  type="button"
                  className="btn-guardar"
                  onClick={handleActualizar}
                  disabled={saving}
                  title="Guardar cambios"
                >
                  {saving ? (
                    <span>Guardando...</span>
                  ) : (
                    <>
                      <FiCheck className="btn-icon" />
                      Actualizar
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn-volver"
                  onClick={handleCancelar}
                  disabled={saving}
                  title="Cancelar edición"
                >
                  <FiX className="btn-icon" />
                  Cancelar
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-guardar pyf-btn-editar"
                onClick={() => setIsEditing(true)}
                title="Editar programa"
              >
                <FiEdit className="btn-icon" />
                Editar
              </button>
            )}
            <button type="button" className="btn-volver" onClick={onVolver}>
              <FiArrowLeft className="btn-icon" />
              Volver
            </button>
          </div>
        </div>

      <section className="pyf-detail-section">
        <h4 className="pyf-detail-section-title">DATOS DEL PROGRAMA</h4>
        <div className="pyf-detail-fields">
          <div className="pyf-detail-field">
            <label><b>Código</b>{isEditing && <FiEdit className="pyf-field-edit-icon" />}</label>
            {isEditing ? (
              <input type="text" className="pyf-edit-input" value={editedData.code} onChange={(e) => setEditedData((d) => ({ ...d, code: e.target.value }))} placeholder="Código" />
            ) : (
              <span>{program.code ?? '-'}</span>
            )}
          </div>
          <div className="pyf-detail-field">
            <label><b>Nombre</b>{isEditing && <FiEdit className="pyf-field-edit-icon" />}</label>
            {isEditing ? (
              <input type="text" className="pyf-edit-input" value={editedData.name} onChange={(e) => setEditedData((d) => ({ ...d, name: e.target.value }))} placeholder="Nombre" />
            ) : (
              <span>{program.name ?? '-'}</span>
            )}
          </div>
          <div className="pyf-detail-field">
            <label><b>Nivel</b>{isEditing && <FiEdit className="pyf-field-edit-icon" />}</label>
            {isEditing ? (
              <select className="pyf-edit-input pyf-edit-select" value={editedData.level} onChange={(e) => setEditedData((d) => ({ ...d, level: e.target.value }))}>
                <option value="">Seleccionar</option>
                <option value="Pregrado">Pregrado</option>
                <option value="Posgrado">Posgrado</option>
                <option value="Maestría">Maestría</option>
                <option value="Doctorado">Doctorado</option>
                <option value="Especialización">Especialización</option>
              </select>
            ) : (
              <span>{program.level ?? program.label_level ?? '-'}</span>
            )}
          </div>
          <div className="pyf-detail-field">
            <label><b>Estado</b>{isEditing && <FiEdit className="pyf-field-edit-icon" />}</label>
            {isEditing ? (
              <select className="pyf-edit-input pyf-edit-select" value={editedData.status} onChange={(e) => setEditedData((d) => ({ ...d, status: e.target.value }))}>
                <option value="">Seleccionar</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            ) : (
              <span>{program.status ?? '-'}</span>
            )}
          </div>
        </div>
      </section>

      <section className="pyf-detail-section">
        <h4 className="pyf-detail-section-title">FACULTADES</h4>
        {isEditing && (
          <div className="pyf-add-faculty-bar">
            <select
              className="pyf-edit-input pyf-edit-select pyf-add-faculty-select"
              value={selectedFacultyToAdd}
              onChange={(e) => setSelectedFacultyToAdd(e.target.value)}
              disabled={addingFaculty}
            >
              <option value="">Seleccionar facultad...</option>
              {facultiesToSelect.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.code ?? ''} - {f.name ?? ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="pyf-btn pyf-btn-primary"
              onClick={handleAgregarFacultad}
              disabled={!selectedFacultyToAdd || addingFaculty}
              title="Agregar facultad al programa"
            >
              <FiPlus className="pyf-btn-icon" />
              {addingFaculty ? 'Agregando...' : 'Agregar facultad'}
            </button>
          </div>
        )}
        <div className="pyf-table-wrap">
          {programFaculties.length === 0 && !isEditing ? (
            <div className="pyf-no-data">No hay facultades asociadas a este programa.</div>
          ) : programFaculties.length === 0 && isEditing ? (
            <div className="pyf-no-data">No hay facultades asociadas. Use &quot;Agregar facultad&quot; para asociar una.</div>
          ) : (
            <table className="pyf-table">
              <thead>
                <tr>
                  <th>COD PROGRAMA</th>
                  <th>COD FACULTAD</th>
                  <th>FACULTAD</th>
                  <th>CENTRO DE COSTO</th>
                  <th>SNIES</th>
                  <th>REGISTRO CALIFICADO</th>
                  <th>FECHA REGISTRO</th>
                </tr>
              </thead>
              <tbody>
                {programFaculties.map((pf) => {
                  const facultyId = pf.faculty?._id || pf.faculty;
                  const facultyName = pf.nombreFacultad ?? pf.faculty?.name ?? '-';
                  const facultyCode = pf.codigoFacultad ?? pf.faculty?.code ?? '-';
                  return (
                    <tr key={pf._id}>
                      <td>{pf.codigoPrograma ?? pf.code ?? '-'}</td>
                      <td>{facultyCode}</td>
                      <td>
                        {facultyId ? (
                          <button
                            type="button"
                            className="pyf-link"
                            onClick={() => handleGoToFaculty(facultyId)}
                          >
                            {facultyName}
                          </button>
                        ) : (
                          facultyName
                        )}
                      </td>
                      <td>{pf.centroCosto ?? pf.cost_centre ?? '-'}</td>
                      <td>{pf.snies ?? '-'}</td>
                      <td>{pf.registroCalificado ?? pf.official_registration ?? '-'}</td>
                      <td>{pf.fechaRegistroCalificado ?? (pf.official_registration_date ? new Date(pf.official_registration_date).toLocaleDateString() : '-')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}
