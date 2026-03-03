import { useState, useEffect, useMemo } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import api from '../../../../services/api';
import '../../../styles/PostulantDocumentLog.css';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function PostulantDocumentLog({ onVolver }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/postulant-logs/documents');
      setDocuments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al cargar el log de documentos');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = useMemo(() =>
    searchTerm.trim()
      ? documents.filter(
          (doc) =>
            (doc.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (doc.identification || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (doc.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (doc.document_type || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      : documents,
    [documents, searchTerm]
  );

  const totalFiltered = filteredDocuments.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const page = Math.min(Math.max(1, currentPage), totalPages);
  const start = (page - 1) * pageSize;
  const paginatedDocuments = filteredDocuments.slice(start, start + pageSize);

  const goToPage = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));
  const onPageSizeChange = (e) => {
    const newSize = Number(e.target.value) || 10;
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return isNaN(date.getTime()) ? '—' : date.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <div className="postulants-content">
      <div className="postulants-section">
        <div className="postulants-header">
          <div className="configuracion-actions">
            <button type="button" className="btn-volver" onClick={onVolver} title="Volver a postulantes">
              <FiArrowLeft className="btn-icon" />
              Volver
            </button>
          </div>
          <div className="section-header">
            <h3>LOG DE DOCUMENTOS</h3>
          </div>
        </div>

        <div className="postulants-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Buscar por nombre, identificación, email o tipo de documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="postulants-table-container">
          {error && (
            <div className="empty-state">
              <p style={{ color: '#991b1b' }}>{error}</p>
              <button type="button" className="btn-volver" onClick={loadDocuments} style={{ marginTop: 12 }}>
                Reintentar
              </button>
            </div>
          )}
          {!error && loading && (
            <div className="loading-container">
              <div className="loading-spinner" />
              <p>Cargando log de documentos...</p>
            </div>
          )}
          {!error && !loading && totalFiltered === 0 && (
            <div className="empty-state">
              <h3>Sin registros</h3>
              <p>No hay documentos en el log para mostrar.</p>
            </div>
          )}
          {!error && !loading && totalFiltered > 0 && (
            <>
            <table className="postulants-table">
              <thead>
                <tr>
                  <th>Postulante</th>
                  <th>Identificación</th>
                  <th>Email</th>
                  <th>Tipo documento</th>
                  <th>Contenido</th>
                  <th>Observación</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDocuments.map((doc, idx) => (
                  <tr key={idx}>
                    <td>{doc.full_name || '—'}</td>
                    <td>{doc.identification || '—'}</td>
                    <td>{doc.email || '—'}</td>
                    <td>{doc.document_type || '—'}</td>
                    <td title={doc.content}>{doc.content ? String(doc.content).slice(0, 80) + (String(doc.content).length > 80 ? '…' : '') : '—'}</td>
                    <td title={doc.observation}>{doc.observation ? String(doc.observation).slice(0, 60) + (String(doc.observation).length > 60 ? '…' : '') : '—'}</td>
                    <td>{formatDate(doc.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="log-pagination">
              <div className="log-pagination-info">
                Mostrando {start + 1}-{Math.min(start + pageSize, totalFiltered)} de {totalFiltered} registros
              </div>
              <div className="log-pagination-controls">
                <label className="log-pagination-size">
                  Filas por página:
                  <select value={pageSize} onChange={onPageSizeChange} className="log-pagination-select">
                    {PAGE_SIZE_OPTIONS.map((n) => (
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
          )}
        </div>
      </div>
    </div>
  );
}
