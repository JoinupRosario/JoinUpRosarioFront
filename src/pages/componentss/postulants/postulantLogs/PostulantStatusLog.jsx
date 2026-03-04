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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const PostulantStatusLog = ({ onVolver }) => {
  const navigate = useNavigate();
  const [statusLogs, setStatusLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [errorLogs, setErrorLogs] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const loadStatusLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);
      setErrorLogs(null);
      const res = await api.get("/postulant-logs/status", {
        params: { page: currentPage, limit: pageSize, search: debouncedSearch || undefined }
      });
      const payload = res.data;
      setStatusLogs(Array.isArray(payload.data) ? payload.data : []);
      setTotal(payload.total ?? 0);
      setTotalPages(Math.max(1, payload.totalPages ?? 1));
    } catch (error) {
      console.error("Error loading status logs", error);
      const msg =
        error.response?.status === 403
          ? "No tiene permiso para ver el historial de estados."
          : (error.response?.data?.message || error.message || "No se pudieron cargar los logs de estados.");
      setErrorLogs(msg);
      setStatusLogs([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoadingLogs(false);
    }
  }, [currentPage, pageSize, debouncedSearch]);

  useEffect(() => {
    loadStatusLogs();
  }, [loadStatusLogs]);

  const page = Math.min(Math.max(1, currentPage), totalPages);
  const start = total === 0 ? 0 : (page - 1) * pageSize;

  const goToPage = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));
  const onPageSizeChange = (e) => {
    const newSize = Number(e.target.value) || 10;
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const renderStatusLogsTable = () => {
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
    if (total === 0) {
      return (
        <div className="empty-state">
          <FiActivity className="empty-icon" />
          <h3>No se encontraron logs de estados</h3>
          <p>{debouncedSearch ? "No hay resultados para la búsqueda. Pruebe con otros términos (nombre, apellidos o modificado por)." : "No hay registros de cambios de estado todavía."}</p>
        </div>
      );
    }
    return (
      <>
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
          {statusLogs.map((log, index) => (
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
      <div className="log-pagination">
        <div className="log-pagination-info">
          Mostrando {total === 0 ? 0 : start + 1}-{Math.min(start + statusLogs.length, total)} de {total} registros
        </div>
        <div className="log-pagination-controls">
          <label className="log-pagination-size">
            Filas por página:
            <select value={pageSize} onChange={onPageSizeChange} className="log-pagination-select">
              {PAGE_SIZE_OPTIONS.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <div className="log-pagination-buttons">
            <button type="button" className="log-pagination-btn" onClick={() => goToPage(1)} disabled={page <= 1} title="Primera página">«</button>
            <button type="button" className="log-pagination-btn" onClick={() => goToPage(page - 1)} disabled={page <= 1}>Anterior</button>
            <span className="log-pagination-page">Página {page} de {totalPages}</span>
            <button type="button" className="log-pagination-btn" onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>Siguiente</button>
            <button type="button" className="log-pagination-btn" onClick={() => goToPage(totalPages)} disabled={page >= totalPages} title="Última página">»</button>
          </div>
        </div>
      </div>
      </>
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
            <input type="text" placeholder="Buscar por nombre y apellidos o modificado por..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
          </div>
        </div>
        <div className="postulants-table-container">{renderStatusLogsTable()}</div>
      </div>
    </div>
  );
};

export default PostulantStatusLog;
