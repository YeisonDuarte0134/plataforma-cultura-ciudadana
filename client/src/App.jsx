import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProveedorAutenticacion } from './contexto/AutenticacionContexto.jsx';
import Layout from './componentes/Layout.jsx';
import RutaPrivada from './componentes/RutaPrivada.jsx';
import Laboratorios from './paginas/Laboratorios.jsx';
import LaboratorioDetalle from './paginas/LaboratorioDetalle.jsx';
import Entrar from './paginas/Entrar.jsx';
import Registro from './paginas/Registro.jsx';
import Perfil from './paginas/Perfil.jsx';
import PoliticaDatos from './paginas/PoliticaDatos.jsx';
import AdminLayout from './paginas/admin/AdminLayout.jsx';
import AdminLaboratorios from './paginas/admin/AdminLaboratorios.jsx';
import AdminLaboratorioFormulario from './paginas/admin/AdminLaboratorioFormulario.jsx';
import AdminUsuarios from './paginas/admin/AdminUsuarios.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ProveedorAutenticacion>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Laboratorios />} />
            <Route path="laboratorios/:id" element={<LaboratorioDetalle />} />
            <Route path="entrar" element={<Entrar />} />
            <Route path="registro" element={<Registro />} />
            <Route path="politica-de-datos" element={<PoliticaDatos />} />
            <Route
              path="perfil"
              element={
                <RutaPrivada>
                  <Perfil />
                </RutaPrivada>
              }
            />
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="laboratorios" replace />} />
              <Route path="laboratorios" element={<AdminLaboratorios />} />
              <Route path="laboratorios/nuevo" element={<AdminLaboratorioFormulario />} />
              <Route path="laboratorios/:id" element={<AdminLaboratorioFormulario />} />
              <Route path="usuarios" element={<AdminUsuarios />} />
            </Route>
            <Route
              path="*"
              element={<p className="aviso">La página solicitada no existe.</p>}
            />
          </Route>
        </Routes>
      </ProveedorAutenticacion>
    </BrowserRouter>
  );
}
