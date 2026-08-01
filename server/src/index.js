import crearApp from './app.js';
import config from './config.js';
import { verificarIdTokenFirebase, almacenFirebase, cuentasFirebase } from './firebase.js';

const app = crearApp({
  verificadorTokens: verificarIdTokenFirebase,
  almacenArchivos: almacenFirebase,
  cuentasAuth: cuentasFirebase,
});

app.listen(config.puerto, () => {
  console.log(
    `API de cultura ciudadana escuchando en el puerto ${config.puerto} (${config.entorno})`
  );
});
