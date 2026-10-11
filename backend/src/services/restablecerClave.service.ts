import bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaClient, RolCuenta } from '@prisma/client';
import { z } from 'zod';
import { HttpError } from '../lib/http';

const RONDAS_BCRYPT = 10;

/** Sin caracteres ambiguos (0/O, 1/l/I): la clave se dicta o se copia a mano. */
const ALFABETO_CLAVE = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const LONGITUD_CLAVE_INICIAL = 10;

export const RestablecerClaveSchema = z
  .object({
    usuario: z.string().trim().min(1, 'Indica el código o el correo del usuario').max(200),
  })
  .strict();

export type RestablecerClaveInput = z.infer<typeof RestablecerClaveSchema>;

export interface ClaveRestablecidaDTO {
  codigo: string;
  nombre: string;
  rol: RolCuenta;
  /** Se muestra una sola vez; en la base solo queda su hash. */
  claveInicial: string;
  debeCambiarClave: true;
}

type Db = Pick<PrismaClient, 'alumno' | 'docente' | 'cuenta'>;

interface Candidato {
  codigo: string;
  nombre: string;
  cuentaId: string | null;
}

/** Clave aleatoria con generador criptográfico; nunca derivada del código del usuario. */
export function generarClaveInicial(): string {
  return Array.from(
    { length: LONGITUD_CLAVE_INICIAL },
    () => ALFABETO_CLAVE[randomInt(ALFABETO_CLAVE.length)],
  ).join('');
}

/** El código identifica a una sola persona; el correo puede repetirse y se trata aparte. */
async function buscarCandidatos(usuario: string, db: Db): Promise<Candidato[]> {
  const [alumnoPorCodigo, docentePorCodigo] = await Promise.all([
    db.alumno.findUnique({ where: { codigo: usuario } }),
    db.docente.findUnique({ where: { codigoDocente: usuario } }),
  ]);

  const porCodigo: Candidato[] = [
    ...(alumnoPorCodigo ? [alumnoPorCodigo] : []).map((a) => ({
      codigo: a.codigo,
      nombre: a.nombre,
      cuentaId: a.cuentaId,
    })),
    ...(docentePorCodigo ? [docentePorCodigo] : []).map((d) => ({
      codigo: d.codigoDocente,
      nombre: d.nombre,
      cuentaId: d.cuentaId,
    })),
  ];
  if (porCodigo.length > 0 || !usuario.includes('@')) return porCodigo;

  const [alumnos, docentes] = await Promise.all([
    db.alumno.findMany({ where: { correo: { equals: usuario, mode: 'insensitive' } } }),
    db.docente.findMany({
      where: { correoInstitucional: { equals: usuario, mode: 'insensitive' } },
    }),
  ]);
  return [
    ...alumnos.map((a) => ({ codigo: a.codigo, nombre: a.nombre, cuentaId: a.cuentaId })),
    ...docentes.map((d) => ({ codigo: d.codigoDocente, nombre: d.nombre, cuentaId: d.cuentaId })),
  ];
}

/**
 * Issue 4.26: Coordinación restablece la clave de un alumno o docente a una clave inicial nueva
 * (aleatoria), guarda solo su hash y obliga a cambiarla en el siguiente ingreso. Quien lo ejecuta
 * ve la clave una sola vez para entregársela al usuario.
 *
 * - El usuario se busca por código; si no es un código y parece un correo, por correo. Un correo
 *   que corresponde a más de una persona se rechaza (409): debe usarse el código.
 * - Las cuentas de Coordinación y Jefatura son de sistema: se rechazan (403), no se restablecen aquí.
 * - Un alumno o docente sin cuenta de acceso se rechaza (422): no hay clave que restablecer.
 *
 * Limitación: los JWT ya emitidos siguen siendo válidos hasta que expiren (no hay lista de revocación).
 */
export async function restablecerClave(
  entrada: RestablecerClaveInput,
  db: Db,
): Promise<ClaveRestablecidaDTO> {
  const candidatos = await buscarCandidatos(entrada.usuario, db);

  if (candidatos.length === 0) {
    // Una cuenta de sistema no es alumno ni docente: se distingue para dar un mensaje claro.
    const cuentaDeSistema = await db.cuenta.findUnique({
      where: { usuarioLogin: entrada.usuario },
    });
    if (
      cuentaDeSistema &&
      (cuentaDeSistema.rol === RolCuenta.COORDINACION_ACADEMICA ||
        cuentaDeSistema.rol === RolCuenta.JEFATURA_LABORATORIOS)
    ) {
      throw new HttpError(
        403,
        'Las cuentas de Coordinación y Jefatura son de sistema: su clave no se restablece por aquí',
      );
    }
    throw new HttpError(404, 'No existe un alumno ni un docente con ese código o correo');
  }

  if (candidatos.length > 1) {
    throw new HttpError(409, 'Hay más de un usuario con ese dato: usa el código del usuario');
  }

  const [usuario] = candidatos;
  const cuenta = usuario.cuentaId
    ? await db.cuenta.findUnique({ where: { id: usuario.cuentaId } })
    : null;

  if (!cuenta) {
    throw new HttpError(
      422,
      'El usuario no tiene una cuenta de acceso: no hay clave que restablecer',
    );
  }
  if (cuenta.rol !== RolCuenta.ALUMNO && cuenta.rol !== RolCuenta.DOCENTE) {
    throw new HttpError(
      403,
      'Las cuentas de Coordinación y Jefatura son de sistema: su clave no se restablece por aquí',
    );
  }

  const claveInicial = generarClaveInicial();
  await db.cuenta.update({
    where: { id: cuenta.id },
    data: {
      claveHash: await bcrypt.hash(claveInicial, RONDAS_BCRYPT),
      debeCambiarClave: true,
    },
  });

  return {
    codigo: usuario.codigo,
    nombre: usuario.nombre,
    rol: cuenta.rol,
    claveInicial,
    debeCambiarClave: true,
  };
}
