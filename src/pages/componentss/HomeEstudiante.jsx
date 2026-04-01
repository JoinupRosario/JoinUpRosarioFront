import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineDocumentText, HiOutlineBriefcase } from 'react-icons/hi';
import api from '../../services/api';
import '../styles/HomeEstudiante.css';
import banner01 from '../../assets/images/bannerstudent/01.jpg';
import banner02 from '../../assets/images/bannerstudent/02.jpg';
import banner03 from '../../assets/images/bannerstudent/03.jpg';

const BANNER_IMAGES = [banner01, banner02, banner03];
const CAROUSEL_INTERVAL_MS = 3000;

export default function HomeEstudiante() {
  const navigate = useNavigate();
  const [slideIndex, setSlideIndex] = useState(0);
  const [autorizadoPracticas, setAutorizadoPracticas] = useState(false);
  const [yaConfirmadoPractica, setYaConfirmadoPractica] = useState(false);
  const [loadingAutorizado, setLoadingAutorizado] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % BANNER_IMAGES.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      api.get('/estudiantes-habilitados/me-autorizado'),
      api.get('/opportunities/mis-postulaciones'),
    ]).then(([autRes, posRes]) => {
      if (cancelled) return;
      if (autRes.status === 'fulfilled') setAutorizadoPracticas(autRes.value.data?.autorizado === true);
      if (posRes.status === 'fulfilled') setYaConfirmadoPractica(posRes.value.data?.tieneAceptadaDefinitivaGlobal === true);
    }).finally(() => {
      if (!cancelled) setLoadingAutorizado(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="home-estudiante-page">
      <section className="home-estudiante-banner">
        <div className="home-estudiante-carousel">
          {BANNER_IMAGES.map((src, i) => (
            <div
              key={i}
              className={`home-estudiante-slide ${i === slideIndex ? 'active' : ''}`}
              style={{ backgroundImage: `url(${src})` }}
              aria-hidden={i !== slideIndex}
              role="img"
              aria-label={`Banner ${i + 1}`}
            />
          ))}
        </div>
      </section>

      <section className="home-estudiante-opciones">
        <h2 className="home-estudiante-titulo">¿Qué tipo de oportunidad deseas buscar?</h2>
        <div className="home-estudiante-buttons">
          {!loadingAutorizado && autorizadoPracticas && !yaConfirmadoPractica && (
            <button
              type="button"
              className="home-estudiante-btn"
              onClick={() => navigate('/dashboard/oportunidades-practica')}
            >
              <HiOutlineBriefcase className="home-estudiante-btn-icon" />
              <span>Prácticas y Pasantías</span>
            </button>
          )}
          {!loadingAutorizado && autorizadoPracticas && yaConfirmadoPractica && (
            <button
              type="button"
              className="home-estudiante-btn"
              onClick={() => navigate('/dashboard/legalizaciones')}
            >
              <HiOutlineBriefcase className="home-estudiante-btn-icon" />
              <span>Mi práctica activa</span>
            </button>
          )}
          <button
            type="button"
            className="home-estudiante-btn"
            onClick={() => navigate('/dashboard/oportunidades-monitoria')}
          >
            <HiOutlineDocumentText className="home-estudiante-btn-icon" />
            <span>Monitorías, tutorías y mentorías</span>
          </button>
        </div>
      </section>
    </div>
  );
}
