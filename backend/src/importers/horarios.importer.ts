import { DiaSemana, PrismaClient } from '@prisma/client';
import { z } from 'zod';

export const HorarioSchema = z.object({
  codigoCurso: z.string().min(1, 'El código del curso es requerido'),
  codigoSeccion: z.string().min(1, 'El código de la sección es requerido'),
  periodo: z.string().min(1, 'El periodo es requerido'),
  diaSemana: z.enum([
    DiaSemana.LUNES,
    DiaSemana.MARTES,
    DiaSemana.MIERCOLES,
    DiaSemana.JUEVES,
    DiaSemana.VIERNES,
    DiaSemana.SABADO,
    DiaSemana.DOMINGO,
  ]),
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
  errores: string[];
}

export async function importarHorarios(
  datos: unknown[],
  prisma: PrismaClient,
): Promise<ResultadoImportacionHorarios> {
  let horariosProcesados = 0;
  const errores: string[] = [];

  for (let i = 0; i < datos.length; i++) {
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errores.push(
        `Fila ${i + 1} (${codigoCurso}-${codigoSeccion} ${diaSemana} ${horaInicio}): ${msg}`,
      );
    }
  }

  return { horariosProcesados, errores };
}
