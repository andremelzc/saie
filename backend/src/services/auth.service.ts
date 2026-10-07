import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { PrismaClient, RolCuenta } from '@prisma/client';
import { HttpError } from '../lib/http';
import { LoginResponseDTO, TokenPayload } from '../types/auth';

const MENSAJE_CREDENCIALES_INVALIDAS = 'Credenciales inválidas';

// Hash bcrypt de relleno: permite comparar siempre, exista o no la cuenta.
const HASH_RELLENO = bcrypt.hashSync('saie-sin-cuenta', 10);

/** Roles del panel administrativo (Issue 4.8). */
export const ROLES_ADMIN: RolCuenta[] = [
  RolCuenta.COORDINACION_ACADEMICA,
  RolCuenta.JEFATURA_LABORATORIOS,
];

export function obtenerJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está configurado');
  }
  return secret;
}

export function obtenerJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || '8h';
}

export function firmarToken(payload: TokenPayload): string {
  return jwt.sign({ rol: payload.rol }, obtenerJwtSecret(), {
    subject: payload.sub,
    expiresIn: obtenerJwtExpiresIn() as SignOptions['expiresIn'],
  });
}

/** Devuelve el payload si el token es válido y no expiró; `null` en cualquier otro caso. */
export function verificarToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, obtenerJwtSecret());
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string' || !decoded.rol) {
      return null;
    }
    return { sub: decoded.sub, rol: decoded.rol as RolCuenta };
  } catch {
    return null;
  }
}

/**
 * Issue 4.8: mecanismo único de login para los 4 roles (los Issues 3.21 y 7.1 lo reutilizan).
 *
 * - Compara la clave contra el hash bcrypt de la cuenta.
 * - Solo acepta cuentas cuyo rol esté en `rolesPermitidos`: una cuenta de docente no puede
 *   obtener token por el login de alumno ni por el del panel.
 * - Todo fallo (usuario inexistente, clave errónea o rol no permitido) responde lo mismo,
 *   para no revelar qué cuentas existen.
 * - Informa si la cuenta debe cambiar su clave inicial.
 */
export async function iniciarSesion(
  usuarioLogin: string,
  clave: string,
  rolesPermitidos: RolCuenta[],
  prisma: Pick<PrismaClient, 'cuenta'>,
): Promise<LoginResponseDTO> {
  const cuenta = await prisma.cuenta.findUnique({ where: { usuarioLogin } });

  const claveCorrecta = await bcrypt.compare(clave, cuenta?.claveHash ?? HASH_RELLENO);

  if (!cuenta || !claveCorrecta || !rolesPermitidos.includes(cuenta.rol)) {
    throw new HttpError(401, MENSAJE_CREDENCIALES_INVALIDAS);
  }

  return {
    token: firmarToken({ sub: cuenta.id, rol: cuenta.rol }),
    rol: cuenta.rol,
    debeCambiarClave: cuenta.debeCambiarClave,
    expiresIn: obtenerJwtExpiresIn(),
  };
}
