import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiActivity, FiSearch } from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../../../services/api';
import '../../../styles/PostulantStatusLog.css';

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

const PostulantStatusLog = ({ onVolver }) => {
  const navigate = useNavigate();
  const [statusLogs, setStatusLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorLogs, setErrorLogs] = useState(null);

  const showError = useCallback((title, text) => createAlert('error', title, text), []);

  const loadStatusLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);
      setErrorLogs(null);
      const response = await api.get('/postulant-logs/status');
      const data = response.data;
      setStatusLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading status logs', error);
      const msg = error.response?.status === 403
        ? 'No tiene permiso para ver el historial de estados.'
        : (error.response?.data?.message || error.message || 'No se pudieron cargar los logs de estados.');
      setErrorLogs(msg);
      setStatusLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    loadStatusLogs();
  }, [loadStatusLogs]);

  const logsFiltrados = useCallback(() => {
    if (!searchTerm.trim()) return statusLogs;
    const term = searchTerm.toLowerCase();
    return statusLogs.filter(log => {
      const fullName = (log.full_name || '').toLowerCase();
      const previousStatus = (log.previous_status || '').toLowerCase();
      const newStatus = (log.new_status || '').toLowerCase();
      const reason = (log.reason || '').toLowerCase();
      const modifiedBy = (log.modified_by || '').toLowerCase();
      const dateStr = log.date
        ? new Date(log.date).toLocaleString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).toLowerCase()
        : '';
      return fullName.includes(term) || previousStatus.includes(term) || newStatus.includes(term) || reason.includes(term) || modifiedBy.includes(term) || dateStr.includes(term);
    });
  }, [statusLogs, searchTerm]);

  const renderStatusLogsTable = () => {
    const filtered = logsFiltrados();
    if (loadingLogs) {
      return (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Cargando logs de estados...</p>
        </div>
      );
    }
    if (errorLogs) {
      return (
        <div className="empty-state">
          <FiActivity className="empty-icon" />
          <h3>Error al cargar los logs</h3>
          <p style={{ color: '#991b1b' }}>{errorLogs}</p>
          <button type="button" className="btn-volver" onClick={loadStatusLogs} style={{ marginTop: 12 }}>Reintentar</button>
        </div>
      );
    }
    if (filtered.length === 0) {
      return (
        <div className="empty-state">
          <FiActivity className="empty-icon" />
          <h3>No se encontraron logs de estados</h3>
          <p>{statusLogs.length === 0 ? 'No hay registros de cambios de estado todavía.' : 'Intenta con otros términos de búsqueda.'}</p>
        </div>
      );
    }
    return (
      <table className="postulants-table">
        <thead>
          <tr>
            <th>NOMBRES Y APELLIDOS</th>
            <th>ESTADO ANTERIOR</th>
            <th>NUEVO ESTADO</th>
            <th>RAZÓN</th>
            <th>FECHA</th>
            <th>MODIFICADO POR</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((log, index) => (
            <tr key={index}>
              <td>{log.full_name || '-'}</td>
              <td><span className={`status ${log.previous_status || 'activo'}`}>{log.previous_status || '-'}</span></td>
              <td><span className={`status ${log.new_status || 'activo'}`}>{log.new_status || '-'}</span></td>
              <td>{log.reason || '-'}</td>
              <td>{log.date ? new Date(log.date).toLocaleString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
              <td>{log.modified_by || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="postulants-content">
      <div className="postulants-section">
        <div className="postulants-header">
          <div className="configuracion-actions">
            <button type="button" className="btn-volver" onClick={onVolver || (() => navigate('/dashboard/postulants'))}>
              <FiArrowLeft className="btn-icon" /> Volver
            </button>
          </div>
          <div className="section-header">
            <h3>LOG DE ESTADOS DE POSTULANTES</h3>
          </div>
        </div>
        <div className="postulants-filters">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input type="text" placeholder="Buscar por nombres, estados, razón, fecha o modificado por..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
          </div>
        </div>
        <div className="postulants-table-container">{renderStatusLogsTable()}</div>
      </div>
    </div>
  );
};

export default PostulantStatusLog;
