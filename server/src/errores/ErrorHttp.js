/**
 * Error con código HTTP asociado. Los servicios lo lanzan y el
 * manejador central de errores lo traduce a la respuesta JSON,
 * sin que controladores repitan lógica de estados.
 */
export default class ErrorHttp extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = 'ErrorHttp';
    this.codigo = codigo;
  }
}
