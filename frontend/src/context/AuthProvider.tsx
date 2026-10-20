import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registrarManejadorSesionExpirada } from '../services/api';
import {
  adoptarSesion,
  anunciarSesion,
  anunciarSesionCerrada,
  borrarSesion,
  guardarSesion,
  iniciarSincronizacionSesion,
  leerSesionAlmacenada,
  obtenerExpiracion,
  obtenerSesionValida,
  pedirSesionCompartida,
  registrarManejadorSincronizacion,
  tokenVencido,
  type Sesion,
} from '../services/sesion';
import { rutaLoginDeRol } from '../config/rutas';
import type { LoginResponseDTO } from '../types/auth';
import { AuthContext, type AuthContextValue, type MotivoCierre } from './AuthContext';

/** Máximo retraso admitido por setTimeout (~24,8 días); los tokens del SAIE duran horas. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Sesión común a los cuatro roles (Issue #217 / 4.25): guarda el token, cierra la sesión
 * (manualmente, al vencer el token o ante un 401) y redirige al login del rol.
 * Debe renderizarse dentro de un Router.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [estadoInicial] = useState(obtenerSesionValida);
  const [sesion, setSesion] = useState<Sesion | null>(estadoInicial.sesion);
  const [sesionVencida, setSesionVencida] = useState(estadoInicial.vencida);

  const iniciarSesion = useCallback((resultado: LoginResponseDTO): Sesion => {
    const nueva = guardarSesion(resultado);
    setSesion(nueva);
    setSesionVencida(false);
    // Las demás pestañas abiertas se enteran y adopts la misma sesión.
    anunciarSesion(nueva);
    return nueva;
  }, []);

  const cerrarSesion = useCallback(
    (motivo: MotivoCierre = 'manual') => {
      const actual = leerSesionAlmacenada();
      // Si ya no hay sesión, un cierre por vencimiento llegó repetido: no hay nada que hacer.
      if (!actual && motivo === 'vencida') return;

      borrarSesion();
      setSesion(null);
      // RutaProtegida también redirige al quedar sin sesión; esta marca hace que conserve el aviso.
      setSesionVencida(motivo === 'vencida');
      anunciarSesionCerrada();
      void navigate(rutaLoginDeRol(actual?.rol), {
        replace: true,
        state: motivo === 'vencida' ? { motivo } : null,
      });
    },
    [navigate],
  );

  /**
   * Sesión compartida entre pestañas del mismo navegador (Issue 3.29).
   *
   * El token sigue en `sessionStorage`, que es por pestaña. Para que una pestaña abierta con
   * control+clic no termine en el login, las pestañas se avisan por `BroadcastChannel`: la que
   * tiene sesión la comparte y la que no la pide.
   */
  const preguntoPorSesion = useRef(false);
  useEffect(() => {
    const detener = iniciarSincronizacionSesion();
    registrarManejadorSincronizacion((mensaje) => {
      if (mensaje.tipo === 'cerrada') {
        borrarSesion();
        setSesion(null);
        return;
      }
      if (mensaje.tipo === 'respuesta' || mensaje.tipo === 'actualizada') {
        // Solo se adopta si esta pestaña no tiene ya la suya: una sesión vigente manda.
        if (!leerSesionAlmacenada()) {
          adoptarSesion(mensaje.sesion);
          setSesion(mensaje.sesion);
          setSesionVencida(false);
        }
      }
    });
    return () => {
      detener();
      registrarManejadorSincronizacion(null);
    };
  }, []);

  // Si esta pestaña no tiene sesión, la pide a las demás (una sola vez por montaje).
  useEffect(() => {
    if (sesion || preguntoPorSesion.current) return;
    preguntoPorSesion.current = true;
    pedirSesionCompartida();
  }, [sesion]);

  // Un 401 del servidor en una petición autenticada equivale a una sesión vencida.
  useEffect(() => {
    registrarManejadorSesionExpirada(() => cerrarSesion('vencida'));
    return () => registrarManejadorSesionExpirada(null);
  }, [cerrarSesion]);

  // Cierra la sesión al llegar la hora de expiración del token, sin esperar a un 401.
  useEffect(() => {
    if (!sesion) return;
    const expiracion = obtenerExpiracion(sesion.token);
    if (expiracion === null) return;

    const restante = Math.max(expiracion - Date.now(), 0);
    const temporizador = window.setTimeout(
      () => {
        if (tokenVencido(sesion.token)) cerrarSesion('vencida');
      },
      Math.min(restante, MAX_TIMEOUT_MS),
    );
    return () => window.clearTimeout(temporizador);
  }, [sesion, cerrarSesion]);

  const valor = useMemo<AuthContextValue>(
    () => ({ sesion, sesionVencida, iniciarSesion, cerrarSesion }),
    [sesion, sesionVencida, iniciarSesion, cerrarSesion],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
