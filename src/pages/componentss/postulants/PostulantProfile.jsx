import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiArrowLeft,
  FiEdit,
  FiDownload,
  FiList,
  FiTrash2,
  FiVideo,
  FiPhone,
  FiMail,
  FiLinkedin,
  FiTwitter,
  FiGlobe,
  FiInstagram,
  FiHelpCircle,
  FiUpload,
  FiX,
  FiCheck,
  FiXCircle,
  FiBook,
  FiCalendar
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import '../../styles/PostulantProfile.css';

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

const PostulantProfile = ({ onVolver }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extraer el ID de la URL
  const extractIdFromPath = () => {
    const match = location.pathname.match(/\/dashboard\/postulantes\/([^/]+)$/);
    return match ? match[1] : null;
  };
  
  const [postulant, setPostulant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('datos-personales');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectingFile, setSelectingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [profileData, setProfileData] = useState(null);
  const fileInputRef = useRef(null);
  const fileSelectTimeoutRef = useRef(null);

  // Funciones de utilidad
  const showError = useCallback((title, text) => {
    return createAlert('error', title, text);
  }, []);

  const showFuncionalidadEnDesarrollo = useCallback((funcionalidad) => {
    return createAlert(
      'info',
      'Funcionalidad en Desarrollo',
      `La funcionalidad "${funcionalidad}" está actualmente en desarrollo y estará disponible próximamente.`
    );
  }, []);

  const loadPostulant = useCallback(async (id) => {
    if (!id) {
      setLoading(false);
      setProfileData(null);
      return;
    }
    try {
      setLoading(true);
      setPostulant(null);
      setProfileData(null);
      const [postulantRes, profileRes] = await Promise.all([
        api.get(`/postulants/${id}`),
        api.get(`/postulants/${id}/profile-data`).catch(() => ({ data: null })),
      ]);
      if (postulantRes.data) {
        setPostulant(postulantRes.data);
      } else {
        showError('Error', 'No se encontraron datos del postulante');
      }
      if (profileRes?.data) setProfileData(profileRes.data);
    } catch (error) {
      console.error('Error loading postulant', error);
      const errorMessage = error.response?.data?.message || 'No se pudo cargar la información del postulante';
      showError('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Efecto para cargar cuando cambia la ruta
  useEffect(() => {
    const id = extractIdFromPath();
    if (id) {
      loadPostulant(id);
    } else {
      setLoading(false);
      setPostulant(null);
    }
  }, [location.pathname, loadPostulant]);

  // Cargar imagen de perfil si existe (solo si es una ruta válida, no ObjectId)
  useEffect(() => {
    const pic = postulant?.profile_picture;
    if (!pic || typeof pic !== 'string') {
      setPreviewImage(null);
      return;
    }
    const isPath = pic.includes('upload') || pic.startsWith('src/');
    const isUrl = pic.startsWith('http');
    if (!isPath && !isUrl) {
      setPreviewImage(null);
      return;
    }
    let imageUrl;
    if (isUrl) {
      imageUrl = pic;
    } else {
      const baseURL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/api\/?$/, '').replace(/\/$/, '');
      const cleanPath = pic.replace(/^src[/\\]/, '').replace(/\\/g, '/');
      imageUrl = `${baseURL}/${cleanPath}`;
    }
    setPreviewImage(imageUrl);
  }, [postulant]);

  // Manejar selección de archivo
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    
    // Limpiar el timeout de cancelación ya que se seleccionó un archivo o se canceló
    if (fileSelectTimeoutRef.current) {
      clearTimeout(fileSelectTimeoutRef.current);
      fileSelectTimeoutRef.current = null;
    }
    
    if (file) {
      // Si no estaba activo, activarlo (ya debería estar activo desde el click)
      if (!selectingFile) {
        setSelectingFile(true);
      }
      
      // Validar tipo de archivo
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setSelectingFile(false);
        showError('Error', 'Tipo de archivo no válido. Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)');
        return;
      }

      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setSelectingFile(false);
        showError('Error', 'El archivo es demasiado grande. Máximo 10MB.');
        return;
      }

      setSelectedFile(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
        setSelectingFile(false);
      };
      reader.onerror = () => {
        setSelectingFile(false);
        showError('Error', 'Error al leer el archivo');
      };
      reader.readAsDataURL(file);
    } else {
      // Si no se seleccionó archivo (usuario canceló), desactivar loading
      setSelectingFile(false);
    }
  }, [showError, selectingFile]);

  // Subir foto de perfil
  const handleUploadPicture = useCallback(async () => {
    if (!selectedFile || !postulant) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('profile_picture', selectedFile);

      const response = await api.post(
        `/postulants/${postulant._id}/profile-picture`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const imagePath = response.data.profile_picture;
      const baseURL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/api\/?$/, '').replace(/\/$/, '');
      const cleanPath = (imagePath || '').replace(/^src[/\\]/, '').replace(/\\/g, '/');
      const imageUrl = (imagePath && imagePath.startsWith('http'))
        ? imagePath
        : `${baseURL}/${cleanPath}`;

      setPostulant(prev => ({
        ...prev,
        profile_picture: imagePath || prev.profile_picture
      }));
      setPreviewImage(imageUrl);
      setSelectedFile(null);
      
      Swal.fire({
        icon: 'success',
        title: 'Foto actualizada',
        text: 'La foto de perfil se ha actualizado correctamente',
        confirmButtonColor: '#c41e3a'
      });
    } catch (error) {
      console.error('Error uploading picture', error);
      const errorMessage = error.response?.data?.message || 'No se pudo subir la foto de perfil';
      showError('Error', errorMessage);
    } finally {
      setUploading(false);
    }
  }, [selectedFile, postulant, showError, showFuncionalidadEnDesarrollo]);

  // Inicializar datos editados cuando se activa el modo edición
  useEffect(() => {
    if (isEditing && postulant) {
      // Formatear fecha para input type="date"
      const dateValue = postulant.date_nac_postulant 
        ? new Date(postulant.date_nac_postulant).toISOString().split('T')[0]
        : '';
      
      setEditedData({
        mobile_number: postulant.mobile_number || '',
        phone_number: postulant.phone_number || '',
        linkedin_url: postulant.linkedin_url || '',
        twitter_url: postulant.twitter_url || '',
        instagram_url: postulant.instagram_url || '',
        website_url: postulant.website_url || '',
        type_doc_postulant: postulant.type_doc_postulant?._id ?? postulant.type_doc_postulant ?? '',
        identity_postulant: postulant.identity_postulant || '',
        date_nac_postulant: dateValue,
        nac_country: postulant.nac_country?._id || '',
        nac_department: postulant.nac_department?._id || '',
        nac_city: postulant.nac_city?._id || '',
        residence_country: postulant.residence_country?._id || '',
        residence_department: postulant.residence_department?._id || '',
        residence_city: postulant.residence_city?._id || '',
        address: postulant.address || ''
      });
    } else if (!isEditing) {
      setEditedData({});
    }
  }, [isEditing, postulant]);

  // Guardar cambios del perfil
  const handleSaveProfile = useCallback(async () => {
    if (!postulant) return;

    try {
      setSaving(true);
      
      // Preparar datos para enviar
      const dataToUpdate = {
        ...editedData
      };

      // Convertir fecha si existe (formato YYYY-MM-DD a Date)
      if (dataToUpdate.date_nac_postulant) {
        if (typeof dataToUpdate.date_nac_postulant === 'string' && dataToUpdate.date_nac_postulant.includes('-')) {
          dataToUpdate.date_nac_postulant = new Date(dataToUpdate.date_nac_postulant);
        }
      }

      // Campos que son ObjectId en el backend
      const objectIdFields = [
        'nac_country',
        'nac_department',
        'nac_city',
        'residence_country',
        'residence_department',
        'residence_city'
      ];

      // Eliminar campos vacíos o null, especialmente los ObjectId
      Object.keys(dataToUpdate).forEach(key => {
        const value = dataToUpdate[key];
        // Si es un campo ObjectId y está vacío, eliminarlo
        if (objectIdFields.includes(key) && (value === '' || value === null || value === undefined)) {
          delete dataToUpdate[key];
        }
        // Para otros campos, eliminar si están vacíos
        else if (value === '' || value === null || value === undefined) {
          delete dataToUpdate[key];
        }
      });

      const response = await api.put(`/postulants/update/${postulant._id}`, dataToUpdate);
      
      // Actualizar el estado local
      setPostulant(response.data);
      setIsEditing(false);
      
      Swal.fire({
        icon: 'success',
        title: 'Perfil actualizado',
        text: 'Los cambios se han guardado correctamente',
        confirmButtonColor: '#c41e3a'
      });
    } catch (error) {
      console.error('Error saving profile', error);
      const errorMessage = error.response?.data?.message || 'No se pudieron guardar los cambios';
      showError('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  }, [postulant, editedData, showError]);

  // Manejar cambios en los inputs
  const handleInputChange = useCallback((field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Eliminar foto de perfil
  const handleDeletePicture = useCallback(async () => {
    if (!postulant) return;

    const result = await Swal.fire({
      title: '¿Eliminar foto de perfil?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c41e3a',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        // Actualizar el postulante eliminando la foto
        await api.put(`/postulants/update/${postulant._id}`, {
          profile_picture: null
        });

        setPostulant(prev => ({
          ...prev,
          profile_picture: null
        }));

        setPreviewImage(null);
        setSelectedFile(null);
        
        Swal.fire({
          icon: 'success',
          title: 'Foto eliminada',
          text: 'La foto de perfil ha sido eliminada correctamente',
          confirmButtonColor: '#c41e3a'
        });
      } catch (error) {
        console.error('Error deleting picture', error);
        showError('Error', 'No se pudo eliminar la foto de perfil');
      }
    }
  }, [postulant, showError]);

  // Porcentaje de completitud: usar el del backend si viene, sino calcular local
  const calculateCompleteness = useCallback(() => {
    if (!postulant) return 0;
    if (postulant.filling_percentage != null && !Number.isNaN(Number(postulant.filling_percentage))) {
      return Math.min(100, Math.max(0, Number(postulant.filling_percentage)));
    }
    const fields = [
      postulant.identity_postulant,
      postulant.type_doc_postulant,
      postulant.gender_postulant,
      postulant.date_nac_postulant,
      postulant.nac_country,
      postulant.nac_department,
      postulant.nac_city,
      postulant.residence_country,
      postulant.residence_department,
      postulant.residence_city,
      postulant.phone_number,
      postulant.mobile_number
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }, [postulant]);

  // Formatear fecha
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="postulants-content">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Cargando perfil del postulante...</p>
        </div>
      </div>
    );
  }

  if (!postulant) {
    return (
      <div className="postulants-content">
        <div className="empty-state">
          <h3>Postulante no encontrado</h3>
          <p>El postulante solicitado no existe.</p>
        </div>
      </div>
    );
  }

  const completeness = calculateCompleteness();
  const fullName = postulant.user?.name || 'Sin nombre';
  const email = postulant.user?.email || '-';

  return (
    <div className="postulant-profile-content">
      {/* Barra superior de acciones */}
      <div className="postulant-profile-actions">
        {isEditing ? (
          <>
            <button
              className="btn-guardar"
              onClick={handleSaveProfile}
              disabled={saving}
              title="Guardar cambios"
            >
              {saving ? (
                <>
                  <div className="loading-spinner-small" />
                  Guardando...
                </>
              ) : (
                <>
                  <FiDownload className="btn-icon" />
                  Guardar
                </>
              )}
            </button>
            <button
              className="btn-volver"
              onClick={() => {
                setIsEditing(false);
                setEditedData({});
              }}
              disabled={saving}
              title="Cancelar edición"
            >
              <FiX className="btn-icon" />
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button
              className="btn-action btn-outline"
              onClick={() => setIsEditing(true)}
              title="Editar"
            >
              <FiEdit className="btn-icon" />
              Editar
            </button>
            <button
              className="btn-action btn-outline"
              onClick={() => showFuncionalidadEnDesarrollo('Generar Carta de Presentación')}
              title="Generar Carta de Presentación"
            >
              <FiDownload className="btn-icon" />
              Generar Carta de Presentación
            </button>
            <button
              className="btn-action btn-outline"
              onClick={() => showFuncionalidadEnDesarrollo('Historial de Aplicaciones')}
              title="Historial de Aplicaciones"
            >
              <FiList className="btn-icon" />
              Historial de Aplicaciones
            </button>
            <button
              className="btn-guardar"
              onClick={() => showFuncionalidadEnDesarrollo('Eliminar postulante')}
              title="Eliminar"
            >
              <FiTrash2 className="btn-icon" />
              Eliminar
            </button>
          </>
        )}
        <button
          className="btn-volver"
          onClick={() => navigate('/dashboard/postulants')}
          title="Volver"
        >
          <FiArrowLeft className="btn-icon" />
          Volver
        </button>
      </div>

      {/* Tabs de navegación */}
      <div className="postulant-profile-tabs">
        <button
          className={`profile-tab ${activeTab === 'datos-personales' ? 'active' : ''}`}
          onClick={() => setActiveTab('datos-personales')}
        >
          DATOS PERSONALES
        </button>
        <button
          className={`profile-tab ${activeTab === 'informacion-academica' ? 'active' : ''}`}
          onClick={() => setActiveTab('informacion-academica')}
        >
          INFORMACIÓN ACADÉMICA
        </button>
        <button
          className={`profile-tab ${activeTab === 'perfil' ? 'active' : ''}`}
          onClick={() => setActiveTab('perfil')}
        >
          PERFIL
        </button>
        <button
          className={`profile-tab ${activeTab === 'experiencia' ? 'active' : ''}`}
          onClick={() => setActiveTab('experiencia')}
        >
          EXPERIENCIA
        </button>
      </div>

      {/* Contenido principal */}
      <div className="postulant-profile-main">
        {/* Resumen, contacto y redes: solo en Datos personales */}
        {activeTab === 'datos-personales' && (
          <>
        <div className="postulant-profile-summary">
          <div className="profile-summary-left">
            <div className="profile-picture-container">
              <div className="profile-picture">
                {previewImage ? (
                  <img 
                    src={previewImage} 
                    alt="Foto de perfil" 
                    className="profile-picture-img"
                    onError={(e) => {
                      console.error('Error loading image:', previewImage);
                      console.error('Error event:', e);
                      setPreviewImage(null);
                    }}
                    onLoad={() => {
                      console.log('Image loaded successfully:', previewImage);
                    }}
                  />
                ) : (
                  <FiMail className="profile-picture-icon" />
                )}
                {previewImage && (
                  <button 
                    className="profile-picture-delete" 
                    title="Eliminar foto"
                    onClick={handleDeletePicture}
                  >
                    <FiX className="delete-icon" />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                onClick={(e) => {
                  // Resetear el valor para que el onChange se dispare incluso si se selecciona el mismo archivo
                  e.target.value = '';
                }}
                onCancel={() => {
                  // Si el usuario cancela, desactivar el loading
                  setSelectingFile(false);
                }}
                style={{ display: 'none' }}
              />
              <button 
                className="profile-picture-select"
                onClick={() => {
                  setSelectingFile(true);
                  // Limpiar timeout anterior si existe
                  if (fileSelectTimeoutRef.current) {
                    clearTimeout(fileSelectTimeoutRef.current);
                  }
                  // Si el usuario cancela el diálogo, desactivar el loading después de 2 segundos
                  fileSelectTimeoutRef.current = setTimeout(() => {
                    setSelectingFile(false);
                  }, 2000);
                  fileInputRef.current?.click();
                }}
                disabled={uploading || selectingFile}
              >
                {selectingFile ? (
                  <>
                    <div className="loading-spinner-small" />
                    <span>{selectedFile ? 'Procesando...' : 'Abriendo...'}</span>
                  </>
                ) : (
                  <>
                    <FiUpload className="upload-icon" />
                    {selectedFile ? 'Cambiar' : 'Seleccionar'}
                  </>
                )}
              </button>
              {selectedFile && (
                <>
                  <div className="profile-picture-filename">{selectedFile.name}</div>
                  <button 
                    className="profile-picture-upload-btn"
                    onClick={handleUploadPicture}
                    disabled={uploading}
                  >
                    {uploading ? 'Subiendo...' : 'Subir foto'}
                  </button>
                </>
              )}
            </div>
            <div className="profile-info">
              <h2 className="profile-name">{fullName.toUpperCase()}</h2>
              <div className="profile-email">
                <FiMail className="email-icon" />
                <span>{email}</span>
              </div>
            </div>
          </div>
          <div className="profile-summary-right">
            <div className="profile-consents">
              <div className="consent-item">
                <span>Permito el envío de hoja de vida <br/> a empresas</span>
                <label className="switch">
                  <input type="checkbox" checked={postulant.full_profile || false} readOnly />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="consent-item">
                <span>Autorizo el tratamiento de mis <br/> datos personales</span>
                <label className="switch">
                  <input type="checkbox" checked={postulant.acept_terms || false} readOnly />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
          <div>
          <div className="profile-completeness">
              <div className="completeness-circle">
                <svg className="completeness-svg" viewBox="0 0 36 36">
                  <path
                    className="completeness-bg"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="completeness-progress"
                    strokeDasharray={`${completeness}, 100`}
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="completeness-percent">{completeness}%</span>
              </div>
              <div className="completeness-info">
              
                <span>¿Qué hace falta para <br/> completar su perfil?</span>
              </div>
            </div>
          </div>
        </div>

        {/* Separador */}
        <div className="profile-separator"></div>
        <div className="profile-info">
          <div className="profile-contact-info">
        
            <div className="contact-item">
              <div className="contact-icon-wrapper">
                <FiPhone className="contact-icon" />
              </div>
              {isEditing ? (
                <>
                  <input 
                    type="text" 
                    className="contact-input" 
                    value={editedData.mobile_number || ''} 
                    onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                    placeholder="Número móvil"
                  />
                  <FiEdit className="contact-edit-icon" />
                </>
              ) : (
                <span className="contact-text">{postulant.mobile_number || '-'}</span>
              )}
            </div>
            <div className="contact-item">
              <div className="contact-icon-wrapper">
                <FiPhone className="contact-icon" />
              </div>
              {isEditing ? (
                <>
                  <input 
                    type="text" 
                    className="contact-input" 
                    value={editedData.phone_number || ''} 
                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                    placeholder="Teléfono fijo"
                  />
                  <FiEdit className="contact-edit-icon" />
                </>
              ) : (
                <span className="contact-text">{postulant.phone_number || '-'}</span>
              )}
            </div>
            <div className="contact-item">
              <div className="contact-icon-wrapper">
                <FiMail className="contact-icon" />
              </div>
              {isEditing ? (
                <>
                  <input 
                    type="text" 
                    className="contact-input" 
                    value={email} 
                    readOnly
                    placeholder="Email"
                  />
                  <FiEdit className="contact-edit-icon" />
                </>
              ) : (
                <span className="contact-text">{email}</span>
              )}
            </div>
            
          </div>
          <div className="profile-contact-info"> 
            <div className="contact-item">
              <div className="contact-icon-wrapper">
                <FiLinkedin className="contact-icon" />
              </div>
              {isEditing ? (
                <>
                  <input 
                    type="text" 
                    className="contact-input" 
                    value={editedData.linkedin_url || ''} 
                    onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                    placeholder="LinkedIn"
                  />
                  <FiEdit className="contact-edit-icon" />
                </>
              ) : (
                <span className="contact-text">{postulant.linkedin_url || '-'}</span>
              )}
            </div>
            <div className="contact-item">
              <div className="contact-icon-wrapper">
                <FiTwitter className="contact-icon" />
              </div>
              {isEditing ? (
                <>
                  <input 
                    type="text" 
                    className="contact-input" 
                    value={editedData.twitter_url || ''} 
                    onChange={(e) => handleInputChange('twitter_url', e.target.value)}
                    placeholder="Twitter"
                  />
                  <FiEdit className="contact-edit-icon" />
                </>
              ) : (
                <span className="contact-text">{postulant.twitter_url || '-'}</span>
              )}
            </div>
            <div className="contact-item">
              <div className="contact-icon-wrapper">
                <FiInstagram className="contact-icon" />
              </div>
              {isEditing ? (
                <>
                  <input 
                    type="text" 
                    className="contact-input" 
                    value={editedData.instagram_url || ''} 
                    onChange={(e) => handleInputChange('instagram_url', e.target.value)}
                    placeholder="Instagram"
                  />
                  <FiEdit className="contact-edit-icon" />
                </>
              ) : (
                <span className="contact-text">{postulant.instagram_url || '-'}</span>
              )}
            </div>
          </div>
        </div>
          </>
        )}
        {/* Contenido de tabs */}
        {activeTab === 'datos-personales' && (
          <div className="profile-tab-content">
            <div className="profile-data-grid">
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Tipo de Documento
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <select 
                      className="profile-field-input profile-field-select" 
                      value={editedData.type_doc_postulant || ''}
                      onChange={(e) => handleInputChange('type_doc_postulant', e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      <option value="CC">CC</option>
                      <option value="CE">CE</option>
                      <option value="PA">PA</option>
                    </select>
                  </div>
                ) : (
                  <div className="profile-field-value">
                    {typeof postulant.type_doc_postulant === 'object' && postulant.type_doc_postulant !== null
                      ? (postulant.type_doc_postulant.name ?? postulant.type_doc_postulant.value ?? '-')
                      : (postulant.type_doc_postulant || '-')}
                  </div>
                )}
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Número de documento
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <input 
                      type="text" 
                      className="profile-field-input" 
                      value={editedData.identity_postulant || ''} 
                      onChange={(e) => handleInputChange('identity_postulant', e.target.value)}
                      placeholder="Número de documento"
                    />
                  </div>
                ) : (
                  <div className="profile-field-value">{postulant.identity_postulant || '-'}</div>
                )}
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Sexo
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                <div className="profile-field-value">
                {typeof postulant.gender_postulant === 'object' && postulant.gender_postulant !== null
                  ? (postulant.gender_postulant.name ?? postulant.gender_postulant.value ?? '-')
                  : (postulant.gender_postulant || '-')}
              </div>
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Fecha de nacimiento
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <input 
                      type="date" 
                      className="profile-field-input" 
                      value={editedData.date_nac_postulant || ''}
                      onChange={(e) => handleInputChange('date_nac_postulant', e.target.value)}
                      placeholder="DD/MM/YYYY"
                    />
                  </div>
                ) : (
                  <div className="profile-field-value">{formatDate(postulant.date_nac_postulant)}</div>
                )}
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  País de nacimiento
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <select 
                      className="profile-field-input profile-field-select" 
                      value={editedData.nac_country || ''}
                      onChange={(e) => handleInputChange('nac_country', e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      {postulant.nac_country && <option value={postulant.nac_country._id}>{postulant.nac_country.name}</option>}
                    </select>
                  </div>
                ) : (
                  <div className="profile-field-value">{postulant.nac_country?.name || '-'}</div>
                )}
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Departamento de nacimiento
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <select 
                      className="profile-field-input profile-field-select" 
                      value={editedData.nac_department || ''}
                      onChange={(e) => handleInputChange('nac_department', e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      {postulant.nac_department && <option value={postulant.nac_department._id}>{postulant.nac_department.name}</option>}
                    </select>
                  </div>
                ) : (
                  <div className="profile-field-value">{postulant.nac_department?.name || '-'}</div>
                )}
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Ciudad de nacimiento
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <select 
                      className="profile-field-input profile-field-select" 
                      value={editedData.nac_city || ''}
                      onChange={(e) => handleInputChange('nac_city', e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      {postulant.nac_city && <option value={postulant.nac_city._id}>{postulant.nac_city.name}</option>}
                    </select>
                  </div>
                ) : (
                  <div className="profile-field-value">{postulant.nac_city?.name || '-'}</div>
                )}
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Dirección
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <input 
                      type="text" 
                      className="profile-field-input" 
                      value={editedData.address || ''} 
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Dirección"
                    />
                  </div>
                ) : (
                  <div className="profile-field-value">{postulant.address || '-'}</div>
                )}
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  País de residencia
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <select 
                      className="profile-field-input profile-field-select" 
                      value={editedData.residence_country || ''}
                      onChange={(e) => handleInputChange('residence_country', e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      {postulant.residence_country && <option value={postulant.residence_country._id}>{postulant.residence_country.name}</option>}
                    </select>
                  </div>
                ) : (
                  <div className="profile-field-value">{postulant.residence_country?.name || '-'}</div>
                )}
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Departamento de residencia
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <select 
                      className="profile-field-input profile-field-select" 
                      value={editedData.residence_department || ''}
                      onChange={(e) => handleInputChange('residence_department', e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      {postulant.residence_department && <option value={postulant.residence_department._id}>{postulant.residence_department.name}</option>}
                    </select>
                  </div>
                ) : (
                  <div className="profile-field-value">{postulant.residence_department?.name || '-'}</div>
                )}
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Ciudad de residencia
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <select 
                      className="profile-field-input profile-field-select" 
                      value={editedData.residence_city || ''}
                      onChange={(e) => handleInputChange('residence_city', e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      {postulant.residence_city && <option value={postulant.residence_city._id}>{postulant.residence_city.name}</option>}
                    </select>
                  </div>
                ) : (
                  <div className="profile-field-value">{postulant.residence_city?.name || '-'}</div>
                )}
              </div>
              <div className="profile-data-field">
                <label className="profile-field-label">
                  <span className="field-label-separator">|</span>
                  Página Web
                  {isEditing && <FiEdit className="field-edit-icon" />}
                </label>
                {isEditing ? (
                  <div className="profile-field-input-wrapper">
                    <input 
                      type="text" 
                      className="profile-field-input" 
                      value={editedData.website_url || ''} 
                      onChange={(e) => handleInputChange('website_url', e.target.value)}
                      placeholder="http://www.example.com"
                    />
                  </div>
                ) : (
                  <div className="profile-field-value">{postulant.website_url || '-'}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'informacion-academica' && (
          <div className="profile-tab-content academic-tab">
            <div className="academic-warning-banner">
              Atención! La Universidad del Rosario no se hace responsable de la veracidad de la información ingresada en relación a los estudios o experiencia externos a la institución relacionados por el postulante.
            </div>

            <section className="academic-section">
              <h3 className="academic-section-title">Formación académica en curso - Registrada</h3>
              {profileData?.enrolledPrograms?.length > 0 ? (
                <ul className="academic-list academic-list-cards">
                  {profileData.enrolledPrograms.map((ep) => (
                    <li key={ep._id} className="academic-list-item">
                      <span className="academic-item-icon academic-item-check"><FiCheck /></span>
                      <span>{ep.programId?.name || ep.programId?.code || 'Programa'}</span>
                      {(ep.programFacultyId?.facultyId?.name || ep.programFacultyId?.name) && <span> — {ep.programFacultyId?.facultyId?.name || ep.programFacultyId?.name}</span>}
                      {(ep.cityId?.name || ep.countryId?.name) && (
                        <span> ({[ep.cityId?.name, ep.countryId?.name].filter(Boolean).join(', ')})</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="academic-empty">
                  <FiXCircle className="academic-empty-icon" />
                  <span>No tiene formación en curso.</span>
                </div>
              )}
            </section>

            <section className="academic-section">
              <h3 className="academic-section-title">Formación académica Rosario - Finalizada</h3>
              {profileData?.graduatePrograms?.length > 0 ? (
                <>
                  <div className="academic-finished-grid">
                    {profileData.graduatePrograms.map((gp) => (
                      <div key={gp._id} className="academic-finished-row">
                        <div className="academic-finished-field">
                          <span className="academic-item-icon academic-item-check"><FiCheck /></span>
                          <span className="academic-field-label">Título formación académica:</span>
                          <span className="academic-field-value">{gp.programId?.name || gp.programId?.code || gp.title || '—'}</span>
                        </div>
                        <div className="academic-finished-field">
                          <span className="academic-item-icon academic-item-check"><FiCheck /></span>
                          <span className="academic-field-label">Facultad:</span>
                          <span className="academic-field-value">{gp.programFacultyId?.facultyId?.name || gp.programFacultyId?.name || '—'}</span>
                        </div>
                        <div className="academic-finished-field">
                          <span className="academic-item-icon academic-item-check"><FiCheck /></span>
                          <span className="academic-field-label">Sede:</span>
                          <span className="academic-field-value">
                            {[gp.anotherUniversity, gp.cityId?.name, gp.stateId?.name, gp.countryId?.name].filter(Boolean).join(', ') || '—'}
                          </span>
                        </div>
                        <div className="academic-finished-field">
                          <span className="academic-item-icon academic-item-check"><FiCheck /></span>
                          <span className="academic-field-label">Ciudad:</span>
                          <span className="academic-field-value">{gp.cityId?.name ?? '—'}</span>
                        </div>
                        <div className="academic-finished-field">
                          <span className="academic-item-icon academic-item-grad"><FiBook /></span>
                          <span className="academic-field-label">Profesión:</span>
                          <span className="academic-field-value">{gp.programId?.name || gp.programId?.code || '—'}</span>
                        </div>
                        <div className="academic-finished-field">
                          <span className="academic-item-icon academic-item-grad"><FiBook /></span>
                          <span className="academic-field-label">Nivel educativo:</span>
                          <span className="academic-field-value">Pregrado</span>
                        </div>
                        <div className="academic-finished-field">
                          <span className="academic-item-icon academic-item-cal"><FiCalendar /></span>
                          <span className="academic-field-label">Fecha finalización:</span>
                          <span className="academic-field-value">{gp.endDate ? formatDate(gp.endDate) : '—'}</span>
                        </div>
                        <div className="academic-finished-field">
                          <span className="academic-item-icon academic-item-globe"><FiGlobe /></span>
                          <span className="academic-field-label">País:</span>
                          <span className="academic-field-value">{gp.countryId?.name || '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="academic-subtitle">Formación académica Finalizada - Registrada</p>
                </>
              ) : (
                <div className="academic-empty">
                  <FiXCircle className="academic-empty-icon" />
                  <span>No tiene formación finalizada registrada.</span>
                </div>
              )}
            </section>

            <section className="academic-section">
              <h3 className="academic-section-title">Otros Estudios</h3>
              <p className="academic-other-note">*Por favor agregue, si los tiene, el estudio, institución y año de realización*</p>
              {profileData?.otherStudies?.length > 0 ? (
                <ul className="academic-list academic-other-list">
                  {profileData.otherStudies.map((os) => (
                    <li key={os._id} className="academic-other-item">
                      <span className="academic-item-icon academic-item-check"><FiCheck /></span>
                      <span>{os.studyName || '—'}</span>
                      <span className="academic-item-icon academic-item-check"><FiCheck /></span>
                      <span>{os.studyInstitution || '—'}</span>
                      <span className="academic-item-icon academic-item-cal"><FiCalendar /></span>
                      <span>{os.studyYear ?? '—'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="academic-empty">
                  <FiXCircle className="academic-empty-icon" />
                  <span>No hay otros estudios registrados.</span>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'perfil' && (
          <div className="profile-tab-content perfil-tab">
            <div className="perfil-warning-banner">
              Atención! Recuerda que para generar tu hoja de vida necesitas crear y seleccionar un perfil, esto te permitirá aplicar a las oportunidades. La Universidad del Rosario no se hace responsable de la veracidad de la información ingresada en relación a los estudios o experiencia externa a la institución relacionados por el postulante.
            </div>

            <div className="perfil-two-columns">
              <div className="perfil-column perfil-column-left">
                <div className="perfil-block">
                  <h4 className="perfil-block-title">Perfil profesional</h4>
                  <p className="perfil-block-note">*Puede crear hasta 5 versiones diferentes de su perfil</p>
                  {profileData?.postulantProfile?.profileText ? (
                    <div className="perfil-field-with-check">
                      <span className="perfil-check-icon"><FiCheck /></span>
                      <span className="perfil-field-value">{profileData.postulantProfile.profileText.split('\n')[0] || profileData.postulantProfile.profileText}</span>
                    </div>
                  ) : (
                    <div className="perfil-field-value perfil-field-empty">—</div>
                  )}
                </div>

                <div className="perfil-block">
                  <h4 className="perfil-block-title">Habilidades técnicas y de software</h4>
                  <div className="perfil-field-value">{profileData?.postulantProfile?.skillsTechnicalSoftware || '—'}</div>
                </div>

                <div className="perfil-block">
                  <h4 className="perfil-block-title">¿Se encuentra en condición de discapacidad?</h4>
                  <span className={`perfil-sino-badge ${profileData?.postulantProfile?.conditionDiscapacity ? 'sino-si' : 'sino-no'}`}>
                    {profileData?.postulantProfile?.conditionDiscapacity ? 'Sí' : 'No'}
                  </span>
                </div>

                <div className="perfil-block">
                  <h4 className="perfil-block-title">¿Tengo mi propia empresa?</h4>
                  <span className={`perfil-sino-badge ${profileData?.postulantProfile?.haveBusiness ? 'sino-si' : 'sino-no'}`}>
                    {profileData?.postulantProfile?.haveBusiness ? 'Sí' : 'No'}
                  </span>
                </div>

                <div className="perfil-block">
                  <h4 className="perfil-block-title">Años de experiencia</h4>
                  <div className="perfil-field-value">{profileData?.postulantProfile?.yearsExperience != null ? String(profileData.postulantProfile.yearsExperience) : '—'}</div>
                </div>

                <div className="perfil-block">
                  <h4 className="perfil-block-title">Otros documentos de soporte</h4>
                  <p className="perfil-block-desc">Puede ingresar hasta 5 archivos de Soporte, según su necesidad. El tamaño máximo de cada archivo es de 5Mb. Se permiten las siguientes extensiones: .doc, .docx, .xls, .xlsx, .pdf, .jpg, .jpeg y .png</p>
                </div>
              </div>

              <div className="perfil-column perfil-column-right">
                <div className="perfil-block">
                  <h4 className="perfil-block-title">Áreas de Interés</h4>
                  {profileData?.interestAreas?.length > 0 ? (
                    <ul className="perfil-tag-list">
                      {profileData.interestAreas.map((ia) => (
                        <li key={ia._id} className="perfil-tag-item">
                          <span className="perfil-check-icon"><FiCheck /></span>
                          {ia.area?.name ?? ia.area?.value ?? '—'}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="perfil-field-value perfil-field-empty">—</div>
                  )}
                </div>

                <div className="perfil-block">
                  <h4 className="perfil-block-title">Competencias (Habilidades e intereses)</h4>
                  {profileData?.skills?.length > 0 ? (
                    <ul className="perfil-tag-list">
                      {profileData.skills.map((s) => (
                        <li key={s._id} className="perfil-tag-item">
                          <span className="perfil-check-icon"><FiCheck /></span>
                          {s.skillId?.name || '—'} {s.experienceYears != null ? `(${s.experienceYears} años)` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="perfil-field-value perfil-field-empty">—</div>
                  )}
                </div>

                <div className="perfil-block">
                  <h4 className="perfil-block-title">Idiomas</h4>
                  {profileData?.languages?.length > 0 ? (
                    <ul className="perfil-lang-list">
                      {profileData.languages.map((l) => (
                        <li key={l._id} className="perfil-lang-item">
                          <span>{l.language?.name ?? l.language?.value ?? '—'}</span>
                          <span className="perfil-lang-level">{l.level?.name ?? l.level?.value ?? '—'}</span>
                          <span className={`perfil-cert-badge ${l.certificationExam ? 'certified' : ''}`}>
                            {l.certificationExam ? (l.certificationExamName || 'Certificado') : 'No Certificado'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="perfil-field-value perfil-field-empty">—</div>
                  )}
                </div>

                <div className="perfil-block">
                  <h4 className="perfil-block-title">Independiente</h4>
                  <span className={`perfil-sino-badge ${profileData?.postulantProfile?.independent ? 'sino-si' : 'sino-no'}`}>
                    {profileData?.postulantProfile?.independent ? 'Sí' : 'No'}
                  </span>
                </div>

                <div className="perfil-block">
                  <h4 className="perfil-block-title">Empleado</h4>
                  <span className={`perfil-sino-badge ${profileData?.postulantProfile?.employee ? 'sino-si' : 'sino-no'}`}>
                    {profileData?.postulantProfile?.employee ? 'Sí' : 'No'}
                  </span>
                </div>

                <div className="perfil-block">
                  <h4 className="perfil-block-title">Tiempo total de experiencia laboral (En meses)</h4>
                  <div className="perfil-field-value">{profileData?.postulantProfile?.totalTimeExperience != null ? String(profileData.postulantProfile.totalTimeExperience) : '0.0'}</div>
                </div>

                <div className="perfil-block">
                  <h4 className="perfil-block-title">Hojas de vida</h4>
                  <p className="perfil-block-desc">Puede generar hasta 5 archivos de Hoja de Vida, según los diferentes perfiles que tenga. El tamaño máximo de cada archivo es de 5Mb.</p>
                </div>
              </div>
            </div>

            {/* Bloques de solo lectura debajo: texto completo perfil, premios, referencias */}
            {(profileData?.postulantProfile?.profileText && profileData.postulantProfile.profileText.split('\n').length > 1) && (
              <div className="perfil-extra-block">
                <h4 className="perfil-block-title">Texto de perfil (completo)</h4>
                <div className="perfil-field-value profile-text-block">{profileData.postulantProfile.profileText}</div>
              </div>
            )}
            {profileData?.awards?.length > 0 && (
              <div className="perfil-extra-block">
                <h4 className="perfil-block-title">Logros / premios</h4>
                <ul className="profile-list">
                  {profileData.awards.map((a) => (
                    <li key={a._id}>{a.name} — {a.awardType?.name ?? a.awardType?.value ?? ''} {a.awardDate ? formatDate(a.awardDate) : ''}</li>
                  ))}
                </ul>
              </div>
            )}
            {profileData?.references?.length > 0 && (
              <div className="perfil-extra-block">
                <h4 className="perfil-block-title">Referencias</h4>
                <ul className="profile-list">
                  {profileData.references.map((r) => (
                    <li key={r._id}>{r.firstname} {r.lastname} — {r.occupation} — {r.phone}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'experiencia' && (
          <div className="profile-tab-content experiencia-tab">
            <div className="experiencia-warning-banner">
              Atención! La Universidad del Rosario no se hace responsable de la veracidad de la información ingresada en relación a los estudios o experiencia externos a la institución relacionados por el postulante.
            </div>

            <section className="exp-section">
              <h3 className="exp-section-title">Experiencias Laborales</h3>
              <div className="exp-table-wrap">
                <table className="exp-table">
                  <thead>
                    <tr>
                      <th>Fecha de inicio</th>
                      <th>Fecha de finalización</th>
                      <th>Cargo</th>
                      <th>Empresa</th>
                      <th>Sector</th>
                      <th>Contacto</th>
                      <th>Profesión</th>
                      <th>País</th>
                      <th>Departamento</th>
                      <th>Ciudad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profileData?.workExperiences?.filter((w) => (w.experienceType || 'JOB_EXP') === 'JOB_EXP').length > 0 ? (
                      profileData.workExperiences.filter((w) => (w.experienceType || 'JOB_EXP') === 'JOB_EXP').map((w) => (
                        <tr key={w._id}>
                          <td>{w.startDate ? formatDate(w.startDate) : '—'}</td>
                          <td>{w.noEndDate ? 'Actualidad' : (w.endDate ? formatDate(w.endDate) : '—')}</td>
                          <td>{w.jobTitle || '—'}</td>
                          <td>{w.companyName || '—'}</td>
                          <td>{w.companySector?.name ?? w.companySector?.value ?? '—'}</td>
                          <td>{w.contact || '—'}</td>
                          <td>{w.profession || '—'}</td>
                          <td>{w.countryId?.name ?? '—'}</td>
                          <td>{w.stateId?.name ?? '—'}</td>
                          <td>{w.cityId?.name ?? '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={10} className="exp-table-empty">No hay experiencias laborales registradas.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="exp-section">
              <h3 className="exp-section-title">Otras Experiencias</h3>
              <div className="exp-table-wrap">
                <table className="exp-table">
                  <thead>
                    <tr>
                      <th>Tipo de Experiencia</th>
                      <th>Fecha de inicio</th>
                      <th>Fecha de finalización</th>
                      <th>Nombre</th>
                      <th>Institución</th>
                      <th>Investigación</th>
                      <th>Asignatura</th>
                      <th>País</th>
                      <th>Departamento</th>
                      <th>Ciudad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profileData?.workExperiences?.filter((w) => (w.experienceType || 'JOB_EXP') !== 'JOB_EXP').length > 0 ? (
                      profileData.workExperiences.filter((w) => (w.experienceType || 'JOB_EXP') !== 'JOB_EXP').map((w) => (
                        <tr key={w._id}>
                          <td>{w.experienceType || '—'}</td>
                          <td>{w.startDate ? formatDate(w.startDate) : '—'}</td>
                          <td>{w.noEndDate ? 'Actualidad' : (w.endDate ? formatDate(w.endDate) : '—')}</td>
                          <td>{w.jobTitle || w.companyName || '—'}</td>
                          <td>{w.companyName || '—'}</td>
                          <td>{w.investigationLine || '—'}</td>
                          <td>{w.course || '—'}</td>
                          <td>{w.countryId?.name ?? '—'}</td>
                          <td>{w.stateId?.name ?? '—'}</td>
                          <td>{w.cityId?.name ?? '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={10} className="exp-table-empty">No hay otras experiencias registradas.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="exp-section">
              <h3 className="exp-section-title">Logros</h3>
              <div className="exp-table-wrap">
                <table className="exp-table">
                  <thead>
                    <tr>
                      <th>Tipo de Logro</th>
                      <th>Fecha</th>
                      <th>Nombre</th>
                      <th>Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profileData?.awards?.length > 0 ? (
                      profileData.awards.map((a) => (
                        <tr key={a._id}>
                          <td>{a.awardType?.name ?? a.awardType?.value ?? '—'}</td>
                          <td>{a.awardDate ? formatDate(a.awardDate) : '—'}</td>
                          <td>{a.name || '—'}</td>
                          <td>{a.description || '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="exp-table-empty">No hay logros registrados.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="exp-section">
              <h3 className="exp-section-title">Referencias</h3>
              <div className="exp-table-wrap">
                <table className="exp-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Apellido</th>
                      <th>Ocupación</th>
                      <th>Teléfono</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profileData?.references?.length > 0 ? (
                      profileData.references.map((r) => (
                        <tr key={r._id}>
                          <td>{r.firstname || '—'}</td>
                          <td>{r.lastname || '—'}</td>
                          <td>{r.occupation || '—'}</td>
                          <td>{r.phone || '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="exp-table-empty">No hay referencias registradas.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostulantProfile;
