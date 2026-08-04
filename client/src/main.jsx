import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// Voces tipográficas del sistema Boletería: Archivo (ejes peso + ancho:
// condensada de talonario y expandida de cartel) y Chivo Mono (numeración).
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/chivo-mono/wght.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
