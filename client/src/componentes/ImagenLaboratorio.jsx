/**
 * Imagen del laboratorio con respaldo visual: si no hay imagen_url
 * (o mientras Firebase Storage no esté configurado) se muestra un
 * marcador con la inicial del laboratorio.
 */
export default function ImagenLaboratorio({ laboratorio, alto = false }) {
  const clase = alto ? 'lab-imagen lab-imagen-alta' : 'lab-imagen';

  if (laboratorio.imagen_url) {
    return (
      <img
        className={clase}
        src={laboratorio.imagen_url}
        alt={`Fotografía de ${laboratorio.nombre}`}
        loading="lazy"
      />
    );
  }

  return (
    <div className={`${clase} lab-imagen-respaldo`} aria-hidden="true">
      <span>{laboratorio.nombre.charAt(0)}</span>
    </div>
  );
}
