import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase.js';
import { obtenerMiPerfil } from '../api.js';

const AutenticacionContexto = createContext(null);

/**
 * Estado global de sesión:
 * - usuario: cuenta de Firebase (null sin sesión)
 * - perfil:  fila de PostgreSQL (null si falta completar el registro)
 * - cargando: true mientras se restaura la sesión al abrir la app
 */
export function ProveedorAutenticacion({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);

  const recargarPerfil = useCallback(async (usuarioActual) => {
    const cuenta = usuarioActual ?? auth.currentUser;
    if (!cuenta) {
      setPerfil(null);
      return null;
    }
    try {
      const datos = await obtenerMiPerfil(await cuenta.getIdToken());
      setPerfil(datos);
      return datos;
    } catch (error) {
      // 404: la cuenta existe en Firebase pero el registro no se completó.
      setPerfil(null);
      if (error.codigo !== 404) console.error('No fue posible cargar el perfil', error);
      return null;
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (cuenta) => {
      setUsuario(cuenta);
      await recargarPerfil(cuenta);
      setCargando(false);
    });
  }, [recargarPerfil]);

  const valor = {
    usuario,
    perfil,
    cargando,
    recargarPerfil,
    crearCuenta: (correo, contrasena) =>
      createUserWithEmailAndPassword(auth, correo, contrasena),
    iniciarSesion: (correo, contrasena) =>
      signInWithEmailAndPassword(auth, correo, contrasena),
    cerrarSesion: () => signOut(auth),
    obtenerToken: () => auth.currentUser?.getIdToken(),
  };

  return (
    <AutenticacionContexto.Provider value={valor}>
      {children}
    </AutenticacionContexto.Provider>
  );
}

export function useAutenticacion() {
  const contexto = useContext(AutenticacionContexto);
  if (!contexto) {
    throw new Error('useAutenticacion debe usarse dentro de ProveedorAutenticacion');
  }
  return contexto;
}

/** Traduce los códigos de error de Firebase Auth a mensajes en español. */
export function mensajeErrorFirebase(error) {
  const codigo = error?.code ?? '';
  const mensajes = {
    'auth/email-already-in-use': 'Ya existe una cuenta con este correo.',
    'auth/invalid-email': 'El correo no es válido.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/user-disabled': 'Esta cuenta fue deshabilitada.',
    'auth/too-many-requests': 'Demasiados intentos; espere unos minutos.',
    'auth/network-request-failed': 'Sin conexión; intente de nuevo.',
  };
  return mensajes[codigo] ?? 'Ocurrió un error inesperado; intente de nuevo.';
}
