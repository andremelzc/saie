import { Prisma, PrismaClient, RolCuenta, TipoAlerta, TipoEspacio } from '@prisma/client';
import { z } from 'zod';
import { HttpError } from '../lib/http';
import { AlertaRegistradaDTO } from '../types/alertas';
import { TokenPayload } from '../types/auth';
import {
  CampoEspacio,
  EspacioAdminDTO,
  FiltrosEspacios,
  ResultadoEdicionEspacioDTO,
} from '../types/espacios';
import { verificarAccesoEspacio } from './acceso.service';
import { registrarAlertaDesdeDeteccion } from './alerta.service';
import { evaluarCapacidadInsuficiente } from './deteccionAlertas.service';
import {
  normalizarListaSoftware,
  registrarCambioPcsMalogradas,
  registrarCambioSoftware,
} from './laboratorio.service';

const CAMPOS_COORDINACION: CampoEspacio[] = [
  'identificador',
  'pabellon',
  'piso',
  'aforoNominal',
  'contiguos',
];
const CAMPOS_LABORATORIO: CampoEspacio[] = ['softwareInstalado', 'pcsMalogradas'];

/** Campos que cada rol puede editar según el tipo de espacio (Issue 4.15). */
export function camposEditables(rol: RolCuenta, tipo: TipoEspacio): CampoEspacio[] {
  const esLab = tipo === TipoEspacio.LABORATORIO;
  if (rol === RolCuenta.COORDINACION_ACADEMICA) {
    return esLab ? [...CAMPOS_COORDINACION, ...CAMPOS_LABORATORIO] : CAMPOS_COORDINACION;
  }
  if (rol === RolCuenta.JEFATURA_LABORATORIOS && esLab) {
    return CAMPOS_LABORATORIO;
  }
  return [];
}

const identificador = z.string().trim().min(1, 'El identificador es requerido').max(60);
const pabellon = z.string().trim().min(1, 'El pabellón es requerido').max(40);
const piso = z.number({ error: 'El piso debe ser un entero' }).int('El piso debe ser un entero');
const aforoNominal = z
  .number({ error: 'El aforo nominal debe ser un entero' })
  .int('El aforo nominal debe ser un entero')
  .min(1, 'El aforo nominal debe ser mayor a 0');
const pcsMalogradas = z
  .number({ error: 'pcsMalogradas debe ser un número entero' })
  .int('pcsMalogradas debe ser un número entero')
  .min(0, 'pcsMalogradas no puede ser negativo');
const software = z
  .array(z.string().trim().min(1, 'El nombre del software no puede estar vacío').max(120))
  .max(200, 'Demasiados programas en la lista');
const contiguos = z.array(z.string().min(1)).max(50, 'Demasiados espacios contiguos');

export const CrearEspacioSchema = z
  .object({
    identificador,
    tipo: z.enum(TipoEspacio, { error: 'El tipo de espacio no es válido' }),
    pabellon,
    piso,
    aforoNominal,
    softwareInstalado: software.optional(),
    pcsMalogradas: pcsMalogradas.optional(),
    contiguos: contiguos.optional(),
  })
  .strict()
  .superRefine((e, ctx) => {
    if (e.tipo === TipoEspacio.AULA_TEORICA) {
      if (e.softwareInstalado !== undefined || e.pcsMalogradas !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: 'Un aula teórica no tiene software ni PCs malogradas',
        });
      }
    } else if ((e.pcsMalogradas ?? 0) > e.aforoNominal) {
      ctx.addIssue({
        code: 'custom',
        message: 'Las PCs malogradas no pueden exceder el aforo nominal',
      });
    }
  });

export const ActualizarEspacioSchema = z
  .object({
    identificador: identificador.optional(),
    pabellon: pabellon.optional(),
    piso: piso.optional(),
    aforoNominal: aforoNominal.optional(),
    softwareInstalado: software.optional(),
    pcsMalogradas: pcsMalogradas.optional(),
    contiguos: contiguos.optional(),
  })
  .strict()
  .refine((e) => Object.values(e).some((v) => v !== undefined), {
    message: 'Indica al menos un campo a modificar',
  });

export type CrearEspacioInput = z.infer<typeof CrearEspacioSchema>;
export type ActualizarEspacioInput = z.infer<typeof ActualizarEspacioSchema>;

type Db = Prisma.TransactionClient;

function esConflictoUnico(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

async function contiguosDe(espacioId: string, db: Pick<Db, 'espacioContiguo'>): Promise<string[]> {
  const relaciones = await db.espacioContiguo.findMany({ where: { espacioIdA: espacioId } });
  return relaciones.map((r) => r.espacioIdB).sort();
}

async function aEspacioDTO(
  espacio: Prisma.EspacioGetPayload<object>,
  rol: RolCuenta,
  db: Pick<Db, 'espacioContiguo'>,
): Promise<EspacioAdminDTO> {
  const esLab = espacio.tipo === TipoEspacio.LABORATORIO;
  return {
    id: espacio.id,
    identificador: espacio.identificador,
    tipo: espacio.tipo,
    pabellon: espacio.pabellon,
    piso: espacio.piso,
    aforoNominal: espacio.aforoNominal,
    softwareInstalado: esLab ? espacio.softwareInstalado : null,
    pcsMalogradas: esLab ? espacio.pcsMalogradas : null,
    contiguos: await contiguosDe(espacio.id, db),
    camposEditables: camposEditables(rol, espacio.tipo),
  };
}

/** La contigüidad solo relaciona espacios distintos y del mismo tipo (Issue 2.3). */
async function validarContiguos(
  espacioId: string | null,
  tipo: TipoEspacio,
  ids: string[],
  db: Pick<Db, 'espacio'>,
): Promise<string[]> {
  const unicos = [...new Set(ids)];
  if (espacioId && unicos.includes(espacioId)) {
    throw new HttpError(422, 'Un espacio no puede ser contiguo a sí mismo');
  }
  if (unicos.length === 0) return [];

  const vecinos = await db.espacio.findMany({ where: { id: { in: unicos } } });
  if (vecinos.length !== unicos.length) {
    throw new HttpError(404, 'Alguno de los espacios contiguos indicados no existe');
  }
  if (vecinos.some((v) => v.tipo !== tipo)) {
    throw new HttpError(422, 'La contigüidad solo se permite entre espacios del mismo tipo');
  }
  return unicos;
}

/** Reemplaza el conjunto de contiguos de un espacio, guardando ambos sentidos de la relación. */
async function reemplazarContiguos(espacioId: string, ids: string[], db: Db): Promise<void> {
  await db.espacioContiguo.deleteMany({
    where: { OR: [{ espacioIdA: espacioId }, { espacioIdB: espacioId }] },
  });
  if (ids.length === 0) return;
  await db.espacioContiguo.createMany({
    data: ids.flatMap((otro) => [
      { espacioIdA: espacioId, espacioIdB: otro },
      { espacioIdA: otro, espacioIdB: espacioId },
    ]),
  });
}

async function obtenerEspacio(espacioId: string, db: Pick<Db, 'espacio'>) {
  const espacio = await db.espacio.findUnique({ where: { id: espacioId } });
  if (!espacio) {
    throw new HttpError(404, `El espacio con ID '${espacioId}' no existe`);
  }
  return espacio;
}

/**
 * Issue 4.15: lista los espacios con sus contiguos y los campos editables del rol.
 * Jefatura solo ve los laboratorios que tiene a su cargo.
 */
export async function listarEspacios(
  filtros: FiltrosEspacios,
  auth: TokenPayload,
  prisma: Pick<PrismaClient, 'espacio' | 'espacioContiguo'>,
): Promise<EspacioAdminDTO[]> {
  const esJefatura = auth.rol === RolCuenta.JEFATURA_LABORATORIOS;
  const espacios = await prisma.espacio.findMany({
    where: {
      ...(filtros.tipo && { tipo: filtros.tipo }),
      ...(filtros.pabellon && { pabellon: { equals: filtros.pabellon, mode: 'insensitive' } }),
      ...(filtros.piso !== undefined && { piso: filtros.piso }),
      ...(esJefatura && {
        tipo: TipoEspacio.LABORATORIO,
        responsables: { some: { cuentaId: auth.sub } },
      }),
    },
    orderBy: [{ pabellon: 'asc' }, { piso: 'asc' }, { identificador: 'asc' }],
  });
  return Promise.all(espacios.map((e) => aEspacioDTO(e, auth.rol, prisma)));
}

export async function obtenerEspacioAdmin(
  espacioId: string,
  auth: TokenPayload,
  prisma: Pick<PrismaClient, 'espacio' | 'espacioContiguo' | 'espacioResponsable'>,
): Promise<EspacioAdminDTO> {
  const espacio = await obtenerEspacio(espacioId, prisma);
  await verificarAccesoEspacio(auth, espacio.id, prisma);
  return aEspacioDTO(espacio, auth.rol, prisma);
}

/** Issue 4.15: alta de un espacio (solo Coordinación). Sin asignaciones no hay alertas que evaluar. */
export async function crearEspacio(
  entrada: CrearEspacioInput,
  auth: TokenPayload,
  prisma: PrismaClient,
): Promise<EspacioAdminDTO> {
  try {
    return await prisma.$transaction(async (tx) => {
      const vecinos = await validarContiguos(null, entrada.tipo, entrada.contiguos ?? [], tx);
      const esLab = entrada.tipo === TipoEspacio.LABORATORIO;

      const creado = await tx.espacio.create({
        data: {
          identificador: entrada.identificador,
          tipo: entrada.tipo,
          pabellon: entrada.pabellon,
          piso: entrada.piso,
          aforoNominal: entrada.aforoNominal,
          softwareInstalado: esLab ? normalizarListaSoftware(entrada.softwareInstalado ?? []) : [],
          pcsMalogradas: esLab ? (entrada.pcsMalogradas ?? 0) : null,
        },
      });
      await reemplazarContiguos(creado.id, vecinos, tx);
      return aEspacioDTO(creado, auth.rol, tx);
    });
  } catch (error: unknown) {
    if (esConflictoUnico(error)) {
      throw new HttpError(
        409,
        `Ya existe el espacio '${entrada.identificador}' en el pabellón ${entrada.pabellon}`,
      );
    }
    throw error;
  }
}

/**
 * Issue 4.15: edición de un espacio con campos acotados por rol.
 *
 * - Coordinación edita todos los campos; Jefatura solo PCs y software de sus laboratorios.
 *   Cualquier campo fuera de lo permitido se rechaza con 403 antes de tocar la base.
 * - Los campos de laboratorio no existen en un aula teórica (400).
 * - Un cambio de aforo evalúa la capacidad (Issue 4.4) y persiste la alerta (Issue 4.5).
 * - PCs y software NO se escriben directo: pasan por los servicios de los Issues 4.2 y 4.1,
 *   que dejan historial y generan alertas. Se aplican después de los campos propios del
 *   espacio, en transacciones separadas.
 */
export async function actualizarEspacio(
  espacioId: string,
  entrada: ActualizarEspacioInput,
  auth: TokenPayload,
  prisma: PrismaClient,
): Promise<ResultadoEdicionEspacioDTO> {
  const actual = await obtenerEspacio(espacioId, prisma);
  await verificarAccesoEspacio(auth, actual.id, prisma);

  const permitidos = camposEditables(auth.rol, actual.tipo);
  const solicitados = (Object.keys(entrada) as CampoEspacio[]).filter(
    (c) => entrada[c] !== undefined,
  );

  const camposDeLab = solicitados.filter((c) => CAMPOS_LABORATORIO.includes(c));
  if (actual.tipo === TipoEspacio.AULA_TEORICA && camposDeLab.length > 0) {
    throw new HttpError(400, 'Un aula teórica no tiene software ni PCs malogradas');
  }

  const noPermitidos = solicitados.filter((c) => !permitidos.includes(c));
  if (noPermitidos.length > 0) {
    throw new HttpError(
      403,
      `Tu rol no puede editar: ${noPermitidos.join(', ')}`,
      noPermitidos.map((c) => `Campo no editable: ${c}`),
    );
  }

  const aforoFinal = entrada.aforoNominal ?? actual.aforoNominal;
  const pcsFinal = entrada.pcsMalogradas ?? actual.pcsMalogradas ?? 0;
  if (actual.tipo === TipoEspacio.LABORATORIO && pcsFinal > aforoFinal) {
    throw new HttpError(
      422,
      `El conteo de PCs malogradas (${pcsFinal}) excede el aforo nominal (${aforoFinal})`,
    );
  }

  const alertas: AlertaRegistradaDTO[] = [];
  const hayCamposPropios = solicitados.some((c) => CAMPOS_COORDINACION.includes(c));

  if (hayCamposPropios) {
    try {
      await prisma.$transaction(async (tx) => {
        const vecinos =
          entrada.contiguos !== undefined
            ? await validarContiguos(actual.id, actual.tipo, entrada.contiguos, tx)
            : null;

        const actualizado = await tx.espacio.update({
          where: { id: actual.id },
          data: {
            ...(entrada.identificador !== undefined && { identificador: entrada.identificador }),
            ...(entrada.pabellon !== undefined && { pabellon: entrada.pabellon }),
            ...(entrada.piso !== undefined && { piso: entrada.piso }),
            ...(entrada.aforoNominal !== undefined && { aforoNominal: entrada.aforoNominal }),
          },
        });

        if (vecinos) {
          await reemplazarContiguos(actual.id, vecinos, tx);
        }

        if (entrada.aforoNominal !== undefined && entrada.aforoNominal !== actual.aforoNominal) {
          const afectadas = await evaluarCapacidadInsuficiente(
            actual.id,
            { aforoNominal: entrada.aforoNominal },
            tx,
          );
          const alerta = await registrarAlertaDesdeDeteccion(
            TipoAlerta.CAPACIDAD,
            actual.id,
            actualizado.identificador,
            afectadas,
            tx,
          );
          if (alerta) alertas.push(alerta);
        }
      });
    } catch (error: unknown) {
      if (esConflictoUnico(error)) {
        throw new HttpError(409, 'Ya existe un espacio con ese identificador en el pabellón');
      }
      throw error;
    }
  }

  if (entrada.pcsMalogradas !== undefined) {
    const r = await registrarCambioPcsMalogradas(actual.id, entrada.pcsMalogradas, auth, prisma);
    alertas.push(...r.alertas);
  }
  if (entrada.softwareInstalado !== undefined) {
    const r = await registrarCambioSoftware(actual.id, entrada.softwareInstalado, auth, prisma);
    alertas.push(...r.alertas);
  }

  const final = await obtenerEspacio(actual.id, prisma);
  return { espacio: await aEspacioDTO(final, auth.rol, prisma), alertas };
}
