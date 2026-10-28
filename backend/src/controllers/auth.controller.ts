import { Request, Response } from 'express';
import { RolCuenta } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { responderError } from '../lib/http';
import {
  firmarToken,
  iniciarSesion,
  obtenerJwtExpiresIn,
  ROLES_ADMIN,
} from '../services/auth.service';
import { cambiarClave, CambiarClaveSchema } from '../services/cuenta.service';

// Alumno y docente inician sesión con su código; el panel usa un nombre de usuario.
const LoginSchema = z
  .object({
    usuario: z.string().trim().min(1).optional(),
    codigo: z.string().trim().min(1).optional(),
    clave: z.string().min(1, 'La clave es requerida'),
  })
  .refine((d) => d.usuario || d.codigo, { message: 'El usuario o código es requerido' });

function crearLogin(rolesPermitidos: RolCuenta[]) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { usuario, codigo, clave } = LoginSchema.parse(req.body);
      const resultado = await iniciarSesion(
        (usuario ?? codigo) as string,
        clave,
        rolesPermitidos,
        prisma,
      );
      res.status(200).json({ success: true, data: resultado });
    } catch (error: unknown) {
      responderError(res, error);
    }
  };
}

/** POST /api/v1/auth/admin/login — Coordinación Académica y Jefatura (Issue 4.8) */
export const loginAdmin = crearLogin(ROLES_ADMIN);

/** POST /api/v1/auth/alumno/login — Alumno (Issue 3.21) */
export const loginAlumno = crearLogin([RolCuenta.ALUMNO]);

/** POST /api/v1/auth/docente/login — Docente (Issue 7.1) */
export const loginDocente = crearLogin([RolCuenta.DOCENTE]);

/** POST /api/v1/auth/cambiar-clave — cualquier rol autenticado (Issue 4.21) */
export async function cambiarClaveCuenta(req: Request, res: Response): Promise<void> {
  try {
    const entrada = CambiarClaveSchema.parse(req.body);
    const data = await cambiarClave(req.auth!.sub, entrada, prisma);
    // Token nuevo sin la marca `debeCambiarClave`: el usuario sigue usando el sistema sin volver
    // a iniciar sesión (Issue 4.45).
    const token = firmarToken({ sub: req.auth!.sub, rol: req.auth!.rol });
    res
      .status(200)
      .json({ success: true, data: { ...data, token, expiresIn: obtenerJwtExpiresIn() } });
  } catch (error: unknown) {
    responderError(res, error);
  }
}
