export function EstadoCarga({ mensaje = 'Cargando…' }) {
  return (
    <p className="aviso" role="status">
      {mensaje}
    </p>
  );
}

export function EstadoError({ mensaje }) {
  return (
    <p className="aviso aviso-error" role="alert">
      {mensaje ??
        'No fue posible comunicarse con la plataforma. Intente de nuevo en unos minutos.'}
    </p>
  );
}
