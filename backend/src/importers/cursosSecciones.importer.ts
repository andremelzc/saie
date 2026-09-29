import { PrismaClient, TipoEspacio } from '@prisma/client';
import { z } from 'zod';

export const CursoSeccionSchema = z.object({
  codigoCurso: z.string().min(1, 'El código del curso es requerido'),
  nombreCurso: z.string().min(1, 'El nombre del curso es requerido'),
  codigoSeccion: z.string().min(1, 'El código de la sección es requerido'),
  periodo: z.string().min(1, 'El periodo es requerido'),
  tipoEspacioRequerido: z.enum([TipoEspacio.AULA_TEORICA, TipoEspacio.LABORATORIO]),
  stackSoftwareRequerido: z.array(z.string()).optional().default([]),
});

export type CursoSeccionInput = z.infer<typeof CursoSeccionSchema>;

export interface ResultadoImportacionCursos {
  cursosProcesados: number;
  seccionesProcesadas: number;
  errores: string[];
}

export async function importarCursosYSecciones(
  datos: unknown[],
  prisma: PrismaClient,
): Promise<ResultadoImportacionCursos> {
  let cursosProcesados = 0;
  let seccionesProcesadas = 0;
  const errores: string[] = [];

  for (let i = 0; i < datos.length; i++) {
    const validacion = CursoSeccionSchema.safeParse(datos[i]);

    if (!validacion.success) {
      errores.push(`Fila ${i + 1}: ${validacion.error.issues.map((e) => e.message).join(', ')}`);
      continue;
    }

    const {
      codigoCurso,
      nombreCurso,
      codigoSeccion,
      periodo,
      tipoEspacioRequerido,
      stackSoftwareRequerido,
    } = validacion.data;

    try {
      // 1. Inserción o actualización idempotente de Curso
      const curso = await prisma.curso.upsert({
        where: { codigo: codigoCurso },
        update: { nombre: nombreCurso },
        create: { codigo: codigoCurso, nombre: nombreCurso },
      });
      cursosProcesados++;

      // 2. Inserción o actualización idempotente de Sección
      await prisma.seccion.upsert({
        where: {
          cursoId_codigoSeccion_periodo: {
            cursoId: curso.id,
            codigoSeccion,
            periodo,
          },
        },
        update: {
          tipoEspacioRequerido,
          stackSoftwareRequerido:
            tipoEspacioRequerido === TipoEspacio.LABORATORIO ? stackSoftwareRequerido : [],
        },
        create: {
          cursoId: curso.id,
          codigoSeccion,
          periodo,
          tipoEspacioRequerido,
          stackSoftwareRequerido:
            tipoEspacioRequerido === TipoEspacio.LABORATORIO ? stackSoftwareRequerido : [],
        },
      });
      seccionesProcesadas++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errores.push(`Fila ${i + 1} (${codigoCurso}-${codigoSeccion}): ${msg}`);
    }
  }

  return { cursosProcesados, seccionesProcesadas, errores };
}
