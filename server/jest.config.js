/** Configuración de Jest para ES Modules (sin transpilación). */
export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/pruebas/**/*.test.js'],
  // Las pruebas comparten la base de datos de pruebas: un solo worker
  // evita interferencias entre archivos.
  maxWorkers: 1,
};
