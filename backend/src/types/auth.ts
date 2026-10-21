import { RolCuenta } from '@prisma/client';

/** Contenido firmado dentro del JWT: id de la cuenta (`sub`) y su rol. */
export interface TokenPayload {
  sub: string;
  rol: RolCuenta;
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
