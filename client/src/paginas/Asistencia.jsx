import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { registrarAsistencia, ErrorApi } from '../api.js';
import { useAutenticacion } from '../contexto/AutenticacionContexto.jsx';
import { EstadoCarga } from '../componentes/Estados.jsx';
import Icono from '../componentes/Icono.jsx';

/**
 * Destino del QR escaneado: /asistencia/:tokenQr
 * Con sesión activa registra la asistencia automáticamente; sin sesión,
 * guarda el token y retoma el registro después de iniciar sesión.
 */
export default function Asistencia() {
  const { token: tokenQr } = useParams();
  const { usuario, perfil, cargando, obtenerToken } = useAutenticacion();
  const navegar = useNavigate();

  const [resultado, setResultado] = useState(null); // { tipo: 'exito'|'error', mensaje }
  const enviado = useRef(false);

  useEffect(() => {
    if (cargando || enviado.current) return;

    // Sin sesión: se guarda el token y se retoma tras iniciar sesión.
    if (!usuario) {
      sessionStorage.setItem('asistenciaPendiente', tokenQr);
      navegar('/entrar', { replace: true });
      return;
    }

    // Cuenta sin perfil: completar el registro primero.
    if (!perfil) {
      sessionStorage.setItem('asistenciaPendiente', tokenQr);
      navegar('/registro', { replace: true });
      return;
    }

    enviado.current = true;
    sessionStorage.removeItem('asistenciaPendiente');

    (async () => {
      try {
        const datos = await registrarAsistencia(await obtenerToken(), tokenQr);
        setResultado({
          tipo: 'exito',
          mensaje: `Tu asistencia a "${datos.actividad_titulo}" quedó registrada.`,
        });
      } catch (error) {
        setResultado({
          tipo: 'error',
          mensaje:
            error instanceof ErrorApi
              ? error.message
              : 'No fue posible registrar la asistencia. Intenta de nuevo.',
        });
      }
    })();
  }, [cargando, usuario, perfil, tokenQr, navegar, obtenerToken]);

  if (!resultado) return <EstadoCarga mensaje="Registrando tu asistencia…" />;

  return (
    <section className="formulario-tarjeta asistencia-resultado">
      {/* El sello de caucho cae sobre la boleta: la firma del sistema */}
      <span
        className={`sello-redondo sello-estampado${
          resultado.tipo === 'exito' ? '' : ' sello-redondo-rojo'
        }`}
        aria-hidden="true"
      >
        <Icono
          nombre={resultado.tipo === 'exito' ? 'sello' : 'alerta'}
          tamano="2.6rem"
        />
        {resultado.tipo === 'exito' ? 'Asistencia' : 'Sin registro'}
      </span>
      <h1>{resultado.tipo === 'exito' ? '¡Asistencia registrada!' : 'No se pudo registrar'}</h1>
      <p className={resultado.tipo === 'exito' ? 'texto-suave' : 'aviso aviso-error'}>
        {resultado.mensaje}
      </p>
      <Link to="/" className="boton">
        Volver al inicio
      </Link>
    </section>
  );
}
