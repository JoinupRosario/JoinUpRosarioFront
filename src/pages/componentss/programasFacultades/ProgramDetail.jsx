import React, { useState, useEffect } from 'react';
import { FiArrowLeft, FiEdit, FiCheck, FiX, FiPlus } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import '../../styles/ProgramasYFacultades.css';

const INITIAL_EDITED = { code: '', name: '', level: '', status: '' };

const INITIAL_ADD_FACULTY = {
  facultyId: '',
  code: '',
  costCentre: '',
  snies: '',
  registroCalificado: '',
  fechaRegistroCalificado: '',
};

function parseDDMMYYYY(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  const parts = trimmed.split(/[/.-]/);
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  const d = new Date(year, month, day);
  if (isNaN(d.getTime()) || d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  return d;
}

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
  const [showAddFacultyForm, setShowAddFacultyForm] = useState(false);
  const [addFacultyForm, setAddFacultyForm] = useState(INITIAL_ADD_FACULTY);
  const [addFacultyError, setAddFacultyError] = useState('');
  const [addingFaculty, setAddingFaculty] = useState(false);
  const [updatingPfId, setUpdatingPfId] = useState(null);

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
      setShowAddFacultyForm(false);
      setAddFacultyForm(INITIAL_ADD_FACULTY);
      setAddFacultyError('');
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

  const handleOpenAddFaculty = () => {
    setAddFacultyError('');
    setAddFacultyForm({ ...INITIAL_ADD_FACULTY, code: program?.code ?? '' });
    setShowAddFacultyForm(true);
  };

  const handleCancelAddFaculty = () => {
    setShowAddFacultyForm(false);
    setAddFacultyForm(INITIAL_ADD_FACULTY);
    setAddFacultyError('');
  };

  const handleAgregarFacultad = async () => {
    if (!programId || addingFaculty) return;
    if (!addFacultyForm.facultyId || !addFacultyForm.facultyId.trim()) {
      setAddFacultyError('Campo requerido');
      return;
    }
    setAddFacultyError('');
    setAddingFaculty(true);
    try {
      const fechaDate = parseDDMMYYYY(addFacultyForm.fechaRegistroCalificado);
      const payload = {
        program: programId,
        faculty: addFacultyForm.facultyId,
        code: addFacultyForm.code?.trim() || undefined,
        centroCosto: addFacultyForm.costCentre?.trim() || undefined,
        snies: addFacultyForm.snies?.trim() || undefined,
        registroCalificado: addFacultyForm.registroCalificado?.trim() || undefined,
        fechaRegistroCalificado: fechaDate ? fechaDate.toISOString() : undefined,
        status: 'ACTIVE',
        activo: 'SI',
      };
      await api.post('/program-faculties', payload);
      const { data } = await api.get('/program-faculties', { params: { programId, limit: 200 } });
      setProgramFaculties(data.data || []);
      setShowAddFacultyForm(false);
      setAddFacultyForm(INITIAL_ADD_FACULTY);
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

  const handleToggleProgramFaculty = async (pf, currentActive) => {
    const id = pf._id;
    if (!id || updatingPfId) return;
    const nextActivo = currentActive ? 'NO' : 'SI';
    const nextStatus = currentActive ? 'INACTIVE' : 'ACTIVE';
    const confirmMsg = currentActive
      ? `¿Desactivar la relación "${pf.nombreFacultad ?? pf.faculty?.name ?? 'esta facultad'}"?`
      : `¿Activar la relación "${pf.nombreFacultad ?? pf.faculty?.name ?? 'esta facultad'}"?`;
    const { isConfirmed } = await Swal.fire({
      title: currentActive ? 'Desactivar relación' : 'Activar relación',
      text: confirmMsg,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      cancelButtonColor: '#6c757d',
      confirmButtonText: currentActive ? 'Sí, desactivar' : 'Sí, activar',
      cancelButtonText: 'Cancelar',
    });
    if (!isConfirmed) return;
    setUpdatingPfId(id);
    try {
      await api.put(`/program-faculties/${id}`, { activo: nextActivo, status: nextStatus });
      setProgramFaculties((prev) =>
        prev.map((p) => (p._id === id ? { ...p, activo: nextActivo, status: nextStatus, estado: nextStatus } : p))
      );
      await Swal.fire({
        icon: 'success',
        title: 'Éxito',
        text: nextActivo === 'SI' ? 'Relación activada.' : 'Relación desactivada.',
        confirmButtonColor: '#c41e3a',
      });
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'No se pudo actualizar.',
        confirmButtonColor: '#c41e3a',
      });
    } finally {
      setUpdatingPfId(null);
    }
  };

  const alreadyLinkedIdsSet = new Set(
    programFaculties
      .map((pf) => pf.faculty?._id ?? pf.faculty)
      .filter(Boolean)
      .map((id) => String(id))
  );
  const facultiesToSelect = facultiesList.filter(
    (f) => f._id && !alreadyLinkedIdsSet.has(String(f._id))
  );

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
        {isEditing && !showAddFacultyForm && (
          <div className="pyf-add-faculty-bar">
            <button
              type="button"
              className="pyf-btn pyf-btn-primary"
              onClick={handleOpenAddFaculty}
              title="Agregar facultad al programa"
            >
              <FiPlus className="pyf-btn-icon" />
              Agregar facultad
            </button>
          </div>
        )}
        {isEditing && showAddFacultyForm && (
          <div className="pyf-add-faculty-form">
            <h5 className="pyf-add-faculty-form-title">Nueva facultad asociada</h5>
            <p className="pyf-add-faculty-hint">
              {facultiesToSelect.length} facultad{facultiesToSelect.length !== 1 ? 'es' : ''} disponible{facultiesToSelect.length !== 1 ? 's' : ''} para agregar (las ya asociadas no se muestran).
            </p>
            <div className="pyf-detail-fields pyf-detail-fields-two-cols">
              <div className="pyf-detail-field">
                <label>Facultad: <span className="pyf-required">*</span></label>
                <select
                  className={`pyf-edit-input pyf-edit-select ${addFacultyError ? 'pyf-input-error' : ''}`}
                  value={addFacultyForm.facultyId}
                  onChange={(e) => { setAddFacultyForm((f) => ({ ...f, facultyId: e.target.value })); setAddFacultyError(''); }}
                  disabled={addingFaculty}
                >
                  <option value="">Seleccionar</option>
                  {facultiesToSelect.map((f) => (
                    <option key={f._id} value={f._id}>{f.code ?? ''} - {f.name ?? ''}</option>
                  ))}
                </select>
                {addFacultyError && <span className="pyf-field-error">{addFacultyError}</span>}
              </div>
              <div className="pyf-detail-field">
                <label>Código Programa:</label>
                <input
                  type="text"
                  className="pyf-edit-input"
                  value={addFacultyForm.code}
                  onChange={(e) => setAddFacultyForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="Cod. programa"
                  disabled={addingFaculty}
                />
              </div>
              <div className="pyf-detail-field">
                <label>Centro de Costo:</label>
                <input
                  type="text"
                  className="pyf-edit-input"
                  value={addFacultyForm.costCentre}
                  onChange={(e) => setAddFacultyForm((f) => ({ ...f, costCentre: e.target.value }))}
                  placeholder="Centro de Costo"
                  disabled={addingFaculty}
                />
              </div>
              <div className="pyf-detail-field">
                <label>Registro Calificado:</label>
                <input
                  type="text"
                  className="pyf-edit-input"
                  value={addFacultyForm.registroCalificado}
                  onChange={(e) => setAddFacultyForm((f) => ({ ...f, registroCalificado: e.target.value }))}
                  placeholder="Registro"
                  disabled={addingFaculty}
                />
              </div>
              <div className="pyf-detail-field">
                <label>SNIES:</label>
                <input
                  type="text"
                  className="pyf-edit-input"
                  value={addFacultyForm.snies}
                  onChange={(e) => setAddFacultyForm((f) => ({ ...f, snies: e.target.value }))}
                  placeholder="SNIES"
                  disabled={addingFaculty}
                />
              </div>
              <div className="pyf-detail-field">
                <label>Fecha Registro Calificado:</label>
                <input
                  type="text"
                  className="pyf-edit-input"
                  value={addFacultyForm.fechaRegistroCalificado}
                  onChange={(e) => setAddFacultyForm((f) => ({ ...f, fechaRegistroCalificado: e.target.value }))}
                  placeholder="DD/MM/YYYY"
                  disabled={addingFaculty}
                />
              </div>
            </div>
            <div className="pyf-add-faculty-form-actions">
              <button
                type="button"
                className="pyf-btn pyf-btn-primary"
                onClick={handleAgregarFacultad}
                disabled={addingFaculty}
              >
                {addingFaculty ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                className="pyf-btn pyf-btn-secondary"
                onClick={handleCancelAddFaculty}
                disabled={addingFaculty}
              >
                Cancelar
              </button>
            </div>
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
                  <th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {programFaculties.map((pf) => {
                  const facultyId = pf.faculty?._id || pf.faculty;
                  const facultyName = pf.nombreFacultad ?? pf.faculty?.name ?? '-';
                  const facultyCode = pf.codigoFacultad ?? pf.faculty?.code ?? '-';
                  const estadoRelacion = (pf.estado ?? pf.status ?? '').toString().toUpperCase();
                  const isActive = estadoRelacion === 'ACTIVE';
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
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="switch-container">
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => handleToggleProgramFaculty(pf, isActive)}
                              disabled={updatingPfId === pf._id}
                            />
                            <span className="slider" />
                          </label>
                          <span className={`status-text ${isActive ? 'active' : 'inactive'}`}>
                            {isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </td>
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
