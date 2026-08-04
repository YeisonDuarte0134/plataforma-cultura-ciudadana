import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { useAutenticacion } from '../../contexto/AutenticacionContexto.jsx';
import { EstadoCarga, EstadoError } from '../../componentes/Estados.jsx';
import { obtenerQrActividad, ErrorApi } from '../../api.js';
import { formatearFecha } from '../../componentes/TarjetaEvento.jsx';

/** QR de asistencia del evento, pensado para proyectar o imprimir. */
export default function AdminActividadQR() {
  const { labId, id } = useParams();
  const { obtenerToken } = useAutenticacion();

  const [estado, setEstado] = useState('cargando');
  const [datos, setDatos] = useState(null);
  const [imagenQr, setImagenQr] = useState(null);
  const [mensajeError, setMensajeError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const respuesta = await obtenerQrActividad(await obtenerToken(), id);
        setDatos(respuesta);
        setImagenQr(
          await QRCode.toDataURL(respuesta.urlAsistencia, {
            width: 640,
            margin: 2,
            errorCorrectionLevel: 'M',
          })
        );
        setEstado('listo');
      } catch (error) {
        setMensajeError(error instanceof ErrorApi ? error.message : null);
        setEstado('error');
      }
    })();
  }, [id, obtenerToken]);

  if (estado === 'cargando') return <EstadoCarga mensaje="Generando cÃ³digo QRâ€¦" />;
  if (estado === 'error') return <EstadoError mensaje={mensajeError} />;

  return (
    <section className="qr-pagina">
      <div className="no-imprimir">
        <Link to={`/admin/laboratorios/${labId}/actividades`} className="volver">
          â† Actividades
        </Link>
      </div>

      <div className="qr-cartel">
        <h2>{datos.actividad.titulo}</h2>
        <p className="texto-suave">
          {formatearFecha(datos.actividad.fecha_inicio)} Â· {datos.actividad.lugar}
        </p>

        <img src={imagenQr} alt="CÃ³digo QR para registrar asistencia" className="qr-imagen" />

        <p className="qr-instruccion">
          Escanea este cÃ³digo con la cÃ¡mara de tu celular para registrar tu asistencia
        </p>
        <p className="texto-suave qr-ventana">
          VÃ¡lido de {new Date(datos.ventana.desde).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}{' '}
          a {new Date(datos.ventana.hasta).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}
        </p>
      </div>

      <div className="no-imprimir qr-acciones">
        <button type="button" className="boton" onClick={() => window.print()}>
          ðŸ–¨ Imprimir o guardar PDF
        </button>
      </div>
    </section>
  );
}
