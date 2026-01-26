import React, { useState, useEffect, useCallback } from 'react';
import {
  FiSearch,
  FiRefreshCw,
  FiDownload,
  FiFileText,
  FiActivity,
  FiEdit,
  FiAlertCircle
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import '../../styles/student.css';

// Utilidades de alertas
const createAlert = (icon, title, text, confirmButtonText = 'Aceptar') => {
  return Swal.fire({
    icon,
    title,
    text,
    confirmButtonText,
    confirmButtonColor: '#c41e3a',
    background: '#fff',
    color: '#333'
  });
};

const Student = ({ onVolver }) => {
  // Estados principales
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Funciones de utilidad
  const showAlert = useCallback((icon, title, text, confirmButtonText) => {
    return createAlert(icon, title, text, confirmButtonText);
  }, []);

  const showError = useCallback((title, text) => {
    return showAlert('error', title, text);
  }, [showAlert]);

  const showFuncionalidadEnDesarrollo = useCallback((funcionalidad) => {
    showAlert(
      'info',
      'Funcionalidad en Desarrollo',
      `La funcionalidad "${funcionalidad}" está actualmente en desarrollo y estará disponible próximamente.`
    );
  }, [showAlert]);

  // Cargar estudiantes
  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      // TODO: Implementar llamada a la API cuando esté disponible
      // const response = await api.get('/students');
      // setStudents(response.data);
      
      // Datos de ejemplo por ahora
      await new Promise(resolve => setTimeout(resolve, 500));
      setStudents([]);
    } catch (error) {
      console.error('Error loading students', error);
      showError('Error', 'No se pudieron cargar los estudiantes');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Filtrar estudiantes según búsqueda
  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    return (
      student.code?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower) ||
      student.name?.toLowerCase().includes(searchLower) ||
      student.lastname?.toLowerCase().includes(searchLower) ||
      student.program?.toLowerCase().includes(searchLower) ||
      student.period?.toLowerCase().includes(searchLower) ||
      student.practiceType?.toLowerCase().includes(searchLower) ||
      student.currentStatus?.toLowerCase().includes(searchLower) ||
      student.finalStatus?.toLowerCase().includes(searchLower)
    );
  });

  // Formatear fecha
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="student-container">
      {/* Barra de acciones */}
      <div className="student-actions">
        <button
          className="btn-action btn-outline"
          onClick={() => showFuncionalidadEnDesarrollo('Buscar estudiantes')}
          title="Buscar estudiantes"
        >
          <FiSearch className="btn-icon" />
          Buscar estudiantes
        </button>
        <button
          className="btn-action btn-outline"
          onClick={() => showFuncionalidadEnDesarrollo('Cargar estudiantes')}
          title="Cargar estudiantes"
        >
          <FiDownload className="btn-icon" />
          Cargar estudiantes
        </button>
        <button
          className="btn-action btn-outline"
          onClick={() => showFuncionalidadEnDesarrollo('Traer estudiantes')}
          title="Traer estudiantes"
        >
          <FiRefreshCw className="btn-icon" />
          Traer estudiantes
        </button>
        <button
          className="btn-action btn-outline"
          onClick={() => showFuncionalidadEnDesarrollo('U.XXI')}
          title="U.XXI"
        >
          <FiFileText className="btn-icon" />
          U.XXI
        </button>
        <button
          className="btn-action btn-outline"
          onClick={() => showFuncionalidadEnDesarrollo('Cambiar estado')}
          title="Cambiar estado"
        >
          <FiEdit className="btn-icon" />
          Cambiar estado
        </button>
        <button
          className="btn-action btn-outline"
          onClick={() => showFuncionalidadEnDesarrollo('Exportar')}
          title="Exportar"
        >
          <FiDownload className="btn-icon" />
          Exportar
        </button>
        <button
          className="btn-action btn-outline"
          onClick={() => showFuncionalidadEnDesarrollo('Historial de estados')}
          title="Historial de estados"
        >
          <FiActivity className="btn-icon" />
          Historial de estados
        </button>
        <button
          className="btn-action btn-outline"
          onClick={() => showFuncionalidadEnDesarrollo('Prácticas legalizadas')}
          title="Prácticas legalizadas"
        >
          <FiFileText className="btn-icon" />
          Prácticas legalizadas
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="search-container">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por código, correo, nombres, apellidos, programa, período..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Tabla de estudiantes */}
      <div className="student-table-container">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando estudiantes...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="empty-state">
            <FiAlertCircle className="empty-icon" />
            <p>{searchTerm ? 'No se encontraron estudiantes con los criterios de búsqueda' : 'No hay estudiantes registrados'}</p>
          </div>
        ) : (
          <table className="student-table">
            <thead>
              <tr>
                <th>CÓDIGO</th>
                <th>CORREO ELECTRÓNICO</th>
                <th>NOMBRES</th>
                <th>APELLIDOS</th>
                <th>PROGRAMA AUTORIZADO</th>
                <th>PERÍODO AUTORIZADO</th>
                <th>TIPO DE PRÁCTICA</th>
                <th>ESTADO ACTUAL</th>
                <th>ESTADO FINAL</th>
                <th>ACTUALIZACIÓN</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student._id || student.id}>
                  <td>{student.code || '-'}</td>
                  <td>{student.email || '-'}</td>
                  <td>{student.name || '-'}</td>
                  <td>{student.lastname || '-'}</td>
                  <td>{student.program || '-'}</td>
                  <td>{student.period || '-'}</td>
                  <td>{student.practiceType || '-'}</td>
                  <td>
                    <span className={`status status-${student.currentStatus?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                      {student.currentStatus || '-'}
                    </span>
                  </td>
                  <td>
                    <span className={`status status-${student.finalStatus?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                      {student.finalStatus || '-'}
                    </span>
                  </td>
                  <td>{formatDate(student.updatedAt || student.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Student;
