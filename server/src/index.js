import crearApp from './app.js';
import config from './config.js';
import { verificarIdTokenFirebase } from './firebase.js';

const app = crearApp({ verificadorTokens: verificarIdTokenFirebase });

app.listen(config.puerto, () => {
  console.log(
    `API de cultura ciudadana escuchando en el puerto ${config.puerto} (${config.entorno})`
  );
});
