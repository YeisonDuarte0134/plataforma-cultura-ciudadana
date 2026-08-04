/**
 * Set de iconos propio del sistema Boletería: trazos SVG de una sola pluma
 * (grosor 1.75, puntas redondeadas), dibujados en la gramática del mundo
 * —boletas, sellos, taquilla— en lugar de emojis, para que la iconografía
 * tenga un solo peso visual en toda la plataforma.
 *
 * Uso: <Icono nombre="lugar" /> hereda el color del texto (currentColor).
 */

const TRAZOS = {
  // Marca: una boleta con su troquel y estrella de feria.
  boleta: (
    <>
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
      <path d="M15 6v2m0 3v2m0 3v2" strokeDasharray="0.1 3.4" />
      <path d="m9 9.6 .9 1.83 2.02.3-1.46 1.42.34 2.01L9 14.21l-1.8.95.34-2.01-1.46-1.42 2.02-.3Z" />
    </>
  ),
  calendario: (
    <>
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3.5v4M16 3.5v4" />
    </>
  ),
  lugar: (
    <>
      <path d="M12 21s-6.5-5.4-6.5-10a6.5 6.5 0 0 1 13 0c0 4.6-6.5 10-6.5 10Z" />
      <circle cx="12" cy="10.6" r="2.4" />
    </>
  ),
  cupo: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M15.5 5.8a3.2 3.2 0 0 1 0 5.4M17.5 14.9c1.8.8 3 2.4 3 4.6" />
    </>
  ),
  puntos: (
    <>
      <circle cx="12" cy="9" r="5.5" />
      <path d="m9.5 13.5-2 7 4.5-2.4 4.5 2.4-2-7" />
      <path d="m12 6.4.8 1.62 1.8.26-1.3 1.27.3 1.79L12 10.5l-1.6.84.3-1.79-1.3-1.27 1.8-.26Z" />
    </>
  ),
  plazo: (
    <>
      <path d="M7 3.5h10M7 20.5h10M8 3.5v3.2c0 2.6 4 4 4 5.3 0 1.3-4 2.7-4 5.3v3.2M16 3.5v3.2c0 2.6-4 4-4 5.3 0 1.3 4 2.7 4 5.3v3.2" />
    </>
  ),
  evidencia: (
    <>
      <path d="m16.5 8.5-6.9 6.9a2.1 2.1 0 0 1-3-3l7.6-7.6a3.5 3.5 0 0 1 5 4.95L11 17.9a5 5 0 0 1-7.07-7.07l6.57-6.58" />
    </>
  ),
  campana: (
    <>
      <path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" />
      <path d="M10 19.5a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  sello: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.2 12.4 2.4 2.4 5.2-5.4" />
    </>
  ),
  alerta: (
    <>
      <path d="M12 4 2.8 19.5h18.4Z" />
      <path d="M12 10v4.2M12 16.8v.4" />
    </>
  ),
  megafono: (
    <>
      <path d="M4 10.5v3a1.5 1.5 0 0 0 1.5 1.5H8l8.5 4.5v-15L8 9H5.5A1.5 1.5 0 0 0 4 10.5Z" />
      <path d="M19.5 10a3.5 3.5 0 0 1 0 4M9 15.5l1.2 4.5h2.4l-1-4" />
    </>
  ),
  ajustes: (
    <>
      <path d="m14.3 5.5 4.2 4.2L8 20.2l-4.7 1 1-4.7Z" />
      <path d="m12.5 7.3 4.2 4.2M17 3l3.5 3.5" />
    </>
  ),
  flecha: <path d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" />,
  volver: <path d="M20 12H5m0 0 5.5-5.5M5 12l5.5 5.5" />,
  qr: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
      <path d="M13.5 13.5h3v3h-3zM17 17h3v3h-3zM13.5 20h1.5M20 13.5v1.5" />
    </>
  ),
};

export default function Icono({ nombre, tamano = '1em', titulo }) {
  const trazos = TRAZOS[nombre] ?? TRAZOS.boleta;
  return (
    <svg
      className="icono"
      viewBox="0 0 24 24"
      width={tamano}
      height={tamano}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={titulo ? undefined : true}
      role={titulo ? 'img' : undefined}
    >
      {titulo && <title>{titulo}</title>}
      {trazos}
    </svg>
  );
}
