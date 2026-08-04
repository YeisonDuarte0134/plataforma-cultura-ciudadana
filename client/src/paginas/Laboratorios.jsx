import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtenerLaboratorios } from '../api.js';
import { useAutenticacion } from '../contexto/AutenticacionContexto.jsx';
import { EstadoCarga, EstadoError } from '../componentes/Estados.jsx';
import ImagenLaboratorio from '../componentes/ImagenLaboratorio.jsx';
import Icono from '../componentes/Icono.jsx';

export default function Laboratorios() {
  const [estado, setEstado] = useState('cargando');
  const [laboratorios, setLaboratorios] = useState([]);
  const { perfil } = useAutenticacion();

  useEffect(() => {
    obtenerLaboratorios()
      .then((datos) => {
        setLaboratorios(datos);
        setEstado('listo');
      })
      .catch(() => setEstado('error'));
  }, []);

  return (
    <>
      {/* La taquilla: el cartel de entrada de la feria cívica */}
      <section className="taquilla">
        <div className="taquilla-contenido">
          <div>
            <h1>
              Participa en la <mark>cultura ciudadana</mark>{' '}
              <span className="titular-naranja">de tu ciudad</span>
            </h1>
            <p className="taquilla-parrafo">
              Conoce los laboratorios de cultura ciudadana de Bucaramanga,
              explora sus actividades y súmate a construir una ciudad más
              participativa.
            </p>
            <div className="taquilla-acciones">
              {perfil ? (
                <Link to="/perfil" className="boton">
                  Ver mi talonario
                  <Icono nombre="flecha" />
                </Link>
              ) : (
                <Link to="/registro" className="boton">
                  Crear mi cuenta
                  <Icono nombre="flecha" />
                </Link>
              )}
              <Link to="/ranking" className="boton boton-fantasma">
                Tabla de clasificación
              </Link>
            </div>
            <p className="taquilla-serial">
              Eventos con asistencia QR · Retos con evidencia · Ranking anónimo
            </p>
          </div>

          {/* Boleta decorativa: el objeto del mundo, girado sobre el cartel */}
          <div className="taquilla-boleta-marco" aria-hidden="true">
            <div className="taquilla-boleta">
              <span className="voz-serial">Laboratorios de cultura ciudadana</span>
              <strong>
                Tu ciudad
                <br />
                te espera
              </strong>
              <span className="voz-serial">Bucaramanga · Entrada libre</span>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Laboratorios disponibles">
        {estado === 'cargando' && (
          <EstadoCarga mensaje="Imprimiendo el tablón de laboratorios…" />
        )}

        {estado === 'error' && <EstadoError />}

        {estado === 'listo' && laboratorios.length === 0 && (
          <p className="aviso">
            Aún no hay laboratorios publicados. Vuelve pronto.
          </p>
        )}

        {estado === 'listo' && laboratorios.length > 0 && (
          <>
            <h2 className="seccion-titulo">Elige tu laboratorio</h2>
            <ul className="lab-grilla">
              {laboratorios.map((lab) => (
                <li key={lab.id}>
                  <Link to={`/laboratorios/${lab.id}`} className="lab-tarjeta">
                    <ImagenLaboratorio laboratorio={lab} />
                    <div className="lab-tarjeta-cuerpo">
                      <h2>{lab.nombre}</h2>
                      <p className="lab-ubicacion">
                        <Icono nombre="lugar" />
                        {lab.ubicacion}
                      </p>
                      <p className="lab-descripcion">{lab.descripcion}</p>
                    </div>
                    <span className="lab-talon">
                      <span className="lab-serial">
                        Lab Nº {String(lab.id).padStart(3, '0')}
                      </span>
                      <span className="lab-enlace">
                        Ver laboratorio
                        <Icono nombre="flecha" />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
