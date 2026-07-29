import { Navigate } from 'react-router-dom';
import { useAutenticacion } from '../contexto/AutenticacionContexto.jsx';
import { EstadoCarga } from './Estados.jsx';

/** Exige sesión y perfil completo; si falta alguno, redirige. */
export default function RutaPrivada({ children }) {
  const { usuario, perfil, cargando } = useAutenticacion();

  if (cargando) return <EstadoCarga mensaje="Restaurando tu sesión…" />;
  if (!usuario) return <Navigate to="/entrar" replace />;
  if (!perfil) return <Navigate to="/registro" replace />;

  return children;
}
