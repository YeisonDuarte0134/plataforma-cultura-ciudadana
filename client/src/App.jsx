import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './componentes/Layout.jsx';
import Laboratorios from './paginas/Laboratorios.jsx';
import LaboratorioDetalle from './paginas/LaboratorioDetalle.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Laboratorios />} />
          <Route path="laboratorios/:id" element={<LaboratorioDetalle />} />
          <Route
            path="*"
            element={
              <p className="aviso">La página solicitada no existe.</p>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
