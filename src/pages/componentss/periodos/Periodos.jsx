import React, { useState, useEffect, useCallback } from 'react';
import {
  FiPlus,
  FiEdit,
  FiSearch,
  FiArrowLeft,
  FiClock,
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import { Modal, Button, Form, Accordion } from 'react-bootstrap';
import api from '../../../services/api.js';
import '../../styles/Periodos.css';

const formatDateRange = (start, end) => {
  if (!start && !end) return '-';
  const f = (d) => (d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');
  return [f(start), f(end)].filter(Boolean).join(' - ') || '-';
};

const toInputDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return d.toISOString().slice(0, 10);
};

const initialFormData = () => ({
  codigo: '',
  fechaSistemaAcademicoInicio: '',
  fechaSistemaAcademicoFin: '',
  fechaInicioPracticaInicio: '',
  fechaInicioPracticaFin: '',
  fechaMaxFinPractica: '',
  fechaAutorizacionInicio: '',
  fechaAutorizacionFin: '',
  fechaLegalizacionInicio: '',
  fechaLegalizacionFin: '',
  fechaPublicarOfertasInicio: '',
  fechaPublicarOfertasFin: '',
  estado: 'Inactivo',
});

const periodToFormData = (p) => ({
  codigo: p?.codigo ?? '',
  fechaSistemaAcademicoInicio: toInputDate(p?.fechaSistemaAcademico?.inicio),
  fechaSistemaAcademicoFin: toInputDate(p?.fechaSistemaAcademico?.fin),
  fechaInicioPracticaInicio: toInputDate(p?.fechaInicioPractica?.inicio),
  fechaInicioPracticaFin: toInputDate(p?.fechaInicioPractica?.fin),
  fechaMaxFinPractica: toInputDate(p?.fechaMaxFinPractica),
  fechaAutorizacionInicio: toInputDate(p?.fechaAutorizacion?.inicio),
  fechaAutorizacionFin: toInputDate(p?.fechaAutorizacion?.fin),
  fechaLegalizacionInicio: toInputDate(p?.fechaLegalizacion?.inicio),
  fechaLegalizacionFin: toInputDate(p?.fechaLegalizacion?.fin),
  fechaPublicarOfertasInicio: toInputDate(p?.fechaPublicarOfertas?.inicio),
  fechaPublicarOfertasFin: toInputDate(p?.fechaPublicarOfertas?.fin),
  estado: p?.estado ?? 'Inactivo',
});

export default function Periodos({ onVolver }) {
  const [showModal, setShowModal] = useState(false);
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [editingPeriodo, setEditingPeriodo] = useState(null);
  const [formData, setFormData] = useState(initialFormData());
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const showAlert = (icon, title, text) => {
    return Swal.fire({
      icon,
      title,
      text,
      confirmButtonColor: '#c41e3a',
      background: '#fff',
      color: '#333',
    });
  };

  const showSuccess = (title, text) => showAlert('success', title, text);
  const showError = (title, text) => showAlert('error', title, text);

  const loadPeriodos = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/periodos', {
        params: { page, limit: perPage, search: searchTerm.trim() || undefined },
      });
      setPeriodos(data.data || []);
      setPagination(data.pagination || { total: 0, pages: 1 });
    } catch (err) {
      setPeriodos([]);
      setPagination({ total: 0, pages: 1 });
      showError('Error', err.response?.data?.message || err.message || 'No se pudieron cargar los períodos.');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, searchTerm]);

  useEffect(() => {
    loadPeriodos();
  }, [loadPeriodos]);

  const selectedPeriodo = selectedId ? periodos.find((p) => p._id === selectedId) : null;

  const openCrear = () => {
    setEditingPeriodo(null);
    setFormData(initialFormData());
    setShowModal(true);
  };

  const openEditar = () => {
    if (!selectedId || !selectedPeriodo) {
      showAlert(
        'warning',
        'Debes seleccionar un período',
        'Haz clic en una fila de la tabla para elegir el período que quieres editar y luego pulsa Editar.'
      );
      return;
    }
    setEditingPeriodo(selectedPeriodo);
    setFormData(periodToFormData(selectedPeriodo));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPeriodo(null);
    setFormData(initialFormData());
  };

  const toPayload = () => {
    const toDateOrNull = (v) => (v && String(v).trim() ? String(v).trim() : null);
    return {
      codigo: formData.codigo.trim(),
      estado: formData.estado || 'Inactivo',
      fechaSistemaAcademico: {
        inicio: toDateOrNull(formData.fechaSistemaAcademicoInicio),
        fin: toDateOrNull(formData.fechaSistemaAcademicoFin),
      },
      fechaInicioPractica: {
        inicio: toDateOrNull(formData.fechaInicioPracticaInicio),
        fin: toDateOrNull(formData.fechaInicioPracticaFin),
      },
      fechaMaxFinPractica: toDateOrNull(formData.fechaMaxFinPractica),
      fechaAutorizacion: {
        inicio: toDateOrNull(formData.fechaAutorizacionInicio),
        fin: toDateOrNull(formData.fechaAutorizacionFin),
      },
      fechaLegalizacion: {
        inicio: toDateOrNull(formData.fechaLegalizacionInicio),
        fin: toDateOrNull(formData.fechaLegalizacionFin),
      },
      fechaPublicarOfertas: {
        inicio: toDateOrNull(formData.fechaPublicarOfertasInicio),
        fin: toDateOrNull(formData.fechaPublicarOfertasFin),
      },
    };
  };

  const handleGuardarPeriodo = async (e) => {
    e.preventDefault();
    const codigo = formData.codigo.trim();
    if (!codigo) {
      showError('Error', 'El código del período es obligatorio.');
      return;
    }
    try {
      const payload = toPayload();
      if (editingPeriodo) {
        await api.put(`/periodos/${editingPeriodo._id}`, payload);
        await showSuccess('Éxito', 'Período actualizado correctamente.');
      } else {
        await api.post('/periodos', payload);
        await showSuccess('Éxito', 'Período creado correctamente.');
      }
      closeModal();
      setSelectedId(null);
      loadPeriodos();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'No se pudo guardar el período.';
      showError('Error', msg);
    }
  };

  return (
    <>
      <div className="periodos-content">
        <div className="periodos-section">
          <div className="periodos-header">
            <div className="configuracion-actions">
              <button type="button" className="btn-volver" onClick={onVolver}>
                <FiArrowLeft className="btn-icon" />
                Volver
              </button>
              <button type="button" className="btn-guardar" onClick={openCrear}>
                <FiPlus className="btn-icon" />
                Crear período
              </button>
              <button
                type="button"
                className="btn-editar-periodo"
                onClick={openEditar}
                disabled={!selectedId}
                title={selectedId ? 'Editar período seleccionado' : 'Debes seleccionar un período: haz clic en una fila de la tabla para elegirlo'}
              >
                <FiEdit className="btn-icon" />
                Editar
              </button>
            </div>
            <div className="section-header">
              <h3>BUSCAR PERÍODOS</h3>
            </div>
          </div>

          {selectedId && (
            <div className="periodos-association-bar">
              <span className="periodos-selected-info">
                Período seleccionado: <strong>{selectedPeriodo?.codigo ?? '-'}</strong>
              </span>
              <button type="button" className="btn-editar-in-bar" onClick={openEditar}>
                <FiEdit className="btn-icon" />
                Editar período
              </button>
            </div>
          )}

          <div className="periodos-filters">
            <div className="periodos-search-wrap">
              <FiSearch className="search-icon" aria-hidden />
              <input
                id="periodos-search"
                type="text"
                placeholder="Buscar periodos..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="search-input"
                aria-label="Buscar periodos por código"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="periodos-search-clear"
                  onClick={() => { setSearchTerm(''); setPage(1); }}
                  aria-label="Limpiar búsqueda"
                  title="Limpiar búsqueda"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="periodos-table-container">
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner" />
                <p>Cargando períodos...</p>
              </div>
            ) : periodos.length === 0 ? (
              <div className="empty-state">
                <FiClock className="empty-icon" />
                <h3>No hay períodos</h3>
                <p>{searchTerm ? 'No hay resultados para la búsqueda.' : 'Cree un período con el botón "Crear período".'}</p>
              </div>
            ) : (
              <table className="periodos-table">
                <thead>
                  <tr>
                    <th className="th-check" />
                    <th>Periodo activo para realizar practica</th>
                    <th>Rango de Fechas del periodo según Sistema Académico</th>
                    <th>Rango de Fechas de Inicio de práctica académica</th>
                    <th>Fecha máxima de Finalización de práctica académica</th>
                    <th>Rango de fechas de autorización para practica</th>
                    <th>Rango de legalización de práctica</th>
                    <th>Rango de fechas para publicar ofertas de práctica</th>
                    <th>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {periodos.map((p) => (
                    <tr
                      key={p._id}
                      className={selectedId === p._id ? 'row-selected' : ''}
                      onClick={() => setSelectedId(selectedId === p._id ? null : p._id)}
                    >
                      <td className="td-check" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="radio"
                          name="periodo-selection"
                          checked={selectedId === p._id}
                          onChange={() => setSelectedId(selectedId === p._id ? null : p._id)}
                          className="periodo-radio"
                        />
                      </td>
                      <td>{p.codigo || '-'}</td>
                      <td>{formatDateRange(p.fechaSistemaAcademico?.inicio, p.fechaSistemaAcademico?.fin)}</td>
                      <td>{formatDateRange(p.fechaInicioPractica?.inicio, p.fechaInicioPractica?.fin)}</td>
                      <td>{p.fechaMaxFinPractica ? new Date(p.fechaMaxFinPractica).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</td>
                      <td>{formatDateRange(p.fechaAutorizacion?.inicio, p.fechaAutorizacion?.fin)}</td>
                      <td>{formatDateRange(p.fechaLegalizacion?.inicio, p.fechaLegalizacion?.fin)}</td>
                      <td>{formatDateRange(p.fechaPublicarOfertas?.inicio, p.fechaPublicarOfertas?.fin)}</td>
                      <td>
                        <span className={`status-pill ${p.estado === 'Activo' ? 'activo' : 'inactivo'}`}>
                          <span className="status-dot" />
                          {p.estado || 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {(periodos.length > 0 || pagination.total > 0) && (
              <div className="periodos-pagination">
                <div className="pagination-per-page">
                  <span>Mostrar</span>
                  <select
                    value={perPage}
                    onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                    className="pagination-select"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span>por página</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        show={showModal}
        onHide={closeModal}
        // size="xl"
        centered
        scrollable
        className="periodos-modal"
        dialogClassName="modal-dialog-centered modal-dialog-scrollable"
        container={typeof document !== 'undefined' ? document.body : null}
      >
        <Modal.Header closeButton>
          <Modal.Title>{editingPeriodo ? 'Editar período' : 'Crear período'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleGuardarPeriodo} noValidate>
          <Modal.Body>
            {/* Gestión de período */}
            <Form.Group className="mb-3">
              <Form.Label>Período <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                placeholder="Período"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Estado</Form.Label>
              <Form.Select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </Form.Select>
            </Form.Group>

            <Accordion defaultActiveKey="0" className="mb-2">
              <Accordion.Item eventKey="0">
                <Accordion.Header>Rango de fechas del periodo según sistema académico</Accordion.Header>
                <Accordion.Body>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <Form.Group className="mb-2">
                        <Form.Label className="small">Inicio <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.fechaSistemaAcademicoInicio}
                          onChange={(e) => setFormData({ ...formData, fechaSistemaAcademicoInicio: e.target.value })}
                        />
                      </Form.Group>
                    </div>
                    <div className="col-md-6">
                      <Form.Group className="mb-2">
                        <Form.Label className="small">Fin <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.fechaSistemaAcademicoFin}
                          onChange={(e) => setFormData({ ...formData, fechaSistemaAcademicoFin: e.target.value })}
                        />
                      </Form.Group>
                    </div>
                  </div>
                </Accordion.Body>
              </Accordion.Item>

              <Accordion.Item eventKey="1">
                <Accordion.Header>Rango de fechas de inicio de práctica académica</Accordion.Header>
                <Accordion.Body>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <Form.Group className="mb-2">
                        <Form.Label className="small">Inicio <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.fechaInicioPracticaInicio}
                          onChange={(e) => setFormData({ ...formData, fechaInicioPracticaInicio: e.target.value })}
                        />
                      </Form.Group>
                    </div>
                    <div className="col-md-6">
                      <Form.Group className="mb-2">
                        <Form.Label className="small">Fin <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.fechaInicioPracticaFin}
                          onChange={(e) => setFormData({ ...formData, fechaInicioPracticaFin: e.target.value })}
                        />
                      </Form.Group>
                    </div>
                  </div>
                </Accordion.Body>
              </Accordion.Item>

              <Accordion.Item eventKey="2">
                <Accordion.Header>Fecha máxima de finalización de práctica académica</Accordion.Header>
                <Accordion.Body>
                  <Form.Group className="mb-2">
                    <Form.Label className="small">Fecha <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.fechaMaxFinPractica}
                      onChange={(e) => setFormData({ ...formData, fechaMaxFinPractica: e.target.value })}
                    />
                  </Form.Group>
                </Accordion.Body>
              </Accordion.Item>

              <Accordion.Item eventKey="3">
                <Accordion.Header>Rango de fechas de autorización para práctica</Accordion.Header>
                <Accordion.Body>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <Form.Group className="mb-2">
                        <Form.Label className="small">Inicio <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.fechaAutorizacionInicio}
                          onChange={(e) => setFormData({ ...formData, fechaAutorizacionInicio: e.target.value })}
                        />
                      </Form.Group>
                    </div>
                    <div className="col-md-6">
                      <Form.Group className="mb-2">
                        <Form.Label className="small">Fin <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.fechaAutorizacionFin}
                          onChange={(e) => setFormData({ ...formData, fechaAutorizacionFin: e.target.value })}
                        />
                      </Form.Group>
                    </div>
                  </div>
                </Accordion.Body>
              </Accordion.Item>

              <Accordion.Item eventKey="4">
                <Accordion.Header>Rango de legalización de práctica</Accordion.Header>
                <Accordion.Body>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <Form.Group className="mb-2">
                        <Form.Label className="small">Inicio <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.fechaLegalizacionInicio}
                          onChange={(e) => setFormData({ ...formData, fechaLegalizacionInicio: e.target.value })}
                        />
                      </Form.Group>
                    </div>
                    <div className="col-md-6">
                      <Form.Group className="mb-2">
                        <Form.Label className="small">Fin <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.fechaLegalizacionFin}
                          onChange={(e) => setFormData({ ...formData, fechaLegalizacionFin: e.target.value })}
                        />
                      </Form.Group>
                    </div>
                  </div>
                </Accordion.Body>
              </Accordion.Item>

              <Accordion.Item eventKey="5">
                <Accordion.Header>Rango de fechas para publicar ofertas de práctica</Accordion.Header>
                <Accordion.Body>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <Form.Group className="mb-2">
                        <Form.Label className="small">Inicio <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.fechaPublicarOfertasInicio}
                          onChange={(e) => setFormData({ ...formData, fechaPublicarOfertasInicio: e.target.value })}
                        />
                      </Form.Group>
                    </div>
                    <div className="col-md-6">
                      <Form.Group className="mb-2">
                        <Form.Label className="small">Fin <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.fechaPublicarOfertasFin}
                          onChange={(e) => setFormData({ ...formData, fechaPublicarOfertasFin: e.target.value })}
                        />
                      </Form.Group>
                    </div>
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModal}>
              Descartar
            </Button>
            <Button variant="primary" type="submit" className="btn-periodo-submit">
              {editingPeriodo ? 'Actualizar período' : 'Guardar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
