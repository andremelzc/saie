import { RolCuenta } from '@prisma/client';

/**
 * Contenido firmado dentro del JWT: id de la cuenta (`sub`), su rol y, solo mientras la cuenta
 * deba cambiar su clave inicial, la marca `debeCambiarClave` (Issue 4.45). Un token sin la marca
 * se trata como «no debe cambiarla».
 */
export interface TokenPayload {
  sub: string;
  rol: RolCuenta;
  debeCambiarClave?: boolean;
}

export interface LoginResponseDTO {
  token: string;
  rol: RolCuenta;
  debeCambiarClave: boolean;
  expiresIn: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: TokenPayload;
  }
}
