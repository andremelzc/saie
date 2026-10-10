import bcrypt from 'bcrypt';
import { Prisma, PrismaClient, RolCuenta } from '@prisma/client';
import { z } from 'zod';
import { HttpError } from '../lib/http';

const RONDAS_BCRYPT = 10;

const texto = (campo: string) => z.string().trim().min(1, `${campo} es requerido`).max(200);
const opcional = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : undefined));

export const AltaAlumnoSchema = z
  .object({
    codigo: texto('El código del alumno').max(20),
    nombre: texto('El nombre del alumno'),
    correo: z.string().trim().email('Correo electrónico inválido'),
    dni: opcional,
    telefono: opcional,
    direccion: opcional,
    fechaNacimiento: z.coerce.date({ error: 'La fecha de nacimiento no es válida' }).optional(),
  })
  .strict();

export const AltaDocenteSchema = z
  .object({
    codigoDocente: texto('El código del docente').max(20),
    nombre: texto('El nombre del docente'),
    correoInstitucional: z.string().trim().email('Correo institucional inválido'),
    departamento: texto('El departamento académico'),
  })
  .strict();

export type AltaAlumnoInput = z.infer<typeof AltaAlumnoSchema>;
export type AltaDocenteInput = z.infer<typeof AltaDocenteSchema>;

export interface UsuarioCreadoDTO {
  id: string;
  codigo: string;
  nombre: string;
  rol: RolCuenta;
  /** La clave inicial es el propio código y la cuenta debe cambiarla en su primer ingreso. */
  debeCambiarClave: true;
}

function esCodigoDuplicado(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * Issue 4.17: Coordinación da de alta un alumno suelto, con su cuenta de acceso (usuario y
 * clave inicial = código, igual que la carga masiva del Issue 1.7). 409 si el código ya existe.
 */
export async function crearAlumno(
  entrada: AltaAlumnoInput,
  prisma: Pick<PrismaClient, 'alumno' | 'cuenta'>,
): Promise<UsuarioCreadoDTO> {
  const mensajeDuplicado = `Ya existe un alumno o cuenta con el código '${entrada.codigo}'`;

  const existe = await Promise.all([
    prisma.alumno.findUnique({ where: { codigo: entrada.codigo } }),
    prisma.cuenta.findUnique({ where: { usuarioLogin: entrada.codigo } }),
  ]);
  if (existe.some(Boolean)) {
    throw new HttpError(409, mensajeDuplicado);
  }

  try {
    const alumno = await prisma.alumno.create({
      data: {
        codigo: entrada.codigo,
        nombre: entrada.nombre,
        correo: entrada.correo,
        dni: entrada.dni,
        telefono: entrada.telefono,
        direccion: entrada.direccion,
        fechaNacimiento: entrada.fechaNacimiento,
        cuenta: {
          create: {
            rol: RolCuenta.ALUMNO,
            usuarioLogin: entrada.codigo,
            claveHash: await bcrypt.hash(entrada.codigo, RONDAS_BCRYPT),
            debeCambiarClave: true,
          },
        },
      },
    });
    return {
      id: alumno.id,
      codigo: alumno.codigo,
      nombre: alumno.nombre,
      rol: RolCuenta.ALUMNO,
      debeCambiarClave: true,
    };
  } catch (error: unknown) {
    if (esCodigoDuplicado(error)) {
      throw new HttpError(409, mensajeDuplicado);
    }
    throw error;
  }
}

/** Issue 4.18: igual que `crearAlumno`, para un docente (carga masiva equivalente: Issue 1.8). */
export async function crearDocente(
  entrada: AltaDocenteInput,
  prisma: Pick<PrismaClient, 'docente' | 'cuenta'>,
): Promise<UsuarioCreadoDTO> {
  const mensajeDuplicado = `Ya existe un docente o cuenta con el código '${entrada.codigoDocente}'`;

  const existe = await Promise.all([
    prisma.docente.findUnique({ where: { codigoDocente: entrada.codigoDocente } }),
    prisma.cuenta.findUnique({ where: { usuarioLogin: entrada.codigoDocente } }),
  ]);
  if (existe.some(Boolean)) {
    throw new HttpError(409, mensajeDuplicado);
  }

  try {
    const docente = await prisma.docente.create({
      data: {
        codigoDocente: entrada.codigoDocente,
        nombre: entrada.nombre,
        correoInstitucional: entrada.correoInstitucional,
        departamento: entrada.departamento,
        cuenta: {
          create: {
            rol: RolCuenta.DOCENTE,
            usuarioLogin: entrada.codigoDocente,
            claveHash: await bcrypt.hash(entrada.codigoDocente, RONDAS_BCRYPT),
            debeCambiarClave: true,
          },
        },
      },
    });
    return {
      id: docente.id,
      codigo: docente.codigoDocente,
      nombre: docente.nombre,
      rol: RolCuenta.DOCENTE,
      debeCambiarClave: true,
    };
  } catch (error: unknown) {
    if (esCodigoDuplicado(error)) {
      throw new HttpError(409, mensajeDuplicado);
    }
    throw error;
  }
}
