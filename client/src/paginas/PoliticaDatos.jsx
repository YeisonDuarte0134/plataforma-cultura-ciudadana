/**
 * Política de tratamiento de datos personales (Ley 1581 de 2012).
 * Versión 1.0 (2026-07-28) — debe coincidir con VERSION_CONSENTIMIENTO
 * del servidor cuando se actualice su contenido.
 */
export default function PoliticaDatos() {
  return (
    <article className="documento">
      <h1>Política de tratamiento de datos personales</h1>
      <p className="texto-suave">Versión 1.0 — 28 de julio de 2026</p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        La plataforma de laboratorios de cultura ciudadana de Bucaramanga es un
        proyecto académico de grado (Unidades Tecnológicas de Santander,
        propuesta 125-2026-027). El tratamiento de los datos se realiza con
        fines exclusivamente académicos y de operación de los laboratorios.
      </p>

      <h2>2. Datos que se recolectan</h2>
      <ul>
        <li>Correo electrónico y contraseña (gestionados por Firebase Authentication; la contraseña nunca se almacena en texto plano).</li>
        <li>Alias público, avatar y teléfono de contacto (opcional).</li>
        <li>Registros de participación: inscripciones, asistencias, retos y evidencias, con marca de tiempo.</li>
        <li>Temáticas de interés seleccionadas por el usuario.</li>
      </ul>

      <h2>3. Finalidades</h2>
      <ul>
        <li>Gestionar tu participación en convocatorias y retos de los laboratorios.</li>
        <li>Operar el sistema de gamificación (puntos, niveles, insignias y rankings, mostrados solo con alias y avatar).</li>
        <li>Producir métricas <strong>agregadas y anonimizadas</strong> sobre participación e impacto; ningún reporte expone datos individuales identificables.</li>
      </ul>

      <h2>4. Tus derechos (Habeas Data)</h2>
      <ul>
        <li>Conocer, actualizar y rectificar tus datos desde tu perfil.</li>
        <li>Solicitar la baja de tu cuenta (desactivación) en cualquier momento.</li>
        <li>Solicitar la eliminación definitiva de tu cuenta y datos personales; tus participaciones históricas se anonimizarán para preservar las métricas agregadas.</li>
        <li>Revocar la autorización otorgada, en los términos de la Ley 1581 de 2012 y el Decreto 1377 de 2013.</li>
      </ul>

      <h2>5. Seguridad</h2>
      <p>
        Las credenciales se gestionan mediante Firebase Authentication; los
        datos de dominio se almacenan en una base de datos protegida con acceso
        restringido y cifrado en tránsito. La plataforma valida y sanitiza toda
        entrada de datos.
      </p>

      <h2>6. Consentimiento</h2>
      <p>
        Al marcar la casilla de aceptación durante el registro otorgas tu
        consentimiento explícito, previo e informado para el tratamiento aquí
        descrito. La fecha y la versión aceptada quedan registradas.
      </p>
    </article>
  );
}
