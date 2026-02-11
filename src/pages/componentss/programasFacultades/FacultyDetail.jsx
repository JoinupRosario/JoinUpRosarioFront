import React, { useState, useEffect } from 'react';
import { FiArrowLeft, FiEdit, FiCheck, FiX } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import '../../styles/ProgramasYFacultades.css';

const INITIAL_EDITED = {
  code: '',
  name: '',
  status: '',
  branch_id: '',
  authorized_signer: '',
  position_signer: '',
  identification_signer: '',
  identification_type_signer: '',
  identification_from_signer: '',
  academic_signer: '',
  position_academic_signer: '',
  mail_academic_signer: '',
  mail_signer: '',
};

export default function FacultyDetail({ onVolver }) {
  const location = useLocation();
  const facultyId = (() => {
    const m = location.pathname.match(/\/facultad\/([^/]+)$/);
    return m ? m[1] : null;
  })();
  const [loading, setLoading] = useState(true);
  const [faculty, setFaculty] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(INITIAL_EDITED);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!facultyId) return;
      setLoading(true);
      try {
        const { data } = await api.get(`/faculties/${facultyId}`);
        setFaculty(data);
      } catch (err) {
        console.error(err);
        setFaculty(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [facultyId]);

  useEffect(() => {
    if (isEditing && faculty) {
      setEditedData({
        code: faculty.code ?? '',
        name: faculty.name ?? '',
        status: faculty.status ?? '',
        branch_id: faculty.branch_id ?? '',
        authorized_signer: faculty.authorized_signer ?? '',
        position_signer: faculty.position_signer ?? '',
        identification_signer: faculty.identification_signer ?? '',
        identification_type_signer: faculty.identification_type_signer ?? '',
        identification_from_signer: faculty.identification_from_signer ?? '',
        academic_signer: faculty.academic_signer ?? '',
        position_academic_signer: faculty.position_academic_signer ?? '',
        mail_academic_signer: faculty.mail_academic_signer ?? '',
        mail_signer: faculty.mail_signer ?? '',
      });
    } else if (!isEditing) {
      setEditedData(INITIAL_EDITED);
    }
  }, [isEditing, faculty]);

  const handleActualizar = async () => {
    if (!facultyId || saving) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/faculties/${facultyId}`, editedData);
      setFaculty(data);
      setIsEditing(false);
      await Swal.fire({
        icon: 'success',
        title: 'Facultad actualizada',
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
          <div className="pyf-loading">Cargando facultad...</div>
        </div>
      </div>
    );
  }

  if (!faculty) {
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
          <div className="pyf-no-data">Facultad no encontrada.</div>
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
                title="Editar facultad"
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

      <section className="pyf-detail-section pyf-faculty-card-wrap">
        <div className="pyf-faculty-card">
          <h4 className="pyf-detail-section-title">DATOS DE LA FACULTAD</h4>
          <div className="pyf-detail-fields pyf-detail-fields-two-cols">
          <div className="pyf-detail-field">
            <label><b>Código</b>{isEditing && <FiEdit className="pyf-field-edit-icon" />}</label>
            {isEditing ? (
              <input type="text" className="pyf-edit-input" value={editedData.code} onChange={(e) => setEditedData((d) => ({ ...d, code: e.target.value }))} placeholder="Código" />
            ) : (
              <span>{faculty.code ?? '-'}</span>
            )}
          </div>
          <div className="pyf-detail-field">
            <label><b>Nombre</b>{isEditing && <FiEdit className="pyf-field-edit-icon" />}</label>
            {isEditing ? (
              <input type="text" className="pyf-edit-input" value={editedData.name} onChange={(e) => setEditedData((d) => ({ ...d, name: e.target.value }))} placeholder="Nombre" />
            ) : (
              <span>{faculty.name ?? '-'}</span>
            )}
          </div>
          <div className="pyf-detail-field">
            <label><b>Estado</b>{isEditing && <FiEdit className="pyf-field-edit-icon" />}</label>
            {isEditing ? (
              <select className="pyf-edit-input pyf-edit-select" value={editedData.status} onChange={(e) => setEditedData((d) => ({ ...d, status: e.target.value }))}>
                <option value="">Seleccionar</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="inactive">inactive</option>
              </select>
            ) : (
              <span>{faculty.status ?? '-'}</span>
            )}
          </div>
          <div className="pyf-detail-field">
            <label><b>Sede</b>{isEditing && <FiEdit className="pyf-field-edit-icon" />}</label>
            {isEditing ? (
              <input type="text" className="pyf-edit-input" value={editedData.branch_id} onChange={(e) => setEditedData((d) => ({ ...d, branch_id: e.target.value }))} placeholder="Sede" />
            ) : (
              <span>{faculty.branch_id ?? '-'}</span>
            )}
          </div>
          <div className="pyf-detail-field">
            <label><b>Autorizado para firmas</b>{isEditing && <FiEdit className="pyf-field-edit-icon" />}</label>
            {isEditing ? (
              <input type="text" className="pyf-edit-input" value={editedData.authorized_signer} onChange={(e) => setEditedData((d) => ({ ...d, authorized_signer: e.target.value }))} placeholder="Autorizado para firmas" />
            ) : (
              <span>{faculty.authorized_signer ?? '-'}</span>
            )}
          </div>
          <div className="pyf-detail-field">
            <label><b>Cargo</b>{isEditing && <FiEdit className="pyf-field-edit-icon" />}</label>
            {isEditing ? (
              <input type="text" className="pyf-edit-input" value={editedData.position_signer} onChange={(e) => setEditedData((d) => ({ ...d, position_signer: e.target.value }))} placeholder="Cargo" />
            ) : (
              <span>{faculty.position_signer ?? '-'}</span>
            )}
          </div>
          <div className="pyf-detail-field">
            <label><b>Identificación</b>{isEditing && <FiEdit className="pyf-field-edit-icon" />}</label>
            {isEditing ? (
              <input type="text" className="pyf-edit-input" value={editedData.identification_signer} onChange={(e) => setEditedData((d) => ({ ...d, identification_signer: e.target.value }))} placeholder="Identificación" />
            ) : (
              <span>{faculty.identification_signer ?? '-'}</span>
            )}
          </div>
          <div className="pyf-detail-field">
            <label><b>Tipo de identificación</b>{isEditing && <FiEdit className="pyf-field-edit-icon" />}</label>
            {isEditing ? (
              <input type="text" className="pyf-edit-input" value={editedData.identification_type_signer} onChange={(e) => setEditedData((d) => ({ ...d, identification_type_signer: e.target.value }))} placeholder="Tipo" />
            ) : (
              <span>{faculty.identification_type_signer ?? '-'}</span>
            )}
          </div>
          <div className="pyf-detail-field">
            <label><b>Ciudad de expedición</b>{isEditing && <FiEdit className="pyf-field-edit-icon" />}</label>
            {isEditing ? (
              <input type="text" className="pyf-edit-input" value={editedData.identification_from_signer} onChange={(e) => setEditedData((d) => ({ ...d, identification_from_signer: e.target.value }))} placeholder="Ciudad" />
            ) : (
              <span>{faculty.identification_from_signer ?? '-'}</span>
            )}
          </div>
          <div className="pyf-detail-field">
            <label><b>Autorizado académico</b>{isEditing && <FiEdit className="pyf-field-edit-icon" />}</label>
            {isEditing ? (
              <input type="text" className="pyf-edit-input" value={editedData.academic_signer} onChange={(e) => setEditedData((d) => ({ ...d, academic_signer: e.target.value }))} placeholder="Autorizado académico" />
            ) : (
              <span>{faculty.academic_signer ?? '-'}</span>
            )}
          </div>
          <div className="pyf-detail-field">
            <label><b>Cargo autorizado académico</b>{isEditing && <FiEdit className="pyf-field-edit-icon" />}</label>
            {isEditing ? (
              <input type="text" className="pyf-edit-input" value={editedData.position_academic_signer} onChange={(e) => setEditedData((d) => ({ ...d, position_academic_signer: e.target.value }))} placeholder="Cargo" />
            ) : (
              <span>{faculty.position_academic_signer ?? '-'}</span>
            )}
          </div>
          <div className="pyf-detail-field">
            <label><b>Correo autorizado académico</b>{isEditing && <FiEdit className="pyf-field-edit-icon" />}</label>
            {isEditing ? (
              <input type="email" className="pyf-edit-input" value={editedData.mail_academic_signer} onChange={(e) => setEditedData((d) => ({ ...d, mail_academic_signer: e.target.value }))} placeholder="Correo" />
            ) : (
              <span>{faculty.mail_academic_signer ?? '-'}</span>
            )}
          </div>
          <div className="pyf-detail-field">
            <label><b>Correo (firmas)</b>{isEditing && <FiEdit className="pyf-field-edit-icon" />}</label>
            {isEditing ? (
              <input type="email" className="pyf-edit-input" value={editedData.mail_signer} onChange={(e) => setEditedData((d) => ({ ...d, mail_signer: e.target.value }))} placeholder="Correo firmas" />
            ) : (
              <span>{faculty.mail_signer ?? '-'}</span>
            )}
          </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
