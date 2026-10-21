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
  children: React.ReactNode;
}

/**
 * Protege una ruta privada (Issue #217 / 4.25):
 *  - sin sesión (o con sesión vencida) → redirige al login;
 *  - con un rol no autorizado → muestra un mensaje claro, no una pantalla rota.
 */
export const RutaProtegida: React.FC<RutaProtegidaProps> = ({
  rolesPermitidos,
  rutaLogin = RUTAS.loginAlumno,
  children,
}) => {
  const { sesion, sesionVencida } = useAuth();

  if (!sesion) {
    return <Navigate to={rutaLogin} replace state={sesionVencida ? { motivo: 'vencida' } : null} />;
  }

  if (!rolesPermitidos.includes(sesion.rol)) {
    return <AccesoDenegado rol={sesion.rol} />;
  }

  return <>{children}</>;
};

export default RutaProtegida;
