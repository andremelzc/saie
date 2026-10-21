import { createContext } from 'react';
import type { LoginResponseDTO } from '../types/auth';
import type { Sesion } from '../services/sesion';

export type MotivoCierre = 'manual' | 'vencida';

export interface AuthContextValue {
  /** Sesión activa, o null si no hay (o ya venció). */
  sesion: Sesion | null;
  /** true si al cargar la app se encontró una sesión guardada que ya había vencido. */
  sesionVencida: boolean;
  iniciarSesion: (resultado: LoginResponseDTO) => Sesion;
  cerrarSesion: (motivo?: MotivoCierre) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
