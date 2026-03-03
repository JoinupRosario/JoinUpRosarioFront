import { useState, useEffect } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import api from '../../../../services/api';
import '../../../styles/PostulantDocumentLog.css';

export default function PostulantDocumentLog({ onVolver }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

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

  const filteredDocuments = searchTerm.trim()
    ? documents.filter(
        (doc) =>
          (doc.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (doc.identification || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (doc.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (doc.document_type || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : documents;

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
          {!error && !loading && filteredDocuments.length === 0 && (
            <div className="empty-state">
              <h3>Sin registros</h3>
              <p>No hay documentos en el log para mostrar.</p>
            </div>
          )}
          {!error && !loading && filteredDocuments.length > 0 && (
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
                {filteredDocuments.map((doc, idx) => (
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
          )}
        </div>
      </div>
    </div>
  );
}
