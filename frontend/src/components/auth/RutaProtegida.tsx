import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { RUTAS } from '../../config/rutas';
import type { RolCuenta } from '../../types/auth';
import AccesoDenegado from './AccesoDenegado';

export interface RutaProtegidaProps {
  /** Roles que pueden ver la ruta. */
  rolesPermitidos: RolCuenta[];
  /** Login al que se redirige si no hay sesión. */
  rutaLogin?: string;
  /**
   * Deja pasar a una cuenta que aún debe cambiar su clave inicial. Solo lo usa la pantalla de
   * cambio de clave; el resto de las rutas la envían allí (Issue 4.45).
   */
  permitirClavePendiente?: boolean;
  children: React.ReactNode;
}

/**
 * Protege una ruta privada (Issue #217 / 4.25):
 *  - sin sesión (o con sesión vencida) → redirige al login;
 *  - con un rol no autorizado → muestra un mensaje claro, no una pantalla rota;
 *  - con la clave inicial sin cambiar → redirige a la pantalla de cambio de clave (Issue 4.45).
 */
export const RutaProtegida: React.FC<RutaProtegidaProps> = ({
  rolesPermitidos,
  rutaLogin = RUTAS.loginAlumno,
  permitirClavePendiente = false,
  children,
}) => {
  const { sesion, sesionVencida } = useAuth();

  if (!sesion) {
    return <Navigate to={rutaLogin} replace state={sesionVencida ? { motivo: 'vencida' } : null} />;
  }

  if (!rolesPermitidos.includes(sesion.rol)) {
    return <AccesoDenegado rol={sesion.rol} />;
  }

  if (sesion.debeCambiarClave && !permitirClavePendiente) {
    return <Navigate to={RUTAS.cambiarClave} replace />;
  }

  return <>{children}</>;
};

export default RutaProtegida;
