import { DiaSemana, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { periodoSchema } from '../lib/periodo';
import type { ProgresoImportacion } from '../types/importacion';

export const HorarioSchema = z.object({
  codigoCurso: z.string().min(1, 'El código del curso es requerido'),
  codigoSeccion: z.string().min(1, 'El código de la sección es requerido'),
  periodo: periodoSchema,
  diaSemana: z.enum(
    [
      DiaSemana.LUNES,
      DiaSemana.MARTES,
      DiaSemana.MIERCOLES,
      DiaSemana.JUEVES,
      DiaSemana.VIERNES,
      DiaSemana.SABADO,
      DiaSemana.DOMINGO,
    ],
    { error: 'El día debe ser LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO o DOMINGO' },
  ),
  horaInicio: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora de inicio debe ser formato HH:mm (24h)'),
  horaFin: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora de fin debe ser formato HH:mm (24h)'),
});

export type HorarioInput = z.infer<typeof HorarioSchema>;

export interface ResultadoImportacionHorarios {
  horariosProcesados: number;
  /** Issue 1.17 (R35): franjas que ya no figuran en el archivo de su sección. */
  horariosRetirados: number;
  errores: string[];
}

export async function importarHorarios(
  datos: unknown[],
  prisma: PrismaClient,
  onProgreso?: ProgresoImportacion,
): Promise<ResultadoImportacionHorarios> {
  let horariosProcesados = 0;
  // Issue 1.17: franjas (día + hora de inicio) que el archivo indica para cada sección.
  const enArchivo = new Map<string, { diaSemana: DiaSemana; horaInicio: string }[]>();
  const errores: string[] = [];

  for (let i = 0; i < datos.length; i++) {
    onProgreso?.(i, datos.length);
    const validacion = HorarioSchema.safeParse(datos[i]);

    if (!validacion.success) {
      errores.push(`Fila ${i + 1}: ${validacion.error.issues.map((e) => e.message).join(', ')}`);
      continue;
    }

    const { codigoCurso, codigoSeccion, periodo, diaSemana, horaInicio, horaFin } = validacion.data;

    // Validación lógica de horas
    if (horaInicio >= horaFin) {
      errores.push(
        `Fila ${i + 1}: La hora de inicio (${horaInicio}) debe ser menor a la hora de fin (${horaFin})`,
      );
      continue;
    }

    try {
      // 1. Buscar la sección correspondiente
      const curso = await prisma.curso.findUnique({
        where: { codigo: codigoCurso },
      });

      if (!curso) {
        errores.push(`Fila ${i + 1}: No existe el curso con código ${codigoCurso}`);
        continue;
      }

      const seccion = await prisma.seccion.findUnique({
        where: {
          cursoId_codigoSeccion_periodo: {
            cursoId: curso.id,
            codigoSeccion,
            periodo,
          },
        },
      });

      if (!seccion) {
        errores.push(
          `Fila ${i + 1}: No existe la sección ${codigoSeccion} para el curso ${codigoCurso} en el periodo ${periodo}`,
        );
        continue;
      }

      // 2. Inserción o actualización idempotente de Horario
      await prisma.horario.upsert({
        where: {
          seccionId_diaSemana_horaInicio: {
            seccionId: seccion.id,
            diaSemana,
            horaInicio,
          },
        },
        update: { horaFin },
        create: {
          seccionId: seccion.id,
          diaSemana,
          horaInicio,
          horaFin,
        },
      });

      horariosProcesados++;
      const franjas = enArchivo.get(seccion.id) ?? [];
      franjas.push({ diaSemana, horaInicio });
      enArchivo.set(seccion.id, franjas);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errores.push(
        `Fila ${i + 1} (${codigoCurso}-${codigoSeccion} ${diaSemana} ${horaInicio}): ${msg}`,
      );
    }
  }

  // Issue 1.17: el horario de cada sección del archivo queda exactamente como el archivo, así un
  // cambio de hora reemplaza la franja vieja en lugar de sumarse. Las secciones que no aparecen no
  // se tocan. Si alguna fila falló no se retira nada.
  let horariosRetirados = 0;
  if (errores.length === 0) {
    for (const [seccionId, franjas] of enArchivo) {
      const { count } = await prisma.horario.deleteMany({
        where: { seccionId, NOT: { OR: franjas } },
      });
      horariosRetirados += count;
    }
  }
  onProgreso?.(datos.length, datos.length);

  return { horariosProcesados, horariosRetirados, errores };
}
