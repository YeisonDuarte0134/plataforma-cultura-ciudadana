import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAutenticacion } from '../../contexto/AutenticacionContexto.jsx';
import { EstadoCarga, EstadoError } from '../../componentes/Estados.jsx';
import { obtenerLaboratoriosAdministrables, editarLaboratorio } from '../../api.js';

export default function AdminLaboratorios() {
  const { perfil, obtenerToken } = useAutenticacion();
  const esAdmin = perfil.rol === 'administrador';

  const [estado, setEstado] = useState('cargando');
  const [laboratorios, setLaboratorios] = useState([]);

  const cargar = useCallback(async () => {
    try {
      setLaboratorios(await obtenerLaboratoriosAdministrables(await obtenerToken()));
      setEstado('listo');
    } catch {
      setEstado('error');
    }
  }, [obtenerToken]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function alternarActivo(lab) {
    try {
      await editarLaboratorio(await obtenerToken(), lab.id, { activo: !lab.activo });
      await cargar();
    } catch {
      setEstado('error');
    }
  }

  if (estado === 'cargando') return <EstadoCarga mensaje="Cargando laboratorios…" />;
  if (estado === 'error') return <EstadoError />;

  return (
    <section>
      <div className="admin-barra">
        <h2>{esAdmin ? 'Todos los laboratorios' : 'Mis laboratorios'}</h2>
        {esAdmin && (
          <Link to="/admin/laboratorios/nuevo" className="boton boton-pequeno">
            + Nuevo laboratorio
          </Link>
        )}
      </div>

      {laboratorios.length === 0 ? (
        <p className="aviso">
          {esAdmin
            ? 'Aún no hay laboratorios. Crea el primero.'
            : 'No tienes laboratorios asignados. Contacta al administrador.'}
        </p>
      ) : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Ubicación</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {laboratorios.map((lab) => (
                <tr key={lab.id}>
                  <td>{lab.nombre}</td>
                  <td className="texto-suave">{lab.ubicacion}</td>
                  <td>
                    <span className={`insignia ${lab.activo ? 'insignia-ok' : 'insignia-falla'}`}>
                      {lab.activo ? 'activo' : 'inactivo'}
                    </span>
                  </td>
                  <td className="tabla-acciones">
                    <Link to={`/admin/laboratorios/${lab.id}/actividades`} className="enlace-accion">
                      Actividades
                    </Link>
                    <Link to={`/admin/laboratorios/${lab.id}`} className="enlace-accion">
                      Editar
                    </Link>
                    {esAdmin && (
                      <button
                        type="button"
                        className="enlace-accion enlace-peligro"
                        onClick={() => alternarActivo(lab)}
                      >
                        {lab.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
