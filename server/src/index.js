import app from './app.js';
import config from './config.js';

app.listen(config.puerto, () => {
  console.log(
    `API de cultura ciudadana escuchando en el puerto ${config.puerto} (${config.entorno})`
  );
});
